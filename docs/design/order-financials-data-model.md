# Order Financials Data Model

## Problem

Financial data (discounts, taxes, totals, payments) lives inside `order_meta_json`,
a raw JSON blob on the `orders` table. This creates several issues:

- **No queryability**: Cannot filter/aggregate orders by payment status, due amount,
  or tax without parsing JSON in application code.
- **No referential integrity**: Payments reference nothing; receipts are file paths
  in a JSON array with no FK guarantees.
- **Blurred ownership**: Accounting module reaches into `order_meta_json` directly
  (via `sales_bridge_read_model.php`) rather than consuming a clean contract.
- **Schema drift risk**: Any code can write arbitrary keys into the JSON blob.

## Design Principles

1. **Sales owns all financial data** — financials and payments are part of the order
   lifecycle, written exclusively by the sales module.
2. **Accounting is a consumer** — reads through a sales-owned facade; never writes
   to order financial data.
3. **Structured tables over JSON** — queryable columns for amounts, statuses, and
   dates; JSON only for truly schemaless metadata.
4. **Backward-compatible API** — the response shape returned by `app_order_from_row()`
   stays identical; frontend sees no breaking change.

---

## Schema Proposal

### New Table: `order_financials`

One-to-one with `orders`. Holds the computed financial summary that was previously
inside `order_meta_json.financials`.

```sql
CREATE TABLE IF NOT EXISTS order_financials (
    order_id         BIGINT UNSIGNED NOT NULL,
    sub_total        BIGINT NOT NULL DEFAULT 0,
    item_discount_total   BIGINT NOT NULL DEFAULT 0,
    invoice_discount_type ENUM('none','percent','fixed') NOT NULL DEFAULT 'none',
    invoice_discount_value  BIGINT NOT NULL DEFAULT 0,
    invoice_discount_amount BIGINT NOT NULL DEFAULT 0,
    tax_enabled      TINYINT(1) NOT NULL DEFAULT 0,
    tax_rate         INT NOT NULL DEFAULT 10,
    tax_amount       BIGINT NOT NULL DEFAULT 0,
    grand_total      BIGINT NOT NULL DEFAULT 0,
    paid_total       BIGINT NOT NULL DEFAULT 0,
    due_amount       BIGINT NOT NULL DEFAULT 0,
    payment_status   ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
    invoice_notes    TEXT NULL,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    KEY idx_order_financials_payment_status (payment_status),
    KEY idx_order_financials_grand_total (grand_total),
    CONSTRAINT fk_order_financials_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Why one-to-one?** Financials are always 1:1 with an order. A separate table avoids
widening the already-wide `orders` table and keeps concerns separated while remaining
joinable with zero cost via the PK.

### New Table: `order_payments`

One-to-many with `orders`. Each payment is a row instead of a JSON array entry.

```sql
CREATE TABLE IF NOT EXISTS order_payments (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id         BIGINT UNSIGNED NOT NULL,
    local_id         VARCHAR(64) NOT NULL,
    payment_date     VARCHAR(40) NOT NULL,
    amount           BIGINT NOT NULL DEFAULT 0,
    method           ENUM('cash','card','check','other') NOT NULL DEFAULT 'cash',
    reference        VARCHAR(200) NULL,
    note             TEXT NULL,
    receipt_file_path    VARCHAR(500) NULL,
    receipt_original_name VARCHAR(255) NULL,
    receipt_mime_type    VARCHAR(100) NULL,
    receipt_size         INT UNSIGNED NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_payments_local_id (order_id, local_id),
    KEY idx_order_payments_order (order_id),
    KEY idx_order_payments_method (method),
    KEY idx_order_payments_date (payment_date),
    CONSTRAINT fk_order_payments_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `local_id` preserves the existing `uniqid()`-based payment ID for idempotency
  with `acc_sales_bridge_log.payment_local_id`.
- `payment_date` is VARCHAR(40) to match the existing Jalali date format (`Y/m/d`).
- Receipt fields are flattened columns (not a nested JSON) for direct queryability.
- `(order_id, local_id)` unique constraint prevents duplicate payments per order.

---

## Ownership Rules

```
┌─────────────────────────────────────────────────────────────┐
│                     SALES MODULE (owner)                     │
│                                                              │
│  WRITES:  order_financials, order_payments, orders.total     │
│  READS:   order_financials, order_payments                   │
│                                                              │
│  Exposes: app_sales_bridge_fetch_orders_for_accounting()     │
│           (read-model facade for accounting)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ read-only
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   ACCOUNTING MODULE (consumer)               │
│                                                              │
│  READS:   via sales bridge read model ONLY                   │
│  WRITES:  acc_vouchers, acc_voucher_lines,                   │
│           acc_sales_bridge_log (own tables only)             │
│                                                              │
│  NEVER touches: order_financials, order_payments directly    │
└─────────────────────────────────────────────────────────────┘
```

### Read/Write Rules

| Table              | Sales Module | Accounting Module | Other Modules |
|--------------------|:------------:|:-----------------:|:-------------:|
| order_financials   | read + write | read (via facade) | read only     |
| order_payments     | read + write | read (via facade) | read only     |
| orders.total       | write        | —                 | read only     |
| order_meta_json    | write (sync) | — (deprecated)    | —             |

### Facade Contract

The sales bridge read model (`sales_bridge_read_model.php`) is updated to return
structured data from the new tables instead of raw JSON. The return shape stays
the same so accounting code needs minimal changes:

```php
// Returns: array of ['id', 'order_code', 'customer_id', 'payments' => [...]]
app_sales_bridge_fetch_orders_for_accounting($pdo, $mode, $orderId, $dateFrom, $dateTo);
```

The key change: `payments` comes from `order_payments` table rows instead of
parsing `order_meta_json`.

---

## Migration Strategy

### Constraints

- No real production data — safe reset is allowed
- API response shape must stay identical
- Accounting bridge must keep working (idempotency keys unchanged)

### Approach: Dual-Write + Read-from-New

**Phase 1 — Schema addition (this PR):**
1. Add `order_financials` and `order_payments` tables via `app_ensure_order_financials_tables()`.
2. On every order create/update, write to both the new tables AND `order_meta_json`
   (dual-write ensures backward compatibility).
3. `app_order_from_row()` reads from new tables when available, falls back to
   `order_meta_json` if rows are missing (graceful degradation).
4. Sales bridge read model queries `order_payments` table directly.
5. Add a one-time backfill function that populates new tables from existing
   `order_meta_json` data.

**Phase 2 — Drop JSON dependency (future):**
1. Stop writing `financials` and `payments` into `order_meta_json`.
2. `order_meta_json` becomes nullable/empty or holds only truly unstructured metadata.
3. Remove fallback reads from `app_order_from_row()`.

### Backfill Script

```php
// Safe to run multiple times (upsert semantics)
app_backfill_order_financials_from_json($pdo);
```

Iterates all orders with non-null `order_meta_json`, parses the JSON, and
inserts/updates into `order_financials` and `order_payments`. Uses
`INSERT ... ON DUPLICATE KEY UPDATE` for idempotency.

---

## Impact on Existing Code

| File | Change |
|------|--------|
| `database/schema.sql` | Add two new CREATE TABLE statements |
| `api/common/schema.php` | Add `app_ensure_order_financials_tables()` |
| `api/common/orders_domain.php` | Add helpers to read from new tables, keep response shape |
| `api/modules/sales/orders_shared.php` | Dual-write to new tables on normalize |
| `api/modules/sales/orders_normalization.php` | Write financials/payments rows |
| `api/modules/sales/sales_bridge_read_model.php` | Query `order_payments` table |
| `api/modules/accounting/acc_sales_bridge.php` | No change needed (reads via facade) |

---

## What Stays the Same

- **API response shape**: `financials`, `payments`, `invoiceNotes` keys unchanged
- **Payment IDs**: Same `uniqid()`-based IDs, same idempotency with bridge log
- **Order code generation**: Unaffected
- **Status enum**: Unaffected
- **items_json**: Stays as-is (separate concern, not part of this change)
- **Frontend**: Zero changes needed

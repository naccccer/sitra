# Order Financials Data Model (Phase 5A)

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
3. **Tables are source of truth** — structured tables own the data; `order_meta_json`
   is a compatibility layer only, written alongside but never read as authoritative.
4. **Derived fields are never stored** — `paidTotal`, `dueAmount`, `paymentStatus`
   are computed at read time from `order_payments` rows + `grandTotal`.
5. **Backward-compatible API** — the response shape returned by `app_order_from_row()`
   stays identical; frontend sees no breaking change.

---

## Schema

### Table: `order_financials` (stored fields only)

One-to-one with `orders`. Holds sales-owned invoice parameters.
Does **NOT** store `paid_total`, `due_amount`, or `payment_status` — those are
derived from `order_payments` at read time.

```sql
CREATE TABLE IF NOT EXISTS order_financials (
    order_id             BIGINT UNSIGNED NOT NULL,
    sub_total            BIGINT NOT NULL DEFAULT 0,
    item_discount_total  BIGINT NOT NULL DEFAULT 0,
    invoice_discount_type ENUM('none','percent','fixed') NOT NULL DEFAULT 'none',
    invoice_discount_value  BIGINT NOT NULL DEFAULT 0,
    invoice_discount_amount BIGINT NOT NULL DEFAULT 0,
    tax_enabled          TINYINT(1) NOT NULL DEFAULT 0,
    tax_rate             INT NOT NULL DEFAULT 10,
    tax_amount           BIGINT NOT NULL DEFAULT 0,
    grand_total          BIGINT NOT NULL DEFAULT 0,
    invoice_notes        TEXT NULL,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    KEY idx_order_financials_grand_total (grand_total),
    CONSTRAINT fk_order_financials_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Table: `order_payments`

One-to-many with `orders`. Each payment is a row instead of a JSON array entry.
This table is the **single source of truth** for payment state.

```sql
CREATE TABLE IF NOT EXISTS order_payments (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id             BIGINT UNSIGNED NOT NULL,
    local_id             VARCHAR(64) NOT NULL,
    payment_date         VARCHAR(40) NOT NULL,
    amount               BIGINT NOT NULL DEFAULT 0,
    method               ENUM('cash','card','check','other') NOT NULL DEFAULT 'cash',
    reference            VARCHAR(200) NULL,
    note                 TEXT NULL,
    receipt_file_path    VARCHAR(500) NULL,
    receipt_original_name VARCHAR(255) NULL,
    receipt_mime_type    VARCHAR(100) NULL,
    receipt_size         INT UNSIGNED NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

---

## Stored vs Derived Fields

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORED (in order_financials)                   │
│                                                                   │
│  subTotal, itemDiscountTotal,                                     │
│  invoiceDiscountType, invoiceDiscountValue, invoiceDiscountAmount,│
│  taxEnabled, taxRate, taxAmount,                                  │
│  grandTotal, invoiceNotes                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    STORED (in order_payments)                     │
│                                                                   │
│  local_id, payment_date, amount, method,                          │
│  reference, note, receipt_*                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ computed at read time
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DERIVED (never stored)                         │
│                                                                   │
│  paidTotal    = SUM(order_payments.amount)                        │
│  dueAmount    = MAX(0, grandTotal - paidTotal)                    │
│  paymentStatus:                                                   │
│    dueAmount <= 0 && grandTotal > 0  → 'paid'                     │
│    paidTotal > 0                     → 'partial'                  │
│    grandTotal <= 0                   → 'paid'                     │
│    else                              → 'unpaid'                   │
└─────────────────────────────────────────────────────────────────┘
```

The canonical computation lives in `app_compute_payment_derived_fields()` in
`api/modules/sales/order_financials_repository.php`. Every read path uses it.

---

## Ownership Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                     SALES MODULE (owner)                         │
│                                                                   │
│  Repository: api/modules/sales/order_financials_repository.php    │
│                                                                   │
│  WRITES:  order_financials, order_payments, orders.total          │
│  READS:   order_financials, order_payments (+ derives fields)     │
│                                                                   │
│  Exposes: app_sales_bridge_fetch_orders_for_accounting()          │
│           (read-model facade for accounting)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ read-only
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ACCOUNTING MODULE (consumer)                    │
│                                                                   │
│  READS:   via sales bridge read model ONLY                        │
│  WRITES:  acc_vouchers, acc_voucher_lines,                        │
│           acc_sales_bridge_log (own tables only)                  │
│                                                                   │
│  NEVER touches: order_financials, order_payments directly         │
└─────────────────────────────────────────────────────────────────┘
```

### Read/Write Rules

| Table              | Sales Module | Accounting Module | Other Modules |
|--------------------|:------------:|:-----------------:|:-------------:|
| order_financials   | read + write | read (via facade) | read only     |
| order_payments     | read + write | read (via facade) | read only     |
| orders.total       | write        | —                 | read only     |
| order_meta_json    | write (compat)| — (deprecated)   | —             |

### Source of Truth Hierarchy

1. **order_financials table** → stored invoice parameters
2. **order_payments table** → payment records (paidTotal/dueAmount/paymentStatus derived from here)
3. **order_meta_json** → compatibility layer only, written alongside tables but never authoritative

---

## Read Flow

### API Response (`app_order_from_row`)

```
1. Try order_financials table → get stored fields
2. Try order_payments table  → get payment rows
3. Compute derived fields    → paidTotal, dueAmount, paymentStatus
4. If tables empty (pre-migration) → fall back to order_meta_json
5. Return identical API shape regardless of source
```

### Accounting Bridge (`app_sales_bridge_fetch_orders_for_accounting`)

```
1. Query orders for date range
2. For each order, check order_payments table
3. If structured payments exist → inject into meta for bridge consumer
4. If not → use order_meta_json as-is (pre-migration fallback)
5. Bridge consumer (acc_sales_bridge.php) needs zero changes
```

---

## Migration Strategy

### Constraints

- No real production data — safe reset is allowed
- API response shape must stay identical
- Accounting bridge must keep working (idempotency keys unchanged)

### Write Path

On every order create/update:
1. Write to `order_financials` and `order_payments` tables (source of truth)
2. Write to `order_meta_json` (compatibility layer)
3. If table write fails, JSON write still succeeds (graceful degradation)

### Backfill

```php
// Safe to run multiple times (upsert/replace semantics)
app_backfill_order_financials_from_json($pdo);
```

Iterates all orders with non-null `order_meta_json`, parses the JSON, and
inserts/updates into `order_financials` and `order_payments`.

### Future: Drop JSON Dependency

1. Stop writing `financials` and `payments` into `order_meta_json`
2. `order_meta_json` becomes nullable/empty or holds only truly unstructured metadata
3. Remove fallback reads from `app_order_from_row()`

---

## Files

### Sales Module (owner)

| File | Purpose |
|------|---------|
| `api/modules/sales/order_financials_repository.php` | All read/write/compute/backfill |
| `api/modules/sales/sales_bridge_read_model.php` | Accounting bridge facade |
| `api/modules/sales/orders_persistence_write.php` | Dual-write on create/update |

### Shared (domain)

| File | Purpose |
|------|---------|
| `api/common/orders_domain.php` | `app_order_from_row()` — table-first read with JSON fallback |
| `api/common/schema.php` | `app_ensure_order_financials_tables()` — DDL |
| `database/schema.sql` | Canonical schema definition |

### Accounting Module (consumer — no changes needed)

| File | Purpose |
|------|---------|
| `api/modules/accounting/acc_sales_bridge.php` | Reads via facade, unchanged |

---

## What Stays the Same

- **API response shape**: `financials`, `payments`, `invoiceNotes` keys unchanged
- **Derived fields in response**: `paidTotal`, `dueAmount`, `paymentStatus` still present (computed, not stored)
- **Payment IDs**: Same `uniqid()`-based IDs, same idempotency with bridge log
- **Order code generation**: Unaffected
- **Status enum**: Unaffected
- **items_json**: Stays as-is (separate concern)
- **Frontend**: Zero changes needed
- **Accounting bridge**: Zero changes needed

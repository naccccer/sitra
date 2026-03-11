# Golden Paths

## 1) Customer Order Submission

1. Open `/orders/new`.
2. Fill customer information and line items.
3. Submit order (`POST /api/orders.php`).
4. Confirm order appears in staff order list.

## 2) Staff Order Lifecycle Update

1. Login as `manager` or `admin`.
2. Open `/orders` and select an order.
3. Change status (`PATCH /api/orders.php`) through `pending -> processing -> delivered`.
4. Archive/unarchive (`PATCH /api/orders.php` with `archived` and reverse).

## 3) Owner Module Toggle

1. Login as owner admin (`admin` + `APP_OWNER_UID`).
2. Open `/owner/modules`.
3. Toggle module state (`PATCH /api/module_registry.php`).
4. Verify disabled module is blocked in navigation and permissions-derived capabilities.

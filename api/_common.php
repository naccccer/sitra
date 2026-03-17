<?php
declare(strict_types=1);

/**
 * _common.php - shared helper loader.
 *
 * This file is the single entry point for all shared PHP helpers. It loads
 * the focused sub-modules from api/common/ in dependency order. All existing
 * callers continue to require_once this file unchanged.
 *
 * Load order (each file depends only on files loaded before it):
 *   1. http.php        - CORS, JSON response, method guard, body parse
 *   2. auth.php        - session, CSRF, current user, auth guard
 *   3. audit.php       - audit log table + logging helper
 *   4. orders_domain.php - order status, payment methods, order code, serialization
 *   5. schema.php      - schema introspection, idempotency, orders table, catalog read
 *   6. customers_schema.php - customers/projects schema + order refs
 *   7. customers_domain.php - customers/projects domain helpers
 *   8. customers_order_links.php - order/customer linking helpers
 *   9. users.php       - users table, profile read/write
 *  10. inventory_schema.php - inventory tables and seeds
 *  11. inventory_helpers.php - inventory data mappers and normalization
 *  12. inventory_v2_schema.php - Inventory V2 schema and seeds
 *  13. inventory_v2_helpers.php - Inventory V2 data mappers and guards
 *  14. inventory_v2_operations.php - Inventory V2 posting engine and operation helpers
 *  15. inventory_v2_reservations.php - Inventory V2 reservation helpers
 *  16. inventory_posting.php - stock mutation and document posting
 *  17. inventory_counts.php - inventory counting domain helpers
 *  18. module_registry.php - module registry, user roles
 *  19. permissions.php - RBAC, capabilities
 */

require_once __DIR__ . '/../config/env.php';
app_load_env_local();

require_once __DIR__ . '/common/http.php';
require_once __DIR__ . '/common/auth.php';
require_once __DIR__ . '/common/audit.php';
require_once __DIR__ . '/common/orders_domain.php';
require_once __DIR__ . '/common/schema.php';
require_once __DIR__ . '/common/customers_schema.php';
require_once __DIR__ . '/common/customers_domain.php';
require_once __DIR__ . '/common/customers_order_links.php';
require_once __DIR__ . '/common/users.php';
require_once __DIR__ . '/common/inventory_schema.php';
require_once __DIR__ . '/common/inventory_helpers.php';
require_once __DIR__ . '/common/inventory_v2_schema.php';
require_once __DIR__ . '/common/inventory_v2_helpers.php';
require_once __DIR__ . '/common/inventory_v2_operations.php';
require_once __DIR__ . '/common/inventory_v2_reservations.php';
require_once __DIR__ . '/common/inventory_posting.php';
require_once __DIR__ . '/common/inventory_counts.php';
require_once __DIR__ . '/common/module_registry.php';
require_once __DIR__ . '/common/permissions.php';

app_install_exception_handler();

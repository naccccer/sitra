<?php
declare(strict_types=1);

/**
 * _common.php — shared helper loader.
 *
 * This file is the single entry point for all shared PHP helpers. It loads
 * the focused sub-modules from api/common/ in dependency order. All existing
 * callers continue to require_once this file unchanged.
 *
 * Load order (each file depends only on files loaded before it):
 *   1. http.php        — CORS, JSON response, method guard, body parse
 *   2. auth.php        — session, CSRF, current user, auth guard
 *   3. audit.php       — audit log table + logging helper
 *   4. orders_domain.php — order status, payment methods, order code, serialization
 *   5. schema.php      — schema introspection, idempotency, orders table, catalog read
 *   6. users.php       — users table, profile read/write
 *   7. module_registry.php — module registry, user roles
 *   8. permissions.php — RBAC, capabilities
 */

require_once __DIR__ . '/../config/env.php';
app_load_env_local();

require_once __DIR__ . '/common/http.php';
require_once __DIR__ . '/common/auth.php';
require_once __DIR__ . '/common/audit.php';
require_once __DIR__ . '/common/orders_domain.php';
require_once __DIR__ . '/common/schema.php';
require_once __DIR__ . '/common/users.php';
require_once __DIR__ . '/common/module_registry.php';
require_once __DIR__ . '/common/permissions.php';

app_install_exception_handler();

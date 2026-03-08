<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/ModuleGuard.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);

$user = null;
try {
    $user = app_current_user();
} catch (Throwable $e) {
    $user = null;
}

$catalog = null;
try {
    $catalog = app_read_catalog($pdo);
} catch (Throwable $e) {
    $catalog = null;
}

$profile = null;
try {
    $profile = app_read_profile($pdo);
} catch (Throwable $e) {
    $profile = app_profile_defaults();
}

$role = $user['role'] ?? null;
$modules = app_module_registry($pdo);
$isOwner = app_kernel_is_owner($user);
$permissions = app_permissions_without_kernel_control(app_role_permissions((string)$role, $pdo));
$capabilities = app_module_capabilities($role, $modules, $pdo);
$capabilities['canManageSystemSettings'] = $isOwner;

// Load only the 50 most recent orders to keep bootstrap fast.
// The frontend can load more on demand via GET /api/orders.php?cursor=<id>.
$BOOTSTRAP_LIMIT = 50;
$ordersItems = [];
$ordersTotal = 0;
$ordersHasMore = false;
$ordersNextCursor = null;

if ($user !== null) {
    try {
        app_ensure_orders_table($pdo);

        $countStmt = $pdo->query('SELECT COUNT(*) FROM orders');
        $ordersTotal = (int)($countStmt ? $countStmt->fetchColumn() : 0);

        $fetchLimit = $BOOTSTRAP_LIMIT + 1;
        $stmt = $pdo->query(
            'SELECT ' . app_orders_select_fields($pdo) .
            ' FROM orders ORDER BY id DESC LIMIT ' . $fetchLimit
        );
        $rows = $stmt ? $stmt->fetchAll() : [];

        $ordersHasMore = count($rows) > $BOOTSTRAP_LIMIT;
        if ($ordersHasMore) {
            array_pop($rows);
        }

        foreach ($rows as $row) {
            $ordersItems[] = app_order_from_row($row);
        }

        if ($ordersHasMore && count($ordersItems) > 0) {
            $lastOrder = end($ordersItems);
            $ordersNextCursor = (string)($lastOrder['id'] ?? '');
        }
    } catch (Throwable $e) {
        $ordersItems = [];
    }
}

$response = [
    'success' => true,
    'session' => [
        'authenticated' => $user !== null,
        'role' => $role,
        'username' => $user['username'] ?? null,
    ],
    'permissions' => $permissions,
    'capabilities' => $capabilities,
    'csrfToken' => app_csrf_token(),
    'catalog' => $catalog,
    'profile' => $profile,
    'orders' => [
        'items' => $ordersItems,
        'total' => $ordersTotal,
        'hasMore' => $ordersHasMore,
        'nextCursor' => $ordersNextCursor,
    ],
];

if ($isOwner) {
    $response['modules'] = $modules;
}

app_json($response);

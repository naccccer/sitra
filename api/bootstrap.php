<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

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

$orders = [];

if ($user !== null) {
    try {
        $stmt = $pdo->query('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders ORDER BY ' . app_orders_sort_clause($pdo));
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $orders[] = app_order_from_row($row);
        }
    } catch (Throwable $e) {
        $orders = [];
    }
}

app_json([
    'success' => true,
    'session' => [
        'authenticated' => $user !== null,
        'role' => $user['role'] ?? null,
        'username' => $user['username'] ?? null,
    ],
    'catalog' => $catalog,
    'orders' => $orders,
]);

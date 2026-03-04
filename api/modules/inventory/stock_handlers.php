<?php
declare(strict_types=1);

function app_inventory_stock_handle_get(PDO $pdo): void
{
    app_require_permission('inventory.stock.read', $pdo);
    app_inventory_ensure_tables($pdo);

    $view = trim((string)($_GET['view'] ?? 'reservations'));
    if ($view === '') {
        $view = 'reservations';
    }

    if ($view === 'ledger') {
        $rows = app_inventory_fetch_ledger($pdo, [
            'movementType' => $_GET['movementType'] ?? '',
            'orderRowKey' => $_GET['orderRowKey'] ?? '',
        ]);
        app_json([
            'success' => true,
            'view' => 'ledger',
            'entries' => $rows,
        ]);
    }

    $rows = app_inventory_fetch_reservations($pdo, [
        'status' => $_GET['status'] ?? '',
        'orderRowKey' => $_GET['orderRowKey'] ?? '',
    ]);

    app_json([
        'success' => true,
        'view' => 'reservations',
        'reservations' => $rows,
    ]);
}

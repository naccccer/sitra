<?php
declare(strict_types=1);

function app_sales_orders_normalize_create_status(string $status): string
{
    if (!app_valid_order_status($status)) {
        return 'pending';
    }

    return $status;
}

function app_sales_orders_require_valid_update_status(string $status): void
{
    if (!app_valid_order_status($status)) {
        app_json([
            'success' => false,
            'error' => 'Invalid order status.',
        ], 400);
    }
}

function app_sales_orders_require_valid_patch_status_request(int $id, string $status): void
{
    if ($id <= 0 || !app_valid_order_status($status)) {
        app_json([
            'success' => false,
            'error' => 'Valid id and status are required.',
        ], 400);
    }
}

function app_sales_orders_require_archived_for_delete(string $status): void
{
    if ($status !== 'archived') {
        app_json([
            'success' => false,
            'error' => 'Only archived orders can be deleted.',
        ], 400);
    }
}

<?php
declare(strict_types=1);
require_once __DIR__ . '/orders_idempotency.php';
require_once __DIR__ . '/orders_status.php';
require_once __DIR__ . '/orders_normalization.php';
require_once __DIR__ . '/orders_persistence.php';

function app_sales_orders_handle_get(PDO $pdo): void
{
    app_require_permission('sales.orders.read', $pdo);
    $result = app_sales_orders_get_response($pdo);
    app_json($result['payload'], (int)$result['statusCode']);
}

function app_sales_orders_handle_post(PDO $pdo): void
{
    $payload = app_read_json_body();
    $currentUser = app_current_user();
    $result = app_sales_orders_post_response($pdo, $payload, $currentUser);
    app_json($result['payload'], (int)$result['statusCode']);
}

function app_sales_orders_handle_put(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.update', $pdo);
    $payload = app_read_json_body();
    $result = app_sales_orders_put_response($pdo, $payload, $actor);
    app_json($result['payload'], (int)$result['statusCode']);
}

function app_sales_orders_handle_delete(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.delete', $pdo);
    $payload = app_read_json_body();
    $result = app_sales_orders_delete_response($pdo, $payload, $actor);
    app_json($result['payload'], (int)$result['statusCode']);
}

function app_sales_orders_handle_patch(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.status', $pdo);
    $payload = app_read_json_body();
    $result = app_sales_orders_patch_response($pdo, $payload, $actor);
    app_json($result['payload'], (int)$result['statusCode']);
}

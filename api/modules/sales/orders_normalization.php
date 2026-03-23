<?php
declare(strict_types=1);

require_once __DIR__ . '/orders_status.php';

function app_sales_orders_prepare_create_payload(PDO $pdo, array $payload, bool $isStaff): array
{
    $resolvedCustomerContext = app_customers_resolve_order_context($pdo, $payload, true);
    $customerName = trim((string)($resolvedCustomerContext['customerName'] ?? ($payload['customerName'] ?? '')));
    $phone = trim((string)($resolvedCustomerContext['phone'] ?? ($payload['phone'] ?? '')));
    $customerId = app_customers_parse_id($resolvedCustomerContext['customerId'] ?? null);
    $projectId = app_customers_parse_id($resolvedCustomerContext['projectId'] ?? null);
    $projectContactId = app_customers_parse_id($resolvedCustomerContext['projectContactId'] ?? null);
    $items = $payload['items'] ?? [];
    $total = (int)($payload['total'] ?? 0);
    $status = trim((string)($payload['status'] ?? 'pending'));

    if ($customerName === '' || $phone === '' || !is_array($items) || count($items) === 0) {
        app_json([
            'success' => false,
            'error' => 'customerName, phone and at least one item are required.',
        ], 400);
    }

    if (!$isStaff && app_sales_payload_has_advanced_order_data($payload)) {
        app_json([
            'success' => false,
            'error' => 'Advanced invoice fields are allowed only for authenticated staff.',
        ], 400);
    }

    if ($isStaff) {
        app_sales_validate_override_reasons($items);
    }
    $items = app_sales_sanitize_order_items_for_storage($items);

    $status = app_sales_orders_normalize_create_status($status);

    $orderMeta = app_sales_normalize_order_meta_payload($payload, max(0, $total));
    $total = (int)($orderMeta['financials']['grandTotal'] ?? max(0, $total));

    $orderDate = trim((string)($payload['date'] ?? ''));
    if ($orderDate === '') {
        $orderDate = date('Y/m/d');
    }

    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
    if ($itemsJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize items payload.',
        ], 400);
    }

    return [
        'customerName' => $customerName,
        'phone' => $phone,
        'customerId' => $customerId,
        'projectId' => $projectId,
        'projectContactId' => $projectContactId,
        'status' => $status,
        'total' => max(0, $total),
        'orderDate' => $orderDate,
        'itemsJson' => $itemsJson,
        'orderMeta' => $orderMeta,
        'orderCodeDatePrefix' => app_order_code_date_prefix_jalali(),
    ];
}

function app_sales_orders_prepare_update_payload(PDO $pdo, array $payload): array
{
    $resolvedCustomerContext = app_customers_resolve_order_context($pdo, $payload, true);
    $customerName = trim((string)($resolvedCustomerContext['customerName'] ?? ($payload['customerName'] ?? '')));
    $phone = trim((string)($resolvedCustomerContext['phone'] ?? ($payload['phone'] ?? '')));
    $customerId = app_customers_parse_id($resolvedCustomerContext['customerId'] ?? null);
    $projectId = app_customers_parse_id($resolvedCustomerContext['projectId'] ?? null);
    $projectContactId = app_customers_parse_id($resolvedCustomerContext['projectContactId'] ?? null);
    $items = $payload['items'] ?? [];
    $total = (int)($payload['total'] ?? 0);
    $status = trim((string)($payload['status'] ?? 'pending'));

    if ($customerName === '' || $phone === '' || !is_array($items)) {
        app_json([
            'success' => false,
            'error' => 'customerName, phone and items are required.',
        ], 400);
    }

    app_sales_orders_require_valid_update_status($status);

    app_sales_validate_override_reasons($items);
    $items = app_sales_sanitize_order_items_for_storage($items);

    $orderMeta = app_sales_normalize_order_meta_payload($payload, max(0, $total));
    $total = (int)($orderMeta['financials']['grandTotal'] ?? max(0, $total));

    $orderDate = trim((string)($payload['date'] ?? date('Y/m/d')));

    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
    if ($itemsJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize items payload.',
        ], 400);
    }

    return [
        'customerName' => $customerName,
        'phone' => $phone,
        'customerId' => $customerId,
        'projectId' => $projectId,
        'projectContactId' => $projectContactId,
        'status' => $status,
        'total' => max(0, $total),
        'orderDate' => $orderDate,
        'itemsJson' => $itemsJson,
        'orderMeta' => $orderMeta,
    ];
}

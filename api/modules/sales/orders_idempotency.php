<?php
declare(strict_types=1);

function app_sales_orders_handle_idempotency_request(
    PDO $pdo,
    array $payload,
    string $method,
    ?array $actor
): ?string {
    $clientRequestId = app_validate_client_request_id($payload['clientRequestId'] ?? null);
    if ($clientRequestId !== null) {
        $existing = app_find_idempotent_order_request($pdo, $clientRequestId, $method, '/api/orders.php', $actor);
        if ($existing !== null) {
            $existingPayload = is_array($existing['payload'])
                ? $existing['payload']
                : ['success' => false, 'error' => 'Invalid idempotency response payload.'];
            app_json($existingPayload, (int)$existing['statusCode']);
        }
    }

    return $clientRequestId;
}

function app_sales_orders_store_idempotency_response(
    PDO $pdo,
    ?string $clientRequestId,
    string $method,
    ?array $actor,
    int $orderId,
    array $responsePayload,
    int $statusCode
): void {
    if ($clientRequestId !== null) {
        app_store_idempotent_order_request_response(
            $pdo,
            $clientRequestId,
            $method,
            '/api/orders.php',
            $actor,
            $orderId,
            $responsePayload,
            $statusCode
        );
    }
}

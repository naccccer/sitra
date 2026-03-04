<?php
declare(strict_types=1);

function app_production_labels_parse_positive_int($value): ?int
{
    $number = filter_var($value, FILTER_VALIDATE_INT);
    if ($number === false || $number <= 0) {
        return null;
    }

    return (int)$number;
}

function app_production_labels_load_row(PDO $pdo, ?int $workOrderId, ?string $orderRowKey): ?array
{
    if (($workOrderId === null || $workOrderId <= 0) && ($orderRowKey === null || trim($orderRowKey) === '')) {
        return null;
    }

    $whereParts = [];
    $params = [];
    if ($workOrderId !== null && $workOrderId > 0) {
        $whereParts[] = 'w.id = :work_order_id';
        $params['work_order_id'] = $workOrderId;
    }
    if ($orderRowKey !== null && trim($orderRowKey) !== '') {
        $whereParts[] = 'w.order_row_key = :order_row_key';
        $params['order_row_key'] = trim($orderRowKey);
    }
    if ($whereParts === []) {
        return null;
    }

    $sql = 'SELECT
        w.id AS work_order_id,
        w.work_order_code,
        w.order_line_id,
        w.order_row_key,
        w.requires_drilling,
        w.public_template_url AS work_order_public_template_url,
        w.qr_payload_url AS work_order_qr_payload_url,
        w.status AS work_order_status,
        w.label_print_count AS work_order_label_print_count,
        w.last_label_printed_at AS work_order_last_label_printed_at,
        w.station_key,
        w.created_at AS work_order_created_at,
        w.updated_at AS work_order_updated_at,
        ol.order_id,
        ol.line_no,
        ol.barcode_value,
        ol.requires_drilling AS order_line_requires_drilling,
        ol.template_public_slug,
        ol.public_template_url AS order_line_public_template_url,
        ol.qr_payload_url AS order_line_qr_payload_url,
        ol.width_mm,
        ol.height_mm,
        ol.qty,
        ol.label_print_count AS order_line_label_print_count,
        ol.last_label_printed_at AS order_line_last_label_printed_at,
        o.order_code,
        o.customer_name,
        o.phone,
        o.order_date,
        r.id AS reservation_id,
        r.reservation_code,
        r.qty_reserved,
        r.qty_released,
        r.qty_consumed,
        r.status AS reservation_status
    FROM production_work_orders w
    INNER JOIN order_lines ol ON ol.id = w.order_line_id
    INNER JOIN orders o ON o.id = ol.order_id
    LEFT JOIN inventory_stock_reservations r ON r.work_order_id = w.id
    WHERE ' . implode(' OR ', $whereParts) . '
    ORDER BY w.id DESC
    LIMIT 1';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    return $row;
}

function app_production_label_from_row(array $row): array
{
    $orderRowKey = (string)($row['order_row_key'] ?? '');
    $requiresDrilling = ((int)($row['order_line_requires_drilling'] ?? $row['requires_drilling'] ?? 0)) === 1;
    $orderLinePublicTemplateUrl = $row['order_line_public_template_url'] !== null ? (string)$row['order_line_public_template_url'] : null;
    $workOrderPublicTemplateUrl = $row['work_order_public_template_url'] !== null ? (string)$row['work_order_public_template_url'] : null;
    $publicTemplateUrl = $orderLinePublicTemplateUrl ?? $workOrderPublicTemplateUrl;
    $qrPayloadUrl = $row['order_line_qr_payload_url'] !== null
        ? (string)$row['order_line_qr_payload_url']
        : (string)($row['work_order_qr_payload_url'] ?? '');

    $qtyReserved = (float)($row['qty_reserved'] ?? 0);
    $qtyReleased = (float)($row['qty_released'] ?? 0);
    $qtyConsumed = (float)($row['qty_consumed'] ?? 0);
    $qtyRemaining = max(0.0, $qtyReserved - $qtyReleased - $qtyConsumed);

    return [
        'workOrder' => [
            'id' => (string)$row['work_order_id'],
            'workOrderCode' => (string)$row['work_order_code'],
            'status' => (string)$row['work_order_status'],
            'stationKey' => $row['station_key'] !== null ? (string)$row['station_key'] : null,
            'labelPrintCount' => (int)($row['work_order_label_print_count'] ?? 0),
            'lastLabelPrintedAt' => $row['work_order_last_label_printed_at'] !== null ? (string)$row['work_order_last_label_printed_at'] : null,
            'createdAt' => (string)$row['work_order_created_at'],
            'updatedAt' => (string)$row['work_order_updated_at'],
        ],
        'order' => [
            'id' => (string)$row['order_id'],
            'orderCode' => (string)$row['order_code'],
            'customerName' => (string)$row['customer_name'],
            'phone' => (string)$row['phone'],
            'orderDate' => (string)$row['order_date'],
        ],
        'line' => [
            'orderLineId' => (string)$row['order_line_id'],
            'lineNo' => (int)$row['line_no'],
            'orderRowKey' => $orderRowKey,
            'barcodeValue' => (string)($row['barcode_value'] ?? $orderRowKey),
            'requiresDrilling' => $requiresDrilling,
            'templatePublicSlug' => $row['template_public_slug'] !== null ? (string)$row['template_public_slug'] : null,
            'publicTemplateUrl' => $publicTemplateUrl,
            'qrPayloadUrl' => $qrPayloadUrl !== '' ? $qrPayloadUrl : null,
            'widthMm' => $row['width_mm'] !== null ? (int)$row['width_mm'] : null,
            'heightMm' => $row['height_mm'] !== null ? (int)$row['height_mm'] : null,
            'qty' => (int)($row['qty'] ?? 1),
            'labelPrintCount' => (int)($row['order_line_label_print_count'] ?? 0),
            'lastLabelPrintedAt' => $row['order_line_last_label_printed_at'] !== null ? (string)$row['order_line_last_label_printed_at'] : null,
        ],
        'reservation' => $row['reservation_id'] !== null ? [
            'id' => (string)$row['reservation_id'],
            'reservationCode' => (string)$row['reservation_code'],
            'qtyReserved' => $qtyReserved,
            'qtyReleased' => $qtyReleased,
            'qtyConsumed' => $qtyConsumed,
            'qtyRemaining' => $qtyRemaining,
            'status' => (string)($row['reservation_status'] ?? ''),
        ] : null,
        'label' => [
            'displayKey' => $orderRowKey,
            'alertInverted' => $requiresDrilling,
            'publicTemplateUrl' => $publicTemplateUrl,
            'qrPayloadUrl' => $qrPayloadUrl !== '' ? $qrPayloadUrl : null,
        ],
    ];
}


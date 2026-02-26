<?php
declare(strict_types=1);

function app_production_parse_positive_int($value): ?int
{
    $number = filter_var($value, FILTER_VALIDATE_INT);
    if ($number === false || $number <= 0) {
        return null;
    }

    return (int)$number;
}

function app_production_parse_bool($value): ?bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value)) {
        if ($value === 1) {
            return true;
        }
        if ($value === 0) {
            return false;
        }
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }
    }

    return null;
}

function app_production_table_has_column(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM {$table} LIKE '{$column}'");
        return (bool)($stmt && $stmt->fetch());
    } catch (Throwable $e) {
        return false;
    }
}

function app_production_ensure_order_lines_table(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS order_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id BIGINT UNSIGNED NOT NULL,
            line_no INT UNSIGNED NOT NULL,
            order_row_key VARCHAR(64) NOT NULL,
            barcode_value VARCHAR(128) GENERATED ALWAYS AS (order_row_key) STORED,
            requires_drilling TINYINT(1) NOT NULL DEFAULT 0,
            template_public_slug VARCHAR(180) NULL,
            public_template_url VARCHAR(512) NULL,
            qr_payload_url VARCHAR(512) GENERATED ALWAYS AS (
                COALESCE(NULLIF(public_template_url, ''), CONCAT('/templates/public/', template_public_slug))
            ) STORED,
            item_snapshot_json LONGTEXT NOT NULL,
            width_mm INT UNSIGNED NULL,
            height_mm INT UNSIGNED NULL,
            qty INT UNSIGNED NOT NULL DEFAULT 1,
            unit_price BIGINT NOT NULL DEFAULT 0,
            line_total BIGINT NOT NULL DEFAULT 0,
            production_release_status ENUM('not_released','released') NOT NULL DEFAULT 'not_released',
            label_print_count INT UNSIGNED NOT NULL DEFAULT 0,
            last_label_printed_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_order_lines_order_row_key (order_row_key),
            UNIQUE KEY uq_order_lines_order_line (order_id, line_no),
            KEY idx_order_lines_order_id (order_id),
            KEY idx_order_lines_release_status (production_release_status),
            KEY idx_order_lines_drilling (requires_drilling),
            KEY idx_order_lines_template_slug (template_public_slug),
            CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES orders (id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    try {
        if (!app_production_table_has_column($pdo, 'order_lines', 'requires_drilling')) {
            $pdo->exec("ALTER TABLE order_lines ADD COLUMN requires_drilling TINYINT(1) NOT NULL DEFAULT 0 AFTER order_row_key");
        }
        if (!app_production_table_has_column($pdo, 'order_lines', 'public_template_url')) {
            $pdo->exec("ALTER TABLE order_lines ADD COLUMN public_template_url VARCHAR(512) NULL AFTER template_public_slug");
        }
    } catch (Throwable $e) {
        // Backward compatibility: do not block runtime on alter failures.
    }
}

function app_production_ensure_work_orders_table(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS production_work_orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            work_order_code VARCHAR(64) NOT NULL,
            order_line_id BIGINT UNSIGNED NOT NULL,
            order_row_key VARCHAR(64) NOT NULL,
            requires_drilling TINYINT(1) NOT NULL DEFAULT 0,
            public_template_url VARCHAR(512) NULL,
            qr_payload_url VARCHAR(512) GENERATED ALWAYS AS (
                COALESCE(NULLIF(public_template_url, ''), CONCAT('/templates/public/', order_row_key))
            ) STORED,
            status ENUM('queued','cutting','drilling','tempering','packing','completed','blocked','cancelled') NOT NULL DEFAULT 'queued',
            priority TINYINT UNSIGNED NOT NULL DEFAULT 3,
            station_key VARCHAR(64) NULL,
            planned_start_at DATETIME NULL,
            planned_end_at DATETIME NULL,
            completed_at DATETIME NULL,
            label_print_count INT UNSIGNED NOT NULL DEFAULT 0,
            last_label_printed_at DATETIME NULL,
            notes VARCHAR(500) NULL,
            created_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_production_work_order_code (work_order_code),
            UNIQUE KEY uq_production_work_orders_order_line (order_line_id),
            KEY idx_production_work_orders_status (status),
            KEY idx_production_work_orders_order_row_key (order_row_key),
            KEY idx_production_work_orders_drilling (requires_drilling),
            KEY idx_production_work_orders_station (station_key),
            CONSTRAINT fk_production_work_orders_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_production_work_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_production_ensure_work_order_events_table(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS production_work_order_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            work_order_id BIGINT UNSIGNED NOT NULL,
            event_type VARCHAR(80) NOT NULL,
            from_status VARCHAR(40) NULL,
            to_status VARCHAR(40) NULL,
            payload_json LONGTEXT NULL,
            note VARCHAR(500) NULL,
            actor_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_production_events_work_order (work_order_id),
            KEY idx_production_events_type_created (event_type, created_at),
            KEY idx_production_events_actor_created (actor_user_id, created_at),
            CONSTRAINT fk_production_events_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_production_events_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_production_ensure_tables(PDO $pdo): void
{
    app_ensure_orders_table($pdo);
    app_production_ensure_order_lines_table($pdo);
    app_production_ensure_work_orders_table($pdo);
    app_production_ensure_work_order_events_table($pdo);
}

function app_production_build_order_row_key(int $orderId, int $lineNo): string
{
    return $orderId . '-' . $lineNo;
}

function app_production_is_manual_without_production_impact(array $item): bool
{
    $itemType = (string)($item['itemType'] ?? 'catalog');
    if ($itemType !== 'manual') {
        return false;
    }

    $manual = is_array($item['manual'] ?? null) ? $item['manual'] : [];
    return !((bool)($manual['productionImpact'] ?? false));
}

function app_production_detect_requires_drilling(array $item): bool
{
    $explicit = app_production_parse_bool($item['requiresDrilling'] ?? null);
    if ($explicit !== null) {
        return $explicit;
    }

    $operations = is_array($item['operations'] ?? null) ? $item['operations'] : [];
    foreach ($operations as $operationId => $qty) {
        $quantity = (int)$qty;
        if ($quantity <= 0) {
            continue;
        }

        $key = strtolower((string)$operationId);
        if (str_contains($key, 'hole') || str_contains($key, 'drill')) {
            return true;
        }
    }

    return false;
}

function app_production_resolve_template_fields(array $item, array $lineOverride, string $orderRowKey): array
{
    $overrideSlug = trim((string)($lineOverride['templatePublicSlug'] ?? ''));
    $overrideUrl = trim((string)($lineOverride['publicTemplateUrl'] ?? ''));
    if ($overrideSlug !== '' || $overrideUrl !== '') {
        return [
            'templatePublicSlug' => $overrideSlug !== '' ? $overrideSlug : $orderRowKey,
            'publicTemplateUrl' => $overrideUrl !== '' ? $overrideUrl : null,
        ];
    }

    $itemSlug = trim((string)($item['templatePublicSlug'] ?? ''));
    $itemUrl = trim((string)($item['publicTemplateUrl'] ?? ''));
    if ($itemSlug !== '' || $itemUrl !== '') {
        return [
            'templatePublicSlug' => $itemSlug !== '' ? $itemSlug : $orderRowKey,
            'publicTemplateUrl' => $itemUrl !== '' ? $itemUrl : null,
        ];
    }

    return [
        'templatePublicSlug' => $orderRowKey,
        'publicTemplateUrl' => null,
    ];
}

function app_production_work_order_code(string $orderRowKey): string
{
    $safeRowKey = preg_replace('/[^A-Za-z0-9\-]+/', '-', $orderRowKey);
    if (!is_string($safeRowKey) || trim($safeRowKey) === '') {
        $safeRowKey = str_replace('.', '', uniqid('ROW', true));
    }

    return 'WO-' . strtoupper($safeRowKey);
}

function app_production_collect_release_lines(array $order, array $lineNos): array
{
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $lineSet = [];
    foreach ($lineNos as $lineNoRaw) {
        $lineNo = app_production_parse_positive_int($lineNoRaw);
        if ($lineNo !== null) {
            $lineSet[$lineNo] = true;
        }
    }

    $result = [];
    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $lineNo = $index + 1;
        if ($lineSet !== [] && !isset($lineSet[$lineNo])) {
            continue;
        }

        if (app_production_is_manual_without_production_impact($item)) {
            continue;
        }

        $result[] = [
            'lineNo' => $lineNo,
            'item' => $item,
        ];
    }

    return $result;
}

function app_production_upsert_order_line(PDO $pdo, int $orderId, array $line, bool $requiresDrilling, string $orderRowKey, ?string $templatePublicSlug, ?string $publicTemplateUrl): int
{
    $item = $line['item'];
    $dimensions = is_array($item['dimensions'] ?? null) ? $item['dimensions'] : [];
    $manual = is_array($item['manual'] ?? null) ? $item['manual'] : [];

    $qty = max(1, (int)($dimensions['count'] ?? $manual['qty'] ?? 1));
    $widthMm = app_production_parse_positive_int($dimensions['width'] ?? null);
    $heightMm = app_production_parse_positive_int($dimensions['height'] ?? null);
    $unitPrice = max(0, (int)($item['unitPrice'] ?? 0));
    $lineTotal = max(0, (int)($item['totalPrice'] ?? ($unitPrice * $qty)));

    $snapshotJson = json_encode($item, JSON_UNESCAPED_UNICODE);
    if ($snapshotJson === false) {
        $snapshotJson = '{}';
    }

    $stmt = $pdo->prepare(
        'INSERT INTO order_lines (
            order_id, line_no, order_row_key, requires_drilling,
            template_public_slug, public_template_url, item_snapshot_json,
            width_mm, height_mm, qty, unit_price, line_total, production_release_status
         ) VALUES (
            :order_id, :line_no, :order_row_key, :requires_drilling,
            :template_public_slug, :public_template_url, :item_snapshot_json,
            :width_mm, :height_mm, :qty, :unit_price, :line_total, :release_status
         )
         ON DUPLICATE KEY UPDATE
            order_row_key = VALUES(order_row_key),
            requires_drilling = VALUES(requires_drilling),
            template_public_slug = VALUES(template_public_slug),
            public_template_url = VALUES(public_template_url),
            item_snapshot_json = VALUES(item_snapshot_json),
            width_mm = VALUES(width_mm),
            height_mm = VALUES(height_mm),
            qty = VALUES(qty),
            unit_price = VALUES(unit_price),
            line_total = VALUES(line_total),
            production_release_status = VALUES(production_release_status)'
    );
    $stmt->execute([
        'order_id' => $orderId,
        'line_no' => (int)$line['lineNo'],
        'order_row_key' => $orderRowKey,
        'requires_drilling' => $requiresDrilling ? 1 : 0,
        'template_public_slug' => $templatePublicSlug,
        'public_template_url' => $publicTemplateUrl,
        'item_snapshot_json' => $snapshotJson,
        'width_mm' => $widthMm,
        'height_mm' => $heightMm,
        'qty' => $qty,
        'unit_price' => $unitPrice,
        'line_total' => $lineTotal,
        'release_status' => 'released',
    ]);

    $select = $pdo->prepare('SELECT id FROM order_lines WHERE order_id = :order_id AND line_no = :line_no LIMIT 1');
    $select->execute([
        'order_id' => $orderId,
        'line_no' => (int)$line['lineNo'],
    ]);
    $row = $select->fetch();
    if (!$row) {
        throw new RuntimeException('Unable to resolve order line after upsert.');
    }

    return (int)$row['id'];
}


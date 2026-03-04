<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

function app_kernel_audit_logs_parse_datetime_or_fail(string $value, string $field): ?string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }

    $timestamp = strtotime($trimmed);
    if ($timestamp === false) {
        app_json([
            'success' => false,
            'error' => "Invalid {$field} datetime.",
        ], 400);
    }

    return date('Y-m-d H:i:s', $timestamp);
}

app_handle_preflight(['GET']);
app_require_method(['GET']);
app_require_permission('kernel.audit.read', $pdo);
app_ensure_audit_logs_table($pdo);

$page = max(1, (int)($_GET['page'] ?? 1));
$pageSize = (int)($_GET['pageSize'] ?? 25);
if ($pageSize <= 0) {
    $pageSize = 25;
}
if ($pageSize > 100) {
    $pageSize = 100;
}
$offset = ($page - 1) * $pageSize;

$from = app_kernel_audit_logs_parse_datetime_or_fail((string)($_GET['from'] ?? ''), 'from');
$to = app_kernel_audit_logs_parse_datetime_or_fail((string)($_GET['to'] ?? ''), 'to');
$eventType = trim((string)($_GET['eventType'] ?? ''));
$actor = trim((string)($_GET['actor'] ?? ''));

$whereParts = [];
$params = [];

if ($from !== null) {
    $whereParts[] = 'created_at >= :from_at';
    $params['from_at'] = $from;
}
if ($to !== null) {
    $whereParts[] = 'created_at <= :to_at';
    $params['to_at'] = $to;
}
if ($eventType !== '') {
    $whereParts[] = 'event_type = :event_type';
    $params['event_type'] = $eventType;
}
if ($actor !== '') {
    $whereParts[] = '(actor_username LIKE :actor_like OR actor_user_id LIKE :actor_like)';
    $params['actor_like'] = '%' . $actor . '%';
}

$whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));

$countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM audit_logs' . $whereSql);
$countStmt->execute($params);
$countRow = $countStmt->fetch();
$total = (int)($countRow['total'] ?? 0);
$totalPages = max(1, (int)ceil($total / $pageSize));

$selectSql = 'SELECT
        id,
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        actor_username,
        actor_role,
        payload_json,
        created_at
    FROM audit_logs' . $whereSql . '
    ORDER BY created_at DESC, id DESC
    LIMIT :limit OFFSET :offset';

$listStmt = $pdo->prepare($selectSql);
foreach ($params as $key => $value) {
    $listStmt->bindValue(':' . $key, $value, PDO::PARAM_STR);
}
$listStmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
$listStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$listStmt->execute();
$rows = $listStmt->fetchAll();

$logs = array_map(static function (array $row): array {
    $payload = null;
    $payloadRaw = $row['payload_json'] ?? null;
    if (is_string($payloadRaw) && $payloadRaw !== '') {
        $decoded = json_decode($payloadRaw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $payload = $decoded;
        } else {
            $payload = ['_raw' => $payloadRaw];
        }
    }

    return [
        'id' => (string)$row['id'],
        'eventType' => (string)$row['event_type'],
        'entityType' => (string)$row['entity_type'],
        'entityId' => $row['entity_id'] !== null ? (string)$row['entity_id'] : null,
        'actor' => [
            'userId' => $row['actor_user_id'] !== null ? (string)$row['actor_user_id'] : null,
            'username' => $row['actor_username'] !== null ? (string)$row['actor_username'] : null,
            'role' => $row['actor_role'] !== null ? (string)$row['actor_role'] : null,
        ],
        'payload' => $payload,
        'createdAt' => (string)$row['created_at'],
    ];
}, $rows);

$eventTypesStmt = $pdo->query('SELECT DISTINCT event_type FROM audit_logs ORDER BY event_type ASC');
$eventTypeRows = $eventTypesStmt ? $eventTypesStmt->fetchAll() : [];
$eventTypes = [];
foreach ($eventTypeRows as $eventRow) {
    $key = trim((string)($eventRow['event_type'] ?? ''));
    if ($key === '') {
        continue;
    }
    $eventTypes[] = $key;
}

app_json([
    'success' => true,
    'logs' => $logs,
    'pagination' => [
        'page' => $page,
        'pageSize' => $pageSize,
        'total' => $total,
        'totalPages' => $totalPages,
    ],
    'eventTypes' => $eventTypes,
]);

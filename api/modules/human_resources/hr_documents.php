<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'DELETE']);
$method = app_require_method(['GET', 'POST', 'DELETE']);
app_require_module_enabled($pdo, 'human-resources');
app_ensure_human_resources_schema($pdo);

require_once __DIR__ . '/../../common/human_resources_documents.php';

$actor = app_require_auth(['admin', 'manager']);

if ($method === 'GET') {
    if (!app_user_has_permission($actor, 'human_resources.employees.read', $pdo)) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }

    $employeeId = app_hr_parse_id($_GET['employeeId'] ?? null);
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'Valid employeeId is required.'], 400);
    }

    app_json(['success' => true, 'documents' => app_hr_list_documents($pdo, $employeeId)]);
}

app_require_csrf();
if (!app_user_has_permission($actor, 'human_resources.employees.write', $pdo)) {
    app_json(['success' => false, 'error' => 'Access denied.'], 403);
}

if ($method === 'POST') {
    $employeeId = app_hr_parse_id($_POST['employeeId'] ?? null);
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'Valid employeeId is required.'], 400);
    }

    $title = trim((string)($_POST['title'] ?? ''));
    if ($title === '') {
        app_json(['success' => false, 'error' => 'عنوان مدرک الزامی است.'], 400);
    }

    if (!isset($_FILES['document'])) {
        app_json(['success' => false, 'error' => 'فایلی انتخاب نشده است.'], 400);
    }

    $file = $_FILES['document'];
    if (!isset($file['error']) || is_array($file['error'])) {
        app_json(['success' => false, 'error' => 'Invalid upload payload.'], 400);
    }

    if ((int)$file['error'] !== UPLOAD_ERR_OK) {
        app_json(['success' => false, 'error' => 'آپلود فایل ناموفق بود.'], 400);
    }

    $maxSize = 10 * 1024 * 1024;
    if ((int)$file['size'] > $maxSize) {
        app_json(['success' => false, 'error' => 'حجم فایل بیش از ۱۰ مگابایت است.'], 413);
    }

    $originalName = (string)($file['name'] ?? '');
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $allowed, true)) {
        app_json(['success' => false, 'error' => 'فرمت فایل مجاز نیست. (pdf, jpg, png)'], 415);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string)$finfo->file($file['tmp_name']);

    $uploadDir = __DIR__ . '/../../uploads/hr';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        app_json(['success' => false, 'error' => 'Unable to create upload directory.'], 500);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination = $uploadDir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        app_json(['success' => false, 'error' => 'ذخیره فایل ناموفق بود.'], 500);
    }

    $fileInfo = [
        'filePath' => '/api/uploads/hr/' . $filename,
        'originalName' => $originalName,
        'fileSize' => (int)$file['size'],
        'mimeType' => $mimeType,
    ];

    $document = app_hr_save_document($pdo, $employeeId, $title, $fileInfo, $actor);
    app_json(['success' => true, 'document' => $document], 201);
}

if ($method === 'DELETE') {
    $payload = app_read_json_body();
    $documentId = app_hr_parse_id($payload['id'] ?? ($_GET['id'] ?? null));
    if ($documentId === null) {
        app_json(['success' => false, 'error' => 'Valid document id is required.'], 400);
    }

    $deleted = app_hr_delete_document($pdo, $documentId, $actor);
    if (!$deleted) {
        app_json(['success' => false, 'error' => 'Document not found.'], 404);
    }

    app_json(['success' => true, 'deleted' => true]);
}

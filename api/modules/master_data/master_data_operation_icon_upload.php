<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_require_module_enabled($pdo, 'master-data');
$actor = app_require_permission('master_data.catalog.write', $pdo);
app_require_csrf();

const MAX_OPERATION_ICON_SIZE_BYTES = 2 * 1024 * 1024;

if (!isset($_FILES['iconFile'])) {
    app_json([
        'success' => false,
        'error' => 'No file uploaded. Expected field: iconFile',
    ], 400);
}

$file = $_FILES['iconFile'];
if (!isset($file['error']) || is_array($file['error'])) {
    app_json([
        'success' => false,
        'error' => 'Invalid upload payload.',
    ], 400);
}

switch ((int)$file['error']) {
    case UPLOAD_ERR_OK:
        break;
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
        app_json([
            'success' => false,
            'error' => 'File is larger than 2MB.',
            'maxSizeBytes' => MAX_OPERATION_ICON_SIZE_BYTES,
        ], 413);
        break;
    case UPLOAD_ERR_NO_FILE:
        app_json([
            'success' => false,
            'error' => 'No file uploaded.',
        ], 400);
        break;
    default:
        app_json([
            'success' => false,
            'error' => 'File upload failed.',
            'uploadErrorCode' => (int)$file['error'],
        ], 400);
}

if ((int)$file['size'] > MAX_OPERATION_ICON_SIZE_BYTES) {
    app_json([
        'success' => false,
        'error' => 'File is larger than 2MB.',
        'maxSizeBytes' => MAX_OPERATION_ICON_SIZE_BYTES,
    ], 413);
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
if (!in_array($extension, $allowedExtensions, true)) {
    app_json([
        'success' => false,
        'error' => 'Only jpg, jpeg, png, webp, svg are allowed.',
    ], 415);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string)$finfo->file($file['tmp_name']);
$allowedMimeByExtension = [
    'jpg' => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png' => ['image/png'],
    'webp' => ['image/webp'],
    'svg' => ['image/svg+xml', 'text/plain', 'application/xml'],
];
$allowedMimes = $allowedMimeByExtension[$extension] ?? [];
if (!in_array($mimeType, $allowedMimes, true)) {
    app_json([
        'success' => false,
        'error' => 'Unsupported MIME type.',
        'mimeType' => $mimeType,
    ], 415);
}

$iconsDir = __DIR__ . '/../../uploads/operations';
if (!is_dir($iconsDir) && !mkdir($iconsDir, 0755, true) && !is_dir($iconsDir)) {
    app_json([
        'success' => false,
        'error' => 'Unable to create operations upload directory.',
    ], 500);
}

if (!is_writable($iconsDir)) {
    app_json([
        'success' => false,
        'error' => 'Operations upload directory is not writable.',
    ], 500);
}

try {
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
} catch (Throwable $e) {
    app_json([
        'success' => false,
        'error' => 'Unable to generate secure filename.',
    ], 500);
}

$destination = $iconsDir . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    app_json([
        'success' => false,
        'error' => 'Unable to store uploaded file.',
    ], 500);
}

$filePath = '/api/uploads/operations/' . $filename;
app_audit_log(
    $pdo,
    'master_data.operation_icon.uploaded',
    'filesystem',
    $filename,
    [
        'filePath' => $filePath,
        'originalName' => $originalName,
        'mimeType' => $mimeType,
        'size' => (int)$file['size'],
    ],
    $actor
);

app_json([
    'success' => true,
    'filePath' => $filePath,
    'originalName' => $originalName,
    'mimeType' => $mimeType,
    'size' => (int)$file['size'],
    'maxSizeBytes' => MAX_OPERATION_ICON_SIZE_BYTES,
]);

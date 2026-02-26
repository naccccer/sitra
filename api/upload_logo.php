<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_require_auth(['admin', 'manager']);
app_require_csrf();

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

if (!isset($_FILES['logoFile'])) {
    app_json([
        'success' => false,
        'error' => 'No file uploaded. Expected field: logoFile',
    ], 400);
}

$file = $_FILES['logoFile'];
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
            'maxSizeBytes' => MAX_LOGO_SIZE_BYTES,
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

if ((int)$file['size'] > MAX_LOGO_SIZE_BYTES) {
    app_json([
        'success' => false,
        'error' => 'File is larger than 2MB.',
        'maxSizeBytes' => MAX_LOGO_SIZE_BYTES,
    ], 413);
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
if (!in_array($extension, $allowedExtensions, true)) {
    app_json([
        'success' => false,
        'error' => 'Only jpg, jpeg, png, webp are allowed.',
    ], 415);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string)$finfo->file($file['tmp_name']);
$allowedMimeByExtension = [
    'jpg' => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png' => ['image/png'],
    'webp' => ['image/webp'],
];
$allowedMimes = $allowedMimeByExtension[$extension] ?? [];
if (!in_array($mimeType, $allowedMimes, true)) {
    app_json([
        'success' => false,
        'error' => 'Unsupported MIME type.',
        'mimeType' => $mimeType,
    ], 415);
}

$brandingDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'branding';
if (!is_dir($brandingDir) && !mkdir($brandingDir, 0755, true) && !is_dir($brandingDir)) {
    app_json([
        'success' => false,
        'error' => 'Unable to create branding upload directory.',
    ], 500);
}

if (!is_writable($brandingDir)) {
    app_json([
        'success' => false,
        'error' => 'Branding upload directory is not writable.',
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

$destination = $brandingDir . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    app_json([
        'success' => false,
        'error' => 'Unable to store uploaded file.',
    ], 500);
}

app_json([
    'success' => true,
    'filePath' => '/api/uploads/branding/' . $filename,
    'originalName' => $originalName,
    'mimeType' => $mimeType,
    'size' => (int)$file['size'],
    'maxSizeBytes' => MAX_LOGO_SIZE_BYTES,
]);

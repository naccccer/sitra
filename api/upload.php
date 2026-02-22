<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

if (!isset($_FILES['patternFile'])) {
    app_json([
        'success' => false,
        'error' => 'No file uploaded. Expected field: patternFile',
    ], 400);
}

$file = $_FILES['patternFile'];
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
            'error' => 'File is larger than 5MB.',
            'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
        ], 413);
    case UPLOAD_ERR_NO_FILE:
        app_json([
            'success' => false,
            'error' => 'No file uploaded.',
        ], 400);
    default:
        app_json([
            'success' => false,
            'error' => 'File upload failed.',
            'uploadErrorCode' => (int)$file['error'],
        ], 400);
}

if ((int)$file['size'] > MAX_FILE_SIZE_BYTES) {
    app_json([
        'success' => false,
        'error' => 'File is larger than 5MB.',
        'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
    ], 413);
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['pdf', 'dwg', 'dxf', 'jpg', 'jpeg', 'png'];

if (!in_array($extension, $allowedExtensions, true)) {
    app_json([
        'success' => false,
        'error' => 'Unsupported file extension.',
    ], 415);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string)$finfo->file($file['tmp_name']);

$allowedMimeByExtension = [
    'pdf' => ['application/pdf'],
    'jpg' => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png' => ['image/png'],
    'dwg' => ['application/octet-stream', 'image/vnd.dwg', 'application/acad', 'application/x-acad'],
    'dxf' => ['application/octet-stream', 'image/vnd.dxf', 'application/dxf', 'application/x-dxf', 'text/plain'],
];

$allowedMimes = $allowedMimeByExtension[$extension] ?? [];
if (!in_array($mimeType, $allowedMimes, true)) {
    app_json([
        'success' => false,
        'error' => 'Unsupported MIME type.',
        'mimeType' => $mimeType,
    ], 415);
}

$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    app_json([
        'success' => false,
        'error' => 'Unable to create upload directory.',
    ], 500);
}

if (!is_writable($uploadDir)) {
    app_json([
        'success' => false,
        'error' => 'Upload directory is not writable.',
    ], 500);
}

try {
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
} catch (Throwable $exception) {
    app_json([
        'success' => false,
        'error' => 'Unable to generate secure filename.',
    ], 500);
}

$destination = $uploadDir . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    app_json([
        'success' => false,
        'error' => 'Unable to store uploaded file.',
    ], 500);
}

app_json([
    'success' => true,
    'filePath' => '/api/uploads/' . $filename,
    'originalName' => $originalName,
    'mimeType' => $mimeType,
    'size' => (int)$file['size'],
    'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
]);

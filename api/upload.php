<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'error' => 'Method not allowed.',
    ]);
}

if (!isset($_FILES['patternFile'])) {
    respond(400, [
        'success' => false,
        'error' => 'No file uploaded. Expected field name: patternFile.',
    ]);
}

$file = $_FILES['patternFile'];

if (!isset($file['error']) || is_array($file['error'])) {
    respond(400, [
        'success' => false,
        'error' => 'Invalid upload payload.',
    ]);
}

switch ($file['error']) {
    case UPLOAD_ERR_OK:
        break;
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
        respond(413, [
            'success' => false,
            'error' => 'File size exceeds the maximum allowed size (5MB).',
            'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
        ]);
    case UPLOAD_ERR_NO_FILE:
        respond(400, [
            'success' => false,
            'error' => 'No file uploaded.',
        ]);
    default:
        respond(400, [
            'success' => false,
            'error' => 'File upload failed.',
            'uploadErrorCode' => (int)$file['error'],
        ]);
}

if ((int)$file['size'] > MAX_FILE_SIZE_BYTES) {
    respond(413, [
        'success' => false,
        'error' => 'File size exceeds the maximum allowed size (5MB).',
        'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
    ]);
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowedExtensions = ['pdf', 'dwg', 'dxf', 'jpg', 'png'];

if (!in_array($extension, $allowedExtensions, true)) {
    respond(415, [
        'success' => false,
        'error' => 'File extension is not allowed.',
    ]);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string)$finfo->file($file['tmp_name']);

$allowedMimesByExtension = [
    'pdf' => ['application/pdf'],
    'jpg' => ['image/jpeg'],
    'png' => ['image/png'],
    // CAD files vary by client and OS detection, so allow common safe values.
    'dwg' => ['application/octet-stream', 'image/vnd.dwg', 'application/acad', 'application/x-acad'],
    'dxf' => ['application/octet-stream', 'image/vnd.dxf', 'application/dxf', 'application/x-dxf', 'text/plain'],
];

$allowedMimes = $allowedMimesByExtension[$extension] ?? [];
if (!in_array($mimeType, $allowedMimes, true)) {
    respond(415, [
        'success' => false,
        'error' => 'File MIME type is not allowed.',
        'mimeType' => $mimeType,
    ]);
}

$uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    respond(500, [
        'success' => false,
        'error' => 'Failed to create upload directory.',
    ]);
}

if (!is_writable($uploadDir)) {
    respond(500, [
        'success' => false,
        'error' => 'Upload directory is not writable.',
    ]);
}

try {
    $randomFilename = bin2hex(random_bytes(16)) . '.' . $extension;
} catch (Throwable $e) {
    respond(500, [
        'success' => false,
        'error' => 'Failed to generate a secure filename.',
    ]);
}

$destinationPath = $uploadDir . DIRECTORY_SEPARATOR . $randomFilename;
if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
    respond(500, [
        'success' => false,
        'error' => 'Failed to store uploaded file.',
    ]);
}

respond(200, [
    'success' => true,
    'filePath' => '/uploads/' . $randomFilename,
    'originalName' => $originalName,
    'mimeType' => $mimeType,
    'size' => (int)$file['size'],
    'maxSizeBytes' => MAX_FILE_SIZE_BYTES,
]);

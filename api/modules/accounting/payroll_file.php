<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/payroll_helpers.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);
acc_payroll_ensure($pdo);

$actor = app_require_auth(['admin', 'manager']);
acc_require_permission($actor, 'accounting.payroll.write', $pdo);
app_require_csrf();

const ACC_PAYROLL_MAX_PDF_SIZE = 10 * 1024 * 1024;

$payslipId = acc_parse_id($_POST['payslipId'] ?? null);
if ($payslipId === null) {
    app_json(['success' => false, 'error' => 'Valid payslipId is required.'], 400);
}
if (!acc_payroll_fetch_payslip_detail($pdo, $payslipId)) {
    app_json(['success' => false, 'error' => 'Payslip not found.'], 404);
}
if (!isset($_FILES['payrollPdf'])) {
    app_json(['success' => false, 'error' => 'No file uploaded. Expected field: payrollPdf'], 400);
}

$file = $_FILES['payrollPdf'];
if (!isset($file['error']) || is_array($file['error'])) {
    app_json(['success' => false, 'error' => 'Invalid upload payload.'], 400);
}
if ((int)$file['error'] !== UPLOAD_ERR_OK) {
    app_json(['success' => false, 'error' => 'File upload failed.', 'uploadErrorCode' => (int)$file['error']], 400);
}
if ((int)$file['size'] > ACC_PAYROLL_MAX_PDF_SIZE) {
    app_json(['success' => false, 'error' => 'File is larger than 10MB.', 'maxSizeBytes' => ACC_PAYROLL_MAX_PDF_SIZE], 413);
}

$originalName = (string)($file['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
if ($extension !== 'pdf') {
    app_json(['success' => false, 'error' => 'Only PDF files are allowed.'], 415);
}

$mimeType = (string)(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if ($mimeType !== 'application/pdf') {
    app_json(['success' => false, 'error' => 'Unsupported MIME type.', 'mimeType' => $mimeType], 415);
}

$uploadDir = __DIR__ . '/../../uploads/payroll';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    app_json(['success' => false, 'error' => 'Unable to create payroll upload directory.'], 500);
}
if (!is_writable($uploadDir)) {
    app_json(['success' => false, 'error' => 'Payroll upload directory is not writable.'], 500);
}

try {
    $storedName = bin2hex(random_bytes(16)) . '.pdf';
} catch (Throwable $e) {
    app_json(['success' => false, 'error' => 'Unable to generate secure filename.'], 500);
}

$destination = $uploadDir . DIRECTORY_SEPARATOR . $storedName;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    app_json(['success' => false, 'error' => 'Unable to store uploaded file.'], 500);
}

$relativePath = '/api/uploads/payroll/' . $storedName;
$stmt = $pdo->prepare('INSERT INTO acc_payslip_documents (payslip_id, document_type, original_name, stored_name, file_path, mime_type, file_size, uploaded_by_user_id) VALUES (:payslip_id, :document_type, :original_name, :stored_name, :file_path, :mime_type, :file_size, :user_id)');
$stmt->execute([
    'payslip_id' => $payslipId,
    'document_type' => 'pdf',
    'original_name' => $originalName,
    'stored_name' => $storedName,
    'file_path' => $relativePath,
    'mime_type' => $mimeType,
    'file_size' => (int)$file['size'],
    'user_id' => (int)$actor['id'],
]);

$documentId = (int)$pdo->lastInsertId();
app_audit_log($pdo, 'accounting.payroll.document.uploaded', 'acc_payslip_documents', (string)$documentId, ['payslipId' => $payslipId, 'filePath' => $relativePath], $actor);

app_json([
    'success' => true,
    'document' => [
        'id' => (string)$documentId,
        'payslipId' => (string)$payslipId,
        'documentType' => 'pdf',
        'originalName' => $originalName,
        'filePath' => $relativePath,
        'mimeType' => $mimeType,
        'fileSize' => (int)$file['size'],
    ],
]);

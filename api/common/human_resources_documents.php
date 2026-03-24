<?php
declare(strict_types=1);

function app_hr_document_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'employeeId' => (string)($row['employee_id'] ?? ''),
        'title' => (string)($row['title'] ?? ''),
        'filePath' => (string)($row['file_path'] ?? ''),
        'originalName' => (string)($row['original_name'] ?? ''),
        'fileSize' => (int)($row['file_size'] ?? 0),
        'mimeType' => (string)($row['mime_type'] ?? ''),
        'createdAt' => (string)($row['created_at'] ?? ''),
    ];
}

function app_hr_list_documents(PDO $pdo, int $employeeId): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM hr_documents WHERE employee_id = :employee_id ORDER BY created_at DESC'
    );
    $stmt->execute(['employee_id' => $employeeId]);
    return array_map('app_hr_document_from_row', $stmt->fetchAll() ?: []);
}

function app_hr_fetch_document(PDO $pdo, int $documentId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM hr_documents WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $documentId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function app_hr_save_document(PDO $pdo, int $employeeId, string $title, array $fileInfo, array $actor): array
{
    $pdo->prepare(
        'INSERT INTO hr_documents (employee_id, title, file_path, original_name, file_size, mime_type, created_by_user_id)
         VALUES (:employee_id, :title, :file_path, :original_name, :file_size, :mime_type, :created_by_user_id)'
    )->execute([
        'employee_id' => $employeeId,
        'title' => $title,
        'file_path' => (string)($fileInfo['filePath'] ?? ''),
        'original_name' => (string)($fileInfo['originalName'] ?? ''),
        'file_size' => (int)($fileInfo['fileSize'] ?? 0),
        'mime_type' => (string)($fileInfo['mimeType'] ?? ''),
        'created_by_user_id' => (int)$actor['id'],
    ]);

    $documentId = (int)$pdo->lastInsertId();
    app_audit_log($pdo, 'human_resources.document.created', 'hr_documents', (string)$documentId, [
        'employeeId' => $employeeId,
        'title' => $title,
    ], $actor);

    $row = app_hr_fetch_document($pdo, $documentId);
    return app_hr_document_from_row($row ?: []);
}

function app_hr_delete_document(PDO $pdo, int $documentId, array $actor): bool
{
    $row = app_hr_fetch_document($pdo, $documentId);
    if (!$row) {
        return false;
    }

    $filePath = (string)($row['file_path'] ?? '');
    $pdo->prepare('DELETE FROM hr_documents WHERE id = :id')->execute(['id' => $documentId]);

    app_audit_log($pdo, 'human_resources.document.deleted', 'hr_documents', (string)$documentId, [
        'employeeId' => (string)($row['employee_id'] ?? ''),
        'title' => (string)($row['title'] ?? ''),
    ], $actor);

    if ($filePath !== '') {
        $absolutePath = __DIR__ . '/../' . ltrim($filePath, '/');
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    return true;
}

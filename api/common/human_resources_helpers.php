<?php
declare(strict_types=1);

function app_hr_parse_id($value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }

    $id = (int)$raw;
    return $id > 0 ? $id : null;
}

function app_hr_normalize_text($value): string
{
    return trim((string)$value);
}

function app_hr_parse_bool($value, ?bool $fallback = null): ?bool
{
    if (is_bool($value)) {
        return $value;
    }

    $raw = strtolower(trim((string)$value));
    if (in_array($raw, ['1', 'true', 'yes'], true)) {
        return true;
    }
    if (in_array($raw, ['0', 'false', 'no'], true)) {
        return false;
    }

    return $fallback;
}

function app_hr_handle_write_exception(Throwable $error): void
{
    $message = (string)$error->getMessage();
    if ($error instanceof PDOException && (string)$error->getCode() === '23000') {
        if (str_contains($message, 'uq_hr_employees_code')) {
            app_json(['success' => false, 'error' => 'کد پرسنلی تکراری است.'], 409);
        }
        if (str_contains($message, 'uq_hr_employees_personnel_no')) {
            app_json(['success' => false, 'error' => 'شماره پرسنلی تکراری است.'], 409);
        }
    }
}

function app_hr_employee_from_row(array $row): array
{
    $firstName = (string)($row['first_name'] ?? '');
    $lastName = (string)($row['last_name'] ?? '');
    $fullName = trim($firstName . ' ' . $lastName);
    $defaultInputs = json_decode((string)($row['default_inputs_json'] ?? 'null'), true);

    return [
        'id' => (string)($row['id'] ?? ''),
        'employeeCode' => (string)($row['employee_code'] ?? ''),
        'code' => (string)($row['employee_code'] ?? ''),
        'personnelNo' => $row['personnel_no'] !== null && $row['personnel_no'] !== '' ? (string)$row['personnel_no'] : null,
        'firstName' => $firstName,
        'lastName' => $lastName,
        'fullName' => $fullName,
        'name' => $fullName,
        'nationalId' => $row['national_id'] !== null && $row['national_id'] !== '' ? (string)$row['national_id'] : null,
        'mobile' => $row['mobile'] !== null && $row['mobile'] !== '' ? (string)$row['mobile'] : null,
        'department' => $row['department'] !== null && $row['department'] !== '' ? (string)$row['department'] : null,
        'jobTitle' => $row['job_title'] !== null && $row['job_title'] !== '' ? (string)$row['job_title'] : null,
        'bankName' => $row['bank_name'] !== null && $row['bank_name'] !== '' ? (string)$row['bank_name'] : null,
        'bankAccountNo' => $row['bank_account_no'] !== null && $row['bank_account_no'] !== '' ? (string)$row['bank_account_no'] : null,
        'bankSheba' => $row['bank_sheba'] !== null && $row['bank_sheba'] !== '' ? (string)$row['bank_sheba'] : null,
        'baseSalary' => (int)($row['base_salary'] ?? 0),
        'defaultInputs' => is_array($defaultInputs) ? $defaultInputs : [],
        'notes' => $row['notes'] !== null && $row['notes'] !== '' ? (string)$row['notes'] : null,
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => (string)($row['created_at'] ?? ''),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
    ];
}

function app_hr_fetch_employee(PDO $pdo, int $employeeId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM hr_employees WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $employeeId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function app_hr_find_employee_by_code(PDO $pdo, string $employeeCode): ?array
{
    $code = trim($employeeCode);
    if ($code === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM hr_employees WHERE employee_code = :employee_code LIMIT 1');
    $stmt->execute(['employee_code' => $code]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function app_hr_find_employee_by_national_id(PDO $pdo, string $nationalId): ?array
{
    $value = trim($nationalId);
    if ($value === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM hr_employees WHERE national_id = :national_id LIMIT 1');
    $stmt->execute(['national_id' => $value]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function app_hr_list_employees(PDO $pdo, string $q, ?bool $isActive): array
{
    $where = [];
    $params = [];

    if ($q !== '') {
        $where[] = '(employee_code LIKE :q OR personnel_no LIKE :q OR first_name LIKE :q OR last_name LIKE :q OR national_id LIKE :q OR mobile LIKE :q OR department LIKE :q OR job_title LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }

    if ($isActive !== null) {
        $where[] = 'is_active = :is_active';
        $params['is_active'] = $isActive ? 1 : 0;
    }

    $sql = 'SELECT * FROM hr_employees' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY last_name ASC, first_name ASC, employee_code ASC, id ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map('app_hr_employee_from_row', $stmt->fetchAll() ?: []);
}

function app_hr_save_employee(PDO $pdo, array $payload, array $actor, ?int $employeeId = null): array
{
    $current = $employeeId !== null ? app_hr_fetch_employee($pdo, $employeeId) : null;
    $employeeCode = trim((string)($payload['employeeCode'] ?? ''));
    if ($employeeCode === '') {
        if (is_array($current)) {
            $employeeCode = (string)($current['employee_code'] ?? '');
        } else {
            $employeeCode = app_hr_generate_employee_code($pdo);
        }
    }
    $firstName = trim((string)($payload['firstName'] ?? ''));
    $lastName = trim((string)($payload['lastName'] ?? ''));
    if ($firstName === '' || $lastName === '') {
        $fullName = trim((string)($payload['fullName'] ?? ($payload['name'] ?? '')));
        if ($fullName !== '') {
            [$parsedFirst, $parsedLast] = app_hr_full_name_parts($fullName);
            $firstName = $firstName !== '' ? $firstName : $parsedFirst;
            $lastName = $lastName !== '' ? $lastName : $parsedLast;
        }
    }

    if ($employeeCode === '' || $firstName === '' || $lastName === '') {
        app_json(['success' => false, 'error' => 'firstName and lastName are required.'], 400);
    }

    $isActiveValue = $payload['isActive'] ?? true;
    $isActiveParsed = filter_var($isActiveValue, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $personnelNo = null;
    if (array_key_exists('personnelNo', $payload)) {
        $personnelNo = trim((string)($payload['personnelNo'] ?? ''));
        $personnelNo = $personnelNo !== '' ? $personnelNo : null;
    } elseif (is_array($current)) {
        $personnelNo = $current['personnel_no'] !== null && $current['personnel_no'] !== '' ? (string)$current['personnel_no'] : null;
    }
    $values = [
        'employee_code' => $employeeCode,
        'personnel_no' => $personnelNo,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'national_id' => ($v = trim((string)($payload['nationalId'] ?? ''))) !== '' ? $v : null,
        'mobile' => ($v = trim((string)($payload['mobile'] ?? ''))) !== '' ? $v : null,
        'department' => ($v = trim((string)($payload['department'] ?? ''))) !== '' ? $v : null,
        'job_title' => ($v = trim((string)($payload['jobTitle'] ?? ''))) !== '' ? $v : null,
        'bank_name' => ($v = trim((string)($payload['bankName'] ?? ''))) !== '' ? $v : null,
        'bank_account_no' => ($v = trim((string)($payload['bankAccountNo'] ?? ($payload['bankAccount'] ?? '')))) !== '' ? $v : null,
        'bank_sheba' => ($v = trim((string)($payload['bankSheba'] ?? ''))) !== '' ? $v : null,
        'base_salary' => max(0, (int)($payload['baseSalary'] ?? 0)),
        'default_inputs_json' => json_encode(is_array($payload['defaultInputs'] ?? null) ? $payload['defaultInputs'] : [], JSON_UNESCAPED_UNICODE) ?: '[]',
        'notes' => ($v = trim((string)($payload['notes'] ?? ''))) !== '' ? $v : null,
        'is_active' => $isActiveParsed === null ? 1 : ($isActiveParsed ? 1 : 0),
    ];

    try {
        if ($employeeId === null) {
            $pdo->prepare(
                'INSERT INTO hr_employees (
                    employee_code, personnel_no, first_name, last_name, national_id, mobile, department, job_title,
                    bank_name, bank_account_no, bank_sheba, base_salary, default_inputs_json, notes, is_active,
                    created_by_user_id, updated_by_user_id
                 ) VALUES (
                    :employee_code, :personnel_no, :first_name, :last_name, :national_id, :mobile, :department, :job_title,
                    :bank_name, :bank_account_no, :bank_sheba, :base_salary, :default_inputs_json, :notes, :is_active,
                    :created_by_user_id, :updated_by_user_id
                 )'
            )->execute($values + [
                'created_by_user_id' => (int)$actor['id'],
                'updated_by_user_id' => (int)$actor['id'],
            ]);
            $employeeId = (int)$pdo->lastInsertId();
            app_audit_log($pdo, 'human_resources.employee.created', 'hr_employees', (string)$employeeId, ['employeeCode' => $employeeCode], $actor);
        } else {
            $values['id'] = $employeeId;
            $values['updated_by_user_id'] = (int)$actor['id'];
            $pdo->prepare(
                'UPDATE hr_employees
                 SET employee_code = :employee_code,
                     personnel_no = :personnel_no,
                     first_name = :first_name,
                     last_name = :last_name,
                     national_id = :national_id,
                     mobile = :mobile,
                     department = :department,
                     job_title = :job_title,
                     bank_name = :bank_name,
                     bank_account_no = :bank_account_no,
                     bank_sheba = :bank_sheba,
                     base_salary = :base_salary,
                     default_inputs_json = :default_inputs_json,
                     notes = :notes,
                     is_active = :is_active,
                     updated_by_user_id = :updated_by_user_id
                 WHERE id = :id'
            )->execute($values);
            app_audit_log($pdo, 'human_resources.employee.updated', 'hr_employees', (string)$employeeId, ['employeeCode' => $employeeCode], $actor);
        }
    } catch (Throwable $error) {
        app_hr_handle_write_exception($error);
        throw $error;
    }

    $row = app_hr_fetch_employee($pdo, (int)$employeeId);
    return app_hr_employee_from_row($row ?: []);
}

function app_hr_toggle_employee_active(PDO $pdo, int $employeeId, ?bool $isActive, array $actor): array
{
    $current = app_hr_fetch_employee($pdo, $employeeId);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Employee not found.'], 404);
    }

    $currentActive = ((int)($current['is_active'] ?? 0)) === 1;
    $nextActive = $isActive !== null ? $isActive : !$currentActive;
    $pdo->prepare(
        'UPDATE hr_employees
         SET is_active = :is_active,
             updated_by_user_id = :updated_by_user_id
         WHERE id = :id'
    )->execute([
        'is_active' => $nextActive ? 1 : 0,
        'updated_by_user_id' => (int)$actor['id'],
        'id' => $employeeId,
    ]);

    app_audit_log(
        $pdo,
        'human_resources.employee.active.changed',
        'hr_employees',
        (string)$employeeId,
        ['isActive' => $nextActive],
        $actor
    );

    $updated = app_hr_fetch_employee($pdo, $employeeId);
    return app_hr_employee_from_row($updated ?: $current);
}



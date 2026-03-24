<?php
declare(strict_types=1);

function app_hr_full_name_parts(string $value): array
{
    $fullName = trim($value);
    if ($fullName === '') {
        return ['', ''];
    }

    $parts = preg_split('/\s+/u', $fullName, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($parts) || $parts === []) {
        return ['', ''];
    }

    $firstName = (string)array_shift($parts);
    $lastName = trim(implode(' ', $parts));
    if ($lastName === '') {
        $lastName = $firstName;
    }

    return [$firstName, $lastName];
}

function app_ensure_human_resources_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS hr_employees (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            employee_code VARCHAR(40) NOT NULL,
            personnel_no VARCHAR(40) NULL,
            first_name VARCHAR(120) NOT NULL,
            last_name VARCHAR(120) NOT NULL,
            national_id VARCHAR(20) NULL,
            mobile VARCHAR(40) NULL,
            department VARCHAR(120) NULL,
            job_title VARCHAR(120) NULL,
            bank_name VARCHAR(120) NULL,
            bank_account_no VARCHAR(80) NULL,
            bank_sheba VARCHAR(40) NULL,
            base_salary BIGINT NOT NULL DEFAULT 0,
            default_inputs_json LONGTEXT NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_by_user_id INT UNSIGNED NULL,
            updated_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_hr_employees_code (employee_code),
            UNIQUE KEY uq_hr_employees_personnel_no (personnel_no),
            KEY idx_hr_employees_active (is_active),
            KEY idx_hr_employees_name (last_name, first_name),
            CONSTRAINT fk_hr_employee_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_hr_employee_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    if (app_table_is_queryable($pdo, 'acc_payroll_employees')) {
        try {
            $pdo->exec(
                "INSERT INTO hr_employees (
                    id, employee_code, personnel_no, first_name, last_name, national_id, mobile,
                    department, job_title, bank_name, bank_account_no, bank_sheba, base_salary,
                    default_inputs_json, notes, is_active, created_by_user_id, updated_by_user_id,
                    created_at, updated_at
                )
                SELECT
                    id, employee_code, personnel_no, first_name, last_name, national_id, mobile,
                    NULL, NULL, bank_name, bank_account_no, bank_sheba, base_salary,
                    default_inputs_json, notes, is_active, created_by_user_id, updated_by_user_id,
                    created_at, updated_at
                FROM acc_payroll_employees
                ON DUPLICATE KEY UPDATE
                    employee_code = VALUES(employee_code),
                    personnel_no = VALUES(personnel_no),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    national_id = VALUES(national_id),
                    mobile = VALUES(mobile),
                    department = VALUES(department),
                    job_title = VALUES(job_title),
                    bank_name = VALUES(bank_name),
                    bank_account_no = VALUES(bank_account_no),
                    bank_sheba = VALUES(bank_sheba),
                    base_salary = VALUES(base_salary),
                    default_inputs_json = VALUES(default_inputs_json),
                    notes = VALUES(notes),
                    is_active = VALUES(is_active),
                    created_by_user_id = VALUES(created_by_user_id),
                    updated_by_user_id = VALUES(updated_by_user_id),
                    created_at = VALUES(created_at),
                    updated_at = VALUES(updated_at)"
            );
        } catch (Throwable $e) {
            // Best-effort legacy sync only.
        }
    }

    if (!app_table_is_queryable($pdo, 'acc_payslips')) {
        return;
    }

    try {
        $stmt = $pdo->prepare(
            "SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'acc_payslips'
               AND COLUMN_NAME = 'employee_id'
               AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        $stmt->execute();
        $rows = $stmt->fetchAll() ?: [];
        $hasHrFk = false;
        foreach ($rows as $row) {
            if ((string)($row['REFERENCED_TABLE_NAME'] ?? '') === 'hr_employees') {
                $hasHrFk = true;
                break;
            }
        }
        if ($hasHrFk) {
            return;
        }

        foreach ($rows as $row) {
            $constraintName = (string)($row['CONSTRAINT_NAME'] ?? '');
            if ($constraintName === '') {
                continue;
            }
            try {
                $pdo->exec('ALTER TABLE acc_payslips DROP FOREIGN KEY `' . $constraintName . '`');
            } catch (Throwable $e) {
                // Ignore drop failures and continue.
            }
        }

        try {
            $pdo->exec(
                'ALTER TABLE acc_payslips
                 ADD CONSTRAINT fk_acc_payslips_employee
                 FOREIGN KEY (employee_id) REFERENCES hr_employees (id)
                 ON UPDATE CASCADE ON DELETE RESTRICT'
            );
        } catch (Throwable $e) {
            // Keep runtime compatible if FK migration is blocked.
        }
    } catch (Throwable $e) {
        // Best-effort migration only.
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS hr_documents (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            employee_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
            mime_type VARCHAR(100) NULL,
            created_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_hr_documents_employee (employee_id),
            CONSTRAINT fk_hr_documents_employee FOREIGN KEY (employee_id) REFERENCES hr_employees (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_hr_documents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

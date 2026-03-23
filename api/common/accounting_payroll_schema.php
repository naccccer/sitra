<?php
declare(strict_types=1);

require_once __DIR__ . '/human_resources.php';

function app_ensure_accounting_payroll_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_accounting_schema($pdo);
    app_ensure_human_resources_schema($pdo);
    app_ensure_system_settings_table($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_payroll_periods (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            period_key VARCHAR(7) NOT NULL,
            title VARCHAR(120) NOT NULL,
            period_year SMALLINT UNSIGNED NOT NULL,
            period_month TINYINT UNSIGNED NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            pay_date DATE NULL,
            status ENUM('open','issued','closed') NOT NULL DEFAULT 'open',
            created_by_user_id INT UNSIGNED NULL,
            updated_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_payroll_periods_key (period_key),
            UNIQUE KEY uq_acc_payroll_periods_year_month (period_year, period_month),
            KEY idx_acc_payroll_periods_status (status),
            CONSTRAINT fk_acc_payroll_period_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payroll_period_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_payslips (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            period_id BIGINT UNSIGNED NOT NULL,
            employee_id BIGINT UNSIGNED NOT NULL,
            slip_no VARCHAR(60) NULL,
            status ENUM('draft','approved','issued','cancelled') NOT NULL DEFAULT 'draft',
            currency_code VARCHAR(10) NOT NULL DEFAULT 'IRR',
            inputs_json LONGTEXT NULL,
            formula_snapshot_json LONGTEXT NULL,
            earnings_total BIGINT NOT NULL DEFAULT 0,
            deductions_total BIGINT NOT NULL DEFAULT 0,
            net_total BIGINT NOT NULL DEFAULT 0,
            employer_cost_total BIGINT NOT NULL DEFAULT 0,
            payments_total BIGINT NOT NULL DEFAULT 0,
            balance_due BIGINT NOT NULL DEFAULT 0,
            accrual_voucher_id BIGINT UNSIGNED NULL,
            approved_by_user_id INT UNSIGNED NULL,
            approved_at TIMESTAMP NULL,
            issued_by_user_id INT UNSIGNED NULL,
            issued_at TIMESTAMP NULL,
            cancelled_by_user_id INT UNSIGNED NULL,
            cancelled_at TIMESTAMP NULL,
            last_payment_date DATE NULL,
            notes TEXT NULL,
            created_by_user_id INT UNSIGNED NULL,
            updated_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_payslips_period_employee (period_id, employee_id),
            UNIQUE KEY uq_acc_payslips_slip_no (slip_no),
            KEY idx_acc_payslips_status (status),
            KEY idx_acc_payslips_employee (employee_id),
            KEY idx_acc_payslips_period (period_id),
            KEY idx_acc_payslips_accrual_voucher (accrual_voucher_id),
            CONSTRAINT fk_acc_payslips_period FOREIGN KEY (period_id) REFERENCES acc_payroll_periods (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_acc_payslips_employee FOREIGN KEY (employee_id) REFERENCES hr_employees (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_acc_payslips_accrual_voucher FOREIGN KEY (accrual_voucher_id) REFERENCES acc_vouchers (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslips_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslips_issued_by FOREIGN KEY (issued_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslips_cancelled_by FOREIGN KEY (cancelled_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslips_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslips_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_payslip_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            payslip_id BIGINT UNSIGNED NOT NULL,
            item_key VARCHAR(80) NOT NULL,
            item_label VARCHAR(160) NOT NULL,
            item_type ENUM('earning','deduction','employer_cost') NOT NULL,
            account_key VARCHAR(80) NULL,
            amount BIGINT NOT NULL DEFAULT 0,
            formula_meta_json LONGTEXT NULL,
            sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_payslip_items_unique (payslip_id, item_key),
            KEY idx_acc_payslip_items_type (item_type),
            CONSTRAINT fk_acc_payslip_items_payslip FOREIGN KEY (payslip_id) REFERENCES acc_payslips (id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_payslip_payments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            payslip_id BIGINT UNSIGNED NOT NULL,
            payment_date DATE NOT NULL,
            payment_method ENUM('cash','bank') NOT NULL DEFAULT 'bank',
            account_id BIGINT UNSIGNED NULL,
            amount BIGINT NOT NULL DEFAULT 0,
            reference_no VARCHAR(120) NULL,
            notes VARCHAR(255) NULL,
            voucher_id BIGINT UNSIGNED NULL,
            created_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_acc_payslip_payments_payslip (payslip_id),
            KEY idx_acc_payslip_payments_voucher (voucher_id),
            CONSTRAINT fk_acc_payslip_payments_payslip FOREIGN KEY (payslip_id) REFERENCES acc_payslips (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_acc_payslip_payments_account FOREIGN KEY (account_id) REFERENCES acc_accounts (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslip_payments_voucher FOREIGN KEY (voucher_id) REFERENCES acc_vouchers (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_payslip_payments_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_payslip_documents (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            payslip_id BIGINT UNSIGNED NOT NULL,
            document_type VARCHAR(40) NOT NULL DEFAULT 'pdf',
            original_name VARCHAR(255) NOT NULL,
            stored_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
            uploaded_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_acc_payslip_documents_payslip (payslip_id),
            CONSTRAINT fk_acc_payslip_documents_payslip FOREIGN KEY (payslip_id) REFERENCES acc_payslips (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_acc_payslip_documents_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

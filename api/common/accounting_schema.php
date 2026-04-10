<?php
declare(strict_types=1);
require_once __DIR__ . '/accounting_schema_demo_seed.php';

function app_ensure_accounting_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);

    // ── Fiscal Years (سال مالی) ──────────────────────────────────────
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_fiscal_years (
            id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
            title               VARCHAR(80)  NOT NULL,
            start_date          DATE         NOT NULL,
            end_date            DATE         NOT NULL,
            status              ENUM('open','closed') NOT NULL DEFAULT 'open',
            is_default          TINYINT(1)   NOT NULL DEFAULT 0,
            closed_by_user_id   INT UNSIGNED NULL,
            closed_at           TIMESTAMP    NULL,
            created_by_user_id  INT UNSIGNED NULL,
            created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_acc_fiscal_years_status (status),
            KEY idx_acc_fiscal_years_default (is_default),
            CONSTRAINT fk_acc_fy_closed_by   FOREIGN KEY (closed_by_user_id)  REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_fy_created_by  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    // ── Chart of Accounts (سرفصل حساب‌ها) ───────────────────────────
    // level 1=گروه  2=کل  3=معین  4=تفصیلی
    // is_postable=1 only for leaf accounts (level 3 with no children, or level 4)
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_accounts (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code            VARCHAR(20)  NOT NULL,
            name            VARCHAR(200) NOT NULL,
            name_en         VARCHAR(200) NULL,
            level           TINYINT UNSIGNED NOT NULL,
            parent_id       BIGINT UNSIGNED NULL,
            account_type    ENUM('asset','liability','equity','revenue','expense') NOT NULL,
            account_nature  ENUM('debit','credit') NOT NULL,
            is_postable     TINYINT(1)   NOT NULL DEFAULT 0,
            is_system       TINYINT(1)   NOT NULL DEFAULT 0,
            is_active       TINYINT(1)   NOT NULL DEFAULT 1,
            deleted_at      TIMESTAMP    NULL DEFAULT NULL,
            notes           TEXT         NULL,
            created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_accounts_code (code),
            KEY idx_acc_accounts_parent   (parent_id),
            KEY idx_acc_accounts_level    (level),
            KEY idx_acc_accounts_type     (account_type),
            KEY idx_acc_accounts_postable (is_postable, is_active),
            KEY idx_acc_accounts_lifecycle (deleted_at, is_active),
            CONSTRAINT fk_acc_accounts_parent FOREIGN KEY (parent_id)
                REFERENCES acc_accounts (id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );


    try {
        $deletedAtColumn = $pdo->query("SHOW COLUMNS FROM acc_accounts LIKE 'deleted_at'");
        if (!$deletedAtColumn || !$deletedAtColumn->fetch()) {
            $pdo->exec("ALTER TABLE acc_accounts ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_active");
        }
    } catch (Throwable $e) {
        // runtime compatibility
    }

    try {
        $lifecycleIndex = $pdo->query("SHOW INDEX FROM acc_accounts WHERE Key_name = 'idx_acc_accounts_lifecycle'");
        if (!$lifecycleIndex || !$lifecycleIndex->fetch()) {
            $pdo->exec("CREATE INDEX idx_acc_accounts_lifecycle ON acc_accounts (deleted_at, is_active)");
        }
    } catch (Throwable $e) {
        // runtime compatibility
    }

    // ── Vouchers / Journal Entries (اسناد حسابداری) ──────────────────
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_vouchers (
            id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            fiscal_year_id      INT UNSIGNED    NOT NULL,
            voucher_no          INT UNSIGNED    NOT NULL,
            voucher_date        DATE            NOT NULL,
            description         VARCHAR(500)    NOT NULL DEFAULT '',
            status              ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
            source_type         VARCHAR(60)     NULL,
            source_id           VARCHAR(80)     NULL,
            source_code         VARCHAR(120)    NULL,
            created_by_user_id  INT UNSIGNED    NULL,
            posted_by_user_id   INT UNSIGNED    NULL,
            posted_at           TIMESTAMP       NULL,
            created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_vouchers_fy_no (fiscal_year_id, voucher_no),
            KEY idx_acc_vouchers_date       (voucher_date),
            KEY idx_acc_vouchers_status     (status),
            KEY idx_acc_vouchers_source     (source_type, source_id),
            CONSTRAINT fk_acc_vouchers_fiscal_year  FOREIGN KEY (fiscal_year_id)     REFERENCES acc_fiscal_years (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_acc_vouchers_created_by   FOREIGN KEY (created_by_user_id) REFERENCES users (id)            ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_acc_vouchers_posted_by    FOREIGN KEY (posted_by_user_id)  REFERENCES users (id)            ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    // ── Voucher Lines (آرتیکل‌های سند) ───────────────────────────────
    // debit_amount XOR credit_amount > 0 per line; enforced in PHP
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_voucher_lines (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            voucher_id      BIGINT UNSIGNED NOT NULL,
            line_no         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            account_id      BIGINT UNSIGNED NOT NULL,
            description     VARCHAR(300)    NOT NULL DEFAULT '',
            debit_amount    BIGINT UNSIGNED NOT NULL DEFAULT 0,
            credit_amount   BIGINT UNSIGNED NOT NULL DEFAULT 0,
            party_type      VARCHAR(40)     NULL,
            party_id        BIGINT UNSIGNED NULL,
            PRIMARY KEY (id),
            KEY idx_acc_vl_voucher (voucher_id),
            KEY idx_acc_vl_account (account_id),
            KEY idx_acc_vl_party   (party_type, party_id),
            CONSTRAINT fk_acc_vl_voucher FOREIGN KEY (voucher_id)  REFERENCES acc_vouchers  (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_acc_vl_account FOREIGN KEY (account_id)  REFERENCES acc_accounts  (id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    // ── Sales Bridge Log (idempotency) ────────────────────────────────
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS acc_sales_bridge_log (
            id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            order_id            BIGINT UNSIGNED NOT NULL,
            payment_local_id    VARCHAR(64)     NOT NULL,
            voucher_id          BIGINT UNSIGNED NOT NULL,
            bridged_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_bridge_order_payment (order_id, payment_local_id),
            KEY idx_acc_bridge_voucher (voucher_id),
            CONSTRAINT fk_acc_bridge_voucher FOREIGN KEY (voucher_id) REFERENCES acc_vouchers (id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    // ── Seed Iranian Standard Chart of Accounts (3 levels) ───────────
    app_seed_accounting_coa($pdo);

    // Migration: ensure all level-3 system accounts are postable
    $pdo->exec(
        "UPDATE acc_accounts SET is_postable = 1 WHERE level >= 3 AND is_system = 1 AND is_postable = 0"
    );

    // Seed demo fiscal year + sample vouchers (only if no fiscal year exists)
    app_seed_accounting_demo($pdo);
}


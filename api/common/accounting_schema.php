<?php
declare(strict_types=1);

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
            notes           TEXT         NULL,
            created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_acc_accounts_code (code),
            KEY idx_acc_accounts_parent   (parent_id),
            KEY idx_acc_accounts_level    (level),
            KEY idx_acc_accounts_type     (account_type),
            KEY idx_acc_accounts_postable (is_postable, is_active),
            CONSTRAINT fk_acc_accounts_parent FOREIGN KEY (parent_id)
                REFERENCES acc_accounts (id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

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
}

function app_seed_accounting_coa(PDO $pdo): void
{
    // Only seed if the table is empty
    $check = $pdo->query('SELECT COUNT(*) AS cnt FROM acc_accounts');
    if ($check && (int)($check->fetch()['cnt'] ?? 0) > 0) {
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO acc_accounts (code, name, level, parent_id, account_type, account_nature, is_postable, is_system)
         VALUES (:code, :name, :level, :parent_id, :type, :nature, :postable, 1)'
    );

    $getIdByCode = $pdo->prepare('SELECT id FROM acc_accounts WHERE code = :code LIMIT 1');

    $pid = static function (string $code) use ($pdo, $getIdByCode): ?int {
        $getIdByCode->execute(['code' => $code]);
        $row = $getIdByCode->fetch();
        return $row ? (int)$row['id'] : null;
    };

    $rows = [
        // ─── GROUP 1: ASSETS ──────────────────────────────────────────
        ['1',    'دارایی‌ها',                         1, null, 'asset',     'debit',  0],
        ['11',   'دارایی‌های جاری',                   2, '1',  'asset',     'debit',  0],
        ['1101', 'صندوق',                              3, '11', 'asset',     'debit',  0],
        ['1102', 'بانک',                               3, '11', 'asset',     'debit',  0],
        ['1103', 'حساب‌های دریافتنی تجاری',           3, '11', 'asset',     'debit',  0],
        ['1104', 'اسناد دریافتنی (چک)',               3, '11', 'asset',     'debit',  0],
        ['1105', 'پیش‌پرداخت‌ها',                     3, '11', 'asset',     'debit',  0],
        ['1106', 'مالیات ارزش افزوده دریافتنی',       3, '11', 'asset',     'debit',  0],
        ['12',   'دارایی‌های غیرجاری',                2, '1',  'asset',     'debit',  0],
        ['1201', 'دارایی‌های ثابت مشهود',             3, '12', 'asset',     'debit',  0],
        ['1202', 'استهلاک انباشته دارایی‌های ثابت',  3, '12', 'asset',     'credit', 0],
        ['1203', 'موجودی مواد و کالا',                3, '12', 'asset',     'debit',  0],

        // ─── GROUP 2: LIABILITIES ─────────────────────────────────────
        ['2',    'بدهی‌ها',                            1, null, 'liability', 'credit', 0],
        ['21',   'بدهی‌های جاری',                     2, '2',  'liability', 'credit', 0],
        ['2101', 'حساب‌های پرداختنی تجاری',           3, '21', 'liability', 'credit', 0],
        ['2102', 'اسناد پرداختنی (چک صادره)',         3, '21', 'liability', 'credit', 0],
        ['2103', 'پیش‌دریافت از مشتریان',             3, '21', 'liability', 'credit', 0],
        ['2104', 'مالیات ارزش افزوده پرداختنی',       3, '21', 'liability', 'credit', 0],
        ['2105', 'حقوق و دستمزد پرداختنی',            3, '21', 'liability', 'credit', 0],
        ['22',   'بدهی‌های بلندمدت',                  2, '2',  'liability', 'credit', 0],
        ['2201', 'وام‌های بلندمدت',                   3, '22', 'liability', 'credit', 0],

        // ─── GROUP 3: EQUITY ──────────────────────────────────────────
        ['3',    'حقوق صاحبان سهام',                  1, null, 'equity',    'credit', 0],
        ['31',   'سرمایه و اندوخته‌ها',               2, '3',  'equity',    'credit', 0],
        ['3101', 'سرمایه',                             3, '31', 'equity',    'credit', 0],
        ['3102', 'سود و زیان انباشته',                3, '31', 'equity',    'credit', 0],
        ['3103', 'سود و زیان دوره جاری',              3, '31', 'equity',    'credit', 0],

        // ─── GROUP 4: REVENUE ─────────────────────────────────────────
        ['4',    'درآمدها',                            1, null, 'revenue',   'credit', 0],
        ['41',   'درآمد فروش',                         2, '4',  'revenue',   'credit', 0],
        ['4101', 'فروش شیشه فرآوری‌شده',             3, '41', 'revenue',   'credit', 0],
        ['4102', 'فروش شیشه خام',                     3, '41', 'revenue',   'credit', 0],
        ['4103', 'درآمد خدمات تولید',                 3, '41', 'revenue',   'credit', 0],
        ['42',   'تخفیفات فروش',                      2, '4',  'revenue',   'debit',  0],
        ['4201', 'تخفیفات تجاری اعطایی',             3, '42', 'revenue',   'debit',  0],

        // ─── GROUP 5: COGS ────────────────────────────────────────────
        ['5',    'بهای تمام‌شده کالای فروش رفته',    1, null, 'expense',   'debit',  0],
        ['51',   'بهای تمام‌شده',                     2, '5',  'expense',   'debit',  0],
        ['5101', 'بهای تمام‌شده شیشه فروخته‌شده',   3, '51', 'expense',   'debit',  0],

        // ─── GROUP 6: OPERATING EXPENSES ─────────────────────────────
        ['6',    'هزینه‌های عملیاتی',                1, null, 'expense',   'debit',  0],
        ['61',   'هزینه‌های اداری و عمومی',           2, '6',  'expense',   'debit',  0],
        ['6101', 'هزینه حقوق و دستمزد',              3, '61', 'expense',   'debit',  0],
        ['6102', 'هزینه استهلاک',                     3, '61', 'expense',   'debit',  0],
        ['6103', 'هزینه اجاره',                       3, '61', 'expense',   'debit',  0],
        ['6104', 'هزینه آب، برق و گاز',              3, '61', 'expense',   'debit',  0],
        ['6105', 'هزینه‌های بازاریابی و تبلیغات',    3, '61', 'expense',   'debit',  0],
        ['62',   'هزینه‌های مالی',                    2, '6',  'expense',   'debit',  0],
        ['6201', 'هزینه سود تسهیلات',                3, '62', 'expense',   'debit',  0],
        ['6202', 'هزینه کارمزد بانکی',               3, '62', 'expense',   'debit',  0],

        // ─── GROUP 7: TAX ─────────────────────────────────────────────
        ['7',    'مالیات',                             1, null, 'expense',   'debit',  0],
        ['71',   'مالیات بر درآمد',                   2, '7',  'expense',   'debit',  0],
        ['7101', 'مالیات بر درآمد شرکت',             3, '71', 'expense',   'debit',  0],
    ];

    foreach ($rows as [$code, $name, $level, $parentCode, $type, $nature, $postable]) {
        $insert->execute([
            'code'      => $code,
            'name'      => $name,
            'level'     => $level,
            'parent_id' => $parentCode !== null ? $pid($parentCode) : null,
            'type'      => $type,
            'nature'    => $nature,
            'postable'  => $postable,
        ]);
    }
}

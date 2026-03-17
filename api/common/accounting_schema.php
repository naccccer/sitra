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

    // Migration: ensure all level-3 system accounts are postable
    $pdo->exec(
        "UPDATE acc_accounts SET is_postable = 1 WHERE level >= 3 AND is_system = 1 AND is_postable = 0"
    );

    // Seed demo fiscal year + sample vouchers (only if no fiscal year exists)
    app_seed_accounting_demo($pdo);
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
        ['1101', 'صندوق',                              3, '11', 'asset',     'debit',  1],
        ['1102', 'بانک',                               3, '11', 'asset',     'debit',  1],
        ['1103', 'حساب‌های دریافتنی تجاری',           3, '11', 'asset',     'debit',  1],
        ['1104', 'اسناد دریافتنی (چک)',               3, '11', 'asset',     'debit',  1],
        ['1105', 'پیش‌پرداخت‌ها',                     3, '11', 'asset',     'debit',  1],
        ['1106', 'مالیات ارزش افزوده دریافتنی',       3, '11', 'asset',     'debit',  1],
        ['12',   'دارایی‌های غیرجاری',                2, '1',  'asset',     'debit',  0],
        ['1201', 'دارایی‌های ثابت مشهود',             3, '12', 'asset',     'debit',  1],
        ['1202', 'استهلاک انباشته دارایی‌های ثابت',  3, '12', 'asset',     'credit', 1],
        ['1203', 'موجودی مواد و کالا',                3, '12', 'asset',     'debit',  1],

        // ─── GROUP 2: LIABILITIES ─────────────────────────────────────
        ['2',    'بدهی‌ها',                            1, null, 'liability', 'credit', 0],
        ['21',   'بدهی‌های جاری',                     2, '2',  'liability', 'credit', 0],
        ['2101', 'حساب‌های پرداختنی تجاری',           3, '21', 'liability', 'credit', 1],
        ['2102', 'اسناد پرداختنی (چک صادره)',         3, '21', 'liability', 'credit', 1],
        ['2103', 'پیش‌دریافت از مشتریان',             3, '21', 'liability', 'credit', 1],
        ['2104', 'مالیات ارزش افزوده پرداختنی',       3, '21', 'liability', 'credit', 1],
        ['2105', 'حقوق و دستمزد پرداختنی',            3, '21', 'liability', 'credit', 1],
        ['22',   'بدهی‌های بلندمدت',                  2, '2',  'liability', 'credit', 0],
        ['2201', 'وام‌های بلندمدت',                   3, '22', 'liability', 'credit', 1],

        // ─── GROUP 3: EQUITY ──────────────────────────────────────────
        ['3',    'حقوق صاحبان سهام',                  1, null, 'equity',    'credit', 0],
        ['31',   'سرمایه و اندوخته‌ها',               2, '3',  'equity',    'credit', 0],
        ['3101', 'سرمایه',                             3, '31', 'equity',    'credit', 1],
        ['3102', 'سود و زیان انباشته',                3, '31', 'equity',    'credit', 1],
        ['3103', 'سود و زیان دوره جاری',              3, '31', 'equity',    'credit', 1],

        // ─── GROUP 4: REVENUE ─────────────────────────────────────────
        ['4',    'درآمدها',                            1, null, 'revenue',   'credit', 0],
        ['41',   'درآمد فروش',                         2, '4',  'revenue',   'credit', 0],
        ['4101', 'فروش شیشه فرآوری‌شده',             3, '41', 'revenue',   'credit', 1],
        ['4102', 'فروش شیشه خام',                     3, '41', 'revenue',   'credit', 1],
        ['4103', 'درآمد خدمات تولید',                 3, '41', 'revenue',   'credit', 1],
        ['42',   'تخفیفات فروش',                      2, '4',  'revenue',   'debit',  0],
        ['4201', 'تخفیفات تجاری اعطایی',             3, '42', 'revenue',   'debit',  1],

        // ─── GROUP 5: COGS ────────────────────────────────────────────
        ['5',    'بهای تمام‌شده کالای فروش رفته',    1, null, 'expense',   'debit',  0],
        ['51',   'بهای تمام‌شده',                     2, '5',  'expense',   'debit',  0],
        ['5101', 'بهای تمام‌شده شیشه فروخته‌شده',   3, '51', 'expense',   'debit',  1],

        // ─── GROUP 6: OPERATING EXPENSES ─────────────────────────────
        ['6',    'هزینه‌های عملیاتی',                1, null, 'expense',   'debit',  0],
        ['61',   'هزینه‌های اداری و عمومی',           2, '6',  'expense',   'debit',  0],
        ['6101', 'هزینه حقوق و دستمزد',              3, '61', 'expense',   'debit',  1],
        ['6102', 'هزینه استهلاک',                     3, '61', 'expense',   'debit',  1],
        ['6103', 'هزینه اجاره',                       3, '61', 'expense',   'debit',  1],
        ['6104', 'هزینه آب، برق و گاز',              3, '61', 'expense',   'debit',  1],
        ['6105', 'هزینه‌های بازاریابی و تبلیغات',    3, '61', 'expense',   'debit',  1],
        ['62',   'هزینه‌های مالی',                    2, '6',  'expense',   'debit',  0],
        ['6201', 'هزینه سود تسهیلات',                3, '62', 'expense',   'debit',  1],
        ['6202', 'هزینه کارمزد بانکی',               3, '62', 'expense',   'debit',  1],

        // ─── GROUP 7: TAX ─────────────────────────────────────────────
        ['7',    'مالیات',                             1, null, 'expense',   'debit',  0],
        ['71',   'مالیات بر درآمد',                   2, '7',  'expense',   'debit',  0],
        ['7101', 'مالیات بر درآمد شرکت',             3, '71', 'expense',   'debit',  1],
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

function app_seed_accounting_demo(PDO $pdo): void
{
    // Skip if any fiscal year already exists
    $c = $pdo->query('SELECT COUNT(*) AS cnt FROM acc_fiscal_years');
    if ($c && (int)($c->fetch()['cnt'] ?? 0) > 0) {
        return;
    }

    // Create fiscal year 1403 (Shamsi) = Gregorian 2024-03-21 to 2025-03-19
    $pdo->exec(
        "INSERT INTO acc_fiscal_years (title, start_date, end_date, status, is_default)
         VALUES ('سال مالی ۱۴۰۳', '2024-03-21', '2025-03-19', 'open', 1)"
    );
    $fyId = (int)$pdo->lastInsertId();

    // Cache account IDs by code
    $s = $pdo->prepare('SELECT id FROM acc_accounts WHERE code = ? LIMIT 1');
    $acc = [];
    foreach (['1101','1102','1103','1106','1201','1202','1203',
              '2101','2104','3101','3102','3103',
              '4101','4102','5101','6101','6102','6103','6104','7101'] as $code) {
        $s->execute([$code]);
        $r = $s->fetch(PDO::FETCH_ASSOC);
        $acc[$code] = $r ? (int)$r['id'] : 0;
    }

    $vs = $pdo->prepare(
        'INSERT INTO acc_vouchers (fiscal_year_id, voucher_no, voucher_date, description, status)
         VALUES (?, ?, ?, ?, ?)'
    );
    $ls = $pdo->prepare(
        'INSERT INTO acc_voucher_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $no = 0;

    $v = static function (string $date, string $desc, array $lines)
        use ($pdo, $fyId, $vs, $ls, $acc, &$no): void {
        $vs->execute([$fyId, ++$no, $date, $desc, 'posted']);
        $vid = (int)$pdo->lastInsertId();
        foreach ($lines as $i => [$code, $d, $dr, $cr]) {
            $ls->execute([$vid, $i + 1, $acc[$code], $d, $dr, $cr]);
        }
    };

    // ── 1. Opening balance 1403/01/01 ─────────────────────────────────
    $v('2024-03-21', 'افتتاح حساب - موجودی ابتدای سال مالی ۱۴۰۳', [
        ['1102', 'موجودی ابتدای دوره - بانک',        1_000_000_000, 0],
        ['1101', 'موجودی ابتدای دوره - صندوق',           50_000_000, 0],
        ['1203', 'موجودی ابتدای دوره - انبار کالا',    300_000_000, 0],
        ['1201', 'دارایی‌های ثابت ابتدای دوره',        150_000_000, 0],
        ['3102', 'سود و زیان انباشته - ابتدای دوره',            0, 1_500_000_000],
    ]);

    // ── 2. فروردین: فروش ─────────────────────────────────────────────
    // Revenue: 4101=175M + 4102=100M = 275M, VAT=27.5M → total AR=302.5M
    $v('2024-04-15', 'فروش فروردین ۱۴۰۳', [
        ['1103', 'حساب‌های دریافتنی مشتریان',   302_500_000, 0],
        ['4101', 'فروش شیشه فرآوری‌شده',                  0, 175_000_000],
        ['4102', 'فروش شیشه خام',                         0, 100_000_000],
        ['2104', 'مالیات ارزش افزوده پرداختنی',           0,  27_500_000],
    ]);
    $v('2024-04-15', 'بهای تمام‌شده فروش فروردین ۱۴۰۳', [
        ['5101', 'بهای تمام‌شده کالای فروخته‌شده', 138_000_000, 0],
        ['1203', 'موجودی مواد و کالا',                         0, 138_000_000],
    ]);
    $v('2024-04-30', 'وصول مطالبات فروردین', [
        ['1102', 'واریز به حساب بانکی', 302_500_000, 0],
        ['1103', 'تسویه حساب دریافتنی',           0, 302_500_000],
    ]);

    // ── 3. اردیبهشت: خرید مواد اولیه ────────────────────────────────
    $v('2024-05-10', 'خرید مواد اولیه - اردیبهشت ۱۴۰۳', [
        ['1203', 'موجودی مواد اولیه خریداری‌شده',  500_000_000, 0],
        ['1106', 'مالیات ارزش افزوده خرید',          50_000_000, 0],
        ['2101', 'حساب‌های پرداختنی تامین‌کنندگان',          0, 550_000_000],
    ]);
    $v('2024-05-31', 'پرداخت به تامین‌کنندگان - اردیبهشت', [
        ['2101', 'تسویه بدهی تامین‌کنندگان', 550_000_000, 0],
        ['1102', 'پرداخت از بانک',                      0, 550_000_000],
    ]);

    // ── 4. خرداد: فروش ───────────────────────────────────────────────
    // Revenue: 4101=325M + 4102=150M = 475M, VAT=47.5M → total AR=522.5M
    $v('2024-06-15', 'فروش اردیبهشت و خرداد ۱۴۰۳', [
        ['1103', 'حساب‌های دریافتنی مشتریان',   522_500_000, 0],
        ['4101', 'فروش شیشه فرآوری‌شده',                  0, 325_000_000],
        ['4102', 'فروش شیشه خام',                         0, 150_000_000],
        ['2104', 'مالیات ارزش افزوده پرداختنی',           0,  47_500_000],
    ]);
    $v('2024-06-15', 'بهای تمام‌شده - اردیبهشت و خرداد', [
        ['5101', 'بهای تمام‌شده کالای فروخته‌شده', 237_000_000, 0],
        ['1203', 'موجودی مواد و کالا',                         0, 237_000_000],
    ]);
    $v('2024-06-30', 'وصول مطالبات خرداد', [
        ['1102', 'واریز به بانک',  522_500_000, 0],
        ['1103', 'تسویه دریافتنی',           0, 522_500_000],
    ]);

    // ── 5. هزینه‌های Q1 (فروردین تا خرداد) ─────────────────────────
    $v('2024-06-29', 'حقوق و مزایای فروردین تا خرداد ۱۴۰۳', [
        ['6101', 'هزینه حقوق و دستمزد', 120_000_000, 0],
        ['1102', 'پرداخت از بانک',               0, 120_000_000],
    ]);
    $v('2024-06-29', 'هزینه اجاره کارگاه - فروردین تا خرداد', [
        ['6103', 'هزینه اجاره', 30_000_000, 0],
        ['1102', 'پرداخت از بانک',       0, 30_000_000],
    ]);

    // ── 6. تیر: خرید مواد اولیه ─────────────────────────────────────
    $v('2024-07-05', 'خرید مواد اولیه - تیر ۱۴۰۳', [
        ['1203', 'موجودی مواد اولیه',  450_000_000, 0],
        ['1106', 'مالیات ارزش افزوده',  45_000_000, 0],
        ['2101', 'حساب‌های پرداختنی',          0, 495_000_000],
    ]);
    $v('2024-07-25', 'پرداخت به تامین‌کنندگان - تیر', [
        ['2101', 'تسویه بدهی', 495_000_000, 0],
        ['1102', 'پرداخت از بانک',      0, 495_000_000],
    ]);

    // ── 7. شهریور: فروش ──────────────────────────────────────────────
    // Revenue: 4101=450M + 4102=300M = 750M, VAT=75M → total AR=825M
    $v('2024-09-15', 'فروش تیر تا شهریور ۱۴۰۳', [
        ['1103', 'حساب‌های دریافتنی مشتریان',   825_000_000, 0],
        ['4101', 'فروش شیشه فرآوری‌شده',                  0, 450_000_000],
        ['4102', 'فروش شیشه خام',                         0, 300_000_000],
        ['2104', 'مالیات ارزش افزوده پرداختنی',           0,  75_000_000],
    ]);
    $v('2024-09-15', 'بهای تمام‌شده - تیر تا شهریور', [
        ['5101', 'بهای تمام‌شده کالای فروخته‌شده', 375_000_000, 0],
        ['1203', 'موجودی مواد و کالا',                         0, 375_000_000],
    ]);
    $v('2024-09-30', 'وصول مطالبات شهریور', [
        ['1102', 'واریز به بانک',  825_000_000, 0],
        ['1103', 'تسویه دریافتنی',           0, 825_000_000],
    ]);

    // ── 8. هزینه‌های Q2 (تیر تا شهریور) ────────────────────────────
    $v('2024-09-29', 'حقوق تیر تا شهریور ۱۴۰۳', [
        ['6101', 'هزینه حقوق', 120_000_000, 0],
        ['1102', 'پرداخت',               0, 120_000_000],
    ]);
    $v('2024-09-29', 'اجاره و قبوض - تیر تا شهریور', [
        ['6103', 'هزینه اجاره',  30_000_000, 0],
        ['6104', 'هزینه آب، برق و گاز', 9_000_000, 0],
        ['1102', 'پرداخت از بانک',        0, 39_000_000],
    ]);

    // ── 9. آذر: فروش ─────────────────────────────────────────────────
    // Revenue: 4101=500M + 4102=250M = 750M, VAT=75M → total AR=825M
    $v('2024-12-15', 'فروش مهر تا آذر ۱۴۰۳', [
        ['1103', 'حساب‌های دریافتنی مشتریان',   825_000_000, 0],
        ['4101', 'فروش شیشه فرآوری‌شده',                  0, 500_000_000],
        ['4102', 'فروش شیشه خام',                         0, 250_000_000],
        ['2104', 'مالیات ارزش افزوده پرداختنی',           0,  75_000_000],
    ]);
    $v('2024-12-15', 'بهای تمام‌شده - مهر تا آذر', [
        ['5101', 'بهای تمام‌شده کالای فروخته‌شده', 375_000_000, 0],
        ['1203', 'موجودی مواد و کالا',                         0, 375_000_000],
    ]);
    $v('2024-12-29', 'وصول مطالبات آذر', [
        ['1102', 'واریز به بانک',  825_000_000, 0],
        ['1103', 'تسویه دریافتنی',           0, 825_000_000],
    ]);

    // ── 10. هزینه‌های Q3 (مهر تا آذر) ──────────────────────────────
    $v('2024-12-28', 'حقوق مهر تا آذر ۱۴۰۳', [
        ['6101', 'هزینه حقوق', 120_000_000, 0],
        ['1102', 'پرداخت',               0, 120_000_000],
    ]);
    $v('2024-12-28', 'اجاره و قبوض - مهر تا آذر', [
        ['6103', 'هزینه اجاره',  30_000_000, 0],
        ['6104', 'هزینه آب، برق و گاز', 9_000_000, 0],
        ['1102', 'پرداخت از بانک',        0, 39_000_000],
    ]);

    // ── 11. دی: خرید مواد اولیه ──────────────────────────────────────
    $v('2025-01-10', 'خرید مواد اولیه - دی ۱۴۰۳', [
        ['1203', 'موجودی مواد اولیه',  450_000_000, 0],
        ['1106', 'مالیات ارزش افزوده',  45_000_000, 0],
        ['2101', 'حساب‌های پرداختنی',          0, 495_000_000],
    ]);
    $v('2025-01-25', 'پرداخت به تامین‌کنندگان - دی', [
        ['2101', 'تسویه بدهی', 495_000_000, 0],
        ['1102', 'پرداخت از بانک',      0, 495_000_000],
    ]);

    // ── 12. بهمن: فروش ───────────────────────────────────────────────
    // Revenue: 4101=450M + 4102=300M = 750M, VAT=75M → واریز مستقیم
    $v('2025-02-15', 'فروش دی و بهمن ۱۴۰۳', [
        ['1102', 'واریز مستقیم به بانک',           825_000_000, 0],
        ['4101', 'فروش شیشه فرآوری‌شده',                    0, 450_000_000],
        ['4102', 'فروش شیشه خام',                           0, 300_000_000],
        ['2104', 'مالیات ارزش افزوده پرداختنی',             0,  75_000_000],
    ]);
    $v('2025-02-15', 'بهای تمام‌شده - دی و بهمن', [
        ['5101', 'بهای تمام‌شده کالای فروخته‌شده', 375_000_000, 0],
        ['1203', 'موجودی مواد و کالا',                         0, 375_000_000],
    ]);

    // ── 13. هزینه‌های Q4 (دی و بهمن) ────────────────────────────────
    $v('2025-02-28', 'حقوق دی و بهمن ۱۴۰۳', [
        ['6101', 'هزینه حقوق',  80_000_000, 0],
        ['1102', 'پرداخت',               0, 80_000_000],
    ]);
    $v('2025-02-28', 'اجاره و قبوض - دی و بهمن', [
        ['6103', 'هزینه اجاره',  20_000_000, 0],
        ['6104', 'هزینه آب، برق و گاز', 6_000_000, 0],
        ['1102', 'پرداخت از بانک',        0, 26_000_000],
    ]);

    // ── 14. اسفند: حقوق و هزینه‌ها ──────────────────────────────────
    $v('2025-03-15', 'حقوق اسفند ۱۴۰۳', [
        ['6101', 'هزینه حقوق',  40_000_000, 0],
        ['1102', 'پرداخت',               0, 40_000_000],
    ]);
    $v('2025-03-15', 'اجاره و قبوض اسفند ۱۴۰۳', [
        ['6103', 'هزینه اجاره',  10_000_000, 0],
        ['6104', 'هزینه آب، برق و گاز', 3_000_000, 0],
        ['1102', 'پرداخت از بانک',        0, 13_000_000],
    ]);

    // ── 15. استهلاک سالانه ───────────────────────────────────────────
    $v('2025-03-15', 'هزینه استهلاک دارایی‌های ثابت - سال ۱۴۰۳', [
        ['6102', 'هزینه استهلاک',   20_000_000, 0],
        ['1202', 'استهلاک انباشته دارایی‌های ثابت', 0, 20_000_000],
    ]);

    // ── 16. ذخیره مالیات بر درآمد ────────────────────────────────────
    // Revenue: 275+475+750+750+750 = 3,000M
    // COGS:    138+237+375+375+375 = 1,500M  → Gross: 1,500M
    // Salaries: 120+120+120+80+40  =   480M
    // Rent:     30+30+30+20+10     =   120M
    // Utilities: 9+9+9+6+3         =    36M
    // Depreciation:                =    20M
    // Net before tax: 3,000-1,500-480-120-36-20 = 844M → Tax 25% ≈ 211M
    $v('2025-03-17', 'ذخیره مالیات بر درآمد سال ۱۴۰۳', [
        ['7101', 'مالیات بر درآمد شرکت',    211_000_000, 0],
        ['2101', 'ذخیره مالیات پرداختنی',            0, 211_000_000],
    ]);

    // ── 17. بستن حساب‌های درآمد → 3103 ──────────────────────────────
    // 4101: 175+325+450+500+450 = 1,900M
    // 4102: 100+150+300+250+300 = 1,100M  → Total = 3,000M
    $v('2025-03-19', 'بستن حساب‌های درآمد - اختتام سال ۱۴۰۳', [
        ['4101', 'بستن درآمد فروش شیشه فرآوری‌شده', 1_900_000_000, 0],
        ['4102', 'بستن درآمد فروش شیشه خام',          1_100_000_000, 0],
        ['3103', 'انتقال درآمد به سود و زیان دوره',            0, 3_000_000_000],
    ]);

    // ── 18. بستن حساب‌های هزینه → 3103 ──────────────────────────────
    // Total expenses: 1,500+480+20+120+36+211 = 2,367M
    // Net profit: 3,000 - 2,367 = 633M
    $v('2025-03-19', 'بستن حساب‌های هزینه - اختتام سال ۱۴۰۳', [
        ['3103', 'انتقال هزینه‌ها به سود و زیان دوره', 2_367_000_000, 0],
        ['5101', 'بستن بهای تمام‌شده',                           0, 1_500_000_000],
        ['6101', 'بستن هزینه حقوق و دستمزد',                    0,   480_000_000],
        ['6102', 'بستن هزینه استهلاک',                           0,    20_000_000],
        ['6103', 'بستن هزینه اجاره',                             0,   120_000_000],
        ['6104', 'بستن هزینه آب، برق و گاز',                    0,    36_000_000],
        ['7101', 'بستن مالیات بر درآمد',                         0,   211_000_000],
    ]);
    // 3103 ending balance = 3,000M - 2,367M = 633M (بستانکار = سود خالص)
}

<?php
declare(strict_types=1);

function app_accounting_permission_definitions(): array
{
    return [
        ['key' => 'accounting.accounts.read',       'module' => 'accounting', 'label' => 'مشاهده سرفصل حساب‌ها'],
        ['key' => 'accounting.accounts.write',      'module' => 'accounting', 'label' => 'مدیریت سرفصل حساب‌ها'],
        ['key' => 'accounting.vouchers.read',       'module' => 'accounting', 'label' => 'مشاهده اسناد حسابداری'],
        ['key' => 'accounting.vouchers.write',      'module' => 'accounting', 'label' => 'ثبت و ویرایش اسناد حسابداری'],
        ['key' => 'accounting.vouchers.post',       'module' => 'accounting', 'label' => 'نهایی‌سازی اسناد حسابداری'],
        ['key' => 'accounting.reports.read',        'module' => 'accounting', 'label' => 'مشاهده گزارش‌های حسابداری'],
        ['key' => 'accounting.fiscal_years.read',   'module' => 'accounting', 'label' => 'مشاهده سال مالی'],
        ['key' => 'accounting.settings.write',      'module' => 'accounting', 'label' => 'مدیریت تنظیمات حسابداری'],
        ['key' => 'accounting.sales_bridge.read',   'module' => 'accounting', 'label' => 'مشاهده پل فروش-حسابداری'],
        ['key' => 'accounting.sales_bridge.run',    'module' => 'accounting', 'label' => 'اجرای همگام‌سازی پرداخت‌های فروش'],
    ];
}

function app_accounting_manager_default_permissions(): array
{
    return [
        'accounting.accounts.read',
        'accounting.accounts.write',
        'accounting.vouchers.read',
        'accounting.vouchers.write',
        'accounting.vouchers.post',
        'accounting.reports.read',
        'accounting.fiscal_years.read',
        'accounting.settings.write',
        'accounting.sales_bridge.read',
        'accounting.sales_bridge.run',
    ];
}

function app_accounting_read_permissions(): array
{
    return [
        'accounting.accounts.read',
        'accounting.vouchers.read',
        'accounting.reports.read',
        'accounting.fiscal_years.read',
        'accounting.sales_bridge.read',
    ];
}

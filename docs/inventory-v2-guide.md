# Inventory V2 Guide

راهنمای فشرده برای درک مدل ذهنی و ساختار فعلی ماژول انبار.

## لایه‌های دامنه
- Master data
  - `products`: تعریف کالای پایه
  - `warehouses`: انبارهای فیزیکی
  - `locations`: مکان‌های داخل هر انبار
  - `lots`: رهگیری بچ/لات و تاریخ انقضا
- Runtime stock
  - `inventory_v2_quants`: snapshot فعلی موجودی هر ترکیب محصول/انبار/مکان/لات
- Business flow
  - `inventory_v2_operation_headers`: سربرگ عملیات
  - `inventory_v2_operation_lines`: خطوط عملیات
- Auditability
  - `inventory_v2_stock_ledger`: تاریخچه تغییرات موجودی و رزرو
- Allocation
  - `inventory_v2_reservations`: نگه‌داشت موجودی برای مصرف بعدی
- Planning
  - `inventory_v2_replenishment_rules`: قواعد حداقل/حداکثر تامین مجدد
- Visibility
  - `inventory_v2_reports.php`: موجودی، کارتکس، و خلاصه عملیات

## چرا `quants` و `ledger` هر دو لازم‌اند؟
- `quants` وضعیت لحظه‌ای است؛ برای اینکه سریع بدانیم همین الان چه مقدار موجودی و رزرو داریم.
- `ledger` تاریخچه است؛ برای اینکه بفهمیم چه چیزی، چه زمانی، و با کدام عملیات تغییر کرده است.
- اگر فقط `ledger` داشته باشیم، هر بار برای موجودی فعلی باید کل تاریخچه بازپخش شود.
- اگر فقط `quants` داشته باشیم، ریشه تغییرات و audit trail از بین می‌رود.

## نقشه UI فعلی
- `کالاها`
  - تب `محصولات`: `/api/inventory_v2_products.php` -> `inventory_v2_products`
  - تب `لات‌ها`: `/api/inventory_v2_lots.php` -> `inventory_v2_lots`
- `عملیات`
  - همه عملیات از `/api/inventory_v2_operations.php`
  - جدول‌ها: `inventory_v2_operation_headers`, `inventory_v2_operation_lines`
  - ثبت نهایی روی `inventory_v2_quants` و `inventory_v2_stock_ledger` اثر می‌گذارد
- `موجودی و گزارش‌ها`
  - گزارش‌ها: `/api/inventory_v2_reports.php`
  - تامین مجدد: `/api/inventory_v2_replenishment.php`
  - رزروها endpoint عمومی دارند، اما فعلاً UI مدیریت دستی عمومی ندارند و بیشتر نقش پشتیبان جریان تخصیص/تحویل را بازی می‌کنند
- `تنظیمات`
  - انبارها: `/api/inventory_v2_warehouses.php`
  - مکان‌ها: `/api/inventory_v2_locations.php`

## چرخه عملیات
- وضعیت ثابت عملیات: `draft -> submitted -> approved -> posted`
- عملیات ثبت‌نشده می‌توانند `cancelled` شوند
- فقط عملیات `approved` قابل `posted` شدن هستند
- `posted` برگشت‌ناپذیر است

## انواع عملیات
- فعال در UI:
  - `receipt`
  - `delivery`
  - `transfer`
  - `adjustment`
  - `count`
  - `production_consume`
  - `production_output`
- سازگار برای backward compatibility ولی پنهان در UI:
  - `production_move`

## رزروها
- چرخه عمومی قرارداد: `active -> fulfilled | released`
- status دیتابیسی `expired` فعلاً در جریان عمومی سیستم استفاده نمی‌شود
- رزرو روی `quantity_reserved` اثر می‌گذارد و موجودی قابل دسترس را کم می‌کند
- آزادسازی یا fulfillment اثر رزرو را برمی‌گرداند و در ledger ثبت می‌شود

## legacy
- جداول `inventory_*` قدیمی هنوز در `database/schema.sql` حضور دارند
- این جداول فعلاً حذف نشده‌اند، اما UI و ownership فعال ماژول روی `inventory_v2_*` است
- حذف یا migration آن‌ها باید در یک فاز جداگانه و با plan مستقل انجام شود

## سناریوهای smoke پیشنهادی
- ایجاد و ویرایش محصول
- ایجاد انبار و مکان
- ایجاد لات برای یک محصول
- ساخت عملیات `receipt` با انبار و مکان مقصد
- ساخت عملیات `delivery` با انبار و مکان مبدا
- ساخت عملیات `transfer` با مبدا و مقصد کامل
- ساخت عملیات `adjustment` و `count`
- ساخت `production_consume` و `production_output`
- ارسال، تایید، و ثبت عملیات و اطمینان از برگشت‌ناپذیر بودن `posted`
- مشاهده `on_hand`, `cardex`, `operations`
- تعریف قانون تامین مجدد و مشاهده پیشنهاد
- ایجاد و release رزرو و بررسی اثر آن بر `available_qty`

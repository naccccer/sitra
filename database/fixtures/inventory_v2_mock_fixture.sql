-- Inventory V2 comprehensive mock fixture
-- Apply with: php scripts/seed-inventory-v2-mock.php

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM inventory_v2_stock_ledger;
DELETE FROM inventory_v2_reservations;
DELETE FROM inventory_v2_operation_lines;
DELETE FROM inventory_v2_operation_headers;
DELETE FROM inventory_v2_quants;
DELETE FROM inventory_v2_lots;
DELETE FROM inventory_v2_locations;
DELETE FROM inventory_v2_warehouses;
DELETE FROM inventory_v2_variants;
DELETE FROM inventory_v2_products;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO module_registry (module_key, label, phase, is_enabled, is_protected, sort_order)
VALUES
  ('inventory', 'Inventory', 'active', 1, 0, 38)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  phase = VALUES(phase),
  is_enabled = VALUES(is_enabled),
  is_protected = VALUES(is_protected),
  sort_order = VALUES(sort_order);

INSERT INTO users (id, username, full_name, password, role, is_active) VALUES
  (1, 'admin', 'مدیر سیستم', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'admin', 1),
  (2, 'manager', 'مدیر عملیات', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'manager', 1)
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  full_name = VALUES(full_name),
  password = VALUES(password),
  role = VALUES(role),
  is_active = VALUES(is_active);

INSERT INTO inventory_v2_warehouses (id, warehouse_key, name, notes, is_active) VALUES
  (11, 'v2-raw-input', 'انبار مواد اولیه', 'مواد خام و ورودی', 1),
  (12, 'v2-finished-output', 'انبار محصول نهایی', 'محصولات آماده تحویل', 1),
  (13, 'v2-production-floor', 'کف تولید', 'ایستگاه های مصرف و خروجی تولید', 1),
  (14, 'v2-return-zone', 'انبار مرجوعی', 'اقلام برگشتی و قرنطینه', 1);

INSERT INTO inventory_v2_locations (id, warehouse_id, parent_location_id, location_key, name, usage_type, notes, is_active) VALUES
  (101, 11, NULL, 'raw-receiving', 'سکوی دریافت مواد', 'internal', 'ورود اولیه مواد', 1),
  (102, 11, NULL, 'raw-rack-a', 'قفسه A مواد', 'internal', 'مواد مصرفی خط برش', 1),
  (103, 11, NULL, 'raw-rack-b', 'قفسه B مواد', 'internal', 'مواد مصرفی ثانویه', 1),
  (121, 12, NULL, 'finished-pick', 'زون جمع آوری تحویل', 'internal', 'آماده سازی حواله', 1),
  (122, 12, NULL, 'finished-rack', 'قفسه محصول نهایی', 'internal', 'نگهداری محصول نهایی', 1),
  (131, 13, NULL, 'prod-input', 'ورودی تولید', 'production', 'ورود مواد به تولید', 1),
  (132, 13, NULL, 'prod-output', 'خروجی تولید', 'production', 'خروج محصول از تولید', 1),
  (141, 14, NULL, 'return-hold', 'زون قرنطینه مرجوعی', 'inventory', 'بازبینی مرجوعی', 1);

INSERT INTO inventory_v2_products (id, product_code, name, product_type, uom, notes, is_active) VALUES
  (1001, 'GL-FLT-06', 'شیشه فلوت ۶ میل', 'stockable', 'متر مربع', 'مصرف مستقیم سفارشات عمومی', 1),
  (1002, 'GL-TMP-08', 'شیشه سکوریت ۸ میل', 'stockable', 'متر مربع', 'محصول فرآوری شده حرارتی', 1),
  (1003, 'GL-LAM-1010', 'شیشه لمینت ۱۰+۱۰', 'stockable', 'متر مربع', 'برای پروژه های ایمن', 1),
  (1004, 'HD-HINGE-H', 'لولا سنگین', 'stockable', 'عدد', 'یراق درب های سنگین', 1),
  (1005, 'SP-ALU-12', 'اسپیسر آلومینیومی ۱۲', 'stockable', 'متر', 'یراق دوجداره', 1),
  (1006, 'CH-SIL-BLK', 'چسب سیلیکون مشکی', 'consumable', 'عدد', 'مصرفی تولید', 1),
  (1007, 'SRV-CNC-CUT', 'خدمت برش CNC', 'service', 'سفارش', 'هزینه خدمات برش', 1),
  (1008, 'PR-AL-6063', 'پروفیل آلومینیوم 6063', 'stockable', 'متر', 'پروفیل قاب', 1),
  (1009, 'PK-BOX-L', 'کارتن بسته بندی بزرگ', 'consumable', 'عدد', 'مصرفی ارسال', 1),
  (1010, 'GL-CLR-05', 'شیشه شفاف ۵ میل', 'stockable', 'متر مربع', 'مصرف پرتیراژ', 1);

INSERT INTO inventory_v2_variants (id, product_id, sku, variant_code, attributes_json, is_active) VALUES
  (2001, 1001, 'GL-FLT-06-CLR', 'clear', '{"color":"شفاف","thickness":"6"}', 1),
  (2002, 1001, 'GL-FLT-06-BRZ', 'bronze', '{"color":"برنز","thickness":"6"}', 1),
  (2003, 1002, 'GL-TMP-08-CLR', 'clear', '{"color":"شفاف","thickness":"8"}', 1),
  (2004, 1002, 'GL-TMP-08-SMK', 'smoke', '{"color":"دودی","thickness":"8"}', 1),
  (2005, 1008, 'PR-AL-6063-NAT', 'natural', '{"finish":"natural"}', 1);

INSERT INTO inventory_v2_lots (id, lot_code, product_id, variant_id, expiry_date, notes, is_active) VALUES
  (3001, 'LOT-RAW-1405-001', 1001, 2001, NULL, 'سری اصلی ورودی شیشه فلوت', 1),
  (3002, 'LOT-RAW-1405-002', 1001, 2002, NULL, 'سری رنگی برنز', 1),
  (3003, 'LOT-TMP-1405-010', 1002, 2003, NULL, 'سری سکوریت آماده', 1),
  (3004, 'LOT-HDW-1405-014', 1004, NULL, NULL, 'سری یراق وارداتی', 1),
  (3005, 'LOT-SIL-1405-020', 1006, NULL, '2027-01-31', 'مصرفی چسب', 1),
  (3006, 'LOT-PRO-1405-015', 1008, 2005, NULL, 'پروفیل طبیعی', 1);

INSERT INTO inventory_v2_quants (product_id, variant_id, warehouse_id, location_id, lot_id, quantity_on_hand, quantity_reserved) VALUES
  (1001, 2001, 11, 102, 3001, 680.000, 120.000),
  (1001, 2002, 11, 103, 3002, 240.000, 40.000),
  (1002, 2003, 12, 122, 3003, 160.000, 25.000),
  (1002, 2004, 12, 122, NULL, 90.000, 10.000),
  (1003, NULL, 12, 122, NULL, 48.000, 0.000),
  (1004, NULL, 11, 103, 3004, 430.000, 0.000),
  (1005, NULL, 11, 102, NULL, 1250.000, 150.000),
  (1006, NULL, 13, 131, 3005, 380.000, 0.000),
  (1008, 2005, 13, 132, 3006, 510.000, 0.000),
  (1009, NULL, 12, 121, NULL, 620.000, 0.000),
  (1010, NULL, 11, 101, NULL, 750.000, 80.000);

INSERT INTO inventory_v2_operation_headers (
  id, operation_no, operation_type, status, source_warehouse_id, target_warehouse_id,
  reference_type, reference_id, reference_code, notes, created_by_user_id, approved_by_user_id,
  posted_at, created_at, updated_at
) VALUES
  (5001, 'REC-20260317-0001', 'receipt', 'posted', NULL, 11, 'purchase_receipt', 'PO-1405-771', 'GRN-1405-0091', 'دریافت عمده شیشه فلوت', 1, 1, NOW(), NOW(), NOW()),
  (5002, 'DEL-20260317-0002', 'delivery', 'submitted', 12, NULL, 'sales_order', 'SO-1405-0123', 'INV-1405-0102', 'ارسال پروژه نارون', 2, NULL, NULL, NOW(), NOW()),
  (5003, 'TRF-20260317-0003', 'transfer', 'approved', 11, 13, 'internal_transfer', 'IT-55', 'TR-55', 'انتقال مواد به تولید', 1, 1, NULL, NOW(), NOW()),
  (5004, 'ADJ-20260317-0004', 'adjustment', 'draft', NULL, 14, 'stock_count', 'CNT-1405-01', 'ADJ-01', 'پرت ناشی از شکستگی', 1, NULL, NULL, NOW(), NOW()),
  (5005, 'PCO-20260317-0005', 'production_consume', 'posted', 13, NULL, 'production_order', 'MO-1405-0088', 'MO-CONSUME-88', 'مصرف مواد خط تولید', 1, 1, NOW(), NOW(), NOW()),
  (5006, 'POU-20260317-0006', 'production_output', 'posted', NULL, 12, 'production_order', 'MO-1405-0088', 'MO-OUTPUT-88', 'خروجی تولید روزانه', 1, 1, NOW(), NOW(), NOW()),
  (5007, 'CNT-20260317-0007', 'count', 'cancelled', 11, NULL, 'cycle_count', 'CC-1405-02', 'CNT-CANCEL-02', 'نشست شمارش لغو شده', 1, NULL, NULL, NOW(), NOW());

INSERT INTO inventory_v2_operation_lines (
  id, operation_id, product_id, variant_id, lot_id, source_location_id, target_location_id,
  quantity_requested, quantity_done, uom, notes
) VALUES
  (6001, 5001, 1001, 2001, 3001, NULL, 101, 120.000, 120.000, 'متر مربع', 'ورود سری جدید'),
  (6002, 5001, 1005, NULL, NULL, NULL, 102, 250.000, 250.000, 'متر', 'تامین اسپیسر'),
  (6003, 5002, 1002, 2003, 3003, 122, NULL, 35.000, 35.000, 'متر مربع', 'ارسال مشتری پروژه نارون'),
  (6004, 5002, 1009, NULL, NULL, 121, NULL, 20.000, 20.000, 'عدد', 'کارتن ارسال'),
  (6005, 5003, 1001, 2001, 3001, 102, 131, 90.000, 90.000, 'متر مربع', 'تغذیه خط تولید'),
  (6006, 5004, 1004, NULL, 3004, NULL, 141, 5.000, -5.000, 'عدد', 'اصلاح شکستگی'),
  (6007, 5005, 1006, NULL, 3005, 131, NULL, 22.000, 22.000, 'عدد', 'مصرف چسب سیلیکون'),
  (6008, 5005, 1008, 2005, 3006, 132, NULL, 35.000, 35.000, 'متر', 'مصرف پروفیل'),
  (6009, 5006, 1002, 2003, NULL, NULL, 122, 28.000, 28.000, 'متر مربع', 'خروجی سکوریت'),
  (6010, 5006, 1003, NULL, NULL, NULL, 122, 12.000, 12.000, 'متر مربع', 'خروجی لمینت');

INSERT INTO inventory_v2_reservations (
  id, reservation_no, product_id, variant_id, lot_id, warehouse_id, location_id,
  quantity_reserved, status, reference_type, reference_id, reference_code,
  operation_id, notes, created_by_user_id, created_at, updated_at
) VALUES
  (7001, 'RSV-20260317-0001', 1002, 2003, 3003, 12, 122, 18.000, 'active', 'sales_order', 'SO-1405-0123', 'INV-1405-0102', NULL, 'رزرو فعال برای تحویل مرحله اول', 2, NOW(), NOW()),
  (7002, 'RSV-20260317-0002', 1001, 2001, 3001, 11, 102, 32.000, 'fulfilled', 'sales_order', 'SO-1405-0098', 'INV-1405-0082', 5002, 'رزرو تحویل شده', 1, NOW(), NOW()),
  (7003, 'RSV-20260317-0003', 1005, NULL, NULL, 11, 102, 40.000, 'released', 'sales_order', 'SO-1405-0105', 'INV-1405-0089', NULL, 'رزرو آزاد شده', 1, NOW(), NOW());

INSERT INTO inventory_v2_stock_ledger (
  operation_id, operation_line_id, movement_type, product_id, variant_id, lot_id,
  warehouse_id, location_id, quantity_on_hand_delta, quantity_reserved_delta,
  reference_type, reference_id, reference_code, actor_user_id, created_at
) VALUES
  (5001, 6001, 'in', 1001, 2001, 3001, 11, 101, 120.000, 0.000, 'purchase_receipt', 'PO-1405-771', 'GRN-1405-0091', 1, NOW()),
  (5001, 6002, 'in', 1005, NULL, NULL, 11, 102, 250.000, 0.000, 'purchase_receipt', 'PO-1405-771', 'GRN-1405-0091', 1, NOW()),
  (5005, 6007, 'out', 1006, NULL, 3005, 13, 131, -22.000, 0.000, 'production_order', 'MO-1405-0088', 'MO-CONSUME-88', 1, NOW()),
  (5005, 6008, 'out', 1008, 2005, 3006, 13, 132, -35.000, 0.000, 'production_order', 'MO-1405-0088', 'MO-CONSUME-88', 1, NOW()),
  (5006, 6009, 'in', 1002, 2003, NULL, 12, 122, 28.000, 0.000, 'production_order', 'MO-1405-0088', 'MO-OUTPUT-88', 1, NOW()),
  (5006, 6010, 'in', 1003, NULL, NULL, 12, 122, 12.000, 0.000, 'production_order', 'MO-1405-0088', 'MO-OUTPUT-88', 1, NOW()),
  (NULL, NULL, 'reserve', 1002, 2003, 3003, 12, 122, 0.000, 18.000, 'sales_order', 'SO-1405-0123', 'INV-1405-0102', 2, NOW()),
  (NULL, NULL, 'release', 1005, NULL, NULL, 11, 102, 0.000, -40.000, 'sales_order', 'SO-1405-0105', 'INV-1405-0089', 1, NOW());

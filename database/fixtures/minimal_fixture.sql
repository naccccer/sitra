-- Minimal fixture dataset for reproducible local development.
-- Use with: php scripts/reset-minimal-fixture.php
--
-- After applying this fixture, the first request to any accounting endpoint
-- will automatically re-seed the chart of accounts, fiscal year 1403, and
-- all demo vouchers via app_ensure_accounting_schema().

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_request_idempotency;
TRUNCATE TABLE orders;
TRUNCATE TABLE customer_project_contacts;
TRUNCATE TABLE customer_projects;
TRUNCATE TABLE customers;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE module_registry;
TRUNCATE TABLE system_settings;
TRUNCATE TABLE users;

-- Accounting tables (re-seeded automatically on next API call)
TRUNCATE TABLE acc_sales_bridge_log;
TRUNCATE TABLE acc_voucher_lines;
TRUNCATE TABLE acc_vouchers;
TRUNCATE TABLE acc_fiscal_years;
TRUNCATE TABLE acc_accounts;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, username, password, role, is_active)
VALUES
  (1, 'admin', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'admin', 1),
  (2, 'manager', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'manager', 1)
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  password = VALUES(password),
  role = VALUES(role),
  is_active = VALUES(is_active);

INSERT INTO module_registry (module_key, label, phase, is_enabled, is_protected, sort_order)
VALUES
  ('auth',        'Auth',         'active', 1, 1, 10),
  ('users-access','Users Access', 'active', 1, 1, 20),
  ('sales',       'Sales',        'active', 1, 0, 30),
  ('customers',   'Customers',    'active', 1, 0, 35),
  ('master-data', 'Master Data',  'active', 1, 0, 40),
  ('accounting',  'Accounting',   'active', 1, 0, 50)
ON DUPLICATE KEY UPDATE
  label      = VALUES(label),
  phase      = VALUES(phase),
  is_enabled = VALUES(is_enabled),
  is_protected = VALUES(is_protected),
  sort_order = VALUES(sort_order);

INSERT INTO system_settings (setting_key, setting_value)
VALUES
  ('catalog', '{"glasses":[],"operations":[],"connectors":{"interlayers":[],"spacers":[]},"fees":{},"factoryLimits":{"maxShortSideCm":0,"maxLongSideCm":0,"minimumChargeThresholdM2":1,"minimumBillableAreaM2":1},"jumboRules":[],"roundStep":1000}'),
  ('profile', '{"brandName":"Sitra","address":"","phone":"","logoPath":""}')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value);


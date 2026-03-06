-- Destructive one-time cleanup for legacy domain removal.
-- WARNING: this script drops every table except the core keep-list below.

SET @schema_name = DATABASE();
SET FOREIGN_KEY_CHECKS = 0;

UPDATE users
SET role = 'sales'
WHERE role NOT IN ('admin', 'manager', 'sales');

ALTER TABLE users
MODIFY COLUMN role ENUM('admin','manager','sales') NOT NULL DEFAULT 'manager';

DELETE FROM module_registry
WHERE module_key NOT IN ('auth', 'users-access', 'sales', 'master-data');

DELETE FROM audit_logs
WHERE event_type IS NULL
   OR event_type = ''
   OR SUBSTRING_INDEX(event_type, '.', 1) NOT IN ('auth', 'users_access', 'master_data', 'sales', 'kernel');

SELECT GROUP_CONCAT(CONCAT('`', table_name, '`') ORDER BY table_name SEPARATOR ', ')
INTO @drop_list
FROM information_schema.tables
WHERE table_schema = @schema_name
  AND table_name NOT IN (
    'users',
    'system_settings',
    'module_registry',
    'audit_logs',
    'orders',
    'order_request_idempotency'
  );

SET @drop_sql = IF(
  @drop_list IS NULL OR @drop_list = '',
  'SELECT 1',
  CONCAT('DROP TABLE IF EXISTS ', @drop_list)
);

PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;

SET FOREIGN_KEY_CHECKS = 1;

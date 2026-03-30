SELECT 'acc_payroll_periods' AS tbl, COUNT(*) AS total FROM acc_payroll_periods
SELECT 'acc_payslips' AS tbl, COUNT(*) AS total FROM acc_payslips
SELECT 'acc_payslip_items' AS tbl, COUNT(*) AS total FROM acc_payslip_items
SELECT 'acc_payslip_payments' AS tbl, COUNT(*) AS total FROM acc_payslip_payments
SELECT 'acc_payslip_documents' AS tbl, COUNT(*) AS total FROM acc_payslip_documents
SELECT 'acc_vouchers_payroll' AS tbl, COUNT(*) AS total FROM acc_vouchers WHERE source_type IN ('payroll','payroll_payment')

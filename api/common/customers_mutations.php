<?php
declare(strict_types=1);

function app_customer_create_from_payload(PDO $pdo, array $payload, $actor): void
{
    $fullName = app_customers_normalize_text($payload['fullName'] ?? '');
    if ($fullName === '') {
        app_json(['success' => false, 'error' => 'fullName is required.'], 400);
    }

    $customerCode = app_customer_normalize_code($payload['customerCode'] ?? '');
    if ($customerCode !== '' && app_customer_find_by_code($pdo, $customerCode)) {
        app_json(['success' => false, 'error' => 'customerCode must be unique.'], 409);
    }

    $typeRaw = app_customers_normalize_text($payload['customerType'] ?? '');
    if ($typeRaw !== '' && !app_customer_is_valid_type($typeRaw)) {
        app_json(['success' => false, 'error' => 'Valid customerType is required.'], 400);
    }
    $customerType = $typeRaw !== '' ? $typeRaw : 'individual';

    $companyName = app_customer_trim_to_null($payload['companyName'] ?? null);
    $defaultPhone = app_customer_trim_to_null($payload['defaultPhone'] ?? null);
    $nationalId = app_customer_trim_to_null($payload['nationalId'] ?? null);
    $economicCode = app_customer_trim_to_null($payload['economicCode'] ?? null);
    $email = app_customer_trim_to_null($payload['email'] ?? null);
    $province = app_customer_trim_to_null($payload['province'] ?? null);
    $city = app_customer_trim_to_null($payload['city'] ?? null);
    $address = app_customer_trim_to_null($payload['address'] ?? null);
    $notes = app_customer_trim_to_null($payload['notes'] ?? null);

    $creditLimit = null;
    if (array_key_exists('creditLimit', $payload)) {
        $creditLimitRaw = trim((string)$payload['creditLimit']);
        if ($creditLimitRaw !== '') {
            if (!ctype_digit($creditLimitRaw)) {
                app_json(['success' => false, 'error' => 'creditLimit must be a non-negative integer.'], 400);
            }
            $creditLimit = (int)$creditLimitRaw;
        }
    }

    $paymentTermDays = null;
    if (array_key_exists('paymentTermDays', $payload)) {
        $paymentTermRaw = trim((string)$payload['paymentTermDays']);
        if ($paymentTermRaw !== '') {
            if (!ctype_digit($paymentTermRaw)) {
                app_json(['success' => false, 'error' => 'paymentTermDays must be a non-negative integer.'], 400);
            }
            $paymentTermDays = (int)$paymentTermRaw;
        }
    }

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO customers (
                full_name, customer_code, customer_type, company_name, default_phone,
                national_id, economic_code, email, province, city,
                credit_limit, payment_term_days, address, notes, is_active
            ) VALUES (
                :full_name, :customer_code, :customer_type, :company_name, :default_phone,
                :national_id, :economic_code, :email, :province, :city,
                :credit_limit, :payment_term_days, :address, :notes, 1
            )'
        );
        $stmt->execute([
            'full_name' => $fullName,
            'customer_code' => $customerCode !== '' ? $customerCode : null,
            'customer_type' => $customerType,
            'company_name' => $companyName,
            'default_phone' => $defaultPhone,
            'national_id' => $nationalId,
            'economic_code' => $economicCode,
            'email' => $email,
            'province' => $province,
            'city' => $city,
            'credit_limit' => $creditLimit,
            'payment_term_days' => $paymentTermDays,
            'address' => $address,
            'notes' => $notes,
        ]);

        $id = (int)$pdo->lastInsertId();
        if ($customerCode === '') {
            $customerCode = app_customer_code_from_id($id);
            $pdo->prepare('UPDATE customers SET customer_code = :customer_code WHERE id = :id')
                ->execute([
                    'customer_code' => $customerCode,
                    'id' => $id,
                ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && (str_contains($e->getMessage(), 'uq_customers_customer_code') || str_contains($e->getMessage(), 'Duplicate entry'))) {
            app_json(['success' => false, 'error' => 'customerCode must be unique.'], 409);
        }
        throw $e;
    }

    $customer = app_customer_find($pdo, $id);
    app_audit_log($pdo, 'customers.customer.created', 'customers', (string)$id, [
        'fullName' => $fullName,
        'customerCode' => $customerCode,
        'customerType' => $customerType,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => $customer ? app_customer_from_row($customer) : null,
    ], 201);
}

function app_customer_update_from_payload(PDO $pdo, array $payload, $actor): void
{
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid customer id is required.'], 400);
    }

    $current = app_customer_find($pdo, $id);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Customer not found.'], 404);
    }

    $fullName = array_key_exists('fullName', $payload) ? app_customers_normalize_text($payload['fullName']) : (string)$current['full_name'];
    if ($fullName === '') {
        app_json(['success' => false, 'error' => 'fullName is required.'], 400);
    }

    $customerCode = array_key_exists('customerCode', $payload) ? app_customer_normalize_code($payload['customerCode']) : (string)($current['customer_code'] ?? '');
    if ($customerCode !== '') {
        $duplicate = app_customer_find_by_code($pdo, $customerCode);
        if ($duplicate && (int)($duplicate['id'] ?? 0) !== $id) {
            app_json(['success' => false, 'error' => 'customerCode must be unique.'], 409);
        }
    } else {
        $customerCode = null;
    }

    $customerType = (string)($current['customer_type'] ?? 'individual');
    if (array_key_exists('customerType', $payload)) {
        $typeRaw = app_customers_normalize_text($payload['customerType']);
        if ($typeRaw !== '' && !app_customer_is_valid_type($typeRaw)) {
            app_json(['success' => false, 'error' => 'Valid customerType is required.'], 400);
        }
        $customerType = $typeRaw !== '' ? $typeRaw : 'individual';
    }

    $companyName = array_key_exists('companyName', $payload) ? app_customer_trim_to_null($payload['companyName']) : app_customer_trim_to_null($current['company_name'] ?? null);
    $defaultPhone = array_key_exists('defaultPhone', $payload) ? app_customer_trim_to_null($payload['defaultPhone']) : app_customer_trim_to_null($current['default_phone'] ?? null);
    $nationalId = array_key_exists('nationalId', $payload) ? app_customer_trim_to_null($payload['nationalId']) : app_customer_trim_to_null($current['national_id'] ?? null);
    $economicCode = array_key_exists('economicCode', $payload) ? app_customer_trim_to_null($payload['economicCode']) : app_customer_trim_to_null($current['economic_code'] ?? null);
    $email = array_key_exists('email', $payload) ? app_customer_trim_to_null($payload['email']) : app_customer_trim_to_null($current['email'] ?? null);
    $province = array_key_exists('province', $payload) ? app_customer_trim_to_null($payload['province']) : app_customer_trim_to_null($current['province'] ?? null);
    $city = array_key_exists('city', $payload) ? app_customer_trim_to_null($payload['city']) : app_customer_trim_to_null($current['city'] ?? null);
    $address = array_key_exists('address', $payload) ? app_customer_trim_to_null($payload['address']) : app_customer_trim_to_null($current['address'] ?? null);
    $notes = array_key_exists('notes', $payload) ? app_customer_trim_to_null($payload['notes']) : app_customer_trim_to_null($current['notes'] ?? null);

    $creditLimit = ($current['credit_limit'] ?? null) === null ? null : (int)$current['credit_limit'];
    if (array_key_exists('creditLimit', $payload)) {
        $creditLimitRaw = trim((string)$payload['creditLimit']);
        if ($creditLimitRaw !== '') {
            if (!ctype_digit($creditLimitRaw)) {
                app_json(['success' => false, 'error' => 'creditLimit must be a non-negative integer.'], 400);
            }
            $creditLimit = (int)$creditLimitRaw;
        } else {
            $creditLimit = null;
        }
    }

    $paymentTermDays = ($current['payment_term_days'] ?? null) === null ? null : (int)$current['payment_term_days'];
    if (array_key_exists('paymentTermDays', $payload)) {
        $paymentTermRaw = trim((string)$payload['paymentTermDays']);
        if ($paymentTermRaw !== '') {
            if (!ctype_digit($paymentTermRaw)) {
                app_json(['success' => false, 'error' => 'paymentTermDays must be a non-negative integer.'], 400);
            }
            $paymentTermDays = (int)$paymentTermRaw;
        } else {
            $paymentTermDays = null;
        }
    }

    $applyToOrderHistory = app_customer_parse_bool($payload['applyToOrderHistory'] ?? false, false);

    $stmt = $pdo->prepare(
        'UPDATE customers
         SET full_name = :full_name,
             customer_code = :customer_code,
             customer_type = :customer_type,
             company_name = :company_name,
             default_phone = :default_phone,
             national_id = :national_id,
             economic_code = :economic_code,
             email = :email,
             province = :province,
             city = :city,
             credit_limit = :credit_limit,
             payment_term_days = :payment_term_days,
             address = :address,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'full_name' => $fullName,
        'customer_code' => $customerCode,
        'customer_type' => $customerType,
        'company_name' => $companyName,
        'default_phone' => $defaultPhone,
        'national_id' => $nationalId,
        'economic_code' => $economicCode,
        'email' => $email,
        'province' => $province,
        'city' => $city,
        'credit_limit' => $creditLimit,
        'payment_term_days' => $paymentTermDays,
        'address' => $address,
        'notes' => $notes,
    ]);

    $updatedOrderSnapshots = 0;
    if ($applyToOrderHistory) {
        $updatedOrderSnapshots = app_customer_apply_snapshot_to_orders($pdo, $id, $fullName, $defaultPhone ?? '');
    }

    $customer = app_customer_find($pdo, $id);
    app_audit_log($pdo, 'customers.customer.updated', 'customers', (string)$id, [
        'customerCode' => $customerCode,
        'customerType' => $customerType,
        'applyToOrderHistory' => $applyToOrderHistory,
        'updatedOrderSnapshots' => $updatedOrderSnapshots,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => $customer ? app_customer_from_row($customer) : null,
        'updatedOrderSnapshots' => $updatedOrderSnapshots,
    ]);
}

function app_customer_toggle_active_from_payload(PDO $pdo, array $payload, $actor): void
{
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid customer id is required.'], 400);
    }
    $isActive = app_customer_parse_bool($payload['isActive'] ?? true, true);

    $stmt = $pdo->prepare(
        'UPDATE customers
         SET is_active = :is_active,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'is_active' => $isActive ? 1 : 0,
    ]);
    $customer = app_customer_find($pdo, $id);
    if (!$customer) {
        app_json(['success' => false, 'error' => 'Customer not found.'], 404);
    }

    app_audit_log($pdo, 'customers.customer.active.changed', 'customers', (string)$id, [
        'isActive' => $isActive,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => app_customer_from_row($customer),
    ]);
}


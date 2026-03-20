<?php
declare(strict_types=1);

function app_customer_parse_bool($value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }

    $raw = strtolower(trim((string)$value));
    if ($raw === '1' || $raw === 'true' || $raw === 'yes' || $raw === 'on') {
        return true;
    }

    if ($raw === '0' || $raw === 'false' || $raw === 'no' || $raw === 'off') {
        return false;
    }

    return $fallback;
}

function app_customer_types(): array
{
    return ['individual', 'company'];
}

function app_customer_is_valid_type($value): bool
{
    return in_array(trim((string)$value), app_customer_types(), true);
}

function app_customer_normalize_type($value): string
{
    $raw = trim((string)$value);
    return app_customer_is_valid_type($raw) ? $raw : 'individual';
}

function app_customer_normalize_code($value): string
{
    return strtoupper(trim((string)$value));
}

function app_customer_code_from_id(int $id): string
{
    return sprintf('C%06d', max(0, $id));
}

function app_customer_trim_to_null($value): ?string
{
    $raw = trim((string)$value);
    return $raw === '' ? null : $raw;
}


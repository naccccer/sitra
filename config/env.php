<?php
declare(strict_types=1);

function app_load_env_local(): void
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    // Keep server-injected env immutable, but allow later env files (like
    // .env.local) to override earlier file-loaded values.
    $lockedNames = [];
    $systemEnv = getenv();
    if (is_array($systemEnv)) {
        foreach (array_keys($systemEnv) as $name) {
            $lockedNames[(string)$name] = true;
        }
    }
    foreach (array_keys($_ENV) as $name) {
        $lockedNames[(string)$name] = true;
    }
    foreach (array_keys($_SERVER) as $name) {
        $lockedNames[(string)$name] = true;
    }

    $root = dirname(__DIR__);
    $envFiles = [
        $root . DIRECTORY_SEPARATOR . '.env',
        $root . DIRECTORY_SEPARATOR . '.env.local',
        $root . DIRECTORY_SEPARATOR . 'env',
        $root . DIRECTORY_SEPARATOR . 'env.local',
        $root . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . '.env',
        $root . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . '.env.local',
        $root . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'env',
        $root . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'env.local',
    ];

    foreach ($envFiles as $envPath) {
        if (!is_readable($envPath)) {
            continue;
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            // Strip UTF-8 BOM if present.
            $line = preg_replace('/^\x{FEFF}/u', '', $line) ?? $line;

            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (str_starts_with($line, 'export ')) {
                $line = trim(substr($line, 7));
            }

            $equalPos = strpos($line, '=');
            if ($equalPos === false) {
                continue;
            }

            $name = trim(substr($line, 0, $equalPos));
            $value = trim(substr($line, $equalPos + 1));
            if ($name === '') {
                continue;
            }

            // Remove inline comments for unquoted values: FOO=bar # comment
            if (!str_starts_with($value, '"') && !str_starts_with($value, "'")) {
                $commentPos = strpos($value, ' #');
                if ($commentPos !== false) {
                    $value = rtrim(substr($value, 0, $commentPos));
                }
            }

            // Do not override vars already injected by hosting/server env.
            if (isset($lockedNames[$name])) {
                continue;
            }

            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;

            if (function_exists('putenv')) {
                @putenv($name . '=' . $value);
            }
        }
    }
}

function app_env_raw(string $name): ?string
{
    $value = getenv($name);
    if ($value !== false) {
        return (string)$value;
    }

    if (array_key_exists($name, $_ENV)) {
        return (string)$_ENV[$name];
    }

    if (array_key_exists($name, $_SERVER)) {
        return (string)$_SERVER[$name];
    }

    return null;
}

function app_env_get(string $name, ?string $default = null): ?string
{
    $value = app_env_raw($name);
    if ($value === null || $value === '') {
        return $default;
    }

    return $value;
}

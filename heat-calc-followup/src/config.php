<?php
/**
 * بارگذاری تنظیمات از متغیرهای محیطی یا فایل .env
 * هیچ مقدار حساسی در کد هاردکد نشده است.
 */

declare(strict_types=1);

/**
 * خواندن فایل .env ساده (KEY=VALUE) و ریختن در getenv.
 * متغیرهای محیطی واقعی سرور بر .env اولویت دارند.
 */
function load_env(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\"'");
        if (getenv($key) === false) {
            putenv("$key=$value");
        }
    }
}

load_env(dirname(__DIR__) . '/.env');

/** گرفتن مقدار تنظیم با مقدار پیش‌فرض اختیاری. */
function cfg(string $key, ?string $default = null): string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        if ($default === null) {
            throw new RuntimeException("متغیر محیطی الزامی تنظیم نشده است: $key");
        }
        return $default;
    }
    return $value;
}

function cfg_int(string $key, int $default): int
{
    return (int) cfg($key, (string) $default);
}

/** لاگ ساده روی فایل (مسیر از LOG_FILE). */
function app_log(string $message): void
{
    $file = cfg('LOG_FILE', sys_get_temp_dir() . '/shofazh-sms.log');
    $line = sprintf("[%s] %s\n", date('Y-m-d H:i:s'), $message);
    @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
}

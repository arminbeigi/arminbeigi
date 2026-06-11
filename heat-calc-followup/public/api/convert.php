<?php
/**
 * POST /api/convert.php  {phone: "09..."}
 * ثبت تبدیل: هر وقت کاربر سفارش داد یا تماس گرفت فراخوانی شود
 * (مثلاً از هوک ثبت سفارش ووکامرس یا پنل CRM) تا پیامک پیگیری دریافت نکند.
 *
 * محافظت: هدر X-Api-Secret باید با CONVERT_API_SECRET در .env برابر باشد.
 */

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/lead.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'فقط متد POST مجاز است.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$secret = $_SERVER['HTTP_X_API_SECRET'] ?? '';
if (!hash_equals(cfg('CONVERT_API_SECRET'), $secret)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'دسترسی غیرمجاز.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '', true) ?: $_POST;
$phone = trim((string) ($input['phone'] ?? ''));

$rows = mark_converted($phone);
echo json_encode(['ok' => $rows > 0 || valid_iranian_mobile($phone), 'updated' => $rows], JSON_UNESCAPED_UNICODE);

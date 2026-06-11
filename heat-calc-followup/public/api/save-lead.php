<?php
/**
 * POST /api/save-lead.php
 * هنگام محاسبه بار حرارتی از فرانت فراخوانی می‌شود:
 * شماره را اعتبارسنجی، سرنخ را ذخیره و پیامک اول را فوری ارسال می‌کند.
 *
 * بدنه (JSON): { phone, heat_load, suggested_model, suggested_fins, product_url }
 */

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/lead.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'فقط متد POST مجاز است.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    $input = $_POST; // پشتیبانی از فرم معمولی علاوه بر JSON
}

try {
    $result = save_lead_and_send_sms1(
        trim((string) ($input['phone'] ?? '')),
        (int) ($input['heat_load'] ?? 0),
        trim((string) ($input['suggested_model'] ?? '')),
        (int) ($input['suggested_fins'] ?? 0),
        trim((string) ($input['product_url'] ?? '')),
        $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    );
    http_response_code($result['ok'] ? 200 : 422);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    app_log('save-lead.php خطا: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'خطای داخلی سرور.'], JSON_UNESCAPED_UNICODE);
}

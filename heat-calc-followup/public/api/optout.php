<?php
/**
 * لغو دریافت پیامک:
 *   GET  /api/optout.php?t=TOKEN          ← کلیک روی لینک داخل پیامک
 *   POST /api/optout.php  {phone: "09..."} ← webhook پیامک دریافتی پنل (کلیدواژه «لغو»)
 */

declare(strict_types=1);

// پیدا کردن خودکار src/lead.php — هم در چیدمان مخزن، هم وقتی این فایل در public_html/api است
foreach ([
    dirname(__DIR__, 2) . '/src/lead.php',
    dirname(__DIR__, 2) . '/heat-calc-followup/src/lead.php',
] as $leadLib) {
    if (is_file($leadLib)) {
        require_once $leadLib;
        break;
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    // webhook پنل پیامکی: اگر متن پیام حاوی کلیدواژه لغو بود، شماره فرستنده opted_out شود
    header('Content-Type: application/json; charset=utf-8');
    $input = json_decode(file_get_contents('php://input') ?: '', true) ?: $_POST;
    $phone = trim((string) ($input['phone'] ?? $input['from'] ?? ''));
    $text  = trim((string) ($input['message'] ?? $input['text'] ?? ''));

    $isOptOutKeyword = $text === '' // برخی پنل‌ها فقط شماره می‌فرستند
        || preg_match('/لغو|انصراف|^(off|stop|cancel)$/iu', $text);

    $ok = $isOptOutKeyword && opt_out_by_phone($phone);
    echo json_encode(['ok' => $ok], JSON_UNESCAPED_UNICODE);
    exit;
}

// لینک داخل پیامک
$token = trim((string) ($_GET['t'] ?? ''));
$ok    = opt_out_by_token($token);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>لغو دریافت پیامک | شوفاژ</title>
<style>
  body{font-family:Tahoma,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:12px;padding:32px 40px;box-shadow:0 4px 16px rgba(0,0,0,.08);text-align:center;max-width:420px}
  h1{font-size:1.2rem;color:#1a3c5e}
  p{color:#555;line-height:1.9}
  a{color:#0a7d4f}
</style>
</head>
<body>
<div class="card">
<?php if ($ok): ?>
  <h1>✅ لغو دریافت انجام شد</h1>
  <p>دیگر پیامک پیگیری از شوفاژ دریافت نخواهید کرد.<br>
     اگر سوالی درباره محاسبه بار حرارتی دارید، خوشحال می‌شویم تماس بگیرید.</p>
<?php else: ?>
  <h1>لینک نامعتبر است</h1>
  <p>این لینک لغو دریافت معتبر نیست یا قبلاً استفاده شده است.</p>
<?php endif; ?>
  <p><a href="https://shofazh.com">بازگشت به shofazh.com</a></p>
</div>
</body>
</html>

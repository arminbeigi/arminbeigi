<?php
// لینک کوتاه پیامک ۲ (shofazh.com/s2)
// ⚠️ مقصد را اینجا تنظیم کنید (مثلاً صفحه فروشگاه):
$target = 'https://shofazh.com/';

$utm = 'utm_source=sms&utm_medium=sms&utm_campaign=heatcalc_sms2';
header('Location: ' . $target . (strpos($target, '?') === false ? '?' : '&') . $utm, true, 302);
exit;

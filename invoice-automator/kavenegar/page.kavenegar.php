<?php
$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';
$dispnum = "kavenegar";
$tab = isset($_GET['tab']) ? $_GET['tab'] : 'base';

if ($action == 'save') {
    sunwaysms_save();
    needreload();
}
if ($action == 'save_ext') {
    $ext    = isset($_POST['ext'])    ? trim($_POST['ext'])    : '';
    $enable = isset($_POST['enable']) ? 1 : 0;
    global $db;
    $row = $db->getRow("SELECT id FROM sunwaysms WHERE ext='$ext'", DB_FETCHMODE_ASSOC);
    if ($row && isset($row['id'])) {
        $db->query("UPDATE sunwaysms SET enable=$enable WHERE ext='$ext'");
    } else {
        $db->query("INSERT INTO sunwaysms(ext,enable)VALUES('$ext',$enable)");
    }
}
if ($action == 'del_ext') {
    $id = (int)$_POST['id'];
    global $db;
    $db->query("DELETE FROM sunwaysms WHERE id=$id");
}
if ($action == 'clear_log') {
    global $db;
    $db->query("DELETE FROM sunwaysms_log");
}

$c = sunwaysms_get();
global $db;

// راه‌اندازی cron
$agi_result = null;
if ($action == 'setup_agi') {
    // کپی همه فایل‌های اجرایی (تا نسخه قدیمی باقی نماند)
    $copy_files = array(
        array('/var/www/html/admin/modules/kavenegar/bin/kavenegar_cron.php',   '/var/lib/asterisk/bin/kavenegar_cron.php'),
        array('/var/www/html/admin/modules/kavenegar/bin/sendsms.php',          '/var/lib/asterisk/bin/sendsms.php'),
        array('/var/www/html/admin/modules/kavenegar/bin/sunwaysmstools.php',   '/var/lib/asterisk/bin/sunwaysmstools.php'),
        array('/var/www/html/admin/modules/kavenegar/agi-bin/sunwaysms.agi',    '/var/lib/asterisk/agi-bin/sunwaysms.agi'),
    );
    $ok1 = true;
    foreach ($copy_files as $cf) {
        if (file_exists($cf[1])) @unlink($cf[1]);
        if (copy($cf[0], $cf[1])) {
            @chmod($cf[1], 0755);
        } else {
            $ok1 = false;
        }
    }

    // تلاش برای قابل‌نوشتن کردن فایل لاگ
    $lf = '/var/log/asterisk/kavenegar_sms.log';
    @chmod($lf, 0666);
    if (!is_writable($lf)) {
        @unlink($lf);
        @touch($lf);
        @chmod($lf, 0666);
    }

    // Add to current user's crontab (no root needed)
    exec('crontab -l 2>/dev/null', $cron_lines);
    $cron_content = implode("\n", array_filter($cron_lines));
    if (strpos($cron_content, 'kavenegar_cron') === false) {
        $cron_content .= "\n* * * * * /var/lib/asterisk/bin/kavenegar_cron.php\n";
        $tmpfile = tempnam('/tmp', 'kav_cron_');
        file_put_contents($tmpfile, $cron_content);
        exec("crontab " . escapeshellarg($tmpfile));
        unlink($tmpfile);
    }

    exec('crontab -l 2>/dev/null', $verify);
    $ok2 = false;
    foreach ($verify as $line) {
        if (strpos($line, 'kavenegar_cron') !== false) { $ok2 = true; break; }
    }

    if ($ok1 && $ok2) {
        $agi_result = array('ok' => true, 'msg' => 'Cron job راه‌اندازی شد. هر دقیقه تماس‌های جدید بررسی می‌شود.');
    } else {
        $agi_result = array('ok' => false, 'msg' => 'خطا: فایل=' . ($ok1?'OK':'FAIL') . ' Cron=' . ($ok2?'OK':'FAIL'));
    }
    $tab = 'base';
}

// عیب‌یابی
$diag = null;
if ($action == 'diagnose') {
    $diag = array();

    // 1) دسترسی به دیتابیس CDR و نام آن
    $cdr_db = null;
    foreach (array('asteriskcdrdb', 'asterisk') as $dbname) {
        $t = $db->getRow("SELECT COUNT(*) AS c FROM {$dbname}.cdr", DB_FETCHMODE_ASSOC);
        if (!DB::IsError($t)) { $cdr_db = $dbname; break; }
    }
    $diag['cdr_db'] = $cdr_db ? $cdr_db : 'یافت نشد';

    // 2) آخرین ۵ تماس
    $diag['calls'] = array();
    if ($cdr_db) {
        $rows = $db->getAll("SELECT calldate, src, dst, disposition FROM {$cdr_db}.cdr ORDER BY calldate DESC LIMIT 5", DB_FETCHMODE_ASSOC);
        if (is_array($rows)) $diag['calls'] = $rows;
    }

    // 3) وضعیت فایل‌ها
    $diag['files'] = array(
        'kavenegar_cron.php' => file_exists('/var/lib/asterisk/bin/kavenegar_cron.php'),
        'sendsms.php'        => file_exists('/var/lib/asterisk/bin/sendsms.php'),
        'agi'                => file_exists('/var/lib/asterisk/agi-bin/sunwaysms.agi'),
    );

    // 4) crontab
    exec('crontab -l 2>&1', $ct);
    $diag['crontab'] = implode("\n", $ct);

    // 5) اجرای واقعی cron و گرفتن خروجی
    exec('php /var/lib/asterisk/bin/kavenegar_cron.php 2>&1', $cron_out, $cron_ret);
    $diag['cron_output'] = implode("\n", $cron_out);
    $diag['cron_ret'] = $cron_ret;

    // 6) آخرین خطوط لاگ
    $diag['log'] = '';
    $lf = '/var/log/asterisk/kavenegar_sms.log';
    if (file_exists($lf)) {
        $ll = array_slice(file($lf), -15);
        $diag['log'] = implode('', $ll);
    }

    // 7) اجرای مستقیم sendsms.php با آخرین تماس‌گیرنده (خطای کامل)
    $diag['sendsms_output'] = '(تماس معتبری یافت نشد)';
    if (!empty($diag['calls'])) {
        foreach ($diag['calls'] as $call) {
            $m = substr(preg_replace('/\D/', '', $call['src']), -10);
            if (strlen($m) == 10 && $m[0] == '9') {
                $d = preg_replace('/[^0-9a-zA-Z]/', '', $call['dst']);
                exec('php /var/lib/asterisk/bin/sendsms.php ' . escapeshellarg($m) . ' ' . escapeshellarg($d) . ' 2>&1', $so, $sr);
                $diag['sendsms_output'] = "اجرا برای {$m} → {$d} (ret={$sr})\n" . implode("\n", $so);
                break;
            }
        }
    }

    // 8) آخرین رکوردهای جدول لاگ دیتابیس
    $diag['db_log'] = array();
    $dbl = $db->getAll("SELECT destination, status, api_res, send_at FROM sunwaysms_log ORDER BY id DESC LIMIT 5", DB_FETCHMODE_ASSOC);
    if (is_array($dbl)) $diag['db_log'] = $dbl;

    $tab = 'base';
}

// ارسال پیامک آزمایشی
$test_result = null;
if ($action == 'test_sms') {
    $test_phone = isset($_POST['test_phone']) ? trim($_POST['test_phone']) : '';
    $test_msg   = isset($_POST['test_msg'])   ? trim($_POST['test_msg'])   : 'پیامک آزمایشی از ایزابل';
    if ($test_phone && @$c['apikey']) {
        $apikey  = trim($c['apikey']);
        $sender  = trim($c['sender']);
        $url     = "https://api.kavenegar.com/v1/{$apikey}/sms/send.json";
        $post    = "receptor=" . urlencode($test_phone) . "&message=" . urlencode($test_msg);
        if ($sender) $post .= "&sender=" . urlencode($sender);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $resp = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($resp, true);
        if ($data && isset($data['return']['status']) && $data['return']['status'] == 200) {
            $test_result = array('ok' => true, 'msg' => 'پیامک با موفقیت ارسال شد به ' . $test_phone);
        } else {
            $err = isset($data['return']['message']) ? $data['return']['message'] : $resp;
            $test_result = array('ok' => false, 'msg' => 'خطا: ' . $err);
        }
    } else {
        $test_result = array('ok' => false, 'msg' => 'شماره مقصد یا API Key وارد نشده است');
    }
    $tab = 'base';
}
?>
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.kav{font-family:'Vazirmatn',Tahoma,Arial,sans-serif;direction:rtl;padding:24px;max-width:860px;color:#1a1a2e;font-size:14px;line-height:1.6}
.kav h2{font-size:22px;font-weight:700;color:#4a0e8f;margin-bottom:24px;display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:2px solid #ede7f6}
.kav-tabs{display:flex;gap:4px;margin-bottom:24px}
.kav-tab{padding:9px 22px;border-radius:8px 8px 0 0;background:#f3eefb;color:#7b4fa6;text-decoration:none;font-weight:500;font-size:13px;border:1px solid #ddd;border-bottom:none;transition:all .2s}
.kav-tab:hover{background:#e8dff7}
.kav-tab.active{background:#4a0e8f;color:#fff;border-color:#4a0e8f}
.kav-box{background:#fff;border:1px solid #e0d7f0;border-radius:0 12px 12px 12px;padding:28px;box-shadow:0 2px 12px rgba(74,14,143,.06)}
.kav-section{margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #f0eafa}
.kav-section:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.kav-section-title{font-size:13px;font-weight:700;color:#7b4fa6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px;display:flex;align-items:center;gap:6px}
.kav-row{display:flex;align-items:flex-start;margin-bottom:14px;gap:16px}
.kav-lbl{width:210px;font-weight:500;color:#444;padding-top:9px;font-size:13px;flex-shrink:0}
.kav-ctrl{flex:1}
.kav-inp{width:100%;padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;transition:border-color .2s;background:#fafafa}
.kav-inp:focus{border-color:#7b4fa6;outline:none;background:#fff}
.kav-sel{padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;background:#fafafa;min-width:260px;transition:border-color .2s}
.kav-sel:focus{border-color:#7b4fa6;outline:none}
.kav-hint{font-size:11px;color:#999;margin-top:5px}
.kav-btn{background:linear-gradient(135deg,#6a1fcf,#4a0e8f);color:#fff;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;font-weight:600;transition:all .2s;box-shadow:0 2px 8px rgba(74,14,143,.25)}
.kav-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(74,14,143,.35)}
.kav-btn-green{background:linear-gradient(135deg,#27ae60,#1e8449)}
.kav-btn-green:hover{box-shadow:0 4px 14px rgba(39,174,96,.35)}
.kav-btn-red{background:linear-gradient(135deg,#e74c3c,#c0392b)}
.kav-btn-red:hover{box-shadow:0 4px 14px rgba(231,76,60,.35)}
.kav-btn-sm{padding:5px 14px;font-size:12px}
.kav-tbl{width:100%;border-collapse:collapse;font-size:13px}
.kav-tbl th{background:#f3eefb;color:#4a0e8f;padding:10px 14px;text-align:right;font-weight:600;border-bottom:2px solid #ddd}
.kav-tbl td{padding:9px 14px;border-bottom:1px solid #f5f5f5}
.kav-tbl tbody tr:hover td{background:#faf7ff}
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block}
.badge-on{background:#e8f8f0;color:#1e8449}
.badge-off{background:#fdecea;color:#c0392b}
.badge-ok{background:#e8f8f0;color:#1e8449}
.badge-fail{background:#fdecea;color:#c0392b}
.alert{padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;font-weight:500}
.alert-ok{background:#e8f8f0;border:1px solid #a9dfbf;color:#1e6e3e}
.alert-err{background:#fdecea;border:1px solid #f5b7b1;color:#922b21}
.test-box{background:linear-gradient(135deg,#f8f4ff,#f0eafa);border:1.5px solid #ddd;border-radius:10px;padding:20px;margin-top:20px}
.empty-state{text-align:center;padding:40px;color:#bbb}
.empty-state svg{margin-bottom:10px;opacity:.4}
</style>
</head>
<body>
<div class="kav">
<h2>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a0e8f" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
پیامک کاوه‌نگار
</h2>

<div class="kav-tabs">
    <a href="?display=kavenegar&tab=base" class="kav-tab <?php if($tab=='base') echo 'active'; ?>">⚙️ تنظیمات</a>
    <a href="?display=kavenegar&tab=ext"  class="kav-tab <?php if($tab=='ext')  echo 'active'; ?>">📞 داخلی‌ها</a>
    <a href="?display=kavenegar&tab=log"  class="kav-tab <?php if($tab=='log')  echo 'active'; ?>">📋 لاگ</a>
</div>

<?php if ($tab == 'base'): ?>
<div class="kav-box">

<?php if ($agi_result): ?>
<div class="alert <?php echo $agi_result['ok'] ? 'alert-ok' : 'alert-err'; ?>">
    <?php echo $agi_result['ok'] ? '✅' : '❌'; ?> <?php echo htmlspecialchars($agi_result['msg']); ?>
</div>
<?php endif; ?>
<?php if ($test_result): ?>
<div class="alert <?php echo $test_result['ok'] ? 'alert-ok' : 'alert-err'; ?>">
    <?php echo $test_result['ok'] ? '✅' : '❌'; ?> <?php echo htmlspecialchars($test_result['msg']); ?>
</div>
<?php endif; ?>

<form method="post" action="?display=kavenegar&tab=base">
<input type="hidden" name="display" value="<?php echo $dispnum; ?>">
<input type="hidden" name="action" value="save">

<div class="kav-section">
<div class="kav-section-title">🔌 وضعیت سرویس</div>
<div class="kav-row">
    <div class="kav-lbl">حالت کارکرد</div>
    <div class="kav-ctrl">
        <select name="sunwaysms_reactiontype" class="kav-sel">
            <option value="1" <?php if(@$c['reactiontype']=='1') echo 'selected'; ?>>✅ فعال — همه داخلی‌ها</option>
            <option value="2" <?php if(@$c['reactiontype']=='2') echo 'selected'; ?>>🔒 فعال — فقط داخلی‌های مشخص شده</option>
            <option value="3" <?php if(@$c['reactiontype']=='3') echo 'selected'; ?>>❌ غیرفعال</option>
        </select>
    </div>
</div>
</div>

<div class="kav-section">
<div class="kav-section-title">🔑 اتصال به کاوه‌نگار</div>
<div class="kav-row">
    <div class="kav-lbl">کلید API</div>
    <div class="kav-ctrl">
        <input type="text" name="sunwaysms_apikey" class="kav-inp" value="<?php echo htmlspecialchars(@$c['apikey']); ?>" placeholder="کلید API از panel.kavenegar.com">
    </div>
</div>
<div class="kav-row">
    <div class="kav-lbl">شماره فرستنده</div>
    <div class="kav-ctrl">
        <input type="text" name="sunwaysms_sender" class="kav-inp" style="max-width:220px" value="<?php echo htmlspecialchars(@$c['sender']); ?>" placeholder="مثال: 9982002344">
        <div class="kav-hint">خالی بگذارید تا از شماره پیش‌فرض حساب استفاده شود</div>
    </div>
</div>
</div>

<div class="kav-section">
<div class="kav-section-title">✉️ پیام</div>
<div class="kav-row">
    <div class="kav-lbl">متن پیامک</div>
    <div class="kav-ctrl">
        <textarea name="sunwaysms_message" class="kav-inp" rows="4"><?php echo htmlspecialchars(@$c['message']); ?></textarea>
        <div class="kav-hint">
            متغیرها: &nbsp;
            <code>%DEST%</code> شماره تماس‌گیرنده &nbsp;|&nbsp;
            <code>%EXTENSION%</code> داخلی &nbsp;|&nbsp;
            <code>%DATE%</code> تاریخ &nbsp;|&nbsp;
            <code>%TIME%</code> ساعت
        </div>
    </div>
</div>
<div class="kav-row">
    <div class="kav-lbl">زمان ارسال</div>
    <div class="kav-ctrl">
        <select name="sunwaysms_sendwhen" class="kav-sel">
            <option value="answer" <?php if(@$c['sendwhen']=='answer') echo 'selected'; ?>>📲 قبل از پاسخ — هنگام زنگ خوردن</option>
            <option value="hangup" <?php if(@$c['sendwhen']=='hangup')  echo 'selected'; ?>>📴 بعد از قطع تماس</option>
        </select>
    </div>
</div>
</div>

<div class="kav-section">
<div class="kav-section-title">🔁 فیلتر تکرار</div>
<div class="kav-row">
    <div class="kav-lbl">بازه فیلتر (روز)</div>
    <div class="kav-ctrl">
        <input type="number" name="sunwaysms_ignoreday" class="kav-inp" style="max-width:90px" value="<?php echo (int)@$c['ignoreday']; ?>" min="0">
        <div class="kav-hint">به هر شماره حداکثر یک‌بار در این بازه پیامک برود — ۰ یعنی بدون محدودیت</div>
    </div>
</div>
<div class="kav-row">
    <div class="kav-lbl">نوع فیلتر</div>
    <div class="kav-ctrl">
        <select name="sunwaysms_ignoretype" class="kav-sel">
            <option value="1" <?php if(@$c['ignoretype']=='1') echo 'selected'; ?>>بر اساس شماره تماس‌گیرنده</option>
            <option value="2" <?php if(@$c['ignoretype']=='2') echo 'selected'; ?>>بر اساس شماره + داخلی</option>
        </select>
    </div>
</div>
</div>

<div class="kav-section">
<div class="kav-section-title">🛠 سایر</div>
<div class="kav-row">
    <div class="kav-lbl">تماس از شماره شهری</div>
    <div class="kav-ctrl" style="padding-top:9px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="sunwaysms_citynumber" value="1" <?php if((int)@$c['citynumber']==1) echo 'checked'; ?>>
            فعال‌سازی برای خطوط شهری
        </label>
    </div>
</div>
<div class="kav-row">
    <div class="kav-lbl">لاگ دیباگ</div>
    <div class="kav-ctrl">
        <select name="sunwaysms_debug" class="kav-sel">
            <option value="0" <?php if(@$c['debug']!='1') echo 'selected'; ?>>غیرفعال</option>
            <option value="1" <?php if(@$c['debug']=='1') echo 'selected'; ?>>فعال — ذخیره در /var/log/asterisk/kavenegar_sms.log</option>
        </select>
    </div>
</div>
</div>

<button type="submit" class="kav-btn">💾 ذخیره تنظیمات</button>
</form>

<!-- راه‌اندازی AGI -->
<div class="test-box" style="margin-top:24px;border-color:#c8e6c9;background:linear-gradient(135deg,#f1f8e9,#e8f5e9)">
<div class="kav-section-title" style="margin-bottom:10px;color:#2e7d32">⏱ راه‌اندازی ارسال خودکار (Cron)</div>
<p style="font-size:12px;color:#555;margin-bottom:6px">پیامک از طریق یک cron job هر دقیقه ارسال می‌شود — نیازی به Apply Config نیست.</p>
<?php
exec('crontab -l 2>/dev/null', $cron_check_lines);
$cron_ok = false;
foreach ($cron_check_lines as $cl) {
    if (strpos($cl, 'kavenegar_cron') !== false) { $cron_ok = true; break; }
}
echo '<p style="font-size:12px;margin-bottom:14px">وضعیت: <strong style="color:' . ($cron_ok ? '#1e8449' : '#c0392b') . '">' . ($cron_ok ? '✅ فعال' : '❌ نصب نشده') . '</strong></p>';
?>
<form method="post" action="?display=kavenegar&tab=base">
<input type="hidden" name="display" value="<?php echo $dispnum; ?>">
<input type="hidden" name="action" value="setup_agi">
<button type="submit" class="kav-btn" style="background:linear-gradient(135deg,#43a047,#2e7d32)">⚙️ <?php echo $cron_ok ? 'نصب مجدد Cron' : 'راه‌اندازی Cron'; ?></button>
</form>
</div>

<!-- عیب‌یابی -->
<div class="test-box" style="margin-top:24px;border-color:#ffe0b2;background:linear-gradient(135deg,#fff8e1,#fff3e0)">
<div class="kav-section-title" style="margin-bottom:10px;color:#e65100">🔍 عیب‌یابی (همه چیز در مرورگر)</div>
<p style="font-size:12px;color:#555;margin-bottom:14px">این دکمه دیتابیس تماس‌ها، فایل‌ها، cron و خروجی واقعی را بررسی می‌کند — بدون نیاز به کنسول.</p>
<form method="post" action="?display=kavenegar&tab=base">
<input type="hidden" name="display" value="<?php echo $dispnum; ?>">
<input type="hidden" name="action" value="diagnose">
<button type="submit" class="kav-btn" style="background:linear-gradient(135deg,#fb8c00,#e65100)">🔍 اجرای عیب‌یابی</button>
</form>

<?php if ($diag): ?>
<div style="margin-top:18px;background:#1e1e2e;color:#d4d4d4;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;line-height:1.7;direction:ltr;text-align:left;overflow-x:auto">
<div><span style="color:#4ec9b0">CDR Database:</span> <?php echo htmlspecialchars($diag['cdr_db']); ?></div>
<div style="margin-top:8px"><span style="color:#4ec9b0">Files:</span></div>
<?php foreach ($diag['files'] as $fn => $ex): ?>
<div>&nbsp;&nbsp;<?php echo $ex ? '<span style="color:#6a9955">[OK]</span>' : '<span style="color:#f48771">[MISSING]</span>'; ?> <?php echo htmlspecialchars($fn); ?></div>
<?php endforeach; ?>
<div style="margin-top:8px"><span style="color:#4ec9b0">Crontab:</span></div>
<pre style="margin:0;white-space:pre-wrap;color:#ce9178"><?php echo htmlspecialchars($diag['crontab']); ?></pre>
<div style="margin-top:8px"><span style="color:#4ec9b0">Last 5 Calls (src → dst):</span></div>
<?php if (empty($diag['calls'])): ?>
<div>&nbsp;&nbsp;<span style="color:#f48771">هیچ تماسی در دیتابیس یافت نشد</span></div>
<?php else: foreach ($diag['calls'] as $call): ?>
<div>&nbsp;&nbsp;<?php echo htmlspecialchars($call['calldate']); ?> | <?php echo htmlspecialchars($call['src']); ?> → <?php echo htmlspecialchars($call['dst']); ?> | <?php echo htmlspecialchars(isset($call['disposition'])?$call['disposition']:''); ?></div>
<?php endforeach; endif; ?>
<div style="margin-top:8px"><span style="color:#4ec9b0">Cron Script Output (ret=<?php echo (int)$diag['cron_ret']; ?>):</span></div>
<pre style="margin:0;white-space:pre-wrap;color:#dcdcaa"><?php echo htmlspecialchars($diag['cron_output'] ? $diag['cron_output'] : '(no output)'); ?></pre>
<div style="margin-top:8px"><span style="color:#4ec9b0">Log (last 15 lines):</span></div>
<pre style="margin:0;white-space:pre-wrap;color:#9cdcfe"><?php echo htmlspecialchars($diag['log'] ? $diag['log'] : '(empty)'); ?></pre>
<div style="margin-top:8px;color:#f9d56e;border-top:1px solid #444;padding-top:8px"><span style="color:#4ec9b0">▶ sendsms.php مستقیم (مهم‌ترین):</span></div>
<pre style="margin:0;white-space:pre-wrap;color:#f48771"><?php echo htmlspecialchars($diag['sendsms_output']); ?></pre>
<div style="margin-top:8px"><span style="color:#4ec9b0">DB Log (latest 5):</span></div>
<?php if (empty($diag['db_log'])): ?>
<div>&nbsp;&nbsp;(empty)</div>
<?php else: foreach ($diag['db_log'] as $r): ?>
<div>&nbsp;&nbsp;<?php echo htmlspecialchars($r['send_at']); ?> | <?php echo htmlspecialchars($r['destination']); ?> | <span style="color:<?php echo $r['status']=='success'?'#6a9955':'#f48771'; ?>"><?php echo htmlspecialchars($r['status']); ?></span> | api_res=<?php echo htmlspecialchars($r['api_res']); ?></div>
<?php endforeach; endif; ?>
</div>
<?php endif; ?>
</div>

<!-- تست ارسال پیامک -->
<div class="test-box" style="margin-top:24px">
<div class="kav-section-title" style="margin-bottom:14px">🧪 تست ارسال پیامک</div>
<form method="post" action="?display=kavenegar&tab=base">
<input type="hidden" name="display" value="<?php echo $dispnum; ?>">
<input type="hidden" name="action" value="test_sms">
<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
    <div>
        <div style="font-size:12px;color:#666;margin-bottom:5px">شماره موبایل</div>
        <input type="text" name="test_phone" class="kav-inp" style="width:180px" placeholder="09xxxxxxxxx" required>
    </div>
    <div style="flex:1;min-width:200px">
        <div style="font-size:12px;color:#666;margin-bottom:5px">متن پیام آزمایشی</div>
        <input type="text" name="test_msg" class="kav-inp" value="پیامک آزمایشی از ایزابل PBX" placeholder="متن پیامک">
    </div>
    <button type="submit" class="kav-btn kav-btn-green">📤 ارسال آزمایشی</button>
</div>
</form>
</div>

</div>

<?php elseif ($tab == 'ext'): ?>
<div class="kav-box">
<div style="background:#f8f4ff;border:1px solid #ddd;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;color:#555">
    📌 مشخص کنید به کدام داخلی‌ها که زنگ خورد پیامک ارسال شود.
    این لیست وقتی حالت کارکرد روی <strong>"فقط داخلی‌های مشخص شده"</strong> باشد اعمال می‌شود.
</div>

<form method="post" action="?display=kavenegar&tab=ext" style="display:flex;gap:10px;margin-bottom:20px;align-items:flex-end">
<input type="hidden" name="display" value="<?php echo $dispnum; ?>">
<input type="hidden" name="action" value="save_ext">
<div>
    <div style="font-size:12px;color:#666;margin-bottom:5px">شماره داخلی</div>
    <input type="text" name="ext" class="kav-inp" style="width:160px" placeholder="مثال: 101" required>
</div>
<div style="padding-bottom:8px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
        <input type="checkbox" name="enable" value="1" checked> فعال
    </label>
</div>
<button type="submit" class="kav-btn" style="padding:8px 20px">➕ افزودن</button>
</form>

<?php
$exts = $db->getAll("SELECT * FROM sunwaysms ORDER BY id DESC", DB_FETCHMODE_ASSOC);
if ($exts && count($exts) > 0):
?>
<table class="kav-tbl">
<thead><tr><th>داخلی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
<tbody>
<?php foreach($exts as $row): ?>
<tr>
    <td><strong><?php echo htmlspecialchars($row['ext']); ?></strong></td>
    <td><?php echo $row['enable'] ? '<span class="badge badge-on">● فعال</span>' : '<span class="badge badge-off">● غیرفعال</span>'; ?></td>
    <td>
        <form method="post" action="?display=kavenegar&tab=ext" style="display:inline">
            <input type="hidden" name="action" value="del_ext">
            <input type="hidden" name="id" value="<?php echo (int)$row['id']; ?>">
            <button type="submit" class="kav-btn kav-btn-red kav-btn-sm" onclick="return confirm('این داخلی حذف شود؟')">حذف</button>
        </form>
    </td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
<?php else: ?>
<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>
    <p>هیچ داخلی‌ای ثبت نشده است</p>
</div>
<?php endif; ?>
</div>

<?php elseif ($tab == 'log'): ?>
<div class="kav-box">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div>
        <strong style="font-size:16px">لاگ ارسال پیامک</strong>
        <div style="font-size:12px;color:#999;margin-top:2px">آخرین ۱۰۰ ارسال</div>
    </div>
    <form method="post" action="?display=kavenegar&tab=log">
        <input type="hidden" name="action" value="clear_log">
        <button type="submit" class="kav-btn kav-btn-red kav-btn-sm" onclick="return confirm('همه لاگ‌ها پاک شوند؟')">🗑 پاک کردن</button>
    </form>
</div>

<?php
// لاگ فایل دیباگ از Asterisk
$logfile = '/var/log/asterisk/kavenegar_sms.log';
if (file_exists($logfile) && is_readable($logfile)) {
    $lines = array_slice(file($logfile), -20);
    if ($lines):
?>
<div style="margin-bottom:20px">
    <div style="font-size:13px;font-weight:600;color:#7b4fa6;margin-bottom:8px">📄 لاگ فایل Asterisk (آخرین ۲۰ خط)</div>
    <div style="background:#1a1a2e;color:#a8ff78;font-family:monospace;font-size:12px;padding:14px;border-radius:8px;max-height:200px;overflow-y:auto;direction:ltr;text-align:left">
<?php foreach(array_reverse($lines) as $line): ?>
<div><?php echo htmlspecialchars(trim($line)); ?></div>
<?php endforeach; ?>
    </div>
</div>
<?php endif; } ?>

<?php
$logs = $db->getAll("SELECT * FROM sunwaysms_log ORDER BY id DESC LIMIT 100", DB_FETCHMODE_ASSOC);
if ($logs && count($logs) > 0):
?>
<table class="kav-tbl">
<thead>
<tr>
    <th>داخلی</th>
    <th>شماره مقصد</th>
    <th>وضعیت</th>
    <th>جزئیات خطا</th>
    <th>تاریخ ارسال</th>
</tr>
</thead>
<tbody>
<?php foreach($logs as $row):
    $is_ok = $row['status'] == 'success';
    $api_res = @$row['api_res'];
    $err_msg = '';
    if (!$is_ok && $api_res) {
        $decoded = json_decode($api_res, true);
        if ($decoded && isset($decoded['return']['message'])) {
            $err_msg = $decoded['return']['message'];
        } else {
            $err_msg = substr($api_res, 0, 80);
        }
    }
?>
<tr>
    <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:12px"><?php echo htmlspecialchars($row['ext']); ?></code></td>
    <td><strong><?php echo htmlspecialchars($row['destination']); ?></strong></td>
    <td><?php echo $is_ok ? '<span class="badge badge-ok">✓ ارسال شد</span>' : '<span class="badge badge-fail">✗ خطا</span>'; ?></td>
    <td style="font-size:12px;color:<?php echo $is_ok ? '#27ae60' : '#c0392b'; ?>">
        <?php echo $err_msg ? htmlspecialchars($err_msg) : ($is_ok ? '—' : 'نامشخص'); ?>
    </td>
    <td style="font-size:12px;color:#888;white-space:nowrap"><?php echo $row['send_at']; ?></td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
<?php else: ?>
<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <p>هیچ لاگی وجود ندارد</p>
</div>
<?php endif; ?>
</div>
<?php endif; ?>
</div>
</body>
</html>

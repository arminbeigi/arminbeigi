#!/usr/bin/env php
<?php
include_once '/etc/issabelpbx.conf';
if (!function_exists('sunwaysms_get')) {
	include_once '/var/www/html/admin/modules/kavenegar/functions.inc.php';
}

$c = sunwaysms_get();
if (empty($c) || (int)$c['reactiontype'] === 3) {
	exit(0);
}

global $db;
$recent = time() - 180;

$sql = "SELECT src, dst, UNIX_TIMESTAMP(calldate) AS callts
        FROM asteriskcdrdb.cdr
        WHERE UNIX_TIMESTAMP(calldate) > {$recent}
          AND src != ''
        ORDER BY calldate DESC";

$rows = $db->getAll($sql, DB_FETCHMODE_ASSOC);
if (!$rows || !is_array($rows)) {
	exit(0);
}

foreach ($rows as $row) {
	$src    = preg_replace('/\D/', '', trim($row['src']));
	$dst    = trim($row['dst']);
	$callts = (int)$row['callts'];

	$mobile = substr($src, -10);
	if (strlen($mobile) != 10 || $mobile[0] != '9') {
		continue;
	}

	$check_time = $callts - 5;
	$check_sql  = "SELECT COUNT(*) AS cnt FROM sunwaysms_log
	               WHERE destination='{$mobile}' AND timestamp_at >= {$check_time}";
	$check = $db->getRow($check_sql, DB_FETCHMODE_ASSOC);
	if ($check && isset($check['cnt']) && (int)$check['cnt'] > 0) {
		continue;
	}

	sunwaysms_tolog("Cron: sending SMS src={$mobile} dst={$dst}", true);
	$cmd = "/var/lib/asterisk/bin/sendsms.php "
		. escapeshellarg($mobile) . " "
		. escapeshellarg($dst)
		. " 2>/dev/null";
	shell_exec($cmd);

	sleep(1);
}

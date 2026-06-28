<?php
// if (!defined('FREEPBX_IS_AUTH')) {die('No direct script access allowed');}
//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2015 Schmooze Com Inc.
//
//
global $db;

outn(_("Creating sunwaysms if needed.."));
$sql = "
CREATE TABLE IF NOT EXISTS `sunwaysms_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ext` char(60) COLLATE utf8mb4_persian_ci DEFAULT NULL,
  `destination` char(60) COLLATE utf8mb4_persian_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_persian_ci,
  `send_at` datetime DEFAULT NULL,
  `status` char(10) COLLATE utf8mb4_persian_ci NOT NULL,
  `api_gateway` char(20) COLLATE utf8mb4_persian_ci NOT NULL,
  `api_res` text COLLATE utf8mb4_persian_ci,
  `timestamp_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_persian_ci
";
$check = $db->query($sql);
if (DB::IsError($check)) {
	die_issabelpbx("Can not create customer mobile table");
} else {
	out(_("OK"));
}
outn(_("create sunwaysms table column .."));

$sql = "CREATE TABLE IF NOT EXISTS `sunwaysms_setting` (
  `skey` char(20) NOT NULL,
  `sval` text NULL
) CHARSET=utf8 COLLATE 'utf8_persian_ci'";
$check = $db->query($sql);
if (DB::IsError($check)) {
	die_issabelpbx("Can not create sunwaysms table");
} else {
	out(_("OK"));
}
outn(_("create sunwaysms_setting table column .."));

$sql = "CREATE TABLE IF NOT EXISTS `sunwaysms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ext` char(60) COLLATE utf8_persian_ci NOT NULL,
  `content` text COLLATE utf8_persian_ci,
  `enable` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE='InnoDB' COLLATE 'utf8_persian_ci'";
$check = $db->query($sql);
if (DB::IsError($check)) {
	die_issabelpbx("Can not create sunwaysms table");
} else {
	out(_("OK"));
}
outn(_("create sunwaysms_log table column .."));

$exsql = "SHOW COLUMNS FROM `sunwaysms_log` LIKE 'numlocal'";
$ex = $db->getRow($exsql, DB_FETCHMODE_ASSOC);
if ($ex && isset($ex['Field']) && $ex['Field'] == 'numlocal') {
	outn(_("The numlocal exists ignore add"));
} else {
	$sql = "ALTER TABLE `sunwaysms_log` ADD `numlocal` char(20) NULL";
	$check = $db->query($sql);
}

$src = '/var/www/html/admin/modules/kavenegar/smsdata.php';
$dest = '/var/www/html/smsdata.php';
if (file_exists($dest)) {
	unlink($dest);
}
copy($src, $dest);

outn(_("Copying AGI and bin scripts.."));
$files = array(
	array(
		'src'  => '/var/www/html/admin/modules/kavenegar/agi-bin/sunwaysms.agi',
		'dest' => '/var/lib/asterisk/agi-bin/sunwaysms.agi',
	),
	array(
		'src'  => '/var/www/html/admin/modules/kavenegar/bin/sendsms.php',
		'dest' => '/var/lib/asterisk/bin/sendsms.php',
	),
	array(
		'src'  => '/var/www/html/admin/modules/kavenegar/bin/sunwaysmstools.php',
		'dest' => '/var/lib/asterisk/bin/sunwaysmstools.php',
	),
);
foreach ($files as $f) {
	if (file_exists($f['dest'])) {
		unlink($f['dest']);
	}
	if (copy($f['src'], $f['dest'])) {
		chmod($f['dest'], 0755);
		out(_("OK: " . basename($f['dest'])));
	} else {
		out(_("FAILED: " . basename($f['dest'])));
	}
}

$issabelpbx_conf = &issabelpbx_conf::create();
if (!$issabelpbx_conf->conf_setting_exists('SUNWAYSMS_ENABLE')) {
	outn(_("Added Base configuarion sunwaysms/ENABLE .."));
	$set = array();
	$set['value'] = true;
	$set['defaultval'] = &$set['value'];
	$set['readonly'] = 0;
	$set['hidden'] = 0;
	$set['level'] = 0;
	$set['module'] = 'sunwaysms';
	$set['category'] = 'sunwaysms Module';
	$set['emptyok'] = 0;
	$set['sortorder'] = 30;
	$set['name'] = 'Enable or Disable customer mobile';
	$set['description'] = 'Force disable or enable the customer mobile';
	$set['type'] = CONF_TYPE_BOOL;
	$issabelpbx_conf->define_conf_setting('SUNWAYSMS_ENABLE', $set);
}

outn(_("Creating default sunwaysms.conf for Asterisk.."));
$confcontent = "[sunwaysms]\nreactiontype=1\nretrycount=3\ncitynumber=0\ncitynumbersaved=0\n";
file_put_contents('/etc/asterisk/sunwaysms.conf', $confcontent);
out(_("OK"));

outn(_("Configuring SELinux for outbound network access.."));
$selinux_cmds = array(
	'setsebool -P httpd_can_network_connect 1',
	'setsebool -P nis_enabled 1',
	'setenforce 0',
);
foreach ($selinux_cmds as $cmd) {
	exec($cmd . ' 2>&1', $output, $retval);
	if ($retval === 0) {
		out(_("OK: {$cmd}"));
	} else {
		out(_("SKIP: {$cmd}"));
	}
}

outn(_("Setting log file permissions.."));
$logfile = '/var/log/asterisk/kavenegar_sms.log';
if (!file_exists($logfile)) {
	touch($logfile);
}
chmod($logfile, 0666);
chown($logfile, 'asterisk');
out(_("OK"));

outn(_("Installing cron job for SMS sending.."));
$cron_src  = '/var/www/html/admin/modules/kavenegar/bin/kavenegar_cron.php';
$cron_dest = '/var/lib/asterisk/bin/kavenegar_cron.php';
if (file_exists($cron_dest)) {
	unlink($cron_dest);
}
if (copy($cron_src, $cron_dest)) {
	chmod($cron_dest, 0755);
	out(_("OK: kavenegar_cron.php"));
} else {
	out(_("FAILED: kavenegar_cron.php"));
}

exec('crontab -l 2>/dev/null', $cron_existing_lines);
$cron_existing = implode("\n", array_filter($cron_existing_lines));
if (strpos($cron_existing, 'kavenegar_cron') === false) {
	$cron_existing .= "\n* * * * * /var/lib/asterisk/bin/kavenegar_cron.php\n";
	$cron_tmp = tempnam('/tmp', 'kav_cron_');
	file_put_contents($cron_tmp, $cron_existing);
	exec("crontab " . escapeshellarg($cron_tmp));
	unlink($cron_tmp);
}
out(_("OK: cron job"));

outn(_("All Done."));
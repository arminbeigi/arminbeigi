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

$src = '/var/www/html/admin/modules/sunwaysms/smsdata.php';
$dest = '/var/www/html/smsdata.php';
if (file_exists($dest)) {
	unlink($dest);
}
copy($src, $dest);

outn(_("Copying AGI and bin scripts.."));
$files = array(
	array(
		'src'  => '/var/www/html/admin/modules/sunwaysms/agi-bin/sunwaysms.agi',
		'dest' => '/var/lib/asterisk/agi-bin/sunwaysms.agi',
	),
	array(
		'src'  => '/var/www/html/admin/modules/sunwaysms/bin/sendsms.php',
		'dest' => '/var/lib/asterisk/bin/sendsms.php',
	),
	array(
		'src'  => '/var/www/html/admin/modules/sunwaysms/bin/sunwaysmstools.php',
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

outn(_("All Done."));
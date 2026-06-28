#!/usr/bin/env php
<?php

include_once '/etc/issabelpbx.conf';
if (!function_exists('sunwaysms_tolog')) {
	include_once '/var/www/html/admin/modules/kavenegar/functions.inc.php';
}

$cmd = isset($argv[1]) ? $argv[1] : null;
$ret = null;

sunwaysms_tolog("cmd == {$cmd}");

switch ($cmd) {
case 'numlocal':
	$numlocal = isset($argv[2]) ? $argv[2] : null;
	$ret = sunwaysms_numlocal_last_send($numlocal);
	sunwaysms_tolog("Search numlocal:{$numlocal}, Ret:{$ret}");
	break;

default:
	// code...
	break;
}
sunwaysms_tolog("Final Return:{$ret}");
echo $ret;

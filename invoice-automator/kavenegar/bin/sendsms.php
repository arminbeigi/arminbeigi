#!/usr/bin/env php
<?php

include_once '/etc/issabelpbx.conf';
if (!function_exists('sunwaysms_get')) {
	include_once '/var/www/html/admin/modules/kavenegar/functions.inc.php';
}
if (!function_exists('sunway_jdate')) {
	include_once '/var/www/html/admin/modules/kavenegar/sunwayjdf.php';
}

function sunwaysms_ext_config($ext = null, $dest = null) {

	$c = sunwaysms_get();
	$last_send = sunwaysms_ext_last_send($ext, $dest, $c);
	if ($last_send == false) {
		sunwaysms_tolog("ignore send the det:{$dest} last sended by extension:{$ext} ");
		return false;
	}

	$spec = sunwaysms_ext_spec_content($ext);
	if ($c['reactiontype'] == 2) {
		if ($spec == null) {
			sunwaysms_tolog("The dest:{$dest} not send by:{$ext} content is not submit");
			return false;
		}
	}

	$date = sunway_jdate('Y/m/d');
	$datetime = sunway_jdate('Y/m/d,H:i');
	$time = sunway_jdate('H:i:s');


	if (strlen($spec) > 1) {

		$final = str_replace('%DEST%',$dest, $spec);
		$final = str_replace('%EXTENSION%',$ext, $final);
		$final = str_replace('%DATE%',$date, $final);
		$final = str_replace('%DATETIME%',$datetime, $final);
		$final = str_replace('%TIME%',$datetime, $final);

		sunwaysms_tolog("FinalMessage:{$final}");

		$c['message'] = $final;
	}
	return $c;
}

function sunwaysms_final_send($c, $dest) {
	$apikey = trim($c['apikey']);
	$sender = trim($c['sender']);
	$message = $c['message'];

	$url = "https://api.kavenegar.com/v1/{$apikey}/sms/send.json";

	$postdata = http_build_query(array_filter([
		'receptor' => $dest,
		'message'  => $message,
		'sender'   => $sender,
	]));

	$curl = curl_init();
	curl_setopt_array($curl, array(
		CURLOPT_URL            => $url,
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_TIMEOUT        => 15,
		CURLOPT_CONNECTTIMEOUT => 10,
		CURLOPT_CUSTOMREQUEST  => 'POST',
		CURLOPT_POSTFIELDS     => $postdata,
		CURLOPT_HTTPHEADER     => array('Accept: application/json'),
		CURLOPT_SSL_VERIFYPEER => false,
		CURLOPT_SSL_VERIFYHOST => false,
	));

	$response = curl_exec($curl);
	$curl_errno = curl_errno($curl);
	$curl_error = curl_error($curl);
	curl_close($curl);

	if (!$response) {
		sunwaysms_tolog("Kavenegar: no response. errno={$curl_errno} error={$curl_error}", true);
		return false;
	}

	$res = json_decode($response, true);
	sunwaysms_tolog("Kavenegar response: {$response}");

	if ($res && isset($res['return']['status']) && $res['return']['status'] == 200) {
		$messageid = isset($res['entries'][0]['messageid']) ? $res['entries'][0]['messageid'] : 9999;
		sunwaysms_tolog("Kavenegar sent OK. messageid={$messageid}", true);
		return $messageid;
	}

	sunwaysms_tolog("Kavenegar failed: {$response}", true);
	return false;
}

$dest = isset($argv[1]) ? trim($argv[1]) : null;
$ext = isset($argv[2]) ? trim($argv[2]) : null;
$numlocal = isset($argv[3]) ? trim($argv[3]) : null;

if (!$dest) {
	sunwaysms_tolog("failed dest number is null!");
	exit(1);
}

$c = sunwaysms_ext_config($ext, $dest);
if (!$c) {
	sunwaysms_tolog("is not load the config, ignore or spec extesion is not found");
	exit(1);
}

$retry = 4;
$res = null;
while ($retry > 0) {
	$res = sunwaysms_final_send($c, $dest);
	if ($res) {
		break;
	}
	$retry -= 1;
}

sunwaysms_submit_send_sms($ext, $c, $dest, $res,$numlocal);

<?php
if (php_sapi_name() != 'cli' && !defined('ISSABELPBX_IS_AUTH') && !defined('FREEPBX_IS_AUTH')) {die('No direct script access allowed');}

function sunwaysms_url_tabs($name, $value) {
	$params = $_GET;

	if (isset($params[$name])) {
		unset($params[$name]);
	}
	$params[$name] = $value;
	return basename($_SERVER['PHP_SELF']) . '?' . http_build_query($params);
}

function sunwaysms_save() {

	global $db;
	$data = array(
		'message' => isset($_POST['sunwaysms_message']) ? $_POST['sunwaysms_message'] : null,
		'apikey' => isset($_POST['sunwaysms_apikey']) ? $_POST['sunwaysms_apikey'] : null,
		'sender' => isset($_POST['sunwaysms_sender']) ? $_POST['sunwaysms_sender'] : null,
		'retrycount' => isset($_POST['sunwaysms_retrycount']) ? $_POST['sunwaysms_retrycount'] : null,
		'reactiontype' => isset($_POST['sunwaysms_reactiontype']) ? $_POST['sunwaysms_reactiontype'] : null,
		'ignoreday' => isset($_POST['sunwaysms_ignoreday']) ? $_POST['sunwaysms_ignoreday'] : null,
		'ignoretype' => isset($_POST['sunwaysms_ignoretype']) ? $_POST['sunwaysms_ignoretype'] : null,
		'sendwhen' => isset($_POST['sunwaysms_sendwhen']) ? $_POST['sunwaysms_sendwhen'] : null,
		'citynumber' => isset($_POST['sunwaysms_citynumber']) ? $_POST['sunwaysms_citynumber'] : null,
		'citynumbersaved' => isset($_POST['sunwaysms_citynumbersaved']) ? $_POST['sunwaysms_citynumbersaved'] : null,
		'debug' => isset($_POST['sunwaysms_debug']) ? $_POST['sunwaysms_debug'] : null,
	);

	foreach ($data as $key => $value) {
		$ex = "SELECT COUNT(*) AS ccount FROM sunwaysms_setting WHERE `skey`='{$key}'";
		$row = $db->getRow($ex, DB_FETCHMODE_ASSOC);
		if ($row['ccount'] == 0) {
			$sql = "INSERT INTO sunwaysms_setting(`skey`,`sval`)VALUES('{$key}','{$value}')";
			$db->query($sql);
		} else {
			$sql = "UPDATE sunwaysms_setting SET `sval`='{$value}' WHERE `skey`='{$key}'";
			$db->query($sql);
		}
	}

	return true;

}

function sunwaysms_get($key = null) {
	global $db;
	$sql = "SELECT * FROM sunwaysms_setting";
	$all = $db->getAll($sql, DB_FETCHMODE_ASSOC);
	$ret = array();
	foreach ($all as $k => $v) {
		$ret[$v['skey']] = $v['sval'];
	}

	if ($key != null && strlen($key) > 1) {
		return isset($ret[$key]) ? $ret[$key] : null;
	}

	return $ret;
}

function sunwaysms_get_config($engine) {
	global $ext;

	$c = sunwaysms_get();

	$conf = "[sunwaysms]\n";
	$conf .= "reactiontype={$c['reactiontype']}\n";
	$conf .= "retrycount={$c['retrycount']}\n";
	$conf .= "citynumber={$c['citynumber']}\n";
	$conf .= "citynumbersaved={$c['citynumbersaved']}\n";
	file_put_contents('/etc/asterisk/sunwaysms.conf', $conf);

	if ($c['reactiontype'] == 3) {
		return;
	}

	switch ($engine) {
	case 'asterisk':
		$ext->add('from-trunk', '_.', '', new ext_setvar('CALLFROMTRUNK', 'yes'));
		// $ext->add('from-trunk', '_.', '', new ext_agi("sunwaysms.agi"));

		if ($c['sendwhen'] == 'answer') {
			$ext->add('macro-dial-one', 's', '', new ext_agi("sunwaysms.agi," . '${ARG3}'));
		} else {
			$ext->add('from-trunk', 'h', '', new ext_agi("sunwaysms.agi"));
			$ext->add('macro-hangupcall', 's', '', new ext_agi("sunwaysms.agi"));
			// $ext->add('from-internal', 'h', '', new ext_agi("sunwaysms.agi"));
		}

		break;
	}
}

function sunwaysms_tolog($msg, $force = false) {

	if (!$force) {
		$debug = (int) sunwaysms_get('debug');
		if ($debug != 1) {
			return;
		}
	}

	$log  = '/var/log/asterisk/kavenegar_sms.log';
	$line = date('Y-m-d H:i:s') . " {$msg}\n";
	if (@file_put_contents($log, $line, FILE_APPEND) === false) {
		@file_put_contents('/tmp/kavenegar_sms.log', $line, FILE_APPEND);
	}
}

function sunwaysms_ext_spec_content($ext) {
	global $db;
	$sql = "SELECT `content` FROM `sunwaysms` WHERE `ext`='{$ext}' AND `enable`=1 LIMIT 1";
	sunwaysms_tolog($sql);
	$row = $db->getRow($sql, DB_FETCHMODE_ASSOC);
	if (!$row || !isset($row['content'])) {
		sunwaysms_tolog("The extension:{$ext} is not spec content");
		return null;
	}

	return $row['content'];
}

function sunwaysms_submit_send_sms($ext, $c, $dest, $res, $numlocal = null) {
	global $db;
	$t = date('Y-m-d H:i:s');
	$timestamp_at = time();
	$status = 'failed';
	if ($res > 1000) {
		$status = 'success';
	}

	$message = str_replace("\n", " ", $c['message']);
	$message = strip_tags($message);

	$sql = "INSERT INTO `sunwaysms_log`(`ext`,`numlocal`,`destination`,`content`,`send_at`,`status`,`api_gateway`,`api_res`,`timestamp_at`)VALUES";
	$sql .= "('{$ext}','{$numlocal}','{$dest}','{$message}','{$t}','{$status}','kavenegar','{$res}',{$timestamp_at})";
	$db->query($sql);
	sunwaysms_tolog($sql);
}

function sunwaysms_ext_last_send($ext, $dest, $c) {
	global $db;
	if (empty($c['ignoreday']) || $c['ignoreday'] == 0) {
		sunwaysms_tolog("the ignoreday is not submit");
		return true;
	}

	$time = time();
	$ign = strtotime("-{$c['ignoreday']} day", $time);
	$ignday = date('Y-m-d,H:i:s', $ign);
	$dtime = date('Y-m-d,H:i:s', $time);
	$diff = $time - $ign;
	$condations = array();
	array_push($condations, " `destination`='{$dest}' ");
	array_push($condations, " `timestamp_at`>{$ign} ");
	if ($c['ignoretype'] == 2) {
		array_push($condations, " `ext`='{$ext}' ");
		sunwaysms_tolog("The condation type extension+destination, checked by extensions:{$ext}");
	}
	$where = implode(' AND ', $condations);

	$sql = "SELECT COUNT(id) AS ccount FROM sunwaysms_log WHERE {$where}";
	sunwaysms_tolog("ignoreDays:{$ignday}, Current:{$dtime}, DiffDaysSecends:{$diff}, {$sql} ");
	$row = $db->getRow($sql, DB_FETCHMODE_ASSOC);
	if (!$row || !isset($row['ccount'])) {
		sunwaysms_tolog("Cannot Detect the data from query:{$sql}, or failed query, send sms!");
		return true;
	}
	return $row['ccount'] == 0;
}

function sunwaysms_numlocal_last_send($numlocal) {
	global $db;
	$c = sunwaysms_get();

	$sql = "SELECT destination AS dest FROM sunwaysms_log WHERE numlocal='{$numlocal}' LIMIT 1";
	$row = $db->getRow($sql, DB_FETCHMODE_ASSOC);
	if ($row && isset($row['dest'])) {
		sunwaysms_tolog("Find last call from '{$numlocal}' mobile number is:{$row['dest']}");
		return $row['dest'];
	}

	return null;
}

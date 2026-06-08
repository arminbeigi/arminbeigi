<?php

include '/etc/issabelpbx.conf';
global $db;

function extract_filter($reqs = array()) {
	$where = '';

	$search = isset($_GET['_search']) & ($_GET['_search'] == 'true') ? true : false;
	if ($search) {

		$req_arr = array();
		foreach ($reqs as $req) {
			if (isset($_GET[$req])) {
				$data = $_GET[$req];
				array_push($req_arr, " {$req} LIKE '%{$data}%' ");
			}
		}

		if (count($req_arr) > 0) {
			$ret = " WHERE " . implode(' OR ', $req_arr);
			return $ret;
		}

		$searchField = $_GET['searchField'];
		$searchString = $_GET['searchString'];

		if (strlen($searchField) > 0) {

			$where = " WHERE `{$searchField}` LIKE '%{$searchString}%' ";
		}
		return $where;
	}

	return $where;
}

$page = isset($_GET['page']) ? $_GET['page'] : 0;
$limit = isset($_GET['rows']) ? $_GET['rows'] : 10;
$sidx = isset($_GET['sidx']) ? $_GET['sidx'] : 'id';
$sord = isset($_GET['sord']) ? $_GET['sord'] : 'desc';
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'load';
$tab = isset($_GET['tab']) ? $_GET['tab'] : 'ext';
if (!$sidx) {
	$sidx = 1;
}

if ($tab == 'ext') {

	if ($mode == 'edit') {

		$oper = isset($_POST['oper']) ? $_POST['oper'] : null;
		$ext = isset($_POST['ext']) ? $_POST['ext'] : null;
		$content = isset($_POST['content']) ? $_POST['content'] : null;
		$enable = isset($_POST['enable']) ? ($_POST['enable'] == 'on' ? 1 : 0) : 0;
		$id = isset($_POST['id']) ? $_POST['id'] : null;

		switch ($oper) {
		case 'add':

			$sql = "SELECT * FROM sunwaysms WHERE `ext`='{$ext}'";
			$row = $db->getRow($sql, DB_FETCHMODE_ASSOC);
			if (isset($row['id'])) {
				$sql = "UPDATE sunwaysms SET `content`='{$content}',`enable`={$enable} WHERE id={$row['id']}";
			} else {
				$sql = "INSERT INTO sunwaysms(`ext`,`content`,`enable`)VALUES('{$ext}','{$content}',{$enable})";
			}
			$db->query($sql);

			break;

		case 'edit':
			$sql = "UPDATE sunwaysms SET `content`='{$content}',`enable`={$enable} WHERE id={$id}";
			$db->query($sql);
			break;

		case 'del':
			$sql = "DELETE FROM sunwaysms WHERE id={$id}";
			$db->query($sql);
			break;
		}

	} else {

		$row = $db->getRow("SELECT COUNT(*) AS count FROM sunwaysms", DB_FETCHMODE_ASSOC);
		$count = $row['count'];
		if ($count > 0) {
			$total_pages = ceil($count / $limit);
		} else {
			$total_pages = 0;
		}
		if ($page > $total_pages) {
			$page = $total_pages;
		}
		$start = $limit * $page - $limit; // do not put $limit*($page - 1)
		if ($start < 0) {
			$start = 0;
		}
		$where = extract_filter(array('ext', 'enable', 'content', 'id'));
		$sql = "SELECT * FROM sunwaysms {$where} ORDER BY $sidx $sord LIMIT $start , $limit";
		$result = $db->getAll($sql, DB_FETCHMODE_ASSOC);
		$responce->page = $page;
		$responce->total = $total_pages;
		$responce->records = $count;
		$i = 0;
		foreach ($result as $key => $row) {
			$responce->rows[$i]['id'] = $row['id'];
			$responce->rows[$i]['cell'] = array($row['id'], $row['ext'], $row['content'], $row['enable']);
			$i++;
		}
		echo json_encode($responce, JSON_UNESCAPED_UNICODE);
	}
} else if ($tab == 'trace') {

	if ($mode == 'edit') {

		$oper = isset($_POST['oper']) ? $_POST['oper'] : null;
		$id = isset($_POST['id']) ? $_POST['id'] : null;

		switch ($oper) {

		case 'del':
			$sql = "DELETE FROM sunwaysms_log WHERE id={$id}";
			$db->query($sql);
			break;
		}
	} else {

		$row = $db->getRow("SELECT COUNT(*) AS count FROM sunwaysms_log");
		$count = $row['count'];
		if ($count > 0) {
			$total_pages = ceil($count / $limit);
		} else {
			$total_pages = 0;
		}
		if ($page > $total_pages) {
			$page = $total_pages;
		}
		$start = $limit * $page - $limit; // do not put $limit*($page - 1)
		if ($start < 0) {
			$start = 0;
		}
		$where = extract_filter(array('id', 'ext', 'dest', 'content', 'send_at', 'status', 'api_gateway', 'api_res'));
		$sql = "SELECT * FROM sunwaysms_log {$where} ORDER BY $sidx $sord LIMIT $start , $limit";
		$result = $db->getAll($sql, DB_FETCHMODE_ASSOC);
		$responce->page = $page;
		$responce->total = $total_pages;
		$responce->records = $count;
		$i = 0;
		foreach ($result as $key => $row) {
			$responce->rows[$i]['id'] = $row['id'];
			$responce->rows[$i]['cell'] = array(
				$row['id'],
				$row['ext'],
				$row['destination'],
				$row['content'],
				$row['send_at'],
				$row['status'],
				$row['api_gateway'],
				$row['api_res'],
			);
			$i++;
		}
		echo json_encode($responce, JSON_UNESCAPED_UNICODE);
	}
}
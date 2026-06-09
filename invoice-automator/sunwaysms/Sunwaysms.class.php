<?php
namespace FreePBX\modules;
/*
 * Class stub for BMO Module class
 * In _Construct you may remove the database line if you don't use it
 * In getActionbar change extdisplay to align with whatever variable you use to decide if the page is in edit mode.
 * usage document:
 * https://wiki.freepbx.org/display/FOP/FreePBX+Internals
 * https://wiki.freepbx.org/display/FOP/BMO+Hooks
 * https://wiki.freepbx.org/display/FOP/BMO+Logging
 */

class Sunwaysms implements \BMO {

	// private $logger;

	public function __construct($freepbx = null) {

		if ($freepbx == null) {
			throw new Exception("Not given a FreePBX Object");
		}
		$this->FreePBX = $freepbx;
		$this->db = $freepbx->Database;

		// $this->logger = \FreePBX::Logger()->createLogDriver('lastcall', '/var/log/asterisk/lastcall.log', 'INFO');

	}

	public function getsunwaysms() {
		$sql = "SELECT * FROM sunwaysms";
		$sth = $this->db->prepare($sql);
		$sth->execute();
		$ret = $sth->fetchAll(\PDO::FETCH_ASSOC);

		// foreach ($ret as $k => $v) {
		// 	$sql = "SELECT * FROM lastcall_log WHERE lastcall_id=:id ORDER BY id DESC LIMIT 10000";
		// 	$sth = $this->db->prepare($sql);
		// 	$sth->execute(array(":id" => $v['id']));
		// 	$res_log = $sth->fetchAll(\PDO::FETCH_ASSOC);
		// 	$ret[$k]['moreinfo'] = $res_log;
		// }

		return $ret;

	}

	public function getLastcallByID($id) {
		$sql = "SELECT * FROM lastcall WHERE id = ?";
		$sth = $this->db->prepare($sql);
		$sth->execute(array($id));
		return $sth->fetch(\PDO::FETCH_ASSOC);

		$row = $db->getRow($sql, DB_FETCHMODE_ASSOC);
		if (DB::IsError($row)) {
			die_freepbx($row->getMessage() . "<br><br>Error selecting row from announcement");
		}
		// Added Associative query above but put positional indexes back to maintain backward compatibility
		//
		$i = 0;
		if (!empty($row) && is_array($row)) {
			foreach ($row as $item) {
				$row[$i] = $item;
				$i++;
			}
			return $row;
		} else {
			return array();
		}
	}
	public function getALLLastcall($id) {
		$sql = "SELECT * FROM lastcall";
		if ($id) {
			$sql .= ' where id != :id ';
		}
		$sth = $this->db->prepare($sql);
		$sth->execute(array(":id" => $id));
		$res = $sth->fetchAll(\PDO::FETCH_COLUMN, 0);
		$ret = is_array($res) ? $res : array();

		return $ret;

	}

	//Install method. use this or install.php using both may cause weird behavior
	public function install() {}
	//Uninstall method. use this or install.php using both may cause weird behavior
	public function uninstall() {}
	//Not yet implemented
	public function backup() {}
	//not yet implimented
	public function restore($backup) {}
	//process form
	public function doConfigPageInit($page) {

		$conf = $this->FreePBX->Config;
		$ramp_conf = $conf->get_conf_settings();
		foreach ($ramp_conf as $key => $value) {
			$amp_conf[$key] = $value['value'];
		}
		$request = $_REQUEST;
		$action = isset($request['action']) ? $request['action'] : null;
		$extdisplay = isset($request['extdisplay']) ? $request['extdisplay'] : null;
		$sunwaysms_enable = isset($request['sunwaysms_enable']) ? $request['sunwaysms_enable'] : null;
		$actionsunwaysms = isset($request['actionsunwaysms']) ? $request['actionsunwaysms'] : null;

		if ($sunwaysms_enable == null && $actionsunwaysms == null) {
			return;
		}

		if ($page == "extensions" || $page == "users") {

			//While adding extension extdisplay field is coming as empty so
			// we have to take extension from the extension field.
			if (($request['action'] == 'add') && (empty($request['extdisplay']))) {
				$ext = $request['extension'];
			} else {
				$ext = $request['extdisplay'];
			}
			$this->setOverride($ext, $sunwaysms_enable);

		}

		$callerid = isset($_REQUEST['callerid']) ? $_REQUEST['callerid'] : null;
		$id = isset($_REQUEST['extdisplay']) ? $_REQUEST['extdisplay'] : null;
		$destcallerid = isset($_REQUEST['destcallerid']) ? $_REQUEST['destcallerid'] : null;
		$status = isset($_REQUEST['status']) ? $_REQUEST['status'] : 0;
		$description = isset($_REQUEST['description']) ? $_REQUEST['description'] : "";
		$created_date = isset($_REQUEST['created_date']) ? $_REQUEST['created_date'] : date('Y-m-d');
		$created_time = isset($_REQUEST['created_time']) ? $_REQUEST['created_time'] : date('H:i:s');

		$t = strtotime("{$created_date} {$created_time}");
		$date = date('Y-m-d H:i:s', $t);

		switch ($actionlastcall) {
		case 'add':
			if ($callerid && $destcallerid) {
				$sql = "INSERT INTO lastcall(callerid,destcallerid,status,description,created_at,created_date)";
				$sql .= "VALUES('{$callerid}','{$destcallerid}','{$status}','{$description}','{$t}','{$date}')";
				$this->db->query($sql);
				$this->db->lastInsertId();
			}
			break;

		case 'edit':
			$sql = "UPDATE lastcall SET callerid='{$callerid}',destcallerid='{$destcallerid}'";
			$sql .= ",status='{$status}',created_date='{$date}',created_at='{$t}'";
			$sql .= ",description='{$description}' WHERE id={$id}";

			$this->db->query($sql);

			break;
		case 'delete':
			$sql = "DELETE FROM lastcall WHERE id={$id}";
			$this->db->query($sql);
			break;
		}

		if ($actionlastcall != null) {
			header('Location: ' . "/admin/config.php?display=lastcall");
		}

	}

	private function setOverride($ext = false, $override = 0) {
		if ($ext === false) {
			throw new \Exception("No Extension given");
		}

		global $db;
		$sql = "UPDATE `cxpanel_users` SET `last_back` = '{$override}' WHERE user_id='{$ext}'";
		$db->query($sql);

	}

	public function getOverride($ext = false) {
		if ($ext === false) {
			return;
		}

		$sql = "SELECT last_back FROM cxpanel_users WHERE user_id='{$ext}' LIMIT 1";
		global $db;
		$sth = $db->prepare($sql);
		$sth->execute();
		$ex = $sth->fetch(\PDO::FETCH_ASSOC);

		if ($ex && isset($ex['last_back'])) {
			return $ex['last_back'];
		}

		return 0;

	}

	// User and Extensions page, which are part of core.
	public static function myGuiHooks() {
		return array("core");
	}

	// Which also means we need to catch POST's from those pages.
	public static function myConfigPageInits() {
		return array("extensions", "users");
	}

	public function addOverridesToPage(&$cc) {

		//Create the add GUI element
		$yesNoValueArray = array(array("text" => "yes", "value" => "1"), array("text" => "no", "value" => "0"));

		$enable = $this->getOverride($_REQUEST['extdisplay']);

		$cc->addguielem('Last Call', new lastcall_radio("lastcall_enable", $yesNoValueArray, $enable, _("Last Call"), _("If Enable the last call on the current call submit and returned from other side number.")), 5, null, "other", "advanced");

	}

	// Called when generating the page
	public function doGuiHook(&$cc) {

		if ($_REQUEST['display'] == "extensions" || $_REQUEST['display'] == "users") {
			if (isset($_REQUEST['tech_hardware']) || $_REQUEST['extdisplay']) {
				error_log('loaded the gui');
				$this->addOverridesToPage($cc);
			}
		}
		return;
	}

	//This shows the submit buttons
	public function getActionBar($request) {
		$buttons = array();
		switch ($_GET['display']) {
		case 'lastcall':
			$buttons = array(
				'delete' => array(
					'name' => 'delete',
					'id' => 'delete',
					'value' => _('Delete'),
				),
				'reset' => array(
					'name' => 'reset',
					'id' => 'reset',
					'value' => _('Reset'),
				),
				'submit' => array(
					'name' => 'submit',
					'id' => 'submit',
					'value' => _('Submit'),
				),

			);
			if (empty($_GET['extdisplay'])) {
				unset($buttons['delete']);
			}

			if (isset($_GET['view']) && $_GET['view'] == 'form') {

				$buttons['back'] = array(
					'name' => 'back',
					'id' => 'back',
					'value' => _('Back'),
				);
			}
			break;
		}
		return $buttons;
	}
	public function showPage() {
		$vars = array('helloworld' => _("Hello World"));
		return load_view(__DIR__ . '/views/main.php', $vars);
	}
	public function ajaxRequest($req, &$setting) {
		switch ($req) {
		case 'getJSON':
			return true;
			break;
		default:
			return false;
			break;
		}
	}
	/**
	 * Handle AJAX
	 */
	public function ajaxHandler() {
		$request = $_REQUEST;
		switch ($request['command']) {
		case "getData":
			break;
		case "getJSON":
			return $this->getLastcalls();
		default:
			break;
		}
	}

	public function getRightNav($request) {
		if (isset($_GET['view']) && $_GET['view'] == 'form') {
			return load_view(__DIR__ . "/views/rnav.php", array());
		}
	}

	public static function myDialplanHooks() {return true;}

	public function doDialplanHook(&$ext, $engine, $priority) {
		$ext->addGlobal('LASTCALL_LIVE', \FreePBX::Config()->get("LASTCALL_LIVE"));
		$ext->addGlobal('LASTCALL_ENABLE', \FreePBX::Config()->get("LASTCALL_ENABLE"));
	}

}

/**
 *
 * Radio button component that supports onclick and does not include the element name in the value
 * @author michaely
 *
 */
class lastcall_radio extends \guiinput {
	function __construct($elemname, $valarray, $currentvalue = '', $prompttext = '', $helptext = '', $disable = false) {
		if (!is_array($valarray)) {
			trigger_error('$valarray must be a valid array in gui_radio');
			return;
		}

		$parent_class = get_parent_class($this);
		if (is_callable('parent::$parent_class')) {
			parent::$parent_class($elemname, $currentvalue, $prompttext, $helptext);
		} else {
			parent::__construct($elemname, $currentvalue, $prompttext, $helptext);
		}

		$this->html_input = $this->buildradiobuttons($valarray, $currentvalue, $disable);
	}

	function buildradiobuttons($valarray, $currentvalue, $disable = false) {
		$output = '';
		$output .= '<span class="radioset">';

		$count = 0;
		foreach ($valarray as $item) {
			$itemvalue = (isset($item['value']) ? $item['value'] : '');
			$itemtext = (isset($item['text']) ? $item['text'] : '');
			$itemchecked = ((string) $currentvalue == (string) $itemvalue) ? ' checked=checked' : '';
			$onClick = ((isset($item['onclick']) && $item['onclick'] != "") ? " onclick=\"" . $item['onclick'] . "\"" : "");

			$tabindex = \guielement::gettabindex();
			$disable_state = $disable ? 'disabled="true"' : '';
			$output .= "<input type=\"radio\" name=\"$this->_elemname\" id=\"$this->_elemname $count\" $disable_state tabindex=\"$tabindex\" value=\"$itemvalue\"$onClick $itemchecked/><label for=\"$this->_elemname $count\">$itemtext</label>\n";
			$count++;
		}
		$output .= '</span>';
		return $output;
	}

}

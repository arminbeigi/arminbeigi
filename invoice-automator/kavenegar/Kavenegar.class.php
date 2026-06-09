<?php
namespace FreePBX\modules;

class Kavenegar implements \BMO {

	public function __construct($freepbx = null) {
		if ($freepbx == null) {
			throw new \Exception("Not given a FreePBX Object");
		}
		$this->FreePBX = $freepbx;
		$this->db = $freepbx->Database;
	}

	public function install() {}
	public function uninstall() {}
	public function backup() {}
	public function restore($backup) {}
	public function doConfigPageInit($page) {}
	public function getActionBar($request) { return array(); }

	public static function myDialplanHooks() { return true; }

	public function doDialplanHook(&$ext, $engine, $priority) {
		global $db;
		$GLOBALS['ext'] = &$ext;
		include_once dirname(__FILE__) . '/functions.inc.php';
		sunwaysms_get_config($engine);
	}

}

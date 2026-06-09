<?php
//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2015 Sangoma Technologies.
//
extract($request);
$action = "add";
if ($extdisplay) {
	// load
	$row = \FreePBX::Lastcall()->getLastcallByID($extdisplay);
	$action = "edit";
	$callerid = $row['callerid'];
	$destcallerid = $row['destcallerid'];
	$id = $row['id'];
	$status = $row['status'];
	$description = $row['description'];
	$created_date = date('Y-m-d',$row['created_at']);
	$created_time = date('H:i:s',$row['created_at']);
	
} else {
	$callerid = "";
	$destcallerid = "";
	$id = "";
	$status = 0;
	$description =  "";
	$created_date =  date('Y-m-d');
	$created_time =  date('H:i:s');

	
}

?>

<form class="fpbx-submit" name="editLastcall" action="?display=lastcall" method="post" onsubmit="return checkLastcall(editLastcall);" data-fpbx-delete="config.php?display=lastcall&amp;extdisplay=<?php echo $extdisplay ?>&amp;action=delete">
<input type="hidden" name="extdisplay" value="<?php echo $extdisplay; ?>">
<input type="hidden" name="id" value="<?php echo $extdisplay; ?>">
<input type="hidden" name="actionlastcall" value="<?php echo $action; ?>">
<input type="hidden" name="display" value="lastcall">
<input type="hidden" name="view" value="form">
<!--callerid-->
<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="callerid"><?php echo _("callerid") ?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="callerid"></i>
					</div>
					<div class="col-md-9">
						<input type="text" class="form-control" id="callerid" name="callerid" value="<?php  echo $callerid; ?>">
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="description-help" class="help-block fpbx-help-block"><?php echo _("Source Call")?></span>
		</div>
	</div>
</div>
<!--END callerid-->


<!--destcallerid-->
<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="destcallerid"><?php echo _("destcallerid") ?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="destcallerid"></i>
					</div>
					<div class="col-md-9">
						<input type="text" class="form-control" id="destcallerid" name="destcallerid" value="<?php  echo $destcallerid; ?>">
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="description-help" class="help-block fpbx-help-block"><?php echo _("Source Call")?></span>
		</div>
	</div>
</div>
<!--END destcallerid-->



<!--Status-->
<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="status"><?php echo _("Status") ?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="status"></i>
					</div>
					<div class="col-md-9 radioset">
						<input type="radio" name="status" id="status_enable" value="1" <?php echo ($status?"CHECKED":"") ?>>
						<label for="status_enable"><?php echo _("Yes");?></label>
						<input type="radio" name="status" id="status_disable" <?php echo ($status?"":"CHECKED") ?> value="">
						<label for="status_disable"><?php echo _("No");?></label>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="status-help" class="help-block fpbx-help-block"><?php echo _("On the enable, usage and disable ignore call redirect.")?></span>
		</div>
	</div>
</div>
<!--END Allow Skip-->


<!--description-->
<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="description"><?php echo _("description") ?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="description"></i>
					</div>
					<div class="col-md-9">
						<input type="text" class="form-control" id="description" name="description" value="<?php  echo $description; ?>">
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="description-help" class="help-block fpbx-help-block"><?php echo _("Description of the lastcall")?></span>
		</div>
	</div>
</div>
<!--END description-->


<!--created_date-->
<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="created_date"><?php echo _("Created Date") ?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="created_date"></i>
					</div>
					<div class="col-md-9">

						<input type="date"  class="form-control" id="created_date" name="created_date" value="<?php echo $created_date; ?>" placeholder="<?php echo _('Created Date')?>" >

						<input type="time"  class="form-control" id="created_time" name="created_time" value="<?php echo $created_time; ?>" placeholder="<?php echo _('Created Time')?>">

					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="created_date-help" class="help-block fpbx-help-block"><?php echo _("Date of the add to database, the live time after the added.")?></span>
		</div>
	</div>
</div>
<!--END created_date-->




</form>
<script>
var lastcalls = <?php print json_encode(\FreePBX::Lastcall()->getALLLastcall($extdisplay)); ?>;
</script>

<?php
//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2015 Sangoma Technologies.
//
//
?>
<script>
	var destinations = <?php echo json_encode(FreePBX::Modules()->getDestinations())?>;
</script>

<div class="modal fade" id="lastcalllog" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
					<h4 class="modal-title" id="myModalLabel"><?php echo _("Call Log on Last Call")?></h4>
				</div>
				<div class="modal-body">
					<table id="lastcalllog-detail-grid"
					data-show-columns="true"
					data-show-toggle="true"
					data-toggle="table"
					data-pagination="true"
					data-search="true"
					data-sort-order="desc"
					data-sort-name="created_date"
					data-mobile-responsive="true"
					data-check-on-init="true"
					>
					<thead>
						<th data-field="orig_destination" data-sortable="true" ><?php echo _("Original Destination")?></th>
						<th data-field="redirect_to" data-sortable="true" ><?php echo _("Redirect To")?></th>
						<th data-field="description" data-sortable="true" ><?php echo _("Description")?></th>
						<th data-field="status" data-sortable="true" ><?php echo _("Status")?></th>
						<th data-field="created_date" data-sortable="true" ><?php echo _("Created Date")?></th>
					</thead>
				</table>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-default" data-dismiss="modal"><?php echo _("Close")?></button>
			</div>
		</div>
	</div>
</div>

<div id="toolbar-grid">
	<a href="config.php?display=lastcall&amp;view=form" class="btn btn-primary"><i class="fa fa-plus"></i> <?php echo _('Add')?></a>
</div>
<table data-toolbar="#toolbar-grid" data-escape="true" data-toggle="table" data-url="ajax.php?module=lastcall&amp;command=getJSON&amp;jdata=grid" data-maintain-selected="true" data-show-columns="true" data-show-toggle="true" data-toggle="table" data-pagination="true" data-search="true"  id="table-all" id="lastcall">
	<thead>
		<tr>
			<th data-sortable="true" data-field="callerid"><?php echo _("Callerid")?></th>
			<th data-sortable="true" data-field="destcallerid"><?php echo _("Destination")?></th>
			<th data-sortable="true" data-field="created_date"><?php echo _("Created On")?></th>
			<th data-sortable="true" data-field="status"><?php echo _("Status")?></th>
			<th data-field="moreinfo" data-formatter="format_moreinfo"><?php echo _("Call Logs")?></th>
			<th data-field="id" data-formatter="actionformatter"><?php echo _("Actions")?></th>

		</tr>
	</thead>
	<tbody>
	</tbody>
</table>

<p>
<h2>Help:</h2>
<b>Add To /etc/asterisk/extensions_custom.conf</b><br>
<code>
[macro-dialout-one-predial-hook]<br>
exten => s,1,Verbose(1,**LastCall**)<br>
exten => s,n,AGI(lastcall.agi,${LASTCALL_LIVE},${LASTCALL_ENABLE},${EXTTOCALL},${CALLERID(num)})<br>
</code>
</p>

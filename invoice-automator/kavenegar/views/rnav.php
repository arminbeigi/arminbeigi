<div id="toolbar-all">
	<a href="?display=lastcall" class="btn btn-default"><i class="fa fa-list"></i> <?php echo _("List LastCalls")?></a>
	<a href="?display=lastcall&amp;view=form" class="btn btn-default"><i class="fa fa-plus"></i> <?php echo _("Add LastCall")?></a>
</div>
 <table id="lastcall-side" data-escape="true" data-url="ajax.php?module=lastcall&amp;command=getJSON&amp;jdata=grid" data-cache="false" data-toolbar="#toolbar-all" data-toggle="table" data-search="true" class="table">
    <thead>
        <tr>
            <th data-field="callerid" data-sortable="true"><?php echo _("Callerid")?></th>
             <th data-field="destcallerid" data-sortable="true"><?php echo _("Destcallerid")?></th>
        </tr>
    </thead>
</table>

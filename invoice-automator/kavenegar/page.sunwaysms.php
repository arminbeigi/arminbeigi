<?php 
$action = isset($_REQUEST['action'])?$_REQUEST['action']:'';
$dispnum = "sunwaysms";

if($action == 'save'){
	sunwaysms_save();
	needreload();
}

$c = sunwaysms_get();

$tabs = array(
	'base'=>'Base Config',
	'ext'=>'Extensions Config',
	'trace'=>'Send Trace'
);
$suntab = isset($_GET['suntab'])?$_GET['suntab']:'base';
?>
<script type="text/javascript" src="admin/modules/sunwaysms/assets/jqGrid-5.7.0/js/jquery.jqGrid.js"></script>
<script type="text/ecmascript" src="admin/modules/sunwaysms/assets/jqGrid-5.7.0/js/i18n/grid.locale-en.js"></script>
<link rel="stylesheet" type="text/css" media="screen" href="admin/modules/sunwaysms/assets/jqGrid-5.7.0/css/ui.jqgrid.css" />


<div class="pure-menu pure-menu-horizontal">
    <a href="#" class="pure-menu-heading pure-menu-link">

    </a>
    <ul class="pure-menu-list">

    	<?php 
    	foreach ($tabs as $key => $name):
    	 ?>
        <li class="pure-menu-item <?php if($key==$suntab) echo 'pure-menu-selected'; ?>">
            <a href="<?php echo sunwaysms_url_tabs('suntab',$key) ?>" class="pure-menu-link "><?php echo $name; ?></a>
        </li>
      <?php endforeach; ?>
    </ul>
</div>


<?php if($suntab=='base'): ?>
	<h1>Kavenegar SMS Configs</h1>
	<form autocomplete="off" name="frmAdmin" action="<?php $_SERVER['PHP_SELF'] ?>" method="post">
<input type="hidden" name="display" value="<?php echo $dispnum?>">
	<input type="hidden" name="action" value="save">

	<table id="customers-frm">
		<tr>
			<td style="width: 320px;min-width: 320px;">
				Message On Call&nbsp;
			</td>
			<td>
				<textarea name="sunwaysms_message" cols="120" rows="3"><?php echo $c['message']; ?></textarea>
			</td>
		</tr>
		<tr>
			<td style="width: 320px;min-width: 320px;">
				Kavenegar API Key&nbsp;
			</td>
			<td>
				<input type="text" name="sunwaysms_apikey" value="<?php echo htmlspecialchars($c['apikey'] ?? ''); ?>" style="width:340px" placeholder="کلید API از kavenegar.com">
			</td>
		</tr>

		<tr>
			<td>
				Sender Number (شماره فرستنده)&nbsp;
			</td>
			<td>
				<input type="text" name="sunwaysms_sender" value="<?php echo htmlspecialchars($c['sender'] ?? ''); ?>" placeholder="اختیاری - خالی = پیش‌فرض حساب">
			</td>
		</tr>
		<tr>
			<td>
				Active on City Number&nbsp;
			</td>
			<td>
				<input type="checkbox" name="sunwaysms_citynumber" value="1" <?php echo (int)$c['citynumber']==1?'checked="checked"':''; ?>>
			</td>
		</tr>
		<tr>
			<td>
				Search Last Mobile Number From City Number Call&nbsp;
			</td>
			<td>
				<input type="checkbox" name="sunwaysms_citynumbersaved" value="1" <?php echo (int)$c['citynumbersaved']==1?'checked="checked"':''; ?>>
			</td>
		</tr>
		<tr>
			<td>
				Retry on failed Mobile&nbsp;
			</td>
			<td>
				<input type="text" name="sunwaysms_retrycount" value="<?php echo $c['retrycount']; ?>">
			</td>
		</tr>
		<tr>
			<td>
				Reaction Type&nbsp;
			</td>
			<td>
				<select name="sunwaysms_reactiontype">
					<option value="1" <?php if($c['reactiontype']=='1') echo 'selected="selected"'; ?>>Enable All & Spec Extension</option>
					<option value="2" <?php if($c['reactiontype']=='2')echo 'selected="selected"'; ?>>Disable All & Only spec Extension</option>
					<option value="3" <?php if($c['reactiontype']=='3') echo 'selected="selected"'; ?>>Disable Service</option>
				</select>	
			</td>
		</tr>
		<tr>
			<td>
				Last Days Ignore&nbsp;
			</td>
			<td>
				<input type="text" name="sunwaysms_ignoreday" value="<?php echo $c['ignoreday']; ?>">
			</td>
		</tr>
		<tr>
			<td>
				Ignore Type&nbsp;
			</td>
			<td>
				<select name="sunwaysms_ignoretype">
					<option value="1" <?php if($c['ignoretype']=='1') echo 'selected="selected"'; ?>>Only Checked Destination</option>
					<option value="2" <?php if($c['ignoretype']=='2')echo 'selected="selected"'; ?>>Extension and Destination</option>
				</select>
			</td>
		</tr>

		<tr>
			<td>
				Send SMS When&nbsp;
			</td>
			<td>
				<select name="sunwaysms_sendwhen">
					<option value="answer" <?php if($c['sendwhen']=='answer') echo 'selected="selected"'; ?>>Before Answer</option>
					<option value="hangup" <?php if($c['sendwhen']=='hangup')echo 'selected="selected"'; ?>>After Hangup</option>
				</select>
			</td>
		</tr>
		<tr>
			<td>
				Log Debug&nbsp;
			</td>
			<td>
				<select name="sunwaysms_debug">
					<option value="0" <?php if($c['debug']=='0') echo 'selected="selected"'; ?>>Disable</option>
					<option value="1" <?php if($c['debug']=='1')echo 'selected="selected"'; ?>>Enable</option>
				</select>
			</td>
		</tr>	
	</table>
	<input class="btn-submitmobile" type="submit" name="submit">
</form>
<?php endif; ?>

<?php if($suntab=='ext'): ?>
<h3>
	Config per extension message and enable
</h3>

<p>
	<b>%DEST%</b> Destination mobile number on send sms<br/>
	<b>%EXTENSION%</b> Local extension number<br/>
	<b>%DATE%</b> Jalali only date, ۱۴۰۰/۰۷/۰۶<br/>
	<b>%DATETIME%</b> Jalali date and time, ۱۴۰۰/۰۷/۰۶,۱۲:۲۰<br/>
	<b>%TIME%</b> Jalali only time and secend, ۱۲:۲۰:۳۵<br/>
</p>


<table id="jqGrid"></table>
    <div id="jqGridPager"></div>

    <script type="text/javascript">

        $(document).ready(function () {

            $("#jqGrid").jqGrid({
            	url:'/smsdata.php?mode=load&tab=<?php echo $suntab; ?>',
				datatype: "json",
                editurl: '/smsdata.php?mode=edit&tab=<?php echo $suntab; ?>',
                colModel: [
                    {
						label: 'ID',
                        name: 'id',
                        width: 75,
						key: true,
						editable: false,
						editoptions : { required: false, placeholder: "Row ID"}
                    },
                    {
						label: 'Extension',
                        name: 'ext',
                        width: 140,
                        editable: true,
                        editoptions : {
							required: true
						}
                    },
                    {
						label : 'Content',
                        name: 'content',
                        width: 100,
                        editable: true,
                        edittype:"textarea",
						editoptions : {
							required: true,
							 cols: 60,
							 rows:3,
							 
						}
                    },
                    {
						label: 'Enable',
                        name: 'enable',
                        width: 80,
                        editable: true,
                         edittype:"checkbox",
                    }
                ],
				sortname: 'id',
				sortorder : 'desc',
				loadonce: false,
				viewrecords: true,
                width: 700,
                height: 200,
                rowNum: 10,
                pager: "#jqGridPager"
            });


            $('#jqGrid').navGrid('#jqGridPager',
                { edit: true, add: true, del: true, search: true, refresh: true, view: true, position: "left", cloneToTop: true },
                {
					html5Check :  true,
                    editCaption: "The Edit Dialog",
                    recreateForm: true,
                    closeAfterEdit: true,
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    },
										buttons : [
											{
												side : "right",
												text : "Custom",
												position : "first",
												click : function( form, params, event) {
													alert("Custom action in search form");
												}
											}
										]
                },
                {
                    closeAfterAdd: true,
					html5Check : true,
                    recreateForm: true,
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    }
                },
                {
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    }
                });
            $('#jqGrid').jqGrid('filterToolbar');
			$('#jqGrid').jqGrid('navGrid',"#jqGridPager", {                
                search: true, // show search button on the toolbar
                add: true,
                edit: true,
                del: true,
                refresh: true
            }); 
        });
    </script>
<?php endif; ?>


<?php if($suntab=='trace'): ?>
<h3>
	Send SMS Log
</h3>
<table id="jqGrid"></table>
    <div id="jqGridPager"></div>

    <script type="text/javascript">

        $(document).ready(function () {

            $("#jqGrid").jqGrid({
            	url:'/smsdata.php?mode=load&tab=<?php echo $suntab; ?>',
				datatype: "json",
                editurl: '/smsdata.php?mode=edit&tab=<?php echo $suntab; ?>',
                colModel: [
                    {
						label: 'ID',
                        name: 'id',
                        width: 75,
						key: true,
						editable: false,
						editoptions : { required: false, placeholder: "Row ID"}
                    },
                    {
						label: 'Extension',
                        name: 'ext',
                        width: 140,
                        editable: true,
                        editoptions : {
							required: true
						}
                    },
                    {
						label: 'Destionation',
                        name: 'dest',
                        width: 140,
                        editable: true,
                        editoptions : {
							required: true
						}
                    },
                    {
						label : 'Content',
                        name: 'content',
                        width: 100,
                        editable: true,
                        edittype:"textarea",
						editoptions : {
							required: true,
							 cols: 60,
							 rows:3,
							 
						}
                    },
                    {
						label: 'Date',
                        name: 'send_at',
                        width: 80,
                        editable: true,
                        
                    },
                    {
						label: 'Status',
                        name: 'status',
                        width: 80,
                        editable: true,
                        
                    },
                    {
						label: 'GateWay',
                        name: 'api_gateway',
                        width: 80,
                        editable: true,
                        
                    },
                     {
						label: 'Result',
                        name: 'api_res',
                        width: 80,
                        editable: true,
                        
                    }
                ],
				sortname: 'id',
				sortorder : 'desc',
				loadonce: false,
				viewrecords: true,
                width: 800,
                height: 200,
                rowNum: 10,
                pager: "#jqGridPager"
            });


            $('#jqGrid').navGrid('#jqGridPager',
                { edit: false, add: false, del: true, search: true, refresh: true, view: true, position: "left", cloneToTop: true },
                {
					html5Check :  true,
                    editCaption: "The Edit Dialog",
                    recreateForm: true,
                    closeAfterEdit: true,
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    },
										buttons : [
											{
												side : "right",
												text : "Custom",
												position : "first",
												click : function( form, params, event) {
													alert("Custom action in search form");
												}
											}
										]
                },
                {
                    closeAfterAdd: true,
					html5Check : true,
                    recreateForm: true,
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    }
                },
                {
                    errorTextFormat: function (data) {
                        return 'Error: ' + data.responseText
                    }
                });
            $('#jqGrid').jqGrid('filterToolbar');
			$('#jqGrid').jqGrid('navGrid',"#jqGridPager", {                
                search: true, // show search button on the toolbar
                add: false,
                edit: false,
                del: true,
                refresh: true
            }); 
        });
    </script>
<?php endif; ?>























	

//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2016 Sangoma Technologies.
//


function checkLastcall(theForm) {
    var msgInvalidCallerid = _('Invalid callerid specified');
    var msgInvalidDestCallerid = _('Invalid destcallerid specified');

    setDestinations(theForm, '_post_dest');

    if (isEmpty(theForm.callerid.value))
        return warnInvalid(theForm.callerid, msgInvalidCallerid);

    if (isEmpty(theForm.destcallerid.value))
        return warnInvalid(theForm.destcallerid, msgInvalidDestCallerid);

    return true;
}

$("#lastcallgrid-side").on('click-row.bs.table', function(e, row, elem) {
    window.location = '?display=lastcall&view=form&extdisplay=' + row['id'];
});


function format_moreinfo(value) {
    html = '<button type="button" class="btn btn-info btn-lg" data-toggle="modal" data-target="#lastcalllog" >show</button>';
    return html;
}

$('#back').click(function(event) {
    window.location = '?display=lastcall';
});

function actionformatter(v, r) {
    var html = '<a href="?display=lastcall&view=form&extdisplay=' + v + '"><i class="fa fa-edit"></i></a>';
    html += '<a href="?display=lastcall&actionlastcall=delete&extdisplay=' + v + '" class="delAction"><i class="fa fa-trash"></i></a>';
    return html;
}

$("#table-all").on("click-cell.bs.table", function(event, field, value, row) {
    $("#lastcalllog-detail-grid").bootstrapTable('load', row.moreinfo)
});

function aDestFormatter(value) {

    if (typeof value == 'undefined' || value == '') {
        return;
    }

    if (value === null || value.length == 0) {
        return _("No Destination");
    } else {
        if (typeof destinations[value] !== "undefined") {
            if (typeof destinations[value].edit_url !== "undefined" && destinations[value].edit_url !== false) {
                return '<a href="' + destinations[value].edit_url + '">' + destinations[value].name + ": " + destinations[value].description + '</a>';
            } else {
                return destinations[value].name + ": " + destinations[value].description;
            }
        } else {
            return value;
        }
    }
}
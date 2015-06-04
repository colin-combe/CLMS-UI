<?php
//  CLMS-UI
//  Copyright 2015 Colin Combe, Rappsilber Laboratory, Edinburgh University
//
//  This file is part of CLMS-UI.
//
//  CLMS-UI is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  CLMS-UI is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with CLMS-UI.  If not, see <http://www.gnu.org/licenses/>.


include('../../connectionString.php');
$ids = $_POST["mids"];
//echo $_POST["sid"];
// Connecting, selecting database
$dbconn = pg_connect($connectionString)
        or die('Could not connect: ' . pg_last_error());



// Performing SQL query
//$idCount = sizeof($ids);
echo ('>'.$ids.'<');
//$query = "SELECT * ".
$query = "SELECT scan_number AS Scan, round(precursor_mz, 2) AS P_MZ, precursor_charge AS P_Z, round(match_score, 4) AS Score, round(delta, 2) AS Delta, round(error, 2) AS Error,  "  //run_name,
        . " peptide1, pep1_link_pos, peptide2, pep2_link_pos, autovalidated AS Auto, validated AS Validated, rejected AS Rejected, spectrum_match_id AS Match_id "
        . " FROM v_export_materialized WHERE "
        . " spectrum_match_id IN (" . $ids. ")"
                . " ORDER BY match_score DESC";
//;;
//for ($id_index = 0; $id_index < ($idCount); $id_index++) {
//    if ($id_index > 0)
//        $query = $query . " OR ";
//    $query = $query . " spectrum_match_id = " . $ids[$id_index] . " ";
//}
//$query = $query .

// echo $query;

$result = pg_query($query) or die('Query failed: ' . pg_last_error());
?>

<!--<div style="width:600px;">-->
<!--<div id="myGrid" style="width:100%;height:500px;"></div>-->
<!--</div>-->
<?php
//print_results($result);
?>
<script id ='gridInit'>
    alert("here");
    var dataView;
    var grid;
    var data = [];
    var options = {
        enableCellNavigation: true,
        showHeaderRow: true,
        headerRowHeight: 30,
        explicitInitialization: true
    };
    var columns = [];
    var columnFilters = {};


    for (var i = 0; i < 10; i++) {
        columns.push({
            id: i,
            name: String.fromCharCode("A".charCodeAt(0) + i),
            field: i,
            width: 60
        });
    }

</script>
<?php
    $count = 0;
    echo "<table>\n";
    echo "\t<tr>\n";
    for ($field_number = 0; $field_number < pg_num_fields($result); $field_number++) {
        echo "\t\t<th>" . pg_field_name($result, $field_number) . "</th>\n";
    }
    echo "\t</tr>\n";
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        echo "\t<tr>\n";
        foreach ($line as $col_value) {
            echo "\t\t<td>$col_value</td>\n";
        }
        echo "\t</tr>\n";
        $count++;
    }
    echo "</table>\n";
    if ($count > 1) echo '<p>(' . $count . ' matches)</p>';
    else echo '<p>(' . $count . ' match)</p>';
?>
<script>
    function filter(item) {
        for (var columnId in columnFilters) {
            if (columnId !== undefined && columnFilters[columnId] !== "") {
                var c = grid.getColumns()[grid.getColumnIndex(columnId)];
                if (item[c.field] != columnFilters[columnId]) {
                    return false;
                }
            }
        }
        return true;
    }

    $(function () {
        for (var i = 0; i < 100; i++) {
            var d = (data[i] = {});
            d["id"] = i;
            for (var j = 0; j < columns.length; j++) {
                d[j] = Math.round(Math.random() * 10);
            }
        }

        dataView = new Slick.Data.DataView();
        grid = new Slick.Grid("#myGrid", dataView, columns, options);


        dataView.onRowCountChanged.subscribe(function (e, args) {
            grid.updateRowCount();
            grid.render();
        });

        dataView.onRowsChanged.subscribe(function (e, args) {
            grid.invalidateRows(args.rows);
            grid.render();
        });


        $(grid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
            var columnId = $(this).data("columnId");
            if (columnId != null) {
                columnFilters[columnId] = $.trim($(this).val());
                dataView.refresh();
            }
        });

        grid.onHeaderRowCellRendered.subscribe(function(e, args) {
            $(args.node).empty();
            $("<input type='text'>")
            .data("columnId", args.column.id)
            .val(columnFilters[args.column.id])
            .appendTo(args.node);
        });

        grid.init();

        dataView.beginUpdate();
        dataView.setItems(data);
        dataView.setFilter(filter);
        dataView.endUpdate();
    })
</script>

<?php
// Printing results in HTML
function print_results($result) {
    $count = 0;
    echo "<table>\n";
    echo "\t<tr>\n";
    for ($field_number = 0; $field_number < pg_num_fields($result); $field_number++) {
        echo "\t\t<th>" . pg_field_name($result, $field_number) . "</th>\n";
    }
    echo "\t</tr>\n";
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        echo "\t<tr>\n";
        foreach ($line as $col_value) {
            echo "\t\t<td>$col_value</td>\n";
        }
        echo "\t</tr>\n";
        $count++;
    }
    echo "</table>\n";
    if ($count > 1) echo '<p>(' . $count . ' matches)</p>';
    else echo '<p>(' . $count . ' match)</p>';
}
?>

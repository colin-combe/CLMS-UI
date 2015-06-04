<!--
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
-->
<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
    exit;
}
header('Content-type: text/html; charset=utf-8');
?>
<!DOCTYPE HTML>
<html>
	<head>
		<?php
		$pageName = "History";
		include("./php/head.php");
		?>		
	</head>

	<body>
   	 	<!-- Main -->
   	 	<div id="main">
   	 	<!-- Intro -->			
			<div class="container">
				<h1 class="page-header">
				<span style="text-transform: uppercase;margin-right:10px;font-size:0.9em;font-weight:bold;"><?php echo $_SESSION['session_name'] ?>&nbsp;</span>
						<button class="btn btn-1 btn-1a network-control resetzoom" onclick="window.location = '../password/logout.php';">
							Log Out
						</button>
					<div style='float:right'>
						<button class="btn btn-1 btn-1a network-control resetzoom" onclick="aggregate();">
							Aggregate
						</button>

					</div>
				
				</h1>
				<div class="external-link" id="tableContainer">
					<table id='t1'>
						<tbody>
							<?php
							include('../connectionString.php');
							//open connection
							$dbconn = pg_connect($connectionString)
								or die('Could not connect: ' . pg_last_error());

						
							$query = "SELECT search.id, search.submit_date, search.name, search.notes, search.status, users.user_name, search.random_id, sequence_file.file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND users.user_name = '".$_SESSION['session_name']."' AND status != 'hide' ORDER BY submit_date DESC ;";
							$result = pg_query($query) or die('Query failed: ' . pg_last_error());
						
							while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
								$url = $line['id'].'-'.$line['random_id'];
								echo "<td><a id=".$line['name']." href='./network.php?sid=" . urlencode($url) . "'>" . $line['name'] . "</a>" . "</td>";
								echo "<td><strong>" . $line['status'] . "</strong></td>";
								echo "<td>" .$line['file_name'] . "</td>";
								echo "<td>" .$line['submit_date'] . "</td>";
								echo  "<td><input type='checkbox' class='aggregateCheckbox' value='". $line['id'] . "'></td>";
								echo "</tr>\n";
							}
							?>
						</tbody>
					</table>
				</div><!-- external-link -->
			</div> <!-- CONTAINER -->
		</div> <!-- MAIN -->
		
        <script>//<![CDATA[

			var opt1 = {
				colTypes: ["alpha","none", "alpha", "alpha", "none"],
				pager: {
				rowsCount: 20
				}
			}
			new DynamicTable("t1", opt1);
							
            function compare(){
                var radios = document.getElementsByTagName('input');
                var value1, value2, value3;
                for (var i = 0; i < radios.length; i++) {
                    if (radios[i].type === 'radio' && radios[i].checked) {
                        // get value, set checked flag or do whatever you need to
                        var rad = radios[i];
                        if (rad.name == "set1") value1 = rad.value;
                        if (rad.name == "set2") value2 = rad.value;
                        if (rad.name == "set3") value3 = rad.value;
                    }
                }
                if (value1 == null) alert ("Cannot compare: no selection for set 1");
                else if (value2 == null) alert ("Cannot compare: no selection for set 2");
                else {
                    window.open("./ppi.php?sid="+value1+"," + value2 + "," + value3, "_self");
                }
            }
            
            function aggregate(){
				clearAggregationCheckboxes();
                //~ var inputs = document.getElementsByClass('aggregateCheckbox');
                //~ var values = new Array();
                //~ for (var i = 0; i < inputs.length; i++) {
                    //~ if (inputs[i].type === 'checkbox' && inputs[i].checked) {
                        //~ values.push(inputs[i].value);
                    //~ }
                //~ }
                //~ if (values.length === 0) alert ("Cannot aggregate: no selection - use checkboxes in right most table column.");
                //~ else {
                    //~ window.open("./ppi.php?sid="+values.join(','), "_self");
                //~ }
            }
            
            function clearAggregationCheckboxes(){
				var inputs = document.getElementsByClassName('aggregateCheckbox');
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].type === 'checkbox') {
                        inputs[i].checked = true;
                    }
                }	
			}
                       
            //]]>
        </script>
		
	</body>
</html>

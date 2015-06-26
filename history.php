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
   	 	<div id="">
   	 	<!-- Intro -->			
			<div class="container">
				<h1 class="page-header">
				<span style="text-transform: uppercase;margin-right:10px;font-size:0.9em;font-weight:bold;"><?php echo $_SESSION['session_name'] ?>&nbsp;</span>
						<button class="btn btn-1 btn-1a" onclick="window.location = '../util/logout.php';">
							Log Out
						</button>
					<div style='float:right'>
						<button class="btn btn-1 btn-1a" onclick="aggregate();">
							Aggregate
						</button>

					</div>
				
				</h1>
				<div class="tableContainer">
					<table id='t1'>
						<tbody>
							<?php
							include('../connectionString.php');
							//open connection
							$dbconn = pg_connect($connectionString)
								or die('Could not connect: ' . pg_last_error());
							$result = pg_prepare($dbconn, "my_query", 
"SELECT search.id, (array_agg(search.submit_date))[1] AS submit_date, (array_agg(search.name))[1] AS name, (array_agg(search.status))[1] AS status, (array_agg(search.random_id))[1] AS random_id, array_agg(sequence_file.file_name) AS file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND users.user_name = $1 AND status != 'hide' GROUP BY search.id ORDER BY submit_date DESC ;");
							// Execute the prepared query
							$result = pg_execute($dbconn, "my_query", [$_SESSION['session_name']]);
							while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
								$url = $line['id'].'-'.$line['random_id'];
								echo "<td><a id=".$line['name']." href='./network.php?sid=" . urlencode($url) . "'>" . $line['name'] . "</a>" . "</td>";
								echo "<td><strong>" . $line['status'] . "</strong></td>";
								echo "<td>" .$line['file_name'] . "</td>";
								echo "<td>" .substr($line['submit_date'], 0, strpos($line['submit_date'], '.')) . "</td>";
								echo  "<td class='chkbx_td'><input type='checkbox' class='aggregateCheckbox' value='". $url . "'></td>";
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
				colTypes: ["alpha","none", "alpha", "alpha", "clearCheckboxes"],
				pager: {
				rowsCount: 20
				}
			}
			new DynamicTable("t1", opt1);
							            
            function aggregate(){
				var inputs = document.getElementsByClassName('aggregateCheckbox');
                var values = new Array();
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) {
                        values.push(inputs[i].value);
                    }
                }
                if (values.length === 0) alert ("Cannot aggregate: no selection - use checkboxes in right most table column.");
                else {
                    window.open("./network.php?sid="+values.join(','), "_self");
                }
            }
            
            function clearAggregationCheckboxes(){
				var inputs = document.getElementsByClassName('aggregateCheckbox');
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].type === 'checkbox') {
                        inputs[i].checked = false;
                    }
                }	
			}
                       
            //]]>
        </script>
		
	</body>
</html>

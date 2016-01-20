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

		<div class="container">
			<h1 class="page-header">
			<span class="headerLabel" style="font-weight:bold;"><?php echo $_SESSION['session_name'] ?>&nbsp;</span>
					
					<input type="radio" name="mineOrAll" value="mySearches" id="mySearches" checked onchange="loadSearchList();">
					<span class="headerLabel">My Searches</span>
					<input type="radio" name="mineOrAll" value="allSearches" id="allSearches" onchange="loadSearchList();">
					<span class="headerLabel" >All Searches</span>
					
					
<!--
					<button class='btn btn-1 btn-1a' onclick='alert("Please do not press this button again.");'>
						New Search
					</button>	
-->
					
					<button class='btn btn-1 btn-1a' onclick='window.location = "../util/logout.php";'>
						Log Out
					</button>
				<div style='float:right'>
					<button class='btn btn-1 btn-1a' onclick='aggregate();'>Aggregate</button>
					<?php
						if ($_SESSION['session_name'] == "adam"){
							//~ echo "<button class='btn btn-1 btn-1a' onclick='aggregate3D();'>3D</button>";
							// echo "<button class='btn btn-1 btn-1a' onclick='aggregateMatrix();'>Matrix</button>";
						}
					?>
				</div>

			</h1>
			<div class="tableContainer">
				<table id='t1'>
					<tbody id='tb1'>

					</tbody>
				</table>
			</div><!-- tableContainer -->
		</div> <!-- CONTAINER -->

        <script>
			//<![CDATA[
			
			var dynTable;
			
			function loadSearchList(){
				
				DynamicTable.destroy("t1");
				document.getElementById("t1").innerHTML = "";
				
				var xmlhttp = new XMLHttpRequest();
				var url = "./php/searches.php";
				var params;
				//~ console.log('^'+xlv.sid+'^');
				if (document.getElementById('mySearches').checked){
					params =  "searches=MINE";
					var opt1 = {
						colTypes: ["alpha","none", "none", "none", "alpha", "alpha","number","none", "clearCheckboxes"],
						pager: {
						rowsCount: 20
						}
					}
				}
				else {
					params =  "searches=ALL";
					var opt1 = {
						colTypes: ["alpha","none", "none", "none", "alpha", "alpha","number","alpha", "clearCheckboxes"],
						pager: {
						rowsCount: 20
						}
					}
				}
				xmlhttp.open("POST", url, true);
				//Send the proper header information along with the request
				xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
					if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
						//~ console.log(xmlhttp.responseText);
						document.getElementById("t1").innerHTML = xmlhttp.responseText;
						dynTable = new DynamicTable("t1", opt1);
						if (document.getElementById('mySearches').checked){
							document.getElementsByClassName("tool-8")[0].setAttribute("style", "width:0px;");
						}
						else {
							//~ document.getElementByClassName("tool-8")[0].setAttribute("style", "width:90px;");
						}
					}
				}
				xmlhttp.send(params);
			}
			loadSearchList();
				
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

           function aggregate3D(){
				var inputs = document.getElementsByClassName('aggregateCheckbox');
                var values = new Array();
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) {
                        values.push(inputs[i].value);
                    }
                }
                if (values.length === 0) alert ("Cannot aggregate: no selection - use checkboxes in right most table column.");
                else {
                    window.open("./network_3D.php?sid="+values.join(','), "_self");
                }
            }

            /*
           function aggregateMatrix(){
				var inputs = document.getElementsByClassName('aggregateCheckbox');
                var values = new Array();
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) {
                        values.push(inputs[i].value);
                    }
                }
                if (values.length === 0) alert ("Cannot aggregate: no selection - use checkboxes in right most table column.");
                else {
                    window.open("./matrix.php?sid="+values.join(','), "_self");
                }
            }
            */

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

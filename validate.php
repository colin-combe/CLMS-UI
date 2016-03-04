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
			$sid = urldecode($_GET["sid"]);

			$pattern = '/[^0-9,\-]/';
			if (preg_match($pattern, $sid)){
				header();
				echo ("<!DOCTYPE html>\n<html><head></head><body>You're having a laugh.</body></html>");
				exit;
			}
			$pageName = "Validation";
			include("./php/head.php");
		?>
	</head>
	    <script type="text/javascript" src="./vendor/d3.js"></script>
	    
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
<!--
       	<script type="text/javascript" src="./vendor/rgbcolor.js"></script>
-->
        <script type="text/javascript" src="./vendor/underscore.js"></script>
        <script type="text/javascript" src="./vendor/zepto.js"></script>
        <script type="text/javascript" src="./vendor/backbone.js"></script>
	<script type="text/javascript" src="../spectrum/src/model.js"></script>
	<script type="text/javascript" src="../spectrum/src/SpectrumView2.js"></script>
	<script type="text/javascript" src="../spectrum/src/FragmentationKeyView.js"></script>
	<script type="text/javascript" src="../spectrum/src/FragmentationKey.js"></script>
	<script type="text/javascript" src="../spectrum/src/FragKey/KeyFragment.js"></script>
	<script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>		
	<script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>	
	<script type="text/javascript" src="../spectrum/src/graph/Fragment.js"></script>
	<script type="text/javascript" src="../spectrum/src/graph/IsotopeCluster.js"></script>		
	<style>
		.dynamic-table-toolbar{
			display:none;
		}
		
		html, body{
			background-color: white;
			height:100%;
			width:100%;
			-webkit-user-select: none;
			-khtml-user-select: none;
			-moz-user-select: -moz-none;
			-o-user-select: none;
			user-select: none;
			
<!--
			overflow:hidden;
-->
		}		
		*{
			margin:0px;
			padding:0px;
		}
		
		#spectrumDiv {

			height:50%;
			width:98%;
<!--			position:absolute;
			top:0px;
			left:100%;
			padding-top: 10px;
			padding-left: 10px;
-->
		}

		#measureTooltip {
		    position: absolute;
		    /*max-width: 8em;*/
		    text-align:center;
		    pointer-events:none; /*let mouse events pass through*/
		    /*transition: opacity 0.3s;*/
		}
		
		.validationButton {
			width: 100%;
		}
		.validationButton:hover {
			background-color:red;
		}
		
	</style>

	<body>

		<div class="container" style="height:100%;">
			<h1 class="page-header">
			<span class="headerLabel" style="font-weight:bold;">
				<?php echo $_SESSION['session_name'] ?>  validating  
				<?php 
					$sid = urldecode($_GET["sid"]);
					$dashPos = strpos($sid,'-');
					$randId = substr($sid, $dashPos + 1);
					$id = substr($sid, 0, ($dashPos));
					echo $id;
				?>
			</span>	
					
<!--
					<button class='btn btn-1 btn-1a' onclick='window.location = "../util/logout.php";'>
						Log Out
					</button>
-->
				<div style='float:right'>
					<button class='btn btn-1 btn-1a' onclick="window.location = './history.php';" title="Return to search history">Done</button>
				</div>

			</h1>
			
			
			<div id='spectrumDiv'>
			<label>lossy labels
				<input id="lossyChkBx" type="checkbox">
			</label>
			<button id="reset">reset zoom</button>
			<button id="clearHighlights">clear highlights</button>
			<label>measure
				<input id="measuringTool" type="checkbox">
			</label>
			<label>move labels
				<input id="moveLabels" type="checkbox">
			</label>
<!--
			</br>
-->
			<label for="colorSelector">Change color scheme:</label>
			<select id="colorSelector" style="display:inline-block;">
				<option value="RdBu">Red&Blue</option>
				<option value="BrBG">Brown&Teal</option>
				<option value="PiYG">Pink&Green</option>
				<option value="PRGn">Purple&Green</option>
				<option value="PuOr">Orange&Purple</option>
			</select> 
			<form id="setrange" style="display:inline-block;">
				m/z Range:
				<input type="text" id="xleft" size="5">
				<input type="text" id="xright" size="5">
				<input type="submit" value="set range">
				<span id="range-error"></span>
			</form>
			<svg id="spectrumSVG" style="width:100%; height:100%"></svg>
			<div id="measureTooltip"></div>
			
			<div>
				
			<table>
				<tr>
					<td><button class="validationButton" onclick="validate('A')">A</button></td>
					<td><button class="validationButton" onclick="validate('B')">B</button></td>
					<td><button class="validationButton" onclick="validate('C')">C</button></td>
					<td><button class="validationButton" onclick="validate('?')">?</button></td>
					<td><button class="validationButton" onclick="validate('R')">R</button></td>
				</tr>
			</table>		
				
			</div>
		</div>
			
			
			<div class="tableContainer">
				<table id='t1'>
					<thead><td>Match ID</td><td>Score</td><td>PepSeq1</td><td>LinkPos1</td><td>PepSeq2 </td><td>LinkPos2</td><td>Validated</td></thead>
					<tbody id='tb1'>
					<?php							
						include('../connectionString.php');
						$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

						$peptidesTempTableName = 'tempMatchedPeptides' . preg_replace('/(.|:)/', "_", $_SERVER['REMOTE_ADDR']) . '_' . time();


						$q_matchedPeptides =
							'SELECT matched_peptide.match_id, spectrum_match.score,'
							. ' matched_peptide.match_type, matched_peptide.link_position + 1 AS link_position, '
							. 'spectrum_match.validated, '
							. ' peptide.sequence AS pepseq '
							. ' FROM '
							. ' matched_peptide inner join '
							. ' (SELECT * FROM spectrum_match WHERE SEARCH_ID = '.$id . ' AND dynamic_rank = true'
							. ' AND spectrum_match.score > 6' 
							. ' ) spectrum_match ON spectrum_match.id = matched_peptide.match_id '
							. ' inner join  peptide ON  matched_peptide.peptide_id = peptide.id '
							. ' inner join search ON spectrum_match.search_id = search.id '
							. ' WHERE search.random_id = \''.$randId.'\''
							. ' AND matched_peptide.link_position != -1'
							. ' ORDER BY score DESC, match_id, match_type;';
						
						
						$res = pg_query($q_matchedPeptides) or die('Query failed: ' . pg_last_error());

						
						$waitingForFirstMatch = true;
						//~ $line = pg_fetch_array($res, null, PGSQL_ASSOC);
						while ($line = pg_fetch_array($res, null, PGSQL_ASSOC)) {
							$match_type = $line["match_type"];
							if ($match_type == 1) {
								$match_id = $line["match_id"];
								$match_score = $line["score"];
								$match_validated = $line["validated"];
								$search_id = $line["search_id"];
								
								$pep1_link_position = $line['link_position'];
								$pep1_seq =  $line["pepseq"];
								$waitingForFirstMatch = false;
							} else if ($match_type == 2) {
								if ($match_id == $line["match_id"]) {
									$pep2_link_position = $line['link_position'];
									$pep2_seq = $line["pepseq"];

									if ($waitingForFirstMatch != true) {
										echo "<tr onclick='loadSpectra(".$id.',"'.$randId.'",'.$match_id.',"'
												. $pep1_seq.'",'.$pep1_link_position.',"'.$pep2_seq.'",'.$pep1_link_position.");'>"
												. '<td>' . $match_id . '</td>'
												. '<td>' . $match_score . '</td>'
												. '<td>' . $pep1_seq . '</td>'
												. '<td>' . $pep1_link_position. '</td>'
												. '<td>' . $pep2_seq . '</td>'
												. '<td>' . $pep2_link_position. '</td>'
												. '<td>' . $match_validated . '</td>'
											. "</tr>";
										$waitingForFirstMatch = true;
									}
								}
							}
						}
						// Free resultset
						pg_free_result($res);
						// Closing connection
						pg_close($dbconn);
										
					?>
					</tbody>
				</table>
			</div><!-- tableContainer -->
			
		</div> <!-- CONTAINER -->			
			

			


        <script>
			//<![CDATA[

			var opt = {
				pager: {
					rowsCount: 10
				}
			}
			new DynamicTable("t1", opt);
							
			loadSpectra = function (searchId, randId, matchId, pepSeq1, linkPos1, pepSeq2, linkPos2){
				
				matchViewed = matchId;
				
				var url = "http://129.215.14.63/xiAnnotator/annotate/"
							+ searchId + "/" + randId + "/" + matchId 
							+ "/?peptide=" + pepSeq1 
							+ "&peptide=" + pepSeq2 
							+ "&link=" + linkPos1
							+ "&link=" + linkPos2;
				
				d3.text(url, function(json) {
					json = JSON.parse(json);
					SpectrumModel.set({JSONdata: json});
				});		
				//~ d3.select("#spectrumDiv").transition().attr("opacity", 1)
					//~ .attr("transform", "scale(1, 1)")
					//~ .duration(CLMS.xiNET.RenderedProtein.transitionTime);
			}; 
			
			validate = function (validationStatus) {
		
			}
							
            //]]>
        </script>
        	<script>


	var SpectrumModel = new AnnotatedSpectrumModel();


	$(function() {


		_.extend(window, Backbone.Events);
		window.onresize = function() { window.trigger('resize') };


		var Spectrum = new SpectrumView({model: SpectrumModel, el:"#spectrumDiv"});
		var FragmentationKey = new FragmentationKeyView({model: SpectrumModel, el:"#spectrumDiv"});


/*		d3.text("test.csv", function(csv) {	
			SpectrumModel.set({annotatedPeaksCSV: csv});
		});*/
	
	
		//~ d3.text("http://129.215.14.63/xiAnnotator/annotate/3421/85160-94827-96653-69142/210313888/?peptide=TVTAMDVVYALK&peptide=YKAAFTECcmCcmQAADK&link=21&link=1", function(json) {
			//~ json = JSON.parse(json);
			//~ console.log("json:" + json);
			//~ SpectrumModel.set({JSONdata: json});
		//~ });


});
	</script>

	</body>
</html>

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
		?>
			<title><?php echo $pageName ?></title>
			<meta http-equiv="content-type" content="text/html; charset=utf-8" />
			<meta name="description" content="common platform for downstream analysis of CLMS data" />
			<meta name="keywords" content="biologists, mass-spectrometrists, cross-linking, protein, complexes, 3d, models, rappsilber, software" />
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta name="apple-mobile-web-app-capable" content="yes">
			<meta name="apple-mobile-web-app-status-bar-style" content="black">
			<link rel="stylesheet" href="css/reset.css" />
			<link rel="stylesheet" href="css/style.css" />
			<link rel="stylesheet" href="css/dynamic_table.css" />
            <link rel="stylesheet" href="css/validate.css" />

	</head>
	<script type="text/javascript" src="./vendor/split.js"></script>
        <script type="text/javascript" src="./vendor/d3.js"></script>

        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
<!--
       	<script type="text/javascript" src="./vendor/rgbcolor.js"></script>
-->
        <script type="text/javascript" src="./vendor/underscore.js"></script>
        <script type="text/javascript" src="./vendor/zepto.js"></script>
        <script type="text/javascript" src="./vendor/backbone.js"></script>

        <script type="text/javascript" src="./js/validate.js"></script>

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

		html, body{
			background-color: white;
			color:black;
			height:100%;
			width:100%;
			-webkit-user-select: none;
			-khtml-user-select: none;
			-moz-user-select: -moz-none;
			-o-user-select: none;
			user-select: none;

			overflow:hidden;
		}
		*{
			margin:0px;
			padding:0px;
		}

		#validationSpectrumDiv {
			width:100%;
<!--
			height:100%;
-->
		}

		#tableContainer {
			width:100%;
			height:100%;
			overflow:auto;
		}

		#measureTooltip {
		    position: absolute;
		    /*max-width: 8em;*/
		    text-align:center;
		    pointer-events:none; /*let mouse events pass through*/
		    /*transition: opacity 0.3s;*/
		}

		tr.selected {
			color: #fff;
			background-color: #091D42;
		}

	</style>

	<body>

		<div class="container" style="height:calc(100% - 90px);">
			<h1 class="page-header">
			<i class="fa fa-home" onclick="window.location = './history.php';" title="Return to search history"></i>
            <span class="headerLabel" style="font-weight:bold;">
				<?php echo $_SESSION['session_name'] ?>  validating
				<?php
					$dashPos = strpos($sid,'-');
					$randId = substr($sid, $dashPos + 1);
					$search_id = substr($sid, 0, ($dashPos));
					echo $search_id;
				?>

			</span>

<!--
					<button class='btn btn-1 btn-1a' onclick='window.location = "../util/logout.php";'>
						Log Out
					</button>
-->
				<div style='float:right'>
					<button class='btn btn-1 btn-1a' onclick=<?php echo '"window.location = \'./network.php?sid='.$sid.'\'";' ?> title="View results">Done</button>
				</div>

			</h1>

			<div id='validationSpectrumDiv'>
				<label>lossy labels
					<input id="lossyChkBx" type="checkbox">
				</label>
				<button id="reset" class="">reset zoom</button>
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
                <div style="height: calc(100% - 80px); width:100%; display: block;">
                    <!-- display:block in svg stops containing div being slightly larger than svg, which stops g calculating itself as slightly larger
                        in spectrum code (it grabs height from the div immediately above svg) -->
                    <svg id="spectrumSVG" style="height: 100%; width:100%; display: block;"></svg>
                    <div id="measureTooltip"></div>
                </div>

				<div>

				<table>
					<tr>
						<td><button class="validationButton A" onclick="validate('A')">A</button></td>
						<td><button class="validationButton B" onclick="validate('B')">B</button></td>
						<td><button class="validationButton C" onclick="validate('C')">C</button></td>
						<td><button class="validationButton Q" onclick="validate('?')">?</button></td>
						<td><button class="validationButton R" onclick="validate('R')">R</button></td>
					</tr>
				</table>

				</div>
			</div>


		<div id="tableContainer">
				<table id='t1'>
					<thead><td>Match ID</td><td>Score</td><td>PepSeq1</td><td>LinkPos1</td><td>PepSeq2 </td><td>LinkPos2</td><td>Validated</td></thead>
					<tbody id='tb1'>
					</tbody>
				</table>
			</div> <!-- tableContainer -->


		</div> <!-- CONTAINER -->




        <script>
			
			//map iterates in insertion order, SQL query sorts by score
			var matches = new Map();
			
			<?php
			include('../connectionString.php');
			$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

			//$peptidesTempTableName = 'tempMatchedPeptides' . preg_replace('/(.|:)/', "_", $_SERVER['REMOTE_ADDR']) . '_' . time();


			$q_matchedPeptides =
				'SELECT matched_peptide.match_id, spectrum_match.score,'
				. ' matched_peptide.match_type, matched_peptide.link_position + 1 AS link_position, '
				. 'spectrum_match.validated, '
				. ' peptide.sequence AS pepseq '
				. ' FROM '
				. ' matched_peptide inner join '
				. ' (SELECT * FROM spectrum_match WHERE SEARCH_ID = '.$search_id . ' AND dynamic_rank = true'
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

					$pep1_link_position = $line['link_position'];
					$pep1_seq =  $line["pepseq"];
					$waitingForFirstMatch = false;
				} else if ($match_type == 2) {
					if ($match_id == $line["match_id"]) {
						$pep2_link_position = $line['link_position'];
						$pep2_seq = $line["pepseq"];

						if ($waitingForFirstMatch != true) {
							/*echo "<tr onclick='loadSpectra(".$search_id.',"'.$randId.'",'.$match_id.',"'
									. $pep1_seq.'",'.$pep1_link_position.',"'.$pep2_seq.'",'.$pep1_link_position.");'"
									. " class='". $match_validated ."' id='m". $match_id ."'>"
									. '<td>' . $match_id . '</td>'
									. '<td>' . number_format((float)$match_score, 2, '.', '') . '</td>'
									. '<td>' . $pep1_seq . '</td>'
									. '<td>' . $pep1_link_position. '</td>'
									. '<td>' . $pep2_seq . '</td>'
									. '<td>' . $pep2_link_position. '</td>'
									. '<td id="td'.$match_id.'">' . $match_validated . '</td>'
								. "</tr>";*/
								
							echo 'matches.set("'.$match_id.'",{"id":"'.$match_id
									.'","searchId":"'.$search_id
									.'","pepSeq1raw":"'.$pep1_seq
									.'","linkPos1":"'.$pep1_link_position
									.'","pepSeq2raw":"'.$pep2_seq
									.'","linkPos2":"'.$pep2_link_position
									.'","score":"'.number_format((float)$match_score, 2, '.', '')
									.'","validated":"'.$match_validated
									."\"});\n";

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
			
			var matchKeys = Array.from(matches.keys());

			
			// how to create a table using d3's binding:
			// https://vis4.net/blog/posts/making-html-tables-in-d3-doesnt-need-to-be-a-pain/
			// (haven't done that)
			
			var tableBody =d3.select("#tb1");
			for (match of matches.values()){
				var tableRow = tableBody.append("tr")
						.attr("class", match.validated)
						.attr("id", "m" + match.id)
						.on('click', function(){
							var id = this.getAttribute("id").substr(1);
							loadSpectrum(id);
						});
				
				tableRow.append("td").html(match.id);
				tableRow.append("td").html(match.score);
				tableRow.append("td").html(match.pepSeq1raw);
				tableRow.append("td").html(match.linkPos1);
				tableRow.append("td").html(match.pepSeq2raw);
				tableRow.append("td").html(match.linkPos2);
				tableRow.append("td").html(match.validated).attr("id", "valTd"+match.id);
			}

			var SpectrumModel = new AnnotatedSpectrumModel();


			$(function() {


				_.extend(window, Backbone.Events);
				window.onresize = function() { window.trigger('resize') };


				var Spectrum = new SpectrumView({model: SpectrumModel, el:"#validationSpectrumDiv"});
				var FragmentationKey = new FragmentationKeyView({model: SpectrumModel, el:"#validationSpectrumDiv"});

				var split = Split (["#validationSpectrumDiv", "#tableContainer"],
					{ direction: "vertical", sizes: [60,40], minSize: [200,10],
						onDragEnd:function (){
							Spectrum.resize();}
					});
			});


			function loadSpectrum (matchId) {
				
				match = matches.get(matchId);
				
				matchViewed = match.id;

				CLMSUI.loadSpectra (match,
									<?php echo '"'.$randId.'"'; ?>, SpectrumModel)
				;

				d3.selectAll("tr").classed("selected", false);
				d3.select("#m" + matchViewed).classed("selected", true);

			};

			validate = function (validationStatus) {
				CLMSUI.validate (matchViewed, validationStatus, <?php echo '"'.$randId.'"'; ?>, function() {
					d3.select("#valTd" + matchViewed).text(validationStatus);
					d3.select("#m" + matchViewed).classed(validationStatus, true);
				});
				
				loadSpectrum(matchKeys[matchkeys.indexOf(matchViewed) + 1]);
			}
			
			loadSpectrum(matchKeys[0]);

			//]]>
		</script>


	</body>
</html>

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
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
		<meta http-equiv="content-type" content="text/html; charset=utf-8" />
		<meta name="description" content="common platform for downstream analysis of CLMS data" />
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black">

		<link rel="stylesheet" href="./css/reset.css" />
		<link rel="stylesheet" type="text/css" href="./css/byrei-dyndiv_0.5.css">
		<link rel="stylesheet" href="./css/style.css" />
		<link rel="stylesheet" href="./css/xiNET.css">

		<script type="text/javascript" src="./vendor/signals.js"></script>
        <script type="text/javascript" src="./vendor/byrei-dyndiv_1.0rc1-src.js"></script>
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
       	<script type="text/javascript" src="./vendor/rgbcolor.js"></script>
		
		<script type="text/javascript" src="/js/build/ngl.embedded.min.js"></script>
		<script type="text/javascript" src="./vendor/spectrum.js"></script>
        <!--spectrum dev
        <script type="text/javascript" src="../spectrum/src/SpectrumViewer.js"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKey.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Fragment.js"></script>
		-->
		<script type="text/javascript" src="./vendor/DistanceSlider.js"></script>
		<!--<script type="text/javascript" src="./vendor/crosslinkviewer.js"></script>
        xiNET dev-->
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Init.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/MouseEvents.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/TouchEvents.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Layout.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Refresh.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ToolTips.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Match.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Link.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Protein.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Annotation.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/ProteinLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/ResidueLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ExternalControls.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Rotator.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/xiNET_Storage.js"></script>
               
    </head>
    <body>
<!--
		<div class="dynDiv_setLimit">
-->

			<div class="dynDiv" id="keyPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="showKeyPanel(false);"></i></div>
				<div class="panelInner">
					<div id="key"><img id="defaultLinkKey" src="./images/fig3_1.svg"><br><img id="logo" src="./images/logos/rappsilber-lab-small.png"></div>
				</div>					
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>

			<div class="dynDiv helpPanel" id="helpPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="showHelpPanel(false);"></i></div>
				<div class="panelInner">
					<?php include "./php/help.php" ?>
				</div>
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>

			<div class="dynDiv" id="nglPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="showNglPanel(false);"></i></div>
				<div class="panelInner" id='nglDiv'></div>
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>			
			
			<div class="dynDiv" id="spectrumPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="showSpectrumPanel(false);"></i></div>
<!--
					<div style="height:40px;">
					<button class="btn btn-1 btn-1a" onclick="exportSVG();">SVG</button>
				<button class="btn btn-1 btn-1a" onclick="xlv.reset();">Reset</button>
						<label>losses
		<input checked id="lossyChkBx" 
		onclick="spectrumViewer.showLossy(document.getElementById('lossyChkBx').checked)" 
				type="checkbox">
	</label>
					</div>
-->
				
				<div class="panelInner">
					<div><div  id='spectrumDiv'></div></div>
				</div> 
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>
			

			
<!--
		</div>
-->

		<!-- Main -->
		<div id="main">

			<div class="container">
				<h1 class="page-header">
					<i class="fa fa-home" onclick="window.location = './history.php';" title="Return to search history"></i>
<!--
					http://pterkildsen.com/2014/07/13/styling-a-group-of-checkboxes-as-a-dropdown-via-css-and-javascript/
-->

					<p class="btn">Layout:</p>
					<button class="btn btn-1 btn-1a" onclick="saveLayout();">Save</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.reset();">Reset</button>
					<p class="btn">Export:</p>
					<button class="btn btn-1 btn-1a" onclick="downloadLinks();">Links</button>
					<button class="btn btn-1 btn-1a" onclick="downloadMatches();">Matches</button>
					<button class="btn btn-1 btn-1a" onclick="downloadResidueCount();">Residues</button>
					<button class="btn btn-1 btn-1a" onclick="downloadSVG();">SVG</button>
					<label class="btn">Legend
							<input id="keyChkBx" onclick="showKeyPanel(this.checked);" type="checkbox"></label>
					<label class="btn" style="margin-left:20px;padding-left:0px;">Selection
							<input checked id="selectionChkBx" onclick="showSelectionPanel(this.checked)" type="checkbox"></label>
					<label id="nglCbLabel" class="btn" style="padding-left:0px;">3D
							<input id="nglChkBx" onclick="showNglPanel(this.checked);" type="checkbox"></label>
					<label class="btn" style="padding-left:0px;">Help
							<input id="helpChkBx" onclick="showHelpPanel(this.checked)" type="checkbox"></label>
				</h1>
   	 		</div>

			<div>
				<div id="topDiv"></div>
				<div id=splitterDiv class="horizontalSplitter"><i class="fa fa-times-circle" onclick="showSelectionPanel(false);"></i></div>
				<div id="bottomDiv">
					<div id="selectionDiv" class="panelInner">
						<p>No selection.</p>
						<p>To hide this panel click the X in its top right corner or uncheck the selection checkbox in the top rght of the window. </p>
					</div>
				</div>
			</div>

			<div class="controls">
					<label>A
						<input checked="checked"
								   id="A"
								   onclick="xlv.checkLinks();"
								   type="checkbox"
							/>
					</label>
					<label>B
						<input checked="checked"
								   id="B"
								   onclick="xlv.checkLinks();"
								   type="checkbox"
							/>
					</label>
					<label>C
						<input checked="checked"
								   id="C"
								   onclick="xlv.checkLinks();"
								   type="checkbox"
							/>
					</label>
					<label>?
						<input id="Q"
								   onclick="xlv.checkLinks();"
								   type="checkbox"
							/>
					</label>
					<label>auto
						<input id="AUTO"
								   onclick="xlv.checkLinks();"
								   type="checkbox"
							/>
					</label>
					<div id="scoreSlider">
						<p class="scoreLabel" id="scoreLabel1"></p>
						<input id="slide" type="range" min="0" max="100" step="1" value="0" oninput="sliderChanged()"/>
						<p class="scoreLabel" id="scoreLabel2"></p>
						<p id="cutoffLabel">(cut-off)</p>
					</div> <!-- outlined scoreSlider -->

					<div style='float:right'>
						<label>Self-Links
							<input checked="checked"
								   id="selfLinks"
								   onclick="xlv.showSelfLinks(document.getElementById('selfLinks').checked)"
								   type="checkbox"
							/>
						</label>
						<label>&nbsp;&nbsp;Ambiguous
							<input checked="checked"
								   id="ambig"
								   onclick="xlv.showAmbig(document.getElementById('ambig').checked)"
								   type="checkbox"
							/>
						</label>
						<label style="margin-left:20px;">Annotations:
							<select id="annotationsSelect" onChange="changeAnnotations();">
								<option>None</option>
								<option selected>Custom</option>
								<option>UniprotKB</option>
								<option>SuperFamily</option>
								<option>Lysines</option>
							</select>
						</label>						
<!--
						<label style="margin-left:20px;">Link colours:
-->
							<select id="linkColourSelect" onChange="changeLinkColours();">
								<option selected>SAS dist.</option>
								<option>Euc. dist.</option>
								<option>Search</option>
							</select>
<!--
						</label>
-->
					</div>
				</div>
			</div>

		</div><!-- MAIN -->
        
        <script type="text/javascript" src="./js/networkFrame.js"></script>
		<script type="text/javascript" src="./js/crosslinkNGL.js"></script>
        <script>	
		//<![CDATA[
			
			"use strict";
			
			showSelectionPanel(false);	
			// for NGL
			var stage;
			// for xiNET
			var xlv;
			//~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
			window.addEventListener("load", function() {

				var targetDiv = document.getElementById('topDiv');
				xlv = new xiNET.Controller(targetDiv);
				<?php
					include './php/loadData.php';
					if (file_exists('../annotations.php')){
						 include '../annotations.php';
					}
				?>
				
				var s = d3.map(searchesShown);
				var title = s.keys().toString() + " : " + s.values().toString();//JSON.stringify(searchesShown);
				document.title = title;
				
				if (s.keys().length > 1) {
					showKeyPanel(true);
				}
				
				if (HSA_Active){
						
					/*Distance slider */
					var distSliderDiv = d3.select(targetDiv).append("div").attr("id","sliderDiv");
					var distSlider = new DistanceSlider("sliderDiv", this);
					var stats = d3.select(this.targetDiv).append("div").attr("id","statsDiv");
					distSlider.brushMoved.add(onDistanceSliderChange); //add listener
					//distSlider.brushMoved.add(onDistanceSliderChange3D); //add listener
					var scale = d3.scale.threshold()
						.domain([0, 15, 25])
						.range(['black', '#5AAE61','#FDB863','#9970AB']);
					onDistanceSliderChange(scale);
									
				}
				else {
					document.getElementById('nglCbLabel').setAttribute('style','display:none;');
				}		
				document.getElementById('linkColourSelect').setAttribute('style','display:none;');
					
								
				//register callbacks
				xlv.linkSelectionCallbacks.push(function (selectedLinks){
					//console.log("SELECTED:", selectedLinks);
					var selectionDiv = document.getElementById("selectionDiv");
					var selectedLinkArray = selectedLinks.values();
					var selectedLinkCount = selectedLinkArray.length;
					if (selectedLinkCount === 0) {
						selectionDiv.innerHTML = "<p>No selection.</p>";
					}
					else {
						var out = ""

						var scoresTable = "<table><tr>";
						//~ scoresTable += "<th>Id</th>";
						scoresTable += "<th>Protein1</th>";
						scoresTable += "<th>PepPos1</th>";
						scoresTable += "<th>PepSeq1</th>";
						scoresTable += "<th>LinkPos1</th>";
						scoresTable += "<th>Protein2</th>";
						scoresTable += "<th>PepPos2</th>";
						scoresTable += "<th>PepSeq2</th>";
						scoresTable += "<th>LinkPos2</th>";
						scoresTable += "<th>Score</th>";
						if (xlv.autoValidatedFound === true){
							scoresTable += "<th>Auto</th>";
						}
						if (xlv.manualValidatedFound === true){
							scoresTable += "<th>Manual</th>";
						}
							scoresTable += "<th>Group</th>";
						scoresTable += "<th>Run name</th>";
						scoresTable += "<th>Scan number</th>";
						scoresTable += "</tr>";

						out +=  scoresTable;

						for (var i = 0; i < selectedLinkCount; i++) {
							var aLink = selectedLinkArray[i];
							if (aLink.residueLinks) {//its a ProteinLink
								out += proteinLinkToHTML(aLink);
							}else {//must be ResidueLink
								out += residueLinkToHTML(aLink);						
							}							
						}

						out += "</table>";

						selectionDiv.innerHTML = out;
					}
				});

				xlv.legendCallbacks.push(function (linkColours, domainColours) {
					var coloursKeyDiv = document.getElementById('key');
					if ((linkColours && linkColours.domain().length > 0) || (domainColours && domainColours.domain().length > 0)){
						var table = "<table>";
						var domain, range;
						if (linkColours){
							domain = linkColours.domain();
							range = linkColours.range();
							for (var i = 0; i < domain.length; i ++){
								var temp = new RGBColor(range[i%20]);
								table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:3px;background:"
										+ temp.toRGB() + ";'></div></td><td>"
										+ searchesShown[domain[i]] +"</td></tr>";
							}	
							table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:3px;background:"
										+ "#000;" + ";'></div></td><td>"
										+ "Not unique" +"</td></tr>";
							
						}
						if (domainColours) {
							domain = domainColours.domain();
							range = domainColours.range();
							//table += "<tr style='height:10px;'></tr>";
							for (var i = 0; i < domain.length; i ++){
								//make opaque version of transparent colour on white
								//~ http://stackoverflow.com/questions/2049230/convert-rgba-color-to-rgb
								var temp = new RGBColor(range[i%20]);
								var opaque = {};
								opaque.r = ((1 - 0.6) * 1) + (0.6 * (temp.r / 255));
								opaque.g = ((1 - 0.6) * 1) + (0.6 * (temp.g / 255));
								opaque.b = ((1 - 0.6) * 1) + (0.6 * (temp.b / 255));
								var col = "rgb(" +Math.floor(opaque.r * 255 ) +","
									+ Math.floor(opaque.g * 255) +","+Math.floor(opaque.b * 255)+ ")";
								table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:30px;background:"
										+ col + ";border:1px solid "
										+ range[i%20] + ";'></div></td><td>"
										+ domain[i] +"</td></tr>";
							}
						}
						table = table += "</table>";
						coloursKeyDiv.innerHTML = table;
					}
					else {
						coloursKeyDiv.innerHTML = '<img id="defaultLinkKey" src="./images/fig3_1.svg"><br><img id="logo" src="./images/logos/rappsilber-lab-small.png">';
					}
				});

				//all this init stuff needs looked at and tidied up
				xlv.filter = function (match) {
					var vChar = match.validated;
					if (vChar == 'A' && document.getElementById('A').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == 'B' && document.getElementById('B').checked  && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == 'C' && document.getElementById('C').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == '?' && document.getElementById('Q').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (match.autovalidated && document.getElementById('AUTO').checked && (!match.score || match.score >= xlv.cutOff))  return true;
					else return false;
				};	
				xlv.checkLinks();
				xlv.initLayout();
				xlv.initProteins();				
				changeAnnotations();
				xlv.selfLinksShown = document.getElementById('selfLinks').checked;
				xlv.ambigShown = document.getElementById('ambig').checked;
				initSlider();
			});
			
		//]]>			
		</script>
</html>

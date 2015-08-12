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
       	<script type="text/javascript" src="./vendor/FileSaver.js"></script>
        <script type="text/javascript" src="./vendor/rgbcolor.js"></script>

        <!--spectrum dev-->
<!--
        <script type="text/javascript" src="../spectrum/src/SpectrumViewer.js"></script>
        <script type="text/javascript" src="../spectrum/src/PeptideFragmentationKey.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/PeakAnnotation.js"></script>
-->

		<script type="text/javascript" src="../distance-slider/DistanceSlider.js"></script>
        

        <!--xiNET dev-->
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
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ReadCSV.js"></script>
    </head>
    <body>
		<div class="dynDiv_setLimit"><!-- div limiting movement of floaty panels -->

			<div class="dynDiv" id="keyPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="keyPanel(false);"></i></div>
				<div class="panelInner">
					<div id="key"><img id="defaultLinkKey" src="./images/fig3_1.svg"><br><img id="logo" src="./images/logos/rappsilber-lab-small.png"></div>
				</div>					
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>

			<div class="dynDiv helpPanel" id="helpPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="helpPanel(false);"></i></div>
				<div class="panelInner">
					<table>
						<tbody>
							<tr>
								<td>Toggle the proteins between a bar and a circle</td>
								<td>Click on protein</td>
							</tr>
							<tr>
								<td>Zoom</td>
								<td>Mouse wheel</td>
							</tr>
							<tr>
								<td>Pan</td>
								<td>Click and drag on background</td>
							</tr>
							<tr>
								<td>Move protein</td>
								<td>Click and drag on protein</td>
							</tr>
							<tr>
								<td>Expand bar <br>(increases bar length until sequence is visible)</td>
								<td>Shift_left-click on protein</td>
							</tr>
							<tr>
								<td>Rotate bar</td>
								<td>Click and drag on handles that appear at end of bar</td>
							</tr>
							<tr>
								<td>Hide/show protein (and all links to it)</td>
								<td>Right-click on protein</td>
							</tr>
							<tr>
								<td>Hide links between two specific proteins</td>
								<td>Right click on any link between those proteins</td>
							</tr>
							<tr>
								<td>Show all hidden links</td>
								<td>Right click on background</td>
							</tr>
							<tr>
								<td>'Flip' self-links</td>
								<td>Right-click on self-link</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>
<!--

			<div class="dynDiv" id="spectrumPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="spectrumPanel(false);"></i></div>
				<div class="panelInner">
					<div id='pepFragDiv'></div>
					<div id='graphDiv'></div>
					<button class="btn btn-1 btn-1a" onclick="spectrumViewer.graph.resetScales();" >Reset</button>
				</div>
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>
-->
			
		</div><!-- div limiting movement of floaty panels -->

		<!-- Main -->
		<div id="main">

			<div class="container">
				<h1 class="page-header">
<!--
					<i class="fa fa-home" onclick="window.location = './history.php';"></i>
-->
					<p class="btn">Layout:</p>
					<button class="btn btn-1 btn-1a" onclick="saveLayout();">Save</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.reset();">Reset</button>
					<p class="btn">Export:</p>
					<button class="btn btn-1 btn-1a" onclick="xlv.exportLinksCSV();">Links</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.exportMatchesCSV();">Matches</button>
					<button class="btn btn-1 btn-1a" onclick="residueCount();">Residues</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.exportSVG();">SVG</button>
					<label class="btn">Key<input id="keyChkBx" onclick="keyPanel(this.checked);" type="checkbox"></label>
					<label class="btn" style="padding-left:0px;">Selection<input id="selectionChkBx" onclick="selectionPanel(this.checked)" type="checkbox"></label>
					<label class="btn" style="padding-left:0px;">Help<input id="helpChkBx" onclick="helpPanel(this.checked)" type="checkbox"></label>
				</h1>
   	 		</div>

			<div>
				<div id="topDiv"></div>
				<div id=splitterDiv class="horizontalSplitter"><i class="fa fa-times-circle" onclick="selectionPanel(false);"></i></div>
				<div id="bottomDiv"><div id="selectionPanel" class="panelInner"><p>No selection.</p></div></div>
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
						<label style="margin-left:20px;">Annot.:
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

		<script>
			//<![CDATA[
			
						
			/*
			 * Horizontal splitter JS
			 */
			var marginBottom = 95;
			var minBottomDivHeight = 40;
			var splitterDivHeight = 20;
			var splitterDragging = false;
			var splitterDiv = document.getElementById("splitterDiv");
			var topDiv = document.getElementById("topDiv");
			var bottomDiv = document.getElementById("bottomDiv");
			var main = document;//.getElementById("main");
			splitterDiv.onmousedown = function(evt) {
				splitterDragging = true;
			}
			main.onmousemove = function(evt) {
				if (splitterDragging === true || !evt){
					var element = topDiv;
					var top = 0;
					do {
						top += element.offsetTop  || 0;
						element = element.offsetParent;
					} while(element);
					var topDivHeight;
					if (evt) topDivHeight = evt.pageY - top - (splitterDivHeight / 2);
					else topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
					if (topDivHeight < 0) topDivHeight = 0;
					var bottomDivHeight = window.innerHeight - top - topDivHeight - splitterDivHeight - marginBottom;
					if (bottomDivHeight < minBottomDivHeight){
						bottomDivHeight = minBottomDivHeight;
						topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
					}
					topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
					bottomDiv.setAttribute("style", "height:"+bottomDivHeight+"px;");
				};
			}
			main.onmouseup = function(evt) {
				splitterDragging = false;
			}
			main.onmousemove();
			window.onresize = function(event) {
				main.onmousemove();//event);
			};
			var selChkBx = document.getElementById('selectionChkBx');
			selChkBx.checked = true;
			selectionPanel = function (show) {
				var bd = d3.select('#bottomDiv');
				var splt = d3.select('#splitterDiv');
				if (show) {
					bd.style('display', 'block');
					splt.style('display', 'block');
					main.onmousemove();
				} else {
					bd.style('display', 'none');
					splt.style('display', 'none');
					var element = topDiv;
					var top = 0;
					do {
						top += element.offsetTop  || 0;
						element = element.offsetParent;
					} while(element);
					var topDivHeight = window.innerHeight - top - marginBottom;
					topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
				}
				selChkBx.checked = show;
			}
			
			/* floaty panels JS */
			var kChkBx = document.getElementById('keyChkBx');
			kChkBx.checked = false;
			var hChkBx = document.getElementById('helpChkBx');
			hChkBx.checked = false;
			keyPanel = function (show) {
				var kp = d3.select('#keyPanel');
				if (show) {
					kp.style('display', 'block');
				} else {
					kp.style('display', 'none');
				}
				kChkBx.checked = show;
			}
			helpPanel = function (show) {
				var hp = d3.select('#helpPanel');
				if (show) {
					hp.style('display', 'block');
				} else {
					hp.style('display', 'none');
				}
				hChkBx.checked = show;
			}
/*			spectrumPanel = function (show) {
				var sp = d3.select('#spectrumPanel');
				if (show) {
					sp.style('display', 'block');
				} else {
					sp.style('display', 'none');
					topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
				}
			}
			// Drag Event
			ByRei_dynDiv.api.drag = function () {
			 var
			  mode = ByRei_dynDiv.cache.modus,
			  limit = ByRei_dynDiv.db(1),
			  status = ByRei_dynDiv.db(2);

			 console.log('Div was dragged...'
			  + 'ID: ' + ByRei_dynDiv.api.elem
			  + 'Mode: ' + mode
			  + 'Status: ' + status
			  + 'Limit: ' + limit
			  + '');
			};

			//~ //init spectrum viewer
			var pepFragDiv = document.getElementById('pepFragDiv');
			var graphDiv = document.getElementById('graphDiv');
			spectrumViewer = new SpectrumViewer(pepFragDiv, graphDiv);

			function loadSpectra(id, pepSeq1, linkPos1, pepSeq2, linkPos2){
				spectrumPanel(true);
				var xmlhttp = new XMLHttpRequest();
				var url = "./php/spectra.php";
				var params =  "id=" + id;
				xmlhttp.open("POST", url, true);
				//Send the proper header information along with the request
				xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
					if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
						spectrumViewer.setData(pepSeq1, linkPos1, pepSeq2, linkPos2, xmlhttp.responseText);
					}
				}
				xmlhttp.send(params);
			};
*/
			/*
			* xiNET init JS
			*/

			var xlv;
     		//~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
			window.addEventListener("load", function() {

				var targetDiv = document.getElementById('topDiv');
				xlv = new xiNET.Controller(targetDiv);
				
				<?php
				include './php/loadData.php';
				include '../annotations.php';
				?>
				
				if (HSA_Active){
					/*var distances = [[]];
					d3.csv("../HSA_dist2.csv", function(eucData){
						for (var d = 0; d < eucData.length; d++){
							var euc = eucData[d];
							linkPos1 = parseInt(euc.FromResidue);	
							linkPos2 = parseInt(euc.ToResidue);	
							eucDist = parseFloat(euc.Angstrom);
							var fromAA = euc.FromAA.trim();
							var toAA = euc.ToAA.trim();
							//LYS#SER#TYR#THR
							//~ if (eucDist <= 34 && (fromAA == 'LYS'
								//~ || fromAA == 'SER'
								//~ || fromAA == 'TYR'
								//~ || fromAA == 'THR'
								//~ || toAA == 'LYS'
								//~ || toAA == 'SER'
								//~ || toAA == 'TYR'
								//~ || toAA == 'THR')
								//~ ){
								if (linkPos1 > linkPos2){
									var swap = linkPos2;
									linkPos2 = linkPos1;
									linkPos1 = swap;
								}
								//~ if (!distances[linkPos1]){
									//~ distances[linkPos1] = [];
								//~ }
								if (!distances[linkPos2]){
									distances[linkPos2] = [];
								}
								//console.log(linkPos1 + " " +linkPos2 + " " + eucDist);
								distances[linkPos2][linkPos1] = eucDist.toFixed(4); 
							//~ }
						}
						console.log(JSON.stringify(distances));
					});*/
						var sliderDiv = d3.select(targetDiv).append("div").attr("id","sliderDiv");
						var slider = new DistanceSlider("sliderDiv", this);
						var stats = d3.select(this.targetDiv).append("div").attr("id","statsDiv");
						slider.brushMoved.add(onDistanceSliderChange); //add listener
						var scale = d3.scale.threshold()
							.domain([0, 15, 25])
							.range(['black', '#5AAE61','#FDB863','#9970AB']);
						onDistanceSliderChange(scale);
				
				}
				
				function onDistanceSliderChange(scale){
					var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
					var rc = rLinks.length;
					for (var j = 0; j < rc; j++) {
						var resLink = rLinks[j];
						
						var d = distances[resLink.toResidue][resLink.fromResidue];
						//console.log(d);
						var d = parseFloat(d);
						if (isNaN(d) === true){
							d = -1;
						}
						resLink.colour = scale(d);
						resLink.line.setAttribute("stroke", resLink.colour);
					}				
				}
					
	
					
					
				//~ } else {
					document.getElementById('linkColourSelect').setAttribute('style','display:none;');
				//~ }
				
				initSlider();
				changeAnnotations();
				xlv.selfLinksShown = document.getElementById('selfLinks').checked;
				xlv.ambigShown = document.getElementById('ambig').checked;
				xlv.filter = function (match) {
					var vChar = match.validated;
					if (vChar == 'A' && document.getElementById('A').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == 'B' && document.getElementById('B').checked  && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == 'C' && document.getElementById('C').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (vChar == '?' && document.getElementById('Q').checked && (!match.score || match.score >= xlv.cutOff)) return true;
					else if (match.autovalidated && document.getElementById('AUTO').checked && (!match.score || match.score >= xlv.cutOff))  return true;
					else return false;
				};

				//register callbacks
				xlv.linkSelectionCallbacks.push(function (selectedLinks){
					//console.log("SELECTED:", selectedLinks);
					var selectionDiv = document.getElementById("selectionPanel");
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
							
							
							var d = distances[aLink.toResidue][aLink.fromResidue];
							console.log("D:"+d);
							
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
								//make opauq version of transparnet colour on white
								//~ http://stackoverflow.com/questions/2049230/convert-rgba-color-to-rgb
								var temp = new RGBColor(range[i%20]);
								//~ Target.R = ((1 - Source.A) * BGColor.R) + (Source.A * Source.R)
								//~ Target.G = ((1 - Source.A) * BGColor.G) + (Source.A * Source.G)
								//~ Target.B = ((1 - Source.A) * BGColor.B) + (Source.A * Source.B)
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

				xlv.initLayout();
				xlv.checkLinks();
				xlv.initProteins();

			});

			//used when link clicked
			proteinLinkToHTML = function(proteinLink) {
				var linkInfo = "";
				var resLinks = proteinLink.residueLinks.values();
				var resLinkCount = resLinks.length;
				for (var i = 0; i < resLinkCount; i++) {
					var resLink = resLinks[i];
					linkInfo += residueLinkToHTML(resLink);
				}
				return linkInfo;
			};

			function residueLinkToHTML(residueLink){
				var matches = residueLink.getFilteredMatches();
				var c = matches.length;
				var rows = "";
					for (var j = 0; j < c; j++) {
						var match = matches[j][0];

						var htmlTableRow = "<tr>";
						if (typeof loadSpectra == "function"){
							htmlTableRow = "<tr onclick=\"loadSpectra('"+match.id+"','"+match.pepSeq1+"',"
								+match.linkPos1+",'"+match.pepSeq2+"',"+match.linkPos2+");\">";
						}

						//~ htmlTableRow += "<td><p>" + match.id
							//~ + "</p></td>";
						htmlTableRow += "<td><p>" + match.protein1
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.pepPos1
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.pepSeq1
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.linkPos1
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.protein2
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.pepPos2
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.pepSeq2
							+ "</p></td>";
						htmlTableRow += "<td><p>" + match.linkPos2
							+ "</p></td>";

						htmlTableRow += "<td><p>" +
						((typeof match.score !== 'undefined')? match.score.toFixed(4) : 'undefined')
						+ "</p></td>";

						if (match.controller.autoValidatedFound === true){
							htmlTableRow += "<td><p>" + match.autovalidated
								+ "</p></td>";
						}

						if (match.controller.manualValidatedFound === true){
							htmlTableRow += "<td><p>" + match.validated
								+ "</p></td>";
						}
						htmlTableRow += "<td><p>" + match.group
								+ "</p></td>";
						htmlTableRow += "<td><p>" + match.runName
								+ "</p></td>";
						htmlTableRow += "<td><p>" + match.scanNumber
								+ "</p></td>";
						htmlTableRow += "</tr>";
						rows += htmlTableRow;
					}
					//~ linkInfo += scoresTable;
				//~ }

				return rows;
			}

			function saveLayout () {
				var layout = xlv.getLayout();
				var xmlhttp = new XMLHttpRequest();
				var url = "./php/saveLayout.php";
				//~ console.log('^'+xlv.sid+'^');
				var params =  "sid=" + xlv.sid + "&layout="+encodeURIComponent(layout.replace(/[\t\r\n']+/g,""));
				xmlhttp.open("POST", url, true);
				//Send the proper header information along with the request
				xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
					if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
						console.log(xmlhttp.responseText, true);
					}
				}
				xmlhttp.send(params);
			}

			function changeAnnotations(){
				var annotationSelect = document.getElementById('annotationsSelect');
				xlv.setAnnotations(annotationSelect.options[annotationSelect.selectedIndex].value);
			};

			function changeLinkColours(){
				var linkColourSelect = document.getElementById('linkColourSelect');
				var selectedOption = linkColourSelect.options[linkColourSelect.selectedIndex].value;
				var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
				var rc = rLinks.length;
				alert(selectedOption);
				if (selectedOption === "Search") {
					for (var j = 0; j < rc; j++) {
						rLinks[j].colour = null;
					}				
					xlv.checkLinks();
				} else {				
					for (var j = 0; j < rc; j++) {
						var resLink = rLinks[j];
						var d;
						if (selectedOption === "Search"){
							d = distances[resLink.fromResidue][resLink.toResidue];
						} else {
							d = distances[resLink.toResidue][resLink.fromResidue];
						}
						if (isNan(d)){
							d = 999;
						}
						if (d <= 10) {
							resLink.colour = '#1B7837';
						}
						else if (d <= 15) {
							resLink.colour = '#5AAE61';
						}
						else if (d <= 25) {
							resLink.colour = '#FDB863';
						}
						else if (d <= 30) {
							resLink.colour = '#9970AB';
						}
						else {
							resLink.colour = '#762A83';
						}
						resLink.line.setAttribute("stroke", resLink.colour);
					}
				}
			};

			function initSlider(){
				if (xlv.scores === null){
					d3.select('#scoreSlider').style('display', 'none');
				}
				else {
					document.getElementById('scoreLabel1').innerHTML = "Score:&nbsp;&nbsp;" + getMinScore();
					document.getElementById('scoreLabel2').innerHTML = getMaxScore();
					sliderChanged();
					d3.select('#scoreSlider').style('display', 'inline-block');
				}
			};

			/*slider*/
			var sliderDecimalPlaces = 1;
			function getMinScore(){
				if (xlv.scores){
					var powerOfTen = Math.pow(10, sliderDecimalPlaces);
					return (Math.floor(xlv.scores.min * powerOfTen) / powerOfTen)
							.toFixed(sliderDecimalPlaces);
				}
			}
			function getMaxScore(){
				if (xlv.scores){
					var powerOfTen = Math.pow(10, sliderDecimalPlaces);
					return (Math.ceil(xlv.scores.max * powerOfTen) / powerOfTen)
							.toFixed(sliderDecimalPlaces);
				}
			}
			function sliderChanged(){
				var slide = document.getElementById('slide');
				var powerOfTen = Math.pow(10, sliderDecimalPlaces);

				var cut = ((slide.value / 100)
							* (getMaxScore() - getMinScore()))
							+ (getMinScore() / 1);
				cut = cut.toFixed(sliderDecimalPlaces);
				var cutoffLabel = document.getElementById("cutoffLabel");
				cutoffLabel.innerHTML = '(' + cut + ')';
				xlv.setCutOff(cut);
			}
			//]]>
		</script>
		<?php
			include './php/summaryFunctions.php';
		?>
</html>

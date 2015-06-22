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
<!--	//do we need following?
		<meta name="viewport" content="initial-scale=1, maximum-scale=1">
-->
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black">
		<link rel="icon" type="image/ico" href="./images/favicon.ico">
		
		<link rel="stylesheet" href="./css/reset.css" />
		<link rel="stylesheet" href="./css/jquery-ui.css">
		<link rel="stylesheet" href="./css/style.css" />
		<link rel="stylesheet" href="./css/xiNET.css">
		
<!--
        <script type="text/javascript" src="./vendor/jquery.js"></script>
        <script type="text/javascript" src="./vendor/jquery-ui.js"></script>
-->
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
       	<script type="text/javascript" src="./vendor/FileSaver.js"></script>
        <script type="text/javascript" src="./vendor/rgbcolor.js"></script>   
<!--
         <script type="text/javascript" src="./vendor/crosslinkviewer.js"></script>
-->
      
        <!--spectrum dev-->
<!--
        <script type="text/javascript" src="../spectrum/src/SpectrumViewer.js"></script>
        <script type="text/javascript" src="../spectrum/src/PeptideFragmentationKey.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/PeakAnnotation.js"></script>
-->
        
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
<!--
		<div id="wrapper">
			<div id='spectrum'>
				<div id='spectrum_inner_div'>
					<div id='pepFragDiv'></div>
					<div id='graphDiv'></div>
					<button class="btn btn-1 btn-1a" style="margin:5px;float:right;" onclick="spectrumViewer.graph.resetScales();" >Reset</button>
				</div>
			</div>
		</div>	
-->
		<!-- Main -->
		<div id="main">

			<div class="container">   	 				
				<h1 class="page-header">
					<i class="fa fa-home" onclick="window.location = './history.php';"></i>
					<p class="btn">Layout:</p>
					<button class="btn btn-1 btn-1a" onclick="saveLayout();">
							Save
					</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.reset();">
							Reset
					</button>
<!--
					<p class="btn">Summaries:</p>
					<button class="btn btn-1 btn-1a" onclick="linkSummary();">
							Links
					</button>
					<button class="btn btn-1 btn-1a" onclick="residueSummary();">
							Residues
					</button>
-->
					<p class="btn">Exports:</p>
					<button class="btn btn-1 btn-1a" onclick="xlv.exportCSV();">
							CSV
					</button>
					<button class="btn btn-1 btn-1a" onclick="xlv.exportSVG();">SVG</button>							
<!--
					<div style='float:right'>
-->
						<label class="btn">Legend<input id="selection" onclick="toggleLegendPanel()" type="checkbox">
						</label>
						<label class="btn">Help<input id="help" onclick="toggleHelpPanel()" type="checkbox">
						</label>
<!--
					</div>
-->
				</h1>
   	 		</div>				   	
			
			<div>
				<div id="topDiv">
				</div>
				<div id=splitterDiv class="horizontalSplitter"></div>
				
				<div id="bottomDiv" class="overlay-box">
						<p>No selection.</p>
				</div>
				<script>
				//<![CDATA[		
					var marginBottom = 95;
					var minBottomDivHeight = 40;
					var splitterDivHeight = 20;
					var splitterDragging = false;
					var splitterDiv = document.getElementById("splitterDiv");
					var topDiv = document.getElementById("topDiv");
					var bottomDiv = document.getElementById("bottomDiv");
					var main = document.getElementById("main");
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
						main.onmousemove(event);
					};
					
				//]]>				  
				</script>
			</div>
			
			
			<div class="controlsexamplespage">						
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
								<option>UniprotKB</option> 
								<option>SuperFamily</option>  
								<option>Lysines</option>  
							</select>
						</label>	
					</div>		
				</div>
				<script type="text/javascript">	
					//<![CDATA[					
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
			</div>					
		</div><!-- MAIN -->
	
		<!-- Slidey panels -->	
		<div class="overlay-box" id="helpPanel">
			<table class="overlay-table"  bordercolor="#eee" >
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
			</table> 
		</div>	
		<div class="overlay-box" id="legendPanel">
			<div id="colours"><img id="legend" src="./images/fig3_1.svg"><br><img id="logo" src="./images/logos/rappsilber-lab-small.png"></div>
<!--
			<div id="colours"></div>
-->
		</div>	
		<script type="text/javascript">
			//<![CDATA[
			helpShown = false;
			legendShown = false;
			function toggleHelpPanel() {
				if (helpShown){
					hideHelpPanel();
				}
				else {
					showHelpPanel();
				}
			}
			
			function toggleLegendPanel() {
				if (legendShown){
					hideLegendPanel();
				}
				else {
					showLegendPanel();
				}
			}
			
			function showHelpPanel() {
					helpShown = true;
					d3.select("#helpPanel").transition().style("height", "550px").style("top", "100px").duration(700);
			}
			function hideHelpPanel() {
					helpShown = false;
					d3.select("#helpPanel").transition().style("height", "0px").style("top", "-95px").duration(700);
			}
			function showLegendPanel() {
					legendShown = true;
					d3.select("#legendPanel").transition().style("height", "550px").style("top", "100px").duration(700);
			}
			function hideLegendPanel() {
					legendShown = false;
					d3.select("#legendPanel").transition().style("height", "0px").style("top", "-95px").duration(700);

			}
			//]]>
		</script>
		
		<script>
     		//<![CDATA[
     		//~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
			window.addEventListener("load", function() {
				
				var targetDiv = document.getElementById('topDiv');
				xlv = new xiNET.Controller(targetDiv);
				<?php
				include './php/loadData.php';
				?>
				xlv.initLayout();
				xlv.initProteins();
				
				initSlider();
				changeAnnotations();
				xlv.selfLinksShown = document.getElementById('selfLinks').checked;
				xlv.ambigShown = document.getElementById('ambig').checked;
				xlv.filter = function (match) {
					var vChar = match.validated;
					if (vChar == 'A' && document.getElementById('A').checked && (match.score >= xlv.cutOff)) return true;
					else if (vChar == 'B' && document.getElementById('B').checked  && (match.score >= xlv.cutOff)) return true;
					else if (vChar == 'C' && document.getElementById('C').checked && (match.score >= xlv.cutOff)) return true;
					else if (vChar == '?' && document.getElementById('Q').checked && (match.score >= xlv.cutOff)) return true;
					else if (match.autovalidated && document.getElementById('AUTO').checked && (match.score >= xlv.cutOff))  return true;
					else return false;
				};
				xlv.checkLinks();
				
				//register callbacks
				xlv.linkSelectionCallbacks.push(function (selectedLinks){
					//console.log("SELECTED:", selectedLinks);
					var selectionDiv = document.getElementById("bottomDiv");
					var selectedLinkArray = selectedLinks.values();
					var selectedLinkCount = selectedLinkArray.length;
					if (selectedLinkCount === 0) {
						selectionDiv.innerHTML = "<p>No selection.</p>";
					} 
					else {
						var out = ""
						for (var i = 0; i < selectedLinkCount; i++) {
							var aLink = selectedLinkArray[i]; 
							if (aLink.residueLinks) {//its a ProteinLink
								out += proteinLinkToHTML(aLink);
							}else {//must be ResidueLink
								out += residueLinkToHTML(aLink);
							}
						}
						selectionDiv.innerHTML = out;
					}
				});	
				
                xlv.legendCallbacks.push(function (domainColours) {
					var coloursKeyDiv = document.getElementById('colours');
					
					var table = "<table>";
					
					if (domainColours){
						var domain = domainColours.domain();
						//~ console.log("Domain:"+domain);
						var range = domainColours.range();
						//~ console.log("Range:"+range);
						table += "<tr style='height:10px;'></tr>";
						for (var i = 0; i < domain.length; i ++){
							//make transparent version of colour
							var temp = new RGBColor(range[i%20]);
							var trans = "rgba(" +temp.r+","+temp.g+","+temp.b+ ", 0.6)"
							table += "<tr><td style='width:75px;margin:10px;background:"
									+ trans + ";border:1px solid " 
									+ range[i%20] + ";'></td><td>"
									+ domain[i] +"</td></tr>";
							//~ console.log(i + " "+ domain[i] + " " + range[i]);
						}
					}
					table = table += "</table>";
					coloursKeyDiv.innerHTML = table;					
				});					
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
				var linkInfo = "";
				if (c > 0){
					var linkInfo = "<h5>" + residueLink.proteinLink.fromProtein.name 
								+ " [" + residueLink.proteinLink.fromProtein.id
								+ "] to " + residueLink.proteinLink.toProtein.name 
								+ " [" + residueLink.proteinLink.toProtein.id
								+ "], residue " + residueLink.fromResidue 
								+ " to  residue " + residueLink.toResidue;
					linkInfo += ", " + c + " match";
					if (c > 1){
						linkInfo += "es:</h5>";
					} else {
						linkInfo += ":</h5>";
					}
					
					var scoresTable = "<table><tr>";				
					scoresTable += "<th>Id</th>";
					scoresTable += "<th>Protein1</th>";
					scoresTable += "<th>PepPos1</th>";
					scoresTable += "<th>PepSeq1</th>";
					scoresTable += "<th>LinkPos1</th>";
					scoresTable += "<th>Protein2</th>";
					scoresTable += "<th>PepPos2</th>";
					scoresTable += "<th>PepSeq2</th>";
					scoresTable += "<th>LinkPos2</th>";
					scoresTable += "<th>Score</th>";
					if (residueLink.controller.autoValidatedFound === true){
						scoresTable += "<th>Auto</th>";
					}
					if (residueLink.controller.manualValidatedFound === true){
						scoresTable += "<th>Manual</th>";
					}				
					scoresTable += "</tr>";
					
					for (var j = 0; j < c; j++) {
						var match = matches[j][0];
						
						var htmlTableRow = "<tr>";
						if (typeof loadSpectra == "function"){
							htmlTableRow = "<tr onclick=\"loadSpectra('"+match.id+"','"+match.pepSeq1+"',"
								+match.linkPos1+",'"+match.pepSeq2+"',"+match.linkPos2+");\">";
						}
						
						htmlTableRow += "<td><p>" + match.id
							+ "</p></td>";
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
						
						htmlTableRow += "</tr>";
						scoresTable += htmlTableRow;
					}
					scoresTable += "</table><p>&nbsp;</p>";
					linkInfo += scoresTable;
				}
				
				return linkInfo;
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
			  			
			//forced to use jquery dialog for floaty internal frame
	/*		$("#spectrum").dialog({resizable:true, autoOpen: false, width: 600, height: 450});
			//init spectrum viewer
			var pepFragDiv = document.getElementById('pepFragDiv');
			var graphDiv = document.getElementById('graphDiv');
			spectrumViewer = new SpectrumViewer(pepFragDiv, graphDiv);
			
			function loadSpectra(id, pepSeq1, linkPos1, pepSeq2, linkPos2){
				//jquery dialog open
				$( "#spectrum" ).dialog("open");
				
				//~ var out = id +"|"+ pepSeq1 +"|"+ linkPos1 +"|"+ pepSeq2 +"|"+ linkPos2;
				//~ var spectrumInnerDiv = document.getElementById("spectrum_inner_div");
				//~ spectrumInnerDiv.innerHTML = out; 
				spectrumViewer.clear();
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
			}*/
			//]]>
		</script>
	</body>
</html>

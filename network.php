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
        
        <meta http-equiv="cache-control" content="max-age=0" />
        <meta http-equiv="cache-control" content="no-cache" />
        <meta http-equiv="expires" content="0" />
        <meta http-equiv="expires" content="Tue, 01 Jan 1980 1:00:00 GMT" />
        <meta http-equiv="pragma" content="no-cache" />
        
		<meta name="description" content="common platform for downstream analysis of CLMS data" />
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black">

		<link rel="stylesheet" href="./css/reset.css" />
		<link rel="stylesheet" type="text/css" href="./css/byrei-dyndiv_0.5.css">
		<link rel="stylesheet" href="./css/style.css" />
		<link rel="stylesheet" href="./css/xiNET.css">
        
        <link rel="stylesheet" href="./css/matrix.css">
        <link rel="stylesheet" href="./css/tooltip.css">
        <link rel="stylesheet" href="./css/c3.css">
        <link rel="stylesheet" href="./css/minigram.css">
        <link rel="stylesheet" href="./css/ddMenuViewBB.css">

		<script type="text/javascript" src="./vendor/signals.js"></script>
        <script type="text/javascript" src="./vendor/byrei-dyndiv_1.0rc1-src.js"></script>
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
       	<script type="text/javascript" src="./vendor/rgbcolor.js"></script>
		
		<script type="text/javascript" src="./vendor/ngl.embedded.min.js"></script>
		<script type="text/javascript" src="./vendor/crosslink.js"></script>
		
		<!-- <script type="text/javascript" src="./vendor/DistanceSlider.js"></script> -->

		<script type="text/javascript" src="./vendor/spectrum.js"></script>
        <!--spectrum dev
        <script type="text/javascript" src="../spectrum/src/SpectrumViewer.js"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKey.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Fragment.js"></script>-->
	      
        
        <!-- <script type="text/javascript" src="../distogram/distogram.js"></script> -->
        <script type="text/javascript" src="./vendor/c3.js"></script>
        <script type="text/javascript" src="./vendor/underscore.js"></script>
        <script type="text/javascript" src="./vendor/zepto.js"></script>
        <script type="text/javascript" src="./vendor/backbone.js"></script>
        
       	<script type="text/javascript" src="./vendor/CLMS_model.js"></script>
		<!--
        CLMS-model dev 
        <script type="text/javascript" src="../CLMS-model/src/controller/Init.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/model/Match.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/model/Protein.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/model/Annotation.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/model/ProteinLink.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/model/CrossLink.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/controller/xiNET_Storage.js"></script>-->
                
       <script type="text/javascript" src="./vendor/crosslinkviewer.js"></script>

	<!-- 	<script type="text/javascript" src="../crosslink-viewer/src/CrosslinkViewerBB.js"></script>-->

    
        <!-- Backbone models/views loaded after Backbone itself, otherwise need to delay their instantiation somehow -->
        <script type="text/javascript" src="./js/Utils.js"></script>
        <script type="text/javascript" src="./js/modelUtils.js"></script>
        <script type="text/javascript" src="./vendor/distogramBB.js"></script>
        <script type="text/javascript" src="./vendor/DistanceSliderBB.js"></script>
        <script type="text/javascript" src="./js/filterViewBB.js"></script>
        <script type="text/javascript" src="./js/filterModelBB.js"></script>
        <script type="text/javascript" src="./js/matrix.js"></script>
        <script type="text/javascript" src="./js/tooltipViewBB.js"></script>
        <script type="text/javascript" src="./js/tooltipModelBB.js"></script>
        <script type="text/javascript" src="./js/matrix.js"></script>   
        <script type="text/javascript" src="./js/minigramViewBB.js"></script>   
        <script type="text/javascript" src="./js/ddMenuViewBB.js"></script>   
		<script type="text/javascript" src="./js/NGLViewBB.js"></script>
    </head>

    <body>
<!--
		<div class="dynDiv_setLimit">
-->
			<div class="dynDiv" id="spectrumPanel">
				<div class="dynDiv_moveParentDiv"><i class="fa fa-times-circle" onclick="showSpectrumPanel(false);selectionPanel.clearTableHighlights();"></i></div>

				<div style="height:40px;">
					<label  class="btn">loss labels
						<input id="lossyChkBx" 
							onclick="spectrumViewer.showLossy(document.getElementById('lossyChkBx').checked)" 
						type="checkbox">
					</label>
					<button class="btn btn-1 btn-1a" onclick="spectrumViewer.resize();">Reset zoom</button>
					<button class="btn btn-1 btn-1a" onclick="downloadSpectrumSVG();">Download image</button>		
				</div>
				
				<div class="panelInner">
					<div id='spectrumDiv'></div>
				</div> 
				<div class="dynDiv_resizeDiv_tl"></div>
				<div class="dynDiv_resizeDiv_tr"></div>
				<div class="dynDiv_resizeDiv_bl"></div>
				<div class="dynDiv_resizeDiv_br"></div>
			</div>
			
            <div class="dynDiv" id="keyPanel"></div>
            <div class="dynDiv" id="nglPanel"></div>
            <div class="dynDiv" id="distoPanel"></div>
            <div class="dynDiv" id="matrixPanel"></div>
			
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
					<button class="btn btn-1 btn-1a" id="save" onclick="saveLayout();">Save</button>
<!--
					<button class="btn btn-1 btn-1a" onclick="xlv.reset();">Reset</button>
-->
                    <p id="expDropdownPlaceholder"></p>
                    <p id="viewDropdownPlaceholder"></p>
                    
					<!-- <label class="btn" style="margin-left:20px;padding-left:0px;">Selection
							<input checked id="selectionChkBx" onclick="showSelectionPanel(this.checked)" type="checkbox"></label> -->
                    <span id="keyChkBxPlaceholder"></span>
					<span id="nglChkBxPlaceholder"></span>
                    <span id="distoChkBxPlaceholder"></span>
                    <span id="matrixChkBxPlaceholder"></span>
                    
                    <a href="./html/help.html" target="_blank" class="btn btn-1 btn-1a righty">Help</a>
				</h1>
   	 		</div>

			<div>
				<div id="topDiv"></div>
				<div id=splitterDiv class="horizontalSplitter"></div>
				<div id="bottomDiv">
					<div id="selectionDiv" class="panelInner">
					</div>
				</div>
			</div>

			<div class="controls">
                    <span id="filterPlaceholder"></span>
                
					<div style='float:right'>

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
        

        <script>	
		//<![CDATA[
			
			"use strict";
			
            var CLMSUI = CLMSUI || {};
            
            // http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views
            CLMSUI.vent = {};
            _.extend (CLMSUI.vent, Backbone.Events);
            
			            
            
			//showSelectionPanel(false);	
			// for NGL
			NGL.mainScriptFilePath = "./vendor/ngl.embedded.min.js";  
			var stage;
			// for xiNET
			var tempModelMaker;
            
            var targetDiv = document.getElementById('topDiv');
				
            tempModelMaker = new xiNET.Controller(targetDiv);
            <?php
                include './php/loadData.php';
                if (file_exists('../annotations.php')){
                    // include '../annotations.php';
                }
            ?>
			CLMSUI.xlv = tempModelMaker;
            //~ CLMSUI.clmsModel = Backbone.Model.extend();
            CLMSUI.clmsModelInst = new window.CLMS.DataModelBB ({ 
                    interactors: tempModelMaker.proteins, //map
                    proteinLinks: tempModelMaker.proteinLinks, //map
                    crossLinks: tempModelMaker.crossLinks, //map
                    matches: tempModelMaker.matches //array
            });

            CLMSUI.distancesModel = Backbone.Model.extend({
                flattenedDistances: function () {
                    return CLMSUI.modelUtils.flattenDistanceMatrix (this.get("distances"));
                }
            });
            CLMSUI.distancesInst = new CLMSUI.distancesModel ({
                distances: distances
            });
            
            CLMSUI.filterModelInst = new CLMSUI.FilterModelBB ({
                scores: tempModelMaker.scores
            });
            
            console.log ("CLMSUI", CLMSUI, "xinet", tempModelMaker);

			//~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
			window.addEventListener("load", function() {
            
                // Showing multiple searches at once
				var s = d3.map(CLMSUI.searchesShown);
				var title = s.keys().toString() + " : " + s.values().toString();//JSON.stringify(searchesShown);
				document.title = title;
				
				if (s.keys().length > 1) {
					//showKeyPanel(true);
					document.getElementById('save').setAttribute('style','display:none;');
				}
                
                
                var filterViewGroup = new CLMSUI.FilterViewBB ({
                    el: "#filterPlaceholder", 
                    model: CLMSUI.filterModelInst
                });
                

                
                var miniDistModelInst = new CLMSUI.modelUtils.MinigramModelBB ();
                miniDistModelInst.data = function() {
                    var matches = CLMSUI.modelUtils.flattenMatches (CLMSUI.clmsModelInst.get("matches"));
                    return [matches, []];
                };

                var miniDistView = new CLMSUI.MinigramViewBB ({
                    el: "#filterPlaceholderSliderHolder",
                    model: miniDistModelInst,
                    myOptions: {
                        maxX: 0,    // let data decide
                        seriesNames: ["Matches", "Decoys"],
                        scaleOthersTo: "Matches",
                        xlabel: "Score",
                        ylabel: "Count",
                        height: 50
                    }
                });
                
                
                // When the range changes on the mini histogram model pass the values onto the filter model
                CLMSUI.filterModelInst.listenTo (miniDistModelInst, "change", function (model) {
                    this.set ("cutoff", [model.get("domainStart"), model.get("domainEnd")]); 
                }, this);
                
                // If the ClmsModel matches attribute changes then tell the mini histogram view
                miniDistView
                    .listenTo (CLMSUI.clmsModelInst, "change:matches", this.render) // if the matches changes (likely?) need to re-render the view too
                    // below should be bound eventually if filter changes, but c3 currently can't change brush pos without internal poking about
                    //.listenTo (this.model.get("filterModel"), "change", this.render)  
                ;       
            
                
                // Generate checkboxes
                CLMSUI.utils.addCheckboxBackboneView (d3.select("#nglChkBxPlaceholder"), {label:"3D", eventName:"nglShow", labelFirst: false});
                CLMSUI.utils.addCheckboxBackboneView (d3.select("#distoChkBxPlaceholder"), {label:"Distogram", eventName:"distoShow", labelFirst: false});
                CLMSUI.utils.addCheckboxBackboneView (d3.select("#matrixChkBxPlaceholder"), {label:"Matrix", eventName:"matrixShow", labelFirst: false});
                CLMSUI.utils.addCheckboxBackboneView (d3.select("#keyChkBxPlaceholder"), {label:"Legend", eventName:"keyShow", labelFirst: false});
                
                // Add them to a drop-down menu (this rips them away from where they currently are)
                new CLMSUI.DropDownMenuViewBB ({
                    el: "#viewDropdownPlaceholder",
                    model: CLMSUI.clmsModelInst,
                    myOptions: {
                        title: "View",
                        menu: [
                            {id: "nglChkBxPlaceholder"},
                            {id: "distoChkBxPlaceholder"},
                            {id: "matrixChkBxPlaceholder"},
                            {id: "keyChkBxPlaceholder"},
                        ]
                    }
                })
                
				
				if (HSA_Active){
						
					/*Distance slider */
					var distSliderDiv = d3.select(targetDiv).append("div").attr("id","sliderDiv");
					var distSlider = new CLMSUI.DistanceSliderBB ({el: "#sliderDiv", model: CLMSUI.rangeModelInst });
					distSlider.brushMoved.add(onDistanceSliderChange); //add listener
                    distSlider.brushmove();
                    
                    //var stats = d3.select(this.targetDiv).append("div").attr("id","statsDiv");
					//distoViewer.setData(xlv.distances,xlv);				
				}
				else {
                    document.getElementById('viewDropdownPlaceholder').setAttribute('style','display:none;');
					//document.getElementById('nglCbLabel').setAttribute('style','display:none;');
					//document.getElementById('distoChkBxPlaceholder').setAttribute('style','display:none;');
                    //document.getElementById('matrixChkBxPlaceholder').setAttribute('style','display:none;');
				}		
				document.getElementById('linkColourSelect').setAttribute('style','display:none;');
					
                new CLMSUI.DropDownMenuViewBB ({
                    el: "#expDropdownPlaceholder",
                    model: CLMSUI.clmsModelInst,
                    myOptions: {
                        title: "Export",
                        menu: [
                            {name: "Links", func: downloadLinks}, {name:"Matches", func: downloadMatches}, 
                            {name: "Residues", func: downloadResidueCount}, {name: "SVG", func: downloadSVG}
                        ]
                    }
                })
                
                // This generates the legend div, we don't keep a handle to it - the event object has one
                new CLMSUI.utils.KeyViewBB ({
                    el: "#keyPanel",
                    displayEventName: "keyShow",
                });
                /*
				CLMSUI.filterFunc = function () {
                    //xlv.checkLinks(); // needs fixed.
                    distoViewer.render ();
                }
                */
                //filteredModel.set("matches") = rawModel.get("matches").filter(function(match) { return CLMSUI.filterModelInst.filter (match); });
                // then bung crosslinks on top either with own filter or build from matches ^^^
                /*
                
				//register callbacks
				xlv.linkSelectionCallbacks.push(selectionPanel.updateTable);

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
										+ xlv.searchesShown[domain[i]] +"</td></tr>";
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
				*/
				window.onresize();
				
			});
			
		//]]>			
		</script>
    
        <script type="text/javascript" src="./js/SelectionPanel.js"></script>
		<script type="text/javascript" src="./js/networkFrame.js"></script>
		<script type="text/javascript" src="./js/downloads.js"></script>
</html>

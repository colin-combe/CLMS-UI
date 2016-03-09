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
        <link rel="stylesheet" href="./css/alignViewBB.css">
        <link rel="stylesheet" href="./css/selectionViewBB.css">
        <link rel="stylesheet" href="./css/circularViewBB.css">
        <link rel="stylesheet" href="./css/spectrumViewWrapper.css">

        <script type="text/javascript" src="./vendor/byrei-dyndiv_1.0rc1-src.js"></script>
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
       	<script type="text/javascript" src="./vendor/rgbcolor.js"></script>

		<script type="text/javascript" src="./vendor/ngl.embedded.min.js"></script>
		<script type="text/javascript" src="./vendor/crosslink.js"></script>

		<!-- <script type="text/javascript" src="./vendor/DistanceSlider.js"></script> -->


        <!-- <script type="text/javascript" src="../distogram/distogram.js"></script> -->
        <script type="text/javascript" src="./vendor/c3.js"></script>
        <script type="text/javascript" src="./vendor/split.js"></script>
        <script type="text/javascript" src="./vendor/svgexp.js"></script>
        
        <script type="text/javascript" src="./vendor/underscore.js"></script>
        <script type="text/javascript" src="./vendor/zepto.js"></script>
        <script type="text/javascript" src="./vendor/backbone.js"></script>


<!--
       	<script type="text/javascript" src="./vendor/CLMS_model.js"></script>
-->

        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SearchResultsModel.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SpectrumMatch.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/Protein.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/AnnotatedRegion.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/CrossLink.js"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/util/xiNET_Storage.js"></script>

<!--
       <script type="text/javascript" src="./vendor/crosslinkviewer.js"></script>
-->

	 	<script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/CrosslinkViewerBB.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedProtein.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedCrossLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/Rotator.js"></script>

        <!-- Backbone models/views loaded after Backbone itself, otherwise need to delay their instantiation somehow -->
        <script type="text/javascript" src="./js/Utils.js"></script>
        <script type="text/javascript" src="./js/models.js"></script>
        <script type="text/javascript" src="./js/compositeModelType.js"></script>
        <script type="text/javascript" src="./js/modelUtils.js"></script>
        <script type="text/javascript" src="./js/distogramViewBB.js"></script>
        <script type="text/javascript" src="./js/DistanceSliderBB.js"></script>
        <script type="text/javascript" src="./js/filterViewBB.js"></script>
        <script type="text/javascript" src="./js/matrixViewBB.js"></script>
        <script type="text/javascript" src="./js/tooltipViewBB.js"></script>
        <script type="text/javascript" src="./js/minigramViewBB.js"></script>   
        <script type="text/javascript" src="./js/ddMenuViewBB.js"></script>   
		<script type="text/javascript" src="./js/NGLViewBB.js"></script>
        <script type="text/javascript" src="./js/bioseq32.js"></script>
        <script type="text/javascript" src="./js/alignModelType.js"></script>
        <script type="text/javascript" src="./js/alignViewBB3.js"></script>
        <script type="text/javascript" src="./js/alignSettingsViewBB.js"></script>
        <script type="text/javascript" src="./js/selectionTableViewBB.js"></script>
        <script type="text/javascript" src="./js/circularViewBB.js"></script>
        <script type="text/javascript" src="./js/linkColourAssignment.js"></script>
        <script type="text/javascript" src="./js/spectrumViewWrapper.js"></script>
        
                
        <script type="text/javascript" src="../spectrum/src/model.js"></script>
        <script type="text/javascript" src="../spectrum/src/SpectrumView2.js"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKeyView.js"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKey.js"></script>
        <script type="text/javascript" src="../spectrum/src/FragKey/KeyFragment.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js"></script>		
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js"></script>	
        <script type="text/javascript" src="../spectrum/src/graph/Fragment.js"></script>
        <script type="text/javascript" src="../spectrum/src/graph/IsotopeCluster.js"></script>	
    </head>

    <body>

        <div class="dynDiv" id="spectrumPanelWrapper"></div>
        <div class="dynDiv" id="keyPanel"></div>
        <div class="dynDiv" id="nglPanel"></div>
        <div class="dynDiv" id="distoPanel"></div>
        <div class="dynDiv" id="matrixPanel"></div>
        <div class="dynDiv" id="alignPanel"></div>
        <div class="dynDiv" id="circularPanel"></div>


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
					<button class="btn btn-1 btn-1a" onclick="crosslinkViewer.reset();">Reset</button>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
                    <p id="expDropdownPlaceholder"></p>
                    <p id="viewDropdownPlaceholder"></p>
                    
					<!-- <label class="btn" style="margin-left:20px;padding-left:0px;">Selection
							<input checked id="selectionChkBx" onclick="showSelectionPanel(this.checked)" type="checkbox"></label> -->
                    
                    <!--
                    <span id="keyChkBxPlaceholder"></span>
					<span id="nglChkBxPlaceholder"></span>
                    <span id="distoChkBxPlaceholder"></span>
                    <span id="matrixChkBxPlaceholder"></span>
                    <span id="alignChkBxPlaceholder"></span>
                    -->
                    <span id="circularChkBxPlaceholder"></span>
                    <span id="spectrumChkBxPlaceholder"></span>
                    
                    <a href="./html/help.html" target="_blank" class="btn btn-1 btn-1a righty">Help</a>
				</h1>
   	 		</div>

			<div class="mainContent">
				<div id="topDiv">
					<div id="networkDiv"></div>
					<div id="sliderDiv"></div>
				</div>
				<div id="bottomDiv">
				</div>
			</div>

			<div class="controls">
                    <span id="filterPlaceholder"></span>

					<div style='float:right'>

<!--
                        <label style="margin-left:20px;"><span>Annotations:</span>
							<select id="annotationsSelect" onChange="changeAnnotations();">
								<option>None</option>
								<option selected>Custom</option>
								<option>UniprotKB</option>
								<option>SuperFamily</option>
								<option>Lysines</option>
							</select>
						</label>
-->
						<label style="margin-left:20px;">Link colours:
							<select id="linkColourSelect" onChange="changeLinkColours();">
								<option selected>Default</option>
								<option>Group</option>
<!--
								<option>SAS dist.</option>
-->
<!--
								<option>Euclidean dist.</option>
-->

							</select>
						</label>
					</div>
				</div>
			</div>

		</div><!-- MAIN -->
        

        <script>	
		//<![CDATA[
			
            var CLMSUI = CLMSUI || {};
            

            // http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views
            CLMSUI.vent = {};
            _.extend (CLMSUI.vent, Backbone.Events);

			// for NGL
			NGL.mainScriptFilePath = "./vendor/ngl.embedded.min.js";
			var stage;
            
            <?php
                include './php/loadData.php';
                if (file_exists('../annotations.php')){
                    //include '../annotations.php';
                }
            ?>
            
            CLMSUI.init = CLMSUI.init || {};
            
            // only when sequences and blosums have been loaded, if only one or other either no align models = crash, or no blosum matrices = null
            var allDataLoaded = _.after (2, function() {
                console.log ("BOTH SYNCS DONE :-)");
                CLMSUI.blosumCollInst.trigger ("modelSelected", CLMSUI.blosumCollInst.models[3]);  
                allDataAndWindowLoaded();
            });
            
            // function runs only when sequences and blosums have been loaded, and when window is loaded
            var allDataAndWindowLoaded = _.after (2, function () {
                console.log ("DATA LOADED AND WINDOW LOADED");
                CLMSUI.init.viewsThatNeedAsyncData();
                // ByRei_dynDiv by default fires this on window.load (like this whole block), but that means the KeyView is too late to be picked up
                // so we run it again here, doesn't do any harm
                ByRei_dynDiv.init.main();
            });
            
            CLMSUI.init.models = function () {
                
                // define alignment model and listeners first, so they're ready to pick up events from other models
                CLMSUI.alignmentCollectionInst = new CLMSUI.BackboneModelTypes.AlignCollection ();

                CLMSUI.alignmentCollectionInst.listenToOnce (CLMSUI.vent, "uniprotDataParsed", function (clmsModel) {
                    console.log("Interactors", clmsModel.get("interactors"));
                    
                    clmsModel.get("interactors").forEach (function (entry) {
                        console.log ("entry", entry);
                        if (!entry.isDecoy()) {
                            this.add ([{
                                "id": entry.id,
                                "displayLabel": entry.name.replace("_", " "),
                                "refID": "Search",
                                "refSeq": entry.sequence, 
                                "compIDs": this.mergeArrayAttr (entry.id, "compIDs", ["Canonical"]),
                                "compSeqs": this.mergeArrayAttr (entry.id, "compSeqs", [entry.canonicalSeq]),
                            }]);
                        }
                    }, this);

                    allDataLoaded();

                    console.log ("ASYNC. uniprot sequences poked to collection", this);
                });


                // Collection of blosum matrices that will be fetched from a json file
                CLMSUI.blosumCollInst = new CLMSUI.BackboneModelTypes.BlosumCollection(); 

                // when the blosum Collection is fetched (an async process), we select one of its models as being selected
                CLMSUI.blosumCollInst.listenToOnce (CLMSUI.blosumCollInst, "sync", function() {
                    console.log ("ASYNC. blosum models loaded");
                    allDataLoaded();
                });    

                // and when the blosum Collection fires a modelSelected event (via bothSyncsDone) it is accompanied by the chosen blosum Model
                // and we set the alignmentCollection to listen for this and set all its Models to use that blosum Model as the initial value   
                CLMSUI.alignmentCollectionInst.listenTo (CLMSUI.blosumCollInst, "modelSelected", function (blosumModel) {
                    // sets alignmentModel's scoreMatrix, the change of which then triggers an alignment 
                    // (done internally within alignmentModelInst)   
                    this.models.forEach (function (alignModel) {
                        alignModel.set ("scoreMatrix", blosumModel);
                    }); 
                });


                // This SearchResultsModel is what fires (sync or async) the uniprotDataParsed event we've set up a listener for above ^^^
                var options = {rawInteractors: tempInteractors, rawMatches: tempMatches};
                CLMSUI.clmsModelInst = new window.CLMS.model.SearchResultsModel (options);

                CLMSUI.filterModelInst = new CLMSUI.BackboneModelTypes.FilterModel ({
                    scores: CLMSUI.clmsModelInst.get("scores")
                });

                CLMSUI.distancesInst = new CLMSUI.BackboneModelTypes.DistancesModel ({
                    distances: distances
                });

                CLMSUI.rangeModelInst = new CLMSUI.BackboneModelTypes.RangeModel ({ 
                    scale: d3.scale.linear() 
                });

                CLMSUI.tooltipModelInst = new CLMSUI.BackboneModelTypes.TooltipModel ();

                CLMSUI.compositeModelInst = new CLMSUI.BackboneModelTypes.CompositeModelType ({
                    distancesModel: CLMSUI.distancesInst,
                    clmsModel: CLMSUI.clmsModelInst,
                    rangeModel: CLMSUI.rangeModelInst,
                    filterModel: CLMSUI.filterModelInst,
                    tooltipModel: CLMSUI.tooltipModelInst,
                    alignColl: CLMSUI.alignmentCollectionInst,
                    selection: [], //will contain cross-link objects
                    highlights: [], //will contain cross-link objects 
                    linkColourAssignment: CLMSUI.linkColour.defaultColours,
                    selectedProtein: null
                });

                CLMSUI.compositeModelInst.applyFilter();   // do it first time so filtered sets aren't empty

                // instead of views listening to chnages in filter directly, we listen to any changes here, update filtered stuff
                // and then tell the views that filtering has occurred via a custom event ("filtering Done"). The ordering means 
                // the views are only notified once the changed data is ready.
                CLMSUI.compositeModelInst.listenTo (CLMSUI.filterModelInst, "change", function() {
                    this.applyFilter();
                    this.trigger ("filteringDone");
                });

                // Start the asynchronous blosum fetching after the above events have been set up
                CLMSUI.blosumCollInst.fetch();
            }
            
            changeLinkColours = function () {
				var colourSelection = document.getElementById("linkColourSelect").value;
				if (colourSelection == "Default") {
					CLMSUI.compositeModelInst.set("linkColourAssignment", CLMSUI.linkColour.defaultColours);
				} else if (colourSelection == "Group") {
					CLMSUI.compositeModelInst.set("linkColourAssignment", CLMSUI.linkColour.group);
				}
            }
            
            CLMSUI.init.models();
            
            var windowLoaded = function () {    
                // Showing multiple searches at once
				var s = d3.map(CLMSUI.searchesShown);
				var title = s.keys().toString() + " : " + s.values().toString();//JSON.stringify(searchesShown);
				document.title = title;
	
				if (s.keys().length > 1) {
					//showKeyPanel(true);
					d3.select('#save').style('display','none');
				}
                
                CLMSUI.init.views();
                          
                allDataAndWindowLoaded ();

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

				*/
				//window.onresize();

			};
            
            //~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
			window.addEventListener("load", windowLoaded);

		//]]>
		</script>

        <script type="text/javascript" src="./js/SelectionPanel.js"></script>
		<script type="text/javascript" src="./js/networkFrame.js"></script>
		<script type="text/javascript" src="./js/downloads.js"></script>
</html>

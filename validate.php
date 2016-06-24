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

<!DOCTYPE html>
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
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-status-bar-style" content="black">
            <link rel="stylesheet" href="css/reset.css" />
            <link rel="stylesheet" href="css/style.css" />
            <link rel="stylesheet" href="css/dynamic_table.css" />
            <link rel="stylesheet" href="css/validate.css" />
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
<!--
        <link rel="stylesheet" href="./css/spectrumViewWrapper.css">
-->
        <link rel="stylesheet" href="./css/validate.css">
        <link rel="stylesheet" href="./css/proteinInfoViewBB.css">
        <link rel="stylesheet" href="./css/key.css">

        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
        <script type="text/javascript" src="./vendor/rgbcolor.js"></script>
        <script type="text/javascript" src="./vendor/ngl.embedded.min.js"></script>
        <script type="text/javascript" src="./vendor/crosslink.js"></script>
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
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/P_PLink.js"></script>
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
        <script type="text/javascript" src="./js/validate.js"></script>
        <script type="text/javascript" src="./js/proteinInfoViewBB.js"></script>
        <script type="text/javascript" src="./js/keyViewBB.js"></script>

        <script type="text/javascript" src="./js/networkFrame.js"></script>
        <script type="text/javascript" src="./js/downloads.js"></script>


        <!-- Spectrum view .js files -->
    <script type="text/javascript" src="../spectrum/src/model.js"></script>
    <script type="text/javascript" src="../spectrum/src/SpectrumView2.js"></script>
    <script type="text/javascript" src="../spectrum/src/FragmentationKeyView.js"></script>
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
    </head>

    <body>
        <!-- Main -->
        <div id="main">

            <div class="container">
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

            <div class="mainContent">
                <div id="topDiv">
                </div>
                <div id="bottomDiv"></div>
            </div>


        </div> <!-- CONTAINER -->

            <div class="controls">
     <span id="filterPlaceholder"></span>
</div>


        <script>
    //<![CDATA[

        var CLMSUI = CLMSUI || {};
        <?php
            if (isset($_SESSION['session_name'])) {
                echo "CLMSUI.loggedIn = true;";
            }
            include './php/loadData.php';
            //~ if (file_exists('../annotations.php')){
                //~ include '../annotations.php';
            //~ }
        ?>

        var options = {proteins: proteins, peptides: peptides, rawMatches: tempMatches,  searches: searchMeta};

        CLMSUI.init.models(options);

        var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
        document.title = Array.from(searches.keys()).join();

        var windowLoaded = function () {

            //CLMSUI.init.views();
			    var filterModel = CLMSUI.compositeModelInst.get("filterModel");     
    var filterViewGroup = new CLMSUI.FilterViewBB ({
        el: "#filterPlaceholder", 
        model: filterModel
    });

    var miniDistModelInst = new CLMSUI.BackboneModelTypes.MinigramModel ();
    miniDistModelInst.data = function() {
        var matches = CLMSUI.modelUtils.flattenMatches (CLMSUI.compositeModelInst.get("clmsModel").get("matches"));
        return matches; // matches is now an array of arrays    //  [matches, []];
    };

    var scoreDistributionView = new CLMSUI.MinigramViewBB ({
        el: "#filterPlaceholderSliderHolder",
        model: miniDistModelInst,
        myOptions: {
            maxX: 0,    // let data decide
            seriesNames: ["Matches", "Decoys"],
            //scaleOthersTo: "Matches",
            xlabel: "Score",
            ylabel: "Count",
            height: 50,
            colors: {"Matches":"blue", "Decoys":"red"}
        }
    });


    // When the range changes on the mini histogram model pass the values onto the filter model
    filterModel.listenTo (miniDistModelInst, "change", function (model) {
        this.set ("cutoff", [model.get("domainStart"), model.get("domainEnd")]); 
    }, this);


    // If the ClmsModel matches attribute changes then tell the mini histogram view
    scoreDistributionView
        .listenTo (CLMSUI.clmsModelInst, "change:matches", this.render) // if the matches changes (likely?) need to re-render the view too
        // below should be bound eventually if filter changes, but c3 currently can't change brush pos without internal poking about
        //.listenTo (this.model.get("filterModel"), "change", this.render)  
    ;       


            //allDataAndWindowLoaded ();
			// World of code smells vol.1
			// selectionViewer declared before spectrumWrapper because...
			// 1. Both listen to event A, selectionViewer to build table, spectrumWrapper to do other stuff
			// 2. Event A in spectrumWrapper fires event B
			// 3. selectionViewer listens for event B to highlight row in table - which means it must have built the table
			// 4. Thus selectionViewer must do it's routine for event A before spectrumWrapper, so we initialise it first
			var selectionViewer = new CLMSUI.SelectionTableViewBB ({
				el: "#bottomDiv",
				model: CLMSUI.compositeModelInst,
			});
			// redraw / hide table on selected cross-link change
			selectionViewer.listenTo (CLMSUI.compositeModelInst, "change:selection", function (model, selection) {
				var emptySelection = (selection.length === 0);
				split.collapse (emptySelection);    // this is a bit hacky as it's referencing the split component in another view
				this.setVisible (!emptySelection);    
			});
			split.collapse (true);
			selectionViewer.setVisible (false);
			
			var spectrumWrapper = new SpectrumViewWrapper ({
				el:"#topDiv",
				model: CLMSUI.compositeModelInst, 
				displayEventName: "spectrumShow",
				myOptions: {wrapperID: "spectrumPanel"}
			});
			
			var spectrumModel = new AnnotatedSpectrumModel();
			var spectrumViewer = new SpectrumView ({
				model: spectrumModel, 
				el:"#spectrumPanel",
			});
			var fragKey = new FragmentationKeyView ({model: spectrumModel, el:"#spectrumPanel"});

    // Update spectrum view when extrenal resize event called
    spectrumViewer.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });
    fragKey.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });
    
    // "individualMatchSelected" in CLMSUI.vent is link event between selection table view and spectrum view
    // used to transport one Match between views
    spectrumViewer.listenTo (CLMSUI.vent, "individualMatchSelected", function (match) {
        if (match) { 
            var randId = CLMSUI.modelUtils.getRandomSearchId (CLMSUI.compositeModelInst.get("clmsModel"), match);
            CLMSUI.loadSpectra (match, randId, this.model);
        } else {
            this.model.clear();
        }
    });

			var allCrossLinks = Array.from(
					CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks").values());
			CLMSUI.compositeModelInst.set("selection", allCrossLinks);

        };

        var split = Split (["#topDiv", "#bottomDiv"], { direction: "vertical", sizes: [60,40], minSize: [200,10], });

        //~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
        window.addEventListener("load", windowLoaded);

            //]]>
        </script>

    </body>
</html>

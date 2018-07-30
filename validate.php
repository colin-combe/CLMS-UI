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
$cacheBuster = '?v='.microtime(true);
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

        <link rel="stylesheet" href="../vendor/css/reset.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="../vendor/css/common.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="../vendor/css/byrei-dyndiv_0.5.css<?php echo $cacheBuster ?>" />

        <!-- Spectrum Viewer styles  -->
        <link rel="stylesheet" href="../spectrum/css/spectrum.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../spectrum/css/settings.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../spectrum/css/QC.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../spectrum/css/dropdown.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" type="text/css" href="../spectrum/css/font-awesome.min.css"/>
        <link rel="stylesheet" href="../spectrum/vendor/dt-1.10.12_datatables.min.css<?php echo $cacheBuster ?>">

        <link rel="stylesheet" href="./css/xispecAdjust.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="./css/style.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="./css/tooltip.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../vendor/css/c3.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/distogram.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/minigram.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/ddMenuViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/selectionViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/spectrumViewWrapper.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/validate.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/key.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/filter.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/scatterplot.css<?php echo $cacheBuster ?>">
        <!-- <link rel="stylesheet" href="./css/networkPage.css<?php echo $cacheBuster ?>"> -->
        <link rel="stylesheet" href="./css/searchSummary.css<?php echo $cacheBuster ?>">
	<link rel="stylesheet" href="./css/validationPage.css<?php echo $cacheBuster ?>">

        <script type="text/javascript" src="../vendor/js/byrei-dyndiv_1.0rc1-src.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/d3.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/colorbrewer.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/ngl_verbose.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/c3.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/split.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/svgexp.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/underscore.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/spin.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/jquery-3.2.1.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../vendor/js/backbone.js<?php echo $cacheBuster ?>"></script>
	<script type="text/javascript" src="../vendor/js/jquery.jsonview.js<?php echo $cacheBuster ?>"></script>

        <!-- <script type="text/javascript" src="../vendor/js/zepto.js"></script> -->

        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SearchResultsModel.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SpectrumMatch.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/CrossLink.js<?php echo $cacheBuster ?>"></script>

        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/CrosslinkViewerBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedProtein.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedCrossLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/P_PLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/Rotator.js<?php echo $cacheBuster ?>"></script>

        <!-- Backbone models/views loaded after Backbone itself, otherwise need to delay their instantiation somehow -->
        <script type="text/javascript" src="./js/Utils.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/models.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/compositeModelType.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/modelUtils.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/fdr.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/distogramViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/filterViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/tooltipViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/minigramViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/ddMenuViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/alignModelType.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/selectionTableViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/linkColourAssignment.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/spectrumViewWrapper.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/validate.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/loadSpectrum.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/keyViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/scatterplotViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/networkFrame.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/downloads.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/searchSummaryViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/xiNetControlsViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/listViewBB.js<?php echo $cacheBuster ?>"></script>




        <!-- Spectrum view .js files -->
        <script type="text/javascript" src="../spectrum/src/Wrapper.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/vendor/datatables.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/vendor/jscolor.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/vendor/js.cookie.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/model.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/SpectrumView2.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKeyView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/PrecursorInfoView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/QCwrapperView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/ErrorPlotView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/SpectrumSettingsView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/PepInputView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/FragKey/KeyFragment.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Fragment.js<?php echo $cacheBuster ?>"></script>
    </head>

    <body>
        <!-- Main -->
        <div id="main">

            <div class="page-header">
                <i class="fa fa-home fa-xi" onclick="window.location = '../history/history.html';" title="Return to search history"></i>
                <span class="headerLabel">
                    <?php echo $_SESSION['session_name'] ?>
                </span>
                <p id="viewDropdownPlaceholder"></p>
                <p id="expDropdownPlaceholder"></p>
                <button class='btn btn-1 btn-1a' onclick=<?php echo '"window.location = \'./network.php?sid='.$sid.'\'";' ?> title="View results">Done</button>
            </div> <!-- page-header -->

            <div class="mainContent">
                <div id="topDiv">
                </div>
                <div id="bottomDiv"></div>
            </div>

			<div class="controls">
				<span id="filterPlaceholder"></span>
			</div>
        </div><!-- MAIN -->


        <script>
        //<![CDATA[

        //~ var windowLoaded = function () {
			var CLMSUI = CLMSUI || {};
			<?php
				if (isset($_SESSION['session_name'])) {
					echo "CLMSUI.loggedIn = true;";
				}
                if (file_exists('../xiSpecConfig.php')) {
                    include('../xiSpecConfig.php');
                }
			?>

            var spinner = new Spinner({scale: 5}).spin (d3.select("#topDiv").node());

            var success = function (text) {
                spinner.stop(); // stop spinner on request returning
				var json = JSON.parse (text);
				CLMSUI.init.models(json);

				var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
                document.title = "Validate " + CLMS.arrayFromMapKeys(searches).join();
				Split (["#topDiv", "#bottomDiv"], { direction: "vertical",
						sizes: [60,40], minSize: [200,10],
							onDragEnd: function () {CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
				} });

                var windowIds = ["spectrumSettingsWrapper", "keyPanel", "distoPanel", "searchSummaryPanel", "scatterplotPanel", "urlSearchBox"];
                // something funny happens if I do a data join and enter with d3 instead
                // ('distoPanel' datum trickles down into chart axes due to unintended d3 select.select inheritance)
                // http://stackoverflow.com/questions/18831949/d3js-make-new-parent-data-descend-into-child-nodes
                windowIds.forEach(function(winid) {
                    d3.select("body").append("div")
                        .attr("id", winid)
                        .attr("class", "dynDiv dynDiv_bodyLimit");
                });

				CLMSUI.init.viewsEssential({"specWrapperDiv":"#topDiv", spectrumToTop: false});

                // Generate checkboxes for view dropdown
                var checkBoxData = [
                    {
                        id: "distoChkBxPlaceholder",
                        label: CLMSUI.DistogramBB.prototype.identifier,
                        eventName: "distoShow",
                        tooltip: "Configurable view for showing distribution of one Cross-Link/Match property"
                    },
                    {
                        id: "scatterplotChkBxPlaceholder",
                        label: "Scatterplot",
                        eventName: "scatterplotShow",
                        tooltip: "Configurable view for comparing two Cross-Link/Match properties",
                        sectionEnd: true
                    },
                    {
                        id: "keyChkBxPlaceholder",
                        label: "Legend",
                        eventName: "keyShow",
                        tooltip: "Explains and allows changing of current colour scheme"
                    },
                    {
                        id: "searchSummaryChkBxPlaceholder",
                        label: "Search Summaries",
                        eventName: "searchesShow",
                        tooltip: "Shows metadata for current searches",
                        sectionEnd: true
                    },
                ];
                checkBoxData.forEach(function(cbdata) {
                    var options = $.extend({
                        labelFirst: false
                    }, cbdata);
                    var cbView = new CLMSUI.utils.checkBoxView({
                        myOptions: options
                    });
                    $("#viewDropdownPlaceholder").append(cbView.$el);
                }, this);

                var compModel = CLMSUI.compositeModelInst;
                // Add them to a drop-down menu (this rips them away from where they currently are - document)
                var maybeViews = ["#nglChkBxPlaceholder" /*, "#distoChkBxPlaceholder"*/ ];
                new CLMSUI.DropDownMenuViewBB({
                        el: "#viewDropdownPlaceholder",
                        model: compModel.get("clmsModel"),
                        myOptions: {
                            title: "Views",
                            menu: checkBoxData,
                            tooltipModel: compModel.get("tooltipModel")
                        }
                    })
                    // hide/disable view choices that depend on certain data being present until that data arrives
                    .filter(maybeViews, false)
                    .listenTo(compModel.get("clmsModel"), "change:distancesObj", function(model, newDistancesObj) {
                        this.filter(maybeViews, !!newDistancesObj);
                });

                function selectEverything(){
                    var allMatches = CLMSUI.compositeModelInst.get("clmsModel").get("matches")
                    CLMSUI.compositeModelInst.setMarkedMatches ("selection", allMatches);
                }

                selectEverything();
                CLMSUI.vent.trigger ("spectrumShow", true);

                CLMSUI.compositeModelInst.listenTo(CLMSUI.vent, "scatterplotShow", function(arg) {
                    if (arg == false){
                        selectEverything();
                    }
                });
                CLMSUI.compositeModelInst.listenTo(CLMSUI.vent, "distoShow", function(arg) {
                    if (arg == false) {
                        selectEverything();
                    }
                });

                // ByRei_dynDiv by default fires this on window.load (like this whole block), but that means the SpectrumSettingsView is too late to be picked up
                // so we run it again here, doesn't do any harm
                ByRei_dynDiv.init.main();

				var resize = function(event) {
					CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
					var alts = d3.select("#alternatives");
					var w = alts.node().parentNode.parentNode.getBoundingClientRect().width - 20;
					alts.attr("style", "width:"+w+"px;"); //dont know why d3 style() aint working
				};

				window.onresize = resize;

				resize();
			};

			var url = "../CLMS-model/php/spectrumMatches.php" + window.location.search;


            d3.text (url, function (error, text) {
                if (!error) {
                    success (text);
                }
            });



        //]]>
        </script>

    </body>
</html>

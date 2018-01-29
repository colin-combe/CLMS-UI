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
?>

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

        <link rel="stylesheet" href="./css/reset.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="./css/byrei-dyndiv_0.5.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/common.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="./css/style.css<?php echo $cacheBuster ?>" />
        <link rel="stylesheet" href="./css/xiNET.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/matrix.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/tooltip.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/c3.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/distogram.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/minigram.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/ddMenuViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/alignViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/selectionViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/circularViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/spectrumViewWrapper.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/validate.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/proteinInfoViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/key.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/filter.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/scatterplot.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/nglViewBB.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/networkPage.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/csvUpload.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/searchSummary.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/jquery.jsonview.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="./css/threeColourSlider.css<?php echo $cacheBuster ?>">
		    <link rel="stylesheet" href="./css/urlSearchBoxViewBB.css<?php echo $cacheBuster ?>">

        <script type="text/javascript" src="./vendor/byrei-dyndiv_1.0rc1-src.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/d3.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/ngl_verbose.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/c3.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/split_new.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/svgexp.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/underscore.js<?php echo $cacheBuster ?>"></script>
<!--
        <script type="text/javascript" src="./vendor/zepto.js"></script>
-->
        <script type="text/javascript" src="./vendor/spin.js<?php echo $cacheBuster ?>"></script>
<!--
        arrg, jquerys got in it, it for the json tree view, which we may not keep
-->
        <script type="text/javascript" src="./vendor/jquery-3.2.1.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/backbone.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./vendor/jquery.jsonview.js<?php echo $cacheBuster ?>"></script>
        <!-- <script type="text/javascript" src="./vendor/crossfilter.js"></script> -->

        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SearchResultsModel.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/SpectrumMatch.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../CLMS-model/src/CLMS/model/CrossLink.js<?php echo $cacheBuster ?>"></script>

        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/CrosslinkViewerBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedProtein.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/RenderedCrossLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/P_PLink.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/CLMS/xiNET/Rotator.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../crosslink-viewer/vendor/cola.js<?php echo $cacheBuster ?>"></script>

        <!-- Backbone models/views loaded after Backbone itself, otherwise need to delay their instantiation somehow -->
        <script type="text/javascript" src="./js/Utils.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/circleArrange.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/models.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/annotationTypeModel.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/compositeModelType.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/modelUtils.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/fdr.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/distancesObj.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/distogramViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/threeColourSliderBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/filterViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/matrixViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/tooltipViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/minigramViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/ddMenuViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/NGLModelWrapperBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/PDBFileChooser.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/CSVFileChooser.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/metaDataFileChoosers.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/NGLViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/bioseq32.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/alignModelType.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/alignViewBB3.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/alignSettingsViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/selectionTableViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/circularViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/linkColourAssignment.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/spectrumViewWrapper.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/validate.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/proteinInfoViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/keyViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/scatterplotViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/networkFrame.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/downloads.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/searchSummaryViewBB.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="./js/urlSearchBoxViewBB.js<?php echo $cacheBuster ?>"></script>

        <!-- Spectrum view files -->
        <link rel="stylesheet" href="../spectrum/css/settings.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../spectrum/css/dropdown.css<?php echo $cacheBuster ?>">
        <link rel="stylesheet" href="../spectrum/vendor/dt-1.10.12_datatables.min.css<?php echo $cacheBuster ?>">
        <script type="text/javascript" src="../spectrum/vendor/datatables.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/vendor/jscolor.min.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/vendor/js.cookie.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/model.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/SpectrumView2.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/FragmentationKeyView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/PrecursorInfoView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/ErrorIntensityPlotView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/SpectrumSettingsView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/PepInputView.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/FragKey/KeyFragment.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Graph.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Peak.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/Fragment.js<?php echo $cacheBuster ?>"></script>
        <script type="text/javascript" src="../spectrum/src/graph/IsotopeCluster.js<?php echo $cacheBuster ?>"></script>
    </head>

    <body>
        <!-- Main -->
        <div id="main">

            <div class="page-header">
                    <i class="fa fa-home fa-xi" 
                        onclick="window.location = '../history/history.html';" 
                        title="Return to search history / Login"></i>
					<!--
                    <i class="fa fa-github fa-xi" 
                        onclick="window.open('https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues', '_blank');" 
                        title="GitHub issue tracker (You must be logged in to GitHub to view.)"></i>
					-->
                    <p id="loadDropdownPlaceholder"></p>
                    <p id="viewDropdownPlaceholder"></p>
                    <p id="proteinSelectionDropdownPlaceholder"></p>
                    <p id="annotationsDropdownPlaceholder"></p>
                    <p id="expDropdownPlaceholder"></p>
					<p id="helpDropdownPlaceholder"></p>
            </div>

            <div class="mainContent">
                <div id="topDiv">
                    <div id="networkDiv"></div>
                    <div id="sliderDiv"></div>
                </div>
                <div id="bottomDiv"></div>
            </div>

            <div id='hiddenProteinsMessage'>
                <p id='hiddenProteinsText'>Manually Hidden Message</p>
                <!-- not very backbone but its only a button -->
                <button class='btn btn-1 btn-1a showHidden' onclick="CLMSUI.compositeModelInst.showHiddenProteins()">Show</button>
            </div>"

            <div class="controls">
                <div id="filterPlaceholder"></div>
                <div class="filterResultGroup">
                    <div id="filterReportPlaceholder"></div>
                    <div id="fdrSummaryPlaceholder"></div>
                </div>
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

                try {
                    var json = {};
                    if (text) { json = JSON.parse (text);}
                    CLMSUI.init.models (json);

                    var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
                    document.title = CLMS.arrayFromMapKeys(searches).join();

                    CLMSUI.split = Split (["#topDiv", "#bottomDiv"],
                        { direction: "vertical", sizes: [80,20], minSize: [200,10],
                            onDragEnd: function () { CLMSUI.vent.trigger ("splitPanelDragEnd"); }
                        }
                    );

                    CLMSUI.init.views();
                    allDataLoaded ();
                } catch (err) {
                    console.error ("Error", err, text.substring(0, 1000));
                }
            };

            var url = "./loadData.php" + window.location.search;

            d3.text (url, function (error, text) {
                if (!error) {
                    success (text);
                }
            });

    //]]>
    </script>

    </body>
</html>

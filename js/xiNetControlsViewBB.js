//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/xiNetLayouts.js

    var CLMSUI = CLMSUI || {};

	CLMSUI.xiNetControlsViewBB = CLMSUI.utils.BaseFrameView.extend ({

            events: {
                "change .clickToSelect": "setClickModeSelect",
                "change .clickToPan": "setClickModePan",
                "click .downloadButton": "downloadSVG",
                "click .autoLayoutButton": "autoLayout",
                "click .loadLayoutButton": "loadLayout",
                "click .saveLayoutButton": "saveLayout",
            },

            setClickModeSelect: function (){
                CLMSUI.vent.trigger ("xiNetDragToSelect", true);
            },

            setClickModePan: function (){
                CLMSUI.vent.trigger ("xiNetDragToPan", true);
            },

            downloadSVG: function (){
                CLMSUI.vent.trigger ("xiNetSvgDownload", true);
            },

            autoLayout: function (){
                // CLMSUI.vent.trigger ("xiNetSvgDownload", true);
            },

            loadLayout: function (){
                // CLMSUI.vent.trigger ("xiNetSvgDownload", true);
            },

            saveLayout: function (){
                // CLMSUI.vent.trigger ("xiNetSvgDownload", true);
            },

            initialize: function (viewOptions) {

                // viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
                CLMSUI.xiNetControlsViewBB.__super__.initialize.apply (this, arguments);

			          var self = this;

                // this.el is the dom element this should be getting added to, replaces targetDiv
                var mainDivSel = d3.select(this.el);

                var wrapperPanel = mainDivSel.append("div")
                    .attr ("class", "panelInner")
                ;

                wrapperPanel.html(
                    "<div class='sectionTable expectedFormatPanel'>" + //
                    "<table>" +
                        "<tbody>" +
                          "<tr>" +
                            "<td>Select protein</td>" +
                            "<td>LEFT click on protein; CTRL or SHIFT and LEFT click to add/remove proteins from selection.</td>" +
                          "</tr>" +
                          "<tr>" +
                            "<td>Toggle protein between bar and circle</td>" +
                            "<td>RIGHT click on protein</td>" +
                          "</tr>" +
                          "<tr>" +
                            "<td>Zoom</td>" +
                            "<td>Mouse wheel</td>" +
                          "</tr>" +
                          // "<tr>" +
                          //   "<td>Pan</td>" +
                          //   "<td>Click and drag on background.</td>" +
                          // "</tr>" +
                          "<tr>" +
                            "<td>Move protein(s)</td>" +
                            "<td>Click and drag on protein</td>" +
                          "</tr>" +
                          "<tr>" +
                            "<td>Expand bar <br>(increases bar length until sequence is visible)</td>" +
                            "<td>SHIFT and RIGHT click on protein</td>" +
                          "</tr>" +
                          "<tr>" +
                            "<td>Rotate bar</td>" +
                            "<td>Click and drag on handles that appear at end of bar</td>" +
                          "</tr>" +
                          "<tr>" +
                            "<td>Flip self-links</td>" +
                            "<td>RIGHT-click on self-link</td>" +
                          "</tr>" +
                        "</tbody>" +
                      "</table>" +
                    "</div>" +
                    "<div class='xinetButtonBar'>" +
                        "<label class='panOrSelect'><span>DRAG TO PAN</span><input type='radio' name='clickMode' class='clickToPan' checked></label>" +
                        "<label class='panOrSelect'><span>DRAG TO SELECT</span><input type='radio' name='clickMode' class='clickToSelect'></label>" +
                        // "<div id='xiNETControlsDropdownPlaceholder' style='display:inline-block'></div>" +
                        "<button class='btn btn-1 btn-1a downloadButton'>"+CLMSUI.utils.commonLabels.downloadImg+"SVG</button>" +
                    "</div>");

                //hack to take out pan/select option in firefox
                if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
                    // Do Firefox-related activities
                    d3.selectAll(".panOrSelect").style("display", "none");
                };


                // var formatPanel = wrapperPanel.append("div").attr("class", "expectedFormatPanel");
                //
                // var sectionData = [this.options.expectedFormat];
                // sectionData[0].id = "ExpectedFormat";
                // sectionData[0].sectionName = "Expected CSV Format";
                //
                // var headerFunc = function(d) { return d.sectionName; };
                // var rowFilterFunc = function(d) {
                //   var rows = d3.entries(d);
                //   var badKeys = self.options.removeTheseKeys;
                //   return rows.filter (function (row) {
                //     return !badKeys || !badKeys.has(row.key);
                //   });
                // };
                // var cellFunc = function (d) { d3.select(this).html (d.value); };

                // CLMSUI.utils.sectionTable.call (this, formatPanel, sectionData, mainDivSel.attr("id"), ["Row Type", "Format"], headerFunc, rowFilterFunc, cellFunc, []);

                //
                // var toolbar = wrapperPanel.append("div").attr("class", "csvToolbar");
                //
                // toolbar.append("span").html("If you do not provide a FASTA file then your protein IDs <br> must be currently valid UniProt accession numbers.");
                //
                // var fileButtons = ["CSV", "FASTA"];
                // for (var b = 0; b < fileButtons.length; b ++){
                //     var fileType = fileButtons[b];
                //     var csvDivSel = toolbar.append("div");
                //
                //
                //     csvDivSel.append("span")
                //         .text(fileType + ":")
                //         .append("input")
                //             .attr({type: "file", accept: "." + fileType, class: "select" +  fileType + "Button"})
                //     ;
                //
                // }
                //
                // toolbar.append("div").append("label")
                //     .attr("class", "btn btn-1 btn-1a")
                //     .append("span")
                //     .attr("class", "uploadButton")
                //     .text("Upload")
                //     .attr({class: "uploadButton"})
                // ;

            },

            // selectCsvFile: function (evt) {
            //     this.csvFileObj = evt.target.files[0];
            // },
            //
            // selectFastaFile: function (evt) {
            //     this.fastaFileObj = evt.target.files[0];
            // },
            //
            // uploadFiles: function (evt) {
            //     if (!this.csvFileObj) {
            //         alert("no CSV file selected");
            //     }
            //     else {
            //         var fileInfo = {name: this.csvFileObj.name,
            //             size: this.csvFileObj.size,
            //             modified: this.csvFileObj.lastModifiedDate.toString(),
            //             //path: this.csvFileObj.webkitRelativePath,
            //         };
            //         var spinner = new Spinner({scale: 5}).spin (d3.select("#topDiv").node());
            //         var self = this;
            //         CLMSUI.modelUtils.loadUserFile (this.csvFileObj, function (csvFileContents) {
            //             //alert(self.csvFileObj.name);
            //             //todo: if no fasta file check  all protein ids  valid uniprot accession
            //             if (self.fastaFileObj) {
            //                 CLMSUI.modelUtils.loadUserFile (self.fastaFileObj, function (fastaFileContents) {
            //                     CLMSUI.compositeModelInst.get("clmsModel").parseCSV(csvFileContents, fileInfo, fastaFileContents);
            //                     spinner.stop(); // stop spinner on request returning
            //                     //~ self.csvFileObj = null;
            //                     //~ self.fastaFileObj = null;
            //                 });
            //             } else {
            //                 spinner.stop(); // stop spinner on request returning
            //                 CLMSUI.compositeModelInst.get("clmsModel").parseCSV(csvFileContents, fileInfo);
            //                 //CLMSUI.vent.trigger ("csvLoadingDone"); // tell the world we're done
            //                 spinner.stop(); // stop spinner on request returning
            //                 //~ self.csvFileObj = null;
            //                 //~ self.fastaFileObj = null;
            //             }
            //         });
            //
            //         d3.select("#clmsErrorBox").style("display", "none");
            //
            //     }
            // },

            identifier: "xiNet Controls",
          });

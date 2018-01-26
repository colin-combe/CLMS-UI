//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/xiNetLayouts.js

    var CLMSUI = CLMSUI || {};

	CLMSUI.xiNetControlsViewBB = CLMSUI.utils.BaseFrameView.extend ({

            events: function() {

                var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
                if (_.isFunction (parentEvents)) {
                    parentEvents = parentEvents();
                }
                return _.extend ({}, parentEvents, {
                    "change .clickToSelect":  function () {CLMSUI.vent.trigger ("xiNetDragToSelect", true);},
                    "change .clickToPan": function () {CLMSUI.vent.trigger ("xiNetDragToPan", true);},
                    "click .downloadButton": function () {CLMSUI.vent.trigger ("xiNetSvgDownload", true);},
                    "click .autoLayoutButton": function () {CLMSUI.vent.trigger ("xiNetAutoLayout", true);},//"autoLayout",
                  //  "click .loadLayoutButton": "loadLayout",
                    "click .saveLayoutButton": "saveLayout",
                });

            },

            saveLayout: function (){
                var callback = function (layoutJson) {
                          var xmlhttp = new XMLHttpRequest();
                          var url = "./php/saveLayout.php";
                          xmlhttp.open("POST", url, true);
                          //Send the proper header information along with the request
                          xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                          xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
                              if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                                  console.log("Saved layout " + xmlhttp.responseText, true);
                                  alert("Layout Saved");
                              }
                          };
                        var sid = CLMSUI.compositeModelInst.get("clmsModel").get("sid");
                        var params =  "sid=" + sid
                                    + "&layout="+encodeURIComponent(layoutJson.replace(/[\t\r\n']+/g,""))
                                    + "&name="+encodeURIComponent(d3.select("#name").property("value"));
                        xmlhttp.send(params);
                };

                CLMSUI.vent.trigger ("xiNetSaveLayout", callback);
            },

            initialize: function (viewOptions) {
              var myDefaults = {
        				buttonText: "Select Protein MetaData CSV File",
        				loadedEventName: "proteinMetadataUpdated",
        				parseMsgTemplate: "Parsed <%= attrCount %> MetaData Attributes for <%= itemCount %> Identified Proteins",
        				expectedFormat: {
        					header: "Accession,{MetaData1 Name}*,{MetaData2 Name} etc",
        					data: "{Protein Accession Number},{number or string},{number or string}",
        					example: [
        						{"csv file": ["Accession", "Name", "Value"]},
        						{csv: ["P02768-A,Human Protein,0.79"]},
        						{csv: ["G3RE98,Gorilla Protein,0.58"]},
        					],
        					notes: "*If a MetaData column name is 'Name' it will change displayed protein names"
        				}
        			};
        			viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
                // viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
                CLMSUI.xiNetControlsViewBB.__super__.initialize.apply (this, arguments);

			          var self = this;

                // this.el is the dom element this should be getting added to, replaces targetDiv
                var mainDivSel = d3.select(this.el);

                var wrapperPanel = mainDivSel.append("div")
                    .attr ("class", "panelInner")
                ;

                wrapperPanel.html(
                    // "<div class='sectionTable expectedFormatPanel'>" + //
                    // "<table>" +
                    //     "<tbody>" +
                    //       "<tr>" +
                    //         "<td>Select links</td>" +
                    //         "<td>LEFT click on link; CTRL or SHIFT and LEFT click to add/remove links from selection. (The spectra matches supporting the selected links will appear in the table below xiNET.)</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Select protein</td>" +
                    //         "<td>LEFT click on protein; CTRL or SHIFT and LEFT click to add/remove proteins from selection. (Selected proteins can be moved around together.)</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Toggle protein between bar and circle</td>" +
                    //         "<td>RIGHT click on protein</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Zoom</td>" +
                    //         "<td>Mouse wheel</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Move proteins</td>" +
                    //         "<td>Click and drag on protein</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Expand bar <br>(increases bar length until sequence is visible)</td>" +
                    //         "<td>SHIFT and RIGHT click on protein</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Rotate bar</td>" +
                    //         "<td>Click and drag on handles that appear at end of bar</td>" +
                    //       "</tr>" +
                    //       "<tr>" +
                    //         "<td>Flip self-links</td>" +
                    //         "<td>RIGHT-click on self-link</td>" +
                    //       "</tr>" +
                    //     "</tbody>" +
                    //   "</table>" +
                    // "</div>" +
                    "<div class='xinetButtonBar'>" +
                        "<label for='name'> Layout Name: </label>" +
                        "<input type='text' name='name' id='name' value='New layout'>" +
                        "<button class='btn btn-1 btn-1a saveLayoutButton'>Save Layout</button>" +
                        "<button class='btn btn-1 btn-1a autoLayoutButton'>Auto Layout</button>" +
                        "<p id='loadLayoutButton' class=class='btn btn-1 btn-1a'></p>" +
                        "<button class='btn btn-1 btn-1a downloadButton'>"+CLMSUI.utils.commonLabels.downloadImg+"SVG</button>" +
                        "<label class='panOrSelect'><span>DRAG TO PAN</span><input type='radio' name='clickMode' class='clickToPan' checked></label>" +
                        "<label class='panOrSelect'><span>DRAG TO SELECT</span><input type='radio' name='clickMode' class='clickToSelect'></label>" +
                        // "<label class='showLabels'><span>SHOW LABELS</span><input type='checkbox' name='showLabels' class='showXinetLabels' checked></label>" +
                    "</div>"
                  );


                  var formatPanel = wrapperPanel.append("div").attr("class", "expectedFormatPanel");


                  var sectionData = [this.options.expectedFormat];
                  sectionData[0].id = "ExpectedFormat";
                  sectionData[0].sectionName = "Expected CSV Format";

                  var headerFunc = function(d) { return d.sectionName; };
                  var rowFilterFunc = function(d) {
                    var rows = d3.entries(d);
                    var badKeys = self.options.removeTheseKeys;
                    return rows.filter (function (row) {
                      return !badKeys || !badKeys.has(row.key);
                    });
                  };
                  var cellFunc = function (d) { d3.select(this).html (d.value); };

                  CLMSUI.utils.sectionTable.call (this, formatPanel, sectionData, mainDivSel.attr("id"), ["Row Type", "Format"], headerFunc, rowFilterFunc, cellFunc, []);



                //hack to take out pan/select option in firefox
                if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
                    // Do Firefox-related activities
                    d3.selectAll(".panOrSelect").style("display", "none");
                };

                // Generate load layout drop down
                new CLMSUI.xiNetLayoutListViewBB ({
                    el: "#loadLayoutButton",
                    model: CLMSUI.compositeModelInst,
                    myOptions: {
                        title: "Load-Layout ▼",
                    }
                });

            },

            identifier: "xiNet Controls",
});


CLMSUI.xiNetLayoutListViewBB = CLMSUI.DropDownMenuViewBB.extend ({
  events: function() {
      var parentEvents = CLMSUI.DropDownMenuViewBB.prototype.events;
      if(_.isFunction (parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend ({}, parentEvents, {
          //"click li label": "showColour",
      });
  },

  initialize: function () {
      CLMSUI.xiNetLayoutListViewBB.__super__.initialize.apply (this, arguments);
  },

  setVis: function (show) {
      if (show) {
        var self = this;
        var xmlhttp = new XMLHttpRequest();
        var url = "./php/loadLayout.php";
        xmlhttp.open("POST", url, true);
        //Send the proper header information along with the request
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
            if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                //console.log("layout>" + xmlhttp.responseText, true);
                //alert("Layout Saved");

               var layouts = JSON.parse(xmlhttp.responseText);
               var menu = [];
               for (var key in layouts){
                  menu.push(menuItem(layouts, key));
               }
               self.options.menu = menu;
               CLMSUI.xiNetLayoutListViewBB.__super__.render.call(self);
            }
            CLMSUI.xiNetLayoutListViewBB.__super__.setVis.call(self, show);
        };
        var sid = CLMSUI.compositeModelInst.get("clmsModel").get("sid");
        var params =  "sid=" + sid;
        xmlhttp.send(params);
        return this;
      } else {
        CLMSUI.xiNetLayoutListViewBB.__super__.setVis.call(this, show);
      }

      function menuItem (layouts, selectedKey) {
        return {
          name:selectedKey,
          func: function () {CLMSUI.vent.trigger ("xiNetLoadLayout", layouts[selectedKey]);},
          context: CLMSUI.compositeModelInst
        };
      }
  },

});

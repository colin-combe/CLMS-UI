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
                    "change .showXinetLabels": function () { CLMSUI.vent.trigger ("xiNetShowLabels", d3.select(".showXinetLabels").property("checked"));},//"autoLayout",
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
        				expectedFormat: {
                  "Select links":
                    "LEFT click on link; CTRL or SHIFT and LEFT click to add/remove links from selection. (The spectra matches supporting the selected links will appear in the table below xiNET.)",
                  "Select protein":
                    "LEFT click on protein; CTRL or SHIFT and LEFT click to add/remove proteins from selection. (Selected proteins can be moved around together.)",
                  "Toggle protein between bar and circle":
                    "RIGHT click on protein",
                  "Zoom":"Mouse wheel",
                  "Move proteins":"Click and drag on protein",
                  "Rotate bar":"Click and drag on handles that appear at end of bar",
                  "Flip self-links":"RIGHT-click on self-link",
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
                    "<div class='xinetButtonBar'>" +
						"<div class='toolbar'>" +
					    	"<button class='btn btn-1 btn-1a downloadButton'>"+CLMSUI.utils.commonLabels.downloadImg+"SVG</button>" +
					    	"<label class='showLabels btn'>Show Labels<input type='checkbox' name='showLabels' class='showXinetLabels' checked></label>" +
							"<span class='noBreak sectionDividerLeft'>" +
								"<span>Drag To </span>" +
                        		"<label>Pan<input type='radio' name='clickMode' class='clickToPan' checked></label>" +
                        		"<label>Or Select<input type='radio' name='clickMode' class='clickToSelect'></label>" +
							"</span>" +
						"</div>" +
						"<div class='toolbar'>" +
							"<span class='layoutLabel'>Layout</span>" +
					        "<button class='btn btn-1 btn-1a autoLayoutButton'>Auto</button>" +
							"<span class='noBreak sectionDividerLeft sectionDividerRight'>" +
                        		"<input type='text' name='name' id='name' value='' placeholder='Enter Save Layout Name'>" +
                        		"<button class='btn btn-1 btn-1a saveLayoutButton'>Save</button>" +
							"</span>" +
                        	"<p id='loadLayoutButton' class='btn btn-1 btn-1a'></p>" +
						"</div>" +
                    "</div>"
                  );
				
				  var tooltips = {
					  autoLayoutButton: 'Automatically relayout network of displayed proteins',
					  saveLayoutButton: 'Save the current layout for later',
					  loadLayoutButton: 'Load a previously saved layout',
				  };
					d3.entries(tooltips).forEach (function (entry) {
						var elem = d3.select(this.el).select("."+entry.key);
						if (!elem.empty()) {
							elem.attr("title", entry.value);	
						} else {
							elem = d3.select(this.el).select("#"+entry.key);
							elem.attr ("title", entry.value);
						}
					}, this);


                  var formatPanel = wrapperPanel.append("div").attr("class", "expectedFormatPanel");


                  var sectionData = [this.options.expectedFormat];
                  sectionData[0].sectionName = "Show mouse & keyboard controls";

                  var headerFunc = function(d) { return d.sectionName; };
                  var rowFilterFunc = function(d) {
                    var rows = d3.entries(d);
                    var badKeys = self.options.removeTheseKeys;
                    return rows.filter (function (row) {
                      return !badKeys || !badKeys.has(row.key);
                    });
                  };
                  var cellFunc = function (d) { d3.select(this).html (d.value); };

                  CLMSUI.utils.sectionTable.call (this, formatPanel, sectionData, mainDivSel.attr("id"), ["Action", "Control"], headerFunc, rowFilterFunc, cellFunc, []);

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
                        title: "Load ▼",
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

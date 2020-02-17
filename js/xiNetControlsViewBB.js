//		xiNET controls
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory
//
//		js/xiNetControlsViewBB.js

var CLMSUI = CLMSUI || {};

CLMSUI.xiNetControlsViewBB = Backbone.View.extend({

    events: function() {

        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            // "change .clickToSelect": function() {
            //     CLMSUI.vent.trigger("xiNetDragToSelect", true);
            // },
            // "change .clickToPan": function() {
            //     CLMSUI.vent.trigger("xiNetDragToPan", true);
            // },
            "click .xinetSvgDownload": function() {
                CLMSUI.vent.trigger("xinetSvgDownload", true);
            },
            "click .autoLayoutButton": function() {
                CLMSUI.vent.trigger("xiNetAutoLayout", true);
            },
            "click .saveLayoutButton": "saveLayout",

            "change .xinetDragToPan": "dragActionChanged",
            "change .xinetDragToSelect": "dragActionChanged",


            // "click .centreButton": "centerView",
            // "click .downloadButton": "downloadImage",
            // "click .savePDBButton": "savePDB",
            // "click .exportPymolButton": "exportPymol",
            // "click .exportHaddockButton": "exportHaddock",
            // "click .distanceLabelCB": "toggleLabels",
            // "click .selectedOnlyCB": "toggleNonSelectedLinks",
            // "click .showResiduesCB": "toggleResidues",
            // "click .shortestLinkCB": "toggleShortestLinksOnly",
            // "click .allowInterModelDistancesCB": "toggleAllowInterModelDistances",
            // "click .showAllProteinsCB": "toggleShowAllProteins",
            // "click .chainLabelLengthRB": "setChainLabelLength",
            // "click .chainLabelFixedSizeCB": "setChainLabelFixedSize",



            // "change .showXiNetLabels": function() {
            //     CLMSUI.vent.trigger("xiNetShowLabels", d3.select(".showXiNetLabels").property("checked"));
            // },
            // "change .fixedSize": function() {
            //     CLMSUI.vent.trigger("xiNetFixedSize", d3.select(".fixedSize").property("checked"));
            // },
            // "change .xinetPpiStep1": function() {
            //     this.updatePpiSteps();
            // },
            // "change .xinetPpiStep2": function() {
            //     this.updatePpiSteps();
            // },
        });

    },

    saveLayout: function() {
        var xmlhttp = new XMLHttpRequest();
            var url = "./php/isLoggedIn.php";
            xmlhttp.open("POST", url, true);
            //Send the proper header information along with the request
            xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xmlhttp.onreadystatechange = function() { //Call a function when the state changes.
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    if(xmlhttp.responseText == "false"){
                        alert("You must be logged in to save layout. A new tab will open for you to log in, you can then return here and Save.")
                        window.open("../userGUI/userLogin.html", "_blank");
                    } else {
                        var callback = function(layoutJson) {
                            var xmlhttp = new XMLHttpRequest();
                            var url = "./php/saveLayout.php";
                            xmlhttp.open("POST", url, true);
                            //Send the proper header information along with the request
                            xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                            xmlhttp.onreadystatechange = function() { //Call a function when the state changes.
                                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                                    console.log("Saved layout " + xmlhttp.responseText, true);
                                    alert("Layout Saved");
                                }
                            };
                            var sid = CLMSUI.compositeModelInst.get("clmsModel").get("sid");
                            var params = "sid=" + sid +
                                "&layout=" + encodeURIComponent(layoutJson.replace(/[\t\r\n']+/g, "")) +
                                "&name=" + encodeURIComponent(d3.select(".savedLayoutName").property("value"));
                            xmlhttp.send(params);
                        };

                        CLMSUI.vent.trigger("xiNetSaveLayout", callback);
                    }
                }
            };
            xmlhttp.send();
    },


    defaultOptions: {
        dragTo: "Pan",
        labelVisible: false,
        // selectedOnly: false,
        // showResidues: true,
        // shortestLinksOnly: true,
        // chainRep: "cartoon",
        // initialColourScheme: "uniform",
        // showAllProteins: false,
        // chainLabelSetting: "Short",
        // fixedLabelSize: false,
        // defaultAssembly: "default",
        // allowInterModelDistances: false,
        // exportKey: true,
        // exportTitle: true,
        // canHideToolbarArea: true,
        // canTakeImage: true,
    },

    initialize: function(viewOptions) {

        this.options = _.extend(this.defaultOptions, viewOptions.myOptions);
        //CLMSUI.xiNetControlsViewBB.__super__.initialize.apply(this, arguments);

        var self = this;

        var mainDivSel = d3.select(this.el);

        var buttonHtml = "<p id='displayOptionsPlaceholder' class='btn btn-1 btn-1a'></p>" +
            // "<span class='noBreak panOrSelect'>" +
            // "<span>Drag To </span>" +
            // "<label>Pan<input type='radio' name='clickMode' class='clickToPan' checked></label>" +
            // "<label>Or Select<input type='radio' name='clickMode' class='clickToSelect'></label>" +
            // "</span>" +
            "<span class='layoutLabel noBreak sectionDividerLeft' >Layout:</span>"
            + "<button class='btn btn-1 btn-1a autoLayoutButton'>Auto</button>";
            // buttonHtml += "<p id='loadLayoutButton' class='btn btn-1 btn-1a'></p>" +
            //     "</span>";

        buttonHtml += "<p id='loadLayoutButton' class='btn btn-1 btn-1a'></p><input type='text' name='name' id='name' class='savedLayoutName' value='' placeholder='Enter Save Layout Name'>" +
                "<button class='btn btn-1 btn-1a saveLayoutButton'>Save</button>";

            // + "<button class='btn btn-1 btn-1a downloadButton'>" + CLMSUI.utils.commonLabels.downloadImg + "SVG</button>"
            // +   "<p id='displayOptionsPlaceholder' class='btn btn-1 btn-1a'></p>";

        // buttonHtml += "&nbsp;<label>Labels<input type='checkbox' class='showXiNetLabels' checked></label>"
        // buttonHtml += "&nbsp;<label>Fixed size<input type='checkbox' class='fixedSize'></label>"
        // buttonHtml += "&nbsp;<label>PPI width steps:<input type='number' step='1' min='1' max='10' value='2' class='xinetPpiStep1' ><input type='number' step='1' min='1' max='100' value='3' class='xinetPpiStep2' ></label>"

        mainDivSel.html(
            buttonHtml
        );

        if (this.model.get("clmsModel").get("xiNETLayout")) {
            d3.select(".savedLayoutName").property("value", this.model.get("clmsModel").get("xiNETLayout").name);
        }

        var tooltips = {
            autoLayoutButton: 'Automatically relayout network of displayed proteins',
            saveLayoutButton: 'Save the current layout for later',
            loadLayoutButton: 'Load a previously saved layout',
        };
        d3.entries(tooltips).forEach(function(entry) {
            var elem = d3.select(this.el).select("." + entry.key);
            if (!elem.empty()) {
                elem.attr("title", entry.value);
            } else {
                elem = d3.select(this.el).select("#" + entry.key);
                elem.attr("title", entry.value);
            }
        }, this);

        //hack to take out pan/select option in firefox TODO - change to detecting relevant feature (getIntersectionList)
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            // Do Firefox-related activities
            d3.selectAll(".panOrSelect").style("display", "none");
        };

        // Generate load layout drop down
        new CLMSUI.xiNetLayoutListViewBB({
            el: "#loadLayoutButton",
            model: CLMSUI.compositeModelInst,
            myOptions: {
                title: "Load ▼",
            }
        });
/*
        var checkBoxData = [{
                id: "xinetLabels",
                label: "Labels",
                //func: this.setXinetShowLabels,
                toggleAttribute: "xinetShowLabels",
                tooltip: "Show Labels in xiNET",
                sectionEnd: true
            },
        ];


        checkBoxData.forEach(function(cbdata) {
            var options = $.extend({
                labelFirst: false
            }, cbdata);
            var cbView = new CLMSUI.utils.checkBoxView({
              model: CLMSUI.compositeModelInst,

                myOptions: options
            });
            $("#displayOptionsPlaceholder").append(cbView.$el);
        }, this);

        new CLMSUI.DropDownMenuViewBB({
                el: "#displayOptionsPlaceholder",
                model: CLMSUI.compositeModelInst,
                myOptions: {
                    title: "Display Options",
                    menu: checkBoxData,
                }
            });
    */

    // Various view options set up...
    var toggleButtonData = [
        {
            class: "xinetDragToPan",
            label: "Pan",
            id: "dragToPan",
            tooltip: "Show protein chain labels with more verbose content if available",
            group: "dragTo",
            type: "radio",
            value: "Pan",
            header: "Drag to"
        },
        {
            class: "xinetDragToSelect",
            label: "Select",
            id: "dragToSelect",
            tooltip: "Show protein chain labels with shorter content",
            group: "dragTo",
            type: "radio",
            value: "Select",
            sectionEnd: true,
        },
        {
              initialState: this.options.selectedOnly,
              class: "selectedOnlyCB",
              label: "Selected Cross-Links Only",
              id: "selectedOnly",
              d3tooltip: "Only show selected cross-links"
          },
    ];

    var self = this;
    toggleButtonData
        .forEach(function(d) {
            d.type = d.type || "checkbox";
            d.value = d.value || d.label;
            d.inputFirst = true;
            if (d.initialState === undefined && d.group && d.value) { // set initial values for radio button groups
                 d.initialState = (d.value === this.options[d.group]);
            }
        }, this);


    CLMSUI.utils.makeBackboneButtons(mainDivSel, self.el.id, toggleButtonData);
    toggleButtonData.splice(0,0,{
            name: CLMSUI.utils.commonLabels.downloadImg + "SVG",
            tooltip: "Download image from xiNET as SVG; a vector format that can be edited in InkScape or Illustrator",
            class: "xinetSvgDownload",
            sectionEnd: true,
        });
    // ...then moved to a dropdown menu
    // var optid = this.el.id + "Options";
    // toolbar.append("p").attr("id", optid);
    new CLMSUI.DropDownMenuViewBB({
      el: "#displayOptionsPlaceholder",
      model: CLMSUI.compositeModelInst,
        myOptions: {
            title: "Display ▼",
            menu: toggleButtonData.map(function(d) {
                d.id = self.el.id + d.id;
                //d.tooltip = d.d3tooltip;
                return d;
            }),
            closeOnClick: false,
            tooltip: "Display options for xiNET (centre view)"
            // tooltipModel: self.model.get("tooltipModel"),
        }
    });




    },

    dragActionChanged: function () {
       // var checkbox = d3.select(".xinetDragToPan");
       // var checked = checkbox.property("checked");
       this.model.set("xinetDragToPan", d3.select(".xinetDragToPan").property("checked"));
   },


    // setXinetShowLabels: function () {
    //     //alert("!");
    //     var checkbox = d3.select("#xinetLabelsChkBx");
    //     var checked = checkbox.property("checked");
    //     console.log("!"+checked);
    //     this.model.set("xinetShowLabels", d3.select("#xinetLabelsChkBx").property("checked"));
    // },

    updatePpiSteps: function () {
        var steps = [];
        steps[0] = d3.select(".xinetPpiStep1").property("value");
        steps[1] = d3.select(".xinetPpiStep2").property("value");
        this.model.set("xinetPpiSteps", steps);
    },

    identifier: "xiNET Controls",
});


CLMSUI.xiNetLayoutListViewBB = CLMSUI.DropDownMenuViewBB.extend({
    events: function() {
        var parentEvents = CLMSUI.DropDownMenuViewBB.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            //"click li label": "showColour",
        });
    },

    initialize: function() {
        CLMSUI.xiNetLayoutListViewBB.__super__.initialize.apply(this, arguments);
    },

    setVis: function(show) {
        if (show) {
            var self = this;
            var xmlhttp = new XMLHttpRequest();
            var url = "./php/loadLayout.php";
            xmlhttp.open("POST", url, true);
            //Send the proper header information along with the request
            xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xmlhttp.onreadystatechange = function() { //Call a function when the state changes.
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    var layouts = JSON.parse(xmlhttp.responseText);
                    var menu = [];
                    for (var key in layouts) {
                        menu.push(menuItem(layouts, key));
                    }
                    self.options.menu = menu;
                    CLMSUI.xiNetLayoutListViewBB.__super__.render.call(self);
                }
                CLMSUI.xiNetLayoutListViewBB.__super__.setVis.call(self, show);
            };
            var sid = CLMSUI.compositeModelInst.get("clmsModel").get("sid");
            var params = "sid=" + sid;
            xmlhttp.send(params);
            return this;
        } else {
            CLMSUI.xiNetLayoutListViewBB.__super__.setVis.call(this, show);
        }

        function menuItem(layouts, selectedKey) {
            return {
                name: selectedKey,
                func: function() {
                    d3.select(".savedLayoutName").property("value", selectedKey);
                    CLMSUI.vent.trigger("xiNetLoadLayout", layouts[selectedKey]);
                },
                context: CLMSUI.compositeModelInst
            };
        }
    },

});

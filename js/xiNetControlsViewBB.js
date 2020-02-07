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
            "change .clickToSelect": function() {
                CLMSUI.vent.trigger("xiNetDragToSelect", true);
            },
            "change .clickToPan": function() {
                CLMSUI.vent.trigger("xiNetDragToPan", true);
            },
            "click .downloadButton": function() {
                CLMSUI.vent.trigger("xiNetSvgDownload", true);
            },
            "click .autoLayoutButton": function() {
                CLMSUI.vent.trigger("xiNetAutoLayout", true);
            },
            "click .saveLayoutButton": "saveLayout",
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

    initialize: function(viewOptions) {
        var myDefaults = {};
        viewOptions.myOptions = _.extend(myDefaults, viewOptions.myOptions);
        // viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
        CLMSUI.xiNetControlsViewBB.__super__.initialize.apply(this, arguments);

        var self = this;

        var mainDivSel = d3.select(this.el);

        buttonHtml = "<span class='noBreak panOrSelect'>" +
            "<span>Drag To </span>" +
            "<label>Pan<input type='radio' name='clickMode' class='clickToPan' checked></label>" +
            "<label>Or Select<input type='radio' name='clickMode' class='clickToSelect'></label>" +
            "</span>" +
            "<span class='layoutLabel noBreak sectionDividerLeft sectionDividerRight'>Layout:" +
            "<button class='btn btn-1 btn-1a autoLayoutButton'>Auto</button>";

        buttonHtml += "<input type='text' name='name' id='name' class='savedLayoutName' value='' placeholder='Enter Save Layout Name'>" +
                "<button class='btn btn-1 btn-1a saveLayoutButton'>Save</button>"; // +

        buttonHtml += "<p id='loadLayoutButton' class='btn btn-1 btn-1a'></p>" +
            "</span>" +
            "<button class='btn btn-1 btn-1a downloadButton'>" + CLMSUI.utils.commonLabels.downloadImg + "SVG</button>"
            +   "<p id='displayOptionsPlaceholder' class='btn btn-1 btn-1a'></p>";

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

        var checkBoxData = [{
                id: "xinetLabels",
                label: "Labels",
                //func: this.setXinetShowLabels,
                toggleAttribute: "xinetShowLabels",
                tooltip: "Show Labels in xiNET",
                sectionEnd: true
            },
            // {
            //     name: "Filtered Cross-Links",
            //     func: downloadLinks,
            //     tooltip: "Produces a CSV File of Filtered Cross-Link data"
            // },
            // {
            //     name: "Filtered PPI",
            //     func: downloadPPIs,
            //     tooltip: "Produces a CSV File of Filtered Protein-Protein Interaction data"
            // },
            // {
            //     name: "Filtered Residues",
            //     func: downloadResidueCount,
            //     tooltip: "Produces a CSV File of Count of Filtered Residues ",
            // },
            // {
            //     name: "Protein Accession list",
            //     func: downloadProteinAccessions,
            //     tooltip: "Produces a single row CSV File of visible Proteins' Accession numbers",
            //     sectionEnd: true
            // },
            // {
            //     name: "Filtered Matches ",  // extra space to differentiate from first entry in menu
            //     func: downloadSSL,
            //     tooltip: "Produces an SSL file for quantitation in SkyLine",
            //     categoryTitle: "As an SSL File",
            //     sectionBegin: true,
            //     sectionEnd: true
            // },
            // {
            //     name: "Make Filtered XI URL",
            //     func: function() {
            //         CLMSUI.vent.trigger("shareURLViewShow", true);
            //     },
            //     tooltip: "Produces a URL that embeds the current filter state within it for later reproducibility",
            //     categoryTitle: "As a URL",
            //     sectionBegin: true,
            // },
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

    identifier: "xiNet Controls",
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

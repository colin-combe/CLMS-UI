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
            "change .showXiNetLabels": function() {
                CLMSUI.vent.trigger("xiNetShowLabels", d3.select(".showXinetLabels").property("checked"));
            },
            "change .xiNetLinkWidth": function() {
                var lwScale = d3.select(".xiNetLinkWidth").property("value");
                console.log("changing xlw", lwScale);
                if (lwScale.trim() == "") {
                   this.model.set("xiNetLinkWidthAuto", true);
                } else {
                   this.model.set("xiNetLinkWidthAuto", false);
                   this.model.set("xiNetLinkWidthScale", lwScale);
                }
            },
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
            "<button class='btn btn-1 btn-1a downloadButton'>" + CLMSUI.utils.commonLabels.downloadImg + "SVG</button>";

        buttonHtml += "&nbsp;<label>Labels<input type='checkbox' class='showXiNetLabels' checked></label>"
        buttonHtml += "&nbsp;<label>Link width:<input type='number' step='0.01' min='0' class='xiNetLinkWidth' title='pixels per Unique Linked Residue Pair'></label>"

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

        this.listenTo(this.model, "change:xiNetLinkWidthScale", function() {
            var linkWidthScale = this.model.get("xiNetLinkWidthScale");
            d3.select(".xiNetLinkWidth").property("value", linkWidthScale);
        });

        this.listenTo(this.model, "change:xiNetLinkWidthAuto", function() {
            var linkWidthAuto = this.model.get("xiNetLinkWidthAuto");
            d3.select(".xiNetLinkWidth").style("color", linkWidthAuto? "#cccccc" : "#091d42" );
        });

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

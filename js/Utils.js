var CLMSUI = CLMSUI || {};

CLMSUI.utils = {
    // return comma-separated list of protein names from array of protein ids
    proteinConcat: function (d, field, clmsModel) {
        var pnames =  d[field].map (function(pid) {return clmsModel.get("interactors").get(pid).name;});
        return pnames.join(",");
    },

    arrayConcat: function (d, field) {
        return d[field].join(", ");
    },

    getSVG: function (d3SvgSelection) {
        console.log ("domElem", d3SvgSelection.node());
        var a = d3SvgSelection.node().outerHTML;
        a = a.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events" ');
        return'<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'+a;
    },

    addFourCorners: function (d3DivSelection) {
        var classNames = ["dynDiv_resizeDiv_tl", "dynDiv_resizeDiv_tr", "dynDiv_resizeDiv_bl", "dynDiv_resizeDiv_br"];
        var fourCorners = d3DivSelection
            .selectAll("div")
            .data(classNames, function(d) { return d; })    // key on classnames
            .enter()
            .append("div")
                .attr("class", function(d) { return d; } )  // make class the classname entry
        ;
        return fourCorners;
    },

    addDynDivParentBar: function (d3DivSelection) {
        var parentBar = d3DivSelection
            .append("div")
            .attr("class", "dynDiv_moveParentDiv")
                .append ("i")
                .attr ("class", "fa fa-times-circle closeButton")
                // below 2 lines not needed as handled/set up in respective backbone view (now using closeButton class as identifier)
                // means we dont need hardcoded unique ids or top-level functions like showDistoPanel hanging around the code
                //.attr ("id", "distoHide")
                //.on ("click", function() { showDistoPanel (false); })
        ;
        return parentBar;
    },

    addDynDivScaffolding : function (d3DivSelection) {
        CLMSUI.utils.addDynDivParentBar (d3DivSelection);
        CLMSUI.utils.addFourCorners (d3DivSelection);
    },

    // http://stackoverflow.com/questions/10066630/how-to-check-if-element-is-visible-in-zepto
    isZeptoDOMElemVisible : function (zeptoElem) {   // could be a jquery-ref'ed elem as well
        var height = zeptoElem.height() > 0;
        var visibility = zeptoElem.css('visibility') != 'hidden';
        var display = zeptoElem.css('display') != 'none';
        return (display && visibility && height);
    },

    // try .layerX / .layerY first as .offsetX / .offsetY is wrong in firefox
    // in fact don't use layerX / offsetX, they're unreliable cross-browser
    crossBrowserElementX : function (evt, optElem) {
        return evt.clientX - $(optElem || evt.target).offset().left;    // use evt.target if no optional element passed
        //return (evt.layerX || evt.offsetX) - evt.target.offsetLeft;
    },

    crossBrowserElementY : function (evt, optElem) {
        return evt.clientY - $(optElem || evt.target).offset().top;
    },

    checkBoxView: Backbone.View.extend ({
        tagName: "span",
        className: "buttonPlaceholder",
        events: {
            "click input": "checkboxClicked"
        },

        initialize: function (viewOptions) {
            var defaultOptions = {
                labelFirst: true
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el);
            if (!sel.attr("id")) {
                sel.attr("id", this.options.id);
            }
            var myid = "#" + sel.attr("id");

            var labs = sel.append("label")
                .attr("class", "btn")
                .style("padding-left", "0px")
            ;
            if (this.options.labelFirst) {
                labs.append("span").text(this.options.label);
            }
            labs.append ("input")
                .attr ("id", myid+"ChkBx")
                .attr("type", "checkbox")
            ;
            if (!this.options.labelFirst) {
                labs.append("span").text(this.options.label);
            }

            this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
        },

        showState : function (boolVal) {
            d3.select(this.el).select("input").property("checked", boolVal);
        },

        checkboxClicked: function () {
            CLMSUI.vent.trigger (this.options.eventName, d3.select(this.el).select("input").property("checked"));
        }
    }),

    addCheckboxBackboneView : function (options) {
        return new CLMSUI.utils.checkBoxView ({myOptions: options});
    },

    dpNumber: function (num, decimalPlaces, roundFunc) {
        var powerOfTen = Math.pow (10, decimalPlaces);
        return (roundFunc(num * powerOfTen) / powerOfTen).toFixed(decimalPlaces);
    },

    niceRoundMap: {1: 1, 2: 2, 3: 3, 4: 5, 5: 5, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10},

    niceRound: function (val) {
        var log = Math.floor (Math.log10 (val));
        var pow = Math.pow (10, log);
        val = Math.ceil (val / pow);  // will now be a number 1-10
        var roundVal = CLMSUI.utils.niceRoundMap[val];
        roundVal *= pow;
        return roundVal;
    },

    displayError: function (condition, message) {
        if (condition()) {
            var box = d3.select("#clmsErrorBox");
            if (box.size() === 0) {
                box = d3.select("body").append("div").attr("id", "clmsErrorBox");
            }

            box
                .style("display", "block")
                .html (message)
            ;
        }
    },

    RadioButtonFilterViewBB: Backbone.View.extend ({
        tagName: "div",
        events: {
            "click .singleRadioButton": "changeFilter"
        },
        initialize: function (initData) {
            var defaultOptions = {
                states: [0,1],
                labels: ["Option 1", "Option 2"],
                header: "A Filter",
                eventName: undefined,
                labelGroupFlow: "horizontalFlow"
            };
            this.options = _.extend(defaultOptions, initData.myOptions);
            if (this.options.eventName) {
                this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
            }
            this.render();
        },

         render: function () {
             var self = this;
             var con = d3.select(this.el);
             con.append("p").attr("class", "headerLabel").text(this.options.header);

             var sel = con.selectAll("label.singleChoice").data(this.options.states);
             var labs = sel.enter()
                .append ("label")
                .attr("class", "singleChoice "+self.options.labelGroupFlow)
             ;
             labs
                .append ("input")
                .attr("type", "radio")
                .attr("name", self.el.id + "RBGroup")
                .attr("value", function(d) { return d; })
                .attr("class", "singleRadioButton")
                //.property("checked", function(d,i) { return i == self.options.presetIndex; })
             ;
            var labels = this.options.labels;
             labs.append("span").text(function(d,i) { return labels[i]; });
         },

        showState : function (filterVal) {
            //console.log ("in show state rb", filterVal);
            var self = this;
            d3.select(this.el).selectAll("input.singleRadioButton")
                .property("checked", function(d,i) { return self.options.states[i] == filterVal; })
            ;
        },

         changeFilter: function (evt) {
             if (this.options.eventName) {
                CLMSUI.vent.trigger (this.options.eventName, +evt.currentTarget.value);
             }
         }
     }),

    BaseFrameView: Backbone.View.extend ({

        events: {
            // following line commented out, mouseup sometimes not called on element if pointer drifts outside element
            // and dragend not supported by zepto, fallback to d3 instead (see later)
            // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
            "click .downloadButton": "downloadSVG",
            "click .closeButton": "hideView",
            "click": "bringToTop",
        },

        initialize: function (viewOptions) {

            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            // Set up some html scaffolding in d3
            CLMSUI.utils.addDynDivScaffolding (mainDivSel);

            // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
            var drag = d3.behavior.drag().on ("dragend", function() { self.relayout(); });
            mainDivSel.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
                .call (drag)
            ;

            if (this.displayEventName) {
                this.listenTo (CLMSUI.vent, this.displayEventName, this.setVisible);
            }

            return this;
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },

        downloadSVG: function () {
            //var svgString = CLMSUI.utils.getSVG(d3.select(this.el).select("svg"));
            var svgSel = d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);
            //console.log ("xml", svgXML);
            download (svgXML, 'application/svg', "view.svg");
        },

        hideView: function () {
            CLMSUI.vent.trigger (this.displayEventName, false);
        },

        // find z-indexes of all visible, movable divs, and make the current one a higher z-index
        // then a bit of maths to reset the lowest z-index so they don't run off to infinity
        bringToTop : function () {
            var z = [];
            var activeDivs = d3.selectAll(".dynDiv").filter (function() {
                return CLMSUI.utils.isZeptoDOMElemVisible ($(this));
            });
            // default z-index is "auto" on firefox, + on this returns NaN, so need || 0 to make it sensible
            activeDivs.each (function(d,i) { z[i] = +d3.select(this).style("z-index") || 0; });   // all the z-indexes
            var range = d3.extent (z/*.filter (function(zi) { return zi !== 0; })*/);
            activeDivs.style("z-index", function() {
                return Math.max (0, +d3.select(this).style("z-index") - range[0] + 1);
            });
            d3.select(this.el).style("z-index", range[1] - range[0] + 2);
        },

        setVisible: function (show) {
            d3.select(this.el).style ('display', show ? 'block' : 'none');

            if (show) {
                this
                    .relayout() // need to resize first sometimes so render gets correct width/height coords
                    .render()
                ;
                this.bringToTop();
            }
        },

        // Ask if view is currently visible in the DOM
        isVisible: function () {
            var start = window.performance.now();
            console.log(this.$el.toString() + "isVis start:" + start);
            var answer = CLMSUI.utils.isZeptoDOMElemVisible (this.$el);
            console.log(this.$el, "isVis time:" + answer , (window.performance.now() - start));

            return answer;
        },

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy a c3 view just to be sure)
        remove: function () {
            // remove drag listener
            d3.select(this.el).selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br").on(".drag", null);

            // this line destroys the containing backbone view and it's events
            Backbone.View.prototype.remove.call(this);
        }
    }),
};

CLMSUI.utils.ColourCollectionOptionViewBB = Backbone.View.extend ({
    initialize: function (options) {
        var self = this;
        d3.select(this.el)
            .append("span")
            .text("Link Colours:")
        ;

        d3.select(this.el)
            .append("select")
            .attr("id", "linkColourSelect")
            .on ("change", function () {
                if (options.storeSelectedAt) {
                    var colourModel = self.model.at (d3.event.target.selectedIndex);
                    //CLMSUI.compositeModelInst.set("linkColourAssignment", colourModel);
                    options.storeSelectedAt.model.set (options.storeSelectedAt.attr, colourModel);
                }
            })
            .selectAll("option")
            .data(self.model.pluck("title"))    // this picks the title attribute from all models in BB collection, returned as array
            .enter()
            .append("option")
                .text (function(d) { return d; })
        ;

        if (options.storeSelectedAt) {
            this.listenTo (options.storeSelectedAt.model, "change:"+options.storeSelectedAt.attr, function (compModel, newColourModel) {
                //console.log ("colourSelector listening to change Link Colour Assignment", this, arguments);
                this.setSelected (newColourModel);
            });
        }

        return this;
    },

    setSelected: function (model) {
        d3.select(this.el)
            .selectAll("option")
            .property ("selected", function(d) {
                return d === model.get("title");
            })
        ;

        return this;
    }
});


CLMSUI.utils.KeyViewOldBB = CLMSUI.utils.BaseFrameView.extend ({
    initialize: function () {
        CLMSUI.utils.KeyViewOldBB.__super__.initialize.apply (this, arguments);

        var chartDiv = d3.select(this.el).append("div")
            .attr("class", "panelInner")
        ;
        // we don't replace the html of this.el as that ends up removing all the little re-sizing corners and the dragging bar div
        chartDiv.html ("<img id='defaultLinkKey' src='./images/fig3_1.svg'><br><img id='logo' src='./images/logos/rappsilber-lab-small.png'>");

        return this;
    }
});


CLMSUI.utils.FDRViewBB = CLMSUI.utils.BaseFrameView.extend ({
    initialize: function () {
        CLMSUI.utils.FDRViewBB.__super__.initialize.apply (this, arguments);

        var chartDiv = d3.select(this.el).append("div")
            .attr("class", "panelInner")
        ;
        // we don't replace the html of this.el as that ends up removing all the little re-sizing corners and the dragging bar div
        chartDiv.html ("<fieldset><legend>Basic FDR Calculation</legend><span></span></fieldset>");
        var self = this;
        var options = [0.01, 0.05, 0.1, 0.2, 0.5, undefined];
        var labelFunc = function (d) { return d === undefined ? "Off" : d3.format("%")(d); };

        function doFDR (d) {
            self.lastSetting = d;
            var result = CLMSUI.fdr (self.model.get("clmsModel").get("crossLinks"), {threshold: d});
            chartDiv.select(".fdrResult")
                .style("display", "block")
                .html("")
                .selectAll("p").data(result)
                    .enter()
                    .append("p")
                    .text(function(d) {
                        return d.label+" cutoff for "+labelFunc(self.lastSetting)+" is "+(d.thresholdMet ? ">="+d.fdr : ">"+d.fdr+" (Rate not met)");
                    })
            ;
            chartDiv.select(".fdrBoost").classed("btn-1a", true).property("disabled", false);

            // bit that communicates to rest of system
            self.model.get("filterModel")
                .set({"interFDRCut": result[0].fdr, "intraFDRCut": result[1].fdr })
            ;

            //console.log ("mm", self.model.get("filterModel"), result[0].fdr, result[1].fdr);
        }

        chartDiv.select("span").selectAll("label.fixed").data(options)
            .enter()
            .append("label")
            .classed ("horizontalFlow fixed", true)
                .append ("span")
                .attr ("class", "noBreak")
                .text(labelFunc)
                .append("input")
                    .attr("type", "radio")
                    .attr("value", function(d) { return d; })
                    .attr("name", "fdrPercent")
                    .on ("click", function(d) {
                        d3.select(self.el).select("input[type='number']").property("value", "");
                        doFDR (d);
                    })
        ;
        
        chartDiv.select("span")
            .append("label")
            .attr("class", "horizontalFlow")
                .append ("span")
                .attr ("class", "noBreak")
                .text("Other %")
                .append("input")
                    .attr("type", "number")
                    .attr("min", 0)
                    .attr("max", 100)
                    .attr("step", 1)
                    .on ("change", function() { // "input" activates per keypress which knackers typing in anything >1 digit
                        d3.select(self.el).selectAll("input[name='fdrPercent']").property("checked", false);
                        doFDR ((+this.value) / 100);
                    })
        ;

        chartDiv.append("button").attr("class", "fdrBoost btn btn-1").text("Boosting").property("disabled", true);
        chartDiv.append("div").attr("class", "fdrResult").style("display", "none");
        return this;
    }
});


CLMSUI.utils.sectionTable = function (domid, data, idPrefix, columnHeaders, headerFunc, rowFilterFunc, cellFunc) {
    //console.log ("data", data, this, arguments);

    var setArrow = function (d) {
        var assocTable = d3.select("#"+idPrefix+d.id);
        var tableIsHidden = (assocTable.style("display") == "none");
        d3.select(this)
            .style("background", tableIsHidden ? "none" : "#55a")
            .select("svg")
                .style("transform", "rotate("+(tableIsHidden ? 90 : 180)+"deg)")
        ;
    };

    var dataJoin = domid.selectAll("section").data(data, function(d) { return d.id; });
    dataJoin.exit().remove();
    var newElems = dataJoin.enter().append("section");

    var newHeaders = newElems.append("h2")
        .on ("click", function(d) {
            var assocTable = d3.select("#"+idPrefix+d.id);
            var tableIsHidden = (assocTable.style("display") == "none");
            assocTable.style("display", tableIsHidden ? "table" : "none");
            setArrow.call (this, d);
        })
        .on ("mouseover", function(d) {
            // eventually backbone shared highlighting code to go here
        })
    ;
    newHeaders.append("svg")
        .append("polygon")
            .attr("points", "0,14 7,0 14,14")
    ;
    newHeaders.append("span").text(headerFunc);

    var tables = newElems.append("table")
        .html("<thead><tr><th>"+columnHeaders[0]+"</th><th>"+columnHeaders[1]+"</th></tr></thead><tbody></tbody>")
        .attr("id", function(d) { return idPrefix+d.id; })
    ;

    var self = this;

    // yet another cobble a table together function, but as a string
    var makeTable237 = function (arrOfObjs) {
        var t = "<table><tr>";
        var headers = d3.keys(arrOfObjs[0]);
        headers.forEach (function(h) {
            t+="<TH>"+h+"</TH>";
        });
        t += "</TR>";
        arrOfObjs.forEach (function (obj) {
            t += "<TR>";
            d3.values(obj).forEach (function(h) {
                t+="<TD>"+h+"</TD>";
            });
            t += "</TR>";
        });
        t += "</TABLE>";
        return t;
    };

    var arrayExpandFunc = function (d, entries) {
        var newEntries = [];
        var expandKeys = self.options.expandTheseKeys;
        entries.forEach (function (entry) {
            // this way makes a row in main table per array entry
            /*
            newEntries.push (entry);
            if (expandKeys && expandKeys.has(entry.key)) {
                var vals = d[entry.key];
                vals.forEach (function (val, i) {
                    newEntries.push ({key: i, value: d3.values(val).join(",\t") });
                });
            }
            */
            // this way makes a nested table in a row of the main table
            if (expandKeys && expandKeys.has(entry.key)) {
                newEntries.push ({key: entry.key, value: makeTable237 (d[entry.key])});
            } else {
                newEntries.push (entry);
            }
        });
        return newEntries;
    };

    var tbodies = tables.select("tbody");
    var rowJoin = tbodies.selectAll("tr").data(function(d) { return arrayExpandFunc (d, rowFilterFunc (d)); });
    rowJoin.exit().remove();
    var newRows = rowJoin.enter().append("tr");

    newRows.selectAll("td").data(function(d) { return [{key: d.key, value: d.key}, {key: d.key, value: d.value}]; })
        .enter()
        .append("td")
        .classed ("fixedSizeFont", function(d,i) { return self.options.fixedFontKeys && self.options.fixedFontKeys.has (d.key) && i; })
        .each (cellFunc)
    ;

    dataJoin.selectAll("h2").each (setArrow);
};

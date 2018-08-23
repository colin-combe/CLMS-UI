/*jslint white: true, sloppy: true, vars: true*/
//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
    
    var CLMSUI = CLMSUI || {};

    CLMSUI.ScatterplotViewBB = CLMSUI.utils.BaseFrameView.extend ({   
        
    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{
        "mousemove .scatterplotBackground": "doTooltip",
        "mousemove .background": "doHighlightAndTooltip",
        "mousemove .extent": "doHighlightAndTooltip",
        "mouseleave .background": "clearHighlightAndTooltip",
        "click .jitter": "toggleJitter",
		"click .logX": "toggleLogX",
		"click .logY": "toggleLogY",
      });
    },
		
	defaultOptions: {
		xlabel: "Axis 1",
		ylabel: "Axis 2",
		chartTitle: "Scatterplot",
		selectedColour: "#ff0",
		highlightedColour: "#f80",
		jitter: true,
		chartMargin: 10,
		pointSize: 4,
		attributeOptions: null,
		standardTickFormat: d3.format(",d"),
		logX: false,
		logY: false
	},

    initialize: function (viewOptions) {
        CLMSUI.ScatterplotViewBB.__super__.initialize.apply (this, arguments);
        
        this.options.attributeOptions = CLMSUI.compositeModelInst.get("clmsModel").attributeOptions;

        var self = this;

        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 40 : 25,
            left:   this.options.ylabel ? 70 : 50
        };
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("scatterplotView", true); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div").attr("class", "toolbar");
        
        // Add download button
        var buttonData = [
            {class: "downloadButton2", label: CLMSUI.utils.commonLabels.downloadImg+"SVG", type: "button", id: "download"},
        ];
        CLMSUI.utils.makeBackboneButtons (this.controlDiv, self.el.id, buttonData);
        
        // Add two select widgets for picking axes data types
        this.setMultipleSelectControls (this.controlDiv, this.options.attributeOptions, false);
        
        // Add jitter toggle checkbox
        var toggleButtonData = [
            {class: "jitter", label: "Add Jitter", id: "jitter", type: "checkbox", inputFirst: true, initialState: this.options.jitter},
			{class: "logX", label: "Log X Axis", id: "logx", type: "checkbox", inputFirst: true, initialState: this.options.logX},
			{class: "logY", label: "Log Y Axis", id: "logy", type: "checkbox", inputFirst: true, initialState: this.options.logY}
        ];
        CLMSUI.utils.makeBackboneButtons (this.controlDiv, self.el.id, toggleButtonData);
        
        
        // Add the scatterplot and axes
        var chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr("flex-grow", 1)
            .style("position", "relative")
        ;      
        
        var viewDiv = chartDiv.append("div")
            .attr("class", "viewDiv")
        ;
        
                
        // Canvas
        this.canvas = viewDiv.append("div")
            .style("position", "absolute")
            .style("transform", "translate(" + this.margin.left + "px," + this.margin.top + "px)")
            .append ("canvas")  
            .style("transform", "translate(0px,0px)")
        ;
       
        // Scales
        this.x = d3.scale.linear();
        this.y = d3.scale.linear();
 
        // SVG element
        this.svg = viewDiv.append("svg");

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        ;

        this.scatg = this.vis.append("g");
        //this.scatg.append("rect")
        //    .attr ("class", "scatterplotBackground")
        //;
        
        // Axes setup
        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom").tickFormat(self.options.standardTickFormat);
        this.yAxis = d3.svg.axis().scale(this.y).orient("left").tickFormat(self.options.standardTickFormat);
        
        this.vis.append("g")
            .attr("class", "y axis")
        ;
        
        this.vis.append("g")
            .attr("class", "x axis")
        ;
        
        
        // Add labels
        var labelInfo = [
            {class: "axis", text: this.options.xlabel, dy: "0em"},
            {class: "axis", text: this.options.ylabel, dy: "1em"},
            {class: "chartHeader", text: this.options.chartTitle, dy: "-0.5em"},
        ];

        this.vis.selectAll("g.label")
            .data(labelInfo)
            .enter()
            .append ("g")
            .attr("class", "label")
            .append("text")
                .attr("class", function(d) { return d.class; })
                .text(function(d) { return d.text; })
                .attr("dy", function(d) { return d.dy; })
        ;
        
        // Brush
        var brushEnded = function (options) {
            options = options || {};
            options.extent = self.brush.extent();
            options.add = d3.event.ctrlKey || d3.event.shiftKey || (d3.event.sourceEvent ? d3.event.sourceEvent.ctrlKey || d3.event.sourceEvent.shiftKey : false);
            self.selectPoints (options);
        };
        
        var brushSnap = function () {
            if (d3.event.sourceEvent.type === "brush") { return; }
            var meta = self.getBothAxesMetaData();
            var selection = self.brush.extent();
            
            var adjs = meta.map (function (m) {
                return Math.pow (10, -m.decimalPlaces) / 2;
            });
            
            var expandOrShrink = function (selection, shrink) {
                var sign = shrink ? 1 : -1;
                return selection.map (function (corner, i) {
                    var gCorner = corner.slice();
                    gCorner[0] -= (adjs[0] * sign * (i === 0 ? -1 : 1));
                    gCorner[1] -= (adjs[1] * sign * (i === 0 ? -1 : 1));
                    return gCorner;
                });
            };
            
            var shrunkSelection = expandOrShrink (selection, true);

            var newSelection = shrunkSelection.map (function (corner) {
                return corner.map (function (v, axisIndex) { return d3.round (d3.round (v, 10), meta[axisIndex].decimalPlaces); }); 
                // sometimes numbers like 3.5 get rounded to 3.499999999999996 in javascript
                // then d3.round (3.49999999996, 0) returns 3, not what we want
                // so doing d3.round (3.49999999996, 10) return 3.5, then d3.round (3.5, 0) returns 4 which is what we want
            });

            var generousSelection = expandOrShrink (newSelection, false);
            
            //console.log ("d1", selection[0][0], selection[1][0], "old", shrunkSelection[0][0], shrunkSelection[1][0], "new", newSelection[0][0], newSelection[1][0], "generous", generousSelection[0][0], generousSelection[1][0], self.brush.extent(), d3.event);
            
            if (!_.isEqual (selection, generousSelection)) {
                self.brush.extent (generousSelection); 
                self.scatg.select(".brush").call(self.brush);   // recall brush binding so background rect is resized and brush redrawn
                ["n", "e"].forEach (function (orient, i) {
                    self.scatg.select(".resize."+orient+" text").text("["+newSelection[0][i]+" to "+newSelection[1][i]+"]");   // for brush extent labelling  
                });
            }
        };
        this.brush = d3.svg.brush()
            .x(self.x)
            .y(self.y)
            //.clamp ([false, false])
            .on("brush", brushSnap)
            .on("brushend", function() { brushEnded ({select: true}); })
        ;
        
        // Restore when match selection is sorted out
        this.scatg.append("g")
            .attr("class", "brush")
            .call(self.brush)
        ;
        
        
        this.scatg.select(".resize.n").append("text");
        this.scatg.select(".resize.e").append("text");
        
        this.scatg.select(".brush")
            .on ("mouseover", function () {
                self.scatg.select(".brush").selectAll("text").transition().duration(500).style("opacity", 1);
            })
            .on ("mouseout", function () {
                self.scatg.select(".brush").selectAll("text").transition().duration(500).style("opacity", 0);
            })
        ;
		
        
        // Listen to these events (and generally re-render in some fashion)
		// if highlighted/selection matches change, or colour model change, then recolour cross links
        this.listenTo (this.model, "selectionMatchesLinksChanged highlightsMatchesLinksChanged change:linkColourAssignment currentColourModelChanged", this.recolourCrossLinks);
        this.listenTo (this.model, "filteringDone", function() { this.renderCrossLinks ({isFiltering: true}); });
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", function() { this.axisChosen().render(); });
        this.listenTo (CLMSUI.vent, "linkMetadataUpdated", function (metaMetaData) {
            //console.log ("HELLO", arguments);
			var columns = metaMetaData.columns;
            var newOptions = columns.map (function (column) {
                return {
                    id: column, label: column, decimalPlaces: 2, matchLevel: false, 
                    linkFunc: function (c) {return c.meta ? [c.meta[column]] : []; },
                    unfilteredLinkFunc: function (c) {return c.meta ? [c.meta[column]] : []; },
                };
            });
            //console.log ("NEW OPTIONS", newOptions);

            var toolbar = mainDivSel.select("div.toolbar");
			self.setMultipleSelectControls (toolbar, newOptions, true);
        });
        
        this.axisChosen().render();     // initial render with defaults
    },
		
	setMultipleSelectControls: function (elem, options, keepOld) {
		var self = this;
		CLMSUI.utils.addMultipleSelectControls ({
            addToElem: elem, 
            selectList: ["X", "Y"], 
            optionList: options, 
			keepOldOptions: keepOld || false,
            selectLabelFunc: function (d) { return "Plot This Data Along ("+d+") Axis ►"; }, 
            optionLabelFunc: function (d) { return d.label; }, 
			optionValueFunc: function (d) { return d.id; },
            changeFunc: function () { self.axisChosen().render(); },
        });
	},
        
    // options.extent = area of selection in data coordinates if we're not picking it up from the brush
    // options.add = add to existing selections
    // options.select = true for selections, false for highlight
    selectPoints: function (options) {
        options = options || {};
        var xAxisData = this.getAxisData ("X", true);
        var yAxisData = this.getAxisData ("Y", true);
        var xData = xAxisData.data;
        var yData = yAxisData.data;
        var filteredCrossLinks = this.getFilteredCrossLinks ();
        var extent = options.extent || this.brush.extent();
        var matchLevel = xAxisData.matchLevel || yAxisData.matchLevel;
        var exmin = extent[0][0], exmax = extent[1][0], eymin = extent[0][1], eymax = extent[1][1];

        var add = options.add || false;
        var type = options.select ? "selection" : "highlights";
        //console.log ("type", options, type, matchLevel, xAxisData);
        
        // set up for calculating nearest datum to mouse position
        var nearest = {link: undefined, match: undefined, distance: Number.POSITIVE_INFINITY};
        var jitterOn = this.options.jitter;
        
        function testNearest (link, match, xd, yd) {
            var xjr = jitterOn ? this.getXJitter(link) : 0;
            var yjr = jitterOn ? this.getYJitter(link) : 0;
            var px = this.getXPosition (xd, xjr) - options.mousePosition.px;
            var py = this.getYPosition (yd, yjr) - options.mousePosition.py;
            var pd = (px * px) + (py * py);
            if (pd < nearest.distance) {
                nearest.distance = pd;
                nearest.match = match;
                nearest.link = link;
            }
        }

        if (matchLevel) {
            var matchingMatches = filteredCrossLinks.map (function (link, i) {
                var xDatum = xData[i];
                var yDatum = yData[i];

                var passMatches = (xDatum && yDatum) ? link.filteredMatches_pp.filter (function (match, ii) {
                    var xd = xDatum.length === 1 ? xDatum[0] : xDatum[ii];
                    var yd = yDatum.length === 1 ? yDatum[0] : yDatum[ii];
                    var within = (xd >= exmin && xd <= exmax && yd >= eymin && yd <= eymax);
                    if (within && options.calcNearest) {
                        testNearest.call (this, link, match, xd, yd);
                    }
                    return within;
                }, this) : [];

                return passMatches;
            }, this);
            var allMatchingMatches = d3.merge (matchingMatches);
            this.selectSize = allMatchingMatches.length;
            this.model.setMarkedMatches (type, allMatchingMatches, true, add);
        } else {
            var matchingLinks = filteredCrossLinks.filter (function (link, i) {
                var xDatum = xData[i];
                var yDatum = yData[i];
                var within = xDatum && xDatum.some (function (xd) {
                    return xd >= exmin && xd <= exmax;
                });
                within = within && yDatum && yDatum.some (function (yd) {
                    return yd >= eymin && yd <= eymax;
                });
                
                if (within && options.calcNearest) {
                    testNearest.call (this, link, undefined, xDatum[0], yDatum[0]);
                }
                return within;
            }, this);
            this.selectSize = matchingLinks.length;
            this.model.setMarkedCrossLinks (type, matchingLinks, true, add);
        }
        
        //console.log ("nearest", nearest);
        this.nearest = nearest;
    },
        
    relayout: function () {
        this.render();
        return this;
    },
        
    toggleJitter: function () {
        this.options.jitter = !this.options.jitter;
        this.render();
        return this;
    },
		
	toggleLogX: function (evt) {
		var checked = d3.select(evt.target).property("checked");
		this.options.logX = checked;
		return this
			.axisChosen()	// redo all axis information
			.render()
		;
	},
		
	toggleLogY: function (evt) {
		var checked = d3.select(evt.target).property("checked");
		this.options.logY = checked;
		return this
			.axisChosen()	// redo all axis information
			.render()
		;
	},
        
    getData: function (funcMeta, filteredFlag, optionalLinks) {
        var linkFunc = funcMeta ? (filteredFlag ? funcMeta.linkFunc : funcMeta.unfilteredLinkFunc) : undefined;
        var crossLinks = optionalLinks || 
            (filteredFlag ? this.getFilteredCrossLinks () : CLMS.arrayFromMapValues (this.model.get("clmsModel").get("crossLinks")))
        ;
        var data = crossLinks.map (function (c) {
            return linkFunc ? linkFunc.call (this, c) : [undefined];
        }, this);
        return data;
    },
        
    getSelectedOption: function (axisLetter) {
        var funcMeta;
        
        this.controlDiv
            .selectAll("select")
                .filter(function(d) { return d === axisLetter; })
                .selectAll("option")
                .filter(function() { return d3.select(this).property("selected"); })
                .each (function (d) {
                    funcMeta = d;
                })
        ;
        
        return funcMeta;
    },
        
    getFilteredCrossLinks: function () {
        return this.model.getFilteredCrossLinks ("all");    // include decoys and linears for this view
    },
        
    getAxisData: function (axisLetter, filteredFlag, optionalLinks) {
        var funcMeta = this.getSelectedOption (axisLetter);  
        var data = this.getData (funcMeta, filteredFlag, optionalLinks);
        return {
			label: funcMeta ? funcMeta.label : "?", 
			data: data, 
			zeroBased: !funcMeta.nonZeroBased, 
			matchLevel: funcMeta.matchLevel || false, 
			tickFormat: funcMeta.valueFormat || this.options.standardTickFormat,
			canLogAxis: funcMeta.logAxis || false,
			logStart: funcMeta.logStart
		};
    },
        
    getBothAxesMetaData: function () {
        return ["X", "Y"].map (function (axisLetter) {
            return this.getSelectedOption (axisLetter);
        }, this);    
    },
		
	isLinearScale: function (scale) {
		var domain = scale.domain();
		var bottomVal = scale(domain[0]);
		var fullRange = Math.abs (scale(domain[1]) - bottomVal);
		var halfRange = Math.abs (scale(d3.mean (domain)) - bottomVal);
		return (fullRange / halfRange) >= (2 - 0.001);	// -0.0001 for rounding
	},
		
	setValidEmptyBrushExtent: function () {
		this.brush.extent ([[this.x.domain()[0], this.y.domain()[0]], [this.x.domain()[0], this.y.domain()[0]]]);
	},
		
	makeXAxisType: function (setAsLogScale) {
		if (setAsLogScale === this.isLinearScale (this.x)) {	// only if different scale type is required
			this.x = setAsLogScale ? d3.scale.log() : d3.scale.linear();
			this.xAxis.scale (this.x);
			this.brush.x (this.x);
		}
		return this;
	},
		
	makeYAxisType: function (setAsLogScale) {
		if (setAsLogScale === this.isLinearScale (this.y)) {	// only if different scale type is required
			this.y = setAsLogScale ? d3.scale.log() : d3.scale.linear();
			this.yAxis.scale (this.y);
			this.brush.y (this.y);
		}
		return this;
	},
        
    axisChosen: function () { 
        var dataX = this.getAxisData ("X", false);
        var dataY = this.getAxisData ("Y", false);
		
		this.xAxis.tickFormat (dataX.tickFormat);
		this.yAxis.tickFormat (dataY.tickFormat);
		
		// swap out log or linear scales if current scale is different to incoming scale type
		this.makeXAxisType (dataX.canLogAxis && this.options.logX);
		this.makeYAxisType (dataY.canLogAxis && this.options.logY);
		
		var rootid = "#"+d3.select(this.el).attr("id");
		d3.select(this.el).select(rootid+"logx").style ("display", dataX.canLogAxis ? null : "none");
		d3.select(this.el).select(rootid+"logy").style ("display", dataY.canLogAxis ? null : "none");
		
		// make brush extent empty when new axis chosen. Make sure it's a valid value i.e. no zeroes in a log scale
		this.setValidEmptyBrushExtent();
        
        this.scaleAxes (dataX, dataY);
        
        // Update x/y labels and axes tick formats
		var self = this;
        this.vis.selectAll("g.label text").data([dataX, dataY])
            .text (function(d, i) { return (d.canLogAxis && self.options[i === 0 ? "logX": "logY"] ? "Log ": "") + d.label; })
        ;
        
        if (!this.brush.empty()) {
            this.model.setMarkedCrossLinks ("highlights", [], false, false);
        }
        this.brush.clear();
          
        return this;
    }, 
        
    scaleAxes: function (datax, datay) {
        var directions = [
            {dataDetails: datax, scale: this.x},
            {dataDetails: datay, scale: this.y},
        ];
        
        directions.forEach (function (direction) {
            var dom = d3.extent (d3.merge (direction.dataDetails.data));
            if (dom[0] === undefined || !_.isNumber (dom[0])) {
                dom = [0, 0];
            }
            if (direction.dataDetails.zeroBased && _.isNumber (dom[0])) {
                dom[0] = d3.min ([0, dom[0]]);
            }
            dom = dom.map (function (v, i) { 
                return _.isNumber(v) ? Math[i === 0 ? "floor": "ceil"](v) : v; 
            });
			
			var log = direction.dataDetails.canLogAxis;
			if (log) {
				dom[0] = direction.dataDetails.logStart;
			}
            //var leeway = Math.ceil (Math.abs(dom[1] - dom[0]) / 10) / 2;
            //dom[0] -= xLeeway; // 0.5;
            //dom[1] += 0.5;
            direction.scale.domain (dom);
            //console.log ("DOM", dom, direction.scale, direction.scale.domain());
        }); 
        
        this.calcJitterRanges();
        
        return this;
    },
        
    doHighlightAndTooltip: function (evt) {
        return this.doHighlight(evt).doTooltip(evt);
    },
        
    getHighlightRange: function (evt, squarius) {
        var background = d3.select(this.el).select(".background").node();
        var margin = this.options.chartMargin;
        var x = CLMSUI.utils.crossBrowserElementX (evt, background) + margin;
        var y = CLMSUI.utils.crossBrowserElementY (evt, background) + margin;
        var sortFunc = function (a,b) { return a - b; };
        var xrange = [this.x.invert (x - squarius), this.x.invert (x + squarius)].sort (sortFunc);
        var yrange = [this.y.invert (y - squarius), this.y.invert (y + squarius)].sort (sortFunc);
        return {xrange: xrange, yrange: yrange, mousePosition: {px: x, py: y}};
    },
      
    doTooltip: function (evt) {
        var axesMetaData = this.getBothAxesMetaData();
        var highlightRange = this.getHighlightRange (evt, 20);
        var vals = [highlightRange.xrange, highlightRange.yrange];
        var inBetweenValidValues = false;
        
        var tooltipData = axesMetaData.map (function (axisMetaData, i) {
            var commaFormat = d3.format(",."+axisMetaData.decimalPlaces+"f");
            var rvals = ["ceil", "floor"].map (function (func, ii) {
                var v = CLMSUI.utils[func] (vals[i][ii], axisMetaData.decimalPlaces);
                if (v === 0) { v = 0; } // gets rid of negative zero
                return v;
            });
            var fvals = rvals.map (function (v) { return commaFormat(v); });
            inBetweenValidValues |= (rvals[0] > rvals[1]);
            return [axisMetaData.label, rvals[0] > rvals[1] ? "---" : fvals[0] + (fvals[0] === fvals[1] ? "" : " to "+fvals[1])];  
        });
        
        if (inBetweenValidValues) {
            tooltipData = [];
        }
        
        var isMatchLevel = axesMetaData.some (function (axmd) { return axmd.matchLevel; });
        var size = this.selectSize;
        var levelText = isMatchLevel ? (size === 1 ? "Match" : "Matches") : (size === 1 ? "Cross-Link" : "Cross-Links");
        
        if (this.nearest && this.nearest.link) {
            var tipExtra = isMatchLevel ? CLMSUI.modelUtils.makeTooltipContents.match (this.nearest.match)
                : CLMSUI.modelUtils.makeTooltipContents.link (this.nearest.link);
            tooltipData = tooltipData.concat([["&nbsp;"],["Nearest "+(isMatchLevel ? "Match" : "Cross-Link")]]).concat (tipExtra);
        }
        
        if (!this.nearest.link) {
            tooltipData = null;
        }
        
         this.model.get("tooltipModel")
            .set("header", "Highlighting "+(d3.format(",")(size))+" "+levelText)
            .set("contents", tooltipData)
            .set("location", evt)
        ;
        this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
        return this;
    },
        
    doHighlight: function (evt) {
        var highlightRange = this.getHighlightRange (evt, 20);
        var extent = [
            [highlightRange.xrange[0], highlightRange.yrange[0]],
            [highlightRange.xrange[1], highlightRange.yrange[1]],
        ]; 
        this.selectPoints ({extent: extent, add: evt.shiftKey || evt.ctrlKey, calcNearest: true, mousePosition: highlightRange.mousePosition});
        return this;
    },
        
    clearHighlightAndTooltip: function () {
        return this.clearHighlight().clearTooltip();    
    },
        
    clearTooltip: function () {
        this.model.get("tooltipModel").set("contents", null);
        return this;
    },
        
    clearHighlight: function () {
        this.model.setMarkedCrossLinks ("highlights", [], false, false);
        return this;
    },
        
    render: function () {
        if (this.isVisible()) {
            console.log ("SCATTERPLOT RENDER");
            this
                .resize()
                .renderCrossLinks ({isVisible: true})
            ;
        }
        return this;
    },
        
        
    recolourCrossLinks: function () {
        this.renderCrossLinks ({recolourOnly: true});
        return this;
    },
        

    renderCrossLinks: function (options) {
        options = options || {};
        
        if (options.isVisible || this.isVisible()) {
            
            var pointSize = this.options.pointSize;
            var halfPointSize = pointSize / 2;
            
            //var self = this;
            var colourScheme = this.model.get("linkColourAssignment");

            var filteredCrossLinks = this.getFilteredCrossLinks ();
            var selectedCrossLinkIDs = d3.set (_.pluck (this.model.getMarkedCrossLinks("selection"), "id"));
            var highlightedCrossLinkIDs = d3.set (_.pluck (this.model.getMarkedCrossLinks("highlights"), "id"));
            
            var selectedMatchMap = this.model.getMarkedMatches ("selection");
            var highlightedMatchMap = this.model.getMarkedMatches ("highlights");
            
            var sortedFilteredCrossLinks = CLMSUI.modelUtils.radixSort (4, filteredCrossLinks, function (link) {
                return highlightedCrossLinkIDs.has (link.id) ? 3 : (selectedCrossLinkIDs.has (link.id) ? 2 : (link.isDecoyLink() ? 0 : 1));
            });
		          
            var makeCoords = function (datax, datay) {
                return datax.data.map (function (xd, i) {
                    var yd = datay.data[i];
                    var pairs;
                    if (xd.length === 1) {
                        pairs = yd.map (function (d) {
                            return [xd[0], d];
                        });
                    }
                    else if (yd.length === 1) {
                        pairs = xd.map (function (d) {
                            return [d, yd[0]];
                        });
                    }
                    else {
                        pairs = xd.map (function (d,i) {
                            return [d, yd[i]];
                        });
                    }
                    
                    // get rid of pairings where one of the values is undefined
                    pairs = pairs.filter (function (pair) {
                        return pair[0] !== undefined && pair[1] !== undefined;
                    });
                    
                    return pairs;
                });
            };
            
            /*
            var linkSel = this.scatg.selectAll("g.crossLinkGroup")
                .data (filteredCrossLinks, function(d) { return d.id; })
                .order()
            ;
            linkSel.exit().remove();
            linkSel.enter().append("g")
                .attr ("class", "crossLinkGroup")
            ;
            linkSel.each (function (d) {
                var high = highlightedCrossLinkIDs.has (d.id);
                var selected = selectedCrossLinkIDs.has (d.id);
                d3.select(this)
                    .style ("fill", high ?  self.options.highlightedColour : (selected ? self.options.selectedColour : colourScheme.getColour (d)))
                    .style ("stroke", high || selected ? "black" : null)
                    .style ("stroke-opacity", high || selected ? 0.4 : null)
                ;
            });
            
            
            if (!options.recolourOnly) {
                var jitter = this.options.jitter;
                var datax = this.getAxisData ("X", true, filteredCrossLinks);
                var datay = this.getAxisData ("Y", true, filteredCrossLinks);

                var coords = makeCoords (datax, datay);

                //console.log ("coords", datax, datay, coords);

                var matchSel = linkSel.selectAll("rect.datapoint").data (function(d,i) { return coords[i]; });

                matchSel.exit().remove();
                matchSel.enter().append("rect")
                    .attr ("class", "datapoint")
                    .attr ("width", pointSize)
                    .attr ("height", pointSize)
                ;

                matchSel
                    .attr("x", function(d) { 
                        var xr = Math.random() - 0.5;
                        var z = (d[0] * d[1]) + d[0] + d[1];
                        return self.x (d[0]) + (jitter ? xr * self.jitterRanges.x : 0); 
                    })
                    .attr("y", function(d) { 
                        var yr = Math.random() - 0.5;
                        return self.y (d[1]) + (jitter ? yr * self.jitterRanges.y : 0);
                    })
                ;
            }
            */
                        
            var canvasNode = this.canvas.node();
            var ctx = canvasNode.getContext("2d");       
            //ctx.fillStyle = this.options.background;
            ctx.clearRect (0, 0, canvasNode.width, canvasNode.height);
            ctx.imageSmoothingEnabled = false;
		
            
            var datax = this.getAxisData ("X", true, sortedFilteredCrossLinks);
            var datay = this.getAxisData ("Y", true, sortedFilteredCrossLinks);
            
            /*
            if (options.isFiltering) {
                this.scaleAxes (datax, datay);
            }
            */
            var matchLevel = datax.matchLevel || datay.matchLevel;
            var coords = makeCoords (datax, datay);
            var jitterOn = this.options.jitter;
            //console.log ("ddd", datax, datay, filteredCrossLinks, coords, colourScheme);
            
            var countable = colourScheme.isCategorical();
            var counts = countable ? d3.range (0, colourScheme.getDomainCount() + 1).map (function() { return 0; }) : [];

            sortedFilteredCrossLinks.forEach (function (link, i) {
                var decoy = link.isDecoyLink();
                var linkValue = colourScheme.getValue (link);
                var linkDomainInd = colourScheme.getDomainIndex (link);
                var colour = colourScheme.getColourByValue (linkValue);

                var high, selected, ambig;
                if (!matchLevel) {
                    high = highlightedCrossLinkIDs.has (link.id);
                    selected = selectedCrossLinkIDs.has (link.id);
					ambig = link.ambiguous;
                    ctx.fillStyle = high ? this.options.highlightedColour : (selected ? this.options.selectedColour : colour);
                    ctx.strokeStyle = high || selected ? "black" : (decoy || ambig ? ctx.fillStyle : null);
                }
                
                // try to make jitter deterministic so points don't jump on filtering, recolouring etc
                var xjr = jitterOn ? this.getXJitter(link) : 0;
                var yjr = jitterOn ? this.getYJitter(link) : 0;
                
                coords[i].forEach (function (coord, ii) {
                    //var xr = (Math.random() - 0.5);
                    //var yr = (Math.random() - 0.5);
                    if (matchLevel) {
                        var match = link.filteredMatches_pp[ii].match;
                        high = highlightedMatchMap.has (match.id);
                        selected = selectedMatchMap.has (match.id);
						ambig = match.isAmbig();
                        ctx.fillStyle = high ? this.options.highlightedColour : (selected ? this.options.selectedColour : colour);
                        ctx.strokeStyle = high || selected ? "black" : (decoy || ambig ? ctx.fillStyle : null);
                    }
                    var x = this.x (coord[0]) + xjr - halfPointSize;
                    var y = this.y (coord[1]) + yjr - halfPointSize;
					if (x === x && y === y) {	// Quick test for either of x or y being a NaN
						x = Math.round (x); // the rounding and 0.5s are to make fills and strokes crisp (i.e. not anti-aliasing)
						y = Math.round (y);
						if (decoy) {
							//var offset = Math.floor (halfPointSize);
							ctx.strokeRect (x - 0.5, y - 0.5, pointSize, pointSize);
							//ctx.fillRect (x, y + offset, pointSize + 1, 1);
							//ctx.fillRect (x + offset, y, 1, pointSize + 1);
						} else {
							if (ambig) {
								ctx.globalAlpha = 0.7;
							}
							ctx.fillRect (x, y, pointSize, pointSize);
							if (ambig) {
								ctx.globalAlpha = 1;
								ctx.setLineDash([3]);
								ctx.strokeRect (x - 0.5, y - 0.5, pointSize, pointSize);
								ctx.setLineDash([]);
							}
							else if (high || selected) {
								ctx.strokeRect (x - 0.5, y - 0.5, pointSize, pointSize);
							}

							if (countable) {
								if (linkDomainInd === undefined) {
									linkDomainInd = counts.length - 1;
								}
								counts[linkDomainInd]++;
							}
						}
					}
                }, this);
            }, this);
            
            /*
            if (options.isFiltering) {
                this.redrawAxes (this.getSizeData());
            }
            */
            
            // Remove unknown from appearing in title if no data falls into this category
            //console.log ("COUNTS", this.counts);
            if (_.last(counts) === 0) {
                counts.pop();
            }
            this.makeChartTitle (counts, colourScheme, d3.select(this.el).select(".chartHeader"), matchLevel);
        }
        return this;
    },
        
    getXJitter: function (link) {
        return (((link.fromResidue % 10) / 10) - 0.45) * this.jitterRanges.x;
    },
        
    getYJitter: function (link) {
        return (((link.fromResidue % 10) / 10) - 0.45) * this.jitterRanges.y;
    },
        
    getXPosition: function (xCoord, xJitter) {
        return this.x (xCoord) + xJitter;
    },
        
    getYPosition: function (yCoord, yJitter) {
        return this.y (yCoord) + yJitter;
    },
        
    getSizeData: function () {
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
        var cy = jqElem.height(); //this.svg.node().clientHeight;
        var width = Math.max (0, cx - this.margin.left - this.margin.right);
        var height = Math.max (0, cy - this.margin.top  - this.margin.bottom);
        // if it's going to be square and fit in containing div
        var minDim = Math.min (width, height);
        
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim,};
    },
        
    calcJitterRanges: function () {
        this.jitterRanges = this.jitterRanges || {};
        var xunit = Math.abs (this.x(this.x.domain()[0]) - this.x(this.x.domain()[0] + 1));
        this.jitterRanges.x = Math.max (2, xunit / 3);
        var yunit = Math.abs (this.y(this.y.domain()[0]) - this.y(this.y.domain()[0] + 1));
        this.jitterRanges.y = Math.max (2, yunit / 3);
        return this;
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        
        var sizeData = this.getSizeData(); 

        this.vis
            .style("width",  sizeData.width+"px")
            .style("height", sizeData.height+"px")
        ;      
        
        this.scatg.select(".scatterplotBackground")
            .attr("width",  sizeData.width)
            .attr("height", sizeData.height)
        ;    
        
        this.canvas
            .attr("width",  sizeData.width)
            .attr("height", sizeData.height)
			.attr("class", "backdrop")
        ;

        var extent = this.brush.extent(); // extent saved before x and y ranges updated
        var chartMargin = this.options.chartMargin;
        
        this.x.range([chartMargin, sizeData.width - chartMargin]);
        this.y.range([sizeData.height - chartMargin, chartMargin]); // y-scale (inverted domain)
        
        // https://stackoverflow.com/questions/32720469/d3-updating-brushs-scale-doesnt-update-brush
		
        this.brush.extent (extent); // old extent restored
		//console.log ("BRUISH EXTENT", extent);
        this.scatg.select(".brush").call(this.brush);   // recall brush binding so background rect is resized and brush redrawn

        this.xAxis.ticks (Math.round ((sizeData.width - (chartMargin * 2)) / 40)).outerTickSize(0);
        this.yAxis.ticks (Math.round ((sizeData.height - (chartMargin * 2)) / 40)).outerTickSize(0);

        this
            .redrawAxes (sizeData)
            .repositionLabels (sizeData)
            .calcJitterRanges()
        ;
        
        return this;
    },
        
    redrawAxes: function (sizeData) {
		this.vis.select(".x")
            .attr("transform", "translate(0," + (sizeData.height) + ")")
            .call(this.xAxis)
        ;
		
        this.vis.select(".y")
            .attr("transform", "translate(-1,0)")
            .call(this.yAxis)
        ;

        CLMSUI.utils.declutterAxis (this.vis.select(".x"));
		CLMSUI.utils.declutterAxis (this.vis.select(".y"));
        
        return this;
    },
        
    // Used to do this just on resize, but rectangular areas mean labels often need re-centred on panning
    repositionLabels: function (sizeData) {
        // reposition labels
        var labelCoords = [
            {x: sizeData.width / 2, y: sizeData.height + this.margin.bottom - 5, rot: 0}, 
            {x: -this.margin.left, y: sizeData.height / 2, rot: -90},
            {x: sizeData.width / 2, y: 0, rot: 0}
        ];
        this.vis.selectAll("g.label text")
            .data (labelCoords)
            .attr ("transform", function(d) {
                return "translate("+d.x+" "+d.y+") rotate("+d.rot+")";
            })
        ;
        return this;
    },
        
    canvasImageParent: "svg > g > g",   // where to put image made from canvas for downloading svg file
  
    identifier: "Scatterplot",
        
    optionsToString: function () {
        var meta = this.getBothAxesMetaData();
        var axisLabels = _.pluck (meta, "label");
        
        if (!this.brush.empty()) {
            var axisExtents = [];
            d3.select(this.el).selectAll(".brush text")
                .each (function () {
                    axisExtents.push (d3.select(this).text());
                })
            ;
            axisLabels = axisLabels.map (function (axisLabel, i) {
                return axisLabel + "_("+axisExtents[i]+")";
            });
        }
        return (this.options.jitter ? "Jitter_" : "") + axisLabels.join("_by_");
    },
});
    
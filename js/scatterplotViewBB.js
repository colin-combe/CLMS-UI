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
        "mousemove .background": "doTooltip",
        "mousemove .extent": "doTooltip",
        "click .jitter": "toggleJitter",
      });
    },

    initialize: function (viewOptions) {
        CLMSUI.ScatterplotViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;

        var defaultOptions = {
            xlabel: "Axis 1",
            ylabel: "Axis 2",
            chartTitle: "Cross-Link Data Scatterplot",
            selectedColour: "#ff0",
            highlightedColour: "#f80",
            background: "#e0e0e0",
            jitter: true,
            chartMargin: 10,
        };
        
        var scatterOptions = [
            {func: function(c) { return [c.filteredMatches_pp.length]; }, label: "Match Count", decimalPlaces: 0},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.score; }); }, label: "Match Score", decimalPlaces: 2},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorMZ; }); }, label: "Precursor MZ", decimalPlaces: 4},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorCharge; }); }, label: "Precursor Charge", decimalPlaces: 0},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.calc_mass; }); }, label: "Calculated Mass", decimalPlaces: 4},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.massError(); }); }, label: "Mass Error", decimalPlaces: 4},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return Math.min (m.pepPos[0].length, m.pepPos[1].length); }); }, label: "Smaller Peptide Length", decimalPlaces: 0},
            {func: function(c) { return [self.model.getSingleCrosslinkDistance (c)]; }, label: "Distance", decimalPlaces: 2},
        ];
        
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 40 : 25,
            left:   this.options.ylabel ? 70 : 50
        };
        
        this.displayEventName = viewOptions.displayEventName;
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("scatterplotView", true); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div");
        
        // Add download button
        var buttonData = [
            {class: "downloadButton2", label: CLMSUI.utils.commonLabels.downloadImg+"SVG", type: "button", id: "download"},
        ];
        CLMSUI.utils.makeBackboneButtons (this.controlDiv, self.el.id, buttonData);
        
        // Add two select widgets for picking axes data types
        var selects = this.controlDiv.selectAll("select")
            .data(["X", "Y"])
            .enter()
            .append ("label")
            .attr ("class", "btn")
                .append ("span")
                .attr ("class", "noBreak")
                .text (function(d) { return d+" Axis Attribute"; })
        ;
        
        selects.append("select")
            .on ("change", function() {
                self
                    .axisChosen ()
                    .render()
                ;
            })
            .selectAll("option")
            .data (scatterOptions)
                .enter()
                .append ("option")
                .text (function(d) { return d.label; })
        ;
        
        // Add jitter toggle checkbox
        var toggleButtonData = [
            {class: "jitter", label: "Jitter", id: "jitter", type: "checkbox", inputFirst: true, initialState: this.options.jitter}
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
        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom").tickFormat(d3.format(",d"));
        this.yAxis = d3.svg.axis().scale(this.y).orient("left").tickFormat(d3.format(",d"));
        
        this.vis.append("g")
            .attr("class", "y axis")
            //.call(self.yAxis)
        ;
        
        this.vis.append("g")
            .attr("class", "x axis")
            //.call(self.xAxis)
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
        var brushEnded = function () {
            var xData = self.getAxisData ("X", true).data;
            var yData = self.getAxisData ("Y", true).data;
            var filteredCrossLinks = self.model.getFilteredCrossLinks ();
            var extent = self.brush.extent();
            var selectLinks = filteredCrossLinks.filter (function (link, i) {
                var xDatum = xData[i];
                var yDatum = yData[i];
                var bool = xDatum && xDatum.some (function (xd) {
                    return xd >= extent[0][0] && xd <= extent[1][0];
                });
                bool = bool && yDatum && yDatum.some (function (yd) {
                    return yd >= extent[0][1] && yd <= extent[1][1];
                });
                return bool;
            });
            
            var add = d3.event.sourceEvent.ctrlKey || d3.event.sourceEvent.shiftKey;
            self.model.calcMatchingCrosslinks ("selection", selectLinks, true, add);
        };
        var brushSnap = function () {
            if (d3.event.sourceEvent.type === "brush") return;
            var meta = ["X", "Y"].map (function (axisLetter) {
                return self.getSelectedOption (axisLetter);
            });
            var selection = self.brush.extent();
            var newSelection = selection.map (function (corner) {
                return corner.map (function (v, axisIndex) { return d3.round (d3.round (v, 10), meta[axisIndex].decimalPlaces); }); 
                // sometimes numbers like 3.5 get rounded to 3.499999999999996 in javascript
                // then d3.round (3.49999999996, 0) returns 3, not what we want
                // so doing d3.round (3.49999999996, 10) return 3.5, then d3.round (3.5, 0) returns 4 which is what we want
            });
            
            var adjs = meta.map (function (m) {
                return Math.pow (10, -m.decimalPlaces) / 2;
            });
            
            var generousSelection = newSelection;/*.map (function (corner, i) {
                var gCorner = corner.slice();
                gCorner[0] += (adjs[0] * (i === 0 ? -1 : 1));
                gCorner[1] += (adjs[1] * (i === 0 ? -1 : 1));
                return gCorner;
            });*/
            
            console.log ("d1", selection, newSelection, self.brush.extent(), d3.event);
            console.log ("d1", selection[0][0], selection[1][0], "new", newSelection[0][0], newSelection[1][0], self.brush.extent());
            self.brush.extent (generousSelection); 
            self.scatg.select(".brush").call(self.brush);   // recall brush binding so background rect is resized and brush redrawn
            ["n", "e"].forEach (function (orient, i) {
                self.scatg.select(".resize."+orient+" text").text("["+newSelection[0][i]+" to "+newSelection[1][i]+"]");   // for brush extent labelling  
            });  
        };
        this.brush = d3.svg.brush()
            .x(self.x)
            .y(self.y)
            .on("brush", brushSnap)
            .on("brushend", brushEnded)
        ;
        this.scatg.append("g")
            .attr("class", "brush")
            .call(self.brush)
        ;
        self.scatg.select(".resize.n").append("text");
        self.scatg.select(".resize.e").append("text");
        
        // Listen to these events (and generally re-render in some fashion)
        this.listenTo (this.model, "change:selection", this.recolourCrossLinks);
        this.listenTo (this.model, "change:highlights", this.recolourCrossLinks);
        this.listenTo (this.model, "filteringDone", this.renderCrossLinks);
        this.listenTo (this.model, "change:linkColourAssignment", this.recolourCrossLinks);
        this.listenTo (this.model, "currentColourModelChanged", this.recolourCrossLinks);
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", function() { this.axisChosen().render(); });
        
        this.axisChosen().render();     // initial render with defaults
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
        
    brushEnded: function () {
                           
    },
        
    getData: function (func, filteredFlag, optionalLinks) {
        var crossLinks = optionalLinks || 
            (filteredFlag ? this.model.getFilteredCrossLinks () : CLMS.arrayFromMapValues (this.model.get("clmsModel").get("crossLinks")))
        ;
        var data = crossLinks.map (function (c) {
            return func ? func (c) : [undefined];
        });
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
        
    getAxisData: function (axisLetter, filteredFlag, optionalLinks) {
        var funcMeta = this.getSelectedOption (axisLetter);  
        var data = this.getData (funcMeta ? funcMeta.func : undefined, filteredFlag, optionalLinks);
        return {label: funcMeta ? funcMeta.label : "?", data: data, zeroBased: !funcMeta.nonZeroBased};
    },
        
    axisChosen: function () { 
        var datax = this.getAxisData ("X", false);
        var datay = this.getAxisData ("Y", false);
        
        var directions = [
            {dataDetails: datax, scale: this.x},
            {dataDetails: datay, scale: this.y},
        ];
        
        directions.forEach (function (direction) {
            var dom = d3.extent (d3.merge (direction.dataDetails.data));
            if (dom[0] === undefined) {
                dom = [0, 0];
            }
            if (direction.dataDetails.zeroBased) {
                dom[0] = Math.min (0, dom[0]);
            }
            dom = dom.map (function (v, i) { return Math[i === 0 ? "floor": "ceil"](v); });
            //var leeway = Math.ceil (Math.abs(dom[1] - dom[0]) / 10) / 2;
            //dom[0] -= xLeeway; // 0.5;
            //dom[1] += 0.5;
            direction.scale.domain (dom);
        }); 
        //console.log ("data", datax, datay, domX, domY);
        
        // Update x/y labels and axes tick formats
        this.vis.selectAll("g.label text").data([datax, datay])
            .text (function(d) { return d.label; })
        ;
        
        this.brush.clear();
        
        return this;
    }, 
        
    // Brush neighbourhood and invoke tooltip
    brushNeighbourhood: function (evt) {
        var xy = this.convertEvtToXY (evt);
        var linkWrappers = this.grabNeighbourhoodLinks (xy[0], xy[1]);
        var crossLinks = linkWrappers.map (function (linkWrapper) { return linkWrapper.crossLink; });
        
        // invoke tooltip before setting highlights model change for quicker tooltip response
        this.invokeTooltip (evt, linkWrappers);
        
        this.model.set ("highlights", crossLinks);
    },
        
    doTooltip: function (evt) {
        var axesData = ["X", "Y"].map (function (axisDir) {
            return this.getSelectedOption (axisDir);    
        }, this);
        var commaFormat = d3.format(",");
        var background = d3.select(this.el).select(".background").node();
        var margin = this.options.chartMargin;
        var vals = [
            this.x.invert (CLMSUI.utils.crossBrowserElementX (evt, background) + margin),
            this.y.invert (CLMSUI.utils.crossBrowserElementY (evt, background) + margin),
        ];
        var tooltipData = axesData.map (function (axisData, i) {
            var val = commaFormat (d3.round (vals[i], axisData.decimalPlaces));
            return [axisData.label, val];    
        });
        
         this.model.get("tooltipModel")
            .set("header", "Values")
            .set("contents", tooltipData)
            .set("location", evt)
        ;
        this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
    },
        

    render: function () {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
            console.log ("SCATTERPLOT RENDER");
            this
                .resize()
                .renderCrossLinks ()
            ;
        }
        return this;
    },
        
        
    recolourCrossLinks: function () {
        this.renderCrossLinks ({recolourOnly: true});
        return this;
    },
        

    renderCrossLinks: function (options) {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
            
            options = options || {};
            
            var pointSize = 4;
            
            var self = this;
            var colourScheme = this.model.get("linkColourAssignment");

            var filteredCrossLinks = this.model.getFilteredCrossLinks ();
            var selectedCrossLinkIDs = d3.set (this.model.get("selection").map (function(xlink) { return xlink.id; }));
            var highlightedCrossLinkIDs = d3.set (this.model.get("highlights").map (function(xlink) { return xlink.id; }));
            
            var radixSortBuckets = [[],[],[]]; // 3 groups
            filteredCrossLinks.forEach (function (link) {
                var bucketIndex = highlightedCrossLinkIDs.has (link.id) ? 2 : (selectedCrossLinkIDs.has (link.id) ? 1 : 0);
                radixSortBuckets[bucketIndex].push (link);
            });
            filteredCrossLinks = d3.merge (radixSortBuckets);
            
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
                    return pairs.filter (function (pair) {
                        return pair[0] !== undefined && pair[1] !== undefined;
                    });
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
            ctx.fillStyle = this.options.background;
            ctx.fillRect (0, 0, canvasNode.width, canvasNode.height);
            ctx.imageSmoothingEnabled = false;
            
            var datax = this.getAxisData ("X", true, filteredCrossLinks);
            var datay = this.getAxisData ("Y", true, filteredCrossLinks);

            var coords = makeCoords (datax, datay);
            
            filteredCrossLinks.forEach (function (link, i) {
                var high = highlightedCrossLinkIDs.has (link.id);
                var selected = selectedCrossLinkIDs.has (link.id);
                var jitter = this.options.jitter;
                ctx.fillStyle = high ?  self.options.highlightedColour : (selected ? self.options.selectedColour : colourScheme.getColour (link));
                ctx.strokeStyle = high || selected ? "black" : null;
                //.style ("stroke-opacity", high || selected ? 0.4 : null)
                
                // try to make jitter deterministic so points don't jump on filtering, recolouring etc
                var xr = ((link.fromResidue % 10) / 10) - 0.45;
                var yr = ((link.toResidue % 10) / 10) - 0.45;
                
                coords[i].forEach (function (coord) {
                    //var xr = (Math.random() - 0.5);
                    //var yr = (Math.random() - 0.5);
                    var x = self.x (coord[0]) + (jitter ? xr * self.jitterRanges.x : 0) - (pointSize / 2);
                    var y = self.y (coord[1]) + (jitter ? yr * self.jitterRanges.y : 0) - (pointSize / 2);
                    x = Math.round (x); // the rounding and 0.5s are to make fills and strokes crisp (i.e. not anti-aliasing)
                    y = Math.round (y);
                    ctx.fillRect (x, y, pointSize, pointSize) ;
                    if (high || selected) {
                        ctx.strokeRect (x - 0.5, y - 0.5, pointSize, pointSize) ;
                    }
                });
            }, this);
            
        }
        return this;
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
        ;

        var extent = this.brush.extent(); // extent saved before x and y ranges updated
        var chartMargin = this.options.chartMargin;
        
        this.x.range([chartMargin, sizeData.width - chartMargin]);
        this.y.range([sizeData.height - chartMargin, chartMargin]); // y-scale (inverted domain)
        
        // https://stackoverflow.com/questions/32720469/d3-updating-brushs-scale-doesnt-update-brush
        this.brush.extent (extent); // old extent restored
        this.scatg.select(".brush").call(this.brush);   // recall brush binding so background rect is resized and brush redrawn

        this.xAxis.ticks (Math.round ((sizeData.width - (chartMargin * 2)) / 40)).outerTickSize(0);
        this.yAxis.ticks (Math.round ((sizeData.height - (chartMargin * 2)) / 40)).outerTickSize(0);
        
        this.vis.select(".y")
            .attr("transform", "translate(-1,0)")
            .call(this.yAxis)
        ;
        
        this.vis.select(".x")
            .attr("transform", "translate(0," + (sizeData.height) + ")")
            .call(this.xAxis)
        ;
        
        this
            .repositionLabels (sizeData)
            .calcJitterRanges()
        ;
        
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
        var axisLabels = [];
        d3.select(this.el).selectAll("g.label text.axis")
            .each (function () {
                axisLabels.push (d3.select(this).text());
            })
        ;
        return (this.options.jitter ? "Jitter_" : "") + axisLabels.join("_by_");
    },
});
    
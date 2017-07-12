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
            jitter: true,
        };
        
        var scatterOptions = [
            {func: function(c) { return [c.filteredMatches_pp.length]; }, label: "Match Count"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.score; }); }, label: "Match Score"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorMZ; }); }, label: "Precursor MZ" },
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorCharge; }); }, label: "Precursor Charge"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.calc_mass; }); }, label: "Calculated Mass" },
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.massError(); }); }, label: "Mass Error" },
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return Math.min (m.pepPos[0].length, m.pepPos[1].length); }); }, label: "Smaller Peptide Length" },
            {func: function(c) { return [self.model.getSingleCrosslinkDistance (c)]; }, label: "Distance" },
        ];
        
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 35 : 25,
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
            {class: "downloadButton", label: CLMSUI.utils.commonLabels.downloadImg+"SVG", type: "button", id: "download"},
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
            .attr ("flex-grow", 1)
            .style("position", "relative")
        ;      
        
        var viewDiv = chartDiv.append("div")
            .attr("class", "viewDiv")
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
        this.scatg.append("rect")
            .attr ("class", "scatterplotBackground")
        ;
        
        // Axes setup
        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
        this.yAxis = d3.svg.axis().scale(this.y).orient("left");
        
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
        
        
    getData: function (func, filteredFlag) {
        var crossLinks = filteredFlag ? this.model.getFilteredCrossLinks () : CLMS.arrayFromMapValues (this.model.get("clmsModel").get("crossLinks"));
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
        
    getAxisData: function (axisLetter, filteredFlag) {
        var funcMeta = this.getSelectedOption (axisLetter);  
        var data = this.getData (funcMeta ? funcMeta.func : undefined, filteredFlag);
        return {label: funcMeta ? funcMeta.label : "?", data: data, zeroBased: !funcMeta.nonZeroBased};
    },
        
    axisChosen: function () { 
        var datax = this.getAxisData ("X", false);
        var datay = this.getAxisData ("Y", false);
        
        var domX = d3.extent (d3.merge (datax.data));
        var domY = d3.extent (d3.merge (datay.data));
        if (domY[0] === undefined) {
            domY = [0, 0];
        }
        if (domX[0] === undefined) {
            domX = [0, 0];
        }
        if (datax.zeroBased) {
            domX[0] = Math.min (0, domX[0]);
        }
        if (datay.zeroBased) {
            domY[0] = Math.min (0, domY[0]);
        }
        domX[0] -= 0.5;
        domY[0] -= 0.5;
        domX[1] += 0.5;
        domY[1] += 0.5;
        
        //console.log ("data", datax, datay, domX, domY);
        this.x.domain (domX);
        this.y.domain (domY);   
        
        // Update x/y labels and axes tick formats
        this.vis.selectAll("g.label text").data([datax, datay])
            .text (function(d) { return d.label; })
        ;
        
        return this;
    }, 
        
    selectNeighbourhood: function (evt) {
        // To stop this being run after a drag, make sure click co-ords are with sqrt(X) pixels of original mousedown co-ords
        this.startPoint = this.startPoint || {x: -10, y: -10};
        var mouseMovement = Math.pow ((evt.clientX - this.startPoint.x), 2) + Math.pow ((evt.clientY - this.startPoint.y), 2);
        this.startPoint = {x: -10, y: -10};
        if (mouseMovement <= 0) {   // Zero tolerance
            var xy = this.convertEvtToXY (evt);
            var add = evt.ctrlKey || evt.shiftKey;  // should this be added to current selection?
            var linkWrappers = this.grabNeighbourhoodLinks (xy[0], xy[1]);
            var crossLinks = linkWrappers.map (function (linkWrapper) { return linkWrapper.crossLink; });   
            this.model.calcMatchingCrosslinks ("selection", crossLinks, false, add);
            //this.model.set ("selection", crossLinks);
        }
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
        var axisLabels = [];
        d3.select(this.el).selectAll("g.label text.axis")
            .each (function () {
                axisLabels.push (d3.select(this).text());
            })
        ;
        var vals = [this.x.invert(CLMSUI.utils.crossBrowserElementX(evt)), this.y.invert(CLMSUI.utils.crossBrowserElementY(evt))];
        var niceVals = vals.map (function (v) { return d3.round (v); });
        var tooltipData = axisLabels.map (function (axisLabel, i) {
            return [axisLabel, niceVals[i]];    
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
            
            var self = this;
            var colourScheme = this.model.get("linkColourAssignment");

            var filteredCrossLinks = this.model.getFilteredCrossLinks ();
            var selectedCrossLinkIDs = d3.set (this.model.get("selection").map (function(xlink) { return xlink.id; }));
            var highlightedCrossLinkIDs = d3.set (this.model.get("highlights").map (function(xlink) { return xlink.id; }));
            
            var linkSel = this.scatg.selectAll("g.crossLinkGroup").data (filteredCrossLinks, function(d) { return d.id; });
            linkSel.exit().remove();
            linkSel.enter().append("g")
                .attr ("class", "crossLinkGroup")
            ;
            linkSel.style ("fill", function (d) {
                if (highlightedCrossLinkIDs.has (d.id)) { 
                    return self.options.highlightedColour;
                }
                if (selectedCrossLinkIDs.has (d.id)) {
                    return self.options.selectedColour;
                } 
                return colourScheme.getColour (d);
            });
            
            
            if (!options.recolourOnly) {
                var jitter = this.options.jitter;
                var datax = this.getAxisData ("X", true);
                var datay = this.getAxisData ("Y", true);

                var coords = datax.data.map (function (xd, i) {
                    var yd = datay.data[i];
                    var pairs;
                    if (xd.length === 1) {
                        pairs = yd.map (function (d) {
                            return [xd[0], d];
                        });
                    }
                    if (yd.length === 1) {
                        pairs = xd.map (function (d) {
                            return [d, yd[0]];
                        });
                    }
                    pairs = xd.map (function (d,i) {
                        return [d, yd[i]];
                    });
                    // get rid of pairings where one of the values is undefined
                    pairs = pairs.filter (function (pair) {
                        return pair[0] !== undefined && pair[1] !== undefined;
                    });
                    return pairs;
                });

                console.log ("coords", datax, datay, coords);

                var matchSel = linkSel.selectAll("rect.datapoint").data (function(d,i) { return coords[i]; });

                matchSel.exit().remove();
                matchSel.enter().append("rect")
                    .attr ("class", "datapoint")
                    .attr ("width", 2)
                    .attr ("height", 2)
                ;

                matchSel
                    .attr("x", function(d) { return self.x (d[0]) + (jitter ? (Math.random() - 0.5) * self.jitterRanges.x : 0); })
                    .attr("y", function(d) { return self.y (d[1]) + (jitter ? (Math.random() - 0.5) * self.jitterRanges.y : 0); })
                ;
            }
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
        this.scatg.select("rect")
            .style("width",  sizeData.width+"px")
            .style("height", sizeData.height+"px")
        ;    

        this.x.range([0, sizeData.width]);
        this.y.range([sizeData.height, 0]); // y-scale (inverted domain)

        this.xAxis.ticks (Math.round (sizeData.width / 40)).outerTickSize(0);
        this.yAxis.ticks (Math.round (sizeData.height / 40)).outerTickSize(0);
        
        var self = this;
        
        this.vis.select(".y")
            .call(self.yAxis)
        ;
        
        this.vis.select(".x")
            .attr("transform", "translate(0," + sizeData.height + ")")
            .call(self.xAxis)
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
            {x: sizeData.width / 2, y: sizeData.height + this.margin.bottom, rot: 0}, 
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

        
    identifier: "Scatterplot",
        
    optionsToString: function () {
        var axisLabels = [];
        d3.select(this.el).selectAll("g.label text.axis")
            .each (function () {
                axisLabels.push (d3.select(this).text());
            })
        ;
        return axisLabels.join("_by_");
    },
});
    
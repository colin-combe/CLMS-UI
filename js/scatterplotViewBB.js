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
        "mousemove canvas": "brushNeighbourhood",
        "click canvas": "selectNeighbourhood",
      });
    },

    initialize: function (viewOptions) {
        CLMSUI.DistanceMatrixViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;

        var defaultOptions = {
            xlabel: "Residue Index 1",
            ylabel: "Residue Index 2",
            chartTitle: "Cross-Link Data Scatterplot",
            background: "white",
            selectedColour: "#ff0",
            highlightedColour: "#f80",
        };
        
        var scatterOptions = [
            {func: function(c) { return [c.filteredMatches_pp.length]; }, label: "Match Count"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorCharge; }); }, label: "Precursor Charge"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.score; }); }, label: "Match Score"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorMZ; }); }, label: "Precursor MZ" },
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.calc_mass; }); }, label: "calculated Mass" },
        ];
        
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 45 : 25,
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
        
        this.controlDiv.selectAll("select")
            .data(["X", "Y"])
            .enter()
                .append("select")
                .on ("change", function(d) {
                    var selectedDatum = d3.select(this).selectAll("option")
                        .filter(function() { return d3.select(this).property("selected"); })
                        .datum()
                    ;
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
        
        this.zoomStatus = d3.behavior.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() { self.zoomHandler (self); })
        ;
 
        // SVG element
        this.svg = viewDiv.append("svg");

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        ;
        
        this.scatg = this.vis.append("g");
        
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
         
        this.listenTo (this.model, "change:selection", this.renderCrossLinks);
        this.listenTo (this.model, "change:highlights", this.renderCrossLinks);
        //this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
        this.listenTo (this.model, "filteringDone", this.renderCrossLinks);    // listen to custom filteringDone event from model - only need to update svg now, so only renderCrossLinks called
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render); 
    },
        
    relayout: function () {
        this.render();
        return this;
    },
        
        
    getData: function (func) {
        var filteredCrossLinks = this.model.getFilteredCrossLinks ();
        var data = filteredCrossLinks.map (function (c) {
            return func ? func (c) : [undefined];
        });
        return data;
    },
        
    getAxisData: function (axisLetter) {
        var funcMeta;
        
        var selects = this.controlDiv
            .selectAll("select")
                .filter(function(d) { return d === axisLetter; })
                .selectAll("option")
                .filter(function() { return d3.select(this).property("selected"); })
                .each (function (d, i) {
                    funcMeta = d;
                })
        ;     
        
        var data = this.getData (funcMeta ? funcMeta.func : undefined);
        return {label: funcMeta ? funcMeta.label : "?", data: data};
    },
        
 
        
    axisChosen: function () { 
        var datax = this.getAxisData ("X");
        var datay = this.getAxisData ("Y");
        
        var domX = d3.extent (d3.merge (datax.data));
        var domY = d3.extent (d3.merge (datay.data));
        console.log ("data", datax, datay, domX, domY);
        this.x.domain (domX);
        this.y.domain (domY);   
        
        // Update x/y labels and axes tick formats
        this.vis.selectAll("g.label text").data([datax, datay])
            .text (function(d) { return d.label; })
        ;
        
        return this;
    }, 
        
    setStartPoint: function (evt) {
        this.startPoint = {x: evt.clientX, y: evt.clientY};
    },
        
    convertEvtToXY: function (evt) {
        var sd = this.getSizeData();
        var x = evt.offsetX + 1;
        var y = (sd.lengthB - 1) - evt.offsetY;
        return [x,y];
    },
        
    grabNeighbourhoodLinks: function (x, y) {
        //var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
        var filteredCrossLinks = this.model.getFilteredCrossLinks ();
        var filteredCrossLinkMap = d3.map (filteredCrossLinks, function(d) { return d.id; });
        var proteinIDs = this.getCurrentProteinIDs();
        var alignIDs = this.getAlignIDs (proteinIDs);
        var alignColl = this.model.get("alignColl");
        var convFunc = function (x, y) {    // x and y are 0-indexed
            var fromResIndex = alignColl.getAlignedIndex (x + 1, proteinIDs[0].proteinID, true, alignIDs[0]);
            var toResIndex = alignColl.getAlignedIndex (y + 1, proteinIDs[1].proteinID, true, alignIDs[1]);
            return {convX: fromResIndex, convY: toResIndex, proteinX: proteinIDs[0].proteinID, proteinY: proteinIDs[1].proteinID};
        };
        var neighbourhoodLinks = CLMSUI.modelUtils.findResiduesInSquare (convFunc, filteredCrossLinkMap, x, y, 2, false);
        neighbourhoodLinks = neighbourhoodLinks.filter (function (crossLinkWrapper) {
            var est = CLMSUI.modelUtils.getEsterLinkType (crossLinkWrapper.crossLink);
            return (this.filterVal === undefined || est >= this.filterVal);
        }, this);
        return neighbourhoodLinks;
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
        
    filterMatrixOptions: function (matrices, filterFunc) {
        return matrices.filter (filterFunc);
    },
        
    invokeTooltip : function (evt, linkWrappers) {
        if (this.options.matrixObj) {
            var distanceMatrix = this.options.matrixObj.distanceMatrix;
            linkWrappers.forEach (function (linkWrapper) {
                linkWrapper.distance = distanceMatrix[linkWrapper.x][linkWrapper.y];
                linkWrapper.distanceFixed = linkWrapper.distance ? linkWrapper.distance.toFixed(3) : "Unknown";
            });
            linkWrappers.sort (function (a, b) { return b.distance - a.distance; });
            var crossLinks = linkWrappers.map (function (linkWrapper) { return linkWrapper.crossLink; });
            var linkDistances = linkWrappers.map (function (linkWrapper) { return linkWrapper.distanceFixed; });

            this.model.get("tooltipModel")
                .set("header", CLMSUI.modelUtils.makeTooltipTitle.linkList (crossLinks.length - 1))
                .set("contents", CLMSUI.modelUtils.makeTooltipContents.linkList (crossLinks, {"Distance": linkDistances}))
                .set("location", evt)
            ;
            this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
        }
    },
        
    
   
    
    render: function () {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
            console.log ("SCATTERPLOT RENDER");

            // make underlying canvas big enough to hold 1 pixel per possible residue pair
            // it gets rescaled in the resize function to fit a particular size on the screen
            /*
            var seqLengths = this.getSeqLengthData();
            this.canvas
                .attr("width",  seqLengths.lengthA)
                .attr("height", seqLengths.lengthB)
            ;
            */
            this
                .resize()
                .renderCrossLinks ()
            ;
        }
        return this;
    },
        

    renderCrossLinks: function () {
        
        var self = this;
        var colourScheme = this.model.get("linkColourAssignment");

            var filteredCrossLinks = this.model.getFilteredCrossLinks ();//.values();
            var selectedCrossLinkIDs = d3.set (this.model.get("selection").map (function(xlink) { return xlink.id; }));
            var highlightedCrossLinkIDs = d3.set (this.model.get("highlights").map (function(xlink) { return xlink.id; }));

            var datax = this.getAxisData ("X");
            var datay = this.getAxisData ("Y");
        
        
        
            var coords = datax.data.map (function (xd,i) {
                var yd = datay.data[i];
                if (xd.length === 1) {
                    return yd.map (function (d) {
                        return [xd[0], d];
                    })
                }
                if (yd.length === 1) {
                    return xd.map (function (d) {
                        return [d, yd[0]];
                    })
                }
                return xd.map (function (d,i) {
                    return [d, yd[i]];
                })
            });
        
            console.log ("coords", datax, datay, coords);

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
        
            var matchSel = linkSel.selectAll("rect.datapoint").data (function(d,i) { return coords[i]; });
        
            matchSel.exit().remove();
            matchSel.enter().append("rect")
                .attr ("class", "datapoint")
                .attr ("width", 2)
                .attr ("height", 2)
            ;
        
            matchSel
                .attr("x", function(d, i) { return self.x (d[0]); })
                .attr("y", function(d, i) { return self.y (d[1]); })
            ;
        
        //console.log("res sas", {in: sasIn, mid: sasMid, out: sasOut}, "euc", {in: eucIn, mid: eucMid, out: eucOut});
        return this;
    },
        
    getSizeData: function () {
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
        var cy = jqElem.height(); //this.svg.node().clientHeight;
        var width = Math.max (0, cx - this.margin.left - this.margin.right);
        var height = Math.max (0, cy - this.margin.top  - this.margin.bottom);
        //its going to be square and fit in containing div
        var minDim = Math.min (width, height);
        
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim,};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        
        var sizeData = this.getSizeData(); 

        this.vis
            .style("width",  sizeData.width+"px")
            .style("height", sizeData.height+"px")
        ;      

        this.x.range([0, sizeData.width]);

        // y-scale (inverted domain)
        this.y.range([sizeData.height, 0]);

        this.xAxis.ticks (Math.round (sizeData.width / 50)).outerTickSize(0);
        this.yAxis.ticks (Math.round (sizeData.height / 50)).outerTickSize(0);
        
        var self = this;
        
        this.vis.select(".y")
            .call(self.yAxis)
        ;
        
        this.vis.select(".x")
            //.attr("transform", "translate(0," + sizeData.viewHeight + ")")
            .attr("transform", "translate(0," + sizeData.height + ")")
            .call(self.xAxis)
        ;
        
        this.repositionLabels (sizeData);
        
        return this;
    },
        
    // Used to do this just on resize, but rectangular areas mean labels often need re-centred on panning
    repositionLabels: function (sizeData) {
        // reposition labels
        console.log ("SD", sizeData, this.margin);
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
        var matrixObj = this.options.matrixObj;
        return [+matrixObj.chain1, +matrixObj.chain2]
            .map (function (chain) { return this.getLabelText(chain).replace(/\s+/g, ''); }, this)
            .join("-")
        ;
    },
});
    
//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
    
    var CLMSUI = CLMSUI || {};

    CLMSUI.DistanceMatrixViewBB = CLMSUI.utils.BaseFrameView.extend ({   
        
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
            matrixObj: null,
            selectedColour: "#ff0",
            highlightedColour: "#f80",
        };
        
        var scatterOptions = [
            {func: function(c) { return c.filteredMatches_pp.length; }, label: "Match Count"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.precursorCharge; }); }, label: "Precursor Charge"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.score; }); }, label: "Match Score"},
            {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.precursorCharge; }); }, label: "Precursor MZ" },
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
        var mainDivSel = d3.select(this.el); 
        
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
                        .axisChosen (d, selectedDatum.func)
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
        
        
        // Add clippable and pan/zoomable viewport made of two group elements
        this.clipGroup = this.vis.append("g")
            .attr("class", "clipg")
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
         
        this.listenTo (this.model, "change:selection", this.renderCrossLinks);
        this.listenTo (this.model, "change:highlights", this.renderCrossLinks);
        //this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
        this.listenTo (this.model, "filteringDone", this.renderCrossLinks);    // listen to custom filteringDone event from model - only need to update svg now, so only renderCrossLinks called
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render); 
    },
        
    relayout: function () {
        this.resize();
        return this;
    },
        
        
    getData: function (func) {
        d3.selectAll("")  
    },
        
 
        
    axisChosen: function (key) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        console.log ("DISTANCES OBJ", distancesObj);
        this.options.matrixObj = distancesObj.matrices[key];
        
        var seqLengths = this.getSeqLengthData();
        this.x.domain([0, seqLengths.lengthA]);
        this.y.domain([seqLengths.lengthB, 0]);   
        
        console.log ("SEQ LEN", seqLengths);
        
        // Update x/y labels and axes tick formats
        //this.xAxis.tickFormat ("this.curriedAlignedIndexAxisFormat (protIDs[0].proteinID, alignIDs[0], this, 0)");
        //this.yAxis.tickFormat (this.curriedAlignedIndexAxisFormat (protIDs[1].proteinID, alignIDs[1], this, 0));
        this.vis.selectAll("g.label text").data(["X", "Y"])
            .text (function(d) { return d.labelText; })
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
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.options.matrixObj) {
            console.log ("MATRIX RENDER");

            // make underlying canvas big enough to hold 1 pixel per possible residue pair
            // it gets rescaled in the resize function to fit a particular size on the screen
            var seqLengths = this.getSeqLengthData();
            this.canvas
                .attr("width",  seqLengths.lengthA)
                .attr("height", seqLengths.lengthB)
            ;
            this
                .resize()
                .renderCrossLinks ()
            ;
        }
        return this;
    },
        

    renderCrossLinks: function () {
        
        var self = this;
        
        if (this.options.matrixObj) {
        
            var canvasNode = this.canvas.node();
            var ctx = canvasNode.getContext("2d");
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;  // 0.5;

            var rangeDomain = this.colourScaleModel.get("colScale").domain();
            var min = rangeDomain[0];
            var max = rangeDomain[1];
            var rangeColours = this.colourScaleModel.get("colScale").range();
            this.resLinkColours = rangeColours.map (function (col, i) {
                /*
                col = d3.hsl(col);
                col.s = 1 - (i * 0.1);
                col.l = 0.4 - (i * 0.1);
                return col.rgb();
                */
                return col;
            });
            this.resLinkColours.push ("#000");

            var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;

            var distanceMatrix = this.options.matrixObj.distanceMatrix;
            var seqLengths = this.getSeqLengthData();
            var seqLengthB = seqLengths.lengthB - 1;
            var xStep = 1;//minDim / seqLengthA;
            var yStep = 1;//minDim / seqLengthB;
            var linkWidth = 3;
            var linkWidthOffset = (linkWidth - 1) / 2;
            var xLinkWidth = linkWidth * xStep;
            var yLinkWidth = linkWidth * yStep;

            var proteinIDs = this.getCurrentProteinIDs();
            var alignIDs = this.getAlignIDs (proteinIDs);
            var alignColl = this.model.get("alignColl");
            // only consider crosslinks between the two proteins (often the same one) represented by the two axes
            // var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
            var filteredCrossLinks = this.model.getFilteredCrossLinks ();//.values();

            var selectedCrossLinkIDs = d3.set (this.model.get("selection").map (function(xlink) { return xlink.id; }));
            var highlightedCrossLinkIDs = d3.set (this.model.get("highlights").map (function(xlink) { return xlink.id; }));
            
            var fromToStore = [];
            var finalCrossLinks = Array.from(filteredCrossLinks).filter (function (crossLink) {
                if ((crossLink.toProtein.id === proteinIDs[0].proteinID && crossLink.fromProtein.id === proteinIDs[1].proteinID) || (crossLink.toProtein.id === proteinIDs[1].proteinID && crossLink.fromProtein.id === proteinIDs[0].proteinID)) {
                    var est = CLMSUI.modelUtils.getEsterLinkType (crossLink);
                    // only show those of given ester types if ester filter in place
                    if (self.filterVal === undefined || est >= self.filterVal) {
                        var fromDir = (crossLink.fromProtein.id === proteinIDs[0].proteinID) ? 0 : 1;
                        var toDir = 1 - fromDir;
                        // get index of residues within current matrix (chain v chain)
                        var fromResIndex = alignColl.getAlignedIndex (crossLink.fromResidue, proteinIDs[fromDir].proteinID, false, alignIDs[fromDir]);
                        var toResIndex = alignColl.getAlignedIndex (crossLink.toResidue, proteinIDs[toDir].proteinID, false, alignIDs[toDir]);

                        // show only those that map to the current matrix - i.e. combination of two chains
                        if (fromResIndex !== null && toResIndex !== null) {
                            // 0-index these indices and store them for use next (saves recalcualting them)
                            fromToStore.push ([fromResIndex - 1, toResIndex - 1]);
                            return true;
                        }
                    }
                }
                return false;
            });
            
            
            var linkSel = this.zoomGroup.selectAll("rect.crossLink").data(finalCrossLinks, function(d) { return d.id; });
            linkSel.exit().remove();
            linkSel.enter().append("rect")
                .attr ("class", "crossLink")
                .attr ("width", xLinkWidth)
                .attr ("height", yLinkWidth)
            ;
            linkSel
                .attr("x", function(d, i) { return fromToStore[i][0] - linkWidthOffset; })
                .attr("y", function(d, i) { return (seqLengthB - fromToStore[i][1]) - linkWidthOffset; })
                .style ("fill", function (d, i) {
                    var high = highlightedCrossLinkIDs.has (d.id);
                    if (high) { return self.options.highlightedColour; }
                    if (selectedCrossLinkIDs.has (d.id)) {
                        return self.options.selectedColour;
                    } 
                    var fromDistArr = distanceMatrix[fromToStore[i][0]];
                    var dist = fromDistArr ? fromDistArr[fromToStore[i][1]] : undefined;
                    return self.resLinkColours [dist ? (dist < min ? 0 : (dist < max ? 1 : 2)): 3];
                })
            ;
        }
        
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
        
        var sizeData = this.getSeqLengthData();
        $.extend (sizeData, {cx: cx, cy: cy, width: width, height: height, minDim: minDim,});
        return sizeData;
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        
        console.log ("matrix resize");
        var sizeData = this.getSizeData(); 
        var minDim = sizeData.minDim;
        var deltaz = this.last ? (minDim / this.last) : 1;
        //console.log ("deltaz", deltaz);
        this.last = minDim;
        		
        // fix viewport new size, previously used .attr, but then setting the size on the child canvas element expanded it, some style trumps attr thing
        
        var widthRatio = minDim / sizeData.lengthA;
        var heightRatio = minDim / sizeData.lengthB;
        var minRatio = Math.min (widthRatio, heightRatio);
        var maxRatio = Math.max (widthRatio, heightRatio);
        var diffRatio = widthRatio / heightRatio;
        //console.log (sizeData, "rr", widthRatio, heightRatio, minRatio, maxRatio, diffRatio);
        
        var viewPort = d3.select(this.el).select(".viewport");
        viewPort
            .style("width",  minDim+"px")
            .style("height", minDim+"px")
            //.style("width",  sizeData.width+"px")
            //.style("height", sizeData.height+"px")
        ;
        
        d3.select(this.el).select("#matrixClip > rect")
            .attr ("width", minDim)
            .attr ("height", minDim)
        ;
        
        
 
        // Need to rejig x/y scales and d3 translate coordinates if resizing
        // set x/y scales to full domains and current size (range)
        this.x
            .domain([0, sizeData.lengthA])
            .range([0, diffRatio > 1 ? minDim / diffRatio : minDim])
        ;

        // y-scale (inverted domain)
        this.y
			 .domain([sizeData.lengthB, 0])
			 .range([0, diffRatio < 1 ? minDim * diffRatio : minDim])
        ;
        
        var approxTicks = Math.round (minDim / 50); // 50px minimum spacing between ticks
        //var tvalues = d3.range (1, sizeData.lengthA - 1).map (function (d) { return d + 0.5; });
        //console.log ("TVALUES", tvalues);
        //this.xAxis.tickValues(tvalues).outerTickSize(0);
        this.xAxis.ticks(approxTicks).outerTickSize(0);
        this.yAxis.ticks (approxTicks).outerTickSize(0);
        
        // then store the current pan/zoom values
        var curt = this.zoomStatus.translate();
        var curs = this.zoomStatus.scale();
        
        // reset reference x and y scales in zoomStatus object to be x and y scales above
        this.zoomStatus.x(this.x).y(this.y);

        // modify translate coordinates by change (delta) in display size
        curt[0] *= deltaz;
        curt[1] *= deltaz;
        // feed current pan/zoom values back into zoomStatus object
        // (as setting .x and .y above resets them inside zoomStatus)
        // this adjusts domains of x and y scales
        this.zoomStatus.scale(curs).translate(curt);
        
        // Basically the point is to readjust the axes when the display space is resized, but preserving their current zoom/pan settings
        // separately from the scaling due to the resizing
        
        // pan/zoom canvas
        this.panZoom ();   
        
        return this;
    },
        
    // Used to do this just on resize, but rectangular areas mean labels often need re-centred on panning
    repositionLabels: function (sizeData) {
        // reposition labels
        console.log ("SD", sizeData, this.margin);
        var labelCoords = [
            {x: sizeData.viewWidth / 2, y: sizeData.viewHeight + this.margin.bottom, rot: 0}, 
            {x: -this.margin.left, y: sizeData.viewHeight / 2, rot: -90},
            {x: sizeData.viewWidth / 2, y: 0, rot: 0}
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
    
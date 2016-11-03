//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
//
//		graph/Matrix.js
    
    var CLMSUI = CLMSUI || {};

    CLMSUI.DistanceMatrixViewBB = CLMSUI.utils.BaseFrameView.extend ({   
        
    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{
        "mousemove canvas": "invokeTooltip",
        "contextmenu canvas": "selectNeighbourhood",
      });
    },

    initialize: function (viewOptions) {
        CLMSUI.DistanceMatrixViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;

        var defaultOptions = {
            xlabel: "Residue Index 1",
            ylabel: "Residue Index 2",
            chartTitle: "Cross-Link Matrix",
            background: "white",
            distMatrix: null,
            distMatrixKey: null,
        };
        
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 45 : 25,
            left:   this.options.ylabel ? 70 : 50
        };
        
        this.displayEventName = viewOptions.displayEventName;
        this.colourScaleModel = viewOptions.colourScaleModel;
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div");
    
        this.controlDiv.append("label")
            .attr("class", "btn")
            .append ("span")
                .attr("class", "noBreak")
                .text("Select Matrix Regions")
                .append("select")
                    .attr("id", "chainSelect")
                    .on ("change", function () {
                        self
                            .matrixChosen ($('#chainSelect').val())
                            .render()
                            .panZoom()
                        ;
                    })
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
        
        // Canvas viewport and element
        var canvasViewport = viewDiv.append("div")
            .attr ("class", "viewport")
            .style("top", this.margin.top + "px")
            .style("left", this.margin.left + "px")
            .call(self.zoomStatus)
        ;
        
        this.canvas = canvasViewport.append("canvas");

        
        // SVG element
        this.svg = viewDiv.append("svg");

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
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
            {class: "matrixHeader", text: this.options.chartTitle, dy: "-0.5em"},
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
        
        this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render); 
        this.listenTo (this.model, "change:selection", this.renderCrossLinks);
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.distancesChanged); 
    },
        
    relayout: function () {
        this.resize();
        return this;
    },
        
    distancesChanged: function () {
        var self = this;
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        console.log ("IN MATRIX DISTANCES CHANGED", distancesObj, this.model.get("clmsModel"));
        var matrixTitles = d3.keys(distancesObj.matrices);
        
        var matrixOptions = d3.select(this.el).select("#chainSelect")
            .selectAll("option")
            .data(matrixTitles, function(d) { return d; })
        ;
        matrixOptions.exit().remove();
        matrixOptions
            .enter()
            .append("option")
                .property ("value", function(d) { return d;})
                .text (function(d) { 
                    var ids = d.split("-");
                    return ids.map (function(id) { return self.getLabelText(+id); }).join(" - "); 
                })
        ;
        
        this.matrixChosen (matrixTitles[0]);
    },
        
    matrixChosen: function (key) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        this.options.distMatrix = distancesObj.matrices[key];
        this.options.distMatrixKey = key;
        
        var seqLengths = this.getSeqLengthData();
        this.x.domain([0, seqLengths.lengthA]);
        this.y.domain([seqLengths.lengthB, 0]);   
        
        console.log ("SEQ LEN", seqLengths);
        
        this.vis.select(".y")
			 .call(this.yAxis)
        ;
        this.vis.select(".x")
			 .call(this.xAxis)
        ;
        
        // Update x/y labels
        var protIDs = this.getCurrentProteinIDs();
        this.vis.selectAll("g.label text").data(protIDs)
            .text (function(d) { return d.labelText; })
        ;
        
        var alignIDs = this.getAlignIDs (protIDs);
        this.axisFormatX = this.curriedAlignedIndexAxisFormat (protIDs[0].proteinID, alignIDs[0], this, 0);
        this.axisFormatY = this.curriedAlignedIndexAxisFormat (protIDs[1].proteinID, alignIDs[1], this, 0);
        this.xAxis.tickFormat (this.axisFormatX);
        this.yAxis.tickFormat (this.axisFormatY);
        
        return this;
    }, 
               
    curriedAlignedIndexAxisFormat: function (proteinID, alignID, thisView, offset) {
        return function (chainIndex) {
            chainIndex += offset;
            var alignColl = thisView.model.get("alignColl");
            if (Math.floor(chainIndex) !== chainIndex) {    // don't do for non-integer values, return empty tick label instead
                return "";
            }
            var searchIndex = alignColl.getAlignedIndex (chainIndex + 1, proteinID, true, alignID, true);
            if (isNaN (searchIndex)) {
                return "";
            }
            if (searchIndex < 0) {
                return "><";
            }
            return d3.format(",.0f")(searchIndex);
        };
    },
        
    getCurrentProteinIDs : function () {
        var chainIDs = this.options.distMatrixKey.split("-");
        return chainIDs.map (function (ci) { 
            return {chainID: +ci, proteinID: this.getProteinID (+ci), labelText: this.getLabelText (+ci)};
        }, this);
    },
        
    getLabelText: function (chainID) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        var proteinID = this.getProteinID (chainID);
        var chainName = CLMSUI.modelUtils.getChainNameFromChainIndex (distancesObj.chainMap, chainID);
        var proteinName = this.model.get("clmsModel").get("interactors").get(proteinID).name;
        var residueRange = this.getChainResidueIndexRange ({proteinID: proteinID, chainID: chainID});
        proteinName = proteinName ? proteinName.replace("_", " ") : "Unknown Protein";
        return proteinName+" "+residueRange[0]+"-"+residueRange[1]+" Chain:"+chainName;
    },
        
    getProteinID: function (chainID) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        return CLMSUI.modelUtils.getProteinFromChainIndex (distancesObj.chainMap, chainID);
    },
        
    getAlignIDs: function (proteinIDsObj) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        return proteinIDsObj.map (function (pid) {
            var chainName = CLMSUI.modelUtils.getChainNameFromChainIndex (distancesObj.chainMap, pid.chainID);
            return CLMSUI.modelUtils.make3DAlignID (distancesObj.pdbBaseSeqID, chainName, pid.chainID);
        }, this);
    },
        
    getChainResidueIndexRange: function (proteinID) {
        var alignIDs = this.getAlignIDs ([proteinID]);
        return this.model.get("alignColl").getAlignmentSearchRange (proteinID.proteinID, alignIDs[0]);
    },
        
        
    grabNeighbourhoodLinks: function (x, y) {
        var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
        var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap);
        var proteinIDs = this.getCurrentProteinIDs();
        var alignIDs = this.getAlignIDs (proteinIDs);
        var alignColl = this.model.get("alignColl");
        var convFunc = function (x, y) {
            var fromResIndex = alignColl.getAlignedIndex (x, proteinIDs[0].proteinID, true, alignIDs[0]);
            var toResIndex = alignColl.getAlignedIndex (y, proteinIDs[1].proteinID, true, alignIDs[1]);
            return {convX: fromResIndex, convY: toResIndex, proteinX: proteinIDs[0].proteinID, proteinY: proteinIDs[1].proteinID};
        };
        var neighbourhoodLinks = CLMSUI.modelUtils.findResiduesInSquare (convFunc, filteredCrossLinks, x, y, 2);
        neighbourhoodLinks = neighbourhoodLinks.filter (function (crossLinkDatum) {
            var est = CLMSUI.modelUtils.getEsterLinkType (crossLinkDatum.crossLink);
            return (this.filterVal === undefined || est >= this.filterVal);
        }, this);
        return neighbourhoodLinks;
    },
        
    selectNeighbourhood: function (evt) {
        evt.preventDefault();
        var sd = this.getSizeData();
        var x = evt.offsetX + 1;
        var y = (sd.lengthB - 1) - evt.offsetY;

        var neighbourhoodLinks = this.grabNeighbourhoodLinks (x, y);
        
        var justLinks = neighbourhoodLinks.map (function (linkWrapper) { return linkWrapper.crossLink; });
        this.model.set("selection", justLinks);
    },
        
    invokeTooltip: function (evt) {
        var sd = this.getSizeData();
        var x = evt.offsetX + 1;
        var y = (sd.lengthB - 1) - evt.offsetY;

        var distances = this.options.distMatrix;
        var neighbourhoodLinks = this.grabNeighbourhoodLinks (x, y);

        var rdata = neighbourhoodLinks.map (function (crossLinkDatum) {
            return {crossLink: crossLinkDatum.crossLink, distance: distances[crossLinkDatum.x][crossLinkDatum.y]};
        });
        rdata.sort (function (a, b) { return b.distance - a.distance; });
        rdata.forEach (function(r) { r.distance = r.distance ? r.distance.toFixed(3) : r.distance; });
        neighbourhoodLinks = rdata.map (function (datum) { return datum.crossLink; });
        var linkDistances = rdata.map (function (datum) { return datum.distance; });

        this.model.get("tooltipModel")
            .set("header", CLMSUI.modelUtils.makeTooltipTitle.linkList (rdata.length - 1))
            .set("contents", CLMSUI.modelUtils.makeTooltipContents.linkList (neighbourhoodLinks, {"Distance": linkDistances}))
            .set("location", evt)
        ;
        this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
    },
    
    zoomHandler: function (self) {
        var sizeData = this.getSizeData();
        var minDim = sizeData.minDim;
        var width = sizeData.width;
        var height = sizeData.height;
        // bounded zoom behavior adapted from https://gist.github.com/shawnbot/6518285
        // (d3 events translate and scale values are just copied from zoomStatus)
        var seqLenABRatio = sizeData.lengthA / sizeData.lengthB;
        var widthLim = (seqLenABRatio > 1.0) ? minDim : minDim * seqLenABRatio;
        var heightLim = (seqLenABRatio < 1.0) ? minDim : minDim * (1.0 / seqLenABRatio);
        var tx = Math.min (0, Math.max (d3.event.translate[0], widthLim - (widthLim * d3.event.scale)));
        var ty = Math.min (0, Math.max (d3.event.translate[1], heightLim - (heightLim * d3.event.scale)));
        self.zoomStatus.translate ([tx, ty]);
        self.panZoom();
    },
        
    // That's how you define the value of a pixel //
    // http://stackoverflow.com/questions/7812514/drawing-a-dot-on-html5-canvas
    // moved from out of render() as firefox in strict mode objected
    drawPixel: function (cd, pixi, r, g, b, a) {
        var index = pixi * 4;
        cd[index] = r;
        cd[index + 1] = g;
        cd[index + 2] = b;
        cd[index + 3] = a;
    },
            
    drawPixel32: function (cd, pixi, r, g, b, a) {
        cd[pixi] = (a << 24) + (b << 16) + (g << 8) + r;
    },
    
    render: function () {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.options.distMatrix) {
            console.log ("re-rendering matrix view");
            this.resize();

            // make underlying canvas big enough to hold 1 pixel per possible residue pair
            // it gets rescaled in the resize function to fit a particular size on the screen
            var seqLengths = this.getSeqLengthData();
            this.canvas
                .attr("width",  seqLengths.lengthA)
                .attr("height", seqLengths.lengthB)
            ;
            
            this
                .renderBackgroundMap ()
                .renderCrossLinks ()
            ;
        }
        return this;
    },
        
    renderBackgroundMap: function () {
        var canvasNode = this.canvas.node();
        var ctx = canvasNode.getContext("2d");       
        ctx.fillStyle = this.options.background;
        ctx.fillRect(0, 0, canvasNode.width, canvasNode.height);

        var rangeDomain = this.colourScaleModel.get("colScale").domain();
        var min = rangeDomain[0];
        var max = rangeDomain[1];
        var rangeColours = this.colourScaleModel.get("colScale").range();
        var cols = rangeColours;//.slice (1,3);
        var colourArray = cols.map (function(col) {
            col = d3.hsl(col);
            col.s = 0.4;
            col.l = 0.85;
            return col.rgb();
        });
        
        var distances = this.options.distMatrix;
        var seqLengths = this.getSeqLengthData();
        var seqLengthB = seqLengths.lengthB - 1;
        
        CLMSUI.times = CLMSUI.times || [];
        var start = performance.now();

        //if (sizeData.cx > 0) {
            var pw = this.canvas.attr("width");
            var canvasData = ctx.getImageData (0, 0, pw, this.canvas.attr("height"));
            var cd = canvasData.data;

            for (var i = 0; i < distances.length; i++){
                var row = distances[i];
                if (row) {
                    for (var j = 0, len = row.length; j < len; j++){   // was seqLength     
                        var distance = row[j];
                        if (distance < max) {
                            var col = colourArray [distance > min ? 1 : 0];
                            //var col = distance > min ? colourArray [1] : colourArray[0];
                            this.drawPixel (cd, i + ((seqLengthB - j) * pw), col.r, col.g, col.b, 255);
                            //drawPixel32 (data, i + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
                        }
                    }
                }
            }

            ctx.putImageData(canvasData, 0, 0);
        //}

        var end = performance.now();
        CLMSUI.times.push (Math.round (end - start));
        //console.log ("CLMSUI.times", CLMSUI.times);
        return this;
    },
        
    renderCrossLinks: function () {
        
        var self = this;
        
        var canvasNode = this.canvas.node();
        var ctx = canvasNode.getContext("2d");
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.5;
        
        var rangeDomain = this.colourScaleModel.get("colScale").domain();
        var min = rangeDomain[0];
        var max = rangeDomain[1];
        var rangeColours = this.colourScaleModel.get("colScale").range();
        this.resLinkColours = rangeColours.map (function(col) {
            col = d3.hsl(col);
            col.s = 1;
            col.l = 0.3;
            return col.rgb();
        });
        this.resLinkColours.push (d3.rgb("#000"));
        var selectedColour = d3.rgb("#ff0");

        var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;

        var distances = this.options.distMatrix;
        var seqLengths = this.getSeqLengthData();
        var seqLengthB = seqLengths.lengthB - 1;
        var xStep = 1;//minDim / seqLengthA;
        var yStep = 1;//minDim / seqLengthB;
        
        var proteinIDs = this.getCurrentProteinIDs();
        var alignIDs = this.getAlignIDs (proteinIDs);
        var alignColl = this.model.get("alignColl");
        // only consider crosslinks between the two proteins (often the same one) represented by the two axes
        var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
        var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap).values();
        var filteredCrossLinks2 = Array.from(filteredCrossLinks).filter (function (xlink) {
            return (xlink.toProtein.id === proteinIDs[0].proteinID && xlink.fromProtein.id === proteinIDs[1].proteinID) || (xlink.toProtein.id === proteinIDs[1].proteinID && xlink.fromProtein.id === proteinIDs[0].proteinID);    
        });
        
        var selectedCrossLinkIDs = d3.set (this.model.get("selection").map (function(xlink) { return xlink.id; }));

        for (var crossLink of filteredCrossLinks2) {
            var est = CLMSUI.modelUtils.getEsterLinkType (crossLink);
            if (self.filterVal === undefined || est >= self.filterVal) {
                var fromDir = (crossLink.fromProtein.id === proteinIDs[0].proteinID) ? 0 : 1;
                var toDir = 1 - fromDir;
                // get index of residues within current matrix (chain v chain)
                var fromResIndex = alignColl.getAlignedIndex (crossLink.fromResidue, proteinIDs[fromDir].proteinID, false, alignIDs[fromDir]);
                var toResIndex = alignColl.getAlignedIndex (crossLink.toResidue, proteinIDs[toDir].proteinID, false, alignIDs[toDir]);
                
                // show only those that map to the current matrix - i.e. combination of two chains
                if (fromResIndex !== null && toResIndex !== null) {
                    // 0-index these indices
                    fromResIndex--;
                    toResIndex--;
                    //console.log ("LINK", fromResIndex, toResIndex, crossLink);

                    var fromDistArr = distances[fromResIndex];
                    var dist = fromDistArr ? fromDistArr[toResIndex] : undefined;
                    //console.log ("dist", dist, fromDistArr, crossLink.toResidue, crossLink);
                    if (selectedCrossLinkIDs.has (crossLink.id)) {
                        ctx.fillStyle = selectedColour;
                    }
                    else if (dist) {
                        if (dist < min) {
                            ctx.fillStyle = self.resLinkColours[0];
                            sasIn++;
                        }
                        else if (dist < max) {
                            ctx.fillStyle = self.resLinkColours[1];
                            sasMid++;
                        }
                        else {
                            ctx.fillStyle = self.resLinkColours[2];
                            sasOut++;
                        }
                    } else {
                        ctx.fillStyle = self.resLinkColours[3];
                    }
                    ctx.fillRect (fromResIndex * xStep, (seqLengthB - toResIndex) * yStep , xStep, yStep);

                    // if same chunk of protein on both axes then show reverse link as well
                    if (proteinIDs[0].chainID === proteinIDs[1].chainID) {
                        ctx.fillRect (toResIndex * xStep, (seqLengthB - fromResIndex) * yStep , xStep, yStep);
                    }
                }
            }
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
        
    getSeqLengthData: function () {
        var distances = this.options.distMatrix;
        var seqLengthA = distances ? distances.length : 0;
        var seqLengthB = distances ? distances[0].length : 0;
        return {lengthA: seqLengthA, lengthB: seqLengthB};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
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
        console.log (sizeData, "rr", widthRatio, heightRatio, minRatio, maxRatio, diffRatio);
        d3.select(this.el).select(".viewport")
            .style("width",  minDim+"px")
            .style("height", minDim+"px")
            //.style("width",  sizeData.width+"px")
            //.style("height", sizeData.height+"px")
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
        var labelCoords = [
            {x: sizeData.right / 2, y: sizeData.bottom + this.margin.bottom, rot: 0}, 
            {x: -this.margin.left, y: sizeData.bottom / 2, rot: -90},
            {x: sizeData.right / 2, y: 0, rot: 0}
        ];
        this.vis.selectAll("g.label text")
            .data (labelCoords)
            .attr ("transform", function(d) {
                return "translate("+d.x+" "+d.y+") rotate("+d.rot+")";
            })
        ;
        return this;
    },
        
    setAxisRange: function (scale) {
        
    },
    
    // called when panning and zooming performed
    panZoom: function () {
        
        var self = this;
        var sizeData = this.getSizeData();
        
        // rescale and position canvas according to pan/zoom settings and available space
        var baseScale = Math.min (sizeData.minDim / sizeData.lengthA, sizeData.minDim / sizeData.lengthB);
        var scale = baseScale * this.zoomStatus.scale();
        var scaleString = "scale("+scale+")";
        var translateString = "translate("+this.zoomStatus.translate()[0]+"px,"+ this.zoomStatus.translate()[1]+"px)";
        var transformString = translateString + " " + scaleString;
        this.canvas
           .style("-ms-transform", transformString)
           .style("-moz-transform", transformString)
           .style("-o-transform", transformString)
           .style("-webkit-transform", transformString)
           .style("transform", transformString)
        ;
        
        // If bottom edge of canvas is higher up than bottom of viewport put the x axis benath it
        var cvs = $(this.canvas.node());
        var viewport = cvs.parent();
        var bottom = Math.min (
            cvs.position().top + ($.zepto ? cvs.height() : cvs.outerHeight(true)), 
            $.zepto ? viewport.height() : viewport.outerHeight(true)
        );
        var right = Math.min (
            cvs.position().left + ($.zepto ? cvs.width() : cvs.outerWidth(true)), 
            $.zepto ? viewport.width() : viewport.outerWidth(true)
        );
        
        
        // redraw axes
        this.vis.select(".y")
            .call(self.yAxis)
            .selectAll("g.tick")
        ;
        /*
        var xext = this.x.range()[1];
        this.x.range([0, right]);
        var domExpand = right / xext;
        var curd = this.x.domain();
        this.x.domain([curd[0], curd[1] + ((curd[1] - curd[0]) * domExpand)]);
        */
        this.vis.select(".x")
            .attr("transform", "translate(0," + bottom + ")")
            .call(self.xAxis)
        ;
        
        sizeData.bottom = bottom;
        sizeData.right = right;
        
        this.repositionLabels (sizeData);
        
        return this;
    },
});
    
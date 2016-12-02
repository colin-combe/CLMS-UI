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
        "mousemove canvas": "brushNeighbourhood",
        "mousedown canvas": "setStartPoint",
        "click canvas": "selectNeighbourhood",
        "click .downloadButton2": "downloadSVG2",
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
            matrixObj: null,
            selectedColour: "#ff0",
            highlightedColour: "#f80",
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
                .text("Select Chain Pairing")
                .append("select")
                    .attr("id", "chainSelect")
                    .on ("change", function () {
                        self
                            .matrixChosen ($('#chainSelect').val())
                            .render()
                        ;
                    })
        ;
        
        this.controlDiv.append("button")
            .attr ("class", "downloadButton2 btn btn-1 btn-1a")
            .text ("Export Graphic")
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
         
        this.listenTo (this.model, "change:selection", this.renderCrossLinks);
        this.listenTo (this.model, "change:highlights", this.renderCrossLinks);
        this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render); 
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.distancesChanged);  // Entire new set of distances
        this.listenTo (CLMSUI.vent, "distancesAdjusted", this.render);  // Existing residues/pdb but distances changed
    },
        
    relayout: function () {
        this.resize();
        return this;
    },
        
    distancesChanged: function () {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        console.log ("IN MATRIX DISTANCES CHANGED", distancesObj, this.model.get("clmsModel"));
        var matrixOptionData = d3.entries(distancesObj.matrices).map (function (matrixEntry) {
            return {
                key: matrixEntry.key, 
                text: [matrixEntry.value.chain1, matrixEntry.value.chain2].map (function(cid) { return this.getLabelText(+cid); }, this).join(" - "),
            };
        }, this);
        
        var matrixOptions = d3.select(this.el).select("#chainSelect")
            .selectAll("option")
            .data (matrixOptionData, function(d) { return distancesObj.pdbBaseSeqID + d.key; })
        ;
        matrixOptions.exit().remove();
        matrixOptions
            .enter()
            .append("option")
        ;
        matrixOptions
            .property ("value", function(d) { return d.key;})
            .text (function(d) { return d.text; })
        ;
        
        this
            .matrixChosen(matrixOptionData[0].key)
            .render()
        ;
    },
        
    matrixChosen: function (key) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        this.options.matrixObj = distancesObj.matrices[key];
        
        var seqLengths = this.getSeqLengthData();
        this.x.domain([0, seqLengths.lengthA]);
        this.y.domain([seqLengths.lengthB, 0]);   
        
        console.log ("SEQ LEN", seqLengths);
        
        // Update x/y labels and axes tick formats
        var protIDs = this.getCurrentProteinIDs(); 
        var alignIDs = this.getAlignIDs (protIDs);
        this.xAxis.tickFormat (this.curriedAlignedIndexAxisFormat (protIDs[0].proteinID, alignIDs[0], this, 0));
        this.yAxis.tickFormat (this.curriedAlignedIndexAxisFormat (protIDs[1].proteinID, alignIDs[1], this, 0));
        this.vis.selectAll("g.label text").data(protIDs)
            .text (function(d) { return d.labelText; })
        ;
        
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
        var chainIDs = [this.options.matrixObj.chain1, this.options.matrixObj.chain2];
        return chainIDs.map (function (ci) { 
            return {chainID: +ci, proteinID: this.getProteinID (+ci), labelText: this.getLabelText (+ci)};
        }, this);
    },
        
    getLabelText: function (chainID) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        var proteinID = this.getProteinID (chainID);
        var chainName = CLMSUI.modelUtils.getChainNameFromChainIndex (distancesObj.chainMap, chainID);
        var proteinName = this.model.get("clmsModel").get("participants").get(proteinID).name;
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
        var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
        var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap);
        var proteinIDs = this.getCurrentProteinIDs();
        var alignIDs = this.getAlignIDs (proteinIDs);
        var alignColl = this.model.get("alignColl");
        var convFunc = function (x, y) {    // x and y are 0-indexed
            var fromResIndex = alignColl.getAlignedIndex (x + 1, proteinIDs[0].proteinID, true, alignIDs[0]);
            var toResIndex = alignColl.getAlignedIndex (y + 1, proteinIDs[1].proteinID, true, alignIDs[1]);
            return {convX: fromResIndex, convY: toResIndex, proteinX: proteinIDs[0].proteinID, proteinY: proteinIDs[1].proteinID};
        };
        var neighbourhoodLinks = CLMSUI.modelUtils.findResiduesInSquare (convFunc, filteredCrossLinks, x, y, 2);
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
            var linkWrappers = this.grabNeighbourhoodLinks (xy[0], xy[1]);
            var crossLinks = linkWrappers.map (function (linkWrapper) { return linkWrapper.crossLink; });   
            this.model.set ("selection", crossLinks);
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
        
    invokeTooltip : function (evt, linkWrappers) {
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
        // have slightly different saturation/luminance for each colour so shows up in black & white
        var colourArray = cols.map (function(col, i) {
            col = d3.hsl(col);
            col.s = 0.4 - (0.1 * i);
            col.l = 0.85 - (0.1 * i);
            return col.rgb();
        });
        
        var distanceMatrix = this.options.matrixObj.distanceMatrix;
        var seqLengths = this.getSeqLengthData();
        var seqLengthB = seqLengths.lengthB - 1;
        
        CLMSUI.times = CLMSUI.times || [];
        var start = performance.now();

        //if (sizeData.cx > 0) {
            var pw = this.canvas.attr("width");
            var canvasData = ctx.getImageData (0, 0, pw, this.canvas.attr("height"));
            var cd = canvasData.data;

            for (var i = 0; i < distanceMatrix.length; i++){
                var row = distanceMatrix[i];
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
        
        if (this.options.matrixObj) {
        
            var canvasNode = this.canvas.node();
            var ctx = canvasNode.getContext("2d");
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.5;

            var rangeDomain = this.colourScaleModel.get("colScale").domain();
            var min = rangeDomain[0];
            var max = rangeDomain[1];
            var rangeColours = this.colourScaleModel.get("colScale").range();
            this.resLinkColours = rangeColours.map (function (col, i) {
                col = d3.hsl(col);
                col.s = 1 - (i * 0.1);
                col.l = 0.4 - (i * 0.1);
                return col.rgb();
            });
            this.resLinkColours.push ("#000");

            var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;

            var distanceMatrix = this.options.matrixObj.distanceMatrix;
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
            var highlightedCrossLinkIDs = d3.set (this.model.get("highlights").map (function(xlink) { return xlink.id; }));

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

                        var fromDistArr = distanceMatrix[fromResIndex];
                        var dist = fromDistArr ? fromDistArr[toResIndex] : undefined;
                        if (highlightedCrossLinkIDs.has (crossLink.id)) {
                            ctx.fillStyle = self.options.highlightedColour;
                        }
                        else if (selectedCrossLinkIDs.has (crossLink.id)) {
                            ctx.fillStyle = self.options.selectedColour;
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
        var distanceMatrix = this.options.matrixObj.distanceMatrix;
        var seqLengthA = distanceMatrix ? distanceMatrix.length : 0;
        var seqLengthB = distanceMatrix ? distanceMatrix[0].length : 0;
        return {lengthA: seqLengthA, lengthB: seqLengthB};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        
        console.log ("matrix resize")
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
        
        this.vis.select(".x")
            .attr("transform", "translate(0," + bottom + ")")
            .call(self.xAxis)
        ;
        
        sizeData.bottom = bottom;
        sizeData.right = right;
        this.repositionLabels (sizeData);
        
        return this;
    },
        
    /**
    Need to change the canvas element to an image and shove it in the detached svg element we download
    Also needs a g element and a clipPath to act as a viewport
    And shove in an extra css rule after the style element's already been generated
    */
    downloadSVG2: function () {
        var svgSel = d3.select(this.el).selectAll("svg");
        var viewPort = d3.select(this.el).select(".viewport");
        var svgArr = [svgSel.node()];
        var svgStrings = CLMSUI.svgUtils.capture (svgArr);
        var detachedSVG = svgStrings[0];
        var detachedSVGD3 = d3.select (detachedSVG);
        
        // Add in a defs element to the nested svg. Important that it's the first child.
        var defs = detachedSVGD3.select("svg>defs");
        if (defs.empty()) {
            defs = detachedSVGD3.select("svg").insert("defs", ":first-child");
        }
        // Add a rectangular clip to the defs that matches the viewport restriction (top/left not needed)
        defs.append("clipPath")
            .attr("id", "matrixClip")
            .append("rect")
                .attr ("x", 0)
                .attr ("y", 0)
                .attr ("width", Number.parseInt (viewPort.style("width")))
                .attr ("height", Number.parseInt (viewPort.style("height")))
        ;
                   
        // Add an image element to the nested svg, nested itself within a g element that references the above clippath ^^^
        var img = detachedSVGD3
            .select("svg>g")
            .append ("g")
                .attr("clip-path", "url(#matrixClip)")
                .append ("svg:image")
        ;
        
        // Add a rule to stop the image being 'smoothed' (i.e. blurred)
        var extraRule = "#matrixPanel image {image-rendering: optimizeSpeed; image-rendering: -moz-crisp-edges; -ms-interpolation-mode: nearest-neighbor; image-rendering: pixelated; }";
        var style = detachedSVGD3.select("style");
        style.text (style.text() + "\n" + extraRule);
        
        // Now convert the canvas and its data to the image element we just added and download the whole svg when done
        CLMSUI.utils.convertCanvasToImage (this.canvas, img, function () {
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), detachedSVG);
            download (svgXML, 'application/svg', "view.svg");
        });
    },
});
    

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
        "mousemove canvas": "invokeTooltip"
      });
    },

    initialize: function (viewOptions) {
        CLMSUI.DistanceMatrixViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;

        var defaultOptions = {
            xlabel: "Residue Index 1",
            ylabel: "Residue Index 2",
            chartTitle: "Cross-Link Matrix",
            background: "white"
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
        var elem = d3.select(this.el); 
        
        
        var chartDiv = elem.append("div")
            .attr("class", "panelInner")
            .style("position", "relative")
        ;      
        chartDiv.selectAll("*").remove();

        
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
            .append ("g").attr("class", "label")
            .append("text")
                .attr("class", function(d) { return d.class; })
                .text(function(d) { return d.text; })
                .attr("dy", function(d) { return d.dy; })
        ;

        
        // colours
        //this.resLinkColours = ["black", "blue", "red"];
        //this.resLinkColours = ["green", "orange", "black"];
        
        this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
        //this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render); 
        this.listenTo (this.model.get("distancesModel"), "change:distances", this.distancesChanged); 
        
        //this.distancesChanged ();
    },
        
    relayout: function () {
        this.resize();
        return this;
    },
    
    distancesChanged: function () {
        var proteins = this.getProteins();
        var distances = proteins[0].distances;
        //var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        this.x.domain([1, seqLength]);
		this.y.domain([seqLength, 1]);    
        this.vis.select(".y")
			.call(this.yAxis)
        ;

		this.vis.select(".x")
			.call(this.xAxis)
        ;
    },
        
    invokeTooltip: function (evt) {
        var sd = this.getSizeData();
        var x = evt.offsetX + 1;
        var y = sd.seqLength - evt.offsetY;
        var a = Math.max (x,y);
        var b = Math.min (x,y);
        var self = this;
        
        var proteins = this.getProteins();
        var distances = proteins[0].distances;
        //var distances = this.model.get("distancesModel").get("distances");
        var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
        var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap);

        //var neighbourhood = CLMSUI.modelUtils.findResidueIDsInSquare (residueLinks, b-5, b+5, a-5, a+5);
        var neighbourhood = CLMSUI.modelUtils.findResidueIDsInSpiral (proteins[0].id, proteins[0].id, filteredCrossLinks, b, a, 2);
        neighbourhood = neighbourhood.filter (function (crossLink) {
            var est = CLMSUI.modelUtils.getEsterLinkType (crossLink);
            return (self.filterVal === undefined || est >= self.filterVal);
        });
        var rdata = neighbourhood.map (function (crossLink) {
            var x = crossLink.fromResidue;
            var y = crossLink.toResidue;
            var dist = (x > y) ? (distances[x] != null ? distances[x][y] : null) : (distances[y] != null ? distances[y][x] : null);
            return [x, y, dist];
        });
        if (neighbourhood.length > 0) {
            rdata.sort (function(a,b) { return b[2] - a[2]; });
            rdata.forEach (function(r) { r[2] = r[2] ? r[2].toFixed(3) : r[2]; });
            rdata.splice (0, 0, ["From", "To", "Distance"]);
        } else {
            rdata = null;
        }
        
        this.model.get("tooltipModel").set("header", "Cross Links").set("contents", rdata).set("location", evt);
        this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
    },
    
    zoomHandler: function (self) {
        var sizeData = this.getSizeData();
        var minDim = sizeData.minDim;
        // bounded zoom behavior from https://gist.github.com/shawnbot/6518285
        // (d3 events translate and scale values are just copied from zoomStatus)
        var tx = Math.min(0, Math.max(d3.event.translate[0], minDim - (minDim * d3.event.scale)));
        var ty = Math.min(0, Math.max(d3.event.translate[1], minDim - (minDim * d3.event.scale)));
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
        var index = pixi;
        cd[index] = (a << 24) + (b << 16) + (g << 8) + r;
    },
    
    render: function () {

        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
            console.log ("re-rendering matrix view");
            this.resize();

            var self = this;
             var proteins = this.getProteins();
            var distances = proteins[0].distances;
            //var distances = this.model.get("distancesModel").get("distances");
            var seqLength = distances.length - 1;
            //var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();
            var crossLinkMap = this.model.get("clmsModel").get("crossLinks");
            var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap).values();
            
            //var proteins = this.model.get("clmsModel").get("interactors");
            //var residueLinks = allProtProtLinks.next().value.crossLinks.values();

            // make underlying canvas big enough to hold 1 pixel per residue pair
            // it gets rescaled in the resize function to fit a particular size on the screen
            this.canvas
                .attr("width",  seqLength)
                .attr("height", seqLength)
            ;

            var canvasNode = this.canvas.node();
            var ctx = canvasNode.getContext("2d");
            ctx.fillStyle = this.options.background;
            ctx.fillRect(0, 0, canvasNode.width, canvasNode.height);
            //ctx.fillRect(0, 0, canvasNode.width, canvasNode.height);

            var xStep = 1;//minDim / seqLength;
            var yStep = 1;//minDim / seqLength;


            var rangeDomain = this.colourScaleModel.get("colScale").domain();
            var min = rangeDomain[0];
            var max = rangeDomain[1];

            CLMSUI.times = CLMSUI.times || [];
            var start = performance.now();

            var rangeColours = this.colourScaleModel.get("colScale").range();
            var cols = rangeColours;//.slice (1,3);
            var colourArray = cols.map (function(col) {
                col = d3.hsl(col);
                col.s = 0.4;
                col.l = 0.85;
                return col.rgb();
            });
            
            /*
            var colourArray = [withinUnlinked, dubiousUnlinked].map (function (col) {
                return d3.rgb (col);
            });
            */

            // two sets of nested loops, one per style
            /*
            ctx.fillStyle = colourArray[0];

            for (var i = 1; i < seqLength + 1; i++){
                var row = distances[i];

                if (row){
                    var ixStep = (i - 1) * xStep;
                    for (var j = 1; j < row.length; j++){   // was seqLength
                        var distance = row[j];
                        if (distance && distance < min) {
                            ctx.fillRect(ixStep, (seqLength - j) * yStep , xStep, yStep);
                        }
                    }
                }
            }


            ctx.fillStyle = colourArray[1];

            for (var i = 1; i < seqLength + 1; i++){
                var row = distances[i];
                if (row){
                    var ixStep = (i - 1) * xStep;
                    for (var j = 1; j < row.length; j++){   // was seqLength     
                        var distance = row[j];
                        if (distance && distance > min && distance < max) {    // being anal, but if distance == min, neither this nor the previous loop will draw anything
                            ctx.fillRect(ixStep, (seqLength - j) * yStep , xStep, yStep);
                        }
                    }
                }
            }
            */

            // one loop, style is chosen per cell
            /*
            for (var i = 1; i < seqLength + 1; i++){
                var row = distances[i];
                if (row){
                    var ixStep = (i - 1) * xStep;
                    for (var j = 1; j < row.length; j++){   // was seqLength     
                        var distance = row[j];
                        if (distance && distance < max) {
                            ctx.fillStyle = (distance > min ? colourArray[1] : colourArray[0]);
                            ctx.fillRect (ixStep, (seqLength - j) * yStep , xStep, yStep);
                        }
                    }
                }
            }
            */

            //if (sizeData.cx > 0) {
                var pw = this.canvas.attr("width");
                var canvasData = ctx.getImageData (0, 0, pw, this.canvas.attr("height"));
                var cd = canvasData.data;

                for (var i = 1; i < distances.length; i++){
                    var row = distances[i];
                    if (row) {
                        var ixStep = i - 1;
                        for (var j = 1, len = row.length; j < len; j++){   // was seqLength     
                            var distance = row[j];
                            if (distance < max) {
                                var col = colourArray [distance > min ? 1 : 0];
                                //var col = distance > min ? colourArray [1] : colourArray[0];
                                this.drawPixel (cd, ixStep + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
                                //drawPixel32 (data, ixStep + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
                            }
                        }
                    }
                }
            
                //cd.set (buf8);
                ctx.putImageData(canvasData, 0, 0);
            //}
            
            this.resLinkColours = rangeColours.map (function(col) {
                col = d3.hsl(col);
                col.s = 1;
                col.l = 0.3;
                return col.rgb();
            });
            this.resLinkColours.push (d3.rgb("#000"));
            

            var end = performance.now();
            CLMSUI.times.push (Math.round (end - start));
            //console.log ("CLMSUI.times", CLMSUI.times);

            var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.5;
            
            for (var crossLink of filteredCrossLinks) {
                var est = CLMSUI.modelUtils.getEsterLinkType (crossLink);
                if (self.filterVal === undefined || est >= self.filterVal) {

                    var fromDistArr = distances[crossLink.fromResidue];
                    var dist = fromDistArr ? fromDistArr[crossLink.toResidue] : undefined;
                    //console.log ("dist", dist, fromDistArr, crossLink.toResidue, crossLink);

                    if (dist) {
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
                    ctx.fillRect((crossLink.fromResidue - 1) * xStep, (seqLength - crossLink.toResidue) * yStep , xStep, yStep);
                    

                    var toDistArr = distances[crossLink.toResidue];
                    dist = toDistArr ? toDistArr[crossLink.fromResidue] : undefined;
                    if (dist) {
                        if (dist < min) {
                            ctx.fillStyle = self.resLinkColours[0];
                            eucIn++;
                        }
                        else if (dist < max) {
                            ctx.fillStyle = self.resLinkColours[1];
                            eucMid++;
                        }
                        else {
                            ctx.fillStyle = self.resLinkColours[2];
                            eucOut++;
                        }
                    } else {
                        ctx.fillStyle = self.resLinkColours[3];
                    }
                    ctx.fillRect((crossLink.toResidue - 1) * xStep, (seqLength - crossLink.fromResidue) * yStep , xStep, yStep);
                    //ctx.strokeRect((crossLink.toResidue - 1) * xStep, (seqLength - crossLink.fromResidue) * yStep , xStep, yStep);
                }
            }

            //console.log("res sas", {in: sasIn, mid: sasMid, out: sasOut}, "euc", {in: eucIn, mid: eucMid, out: eucOut});
        }
    },
        
    getProteins: function () {
        return Array.from (this.model.get("clmsModel").get("interactors").values()); 
    },
    
    getSizeData: function () {
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
		var cy = jqElem.height(); //this.svg.node().clientHeight;
        //console.log ("Svg width", this.svg.attr("width"), this.svg.style("width"), this.svg.node().clientWidth, $(this.svg.node()).width());
        var width = Math.max (0, cx - this.margin.left - this.margin.right);
		var height = Math.max (0, cy - this.margin.top  - this.margin.bottom);
		//its going to be square and fit in containing div
		var minDim = Math.min (width, height);
        
        var proteins = this.getProteins();
        var distances = proteins[0].distances;
        //var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim, seqLength: seqLength};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        var sizeData = this.getSizeData(); 
		var minDim = sizeData.minDim;
        var deltaz = this.last ? (minDim / this.last) : 1;
        //console.log ("deltaz", deltaz);
        this.last = minDim;
        		
        // fix viewport new size, previously used .attr, but then setting the size on the child canvas element expanded it, some style trumps attr thing
        d3.select(this.el).select(".viewport")
            .style("width",  minDim+"px")
			.style("height", minDim+"px")
        ;
		
 
        // Need to rejig x/y scales and d3 translate coordinates if resizing
        // set x/y scales to full domains and current size (range)
        this.x
            .domain([1, sizeData.seqLength])
            .range([0, minDim])
        ;

		// y-scale (inverted domain)
		this.y
			.domain([sizeData.seqLength, 1])
			.range([0, minDim])
        ;
        
        var approxTicks = Math.round (minDim / 50); // 50px minimum spacing between ticks and labels
        this.xAxis.ticks (approxTicks);
        this.yAxis.ticks (approxTicks);
        
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
        
        // reposition labels
        var labelCoords = [
            {x: minDim / 2, y: minDim + this.margin.bottom, rot: 0}, 
            {x: -this.margin.left, y: minDim / 2, rot: -90},
            {x: minDim / 2, y: 0, rot: 0}
        ];
        this.vis.selectAll("g.label text")
            .data (labelCoords)
            .attr ("transform", function(d) {
                return "translate("+d.x+" "+d.y+") rotate("+d.rot+")";
            })
        ;
    },
    
    // called when panning and zooming performed
    panZoom: function () {
        
        var self = this;
        var sizeData = this.getSizeData();
        
        // rescale and position canvas according to pan/zoom settings and available space
        var baseScale = sizeData.minDim / sizeData.seqLength;
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
        
        // redraw axes
        this.vis.select(".y")
			.call(self.yAxis)
        ;
        
		this.vis.select(".x")
            .attr("transform", "translate(0," + sizeData.minDim + ")")
			.call(self.xAxis)
        ;
    },
});
    

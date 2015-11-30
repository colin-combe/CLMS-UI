//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
//
//		graph/Matrix.js

(function(win) {
    "use strict";

    win.CLMSUI = win.CLMSUI || {};
    
    win.CLMSUI.DistanceMatrixViewBB = Backbone.View.extend({
    tagName: "div",
    events: {
        "click .closeButton": "hideView",
        "mousemove canvas": "invokeTooltip"
    },
    initialize: function (viewOptions) {
        //to contain registered callback functions
        this.highlightChangedCallbacks = [];
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
        
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var elem = d3.select(this.el); 
        
        // Set up some html scaffolding in d3
        win.CLMSUI.utils.addDynDivScaffolding(elem);
        
        // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
        var panelDrag = d3.behavior.drag().on ("drag", function() { self.resize(); });
        elem.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
            .call (panelDrag)
        ;
        
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
            .style("position", "absolute")
            .style("top", this.margin.top + "px")
			.style("left", this.margin.left + "px")
            //.style("border", "1px solid red")
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
        this.resLinkColours = ["black", "blue", "red"];
        
        this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.render); 
        this.listenTo (this.model.get("distancesModel"), "change:distances", this.distancesChanged); 
        
        if (viewOptions.displayEventName) {
            this.listenTo (win.CLMSUI.vent, viewOptions.displayEventName, this.setVisible);
        }
        
        //this.distancesChanged ();
    },
    
    distancesChanged: function () {
        var distances = this.model.get("distancesModel").get("distances");
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
    
    hideView: function () {
        win.CLMSUI.vent.trigger (this.displayEventName, false);
    },

    setVisible: function (show) {
        d3.select(this.el).style('display', show ? 'block' : 'none');

        if (show) {
            this.render();
        }
    },
        
    invokeTooltip: function (evt) {
        var sd = this.getSizeData();
        var x = evt.offsetX + 1;
        var y = sd.seqLength - evt.offsetY;
        var a = Math.max (x,y);
        var b = Math.min (x,y);
        var self = this;
        
        var distances = this.model.get("distancesModel").get("distances");
        //var dist = (x > y) ? (distances[x] !== null ? distances[x][y] : null) : (distances[y] !== null ? distances[y][x] : null);
        var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();
        var residueLinks = allProtProtLinks.next().value.crossLinks;

        //var neighbourhood = CLMSUI.modelUtils.findResidueIDsInSquare (residueLinks, b-5, b+5, a-5, a+5);
        var neighbourhood = CLMSUI.modelUtils.findResidueIDsInSpiral (residueLinks, b, a, 2);
        neighbourhood = neighbourhood.filter (function(clid) {
            var est = CLMSUI.modelUtils.getEsterLinkType (residueLinks.get(clid));
            return (self.filterVal === undefined || est >= self.filterVal);
        });
        var rdata = neighbourhood.map (function (clid) {
            var rids = clid.split("-");
            var x = rids[0];
            var y = rids[1];
            var dist = (x > y) ? (distances[x] !== null ? distances[x][y] : null) : (distances[y] !== null ? distances[y][x] : null);
            return [rids[0], rids[1], dist];
        });
        if (neighbourhood.length > 0) {
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
    
    render: function () {

        this.resize();
        
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();

        //var proteins = this.model.get("clmsModel").get("interactors");
        var residueLinks = allProtProtLinks.next().value.crossLinks.values();

        // make underlying canvas big enough to hold 1 pixel per residue pair
        // it gets rescaled in the resize function to fit a particular size on the screen
		self.canvas
            .attr("width",  seqLength)
			.attr("height", seqLength)
        ;
		
		var ctx = self.canvas.node().getContext("2d");
		ctx.fillStyle = self.options.background;
		ctx.fillRect(0, 0, self.canvas.node().width, self.canvas.node().height);

		var xStep = 1;//minDim / seqLength;
		var yStep = 1;//minDim / seqLength;
		
        
        var rangeDomain = self.model.get("rangeModel").get("scale").domain();
        var min = rangeDomain[1];
        var max = rangeDomain[2];
        
        // That's how you define the value of a pixel //
        // http://stackoverflow.com/questions/7812514/drawing-a-dot-on-html5-canvas

        function drawPixel (cd, pixi, r, g, b, a) {
            var index = pixi * 4;
            cd[index] = r;
            cd[index + 1] = g;
            cd[index + 2] = b;
            cd[index + 3] = a;
        }
        
        var start = performance.now();
        
        var rangeColours = self.model.get("rangeModel").get("scale").range();
        var cols = rangeColours.slice (1,3);
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
            var pw = self.canvas.attr("width");
            var canvasData = ctx.getImageData (0, 0, pw, self.canvas.attr("height"));
            var cd = canvasData.data;

            for (var i = 1; i < seqLength + 1; i++){
                var row = distances[i];
                if (row) {
                    var ixStep = (i - 1);
                    for (var j = 1; j < row.length; j++){   // was seqLength     
                        var distance = row[j];
                        if (distance && distance < max) {
                            var col = (distance > min ? colourArray[1] : colourArray[0]);
                            drawPixel (cd, ixStep + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
                        }
                    }
                }
            }
            ctx.putImageData(canvasData, 0, 0);
        //}
        
        
        var end = performance.now();
        //CLMSUI.times.push(Math.round(end-start));
        //console.log ("CLMSUI.times", CLMSUI.times);
        
		var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;
        var modelUtils = win.CLMSUI.modelUtils;
		//for (let crossLink of residueLinks) {
        for (var crossLink of residueLinks) {
        //var rlCount = residueLinks.length;
		//for (var rl = 0; rl < rlCount; rl++) {
			//var crossLink = residueLinks[rl];
            var est = modelUtils.getEsterLinkType (crossLink);
            if (self.filterVal === undefined || est >= self.filterVal) {
            
                var fromDistArr = distances[crossLink.fromResidue];
                var dist = fromDistArr ? fromDistArr[crossLink.toResidue] : undefined;
                //console.log ("dist", dist, fromDistArr, crossLink.toResidue, crossLink);

                if (dist && dist < min){
                    ctx.fillStyle = self.resLinkColours[0];
                    sasIn++;
                }
                else if (dist && dist < max){
                    ctx.fillStyle = self.resLinkColours[1];
                    sasMid++;
                }
                else {
                    ctx.fillStyle = self.resLinkColours[2];
                    sasOut++;
                }
                ctx.fillRect((crossLink.fromResidue - 1) * xStep, (seqLength - crossLink.toResidue) * yStep , xStep, yStep);

                var toDistArr = distances[crossLink.toResidue];
                dist = toDistArr ? toDistArr[crossLink.fromResidue] : undefined;
                if (dist && dist < min){
                    ctx.fillStyle = self.resLinkColours[0];
                    eucIn++;
                }
                else if (dist && dist < max){
                    ctx.fillStyle = self.resLinkColours[1];
                    eucMid++;
                }
                else {
                    ctx.fillStyle = self.resLinkColours[2];
                    eucOut++;
                }
                ctx.fillRect((crossLink.toResidue - 1) * xStep, (seqLength - crossLink.fromResidue) * yStep , xStep, yStep);
            }
		}
    
		console.log("res sas", {in: sasIn, mid: sasMid, out: sasOut}, "euc", {in: eucIn, mid: eucMid, out: eucOut});
    },
    
    getSizeData: function () {
        var self = this;
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
		var cy = jqElem.height(); //this.svg.node().clientHeight;
        //console.log ("Svg width", this.svg.attr("width"), this.svg.style("width"), this.svg.node().clientWidth, $(this.svg.node()).width());
        var width = Math.max (0, cx - self.margin.left - self.margin.right);
		var height = Math.max (0, cy - self.margin.top  - self.margin.bottom);
		//its going to be square and fit in containing div
		var minDim = Math.min (width, height);
        
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim, seqLength: seqLength};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        var self = this;
        
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
        self.xAxis.ticks (approxTicks);
        self.yAxis.ticks (approxTicks);
        
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
        self.panZoom ();
        
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
        //console.log ("transformString", transformString);
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
    
    // removes view
    // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
    remove: function () {
        // remove drag listener
        d3.select(this.el).selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br").on(".drag", null); 
        
        // this line destroys the containing backbone view and it's events
        Backbone.View.prototype.remove.call(this);
    }
});
    
} (this));

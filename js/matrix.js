//		a matrix viewer
//
//		Colin Combe, Rappsilber Laboratory, 2015
//
//		graph/Matrix.js

var CLMSUI = CLMSUI || {};

CLMSUI.times = [];

CLMSUI.DistanceMatrixViewBB = Backbone.View.extend ({
    tagName: "div",
    events: {
        "click .closeButton": "hideView"
    },
    initialize: function (viewOptions) {
        //to contain registered callback functions
        this.highlightChangedCallbacks = [];
        var self = this;

        var defaultOptions = {
            xlabel: "Residue Index 1",
            ylabel: "Residue Index 2",
            seriesName: "Cross Links",
            chartTitle: "Cross-Link Matrix",
            maxX: 80,
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
        CLMSUI.utils.addDynDivScaffolding(elem);
        
        // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
        var panelDrag = d3.behavior.drag().on ("drag", function() { self.resize(); });
        elem.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
            .call (panelDrag)
        ;
        
        var chartDiv = elem.append("div")
            .attr("class", "panelInner")
            .attr("id", "currentSampleMatrix")
            .style("position", "relative")
        ;      
        chartDiv.selectAll("*").remove();
        
        
        // Scales
        this.x = d3.scale.linear();
        this.y = d3.scale.linear();
        
        
        this.zoomStatus = d3.behavior.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() { self.zoomHandler (self); })
        ;
        
        // Canvas viewport and element
        var canvasViewport = chartDiv.append("div")
            .attr ("class", "viewport")
            .style("position", "absolute")
            .style("top", this.margin.top + "px")
			.style("left", this.margin.left + "px")
            //.style("border", "1px solid red")
            .call(self.zoomStatus)
        ;
        
        this.canvas = canvasViewport.append("canvas");

        
        // SVG element
        this.svg = chartDiv.append("svg");

        
        // Axes setup
        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
        this.yAxis = d3.svg.axis().scale(this.y).orient("left");
        
        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        ;

        // Add the x-axis label
        //if (this.options.xlabel) {
            this.vis.append("g").append("text")
                .attr("class", "axis")
                .text(this.options.xlabel)
                .attr("dy","0em")
            ;
        //}

        // add y-axis label
        //if (this.options.ylabel) {
            this.vis.append("g").append("text")
                .attr("class", "axis")
                .text(this.options.ylabel)
                .attr("dy","1em")
            ;
        //}
        
        this.vis.append("g")
			.attr("class", "y axis")
			//.call(self.yAxis)
        ;
        
        this.vis.append("g")
			.attr("class", "x axis")
			//.call(self.xAxis)
        ;
        
        // colours
        this.dubiousUnlinked = "#eeeeee";
        this.withinUnlinked = "#ccebc5";//"#e6f5c9";//#a6dba0";//"#b2df8a";//

        this.overLinked = "red";//"#e7298a";//"#7570b3";
        this.dubiousLinked = "#1f78b4";//"#d95f02";
        this.withinLinked = "black";
        
        this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.render); 
        this.listenTo (this.model.get("distancesModel"), "change:distances", this.distancesChanged); 
        
        if (viewOptions.displayEventName) {
            this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible);
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
        CLMSUI.vent.trigger (this.displayEventName, false);
    },

    setVisible: function (show) {
        console.log("event display in matrix", show);
        d3.select(this.el).style('display', show ? 'block' : 'none');

        if (show) {
            this
                //.relayout() // need to resize first sometimes so render gets correct width/height coords
                .render()
            ;
        }
    },
    
    zoomHandler: function (self) {
        var sizeData = this.getSizeData();
        var minDim = sizeData.minDim;
        // bounded zoom behavior from https://gist.github.com/shawnbot/6518285
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
        var residueLinks = allProtProtLinks[0].residueLinks.values();
        var proteins = this.model.get("clmsModel").get("interactors");
        
        console.log ("interactors", this.model.get("clmsModel"));

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
        
        // two sets of nested loops, one per style
        /*
        ctx.fillStyle = self.withinUnlinked;
		
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
        

		ctx.fillStyle = self.dubiousUnlinked;
		
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
                        ctx.fillStyle = (distance > min ? self.dubiousUnlinked : self.withinUnlinked);
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

            var colourArrays = [self.dubiousUnlinked, self.withinUnlinked].map (function (col) {
                return d3.rgb (col);
            });

            for (var i = 1; i < seqLength + 1; i++){
                var row = distances[i];
                if (row){
                    var ixStep = (i - 1);
                    for (var j = 1; j < row.length; j++){   // was seqLength     
                        var distance = row[j];
                        if (distance && distance < max) {
                            var col = (distance > min ? colourArrays[0] : colourArrays[1]);
                            drawPixel (cd, ixStep + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
                        }
                    }
                }
            }
            ctx.putImageData(canvasData, 0, 0);
        //}
        
        
        var end = performance.now();
        CLMSUI.times.push(Math.round(end-start))
        console.log ("CLMSUI.times", CLMSUI.times);
        
        
		var rlCount = residueLinks.length;
		var sasIn = 0, sasMid = 0, sasOut = 0, eucIn = 0, eucMid = 0, eucOut = 0;
		for (var rl = 0; rl < rlCount; rl++) {
			var crossLink = residueLinks[rl];
            var fromDistArr = distances[crossLink.fromResidue];
            var dist = fromDistArr ? fromDistArr[crossLink.toResidue] : undefined;
            //console.log ("dist", dist, fromDistArr, crossLink.toResidue, crossLink);

            if (dist && dist < min){
                ctx.fillStyle = self.withinLinked;
                sasIn++;
            }
            else if (dist && dist < max){
                ctx.fillStyle =  self.dubiousLinked;
                sasMid++;
            }
            else {
                ctx.fillStyle =  self.overLinked;
                sasOut++;
            }
            ctx.fillRect((crossLink.fromResidue - 1) * xStep, (seqLength - crossLink.toResidue) * yStep , xStep, yStep);
            
            var toDistArr = distances[crossLink.toResidue];
            dist = toDistArr ? toDistArr[crossLink.fromResidue] : undefined;
            if (dist && dist < min){
                ctx.fillStyle = self.withinLinked;
                eucIn++;
            }
            else if (dist && dist < max){
                ctx.fillStyle = self.dubiousLinked;
                eucMid++;
            }
            else {
                ctx.fillStyle = self.overLinked;
                eucOut++;
            }
            ctx.fillRect((crossLink.toResidue - 1) * xStep, (seqLength - crossLink.fromResidue) * yStep , xStep, yStep);
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
        console.log ("deltaz", deltaz);
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
        
        // store current pan/zoom values
        var curt = this.zoomStatus.translate();
        var curs = this.zoomStatus.scale();
        //console.log ("cs", curt, curs);
        // reset reference x and y scales in zoomStatus object to be x and y scales above
        this.zoomStatus.x(this.x).y(this.y);
        // feed current pan/zoom values back into zoomStatus object
        // (as setting .x and .y above resets them)
        // this adjusts domains of x and y scales
        console.log ("cur", curs, curt);
        // modify translate coordinates by change (delta) in display size
        curt[0] *= deltaz;
        curt[1] *= deltaz;
        this.zoomStatus.scale(curs).translate(curt);
        
        
        // Basically the point is to readjust the axes when the display space is resized, but preserving their current zoom/pan settings
        // separately from the scaling due to the resizing
        
                
        // pan/zoom canvas
        self.panZoom ();
        
        // reposition labels
        var labelCoords = [
            {x: minDim / 2, y: minDim + this.margin.bottom, rot: 0}, 
            {x: -this.margin.left, y: minDim / 2, rot: -90}
        ];
        this.vis.selectAll("g text.axis")
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
        console.log ("transformString", transformString);
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
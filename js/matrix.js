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
        var panelDrag = d3.behavior.drag().on ("dragend", function() { self.resize(); });
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
        
        
        this.cpanzoom = d3.behavior.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() { self.canvasPanAndZoom (self); })
        ;
        this.userScale = 1;
        this.userOrigin = [0, 0];
        
        // Canvas viewport and element
        var canvasViewport = chartDiv.append("div")
            .attr ("class", "viewport")
            .style("position", "absolute")
            .style("top", this.margin.top + "px")
			.style("left", this.margin.left + "px")
            //.style("border", "1px solid red")
            .call(self.cpanzoom)
        ;
        
        var originString = "0 0";
        this.canvas = canvasViewport
            .append("canvas")
            .style ("image-rendering", "pixelated")
			.style("-ms-transform-origin", originString)
			.style("-moz-transform-origin", originString)
			.style("-o-transform-origin", originString)
			.style("-webkit-transform-origin", originString)
			.style("transform-origin", originString)
        ;

        
        // SVG element
        this.svg = chartDiv.append("svg");

        // Stats div, needs removed or improved
        this.stats = chartDiv.append("div").attr("id","statsDiv");

        
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
        
        this.distancesChanged ();
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
    
    canvasPanAndZoom: function (self) {
        console.log ("x domain pz", this.x.domain(), this.x.range());
        //console.log ("zoom event", d3.event.scale, d3.event.translate);
        self.userScale = d3.event.scale;
        self.userOrigin = d3.event.translate.slice();   // slice: copy array so it doesn't change on us unexpectedly
        self.panZoom();
    },
    
    render: function () {

        this.resize();
        
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();
        var residueLinks = allProtProtLinks[0].residueLinks.values();
        
        var sizeData = this.getSizeData(); 
		//var minDim = sizeData.minDim;

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
        
        if (sizeData.cx > 0) {
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
        }
        
        
        var end = performance.now();
        CLMSUI.times.push(Math.round(end-start))
        console.log ("CLMSUI.times", CLMSUI.times);
        
        
		var rlCount = residueLinks.length;
        console.log ("rlcount", rlCount);
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
    
        
		self.stats.html(sasIn + "\t" + sasMid + "\t" + sasOut+"<br>"+eucIn + "\t" + eucMid + "\t" + eucOut);
		console.log(">>"+eucIn + "\t" + eucMid + "\t" + eucOut);
    },
    
    getSizeData: function () {
        var self = this;
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var cx = $(this.svg.node()).width(); //this.svg.node().clientWidth;
		var cy = $(this.svg.node()).height(); //this.svg.node().clientHeight;
        //console.log ("Svg width", this.svg.attr("width"), this.svg.style("width"), this.svg.node().clientWidth, $(this.svg.node()).width());
        var width = Math.max (0, cx - self.margin.left - self.margin.right);
		var height = Math.max (0, cy - self.margin.top  - self.margin.bottom);
		//its going to be square and fit in containing div
		var minDim = Math.min (width, height);
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        
        var sizeData = this.getSizeData(); 
		//self.svg.attr("width", sizeData.cx).attr("height", sizeData.cy);
		var minDim = sizeData.minDim;
        		
        // fix viewport size, used .attr, but setting the size on the child canvas element expanded it, some style > attr thing
        d3.select(this.el).select(".viewport")
            .style("width",  minDim+"px")
			.style("height", minDim+"px")
        ;
		
        // rescale and position canvas according to pan/zoom settings and available space
		var canvasScale = minDim / seqLength;
        canvasScale *= this.userScale;
        var scaleString = "scale("+canvasScale+")";
        var translateString = "translate("+this.userOrigin[0]+"px,"+ this.userOrigin[1]+"px)";
        var transformString = translateString + " " + scaleString;
        console.log ("transformString", transformString);
		self.canvas
			.style("-ms-transform", transformString)
			.style("-moz-transform", transformString)
			.style("-o-transform", transformString)
			.style("-webkit-transform", transformString)
			.style("transform", transformString)
        ;
        
        // reposition labels
        var labelCoords = [
            {x: sizeData.minDim / 2, y: sizeData.minDim + this.margin.bottom, rot: 0}, 
            {x: -this.margin.left, y: sizeData.minDim / 2, rot: -90}
        ];
        this.vis.selectAll("g text.axis")
            .data (labelCoords)
            .attr ("transform", function(d) {
                return "translate("+d.x+" "+d.y+") rotate("+d.rot+")";
            })
        ;
        
        
        this.x
            //.domain([1, seqLength])
            .range([0, minDim])
        ;

		// y-scale (inverted domain)
		this.y
			//.domain([seqLength, 1])
			.range([0, minDim])
        ;
        
        this.cpanzoom.x(this.x).y(this.y);
		
		this.vis.select(".y")
			.call(self.yAxis)
        ;

		this.vis.select(".x")
			.attr("transform", "translate(0," + sizeData.minDim + ")")
			.call(self.xAxis)
        ;
    },
    
    // called when canvas is panned and zoomed
    panZoom: function () {
        
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        
        var sizeData = this.getSizeData(); 
		//self.svg.attr("width", sizeData.cx).attr("height", sizeData.cy);
		var minDim = sizeData.minDim;
        
        // rescale and position canvas according to pan/zoom settings and available space
		var canvasScale = minDim / seqLength;
        canvasScale *= this.userScale;
        var scaleString = "scale("+canvasScale+")";
        var translateString = "translate("+this.userOrigin[0]+"px,"+ this.userOrigin[1]+"px)";
        var transformString = translateString + " " + scaleString;
        console.log ("transformString", transformString);
		self.canvas
			.style("-ms-transform", transformString)
			.style("-moz-transform", transformString)
			.style("-o-transform", transformString)
			.style("-webkit-transform", transformString)
			.style("transform", transformString)
        ;
        
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
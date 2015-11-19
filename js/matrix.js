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
        
        // Canvas element
        var canvasViewport = chartDiv.append("div")
            .attr ("class", "viewport")
            .style ("overflow", "hidden")
            .style("position", "absolute")
        ;
        
        this.canvas = canvasViewport.append("canvas");
        var czoom = d3.behavior.zoom().scaleExtent([1, 8]).on("zoom", function() { self.canvasZoom (self); });
        this.userScale = 1;
        this.userOrigin = [0, 0];
        this.canvas
            .style("position", "relative")
            .call(czoom)
        ;
        
        // SVG element
        this.svg = chartDiv.append("svg");

        // Stats div, needs removed or improved
        this.stats = chartDiv.append("div").attr("id","statsDiv");

        
        // Scales and axes setup
        this.x = d3.scale.linear();
        this.y = d3.scale.linear();
        
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
			.call(self.yAxis)
        ;
        
        this.vis.append("g")
			.attr("class", "x axis")
			.call(self.xAxis)
        ;
        
        // colours
        this.dubiousUnlinked = "#eeeeee";
        this.withinUnlinked = "#ccebc5";//"#e6f5c9";//#a6dba0";//"#b2df8a";//

        this.overLinked = "red";//"#e7298a";//"#7570b3";
        this.dubiousLinked = "#1f78b4";//"#d95f02";
        this.withinLinked = "black";
        
        this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.render); 
        
        if (viewOptions.displayEventName) {
            this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible);
        }
				
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
    
    canvasZoom: function (self) {
        console.log ("zoom event", d3.event.scale, d3.event.translate);
        self.userScale = d3.event.scale;
        self.userOrigin = d3.event.translate.slice();
        self.resize();
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
        //var cx = self.el.clientWidth;
		//var cy = self.el.clientHeight;
        var cx = this.svg.node().clientWidth;
		var cy = this.svg.node().clientHeight;
        var width = Math.max (0, cx - self.margin.left - self.margin.right);
		var height = Math.max (0, cy - self.margin.top  - self.margin.bottom);
		//its going to be square and fit in containing div
		var minDim = Math.min (width, height);
        return {cx: cx, cy: cy, width: width, height: height, minDim: minDim};
    },
    
    resize: function () {
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        
        var sizeData = this.getSizeData(); 
		//self.svg.attr("width", sizeData.cx).attr("height", sizeData.cy);
		var minDim = sizeData.minDim;
        
        		
        d3.select(this.el).select(".viewport")
            .attr("width",  minDim)
			.attr("height", minDim)
        ;
		
		var canvasScale = minDim / seqLength;
        canvasScale *= this.userScale;
        var scaleString = "scale("+canvasScale+")";
        var originString = "0 0";
        var translateString = "translate("+this.userOrigin[0]+"px,"+ this.userOrigin[1]+"px)";
        var transformString = translateString + " " + scaleString;
        console.log ("transformString", transformString);
		self.canvas
			.style("-ms-transform", transformString)
			.style("-ms-transform-origin", originString)
			.style("-moz-transform", transformString)
			.style("-moz-transform-origin", originString)
			.style("-o-transform", transformString)
			.style("-o-transform-origin", originString)
			.style("-webkit-transform", transformString)
			.style("-webkit-transform-origin", originString)
			.style("transform", transformString)
			.style("transform-origin", originString)
			.style("top", (self.margin.top) + "px")
			.style("left", (self.margin.left) + "px")
        ;
        
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
        
        self.x
            .domain([1, seqLength])
            .range([0, minDim])
        ;

		// y-scale (inverted domain)
		self.y
			.domain([seqLength, 1])
			.range([0, minDim])
        ;
		
		self.vis.select(".y")
			.call(self.yAxis)
        ;

		self.vis.select(".x")
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
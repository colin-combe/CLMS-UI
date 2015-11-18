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
            xlabel: "Distance",
            ylabel: "Count",
            seriesName: "Cross Links",
            chartTitle: "Distogram",
            maxX: 80
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.margin = {
		 "top":    this.options.title  ? 30 : 20,
		 "right":  50,
		 "bottom": this.options.xlabel ? 60 : 40,
		 "left":   this.options.ylabel ? 90 : 60
        };
        
        this.displayEventName = viewOptions.displayEventName;
        
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var elem = d3.select(this.el);
        
        // Set up some html scaffolding in d3
        CLMSUI.utils.addDynDivScaffolding(elem);
        
        // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
        var drag = d3.behavior.drag().on ("dragend", function() { self.relayout(); });
        elem.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
            .call (drag)
        ;
        
        var chartDiv = elem.append("div")
            .attr("class", "panelInner")
            .attr("id", "currentSampleMatrix")
            .style("position", "relative")
            //.style("height", "calc( 100% - 40px )")
        ;
        
        chartDiv.selectAll("*").remove();
        this.canvas = chartDiv.append("canvas");
        this.canvas.style("position", "absolute").style("z-index", 0);
        this.svg = chartDiv.append("svg")
            .style("position", "absolute")
            .style("top", "0px")
            .style("left", "0px")
            .style("z-index", "1")
        ;

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        ;
        //this.sliderDiv = chartDiv.append("div").attr("id","sliderDiv");
        //this.slider = new DistanceSlider("sliderDiv", this);
        this.stats = chartDiv.append("div").attr("id","statsDiv");

        // Add the x-axis label
        if (this.options.xlabel) {
            this.vis.append("text")
                .attr("class", "axis")
                .text(this.options.xlabel)
                .attr("x", self.el.clientWidth/2)
                .attr("y", self.el.clientHeight)
                .attr("dy","2.4em")
                .style("text-anchor","middle");
        }

        // add y-axis label
        if (this.options.ylabel) {
            this.vis.append("g").append("text")
                .attr("class", "axis")
                .text(this.options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -90 + " " + self.el.clientHeight/2+") rotate(-90)");
        }
        
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
    
    render: function () {
        var self = this;
        var distances = this.model.get("distancesModel").get("distances");
        var seqLength = distances.length - 1;
        var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();
        var residueLinks = allProtProtLinks[0].residueLinks.values();

		var cx = Math.max (0, self.el.clientWidth - 160);
		var cy = self.el.clientHeight;
        
		self.svg.attr("width", cx).attr("height", cy);
		self.vis.attr("width", cx).attr("height", cy).selectAll("*").remove();
		
		var width = Math.max (0, self.el.clientWidth - self.margin.left - self.margin.right);
		var height = Math.max (0, cy - self.margin.top  - self.margin.bottom);
		//its going to be square and fit in containing div
		var minDim = Math.min (width, height);
		
		
		var canvasScale = minDim / (seqLength * 2);
		self.canvas.attr("width",  minDim / canvasScale)
			.attr("height", minDim / canvasScale)
			.style("-ms-transform","scale("+canvasScale+")")
			.style("-ms-transform-origin", "0 0")
			.style("-moz-transform","scale("+canvasScale+")")
			.style("-moz-transform-origin", "0 0")
			.style("-o-transform","scale("+canvasScale+")")
			.style("-o-transform-origin", "0 0")
			.style("-webkit-transform","scale("+canvasScale+")")
			.style("-webkit-transform-origin", "0 0")
			.style("transform","scale("+canvasScale+")")
			.style("transform-origin", "0 0")
			.style("top", (self.margin.top) + "px")
			.style("left", (self.margin.left) + "px");
		
		var ctx = self.canvas[0][0].getContext("2d");
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, minDim / canvasScale, minDim / canvasScale);
		
		self.x = d3.scale.linear()
		  .domain([1, seqLength])
		  .range([0, minDim]);

		// y-scale (inverted domain)
		self.y = d3.scale.linear()
			.domain([seqLength, 1])
			.range([0, minDim]);
		
		self.vis.append("g")
			.attr("class", "y axis")
			.call(d3.svg.axis().scale(self.y).orient("left"))
        ;

		self.vis.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.svg.axis().scale(self.x).orient("bottom"))
        ;

		var xStep = 1;//minDim / seqLength;
		var yStep = 1;//minDim / seqLength;
		
        var rangeDomain = self.model.get("rangeModel").get("scale").domain();
		var sliderExtent = rangeDomain.slice(1);
		
		
        
        var min = sliderExtent[0];
        var max = sliderExtent[1];
        
        // That's how you define the value of a pixel //
        // http://stackoverflow.com/questions/7812514/drawing-a-dot-on-html5-canvas

        function drawPixel (cd, x, y, r, g, b, a) {
            var index = (x + y * cx) * 4;

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
        
        if (cx > 0) {
            var canvasData = ctx.getImageData (0, 0, self.canvas.attr("width"), self.canvas.attr("height"));
            console.log ("canvas", self.canvas.attr("width"), self.canvas.attr("height"));
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
                            drawPixel (canvasData.data, ixStep, (seqLength - j), col.r, col.g, col.b, 255);
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
            var fromDist = distances[crossLink.fromResidue];
            var fromDistTo = fromDist ? fromDist[crossLink.toResidue] : undefined;

            if (fromDist && fromDistTo && fromDistTo < sliderExtent[0]){
                ctx.fillStyle = self.withinLinked;
                sasIn++;
            }
            else if (fromDist && fromDistTo && fromDistTo < sliderExtent[1]){
                ctx.fillStyle =  self.dubiousLinked;
                sasMid++;
            }
            else {
                ctx.fillStyle =  self.overLinked;
                sasOut++;
            }
            ctx.fillRect((crossLink.fromResidue - 1) * xStep, (seqLength - crossLink.toResidue) * yStep , xStep, yStep);
            
            var toDist = distances[crossLink.toResidue];
            var toDistFrom = toDist ? toDist[crossLink.fromResidue] : undefined;
            if (toDist && toDistFrom && toDistFrom < sliderExtent[0]){
                ctx.fillStyle = self.withinLinked;
                eucIn++;
            }
            else if (toDist && toDistFrom && toDistFrom < sliderExtent[1]){
                ctx.fillStyle = self.dubiousLinked;
                eucMid++;
            }
            else {
                ctx.fillStyle = self.overLinked;
                eucOut++;
            }
            ctx.fillRect((crossLink.toResidue - 1) * xStep, (seqLength - crossLink.fromResidue) * yStep , xStep, yStep);
		}
    
        
		self.stats.html(sasIn + "\t" + sasMid + "\t" + sasOut);
		console.log(">>"+eucIn + "\t" + eucMid + "\t" + eucOut);
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
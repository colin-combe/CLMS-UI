//		colour-slider
//		Copyright 2016 Rappsilber Laboratory
//
//    	This product includes software developed at
//    	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//		author: Colin Combe, Martin Graham
//		
//		ThreeColourSliderBB.js
//
//      A brush slider with three colours taken from an underlying colour scale passed in as the model

var CLMSUI = CLMSUI || {};

CLMSUI.ThreeColourSliderBB = Backbone.View.extend ({
    events: {
        "change input.subsetNumberFilter": "directInput",
        "keyup input.subsetNumberFilter": "directInputIfReturn",
        "mouseup input.subsetNumberFilter": "directInput",
    },
    
    initialize: function (viewOptions) {
		
		var defaultOptions = {
			unitText: "",
			extent: this.model.get("colScale").domain() || [40, 60],
			domain: this.model.get("superDomain") || [0, 100],
			margin: {},
			orientation: "vertical",
			absolutePosition: true,
			sliderThickness: 50,
        };
        this.options = _.extend ({}, defaultOptions, viewOptions);
        
        var self = this;
        var top = d3.select(this.el);
        
		var isVert = this.isVerticallyOriented();
		var orientCoord = isVert ? "y" : "x";
		var perpOrientCoord = isVert ? "x" : "y";
		var thicknessDim = isVert ? "width" : "height";
		
        top
            .classed (isVert ? "verticalFlexContainer" : "horizontalFlexContainer", true)
			.classed ("absolutePosition", this.options.absolutePosition)
            .classed ("threeColourSlider", true)
        ;
        
        $(window).on("resize", function() { 
            self.resize().render(); 
        });

        var margin = _.extend ({top: 50, right: 50, bottom: 50, left: 50}, this.options.margin);
        
        this.height = this.el.clientHeight - margin.top - margin.bottom;
		this.width = this.el.clientWidth - margin.left - margin.right;

		
        this.majorDim = d3.scale.linear()
            .domain(self.options.domain)
            .range(isVert ? [this.height, 0] : [0, this.width])
        ;
        
        this.brush = d3.svg.brush()
            [orientCoord](this.majorDim)
            .extent(self.options.extent)
            .on("brushstart", function () { self.brushstart(); })
            .on("brush", function () { self.brushmove(); })
            .on("brushend", function () { self.brushend(); })
        ;
        
        var cutoffs = [
            {class: "vmin"},
            {class: "vmax"},
        ];
        var numberInputs = top.selectAll("div.inputWrapper")
            .data (cutoffs)
            .enter()
            .append("div")
			.attr("class", function(d) { return "inputWrapper "+d.class; })
		;
		numberInputs.append("input")
            .attr ({
                class: function(d) { return "subsetNumberFilter "+d.class; }, 
                type: "number",
                min: self.options.domain[0],
                max: self.options.domain[1],
                step: 0.01,
            })
		;
		numberInputs.append("span")
			.text (self.options.unitText)
        ;

        var svg = top.append("svg")
            //.attr("width", width + margin.left + margin.right)
            //.attr("height", this.height + margin.top)
            .append("g")
            //.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        ;
        
        // upper brush rectangles with colours from underlying scale
        this.upperRange = svg.append("rect").attr(perpOrientCoord, 0).attr(orientCoord, /*-10*/ 0).attr(thicknessDim, this.options.sliderThickness);
        this.lowerRange = svg.append("rect").attr(perpOrientCoord, 0).attr(thicknessDim, this.options.sliderThickness);
        this.textFormat = d3.format(".2f");
        
        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(this.brush)
        ;

        // triangle handles
        var triHandle = brushg.selectAll(".resize")
			.append ("g")
			.attr ("class", "triangleHandle")
			.attr("transform", "translate("+(isVert ? this.options.sliderThickness+",0)" : "0, "+this.options.sliderThickness+") rotate(90)"))
		;
        
		triHandle.append("path")
        	.attr("d", "M 0 0 l 10.5 10.5 l 8 0 l 0 -21 l -8 0 Z")
        ;
        
        // text values in bar
        brushg.selectAll(".resize")
            .append ("text")
                .attr("transform", function(d,i) {
                    return "translate(0,"+(isVert ? (-2 + (i*13)) : 11)+")";
                })
                .attr ("class", "brushValueText")
                .text ("0")
        ;
        
        brushg.selectAll("rect")
            .attr(thicknessDim, this.options.sliderThickness);
        
        this.brushg = brushg;
        
        this.brushmove();
        
        
        svg.append("text")
            .attr ("transform", isVert ? "rotate(90) translate(0,-"+(this.options.sliderThickness+2)+")" : "translate(0,"+(this.options.sliderThickness+12)+")")
            .attr ("class", "threeColourSliderTitle")
            .text (self.options.title)
        ;
        
        // move min box to bottom of slider
        top.append (function() {
            return top.select("div.vmin").remove().node();
        });
        
        this.listenTo (this.model, "colourModelChanged", this.render); // if range  (or domain) changes in current colour model
        
        return this;
    },
    
	resetStretchDimension: function () {
		var d3el = d3.select(this.el);
		// Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(d3el.select("svg").node());
		var stretchDim = this.isVerticallyOriented() ? "height" : "width";
        this[stretchDim] = jqElem[stretchDim]();	//this.svg.node().clientHeight;
		return this;
	},
	
    resize: function () {
		this.resetStretchDimension();
  		var d3el = d3.select(this.el);
		
        // changing y range automatically adjusts the extent, but we want to keep the same extent
        var oldExtent = this.brush.extent();
        this.majorDim.range (this.isVerticallyOriented() ? [this.height, 0] : [0, this.width]);
        this.brush.extent (oldExtent);
        this.brush (d3el.select(".brush"));

        return this;
    },
    
    render: function (args) {
		// use brush extent or domain value (when render is called from backbone)
		// domain value here is not the domain of the slider, but the domain of the colour scale (should fit within the slider's domain)
        var s = (args && args.domain ? args.domain.slice() : undefined) || this.brush.extent();	
		var d3el = d3.select(this.el);
		this.brush.extent (s); 
        d3el.select("svg g.brush").call(this.brush);   // recall brush binding so background rect is resized and brush redrawn
    
        this.resetStretchDimension();

        var colRange = this.model.get("colScale").range();
		var isVert = this.isVerticallyOriented();
		var orientDim1 = isVert ? "height" : "width";
		var orientDim2 = isVert ? "y" : "x";
		
        this.upperRange.attr(orientDim1, this.majorDim(s[1]) /*+ 10*/).style("fill", colRange[isVert ? 2 : 0]);
        this.brushg.select(".extent").style ("fill", colRange[1]);
        this.lowerRange
			.attr(orientDim1, Math.max (0, this[orientDim1] - this.majorDim(s[0])))
			.attr(orientDim2, this.majorDim(s[0]))
			.style("fill", colRange[isVert ? 0 : 2])
		;

        var self = this;
        d3el.selectAll(".brushValueText")
            .text (function(d,i) { return self.textFormat(s[s.length - i - 1]) + self.options.unitText; })
        ;
        
        var rounded = s.map (function (val) {
            return parseFloat(this.textFormat(val));
        }, this);
        
        d3el.select("div.vmin > input").property ("value", rounded[0]);
        d3el.select("div.vmax > input").property ("value", rounded[1]);
        return this;
    },
    
    show: function (show) {
        d3.select(this.el).style("display", show ? null : "none");
        if (show) { this.render(); }
        return this;
    },

	brushstart: function () { return this; },

	brushmove: function () {
        var s = this.brush.extent();
        // round so values in domain are the same that are shown in text labels and input controls
        var rounded = s.map (function (val) {
            return parseFloat(this.textFormat(val));
        }, this);
        this.model.setDomain (rounded);    // this'll trigger a re-render due to the colourModelChanged listener above ^^^
        return this;     
	},

	brushend: function () { return this; },
       
    
    directInput: function (evt) {
        var target = evt.target;
        var value = +target.value;
        var isMin = d3.select(target).classed("vmin");
        var bounds = this.majorDim.domain();

        var s = this.brush.extent();
        var correct = 
            [bounds[0], isMin ? value : s[0], isMin ? s[1] : value, bounds[1]]
            .sort(function(a,b) { return a - b;})
            .slice (1,3)
        ;
        
        this.brush.extent (correct);
        this.brush (d3.select(this.el).select(".brush"));
        this.brushmove();
    },
    
    directInputIfReturn: function (evt) {
        if (evt.keyCode === 13) {
            this.directInput (evt);
        }
    },
	
	isVerticallyOriented: function () {
		return this.options.orientation.toLowerCase() === "vertical";
	},
});
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
    events: {},
    initialize: function (options) {

        this.rangeModel = options.rangeModel;   // a parallel, optional rangeModel I'm trying to sideline, still used by crosslinkviewer 23/08/16
        this.cx = this.el.clientWidth;
        this.cy = this.el.clientHeight;

        var margin = _.extend ({top: 50, right: 50, bottom: 50, left: 50}, options.margin || {});
        var width = 140 - margin.left - margin.right;
        
        this.height = this.cy - margin.top - margin.bottom;

        this.y = d3.scale.linear()
            .domain(options.domain || [0, 100])
            .range([this.height, 0])
        ;
              
        var self = this;

        this.brush = d3.svg.brush()
            .y(this.y)
            .extent(options.extent || [40, 60])
            .on("brushstart", function () { self.brushstart(); })
            .on("brush", function () { self.brushmove(); })
            .on("brushend", function () { self.brushend(); })
        ;

        var svg = d3.select(this.el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(-1,0)")
            .call(d3.svg.axis().scale(this.y).orient("left"));

        console.log ("this", this.model);
        // upper brush rectangles with colours from underlying scale
        this.upperRange = svg.append("rect").attr("x", 0).attr("y", -10)
            .attr("width", 50).attr("fill",this.model.get("colScale").range()[2]);
        this.lowerRange = svg.append("rect").attr("x", 0)
            .attr("width", 50).attr("fill",this.model.get("colScale").range()[0]);
        this.textFormat = d3.format(".2f");
        
        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        // brush extent rectangle given colour from underlying scale
        brushg.select(".extent")
            .style ("fill", this.model.get("colScale").range()[1])
        ;
        
        // triangle handles
        brushg.selectAll(".resize")
            .append("path")
                .attr("transform", "translate(50,0)")
                .attr("d", "M0 0 L20 20 L20 -20 z")
        ;
        
        // triangle highlighting bevel
        brushg.selectAll(".resize")
            .append("path")
                .attr ("class", "bevel")
                .attr("transform", "translate(50,0)")
                .attr("d", "M0 0 L20 -20")
        ;
        
        // text values in bar
        brushg.selectAll(".resize")
            .append ("text")
                .attr("transform", function(d,i) {
                    return "translate(0,"+(-2 + (i*13))+")";
                })
                .attr ("class", "brushValueText")
                .text ("0")
        ;
        
        brushg.selectAll("rect")
            .attr("width", 50);
        
        if (this.rangeModel) {
            this.rangeModel.set ("active", true);
        }
        
        this.brushmove();
    },
    
    render: function () {
        var s = this.brush.extent();
        this.upperRange.attr("height", this.y(s[1]) + 10);
        this.lowerRange.attr("height", this.height - this.y(s[0])).attr("y", this.y(s[0]));
        var self = this;
        d3.select(this.el).selectAll(".brushValueText")
            .text (function(d,i) { return self.textFormat(s[s.length - i - 1]); })
        ;
    },

	brushstart: function () { return this; },

	brushmove: function () {
        var s = this.brush.extent();
        this.render();
	  
		var scale = d3.scale.threshold()
		  .domain([s[0], s[1]])
		  .range(this.model.get("colScale").range())
        ;
        
        this.model.setDomain ([s[0], s[1]]);
        if (this.rangeModel) {
            this.rangeModel.set ("scale", scale);
        }
        
        return this;     
	},

	brushend: function () { return this; }
});
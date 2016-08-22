//		colour-slider
//		Copyright 2016 Rappsilber Laboratory
//
//    	This product includes software developed at
//    	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//		author: Colin Combe, Martin Graham
//		
//		ThreeColourSliderBB.js

var CLMSUI = CLMSUI || {};

CLMSUI.ThreeColourSliderBB = Backbone.View.extend ({
    events: {},
    initialize: function (options) {

        this.underlyingScale = options.underlyingScale; // a CLMSUI.BackboneModelTypes.ColourModel
        this.cx = this.el.clientWidth;
        this.cy = this.el.clientHeight;

        var margin = _.extend ({top: 50, right: 50, bottom: 50, left: 50}, options.margin || {});
        var width = 140 - margin.left - margin.right;
        
        this.height = this.cy - margin.top - margin.bottom;

        this.y = d3.scale.linear()
            .domain([35, 0])
            .range([0, this.height])
        ;
              
        var self = this;

        this.brush = d3.svg.brush()
            .y(this.y)
            .extent([15, 25])
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

        this.upperRange = svg.append("rect").attr("x", 0).attr("y", -10)
            .attr("width", 50).attr("fill",this.underlyingScale.get("colScale").range()[2]);
        this.lowerRange = svg.append("rect").attr("x", 0)
            .attr("width", 50).attr("fill",this.underlyingScale.get("colScale").range()[0]);
        this.textFormat = d3.format(".2f");
        
        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        brushg.selectAll(".resize")
            .append("path")
                .attr("transform", "translate(50,0)")
                .attr("d", "M0 0 L20 20 L20 -20 z")
        ;
        
        brushg.selectAll(".resize")
            .append("path")
                .attr ("class", "bevel")
                .attr("transform", "translate(50,0)")
                .attr("d", "M0 0 L20 -20")
        ;
        
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
        
        this.model.set ("active", true);
        
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

	brushstart: function () {  
        //d3.select(this.el).select("svg").classed("selecting", true);
        return this;
	},

	brushmove: function () {
        var s = this.brush.extent();
        this.render();
	  
		var scale = d3.scale.threshold()
		  .domain([s[0], s[1]])
		  .range(this.underlyingScale.get("colScale").range())
        ;
        
        this.underlyingScale.setDomain ([s[0], s[1]]);
        this.model.set ("scale", scale);
        
        return this;     
	},

	brushend: function () {    
        //d3.select(this.el).select("svg").classed("selecting", !d3.event.target.empty());
        return this;
	}
});
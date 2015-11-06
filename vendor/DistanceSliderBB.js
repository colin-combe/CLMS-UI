//		distance-slider
//		Copyright 2015 Rappsilber Laboratory
//
//    	This product includes software developed at
//    	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//		author: Colin Combe
//		
//		DistanceSlider.js

var CLMSUI = CLMSUI || {};

CLMSUI.DistanceSliderBB = Backbone.View.extend ({
    tagName: "div",
    events: {},
    initialize: function () {
        this.brushMoved = new signals.Signal();

        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
             
        //avoids prob with 'save - web page complete'
        d3.select(this.el).selectAll("*").remove();
        this.cx = this.el.clientWidth;
        this.cy = this.el.clientHeight;

        var margin = {top: 50, right: 50, bottom: 50, left: 50},//{top: 194, right: 50, bottom: 214, left: 50},
            width = 140 - margin.left - margin.right
        ;
        
        this.height = this.cy - margin.top - margin.bottom;


        this.y = d3.scale.linear()
            .domain([35, 0])
            .range([0, this.height]);
        
        var self = this;

        this.brush = d3.svg.brush()
            .y(this.y)
            .extent([15, 25])
            .on("brushstart", function() { self.brushstart (); })
            .on("brush", function() { self.brushmove (); })
            .on("brushend", function() { self.brushend (); })

        var svg = d3.select(this.el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(-1,0)")
            .call(d3.svg.axis().scale(this.y).orient("left"));

        //~ var circle = svg.append("g").selectAll("circle")
            //~ .data(data)
          //~ .enter().append("circle")
            //~ .attr("transform", function(d) { return "translate(" + x(d) + "," + y() + ")"; })
            //~ .attr("r", 3.5);

        this.upperRange = svg.append("rect").attr("x", 0).attr("y", -10)
                    .attr("width", 50).attr("fill","#9970AB");
        this.lowerRange = svg.append("rect").attr("x", 0)
                    .attr("width", 50).attr("fill","#5AAE61");


        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        brushg.selectAll(".resize").append("path")
            .attr("transform", "translate(50,0)")
            //~ .attr("r", "20");
            .attr("d", "M0 0 L20 20 L20 -20 z")

        brushg.selectAll("rect")
            .attr("width", 50);

        this.render();
        
        this.model.set ("active", true);
        
        this.brushstart();
    },
    
    render: function () {
        var s = this.brush.extent();
        var self = this;
	   //~ circle.classed("selected", function(d) { return (s[0] <= d && d <= s[1]); });
	   this.upperRange.attr("height", self.y(s[1]) + 10);
	   this.lowerRange.attr("height", self.height - self.y(s[0])).attr("y", self.y(s[0]));
    },

	brushstart: function () {  
        d3.select(this.el).select("svg").classed("selecting", true);
	},

	brushmove: function () {
        
	   var s = this.brush.extent();
        this.render();
	  
		var scale = d3.scale.threshold()
		  .domain([0, s[0], s[1]])
		  .range(['black','#5AAE61','#FDB863','#9970AB'])
        ;
	  
        this.brushMoved.dispatch(scale);
        this.model.set ("scale", scale);
	},

	brushend: function () {    
        d3.select(this.el).select("svg").classed("selecting", !d3.event.target.empty());
	}
});

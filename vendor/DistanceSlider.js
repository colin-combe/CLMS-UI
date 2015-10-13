//		distance-slider
//		Copyright 2015 Rappsilber Laboratory
//
//    	This product includes software developed at
//    	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//		author: Colin Combe
//		
//		DistanceSlider.js

function DistanceSlider (targetDiv){
	this.brushMoved = new signals.Signal();
	
	// targetDiv could be div itself or id of div - lets deal with that
	if (typeof targetDiv === "string"){
		targetDiv = document.getElementById(targetDiv);
	}
	//avoids prob with 'save - web page complete'
	d3.select(targetDiv).selectAll("*").remove();
	this.targetDiv = targetDiv;
	this.cx = this.targetDiv.clientWidth;
	this.cy = this.targetDiv.clientHeight;

	var margin = {top: 50, right: 50, bottom: 50, left: 50},//{top: 194, right: 50, bottom: 214, left: 50},
		width = 140 - margin.left - margin.right,
		height = this.cy - margin.top - margin.bottom;
	
	
	var y = d3.scale.linear()
		.domain([35, 0])
		.range([0, height]);

	this.brush = d3.svg.brush()
		.y(y)
		.extent([15, 25])
		.on("brushstart", brushstart)
		.on("brush", brushmove)
		.on("brushend", brushend);

	var svg = d3.select(targetDiv).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(-1,0)")
		.call(d3.svg.axis().scale(y).orient("left"));

	//~ var circle = svg.append("g").selectAll("circle")
		//~ .data(data)
	  //~ .enter().append("circle")
		//~ .attr("transform", function(d) { return "translate(" + x(d) + "," + y() + ")"; })
		//~ .attr("r", 3.5);

	var upperRange = svg.append("rect").attr("x", 0).attr("y", -10)
				.attr("width", 50).attr("fill","#9970AB");
	var lowerRange = svg.append("rect").attr("x", 0)
				.attr("width", 50).attr("fill","#5AAE61");

	var s = this.brush.extent();
	  //~ circle.classed("selected", function(d) { return (s[0] <= d && d <= s[1]); });
	  upperRange.attr("height", y(s[1]) + 10);
	  lowerRange.attr("height", height - y(s[0])).attr("y", y(s[0]));
	 

	var brushg = svg.append("g")
		.attr("class", "brush")
		.call(this.brush);

	brushg.selectAll(".resize").append("path")
		.attr("transform", "translate(50,0)")
		//~ .attr("r", "20");
		.attr("d", "M0 0 L20 20 L20 -20 z")

	brushg.selectAll("rect")
		.attr("width", 50);
	
	var self = this;
	
	brushstart();

	function brushstart() {
	  svg.classed("selecting", true);
	}

	function brushmove() {
	  var s = self.brush.extent();
	  //~ circle.classed("selected", function(d) { return (s[0] <= d && d <= s[1]); });
	  upperRange.attr("height", y(s[1]) + 10);
	  lowerRange.attr("height", height - y(s[0])).attr("y", y(s[0]));
	  
		var scale = d3.scale.threshold()
		.domain([0, s[0], s[1]])
		.range(['black','#5AAE61','#FDB863','#9970AB']);
	  
	  self.brushMoved.dispatch(scale);
	}

	function brushend() {
	  svg.classed("selecting", !d3.event.target.empty());
	}
}

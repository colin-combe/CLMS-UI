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
        var top = d3.select(this.el);
        
        top.classed("verticalFlexContainer", true);
        

        this.brush = d3.svg.brush()
            .y(this.y)
            .extent(options.extent || [40, 60])
            .on("brushstart", function () { self.brushstart(); })
            .on("brush", function () { self.brushmove(); })
            .on("brushend", function () { self.brushend(); })
        ;
        
        var cutoffs = [
            {id: "a3dminSlider", min: 0, max: 35},
            {id: "a3dmaxSlider", min: 0, max: 35},
        ]
        top.selectAll("input.subsetNumberFilter")
            .data (cutoffs)
            .enter()
            .append("input")
            .attr ({
                id: function(d) { return d.id; }, 
                class: "subsetNumberFilter", 
                type: "number", 
						          min: function(d) { return d.min; }, 
                max: function(d) { return d.max; }
            })
        ;

        var svg = top.append("svg")
            //.attr("width", width + margin.left + margin.right)
            //.attr("height", this.height + margin.top)
            .append("g")
            //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        // http://stackoverflow.com/questions/13069446/simple-fill-pattern-in-svg-diagonal-hatching
        /*
        var hatchPattern = svg.append("pattern")
            .attr("id", this.el.id+"Hatch")
            .attr("patternUnits", "userSpaceOnUse")
            .attr ("width", 3)
            .attr ("height", 3)
        ;
        
        hatchPattern.append("rect")
            .attr({x: 0, y: 0, width :3, height : 3})
            .style ("fill", "#aaa")
        ;     
        hatchPattern.append("rect")
            .attr({x: 0, y: 0, width :1, height : 1})
            .style ("fill", "#ddd")
        ;
        hatchPattern.append("rect")
            .attr({x: 1, y: 1, width :1, height : 1})
            .style ("fill", "#777")
        ;
        */
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(-1,0)")
            .call(d3.svg.axis().scale(this.y).orient("left"));

        console.log ("this", this.model);
        // upper brush rectangles with colours from underlying scale
        this.upperRange = svg.append("rect").attr("x", 0).attr("y", /*-10*/ 0).attr("width", 50);
        this.lowerRange = svg.append("rect").attr("x", 0).attr("width", 50);
        this.textFormat = d3.format(".2f");
        
        var brushg = svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        // triangle handles
        brushg.selectAll(".resize")
            .append("path")
                .attr("transform", "translate(50,0)")
                .attr("d", "M0 0 L20 20 L20 -20 z")
                //.style("fill", "url(#"+self.el.id+"Hatch)")
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
        
        this.brushg = brushg;
        
        this.brushmove();
        
        top.append (function() {
          return top.select("input.subsetNumberFilter:last-of-type").remove().node();
        });
        
        this.listenTo (this.model, "colourModelChanged", this.render); // if range  (or domain) changes in current colour model
        
        return this;
    },
    
    render: function () {
        var s = this.brush.extent();

        var colRange = this.model.get("colScale").range();
        this.upperRange.attr("height", this.y(s[1]) /*+ 10*/).style("fill", colRange[2]);
        this.brushg.select(".extent").style ("fill", colRange[1]);
        this.lowerRange.attr("height", this.height - this.y(s[0])).attr("y", this.y(s[0])).style("fill", colRange[0]);

        var self = this;
        d3.select(this.el).selectAll(".brushValueText")
            .text (function(d,i) { return self.textFormat(s[s.length - i - 1]); })
        ;
        
        var cutoffs = this.model.get("colScale").domain().reverse();
        console.log ("cutoffs", cutoffs);
        d3.select(this.el).selectAll("input.subsetNumberFilter")
            .property ("value", function(d, i) { return cutoffs[i]; })
        ;
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
        this.model.setDomain ([s[0], s[1]]);    // this'll trigger a re-render due to the colourModelChanged listener above ^^^
        return this;     
	},

	brushend: function () { return this; }
});
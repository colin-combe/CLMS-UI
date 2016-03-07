var CLMSUI = CLMSUI || {};

var SpectrumViewWrapper = CLMSUI.utils.BaseFrameView.extend({
    
    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{});
    },


	initialize: function (options) {
        console.log ("args", arguments, options);
        var myOptions = options.options;
        SpectrumViewWrapper.__super__.initialize.apply (this, arguments);
        
        var _html = "<label>lossy labels<input id='lossyChkBx' type='checkbox'></label>"
				+"<button id='reset'>reset zoom</button>"
				+"<button id='clearHighlights'>clear highlights</button>"
				+"<label>measure<input id='measuringTool' type='checkbox'></label>"
				+"<label>move labels<input id='moveLabels' type='checkbox'></label>"
				+"<label for='colorSelector'>Change color scheme:</label>"
				+"<select id='colorSelector' style='display:inline-block;'></select>" 
				+"<form id='setrange' style='display:inline-block;'>m/z Range:"
					+"<input type='text' id='xleft' size='5'>"
					+"<input type='text' id='xright' size='5'>"
					+"<input type='submit' value='set range'>"
					+"<span id='range-error'></span>"
				+"</form>"
				+"<svg id='spectrumSVG' style='height:400px; width:100%;'></svg>"
				+"<div id='measureTooltip'></div>"
        ;
        
        d3.select(this.el)
            .append("div")
            .attr("id", myOptions.wrapperID)
            .html (_html)
        ;
        
        var colOptions = [
            {value: "RdBu", text: "Red & Blue"},
            {value: "BrBG", text: "Brown & Teal"},
            {value: "PiYG", text: "Pink & Green"},
            {value: "PRGn", text: "Purple & Green"},
            {value: "PuOr", text: "Orange & Purple"},
        ];
        d3.select("#colorSelector").selectAll("option").data(colOptions)
            .enter()
            .append("option")
            .attr ("value", function(d) { return d.value; })
            .text (function(d) { return d.text; })
        ;
	},
    
    relayout: function () {
        CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
        return this;
    },
});

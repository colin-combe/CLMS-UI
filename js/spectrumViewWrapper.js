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
        
        var _html = ""
            +"<div id='spectrumControls'>"
            +"<div>"
            +"<button id='reset'>Reset Zoom</button>"
            +"<button id='clearHighlights'>Clear Highlights</button>"
            +"<button class='downloadButton'>Export SVG</button>"
            +"</div>"
            +"<div>"
            +"<label>Color scheme:</label>"
            +"<select id='colorSelector'></select>"
            +"<label>Lossy Labels<input id='lossyChkBx' type='checkbox'></label>"
            +"<label>Measure<input id='measuringTool' type='checkbox'></label>"
            +"<label>Move Labels<input id='moveLabels' type='checkbox'></label>"
            +"<form id='setrange'><label>m/z Range:</label>"
             +"<input type='text' id='xleft' size='7'>"
             +"<input type='text' id='xright' size='7'>"
             +"<input type='submit' value='set range'>"
             +"<span id='range-error'></span>"
            +"</form>"
            +"</div>"
            +"</div>"
            +"<div class='heightFill'>"
            +"<svg id='spectrumSVG'></svg>"
            +"</div>"
            +"<div id='measureTooltip'></div>"
        ;
        
        d3.select(this.el)
            .append("div")
            .attr("id", myOptions.wrapperID)
            // http://stackoverflow.com/questions/90178/make-a-div-fill-the-height-of-the-remaining-screen-space?rq=1
            .style ("display", "table")
            .html (_html)
        ;

        d3.select("#"+myOptions.wrapperID)
            .selectAll("button")
            .classed ("btn btn-1 btn-1a", true)
        ;
        
        d3.select(this.el).selectAll("label")
            .classed ("btn", true)
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

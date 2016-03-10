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
        var myOptions = options.myOptions;
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

            +"<div id='measureTooltip'></div>"
                    +"</div>"
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
        
        // Only if spectrum viewer visible...
        // When crosslink selection changes, pick highest scoring filtered match of the set
        // and tell it to show the spectrum for that match
        this.listenTo (this.model, "change:selection", function (model, selection) {  
            var fMatches = CLMSUI.modelUtils.aggregateCrossLinkFilteredMatches (selection);

            if (fMatches.length === 0) {
                CLMSUI.vent.trigger ("spectrumShow", false);
            } else {
                fMatches.sort (function(a,b) { return b[0].score - a[0].score; });
                this.model.set ("lastSelectedMatch", {match: fMatches[0][0], directSelection: false});
            }
        });
     
        this.listenTo (this.model, "change:lastSelectedMatch", function (model, selectedMatch) {
            this.triggerSpectrumViewer (selectedMatch.match, selectedMatch.directSelection);
        });
	   },
    
    triggerSpectrumViewer: function (match, forceShow) {
        console.log ("MATCH selected", match, forceShow);
        if (this.isVisible() || forceShow) {
            this.newestSelectionShown = true;
            CLMSUI.vent.trigger ("individualMatchSelected", match);
        } else {
            this.newestSelectionShown = false;
        }
    },
    
    relayout: function () {
        // if a new selected match has been made while the spectrum viewer was hidden,
        // load it in when the spectrum viewer is made visible
        if (!this.newestSelectionShown) {
            console.log ("LAZY LOADING SPECTRUM");
            var selectedMatch = this.model.get("lastSelectedMatch");
            this.triggerSpectrumViewer (selectedMatch.match, true);
        }
        // resize the spectrum on drag
        CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
        return this;
    },
});

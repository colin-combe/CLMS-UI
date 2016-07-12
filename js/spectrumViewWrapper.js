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
            +"<div id='spectrumControlsTop'>"
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
            +"<div class='validationControls'>"
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
        
        
        if (CLMSUI.loggedIn) {
			this.validationMap = {A: "A", B: "B", C: "C", "?": "Q", R: "R"};
			var buttonData = d3.entries(this.validationMap).map (function(entry) { return {label: entry.key, klass: entry.value}; });
			
			// Add validation buttons
			var self = this;
			d3.select(this.el).select("div.validationControls")
				.append("table")
				.append("tr")
				.selectAll("td")
				.data (buttonData)
				.enter()
				.append("td")
				.append("button")
					.attr ("class", function(d) { return "validationButton "+d.klass; })
					.text (function(d) { return d.label; })
					.on ("click", function (d) { 
						var lsm = self.model.get("lastSelectedMatch");
						if (lsm && lsm.match) {
							var randId = CLMSUI.modelUtils.getRandomSearchId (self.model.get("clmsModel"), lsm.match);
							console.log ("randId", randId);
							
							CLMSUI.validate (lsm.match.id, d.label, randId, function() { 
								lsm.match.validated = d.label; 
								self.setButtonValidationState (lsm.match);
								self.model.trigger ("matchValidationStateUpdated");
							});              
						}
					})
			;
		}
        // Only if spectrum viewer visible...
        // When crosslink selection changes, pick highest scoring filtered match of the set
        // and tell it to show the spectrum for that match
        this.listenTo (this.model, "change:selection", function (model, selection) {  
            var fMatches = CLMSUI.modelUtils.aggregateCrossLinkFilteredMatches (selection);

            if (fMatches.length === 0) {
                this.model.set ("lastSelectedMatch", {match: null, directSelection: false});
            } else {
                fMatches.sort (function(a,b) { return b.match.score - a.match.score; });
                this.model.set ("lastSelectedMatch", {match: fMatches[0].match, directSelection: false});
            }
        });
     
        this.listenTo (this.model, "change:lastSelectedMatch", function (model, selectedMatch) {
            this.triggerSpectrumViewer (selectedMatch.match, selectedMatch.directSelection);
        });
        
        this.newestSelectionShown = true;
        this.enableControls (false);
    },
    
    enableControls: function (state) {
        d3.select(this.el)
            .selectAll(".validationControls,#spectrumControls")
            .style ("background", state ? null : "#888888")
            .selectAll("*")
            .property("disabled", !state)
        ;
    },
    
    setButtonValidationState: function (match) {
        d3.select(this.el).selectAll("button.validationButton").classed("validatedState", false);
        if (match && match.validated) {
            var klass = this.validationMap[match.validated];
            if (klass) {
                d3.select(this.el).select("."+klass).classed("validatedState", true);
            }
        }
    },
    
    triggerSpectrumViewer: function (match, forceShow) {
        //console.log ("MATCH selected", match, forceShow);
        if (this.isVisible() || forceShow) {
            this.newestSelectionShown = true;
            var visible = !!match;
            if (this.isVisible() !== visible) {
                //console.log ("CHANGE VISIBILITY");
                CLMSUI.vent.trigger ("spectrumShow", visible);   
            }
            CLMSUI.vent.trigger ("individualMatchSelected", match);
            this.enableControls (match);
            if (CLMSUI.loggedIn) {
				this.setButtonValidationState (match);
			}
        } else {
            this.newestSelectionShown = false;
        }
    },
    
    relayout: function () {
        // if a new selected match has been made while the spectrum viewer was hidden,
        // load it in when the spectrum viewer is made visible
        if (!this.newestSelectionShown) {
            //console.log ("LAZY LOADING SPECTRUM");
            var selectedMatch = this.model.get("lastSelectedMatch") || {match: null};
            this.triggerSpectrumViewer (selectedMatch.match, true);
        }
        // resize the spectrum on drag
        CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
        return this;
    },
});

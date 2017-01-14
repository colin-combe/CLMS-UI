//      a view of the filter model state
//
//      Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//      js/filterViewBB.js

var CLMSUI = CLMSUI || {};

CLMSUI.FilterViewBB = Backbone.View.extend({
    tagName: "span",
    className: "filterGroup",
    events: {
        "change input.modeToggle": "modeChanged",
        "click input.filterTypeToggle": "filter",
        "input input.filterTypeText": "textFilter",
        "click input.filterSpecialToggle": "filterSpecial",
        "change input.filterSeqSep": "filterSeqSep",
    },

    initialize: function (viewOptions) {
        var defaultOptions = {
            modes: [
                {"label":"Manual", "id":"manualMode"},
                {"label":"FDR", "id":"fdrMode"},
            ],            
            toggles: [
                {"label":"Decoy", "id":"decoys", special: true},
                {"label":"Linear", "id":"linears", special: true},
                {"label":"Cross-links", "id":"crosslinks", special: true},
                {"label":"Ambig.", "id":"ambig", special: true},
                {"label":"Self", "id":"selfLinks", special: true},
            ],
            validationStatuses: [
                {"label":"A", "id":"A"},
                {"label":"B", "id":"B"},
                {"label":"C", "id":"C"},
                {"label":"?", "id":"Q"},
                {"label":"Auto", "id":"AUTO"},
                {"label":"Unval.", "id":"unval"}
            ],
            textFilters: [
                {"label":"Peptide", "id":"pepSeq", "chars":7},
                {"label":"Protein", "id":"protNames", "chars":7},
                {"label":"Charge", "id":"charge", "chars":1},
                {"label":"Run", "id":"runName","chars":5},
                {"label":"Scan", "id":"scanNumber", "chars":5}
            ],
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        var modeDivSel = mainDivSel.append("div").attr ("class", "filterControlGroup");
        //~ modeDivSel.append("span").attr("class", "sideOn").text("MODE");
        
        var modeElems = modeDivSel.selectAll("div.modeToggles")
            .data(this.options.modes, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .append ("label")
        ;
        
        modeElems.append ("span")
            .text (function(d) { return d.label; })
        ;
        
        modeElems.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", "modeToggle")
            .attr ("name", "modeSelect")
            .attr ("type", "radio")
            .property ("checked", function(d) { return self.model.get(d.id); })
        ;
        		
		
		var dataSubsetDivSel = mainDivSel.append("div").attr ("class", "filterControlGroup");
        //~ dataSubsetDivSel.append("span").attr("class", "sideOn").text("SUBSET");
       
        var subsetElems = dataSubsetDivSel.selectAll("div.subsetToggles")
            .data(this.options.toggles, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles subsetToggles")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .append ("label")
        ;
        
        subsetElems.append ("span")
            .text (function(d) { return d.label; })
        ;
        
        subsetElems.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", function(d) { return d.special ? "filterSpecialToggle" : "filterTypeToggle"; })
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return self.model.get(d.id); })
        ;
        
        
        var seqSepElem =  dataSubsetDivSel.append ("div")
            .attr("class", "numberFilters")
            .append ("label")
        ;
        
        seqSepElem.append("span")
            .text ("Min.seq.sep.")
        ;
        
        seqSepElem.append ("input")
            .attr ({id: "seqSepFilter", class: "filterSeqSep", type: "number", min: 0, max: 999})
        	.property ("value", self.model.get("seqSep"))
		;
        
		var validationDivSel = mainDivSel.append("div")
								.attr ("class", "filterControlGroup")
								.attr ("id", "validationStatusToggles");
        //~ validationDivSel.append("span").attr("class", "sideOn").html("VALIDATION");//<br>STATUS");
       
        var validationElems = validationDivSel.selectAll("div.validationToggles")
            .data(this.options.validationStatuses, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles validationToggles")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .append ("label")
        ;
        
        validationElems.append ("span")
            .text (function(d) { return d.label; })
        ;
        
        validationElems.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", function(d) { return d.special ? "filterSpecialToggle" : "filterTypeToggle"; })
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return self.model.get(d.id); })
        ;
        
		var cutoffDivSel = mainDivSel.append ("div").attr("class", "filterControlGroup");
		//~ cutoffDivSel.append("span").attr("class", "sideOn").text("CUTOFF");
       
        var sliderSection = cutoffDivSel.append ("div").attr("class", "scoreSlider");
        // Can validate template output at http://validator.w3.org/#validate_by_input+with_options
        var tpl = _.template ("<div><span>Score</span><P class='vmin cutoffLabel'>&gt;</P></div><div id='<%= eid %>'></div><div><span>&nbsp;</span><P class='cutoffLabel vmax'>&lt;</P></div>");
        sliderSection.html (tpl ({eid: self.el.id+"SliderHolder"}));
		sliderSection.style('display', (self.model.get("scores") === null) ? 'none' : null);


        cutoffDivSel.selectAll("p.cutoffLabel")
            .append("input")
            .attr({
                type: "number",
                step: 0.1,
                //min: 0,
            })
            .on ("change", function() { // "input" activates per keypress which knackers typing in anything >1 digit
                //console.log ("model", self.model);
                var val = +this.value;
                var isMinInput = d3.select(this.parentNode).classed("vmin");
                var cutoff = self.model.get("cutoff");
                var scoreExtent = self.model.scoreExtent;
                // take new values, along with score extents, sort them and discard extremes for new cutoff settings
                var newVals = [isMinInput ? val : cutoff[0], isMinInput ? cutoff[1] : val, scoreExtent[0], scoreExtent[1]]
                    .sort(function(a,b) { return a - b;})
                    .slice (1,3)
                ;
                self.model.set("cutoff", newVals);
            })
        ;
        
        var fdrElem =  mainDivSel.append ("div")
            .attr("class", "filterControlGroup")
            .attr("id", "fdrPanel")
            //~ .append ("label")
        ;
        
        var navDivSel = mainDivSel.append ("div").attr("class", "filterControlGroup");
		//~ navDivSel.append("span").attr("class", "sideOn").text("NAVIGATION");
		
		var textFilters = navDivSel.selectAll("div.textFilters")
            .data(this.options.textFilters, function(d) { return d.id; })
            .enter()
            .append("div")
            .attr("class", "textFilters")
            .append ("label")
        ;
        
        textFilters.append("span")
            .text (function(d) { return d.label; })
        ;
        
        textFilters.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", "filterTypeText")
            .attr ("type", "textbox")
            .attr ("size", function(d) { return d.chars; })
            //~ .property ("checked", function(d) { return self.model.get(d.id); })
        ;

        this.displayEventName = viewOptions.displayEventName;

        this.listenTo (this.model, "change:cutoff", function(model, val) {
            //console.log ("cutoff", val);
            mainDivSel.select(".vmin input").property("value", val[0]); // min label
            mainDivSel.select(".vmax input").property("value", val[1]); // max label
        });
        
        this.modeChanged();
    },

    filter: function (evt) {
        console.log ("this filterBB filter", evt);
        var target = evt.target;
        var id = target.id;
        console.log ("filter set", id, target.checked);
        this.model.set (id, target.checked);
    },

    textFilter: function (evt) {
        var target = evt.target;
        var id = target.id;
        console.log ("filter set", id, target.value);
        this.model.set (id, target.value);
    },

    filterSpecial: function (evt) {
        console.log ("this filterBB filterSpecial", evt);
        var target = evt.target;
        var id = target.id;
        this.model.set (id, target.checked);
    },

    sliderDecimalPlaces: 2,

    filterSeqSep: function (evt) {
        console.log ("this filterBB filterSeqSep", evt);
        var target = evt.target;
        console.log(">>seqSep", target.value);
        this.model.set("seqSep", target.value);
    },

    modeChanged: function () {
		var fdrMode = d3.select("#fdrMode").node().checked;
		if (fdrMode) {
			d3.select("#validationStatusToggles").style("display","none");
			d3.select("#fdrSelect").style("display","inline-block");
		} else {
			d3.select("#validationStatusToggles").style("display","inline-block");
			d3.select("#fdrSelect").style("display","none");
		}
		console.log("fdrMode?", fdrMode);
		this.model.set("fdrMode", fdrMode);
    },

    render: function () {
        return this;
    }
});

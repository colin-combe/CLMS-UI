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
        "click input.subsetToggleFilterToggle": "subsetToggleFilter",
        "keyup input.subsetNumberFilter": "subsetNumberFilter",
        "mouseup input.subsetNumberFilter": "subsetNumberFilter",
    },

    initialize: function (viewOptions) {
        var defaultOptions = {
            modes: [
                {"label":"Manual", "id":"manualMode"},
                {"label":"FDR", "id":"fdrMode"},
            ],
            subsetToggles: [
                {"label":"Decoy", "id":"decoys"},
                {"label":"Linear", "id":"linears"},
                {"label":"Cross-links", "id":"crosslinks"},
                {"label":"Ambig.", "id":"ambig"},
                {"label":"Self", "id":"selfLinks"},
            ],
            subsetNumberFilters: [
                {"label":"AA apart", "id":"aaApart", min: 0, max: 999},
                {"label":"Pep. length", "id":"pepLength", min: 0, max: 99},
            ],
            validationStatusToggles: [
                {"label":"A", "id":"A"},
                {"label":"B", "id":"B"},
                {"label":"C", "id":"C"},
                {"label":"?", "id":"Q"},
                {"label":"Auto", "id":"AUTO"},
                {"label":"Unval.", "id":"unval"}
            ],
            navigationFilters: [
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

        var modeDivSel = mainDivSel.append("div").attr ("class", "filterControlGroup")
									.attr ("id", "filterModeDiv");
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
        var subsetToggles = dataSubsetDivSel.selectAll("div.subsetToggles")
            .data(this.options.subsetToggles, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles subsetToggles")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .append ("label")
        ;
        subsetToggles.append ("span")
            .text (function(d) { return d.label; })
        ;
        subsetToggles.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", "subsetToggleFilterToggle")
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return self.model.get(d.id); })
        ;
		
		
        var subsetNumberFilters = dataSubsetDivSel.selectAll("div.subsetNumberFilterDiv")
            .data(this.options.subsetNumberFilters, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles subsetNumberFilterDiv")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .append ("label")
        ;
        subsetNumberFilters.append ("span")
            .text (function(d) { return d.label; })
        ;
        subsetNumberFilters.append("p").classed("cutoffLabel",true).text (">");
        subsetNumberFilters.append ("input")
            .attr ({id: function(d) { return d.id; }, class: "subsetNumberFilter", type: "number", 
						min: function(d) { return d.min; }, max: function(d) { return d.max; }})
            .property ("value", function(d) { return self.model.get(d.id); })
        ;


		var validationDivSel = mainDivSel.append("div")
								.attr ("class", "filterControlGroup")
								.attr ("id", "validationStatus");
        var validationElems = validationDivSel.selectAll("div.validationToggles")
            .data(this.options.validationStatusToggles, function(d) { return d.id; })
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
            .attr ("class", function(d) { return d.special ? "subsetToggleFilterToggle" : "filterTypeToggle"; })
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return self.model.get(d.id); })
        ;

		var cutoffDivSel = mainDivSel.append ("div")
								.attr("class", "filterControlGroup")
								.attr("id", "matchScore");
		//~ cutoffDivSel.append("span").attr("class", "sideOn").text("CUTOFF");

        var sliderSection = cutoffDivSel.append ("div").attr("class", "scoreSlider");
        // Can validate template output at http://validator.w3.org/#validate_by_input+with_options
        var tpl = _.template ("<div><span>Match score</span><P class='vmin cutoffLabel'>&gt;</P></div><div id='<%= eid %>'></div><div><span>&nbsp;</span><P class='cutoffLabel vmax'>&lt;</P></div>");
        sliderSection.html (tpl ({eid: self.el.id+"SliderHolder"}));
		sliderSection.style('display', (self.model.get("scores") === null) ? 'none' : null);
        sliderSection.selectAll("p.cutoffLabel")
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
                var cutoff = self.model.get("matchScoreCutoff");
                var scoreExtent = self.model.scoreExtent;
                // take new values, along with score extents, sort them and discard extremes for new cutoff settings
                var newVals = [isMinInput ? val : cutoff[0], isMinInput ? cutoff[1] : val, scoreExtent[0], scoreExtent[1]]
                    .sort(function(a,b) { return a - b;})
                    .slice (1,3)
                ;
                self.model.set("matchScoreCutoff", newVals);
            })
        ;

		//following may not be best practice, its here to get the placeholder divs in the right place in the filter div (the grey bar at bottom)
        mainDivSel.append ("div")
            .attr("class", "filterControlGroup")
            .attr("id", "fdrPanel")
        ;
		mainDivSel.append ("div")
            .attr("class", "filterControlGroup")
            .attr("id", "fdrSummaryPlaceholder")
            .style("display","none");
        ;

        var navDivSel = mainDivSel.append ("div")
							.attr("class", "filterControlGroup")
							.attr("id", "navFilters")
		;
		//~ navDivSel.append("span").attr("class", "sideOn").text("NAVIGATION");

		var textFilters = navDivSel.selectAll("div.textFilters")
            .data(this.options.navigationFilters, function(d) { return d.id; })
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

        this.listenTo (this.model, "change:matchScoreCutoff", function(model, val) {
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

    subsetToggleFilter: function (evt) {
        console.log ("subsetToggleFilter", evt);
        var target = evt.target;
        var id = target.id;
        if (id == "selfLinks"){
			if (target.checked) {
				d3.select("#aaApart").attr("disabled", null);
			} else {
				d3.select("#aaApart").attr("disabled", "disabled");
			}
		}
        this.model.set (id, target.checked);
    },

    sliderDecimalPlaces: 2,

    subsetNumberFilter: function (evt) {
		var target = evt.target;
        var id = target.id;
        var value = target.value;
        if (this.model.get (id) != value) {
			console.log ("subsetNumberFilter:", id, value);
			this.model.set (id, value);
		}
    },

    modeChanged: function () {
		var fdrMode = d3.select("#fdrMode").node().checked;
		if (fdrMode) {
			d3.select("#validationStatus").style("display","none");
			d3.select("#matchScore").style("display","none");
			d3.select("#navFilters").style("display","none");
			d3.select("#fdrPanel").style("display","inline-block");
		} else {
			d3.select("#validationStatus").style("display","inline-block");
			d3.select("#matchScore").style("display","inline-block");
			d3.select("#navFilters").style("display","inline-block");
			d3.select("#fdrPanel").style("display","none");
		}
		this.model.set("fdrMode", fdrMode);
    },

    render: function () {
        return this;
    }
});


CLMSUI.FDRViewBB = Backbone.View.extend  ({
    initialize: function () {
        
        var chartDiv = d3.select(this.el);
        // we don't replace the html of this.el as that ends up removing all the little re-sizing corners and the dragging bar div
        chartDiv.html ("<div class=\"fdrCalculation\"><p>Basic FDR Calculation</p><span></span></div>");
        var self = this;
        var options = [0.01, 0.05, 0.1, 0.2, 0.5/*, undefined*/];
        var labelFunc = function (d) { return d === undefined ? "Off" : d3.format("%")(d); };

        chartDiv.select("span").selectAll("label.fixed").data(options)
            .enter()
            .append("label")
            .classed ("horizontalFlow fixed", true)
                .append ("span")
                .attr ("class", "noBreak")
                .text(labelFunc)
                .append("input")
                    .attr("type", "radio")
                    .attr("value", function(d) { return d; })
                    .attr("name", "fdrPercent")
                    .property("checked", function(d) { return d === 0.05; })
                    .on ("click", function(d) {
                        d3.select(self.el).select("input[type='number']").property("value", "");
                        self.model.set("fdrThreshold", d);
                    })
        ;

        
        
        chartDiv.select("span")
            .append("label")
            .attr("class", "horizontalFlow")
                .append ("span")
                .attr ("class", "noBreak")
                .text("Other %")
                .append("input")
                    .attr("type", "number")
                    .attr("min", 0)
                    .attr("max", 100)
                    .attr("step", 1)
                    .on ("change", function() { // "input" activates per keypress which knackers typing in anything >1 digit
                        d3.select(self.el).selectAll("input[name='fdrPercent']").property("checked", false);
                        self.model.set("fdrThreshold", (+this.value) / 100);
                    })
        ;

        chartDiv.append("div").attr("class", "fdrResult");//.style("display", "none");
        return this;
    }
});

CLMSUI.FilterSummaryViewBB = Backbone.View.extend({
    events: {},

    initialize: function () {
        this.template = _.template ("Currently showing <%= total %> filtered crosslinks");
        this.listenTo (this.model, "filteringDone", this.render)
            .render()
        ;
    },

    render: function () {
        var mainDivSel = d3.select(this.el);
        var filteredCrossLinks = this.model.filteredNotDecoyNotLinearCrossLinks;//getFilteredCrossLinks();
        mainDivSel.text ((this.template ({total: filteredCrossLinks.length})) + "(" + this.model.filteredCrossLinks.length + " inc. decoys)");//sorry, to tidy
        return this;
    },
});

CLMSUI.FDRSummaryViewBB = Backbone.View.extend({
    events: {},

    initialize: function () {
        //this.template = _.template ("Currently showing <%= total %> filtered crosslinks");
		d3.select(this.el).append("p").classed("interFdrCutElem");
        d3.select(this.el).append("p").classed("intraFdrCutElem");        
        this.listenTo (this.model, "change", this.render)
            .render()
        ;
    },

    render: function () {
        var mainDivSel = d3.select(this.el);
        mainDivSel.select("interFdrCutElem").text(
			"Inter cutoff for "+ this.model.get("fdrThreshold") +" is "
			+ this.model.get("interFDRCut"));
        mainDivSel.select("intraFdrCutElem").text(
			"Inter cutoff for "+ this.model.get("fdrThreshold") +" is "
			+ this.model.get("interFDRCut"));
        return this;
    },

    
       /* function doFDR (d) {
            self.lastSetting = d;
            var result = CLMSUI.fdr (self.model.get("clmsModel").get("crossLinks"), {threshold: d});
            chartDiv.select(".fdrResult")
                //~ .style("display", "block")
                .html("")
                .selectAll("p").data(result)
                    .enter()
                    .append("p")

            ;
            //~ chartDiv.select(".fdrBoost").classed("btn-1a", true).property("disabled", false);

            // bit that communicates to rest of system
            self.model.get("filterModel")
                .set({"interFDRCut": result[0].fdr, "intraFDRCut": result[1].fdr })
            ;

            //console.log ("mm", self.model.get("filterModel"), result[0].fdr, result[1].fdr);
        } */
});

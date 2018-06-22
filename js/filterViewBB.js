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
                {"label":"Manual", "id":"manualMode", tooltip: "Filter using cross-link metadata"},
                {"label":"FDR", "id":"fdrMode", tooltip: "Filter using a False Discovery Rate cutoff"},
            ],
            subsetToggles: [
                {"label":"Linear", "id":"linears", tooltip: "Show linear peptides"},
                {"label":"Cross-links", "id":"crosslinks", tooltip: "Show cross-links"},
                {"label":"Ambig.", "id":"ambig", tooltip: "Show ambiguous cross-links"},
                {"label":"Between", "id":"betweenLinks", tooltip: "Show cross-links between different proteins"},
                {"label":"Self", "id":"selfLinks", tooltip: "Show cross-links between the same protein"},
                {"label":"Homomult.", "id":"homomultimericLinks", tooltip: "Show cross-links with overlapping linked peptides "},
            ],
            subsetNumberFilters: [
                {"label":"AA apart", "id":"aaApart", min: 0, max: 999, tooltip: "Only show cross-links separated by at least N amino acids e.g. 10"},
                {"label":"Pep. length", "id":"pepLength", min: 1, max: 99, tooltip: "Only show cross-links connecting peptides of at least N amino acids e.g. 4"},
            ],
            validationStatusToggles: [
                {"label":"A", "id":"A"},
                {"label":"B", "id":"B"},
                {"label":"C", "id":"C"},
                {"label":"?", "id":"Q"},
                {"label":"Auto", "id":"AUTO", tooltip: "Show autovalidated cross-links"},
                {"label":"Unval.", "id":"unval", tooltip: "Show unvalidated cross-links"},
                {"label":"Decoy", "id":"decoys", tooltip: "Show decoy cross-links"},
            ],
            navigationFilters: [
                {"label":"Peptide", "id":"pepSeq", "chars":7, tooltip: "Filter to cross-links involving a peptide including this AA sequence e.g. FAKR"},
                {"label":"Protein", "id":"protNames", "chars":7, tooltip: "Filter to cross-links involving a protein including this text. Separate with commas, specify both proteins with hyphens e.g. RAT3, RAT1-RAT2"},
                {"label":"Charge", "id":"charge", "chars":1, tooltip: "Filter to cross-links with this charge state e.g. 3"},
                {"label":"Run", "id":"runName","chars":5, tooltip: "Filter to cross-links with matches whose run name includes this text e.g. 07_Lumos"},
                {"label":"Scan", "id":"scanNumber", "chars":5, tooltip: "Filter to cross-links with matches with this (partial) scan number e.g. 44565"},
            ],
            navigationNumberFilters: [
                {"label":"Residue Pairs per PPI", "id":"urpPpi", min: 1, max: 99, tooltip: "Filter out protein-protein interactions with less than * supporting unique residue pairs"}
            ]
        };
        this.options = _.extend (defaultOptions, viewOptions.myOptions || {});

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
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
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
            .property ("checked", function(d) { return Boolean (self.model.get(d.id)); })
        ;


		var dataSubsetDivSel = mainDivSel.append("div").attr ("class", "filterControlGroup");
        var subsetToggles = dataSubsetDivSel.selectAll("div.subsetToggles")
            .data(this.options.subsetToggles, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles subsetToggles")
            .attr("id", function(d) { return "toggles_" + d.id; })
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
            .append ("label")
        ;
        subsetToggles.append ("span")
            .text (function(d) { return d.label; })
        ;
        subsetToggles.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", "subsetToggleFilterToggle")
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return Boolean (self.model.get(d.id)); })
        ;


        var subsetNumberFilters = dataSubsetDivSel.selectAll("div.subsetNumberFilterDiv")
            .data(this.options.subsetNumberFilters, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "toggles subsetNumberFilterDiv")
            //.attr("id", function(d) { return "toggles_" + d.id; }) // not a toggle, change id?
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
            .append ("label")
        ;
        subsetNumberFilters.append ("span")
            .text (function(d) { return d.label; })
        ;
        subsetNumberFilters.append("p").classed("cutoffLabel",true).append("span").html("&ge;");
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
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
            .append ("label")
        ;

        validationElems.append ("span")
            .text (function(d) { return d.label; })
        ;

        validationElems.append ("input")
            .attr ("id", function(d) { return d.id; })
            .attr ("class", function(d) { return d.special ? "subsetToggleFilterToggle" : "filterTypeToggle"; })
            .attr ("type", "checkbox")
            .property ("checked", function(d) { return Boolean (self.model.get(d.id)); })
        ;

		var cutoffDivSel = mainDivSel.append ("div")
								.attr("class", "filterControlGroup")
								.attr("id", "matchScore");
		      //~ cutoffDivSel.append("span").attr("class", "sideOn").text("CUTOFF");

        var sliderSection = cutoffDivSel.append ("div").attr("class", "scoreSlider");
        // Can validate template output at http://validator.w3.org/#validate_by_input+with_options
        var tpl = _.template ("<div><span>Match score</span><P class='vmin cutoffLabel'><span>&gt;</span></P></div><div id='<%= eid %>'></div><div><span>&nbsp;</span><P class='cutoffLabel vmax'><span>&lt;</span></P></div>");
        sliderSection.html (tpl ({eid: self.el.id+"SliderHolder"}));
		// sliderSection.style('display', (self.model.get("scores") === null) ? 'none' : null);
        sliderSection.selectAll("p.cutoffLabel")
            .attr ("title", function () {
                var isMinInput = d3.select(this).classed("vmin");
                return "Filter out matches with scores "+(isMinInput ? "less than": "greater than")+" X e.g. "+(isMinInput ? "8.0": "20.0");
            })
            .append("input")
            .attr({
                type: "number",
                step: 0.1,
                //min: 0,
            })
			.property ("value", function () {
				var isMinInput = d3.select(this.parentNode).classed("vmin");
				var cutoff = self.model.get("matchScoreCutoff");
				var val = cutoff [isMinInput ? 0 : 1];
				return val !== undefined ? val : "";
			})
            .on ("change", function() { // "input" activates per keypress which knackers typing in anything >1 digit
                //console.log ("model", self.model);
                var val = +this.value;
                var isMinInput = d3.select(this.parentNode).classed("vmin");
                var cutoff = self.model.get("matchScoreCutoff");
                var scoreExtent = self.model.scoreExtent;
                // take new values, along with score extents, sort them and discard extremes for new cutoff settings
                var newVals = [isMinInput ? val : (cutoff[0] !== undefined ? cutoff[0] : scoreExtent[0]),
							   isMinInput ? (cutoff[1] !== undefined ? cutoff[1] : scoreExtent[1]) : val,
							   scoreExtent[0], scoreExtent[1]]
					.filter (function (v) { return v !== undefined; })
                    .sort(function(a,b) { return a - b;})
				;
				//console.log ("newVals", newVals);
				newVals = newVals.slice ((newVals.length / 2) - 1, (newVals.length / 2) + 1);

                self.model.set("matchScoreCutoff", newVals);
            })
        ;

		//following may not be best practice, its here to get the placeholder divs in the right place in the filter div (the grey bar at bottom)
        mainDivSel.append ("div")
            .attr("class", "filterControlGroup")
            .attr("id", "fdrPanel")
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
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
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
			.property ("value", function(d) { return self.model.get(d.id); })
        ;

        var navNumberDivSel = mainDivSel.append ("div")
            .attr("class", "filterControlGroup")
            .attr("id", "navNumberFilters")
		;
        var navigationNumberFilters = navNumberDivSel.selectAll("div.navNumberFilterDiv")
            .data(this.options.navigationNumberFilters, function(d) { return d.id; })
            .enter()
            .append ("div")
            .attr ("class", "navNumberFilterDiv")
            .attr ("title", function(d) { return d.tooltip ? d.tooltip : undefined; })
            .append ("label")
        ;
        navigationNumberFilters.append ("span")
            .style("display", "block")
            .text (function(d) { return d.label; })
        ;
        navigationNumberFilters.append("p").classed("cutoffLabel",true).append("span").html ("&ge;");
        navigationNumberFilters.append ("input")
            .attr ({id: function(d) { return d.id; }, class: "subsetNumberFilter", type: "number",
                        min: function(d) { return d.min; }, max: function(d) { return d.max; }})
            .property ("value", function(d) { return self.model.get(d.id); })
        ;



        // hide toggle options if no point in them being there (i.e. no between / self link toggle if only 1 protein)
        if (this.options.hide) {
            var entries = d3.entries(this.options.hide);
            var hideEntries = entries.filter (function (entry) { return entry.value; });
            var hideEntrySet = d3.set (_.pluck (hideEntries, "key"));
            mainDivSel.selectAll(".subsetToggles,.validationToggles,.textFilters")
                .filter (function(d) { return hideEntrySet.has (d.id); })
                .style ("display", "none")
            ;
        }

        this.displayEventName = viewOptions.displayEventName;

        this.listenTo (this.model, "change:matchScoreCutoff", function(model, val) {
            //console.log ("cutoff", val);
            mainDivSel.select(".vmin input").property("value", val[0]); // min label
            mainDivSel.select(".vmax input").property("value", val[1]); // max label
        });
        //todo: extend to update all attributes
        this.listenTo (this.model, "change:unval", function  (model, val) {
			mainDivSel.select("#unval").property("checked", Boolean (val));
		});

        mainDivSel.selectAll(".filterControlGroup").classed("noBreak", true);

        this.modeChanged();
    },

    filter: function (evt) {
        //console.log ("this filterBB filter", evt);
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
			d3.select("#aaApart").attr("disabled", target.checked ? null : "disabled");
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
        d3.selectAll("#validationStatus,#matchScore").style("display", fdrMode ? "none" : "inline-block");
        d3.selectAll("#fdrPanel").style("display", fdrMode ? "inline-block" : "none");
		this.model.set ("fdrMode", fdrMode);
    },

    render: function () {
        return this;
    }
});


CLMSUI.FDRViewBB = Backbone.View.extend  ({
    initialize: function () {

        var chartDiv = d3.select(this.el);
        //var tpl = _.template (("<div class=\"fdrCalculation\"><p>Basic link-level FDR calculation</p><span></span></div>");
        chartDiv.html ("<div class=\"fdrCalculation\"><p>Basic link-level FDR calculation</p><span></span></div>");
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
                    .property("checked", function(d) { return d === self.model.get("fdrThreshold"); })
                    .on ("click", function(d) {
                        d3.select(self.el).select("input[type='number']").property("value", d * 100 /*""*/);
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
					.property ("value", self.model.get("fdrThreshold") * 100)
                    .on ("change", function() { // "input" activates per keypress which knackers typing in anything >1 digit
                        d3.select(self.el).selectAll("input[name='fdrPercent']").property("checked", false);
                        self.model.set("fdrThreshold", (+this.value) / 100);
                    })
        ;

        return this;
    }
});

CLMSUI.FilterSummaryViewBB = Backbone.View.extend({
    events: {},

    initialize: function () {
        var targetTemplateString = "Post-Filter: <strong><%= targets %></strong> of <%= possible %> Cross-links";
        this.targetTemplate = _.template (targetTemplateString);
        this.allTemplate = _.template (targetTemplateString+" ( + <%= decoysTD %> TD; <%= decoysDD %> DD Decoys)");

        this.listenTo (this.model, "filteringDone", this.render)
            .render()
        ;
    },

    render: function () {
        var commaFormat = d3.format(",");
        var model = this.model;
        var decoysPresent = model.get("clmsModel").get("decoysPresent");
        var variables = {
            targets: commaFormat (model.getFilteredCrossLinks().length),
			possible: commaFormat (model.get("clmsModel").get("crossLinks").size)
        };
        if (decoysPresent) {
            variables.decoysTD = commaFormat (model.getFilteredCrossLinks("decoysTD").length);
            variables.decoysDD = commaFormat (model.getFilteredCrossLinks("decoysDD").length);
        }
        d3.select(this.el).html ((decoysPresent ? this.allTemplate : this.targetTemplate) (variables));
        return this;
    },
});

CLMSUI.FDRSummaryViewBB = Backbone.View.extend({
    events: {},

    initialize: function () {
        var fdrTypes = ["interFdrCut", "intraFdrCut"];
        d3.select(this.el).selectAll("p").data(fdrTypes)
            .enter()
            .append("p")
            .attr("class", function(d) { return d+"Elem"; })
        ;

        this.pctFormat = d3.format("%");

        this.listenTo (this.model, "filteringDone", this.render)
            .render()
        ;
    },

    render: function () {
        var fdrTypes = {"interFdrCut": "Between", "intraFdrCut": "Within"};

        var filterModel = this.model.get("filterModel");
        var threshold = filterModel.get("fdrThreshold");
        var fdrMode = filterModel.get("fdrMode");

        var clmsModel = this.model.get("clmsModel");
        var singleRealProtein = clmsModel.realProteinCount < 2;
        var decoysPresent = clmsModel.get("decoysPresent");

        var self = this;

        d3.select(this.el).selectAll("p")
            .text (function (d, i) {
                if (fdrMode) {
                    var cut = filterModel.get(d);
                    return "• "+fdrTypes[d]+" score cutoff for "+self.pctFormat(threshold)+" is "+(cut ? cut.toFixed(2) : cut);
                } else {
                    if (i === 0 && decoysPresent) {
                        var roughFDR = (self.model.getFilteredCrossLinks("decoysTD").length - self.model.getFilteredCrossLinks("decoysDD").length) / (self.model.getFilteredCrossLinks().length || 1);
                        return "• Rough FDR Equivalent = "+self.pctFormat(roughFDR);
                    }
                    return "";
                }
            })
            // Hide between protein score if only 1 real protein (will always be an undefined score)
            .style ("display", function(d) {
                return decoysPresent && d === "interFdrCut" && singleRealProtein ? "none" : null;
            })
        ;

        return this;
    },
});

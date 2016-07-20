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
        "click input.filterTypeToggle": "filter",
        "input input.filterTypeText": "textFilter",
        "click input.filterSpecialToggle": "filterSpecial"
    },

    initialize: function (viewOptions) {
        var defaultOptions = {
            toggles: [
                {"label":"A", "id":"A"},
                {"label":"B", "id":"B"},
                {"label":"C", "id":"C"},
                {"label":"?", "id":"Q"},
                {"label":"Auto", "id":"AUTO"},
                {"label":"Unval.", "id":"unval"}
            ],
            textFilters: [
                {"label":"  Pep.:", "id":"pepSeq", "chars":7},
                {"label":"Prot.:", "id":"protNames", "chars":7},
                {"label":"Charge:", "id":"charge", "chars":1},
                {"label":"Run:", "id":"runName","chars":5},
                {"label":"Scan:", "id":"scanNumber", "chars":5}
            ],
            toggleSpecials: [
                {"label":"Decoys", "id":"decoys"},
                {"label":"Linears", "id":"linears"},
                {"label":"Ambig.", "id":"ambig"},
                {"label":"Self links", "id":"selfLinks"}
            ]
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        mainDivSel.append("span").attr("class", "sideOn").text("Filters");

        mainDivSel.selectAll("label.toggles")
            .data(this.options.toggleSpecials, function(d) { return d.id; })
            .enter()
            .append ("label")
                .attr("class", "toggles")
                .text (function(d) { return d.label; })
                .append ("input")
                    .attr ("id", function(d) { return d.id; })
                    .attr ("class", "filterSpecialToggle")
                    .attr ("type", "checkbox")
                    .property ("checked", function(d) { return self.model.get(d.id); })
        ;

        var sliderSection = mainDivSel.append ("div").attr("class", "scoreSlider");
        // Can validate template output at http://validator.w3.org/#validate_by_input+with_options
        var tpl = _.template ("<P>Score:</P><P class='vmin cutoffLabel'>&gt;</P><div id='<%= eid %>'></div><P class='cutoffLabel vmax'>&lt;</P>");
        sliderSection.html (tpl ({eid: self.el.id+"SliderHolder"}));

        sliderSection.style('display', (self.model.get("scores") === null) ? 'none' : 'inline-block');

        this.listenTo (this.model, "change:cutoff", function(model, val) {
            var min = CLMSUI.utils.dpNumber (val[0], this.sliderDecimalPlaces, Math.floor);
            mainDivSel.select(".cutoffLabel.vmin").html("&gt;"+min); // min label

            var max = CLMSUI.utils.dpNumber (val[1], this.sliderDecimalPlaces, Math.ceil);
            mainDivSel.select(".cutoffLabel.vmax").html("&lt;"+max); // max label
        });

        mainDivSel.selectAll("label")
            .data(this.options.toggles, function(d) { return d.id; })
            .enter()
            .append ("label")
                .text (function(d) { return d.label; })
                .append ("input")
                    .attr ("id", function(d) { return d.id; })
                    .attr ("class", "filterTypeToggle")
                    .attr ("type", "checkbox")
                    .property ("checked", function(d) { return self.model.get(d.id); })
        ;

        mainDivSel.selectAll("label.textFilters")
            .data(this.options.textFilters, function(d) { return d.id; })
            .enter()
            .append ("label")
            .attr("class", "textFilters")
                .text (function(d) { return d.label; })
                .append ("input")
                    .attr ("id", function(d) { return d.id; })
                    .attr ("class", "filterTypeText")
                    .attr ("type", "textbox")
                    .attr ("size", function(d) { return d.chars; });
                    //~ .property ("checked", function(d) { return self.model.get(d.id); })
        ;

        mainDivSel.selectAll("p.cutoffLabel")
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

        // onclick="//xlv.showSelfLinks(document.getElementById('selfLinks').checked)"
        // onclick="//xlv.showAmbig(document.getElementById('ambig').checked)"

        sliderSection.style('display', (self.model.get("scores") === null) ? 'none' : 'inline-block');

        this.displayEventName = viewOptions.displayEventName;

        this.listenTo (this.model, "change:cutoff", function(model, val) {
            //console.log ("cutoff", val);
            mainDivSel.select(".vmin input").property("value", val[0]); // min label
            mainDivSel.select(".vmax input").property("value", val[1]); // max label
        });
        
        this.listenTo (this.model, "change:interFDRCut change:intraFDRCut", function (model) {
            var hide = (model.get("intraFDRCut") !== undefined) || (model.get("interFDRCut") !== undefined);
            d3.select(this.el)
                .style("opacity", hide ? 0.2 : null)
                .style("pointer-events", hide ? "none" : null)
            ;    
        });
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

    render: function () {
        return this;
    },

    // removes view
    // not really needed unless we want to do something extra on top of the prototype remove function
    remove: function () {
        // this line destroys the containing backbone view and it's events
        Backbone.View.prototype.remove.call(this);
    }

});

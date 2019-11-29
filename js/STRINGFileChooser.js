//		STRING Loader Widget
//
//		Martin Graham
//
//		js/STRINGFileChooser.js

var CLMSUI = CLMSUI || {};

CLMSUI.STRINGFileChooserBB = CLMSUI.utils.BaseFrameView.extend({

    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            "keyup .inputTaxonID": "enteringTaxonID",
        });
    },

    initialize: function(viewOptions) {
        CLMSUI.STRINGFileChooserBB.__super__.initialize.apply(this, arguments);

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);
        mainDivSel.classed ("metaLoadPanel", true);
        var self = this;

        var wrapperPanel = mainDivSel.append("div").attr("class", "panelInner");

        var box = wrapperPanel.append("div").attr("class", "columnbar");

        box.append("p").attr("class", "smallHeading").text("NCBI Taxon ID");

        var common = [
            {name: "No Selection", value: "-"},
            {name: "Human", value: 9606},
            {name: "E. Coli", value: 511145},
        ];

        box.append("label")
            .text ("Choose")
            .attr ("class", "btn")
            .append("select").attr("class", "selectTaxonID")
                .on ("change", function () {
                    var optionSelected = $("option:selected", this);
                    var valueSelected = this.value;
                    d3.select(self.el).select(".inputTaxonID").property ("value", valueSelected);
                    self.enteringTaxonID({keyCode: 13});
                })
                .selectAll("option")
                .data (common)
                .enter()
                .append("option")
                .attr ("value", function (d) { return d.value; })
                .text (function(d) { return d.name + " (" + d.value + ")"; })
        ;


        var taxonSpan = box.append("span")
            .attr("class", "btn sectionDivider2 nopadLeft")
            .text("or Enter NCBI Taxon ID")
        ;

        taxonSpan.append("input")
            .attr({
                type: "text",
                class: "inputTaxonID",
                maxlength: 16,
                pattern: CLMSUI.utils.commonRegexes.digitsOnly,
                size: 16,
                title: "Enter NCBI Taxon ID here",
                //placeholder: "eg 1AO6"
            })
            .property("required", true)
        ;

        taxonSpan.append("span").attr("class", "promptEnter").text("& Press Enter");

        wrapperPanel.append("p").attr("class", "smallHeading").text("Load Results");
        wrapperPanel.append("div").attr("class", "messagebar").html("&nbsp;"); //.style("display", "none");

        d3.select(this.el).selectAll(".smallHeading").classed("smallHeadingBar", true);


        function sanitise(str) {
            return str.replace(/[^a-z0-9 ,.?!]/ig, '');
        }


        this.listenTo (this.model, "3dsync", function(newSequences) {
            var count = _.isEmpty(newSequences) ? 0 : newSequences.length;
            var success = count > 0;
            this.setCompletedEffect();
            var nameArr = _.pluck(newSequences, "name");
            // list pdb's these sequences derive from
            //console.log ("seq", newSequences);
            var pdbString = nameArr ?
                d3.set (nameArr.map(function(name) { return name.substr(0, _./*last*/indexOf (name, ":")); })).values().join(", ") : "?"
            ;

            var msg = newSequences.failureReason ? "" : "Completed Loading " + sanitise(pdbString) + ".<br>";
            msg += success ? "✓ Success! " + count + " sequence" + (count > 1 ? "s" : "") + " mapped between this search and the PDB file." :
                sanitise((newSequences.failureReason || "No sequence matches found between this search and the PDB file") +
                    ". Please check the PDB file or code is correct.");
            if (success) {
                this.model.set("pdbCode", this.loadRoute === "pdb" ? sanitise(pdbString) : undefined);
            }
            this.setStatusText(msg, success);
        });

        // Pre-load pdb if requested
        if (viewOptions.initPDBs) {
            this.setVisible (true);
            d3.select(this.el).select(".inputPDBCode").property("value", viewOptions.initPDBs);
            this.loadPDBCode();
        }
    },

    setWaitingEffect: function() {
        this.setStatusText("Please Wait...");
        d3.select(this.el).selectAll(".columnbar, .fakeButton").property("disabled", true).attr("disabled", true);
        d3.select(this.el).selectAll(".btn").property("disabled", true);
    },

    setCompletedEffect: function() {
        d3.select(this.el).selectAll(".columnbar, .fakeButton").property("disabled", false).attr("disabled", null);
        d3.select(this.el).selectAll(".btn").property("disabled", false);
    },

    setStatusText: function(msg, success) {
        var mbar = d3.select(this.el).select(".messagebar"); //.style("display", null);
        var t = mbar.html(msg);
        if (success !== undefined) {
            t = t.transition().delay(0).duration(1000).style("color", (success === false ? "red" : (success ? "blue" : null)));
            t.transition().duration(5000).style("color", "#091d42");
        } else {
            t.style("color", "#091d42");
        }
    },

    enteringTaxonID: function(evt) {
        var valid = this.isTaxaIDValid();
        if (valid && evt.keyCode === 13) { // if return key pressed do same as pressing 'Enter' button
            this.loadSTRINGData();
        }
    },

    loadSTRINGData: function() {
        var taxonID = d3.select(this.el).select(".inputTaxonID").property("value");

        this.setWaitingEffect();
        var self = this;
        var callback = function (csv) {
            self.setCompletedEffect ();
        };
        CLMSUI.STRINGUtils.loadStringDataFromModel (this.model.get("clmsModel"), taxonID, callback);
    },

    isTaxaIDValid: function() {
        var elem = d3.select(this.el).select(".inputTaxonID");
        return elem.node().checkValidity();
    },

    identifier: "STRING Data Loader",
});

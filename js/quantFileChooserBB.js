//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.QuantFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({

        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if (_.isFunction (parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
                "click .pdbWindowButton": "launchExternalQuantWindow",
                "change .selectQuantButton": "selectQuantFile",
            });
        },

        initialize: function (viewOptions) {
            CLMSUI.QuantFileChooserBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {};
            this.options = _.extend (defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var wrapperPanel = mainDivSel.append("div")
                .attr ("class", "panelInner")
            ;
            
            var toolbar = wrapperPanel.append("div").attr("class", "nglToolbar");
            
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    //.attr("class", "noBreak")
                    .text("Select Quantification CSV File")
                    .append("input")
                        .attr({type: "file", accept: ".csv", class: "selectQuantButton"})
            ;
            
            wrapperPanel.append("div").attr("class", "quantMessagebar");
            
            // populate 3D network viewer if hard-coded pdb id present
            
            this.listenTo (this.model, "csvLoaded", function (sequences) {
                var count = sequences && sequences.length ? sequences.length : 0;
                var msg = count ? count+" sequence"+(count > 1 ? "s": "")+" mapped between this search and the loaded pdb file."
                    : "No sequence matches found between this search and the loaded pdb file. Please check the pdb file or code is correct.";
                this.setStatusText(msg);    
            });
        },
        
        setStatusText : function (msg) {
            d3.select(this.el).select(".nglMessagebar").text(msg);    
        },
        
        selectQuantFile: function (evt) {
            var self = this;
            var fileObj = evt.target.files[0];
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            this.setStatusText ("Please Wait...");
            CLMSUI.modelUtils.loadUserFile (fileObj, function (quantFileContents) {
                var data = d3.csv.parse (quantFileContents, function (d) {
                    var linkID = d.linkID;
                    console.log ("d", d);
                    var crossLinkEntry = crossLinks.get(linkID);
                    if (crossLinkEntry) {
                        crossLinkEntry.meta = crossLinkEntry.meta || {};
                        var meta = crossLinkEntry.meta;
                        var keys = d3.keys(d);
                        keys.forEach (function (key) {
                            meta[key] = d[key];
                        });
                        console.log ("cle", crossLinkEntry);
                    }
                });
                self.model.trigger ("linkMetadataUpdated");
            });    
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "Quantification File Chooser",
    });

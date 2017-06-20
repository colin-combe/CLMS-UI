//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.LinkMetaDataFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({

        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if (_.isFunction (parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
                "change .selectMetaDataFileButton": "selectMetaDataFile",
            });
        },

        initialize: function (viewOptions) {
            CLMSUI.LinkMetaDataFileChooserBB.__super__.initialize.apply (this, arguments);
            
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
                    .text("Select Link MetaData CSV File")
                    .append("input")
                        .attr({type: "file", accept: ".csv", class: "selectMetaDataFileButton"})
            ;
            
            wrapperPanel.append("div").attr("class", "messagebar");
            
            var self = this;
            this.listenTo (CLMSUI.vent, "linkMetadataUpdated", function (columns) {
                self.setStatusText (columns.length +" Link Attributes Parsed"); 
            });
        },
        
        setStatusText : function (msg) {
            d3.select(this.el).select(".messagebar").text(msg);    
        },
        
        selectMetaDataFile: function (evt) {
            var self = this;
            var fileObj = evt.target.files[0];
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            this.setStatusText ("Please Wait...");
            CLMSUI.modelUtils.loadUserFile (fileObj, function (metaDataFileContents) {
                var first = true;
                var columns = [];
                d3.csv.parse (metaDataFileContents, function (d) {
                    var linkID = d.linkID || d.LinkID;
                    var crossLinkEntry = crossLinks.get(linkID);
                    if (crossLinkEntry) {
                        crossLinkEntry.meta = crossLinkEntry.meta || {};
                        var meta = crossLinkEntry.meta;
                        var keys = d3.keys(d);
                        keys.forEach (function (key) {
                            if (d[key]) {
                                meta[key] = d[key];
                            }
                        });
                        if (first) {
                            columns = d3.set(keys);
                            columns.remove("linkID");
                            columns.remove("LinkID")
                            columns = columns.values();
                            first = false;
                        }
                        console.log ("cle", crossLinkEntry);
                    }
                });
                if (columns && columns.length > 0) {
                    CLMSUI.vent.trigger ("linkMetadataUpdated", columns, crossLinks);
                }
            });    
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "Link MetaData File Chooser",
    });

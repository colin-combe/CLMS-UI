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
            
            var toolbar = wrapperPanel.append("div").attr("class", "toolbar");
            
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
                self.setStatusText (columns && columns.length ? columns.length +" Link Attributes Parsed" : "No Columns Successfully Parsed"); 
            });
        },
        
        setStatusText : function (msg) {
            d3.select(this.el).select(".messagebar").text(msg);    
        },
        
        selectMetaDataFile: function (evt) {
            var fileObj = evt.target.files[0];
            var clmsModel = this.model.get("clmsModel");
            this.setStatusText ("Please Wait...");
            CLMSUI.modelUtils.loadUserFile (fileObj, function (fileContents) {
                CLMSUI.modelUtils.updateLinkMetadata (fileContents, clmsModel);
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

//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.ProteinMetaDataFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({

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
            CLMSUI.ProteinMetaDataFileChooserBB.__super__.initialize.apply (this, arguments);
            
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
                    .text("Select Protein MetaData CSV File")
                    .append("input")
                        .attr({type: "file", accept: ".csv", class: "selectMetaDataFileButton"})
            ;
            
            wrapperPanel.append("div").attr("class", "messagebar");
            
            var self = this;
            this.listenTo (CLMSUI.vent, "proteinMetadataUpdated", function (columns) {
                self.setStatusText ("File "+this.lastFileName+":<br>"+(columns && columns.length ? columns.length +" Protein MetaData Attributes Parsed" : "No Columns Successfully Parsed")); 
            });
        },
        
        setStatusText : function (msg) {
            d3.select(this.el).select(".messagebar").html(msg);    
        },
        
        selectMetaDataFile: function (evt) {
            var fileObj = evt.target.files[0];
            var clmsModel = this.model.get("clmsModel");
            this.setStatusText ("Please Wait...");
            this.lastFileName = fileObj.name;
            CLMSUI.modelUtils.loadUserFile (fileObj, function (fileContents) {
                CLMSUI.modelUtils.updateProteinMetadata (fileContents, clmsModel);
            });    
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "Protein MetaData File Chooser",
    });

//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.CSVFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({

        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if (_.isFunction (parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
              //  "click .pdbWindowButton": "launchExternalPDBWindow",
                "change .selectCsvButton": "selectCsvFile",
              //  "keyup .inputPDBCode": "usePDBCode",
            });
        },

        initialize: function (viewOptions) {
            CLMSUI.PDBFileChooserBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
            };
            this.options = _.extend (defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var wrapperPanel = mainDivSel.append("div")
                .attr ("class", "panelInner")
            ;
            
            var toolbar = wrapperPanel.append("div").attr("class", "csvToolbar");
            
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    //.attr("class", "noBreak")
                    .text("Select Local CSV File")
                    .append("input")
                        .attr({type: "file", accept: ".txt,.csv", class: "selectCsvButton"})
            ;
            toolbar.append("label")
                .attr("class", "csvFileSelected")
                .text("No CSV file selected")
            ;
             
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    //.attr("class", "noBreak")
                    .text("Select Local FASTA File")
                    .append("input")
                        .attr({type: "file", accept: ".fasta", class: "selectFastaButton"})
            ;
            toolbar.append("label")
                .attr("class", "csvFileSelected")
                .text("No CSV file selected")
            ;
             
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a")
                .append("span")
                    //.attr("class", "noBreak")
                    .text("Upload")
                    .append("btn")
                        .attr({class: "uploadButton"})
                        .property("disabled")
            ;
            
        },

        
        selectCsvFile: function (evt) {
            var self = this;
            var fileObj = evt.target.files[0];
            CLMSUI.modelUtils.loadUserFile (fileObj, function (pdbFileContents) {
                var blob = new Blob ([pdbFileContents], {type : 'application/text'});
                var fileExtension = fileObj.name.substr (fileObj.name.lastIndexOf('.') + 1);
                //self.repopulate ({pdbFileContents: blob, ext: fileExtension, name: fileObj.name});
            });    
        },
        
        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "CSV File Chooser",
    });

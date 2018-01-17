//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};

	CLMSUI.AbstractMetaDataFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({
		
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
            CLMSUI.AbstractMetaDataFileChooserBB.__super__.initialize.apply (this, arguments);

			var self = this;
			
            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var wrapperPanel = mainDivSel.append("div")
                .attr ("class", "panelInner")
            ;
            
            var toolbar = wrapperPanel.append("div").attr("class", "toolbar");
            
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    .text(self.options.buttonText)
                    .append("input")
                        .attr({type: "file", accept: ".csv", class: "selectMetaDataFileButton"})
            ;
            
            wrapperPanel.append("div").attr("class", "messagebar").style("display", "none");
			
			var formatPanel = wrapperPanel.append("div").attr("class", "expectedFormatPanel");
			/*
			formatPanel.append("p").text("Expected CSV Format:");
			formatPanel.selectAll("p.expFormat").data(this.options.expectedFormat)
				.enter()
				.append("p")
				.attr("class", "expFormat")
				.text (function(d) { return d; })
			;
			*/
			
			var sectionData = [
				{
					id: "ExpectedFormat",
					header: "Expected CSV Format",
					rows: this.options.expectedFormat
				},
			];

			var headerFunc = function(d) { return d.header; };
			var rowFilterFunc = function(d) { 
				console.log ("RFF", d, d3.entries(d.rows));
				return d3.entries(d.rows);
				//return d3.entries(d);
			};
			var cellFunc = function (d) {
				d3.select(this).text (d.value);
			};

			CLMSUI.utils.sectionTable.call (this, formatPanel, sectionData, mainDivSel.attr("id"), ["Row Type", "Format"], headerFunc, rowFilterFunc, cellFunc);
			
			  
            this.listenTo (CLMSUI.vent, self.options.loadedEventName, function (columns) {
                self.setStatusText ("File "+this.lastFileName+":<br>"+(columns && columns.length ? columns.length +" "+this.options.parseMsg : "No Columns Successfully Parsed")); 
            });
        },
        
        setStatusText : function (msg) {
            d3.select(this.el).select(".messagebar").style("display", null).html(msg);    
        },
        
        selectMetaDataFile: function (evt) {
            var fileObj = evt.target.files[0];
            this.setStatusText ("Please Wait...");
            this.lastFileName = fileObj.name;
			var onLoadFunc = this.onLoadFunction.bind (this);
            CLMSUI.modelUtils.loadUserFile (fileObj, onLoadFunc);    
        },
        
        identifier: "An Abstract MetaData File Chooser",
	});

	CLMSUI.ProteinMetaDataFileChooserBB = CLMSUI.AbstractMetaDataFileChooserBB.extend ({

        initialize: function (viewOptions) {
			var myDefaults = {
				buttonText: "Select Protein MetaData CSV File",
				loadedEventName: "proteinMetadataUpdated",
				parseMsg: "Protein MetaData Attributes Parsed",
				expectedFormat: {
					Headers: "ProteinID,<MetaData1 Name>*,<MetaData2 Name> etc",
					Data: "<ProteinID>,<number or string><number or string>",
					Example: "2000171,My Protein,0.79 etc",
					Notes: "*If a metadata column name is 'Name' it will change displayed protein names"
				}
			};
			viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
            CLMSUI.ProteinMetaDataFileChooserBB.__super__.initialize.apply (this, arguments);
        },
		
		onLoadFunction: function (fileContents) {
			var clmsModel = this.model.get("clmsModel");
			CLMSUI.modelUtils.updateProteinMetadata (fileContents, clmsModel);
		},
        
        identifier: "Protein MetaData File Chooser",
    });


	CLMSUI.LinkMetaDataFileChooserBB = CLMSUI.AbstractMetaDataFileChooserBB.extend ({

        initialize: function (viewOptions) {
			var myDefaults = {
				buttonText: "Select Cross-Link MetaData CSV File",
				loadedEventName: "linkMetadataUpdated",
				parseMsg: "Cross-Link MetaData Attributes Parsed",
				expectedFormat: [
					"Headers: LinkID, or all of Protein 1,SeqPos 1,Protein 2,SeqPos 2, then <MetaData1 Name>,<MetaData2 Name> etc",
					"Rows: <ProteinID>_<SeqPos1>-<ProteinID>_<SeqPos2>, or all of <Accession or Name or ProteinID>,<SeqPos1>,<Accession or Name or ProteinID>,<SeqPos2>, then <number or #color> etc",
					"Example Row: 2000171_107-2000171_466, or all of P02768-A,107,sp|P02768-A|ALBU_HUMAN,466, then 57.07,#FF8800 etc"	
				]
			};
			viewOptions.myOptions = _.extend (myDefaults, viewOptions.myOptions);
            CLMSUI.LinkMetaDataFileChooserBB.__super__.initialize.apply (this, arguments);
        },
		
		onLoadFunction: function (fileContents) {
			var clmsModel = this.model.get("clmsModel");
			CLMSUI.modelUtils.updateLinkMetadata (fileContents, clmsModel);
		},
        
        identifier: "Cross-Link MetaData File Chooser",
    });

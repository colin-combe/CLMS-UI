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
                "change .selectCSVButton": "selectCsvFile",
                "change .selectFASTAButton": "selectFastaFile",
                "click .uploadButton": "uploadFiles",
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
            
           // toolbar.append("span").html("If you do not provide a FASTA file then your protein IDs <br> must be currently valid UniProt accession numbers.");
            toolbar.append("span").html("Your protein IDs must be currently valid UniProt accession numbers.");
            
            var fileButtons = ["CSV"];//, "FASTA"];
            for (var b = 0; b < fileButtons.length; b ++){
				var fileType = fileButtons[b];
	            var csvDivSel = toolbar.append("div");
            
				
                csvDivSel.append("span")
                    .text(fileType + ":")
                    .append("input")
                        .attr({type: "file", accept: "." + fileType, class: "select" +  fileType + "Button"})
				;
							
			}

            toolbar.append("div").append("label")
                .attr("class", "btn btn-1 btn-1a")
                .append("span")
                .attr("class", "uploadButton")
                .text("Upload")
                .attr({class: "uploadButton"})
            ;
            
        },

        selectCsvFile: function (evt) {
            this.csvFileObj = evt.target.files[0];
   
        },
                     
        selectFastaFile: function (evt) {
            this.fastaFileObj = evt.target.files[0];
        },
                
        uploadFiles: function (evt) {
			if (!this.csvFileObj) {
				alert("no CSV file selected");
			}
			else {
				var fileInfo = {name: this.csvFileObj.name,
					size: this.csvFileObj.size,
					modified: this.csvFileObj.lastModifiedDate.toString(),
					//path: this.csvFileObj.webkitRelativePath,
				};
				CLMSUI.modelUtils.loadUserFile (this.csvFileObj, function (csvFileContents) {
					//todo: if no fasta file check  all protein ids  valid uniprot accession
					if (this.fastaFileObj) {
						CLMSUI.modelUtils.loadUserFile (this.fastaFileObj, function (fastaFileContents) {
							CLMSUI.compositeModelInst.get("clmsModel").parseCSV(csvFileContents, this.csvFileObj, fastaFileContents);
							this.csvFileObj = null;
							//~ this.fastaFileObj = null;							
						});
					} else {
						CLMSUI.compositeModelInst.get("clmsModel").parseCSV(csvFileContents, fileInfo);
						this.csvFileObj = null;
						//~ this.fastaFileObj = null;
					} 	
				});
				
				d3.select("#clmsErrorBox").style("display", "none");

			}
            
        },
        
        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "CSV File Chooser",
    });

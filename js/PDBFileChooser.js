//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.PDBFileChooserBB = CLMSUI.utils.BaseFrameView.extend ({

        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if (_.isFunction (parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
                "click .pdbWindowButton": "launchExternalPDBWindow",
                "change .selectPdbButton": "selectPDBFile",
                "keyup .inputPDBCode": "usePDBCode",
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
            
            var toolbar = wrapperPanel.append("div").attr("class", "toolbar");
            
            toolbar.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    //.attr("class", "noBreak")
                    .text("Select Local PDB File")
                    .append("input")
                        .attr({type: "file", accept: ".txt,.cif,.pdb", class: "selectPdbButton"})
            ;
            
            toolbar.append("span")
                .attr("class", "btn")
                .text("or Enter 4-character PDB Code")
                .append("input")
                    .attr({
                        type: "text", class: "inputPDBCode", maxlength: 4,
                        pattern: CLMSUI.utils.commonRegexes.pdbPattern, size: 4, title: "Four letter alphanumeric PDB code"
                    })
                    .property ("required", true)
            ;
            
            var pushButtonData = [
                {klass: "pdbWindowButton", label: "Show Possible PDBs @ RCSB.Org"},
            ];
            
            toolbar.selectAll("button").data(pushButtonData)
                .enter()
                .append("button")
                .attr("class", function(d) { return "btn btn-1 btn-1a "+d.klass; })
                .text (function(d) { return d.label; })
            ;
            
            
            wrapperPanel.append("div").attr("class", "messagebar");
            
            this.stage = new NGL.Stage ("ngl", {/*fogNear: 20, fogFar: 100,*/ backgroundColor: "white", tooltip: false});
            console.log ("STAGE", this.stage);
            // populate 3D network viewer if hard-coded pdb id present
            
            this.listenTo (this.model, "3dsync", function (sequences) {
                var count = sequences && sequences.length ? sequences.length : 0;
                var success = count > 0;
                var msg = success ? count+" sequence"+(count > 1 ? "s": "")+" mapped between this search and the loaded pdb file."
                    : sequences.failureReason || "No sequence matches found between this search and the loaded pdb file. Please check the pdb file or code is correct.";
                this.setStatusText (msg, success);    
            });
        },
        
        
        launchExternalPDBWindow : function () {
            // http://stackoverflow.com/questions/15818892/chrome-javascript-window-open-in-new-tab
            // annoying workaround whereby we need to open a blank window here and set the location later
            // otherwise chrome/pop-up blockers think it is some spammy popup rather than something the user wants.
            // Basically chrome has this point in this function as being traceable back to a user click event but the
            // callback from the ajax isn't.
            var newtab = window.open ("", "_blank");
            var accessionIDs = CLMSUI.modelUtils.getLegalAccessionIDs (CLMSUI.compositeModelInst.get("clmsModel").get("participants"));
            if (accessionIDs.length) {
                CLMSUI.modelUtils.getPDBIDsForProteins (
                    accessionIDs,
                    function (data) {
                        var ids = data.split("\n");
                        var lastID = ids[ids.length - 2];   // -2 'cos last is actually an empty string after last \n
                        newtab.location = "http://www.rcsb.org/pdb/results/results.do?qrid="+lastID;
                    }
                ); 
            } else {
                newtab.document.body.innerHTML = "No legal Accession IDs are in the current dataset. These are required to query the PDB service.";
            }
        },
        
        setStatusText : function (msg, success) {
            var mbar = d3.select(this.el).select(".messagebar");
            var t = mbar.text(msg).transition().style("color", (success === false ? "red" : (success === true ? "blue" : null)));
            if (success !== false) {
                //t.transition().duration(20000).style("color", "#091d42");
                //console.log ("t", t);
            }
        },
        
        selectPDBFile: function (evt) {
            var self = this;
            var fileObj = evt.target.files[0];
            this.setStatusText ("Please Wait...");
            CLMSUI.modelUtils.loadUserFile (fileObj, function (pdbFileContents) {
                var blob = new Blob ([pdbFileContents], {type : 'application/text'});
                var fileExtension = fileObj.name.substr (fileObj.name.lastIndexOf('.') + 1);
                CLMSUI.modelUtils.repopulateNGL ({pdbFileContents: blob, ext: fileExtension, name: fileObj.name, stage: self.stage, bbmodel: self.model});
            });    
        },
        
        usePDBCode: function (evt) {
            if (evt.keyCode === 13) {   // when return key pressed
                var pdbCode = evt.target.value;
                if (pdbCode && pdbCode.length === 4) {
                    this.setStatusText ("Please Wait...");
                    CLMSUI.modelUtils.repopulateNGL ({pdbCode: pdbCode, stage: this.stage, bbmodel: this.model});
                }
            }
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "PDB File Chooser",
    });

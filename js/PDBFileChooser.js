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
                initialPdbCode: undefined,
            };
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
                        pattern: CLMSUI.modelUtils.commonRegexes.pdbPattern, size: 4, title: "Four letter alphanumeric PDB code"
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
            
            
            wrapperPanel.append("div").attr("class", "nglMessagebar");
            
            this.stage = new NGL.Stage ("ngl", {/*fogNear: 20, fogFar: 100,*/ backgroundColor: "white"});
            console.log ("STAGE", this.stage);
            // populate 3D network viewer if hard-coded pdb id present
            if (this.options.initialPdbCode) { 
                this.repopulate ({pdbCode: this.options.initialPdbCode});
            }
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
        
        selectPDBFile: function (evt) {
            var self = this;
            var fileObj = evt.target.files[0];
            CLMSUI.modelUtils.loadUserFile (fileObj, function (pdbFileContents) {
                var blob = new Blob ([pdbFileContents], {type : 'application/text'});
                var fileExtension = fileObj.name.substr (fileObj.name.lastIndexOf('.') + 1);
                self.repopulate ({pdbFileContents: blob, ext: fileExtension, name: fileObj.name});
            });    
        },
        
        usePDBCode: function (evt) {
            if (evt.keyCode === 13) {   // when return key pressed
                var pdbCode = evt.target.value;
                if (pdbCode && pdbCode.length === 4) {
                    this.repopulate ({pdbCode: pdbCode});
                }
            }
        },
        
        // Nice web-servicey way of doing ngl chain to clms protein matching
        // Except it depends on having a pdb code, not a standalone file, and all the uniprot ids present too
        // Therefore, current default is to use sequence matching to detect similarities
        matchPDBChainsToUniprot: function (pdbCode, nglSequences, interactorArr, callback) {
            $.get("http://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query="+pdbCode,
                function (data, status, xhr) {                   
                    if (status === "success") {
                        var map = [];
                        $(data).find("block").each (function(i,b) { 
                            var segArr = $(this).find("segment[intObjectId]"); 
                            for (var n = 0; n < segArr.length; n += 2) {
                                var id1 = $(segArr[n]).attr("intObjectId");
                                var id2 = $(segArr[n+1]).attr("intObjectId");
                                var pdbis1 = _.includes(id1, ".") || id1.charAt(0) !== 'P';
                                map.push (pdbis1 ? {pdb: id1, uniprot: id2} : {pdb: id2, uniprot: id1});
                            }
                        });
                        console.log ("map", map, nglSequences);
                        if (callback) {
                            var interactors = interactorArr.filter (function(i) { return !i.is_decoy; });
                            
                            map.forEach (function (mapping) {
                                var dotIndex = mapping.pdb.indexOf(".");
                                var chainName = dotIndex >= 0 ? mapping.pdb.slice(dotIndex + 1) : mapping.pdb.slice(-1);    // bug fix 27/01/17
                                var matchSeqs = nglSequences.filter (function (seqObj) {
                                    return seqObj.chainName === chainName;    
                                });
                                mapping.seqObj = matchSeqs[0]; 
                                var matchingInteractors = interactors.filter (function(i) {
                                    var minLength = Math.min (i.accession.length, mapping.uniprot.length);
                                    return i.accession.substr(0, minLength) === mapping.uniprot.substr(0, minLength);
                                });
                                mapping.id = matchingInteractors && matchingInteractors.length ? matchingInteractors[0].id : "none";
                            });
                            map = map.filter (function (mapping) { return mapping.id !== "none"; });
                            callback (map);
                        }
                    } 
                }
            ); 
        },
        
        repopulate: function (pdbInfo) {
            this.stage.removeAllComponents();   // necessary to remove old stuff so old sequences don't pop up in sequence finding
            
            pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name);
            var self = this;
            
            var params = {};    // {sele: ":A"};    // show just 'A' chain
            if (pdbInfo.ext) {
                params.ext = pdbInfo.ext;
            }
            var uri = pdbInfo.pdbCode ? "rcsb://"+pdbInfo.pdbCode : pdbInfo.pdbFileContents;
            this.stage.loadFile (uri, params)
                .then (function (structureComp) {
                    var nglSequences2 = CLMSUI.modelUtils.getSequencesFromNGLModelNew (self.stage);
                    var interactorMap = self.model.get("clmsModel").get("participants");
                    var interactorArr = Array.from (interactorMap.values());
                    // If have a pdb code AND legal accession IDs use a web service to glean matches between ngl protein chains and clms proteins
                    if (pdbInfo.pdbCode && CLMSUI.modelUtils.getLegalAccessionIDs(interactorMap).length > 0) {
                        self.matchPDBChainsToUniprot (pdbInfo.pdbCode, nglSequences2, interactorArr, function (pdbUniProtMap) {
                            //console.log ("pdbUniProtMap", pdbUniProtMap);
                            sequenceMapsAvailable (pdbUniProtMap);
                        });
                    }
                    else {  // without access to pdb codes have to match comparing all proteins against all chains
                        var protAlignCollection = self.model.get("alignColl");
                        var pdbUniProtMap = CLMSUI.modelUtils.matchSequencesToProteins (protAlignCollection, nglSequences2, interactorArr,
                            function(sObj) { return sObj.data; }
                        );
                        sequenceMapsAvailable (pdbUniProtMap);
                    }
                
                    // bit to continue onto after ngl protein chain to clms protein matching has been done
                    function sequenceMapsAvailable (sequenceMap) {
                        
                        if (sequenceMap && sequenceMap.length) {
                            var slen = sequenceMap.length;
                            d3.select(self.el).select(".nglMessagebar").text(slen+" sequence"+(slen > 1 ? "s": "")+" mapped between this search and the loaded pdb file.");
                            self.chainMap = {};
                            sequenceMap.forEach (function (pMatch) {
                                pMatch.data = pMatch.seqObj.data;
                                pMatch.name = CLMSUI.modelUtils.make3DAlignID (pdbInfo.baseSeqId, pMatch.seqObj.chainName, pMatch.seqObj.chainIndex);
                                self.chainMap[pMatch.id] = self.chainMap[pMatch.id] || [];
                                self.chainMap[pMatch.id].push ({index: pMatch.seqObj.chainIndex, name: pMatch.seqObj.chainName});
                                pMatch.otherAlignSettings = {semiLocal: true};
                            });
                            console.log ("chainmap", self.chainMap, "stage", self.stage, "\nhas sequences", sequenceMap);

                            if (self.model.get("stageModel")) {
                                 self.model.get("stageModel").stopListening();  // Stop the following 3dsync event triggering stuff in the old stage model
                            }
                            self.model.trigger ("3dsync", sequenceMap);
                            // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)      

                            // Make a new model and set of data ready for the ngl viewer
                            var crosslinkData = new CLMSUI.BackboneModelTypes.NGLModelWrapperBB (); 
                            crosslinkData.set({
                                structureComp: structureComp, 
                                chainMap: self.chainMap, 
                                pdbBaseSeqID: pdbInfo.baseSeqId, 
                                masterModel: self.model,
                            });
                            self.model.set ("stageModel", crosslinkData);
                            // important that the new model is set first ^^^ before we setupLinks() on the model
                            // otherwise the listener in the 3d viewer is still pointing to the old model when the
                            // changed:linklist event is received. (i.e. it broke the other way round)
                            crosslinkData.setupLinks (self.model.get("clmsModel"));
                        }
                        else {
                            d3.select(self.el).select(".nglMessagebar").text("No sequences matches found between this search and the loaded pdb file. Please check the pdb file is correct.");
                        }
                    }
                })
            ;  
        },

        render: function () {
            return this;
        },

        relayout: function () {
            return this;
        },
        
        identifier: "PDB File Chooser",
    });

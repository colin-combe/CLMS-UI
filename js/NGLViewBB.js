//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/NGLViewBB.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.NGLViewBB = CLMSUI.utils.BaseFrameView.extend({

        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents, {
            "click .pdbWindowButton": "launchExternalPDBWindow",
            "change .selectPdbButton": "selectPDBFile",
            "keyup .inputPDBCode": "usePDBCode",
            "click .centreButton": "centerView",
            "click .downloadButton": "downloadImage",
            "click .distanceLabelCB": "toggleLabels",
            "click .selectedOnlyCB": "toggleNonSelectedLinks",
            "click .showResiduesCB": "toggleResidues",
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
                labelVisible: false,
                selectedOnly: false,
                showResidues: true,
                pdbFileID: undefined,
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var flexWrapperPanel = mainDivSel.append("div")
                .attr ("class", "verticalFlexContainer")
            ;
            
            var toolbar1 = flexWrapperPanel.append("div").attr("class", "nglToolbar");
            var toolbar2 = flexWrapperPanel.append("div").attr("class", "nglToolbar nglDataToolbar").style("display", "none");
            
            toolbar1.append("label")
                .attr("class", "btn btn-1 btn-1a fakeButton")
                .append("span")
                    .attr("class", "noBreak")
                    .text("Select Local PDB File")
                    .append("input")
                        .attr({type: "file", accept: ".txt,.cif,.pdb", class: "selectPdbButton"})
            ;
        
            toolbar1.append("span")
                .attr("class", "noBreak btn")
                .text("or Enter 4-character PDB Code")
                .append("input")
                    .attr({
                        type: "text", class: "inputPDBCode", maxlength: 4,
                        pattern: "[A-Z0-9]{4}", size: 4, title: "Four letter alphanumeric PDB code"
                    })
                    .property ("required", true)
            ;
            
            var pushButtonData = [
                {klass: "pdbWindowButton", label: "Show Possible External PDBs"},
            ];
            
            toolbar1.selectAll("button").data(pushButtonData)
                .enter()
                .append("button")
                .attr("class", function(d) { return "btn btn-1 btn-1a "+d.klass; })
                .text (function(d) { return d.label; })
            ;
            
            toolbar2.append("button")
                .attr("class", "btn btn-1 btn-1a downloadButton")
                .text("Download Image")
            ;
			
            var toggleButtonData = [
                {initialState: this.options.labelVisible, klass: "distanceLabelCB", text: "Distance Labels"},
                {initialState: this.options.selectedOnly, klass: "selectedOnlyCB", text: "Selected Only"},
                {initialState: this.options.showResidues, klass: "showResiduesCB", text: "Residues"},
            ];
            
            toolbar2.selectAll("label").data(toggleButtonData)
                .enter()
                .append ("label")
                .attr ("class", "btn")
                    .append ("span")
                    .attr("class", "noBreak")
                    .text(function(d) { return d.text; })
                    .append("input")
                        .attr("type", "checkbox")
                        .attr("class", function(d) { return d.klass; })
                        .property ("checked", function(d) { return d.initialState; })
            ;
			
            toolbar2.append("button")
                .attr("class", "btn btn-1 btn-1a centreButton")
                .text("Re-Centre")
            ;
		
            this.chartDiv = flexWrapperPanel.append("div")
                .attr ({class: "panelInner", "flex-grow": 1, id: "ngl"})
            ;
            
            this.chartDiv.append("div").attr("class","overlayInfo").html("No PDB File Loaded"); 
            this.stage = new NGL.Stage ("ngl", {/*fogNear: 20, fogFar: 100*/});
            
            // populate 3D network viewer if hard-coded pdb id present
            if (this.options.pdbFileID) { 
                this.repopulate ({pdbCode: this.options.pdbFileID});
            }
        },
        
        
        launchExternalPDBWindow : function () {
            // http://stackoverflow.com/questions/15818892/chrome-javascript-window-open-in-new-tab
            // annoying workaround whereby we need to open a blank window here and set the location later
            // otherwise chrome/pop-up blockers think it is some spammy popup rather than something the user wants.
            // Basically chrome has this point in this function as being traceable back to a user click event but the
            // callback from the ajax isn't.
            var newtab = window.open ("", "_blank");
            CLMSUI.modelUtils.getPDBIDsForProteins (
                this.model.get("clmsModel").get("interactors"),
                function (data) {
                    var ids = data.split("\n");
                    var lastID = ids[ids.length - 2];   // -2 'cos last is actually an empty string after last \n
                    newtab.location = "http://www.rcsb.org/pdb/results/results.do?qrid="+lastID;
                    //window.open ("http://www.rcsb.org/pdb/results/results.do?qrid="+lastID, "_blank");
                }
            );    
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
            if (evt.keyCode === 13) {
                var pdbCode = evt.target.value;
                if (pdbCode && pdbCode.length === 4) {
                    this.repopulate ({pdbCode: pdbCode});
                }
            }
        },
        
        matchPDBChainsToUniprot: function (pdbCode, success) {
            $.get("http://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query="+pdbCode,
                function (data, status, xhr) {
                    //console.log ("uniprotpdb", arguments);
                        
                    if (status === "success") {
                        var map = [];
                        $(data).find("block").each (function(i,b) { 
                            var segArr = $(this).find("segment[intObjectId]"); 
                            for (var n = 0; n < segArr.length; n += 2) {
                                var id1 = $(segArr[n]).attr("intObjectId");
                                var id2 = $(segArr[n+1]).attr("intObjectId");
                                var pdbis1 = id1.includes(".") || id1.charAt(0) !== 'P';
                                map.push (pdbis1 ? {pdb: id1, uniprot: id2} : {pdb: id2, uniprot: id1});
                            }
                        });
                        console.log ("map", map);
                        if (success) {
                            success (map);
                        }
                    } 
                }
            ); 
        },
        
        repopulate: function (pdbInfo) {
            pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name) + ":";
            var firstTime = !this.xlRepr;
            if (firstTime) {
                d3.select(this.el).select(".nglDataToolbar").style("display", null);
            } else {
                this.xlRepr.dispose();
            }
            var overText = "PDB File: " + (pdbInfo.pdbCode ?
                "<A class='outsideLink' target='_blank' href='http://www.rcsb.org/pdb/explore.do?structureId="+pdbInfo.pdbCode+"'>"+pdbInfo.pdbCode+"</A>"
                : pdbInfo.name
            );
            this.chartDiv.select("div.overlayInfo").html(overText);
            var self = this;
            
            //var params = {sele: ":A"};    // show just 'A' chain
            var params = {};    // show all
            if (pdbInfo.ext) {
                params.ext = pdbInfo.ext;
            }
            var uri = pdbInfo.pdbCode ? "rcsb://"+pdbInfo.pdbCode : pdbInfo.pdbFileContents;
            this.stage.loadFile (uri, params)
                .then (function (structureComp) {
                    var nglSequences2 = CLMSUI.modelUtils.getSequencesFromNGLModelNew (self.stage);
                
                    console.log ("nglSequences", nglSequences2);
                    if (pdbInfo.pdbCode) {
                        self.matchPDBChainsToUniprot (pdbInfo.pdbCode, function (pdbUniProtMap) {
                            
                            var interactors = Array.from(self.model.get("clmsModel").get("interactors").values());
                            interactors = interactors.filter (function(i) { return !i.is_decoy; });
                            
                            pdbUniProtMap.forEach (function (mapping) {
                                var chainName = mapping.pdb.slice(-1);
                                var matchSeqs = nglSequences2.filter (function (seqObj) {
                                    return seqObj.chainName === chainName;    
                                });
                                mapping.seqObj = matchSeqs[0]; 
                                var matchingInteractors = interactors.filter (function(i) {
                                    var minLength = Math.min (i.accession.length, mapping.uniprot.length);
                                    return i.accession.substr(0, minLength) === mapping.uniprot.substr(0, minLength);
                                });
                                mapping.id = matchingInteractors[0].id;
                            });
                            
                            sequenceMapsAvailable (pdbUniProtMap);
                        });
                    }
                    else {  // without access to pdb codes have to match comparing all proteins against all chains
                        var sequenceMap = CLMSUI.modelUtils.matchSequencesToProteins (nglSequences2, 
                            Array.from(self.model.get("clmsModel").get("interactors").values()), 
                            function(sObj) { return sObj.data; }
                        );
                        sequenceMapsAvailable (sequenceMap);
                    }
                
                    function sequenceMapsAvailable (sequenceMap) {
                        console.log ("seq matches", sequenceMap);
                        self.chainMap = {};
                        sequenceMap.forEach (function (pMatch) {
                            pMatch.data = pMatch.seqObj.data;
                            pMatch.name = pdbInfo.baseSeqId + pMatch.seqObj.chainName;
                            self.chainMap[pMatch.id] = self.chainMap[pMatch.id] || [];
                            self.chainMap[pMatch.id].push (pMatch.seqObj.chainIndex);
                        });
                        console.log ("chainmap", self.chainMap); 
                        console.log ("stage", self.stage, "\nhas sequences", sequenceMap);
                        self.model.trigger ("3dsync", sequenceMap);

                        // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)
                        var crossLinks = self.model.get("clmsModel").get("crossLinks");
                        var filterCrossLinks = self.filterCrossLinks (crossLinks);
                        console.log ("pdb", pdbInfo);
                        var crosslinkData = new CLMSUI.CrosslinkData (
                            self.makeLinkList (filterCrossLinks, structureComp.structure, pdbInfo.baseSeqId)
                        );

                       self.xlRepr = new CLMSUI.CrosslinkRepresentation (
                              self.model, self.align, self.chainMap, structureComp, crosslinkData, 
                                pdbInfo.baseSeqId,
                                {
                                     selectedColor: "lightgreen",
                                     selectedLinksColor: "yellow",
                                     sstrucColor: "gray",
                                     displayedDistanceColor: "tomato",
                                    displayedDistanceVisible: self.options.labelVisible,
                              }
                       );

                        var dd = self.xlRepr.getDistances ();
                        //console.log ("distances", [dd]);
                        self.model.trigger ("distancesAvailable", [dd]);

                        if (firstTime) {
                            self.listenTo (self.model.get("filterModel"), "change", self.showFiltered);    // any property changing in the filter model means rerendering this view
                            self.listenTo (self.model, "change:linkColourAssignment", self.rerenderColours);   // if colour model used is swapped for new one
                            self.listenTo (self.model, "currentColourModelChanged", self.rerenderColours); // if current colour model used changes internally (distance model)
                            self.listenTo (self.model, "change:selection", self.showSelected);
                            self.listenTo (self.model, "change:highlights", self.showHighlighted);
                        }
                    }
                })
            ;  
        },

        render: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                this.showFiltered();
                console.log ("re rendering NGL view");
            }

            return this;
        },

        relayout: function () {
            if (this.stage) {
                this.stage.handleResize();
            }
            return this;
        },
        
        downloadImage: function () {
            // https://github.com/arose/ngl/issues/33
            this.stage.makeImage({
                factor: 4,  // make it big so it can be used for piccy
                antialias: true,
                trim: true, // https://github.com/arose/ngl/issues/188
                transparent: true
            }).then( function( blob ){
                NGL.download( blob, "screenshot.png" );
            });
        },
		
        centerView: function () {
            this.stage.centerView();
            return this;
        },
        
        toggleLabels: function (event) {
            var chk = event.target.checked;
            this.xlRepr.displayedDistanceVisible = chk;
            this.xlRepr.linkRepr.setParameters ({labelVisible: chk});
        },
        
        toggleResidues: function (event) {
           this.xlRepr.resRepr.setVisibility (event.target.checked);
        },
        
        toggleNonSelectedLinks: function (event) {
            this.xlRepr.linkRepr.setVisibility (!event.target.checked);
        },
        
        rerenderColours: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                // using update dodges setParameters not firing a redraw if param is the same
                this.xlRepr.linkRepr.update({color: this.xlRepr.colorOptions.linkColourScheme});
                this.xlRepr.linkRepr.viewer.requestRender();
            }
        },
        
        showHighlighted: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                this.xlRepr.setHighlightedLinks (this.xlRepr.crosslinkData.getLinks());
            }
        },
        
        showSelected: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                this.xlRepr.setSelectedLinks (this.xlRepr.crosslinkData.getLinks());
            }
        },
        
        filterCrossLinks: function (crossLinks) {
            var filteredCrossLinks = [];
            crossLinks.forEach (function (value) {
                if (value.filteredMatches_pp && value.filteredMatches_pp.length > 0 && !value.fromProtein.is_decoy && !value.toProtein.is_decoy) {
                    filteredCrossLinks.push (value);
                }
            });
            return filteredCrossLinks;
        },
        
        showFiltered: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                var filteredCrossLinks = this.filterCrossLinks (crossLinks);
                var linkList = this.makeLinkList (filteredCrossLinks, this.xlRepr.structureComp.structure, this.xlRepr.pdbBaseSeqId);
                this.xlRepr.crosslinkData.setLinkList (linkList);
            }
        },
        
        // TODO, need to check for decoys (protein has no alignment)
        // conversion here works to and from the resindex local to a chain, not for the overall resindex within a whole model
        align: function (resIndex, proteinID, from3D, pdbChainSeqId) {
            var alignModel = this.model.get("alignColl").get (proteinID);
            //console.log ("am", proteinID, alignModel, pdbChainSeqId);
            //console.log ("ids", alignModel.get("compAlignments"));
            var alignPos = resIndex;
            
            if (alignModel) {
                alignPos = from3D ? alignModel.mapToSearch (pdbChainSeqId, resIndex) : alignModel.mapFromSearch (pdbChainSeqId, resIndex);
                //console.log (resIndex, "->", alignPos, alignModel);
                if (alignPos < 0) { alignPos = -alignPos; }   // <= 0 indicates no equal index match, do the - to find nearest index
            }
            
            return alignPos;    //this will be 1-indexed
        },
        
        // residueStore maps the NGL-indexed resides to PDB-index
        // so we take our alignment index --> which goes to NGL-sequence index with align() --> 
        // then need to subtract 1, then --> which goes to PDB index with residueStore
        makeLinkList: function (linkModel, structure, pdbBaseSeqId) {
            var chainStore = structure.chainStore;
            
            var linkList = linkModel.map (function (xlink) {
                var fromChainIndex = this.chainMap[xlink.fromProtein.id][0];
                var toChainIndex = this.chainMap[xlink.fromProtein.id][0];
                var fromChainName = chainStore.getChainname (fromChainIndex);
                var toChainName = chainStore.getChainname (toChainIndex);
                // at the moment we're picking first matching chain for a protein, but we...
                // 1. could in this function add in multiple cross-links if protein maps to multiple chains i.e. A and B
                // so A-A, A-B, B-A, B-B are possibles
                // 2. could exclude A-A and B-B if homomultimeric link
                // 3. could work out distances of A-A, A-B, B-A, B-B and pick lowest non-zero distance
                //console.log ("cc", fromChain, toChain);
                return {
                    fromResidue: this.align (xlink.fromResidue, xlink.fromProtein.id, false, pdbBaseSeqId + fromChainName) - 1,  // residues are 0-indexed in NGL so -1
                    toResidue: this.align (xlink.toResidue, xlink.toProtein.id, false, pdbBaseSeqId + toChainName) - 1,    // residues are 0-indexed in NGL so -1
                    id: xlink.id,
                    fromChainIndex: fromChainIndex,
                    toChainIndex: toChainIndex,
                    fromChainName: fromChainName,
                    toChainName: toChainName,
                };
            }, this);
            
            linkList = linkList.filter (function (link) {
                return link.fromResidue >= 0 && link.toResidue >= 0;
            });
            return this.transformLinkList (linkList, structure);	
        },
        
        // removed hard-coded chainname as parameter
        transformLinkList: function (linkList, structure) {

            var structureId = null; // structure.id;
            var nextResidueId = 0;
            var residueDict = {};
            var residueStore = structure.residueStore;
            
            function getResidueId (resIndex, chainName) {
                // TODO add structureId to key
                // TODO in NMR structures there are multiple models
                var key = resIndex + ":" + chainName;
                if (residueDict[key] === undefined) {
                    residueDict[key] = nextResidueId;
                    nextResidueId++;
                }
                return residueDict[key];
            }

            var tLinkList = linkList.map (function(rl, i) {
                var resFromChainOffset = structure.chainStore.residueOffset[rl.fromChainIndex];
                var resToChainOffset = structure.chainStore.residueOffset[rl.toChainIndex];
                
                return {
                    origId: rl.id,
                    linkId: i,
                    residueA: {
                        resindex: rl.fromResidue,
                        residueId: getResidueId (rl.fromResidue, rl.fromChainName),
                        resno: residueStore.resno [rl.fromResidue + resFromChainOffset], // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainName: rl.fromChainName,
                        chainIndex: rl.fromChainIndex,
                        structureId: structureId
                    },
                    residueB: {
                        resindex: rl.toResidue,
                        residueId: getResidueId (rl.toResidue, rl.toChainName),
                        resno: residueStore.resno [rl.toResidue + resToChainOffset],   // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainName: rl.toChainName,
                        chainIndex: rl.toChainIndex,
                        structureId: structureId
                    }
                };
            });
            
            // Now have a bunch of lists 

            return tLinkList;
        },
    });

CLMSUI.CrosslinkData = function (linkList) {

    this.signals = {
        linkListChanged: new NGL.Signal()
    };

    this.setLinkList (linkList);
};

CLMSUI.CrosslinkData.prototype = {

    setLinkList: function (linkList) {

        var residueIdToLinkIds = {};
        var linkIdMap = {};
        var residueIdMap = {};

        var residueList = [];

        function insertResidue (residue, link) {
            var list = residueIdToLinkIds[residue.residueId];
            if (list === undefined) {
                residueIdToLinkIds[residue.residueId] = [link.linkId];
            } else if (list.indexOf (link.linkId) === -1) {
                list.push (link.linkId);
            }
            residueIdMap[residue.residueId] = residue;
        }

        linkList.forEach (function(rl) {
            linkIdMap[rl.linkId] = rl;
            insertResidue (rl.residueA, rl);
            insertResidue (rl.residueB, rl);
        });


        for (var residueId in residueIdMap){
            residueList.push (residueIdMap [residueId]);
        }

        this._residueIdToLinkIds = residueIdToLinkIds;
        this._linkIdMap = linkIdMap;
        this._residueIdMap = residueIdMap;

        //console.log ("stlinklist", linkList, linkIdMap);
        this._linkList = linkList;
        this._residueList = residueList;

        this.signals.linkListChanged.dispatch();
    },
    
    getResidueIdsFromLinkId: function (linkId) {
        var link = this._linkList(linkId);
        return link ? [link.residueA.residueId, link.residueB.residueId] : undefined;
    },

    getLinks: function (residue) {
        if (residue === undefined) {
            return this._linkList;
        } else {
            var linkIds = this._residueIdToLinkIds[residue.residueId];
            return linkIds ? linkIds.map (function(l) {
                return this._linkIdMap[l];
            }, this) : [];
        }
    },

    getResidues: function (link) {
        if (link === undefined) {
            return this._residueList;
        } else if (Array.isArray (link)) {
            var residues = [];
            link.forEach (function(l) {
                residues.push (l.residueA, l.residueB);
            });
            return residues;
        } else {
            return [link.residueA, link.residueB];
        }
    },

    getSharedLinks: function (residueA, residueB) {
        var aLinks = this.getLinks (residueA);
        var bLinks = this.getLinks (residueB);
        var sharedLinks = CLMSUI.modelUtils.intersectObjectArrays (aLinks, bLinks, function(l) { return l.linkId; });
        //console.log ("links", aLinks, bLinks, sharedLinks);
        return sharedLinks.length ? sharedLinks : false;
    },

    findResidues: function (resno, chainName) {
        var residues = this.getResidues().filter (function (r) {
            return r.resno === resno && r.chainName === chainName;
        });
        console.log ("find r", resno, chainName, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function (residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function (link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    }
};


CLMSUI.CrosslinkRepresentation = function (CLMSmodel, alignFunc, chainMap, structureComp, crosslinkData, pdbBaseSeqId, params) {

    var defaults = {
        sstrucColor: "wheat",
        displayedDistanceColor: "tomato",
        selectedDistanceColor: "white",
        displayedDistanceVisible: false,
        selectedDistanceVisible: true,
        displayedResiduesColor: params.displayedColor ? undefined : "lightgrey",
        displayedLinksColor: params.displayedColor ? undefined : "lighblue",
        selectedResiduesColor: params.selectedColor ? undefined : "lightgreen",
        selectedLinksColor: params.selectedColor ? undefined : "lightgreen",
        highlightedLinksColor: params.highlightedColor ? undefined : "orange",
    };
    var p = _.extend({}, defaults, params);
    this.setParameters (p, true);

    this.model = CLMSmodel;
    this.stage = structureComp.stage;
    this.alignFunc = alignFunc;
    this.chainMap = chainMap;
    this.structureComp = structureComp;
    this.crosslinkData = crosslinkData;
    this.pdbBaseSeqId = pdbBaseSeqId;
    this.origIds = {};
    this.residueToAtomIndexMap = {};
    
    this.colorOptions = {};
    this._initColorSchemes();
    this._initStructureRepr();
    this._initLinkRepr();

    console.log ("stage", this.stage);

    this.stage.signals.clicked.add (this._selectionPicking, this);
    this.stage.signals.hovered.add (this._highlightPicking, this);
    this.crosslinkData.signals.linkListChanged.add (this._handleDataChange, this);
};

CLMSUI.CrosslinkRepresentation.prototype = {

    constructor: CLMSUI.CrosslinkRepresentation,

    _getAtomPairsFromLinks: function (linkList) {

        var atomPairs = [];

        if (linkList) {
            if (linkList === "all") {
                linkList = this.crosslinkData.getLinks();
            }
            
            var sele = new NGL.Selection ();
            linkList.forEach (function (rl) {
                var atomA = this._getAtomIndexFromResidue (rl.residueA.resno, rl.residueA.chainName, sele);
                var atomB = this._getAtomIndexFromResidue (rl.residueB.resno, rl.residueB.chainName, sele);

                if (atomA !== undefined && atomB !== undefined) {
                    atomPairs.push ([atomA, atomB, rl.origId]);
                    this.origIds[rl.residueA.resno+"-"+rl.residueB.resno] = rl.origId;
                } else {
                    console.log ("dodgy pair", rl);
                }
            }, this);
            //console.log ("getAtomPairs", atomPairs);
        }

        return atomPairs;
    },
    
    _getAtomPairsFromResidue: function (residue) {
        var linkList = this.crosslinkData.getLinks (residue);
        return this._getAtomPairsFromLinks (linkList);
    },

    
    getDistances: function () {
        var prots = this.model.get("clmsModel").get("interactors").values();
        var protsArr = Array.from (prots);
        protsArr = protsArr.filter (function(p) { return !p.is_decoy; });
        
        var matrix;
        var prot = protsArr[0];
        console.log ("prot", prot);
        
        if (prot) {
            matrix = this.getAllDistances (prot, prot.size > 600);
        } else {
            prot = {id: null};
        }
        
        console.log ("mat", matrix);
        //console.log ("links", this.crosslinkData.getLinks());
        return {"proteinID": prot.id, "distances": matrix};
    },
    
    getAllDistances: function (prot, linksOnly) {
        var chainCAtomIndices = this.getCAtomsAllResidues (prot);
        //console.log ("residue atom indices", atomIndices);
        var keys = d3.keys (chainCAtomIndices);
        
        var matrixMap = {};
        var links = this.crosslinkData.getLinks();
        
        for (var n = 0; n < keys.length; n++) {
            for (var m = 0; m <= n; m++) {
                var chain1 = keys[n];
                var chain2 = keys[m];
                var matrix = linksOnly
                    ? this.getLinkDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2], chain1, chain2, links)
                    : this.getDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2])
                ;
                matrixMap[chain1+"-"+chain2] = matrix;
            }
        }
        
        return matrixMap;
    },
    
    getLinkDistancesBetween2Chains: function (chainAtomIndex1, chainAtomIndex2, chainName1, chainName2, links) {
        links = links.filter (function (link) {
            return (link.residueA.chainName === chainName1 && link.residueB.chainName === chainName2)
                || (link.residueA.chainName === chainName2 && link.residueB.chainName === chainName1);
        });
        
        var matrix = [[]];
        var ap1 = this.structureComp.structureView.getAtomProxy();
        var ap2 = this.structureComp.structureView.getAtomProxy();
        
        links.forEach (function (link) {
            var idA = link.residueA.resno;
            var idB = link.residueB.resno;
             ap1.index = chainAtomIndex1[idA];
             ap2.index = chainAtomIndex2[idB];
             if (ap1.index !== undefined && ap2.index !== undefined) {
                var d = ap1.distanceTo (ap2);
                matrix[idA] = matrix[idA] || [];
                matrix[idA][idB] = matrix[idA][idB] || [];
                matrix[idA][idB] = d;
             }
        });
        
        return matrix;
    },
    
    getDistancesBetween2Chains: function (chainAtomIndex1, chainAtomIndex2) {
        var matrix = [[]];
        var ap1 = this.structureComp.structureView.getAtomProxy();
        var ap2 = this.structureComp.structureView.getAtomProxy();
        
        for (var n = 1; n < chainAtomIndex1.length; n++) {
            ap1.index = chainAtomIndex1[n];
            var ap1undef = (ap1.index === undefined);
            matrix[n] = [undefined];
            var row = matrix[n];
            for (var m = 1; m < chainAtomIndex2.length; m++) {
                if (m !== n) {
                    ap2.index = chainAtomIndex2[m];
                    row.push ((ap2.index === undefined || ap1undef) ? undefined : ap1.distanceTo(ap2));
                } else {
                    row.push(0);
                }
            }
        }
        
        //console.log ("2m", chainAtomIndex1, chainAtomIndex2, matrix); 
        return matrix;
    },
    
    getCAtomsAllResidues : function (prot) {
        var resStore = this.structureComp.structure.residueStore;
        var chainStore = this.structureComp.structure.chainStore;
        var pid = prot.id;
        var chainIndices = this.chainMap[pid];
        var sele = new NGL.Selection();
        var chainCAtomIndices = {};
        
        chainIndices.forEach (function (ci) {
            var chainName = chainStore.getChainname (ci);
            var pdbChainSeqId = this.pdbBaseSeqId + chainName;
            var chainOffset = chainStore.residueOffset [ci];
            var atomIndices = chainCAtomIndices[chainName] || [undefined];  // we're building a 1-indexed array so first entry (0) is undefined
            
            for (var n = 1; n < prot.size; n++) {
                var index = this.alignFunc (n, pid, false, pdbChainSeqId) - 1; // rp.resno is 0-indexed so take 1 off the alignment result
                if (index >= 0) {
                    var resno = resStore.resno[index + chainOffset];
                    if (resno !== undefined) {
                        atomIndices[n] = this._getAtomIndexFromResidue (resno, chainName, sele);
                    }
                } else {
                    atomIndices[n] = undefined;
                }
            }
            
            chainCAtomIndices[chainName] = atomIndices;
        }, this);
        
        console.log ("cac", chainCAtomIndices);
      
        return chainCAtomIndices;
    },
    
    // used to generate a cache to speed up distance selections / calculations
    _getAtomIndexFromResidue: function (resno, chainName, sele) {
        if (resno !== undefined) {
            var aIndex = this.residueToAtomIndexMap [resno];
            if (aIndex === undefined) {
                sele.setString (resno + (chainName ? ":"+chainName : "") + " AND .CA");
                var a = this.structureComp.structure.getAtomIndices (sele);
                aIndex = a[0];
                this.residueToAtomIndexMap[resno] = aIndex;
            }
            return aIndex;
        }
        return undefined;
    },

    _getSelectionFromResidue: function (resnoList) {

        var sele;

        if (!resnoList || (Array.isArray (resnoList) && !resnoList.length)) {
            sele = "none";
        } else {
            if (resnoList === "all") {
                resnoList = this.crosslinkData.getResidues();
            }

            if (!Array.isArray (resnoList)) { resnoList = [resnoList]; }

            var tmp = resnoList.map (function (r) {
                var rsele = r.resno;
                if (r.chainName) { rsele += ":" + r.chainName; }
                return rsele;
            });

            sele = "( " + tmp.join( " OR " ) + " ) AND .CA";
        }

        return sele;
    },

    _initStructureRepr: function() {

        var comp = this.structureComp;

        var resSele = this._getSelectionFromResidue (this.crosslinkData.getResidues());
        var resEmphSele = this._getSelectionFromResidue ([]);

        this.sstrucRepr = comp.addRepresentation ("cartoon", {
            //color: this.sstrucColor,
            colorScheme: "chainname",
            colorScale: ["#e0e0ff", "lightgrey", "#e0e0ff", "lightgrey"],
            name: "sstruc",
            opacity: 0.67,
            side: "front",
        });

        this.resRepr = comp.addRepresentation ("spacefill", {
            sele: resSele,
            color: this.displayedResiduesColor,
            scale: 0.6,
            name: "res"
        });

        this.resEmphRepr = comp.addRepresentation ("spacefill", {
            sele: resEmphSele,
            color: this.selectedResiduesColor,
            scale: 0.9,
            opacity: 0.7,
            name: "resEmph"
        });

        this.stage.centerView (true);
        comp.centerView (true);
    },

    _initLinkRepr: function() {

        var comp = this.structureComp;
        var links = this.crosslinkData.getLinks();

        var xlPair = this._getAtomPairsFromLinks (links);
        var xlPairEmph = this._getAtomPairsFromLinks (this.filterByModelLinkArray (links, "selection"));
        var xlPairHigh = this._getAtomPairsFromLinks (this.filterByModelLinkArray (links, "highlights"));

        this.linkRepr = comp.addRepresentation ("distance", {
            atomPair: xlPair,
            //colorValue: this.displayedLinksColor,
            colorScheme: this.colorOptions.linkColourScheme,
            labelSize: 2.0,
            labelColor: this.displayedDistanceColor,
            labelVisible: this.displayedDistanceVisible,
            opacity: 1,
            name: "link",
            side: "front",
        });

        this.linkEmphRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairEmph,
            colorValue: this.selectedLinksColor,
            labelSize: 2.0,
            labelColor: this.selectedDistanceColor,
            labelVisible: this.selectedDistanceVisible,
            scale: 1.5,
            opacity: 0.6,
            name: "linkEmph",
            side: "front",
        });
        
        this.linkHighRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairHigh,
            colorValue: this.highlightedLinksColor,
            labelSize: 2.0,
            labelColor: this.selectedDistanceColor,
            labelVisible: this.selectedDistanceVisible,
            scale: 1.8,
            opacity: 0.4,
            name: "linkHigh",
        });
    },

    _initColorSchemes: function() {
        var self = this;
        
        var linkColourScheme = function () {
            //var first = true;
            this.bondColor = function (b) {
                //if (first) {
                 //   console.log ("bond", b, b.atom1.resno, b.atom2.resno, b.atomIndex1, b.atomIndex2);
                 //   first = false;
                //}
                var origLinkId = self.origIds[b.atom1.resno+"-"+b.atom2.resno];
                if (!origLinkId) {
                     origLinkId = self.origIds[b.atom2.resno+"-"+b.atom1.resno];
                }
                var link = self.model.get("clmsModel").get("crossLinks").get(origLinkId);
                var col = self.model.get("linkColourAssignment").getColour(link);
                var col3 = d3.rgb (col);
                return col ? (col3.r << 16) + (col3.g << 8) + col3.b : 255;
            };
        };
        
        this.colorOptions.linkColourScheme = NGL.ColorMakerRegistry.addScheme (linkColourScheme, "xlink");
    },
    
    getProteinFromChainName: function (chainName) {
        var chainStore = this.structureComp.structure.chainStore;
        var entries = d3.entries(this.chainMap);
        console.log ("entries", entries);
        var prot = null;
        entries.forEach (function (entry) {
            var found = entry.value.some (function (val) {
                return chainStore.getChainname(val) === chainName;
            });
            console.log ("entry", entry.value, found, chainName);
            if (found) {
                prot = entry.key;
            }
        });
        return prot;
    },
    
    getResidueType: function (residue) {
        var rStore = this.structureComp.structure.residueStore;
        var rMap = this.structureComp.structure.residueMap;
        console.log ("r", rStore.residueTypeId[residue.resindex], rMap);
        return rMap.get(rStore.residueTypeId[residue.resindex]);  // residueIndex because it's the local ngl index
    },

    _highlightPicking: function (pickingData) {
        this._handlePicking (pickingData, "highlights", true);   
    },
    
    _selectionPicking: function (pickingData) {
        this._handlePicking (pickingData, "selection");   
    },
    
    makeTooltipCoords: function (mouseCoord) {
        //var o1 = $("#main").offset();
        var o2 = $("#nglPanel canvas").offset();
        var offsetX = o2.left;  // - o1.left;
        var offsetY = o2.top;   // - o1.top;
        var canvasHeight = o2.height;
        return {pageX: mouseCoord.x + offsetX, pageY: offsetY + (canvasHeight - mouseCoord.y)}; // y is inverted in canvas
    },
    
    _handlePicking: function (pickingData, pickType, doEmpty) {
        var crosslinkData = this.crosslinkData;
        var atom = pickingData.atom;
        var bond = pickingData.bond;
        
        var xlinks = this.model.get("clmsModel").get("crossLinks");
        var pdtrans = {residue: undefined, links: undefined, xlinks: undefined};

        if (atom !== undefined && bond === undefined) {
            var residues = crosslinkData.findResidues (atom.resno, atom.chainname);
            if (residues) {
                pdtrans.residue = residues[0];
                pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
                
                var proteinId = this.getProteinFromChainName (pdtrans.residue.chainName);
                var protein = this.model.get("clmsModel").get("interactors").get(proteinId);
                var residueData = this.getResidueType (pdtrans.residue);
                this.model.get("tooltipModel")
                    .set("header", "Residue Info")
                    .set("contents", [
                        ["Residue No.", pdtrans.residue.resno],
                        ["Residue Type", residueData.resname],
                        ["Chain", pdtrans.residue.chainName],
                        ["Protein", protein.name],
                        ["Link Count", pdtrans.links ? pdtrans.links.length : 0],
                    ])
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.model.get("tooltipModel").trigger ("change:location");
            }
        } else if (bond !== undefined) {
            // atomIndex / resno’s output here are wrong, usually sequential (indices) or the same (resno’s)
            // console.log ("picked bond", bond.index, bond.atom1.resno, bond.atom2.resno, bond.atomIndex1, bond.atomIndex2);

            // this line worked with one distance rep, but not with two or more
            // var altBondStore = this.linkRepr.repr.dataList[0].bondStore; // distance rep bondstore
            
            var curLinkBondStore = this.linkRepr.repr.dataList.length ? 
                this.linkRepr.repr.dataList[0].bondStore : {count : 0}; // distance rep bondstore
            var selLinkBondStore = this.linkEmphRepr.repr.dataList.length ? 
                this.linkEmphRepr.repr.dataList[0].bondStore : {count: 0};    // selected rep bondstore
            var highLinkBondStore = this.linkHighRepr.repr.dataList.length ? 
                this.linkHighRepr.repr.dataList[0].bondStore : {count: 0};    // selected rep bondstore
            //console.log ("pp", pickingData.gid, bond.structure.atomCount, selLinkBondStore, highLinkBondStore);
            var gid = pickingData.gid - bond.structure.atomCount;
            // gids seemed to be assigned to bonds in reverse order by representation
            var altBondStore = (gid > highLinkBondStore.count + selLinkBondStore.count) ?
                curLinkBondStore : (gid > highLinkBondStore.count ? selLinkBondStore : highLinkBondStore)
            ;
            
            var ai1 = altBondStore.atomIndex1 [bond.index];
            var ai2 = altBondStore.atomIndex2 [bond.index];
            //console.log ("bondStores", pickingData.gid, bond.bondStore, curLinkBondStore, selLinkBondStore, this.linkRepr, this.linkEmphRepr);
            var resStore = bond.structure.residueStore;
            var aStore = bond.structure.atomStore;
            var ri1 = aStore.residueIndex[ai1];
            var ri2 = aStore.residueIndex[ai2];
            var r1 = resStore.resno[ri1];
            var r2 = resStore.resno[ri2];
            
            // r1 and r2 are now correct and I can grab data through the existing crosslinkData interface
            // console.log ("atom to resno's", aStore, ri1, ri2, r1, r2);
            var residuesA = crosslinkData.findResidues (r1, bond.atom1.chainname);
            var residuesB = crosslinkData.findResidues (r2, bond.atom2.chainname);
            
            // console.log ("res", crosslinkData.getResidues(), crosslinkData.getLinks());
            if (residuesA && residuesB) {
                pdtrans.links = crosslinkData.getSharedLinks (residuesA[0], residuesB[0]);
                
                var plink = pdtrans.links[0];
                var pxlink = xlinks.get (plink.origId);
                
                this.model.get("tooltipModel")
                    .set("header", "Linked Residue Pair")
                    .set("contents", [
                        ["From", pxlink.fromResidue, pxlink.fromProtein.name],
                        ["To", pxlink.toResidue, pxlink.toProtein.name],
                        ["Matches", pxlink.filteredMatches_pp.length],
                    ])
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.model.get("tooltipModel").trigger ("change:location");
            }
        }
        
        if (pdtrans.links) {
            pdtrans.xlinks = pdtrans.links.map (function(link) {
                return xlinks.get (link.origId);
            }, this);
        } else if (doEmpty) {
            pdtrans.xlinks = [];
        }
        console.log ("pd and pdtrans", pickingData, pdtrans.xlinks);
        
        this.model.calcMatchingCrosslinks (pickType, pdtrans.xlinks, false, false);
    },


    // These filter out any links / residues that aren't in the currently computed crossLinkData linkIdMap or residueIdMap caches
    _getAvailableResidues: function (residues) {
        if (!residues) { return residues; }

        return residues.filter (function (r) {
            return this.crosslinkData.hasResidue (r);
        }, this);
    },

    _getAvailableLinks: function (links) {
        if (!links) { return links; }

        return links.filter (function (l) {
            return this.crosslinkData.hasLink (l);
        }, this);
    },
    
    // fired when setLinkList called on representation's associated crosslinkData object
    _handleDataChange: function() {
        this.setDisplayedResidues (this.crosslinkData.getResidues());
        this.setSelectedResidues ([]);

        this.setDisplayedLinks (this.crosslinkData.getLinks());
        this.setSelectedLinks (this.crosslinkData.getLinks());
    },

    setDisplayedResidues: function (residues) {
        var availableResidues = this._getAvailableResidues (residues);

        this.resRepr.setSelection (
            this._getSelectionFromResidue (availableResidues)
        );
    },

    setSelectedResidues: function (residues) {
        var availableResidues = this._getAvailableResidues (residues);
        this.resEmphRepr.setSelection (
            this._getSelectionFromResidue (availableResidues)
        );
    },

    setDisplayedLinks: function (links) {
        var availableLinks = this._getAvailableLinks (links);
        this.linkRepr.setParameters ({
            atomPair: this._getAtomPairsFromLinks (availableLinks),
        });
    },

    filterByModelLinkArray: function (links, linkType) {  
        var selectedSet = d3.set (this.model.get(linkType).map (function(d) { return d.id; }));
        return links.filter (function (l) {
            return selectedSet.has (l.origId);   
        });
    },
    
    setSelectedLinks: function (links) {
        var availableLinks = this._getAvailableLinks (this.filterByModelLinkArray (links, "selection"));
        this.linkEmphRepr.setParameters ({
            atomPair: this._getAtomPairsFromLinks (availableLinks),
        });
    },
    
    setHighlightedLinks: function (links) {
        var availableLinks = this._getAvailableLinks (this.filterByModelLinkArray (links, "highlights"));
        this.linkHighRepr.setParameters ({
            atomPair: this._getAtomPairsFromLinks (availableLinks),
        });
    },
    

    /**
     * params
     *
     * - displayedColor (sets residues and links color)
     * - selectedColor (sets residues and links color)
     * - displayedResiduesColor
     * - selectedResiduesColor
     * - displayedLinksColor
     * - selectedLinksColor
     * - sstrucColor
     * - displayedDistanceColor (can't be a color scheme)
     * - selectedDistanceColor (can't be a color scheme)
     * - displayedDistanceVisible
     * - selectedDistanceVisible
     */
    setParameters: function( params, initialize ){

        var allParams = {};
        var repNameArray = ["resRepr", "linkRepr", "resEmphRepr", "linkEmphRepr", "linkHighRepr", "sstrucRepr"];
        repNameArray.forEach (function (repName) { allParams[repName] = {}; });

        // set params
        var p = Object.assign( {}, params );
        allParams.resRepr.color = p.displayedResiduesColor || p.displayedColor;
        allParams.linkRepr.color = p.displayedLinksColor || p.displayedColor;
        allParams.resEmphRepr.color = p.selectedResiduesColor || p.selectedColor;
        allParams.linkEmphRepr.color = p.selectedLinksColor || p.selectedColor;
        allParams.linkHighRepr.color = p.highlightedLinksColor || p.highlightedColor;

        allParams.sstrucRepr.color = p.sstrucColor;

        allParams.linkRepr.labelColor = p.displayedDistanceColor;
        allParams.linkEmphRepr.labelColor = p.selectedDistanceColor;
        allParams.linkRepr.labelVisible = p.displayedDistanceVisible;
        allParams.linkEmphRepr.labelVisible = p.selectedDistanceVisible;
        allParams.linkHighRepr.labelVisible = false;

        // set object properties
        var objProps = {
            "displayedResiduesColor": allParams.resRepr.color,
            "displayedLinksColor": allParams.linkRepr.color,
            "selectedResiduesColor": allParams.resEmphRepr.color,
            "selectedLinksColor": allParams.linkEmphRepr.color,
            "highlightedLinksColor": allParams.linkHighRepr.color,
            "sstrucColor": allParams.sstrucRepr.color,
            "displayedDistanceColor": allParams.linkRepr.labelColor,
            "selectedDistanceColor": allParams.linkEmphRepr.labelColor,
            "displayedDistanceVisible": allParams.linkRepr.labelVisible,
            "selectedDistanceVisible": allParams.linkEmphRepr.labelVisible,
            "highlightedDistanceVisible": allParams.linkHighRepr.labelVisible,
        };
        d3.entries(objProps).forEach (function (entry) {
            if (entry.value !== undefined) {
                this[entry.key] = entry.value;
            }
        }, this);

        // pass params to representations
        if( !initialize ){
            repNameArray.forEach (function (repName) {
                this[repName].setColor (allParams[repName].color);
                this[repName].setParameters (allParams[repName]);
            }, this);
        }
    },

    dispose: function(){
        this.stage.signals.clicked.remove (this._selectionPicking, this);
        this.stage.signals.hovered.remove (this._highlightPicking, this);
        this.crosslinkData.signals.linkListChanged.remove (this._handleDataChange, this);

        this.stage.removeAllComponents(); // calls dispose on each component, which calls dispose on each representation
    }
};
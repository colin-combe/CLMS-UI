//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/NGLViewBB.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.NGLViewBB = CLMSUI.utils.BaseFrameView.extend({

        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if (_.isFunction (parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
                "click .pdbWindowButton": "launchExternalPDBWindow",
                "change .selectPdbButton": "selectPDBFile",
                "keyup .inputPDBCode": "usePDBCode",
                "click .centreButton": "centerView",
                "click .downloadButton": "downloadImage",
                "click .distanceLabelCB": "toggleLabels",
                "click .selectedOnlyCB": "toggleNonSelectedLinks",
                "click .showResiduesCB": "toggleResidues",
                "click .shortestLinkCB": "toggleShortestLinksOnly",
            });
        },

        initialize: function (viewOptions) {
            CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
                labelVisible: false,
                selectedOnly: false,
                showResidues: true,
                shortestLinksOnly: true,
                initialPdbCode: undefined,
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

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
                {initialState: this.options.shortestLinksOnly, klass: "shortestLinkCB", text: "Shortest Link Option Only"},
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
            CLMSUI.modelUtils.getPDBIDsForProteins (
                this.model.get("clmsModel").get("interactors"),
                function (data) {
                    var ids = data.split("\n");
                    var lastID = ids[ids.length - 2];   // -2 'cos last is actually an empty string after last \n
                    newtab.location = "http://www.rcsb.org/pdb/results/results.do?qrid="+lastID;
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
                        console.log ("map", map);
                        if (callback) {
                            var interactors = interactorArr.filter (function(i) { return !i.is_decoy; });
                            
                            map.forEach (function (mapping) {
                                var chainName = mapping.pdb.slice(-1);
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
                            callback (map);
                        }
                    } 
                }
            ); 
        },
        
        repopulate: function (pdbInfo) {
            pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name);
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
            
            var params = {};    // {sele: ":A"};    // show just 'A' chain
            if (pdbInfo.ext) {
                params.ext = pdbInfo.ext;
            }
            var uri = pdbInfo.pdbCode ? "rcsb://"+pdbInfo.pdbCode : pdbInfo.pdbFileContents;
            this.stage.loadFile (uri, params)
                .then (function (structureComp) {
                    var nglSequences2 = CLMSUI.modelUtils.getSequencesFromNGLModelNew (self.stage);
                    console.log ("nglSequences", nglSequences2);
                
                    var interactorArr = Array.from (self.model.get("clmsModel").get("interactors").values());
                    // If have a pdb code use a web service to glean matches between ngl protein chains and clms proteins
                    if (pdbInfo.pdbCode) {
                        self.matchPDBChainsToUniprot (pdbInfo.pdbCode, nglSequences2, interactorArr, function (pdbUniProtMap) {
                            sequenceMapsAvailable (pdbUniProtMap);
                        });
                    }
                    else {  // without access to pdb codes have to match comparing all proteins against all chains
                        var pdbUniProtMap = CLMSUI.modelUtils.matchSequencesToProteins (nglSequences2, interactorArr,
                            function(sObj) { return sObj.data; }
                        );
                        sequenceMapsAvailable (pdbUniProtMap);
                    }
                
                    // bit to continue onto after ngl protein chain to clms protein matching has been done
                    function sequenceMapsAvailable (sequenceMap) {
                        console.log ("seq matches", sequenceMap);
                        self.chainMap = {};
                        sequenceMap.forEach (function (pMatch) {
                            pMatch.data = pMatch.seqObj.data;
                            pMatch.name = CLMSUI.modelUtils.make3DAlignID (pdbInfo.baseSeqId, pMatch.seqObj.chainName, pMatch.seqObj.chainIndex);
                            self.chainMap[pMatch.id] = self.chainMap[pMatch.id] || [];
                            self.chainMap[pMatch.id].push ({index: pMatch.seqObj.chainIndex, name: pMatch.seqObj.chainName});
                            pMatch.otherAlignSettings = {semiLocal: true};
                        });
                        console.log ("chainmap", self.chainMap); 
                        console.log ("stage", self.stage, "\nhas sequences", sequenceMap);
                        self.model.trigger ("3dsync", sequenceMap);

                        // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)
                        var crossLinks = self.model.get("clmsModel").get("crossLinks");
                        var filterCrossLinks = self.filterCrossLinks (crossLinks);
                        console.log ("pdb", pdbInfo);
                        
                        var crosslinkData = new CLMSUI.CrosslinkData (self.makeLinkList (filterCrossLinks, structureComp.structure, pdbInfo.baseSeqId));

                        self.xlRepr = new CLMSUI.CrosslinkRepresentation (
                            self.model, self.chainMap, structureComp, crosslinkData, pdbInfo.baseSeqId,
                            {
                                selectedColor: "lightgreen",
                                selectedLinksColor: "yellow",
                                sstrucColor: "gray",
                                displayedDistanceColor: "tomato",
                                displayedDistanceVisible: self.options.labelVisible,
                            }
                       );

                        var dd = self.xlRepr.getDistances ();
                        var distancesObj = new CLMSUI.DistancesObj (dd, self.chainMap, pdbInfo.baseSeqId);
                        console.log ("distances", distancesObj);
                        self.model.get("clmsModel").set("distancesObj", distancesObj);

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
        
        toggleShortestLinksOnly: function (event) {
            this.options.shortestLinksOnly = event.target.checked;
            this.showFiltered();
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
                if (value.filteredMatches_pp && value.filteredMatches_pp.length && !value.fromProtein.is_decoy && !value.toProtein.is_decoy) {
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
                if (this.options.shortestLinksOnly) {
                    linkList = this.model.get("clmsModel").get("distancesObj").getShortestLinks (linkList);
                }
                this.setLinkList (linkList);
            }
        },
        
        setLinkList: function (newLinkList) {
            this.xlRepr.crosslinkData.setLinkList (newLinkList);
        },
        
        rejectHomomultimeric: function (xlink, c1, c2) {
            var res = xlink.confirmedHomomultimer;
            console.log (c1, c2, res, (c1 !== c2 || !res));
            return res;
        },
        
        // residueStore maps the NGL-indexed resides to PDB-index
        // so we take our alignment index --> which goes to NGL-sequence index with Alignment Collection's getAlignedIndex() --> 
        // then need to subtract 1, then --> which goes to PDB index with residueStore
        makeLinkList: function (linkModel, structure, pdbBaseSeqId) {
            var nextResidueId = 0;
            var structureId = null;
            var residueDict = {};
            var linkList = [];
            var residueProxy1 = structure.getResidueProxy();
            var residueProxy2 = structure.getResidueProxy();
            var chainProxy = structure.getChainProxy();      
            var alignColl = this.model.get("alignColl");
            console.log ("chainmap", this.chainMap);
            
            function getResidueId (resIndex, chainIndex) {
                // TODO add structureId to key
                // TODO in NMR structures there are multiple models // mjg - chainIndex is unique across models
                var key = resIndex + ":" + chainIndex;
                if (residueDict[key] === undefined) {
                    residueDict[key] = nextResidueId;
                    nextResidueId++;
                }
                return residueDict[key];
            }
              
            linkModel.forEach (function (xlink) {
                // loop through fromChainIndices / toChainIndices to pick out all possible links between two residues in different chains
                var fromChainIndices = _.pluck (this.chainMap[xlink.fromProtein.id], "index");
                var toChainIndices = _.pluck (this.chainMap[xlink.toProtein.id], "index");
                if (fromChainIndices && toChainIndices && fromChainIndices.length && toChainIndices.length) {
                    fromChainIndices.forEach (function (fromChainIndex) {
                        chainProxy.index = fromChainIndex;
                        var fromResidue = alignColl.getAlignedIndex (xlink.fromResidue, xlink.fromProtein.id, false, CLMSUI.modelUtils.make3DAlignID (pdbBaseSeqId, chainProxy.chainname, fromChainIndex)) - 1;  // residues are 0-indexed in NGL so -1
                        
                        if (fromResidue >= 0) {
                            residueProxy1.index = fromResidue + chainProxy.residueOffset;

                            toChainIndices.forEach (function (toChainIndex) {
                                chainProxy.index = toChainIndex;
                                var toResidue = alignColl.getAlignedIndex (xlink.toResidue, xlink.toProtein.id, false, CLMSUI.modelUtils.make3DAlignID (pdbBaseSeqId, chainProxy.chainname, toChainIndex)) - 1;    // residues are 0-indexed in NGL so -1

                                //console.log ("fr", fromResidue, "tr", toResidue);
                                if (toResidue >= 0 /* && !this.rejectHomomultimeric(xlink, toChainIndex, fromChainIndex)*/) {                   
                                    residueProxy2.index = toResidue + chainProxy.residueOffset;

                                    linkList.push ({
                                        origId: xlink.id,
                                        linkId: linkList.length,
                                        residueA: {
                                            resindex: fromResidue,
                                            residueId: getResidueId (fromResidue, fromChainIndex),
                                            resno: residueProxy1.resno, // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                            chainIndex: fromChainIndex,
                                            structureId: structureId
                                        },
                                        residueB: {
                                            resindex: toResidue,
                                            residueId: getResidueId (toResidue, toChainIndex),
                                            resno: residueProxy2.resno,   // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                            chainIndex: toChainIndex,
                                            structureId: structureId
                                        }
                                    });
                                }
                            }, this);
                        }
                    }, this);
                }
            }, this);
            
            console.log ("linklist", linkList);        
            return linkList;
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
            } else if (! _.includes (list, link.linkId)) {
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
        this._linkList = linkList;
        this._residueList = residueList;
        console.log ("setLinkList", residueIdMap, residueList, residueIdToLinkIds, linkIdMap);

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
        return sharedLinks.length ? sharedLinks : false;
    },

    findResidues: function (resno, chainIndex) {
        var residues = this.getResidues().filter (function (r) {
            return r.resno === resno && r.chainIndex === chainIndex;
        });
        console.log ("find r", resno, chainIndex, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function (residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function (link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    },
};


CLMSUI.CrosslinkRepresentation = function (CLMSmodel, chainMap, structureComp, crosslinkData, pdbBaseSeqId, params) {

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
    this._initLabelRepr();

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
            var cp1 = this.structureComp.structure.getChainProxy();
            var cp2 = this.structureComp.structure.getChainProxy();
            linkList.forEach (function (rl) {
                cp1.index = rl.residueA.chainIndex;
                cp2.index = rl.residueB.chainIndex;
                var atomA = this._getAtomIndexFromResidue (rl.residueA.resno, cp1, sele);
                var atomB = this._getAtomIndexFromResidue (rl.residueB.resno, cp2, sele);

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
        var resCount = 0;
        var viableChainIndices = [];
        this.structureComp.structure.eachChain (function (cp) {
            if (cp.residueCount > 20) {
                resCount += cp.residueCount;
                viableChainIndices.push (cp.index);
            }
        });
        
        return this.getChainDistances (viableChainIndices, resCount > 800);
    },
    
    getChainDistances: function (chainIndices, linksOnly) {
        var chainCAtomIndices = this.getCAtomsAllResidues (chainIndices);
        //console.log ("residue atom indices", atomIndices);
        var keys = d3.keys (chainCAtomIndices);
        
        var matrixMap = {};
        var links = this.crosslinkData.getLinks();
        
        keys.forEach (function (chain1) {
            for (var m = 0; m < keys.length; m++) {
                var chain2 = keys[m];
                matrixMap[chain1+"-"+chain2] = linksOnly
                    ? this.getLinkDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2], +chain1, +chain2, links)
                    : this.getAllDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2], chain1, chain2)
                ;
            }
        }, this);
        
        return matrixMap;
    },
    
    rejectHomomultimeric: function (xlinkID, c1, c2) {
        var res = this.model.get("clmsModel").get("crossLinks").get(xlinkID).confirmedHomomultimer;
        console.log (c1, c2, res, (c1 !== c2 || !res));
        return res;
    },
    
    getLinkDistancesBetween2Chains: function (chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2, links) {
        links = links.filter (function (link) {
            return (link.residueA.chainIndex === chainIndex1 && link.residueB.chainIndex === chainIndex2 && this.rejectHomomultimeric (link.origId, chainIndex1, chainIndex2) ) /*||
                (link.residueA.chainIndex === chainIndex2 && link.residueB.chainIndex === chainIndex1)*/;
            // The reverse match condition produced erroneous links i.e. link chain3,49 to chain 2,56 also passed chain3,56 to chain2,49
        }, this);
           
        var matrix = [];
        var ap1 = this.structureComp.structure.getAtomProxy();
        var ap2 = this.structureComp.structure.getAtomProxy();
        
        links.forEach (function (link) {
            var idA = link.residueA.resindex;   // was previously link.residueA.resno;
            var idB = link.residueB.resindex;   // " " link.residueB.resno;
            ap1.index = chainAtomIndices1[idA];
            ap2.index = chainAtomIndices2[idB];
            if (ap1.index !== undefined && ap2.index !== undefined) {
                var d = ap1.distanceTo (ap2);
                //console.log ("link", link, chainIndex1, chainIndex2, idA, idB, ap1.index, ap2.index, d);
                matrix[idA] = matrix[idA] || [];
                matrix[idA][idB] = matrix[idA][idB] || [];
                matrix[idA][idB] = d;
            }
        });
        
        return matrix;
    },
    
    getAllDistancesBetween2Chains: function (chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2) {
        var matrix = [];
        var ap1 = this.structureComp.structure.getAtomProxy();
        var ap2 = this.structureComp.structure.getAtomProxy();
        var cai2length = chainAtomIndices2.length;
        var diffChains = (chainIndex1 !== chainIndex2);
        
        for (var n = 0; n < chainAtomIndices1.length; n++) {
            ap1.index = chainAtomIndices1[n];
            var ap1undef = (ap1.index === undefined);
            var row = matrix[n] = [];
            for (var m = 0; m < cai2length; m++) {
                if (m !== n || diffChains) {
                    ap2.index = chainAtomIndices2[m];
                    row.push ((ap2.index === undefined || ap1undef) ? undefined : ap1.distanceTo(ap2));
                } else {
                    row.push(0);
                }
            }
        }
        
        return matrix;
    },
    
    getCAtomsAllResidues : function (chainIndices) {
        var chainProxy = this.structureComp.structure.getChainProxy();
        var sele = new NGL.Selection();
        var chainCAtomIndices = {};
        var self = this;
        
        if (chainIndices) {
            chainIndices.forEach (function (ci) {
                chainProxy.index = ci;
                var atomIndices = chainCAtomIndices[ci] = [];
                chainProxy.eachResidue (function (rp) {
                    atomIndices.push (self._getAtomIndexFromResidue (rp.resno, chainProxy, sele));
                });
            }, this);
        }
        
        console.log ("cac", chainCAtomIndices);
      
        return chainCAtomIndices;
    },
    
    // used to generate a cache to speed up distance selections / calculations
    _getAtomIndexFromResidue: function (resno, cproxy, sele) {
        var aIndex;
        
        if (resno !== undefined) {
            var chainIndex = cproxy.index;
            var key = resno + (chainIndex !== undefined ? ":" + chainIndex : "");
            aIndex = this.residueToAtomIndexMap [key];
            
            if (aIndex === undefined) {
                var chainName = cproxy.chainname;
                var modelIndex = cproxy.modelIndex;
                var resi = resno + (chainName ? ":" + chainName : "") + (modelIndex !== undefined ? "/"+modelIndex : "");
                sele.setString (resi  + " AND .CA");
                var a = this.structureComp.structure.getAtomIndices (sele);
                aIndex = a[0];
                this.residueToAtomIndexMap[key] = aIndex;
            }
        }
        return aIndex;
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
            var cp = this.structureComp.structure.getChainProxy();
            
            var tmp = resnoList.map (function (r) {
                cp.index = r.chainIndex;
                var rsele = r.resno;
                if (cp.chainname) { rsele += ":" + cp.chainname; }
                if (cp.modelIndex !== undefined) { rsele += "/" + cp.modelIndex; }
                return rsele;
            });

            sele = "( " + tmp.join(" OR ") + " ) AND .CA";
        }

        return sele;
    },
    
    getFirstResidueInEachChain () {
        var comp = this.structureComp.structure;
        var rp = comp.getResidueProxy();
        var sels = [];
        comp.eachChain (function (cp) {
            rp.index = cp.residueOffset;
            sels.push ({resno: rp.resno, chainIndex: cp.index});
        });
        
        return this._getSelectionFromResidue (sels);
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
    
    _initLabelRepr: function () {
        var comp = this.structureComp;
        
        var selection = this.getFirstResidueInEachChain();
        var selectionObject = new NGL.Selection(selection);
        var customText = {};
        var self = this;
        comp.structure.eachAtom (function (atomProxy) {
            var pid = self.getProteinFromChainIndex (atomProxy.chainIndex);
            if (pid) {
                var protein = self.model.get("clmsModel").get("interactors").get(pid);
                var pname = protein ? protein.name : "none";
                customText[atomProxy.index] = pname + ":" + atomProxy.chainname + "(" +atomProxy.chainIndex+ ")";
            }
        }, selectionObject);
        
        
        this.labelRepr = comp.addRepresentation ("label", {
            color: "#ffffff",
            scale: 1.5,
            sele: selection,
            labelType: "text",
            labelText: customText,
            name: "chainText",
        });
        
    },

    _initColorSchemes: function() {
        var self = this;
        
        var linkColourScheme = function () { 
            var colCache = {};
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
                var colRGBString = self.model.get("linkColourAssignment").getColour(link);   // returns an 'rgb(r,g,b)' string
                var col24bit = colCache[colRGBString];
                if (col24bit === undefined) {
                    var col3 = d3.rgb (colRGBString);
                    col24bit = colRGBString ? (col3.r << 16) + (col3.g << 8) + col3.b : 255;
                    colCache[colRGBString] = col24bit; 
                }
                return col24bit;
            };
        };
        
        this.colorOptions.linkColourScheme = NGL.ColorMakerRegistry.addScheme (linkColourScheme, "xlink");
    },
    
    getProteinFromChainIndex: function (chainIndex) {
        var entries = d3.entries(this.chainMap);
        var matchProts = entries.filter (function (entry) {
            return _.includes (_.pluck (entry.value, "index"), chainIndex);
        });
        return matchProts && matchProts.length ? matchProts[0].key : null;
    },

    _highlightPicking: function (pickingData) {
        this._handlePicking (pickingData, "highlights", true);   
    },
    
    _selectionPicking: function (pickingData) {
        this._handlePicking (pickingData, "selection");   
    },
    
    makeTooltipCoords: function (mouseCoord) {
        var coff = $("#nglPanel canvas").offset();
        return {pageX: coff.left + mouseCoord.x, pageY: coff.top + (coff.height - mouseCoord.y)}; // y is inverted in canvas
    },
    
    getOriginalCrossLinks: function (nglCrossLinks) {
        var xlinks = this.model.get("clmsModel").get("crossLinks");
        return nglCrossLinks.map (function (link) {
            return xlinks.get (link.origId);
        });
    },
    
    _handlePicking: function (pickingData, pickType, doEmpty) {
        var crosslinkData = this.crosslinkData;
        var atom = pickingData.atom;
        var bond = pickingData.bond;
        var pdtrans = {residue: undefined, links: undefined, xlinks: undefined};

        if (atom !== undefined && bond === undefined) {
            console.log ("picked atom", atom, atom.resno, atom.chainIndex);
            var residues = crosslinkData.findResidues (atom.resno, atom.chainIndex);
            if (residues) {
                pdtrans.residue = residues[0];
                
                // this is to find the index of the residue in searchindex (crosslink) terms
                // thought I could rely on residue.resindex + chain.residueOffset but nooooo.....
                var proteinId = this.getProteinFromChainIndex (pdtrans.residue.chainIndex);
                var alignId = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqId, atom.chainname, atom.chainIndex);
                // align from 3d to search index. resindex is 0-indexed so +1 before querying
                console.log ("alignid", alignId, proteinId);
                var srindex = this.model.get("alignColl").getAlignedIndex (pdtrans.residue.resindex + 1, proteinId, true, alignId); 
                
                pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
                pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                console.log (pdtrans.residue, "links", pdtrans.links); 
                console.log (this.residueToAtomIndexMap, this.structureComp.structure.chainStore);
                
                var cp = this.structureComp.structure.getChainProxy (pdtrans.residue.chainIndex);
                var protein = this.model.get("clmsModel").get("interactors").get(proteinId);
                this.model.get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.residue (protein, srindex, ":"+cp.chainname))
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.multilinks (pdtrans.xlinks, protein.id, srindex))
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.model.get("tooltipModel").trigger ("change:location");
            }
        } else if (bond !== undefined) {
            // atomIndex / resno’s output here are wrong, usually sequential (indices) or the same (resno’s)
            // console.log ("picked bond", bond.index, bond.atom1.resno, bond.atom2.resno, bond.atomIndex1, bond.atomIndex2);

            // this line worked with one distance rep, but not with two or more
            // var altBondStore = this.linkRepr.repr.dataList[0].bondStore; // distance rep bondstore
            
            var getBondStore = function (aLinkRepr) {
                var dl = aLinkRepr.repr.dataList;
                return dl.length ? dl[0].bondStore : {count : 0};
            };
            
            var curLinkBondStore = getBondStore (this.linkRepr);    // distance rep bondstore
            var selLinkBondStore = getBondStore (this.linkEmphRepr);    // selected rep bondstore
            var highLinkBondStore = getBondStore (this.linkHighRepr);    // selected rep bondstore
            var bstructure = bond.structure;
            //console.log ("pp", pickingData.gid, bstructure.atomCount, selLinkBondStore, highLinkBondStore);
            var gid = pickingData.gid - bstructure.atomCount;
            // gids seemed to be assigned to bonds in reverse order by representation
            var altBondStore = (gid > highLinkBondStore.count + selLinkBondStore.count) ?
                curLinkBondStore : (gid > highLinkBondStore.count ? selLinkBondStore : highLinkBondStore)
            ;
            
            var ai1 = altBondStore.atomIndex1 [bond.index];
            var ai2 = altBondStore.atomIndex2 [bond.index];
            //console.log ("bondStores", pickingData.gid, bond.bondStore, curLinkBondStore, selLinkBondStore, this.linkRepr, this.linkEmphRepr);
           
            var ap1 = bstructure.getAtomProxy (ai1);
            var ap2 = bstructure.getAtomProxy (ai2);
            var rp1 = bstructure.getResidueProxy (ap1.residueIndex);
            var rp2 = bstructure.getResidueProxy (ap2.residueIndex);
            var c1 = rp1.chainIndex;
            var c2 = rp2.chainIndex;

            // r1 and r2 are now correct and I can grab data through the existing crosslinkData interface
            // console.log ("atom to resno's", aStore, ri1, ri2, r1, r2);
           // var residuesA = crosslinkData.findResidues (r1, bond.atom1.chainIndex);
            //var residuesB = crosslinkData.findResidues (r2, bond.atom2.chainIndex);
            var residuesA = crosslinkData.findResidues (rp1.resno, c1);
            var residuesB = crosslinkData.findResidues (rp2.resno, c2);
            console.log ("res", ap1.residueIndex, ap2.residueIndex, c1, c2, residuesA, residuesB);
            // console.log ("res", crosslinkData.getResidues(), crosslinkData.getLinks());
            if (residuesA && residuesB) {
                pdtrans.links = crosslinkData.getSharedLinks (residuesA[0], residuesB[0]);       
                pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                
                //var distModel = this.model.get("clmsModel").get("distancesObj");
                //var ld1 = distModel.getXLinkDistance (pdtrans.xlinks[0], this.model.get("alignColl"), true);
                //var ld2 = distModel.getXLinkDistance (pdtrans.xlinks[0], this.model.get("alignColl"), false);
                //console.log ("link distances", ld1, ld2);
                this.model.get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.link())
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.link (pdtrans.xlinks[0]))
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.model.get("tooltipModel").trigger ("change:location");
            }
        }
        
        if (!pdtrans.links && doEmpty) {
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
        var selectedSet = d3.set (_.pluck (this.model.get(linkType), "id"));
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
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
          return _.extend({},parentEvents,{
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
            
            var toolbar = flexWrapperPanel.append("div");
            
            toolbar.append("button")
                .attr("class", "btn btn-1 btn-1a downloadButton")
                .text("Download Image")
                .style ("margin-bottom", "0.2em")   // to give a vertical gap to any wrapping row of buttons
            ;
			
            var toggleButtonData = [
                {initialState: this.options.labelVisible, klass: "distanceLabelCB", text: "Distance Labels"},
                {initialState: this.options.selectedOnly, klass: "selectedOnlyCB", text: "Selected Only"},
                {initialState: this.options.showResidues, klass: "showResiduesCB", text: "Residues"},
            ];
            
            toolbar.selectAll("label").data(toggleButtonData)
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
			
            toolbar.append("button")
                .attr("class", "btn btn-1 btn-1a centreButton")
                .text("Re-Centre")
            ;
		
            this.chartDiv = flexWrapperPanel.append("div")
                .attr ("class", "panelInner")
                .attr ("flex-grow", 1)
                .attr ("id", "ngl")
            ;
 
            //this.chartDiv.selectAll("*").remove();
            
           //create 3D network viewer
            if (this.options.pdbFileID) {
                this.stage = new NGL.Stage( "ngl" );//this.chartDiv[0][0] );
                this.stage.loadFile( "rcsb://"+this.options.pdbFileID, { sele: ":A" } )
                    .then (function (structureComp) {

                        var sequences = CLMSUI.modelUtils.getSequencesFromNGLModel (self.stage, self.model.get("clmsModel"));
                        console.log ("stage", self.stage, "\nhas sequences", sequences);
                        // hacky thing to alert anything else interested the sequences are available as we are inside an asynchronous callback
                        self.model.trigger ("3dsync", sequences);

                        // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)
                        var crossLinks = self.model.get("clmsModel").get("crossLinks");
                        var filterCrossLinks = self.filterCrossLinks (crossLinks);
                        var crosslinkData = new CLMSUI.CrosslinkData (self.makeLinkList (filterCrossLinks, structureComp.structure.residueStore));

                       self.xlRepr = new CLMSUI.CrosslinkRepresentation (
                              self.model, self.stage, self.align, structureComp, crosslinkData, {
                                     selectedColor: "lightgreen",
                                     selectedLinksColor: "yellow",
                                     sstrucColor: "wheat",
                                     displayedDistanceColor: "tomato",
                                    displayedDistanceVisible: self.options.labelVisible,
                              }
                       );

                        var dd = self.xlRepr.getDistances ();
                        //console.log ("distances", [dd]);
                        self.model.trigger ("distancesAvailable", [dd]);

                        self.listenTo (self.model.get("filterModel"), "change", self.showFiltered);    // any property changing in the filter model means rerendering this view
                        //self.listenTo (self.model, "change:linkColourAssignment", self.showFiltered);
                        //self.listenTo (self.model, "currentColourModelChanged", self.showFiltered);
                        self.listenTo (self.model, "change:linkColourAssignment", self.rerenderColours);   // if colour model used is swapped for new one
                        self.listenTo (self.model, "currentColourModelChanged", self.rerenderColours); // if current colour model used changes internally (distance model)
                        self.listenTo (self.model, "change:selection", self.showSelected);
                        self.listenTo (self.model, "change:highlights", self.showHighlighted);
                    })
                ;  
            }
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
                //var selectedCrossLinks = this.model.get("selection");
                this.xlRepr.setHighlightedLinks (this.xlRepr.crosslinkData.getLinks());
            }
        },
        
        showSelected: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                //var selectedCrossLinks = this.model.get("selection");
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
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                var filteredCrossLinks = this.filterCrossLinks (crossLinks);
                var linkList = this.makeLinkList (filteredCrossLinks, this.xlRepr.structureComp.structure.residueStore);
                this.xlRepr.crosslinkData.setLinkList (linkList);
            }
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

        render: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                this.showFiltered();
                console.log ("re rendering NGL view");
                //this.stage.handleResize();
            }

            return this;
        },

        relayout: function () {
           this.stage.handleResize();
            return this;
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
        
        // TODO, need to check if a) alignments are loaded and b) check for decoys (protein has no alignment)
        align: function (resIndex, proteinID, from3D) {
            var alignModel = this.model.get("alignColl").get (proteinID);
            //console.log ("am", proteinID, alignModel);
            //console.log ("ids", alignModel.get("compAlignments"));
            var alignPos = resIndex;
            
            if (alignModel) {
                alignPos = from3D ? alignModel.mapToSearch ("3D_p0", resIndex) : alignModel.mapFromSearch ("3D_p0", resIndex);
                //console.log (resIndex, "->", alignPos, alignModel);
                if (alignPos < 0) { alignPos = -alignPos; }   // <= 0 indicates no equal index match, do the - to find nearest index
            }
            
            return alignPos;    //this will be 1-indexed
        },
        
        // residueStore maps the NGL-indexed resides to PDB-index
        // so we take our alignment index --> which goes to NGL-sequence index with align() --> 
        // then need to subtract 1, then --> which goes to PDB index with residueStore
        makeLinkList: function (linkModel, residueStore) {
            var linkList = linkModel.map (function (xlink) {
                return {
                    fromResidue: this.align (xlink.fromResidue, xlink.fromProtein.id) - 1,  // residues are 0-indexed in NGL so -1
                    toResidue: this.align (xlink.toResidue, xlink.toProtein.id) - 1,    // residues are 0-indexed in NGL so -1
                    id: xlink.id,
                };
            }, this);
            
            linkList = linkList.filter (function (link) {
                return link.fromResidue >= 0 && link.toResidue >= 0;
            });
            return this.transformLinkList (linkList, "A", null, residueStore);	
        },
        
        transformLinkList: function (linkList, chainname, structureId, residueStore) {

            chainname = chainname === undefined ? "A" : chainname;

            //var nextLinkId = 0;
            var nextResidueId = 0;

            var residueDict = {};
            function getResidueId (resIndex) {
                // TODO add structureId to key
                // TODO in NMR structures there are multiple models
                var key = resIndex + ":" + chainname;
                if (residueDict[key] === undefined) {
                    residueDict[key] = nextResidueId;
                    nextResidueId++;
                }
                return residueDict[ key ];
            }

            var tLinkList = linkList.map (function(rl, i) {
                return {
                    origId: rl.id,
                    linkId: i,
                    residueA: {
                        resindex: rl.fromResidue,
                        residueId: getResidueId (rl.fromResidue),
                        resno: residueStore.resno [rl.fromResidue], // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainname: chainname,
                        structureId: structureId
                    },
                    residueB: {
                        resindex: rl.toResidue,
                        residueId: getResidueId (rl.toResidue),
                        resno: residueStore.resno [rl.toResidue],   // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainname: chainname,
                        structureId: structureId
                    }
                };
            });

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

    findResidues: function( resno, chainname ){
        var residues = this.getResidues().filter (function (r) {
            return r.resno === resno && r.chainname === chainname;
        });
        console.log ("find r", resno, chainname, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function (residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function (link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    }
};


CLMSUI.CrosslinkRepresentation = function (CLMSmodel, stage, alignFunc, structureComp, crosslinkData, params) {

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
    this.stage = stage;
    this.alignFunc = alignFunc;
    this.structureComp = structureComp;
    this.crosslinkData = crosslinkData;
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
                var atomA = this._getAtomIndexFromResidue (rl.residueA.resno, sele);
                var atomB = this._getAtomIndexFromResidue (rl.residueB.resno, sele);

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
        //console.log ("this dist", this.structureComp, this.stage);  
        
        var prots = this.model.get("clmsModel").get("interactors").values();
        var protsArr = Array.from (prots);
        protsArr = protsArr.filter (function(p) { return !p.is_decoy; });
        
        var matrix;
        var prot = protsArr[0];
        
        if (prot) {
            if (prot.size < 600) {
                matrix = this.getAllDistances (prot);
            } else {
                matrix = this.getLinkDistancesOnly (prot, prot);
            }
        } else {
            prot = {id: null};
        }
        
        //console.log ("lds", this.getLinkDistancesOnly (prot, prot));
        //console.log ("mat", matrix);
        //console.log ("links", this.crosslinkData.getLinks());
        return {"proteinID": prot.id, "distances": matrix};
    },
    
    getLinkDistancesOnly: function (prot1, prot2) {
        var atomIndices1 = this.getCAtomsAllResidues (prot1);
        var atomIndices2 = this.getCAtomsAllResidues (prot2);
        var ap1 = this.structureComp.structureView.getAtomProxy();
        var ap2 = this.structureComp.structureView.getAtomProxy();
        var matrix = [[]];
        
        var links = this.crosslinkData.getLinks();
        links.forEach (function (link) {
            var idA = link.residueA.resno;
            var idB = link.residueB.resno;
             ap1.index = atomIndices1[idA];
             ap2.index = atomIndices2[idB];
             if (ap1.index !== undefined && ap2.index !== undefined) {
                var d = ap1.distanceTo (ap2);
                matrix[idA] = matrix[idA] || [];
                 matrix[idA][idB] = matrix[idA][idB] || [];
                 matrix[idA][idB] = d;
             }
        });
        
        return matrix;
    },
    
    getAllDistances: function (prot) {
        var atomIndices = this.getCAtomsAllResidues (prot);
        //console.log ("residue atom indices", atomIndices);

        var ap1 = this.structureComp.structureView.getAtomProxy();
        var ap2 = this.structureComp.structureView.getAtomProxy();
        var matrix = [[]];
        for (var n = 1; n < atomIndices.length; n++) {
            var nindex = atomIndices[n];
            ap1.index = nindex;
            matrix[n] = [undefined];
            var row = matrix[n];
            for (var m = 1; m < atomIndices.length; m++) {
                if (m !== n) {
                    var mindex = atomIndices[m];
                    ap2.index = mindex;
                    row.push ((mindex === undefined || nindex === undefined) ? undefined : ap1.distanceTo(ap2));
                } else {
                    row.push(0);
                }
            }
        }
        
        return matrix;
    },
    
    getCAtomsAllResidues : function (prot) {
        var rp = this.structureComp.structure.residueStore;
        var pid = prot.id;
        var sele = new NGL.Selection();
        var atomIndices = [undefined];  // we're building a 1-indexed array so first entry (0) is undefined
        
        for (var n = 1; n < prot.size; n++) {
            var index = this.alignFunc (n, pid, false) - 1; // rp.resno is 0-indexed so take 1 off the alignment result
            if (index >= 0) {
                var resno = rp.resno[index];
                atomIndices[n] = this._getAtomIndexFromResidue (resno, sele);
            } else {
                atomIndices[n] = undefined;
            }
        }
        
        return atomIndices;
    },
    
    // used to generate a cache to speed up distance selections / calculations
    _getAtomIndexFromResidue: function (resno, sele) {
        if (resno !== undefined) {
            var aIndex = this.residueToAtomIndexMap [resno];
            if (aIndex === undefined) {
                sele.setString (resno+" AND .CA");
                var a = this.structureComp.structure.getAtomIndices (sele);
                aIndex = a[0];
                this.residueToAtomIndexMap[resno] = aIndex;
            }
            return aIndex;
        }
        return undefined;
    },

    _getSelectionFromResidue: function (resnoList, asSelection) {

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
                if (r.chainname) { rsele = rsele + ":" + r.chainname; }
                return rsele;
            });

            sele = "( " + tmp.join( " OR " ) + " ) AND .CA";
        }

        return asSelection ? new NGL.Selection (sele) : sele;
    },

    _initStructureRepr: function() {

        var comp = this.structureComp;

        var resSele = this._getSelectionFromResidue (this.crosslinkData.getResidues());
        var resEmphSele = this._getSelectionFromResidue ([]);

        this.sstrucRepr = comp.addRepresentation ("cartoon", {
            color: this.sstrucColor,
            name: "sstruc"
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
            name: "link",
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
                var link = self.model.get("clmsModel").get("crossLinks").get(origLinkId);
                var col = self.model.get("linkColourAssignment").getColour(link);
                var col3 = d3.rgb (col);
                return col ? (col3.r << 16) + (col3.g << 8) + col3.b : 255;
            };
        };
        
        this.colorOptions.linkColourScheme = NGL.ColorMakerRegistry.addScheme (linkColourScheme, "xlink");
    },

    _highlightPicking: function (pickingData) {
        this._handlePicking (pickingData, "highlights", true);   
    },
    
    _selectionPicking: function (pickingData) {
        this._handlePicking (pickingData, "selection");   
    },
    
    _handlePicking: function (pickingData, pickType, doEmpty) {
        var crosslinkData = this.crosslinkData;
        var atom = pickingData.atom;
        var bond = pickingData.bond;

        var pdtrans = {residue: undefined, links: undefined, xlinks: undefined};

        if (atom !== undefined && bond === undefined) {
            var residues = crosslinkData.findResidues (atom.resno, atom.chainname);
            if (residues) {
                pdtrans.residue = residues[0];
                pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
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
            }
        }
        
        var xlinks = this.model.get("clmsModel").get("crossLinks");
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

        ["sstrucRepr", "resRepr", "resEmphRepr", "linkRepr", "linkEmphRepr", "linkHighRepr"].forEach (function (rep) {
            this.stage.removeRepresentation (this[rep]);
        }, this);
    }
};
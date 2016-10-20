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
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var flexWrapperPanel = mainDivSel.append("div")
                .attr ("class", "verticalFlexContainer")
            ;
            
            var toolbar = flexWrapperPanel.append("div").attr("class", "nglToolbar nglDataToolbar");
            
            toolbar.append("button")
                .attr("class", "btn btn-1 btn-1a downloadButton")
                .text("Download Image")
            ;
			
            var toggleButtonData = [
                {initialState: this.options.labelVisible, klass: "distanceLabelCB", text: "Distance Labels"},
                {initialState: this.options.selectedOnly, klass: "selectedOnlyCB", text: "Selected Only"},
                {initialState: this.options.showResidues, klass: "showResiduesCB", text: "Residues"},
                {initialState: this.options.shortestLinksOnly, klass: "shortestLinkCB", text: "Shortest Link Option Only"},
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
                .attr ({class: "panelInner", "flex-grow": 1, id: "ngl"})
            ;
            
            this.chartDiv.append("div").attr("class","overlayInfo").html("No PDB File Loaded"); 
            
            console.log ("slef", this.model);
            this.listenTo (this.model.get("filterModel"), "change", this.showFiltered);    // any property changing in the filter model means rerendering this view
            this.listenTo (this.model, "change:linkColourAssignment", this.rerenderColours);   // if colour model used is swapped for new one
            this.listenTo (this.model, "currentColourModelChanged", this.rerenderColours); // if current colour model used changes internally (distance model)
            this.listenTo (this.model, "change:selection", this.showSelected);
            this.listenTo (this.model, "change:highlights", this.showHighlighted);
            this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.repopulate)
        },
        
        repopulate: function () {
            console.log ("REPOPULATE");
            //pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name);
            var firstTime = !this.xlRepr;
            if (!firstTime) {
                this.xlRepr.dispose();
            }
            /*
            var overText = "PDB File: " + (pdbInfo.pdbCode ?
                "<A class='outsideLink' target='_blank' href='http://www.rcsb.org/pdb/explore.do?structureId="+pdbInfo.pdbCode+"'>"+pdbInfo.pdbCode+"</A>"
                : pdbInfo.name
            );      
            this.chartDiv.select("div.overlayInfo").html(overText);
            */
            //var self = this;
            
            this.xlRepr = new CLMSUI.CrosslinkRepresentation (
                this.model.get("stageModel"),
                {
                    selectedColor: "lightgreen",
                    selectedLinksColor: "yellow",
                    sstrucColor: "gray",
                    displayedDistanceColor: "tomato",
                    displayedDistanceVisible: this.options.labelVisible,
                }
            );
        },

        render: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                this.showFiltered();
                console.log ("re rendering NGL view");
            }

            return this;
        },

        relayout: function () {
            if (this.model.get("stageModel")) {
                var stage = this.model.get("stageModel").get("structureComp").stage;
                if (stage) {
                    stage.handleResize();
                }
            }
            return this;
        },
        
        downloadImage: function () {
            // https://github.com/arose/ngl/issues/33
            if (this.model.get("stageModel")) {
                this.model.get("stageModel").get("structureComp").stage.makeImage({
                    factor: 4,  // make it big so it can be used for piccy
                    antialias: true,
                    trim: true, // https://github.com/arose/ngl/issues/188
                    transparent: true
                }).then( function( blob ){
                    NGL.download( blob, "screenshot.png" );
                });
            }
        },
		
        centerView: function () {
            if (this.model.get("stageModel")) {
                this.model.get("stageModel").get("structureComp").stage.centerView();
            }
            return this;
        },
        
        toggleLabels: function (event) {
            if (this.xlRepr) {
                var chk = event.target.checked;
                this.xlRepr.displayedDistanceVisible = chk;
                this.xlRepr.linkRepr.setParameters ({labelVisible: chk});
            }
        },
        
        toggleResidues: function (event) {
            if (this.xlRepr) {
                this.xlRepr.resRepr.setVisibility (event.target.checked);
            }
        },
        
        toggleNonSelectedLinks: function (event) {
            if (this.xlRepr) {
                this.xlRepr.linkRepr.setVisibility (!event.target.checked);
            }
        },
        
        toggleShortestLinksOnly: function (event) {
            this.options.shortestLinksOnly = event.target.checked;
            this.showFiltered();
        },
        
        rerenderColours: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
                // using update dodges setParameters not firing a redraw if param is the same
                this.xlRepr.linkRepr.update({color: this.xlRepr.colorOptions.linkColourScheme});
                this.xlRepr.linkRepr.viewer.requestRender();
            }
        },
        
        showHighlighted: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
                this.xlRepr.setHighlightedLinks (this.xlRepr.crosslinkData.getLinks());
            }
        },
        
        showSelected: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
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
                var self = this;
                var filterFunc = function (linkList) {
                    if (self.options.shortestLinksOnly) {
                        return self.model.get("clmsModel").get("distancesObj").getShortestLinks (linkList);
                    }
                    return linkList;
                }
                this.xlRepr.crosslinkData.setLinkList (filteredCrossLinks, filterFunc);
            }
        },
    });



CLMSUI.CrosslinkRepresentation = function (nglModelWrapper, params) {

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

    this.stage = nglModelWrapper.get("structureComp").stage;
    this.chainMap = nglModelWrapper.get("chainMap");
    this.structureComp = nglModelWrapper.get("structureComp");
    this.crosslinkData = nglModelWrapper;
    this.pdbBaseSeqId = nglModelWrapper.get("pdbBaseSeqId");
    this.origIds = {};
    
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
                var atomA = this.crosslinkData._getAtomIndexFromResidue (rl.residueA.resno, cp1, sele);
                var atomB = this.crosslinkData._getAtomIndexFromResidue (rl.residueB.resno, cp2, sele);

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
            var pid = self.crosslinkData.getProteinFromChainIndex (atomProxy.chainIndex);
            if (pid) {
                var protein = self.crosslinkData.getModel().get("clmsModel").get("interactors").get(pid);
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
                var link = self.crosslinkData.getModel().get("clmsModel").get("crossLinks").get(origLinkId);
                var colRGBString = self.crosslinkData.getModel().get("linkColourAssignment").getColour(link);   // returns an 'rgb(r,g,b)' string
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
        var xlinks = this.crosslinkData.getModel().get("clmsModel").get("crossLinks");
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
                var proteinId = this.crosslinkData.getProteinFromChainIndex (pdtrans.residue.chainIndex);
                var alignId = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqId, atom.chainname, atom.chainIndex);
                // align from 3d to search index. resindex is 0-indexed so +1 before querying
                console.log ("alignid", alignId, proteinId);
                var srindex = this.crosslinkData.getModel().get("alignColl").getAlignedIndex (pdtrans.residue.resindex + 1, proteinId, true, alignId); 
                
                pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
                pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                console.log (pdtrans.residue, "links", pdtrans.links); 
                console.log (this.crosslinkData.residueToAtomIndexMap, this.structureComp.structure.chainStore);
                
                var cp = this.structureComp.structure.getChainProxy (pdtrans.residue.chainIndex);
                var protein = this.crosslinkData.getModel().get("clmsModel").get("interactors").get(proteinId);
                this.crosslinkData.getModel().get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.residue (protein, srindex, ":"+cp.chainname))
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.multilinks (pdtrans.xlinks, protein.id, srindex))
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
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
                
                this.crosslinkData.getModel().get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.link())
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.link (pdtrans.xlinks[0]))
                    .set("location", this.makeTooltipCoords (pickingData.mouse))
                ;
                this.crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
            }
        }
        
        if (!pdtrans.links && doEmpty) {
            pdtrans.xlinks = [];
        }
        console.log ("pd and pdtrans", pickingData, pdtrans.xlinks);
        
        this.crosslinkData.getModel().calcMatchingCrosslinks (pickType, pdtrans.xlinks, false, false);
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
        var selectedSet = d3.set (_.pluck (this.crosslinkData.getModel().get(linkType), "id"));
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
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
            "click .showAllProteinsCB": "toggleShowAllProteins",
			"click .chainLabelLengthRB": "setChainLabelLength",
            "mouseleave canvas": "clearHighlighted",
        });
    },
	
	defaultOptions: {
		labelVisible: false,
		selectedOnly: false,
		showResidues: true,
		shortestLinksOnly: true,
		chainRep: "cartoon",
		colourScheme: "uniform",
		showAllProteins: false,
		chainLabelSetting: "Short",
        defaultAssembly: "AU",
	},

    initialize: function (viewOptions) {
        CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;

        var buttonData = [
            {label: CLMSUI.utils.commonLabels.downloadImg+"PNG", class:"downloadButton", type: "button", id: "download"},
            {label: "Re-Centre", class: "centreButton", type: "button", id: "recentre"},
        ];

        var toolbar = flexWrapperPanel.append("div").attr("class", "toolbar");
        CLMSUI.utils.makeBackboneButtons (toolbar, self.el.id, buttonData);
        
        
        // Assembly choice dropdown
        var assemblys = ["BU1", "AU"];
        CLMSUI.utils.addMultipleSelectControls ({
            addToElem: toolbar,
            selectList: ["Assembly"], 
            optionList: assemblys, 
            changeFunc: function () {
                if (self.xlRepr) {
                    self.options.defaultAssembly = d3.event.target.value;
                    self.xlRepr
                        .updateOptions (self.options, ["defaultAssembly"])
                        .updateAssemblyType ()
                    ;
                    self.setAssemblyChains();
                }
            },
            initialSelectionFunc: function(d) { return d === self.options.defaultAssembly; }
        });


        // Various view options set up...
        var toggleButtonData = [
            {initialState: this.options.selectedOnly, class: "selectedOnlyCB", label: "Selected Cross-Links Only", id: "selectedOnly", d3tooltip: "Only show selected cross-links"},
            {initialState: this.options.shortestLinksOnly, class: "shortestLinkCB", label: "Shortest Possible Cross-Links Only", id: "shortestOnly", d3tooltip: "Only show shortest possible cross-links: complexes with multiple (N) copies of a protein can have multiple possible alternatives for cross-links - N x N for self links, N x M for between links"},
			{initialState: this.options.showResidues, class: "showResiduesCB", label: "Cross-Linked Residues", id: "showResidues", d3tooltip: "Show cross-linked residues on protein representations"},
            {initialState: this.options.showAllProteins, class: "showAllProteinsCB", label: "All Proteins", id: "showAllProteins", d3tooltip: "Keep showing proteins with no current cross-links (within available PDB structure)"},
			{initialState: this.options.labelVisible, class: "distanceLabelCB", label: "Distance Labels", id: "visLabel", d3tooltip: "Show distance labels on displayed cross-links"},
			{class: "chainLabelLengthRB", label: "Long", id: "showLongChainLabels", tooltip: "Show protein chain labels with more verbose content if available", group: "chainLabelSetting", type: "radio", value: "Verbose", header: "Protein Chain Label Style"},
			{class: "chainLabelLengthRB", label: "Short", id: "showShortChainLabels", tooltip: "Show protein chain labels with shorter content", group: "chainLabelSetting", type: "radio", value: "Short"},
			{class: "chainLabelLengthRB", label: "None", id: "showNoChainLabels", tooltip: "Show no protein chain labels", group: "chainLabelSetting", type: "radio", value: "None"},
        ];
        toggleButtonData
            .forEach (function (d) {
                d.type = d.type || "checkbox";
				d.value = d.value || d.label;
                d.inputFirst = true;
				if (d.initialState === undefined && d.group && d.value) {	// set initial values for radio button groups
					d.initialState = (d.value === this.options[d.group]);
				}
            }, this)
        ;
        CLMSUI.utils.makeBackboneButtons (toolbar, self.el.id, toggleButtonData);

		// ...then moved to a dropdown menu
        var optid = this.el.id+"Options";
        toolbar.append("p").attr("id", optid);
        new CLMSUI.DropDownMenuViewBB ({
            el: "#"+optid,
            model: CLMSUI.compositeModelInst.get("clmsModel"),
            myOptions: {
                title: "Show ▼",
                menu: toggleButtonData.map (function(d) { 
					d.id = self.el.id + d.id; 
					d.tooltip = d.d3tooltip;
					return d; 
				}),
                closeOnClick: false,
				tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel"),
            }
        });


        // Protein view type dropdown
        var allReps = NGL.RepresentationRegistry.names.slice().sort();
        var ignoreReps = ["axes", "base", "contact", "distance", "helixorient", "hyperball", "label", "rocket", "trace", "unitcell", "validation", "angle", "dihedral"];
        var mainReps = _.difference (allReps, ignoreReps);
        CLMSUI.utils.addMultipleSelectControls ({
            addToElem: toolbar,
            selectList: ["Draw Proteins As"], 
            optionList: mainReps, 
            changeFunc: function () {
                if (self.xlRepr) {
                    self.options.chainRep = d3.event.target.value;
                    self.xlRepr
                        .updateOptions (self.options, ["chainRep"])
                        .replaceChainRepresentation (self.options.chainRep)
                    ;
                }
            },
            initialSelectionFunc: function(d) { return d === self.options.chainRep; }
        });
        
        
        // Residue colour scheme dropdown
        var allColourSchemes = d3.values (NGL.ColormakerRegistry.getSchemes());
        var ignoreColourSchemes = ["electrostatic", "volume", "geoquality", "moleculetype", "occupancy", "random", "value", "densityfit", "chainid"];
        var aliases = {"bfactor": "B Factor", uniform: "No Colouring", atomindex: "Atom Index", residueindex: "Residue Index", chainindex: "Chain Index", modelindex: "Model Index", resname: "Residue Name", chainname: "Chain Name", sstruc: "Sub Structure", entityindex: "Entity Index", entitytype: "Entity Type", partialcharge: "Partial Charge"};
        var labellabel = d3.set(["uniform", "chainindex", "chainname", "modelindex"]);
        var mainColourSchemes = _.difference (allColourSchemes, ignoreColourSchemes);
		       
        var colourChangeFunc = function () {
            if (self.xlRepr) {
				var value = d3.event.target.value;
                var schemeObj = {colorScheme: value || "uniform", colorScale: undefined, colorValue: 0x808080};
                // made colorscale undefined to stop struc and residue repr's having different scales (sstruc has RdYlGn as default)                   

                if (schemeObj.colorScheme !== "uniform") {
                    var structure = self.model.get("stageModel").get("structureComp").structure;
                    var scheme = NGL.ColormakerRegistry.getScheme ({scheme: schemeObj.colorScheme, structure: structure});
                    var newSchemeClass = function (params) {
                        this.subScheme = scheme; //params.subScheme;
                        this.greyness = 0.6;

                        this.atomColor = function (a) {
                            var c = this.subScheme.atomColor (a);
                            var notGrey = 1 - this.greyness;
                            var greyComp = 176 * this.greyness;

                            var cR = (((c & 0xff0000) >> 16) * notGrey) + greyComp;
                            var cG = (((c & 0xff00) >> 8) * notGrey) + greyComp;
                            var cB = ((c & 0xff) * notGrey) + greyComp;

                            return (cR << 16 | cG << 8 | cB);
                        };
                    };

                    schemeObj.colorScheme = NGL.ColormakerRegistry.addScheme (newSchemeClass, "custom");
                }

                self.options.colourScheme = schemeObj.colorScheme;
                self.xlRepr.updateOptions (self.options, ["colourScheme"]);   

                self.xlRepr.resRepr.setParameters (schemeObj);
                self.xlRepr.sstrucRepr.setParameters (schemeObj);
                self.xlRepr.labelRepr.setParameters (labellabel.has(self.options.colourScheme) ? schemeObj : {colorScheme: "uniform"});
            }
        };
        
        CLMSUI.utils.addMultipleSelectControls ({
            addToElem: toolbar,
            selectList: ["Colour Proteins By"], 
            optionList: mainColourSchemes, 
            optionLabelFunc: function (d) { return aliases[d] || d; },
            changeFunc: colourChangeFunc,
            initialSelectionFunc: function(d) { return d === self.options.colourScheme; }
        });
        

        this.chartDiv = flexWrapperPanel.append("div")
            .attr ({class: "panelInner", "flex-grow": 1, id: "ngl"})
        ;

        this.chartDiv.append("div").attr("class","overlayInfo").html("No PDB File Loaded"); 

        this.listenTo (this.model.get("filterModel"), "change", this.showFiltered);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model, "change:linkColourAssignment currentColourModelChanged", this.rerenderColours);   // if colour model changes internally, or is swapped for new one
        this.listenTo (this.model, "change:selection", this.showSelectedLinks);
        this.listenTo (this.model, "change:highlights", this.showHighlightedLinks);

        this.listenTo (this.model, "change:stageModel", function (model, newStageModel) {
            // swap out stage models and listeners
            var prevStageModel = model.previous("stageModel");
            CLMSUI.utils.xilog ("STAGE MODEL CHANGED", arguments, this, prevStageModel);
            if (prevStageModel) {
                this.stopListening (prevStageModel);    // remove old stagemodel linklist change listener
                prevStageModel.stopListening();
            }
            // set xlRepr to null on stage model change as it's now an overview of old data
            // (it gets reset to a correct new value in repopulate() when distancesObj changes - eventlistener above)
            // Plus keeping a value there would mean the listener below using it when a new linklist
            // was generated for the first time (causing error)
            //
            // Sequence from pdbfilechooser.js is 
            // 1. New stage model made 2. Stage model change event fired here - xlRepr set to null
            // 3. New linklist data generated 4. linklist change event fired here (but no-op as xlRepr === null)
            // 5. New distanceObj generated (making new xlRepr) 6. distanceObj change event fired here making new xlRepr
			if (this.xlRepr) {
				this.xlRepr.dispose();	// remove old mouse handlers or they keep firing and cause errors
				this.xlRepr = null; 
			}
            this.listenTo (newStageModel, "change:linkList", function (stageModel, newLinkList) {
                if (this.xlRepr) {
                    this.xlRepr._handleDataChange();
                }
            }); 
            // First time distancesObj fires we should setup the display for a new data set
            this.listenToOnce (this.model.get("clmsModel"), "change:distancesObj", function () {
                this
                    .setAssemblyChains()
                    .repopulate()
                ;
            });
        });
		
		this.listenTo (CLMSUI.vent, "proteinMetadataUpdated", function () {
			if (this.xlRepr) {
				this.xlRepr.redoChainLabels ();
			}
		});

    },
    
    setAssemblyChains: function () {
        var structure = this.model.get("stageModel").get("structureComp").structure;
        var biomolDict = structure.biomolDict;
        var dictEntry = biomolDict[this.options.defaultAssembly];
        var chainNames = dictEntry ? d3.merge (dictEntry.partList.map (function (part) { return part.chainList; })) : [];
        if (!chainNames.length) {
            structure.eachChain (function (cp) {
                chainNames.push (cp.chainname);
            });
        }
        var chainNameSet = d3.set (chainNames);
        this.model.get("clmsModel").get("distancesObj").setAllowedChainNameSet (chainNameSet);
        
        return this;
    },

    repopulate: function () {
        CLMSUI.utils.xilog ("REPOPULATE", this.model, this.model.get("stageModel"));
        var pdbID = this.model.get("stageModel").get("pdbBaseSeqID");
        var overText = "PDB File: " + (pdbID.length === 4 ?
            "<A class='outsideLink' target='_blank' href='https://www.rcsb.org/pdb/explore.do?structureId="+pdbID+"'>"+pdbID+"</A>" : pdbID)
			+" - "+this.model.get("stageModel").get("structureComp").structure.title
        ;      
		
		var interactors = Array.from (this.model.get("clmsModel").get("participants").values());
		var alignColl = this.model.get("alignColl");
        var pdbLengthsPerProtein = interactors.map (function (inter) {
        	var pdbFeatures = alignColl.getAlignmentsAsFeatures (inter.id);
			var contigPDBFeatures = CLMSUI.modelUtils.mergeContiguousFeatures (pdbFeatures);
			var totalLength = d3.sum (contigPDBFeatures, function (d) { return d.end - d.begin + 1; });
			//console.log ("protein", inter, pdbFeatures, contigPDBFeatures, totalLength);
			return totalLength;
        }, this);
		var totalPDBLength = d3.sum (pdbLengthsPerProtein);
		var totalProteinLength = CLMSUI.modelUtils.totalProteinLength (interactors);
		var pcent = d3.format(".0%")(totalPDBLength / totalProteinLength);
		var commaFormat = d3.format(",");
		
		overText += " - covers approx "+commaFormat(totalPDBLength)+" of "+commaFormat(totalProteinLength)+" AAs ("+pcent+")";	
        this.chartDiv.select("div.overlayInfo").html(overText);

        this.xlRepr = new CLMSUI.CrosslinkRepresentation (
            this.model.get("stageModel"),
            {
                chainRep: this.options.chainRep,
                defaultAssembly: this.options.defaultAssembly,
                selectedColor: "yellow",
                selectedLinksColor: "yellow",
                sstrucColor: "gray",
                displayedLabelColor: "black",
                displayedLabelVisible: this.options.labelVisible,
                colourScheme: this.options.colourScheme,
                showAllProteins: this.options.showAllProteins,
            }
        );
        
        this.showFiltered();
        return this;
    },

    render: function () {
        if (this.isVisible()) {
            this.showFiltered();
            CLMSUI.utils.xilog ("re rendering NGL view");
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
            var self = this;
            this.model.get("stageModel").get("structureComp").stage.makeImage({
                factor: 4,  // make it big so it can be used for piccy
                antialias: true,
                trim: true, // https://github.com/arose/ngl/issues/188
                transparent: true
            }).then( function( blob ){
                NGL.download (blob, self.filenameStateString()+".png" );
            });
        }
        return this;
    },

    centerView: function () {
        if (this.model.get("stageModel")) {
            this.model.get("stageModel").get("structureComp").stage.autoView(1000);
        }
        return this;
    },

    toggleLabels: function (event) {
        var bool = event.target.checked;
        this.options.labelVisible = bool;
        if (this.xlRepr) {
            this.xlRepr.options.displayedLabelVisible = bool;
            this.xlRepr.linkRepr.setParameters ({labelVisible: bool});
        }
        return this;
    },

    toggleResidues: function (event) {
        var bool = event.target.checked;
        this.options.showResidues = bool;
        if (this.xlRepr) {
            this.xlRepr.resRepr.setVisibility (bool);
        }
        return this;
    },

    toggleNonSelectedLinks: function (event) {
        var bool = event.target.checked;
        this.options.selectedOnly = bool;
        if (this.xlRepr) {
            this.xlRepr.linkRepr.setVisibility (!bool);
        }
        return this;
    },

    toggleShortestLinksOnly: function (event) {
        this.options.shortestLinksOnly = event.target.checked;
        //this.model.get("stageModel").set("linkFilter", this.options.shortestLinksOnly ? this.model.get("clmsModel").get("distancesObj").getShortestLinks () : null);
        this.showFiltered();
        return this;
    },
    
    toggleShowAllProteins: function (event) {
        var bool = event.target.checked;
        this.options.showAllProteins = bool;
        if (this.xlRepr) {
            this.xlRepr.options.showAllProteins = bool;
            this.xlRepr.defaultDisplayedProteins();
        }
        return this;
    },
	
	setChainLabelLength: function () {
		var checkedElem = d3.select(this.el).select("input.chainLabelLengthRB:checked");
		if (!checkedElem.empty()) {
			var value = checkedElem.property("value");
			this.options.chainLabelSetting = value;
			if (this.xlRepr) {
				this.xlRepr.options.chainLabelSetting = value;
				this.xlRepr.redoChainLabels ();
			}
		}
		return this;
	},

    rerenderColours: function () {
        if (this.xlRepr && this.isVisible()) {
            CLMSUI.utils.xilog ("rerendering ngl");
            // using update dodges setParameters not firing a redraw if param is the same (i.e. a colour entry has changed in the existing scheme)
            this.xlRepr.linkRepr.update({color: this.xlRepr.colorOptions.linkColourScheme});
            this.xlRepr.linkRepr.repr.viewer.requestRender();
        }
        return this;
    },

    showHighlightedLinks: function () {
        if (this.xlRepr && this.isVisible()) {
            this.xlRepr.setHighlightedLinks (this.xlRepr.crosslinkData.getLinks());
        }
        return this;
    },

    showSelectedLinks: function () {
        if (this.xlRepr && this.isVisible()) {
            this.xlRepr.setSelectedLinks (this.xlRepr.crosslinkData.getLinks());
        }
        return this;
    },

    showFiltered: function () {
        if (this.xlRepr && this.isVisible()) {
            //~ var crossLinks = this.model.get("clmsModel").get("crossLinks");
            var stageModel = this.model.get("stageModel");
            var filteredCrossLinks = this.model.getFilteredCrossLinks();
            var self = this;
            var filterFunc = function (linkList) {
                if (self.options.shortestLinksOnly) {
                    return self.model.get("clmsModel").get("distancesObj").getShortestLinks (linkList);
                }
                return linkList;
            };
            //this.xlRepr.crosslinkData.setLinkList (filteredCrossLinks, filterFunc);
            stageModel.setLinkList (filteredCrossLinks, filterFunc);
        }
        return this;
    },
    
    clearHighlighted: function () {
        if (this.xlRepr && this.isVisible()) {
            // next line eventually fires through an empty selection to showHighlighted above
            this.model.setMarkedCrossLinks ("highlights", [], false, false);
            this.model.get("tooltipModel").set("contents", null);
        }
        return this;
    },

    identifier: "NGL Viewer - PDB Structure",
    
    optionsToString: function () {  
        var abbvMap = {
            labelVisible: "LBLSVIS",
            selectedOnly: "SELONLY",
            showResidues: "RES",
            shortestLinksOnly: "SHORTONLY",
        };
        var fields = ["rep", "labelVisible", "selectedOnly", "showResidues", "shortestLinksOnly"];
        var optionsPlus = $.extend ({}, this.options);
        optionsPlus.rep = this.xlRepr.options.chainRep;

        return CLMSUI.utils.objectStateToAbbvString (optionsPlus, fields, d3.set(), abbvMap);
    },
    
    // Returns a useful filename given the view and filters current states
    filenameStateString: function () {
        return CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString()+"--"+this.identifier+"-"+this.optionsToString()+"-PDB="+this.xlRepr.pdbBaseSeqID+"--"+CLMSUI.utils.filterStateToString());
    },
});



CLMSUI.CrosslinkRepresentation = function (nglModelWrapper, params) {

    var defaults = {
        colourScheme: "uniform",
        chainRep: "cartoon",
        sstrucColor: "wheat",
        displayedLabelColor: "black",
        selectedLabelColor: "black",
        highlightedLabelColor: "black",
        displayedLabelVisible: false,
        selectedLabelVisible: true,
        highlightedLabelVisible: true,
        labelSize: 3.0,
        displayedResiduesColor: params.displayedColor || "lightgrey",
        displayedLinksColor: params.displayedColor || "lightblue",
        selectedResiduesColor: params.selectedColor || "lightgreen",
        selectedLinksColor: "lightgreen",
        highlightedLinksColor: params.highlightedColor || "orange",
    };
    this.options = _.extend({}, defaults, params);
    //this.options = p;
    //this.setParameters (p, true);

    this.setup (nglModelWrapper);

    this.stage.signals.clicked.add (this._selectionPicking, this);
    this.stage.signals.hovered.add (this._highlightPicking, this);
	this.stage.mouseControls.add('clickPick-left', function (stage, pickingProxy) {
		// so calls that reach here are those left clicks without ctrl
		if (!pickingProxy) {	// and if no pickingProxy i.e. nothing was clicked on
			// then blank the current selection
			nglModelWrapper.getModel().setMarkedCrossLinks ("selection", [], false, false);
		}
	});
};

CLMSUI.CrosslinkRepresentation.prototype = {

    constructor: CLMSUI.CrosslinkRepresentation,
    
    // just a way of accessing the main modelly bits more succintly
    setup: function (nglModelWrapper) {
        this.stage = nglModelWrapper.get("structureComp").stage;
        this.chainMap = nglModelWrapper.get("chainMap");
        this.structureComp = nglModelWrapper.get("structureComp");
        this.crosslinkData = nglModelWrapper;
        this.pdbBaseSeqID = nglModelWrapper.get("pdbBaseSeqID");
        this.origIds = {};
        
        this.colorOptions = {};
        this
            ._initColorSchemes()
            ._initStructureRepr()
            ._initLinkRepr()
            ._initLabelRepr()
            .updateAssemblyType()
        ;
        this.stage.autoView ();
    },

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
                    CLMSUI.utils.xilog ("dodgy pair", rl);
                }
            }, this);
            //CLMSUI.utils.xilog ("getAtomPairs", atomPairs);
        }

        return atomPairs;
    },
    
    _getAtomPairsFromResidue: function (residue) {
        var linkList = this.crosslinkData.getLinks (residue);
        return this._getAtomPairsFromLinks (linkList);
    },
    
    getPerChainAtomSelection: function (chainIndexSet) {
        var comp = this.structureComp.structure;
        var sels = [];
        comp.eachChain (function (cp) {
            // if chain longer than 10 resiudes and (no chainindexset present or chain index is in chainindexset)
            if (CLMSUI.modelUtils.isViableChain(cp) && (!chainIndexSet || chainIndexSet.has(cp.index)) ) {
				sels.push (cp.atomOffset);
            }
        });
        return "@"+sels.join(",");
    },
    
    updateAssemblyType: function (assemblyType) {
        assemblyType = assemblyType || this.options.defaultAssembly;
        this.structureComp.setDefaultAssembly (assemblyType);
        return this;
    },
    
    replaceChainRepresentation: function (newType) {
        if (this.sstrucRepr) {
            this.structureComp.removeRepresentation (this.sstrucRepr);
        }
        
        this.options.chainRep = newType;
        
        var chainSelector = this.defaultDisplayedProteins (true);   // true means the selection isn't enforced, just returned
        
        this.sstrucRepr = this.structureComp.addRepresentation (newType, {
            //color: this.sstrucColor,
            colorScheme: this.options.colourScheme,
            colorScale: null,
            name: "sstruc",
            opacity: 0.67,
            side: "front",
            sele: chainSelector
        });
        
        return this;
    },

    _initStructureRepr: function() {

        var comp = this.structureComp;
        var resSele = this.crosslinkData.getSelectionFromResidueList (this.crosslinkData.getResidues());
        var resEmphSele = this.crosslinkData.getSelectionFromResidueList ([]);

        this.replaceChainRepresentation (this.options.chainRep);

        this.resRepr = comp.addRepresentation ("spacefill", {
            sele: resSele,
            //color: this.displayedResiduesColor,
            colorScheme: this.options.colourScheme,
            //colorScale: ["#44f", "#444"],
            radiusScale: 0.6,
            name: "res"
        });

        this.resEmphRepr = comp.addRepresentation ("spacefill", {
            sele: resEmphSele,
            color: this.options.selectedResiduesColor,
            radiusScale: 0.9,
            opacity: 0.7,
            name: "resEmph"
        });

        return this;
    },

    _initLinkRepr: function() {

        var comp = this.structureComp;
        var links = this.crosslinkData.getLinks();

        var xlPair = this._getAtomPairsFromLinks (links);
        var xlPairEmph = this._getAtomPairsFromLinks (this.filterByLinkState (links, "selection"));
        var xlPairHigh = this._getAtomPairsFromLinks (this.filterByLinkState (links, "highlights"));
        var baseLinkScale = 3;
        
        this.linkRepr = comp.addRepresentation ("distance", {
            atomPair: xlPair,
            //colorValue: this.displayedLinksColor,
            colorScheme: this.colorOptions.linkColourScheme,
            labelSize: this.options.labelSize,
            labelColor: this.options.displayedLabelColor,
            labelVisible: this.options.displayedLabelVisible,
            labelUnit: "angstrom",
            labelZOffset: baseLinkScale * 2/3,
            radiusScale: baseLinkScale,
            opacity: 1,
            name: "link",
            side: "front",
            useCylinder: true,
        });

        this.linkEmphRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairEmph,
            colorValue: this.options.selectedLinksColor,
            labelSize: this.options.labelSize,
            labelColor: this.options.selectedLabelColor,
            labelVisible: this.options.selectedLabelVisible,
            labelBackground: true,
            labelBackgroundColor: this.options.selectedLinksColor,
            labelBackgroundOpacity: 0.6,
            labelUnit: "angstrom",
            labelZOffset: baseLinkScale * 2/3,
            radiusScale: baseLinkScale * 1.5,
            opacity: 0.6,
            name: "linkEmph",
            side: "front",
            useCylinder: true,
        });
        
        this.linkHighRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairHigh,
            colorValue: this.options.highlightedLinksColor,
            labelSize: this.options.labelSize,
            labelColor: this.options.highlightedLabelColor,
            labelVisible: this.options.highlightedLabelVisible,
            labelBackground: true,
            labelBackgroundColor: this.options.highlightedLinksColor,
            labelBackgroundOpacity: 0.6,
            labelUnit: "angstrom",
            labelZOffset: baseLinkScale * 2/3,
            radiusScale: baseLinkScale * 1.8,
            opacity: 0.4,
            name: "linkHigh",
            useCylinder: true,
        });
        
        return this;
    },
	
	getLabelTexts: function () {
		var comp = this.structureComp;
		var customText = {};
		var self = this;
		var verboseSetting = this.options.chainLabelSetting;
		
		var chainIndexToProteinMap = d3.map();
        d3.entries(self.crosslinkData.get("chainMap")).forEach (function (cmapEntry) {
            cmapEntry.value.forEach (function (chainData) {
                 chainIndexToProteinMap.set (chainData.index, cmapEntry.key);                     
            });
        });
        //CLMSUI.utils.xilog ("Chain Index to Protein Map", chainIndexToProteinMap);
		comp.structure.eachChain (function (chainProxy) {
			//console.log ("chain", chainProxy.index, chainProxy.chainname, chainProxy.residueCount, chainProxy.entity.description);
			var description = chainProxy.entity ? chainProxy.entity.description : "";
            var pid = chainIndexToProteinMap.get (chainProxy.index);
            if (pid && CLMSUI.modelUtils.isViableChain (chainProxy)) {
                var protein = self.crosslinkData.getModel().get("clmsModel").get("participants").get(pid);
                var pname = protein ? protein.name : "none";
                customText[chainProxy.atomOffset] = (verboseSetting === "None" ? "" : (pname + ":" + chainProxy.chainname + "(" +chainProxy.index+ ")" + (verboseSetting === "Verbose" ? " "+description : "")));
            }
        });
		
		return customText;
	},
    
    _initLabelRepr: function () {
        var customText = this.getLabelTexts ();
        
        var atomSelection = this.getPerChainAtomSelection ();
        //CLMSUI.utils.xilog ("LABEL SELE", atomSelection);
        this.labelRepr = this.structureComp.addRepresentation ("label", {
            color: "#222",
            radiusScale: 3.0,
            sele: atomSelection,
            labelType: "text",
            labelText: customText,
            showBackground: true,
            backgroundColor: "#ccc",
            backgroundOpacity: 0.6,
            name: "chainText",
        });
        
        return this;
    },

    _initColorSchemes: function () {
        var self = this;
        
        var linkColourScheme = function () { 
            var colCache = {};
            //var first = true;
            this.bondColor = function (b) {
                //if (first) {
                 //   CLMSUI.utils.xilog ("bond", b, b.atom1.resno, b.atom2.resno, b.atomIndex1, b.atomIndex2);
                 //   first = false;
                //}
                var origLinkId = self.origIds[b.atom1.resno+"-"+b.atom2.resno];
                if (!origLinkId) {
                     origLinkId = self.origIds[b.atom2.resno+"-"+b.atom1.resno];
                }
                var model = self.crosslinkData.getModel();
                var link = model.get("clmsModel").get("crossLinks").get(origLinkId);
                var colRGBString = model.get("linkColourAssignment").getColour(link);   // returns an 'rgb(r,g,b)' string
                var col24bit = colCache[colRGBString];
                if (col24bit === undefined) {
                    var col3 = d3.rgb (colRGBString);
                    col24bit = colRGBString ? (col3.r << 16) + (col3.g << 8) + col3.b : 255;
                    colCache[colRGBString] = col24bit; 
                }
                return col24bit;
            };
        };
        
        this.colorOptions.linkColourScheme = NGL.ColormakerRegistry.addScheme (linkColourScheme, "xlink");
        
        return this;
    },

    _highlightPicking: function (pickingData) {
        this._handlePicking (pickingData, "highlights", true);   
    },
    
    _selectionPicking: function (pickingData) {
        this._handlePicking (pickingData, "selection");   
    },
    
    makeTooltipCoords: function (nglMouseCoord) {
        var canv = $("#nglPanel canvas");
        var coff = canv.offset();
        return {pageX: coff.left + nglMouseCoord.x, pageY: coff.top + (canv.height() - nglMouseCoord.y)}; // y is inverted in canvas
    },
    
    getOriginalCrossLinks: function (nglCrossLinks) {
        var xlinks = this.crosslinkData.getModel().get("clmsModel").get("crossLinks");
        return nglCrossLinks.map (function (link) {
            return xlinks.get (link.origId);
        });
    },
    
    _handlePicking: function (pickingData, pickType, doEmpty) {
        var crosslinkData = this.crosslinkData;
        //CLMSUI.utils.xilog ("Picking Data", pickingData);
        var pdtrans = {residue: undefined, links: undefined, xlinks: undefined};
        var add = (false || (pickingData && (pickingData.ctrlKey || pickingData.shiftKey))) && (pickType === 'selection');  // should selection add to current selection?
        
        console.log ("pickingData", pickingData, pickType, add);
        
        if (pickingData) {
            var atom = pickingData.atom;
            var bond = pickingData.bond || pickingData.distance;    // pickingData.distance is now where picks are returned for crosslinks
            
            if (atom !== undefined && bond === undefined) {
                CLMSUI.utils.xilog ("picked atom", atom, atom.resno, atom.chainIndex);
                var residues = crosslinkData.findResidues (atom.resno, atom.chainIndex);
                if (residues) {
                    pdtrans.residue = residues[0];

                    // this is to find the index of the residue in searchindex (crosslink) terms
                    // thought I could rely on residue.resindex + chain.residueOffset but nooooo.....
                    var proteinId = CLMSUI.modelUtils.getProteinFromChainIndex (crosslinkData.get("chainMap"), pdtrans.residue.chainIndex);
                    var alignId = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, atom.chainname, atom.chainIndex);
                    // align from 3d to search index. resindex is 0-indexed so +1 before querying
                    //CLMSUI.utils.xilog ("alignid", alignId, proteinId);
                    var srindex = crosslinkData.getModel().get("alignColl").getAlignedIndex (pdtrans.residue.resindex + 1, proteinId, true, alignId); 

                    pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
                    pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                    //CLMSUI.utils.xilog (pdtrans.residue, "links", pdtrans.links); 
                    //CLMSUI.utils.xilog (crosslinkData.residueToAtomIndexMap, this.structureComp.structure.chainStore);
					
					var distances = pdtrans.xlinks.map (function (xlink) {
						var dist = crosslinkData.getModel().getSingleCrosslinkDistance (xlink);
						if (dist) { dist = d3.format(".2f")(dist); }
						return dist;
					});

                    var cp = this.structureComp.structure.getChainProxy (pdtrans.residue.chainIndex);
                    var protein = crosslinkData.getModel().get("clmsModel").get("participants").get(proteinId);
					//console.log ("cp", cp, pdtrans, this, this.structureComp);
                    crosslinkData.getModel().get("tooltipModel")
                        .set("header", "Cross-Linked with "+CLMSUI.modelUtils.makeTooltipTitle.residue (protein, srindex, ":"+cp.chainname))
                        .set("contents", CLMSUI.modelUtils.makeTooltipContents.multilinks (pdtrans.xlinks, protein.id, srindex, {"Distance (Å)": distances}))
                        .set("location", this.makeTooltipCoords (pickingData.canvasPosition))
                    ;
                    crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
                }
            } else if (bond !== undefined) {
                // atomIndex / resno’s output here are wrong, usually sequential (indices) or the same (resno’s)
                CLMSUI.utils.xilog ("picked bond", bond, bond.index, bond.atom1.resno, bond.atom2.resno, bond.atomIndex1, bond.atomIndex2);
                
                var bstructure = bond.structure;
                var ap1 = bstructure.getAtomProxy (bond.atomIndex1);    // (ai1)
                var ap2 = bstructure.getAtomProxy (bond.atomIndex2);    // (ai2)
                var rp1 = bstructure.getResidueProxy (ap1.residueIndex);
                var rp2 = bstructure.getResidueProxy (ap2.residueIndex);
                var c1 = rp1.chainIndex;
                var c2 = rp2.chainIndex;
                //CLMSUI.utils.xilog ("aaaa", rp1, rp2, c1, c2);

                var residuesA = crosslinkData.findResidues (rp1.resno, c1);
                var residuesB = crosslinkData.findResidues (rp2.resno, c2);
                CLMSUI.utils.xilog ("res", ap1.residueIndex, ap2.residueIndex, c1, c2, residuesA, residuesB);
                if (pickType === "selection") {
                    var selectionSelection = this.crosslinkData.getSelectionFromResidueList (residuesA.concat(residuesB));
                    CLMSUI.utils.xilog ("seleSele", selectionSelection);
                    this.structureComp.autoView (selectionSelection, 1000);
                }

                // CLMSUI.utils.xilog ("res", crosslinkData.getResidues(), crosslinkData.getLinks());
                if (residuesA && residuesB) {
                    pdtrans.links = crosslinkData.getSharedLinks (residuesA[0], residuesB[0]);       
                    pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
					
					var distance = crosslinkData.getModel().getSingleCrosslinkDistance (pdtrans.xlinks[0]);

                    crosslinkData.getModel().get("tooltipModel")
                        .set("header", CLMSUI.modelUtils.makeTooltipTitle.link())
                        .set("contents", CLMSUI.modelUtils.makeTooltipContents.link (pdtrans.xlinks[0], distance ? {distance: d3.format(".2f")(distance)+" Å"} : {}))
                        .set("location", this.makeTooltipCoords (pickingData.canvasPosition))
                    ;
                    crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
                }
            }
        }
        
        if (!pdtrans.links && doEmpty) {
            pdtrans.xlinks = [];
            crosslinkData.getModel().get("tooltipModel").set("contents", null); // Clear tooltip
        }
        //CLMSUI.utils.xilog ("pd and pdtrans", pickingData, pdtrans.xlinks);
        
        crosslinkData.getModel().setMarkedCrossLinks (pickType, pdtrans.xlinks, false, add);
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
        CLMSUI.utils.xilog ("HANDLE DATA CHANGE 3D");
        this.defaultDisplayedProteins();
        
        var links = this.crosslinkData.getLinks();
        
        this
            .setDisplayedResidues (this.crosslinkData.getResidues())
            .setSelectedResidues ([])
            .setDisplayedLinks (links)
            .setSelectedLinks (links)
        ;
    },
    
    defaultDisplayedProteins: function (getSelectionOnly) {
        var showableChains = this.getShowableChains();
        var chainSele = this.getShowProteinNGLSelection (showableChains);
        CLMSUI.utils.xilog ("showable chains", showableChains, chainSele);
        if (!getSelectionOnly) {
            this.sstrucRepr.setSelection (chainSele);
            if (this.labelRepr) {
                var labelSele = this.getPerChainAtomSelection (d3.set(showableChains.chainIndices));
                //CLMSUI.utils.xilog ("LABEL SELE", labelSele);
                this.labelRepr.setSelection (labelSele);
            }
        }
        return chainSele;
    },
    
    getShowableChains: function () {
        var protMap = CLMS.arrayFromMapValues(CLMSUI.compositeModelInst.get("clmsModel").get("participants"));
        var prots = Array.from(protMap).filter(function(prot) { return !prot.hidden; }).map(function(prot) { return prot.id; });
        
        var chainIndices;
        if (protMap.length !== prots.length && !this.options.showAllProteins) {
            chainIndices = prots.map (function (prot) {
                var protChains = this.chainMap[prot] || [];
                return _.pluck (protChains, "index");
            }, this);
        } else {
            chainIndices = d3.entries(this.chainMap).map (function (chainEntry) {
                return _.pluck (chainEntry.value, "index");
            });
        }
        chainIndices = d3.merge (chainIndices);
        CLMSUI.utils.xilog ("SHOW CHAINS", chainIndices);
        return {showAll: this.options.showAllProteins, chainIndices: chainIndices};
    },
    
    getShowProteinNGLSelection: function (showableChains) {
        var selectionString = "all";
        var showAll = showableChains.showAll || false;
        var chains = showableChains.chainIndices || [];
        
        if (!showAll) {
            var chainList = chains.map (function (chainIndex) {
                return {chainIndex: chainIndex};
            });
            selectionString = this.crosslinkData.getSelectionFromResidueList (chainList, {chainsOnly: true});
        }
        
        //CLMSUI.utils.xilog ("CHAIN SELE", selectionString);
        return selectionString;
    },
	
	redoChainLabels: function () {
		this.labelRepr.setParameters ({labelText: this.getLabelTexts()});		
        return this;
	},
    
    setDisplayedResidues: function (residues) {
        var a = performance.now();
        this.setResidues (residues, this.resRepr);
        CLMSUI.utils.xilog ("set displayed residues, time", performance.now() - a);
        return this;
    },

    setSelectedResidues: function (residues) {
        CLMSUI.utils.xilog ("set selected residues");
        return this.setResidues (residues, this.resEmphRepr);
    },
    
    setResidues: function (residues, residueRepr) {
        var availableResidues = this._getAvailableResidues (residues);
        residueRepr.setSelection (
            this.crosslinkData.getSelectionFromResidueList (availableResidues)
        );
        return this;
    },

    setDisplayedLinks: function (links) {
        return this.setLinks (links, this.linkRepr, undefined);
    },
    
    setSelectedLinks: function (links) {
        return this.setLinks (links, this.linkEmphRepr, "selection");
    },
    
    setHighlightedLinks: function (links) {
        return this.setLinks (links, this.linkHighRepr, "highlights");
    },
    
    setLinks: function (links, aLinkRepr, linkState) {
        var availableLinks = this._getAvailableLinks (this.filterByLinkState (links, linkState));
        var atomPairs = this._getAtomPairsFromLinks (availableLinks);
        aLinkRepr.setParameters ({
            atomPair: atomPairs,
        });
        return this;
    },
    
    filterByLinkState: function (links, linkState) {  
        if (linkState === undefined) { return links; }
        var selectedSet = d3.set (_.pluck (this.crosslinkData.getModel().getMarkedCrossLinks(linkState), "id"));
        return links.filter (function (l) {
            return selectedSet.has (l.origId);   
        });
    },

    dispose: function () {
        this.stage.signals.clicked.remove (this._selectionPicking, this);
        this.stage.signals.hovered.remove (this._highlightPicking, this);
		// console.log ("dispose called");
        // this.stage.removeAllComponents(); // calls dispose on each component, which calls dispose on each representation
        return this;
    },
    
    updateOptions: function (options, changeThese) {
        changeThese.forEach (function (changeThis) {
            this.options[changeThis] = options[changeThis];
        }, this);
        return this;
    }
};

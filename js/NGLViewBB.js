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
            "mousedown .panelInner": "checkCTRL",
        });
    },

    // Intercept whether a click on the 3d view had the ctrl key depressed, share it with the 3d crosslink model
    checkCTRL: function (evt) {
        if (this.xlRepr) {
            this.xlRepr.ctrlKey = evt.ctrlKey;
        }
    },

    initialize: function (viewOptions) {
        CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
        var self = this;

        var defaultOptions = {
            labelVisible: false,
            selectedOnly: false,
            showResidues: true,
            shortestLinksOnly: true,
            chainRep: "cartoon",
            colourScheme: "uniform",
            showAllProteins: false,
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        this.displayEventName = viewOptions.displayEventName;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;

        var buttonData = [
            {label: CLMSUI.utils.commonLabels.downloadImg+"PNG", class:"downloadButton", type: "button", id: "download"},
            {label: "Re-Centre", class: "centreButton", type: "button", id: "recentre"},
        ];

        var toolbar = flexWrapperPanel.append("div").attr("class", "nglToolbar nglDataToolbar");
        CLMSUI.utils.makeBackboneButtons (toolbar, self.el.id, buttonData);


        // Various view options set up, then put in a dropdown menu
        var toggleButtonData = [
            {initialState: this.options.labelVisible, class: "distanceLabelCB", label: "Distance Labels", id: "visLabel"},
            {initialState: this.options.selectedOnly, class: "selectedOnlyCB", label: "Selected Links Only", id: "selectedOnly"},
            {initialState: this.options.showResidues, class: "showResiduesCB", label: "Residues", id: "showResidues"},
            {initialState: this.options.shortestLinksOnly, class: "shortestLinkCB", label: "Shortest Link Option Only", id: "shortestOnly"},
            {initialState: this.options.showAllProteins, class: "showAllProteinsCB", label: "All Proteins", id: "showAllProteins"},
        ];
        toggleButtonData
            .forEach (function (d) {
                d.type = "checkbox";
                d.inputFirst = true;
            }, this)
        ;
        CLMSUI.utils.makeBackboneButtons (toolbar, self.el.id, toggleButtonData);

        var optid = this.el.id+"Options";
        toolbar.append("p").attr("id", optid);
        new CLMSUI.DropDownMenuViewBB ({
            el: "#"+optid,
            model: CLMSUI.compositeModelInst.get("clmsModel"),
            myOptions: {
                title: "Show ▼",
                menu: toggleButtonData.map (function(d) { return {id: self.el.id + d.id, func: null}; }),
                closeOnClick: false,
            }
        });


        // Protein view type dropdown
        var mainReps = NGL.RepresentationRegistry.names.slice().sort();
        var ignore = d3.set(["axes", "base", "contact", "distance", "helixorient", "hyperball", "label", "rocket", "trace", "unitcell", "validation"]);
        mainReps = mainReps.filter (function (rep) { return ! ignore.has (rep);});
        var repSection = toolbar
            .append ("label")
            .attr ("class", "btn")
                .append ("span")
                .attr("class", "noBreak")
                .text ("Chain Representation")
        ;
        repSection.append("select")
            .on ("change", function () {
                if (self.xlRepr) {
                    self.options.chainRep = d3.event.target.value;
                    self.xlRepr.updateOptions (self.options, ["chainRep"]);
                    self.xlRepr.replaceChainRepresentation (self.options.chainRep);
                }
            })
            .selectAll("option")
            .data (mainReps)
            .enter()
            .append("option")
            .text (function(d) { return d; })
            .property ("selected", function(d) { return d === self.options.chainRep; })
        ;
        
        // Residue colour scheme dropdown
        
        var mainColourSchemes = d3.values (NGL.ColormakerRegistry.getSchemes());
        var ignore = d3.set(["volume", "geoquality", "moleculetype", "occupancy", "random", "value", "entityindex", "entitytype", "densityfit", "chainid"]);
        var aliases = {"bfactor": "B Factor", uniform: "None", atomindex: "Atom Index", residueindex: "Residue Index", chainindex: "Chain Index", modelindex: "Model Index", resname: "Residue Name", chainname: "Chain Name", sstruc: "Sub Structure"};
        var labellable = d3.set(["uniform", "chainindex", "chainname", "modelindex"]);
        mainColourSchemes = mainColourSchemes.filter (function (rep) { return ! ignore.has (rep);});
        var colourSection = toolbar
            .append ("label")
            .attr ("class", "btn")
                .append ("span")
                .attr("class", "noBreak")
                .text ("Colour By")
        ;
        colourSection.append("select")
            .on ("change", function () {
                if (self.xlRepr) {
                    var index = d3.event.target.selectedIndex;
                    var schemeObj = {colorScheme: mainColourSchemes[index] || "uniform", colorScale: null};
                    // made colorscale null to stop struc and residue repr's having different scales (sstruc has RdYlGn as default)
                    self.options.colourScheme = schemeObj.colorScheme;
                    self.xlRepr.updateOptions (self.options, ["colourScheme"]);
                    self.xlRepr.resRepr.setParameters (schemeObj);
                    self.xlRepr.sstrucRepr.setParameters (schemeObj);
                    self.xlRepr.labelRepr.setParameters (labellable.has(self.options.colourScheme) ? schemeObj : {colorScheme: "uniform"});
                }
            })
            .selectAll("option")
            .data (mainColourSchemes)
            .enter()
            .append("option")
            .text (function(d) { return aliases[d] || d; })
            .property ("selected", function(d) { return d === self.options.colourScheme; })
        ;
        


        this.chartDiv = flexWrapperPanel.append("div")
            .attr ({class: "panelInner", "flex-grow": 1, id: "ngl"})
        ;

        this.chartDiv.append("div").attr("class","overlayInfo").html("No PDB File Loaded"); 

        this.listenTo (this.model.get("filterModel"), "change", this.showFiltered);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model, "change:linkColourAssignment", this.rerenderColours);   // if colour model used is swapped for new one
        this.listenTo (this.model, "currentColourModelChanged", this.rerenderColours); // if current colour model used changes internally
        this.listenTo (this.model, "change:selection", this.showSelected);
        this.listenTo (this.model, "change:highlights", this.showHighlighted);

        this.listenTo (this.model, "change:stageModel", function (model, newStageModel) {
            // swap out stage models and listeners
            var prevStageModel = model.previous("stageModel");
            console.log ("STAGE MODEL CHANGED", arguments, this, prevStageModel);
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
            this.xlRepr = null; 
            this.listenTo (newStageModel, "change:linkList", function (stageModel, newLinkList) {
                if (this.xlRepr) {
                    this.xlRepr._handleDataChange();
                }
            }); 
            // First time distancesObj fires we should setup the display for a new data set
            this.listenToOnce (this.model.get("clmsModel"), "change:distancesObj", function () {
                this.repopulate();
            });
        });

    },

    repopulate: function () {
        console.log ("REPOPULATE", this.model, this.model.get("stageModel"));
        var pdbID = this.model.get("stageModel").get("pdbBaseSeqID");
        var overText = "PDB File: " + (pdbID.length === 4 ?
            "<A class='outsideLink' target='_blank' href='http://www.rcsb.org/pdb/explore.do?structureId="+pdbID+"'>"+pdbID+"</A>" : pdbID
        );      
        this.chartDiv.select("div.overlayInfo").html(overText);

        this.xlRepr = new CLMSUI.CrosslinkRepresentation (
            this.model.get("stageModel"),
            {
                chainRep: this.options.chainRep,
                selectedColor: "yellow",
                selectedLinksColor: "yellow",
                sstrucColor: "gray",
                displayedLabelColor: "gray",
                displayedLabelVisible: this.options.labelVisible,
                colourScheme: this.options.colourScheme,
                showAllProteins: this.options.showAllProteins,
            }
        );
        
        this.showFiltered();
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
    },

    toggleResidues: function (event) {
        var bool = event.target.checked;
        this.options.showResidues = bool;
        if (this.xlRepr) {
            this.xlRepr.resRepr.setVisibility (bool);
        }
    },

    toggleNonSelectedLinks: function (event) {
        var bool = event.target.checked;
        this.options.selectedOnly = bool;
        if (this.xlRepr) {
            this.xlRepr.linkRepr.setVisibility (!bool);
        }
    },

    toggleShortestLinksOnly: function (event) {
        this.options.shortestLinksOnly = event.target.checked;
        //this.model.get("stageModel").set("linkFilter", this.options.shortestLinksOnly ? this.model.get("clmsModel").get("distancesObj").getShortestLinks () : null);
        this.showFiltered();
    },
    
    toggleShowAllProteins: function (event) {
        var bool = event.target.checked;
        this.options.showAllProteins = bool;
        if (this.xlRepr) {
            this.xlRepr.options.showAllProteins = bool;
            this.xlRepr.defaultDisplayedProteins();
        }
    },

    rerenderColours: function () {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
            // using update dodges setParameters not firing a redraw if param is the same (i.e. a colour entry has changed in the existing scheme)
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

    showFiltered: function () {
        if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el) && this.xlRepr) {
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
    },

    identifier: "NGL3D",
    
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
        displayedLabelColor: "grey",
        selectedLabelColor: "black",
        highlightedLabelColor: "black",
        displayedLabelVisible: false,
        selectedLabelVisible: true,
        highlightedLabelVisible: true,
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
        this._initColorSchemes ();
        this._initStructureRepr();
        this._initLinkRepr();
        this._initLabelRepr();
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

        // If no resnoList or is empty array make selection 'none'
        if (!resnoList || (Array.isArray (resnoList) && !resnoList.length)) {
            sele = "none";
        } else {
            // if resnoList == 'all' replace it with array of all residues
            if (resnoList === "all") {
                resnoList = this.crosslinkData.getResidues();
            }
            
            // if resnoList is single item, make it an array of the single item
            if (!Array.isArray (resnoList)) { resnoList = [resnoList]; }
            
            var cp = this.structureComp.structure.getChainProxy();
            
            // old way
            /*
            var tmp = resnoList.map (function (r) {
                cp.index = r.chainIndex;
                var rsele = r.resno;
                if (cp.chainname) { rsele += ":" + cp.chainname; }
                if (cp.modelIndex !== undefined) { rsele += "/" + cp.modelIndex; }
                return rsele;
            });
            
            sele = "( " + tmp.join(" OR ") + " ) AND .CA";    // old way, much slower parsing by ngl -4500ms for 3jco
            */
            
            // new way (faster ngl interpretation for big selections!)
            var modelTree = d3.map ();
            var tmp = resnoList.map (function (r) {
                cp.index = r.chainIndex;
                
                // Make a hierarchy of models --> chains --> residues to build a string from later
                var modelBranch = modelTree.get(cp.modelIndex);
                if (!modelBranch) {
                    var a = new d3.map();
                    modelTree.set (cp.modelIndex, a);
                    modelBranch = a;
                }
                
                var chainBranch = modelBranch.get(cp.chainname);
                if (!chainBranch) {
                    var a = new d3.set();
                    modelBranch.set (cp.chainname, a);
                    chainBranch = a;
                }
                
                chainBranch.add (r.resno);
            });    
            //console.log ("MODELTREE", modelTree);
            
            // Build an efficient selection string out of this tree i.e. don't repeat model and chain values for
            // every residue, group the relevant residues together and surround with a bracket
            var modParts = modelTree.entries().map (function (modelEntry) {
                var modelBranch = modelEntry.value;
                var perChainResidues = modelBranch.entries().map (function (chainEntry) {
                    var chainBranch = chainEntry.value;
                    // selection syntax picks up ":123" as residue 123 in chain "empty name",
                    // but ": AND 123" doesn't work. Shouldn't have many pdbs with empty chain names though.
                    if (chainEntry.key) {
                        return "( :"+chainEntry.key+" AND ("+chainBranch.values().join(" OR ")+") )";
                    } else {
                        var emptyChainNameRes = chainBranch.values().map (function (resVal) {
                            return resVal+":";
                        });
                        return "( "+emptyChainNameRes.join(" OR ")+")";
                    }
                });
                return "( /"+modelEntry.key+" AND ("+perChainResidues.join(" OR ")+") )";
            });
            
            var sele = "(" + modParts.join(" OR ") +" ) AND .CA";
            //console.log ("SELE", sele);
        }

        return sele;
    },
    
    getFirstResidueInEachChain: function () {
        var comp = this.structureComp.structure;
        var rp = comp.getResidueProxy();
        var sels = [];
        comp.eachChain (function (cp) {
            if (cp.residueCount > 10) {
                rp.index = cp.residueOffset;
                sels.push ({resno: rp.resno, chainIndex: cp.index});
            }
        });
        
        return this._getSelectionFromResidue (sels);
    },
    
    replaceChainRepresentation: function (newType) {
        if (this.sstrucRepr) {
            this.structureComp.removeRepresentation (this.sstrucRepr);
        }
        
        this.options.chainRep = newType;
        
        this.sstrucRepr = this.structureComp.addRepresentation (newType, {
            //color: this.sstrucColor,
            colorScheme: this.options.colourScheme,
            colorScale: null,
            name: "sstruc",
            opacity: 0.67,
            side: "front",
        });
        
        this.defaultDisplayedProteins();
    },

    _initStructureRepr: function() {

        var comp = this.structureComp;
        var resSele = this._getSelectionFromResidue (this.crosslinkData.getResidues());
        var resEmphSele = this._getSelectionFromResidue ([]);

        this.replaceChainRepresentation (this.options.chainRep);

        console.log ("before residue spacefill rep", performance.now());
        this.resRepr = comp.addRepresentation ("spacefill", {
            sele: resSele,
            //color: this.displayedResiduesColor,
            colorScheme: this.options.colourScheme,
            //colorScheme: "hydrophobicity",
            //colorScale: ["#44f", "#444"],
            scale: 0.6,
            name: "res"
        });
        
        console.log ("after residue spacefill rep", performance.now());

        this.resEmphRepr = comp.addRepresentation ("spacefill", {
            sele: resEmphSele,
            color: this.options.selectedResiduesColor,
            scale: 0.9,
            opacity: 0.7,
            name: "resEmph"
        });

        this.stage.autoView ();
    },

    _initLinkRepr: function() {

        var comp = this.structureComp;
        var links = this.crosslinkData.getLinks();

        var xlPair = this._getAtomPairsFromLinks (links);
        var xlPairEmph = this._getAtomPairsFromLinks (this.filterByModelLinkArray (links, "selection"));
        var xlPairHigh = this._getAtomPairsFromLinks (this.filterByModelLinkArray (links, "highlights"));
        var baseLinkScale = 3;
        var labelSize = 2.0;
        
        this.linkRepr = comp.addRepresentation ("distance", {
            atomPair: xlPair,
            //colorValue: this.displayedLinksColor,
            colorScheme: this.colorOptions.linkColourScheme,
            labelSize: labelSize,
            labelColor: this.options.displayedLabelColor,
            labelVisible: this.options.displayedLabelVisible,
            labelUnit: "angstrom",
            scale: baseLinkScale,
            opacity: 1,
            name: "link",
            side: "front",
        });

        this.linkEmphRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairEmph,
            colorValue: this.options.selectedLinksColor,
            labelSize: labelSize,
            labelColor: this.options.selectedLabelColor,
            labelVisible: this.options.selectedLabelVisible,
            labelUnit: "angstrom",
            scale: baseLinkScale * 1.5,
            opacity: 0.6,
            name: "linkEmph",
            side: "front",
        });
        
        this.linkHighRepr = comp.addRepresentation ("distance", {
            atomPair: xlPairHigh,
            colorValue: this.options.highlightedLinksColor,
            labelSize: labelSize,
            labelColor: this.options.highlightedLabelColor,
            labelVisible: this.options.highlightedLabelVisible,
            labelUnit: "angstrom",
            scale: baseLinkScale * 1.8,
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
            var pid = CLMSUI.modelUtils.getProteinFromChainIndex (self.crosslinkData.get("chainMap"), atomProxy.chainIndex);
            if (pid) {
                var protein = self.crosslinkData.getModel().get("clmsModel").get("participants").get(pid);
                var pname = protein ? protein.name : "none";
                customText[atomProxy.index] = pname + ":" + atomProxy.chainname + "(" +atomProxy.chainIndex+ ")";
            }
        }, selectionObject);
        
        
        this.labelRepr = comp.addRepresentation ("label", {
            color: "#222",
            scale: 3.0,
            sele: selection,
            labelType: "text",
            labelText: customText,
            name: "chainText",
        });
        
    },

    _initColorSchemes: function () {
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
        
        // Hydrophobicity scheme but with red-blue colour scale
        /*
        var hscheme = function () {
            var underScheme =  NGL.ColormakerRegistry.getScheme ({scheme: "hydrophobicity", scale:"RdBu"});
            
            this.atomColor = function (a) {
                return underScheme.atomColor (a);
            };
        };
        */
        
        this.colorOptions.linkColourScheme = NGL.ColormakerRegistry.addScheme (linkColourScheme, "xlink");
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
    
    //makeSelectionString
    
    _handlePicking: function (pickingData, pickType, doEmpty) {
        var crosslinkData = this.crosslinkData;
        var atom = pickingData.atom;
        var bond = pickingData.bond;
        var pdtrans = {residue: undefined, links: undefined, xlinks: undefined};
        var add = (false || this.ctrlKey) && (pickType === 'selection');  // should selection add to current selection?
        //console.log ("pickingData", pickingData);

        if (atom !== undefined && bond === undefined) {
            console.log ("picked atom", atom, atom.resno, atom.chainIndex);
            var residues = crosslinkData.findResidues (atom.resno, atom.chainIndex);
            if (residues) {
                pdtrans.residue = residues[0];
                
                // this is to find the index of the residue in searchindex (crosslink) terms
                // thought I could rely on residue.resindex + chain.residueOffset but nooooo.....
                var proteinId = CLMSUI.modelUtils.getProteinFromChainIndex (crosslinkData.get("chainMap"), pdtrans.residue.chainIndex);
                var alignId = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, atom.chainname, atom.chainIndex);
                // align from 3d to search index. resindex is 0-indexed so +1 before querying
                console.log ("alignid", alignId, proteinId);
                var srindex = crosslinkData.getModel().get("alignColl").getAlignedIndex (pdtrans.residue.resindex + 1, proteinId, true, alignId); 
                
                pdtrans.links = crosslinkData.getLinks (pdtrans.residue);
                pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                console.log (pdtrans.residue, "links", pdtrans.links); 
                console.log (crosslinkData.residueToAtomIndexMap, this.structureComp.structure.chainStore);
                
                var cp = this.structureComp.structure.getChainProxy (pdtrans.residue.chainIndex);
                var protein = crosslinkData.getModel().get("clmsModel").get("participants").get(proteinId);
                crosslinkData.getModel().get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.residue (protein, srindex, ":"+cp.chainname))
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.multilinks (pdtrans.xlinks, protein.id, srindex))
                    .set("location", this.makeTooltipCoords (pickingData.canvasPosition))
                ;
                crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
            }
        } else if (bond !== undefined) {
            // atomIndex / resno’s output here are wrong, usually sequential (indices) or the same (resno’s)
            console.log ("picked bond", bond.index, bond.atom1.resno, bond.atom2.resno, bond.atomIndex1, bond.atomIndex2);

            // this line worked with one distance rep, but not with two or more
            // var altBondStore = this.linkRepr.repr.dataList[0].bondStore; // distance rep bondstore
            
            // match distanceRepresentation object by returning geometry buffer id from picking data and seeing 
            // which distanceRepresentation has the same geometry buffer - hacky but not as hacky as before
            var getBondStore = function (geom_id) {
                var correctLinkRep = [this.linkRepr, this.linkEmphRepr, this.linkHighRepr].filter (function (linkRep) {
                    return linkRep.repr.cylinderBuffer && linkRep.repr.cylinderBuffer.geometry.uuid === geom_id;
                })[0];
                //console.log ("crl", correctLinkRep);
                return correctLinkRep.repr.dataList[0].bondStore;
            };
            /*
            var getBondStore = function (aLinkRepr) {
                var dl = aLinkRepr.repr.dataList;
                console.log ("dl", dl);
                return dl.length ? dl[0].bondStore : {count : 0};
            };
            */
            //console.log ("linkReps", this.linkRepr, this.linkEmphRepr, this.linkHighRepr);
            var bstructure = bond.structure;
            /*
            var curLinkBondStore = getBondStore (this.linkRepr);    // distance rep bondstore
            var selLinkBondStore = getBondStore (this.linkEmphRepr);    // selected rep bondstore
            var highLinkBondStore = getBondStore (this.linkHighRepr);    // selected rep bondstore
            //console.log ("pp", pickingData.gid, bstructure.atomCount, selLinkBondStore, highLinkBondStore);
            var gid = pickingData.gid - bstructure.atomCount;
            // gids seemed to be assigned to bonds in reverse order by representation
            var altBondStore = (gid > highLinkBondStore.count + selLinkBondStore.count) ?
                curLinkBondStore : (gid > highLinkBondStore.count ? selLinkBondStore : highLinkBondStore)
            ;
            */
            var altBondStore = getBondStore.call (this, pickingData.geom_id);
            //console.log ("abs", altBondStore);
            
            var ai1 = altBondStore.atomIndex1 [bond.index];
            var ai2 = altBondStore.atomIndex2 [bond.index];
            //console.log ("bondStores", pickingData.gid, bond.bondStore, curLinkBondStore, selLinkBondStore, this.linkRepr, this.linkEmphRepr);
           
            var ap1 = bstructure.getAtomProxy (ai1);
            var ap2 = bstructure.getAtomProxy (ai2);
            var rp1 = bstructure.getResidueProxy (ap1.residueIndex);
            var rp2 = bstructure.getResidueProxy (ap2.residueIndex);
            var c1 = rp1.chainIndex;
            var c2 = rp2.chainIndex;

            // rp1 and rp2 are now correct and I can grab data through the existing crosslinkData interface
            // console.log ("atom to resno's", aStore, ri1, ri2, r1, r2);
           // var residuesA = crosslinkData.findResidues (r1, bond.atom1.chainIndex);
            //var residuesB = crosslinkData.findResidues (r2, bond.atom2.chainIndex);
            var residuesA = crosslinkData.findResidues (rp1.resno, c1);
            var residuesB = crosslinkData.findResidues (rp2.resno, c2);
            console.log ("res", ap1.residueIndex, ap2.residueIndex, c1, c2, residuesA, residuesB);
            if (pickType === "selection") {
                var selectionSelection = this._getSelectionFromResidue (residuesA.concat(residuesB));
                console.log ("seleSele", selectionSelection);
                this.structureComp.autoView (selectionSelection, 1000);
            }

            // console.log ("res", crosslinkData.getResidues(), crosslinkData.getLinks());
            if (residuesA && residuesB) {
                pdtrans.links = crosslinkData.getSharedLinks (residuesA[0], residuesB[0]);       
                pdtrans.xlinks = this.getOriginalCrossLinks (pdtrans.links);
                
                crosslinkData.getModel().get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.link())
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.link (pdtrans.xlinks[0]))
                    .set("location", this.makeTooltipCoords (pickingData.canvasPosition))
                ;
                crosslinkData.getModel().get("tooltipModel").trigger ("change:location");
            }
        }
        
        if (!pdtrans.links && doEmpty) {
            pdtrans.xlinks = [];
        }
        console.log ("pd and pdtrans", pickingData, pdtrans.xlinks);
        
        crosslinkData.getModel().calcMatchingCrosslinks (pickType, pdtrans.xlinks, false, add);
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
        this.defaultDisplayedProteins();
        
        this.setDisplayedResidues (this.crosslinkData.getResidues());
        this.setSelectedResidues ([]);

        this.setDisplayedLinks (this.crosslinkData.getLinks());
        this.setSelectedLinks (this.crosslinkData.getLinks());
    },
    
    defaultDisplayedProteins: function () {
        var protsAll = CLMS.arrayFromMapValues(CLMSUI.compositeModelInst.get("clmsModel").get("participants"));
        var prots = protsAll.filter(function(prot) { return !prot.hidden; }).map(function(prot) { return prot.id; });
        var showAll = protsAll.length === prots.length;
        //console.log ("prots", prots, showAll);
        this.setDisplayedProteins (prots, showAll);
    },
    
    setDisplayedProteins: function (proteins, showAll) {
        proteins = proteins || [];
        //console.log ("chainmap", this.chainMap, this, this.stage);
        var selectionString = "";
        if (!showAll && !this.options.showAllProteins) {
            var cp = this.structureComp.structure.getChainProxy();
            var chainSelection = proteins.map (function (prot) {
                var protChains = this.chainMap[prot] || [];
                return protChains.map (function (chainData) {
                    cp.index = chainData.index;
                    return ":"+cp.chainname+"/"+cp.modelIndex;
                });
            }, this);
            var flatChainSelection = d3.merge (chainSelection);
            selectionString = flatChainSelection.length ? flatChainSelection.join(" or ") : "none";
        }
        //console.log ("disp prot results", proteins, flatChainSelection, selectionString);
        
        this.sstrucRepr.setSelection(selectionString);
        if (this.labelRepr) {
            this.labelRepr.setSelection(selectionString);
        }
    },

    setDisplayedResidues: function (residues) {
        console.log ("setdisplayed resiudes");
        var availableResidues = this._getAvailableResidues (residues);
        this.resRepr.setSelection (
            this._getSelectionFromResidue (availableResidues)
        );
    },

    setSelectedResidues: function (residues) {
        console.log ("set selected residuees");
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
        var atomPairs = this._getAtomPairsFromLinks (availableLinks);
        this.linkEmphRepr.setParameters ({
            atomPair: atomPairs,
        });
        console.log ("ATOMPAIRS", atomPairs);
    },
    
    setHighlightedLinks: function (links) {
        var availableLinks = this._getAvailableLinks (this.filterByModelLinkArray (links, "highlights"));
        if (this.linkHighRepr) {
            this.linkHighRepr.setParameters ({
                atomPair: this._getAtomPairsFromLinks (availableLinks),
            });
        }
    },

    dispose: function () {
        this.stage.signals.clicked.remove (this._selectionPicking, this);
        this.stage.signals.hovered.remove (this._highlightPicking, this);

        // this.stage.removeAllComponents(); // calls dispose on each component, which calls dispose on each representation
    },
    
    updateOptions: function (options, changeThese) {
        changeThese.forEach (function (changeThis) {
            this.options[changeThis] = options[changeThis];
        }, this);
    }
};

//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js


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
            
            console.log("arg options", viewOptions);
            var defaultOptions = {
                //~ xlabel: "Distance",
                //~ ylabel: "Count",
                //~ seriesName: "Cross Links",
                //~ chartTitle: "Distogram",
                //~ maxX: 80
                labelVisible: false,
                selectedOnly: false,
                showResidues: true,
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            //~ this.precalcedDistributions = {};
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
                //.style ("border", "1px solid yellow")
            ;
 
            //this.chartDiv.selectAll("*").remove();
            
           //create 3D network viewer
            this.stage = new NGL.Stage( "ngl" );//this.chartDiv[0][0] );
            this.stage.loadFile( "rcsb://1AO6", { sele: ":A" } )
                .then (function (structureComp) {

                    var sequences = CLMSUI.modelUtils.getSequencesFromNGLModel (self.stage, self.model.get("clmsModel"));
                    console.log ("stage", self.stage, "\nhas sequences", sequences);
                    // hacky thing to alert anything else interested the sequences are available as we are inside an asynchronous callback
                    self.model.trigger ("3dsync", sequences);

                    console.log ("strcomp", structureComp);

                    // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)
                    var crossLinks = self.model.get("clmsModel").get("crossLinks");
                    var filterCrossLinks = self.filterCrossLinks (crossLinks);
                    var crosslinkData = new CLMSUI.CrosslinkData (self.makeLinkList (filterCrossLinks, structureComp.structure.residueStore));

                   self.xlRepr = new CLMSUI.CrosslinkRepresentation(
                          self.model, self.stage, self.align, structureComp, crosslinkData, {
                                 highlightedColor: "lightgreen",
                                 highlightedLinksColor: "yellow",
                                 sstrucColor: "wheat",
                                 displayedDistanceColor: "tomato",
                                displayedDistanceVisible: self.options.labelVisible,
                          }
                   );

                    //console.log ("xlRepr", self.xlRepr);
                    //console.log ("crossLinks", crossLinks);
                    var dd = self.xlRepr.getDistances ();
                    //console.log ("distances", [dd]);
                    self.model.trigger ("distancesAvailable", [dd]);

                    self.listenTo (self.model.get("filterModel"), "change", self.showFiltered);    // any property changing in the filter model means rerendering this view
                    self.listenTo (self.model, "change:linkColourAssignment", self.showFiltered);
                    self.listenTo (self.model, "currentColourModelChanged", self.showFiltered); // if distance color model changes
                    self.listenTo (self.model, "change:selection", self.showFiltered);
                })
            ;      
        },
        
        showSelected: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                var selectedCrossLinks = this.model.get("selection");
                var filteredCrossLinks = this.filterCrossLinks (selectedCrossLinks);
                var linkList = this.makeLinkList (filteredCrossLinks, this.xlRepr.structureComp.structure.residueStore);
                this.xlRepr.crosslinkData.setLinkList (linkList);
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
            this.xlRepr.linkRepr.setParameters ({
                labelVisible: chk,
            });
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
        
        transformLinkList: function( linkList, chainname, structureId, residueStore ){

            chainname = chainname === undefined ? "A" : chainname;

            var tLinkList = [];
            //var nextLinkId = 0;
            var nextResidueId = 0;

            var residueDict = {};
            function getResidueId( resIndex ){
                // TODO add structureId to key
                // TODO in NMR structures there are multiple models
                var key = resIndex + ":" + chainname;
                if( residueDict[ key ] === undefined ){
                    residueDict[ key ] = nextResidueId;
                    nextResidueId += 1;
                }
                return residueDict[ key ];
            }

            tLinkList = linkList.map( function(rl, i) {
                return {
                    origId: rl.id,
                    linkId: i,
                    residueA: {
                        resindex: rl.fromResidue,
                        residueId: getResidueId( rl.fromResidue ),
                        resno: residueStore.resno [rl.fromResidue], // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainname: chainname,
                        structureId: structureId
                    },
                    residueB: {
                        resindex: rl.toResidue,
                        residueId: getResidueId( rl.toResidue ),
                        resno: residueStore.resno [rl.toResidue],   // ngl resindex to resno conversion, as Selection() works with resno not resindex
                        chainname: chainname,
                        structureId: structureId
                    }
                };
            } );

            return tLinkList;
        },
    });

CLMSUI.CrosslinkData = function( linkList ){

    this.signals = {
        linkListChanged: new NGL.Signal()
    };

    this.setLinkList( linkList );

};

CLMSUI.CrosslinkData.prototype = {

    setLinkList: function( linkList ){

        var linkIdToResidueIds = {};
        var residueIdToLinkIds = {};

        var linkIdToLink = {};
        var residueIdToResidue = {};

        var residueList = [];


        linkList.forEach( function( rl ){
            linkIdToResidueIds[ rl.linkId ] = [
                rl.residueA.residueId,
                rl.residueB.residueId
            ];
            linkIdToLink[ rl.linkId ] = rl;
        } );

        function insertResidue( residue, link ){
            var list = residueIdToLinkIds[ residue.residueId ];
            if( list === undefined ){
                residueIdToLinkIds[ residue.residueId ] = [ link.linkId ];
            }else if( list.indexOf( link.linkId ) === -1 ){
                list.push( link.linkId );
            }
            residueIdToResidue[ residue.residueId ] = residue;
        }

        linkList.forEach( function( rl ){
            insertResidue( rl.residueA, rl );
            insertResidue( rl.residueB, rl );
        } );

        for( var residueId in residueIdToResidue ){
            residueList.push( residueIdToResidue[ residueId ] );
        }

        //

        this._linkIdToResidueIds = linkIdToResidueIds;
        this._residueIdToLinkIds = residueIdToLinkIds;

        this._linkIdToLink = linkIdToLink;
        this._residueIdToResidue = residueIdToResidue;

        //console.log ("stlinklist", linkList, linkIdToLink);
        this._linkList = linkList;
        this._residueList = residueList;

        this.signals.linkListChanged.dispatch();

    },

    getLinks: function( residue ){

        if( residue === undefined ){

            return this._linkList;

        }else{
            var linkIds = this._residueIdToLinkIds[ residue.residueId ];
            var links = linkIds ? linkIds.map (function(l) {
                return this._linkIdToLink[l];
            }) : [];

            return links;
        }

    },

    getResidues: function( link ){

        if( link === undefined ){

            return this._residueList;

        }else if( Array.isArray( link ) ){

            var residues = [];
            link.forEach( function( l ){
                residues.push( l.residueA, l.residueB );
            } );
            return residues;

        }else{

            return [ link.residueA, link.residueB ];

        }

    },

    findLinks: function( residueA, residueB ){
        var idA = residueA.residueId;
        var idB = residueB.residueId;
        
        var links = this.getLinks().filter (function (l) {
            return l.residueA.residueId === idA && l.residueB.residueId === idB;
        });

        return links.length ? links : false;
    },
    
    findLinks2: function (residue) {
        var id = residue.residueId;
        
        var links = this.getLinks().filter (function (l) {
            return l.residueA.residueId === id || l.residueB.residueId === id;
        });

        return links.length ? links : false;
    },

    findResidues: function( resno, chainname ){
        var residues = this.getResidues().filter (function (r) {
            return r.resno === resno && r.chainname === chainname;
        });

        console.log ("find r", resno, chainname, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function( residue ){
        var id = residue.residueId;
        return this._residueIdToResidue[ id ] === undefined ? false : true;
    },

    hasLink: function( link ){
        var id = link.linkId;
        return this._linkIdToLink[ id ] === undefined ? false : true;
    }

};


CLMSUI.CrosslinkRepresentation = function( CLMSmodel, stage, alignFunc, structureComp, crosslinkData, params ){

    var defaults = {
        sstrucColor: "wheat",
        displayedDistanceColor: "tomato",
        highlightedDistanceColor: "white",
        displayedDistanceVisible: false,
        highlightedDistanceVisible: true,
        displayedResiduesColor: params.displayedColor ? undefined : "lightgrey",
        displayedLinksColor: params.displayedColor ? undefined : "lighblue",
        highlightedResiduesColor: params.highlightedColor ? undefined : "lightgreen",
        highlightedLinksColor: params.highlightedColor ? undefined : "lightgreen",
    };
    var p = _.extend({}, defaults, params);
    this.setParameters( p, true );


    this.model = CLMSmodel;
    this.stage = stage;
    this.alignFunc = alignFunc;
    this.structureComp = structureComp;
    this.crosslinkData = crosslinkData;
    this.origIds = {};

    
    this._displayedResidues = this.crosslinkData.getResidues();
    this._highlightedResidues = [];


    this.colorOptions = {};
    this._initColorSchemes();

    this._initStructureRepr();
    this._initLinkRepr();
    
    console.log ("stage", this.stage);

    this.stage.signals.clicked.add(
        this._handlePicking, this
    );
    this.crosslinkData.signals.linkListChanged.add(
        this._handleDataChange, this
    );
};

CLMSUI.CrosslinkRepresentation.prototype = {

    constructor: CLMSUI.CrosslinkRepresentation,

    _getAtomPairsFromLink: function( linkList ){

        var atomPairs = [];

        if( !linkList || ( Array.isArray( linkList ) && !linkList.length ) ){

            // atomPairs = [];

        }else if( linkList === "all" ){

            atomPairs = this._getAtomPairsFromResidue();

        }else{

            //console.log ("linkList", linkList);
            var resToSele = this._getSelectionFromResidue;
            linkList.forEach( function( rl ){
  
                var selA = resToSele (rl.residueA, false);
                var selB = resToSele (rl.residueB, false);

                if( selA && selB ){
                    atomPairs.push( [selA, selB, rl.origId] );
                    this.origIds[rl.residueA.resno+"-"+rl.residueB.resno] = rl.origId;
                } else {
                    console.log ("dodgy pair", rl);
                }

            }, this);
            
             //console.log ("getAtomPairs", linkList, this.origIds);
        }

        return atomPairs;
    },
    
    _getAtomObjectPairsFromLink: function( linkList ){

        var atomPairs = [];

        if( !linkList || ( Array.isArray( linkList ) && !linkList.length ) ){

            // atomPairs = [];

        }else if( linkList === "all" ){

            atomPairs = this._getAllAtomObjectPairs();

        }else{

            var structure = this.structureComp.structure;
            var resToSele = this._getSelectionFromResidue;
            var sele1 = new NGL.Selection();
            var sele2 = new NGL.Selection();

            atomPairs = linkList.map ( function( rl ){
                var selA = resToSele( rl.residueA, false);
                var selB = resToSele( rl.residueB, false );
                sele1.setString (selA);
                sele2.setString (selB);
                var a3 = structure.getAtomIndices (sele1);
                var a4 = structure.getAtomIndices (sele2);
                //console.log (rl.residueA, rl.residueB, selA, selB, a3, a4);
                return [a3[0], a4[0]]; // don't filter out null/undefined a1/a2s; ensures atomPair array index order matches linklist array order
            } );

        }

        return atomPairs;
    },
    
    _getAllAtomObjectPairs: function() {
        return this._getAtomObjectPairsFromLink (this.crosslinkData.getLinks());
    },
    
    
    getLinkDistances: function (atomObjPairs) {
        var ap1 = this.structureComp.structureView.getAtomProxy();
        var ap2 = this.structureComp.structureView.getAtomProxy();
        return atomObjPairs.map (function (pair) {
            
            return pair[0] && pair[1] ? pair[0].distanceTo (pair[1]) : undefined;    
        }); 
    },
    
    getDistances: function () {
        //console.log ("this dist", this.structureComp, this.stage);  
        
        var prots = this.model.get("clmsModel").get("interactors").values();
        var protsArr = Array.from (prots);
        protsArr = protsArr.filter (function(p) { return !p.is_decoy; });
        
        var matrix;
        var prot = protsArr[0];
        
        if (prot.size < 600) {
            var atomIndices = this.getCAtomsAllResidues (prot);
            //console.log ("ai", atomIndices);
            
            var ap1 = this.structureComp.structureView.getAtomProxy();
            var ap2 = this.structureComp.structureView.getAtomProxy();
            matrix = [[]];
            for (var n = 1; n < atomIndices.length; n++) {
                var nindex = atomIndices[n];
                ap1.index = nindex;
                matrix[n] = [undefined];
                for (var m = 1; m < atomIndices.length; m++) {
                    var d = undefined;
                    var mindex = atomIndices[m];
                    if (m !== n) {
                        ap2.index = mindex;
                        if (mindex !== undefined && nindex !== undefined) {
                            d = ap1.distanceTo(ap2);
                        }
                    } else {
                        d = 0;
                    }
                    matrix[n][m] = d;
                }
            }
            
            
        } else {
            

        }
        
        return {"proteinID": prot.id, "distances": matrix};
    },
    
    getCAtomsAllResidues : function (prot) {
        var rp = this.structureComp.structure.residueStore;
        var pid = prot.id;
        var sele = new NGL.Selection();
        var atomIndices = [undefined];  // 1-indexed array so first entry (0) is undefined
        
        for (var n = 1; n < prot.size; n++) {
            var index = this.alignFunc (n, pid, false) - 1;
            if (index >= 0) {
                var resno = rp.resno[index];
                //console.log ("align", n, index, resno);
                var selString = resno+" AND .CA";
                sele.setString (selString);
                var a = this.structureComp.structure.getAtomIndices (sele);
                atomIndices[n] = a[0];
            } else {
                atomIndices[n] = undefined;
            }
        }
        
        return atomIndices;
    },

    _getAtomPairsFromResidue: function( residue ){
        var linkList = this.crosslinkData.getLinks( residue );
        return this._getAtomPairsFromLink( linkList );
    },

    _getSelectionFromResidue: function( resnoList, asSelection ){

        var sele;

        if( !resnoList || ( Array.isArray( resnoList ) && !resnoList.length ) ){

            sele = "none";

        }else{

            if( resnoList === "all" ){
                resnoList = this.crosslinkData.getResidues();
            }

            if( !Array.isArray( resnoList ) ) resnoList = [ resnoList ];

            var tmp = resnoList.map ( function( r ){
                var rsele = r.resno;
                if( r.chainname ) { rsele = rsele + ":" + r.chainname; }
                return rsele;
            } );

            sele = "( " + tmp.join( " OR " ) + " ) AND .CA";

        }

        return asSelection ? new NGL.Selection( sele ) : sele;

    },

    _initStructureRepr: function(){

        var comp = this.structureComp;

        var resSele = this._getSelectionFromResidue(
            this._displayedResidues
        );
        var resEmphSele = this._getSelectionFromResidue(
            this._highlightedResidues
        );

        this.sstrucRepr = comp.addRepresentation( "cartoon", {
            color: this.sstrucColor,
            name: "sstruc"
        } );

        this.resRepr = comp.addRepresentation( "spacefill", {
            sele: resSele,
            color: this.displayedResiduesColor,
            scale: 0.6,
            name: "res"
        } );

        this.resEmphRepr = comp.addRepresentation( "spacefill", {
            sele: resEmphSele,
            color: this.highlightedResiduesColor,
            scale: 0.9,
            opacity: 0.7,
            name: "resEmph"
        } );

        this.stage.centerView( true );
        comp.centerView( true );

    },

    _initLinkRepr: function(){

        var comp = this.structureComp;
        var links = this.crosslinkData.getLinks();

        var xlPair = this._getAtomPairsFromLink (links);
        var xlPairEmph = this._getAtomPairsFromLink (this.filterToHighlightedLinks (links));

        this.linkRepr = comp.addRepresentation( "distance", {
            atomPair: xlPair,
            //colorValue: this.displayedLinksColor,
            colorScheme: this.colorOptions.selScheme,
            labelSize: 2.0,
            labelColor: this.displayedDistanceColor,
            labelVisible: this.displayedDistanceVisible,
            name: "link"
        } );
        
        //console.log ("comp & repr", comp, this.linkRepr, xlPair);

        this.linkEmphRepr = comp.addRepresentation( "distance", {
            atomPair: xlPairEmph,
            colorValue: this.highlightedLinksColor,
            labelSize: 2.0,
            labelColor: this.highlightedDistanceColor,
            labelVisible: this.highlightedDistanceVisible,
            scale: 1.5,
            opacity: 0.6,
            name: "linkEmph"
        } );

    },

    _initColorSchemes: function(){

        var self = this;

        this.colorOptions.white = new NGL.Color("white").getHex();
        this.colorOptions.lightgrey = new NGL.Color("lightgrey").getHex();
        
        var selColourScheme = function (params) {
            this.atomColor = function () {
                return 255;
            };
            var z = 0;
            this.bondColor = function(b, fromTo) {
                if (!z) {
                    console.log ("bond", z, b, b.atom1.resno, b.atom2.resno, b.atomIndex1, b.atomIndex2);
                }
                var origLinkId = self.origIds[b.atom1.resno+"-"+b.atom2.resno];
                var link = self.model.get("clmsModel").get("crossLinks").get(origLinkId);
                var col = self.model.get("linkColourAssignment").getColour(link);
                var col3 = d3.rgb(col);
                z++;
                return col ? (col3.r << 16) + (col3.g << 8) + col3.b : 255;
            };
        };
        
        this.colorOptions.selScheme = NGL.ColorMakerRegistry.addScheme (selColourScheme, "xlink");
        //console.log ("scheme", this.colorOptions.selScheme);
    },

    _handlePicking: function( pickingData ){
        var pd = pickingData;
        var crosslinkData = this.crosslinkData;

        var pdtrans = {
            residue: undefined,
            links: undefined,
            xlinks: undefined,
        };

        if( pd.atom !== undefined && pd.bond === undefined ){
            console.log ("atom", pd.atom.resno);
            var residues = crosslinkData.findResidues(
                pd.atom.resno, pd.atom.chainname
            );
            if( residues ){
                pdtrans.residue = residues[ 0 ];
                pdtrans.links = crosslinkData.findLinks2 (pdtrans.residue);
            }

        }else if( pd.bond !== undefined ){
             // atomIndex / resno’s output here are wrong, usually sequential (indices) or the same (resno’s)
            //console.log ("picked bond", pd.bond.index, pd.bond.atom1.resno, pd.bond.atom2.resno, pd.bond.atomIndex1, pd.bond.atomIndex2);

            var bp2 = this.linkRepr.repr.dataList[0].bondStore; // distance rep bondstore
            var ai1 = bp2.atomIndex1[pd.bond.index];
            var ai2 = bp2.atomIndex2[pd.bond.index];
            //console.log ("atom index via distance rep bondstore", this.linkRepr.repr, bp2, ai1, ai2);
            
            var resStore = pd.bond.structure.residueStore;
            var aStore = pd.bond.structure.atomStore;
            var ri1 = aStore.residueIndex[ai1];
            var ri2 = aStore.residueIndex[ai2];
            var r1 = resStore.resno[ri1];
            var r2 = resStore.resno[ri2];
            
            // r1 and r2 are now correct and I can grab data through the existing crosslinkData interface
            //console.log ("atom to resno's", aStore, ri1, ri2, r1, r2);
            var residuesA = crosslinkData.findResidues (r1, pd.bond.atom1.chainname);
            var residuesB = crosslinkData.findResidues (r2, pd.bond.atom2.chainname);
            
            //console.log ("res", crosslinkData.getResidues(), crosslinkData.getLinks());
            if( residuesA && residuesB ){
                pdtrans.links = crosslinkData.findLinks(residuesA[0], residuesB[0]);
            }
        }
        
        var xlinks = this.model.get("clmsModel").get("crossLinks");
        if (pdtrans.links) {
            pdtrans.xlinks = pdtrans.links.map (function(link) {
                return xlinks.get (link.origId);
            }, this);
        }
        //console.log ("pd and pdtrans", pd, pdtrans);
        
        this.model.calcMatchingCrosslinks ("selection", pdtrans.xlinks, false, false);
    },

    _handleDataChange: function(){
        this.setDisplayedResidues( this.crosslinkData.getResidues() );
        this.setHighlightedResidues( [] );

        this.setDisplayedLinks( this.crosslinkData.getLinks());
        this.setHighlightedLinks( this.crosslinkData.getLinks() );
    },

    _getAvailableResidues: function( residues ){

        if( !residues ) return residues;

        var crosslinkData = this.crosslinkData;
        var availableResidues = [];

        residues.forEach( function( r ){
            if( crosslinkData.hasResidue( r ) ){
                availableResidues.push( r );
            }
        } );

        return availableResidues;

    },

    _getAvailableLinks: function( links ){

        if( !links ) return links;

        var crosslinkData = this.crosslinkData;
        var availableLinks = [];

        links.forEach( function( l ){
            if( crosslinkData.hasLink( l ) ){
                availableLinks.push( l );
            }
        } );

        return availableLinks;

    },

    setDisplayed: function( residues, links ){
        this.setDisplayedResidues( residues );
        this.setDisplayedLinks( links );

    },

    setHighlighted: function( residues, links ){

        this.setHighlightedResidues( residues );
        this.setHighlightedLinks( links );

    },

    setDisplayedResidues: function( residues ){

        this._displayedResidues = residues;
        var availableResidues = this._getAvailableResidues( residues );

        this.resRepr.setSelection(
            this._getSelectionFromResidue( availableResidues )
        );

    },

    setHighlightedResidues: function( residues ){

        this._highlightedResidues = residues;
        var availableResidues = this._getAvailableResidues( residues );

        this.resEmphRepr.setSelection(
            this._getSelectionFromResidue( availableResidues )
        );

    },

    setDisplayedLinks: function( links ){
        var availableLinks = this._getAvailableLinks( links );
       // console.log ("disp links", availableLinks);
        //console.log ("resids", this.crosslinkData._residueIdToLinkIds, this.crosslinkData._linkIdToResidueIds);
        var atomPairs = this._getAtomPairsFromLink (availableLinks);
        //console.log ("atom pairs", atomPairs);
        
        this.linkRepr.setParameters ({
            atomPair: atomPairs,
        });
    },

    filterToHighlightedLinks: function (links) {  
        var selectedSet = d3.set (this.model.get("selection").map (function(d) { return d.id; }));
        return links.filter (function (l) {
            return selectedSet.has (l.origId);   
        });
    },
    
    setHighlightedLinks: function( links ){
        var availableLinks = this._getAvailableLinks (this.filterToHighlightedLinks (links));
        this.linkEmphRepr.setParameters( {
            atomPair: this._getAtomPairsFromLink (availableLinks),
        } );
    },
    

    /**
     * params
     *
     * - displayedColor (sets residues and links color)
     * - highlightedColor (sets residues and links color)
     * - displayedResiduesColor
     * - highlightedResiduesColor
     * - displayedLinksColor
     * - highlightedLinksColor
     * - sstrucColor
     * - displayedDistanceColor (can't be a color scheme)
     * - highlightedDistanceColor (can't be a color scheme)
     * - displayedDistanceVisible
     * - highlightedDistanceVisible
     */
    setParameters: function( params, initialize ){

        var p = Object.assign( {}, params );

        var resParams = {};
        var linkParams = {};
        var resEmphParams = {};
        var linkEmphParams = {};
        var sstrucParams = {};

        // set params

        resParams.color = p.displayedResiduesColor || p.displayedColor;
        linkParams.color = p.displayedLinksColor || p.displayedColor;
        resEmphParams.color = p.highlightedResiduesColor || p.highlightedColor;
        linkEmphParams.color = p.highlightedLinksColor || p.highlightedColor;

        sstrucParams.color = p.sstrucColor;

        linkParams.labelColor = p.displayedDistanceColor;
        linkEmphParams.labelColor = p.highlightedDistanceColor;
        linkParams.labelVisible = p.displayedDistanceVisible;
        linkEmphParams.labelVisible = p.highlightedDistanceVisible;

        // set object properties

        if( resParams.color !== undefined ){
            this.displayedResiduesColor = resParams.color;
        }
        if( linkParams.color !== undefined ){
            this.displayedLinksColor = linkParams.color;
        }
        if( resEmphParams.color !== undefined ){
            this.highlightedResiduesColor = resEmphParams.color;
        }
        if( linkEmphParams.color !== undefined ){
            this.highlightedLinksColor = linkEmphParams.color;
        }

        if( sstrucParams.color !== undefined ){
            this.sstrucColor = sstrucParams.color;
        }

        if( linkParams.labelColor !== undefined ){
            this.displayedDistanceColor = linkParams.labelColor;
        }
        if( linkEmphParams.labelColor !== undefined ){
            this.highlightedDistanceColor = linkEmphParams.labelColor;
        }
        if( linkParams.labelVisible !== undefined ){
            this.displayedDistanceVisible = linkParams.labelVisible;
        }
        if( linkEmphParams.labelVisible !== undefined ){
            this.highlightedDistanceVisible = linkEmphParams.labelVisible;
        }

        // pass params to representations

        if( !initialize ){
            this.resRepr.setColor( resParams.color );
            this.linkRepr.setColor( linkParams.color );
            this.resEmphRepr.setColor( resEmphParams.color );
            this.linkEmphRepr.setColor( linkEmphParams.color );
            this.sstrucRepr.setColor( sstrucParams.color );

            this.resRepr.setParameters( resParams );
            this.linkRepr.setParameters( linkParams );
            this.resEmphRepr.setParameters( resEmphParams );
            this.linkEmphRepr.setParameters( linkEmphParams );
            this.sstrucRepr.setParameters( sstrucParams );
        }
    },

    dispose: function(){

        this.stage.signals.clicked.remove(
            this._handlePicking, this
        );
        this.crosslinkData.signals.linkListChanged.remove(
            this._handleDataChange, this
        );

        this.stage.removeRepresentation( this.sstrucRepr );
        this.stage.removeRepresentation( this.resRepr );
        this.stage.removeRepresentation( this.resEmphRepr );
        this.stage.removeRepresentation( this.linkRepr );
        this.stage.removeRepresentation( this.linkEmphRepr );
    }
};
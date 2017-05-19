//  CLMS-UI
//  Copyright 2015 Colin Combe, Rappsilber Laboratory, Edinburgh University
//
//  This file is part of CLMS-UI.
//
//  CLMS-UI is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  CLMS-UI is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with CLMS-UI.  If not, see <http://www.gnu.org/licenses/>.

var CLMSUI = CLMSUI || {};

// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views
CLMSUI.vent = {};
_.extend (CLMSUI.vent, Backbone.Events);

// only when sequences and blosums have been loaded, if only one or other either no align models = crash, or no blosum matrices = null
var allDataLoaded = _.after (3, function() {
    console.log ("DATA LOADED AND WINDOW LOADED");
	
	CLMSUI.blosumCollInst.trigger ("modelSelected", CLMSUI.blosumCollInst.models[3]);

    //init annotation types
    var annotationTypes = [];

    //add option for showing digestible residues
	var digestibleAnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
		category: "AA",
		type:"Digestible"}
	);
	annotationTypes.push(digestibleAnnotationType);

    //add option for showing crosslinkable residues
	var crosslinkableAnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
		category: "AA",
		type:"Cross-linkable"}
	);
	annotationTypes.push(crosslinkableAnnotationType);

    //add option for showing PDB aligned regions
	var alignedAnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
		category: "Alignment",
		type:"PDB aligned region"}
	);
	annotationTypes.push(alignedAnnotationType);

	//get uniprot feature types
	var uniprotFeatureTypes = new Map();     
	var participantArray = Array.from(CLMSUI.compositeModelInst.get("clmsModel").get("participants").values());
	var participantCount = participantArray.length;
    for (var p = 0; p < participantCount; p++){
		var participant = participantArray[p];
        if (participant.uniprot) {
			var featureArray = Array.from(participant.uniprot.features);
			var featureCount = featureArray.length;
			for (var f = 0; f < featureCount; f++) {
				var feature = featureArray[f];
				var key = feature.category + "-" + feature.type;
				if (uniprotFeatureTypes.has(key) === false){
					var annotationType = new CLMSUI.BackboneModelTypes.AnnotationType(feature);
					uniprotFeatureTypes.set(key, annotationType);
				}
			}
		}
    }
	//add uniprot feature types
    annotationTypes = annotationTypes.concat(Array.from(uniprotFeatureTypes.values()));
    var annotationTypeCollection = new CLMSUI.BackboneModelTypes.AnnotationTypeCollection(annotationTypes);
    CLMSUI.compositeModelInst.set("annotationTypes", annotationTypeCollection);
    
    CLMSUI.init.viewsThatNeedAsyncData();
    
    // ByRei_dynDiv by default fires this on window.load (like this whole block), but that means the KeyView is too late to be picked up
    // so we run it again here, doesn't do any harm
    ByRei_dynDiv.init.main();

    CLMSUI.compositeModelInst.applyFilter();   // do it first time so filtered sets aren't empty
});

CLMSUI.init = CLMSUI.init || {};

CLMSUI.init.models = function (options) {

    // define alignment model and listeners first, so they're ready to pick up events from other models
    var alignmentCollectionInst = new CLMSUI.BackboneModelTypes.ProtAlignCollection ();
    options.alignmentCollectionInst = alignmentCollectionInst;

    alignmentCollectionInst.listenToOnce (CLMSUI.vent, "uniprotDataParsed", function (clmsModel) {

        clmsModel.get("participants").forEach (function (entry) {
            //console.log ("entry", entry);
            if (!entry.is_decoy) {
                this.add ([{
                    "id": entry.id,
                    "displayLabel": entry.name.replace("_", " "),
                    "refID": "Search",
                    "refSeq": entry.sequence,
                }]);
                if (entry.uniprot){
					this.addSeq (entry.id, "Canonical", entry.uniprot.sequence, {});
				}
                //~ console.log ("alignColl", this);
            }
        }, this);

        allDataLoaded();

        console.log ("ASYNC. uniprot sequences poked to collection", this);
    });


    // Collection of blosum matrices that will be fetched from a json file
    CLMSUI.blosumCollInst = new CLMSUI.BackboneModelTypes.BlosumCollection();

    // when the blosum Collection is fetched (an async process), we select one of its models as being selected
    CLMSUI.blosumCollInst.listenToOnce (CLMSUI.blosumCollInst, "sync", function() {
        console.log ("ASYNC. blosum models loaded");
        allDataLoaded();
    });

    // and when the blosum Collection fires a modelSelected event (via bothSyncsDone) it is accompanied by the chosen blosum Model
    // and we set the alignmentCollection to listen for this and set all its Models to use that blosum Model as the initial value
    alignmentCollectionInst.listenTo (CLMSUI.blosumCollInst, "modelSelected", function (blosumModel) {
        // sets alignmentModel's scoreMatrix, the change of which then triggers an alignment
        // (done internally within alignmentModelInst)
        this.models.forEach (function (protAlignModel) {
            protAlignModel.set ("scoreMatrix", blosumModel);
        });
    });

    CLMSUI.init.modelsEssential(options);

    // Set up colour models, some (most) of which depend on data properties
    CLMSUI.linkColour.setupColourModels();

    // Start the asynchronous blosum fetching after the above events have been set up
    CLMSUI.blosumCollInst.fetch();

    CLMSUI.domainColours = d3.scale.ordinal().range(colorbrewer.Set1[7]);//.slice().reverse());
};


//only inits stuff required by validation page
CLMSUI.init.modelsEssential = function (options) {
    CLMSUI.oldDB = options.oldDB || false;

    // This SearchResultsModel is what fires (sync or async) the uniprotDataParsed event we've set up a listener for above ^^^
    CLMSUI.utils.displayError (function() { return !options.rawMatches || !options.rawMatches.length; },
        "No cross-links detected for this search.<br>Please return to the search history page.<br><br>You can still upload CSV files via the LOAD menu."
    );

    var clmsModelInst = new window.CLMS.model.SearchResultsModel ();
    clmsModelInst.parseJSON(options);
    
    // some proteins have no size, i.e. ambiguous placeholders, and lack of size property is breaking things later on. MJG 17/05/17
    clmsModelInst.get("participants").forEach (function (prot) {
        prot.size = prot.size || 1;
    });
      
    // Anonymiser for screen shots / videos. MJG 17/05/17
    var urlChunkSet = d3.set (window.location.search.split("&"));
    if (urlChunkSet.has("anon")) {
        var i = 0;
        clmsModelInst.get("participants").forEach (function (prot) {
            i++;
            prot.name = "Protein "+i;
            prot.description = "Protein "+i+" Description";
        });
    }
    
    
    // Connect searches to proteins, and add the protein set as a property of a search in the clmsModel
    var pepMap = d3.map (options.peptides, function (peptide) { return peptide.id; });
    var searchMap = {};
    options.rawMatches.forEach (function (rawMatch) {
        var prots = pepMap.get(rawMatch.pi).prt;
        var searchToProts = searchMap[rawMatch.si];
        if (!searchToProts) {
            var newSet = d3.set();
            searchMap[rawMatch.si] = newSet;
            searchToProts = newSet;
        }
        prots.forEach (function (prot) {
            searchToProts.add (prot);
        });
    });
    clmsModelInst.get("searches").forEach (function (value, key) {
       value.participantIDSet = searchMap[key]; 
    });
    //console.log ("smap", searchMap);

    var filterModelInst = new CLMSUI.BackboneModelTypes.FilterModel ({
        decoys: clmsModelInst.get("decoysPresent"),
        betweenLinks: true,//clmsModelInst.realProteinCount > 1,
        AUTO: clmsModelInst.get("autoValidatedPresent"),
        ambig: clmsModelInst.get("ambiguousPresent"),
        linears: clmsModelInst.get("linearsPresent"),
        matchScoreCutoff: [Math.floor(clmsModelInst.get("minScore")), 
            Math.ceil(clmsModelInst.get("maxScore"))],
    });

    var tooltipModelInst = new CLMSUI.BackboneModelTypes.TooltipModel ();

    CLMSUI.compositeModelInst = new CLMSUI.BackboneModelTypes.CompositeModelType ({
        clmsModel: clmsModelInst,
        filterModel: filterModelInst,
        tooltipModel: tooltipModelInst,
        alignColl: options.alignmentCollectionInst,
        selection: [], //will contain cross-link objects
        highlights: [], //will contain cross-link objects
        linkColourAssignment: CLMSUI.linkColour.defaultColoursBB,
        annotationTypes: null,
        selectedProtein: null, //what type should this be? Set?
        groupColours: null // will be d3.scale for colouring by search/group
    });

	//moving this to end of allDataLoaded - think validation page needs this, TODO, check
    CLMSUI.compositeModelInst.applyFilter();   // do it first time so filtered sets aren't empty

    // instead of views listening to changes in filter directly, we listen to any changes here, update filtered stuff
    // and then tell the views that filtering has occurred via a custom event ("filtering Done"). The ordering means
    // the views are only notified once the changed data is ready.
    CLMSUI.compositeModelInst.listenTo (filterModelInst, "change", function() {
		console.log("filterChange");
        this.applyFilter();
    });

};

CLMSUI.init.views = function () {
	//todo: only if there is validated {
    CLMSUI.compositeModelInst.get("filterModel").set("unval", false);

    var windowIds = ["spectrumPanelWrapper", "keyPanel", "nglPanel", "distoPanel", "matrixPanel", "alignPanel", "circularPanel", "proteinInfoPanel", "pdbPanel", "csvPanel", "searchSummaryPanel"];
    // something funny happens if I do a data join and enter instead
    // ('distoPanel' datum trickles down into chart axes due to unintended d3 select.select inheritance)
    // http://stackoverflow.com/questions/18831949/d3js-make-new-parent-data-descend-into-child-nodes
    windowIds.forEach (function (winid) {
        d3.select("body").append("div")
            .attr("id", winid)
            .attr("class", "dynDiv")
        ;
    });

    CLMSUI.init.viewsEssential({"specWrapperDiv":"#spectrumPanelWrapper"});

    // Generate checkboxes for view dropdown
    var checkBoxData = [
        {id: "circularChkBxPlaceholder", label: "Circular", eventName:"circularShow"},
        {id: "spectrumChkBxPlaceholder", label: "Spectrum", eventName:"spectrumShow"},
        {id: "proteinInfoChkBxPlaceholder", label: "Protein Info", eventName:"proteinInfoShow"},
        {id: "alignChkBxPlaceholder", label: "Alignment", eventName:"alignShow", sectionEnd: true},
        {id: "nglChkBxPlaceholder", label: "3D (NGL)", eventName:"nglShow"},
        {id: "matrixChkBxPlaceholder", label: "Matrix", eventName:"matrixShow"},
        {id: "distoChkBxPlaceholder", label: "Distogram", eventName:"distoShow", sectionEnd: true},
        {id: "keyChkBxPlaceholder", label: "Legend", eventName:"keyShow", sectionEnd: true},
        {id: "searchSummaryChkBxPlaceholder", label: "Search Summaries", eventName:"searchesShow"},
    ];
    checkBoxData.forEach (function (cbdata) {
        var cbView = new CLMSUI.utils.checkBoxView ({myOptions: {id: cbdata.id, label: cbdata.label, eventName: cbdata.eventName, labelFirst: false}});
        $("#viewDropdownPlaceholder").append(cbView.$el);
    });

    // Add them to a drop-down menu (this rips them away from where they currently are)
    var maybeViews = ["#nglChkBxPlaceholder", "#matrixChkBxPlaceholder", "#distoChkBxPlaceholder"];
    new CLMSUI.DropDownMenuViewBB ({
        el: "#viewDropdownPlaceholder",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
        myOptions: {
            title: "View",
            menu: checkBoxData.map (function(cbdata) { return { id: cbdata.id, sectionEnd: cbdata.sectionEnd }; })
        }
    })
        // hide/disable view choices that depend on certain data being present until that data arrives
        .filter (maybeViews, false)
        .listenTo (CLMSUI.compositeModelInst.get("clmsModel"), "change:distancesObj", function (model, newDistancesObj) {
            this.filter (maybeViews, !!newDistancesObj);
        })
    ;

    // Generate buttons for load dropdown
    var buttonData = [
        {id: "pdbChkBxPlaceholder", label: "PDB Data", eventName:"pdbShow"},
        {id: "csvUploadPlaceholder", label: "CSV", eventName:"csvShow"},
    ];
    buttonData.forEach (function (bdata) {
        var bView = new CLMSUI.utils.buttonView ({myOptions: bdata});
        $("#loadDropdownPlaceholder").append(bView.$el);
    });
    new CLMSUI.DropDownMenuViewBB ({
        el: "#loadDropdownPlaceholder",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
        myOptions: {
            title: "Load",
            menu: buttonData.map (function(bdata) { return { id: bdata.id, sectionEnd: bdata.sectionEnd }; })
        }
    });

    console.log ("MODEL", CLMSUI.compositeModelInst);
    var interactors = CLMSUI.compositeModelInst.get("clmsModel").get("participants");
    CLMSUI.firstPdbCode = CLMSUI.modelUtils.pickCommonPDB (interactors);    // quick protein accession to pdb lookup for now

    new CLMSUI.ThreeColourSliderBB ({
        el: "#sliderDiv",
        model: CLMSUI.linkColour.distanceColoursBB,
        domain: [0,35],
        extent: [15,25],
    })
        .show (false)   // hide view to begin with (show returns 'this' so distanceSlider is still correctly referenced)
        .listenTo (CLMSUI.compositeModelInst.get("clmsModel"), "change:distancesObj", function (model, newDistancesObj) {
            this.show (!!newDistancesObj);  // show view when data becomes available ('this' is view)
        })
    ;
};


CLMSUI.init.viewsEssential = function (options) {

    var filterModel = CLMSUI.compositeModelInst.get("filterModel");
    var singleRealProtein = CLMSUI.compositeModelInst.get("clmsModel").realProteinCount < 2;
    new CLMSUI.FilterViewBB ({
        el: "#filterPlaceholder",
        model: filterModel,
        myOptions: {
            hide: {
				//todo: reinstate sensible hiding of controls, need listeners on these attributes
                //temp hack - dont hide anything, data may change when csv uploaded
                /*
                "selfLinks": singleRealProtein,
                "betweenLinks": singleRealProtein,
                "AUTO": !CLMSUI.compositeModelInst.get("clmsModel").get("autoValidatedPresent"),
                "ambig": !CLMSUI.compositeModelInst.get("clmsModel").get("ambiguousPresent"),
                "unval": !CLMSUI.compositeModelInst.get("clmsModel").get("unvalidatedPresent"),
                "linear": !CLMSUI.compositeModelInst.get("clmsModel").get("linearsPresent"),
                "protNames": singleRealProtein,
                */
            }
        }
    });
    
    new CLMSUI.FilterSummaryViewBB ({
        el:"#filterReportPlaceholder",
        model: CLMSUI.compositeModelInst,
    });

    if (CLMSUI.compositeModelInst.get("clmsModel").get("decoysPresent") === false) {
		d3.select("#filterModeDiv").style("display","none");
	}

    var miniDistModelInst = new CLMSUI.BackboneModelTypes.MinigramModel ();
    miniDistModelInst.data = function() {
        return CLMSUI.modelUtils.flattenMatches (CLMSUI.compositeModelInst.get("clmsModel").get("matches"));    // matches is now an array of arrays - [matches, []];
    };

    // When the range changes on the mini histogram model pass the values onto the filter model
    filterModel.listenTo (miniDistModelInst, "change", function (model) {
        this.set ("matchScoreCutoff", [model.get("domainStart"), model.get("domainEnd")]);
    }, this);

    new CLMSUI.MinigramViewBB ({
        el: "#filterPlaceholderSliderHolder",
        model: miniDistModelInst,
        myOptions: {
            maxX: 0,    // let data decide
            seriesNames: ["Matches", "Decoys"],
            //scaleOthersTo: "Matches",
            xlabel: "Score",
            ylabel: "Count",
            height: 65,
            colors: {"Matches":"blue", "Decoys":"red"}
        }
    })
        // If the ClmsModel matches attribute changes then tell the mini histogram view
        .listenTo (CLMSUI.compositeModelInst.get("clmsModel"), "change:matches", this.render) // if the matches change (likely?) need to re-render the view too
        .listenTo (filterModel, "change:matchScoreCutoff", function (filterModel, newCutoff) {
            this.model.set ({domainStart: newCutoff[0], domainEnd: newCutoff[1]});
            //console.log ("cutoff changed");
        })
    ;


    // World of code smells vol.1
    // selectionViewer declared before spectrumWrapper because...
    // 1. Both listen to event A, selectionViewer to build table, spectrumWrapper to do other stuff
    // 2. Event A in spectrumWrapper fires event B
    // 3. selectionViewer listens for event B to highlight row in table - which means it must have built the table
    // 4. Thus selectionViewer must do it's routine for event A before spectrumWrapper, so we initialise it first
    var selectionViewer = new CLMSUI.SelectionTableViewBB ({
        el: "#bottomDiv",
        model: CLMSUI.compositeModelInst,
    });

    selectionViewer.lastCount = 1;
    selectionViewer.render();

    var spectrumModel = new AnnotatedSpectrumModel();

    var spectrumWrapper = new SpectrumViewWrapper ({
        el:options.specWrapperDiv,
        model: CLMSUI.compositeModelInst,
        displayEventName: "spectrumShow",
        myOptions: {wrapperID: "spectrumPanel"}
    })
        .listenTo (CLMSUI.vent, "individualMatchSelected", function (match) {
            if (match) {
                this.primaryMatch = match; // the 'dynamic_rank = true' match
                var url = "./loadData.php?sid="
                        + this.model.get("clmsModel").get("sid")
                        + "&unval=1&decoys=1&linears=1&spectrum="  + match.spectrumId;
                var self = this;
                d3.json (url, function(error, json) {
                    if (error) {
                        console.log ("error", error, "for", url);
                    } else {
                        var altModel = new window.CLMS.model.SearchResultsModel ();
                        altModel.parseJSON(json);
                        var allCrossLinks = Array.from(altModel.get("crossLinks").values());
                        // empty selection first
                        // (important or it will crash coz selection contains links to proteins not in clms model)
                        self.alternativesModel
                            .set("selection", [])
                            .set("clmsModel", altModel)
                            .applyFilter()
                            .set ("lastSelectedMatch", {match: match, directSelection: true})
                        ;
                        d3.select("#alternatives").style("display", altModel.get("matches").length === 1 ? "none" : "block");
                        self.alternativesModel.set("selection", allCrossLinks);
                        CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);
                    }
                });
            } else {
                //~ //this.model.clear();
            }
        })
    ;

    var spectrumViewer = new SpectrumView ({model: spectrumModel, el:"#spectrumPanel"});    
    var InfoView = new PrecursorInfoView ({model: spectrumModel, el:"#spectrumPanel"}); 
    var fragKey = new FragmentationKeyView ({model: spectrumModel, el:"#spectrumPanel"}); 
    var errorIntensityPlot = new ErrorIntensityPlotView ({model: spectrumModel, el:"#spectrumPanel"}); 

    // Update spectrum view when external resize event called
    spectrumViewer.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });
    fragKey.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });

    // "individualMatchSelected" in CLMSUI.vent is link event between selection table view and spectrum view
    // used to transport one Match between views
    spectrumViewer.listenTo (CLMSUI.vent, "individualMatchSelected", function (match) {
        if (match) {
            var randId = CLMSUI.compositeModelInst.get("clmsModel").getSearchRandomId (match);
            CLMSUI.loadSpectra (match, randId, this.model);
        } else {
            this.model.clear();
        }
    });

    // Generate data export drop down
    new CLMSUI.DropDownMenuViewBB ({
        el: "#expDropdownPlaceholder",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
        myOptions: {
            title: "Data-Export",
            menu: [
                {name: "Links", func: downloadLinks}, {name:"Matches", func: downloadMatches},
                {name: "Residues", func: downloadResidueCount}
            ]
        }
    });

};

CLMSUI.init.viewsThatNeedAsyncData = function () {

    // This generates the legend div, we don't keep a handle to it - the event object has one
    new CLMSUI.KeyViewBB ({
        el: "#keyPanel",
        displayEventName: "keyShow",
        model: CLMSUI.compositeModelInst,
    });
    
    new CLMSUI.SearchSummaryViewBB ({
        el: "#searchSummaryPanel",
        displayEventName: "searchesShow",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
    });
    
    /* 'cos circle listens to annotation model which is formed from uniprot async data */
    new CLMSUI.CircularViewBB ({
        el: "#circularPanel",
        displayEventName: "circularShow",
        model: CLMSUI.compositeModelInst,
    });

   
    // Make a drop down menu constructed from the annotations collection
    new CLMSUI.AnnotationDropDownMenuViewBB ({
        el: "#annotationsDropdownPlaceholder",
        collection: CLMSUI.compositeModelInst.get("annotationTypes"),
        myOptions: {
            title: "Annotations",
            closeOnClick: false,
            groupByAttribute: "category",
            labelByAttribute: "type",
            toggleAttribute: "shown",
        }
    });
    

    new CLMSUI.utils.ColourCollectionOptionViewBB ({
        el: "#linkColourDropdownPlaceholder",
        model: CLMSUI.linkColour.Collection,
        storeSelectedAt: {model: CLMSUI.compositeModelInst, attr: "linkColourAssignment"},
    });

    CLMSUI.compositeModelInst.listenTo (CLMSUI.linkColour.Collection, "aColourModelChanged", function (colourModel, newDomain) {
        console.log ("col change args", arguments, this);
        if (this.get("linkColourAssignment") === colourModel) {
            this.trigger ("currentColourModelChanged", colourModel, newDomain);
        }
    });

    // If more than one search, set group colour scheme to be default. https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/72
    CLMSUI.compositeModelInst.set (
        "linkColourAssignment",
        CLMSUI.compositeModelInst.get("clmsModel").get("searches").size > 1 ? CLMSUI.linkColour.groupColoursBB : CLMSUI.linkColour.defaultColoursBB
    );

    d3.select("body").append("div").attr({"id": "tooltip2", "class": "CLMStooltip"});
    new CLMSUI.TooltipViewBB ({
        el: "#tooltip2",
        model: CLMSUI.compositeModelInst.get("tooltipModel")
    });

    crosslinkViewer = new CLMS.xiNET.CrosslinkViewer ({
        el: "#networkDiv",
        model: CLMSUI.compositeModelInst,
   //     myOptions: {layout: storedLayout}
    });


    // Alignment View
    new CLMSUI.AlignCollectionViewBB ({
        el:"#alignPanel",
        collection: CLMSUI.compositeModelInst.get("alignColl"),
        displayEventName: "alignShow",
        tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel")
    });

    CLMSUI.compositeModelInst.get("alignColl").listenTo (CLMSUI.compositeModelInst, "3dsync", function (sequences) {
        if (sequences && sequences.length) {    // if sequences passed and it has a non-zero length...
            sequences.forEach (function (entry) {
                this.addSeq (entry.id, entry.name, entry.data, entry.otherAlignSettings);
            }, this);
            // this triggers an event to say loads has changed in the alignment collection
            // more efficient to listen to that then redraw/recalc for every seq addition
            this.bulkAlignChangeFinished ();

            console.log ("3D sequences poked to collection", this);
        }
    });

    new CLMSUI.DistogramBB ({
        el: "#distoPanel",
        model: CLMSUI.compositeModelInst,
        colourScaleModel: CLMSUI.linkColour.distanceColoursBB,
        displayEventName: "distoShow",
        myOptions: {
            chartTitle: "Cross-Link Distogram",
            seriesName: "Actual"
        }
    });

    // This makes a matrix viewer
    var matrixViewer = new CLMSUI.DistanceMatrixViewBB ({
        el: "#matrixPanel",
        model: CLMSUI.compositeModelInst,
        colourScaleModel: CLMSUI.linkColour.distanceColoursBB,
        displayEventName: "matrixShow",
    });


    // This stuffs a basic filter view into the matrix view
    var matrixInner = d3.select(matrixViewer.el).select("div.panelInner");
    var matrixFilterEventName = "filterEster";
    /*
    matrixInner.insert("div", ":first-child").attr("class", "buttonColumn").attr("id", "matrixButtons");
    var matrixFilterView = new CLMSUI.utils.RadioButtonFilterViewBB ({
        el: "#matrixButtons",
        myOptions: {
            states: [0, 1, 2],
            labels: ["Any to Any", "NHS to Any", "NHS to NHS"],
            header: "NHS Ester Filter",
            labelGroupFlow: "verticalFlow",
            eventName: matrixFilterEventName
        }
    });
    */

    // the matrix view listens to the event the basic filter view generates and changes a variable on it
    matrixViewer.listenTo (CLMSUI.vent, matrixFilterEventName, function (filterVal) {
        this.filterVal = filterVal;
        this.render();
    });
    CLMSUI.vent.trigger (matrixFilterEventName, 0); // Transmit initial value to both filter and matrix. Makes sure radio buttons and display are synced

    // This is all done outside the matrix view itself as we may not always want a matrix view to have this
    // functionality. Plus the views don't know about each other now.
    // We could set it up via a parent view which all it does is be a container to these two views if we think that approach is better.

    // Make new ngl view with pdb dataset
    // In a horrific misuse of the MVC pattern, this view actually generates the 3dsync
    // event that other views are waiting for.
    new CLMSUI.NGLViewBB ({
        el: "#nglPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "nglShow",
        myOptions: {
            initialPdbCode: CLMSUI.firstPdbCode,
        }
    });

    new CLMSUI.PDBFileChooserBB ({
        el: "#pdbPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "pdbShow",
        myOptions: {
            initialPdbCode: CLMSUI.firstPdbCode,
        }
    });
    
	new CLMSUI.CSVFileChooserBB ({
        el: "#csvPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "csvShow",
        myOptions: {
            initialPdbCode: CLMSUI.firstPdbCode,
        }
    });

    new CLMSUI.ProteinInfoViewBB ({
        el: "#proteinInfoPanel",
        displayEventName: "proteinInfoShow",
        model: CLMSUI.compositeModelInst,
    });

    new CLMSUI.FDRViewBB ({
        el: "#fdrPanel",
        //displayEventName: "fdrShow",
        model: CLMSUI.compositeModelInst.get("filterModel"),
    });
    
    new CLMSUI.FDRSummaryViewBB ({
        el: "#fdrSummaryPlaceholder",
        //displayEventName: "fdrShow",
        model: CLMSUI.compositeModelInst,
    });

    //make sure things that should be hidden are hidden
    CLMSUI.compositeModelInst.trigger ("hiddenChanged");
};

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
_.extend(CLMSUI.vent, Backbone.Events);

// only when sequences and blosums have been loaded, if only one or other either no align models = crash, or no blosum matrices = null
var allDataLoaded = _.after(3, function() {
    console.log("DATA LOADED AND WINDOW LOADED");

    CLMSUI.blosumCollInst.trigger("modelSelected", CLMSUI.blosumCollInst.models[3]);

    //init annotation types
    var annotationTypes = [];

    //add option for showing digestible residues
    var digestibleAnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
        category: "AA",
        type: "Digestible",
        tooltip: "Mark Digestible Residues",
        source: "Search",
    });
    annotationTypes.push(digestibleAnnotationType);

    //add option for showing crosslinkable residues
    var crosslinkable1AnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
        category: "AA",
        type: "Cross-linkable-1",
        tooltip: "Mark Cross-Linkable residues (first or only reactive gruop)",
        source: "Search",
    });
    annotationTypes.push(crosslinkable1AnnotationType);

    //add option for showing crosslinkable residues
    var crosslinkable2AnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
        category: "AA",
        type: "Cross-linkable-2",
        tooltip: "Mark Cross-Linkable residues (second reative group if heterobifunctional cross-linker)",
        source: "Search",
    });
    annotationTypes.push(crosslinkable2AnnotationType);

    //add option for showing PDB aligned regions
    var alignedAnnotationType = new CLMSUI.BackboneModelTypes.AnnotationType({
        category: "Alignment",
        type: "PDB aligned region",
        tooltip: "Show regions that align to currently loaded PDB Data",
        source: "PDB",
    });
    annotationTypes.push(alignedAnnotationType);

    //get uniprot feature types
    var uniprotFeatureTypes = new Map();
    var participantArray = CLMS.arrayFromMapValues(CLMSUI.compositeModelInst.get("clmsModel").get("participants"));
    var participantCount = participantArray.length;
    for (var p = 0; p < participantCount; p++) {
        var participant = participantArray[p];
        if (participant.uniprot) {
            var featureArray = Array.from(participant.uniprot.features);
            var featureCount = featureArray.length;
            for (var f = 0; f < featureCount; f++) {
                var feature = featureArray[f];
                var key = feature.category + "-" + feature.type;
                if (uniprotFeatureTypes.has(key) === false) {
                    var annotationType = new CLMSUI.BackboneModelTypes.AnnotationType(feature);
                    annotationType.set("source", "Uniprot");
                    uniprotFeatureTypes.set(key, annotationType);
                }
            }
        }
    }
    //add uniprot feature types
    annotationTypes = annotationTypes.concat(CLMS.arrayFromMapValues(uniprotFeatureTypes));
    var annotationTypeCollection = new CLMSUI.BackboneModelTypes.AnnotationTypeCollection(annotationTypes);
    CLMSUI.compositeModelInst.set("annotationTypes", annotationTypeCollection);

    CLMSUI.vent.trigger("buildAsyncViews");
    //CLMSUI.init.viewsThatNeedAsyncData();

    CLMSUI.compositeModelInst.applyFilter(); // do it first time so filtered sets aren't empty

    CLMSUI.vent.trigger("initialSetupDone"); //	Message that models and views are ready for action, with filter set initially
});

CLMSUI.init = CLMSUI.init || {};

CLMSUI.init.pretendLoad = function() {
    allDataLoaded();
};

CLMSUI.init.models = function(options) {

    // define alignment model and listeners first, so they're ready to pick up events from other models
    var alignmentCollectionInst = new CLMSUI.BackboneModelTypes.ProtAlignCollection();
    options.alignmentCollectionInst = alignmentCollectionInst;

    alignmentCollectionInst.listenToOnce(CLMSUI.vent, "uniprotDataParsed", function(clmsModel) {
        CLMSUI.modelUtils.addNewSequencesToAlignment.call(this, clmsModel);
        console.log("ASYNC. uniprot sequences poked to collection", this);
        allDataLoaded();
    });


    // Collection of blosum matrices that will be fetched from a json file
    CLMSUI.blosumCollInst = new CLMSUI.BackboneModelTypes.BlosumCollection(); // options if we want to override defaults

    // when the blosum Collection is fetched (an async process), we select one of its models as being selected
    CLMSUI.blosumCollInst.listenToOnce(CLMSUI.blosumCollInst, "sync", function() {
        console.log("ASYNC. blosum models loaded");
        allDataLoaded();
    });

    // and when the blosum Collection fires a modelSelected event (via bothSyncsDone) it is accompanied by the chosen blosum Model
    // and we set the alignmentCollection to listen for this and set all its Models to use that blosum Model as the initial value
    alignmentCollectionInst.listenTo(CLMSUI.blosumCollInst, "modelSelected", function(blosumModel) {
        // sets alignmentModel's scoreMatrix, the change of which then triggers an alignment
        // (done internally within alignmentModelInst)
        this.models.forEach(function(protAlignModel) {
            protAlignModel.set("scoreMatrix", blosumModel);
        });
    });


    CLMSUI.init.modelsEssential(options);

    // following listeners require compositeModelInst etc to be set up in modelsEssential() so placed afterwards

    // this listener adds new sequences obtained from pdb files to existing alignment sequence models
    alignmentCollectionInst.listenTo(CLMSUI.compositeModelInst, "3dsync", function(sequences) {
        if (sequences && sequences.length) { // if sequences passed and it has a non-zero length...
            sequences.forEach(function(entry) {
                this.addSeq(entry.id, entry.name, entry.data, entry.otherAlignSettings);
            }, this);
            // this triggers an event to say loads has changed in the alignment collection
            // more efficient to listen to that then redraw/recalc for every seq addition
            this.bulkAlignChangeFinished();

            console.log("3D sequences poked to collection", this);
        }
    });


    // this listener makes new alignment sequence models based on the current participant set (this usually gets called after a csv file is loaded)
    // it uses the same code as that used when a xi search is the source of data, see earlier in this code (roughly line 96'ish)
    alignmentCollectionInst.listenTo(CLMSUI.compositeModelInst.get("clmsModel"), "change:matches", function() {
        CLMSUI.modelUtils.addNewSequencesToAlignment.call(this, CLMSUI.compositeModelInst.get("clmsModel"));
        // this triggers an event to say loads has changed in the alignment collection
        // more efficient to listen to that then redraw/recalc for every seq addition
        this.bulkAlignChangeFinished();

        console.log("CSV sequences poked to collection", this);
    });

    // Set up colour models, some (most) of which depend on data properties
    CLMSUI.linkColour.setupColourModels();

    // Start the asynchronous blosum fetching after the above events have been set up
    CLMSUI.blosumCollInst.fetch(options.blosumOptions || {});
};


//only inits stuff required by validation page
CLMSUI.init.modelsEssential = function(options) {
    CLMSUI.oldDB = options.oldDB || false;

    var arrIsPopulated = function(arr) {
        return arr && arr.length;
    }
    var hasMissing = arrIsPopulated(options.missingSearchIDs);
    var hasIncorrect = arrIsPopulated(options.incorrectSearchIDs);

    CLMSUI.utils.displayError(function() {
            return options.missingSearchIDs || options.incorrectSearchIDs || !options.rawMatches || !options.rawMatches.length;
        },
        (hasMissing ? "Cannot find Search ID" + (options.missingSearchIDs.length > 1 ? "s " : " ") + options.missingSearchIDs.join(", ") + ".<br>" : "") +
        (hasIncorrect ? "Wrong ID Key for Search ID" + (options.incorrectSearchIDs.length > 1 ? "s " : " ") + options.incorrectSearchIDs.join(", ") + ".<br>" : "") +
        (!hasMissing && !hasIncorrect && !arrIsPopulated(options.rawMatches) ? "No cross-links detected for this search.<br>" : "") +
        "<p>You can either go to the search history page <br>or you can upload CSV files via the LOAD menu.</p>"
    );

    // This SearchResultsModel is what fires (sync or async) the uniprotDataParsed event we've set up a listener for above ^^^
    var clmsModelInst = new window.CLMS.model.SearchResultsModel();
    //console.log ("options", options, JSON.stringify(options));
    clmsModelInst.parseJSON(options);

    // some proteins have no size, i.e. ambiguous placeholders, and lack of size property is breaking things later on. MJG 17/05/17
    clmsModelInst.get("participants").forEach(function(prot) {
        prot.size = prot.size || 1;
    });

    var urlChunkMap = CLMSUI.modelUtils.parseURLQueryString(window.location.search.slice(1));

    // Anonymiser for screen shots / videos. MJG 17/05/17, add &anon to url for this
    if (urlChunkMap["anon"]) {
        clmsModelInst.get("participants").forEach(function(prot, i) {
            prot.name = "Protein " + (i + 1);
            prot.description = "Protein " + (i + 1) + " Description";
        });
    }

    // Connect searches to proteins, and add the protein set as a property of a search in the clmsModel, MJG 17/05/17
    var searchMap = CLMSUI.modelUtils.getProteinSearchMap(options.peptides, options.rawMatches);
    clmsModelInst.get("searches").forEach(function(value, key) {
        value.participantIDSet = searchMap[key];
    });

    // Add c- and n-term positions to searchresultsmodel on a per protein basis // MJG 29/05/17
    //~ clmsModelInst.set("terminiPositions", CLMSUI.modelUtils.getTerminiPositions (options.peptides));

    var scoreExtentInstance = CLMSUI.modelUtils.matchScoreRange(clmsModelInst.get("matches"), true);
    scoreExtentInstance[0] = Math.min(0, scoreExtentInstance[0]); // make scoreExtent min zero, if existing min isn't negative
    var filterSettings = {
        decoys: clmsModelInst.get("decoysPresent"),
        betweenLinks: true, //clmsModelInst.targetProteinCount > 1,
        A: clmsModelInst.get("manualValidatedPresent"),
        B: clmsModelInst.get("manualValidatedPresent"),
        C: clmsModelInst.get("manualValidatedPresent"),
        Q: clmsModelInst.get("manualValidatedPresent"),
        AUTO: !clmsModelInst.get("manualValidatedPresent"),
        ambig: clmsModelInst.get("ambiguousPresent"),
        linears: clmsModelInst.get("linearsPresent"),
        //matchScoreCutoff: [undefined, undefined],
        //matchScoreCutoff: [Math.floor(clmsModelInst.get("minScore")) || undefined, Math.ceil(clmsModelInst.get("maxScore")) || undefined],
        matchScoreCutoff: scoreExtentInstance.slice()
    };
    var urlFilterSettings = CLMSUI.BackboneModelTypes.FilterModel.prototype.getFilterUrlSettings(urlChunkMap);
    filterSettings = _.extend(filterSettings, urlFilterSettings); // overwrite default settings with url settings
    console.log("urlFilterSettings", urlFilterSettings, "progFilterSettings", filterSettings);
    var filterModelInst = new CLMSUI.BackboneModelTypes.FilterModel(filterSettings, {
        scoreExtent: scoreExtentInstance
    });

    var tooltipModelInst = new CLMSUI.BackboneModelTypes.TooltipModel();

    // overarching model
    CLMSUI.compositeModelInst = new CLMSUI.BackboneModelTypes.CompositeModelType({
        clmsModel: clmsModelInst,
        filterModel: filterModelInst,
        tooltipModel: tooltipModelInst,
        alignColl: options.alignmentCollectionInst,
        linkColourAssignment: CLMSUI.linkColour.defaultColoursBB,
    });

    //moving this to end of allDataLoaded - think validation page needs this, TODO, check
    CLMSUI.compositeModelInst.applyFilter(); // do it first time so filtered sets aren't empty

    // instead of views listening to changes in filter directly, we listen to any changes here, update filtered stuff
    // and then tell the views that filtering has occurred via a custom event ("filtering Done") in applyFilter().
    // This ordering means the views are only notified once the changed data is ready.
    CLMSUI.compositeModelInst.listenTo(filterModelInst, "change", function() {
        //console.log("filterChange");
        this.applyFilter();
    });

};

CLMSUI.init.views = function() {

    var compModel = CLMSUI.compositeModelInst;
    console.log("MODEL", compModel);

    //todo: only if there is validated {
    compModel.get("filterModel").set("unval", false);

    var windowIds = ["spectrumPanelWrapper", "spectrumSettingsWrapper", "keyPanel", "nglPanel", "distoPanel", "matrixPanel", "alignPanel", "circularPanel", "proteinInfoPanel", "pdbPanel", "csvPanel", "searchSummaryPanel", "linkMetaLoadPanel", "proteinMetaLoadPanel", "scatterplotPanel", "urlSearchBox", "listPanel"];
    // something funny happens if I do a data join and enter with d3 instead
    // ('distoPanel' datum trickles down into chart axes due to unintended d3 select.select inheritance)
    // http://stackoverflow.com/questions/18831949/d3js-make-new-parent-data-descend-into-child-nodes
    windowIds.forEach(function(winid) {
        d3.select("body").append("div")
            .attr("id", winid)
            .attr("class", "dynDiv dynDiv_bodyLimit");
    });

    CLMSUI.init.viewsEssential({
        "specWrapperDiv": "#spectrumPanelWrapper"
    });

    // Generate checkboxes for view dropdown
    var checkBoxData = [{
            id: "circularChkBxPlaceholder",
            label: "Circular",
            eventName: "circularShow",
            tooltip: "Proteins are arranged circumferentially, with Cross-Links drawn in-between"
        },
        {
            id: "nglChkBxPlaceholder",
            label: "3D (NGL)",
            eventName: "nglShow",
            tooltip: "Spatial view of protein complexes and Cross-Links. Requires a relevant PDB File to be loaded [Load > PDB Data]"
        },
        {
            id: "matrixChkBxPlaceholder",
            label: "Matrix",
            eventName: "matrixShow",
            tooltip: "AKA Contact Map. Relevant PDB File required for distance background"
        },
        //{id: "listChkBxPlaceholder", label: "List", eventName: "listShow", tooltip: "Sortable list of cross-links"},
        {
            id: "proteinInfoChkBxPlaceholder",
            label: "Protein Info",
            eventName: "proteinInfoShow",
            tooltip: "Shows metadata and Cross-Link annotated sequences for currently selected proteins"
        },
        {
            id: "spectrumChkBxPlaceholder",
            label: "Spectrum",
            eventName: "spectrumShow",
            tooltip: "View the spectrum for a selected match (selection made through Selected Match Table after selecting Cross-Links)",
            sectionEnd: true
        },
        {
            id: "distoChkBxPlaceholder",
            label: CLMSUI.DistogramBB.prototype.identifier,
            eventName: "distoShow",
            tooltip: "Configurable view for showing distribution of one Cross-Link/Match property"
        },
        {
            id: "scatterplotChkBxPlaceholder",
            label: "Scatterplot",
            eventName: "scatterplotShow",
            tooltip: "Configurable view for comparing two Cross-Link/Match properties",
            sectionEnd: true
        },
        {
            id: "alignChkBxPlaceholder",
            label: "Alignment",
            eventName: "alignShow",
            tooltip: "Shows alignments between Canonical/PDB/Uniprot sequences per protein"
        },
        {
            id: "searchSummaryChkBxPlaceholder",
            label: "Search Summaries",
            eventName: "searchesShow",
            tooltip: "Shows metadata for current searches",
            sectionEnd: true
        },
        {
            id: "keyChkBxPlaceholder",
            label: "Legend",
            eventName: "keyShow",
            tooltip: "Explains and allows changing of current colour scheme"
        },
    ];
    checkBoxData.forEach(function(cbdata) {
        var options = $.extend({
            labelFirst: false
        }, cbdata);
        var cbView = new CLMSUI.utils.checkBoxView({
            myOptions: options
        });
        $("#viewDropdownPlaceholder").append(cbView.$el);
    }, this);

    // Add them to a drop-down menu (this rips them away from where they currently are - document)
    var maybeViews = ["#nglChkBxPlaceholder" /*, "#distoChkBxPlaceholder"*/ ];
    new CLMSUI.DropDownMenuViewBB({
            el: "#viewDropdownPlaceholder",
            model: compModel.get("clmsModel"),
            myOptions: {
                title: "Views",
                menu: checkBoxData,
                tooltipModel: compModel.get("tooltipModel")
            }
        })
        // hide/disable view choices that depend on certain data being present until that data arrives
        .filter(maybeViews, false)
        .listenTo(compModel.get("clmsModel"), "change:distancesObj", function(model, newDistancesObj) {
            this.filter(maybeViews, !!newDistancesObj);
        });


    // Generate protein selection drop down
    d3.select("body").append("input")
        .attr("type", "text")
        .attr("id", "proteinSelectionFilter");
    new CLMSUI.DropDownMenuViewBB({
        el: "#proteinSelectionDropdownPlaceholder",
        model: compModel.get("clmsModel"),
        myOptions: {
            title: "Protein-Selection",
            menu: [{
                    name: "Invert",
                    func: compModel.invertSelectedProteins,
                    context: compModel,
                    tooltip: "Switch selected and unselected proteins"
                },
                {
                    name: "Hide",
                    func: compModel.hideSelectedProteins,
                    context: compModel,
                    tooltip: "Hide selected proteins"
                },
                {
                    name: "+Neighbours",
                    func: compModel.stepOutSelectedProteins,
                    context: compModel,
                    tooltip: "Select proteins which are cross-linked to already selected proteins"
                },
                {
                    id: "proteinSelectionFilter",
                    func: compModel.proteinSelectionTextFilter,
                    closeOnClick: false,
                    context: compModel,
                    label: "Protein Selection by Description",
                    tooltip: "Select proteins whose descriptions include input text"
                }
            ],
            tooltipModel: compModel.get("tooltipModel")
        }
    });

    // Generate buttons for load dropdown
    var loadButtonData = [{
            name: "PDB Data",
            eventName: "pdbShow",
            tooltip: "Load a PDB File from local disk or by PDB ID code from RCSB.org. Allows viewing of 3D Structure and of distance background in Matrix View"
        },
        {
            name: "Cross-Links (CSV)",
            eventName: "csvShow",
            tooltip: "Load Cross-Links from a local CSV File"
        },
        {
            name: "Cross-Link Metadata",
            eventName: "linkMetaShow",
            tooltip: "Load Cross-Link Meta-Data from a local CSV file. See 'Expected CSV Format' within for syntax"
        },
        {
            name: "Protein Metadata",
            eventName: "proteinMetaShow",
            tooltip: "Load Protein Meta-Data from a local CSV file. See 'Expected CSV Format' within for syntax"
        },
    ];
    loadButtonData.forEach(function(bdata) {
        bdata.func = function() {
            CLMSUI.vent.trigger(bdata.eventName, true);
        };
    });
    new CLMSUI.DropDownMenuViewBB({
        el: "#loadDropdownPlaceholder",
        model: compModel.get("clmsModel"),
        myOptions: {
            title: "Load",
            menu: loadButtonData,
            tooltipModel: compModel.get("tooltipModel"),
        }
    });

    new CLMSUI.URLSearchBoxViewBB({
        el: "#urlSearchBox",
        model: compModel.get("filterModel"),
        displayEventName: "shareURL",
        myOptions: {}
    });

    new CLMSUI.xiNetControlsViewBB({
        el: "#xiNetButtonBar",
        model: compModel
    });

    // Set up a one-time event listener that is then called from allDataLoaded
    // Once this is done, the views depending on async loading data (blosum, uniprot) can be set up
    // Doing it here also means that we don't have to set up these views at all if these views aren't needed (e.g. for some testing or validation pages)
    CLMSUI.compositeModelInst.listenToOnce(CLMSUI.vent, "buildAsyncViews", function() {
        CLMSUI.init.viewsThatNeedAsyncData();
    });
};


CLMSUI.init.viewsEssential = function(options) {

    var filterModel = CLMSUI.compositeModelInst.get("filterModel");
    var singleTargetProtein = CLMSUI.compositeModelInst.get("clmsModel").targetProteinCount < 2;
    new CLMSUI.FilterViewBB({
        el: "#filterPlaceholder",
        model: filterModel,
        myOptions: {
            hide: {
                //todo: reinstate sensible hiding of controls, need listeners on these attributes
                //temp hack - dont hide anything, data may change when csv uploaded
                /*
                "selfLinks": singleTargetProtein,
                "betweenLinks": singleTargetProtein,
                "AUTO": !CLMSUI.compositeModelInst.get("clmsModel").get("autoValidatedPresent"),
                "ambig": !CLMSUI.compositeModelInst.get("clmsModel").get("ambiguousPresent"),
                "unval": !CLMSUI.compositeModelInst.get("clmsModel").get("unvalidatedPresent"),
                "linear": !CLMSUI.compositeModelInst.get("clmsModel").get("linearsPresent"),
                "protNames": singleTargetProtein,
                */
            }
        }
    });

    new CLMSUI.FilterSummaryViewBB({
        el: "#filterReportPlaceholder",
        model: CLMSUI.compositeModelInst,
    });

    if (CLMSUI.compositeModelInst.get("clmsModel").get("unvalidatedPresent") === false) {
        d3.select("#filterModeDiv").style("display", "none");
    }

    var miniMod = filterModel.get("matchScoreCutoff");
    var miniDistModelInst = new CLMSUI.BackboneModelTypes.MinigramModel({
        domainStart: miniMod[0] || 0,
        domainEnd: miniMod[1] || 1,
    });
    miniDistModelInst.data = function() {
        return CLMSUI.modelUtils.flattenMatches(CLMSUI.compositeModelInst.get("clmsModel").get("matches")); // matches is now an array of arrays - [matches, []];
    };

    // When the range changes on the mini histogram model pass the values onto the filter model
    filterModel.listenTo(miniDistModelInst, "change", function(model) {
        console.log("MSC change", [model.get("domainStart"), model.get("domainEnd")]);
        this.set("matchScoreCutoff", [model.get("domainStart"), model.get("domainEnd")]);
    }, this);

    new CLMSUI.MinigramViewBB({
            el: "#filterPlaceholderSliderHolder",
            model: miniDistModelInst,
            myOptions: {
                maxX: 0, // let data decide
                seriesNames: ["Targets", "Decoys"],
                //scaleOthersTo: "Matches",
                xlabel: "Score",
                ylabel: "Count",
                height: 65,
                colours: {
                    "Targets": "blue",
                    "Decoys": "red"
                }
            }
        })
        // If the ClmsModel matches attribute changes then tell the mini histogram view
        .listenTo(CLMSUI.compositeModelInst.get("clmsModel"), "change:matches", this.render) // if the matches change (likely?) need to re-render the view too
        .listenTo(filterModel, "change:matchScoreCutoff", function(filterModel, newCutoff) {
            this.model.set({
                domainStart: newCutoff[0],
                domainEnd: newCutoff[1]
            });
            //console.log ("cutoff changed");
        });


    // World of code smells vol.1
    // selectionViewer declared before spectrumWrapper because...
    // 1. Both listen to event A, selectionViewer to build table, spectrumWrapper to do other stuff
    // 2. Event A in spectrumWrapper fires event B
    // 3. selectionViewer listens for event B to highlight row in table - which means it must have built the table
    // 4. Thus selectionViewer must do its routine for event A before spectrumWrapper, so we initialise it first
    var selectionViewer = new CLMSUI.SelectionTableViewBB({
        el: "#bottomDiv",
        model: CLMSUI.compositeModelInst,
    });

    selectionViewer.lastCount = 1;
    selectionViewer.render();

    new SpectrumViewWrapper({
            el: options.specWrapperDiv,
            model: CLMSUI.compositeModelInst,
            displayEventName: "spectrumShow",
            myOptions: {
                wrapperID: "spectrumPanel",
                canBringToTop: options.spectrumToTop
            }
        })
        .listenTo(CLMSUI.vent, "individualMatchSelected", function(match) {
            if (match) {
                this.lastRequestedID = match.id; // async catch
                //console.log ("MATCH ID", this, match.id);
                this.primaryMatch = match; // the 'dynamic_rank = true' match
                var url = "../CLMS-model/php/spectrumMatches.php?sid=" +
                    this.model.get("clmsModel").get("sid") +
                    "&unval=1&linears=1&spectrum=" + match.spectrumId + "&matchid=" + match.id;
                var self = this;
                var jd = d3.json(url, function(error, json) {
                    if (error) {
                        console.log("error", error, "for", url, arguments);
                    } else {
                        // this works if first item in array has the same id, might in future send matchid to php to return for reliability
                        //var thisMatchID = json.rawMatches && json.rawMatches[0] ? json.rawMatches[0].id : -1;
                        var returnedMatchID = json.matchid;

                        //console.log ("json", json, self.lastRequestedID, thisMatchID, returnedMatchID);
                        if (returnedMatchID == self.lastRequestedID) { // == not === 'cos returnedMatchID is a atring and self.lastRequestedID is a number
                            //console.log (":-)", json, self.lastRequestedID, thisSpecID);
                            var altModel = new window.CLMS.model.SearchResultsModel();
                            altModel.parseJSON(json);
                            var allCrossLinks = CLMS.arrayFromMapValues(altModel.get("crossLinks"));
                            // empty selection first
                            // (important or it will crash coz selection contains links to proteins not in clms model)
                            self.alternativesModel
                                .set("selection", [])
                                .set("clmsModel", altModel)
                                .applyFilter()
                                .set("lastSelectedMatch", {
                                    match: match,
                                    directSelection: true
                                });
                            d3.select("#alternatives").style("display", altModel.get("matches").length === 1 ? "none" : "block");
                            //self.alternativesModel.set("selection", allCrossLinks);
                            self.alternativesModel.setMarkedCrossLinks("selection", allCrossLinks, false, false);
                            CLMSUI.vent.trigger("resizeSpectrumSubViews", true);
                        }
                    }
                });
                console.log("jd", jd);
            } else {
                //~ //this.model.clear();
            }
        });

    // xiSPEC.init(options.specWrapperDiv, {baseDir: CLMSUI.xiSpecBaseDir, xiAnnotatorBaseURL: CLMSUI.xiAnnotRoot});

    var xiSPEC_model_vars = {
        baseDir: CLMSUI.xiSpecBaseDir,
        xiAnnotatorBaseURL: CLMSUI.xiAnnotRoot,
        knownModificationsURL: CLMSUI.xiAnnotRoot + "annotate/knownModifications",
    }

    xiSPEC.init('modular_xispec', xiSPEC_model_vars, true);


    // Update spectrum view when external resize event called
    xiSPEC.Spectrum.listenTo(CLMSUI.vent, "resizeSpectrumSubViews", function() {
        this.resize();
    });
    xiSPEC.FragmentationKey.listenTo(CLMSUI.vent, "resizeSpectrumSubViews", function() {
        this.resize();
    });
    xiSPEC.ErrorIntensityPlot.listenTo(CLMSUI.vent, "resizeSpectrumSubViews", function() {
        this.render();
    });
    xiSPEC.ErrorMzPlot.listenTo(CLMSUI.vent, "resizeSpectrumSubViews", function() {
        this.render();
    });

    // "individualMatchSelected" in CLMSUI.vent is link event between selection table view and spectrum view
    // used to transport one Match between views
    xiSPEC.Spectrum.listenTo(CLMSUI.vent, "individualMatchSelected", function(match) {
        if (match) {
            var randId = CLMSUI.compositeModelInst.get("clmsModel").getSearchRandomId(match);
            CLMSUI.loadSpectrum(match, randId, this.model);
        } else {
            this.model.clear();
        }
    });

    // Generate data export drop down
    new CLMSUI.DropDownMenuViewBB({
        el: "#expDropdownPlaceholder",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
        myOptions: {
            title: "Export",
            menu: [{
                    name: "Filtered Links as CSV",
                    func: downloadLinks,
                    tooltip: "Produces a CSV File of Filtered Cross-Link data"
                },
                {
                    name: "Filtered Matches as CSV",
                    func: downloadMatches,
                    tooltip: "Produces a CSV File of Filtered Matches data"
                },
                {
                    name: "Filtered Residues as CSV",
                    func: downloadResidueCount,
                    tooltip: "Produces a CSV File of Count of Filtered Residues ",
                    sectionEnd: true
                },
                {
                    name: "Make Filtered XI URL",
                    func: function() {
                        CLMSUI.vent.trigger("shareURL", true);
                    },
                    tooltip: "Produces a URL that embeds the current filter state within it for later reproducibility"
                },
            ],
            tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel"),
        }
    });

    // Generate help drop down
    new CLMSUI.DropDownMenuViewBB({
        el: "#helpDropdownPlaceholder",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
        myOptions: {
            title: "Help",
            menu: [{
                    name: "Online Videos",
                    func: function() {
                        window.open("http://rappsilberlab.org/rappsilber-laboratory-home-page/tools/xiview/xiview-videos", "_blank");
                    },
                    tooltip: "A number of how-to videos are available on Vimeo, accessible via this link to the lab homepage"
                },
                {
                    name: "Report Issue on Github",
                    func: function() {
                        window.open("https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues", "_blank");
                    },
                    tooltip: "Opens a new browser tab for the GitHub issue tracker (You must be logged in to GitHub to view and add issues.)"
                },
                {
                    name: "About Xi View",
                    func: function() {
                        window.open("http://rappsilberlab.org/rappsilber-laboratory-home-page/tools/xiview/", "_blank");
                    },
                    tooltip: "About Xi View (opens external web page)"
                },
            ],
            tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel"),
        }
    });
    d3.select("#helpDropdownPlaceholder > div").append("img")
        .attr("class", "rappsilberImage")
        .attr("src", "./images/logos/rappsilber-lab-small.png")
        .on("click", function() {
            window.open("http://rappsilberlab.org", "_blank");
        });


    d3.select("body").append("div").attr({
        "id": "tooltip2",
        "class": "CLMStooltip"
    });
    new CLMSUI.TooltipViewBB({
        el: "#tooltip2",
        model: CLMSUI.compositeModelInst.get("tooltipModel")
    });

    //for scatterplots, etc in val page
    // This generates the legend div, we don't keep a handle to it - the event object has one
    new CLMSUI.KeyViewBB({
        el: "#keyPanel",
        displayEventName: "keyShow",
        model: CLMSUI.compositeModelInst,
    });

    new CLMSUI.SearchSummaryViewBB({
        el: "#searchSummaryPanel",
        displayEventName: "searchesShow",
        model: CLMSUI.compositeModelInst.get("clmsModel"),
    });


    new CLMSUI.utils.ColourCollectionOptionViewBB({
        el: "#linkColourDropdownPlaceholder",
        model: CLMSUI.linkColour.Collection,
        storeSelectedAt: {
            model: CLMSUI.compositeModelInst,
            attr: "linkColourAssignment"
        },
    });

    CLMSUI.compositeModelInst.listenTo(CLMSUI.linkColour.Collection, "aColourModelChanged", function(colourModel, newDomain) {
        console.log("col change args", arguments, this);
        if (this.get("linkColourAssignment") === colourModel) {
            this.trigger("currentColourModelChanged", colourModel, newDomain);
        }
    });

    // If more than one search, set group colour scheme to be default. https://github.com/Rappsilber-Laboratory/xi3-issue-tracker/issues/72
    CLMSUI.compositeModelInst.set(
        "linkColourAssignment",
        CLMSUI.compositeModelInst.get("clmsModel").get("searches").size > 1 ? CLMSUI.linkColour.groupColoursBB : CLMSUI.linkColour.defaultColoursBB
    );

    new CLMSUI.DistogramBB({
        el: "#distoPanel",
        model: CLMSUI.compositeModelInst,
        //colourScaleModel: CLMSUI.linkColour.distanceColoursBB,
        //colourScaleModel: CLMSUI.linkColour.defaultColoursBB,
        colourScaleModel: CLMSUI.linkColour.groupColoursBB,
        displayEventName: "distoShow",
        myOptions: {
            chartTitle: "Histogram",
            seriesName: "Actual"
        }
    });

    new CLMSUI.ScatterplotViewBB({
        el: "#scatterplotPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "scatterplotShow",
    });
};

CLMSUI.init.viewsThatNeedAsyncData = function() {
    /* 'cos circle listens to annotation model which is formed from uniprot async data */
    new CLMSUI.CircularViewBB({
        el: "#circularPanel",
        displayEventName: "circularShow",
        model: CLMSUI.compositeModelInst,
    });

    // Make a drop down menu constructed from the annotations collection
    new CLMSUI.AnnotationDropDownMenuViewBB({
        el: "#annotationsDropdownPlaceholder",
        collection: CLMSUI.compositeModelInst.get("annotationTypes"),
        myOptions: {
            title: "Annotations",
            closeOnClick: false,
            groupByAttribute: "category",
            labelByAttribute: "type",
            toggleAttribute: "shown",
            tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel"),
            sectionHeader: function(d) {
                return (d.category ? d.category.replace(/_/g, " ") : "Uncategorised") +
                    (d.source ? " (" + d.source + ")" : "");
            },
        }
    });

    new CLMS.xiNET.CrosslinkViewer({
        el: "#networkDiv",
        model: CLMSUI.compositeModelInst,
        //     myOptions: {layout: storedLayout}
    });

    // Alignment View
    new CLMSUI.AlignCollectionViewBB({
        el: "#alignPanel",
        collection: CLMSUI.compositeModelInst.get("alignColl"),
        displayEventName: "alignShow",
        tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel")
    });

    // This makes a matrix viewer
    new CLMSUI.DistanceMatrixViewBB({
        el: "#matrixPanel",
        model: CLMSUI.compositeModelInst,
        colourScaleModel: CLMSUI.linkColour.distanceColoursBB,
        displayEventName: "matrixShow",
    });

    // This makes a list viewer
    /*
    new CLMSUI.ListViewBB ({
        el: "#listPanel",
        model: CLMSUI.compositeModelInst,
        colourScaleModel: CLMSUI.linkColour.distanceColoursBB,
        displayEventName: "listShow",
    });
	*/

    // Make new ngl view with pdb dataset
    // In a horrific misuse of the MVC pattern, this view actually generates the 3dsync
    // event that other views are waiting for.
    new CLMSUI.NGLViewBB({
        el: "#nglPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "nglShow",
    });

    new CLMSUI.PDBFileChooserBB({
        el: "#pdbPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "pdbShow",
    });

    new CLMSUI.CSVFileChooserBB({
        el: "#csvPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "csvShow",
    });

    new CLMSUI.LinkMetaDataFileChooserBB({
        el: "#linkMetaLoadPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "linkMetaShow",
    });

    new CLMSUI.ProteinMetaDataFileChooserBB({
        el: "#proteinMetaLoadPanel",
        model: CLMSUI.compositeModelInst,
        displayEventName: "proteinMetaShow",
    });

    new CLMSUI.ProteinInfoViewBB({
        el: "#proteinInfoPanel",
        displayEventName: "proteinInfoShow",
        model: CLMSUI.compositeModelInst,
    });

    new CLMSUI.FDRViewBB({
        el: "#fdrPanel",
        //displayEventName: "fdrShow",
        model: CLMSUI.compositeModelInst.get("filterModel"),
    });

    new CLMSUI.FDRSummaryViewBB({
        el: "#fdrSummaryPlaceholder",
        //displayEventName: "fdrShow",
        model: CLMSUI.compositeModelInst,
    });

    //make sure things that should be hidden are hidden
    CLMSUI.compositeModelInst.trigger("hiddenChanged");

    // ByRei_dynDiv by default fires this on window.load (like this whole block), but that means the KeyView is too late to be picked up
    // so we run it again here, doesn't do any harm
    ByRei_dynDiv.init.main();
    //ByRei_dynDiv.db (1, d3.select("#subPanelLimiter").node());
};

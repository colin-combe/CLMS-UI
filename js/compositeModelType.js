var CLMSUI = CLMSUI || {};
CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend({
    
    initialize: function () {
        this.set ({
            highlights: [],         // listen to these two for differences in highlighted selected links
            selection: [],
            match_highlights: d3.map(), // listen to these two for differences in highlighted selects matches (more fine grained)
            match_selection: d3.map(),  // listen to event selection/highlights+"MatchesLinksChanged" to run when both have been fully updated
            annotationTypes: null,
            selectedProtein: null, //what type should this be? Set?
            groupColours: null // will be d3.scale for colouring by search/group
        });
    },
    
    applyFilter: function () {
        var filterModel = this.get("filterModel");
        var clmsModel = this.get("clmsModel");
        var crossLinksArr = CLMS.arrayFromMapValues(clmsModel.get("crossLinks"));
        var clCount = crossLinksArr.length;
        var result;

        if (filterModel) {
            filterModel.processTextFilters(); // saves doing stuff later on for every match
        }
        // if its FDR based filtering,
        // set all matches fdrPass att to false, then calc
        if (filterModel && filterModel.get("fdrMode")) {
            var matches = clmsModel.get("matches");
            for (var m = 0; m < matches.length; ++m) {
                matches[m].fdrPass = false;
            }
            result = CLMSUI.fdr (crossLinksArr, {
                filterModel: filterModel,
                CLMSModel: clmsModel,
                threshold: filterModel.get("fdrThreshold"),
                filterLinears: true,
            });

            filterModel.set({
                "interFdrCut": result[0].thresholdMet ? result[0].fdr : undefined, // undefined what threshold score should be if all links fail fdr
                "intraFdrCut": result[1].thresholdMet ? result[1].fdr : undefined
            }, {
                silent: true
            });

        }

        var proteinMatchFunc = clmsModel.isMatchingProteinPairFromIDs.bind(clmsModel);

        function filterCrossLink (crossLink) {
            crossLink.filteredMatches_pp = [];
            if (filterModel.get("fdrMode")) {
                // FDR mode
                var pass;
                if (crossLink.meta && crossLink.meta.meanMatchScore !== undefined) {
                    var fdr = crossLink.meta.meanMatchScore;
                    var self = crossLink.isSelfLink();
                    var cut = self ? result[1].fdr : result[0].fdr;
                    pass = fdr >= cut;
                }

                if (pass) {
                    var filteredMatches_pp = crossLink.matches_pp.filter(
                        function (value) {
                            return filterModel.subsetFilter(value.match, proteinMatchFunc);
                        }
                    );

                    crossLink.ambiguous = !filteredMatches_pp.some(function (matchAndPepPos) {
                        return matchAndPepPos.match.crossLinks.length === 1;
                    });
                    //~ var filteredMatches_pp = crossLink.filteredMatches_pp;
                    crossLink.filteredMatches_pp = [];
                    var filteredMatchCount = filteredMatches_pp.length;
                    for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
                        var fm_pp = filteredMatches_pp[fm_pp];
                        //set its fdr pass att to true even though it may not be in final results 
                        fm_pp.match.fdrPass = true;
                        //check its not manually hidden and meets navigation filter
                        if (crossLink.fromProtein.manuallyHidden != true 
                            && (!crossLink.toProtein || crossLink.toProtein.manuallyHidden != true)
                            && filterModel.navigationFilter(fm_pp.match)) {
                            crossLink.filteredMatches_pp.push(fm_pp);
                        }
                    }
                } else {
                    crossLink.filteredMatches_pp = [];
                }
                //~ else {
                //~ alert("i just failed fdr check");
                //~ }
            } else {
                //not FDR mode
                if (crossLink.fromProtein.manuallyHidden != true && (!crossLink.toProtein || crossLink.toProtein.manuallyHidden != true)) {
                    crossLink.ambiguous = true;
                    crossLink.confirmedHomomultimer = false;
                    var matches_pp = crossLink.matches_pp;
                    var matchCount = matches_pp.length;
                    for (var m = 0; m < matchCount; m++) {
                        var matchAndPepPos = matches_pp[m];
                        var match = matchAndPepPos.match;
                        var pass = filterModel.subsetFilter (match, proteinMatchFunc) &&
                            filterModel.validationStatusFilter (match) &&
                            filterModel.scoreFilter (match) &&
                            filterModel.decoyFilter (match)
                        ;
                        
                        // Either 1.
                        // this beforehand means navigation filters do affect ambiguous state of crosslinks
                        // pass = pass && filterModel.navigationFilter(match);
                        
                        if (pass && match.crossLinks.length === 1) {
                            crossLink.ambiguous = false;
                        }
                        
                        // Or 2.
                        // this afterwards means navigation filters don't affect ambiguous state of crosslinks
                        pass = pass && filterModel.navigationFilter(match);

                        if (pass) {
                            crossLink.filteredMatches_pp.push (matchAndPepPos);
                            // TODO: match reporting as homomultimer if ambiguous and one associated crosslink is homomultimeric
                            if (match.confirmedHomomultimer && crossLink.isSelfLink()) {
                                crossLink.confirmedHomomultimer = true;
                            }
                        }
                    }
                }
            }
        }
        
        
        var a = performance.now();
        
        for (var i = 0; i < clCount; ++i) {
            var crossLink = crossLinksArr[i];
            if (filterModel) {
                filterCrossLink(crossLink);
            } else { // no filter model, let everything thru
                crossLink.filteredMatches_pp = crossLink.matches_pp;
            }
        }

        var b = performance.now();
        console.log ("ser filtering time", (b-a), "ms");

        
        this.filteredXLinks = {
            all: [],    // all filtered crosslinks
            targets: [],    // non-decoy non-linear links
            linears: [],    // all linear links
            linearTargets: [],  // non-decoy linear links
            decoysTD: [],   // links with a decoy protein at one end (will include any decoy linears)
            decoysDD: [],   // links with decoy proteins at both ends
        };
        // all = targets + linearTargets + decoysTD + decoysDD
        // count of decoy linears = linears - linearTargets
        

        for (var i = 0; i < clCount; ++i) {
            var crossLink = crossLinksArr[i];
            if (crossLink.filteredMatches_pp.length) {
                this.filteredXLinks.all.push(crossLink);
                var linear = crossLink.isLinearLink();
                if (linear) {
                    this.filteredXLinks.linears.push(crossLink);
                }
                if (!crossLink.isDecoyLink()) {
                    // is it a linear or normal target, stick it in the right sub-cache
                    this.filteredXLinks[linear ? "linearTargets" : "targets"].push(crossLink);
                } else {
                    // is it a TD or DD decoy, stick it in the right sub-cache
                    var decoyLinkCache = crossLink.fromProtein.is_decoy && !linear && crossLink.toProtein.is_decoy ? "decoysDD" : "decoysTD";
                    this.filteredXLinks[decoyLinkCache].push(crossLink);
                }
            }
        }
//        console.log ("xlinks", this.filteredXLinks);

        //hiding linkless participants  
        CLMS.arrayFromMapValues(clmsModel.get("participants")).forEach (function (participant) {
            participant.hidden = true;
            var partCls = participant.crossLinks;
            for (var pCl = 0; pCl < partCls.length; ++pCl) {
                var pCrossLink = partCls[pCl];
                if (pCrossLink.filteredMatches_pp.length &&
                    !pCrossLink.isDecoyLink() &&
                    !pCrossLink.isLinearLink()) {
                    participant.hidden = false;
                    break;
                }
            }
        });
        
        /*
        var cfilter = crossfilter (clmsModel.get("matches"));
        var subsetDimension = cfilter.dimension (function (match) {
            return filterModel.subsetFilter (match, proteinMatchFunc);
        });
        subsetDimension.filterExact (true);
        console.log (cfilter.allFiltered());
        */
        

        this.trigger("filteringDone");
        this.trigger("hiddenChanged");

        return this;
        
    },

    getFilteredCrossLinks: function (type) { // if type of crosslinks not declared, make it 'targets' by default
        return this.filteredXLinks[type || "targets"];
    },

    collateMatchRegions: function (crossLinks) {
        var fromPeptides = [],
            toPeptides = [],
            regs = [],
            prots = {};
        crossLinks.forEach(function (crossLink) {
            crossLink.filteredMatches_pp.forEach(function (matchAndPepPos) {
                console.log("match", match);
                var smatch = matchAndPepPos.match;
                var prot1 = smatch.matchedPeptides[0].prt[0];
                var prot2 = smatch.matchedPeptides[1].prt[0];
                prots[prot1] = prots[prot1] || [];
                prots[prot2] = prots[prot2] || [];

                var fromPepStart = matchAndPepPos.pepPos[0].start - 1;
                var fromPepLength = matchAndPepPos.pepPos[0].length;
                var toPepStart = matchAndPepPos.pepPos[1].start - 1;
                var toPepLength = matchAndPepPos.pepPos[1].length;

                prots[prot1].push({
                    protein: prot1,
                    start: fromPepStart,
                    end: fromPepStart + fromPepStart
                });
                prots[prot2].push({
                    protein: prot2,
                    start: toPepStart,
                    end: toPepStart + toPepLength
                });
            });
        });

        console.log("match regions", prots);

        return prots;
    },
    
    getMarkedMatches: function (modelProperty) {
        return this.get("match_"+modelProperty);
    },
    
    getMarkedCrossLinks: function (modelProperty) {
        return this.get(modelProperty);
    },
    
    setMarkedMatches: function (modelProperty, matches, andAlternatives, add, dontForward) {
        if (matches) {  // if undefined nothing happens, to clear selection pass an empty array - []
            var type = "match_"+modelProperty;
            var map = add ? new d3.map (this.get(type).values(), function(d) { return d.id; }) : new d3.map();
            matches.forEach (function (match) {
                var mmatch = match.match;
                map.set (mmatch.id, mmatch);    
            });
            this.set (type, map);

            if (!dontForward) {
                var clinkset = d3.set();
                var crossLinks = [];
                var dedupedMatches = map.values();
                dedupedMatches.forEach (function (match) {
                    var clinks = match.crossLinks;
                    for (var c = 0; c < clinks.length; c++) {
                        var clink = clinks[c];
                        var clinkid = clink.id;
                        if (!clinkset.has(clinkid)) {
                            clinkset.add (clinkid);
                            crossLinks.push (clink);
                        }
                    }
                });

                var matchesChanged = this.changedAttributes();
                // add = false on this call, 'cos crosslinks from existing marked matches will already be picked up in this routine if add is true
                this.setMarkedCrossLinks (modelProperty, crossLinks, andAlternatives, false, true);
                this.triggerFinalMatchLinksChange (modelProperty, matchesChanged);
            }
        }
    },

    // modelProperty can be "highlights" or "selection" (or a new one) depending on what array you want
    // to fill in the model
    setMarkedCrossLinks: function (modelProperty, crossLinks, andAlternatives, add, dontForward) {
        if (crossLinks) { // if undefined nothing happens, to clear selection pass an empty array - []
            if (add) {
                crossLinks = crossLinks.concat (this.get(modelProperty));
            }
            var crossLinkMap = d3.map (crossLinks, function (d) {
                return d.id;
            });

            if (andAlternatives) {
                crossLinks.forEach(function (crossLink) {
                    if (crossLink.ambiguous) {
                        //this.recurseAmbiguity (crossLink, crossLinkMap);                        
                        var filteredMatchesAndPeptidePositions = crossLink.filteredMatches_pp;
                        var fm_ppCount = filteredMatchesAndPeptidePositions.length;
                        for (var fm_pp = 0; fm_pp < fm_ppCount; fm_pp++) {
                            var crossLinks = filteredMatchesAndPeptidePositions[fm_pp].match.crossLinks;
                            var clCount = crossLinks.length;

                            for (var cl = 0; cl < clCount; cl++) {
                                var mCrossLink = crossLinks[cl];
                                crossLinkMap.set(mCrossLink.id, mCrossLink);
                            }
                        }
                    }
                }, this);
            }
            
            // is d3 map, so .values always works, don't need to worry about whether ie11 supports Array.from (in fact ie11 gets keys/values wrong way round if we call CLMS.array...)
            var dedupedCrossLinks = crossLinkMap.values(); //CLMS.arrayFromMapValues(crossLinkMap);
            this.set (modelProperty, dedupedCrossLinks);
            
            if (!dontForward) {
                var matches = [];
                dedupedCrossLinks.forEach (function (clink) {
                    matches = matches.concat (clink.filteredMatches_pp);
                });
                //console.log (modelProperty, "matches", matches);
                this.setMarkedMatches (modelProperty, matches, andAlternatives, add, true);
                
                var linksChanged = this.changedAttributes();
                this.setMarkedMatches (modelProperty, matches, andAlternatives, add, true);
                this.triggerFinalMatchLinksChange (modelProperty, linksChanged);
            }
            
            //this.set (modelProperty, dedupedCrossLinks);
        }
    },
    
    triggerFinalMatchLinksChange: function (modelProperty, penultimateSetOfChanges) {
        // if either of the last two backbone sets did have a change then trigger an event
        // so views waiting for both links and matches to finish updating can act
        var lastSetOfChanges = this.changedAttributes();
        if (penultimateSetOfChanges || lastSetOfChanges) {
            this.trigger (modelProperty+"MatchesLinksChanged", this);
        }
    },

    //what type should selectedProtein be? Set? Array? Is a map needed?
    // agree map's not needed, prob just Array - cc
    setSelectedProteins: function (idArr, add) {
        var map = add ? new Map(this.get("selectedProtein")) : new Map();
        if (add && idArr.length == 1 && map.has(idArr[0])) { // if ctrl/shift click and already selected the remove
            map.delete(idArr[0]);
        } else {
            idArr.forEach(function (id) {
                map.set(id, this.get("clmsModel").get("participants").get(id));
            }, this);
        }
        //console.log ("map eq", map == this.get("selectedProtein"));
        // Currently (03/06/16) Maps/Sets don't trigger change functions even for new Objects
        // https://github.com/jashkenas/underscore/issues/2451
        // So need to force change event
        this.set("selectedProtein", map);
        this.trigger("change:selectedProtein", this);
        console.log("map", this.get("selectedProtein"));
    },
    
    invertSelectedProteins: function () {
        var idsToSelect = [];
        var participantsArr = CLMS.arrayFromMapValues(this.get("clmsModel").get("participants"));
        var participantCount = participantsArr.length;
        var selected = CLMS.arrayFromMapKeys(this.get("selectedProtein"));
        for (var p = 0; p < participantCount; p++) {
            var id = participantsArr[p].id;
            if (selected.indexOf(id) == -1) {
                idsToSelect.push(id);
            }
        }
        this.setSelectedProteins(idsToSelect);
    },
    
    hideSelectedProteins: function () {     
        var selectedArr = CLMS.arrayFromMapValues(this.get("selectedProtein"));
        var selectedCount = selectedArr.length;
        for (var s = 0; s < selectedCount; s++) {
            var participant = selectedArr[s];
            participant.manuallyHidden = true;
        }
        this.setSelectedProteins([]);
        this.get("filterModel").trigger("change");
             
    },
    
    showHiddenProteins: function () {       
        var participantsArr = CLMS.arrayFromMapValues(this.get("clmsModel").get("participants"));
        var participantCount = participantsArr.length;
        for (var p = 0; p < participantCount; p++) {
            participantsArr[p].manuallyHidden = false;
        }
        
        this.get("filterModel").trigger("change");
    },

    
    stepOutSelectedProteins: function () {      
        var selectedArr = CLMS.arrayFromMapValues(this.get("selectedProtein"));
        var selectedCount = selectedArr.length;
        var idsToSelect = new Set ();
        for (var s = 0; s < selectedCount; s++) {
            var participant = selectedArr[s];
            var crossLinks = participant.crossLinks;
            var clCount = crossLinks.length;
            for (var cl = 0; cl < clCount; cl++){
                var crossLink = crossLinks[cl];
                var fromProtein = crossLink.fromProtein;
                if (fromProtein.is_decoy != true) {
                    fromProtein.manuallyHidden = false;
                    idsToSelect.add(fromProtein.id);
                }
                if (crossLink.toProtein && crossLink.toProtein.is_decoy != true) {
                    var toProtein = crossLink.toProtein;
                    toProtein.manuallyHidden = false;
                    idsToSelect.add(toProtein.id);                  
                }
            }
        }
                    
        this.get("filterModel").trigger("change");
        this.setSelectedProteins(Array.from(idsToSelect));

    },

    getSingleCrosslinkDistance: function (xlink, distancesObj, protAlignCollection, options) {
        // distancesObj and alignCollection can be supplied to function or, if not present, taken from model
        distancesObj = distancesObj || this.get("clmsModel").get("distancesObj");
        protAlignCollection = protAlignCollection || this.get("alignColl");
        options = options || {
            average: false
        };
        if (options.calcDecoyProteinDistances) {
            if (xlink.fromProtein.is_decoy) {
                options.realFromPid = xlink.fromProtein.realProteinID; //this.get("clmsModel").getRealProteinID(xlink.fromProtein.id);
            }
            if (xlink.toProtein.is_decoy) {
                options.realToPid = xlink.toProtein.realProteinID; //this.get("clmsModel").getRealProteinID(xlink.toProtein.id);
            }
        }

        return distancesObj ? distancesObj.getXLinkDistance(xlink, protAlignCollection, options) : undefined;
    },

    // includeUndefineds to true to preserve indexing of returned distances to input crosslinks
    getCrossLinkDistances: function (crossLinks, options) {
        options = options || {};
        var includeUndefineds = options.includeUndefineds || false;

        var distArr = [];
        var distModel = this.get("clmsModel").get("distancesObj");
        var protAlignCollection = this.get("alignColl");
        var clCount = crossLinks.length;
        for (var cl = 0; cl < clCount; cl++) {
            var dist = this.getSingleCrosslinkDistance(crossLinks[cl], distModel, protAlignCollection, options);
            if (dist != null) {
                distArr.push(options.returnChainInfo ? dist : +dist); // + is to stop it being a string
            } else if (includeUndefineds) {
                distArr.push(undefined);
            }
        }
        //console.log ("distArr", distArr);

        return distArr;
    },
});

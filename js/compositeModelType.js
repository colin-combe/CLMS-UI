var CLMSUI = CLMSUI || {};
CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend({

    initialize: function() {
        this.set({
            highlights: [], // listen to these two for differences in highlighted selected links
            selection: [],
            match_highlights: d3.map(), // listen to these two for differences in highlighted selects matches (more fine grained)
            match_selection: d3.map(), // listen to event selection/highlights+"MatchesLinksChanged" to run when both have been fully updated
            annotationTypes: null,
            selectedProteins: [],
            highlightedProteins: [],
            TTCrossLinkCount: 0,
            xinetDragToPan: true,
            xinetFixSelected: false,
            xinetShowLabels: true,
            xinetFixedSize: true,
            xinetThickLinks: true,
            xinetPpiSteps: [2, 3],
            groups: new Map (),
        });

        this.listenTo(this.get("clmsModel"), "change:matches", function() {
            this.calcAndStoreTTCrossLinkCount();
        });

        // Clear fdr information from crosslinks when switching out of fdr mode
        this.listenTo(this.get("filterModel"), "change:fdrMode", function(filterModel) {
            if (!filterModel.get("fdrMode")) {
                // Need to clear all crosslinks as they all get valued
                CLMSUI.clearFdr(this.getAllCrossLinks());
            }
        });


        this.listenTo (CLMSUI.vent, "recalcLinkDistances", function () {
            if (this.get("clmsModel")) {    // bar the alternative model from doing this because it has no crosslinks and will crash
                this.getCrossLinkDistances (this.getAllCrossLinks());
            }
        });

        this.calcAndStoreTTCrossLinkCount();
    },

    // Set cross-link homomultimer states to true if any constituent matches are homomultimer
    // This means when we grab distances we get the worst-case distance (useful for setting ranges)
    // Another call to applyFilter will set them back to normal
    calcWorstCaseHomomultimerStates: function () {
        var crossLinksArr = this.getAllCrossLinks();
        crossLinksArr.forEach (function (clink) {
            clink.confirmedHomomultimer = false;
            if (clink.isSelfLink()) {
                clink.confirmedHomomultimer = _.any (clink.matches_pp, function (m) { return m.match.confirmedHomomultimer;});
            }
        });
        return this;
    },

    // Get distances if links are made homomultimer if possible, needed to generate initial distance range
    getHomomDistances: function (crossLinkArr) {
        // Store current homo states
        var oldHom = _.pluck (crossLinkArr, "confirmedHomomultimer");

        // Calculate
        this.calcWorstCaseHomomultimerStates();
        var dists = this.getCrossLinkDistances (crossLinkArr);  // regenerate distances for all crosslinks

        // Restore original homom states and distances
        crossLinkArr.forEach (function (clink, i) {
            clink.confirmedHomomultimer = oldHom[i];
        });
        this.getCrossLinkDistances (crossLinkArr);

        return dists;
    },

    applyFilter: function() {
        var filterModel = this.get("filterModel");
        var clmsModel = this.get("clmsModel");
        var crossLinksArr = this.getAllCrossLinks();
        var clCount = crossLinksArr.length;
        var searches = CLMS.arrayFromMapValues(clmsModel.get("searches"));
        var result;

        if (filterModel) {
            filterModel.preprocessFilterInputValues (searches); // saves doing stuff later on for every match
        }
        // if its FDR based filtering,
        // set all matches fdrPass att to false, then calc
        if (filterModel && filterModel.get("fdrMode")) {
            var matches = clmsModel.get("matches");
            for (var m = 0; m < matches.length; ++m) {
                matches[m].fdrPass = false;
            }
            result = CLMSUI.fdr(crossLinksArr, {
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

        function filterCrossLink(crossLink) {
            crossLink.filteredMatches_pp = [];
            var isSelf = crossLink.isSelfLink();

            if (filterModel.get("fdrMode")) {
                // FDR mode
                crossLink.confirmedHomomultimer = false;

                var linkPass = false;
                var mms = crossLink.getMeta("meanMatchScore");
                if (mms !== undefined) {
                    var cut = isSelf ? result[1].fdr : result[0].fdr;
                    linkPass = mms >= cut;
                }

                if (linkPass) {
                    var filteredMatches_pp = crossLink.matches_pp.filter(
                        function(value) {
                            return filterModel.subsetFilter(value.match);
                        }
                    );

                    crossLink.ambiguous = !filteredMatches_pp.some(function(matchAndPepPos) {
                        return matchAndPepPos.match.crossLinks.length === 1;
                    });
                    //~ var filteredMatches_pp = crossLink.filteredMatches_pp;
                    crossLink.filteredMatches_pp = [];
                    var filteredMatchCount = filteredMatches_pp.length;

                    for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
                        //var fm_pp = filteredMatches_pp[fm_pp];
                        var fm = filteredMatches_pp[fm_pp];
                        var match = fm.match;
                        //set its fdr pass att to true even though it may not be in final results
                        match.fdrPass = true;
                        var pass = crossLink.fromProtein.manuallyHidden != true &&
                            (!crossLink.toProtein || crossLink.toProtein.manuallyHidden != true) &&
                            filterModel.navigationFilter(match) &&
                            filterModel.groupFilter(match);

                        if (pass) {
                            crossLink.filteredMatches_pp.push(fm);
                            // TODO: match reporting as homomultimer if ambiguous and one associated crosslink is homomultimeric
                            if (match.confirmedHomomultimer && isSelf) {
                                crossLink.confirmedHomomultimer = true;
                            }
                        }
                    }

                    if (!filterModel.distanceFilter (crossLink)) {
                        crossLink.filteredMatches_pp = [];
                    }
                }
                //~ else {
                //~ alert("i just failed fdr check");
                //~ }
            } else {
                //not FDR mode
                if (crossLink.fromProtein.manuallyHidden != true && (!crossLink.toProtein || crossLink.toProtein.manuallyHidden != true)) {
                    crossLink.ambiguous = true;
                    crossLink.confirmedHomomultimer = false;

                    //if (filterModel.distanceFilter (crossLink)) {
                        var matches_pp = crossLink.matches_pp;
                        var matchCount = matches_pp.length;
                        for (var m = 0; m < matchCount; m++) {
                            var matchAndPepPos = matches_pp[m];
                            var match = matchAndPepPos.match;
                            var pass = filterModel.subsetFilter(match) &&
                                filterModel.validationStatusFilter(match) &&
                                filterModel.scoreFilter(match) &&
                                filterModel.decoyFilter(match);

                            // Either 1.
                            // this beforehand means navigation filters do affect ambiguous state of crosslinks
                            // pass = pass && filterModel.navigationFilter(match);

                            if (pass && match.crossLinks.length === 1) {
                                crossLink.ambiguous = false;
                            }

                            // Or 2.
                            // this afterwards means navigation filters don't affect ambiguous state of crosslinks
                            pass = pass && filterModel.navigationFilter(match) && filterModel.groupFilter(match);

                            if (pass) {
                                crossLink.filteredMatches_pp.push(matchAndPepPos);
                                // TODO: match reporting as homomultimer if ambiguous and one associated crosslink is homomultimeric
                                if (match.confirmedHomomultimer && isSelf) {
                                    crossLink.confirmedHomomultimer = true;
                                }
                            }
                        }
                    //}

                    if (!filterModel.distanceFilter (crossLink)) {
                        crossLink.filteredMatches_pp = [];
                    }
                }
            }
        }


        var a = performance.now();

        var homomultiSwitchers = [];
        for (var i = 0; i < clCount; ++i) {
            var crossLink = crossLinksArr[i];
            var oldHM = crossLink.confirmedHomomultimer;
            if (filterModel) {
                filterCrossLink(crossLink);
            } else { // no filter model, let everything thru
                crossLink.filteredMatches_pp = crossLink.matches_pp;
            }

            // If homomultimer state changes, then sensible minimum distance will generally change
            if (oldHM !== crossLink.confirmedHomomultimer) {
                homomultiSwitchers.push (crossLink);
            }
        }
        this.getCrossLinkDistances (homomultiSwitchers);    // recalculate distances for crosslinks whose homomultimer status has changed

        // Filters after this point are those that depend on results of previous filtering

        // Remove crosslinks with matches in multiple groups if filterModel's multipleGroup setting set to false
        if (filterModel && !filterModel.get("multipleGroup")) {
            crossLinksArr.forEach (function (crossLink) {
                if (!filterModel.groupFilter2 (crossLink.filteredMatches_pp)) {
                    crossLink.filteredMatches_pp = [];
                }
            }, this);
        }

        var b = performance.now();
        console.log("ser filtering time", (b - a), "ms");


        //hack for francis, take out protein-protein links with only one supporting cross-link
        if (filterModel) {
            var uniqueResiduePairsPerPPI = filterModel.get("urpPpi");
            if (uniqueResiduePairsPerPPI > 1) {
                var value, key, crossLink;
                var ppiMap = new Map();
                var crossLinksArr = this.getAllCrossLinks();
                var clCount = crossLinksArr.length;
                for (var c = 0; c < clCount; c++) {
                    crossLink = crossLinksArr[c];
                    if (crossLink.filteredMatches_pp.length) {
                        var key = crossLink.toProtein.id + " - " + crossLink.fromProtein.id;
                        value = ppiMap.get(key);
                        if (typeof value == "undefined") {
                            value = 1;
                        } else {
                            value++;
                        }
                        ppiMap.set(key, value);
                    }
                }
                for (c = 0; c < clCount; c++) {
                    crossLink = crossLinksArr[c];
                    key = crossLink.toProtein.id + " - " + crossLink.fromProtein.id;
                    value = ppiMap.get(key);
                    if (value < uniqueResiduePairsPerPPI) {
                        crossLink.filteredMatches_pp = [];
                    }
                }
            }
        }

        this.filteredXLinks = {
            all: [], // all filtered crosslinks
            targets: [], // non-decoy non-linear links
            linears: [], // all linear links
            linearTargets: [], // non-decoy linear links
            decoysTD: [], // links with a decoy protein at one end (will include any decoy linears)
            decoysDD: [], // links with decoy proteins at both ends
        };

        this.filteredStats = {
            ppi: 0
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
        //console.log ("xlinks", this.filteredXLinks);

        //hiding linkless participants
        CLMS.arrayFromMapValues(clmsModel.get("participants")).forEach(function(participant) {
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
            return filterModel.subsetFilter (match);
        });
        subsetDimension.filterExact (true);
        console.log (cfilter.allFiltered());
        */
        this.trigger("hiddenChanged");
        this.trigger("filteringDone");

        return this;
    },

    getFilteredCrossLinks: function(type) { // if type of crosslinks not declared, make it 'targets' by default
        return this.filteredXLinks[type || "targets"];
    },

    getFilteredDatum: function (key) {
        return this.filteredStats[key];
    },

    getAllCrossLinks: function () {
        return CLMS.arrayFromMapValues (this.get("clmsModel").get("crossLinks"));
    },

    getAllTTCrossLinks: function () {
        var clmsModel = this.get("clmsModel");
        if (clmsModel) {
            var ttCrossLinks = this.getAllCrossLinks().filter(function(link) {
                return !link.isDecoyLink() && !link.isLinearLink() && !link.isMonoLink();
            });
            return ttCrossLinks;
        }
        return null;
    },

    calcAndStoreTTCrossLinkCount: function() {
        var ttCrossLinks = this.getAllTTCrossLinks();
        if (ttCrossLinks !== null) {
            this.set("TTCrossLinkCount", ttCrossLinks.length);
        }
    },

    getMarkedMatches: function(modelProperty) {
        return this.get("match_" + modelProperty);
    },

    getMarkedCrossLinks: function(modelProperty) {
        return this.get(modelProperty);
    },

    setMarkedMatches: function(modelProperty, matches, andAlternatives, add, dontForward) {
        if (matches) { // if undefined nothing happens, to clear selection pass an empty array - []
            var type = "match_" + modelProperty;
            var map = add ? new d3.map(this.get(type).values(), function(d) {
                return d.id;
            }) : new d3.map();
            //console.log ("MAP", map.values());
            var potentialToggle = (modelProperty === "selection");
            matches.forEach(function(match) {
                if (match.match) match = match.match;
                var id = match.id;
                // can't delete individual matches as existing/new matches are mixed in already
                // add new matches. If adding to pre-selected matches, toggle new matches depending on whether the match is already selected or not

                if (potentialToggle && add && map.has(id)) {
                    map.remove(id);
                } else {
                    map.set(id, match);
                }
            });
            this.set(type, map);

            if (!dontForward) {
                // calculate crosslinks from selected matches
                var clinkMap = d3.map();
                var dedupedMatches = map.values();
                dedupedMatches.forEach(function(match) {
                    var clinks = match.crossLinks;
                    for (var c = 0; c < clinks.length; c++) {
                        var clink = clinks[c];
                        clinkMap.set(clink.id, clink);
                    }
                });
                var crossLinks = clinkMap.values();

                var matchesChanged = this.changedAttributes();
                // add = false on this call, 'cos crosslinks from existing marked matches will already be picked up in this routine if add is true
                this.setMarkedCrossLinks(modelProperty, crossLinks, andAlternatives, false, true);
                this.triggerFinalMatchLinksChange(modelProperty, matchesChanged);
            }
        }
    },

    // modelProperty can be "highlights" or "selection" (or a new one) depending on what array you want
    // to fill in the model
    setMarkedCrossLinks: function(modelProperty, crossLinks, andAlternatives, add, dontForward) {
        if (crossLinks) { // if undefined nothing happens, to clear selection pass an empty array - []
            var removedLinks = d3.map();
            var newlyAddedLinks = d3.map();

            // If adding to existing crosslinks, make crossLinkMap from the existing crosslinks and add or remove the new array of crosslinks from it.
            // Otherwise just make crossLinkMap from the new array of crosslinks
            var crossLinkMap = d3.map(add ? this.get(modelProperty) : crossLinks, function(d) {
                return d.id;
            });
            if (add) {
                var potentialToggle = (modelProperty === "selection");

                // add new cross-links. If adding to pre-selected cross-links, toggle new cross-links depending on whether the cross-link is already selected or not
                crossLinks.forEach(function(xlink) {
                    var id = xlink.id;
                    if (potentialToggle && crossLinkMap.has(id)) {
                        crossLinkMap.remove(id);
                        removedLinks.set(id, xlink);
                    } else {
                        crossLinkMap.set(id, xlink);
                        newlyAddedLinks.set(id, xlink);
                    }
                });
                crossLinks = crossLinkMap.values();
            }

            if (andAlternatives) {
                crossLinks.forEach(function(crossLink) {
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
            var dedupedCrossLinks = crossLinkMap.values(); // CLMS.arrayFromMapValues(crossLinkMap);
            this.set(modelProperty, dedupedCrossLinks);

            if (!dontForward) {
                // calculate matches from existing and newly selected crosslinks
                var existingMatches = add ? this.get("match_" + modelProperty).values() : [];
                var newMatchesFromTheseLinks = add ? newlyAddedLinks.values() : dedupedCrossLinks;
                var newMatchArray = newMatchesFromTheseLinks.map(function(clink) {
                    return _.pluck(clink.filteredMatches_pp, "match");
                });
                newMatchArray.push(existingMatches);
                var allMatches = d3.merge(newMatchArray);

                if (add) {
                    var removedMatches = d3.merge(removedLinks.values().map(function(clink) {
                        return _.pluck(clink.filteredMatches_pp, "match");
                    }));
                    allMatches = _.difference(allMatches, removedMatches);
                }

                //console.log ("matches", allMatches);
                var linksChanged = this.changedAttributes(); // did setting links property prompt changes in backbone?
                this.setMarkedMatches(modelProperty, allMatches, andAlternatives, false, true);
                this.triggerFinalMatchLinksChange(modelProperty, linksChanged);
            }
        }
    },

    triggerFinalMatchLinksChange: function(modelProperty, penultimateSetOfChanges) {
        // if either of the last two backbone set operations did cause a change then trigger an event
        // so views waiting for both links and matches to finish updating can act
        var lastSetOfChanges = this.changedAttributes();
        if (penultimateSetOfChanges || lastSetOfChanges) {
            this.trigger(modelProperty + "MatchesLinksChanged", this);
        }
    },

    setHighlightedProteins: function(pArr, add) {
        var toHighlight = add ? pArr.concat(this.get("highlightedProteins")) : pArr;
        toHighlight = d3.map(toHighlight, function(d) {
            return d.id;
        }).values(); // remove any duplicates and returns a new array, so setting fires a change
        this.set("highlightedProteins", toHighlight);
    },

    setSelectedProteins: function(pArr, add) {
        var toSelect = add ? this.get("selectedProteins").slice() : []; //see note below
        if (add && pArr.length == 1 && toSelect.indexOf(pArr[0]) > -1) { // if ctrl/shift click and already selected the remove
            toSelect = toSelect.filter(function(el) {
                return el !== pArr[0];
            });
        } else {
            for (var p = 0; p < pArr.length; p++) {
                var protein = pArr[p];
                if (toSelect.indexOf(protein) == -1) {
                    toSelect.push(protein);
                }
            }
        }
        this.set("selectedProteins", toSelect); //the array.slice() clones the array so this triggers a change
    },

    hideSelectedProteins: function() {
        var selectedArr = this.get("selectedProteins");
        var selectedCount = selectedArr.length;
        for (var s = 0; s < selectedCount; s++) {
            var participant = selectedArr[s];
            participant.manuallyHidden = true;
        }
        this.setSelectedProteins([]);
        this.get("filterModel").trigger("change", this.get("filterModel"));

    },

    hideUnselectedProteins: function() {
        var participantsArr = CLMS.arrayFromMapValues(this.get("clmsModel").get("participants"));
        var participantCount = participantsArr.length;
        var selected = this.get("selectedProteins");
        for (var p = 0; p < participantCount; p++) {
            var participant = participantsArr[p];
            if (selected.indexOf(participant) == -1) {
                participant.manuallyHidden = true;
            }
        }
        this.get("filterModel").trigger("change", this.get("filterModel"));
    },

    showHiddenProteins: function() {
        var participantsArr = CLMS.arrayFromMapValues(this.get("clmsModel").get("participants"));
        var participantCount = participantsArr.length;
        for (var p = 0; p < participantCount; p++) {
            participantsArr[p].manuallyHidden = false;
        }

        this.get("filterModel").trigger("change");
    },


    stepOutSelectedProteins: function() {
        var selectedArr = this.get("selectedProteins");
        var selectedCount = selectedArr.length;
        var toSelect = new Set();
        for (var s = 0; s < selectedCount; s++) {
            var participant = selectedArr[s];
            var crossLinks = participant.crossLinks;
            var clCount = crossLinks.length;
            for (var cl = 0; cl < clCount; cl++) {
                var crossLink = crossLinks[cl];
                var fromProtein = crossLink.fromProtein;
                if (fromProtein.is_decoy != true) {
                    fromProtein.manuallyHidden = false;
                    toSelect.add(fromProtein);
                }
                if (crossLink.toProtein && crossLink.toProtein.is_decoy != true) {
                    var toProtein = crossLink.toProtein;
                    toProtein.manuallyHidden = false;
                    toSelect.add(toProtein);
                }
            }
        }

        this.get("filterModel").trigger("change");
        this.setSelectedProteins(Array.from(toSelect));

    },

    proteinSelectionTextFilter: function () {
        var filterText = d3.select("#proteinSelectionFilter").property("value").trim().toLowerCase();
        var participantsArr = CLMS.arrayFromMapValues(this.get("clmsModel").get("participants"));

        var toSelect = participantsArr.filter (function (p) {
            return (p.name.toLowerCase().indexOf(filterText) != -1 || p.description.toLowerCase().indexOf(filterText) != -1);
        });
        this.setSelectedProteins(toSelect);
    },

    groupSelectedProteins: function(d3target, evt) {
        var self = this;
        evt = evt.originalEvent;
        if (evt.key == "Enter"){
            var groups = self.get("groups");
            var groupName = d3.select("#groupSelected").property("value").trim();
            if (groupName){
                if (groups.has(groupName)){
                    alert("Cannot group - duplicate group name");
                } else {
                    var participantIds = new Set();
                    for (var p of self.get("selectedProteins")) {
                        participantIds.add(p.id);
                    }
                    groups.set(groupName, participantIds);
                    self.trigger("change:groups");
                    d3.select("#groupSelected").property("value", "");
                }
            }
        }
    },

    clearGroups: function() {
        const self = this;
        CLMSUI.jqdialogs.areYouSureDialog("ClearGroupsDialog", "Clear all groups?", "Clear Groups", "Yes", "No", function () {
            self.set("groups", new Map());
            self.trigger("change:groups");
        });
    },

    // Things that can cause a cross-link's minimum distance to change:
    // 1. New PDB File loaded
    // 2. Change in alignment
    // 3. Change in PDB assembly
    // 4. Change in interModelDistances allowed flag
    // 5. Change in link's homomultimer status - due to match filtering
    getSingleCrosslinkDistance: function (xlink, distancesObj, protAlignCollection, options) {
        if (xlink.toProtein){
            // distancesObj and alignCollection can be supplied to function or, if not present, taken from model
            distancesObj = distancesObj || this.get("clmsModel").get("distancesObj");
            protAlignCollection = protAlignCollection || this.get("alignColl");
            options = options || {
                average: false
            };
            options.allowInterModelDistances = options.allowInterModel || (this.get("stageModel") ? this.get("stageModel").get("allowInterModelDistances") : false);
            if (options.calcDecoyProteinDistances) {
                options.realFromPid = xlink.fromProtein.is_decoy ? xlink.fromProtein.targetProteinID : undefined;
                options.realToPid = xlink.toProtein.is_decoy ? xlink.toProtein.targetProteinID : undefined;
            }

            var distance = distancesObj ? distancesObj.getXLinkDistance(xlink, protAlignCollection, options) : undefined;
            xlink.setMeta ("distance", distance ? distance.distance || distance : distance);

            return distance;
        } else {
            return;
        }
    },

    // set includeUndefineds to true to preserve indexing of returned distances to input crosslinks
    getCrossLinkDistances: function(crossLinks, options) {
        options = options || {};
        var includeUndefineds = options.includeUndefineds || false;

        var distModel = this.get("clmsModel").get("distancesObj");
        var protAlignCollection = this.get("alignColl");
        var distArr = crossLinks.map (function (cl) {
            var dist = this.getSingleCrosslinkDistance (cl, distModel, protAlignCollection, options);
            return options.returnChainInfo || dist == undefined ? dist : +dist; // + is to stop it being a string
        }, this);
        if (!includeUndefineds) {
            distArr = distArr.filter (function (d) { return d != undefined; });
        }
        //console.log ("distArr", distArr);

        return distArr;
    },

    getParticipantFeatures: function (participant) {
        var alignColl = this.get("alignColl");
        var featuresArray = [
            participant.uniprot ? participant.uniprot.features : [],
            alignColl.getAlignmentsAsFeatures(participant.id),
            participant.userAnnotations || [],
        ];
        return d3.merge(featuresArray.filter(function(arr) {
            return arr !== undefined;
        }));
    },

    getFilteredFeatures: function (participant) {

        var features = this.getParticipantFeatures (participant);

        var annots = this.get("annotationTypes").where({
            shown: true
        });
        var featureFilterSet = d3.set(annots.map(function(annot) {
            return annot.get("type");
        }));
        // 'cos some features report as upper case
        featureFilterSet.values().forEach(function(value) {
            featureFilterSet.add(value.toUpperCase());
        });

        if (featureFilterSet.has("Digestible")) {
            var digestFeatures = this.get("clmsModel").getDigestibleResiduesAsFeatures(participant);
            var mergedFeatures = CLMSUI.modelUtils.mergeContiguousFeatures(digestFeatures);
            features = d3.merge([mergedFeatures, features]);
        }

        if (featureFilterSet.has("Cross-linkable-1")) {
            var crossLinkableFeatures = this.get("clmsModel").getCrosslinkableResiduesAsFeatures(participant, 1);
            var mergedFeatures = CLMSUI.modelUtils.mergeContiguousFeatures(crossLinkableFeatures);
            features = d3.merge([mergedFeatures, features]);
        }

        if (featureFilterSet.has("Cross-linkable-2")) {
            var crossLinkableFeatures = this.get("clmsModel").getCrosslinkableResiduesAsFeatures(participant, 2);
            var mergedFeatures = CLMSUI.modelUtils.mergeContiguousFeatures(crossLinkableFeatures);
            features = d3.merge([mergedFeatures, features]);
        }

        CLMSUI.utils.xilog("annots", annots, "f", features);
        return features ? features.filter(function(f) {
            return featureFilterSet.has(f.type);
        }, this) : [];
    },

    getAttributeRange: function (attrMetaData) {
        var allCrossLinks = this.getAllCrossLinks();
        var func = attrMetaData.unfilteredLinkFunc;
        var vals = allCrossLinks.map (function (link) {
            var attrVals = func(link);
            if (attrVals.length > 1) {
                attrVals = d3.extent(attrVals);
            }
            return attrVals;
        });
        var extent = d3.extent (d3.merge (vals));
        //console.log (vals, extent);
        return extent;
    },

    generateUrlString: function() {
        // make url parts from current filter attributes
        var parts = this.get("filterModel").getURLQueryPairs();
        if (this.get("pdbCode")) {
            var pdbParts = CLMSUI.modelUtils.makeURLQueryPairs ({pdb: this.get("pdbCode")});
            parts = pdbParts.concat(parts);
        }

        // return parts of current url query string that aren't filter flags or values
        var search = window.location.search.slice(1);
        var nonFilterKeys = d3.set(["sid", "upload", "decoys", "unval", "lowestScore", "anon"]);
        var nonFilterParts = search.split("&").filter(function(nfpart) {
            return nonFilterKeys.has(nfpart.split("=",1)[0]);
        });
        // and queue them to be at the start of new url query string (before filter attributes)
        parts = nonFilterParts.concat(parts);

        return window.location.origin + window.location.pathname + "?" + parts.join("&");
    },
});

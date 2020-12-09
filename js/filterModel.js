var CLMSUI = CLMSUI || {};

CLMSUI.BackboneModelTypes = _.extend(CLMSUI.BackboneModelTypes || {},

    {
        FilterModel: Backbone.Model.extend({
            defaults: {
                manualMode: true,
                fdrMode: false,
                //subset
                linears: true,
                monolinks: true,
                crosslinks: true,
                betweenLinks: true,
                selfLinks: true,
                homomultimericLinks: true,
                ambig: true,
                aaApart: 0,
                pepLength: 1,
                //validation status
                A: true,
                B: true,
                C: true,
                Q: true,
                unval: false,
                AUTO: true, // if u change this to true one of the unit tests will fail
                decoys: true,
                //distance
                distanceUndef: true,
                //fdr
                fdrThreshold: 0.05,
                interFdrCut: undefined,
                intraFdrCut: undefined,
                // groups
                multipleGroup: true,
                //navigation
                pepSeq: "",
                protNames: "",
                protDesc: "",
                protPDB: false,
                runName: "",
                scanNumber: "",
                urpPpi: 1,
            },

            extents: {
                aaApart: {
                    min: 0,
                    max: 999
                },
                pepLength: {
                    min: 1,
                    max: 99
                },
                urpPpi: {
                    min: 1,
                    max: 99
                },
                fdrThreshold: {
                    min: 0,
                    max: 100
                }
            },

            patterns: {
                pepSeq: "[A-Za-z]+-?[A-Za-z]*",
            },

            types: {
                manualMode: "boolean",
                fdrMode: "boolean",
                //subset
                linears: "boolean",
                monolinks: "boolean",
                crosslinks: "boolean",
                betweenLinks: "boolean",
                selfLinks: "boolean",
                homomultimericLinks: "boolean",
                ambig: "boolean",
                aaApart: "number",
                pepLength: "number",
                //validation status
                A: "boolean",
                B: "boolean",
                C: "boolean",
                Q: "boolean",
                unval: "boolean",
                AUTO: "boolean",
                decoys: "boolean",
                //distance
                distanceUndef: "boolean",
                //fdr
                fdrThreshold: "number",
                interFdrCut: "number",
                intraFdrCut: "number",
                //groups,
                multipleGroup: "boolean",
                //navigation
                pepSeq: "text",
                protNames: "text",
                protDesc: "text",
                protPDB: "boolean",
                runName: "text",
                scanNumber: "number",
                urpPpi: "number",
            },

            initialize: function(options, secondarySettings) {
                if (!this.get("matchScoreCutoff")) {
                    this.set("matchScoreCutoff", [undefined, undefined]);
                    // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
                }
                // scoreExtent used to restrain text input values
                this.scoreExtent = (secondarySettings ? secondarySettings.scoreExtent : undefined) || this.get("matchScoreCutoff").slice(0);


                if (!this.get("distanceCutoff")) {
                    this.set("distanceCutoff", [undefined, undefined]);
                }
                this.distanceExtent = (secondarySettings ? secondarySettings.distanceExtent : undefined) || this.get("distanceCutoff").slice(0);

                // possibleSearchGroups used to restrain searchGroup options
                this.possibleSearchGroups = (secondarySettings ? secondarySettings.possibleSearchGroups : undefined) || this.get("searchGroups").slice(0);
                //this.scoreExtent = this.matches.extent (fu)
                this.valMap = d3.map();
                this.valMap.set("?", "Q");
                this.preprocessedInputValues = d3.map(); // preprocessed user input values so they're not constantly reparsed for every match

                this.resetValues = this.toJSON(); // Store copy of original values if needed to restore later
            },

            resetFilter: function() {
                this
                    .clear({
                        silent: true
                    })
                    .set(this.resetValues);

                return this;
            },

            getMinExtent: function (attrID) {
                var extents = this.extents[attrID];
                return extents ? extents.min : null;
            },

            getMaxExtent: function (attrID) {
                var extents = this.extents[attrID];
                return extents ? extents.max : null;
            },

            preprocessFilterInputValues: function (searchArray) {
                var protSplit1 = this.get("protNames").toLowerCase().split(","); // split by commas
                this.preprocessedInputValues.set("protNames", protSplit1.map(function(prot) {
                    return prot.split("-").map(function(protSplit2) {
                        return protSplit2.trim();
                    });
                })); // split these in turn by hyphens
                //console.log ("preprocessedValues", this.preprocessedValues.get("protNames"));

                protSplit1 = this.get("protDesc").toLowerCase().split(","); // split by commas
                this.preprocessedInputValues.set("protDesc", protSplit1.map(function(prot) {
                    return prot.split("-").map(function(protSplit2) {
                        return protSplit2.trim();
                    });
                })); // split these in turn by hyphens
                //console.log ("preprocessedValues", this.preprocessedValues.get("protDesc"));

                var pepSeq = this.get("pepSeq");
                var splitPepSeq = pepSeq.split("-").map(function(part) {
                    return {
                        upper: part.toUpperCase(),
                        lower: part.toLowerCase()
                    };
                });
                this.preprocessedInputValues.set("pepSeq", splitPepSeq);

                this.preprocessedInputValues.set("runName", this.get("runName").toLowerCase());
                this.preprocessedInputValues.set("scanNumber", parseInt(this.get("scanNumber")));

                // Search group pre calculations
                this.precalcedSearchGroupsSet = d3.set(this.get("searchGroups"));

                var searchGroupMap = d3.map ();
                searchArray.forEach (function (search) {
                    searchGroupMap.set (search.id, search.group);
                });
                this.precalcedSearchToGroupMap = searchGroupMap;
            },

            subsetFilter: function(match) {
                var linear = match.isLinear();
                var mono = match.isMonoLink();
                var ambig = match.isAmbig();

                //linears? - if linear (linkPos === 0) and linears not selected return false
                //cross-links? - if xl (linkPos > 0) and xls not selected return false
                if (mono && !this.get("monolinks")) {
                    return false;
                }
                else
                if (linear && !this.get("linears")) {
                    return false;
                }
                //self-links? - if self links's not selected and match is self link return false
                // possible an ambiguous self link will still get displayed
                else if (!linear && !mono && !((match.couldBelongToSelfLink && !match.confirmedHomomultimer && this.get("selfLinks")) ||
                        (match.couldBelongToBetweenLink && this.get("betweenLinks")) ||
                        (match.confirmedHomomultimer && this.get("homomultimericLinks")))) {
                    return false;
                }

                //ambigs? - if ambig's not selected and match is ambig return false
                if (ambig && !this.get("ambig")) {
                    return false;
                }

                var aaApart = +this.get("aaApart");
                if (!isNaN(aaApart)) {
                    // if not homomultimer and not ambig and is a selfLink
                    if ( /*!match.confirmedHomomultimer &&*/ !ambig && match.crossLinks[0].isSelfLink()) {
                        // linears report false for isSelfLink so they never get to this bit (where toResidue would be null)
                        var unambigCrossLink = match.crossLinks[0];
                        if (Math.abs(unambigCrossLink.toResidue - unambigCrossLink.fromResidue) < aaApart) {
                            return false;
                        }
                    }
                }

                var pepLengthFilter = +this.get("pepLength");
                if (!isNaN(pepLengthFilter)) {
                    var seq1length = match.matchedPeptides[0].sequence.length;
                    if (seq1length > 0 && (seq1length < pepLengthFilter ||
                            (!linear && !mono && match.matchedPeptides[1].sequence.length < pepLengthFilter))) {
                        return false;
                    }
                }

                return true;
            },

            scoreFilter: function(match) {
                var score = match.score();
                //defend against not having a score (from a CSV file without such a column)
                if (score === undefined) {
                    return true;
                }
                var msc = this.get("matchScoreCutoff");
                return (msc[0] == undefined || score >= msc[0]) && (msc[1] == undefined || score <= msc[1]); // == undefined cos shared links get undefined json'ified to null
            },

            decoyFilter: function(match) {
                return !match.isDecoy() || this.get("decoys");
            },

            distanceFilter: function (crossLink) {
                var dist = crossLink.getMeta("distance");
                if (dist === undefined) {   // show undefined distances if either no distances or specifically allowed (distanceUndef flag)
                    var noDistances = this.distanceExtent[0] === undefined;
                    return noDistances || this.get("distanceUndef");
                }
                var dsc = this.get("distanceCutoff");
                return (dsc[0] == undefined || dist >= dsc[0]) && (dsc[1] == undefined || dist <= dsc[1]); // == undefined cos shared links get undefined json'ified to null
            },

            validationStatusFilter: function(match) {
                var vChar = match.validated;
                if (vChar != 'R') {
                    if (this.get(vChar) || this.get(this.valMap.get(vChar))) return true;
                    if (match.autovalidated && this.get("AUTO")) return true;
                    if (!match.autovalidated && !vChar && this.get("unval")) return true;
                }

                return false;
            },

            // Test if there are proteins at both ends of a match that are in the current pdb file.
            pdbProteinFilter: function (match) {
                if (this.get("protPDB")) {
                    var dObj = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj");
                    if (dObj) {
                        var chainMap = dObj.chainMap;
                        if (chainMap) {
                            var mpeps = match.matchedPeptides;
                            var pass = mpeps.every (function (mpep) {
                                var proteins = mpep.prt;
                                return proteins.some (function (prot) { return chainMap[prot]; })   // ambig match can point to multiple proteins at one or both ends
                            });
                            return pass;
                        }
                    }
                }
                return true;
            },

            proteinFilter: function (match, searchString, dataField, preProcessedField) {
                if (searchString) {
                    //protein name check
                    var stringPartArrays = this.preprocessedInputValues.get(preProcessedField);
                    var participants = CLMSUI.compositeModelInst.get("clmsModel").get("participants");
                    var matchedPeptides = match.matchedPeptides;
                    var matchedPepCount = matchedPeptides.length;

                    for (var spa = 0; spa < stringPartArrays.length; spa++) {
                        var stringPartArr = stringPartArrays[spa];
                        var used = [];
                        var matchedProteins = 0;

                        for (var ns = 0; ns < stringPartArr.length; ns++) {
                            var partString = stringPartArr[ns];
                            var found = false;

                            for (var i = 0; i < matchedPepCount; i++) {
                                var matchedPeptide = matchedPeptides[i];
                                if (found === false && typeof used[i] == 'undefined') {
                                    var pids = matchedPeptide.prt;
                                    var pidCount = pids.length;
                                    for (var p = 0; p < pidCount; p++) {
                                        var interactor = participants.get(pids[p]);
                                        var toSearch = interactor[dataField];// + " " + interactor.description;
                                        if (dataField == "name" && interactor.accession) {  // hacky nevermind
                                            toSearch = toSearch + " " + interactor.accession;
                                        }
                                        if (toSearch.toLowerCase().indexOf(partString) != -1) {
                                            found = true;
                                            used[i] = true; // so can't match two strings to same peptide e.g. "dog-cat" to protein associated with same peptide
                                            break;
                                        }
                                    }
                                }
                            }
                            // this string is found in one of the protein names/descriptors associated with one of the match's so far unused peptides, so increment a counter
                            if (found) {
                                matchedProteins++;
                            }
                        }
                        // if number of matched proteins equals number of part strings to be matched then match passes the filter
                        //console.log ("fp", foundPeptides, stringPartArr.length, foundPeptides === stringPartArr.length);
                        if (matchedProteins === stringPartArr.length) {
                            return true;
                        }
                    }
                    // return false if reach end of loop (no true condition found)
                    return false;
                }
                // return true if no string to match against
                return true;
            },

            navigationFilter: function(match) {
                // Arranged so cheaper checks are done first

                //run name check
                var runNameFilter = this.preprocessedInputValues.get("runName");
                if (runNameFilter &&
                    match.runName().toLowerCase().indexOf(runNameFilter) == -1) {
                    return false;
                }

                //scan number check
                var scanNumberFilter = this.preprocessedInputValues.get("scanNumber");
                if (!isNaN(scanNumberFilter) &&
                    match.scanNumber !== scanNumberFilter
                    //match.scanNumber.toString().toLowerCase().indexOf(scanNumberFilter.toLowerCase()) == -1
                ) {
                    return false;
                }

                //protein name check
                if (this.proteinFilter (match, this.get("protNames"), "name", "protNames") === false) {
                    return false;
                }

                //protein description check
                if (this.proteinFilter (match, this.get("protDesc"), "description", "protDesc") === false) {
                    return false;
                }

                //protein in pdb check
                if (this.pdbProteinFilter (match) === false) {
                    return false;
                }

                //peptide seq check
                if (seqCheck(this.get("pepSeq"), this.preprocessedInputValues.get("pepSeq")) === false) {
                    return false;
                }

                //end of filtering check
                return true;

                //util functions used in nav filter check:

                //peptide seq check function
                function seqCheck(searchString, preprocPepStrings) { //preprocPepStrings: "KK-KR" will be [{upper:"KK", lower:"kk}, {upper:"KR", lower:"kr"}]
                    if (searchString) {
                        var matchedPeptides = match.matchedPeptides;
                        var matchedPepCount = matchedPeptides.length;

                        //var pepStrings = searchString.split('-');
                        //var pepStringsCount = pepStrings.length;
                        var pepStringsCount = preprocPepStrings.length;

                        if (pepStringsCount == 1) {
                            var uppercasePep = preprocPepStrings[0].upper;
                            var lowercasePep = preprocPepStrings[0].lower
                            for (var i = 0; i < matchedPepCount; i++) {
                                var matchedPeptide = matchedPeptides[i];
                                if (matchedPeptide.sequence.indexOf(uppercasePep) != -1 ||
                                    (matchedPeptide.seq_mods && matchedPeptide.seq_mods.toLowerCase().indexOf(lowercasePep) != -1)) {
                                    return true;
                                }
                            }
                            return false;
                        }

                        var aggMatchedCount = 0;
                        for (var ps = 0; ps < pepStringsCount; ps++) {
                            var pepStringCases = preprocPepStrings[ps];
                            var uppercasePep = pepStringCases.upper;
                            var lowercasePep = pepStringCases.lower;
                            var matchCount = 0;
                            for (var i = 0; i < matchedPepCount; i++) {
                                var matchedPeptide = matchedPeptides[i];
                                if (matchedPeptide.sequence.indexOf(uppercasePep) != -1 ||
                                    (matchedPeptide.seq_mods && matchedPeptide.seq_mods.toLowerCase().indexOf(lowercasePep) != -1)) {
                                    matchCount += (i + 1); // add 1 for first matched peptide, add 2 for second. So will be 3 if both.
                                }
                            }
                            if (matchCount === 0) return false; // neither peptide matches this part of the input string, so match can't pass the filter
                            aggMatchedCount |= matchCount; // logically aggregate to aggMatchedCount
                        }
                        // If 1, both pepstrings matched first peptide. If 2, both pepstrings matched second peptide.
                        // Can't be one pepstring matching both peptides and the other neither, as an individual zero matchcount would return false in the loop
                        // (so can't be 0 in total either)
                        // So 3 must be the case where both peptides contain the pepstrings, such that one or both pepstrings are present at alternate ends
                        return aggMatchedCount === 3;
                    }
                    return true;
                }
            },


            // If activated, this only passes matches whose search ids belong to particular groups
            groupFilter: function (match) {
                if (this.possibleSearchGroups.length > 1) {
                    var matchGroup = this.precalcedSearchToGroupMap.get (match.searchId);
                    return this.precalcedSearchGroupsSet.has (matchGroup);
                }
                return true;
            },

            // If activated, this only passes an array of matches if they are of the same group
            groupFilter2: function (matchArr) {
                if (matchArr.length > 1 && this.possibleSearchGroups.length > 1 && !this.get("multipleGroup")) {
                    var smap = this.precalcedSearchToGroupMap;
                    var firstMatchGroup = smap.get (matchArr[0].match.searchId);
                    return matchArr.every (function (match) {
                        return smap.get(match.match.searchId) === firstMatchGroup;
                    }, this);
                }
                return true;
            },

            stateString: function() {
                // https://library.stanford.edu/research/data-management-services/case-studies/case-study-file-naming-done-well
                var fields = [];

                // http://www.indiana.edu/~letrs/help-services/QuickGuides/oed-abbr.html
                // https://www.allacronyms.com/
                var abbvMap = {
                    intraFdrCut: "SELFCUT",
                    interFdrCut: "BTWNCUT",
                    fdrMode: "FDR",
                    manualMode: "MAN",
                    betweenLinks: "BTWN",
                    selfLinks: "SELF",
                    pepLength: "PEPLEN",
                    fdrThreshold: "THR",
                    matchScoreCutoff: "MATCHSCORES",
                    distanceCutoff: "DIST",
                    distanceUndef: "DISTUNK",
                    aaApart: "APART",
                    crosslinks: "XLINKS",
                    homomultimericLinks: "HOMOM",
                    searchGroups: "GROUPS",
                    multipleGroup: "MGRP",
                };
                var zeroFormatFields = d3.set(["intraFdrCut", "interFdrCut", "scores"]);
                if (this.get("fdrMode")) {
                    fields = ["fdrMode", "fdrThreshold", "ambig", "betweenLinks", "selfLinks", "aaApart", "pepLength"];
                    // no point listing inter/intra fdr cut if between/self links aren't active
                    if (this.get("betweenLinks")) {
                        fields.splice(1, 0, "interFdrCut");
                    }
                    if (this.get("selfLinks")) {
                        fields.splice(1, 0, "intraFdrCut");
                    }
                } else {
                    var antiFields = ["fdrThreshold", "interFdrCut", "intraFdrCut", "fdrMode"];
                    if (this.get("matchScoreCutoff")[1] == undefined) { // ignore matchscorecutoff if everything allowed
                        antiFields.push("matchScoreCutoff");
                    }
                    if (this.get("distanceCutoff")[1] == undefined) { // ignore distancecutoff if everything allowed
                        antiFields.push("distanceCutoff");
                    }
                    fields = d3.keys(_.omit(this.attributes, antiFields));
                    //console.log ("filter fieldset", this.attributes, fields);
                }

                var str = CLMSUI.utils.objectStateToAbbvString(this, fields, zeroFormatFields, abbvMap);
                return str;
            },

            getURLQueryPairs: function() {
                // make url parts from current filter attributes
                return CLMSUI.modelUtils.makeURLQueryPairs (this.attributes, "F");
            },

            getFilterUrlSettings: function(urlChunkMap) {
                var urlChunkKeys = d3.keys(urlChunkMap).filter(function(key) {
                    return key[0] === "F";
                });
                var filterUrlSettingsMap = {};
                urlChunkKeys.forEach(function(key) {
                    filterUrlSettingsMap[key.slice(1)] = urlChunkMap[key];
                });
                var allowableFilterKeys = d3.keys(this.defaults);
                allowableFilterKeys.push("matchScoreCutoff", "searchGroups", "distanceCutoff", "pdb");
                var intersectingKeys = _.intersection(d3.keys(filterUrlSettingsMap), allowableFilterKeys);
                var filterChunkMap = _.pick(filterUrlSettingsMap, intersectingKeys);
                console.log("FCM", filterChunkMap);
                return filterChunkMap;
            },

        }),

    });

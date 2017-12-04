var CLMSUI = CLMSUI || {};

CLMSUI.BackboneModelTypes = _.extend(CLMSUI.BackboneModelTypes || {},

    {
        FilterModel: Backbone.Model.extend({
            defaults: {
                manualMode: true,
                fdrMode: false,
                //subset
                linears: true,
                crosslinks: true,
                selfLinks: true,
                betweenLinks: true,
                ambig: true,
                aaApart: 0,
                pepLength: 0,
                //validation status
                A: true,
                B: true,
                C: true,
                Q: true,
                unval: true,
                AUTO: false,
                decoys: true,
                //fdr
                fdrThreshold: 0.05,
                interFdrCut: undefined,
                intraFdrCut: undefined,
                //navigation
                pepSeq: "",
                protNames: "",
                charge: "",
                runName: "",
                scanNumber: "",
            },

            initialize: function () {
                // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
                if (!this.get("matchScoreCutoff")) {
                    this.set("matchScoreCutoff", [0, 100]);
                }
                // scoreExtent used to restrain text input values
                this.scoreExtent = this.get("matchScoreCutoff").slice(0);
                this.valMap = d3.map();
                this.valMap.set("?", "Q");
                this.textSet = d3.map();
            },

            processTextFilters: function () {
                var protSplit1 = this.get("protNames").toLowerCase().split(","); // split by commas
                this.textSet.set("protNames", protSplit1.map(function (prot) {
                    return prot.split("-");
                })); // split these in turn by hyphens
                //console.log ("textSet", this.textSet.get("protNames"));
            },

            naiveProteinMatch: function (p1, p2) {
                return p1 === p2;
            },

            subsetFilter: function (match, matchingProteinPairFunc) {
                matchingProteinPairFunc = matchingProteinPairFunc || this.naiveProteinMatch; // naive default match
                var linear = match.isLinear();
                var ambig = match.isAmbig();

                //linears? - if linear (linkPos === 0) and linears not selected return false
                //cross-links? - if xl (linkPos > 0) and xls not selected return false
                if (this.get(linear ? "linears" : "crosslinks") === false) {
                    return false;
                }

                //ambigs? - if ambig's not selected and match is ambig return false
                if (ambig && !this.get("ambig")) {
                    return false;
                }

                //self-links? - if self links's not selected and match is self link return false
                // possible an ambiguous self link will still get displayed
                var hideSelfLinks = !this.get("selfLinks");
                var hideBetweenLinks = !this.get("betweenLinks");
                if ((hideSelfLinks || hideBetweenLinks) && !linear) { // we don't test linears here
                    var isSelfLink = true;
                    var prots = match.matchedPeptides[0].prt;
                    var p1 = prots[0];
                    for (var i = 1; i < prots.length; i++) {
                        // not enough to match id's, one might be decoy protein, the other real
                        if (!matchingProteinPairFunc(prots[i], p1)) {
                            isSelfLink = false;
                            break;
                        }
                    }
                    prots = match.matchedPeptides[1].prt;
                    for (var i = 0; i < prots.length; i++) {
                        // not enough to match id's, one might be decoy protein, the other real
                        if (!matchingProteinPairFunc(prots[i], p1)) {
                            isSelfLink = false;
                            break;
                        }
                    }
                    if ((isSelfLink && hideSelfLinks) || (!isSelfLink && hideBetweenLinks)) {
                        return false;
                    }
                }

                //temp
                var aaApart = +this.get("aaApart");
                if (!isNaN(aaApart)) {
                    // if not homomultimer and not ambig and is a selfLink
                    if (!match.confirmedHomomultimer && !ambig && match.crossLinks[0].isSelfLink()) {
                        // linears report false for isSelfLink so they never get to this bit (where toResidue would be null)
                        var unambigCrossLink = match.crossLinks[0];
                        var calc = Math.abs (unambigCrossLink.toResidue - unambigCrossLink.fromResidue) - 1;
                        if (calc < aaApart) {
                            return false;
                        }
                    }
                }

                var pepLengthFilter = +this.get("pepLength");
                if (!isNaN(pepLengthFilter)) {
                    var seq1length = match.matchedPeptides[0].sequence.length;
                    if (seq1length > 0 && (seq1length <= pepLengthFilter ||
                            (!linear && match.matchedPeptides[1].sequence.length <= pepLengthFilter))) {
                        return false;
                    }
                }

                return true;
            },
            
            scoreFilter: function (match) {
                var msc = this.get("matchScoreCutoff");
                //defend against not having a score (from a CSV file without such a column)
                if (!match.score) {return true;}
                return match.score >= msc[0] && match.score <= msc[1];
            },
            
            decoyFilter: function (match) {
               return !match.isDecoy() || this.get("decoys");
            },

            validationStatusFilter: function (match) {
                var vChar = match.validated;
                if (vChar != 'R') {
                    if (this.get(vChar) || this.get(this.valMap.get(vChar))) return true;
                    if (match.autovalidated && this.get("AUTO")) return true;
                    if (!match.autovalidated && !vChar && this.get("unval")) return true;
                }

                return false;
            },

            proteinNameCheck: function (match, searchString) {
                if (searchString) {
                    //protein name check
                    var stringPartArrays = this.textSet.get("protNames");
                    var participants = CLMSUI.compositeModelInst.get("clmsModel").get("participants");
                    var matchedPeptides = match.matchedPeptides;
                    var matchedPepCount = matchedPeptides.length;

                    for (var spa = 0; spa < stringPartArrays.length; spa++) {
                        var stringPartArr = stringPartArrays[spa];
                        var used = [];
                        var matchedProteins = 0;

                        for (var ns = 0; ns < stringPartArr.length; ns++) {
                            var nameString = stringPartArr[ns];
                            var found = false;

                            for (var i = 0; i < matchedPepCount; i++) {
                                var matchedPeptide = matchedPeptides[i];
                                if (found === false && typeof used[i] == 'undefined') {
                                    var pids = matchedPeptide.prt;
                                    var pidCount = pids.length;
                                    for (var p = 0; p < pidCount; p++) {
                                        var interactor = participants.get(pids[p]);
                                        var toSearch = interactor.name + " " + interactor.description;
                                        if (toSearch.toLowerCase().indexOf(nameString) != -1) {
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

                /*
                if (searchString) {
                    var searchStringLower = searchString.toLowerCase();
                    

                    var nameStrings = searchString.split('-');
                    var nameStringCount = nameStrings.length;

                    if (nameStringCount ==1) {
                        for (var mp = 0; mp < matchedPepCount; mp++) {
                            var pids = matchedPeptides[mp].prt;
                            var pidCount = pids.length;
                            for (var p = 0; p < pidCount; p++ ) {

                                var interactor = participants.get(pids[p]);
                                var toSearch = interactor.name + " " + interactor.description;
                                if (toSearch.toLowerCase().indexOf(searchStringLower) != -1) {
                                    return true;
                                }

                            }
                        }
                        return false;
                    }

                    var used = [];
                    for (var ns = 0; ns < nameStringCount; ns++) {
                        var nameString  = nameStrings[ns];
                        if (nameString){
                            var found = false;
                            for (var i = 0; i < matchedPepCount; i++){
                                var matchedPeptide = matchedPeptides[i];
                                if (found === false && typeof used[i] == 'undefined'){
                                    var pids = matchedPeptide.prt;
                                    var pidCount = pids.length;
                                    for (var p = 0; p < pidCount; p++ ) {
                                        var interactor = participants.get(pids[p]);
                                        var toSearch = interactor.name + " " + interactor.description;
                                        if (toSearch.toLowerCase().indexOf(nameString.toLowerCase()) != -1) {
                                            found = true;
                                            used[i] = true;
                                        }
                                    }
                                }
                            }
                            if (found === false) return false;					
                        }
                    }
                }
                */
            },

            navigationFilter: function (match) {
                // Arranged so cheaper checks are done first

                //charge check
                var chargeFilter = this.get("charge");
                if (chargeFilter && match.precursorCharge != chargeFilter) {
                    return false;
                }

                //run name check
                var runNameFilter = this.get("runName");
                if (runNameFilter &&
                    match.runName().toLowerCase().indexOf(runNameFilter.toLowerCase()) == -1) {
                    return false;
                }

                //scan number check
                var scanNumberFilter = this.get("scanNumber");
                if (scanNumberFilter &&
                    match.scanNumber.toString().toLowerCase()
                    .indexOf(scanNumberFilter.toLowerCase()) == -1) {
                    return false;
                }

                //protein name check
                if (this.proteinNameCheck(match, this.get("protNames")) === false) {
                    return false;
                }


                //peptide seq check
                if (seqCheck(this.get("pepSeq")) === false) {
                    return false;
                }

                //end of filtering check
                return true;

                //util functions used in nav filter check:

                //peptide seq check function
                function seqCheck(searchString) {
                    if (searchString) {
                        var matchedPeptides = match.matchedPeptides;
                        var matchedPepCount = matchedPeptides.length;

                        var pepStrings = searchString.split('-');
                        var pepStringsCount = pepStrings.length;

                        if (pepStringsCount == 1) {
                            for (var mp = 0; mp < matchedPepCount; mp++) {
                                var matchedPeptide = matchedPeptides[mp];
                                if (matchedPeptide.sequence.indexOf(searchString.toUpperCase()) != -1 ||
                                    matchedPeptide.seq_mods.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
                                    return true;
                                }
                            }
                            return false;
                        }

                        var used = [];
                        var pepStringCount = pepStrings.length;
                        //TODO: theres a problem here, order of search strings is affecting results
                        // (if one pep seq occurs in both peptides and the other in only one)
                        for (var ps = 0; ps < pepStringCount; ps++) {
                            var pepString = pepStrings[ps];
                            if (pepString) {
                                var found = false;
                                for (var i = 0; i < matchedPepCount; i++) {
                                    var matchedPeptide = matchedPeptides[i];
                                    if (found === false && typeof used[i] == 'undefined') {
                                        if (matchedPeptide.sequence.indexOf(pepString.toUpperCase()) != -1 ||
                                            matchedPeptide.seq_mods.toLowerCase().indexOf(pepString.toLowerCase()) != -1) {
                                            found = true;
                                            used[i] = true;
                                        }
                                    }
                                }
                                if (found === false) return false;
                            }
                        }
                    }
                    return true;
                }
            },

            stateString: function () {
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
                    aaApart: "APART",
                    crosslinks: "XLINKS",
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
                    if (this.get("matchScoreCutoff")[1] === Number.MAX_VALUE) { // ignore matchscorecutoff if everything allowed
                        antiFields.push("matchScoreCutoff");
                    }
                    fields = d3.keys(_.omit(this.attributes, antiFields));
                    //console.log ("filter fieldset", this.attributes, fields);
                }

                var str = CLMSUI.utils.objectStateToAbbvString(this, fields, zeroFormatFields, abbvMap);
                return str;
            },

        }),

        // I want MinigramBB to be model agnostic so I can re-use it in other places
        MinigramModel: Backbone.Model.extend({
            defaults: {
                domainStart: 0,
                domainEnd: 100,
            },
            data: function () {
                return [1, 2, 3, 4];
            },
        }),

        TooltipModel: Backbone.Model.extend({
            defaults: {
                location: null,
                header: "Tooltip",
            },
            initialize: function () {
                // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
                this.set("contents", ["Can show", "single items", "lists or", "tables"]);
            }
        }),

        BlosumModel: Backbone.Model.extend({
            initialize: function () {
                //console.log ("Blosum model initialised", this);
            },
        }),

        ChainBooleanModel: Backbone.Model.extend({
            initialize: function (modelOptions) {
                var defaultOptions = {
                    chainMap: {}
                };
                this.options = _.extend(defaultOptions, modelOptions.myOptions);

                var chainValues = d3.values(this.options.chainMap);
                chainValues = d3.merge(chainValues); // flatten array
                chainValues.forEach(function (chainValue) {
                    this.set(chainValue.index, true);
                }, this);
            },
        }),

    });

// this is separate to get round the fact BlosumModel won't be available within the same declaration
CLMSUI.BackboneModelTypes = _.extend(CLMSUI.BackboneModelTypes || {}, {
    BlosumCollection: Backbone.Collection.extend({
        model: CLMSUI.BackboneModelTypes.BlosumModel,
        url: "R/blosums.json",
        parse: function (response) {
            // turn json object into array, add keys to value parts, then export just the values
            var entries = d3.entries(response);
            var values = entries.map(function (entry) {
                entry.value.key = entry.key;
                return entry.value;
            });

            console.log("response", response, values);
            return values;
        }
    }),
});

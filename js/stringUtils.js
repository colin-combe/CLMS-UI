var CLMSUI = CLMSUI || {};

CLMSUI.STRINGUtils = {

    // Filter the CLMS model's participants down to just those that have non-decoy inter-protein links
    filterProteinsToPPISet: function (clmsModel) {
        var proteinMap = clmsModel.get("participants");
        var realProteins = CLMSUI.modelUtils.filterOutDecoyInteractors (Array.from (proteinMap.values()));
        var ppiProteins = realProteins.filter (function (prot) {
            return prot.crossLinks.some (function (clink) {
                // is there a real crosslink going to another protein?
                return (clink.fromProtein && clink.fromProtein.id !== clink.toProtein.id && !clink.fromProtein.is_decoy && !clink.toProtein.is_decoy)
            });
        });
        return ppiProteins;
    },

    // Take a map of protein IDs (uniprot) --> taxon specific string IDs + a tsv format string network
    // and turn it into a csv string usable by the cross-link metadata parser.
    // Filter to appropriate protein IDs for brevity
    translateToCSV: function (uniprotToStringIDMap, network) {
        var stringToUniprotIDMap = _.invert (uniprotToStringIDMap);
        var rows = d3.tsv.parse (network, function (d) {
            d.seqPos1 = null;
            d.seqPos2 = null;
            d.proteinID1 = stringToUniprotIDMap[d.ncbiTaxonId+"."+d.stringId_A];
            d.proteinID2 = stringToUniprotIDMap[d.ncbiTaxonId+"."+d.stringId_B];
            // return empty string if protein ids not in current id map
            return (d.proteinID1 && d.proteinID2 ? _.omit (d, ["ncbiTaxonId", "stringId_A", "stringId_B", "preferredName_A", "preferredName_B"]) : null);
        });
        rows = rows.filter (function (row) { return row != null; });
        return d3.csv.format (rows);
    },

    getStringIdentifiers: function (proteinIDs, taxonID) {
        var stringIDCache = CLMSUI.utils.getLocalStorage("StringIds")
        var identifiersBySpecies = stringIDCache[taxonID] || {};
        var todo = proteinIDs.filter (function (pid) { return !identifiersBySpecies[pid]; });
        console.log (stringIDCache, identifiersBySpecies, todo);

        if (todo.length) {
            var pidString = todo.join("%0d");
            console.log ("ttt", todo, pidString);
            var promiseObj = new Promise(function(resolve, reject ) {
                $.ajax ({
                    type: "post",
                    url: "https://string-db.org/api/json/get_string_ids",
                    data: {
                        identifiers: pidString,
                        species: taxonID,
                        limit: 1,
                        caller_identity: "xiview",
                        format: "only-ids",
                        echo_query: echo ? 1 : 0
                    },
                    success: function (data, textStatus, xhr) {
                        var stringCache = CLMSUI.utils.getLocalStorage ("StringIds");   // get stored data
                        var identifiersBySpecies = stringCache[taxonID] || {};  // get or make object for species
                        data.forEach (function (record) {   // add new data to this species object
                            identifiersBySpecies[record.queryItem] = record.stringId;
                        });
                        stringCache[taxonID] = identifiersBySpecies;    // (re)attach species object to stored data
                        CLMSUI.utils.setLocalStorage (stringCache, "StringIds");    // re-store the data

                        var idMap = _.pick (identifiersBySpecies, proteinIDs);
                        resolve (idMap);
                    },
                    error: function (xhr) {
                        reject (xhr.status);
                    },
                    complete: function (xhr, textStatus) {
                        console.log (textStatus);
                    }
                });
            });
            return promiseObj;
        } else {
            var idMap = _.pick (identifiersBySpecies, alreadyKnown);
            return Promise.resolve (idMap);
        }
    },

    queryStringInteractions: function (idMap) {
        var crosslinked = d3.values(idMap);
        if (crosslinked.length > 1) {
            crosslinked.sort();
            var sidString = crosslinked.join("%0d");     // id/key made of string IDs joined together
            console.log ("stringIds", crosslinked, sidString);

            var stringNetworkScoreCache = CLMSUI.utils.getLocalStorage("StringNetworkScores");
            var idBySpecies = stringNetworkScoreCache[species] || {};
            var cachedNetwork = idBySpecies[sidString];    // exact key match in cache?

            if (!cachedNetwork) {  // match in cache where network is subnetwork of larger network?
                var allSpeciesNetworkKeys = d3.keys (idBySpecies);
                var idKeyRegex = new RegExp (".*" + crosslinked.join(".*") + ".*");
                var matchingKeyIndex = _.findIndex (allSpeciesNetworkKeys, function (key) {
                    return idKeyRegex.test (key);
                });
                cachedNetwork = matchingKeyIndex >= 0 ? idBySpecies[allSpeciesNetworkKeys[matchingKeyIndex]] : null;
            }

            if (!cachedNetwork) {
                var promiseObj = new Promise (function (resolve, reject) {
                    $.ajax ({
                        type: "post",
                        url: "https://string-db.org/api/tsv/network",   //?identifiers="+sidString+"&species="+species+"&caller_identity=martin",
                        data: {
                            identifiers: sidString,
                            species: species,
                            caller_identity: "xiview"
                        },
                        success: function (retrievedNetwork, textStatus, xhr) {
                            stringNetworkScoreCache[species] = idBySpecies;
                            idBySpecies[sidString] = retrievedNetwork;
                            CLMSUI.utils.setLocalStorage (stringNetworkScoreCache, "StringNetworkScores");
                            resolve ({idMap: idMap, networkTsv: retrievedNetwork});
                        },
                        error: function (xhr) {
                            reject (xhr.status);
                        },
                        complete: function (xhr, textStatus) {
                            console.log (textStatus);
                        }
                    });
                 });
                return promiseObj;
            } else {
                return Promise.resolve ({idMap: idMap, networkTsv: cachedNetwork});
            }
        }
        return Promise.resolve ({idMap: idMap, networkTsv: ""});    // empty network for 1 protein
    },

    loadStringData: function (pids, species) {
        CLMSUI.STRINGUtils.getStringIdentifiers (pids, species)
            .then (function (identifiersBySpecies) {
                return CLMSUI.STRINGUtils.queryStringInteractions (identifiersBySpecies);
            })
            .then (function (networkAndIDObj) {
                if (networkAndIDObj == null || networkAndIDObj.networkTsv == null) {
                    return "";
                }
                var csv = CLMSUI.STRINGUtils.translateToCSV (networkAndIDObj.idMap, networkAndIDObj.networkTsv);
                console.log ("CSV", csv);
            })
        ;
    }
};

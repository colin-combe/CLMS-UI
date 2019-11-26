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
    // and turn it into a csv string usable by the cross-link metadata parser
    translateToCSV: function (uniprotToStringIDMap, networkTsv) {
        var stringToUniprotIDMap = _.invert (uniprotToStringIDMap);
        var rows = d3.tsv.parse (networkTsv, function (d) {
            d.seqPos1 = null;
            d.seqPos2 = null;
            d.proteinID1 = stringToUniprotIDMap[d.ncbiTaxonId+"."+d.stringId_A];    // taxonId + stringId = taxon specific string ID
            d.proteinID2 = stringToUniprotIDMap[d.ncbiTaxonId+"."+d.stringId_A];
            var newd = _.omit (d, ["ncbiTaxonId", "stringId_A", "stringId_B", "preferredName_A", "preferredName_B"]);   // don't need these fields
            return newd;
        });

        console.log ("ROWS", rows, d3.csv.format(rows));
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
                    url: "https://string-db.org/api/json/get_string_ids?identifiers="+pidString+"&species="+taxonID+"&limit=1&caller_identity=martin&format=only-ids"+(echo ? "&echo_query=1" : ""),
                    success: function (data, textStatus, xhr) {
                        var str = JSON.stringify (data);

                        var stringCache = CLMSUI.utils.getLocalStorage("StringIds")
                        var identifiersBySpecies = stringCache[taxonID] || {};
                        data.forEach (function (record) {
                            identifiersBySpecies[record.queryItem] = record.stringId;
                        });
                        stringCache[taxonID] = identifiersBySpecies;
                        CLMSUI.utils.setLocalStorage (stringCache, "StringIds");

                        $("#result").text (JSON.stringify (identifiersBySpecies));

                        resolve (identifiersBySpecies);
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
            $("#result").text ("FROM CACHE: "+JSON.stringify (identifiersBySpecies));
            return Promise.resolve (identifiersBySpecies)
        }
    },

    queryStringInteractions: function (idMap) {
        var crosslinked = d3.values(idMap);
        if (crosslinked.length > 1) {
            var sidString = crosslinked.join("%0d");
            console.log ("stringIds", crosslinked, sidString);

            var stringNetworkScoreCache = CLMSUI.utils.getLocalStorage("StringNetworkScores");
            var idBySpecies = stringNetworkScoreCache[species] || {};
            var networkTsv = idBySpecies[sidString];

            if (!networkTsv) {
                var promiseObj = new Promise(function(resolve, reject ) {
                    $.ajax ({
                        type: "post",
                        url: "https://string-db.org/api/tsv/network?identifiers="+sidString+"&species="+species+"&caller_identity=martin",
                        success: function (dataTsv, textStatus, xhr) {
                            stringNetworkScoreCache[species] = idBySpecies;
                            idBySpecies[sidString] = dataTsv;
                            CLMSUI.utils.setLocalStorage (stringNetworkScoreCache, "StringNetworkScores");

                            $("#result2").text (dataTsv);
                            resolve ({idMap: idMap, networkTsv: dataTsv});
                            //onCompletionFunc (idMap, dataTsv);
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
                $("#result2").text ("FROM CACHE: "+networkTsv);
                return Promise.resolve ({idMap: idMap, networkTsv: networkTsv});
                //onCompletionFunc (idMap, networkTsv)
            }
        }
    },

    loadStringData: function (pids, species) {
        CLMSUI.STRINGUtils.getStringIdentifiers (pids, species)
            .then (function (identifiersBySpecies) {
                return CLMSUI.STRINGUtils.queryStringInteractions (identifiersBySpecies);
            })
            .then (function (networkAndIDObj) {
                if (networkAndIDObj.networkTsv == null) {
                    $("#result2").text ("NO DATA RETURNED");
                    return "";
                }
                var csv = CLMSUI.STRINGUtils.translateToCSV (networkAndIDObj.idMap, networkAndIDObj.networkTsv);
                console.log ("CSV", csv);
            })
        ;
    }
};

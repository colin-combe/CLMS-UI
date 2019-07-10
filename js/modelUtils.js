var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {
    flattenMatches: function(matchesArr) {
        var arrs = [
            [],
            []
        ];
        var matchesLen = matchesArr.length;
        for (var m = 0; m < matchesLen; ++m) {
            var match = matchesArr[m];
            arrs[match.isDecoy() ? 1 : 0].push(match.score());
        }
        return arrs;
    },

    matchScoreRange: function(matches, integerise) {
        var extent = d3.extent(matches, function(m) {
            return m.score();
        });
        if (integerise) {
            extent = extent.map(function(val, i) {
                return val !== undefined ? Math[i === 0 ? "floor" : "ceil"](val) : val;
                //return Math[i === 0 ? "ceil" : "floor"](val + (i === 0 ? -1 : 1));
            });
        }
        return extent;
    },

    getResidueType: function(protein, seqIndex, seqAlignFunc) {
        var seq = protein.sequence;
        // Some sequence alignment stuff can be done if you pass in a func
        seqIndex = seqAlignFunc ? seqAlignFunc(seqIndex) : seqIndex;
        // seq is 0-indexed, but seqIndex is 1-indexed so -1
        return seq[seqIndex - 1];
    },

    getDirectionalResidueType: function(xlink, getTo, seqAlignFunc) {
        return CLMSUI.modelUtils.getResidueType(getTo ? xlink.toProtein : xlink.fromProtein, getTo ? xlink.toResidue : xlink.fromResidue, seqAlignFunc);
    },

    filterOutDecoyInteractors: function (interactors) {
        return interactors.filter (function (i) { return !i.is_decoy; });
    },

    makeTooltipContents: {
        maxRows: 25,

        residueString: function(singleLetterCode) {
            return singleLetterCode + " (" + CLMSUI.modelUtils.amino1to3Map[singleLetterCode] + ")";
        },

        link: function(xlink, extras) {
            var linear = xlink.isLinearLink();
            var info = [
                ["From", xlink.fromProtein.name, xlink.fromResidue, CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getDirectionalResidueType(xlink, false))],
                linear ? ["To", "Linear", "---", "---"] : ["To", xlink.toProtein.name, xlink.toResidue, CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getDirectionalResidueType(xlink, true))],
                ["Matches", xlink.filteredMatches_pp.length],
                ["Highest Score", CLMSUI.modelUtils.highestScore(xlink)]
            ];

            var extraEntries = d3.entries(extras);
            extraEntries.forEach(function(entry) {
                info.push([entry.key, entry.value]);
            });

            d3.entries(xlink.getMeta()).forEach(function(entry) {
                if (entry.value !== undefined && !_.isObject(entry.value)) {
                    info.push([entry.key, entry.value]);
                }
            });
            return info;
        },

        interactor: function(interactor) {
            contents = [
                ["ID", interactor.id],
                ["Accession", interactor.accession],
                ["Size", interactor.size],
                ["Desc.", interactor.description]
            ];
            if (interactor.go) {
                var goTermsMap = CLMSUI.compositeModelInst.get("go");
                var goTermsText = "";
                for (var goId of interactor.go) {
                  var goTerm = goTermsMap.get(goId);
                  goTermsText  += goTerm.name + "<br>";
                }
                contents.push(["GO", goTermsText]);
            }
            return contents;
        },

        multilinks: function(xlinks, interactorId, residueIndex, extras) {
            var ttinfo = xlinks.map(function(xlink) {
                var linear = xlink.isLinearLink();
                var startIsTo = !linear && (xlink.toProtein.id === interactorId && xlink.toResidue === residueIndex);
                var residueCode = linear ? "---" : CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getDirectionalResidueType(xlink, !startIsTo));
                if (startIsTo) {
                    return [xlink.fromProtein.name, xlink.fromResidue, residueCode, xlink.filteredMatches_pp.length];
                } else {
                    return [linear ? "Linear" : xlink.toProtein.name, linear ? "---" : xlink.toResidue, residueCode, xlink.filteredMatches_pp.length];
                }
            });

            var extraEntries = d3.entries(extras);
            extraEntries.forEach(function(extraEntry) {
                extraEntry.value.forEach(function(val, i) {
                    ttinfo[i].push(val);
                });
            });

            var sortFields = [3, 0, 1]; // sort by matches, then protein name, then res index
            var sortDirs = [1, -1, -1];
            ttinfo.sort(function(a, b) {
                var diff = 0;
                for (var s = 0; s < sortFields.length && diff === 0; s++) {
                    var field = sortFields[s];
                    diff = (b[field] - a[field]) * sortDirs[s];
                    if (isNaN(diff)) {
                        diff = b[field].localeCompare(a[field]) * sortDirs[s];
                    }
                }
                return diff;
            });


            var headers = ["Protein", "Pos", "Residue", "Matches"];
            extraEntries.forEach(function(extraEntry) {
                headers.push(extraEntry.key);
            });

            ttinfo.unshift(headers);
            ttinfo.tableHasHeaders = true;
            var length = ttinfo.length;
            var limit = CLMSUI.modelUtils.makeTooltipContents.maxRows;
            if (length > limit) {
                ttinfo = ttinfo.slice(0, limit);
                ttinfo.push(["+ " + (length - limit) + " More"]);
            }
            return ttinfo;
        },

        feature: function(feature) {
            var possFields = [
                ["description"],
                ["type"],
                ["category"],
                ["fstart", "start"],
                ["fend", "end"]
            ];
            var data = possFields
                .filter(function(field) {
                    return feature[field[0]] != undefined;
                })
                .map(function(field) {
                    return [field.length > 1 ? field[1] : field[0], feature[field[0]]];
                });
            return data;
        },

        linkList: function(linkList, extras) {
            var extraEntries = d3.entries(extras);
            var fromProtein, toProtein;
            var details = linkList.map(function(crossLink, i) {
                var from3LetterCode = CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getDirectionalResidueType(crossLink, false));
                var to3LetterCode = CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getDirectionalResidueType(crossLink, true));
                fromProtein = crossLink.fromProtein.name;
                toProtein = crossLink.toProtein.name;
                var row = [crossLink.fromResidue + " " + from3LetterCode, crossLink.toResidue + " " + to3LetterCode];
                extraEntries.forEach(function(entry) {
                    row.push(entry.value[i]);
                });
                return row;
            });
            if (details.length) {
                var header = [fromProtein.replace("_", " "), toProtein.replace("_", " ")];
                extraEntries.forEach(function(entry) {
                    header.push(entry.key);
                });
                details.unshift(header);
                details.tableHasHeaders = true;
            } else {
                details = null;
            }
            return details;
        },

        match: function(match) {
            return [
                ["Match ID", match.match.id],
            ];
        },

        goTerm: function(goTerm) {
            return [
                ["ID", goTerm.id],
                ["Name", goTerm.name],
                ["Namespace", goTerm.namespace],
                ["Definition", goTerm.def],
                ["Synonym", goTerm.synomym],
                ["is_a", Array.from(goTerm.is_a.values()).join(", ")],
                ["intersection_of", Array.from(goTerm.intersection_of.values()).join(", ")],
                ["relationship", Array.from(goTerm.relationship.values()).join(", ")]
            ];
        },
    },

    highestScore: function(crosslink) {
        return d3.max(crosslink.filteredMatches_pp.map(function(m) {
            return +m.match.score();
        }));
    },

    makeTooltipTitle: {
        link: function(linkCount) {
            return "Linked Residue Pair" + (linkCount > 1 ? "s" : "");
        },
        interactor: function(interactor) {
            return interactor.name.replace("_", " ");
        },
        residue: function(interactor, residueIndex, residueExtraInfo) {
            return interactor.name + ":" + residueIndex + "" + (residueExtraInfo ? residueExtraInfo : "") + " " +
                CLMSUI.modelUtils.makeTooltipContents.residueString(CLMSUI.modelUtils.getResidueType(interactor, residueIndex));
        },
        feature: function() {
            return "Feature";
        },
        linkList: function(linkCount) {
            return "Linked Residue Pair" + (linkCount > 1 ? "s" : "");
        },
    },

    findResiduesInSquare: function(convFunc, crossLinkMap, x1, y1, x2, y2, asymmetric) {
        var a = [];
        var xmin = Math.max(0, Math.round(Math.min(x1, x2)));
        var xmax = Math.round(Math.max(x1, x2));
        var ymin = Math.max(0, Math.round(Math.min(y1, y2)));
        var ymax = Math.round(Math.max(y1, y2));
        //console.log ("x", xmin, xmax, "y", ymin, ymax);

        for (var n = xmin; n <= xmax; n++) {
            var convn = convFunc(n, 0).convX;
            if (!isNaN(convn) && convn > 0) {
                for (var m = ymin; m <= ymax; m++) {
                    var conv = convFunc(n, m);
                    var convm = conv.convY;
                    var excludeasym = asymmetric && (conv.proteinX === conv.proteinY) && (convn > convm);

                    if (!isNaN(convm) && convm > 0 && !excludeasym) {
                        var k = conv.proteinX + "_" + convn + "-" + conv.proteinY + "_" + convm;
                        var crossLink = crossLinkMap.get(k);
                        if (!crossLink && (conv.proteinX === conv.proteinY)) {
                            k = conv.proteinY + "_" + convm + "-" + conv.proteinX + "_" + convn;
                            crossLink = crossLinkMap.get(k);
                        }
                        if (crossLink) {
                            a.push({
                                crossLink: crossLink,
                                x: n,
                                y: m
                            });
                        }
                    }
                }
            }
        }
        return a;
    },

    amino3to1Map: {
        "Ala": "A",
        "Asx": "B",
        "Cys": "C",
        "Asp": "D",
        "Glu": "E",
        "Phe": "F",
        "Gly": "G",
        "His": "H",
        "Ile": "I",
        "Lys": "K",
        "Leu": "L",
        "Met": "M",
        "Asn": "N",
        "Pro": "P",
        "Gln": "Q",
        "Arg": "R",
        "Ser": "S",
        "Thr": "T",
        "Val": "V",
        "Trp": "W",
        "Tyr": "Y",
        "Glx": "Z",
        "ALA": "A",
        "ASX": "B",
        "CYS": "C",
        "ASP": "D",
        "GLU": "E",
        "PHE": "F",
        "GLY": "G",
        "HIS": "H",
        "ILE": "I",
        "LYS": "K",
        "LEU": "L",
        "MET": "M",
        "ASN": "N",
        "PRO": "P",
        "GLN": "Q",
        "ARG": "R",
        "SER": "S",
        "THR": "T",
        "SEC": "U",
        "VAL": "V",
        "TRP": "W",
        "X": "X",
        "TYR": "Y",
        "GLX": "Z",
        "*": "*",
    },

    aminoNameto1Map: {
        Alanine: "A",
        Arginine: "R",
        Asparagine: "N",
        Aspartate: "D",
        Cysteine: "C",
        Glutamate: "E",
        Glutamine: "Q",
        Glycine: "G",
        Histidine: "H",
        Isoleucine: "I",
        Leucine: "L",
        Lysine: "K",
        Methionine: "M",
        Phenylalanine: "F",
        Proline: "P",
        Selenocysteine: "U",
        Serine: "S",
        Threonine: "T",
        Tryptophan: "W",
        Tyrosine: "Y",
        Valine: "V",
        All: "*",
        _All: "X",
        C_Terminal: "CTERM",
        N_Terminal: "NTERM"
    },

    amino1toMass: {
        "A":71.03711,
        "R":156.10111,
        "N":114.04293,
        "D":115.02694,
        "C":103.00919,
        "E":129.04259,
        "Q":128.05858,
        "G":57.02146,
        "H":137.05891,
        "I":113.08406,
        "L":113.08406,
        "K":128.09496,
        "M":131.04049,
        "F":147.06841,
        "P":97.05276,
        "S":87.03203,
        "T":101.04768,
        "W":186.07931,
        "Y":163.06333,
        "V":99.06841,
    },

    // return array of indices of first occurrence of a sequence when encountering a repetition
    // e.g. ["CAT", "DOG", "CAT", "DOG"] -> [undefined, undefined, 0, 1];
    indexSameSequencesToFirstOccurrence: function(sequences) {
        var firstIndex = [];
        sequences.forEach(function(seq, i) {
            firstIndex[i] = undefined;
            for (var j = 0; j < i; j++) {
                if (seq === sequences[j]) {
                    firstIndex[i] = j;
                    break;
                }
            }
        });
        return firstIndex;
    },

    filterRepeatedSequences: function(sequences) {
        // Filter out repeated sequences to avoid costly realignment calculation of the same sequences
        var sameSeqIndices = CLMSUI.modelUtils.indexSameSequencesToFirstOccurrence(sequences);
        var uniqSeqs = sequences.filter(function(seq, i) {
            return sameSeqIndices[i] === undefined;
        }); // unique sequences...
        var uniqSeqIndices = d3.range(0, sequences.length).filter(function(i) {
            return sameSeqIndices[i] === undefined;
        }); // ...and their indices in 'seqs'...
        var uniqSeqReverseIndex = _.invert(uniqSeqIndices); // ...and a reverse mapping of their index in 'seqs' to their place in 'uniqSeqs'
        return {
            sameSeqIndices: sameSeqIndices,
            uniqSeqs: uniqSeqs,
            uniqSeqIndices: uniqSeqIndices,
            uniqSeqReverseIndex: uniqSeqReverseIndex
        };
    },

    reinflateSequenceMap: function(matchMatrix, sequences, filteredSeqInfo) {
        d3.keys(matchMatrix).forEach(function(protID) {
            var matchMatrixProt = matchMatrix[protID];
            matchMatrix[protID] = d3.range(0, sequences.length).map(function(i) {
                var sameSeqIndex = filteredSeqInfo.sameSeqIndices[i];
                var seqIndex = sameSeqIndex === undefined ? i : sameSeqIndex;
                var uniqSeqIndex = +filteredSeqInfo.uniqSeqReverseIndex[seqIndex]; // + 'cos invert above turns numbers into strings
                return matchMatrixProt[uniqSeqIndex];
            });
        });

        return matchMatrix;
    },

    matrixPairings: function(matrix, sequenceObjs) {
        var entries = d3.entries(matrix);
        var pairings = [];

        for (var n = 0; n < sequenceObjs.length; n++) {
            var max = {
                key: undefined,
                seqObj: undefined,
                bestScore: 2   //1e-25
            };
            var seqObj = sequenceObjs[n];
            entries.forEach(function(entry) {
                //var eScore = entry.value[n];
                var avgBitScore = entry.value[n];

                //if (eScore < max.eScore) { // lower eScore is better
                if (avgBitScore > max.bestScore) { // higher avgBitScore is better
                    max.key = entry.key;
                    max.seqObj = seqObj;
                    max.bestScore = avgBitScore;
                }
            });
            if (max.key) {
                pairings.push({
                    id: max.key,
                    seqObj: max.seqObj
                });
                //console.log ("MAX SCORE", max);
            }
        }

        return pairings;
    },

    intersectObjectArrays: function(a, b, compFunc) {
        if (!_.isEmpty(a) && !_.isEmpty(b) && compFunc) {
            var map = d3.map(a, compFunc);
            var result = b.filter(function(elem) {
                return map.has(compFunc(elem));
            });
            return result;
        }
        return [];
    },

    // interactorCollection can be map or array
    getLegalAccessionIDs: function(interactorCollection) {
        var ids = [];
        if (interactorCollection) {
            if (interactorCollection.length === undefined) {
                interactorCollection = CLMS.arrayFromMapValues(interactorCollection);
            }
            ids = CLMSUI.modelUtils.filterOutDecoyInteractors (interactorCollection)
                .map(function(prot) {
                    return prot.accession;
                })
                .filter(function(accession) {
                    return accession.match(CLMSUI.utils.commonRegexes.uniprotAccession);
                });
        }
        return ids;
    },

    getPDBIDsForProteins: function(accessionIDs, successFunc) {
        if (accessionIDs.length) {
            var xmlString = "<orgPdbQuery><queryType>org.pdb.query.simple.UpAccessionIdQuery</queryType>" +
                "<description>PDB Query Using Uniprot IDs</description><accessionIdList>" +
                accessionIDs.join(",") +
                "</accessionIdList></orgPdbQuery>";
            var encodedXmlString = encodeURIComponent(xmlString);

            $.post("https://www.rcsb.org/pdb/rest/search/?req=browser&sortfield=Release Date", encodedXmlString, successFunc);
        }
    },

    loadUserFile: function(fileObj, successFunc) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            var reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = (function() {
                return function(e) {
                    successFunc(e.target.result);
                };
            })(fileObj);

            // Read in the image file as a data URL.
            reader.readAsText(fileObj);
        }
    },


    makeSubIndexedMap: function(mmap, subIndexingProperty) {
        var subIndexedMap = {};
        d3.entries(mmap).forEach(function(entry) {
            subIndexedMap[entry.key] = d3.nest()
                .key(function(d) { return d[subIndexingProperty];})
                .entries(entry.value)
            ;
        });
        return subIndexedMap;
    },

    crosslinkerSpecificityPerLinker: function(searchArray) {
        var crossSpec = CLMSUI.compositeModelInst.get("clmsModel").get("crosslinkerSpecificity");
        if (!crossSpec) {
            crossSpec = {
                "default": {
                    name: "all",
                    searches: new Set(searchArray.map(function(s) {
                        return s.id;
                    })),
                    linkables: [new Set(["*"])]
                }
            };
        }
        return crossSpec;
    },

    // return indices of sequence whose letters match one in the residue set. Index is to the array, not to any external factor
    filterSequenceByResidueSet: function(seq, residueSet, all) {
        var rmap = all ? d3.range(0, seq.length) : [];
        if (!all) {
            for (var m = 0; m < seq.length; m++) {
                if (residueSet.has(seq[m])) {
                    rmap.push(m);
                }
            }
        }
        return rmap;
    },

    // Connect searches to proteins
    getProteinSearchMap: function(peptideArray, rawMatchArray) {
        var pepMap = d3.map(peptideArray, function(peptide) {
            return peptide.id;
        });
        var searchMap = {};
        rawMatchArray = rawMatchArray || [];
        rawMatchArray.forEach(function(rawMatch) {
            var prots = pepMap.get(rawMatch.pi[0]).prt; // pi --> pi[0] as rawMatches now contains arrays in each entry
            var searchToProts = searchMap[rawMatch.si];
            if (!searchToProts) {
                var newSet = d3.set();
                searchMap[rawMatch.si] = newSet;
                searchToProts = newSet;
            }
            prots.forEach(function(prot) {
                searchToProts.add(prot);
            });
        });
        return searchMap;
    },
    
    makeMultiKeyProteinMap: function (clmsModel) {
        var protMap = d3.map();
        clmsModel.get("participants").forEach(function(value, key) {
            protMap.set(value.accession, key);
            protMap.set(value.name, key);
            protMap.set(value.id, key);
        }); 
        return protMap;
    },
    
    parseProteinID: function (protMap, pid) {
        var parts = pid.split("|");
        var pkey;
        parts.forEach(function(part) {
            pkey = pkey || protMap.get(part);
        });
        return pkey;
    },

    updateLinkMetadata: function(metaDataFileContents, clmsModel) {
        var crossLinks = clmsModel.get("crossLinks");
        var protMap = CLMSUI.modelUtils.makeMultiKeyProteinMap (clmsModel);
        var first = true;
        var columns = [];
        var columnTypes = {};
        var dontStoreArray = ["linkID", "LinkID", "Protein 1", "SeqPos 1", "Protein 2", "SeqPos 2", "Protein1", "Protein2", "SeqPos1", "SeqPos2"];
        var dontStoreSet = d3.set(dontStoreArray);

        function getValueN(ref, n, d) {
            return d[ref + " " + n] || d[ref + n];
        }

        function parseProteinID2 (i, d) {
            var p = getValueN("Protein", i, d) || "";
            return CLMSUI.modelUtils.parseProteinID (protMap, p);
        }

        var matchedCrossLinks = [];
        d3.csv.parse(metaDataFileContents, function(d) {
            var linkID = d.linkID || d.LinkID;
            var crossLink = crossLinks.get(linkID);

            // Maybe need to generate key from several columns
            if (!crossLink) {
                var pkey1 = parseProteinID2 (1, d);
                var pkey2 = parseProteinID2 (2, d);
                linkID = pkey1 + "_" + getValueN("SeqPos", 1, d) + "-" + pkey2 + "_" + getValueN("SeqPos", 2, d);
                crossLink = crossLinks.get(linkID);
            }

            if (crossLink) {
                matchedCrossLinks.push(crossLink);
                var keys = d3.keys(d);

                if (first) {
                    columns = _.difference(keys, dontStoreArray);
                    columns.forEach(function(column) {
                        columnTypes[column] = "numeric";
                    });
                    first = false;
                }

                keys.forEach(function(key) {
                    var val = d[key];
                    if (val && !dontStoreSet.has(key)) {
                        if (!isNaN(val)) {
                            val = +val;
                        } else {
                            columnTypes[key] = "alpha"; // at least one entry in the column is non-numeric
                        }
                        crossLink.setMeta(key, val);
                    }
                });
            }
        });

        var matchedCrossLinkCount = matchedCrossLinks.length;

        // If any data types have been detected as non-numeric, go through the links and maked sure they're all non-numeric
        // or sorting etc will throw errors
        d3.entries(columnTypes)
            .filter(function(entry) {
                return entry.value === "alpha";
            })
            .forEach(function(entry) {
                matchedCrossLinks.forEach(function(matchedCrossLink) {
                    var val = matchedCrossLink.getMeta(entry.key);
                    if (val !== undefined) {
                        matchedCrossLink.setMeta(entry.key, val.toString());
                    }
                });
            })
        ;

        var registry = clmsModel.get("crossLinkMetaRegistry") || d3.set();
        columns.forEach(function(column) {
            registry.add(column);
        });
        clmsModel.set("crossLinkMetaRegistry", registry);

        if (columns) {
            CLMSUI.vent.trigger("linkMetadataUpdated", {
                columns: columns,
                columnTypes: columnTypes,
                items: crossLinks,
                matchedItemCount: matchedCrossLinkCount
            }, {
                source: "file"
            });
        }
    },

    clearCrossLinkMetaData: function(crossLinkArr, metaFields) {
        crossLinkArr.forEach(function(crossLink) {
            if (crossLink.getMeta()) {
                metaFields.forEach(function(metaField) {
                    if (crossLink.getMeta(metaField) !== undefined) {
                        crossLink.setMeta(metaField, undefined);
                    }
                });
            }
        });
    },
    

    updateProteinMetadata: function(metaDataFileContents, clmsModel) {
        var proteins = clmsModel.get("participants");
        var first = true;
        var columns = [];
        var dontStoreArray = ["proteinID", "Accession"].map(function(str) {
            return str.toLocaleLowerCase();
        });
        var dontStoreSet = d3.set(dontStoreArray);
        var matchedProteinCount = 0;

        var protMap = CLMSUI.modelUtils.makeMultiKeyProteinMap (clmsModel);

        d3.csv.parse(metaDataFileContents, function(d) {
            if (first) {
                var keys = d3.keys(d).map(function(key) {
                    return key.toLocaleLowerCase();
                });
                columns = _.difference(keys, dontStoreArray);
                first = false;
            }

            var proteinIDValue = d.proteinID || d.ProteinID || d.Accession || d.accession;
            var proteinID = protMap.get (CLMSUI.modelUtils.parseProteinID (protMap, proteinIDValue));
            if (proteinID !== undefined) {
                var protein = proteins.get(proteinID);

                if (protein) {
                    matchedProteinCount++;
                    protein.name = d.name || d.Name || protein.name;

                    protein.meta = protein.meta || {};
                    var meta = protein.meta;
                    d3.entries(d).forEach(function(entry) {
                        var key = entry.key;
                        var val = entry.value;
                        var column = key.toLocaleLowerCase();
                        if (val && !dontStoreSet.has(column) && column !== "name") {
                            if (!isNaN(val)) {
                                val = +val;
                            }
                            meta[column] = val;
                        }
                    });
                }
            }
        });

        if (columns) {
            CLMSUI.vent.trigger("proteinMetadataUpdated", {
                columns: columns,
                items: proteins,
                matchedItemCount: matchedProteinCount
            }, {
                source: "file"
            });
        }
    },

    clearProteinMetaData: function(proteinArr, metaFields) {
        proteinArr.forEach(function(protein) {
            if (protein.meta) {
                metaFields.forEach(function(metaField) {
                    if (protein.meta[metaField] !== undefined) {
                        protein.meta[metaField] = undefined;
                    }
                });
            }
        });
    },


    updateUserAnnotationsMetadata: function(userAnnotationsFileContents, clmsModel) {
        var proteins = clmsModel.get("participants");
        var first = true;
        var columns = [];

        var protMap = CLMSUI.modelUtils.makeMultiKeyProteinMap (clmsModel);
        var newAnnotations = [];
        var annotationMap = d3.map();
        var proteinSet = d3.set();

        d3.csv.parse(userAnnotationsFileContents, function(d) {
            if (first) {
                var keys = d3.keys(d).map(function(key) {
                    return key.toLocaleLowerCase();
                });
                first = false;
                columns = keys;
            }

            var dl = {};
            d3.keys(d).forEach(function(key) {
                dl[key.toLocaleLowerCase()] = d[key];
            });

            var proteinID = protMap.get (CLMSUI.modelUtils.parseProteinID (protMap, dl.proteinid));
            if (proteinID !== undefined) {
                var protein = proteins.get(proteinID);

                if (protein) {
                    protein.userAnnotations = protein.userAnnotations || [];
                    var newAnno = {
                        type: dl.annotname,
                        description: dl.description,
                        category: "User Defined",
                        begin: dl.startres,
                        end: dl.endres,
                        colour: dl.color || dl.colour
                    };
                    newAnnotations.push(newAnno);
                    protein.userAnnotations.push(newAnno);
                    if (!annotationMap.has(dl.annotname)) {
                        annotationMap.set(dl.annotname, {
                            category: "User Defined",
                            type: dl.annotname,
                            source: "Search", // these will be matched to the search sequence,
                            colour: dl.color || dl.colour, // default colour for this type - undefined if not declared
                        });
                    }
                    proteinSet.add(proteinID);
                }
            }
        });

        CLMSUI.vent.trigger("userAnnotationsUpdated", {
            types: annotationMap.values(),
            columns: annotationMap.values(),
            items: newAnnotations,
            matchedItemCount: newAnnotations.length
        }, {
            source: "file"
        });
    },


    updateGafAnnotationsMetadata: function(gafFileContents, clmsModel) {

        var url = "./go.obo";

        d3.text(url, function(error, txt) {
            if (error) {
                console.log("error", error, "for", url, arguments);
            } else {
                var go = new Map();
                var lines = txt.split('\n');
                var term;

                // var termType = "cellular_component";

                //term.id = term.id.replace(":", "")
                for (var l = 0; l < lines.length; l++) {
                    //console.log(lines[l]);
                    var line = lines[l];
                    if (line.trim() != "") {
                        if (line.trim() == "[Term]" || line.trim() == "[Typedef]") {
                            if (term){//} && term.namespace == termType) {
                                go.set(term.id, term);
                            }
                            term = new CLMSUI.GoTerm();
                        } else if (term) {
                            var parts = line.split(":");
                            if (parts[0] == "is_a" || parts[0] == "intersection_of" || parts[0] == "relationship") {
                                term[parts[0]].add(parts.slice(1, parts.length).join("").trim());
                            } else {
                              term[parts[0]] = parts.slice(1, parts.length).join("").trim();
                            }
                        }
                    }
                }
                // if (term.namespace == termType) {
                    go.set(term.id, term);
                // }
                console.log("go size:" + go.size)
                CLMSUI.compositeModelInst.set("go", go);

                var tempMap = new Map();
                var goTrees = {};

                function checkTerm(goTerm) {
                    if (!tempMap.has(goTerm.id)) {
                        if (goTerm.is_a.size > 0) {
                          var is_aValues = goTerm.is_a.values();
                          for (var potentialParent of is_aValues) {
                              var parentId = potentialParent.split(" ")[0];
                              var parentTerm = go.get(parentId);
                              if (goTerm.namespace = parentTerm.namespace) {
                                goTerm.parents.push(parentTerm);
                                checkTerm(parentTerm);
                                parentTerm.children.push(goTerm);
                              }
                          }
                        }
                        else if (goTerm.id == "GO0008150") {
                            goTrees.biological_process = goTerm;
                        } else if (goTerm.id == "GO0003674") {
                            goTrees.molecular_function = goTerm;
                        } else if (goTerm.id == "GO0005575") {
                            goTrees.cellular_component = goTerm;
                        }
                        tempMap.set(goTerm.id, goTerm);
                        return goTerm;
                    } else {
                        return tempMap.get(goTerm.id);
                    }
                    return null;
                };

                for (var t of go.values()) {
                    // if (t.namespace == termType) {
                        checkTerm(t);
                    // }
                }

                CLMSUI.compositeModelInst.set("goTrees", goTrees);

                var proteins = clmsModel.get("participants");
                var protMap = d3.map();
                proteins.forEach(function(value, key) {
                    protMap.set(value.accession, key);
                });

                var gafLines = gafFileContents.split('\n');
                //var groups = new Map();
                for (var g = 0; g < gafLines.length; g++) {
                    line = gafLines[g];
                    if (line.startsWith("!") == false) {
                        var fields = line.split("\t");
                        var goId = fields[4].replace(":", "");
                        var goTerm = go.get(goId);
                        if (goTerm) {
                            var proteinId = protMap.get(fields[1]);
                            var protein = proteins.get(proteinId);
                            goTerm.interactors.add(protein);
                            if (protein) {
                                if (!protein.go) {
                                    protein.go = new Set();
                                }
                                //console.log(">>"+goId);
                                protein.go.add(goId);
                                // if (!groups.has(goId)) {
                                //     var accs = new Set();
                                //     accs.add(proteinId);
                                //     groups.set(goId, accs);
                                // } else {
                                //     groups.get(goId).add(proteinId);
                                // }
                            }
                        }
                    }
                }

                // update groups

                CLMSUI.vent.trigger("goAnnotationsUpdated", {
                    // groups: groups
                }, {
                    source: "file"
                });

            }
        });
    },


    // Column clustering functions

    // normalise an array of values
    zscore: function(vals) {
        if (vals.length === 0) {
            return [undefined];
        }
        if (vals.length === 1) {
            return [0];
        }
        //console.log ("vals", vals);
        var avg = d3.mean(vals);
        var sd = d3.deviation(vals);
        return vals.map(function(val) {
            return val !== undefined ? (val - avg) / sd : undefined;
        });
    },

    flattenBinaryTree: function(tree, arr) {
        arr = arr || [];
        if (tree.value) {
            arr.push(tree.value);
        } else {
            this.flattenBinaryTree(tree.left, arr);
            this.flattenBinaryTree(tree.right, arr);
        }
        return arr;
    },

    // Calculate averages of grouped column values
    averageGroups: function(valuesByColumn, colNameGroups, averageFuncEntry) {
        averageFuncEntry = averageFuncEntry || {
            key: "mean",
            value: d3.mean
        };

        var groupIndices = valuesByColumn.map(function(zscore) {
            return zscore.groupIndex;
        });
        var colRange = _.range(d3.max(groupIndices) + 1);
        var avgColumns = colRange.map(function() {
            return [];
        });

        if (valuesByColumn.length) {
            for (var n = 0; n < valuesByColumn[0].length; n++) { // go from top to bottom of columns
                var groups = colRange.map(function() {
                    return [];
                });

                // so this is now going through a row (same index in each column)
                for (var c = 0; c < valuesByColumn.length; c++) {
                    if (groupIndices[c] !== undefined) { // if column in group...
                        var val = valuesByColumn[c][n];
                        if (val) { // ...push val into correct group bucket
                            groups[groupIndices[c]].push(val);
                        }
                    }
                }

                // Now average the group buckets into new column value datasets
                var avgs = groups.map(function(group, i) {
                    var avg = group.length ? averageFuncEntry.value(group) : undefined;
                    avgColumns[i].push(avg);
                });
            }
        }

        avgColumns.forEach(function(avgColumn, i) {
            avgColumn.colName = averageFuncEntry.key + " [" + colNameGroups[i].join(";") + "]";
        });

        return avgColumns;
    },

    // add group indices to columns, and return columnNames grouped in an array under the appropriate index
    // e.g. options.groups = d3.map({a: "cat", b: "cat", c: "dog"});
    // then a.groupIndex = 0, b.groupIndex = 0, c.groupIndex = 1, colNameGroups = [0: [a,b], 1: [c]]
    makeColumnGroupIndices: function(valuesByColumn, options) {
        var columnNamesSet = d3.set(valuesByColumn.map(function(columnValues) {
            return columnValues.colName;
        }));
        var columnNameGroups = {};
        options.groups.forEach(function(k, v) {
            if (columnNamesSet.has(k)) {
                columnNameGroups[k] = v;
            }
        });
        var uniqGroupValues = _.uniq(d3.values(columnNameGroups));
        var groupIndices = {};
        var colNameGroups = [];
        uniqGroupValues.forEach(function(gv, i) {
            groupIndices[gv] = i;
            colNameGroups.push([]);
        });

        valuesByColumn.forEach(function(columnValues) {
            var colName = columnValues.colName;
            var groupName = columnNameGroups[colName];
            var groupIndex = groupIndices[groupName];
            columnValues.groupIndex = groupIndex;
            colNameGroups[groupIndex].push(colName);
        });

        return colNameGroups;
    },

    // compact 2D arrays so that sub-arrays composed entirely of undefined elements are removed
    compact2DArray: function(arr2D) {
        return arr2D.filter(function(arr) {
            return !_.every(arr, function(val) {
                return val === undefined;
            });
        });
    },

    // add crosslink id to a row-based array, need to do this before next step, and then get rid of rows with no defined values
    reduceLinks: function(linkArr, crossLinks) {
        linkArr.forEach(function(link, i) {
            link.clink = crossLinks[i];
        });
        return CLMSUI.modelUtils.compact2DArray(linkArr);
    },

    makeZScores: function(crossLinks, options) {
        // get values per column
        var valuesByColumn = options.columns.map(function(dim) {
            var vals = options.accessor(crossLinks, dim);
            vals.colName = dim;
            return vals;
        }, this);

        // calc zscores for each data column
        var zscoresByColumn = valuesByColumn.map(function(columnValues) {
            var zscore = CLMSUI.modelUtils.zscore(columnValues);
            zscore.colName = columnValues.colName;
            return zscore;
        }, this);

        var zScoresByLink = options.calcLinkZScores === true ? CLMSUI.modelUtils.reduceLinks(d3.transpose(zscoresByColumn), crossLinks) : [];

        return {
            zScoresByColumn: zscoresByColumn,
            zScoresByLink: zScoresByLink,
            zColumnNames: options.columns
        };
    },

    averageGroupsMaster: function(crossLinks, myOptions) {
        var defaults = {
            groups: d3.map({
                "pH4 1": undefined
            }),
            accessor: function(crossLinks, dim) {
                return crossLinks.map(function(crossLink) {
                    return crossLink[dim] || crossLink.getMeta(dim);
                });
            }
        };
        var options = $.extend({}, defaults, myOptions);
        options.columns = options.groups.entries()
            .filter(function(entry) {
                return entry.value !== undefined;
            })
            .map(function(entry) {
                return entry.key;
            });

        // get zscores per column
        var zResults = CLMSUI.modelUtils.makeZScores(crossLinks, options);
        var zScoresByColumn = zResults.zScoresByColumn;
        var colNameGroups = CLMSUI.modelUtils.makeColumnGroupIndices(zScoresByColumn, options);
        var zGroupAvgScores = CLMSUI.modelUtils.averageGroups(zScoresByColumn, colNameGroups, options.averageFuncEntry);
        var allZScores = zScoresByColumn.concat(zGroupAvgScores);
        var allZScoresByLink = CLMSUI.modelUtils.reduceLinks(d3.transpose(allZScores), crossLinks);
        var colNames = allZScores.map(function(col) {
            return col.colName;
        });
        var groupColumns = zGroupAvgScores.map(function(avgColumn) {
            return {
                name: avgColumn.colName,
                index: colNames.indexOf(avgColumn.colName)
            };
        });
        //console.log ("groupColumns", groupColumns);

        // Copy group scores to link meta attributes
        CLMSUI.modelUtils.updateMetaDataWithTheseColumns(allZScoresByLink, groupColumns);

        // Then tell the world these meta attributes have changed
        var newAndUpdatedColumns = groupColumns
            .map(function(groupCol) {
                return groupCol.name;
            });
        CLMSUI.vent.trigger("linkMetadataUpdated", {
            columns: newAndUpdatedColumns,
            columnTypes: _.object(newAndUpdatedColumns, _.range(newAndUpdatedColumns.length).map(function() {
                return "numeric";
            })),
            items: crossLinks,
            matchedItemCount: allZScoresByLink.length
        });

        return {
            zscores: allZScoresByLink,
            zColumnNames: colNames
        };
    },

    metaClustering: function(filteredCrossLinks, allCrossLinks, myOptions) {
        var defaults = {
            distance: "euclidean",
            linkage: "average",
            columns: ["pH4 1", "pH4 2", "pH4 3"],
            accessor: function(crossLinks, dim) {
                return crossLinks.map(function(crossLink) {
                    return crossLink[dim] || crossLink.getMeta(dim);
                });
            },
            calcLinkZScores: true
        };
        var options = $.extend({}, defaults, myOptions);

        // Get Z-Scores - Zscoring existing ZScores won't chnage anything, bit inefficient but ok
        var zResults = CLMSUI.modelUtils.makeZScores(filteredCrossLinks, options);
        var zScoresByLink = zResults.zScoresByLink;
        // Calculate K-means and dimension tree on non-grouped dimensions
        var kmeans = clusterfck.kmeans(zScoresByLink, undefined, options.distance);
        var zdistances = clusterfck.hcluster(zScoresByLink, options.distance, options.linkage);
        var treeOrder = this.flattenBinaryTree(zdistances.tree);

        CLMSUI.modelUtils.clearCrossLinkMetaData(allCrossLinks, ["kmcluster", "treeOrder"]);

        kmeans.forEach(function(cluster, i) {
            cluster.forEach(function(arr) {
                arr.clink.setMeta("kmcluster", i + 1);
            });
        });

        treeOrder.forEach(function(value, i) {
            value.clink.setMeta("treeOrder", i + 1);
        });

        // Then tell the world these meta attributes have changed
        var newAndUpdatedColumns = ["kmcluster", "treeOrder"];
        CLMSUI.vent.trigger("linkMetadataUpdated", {
            columns: newAndUpdatedColumns,
            columnTypes: _.object(newAndUpdatedColumns, _.range(newAndUpdatedColumns.length).map(function() {
                return "numeric";
            })),
            items: filteredCrossLinks,
            matchedItemCount: zScoresByLink.length
        });

        return {
            cfk_kmeans: kmeans,
            cfk_distances: zdistances
        };
    },


    updateMetaDataWithTheseColumns: function(linkArr, columnNameIndexPairs) {
        linkArr.forEach(function(zlinkScore) {
            var clink = zlinkScore.clink;
            columnNameIndexPairs.forEach(function(columnNameIndexPair) {
                clink.setMeta(columnNameIndexPair.name, zlinkScore[columnNameIndexPair.index]);
            });
        });
    },

    normalize2DArrayToColumn: function(orig2DArr, normalColIndex) {
        var arr;

        if (normalColIndex >= 0) {
            arr = orig2DArr.map(function(row) {
                return row.slice();
            });

            arr.forEach(function(row) {
                var base = row[normalColIndex];
                for (var n = 0; n < row.length; n++) {
                    row[n] = base !== undefined && row[n] !== undefined ? row[n] - base : undefined;
                }
            });
        }

        return arr || orig2DArr;
    },

    crosslinkCountPerProteinPairing: function(crossLinkArr) {
        var obj = {};
        crossLinkArr.forEach(function(crossLink) {
            var fromProtein = crossLink.fromProtein;
            var toProtein = crossLink.toProtein;
            var key = fromProtein.id + "-" + toProtein.id;
            if (!obj[key]) {
                obj[key] = {
                    crossLinks: [],
                    fromProtein: fromProtein,
                    toProtein: toProtein,
                    label: fromProtein.name.replace("_", " ") + " - " + toProtein.name.replace("_", " ")
                };
            }
            obj[key].crossLinks.push(crossLink);
        });
        return obj;
    },

    // merges array of ranges
    // features should be pre-filtered to an individual protein and to an individual type
    // this can be reused for any array containing elements with properties 'begin' and 'end'
    mergeContiguousFeatures: function(features) {
        features.sort(function(f1, f2) {
            return +f1.begin - +f2.begin;
        });
        var mergedRanges = [],
            furthestEnd, mergeBegin;
        features.forEach(function(f) {
            var b = +f.begin;
            var e = +f.end;

            if (furthestEnd === undefined) { // first feature, initialise mergeBegin and furthestEnd
                mergeBegin = b;
                furthestEnd = e;
            } else { // otherwise look for overlap with previous
                if (b > furthestEnd + 1) { // if a gap between beginning of this range and the maximum end value found so far
                    mergedRanges.push({
                        begin: mergeBegin,
                        end: furthestEnd
                    }); // then add the now finished old merged range
                    mergeBegin = b; // and then set the beginning of a new merged range
                }
                furthestEnd = Math.max(furthestEnd, e);
            }
        });
        if (furthestEnd) {
            mergedRanges.push({
                begin: mergeBegin,
                end: furthestEnd
            }); // add hanging range
        }

        var merged = mergedRanges.length < features.length ? // if merged ranges less than original feature count
            mergedRanges.map(function(coords) { // make new features based on the new merged ranges
                return $.extend({}, features[0], coords); // features[0] is used to get other fields
            }) :
            features // otherwise just use originals
        ;
        //console.log ("mergedFeatures", features, merged);
        return merged;
    },


    // merges array of single numbers
    // assumes vals are already sorted numerically (though each val is a string)
    joinConsecutiveNumbersIntoRanges: function(vals, joinString) {
        joinString = joinString || "-";

        if (vals && vals.length > 1) {
            var newVals = [];
            var last = +vals[0],
                start = +vals[0],
                run = 1; // initialise variables to first value

            for (var n = 1; n < vals.length + 1; n++) { // note + 1
                // add extra loop iteration using MAX_SAFE_INTEGER as last value.
                // loop will thus detect non-consecutive numbers on last iteration and output the last proper value in some form.
                var v = (n < vals.length ? +vals[n] : Number.MAX_SAFE_INTEGER);
                if (v - last === 1) { // if consecutive to last number just increase the run length
                    run++;
                } else { // but if not consecutive to last number...
                    // add the previous numbers either as a sequence (if run > 1) or as a single value (last value was not part of a sequence itself)
                    newVals.push(run > 1 ? start + joinString + last : last.toString());
                    run = 1; // then reset the run and start variables to begin at current value
                    start = v;
                }
                last = v; // make last value the current value for next iteration of loop
            }

            //CLMSUI.utils.xilog ("vals", vals, "joinedVals", newVals);
            vals = newVals;
        }
        return vals;
    },

    getDistanceSquared: function(coords1, coords2) {
        var d2 = 0;
        for (var n = 0; n < coords1.length; n++) {
            var diff = coords1[n] - coords2[n];
            d2 += diff * diff;
        }
        return d2;
    },

    getMinimumDistance: function(points1, points2, accessorObj, maxDistance, ignoreFunc) {

        accessorObj = accessorObj || {};
        var points1Bigger = points1.length > points2.length;

        var bigPointArr = points1Bigger ? points1 : points2;
        var smallPointArr = points1Bigger ? points2 : points1;
        var octree = d3.octree();
        octree
            .x(accessorObj.x || octree.x())
            .y(accessorObj.y || octree.y())
            .z(accessorObj.z || octree.z())
            .addAll(bigPointArr)
        ;

        maxDistance = maxDistance || 200;
        
        var nearest = smallPointArr.map(function(point) {
            return octree.find(octree.x()(point), octree.y()(point), octree.z()(point), maxDistance, point, ignoreFunc);
        });
        var dist = smallPointArr.map (function (point, i) {
            return nearest[i] ? CLMSUI.modelUtils.getDistanceSquared(point.coords, nearest[i].coords) : undefined;
        });

        return d3.zip(points1Bigger ? nearest : smallPointArr, points1Bigger ? smallPointArr : nearest, dist);
    },


    radixSort: function(categoryCount, data, bucketFunction) {
        var radixSortBuckets = Array.apply(null, Array(categoryCount)).map(function() {
            return [];
        });
        data.forEach(function(d) {
            var bucketIndex = bucketFunction(d);
            radixSortBuckets[bucketIndex].push(d);
        });
        //console.log ("buckets", radixSortBuckets);
        return d3.merge(radixSortBuckets);
    },


    // https://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string-in-javascript-without-using-try
    tryParseJSON: function(jsonString) {
        try {
            var o = JSON.parse(decodeURI(jsonString)); // decodeURI in case square brackets have been escaped in url transmission

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === "object") {
                return o;
            }
        } catch (e) {}

        return false;
    },

    parseURLQueryString: function(str) {
        var urlChunkMap = {};
        str.split("&").forEach(function(part) {
            var keyValuePair = part.split("=");
            var val = keyValuePair[1];
            //console.log ("kvp", keyValuePair);
            var jsonVal = CLMSUI.modelUtils.tryParseJSON(val);
            urlChunkMap[keyValuePair[0]] = val !== "" ? (Number.isNaN(Number(val)) ? (val == "true" ? true : (val == "false" ? false : (jsonVal ? jsonVal : val))) : Number(val)) : val;
        });
        //console.log ("ucm", urlChunkMap);
        return urlChunkMap;
    },

    makeURLQueryString: function(obj, commonKeyPrefix) {
        var attrEntries = d3.entries(obj);
        var parts = attrEntries.map(function(attrEntry) {
            var val = attrEntry.value;
            if (typeof val === "boolean") {
                val = +val; // turn true/false to 1/0
            } else if (typeof val === "string") {
                val = val;
            } else if (val === undefined) {
                val = "";
            } else {
                val = encodeURI(JSON.stringify(val));
            }
            return commonKeyPrefix + attrEntry.key + "=" + val;
        });
        return parts;
    },

    totalProteinLength: function(interactors) {
        return d3.sum(interactors, function(d) {
            return d.size;
        });
    },

    getSearchGroups: function (clmsModel) {
        var searchArr = CLMS.arrayFromMapValues (clmsModel.get("searches"));
        var uniqueGroups = _.uniq (_.pluck (searchArr, "group"));
        //console.log ("SSS", searchArr, uniqueGroups);
        uniqueGroups.sort (function (a,b) {
            var an = Number.parseFloat (a);
            var bn = Number.parseFloat (b);
            return !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : a.localeCompare (b);
        });
        return uniqueGroups;
    },
};

CLMSUI.modelUtils.amino1to3Map = _.invert(CLMSUI.modelUtils.amino3to1Map);
CLMSUI.modelUtils.amino1toNameMap = _.invert(CLMSUI.modelUtils.aminoNameto1Map);

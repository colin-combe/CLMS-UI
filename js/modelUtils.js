var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {
    flattenMatches: function (matchesArr) {
        var arrs = [[],[]];
        var matchesLen = matchesArr.length;
        for (var m = 0; m < matchesLen; ++m) {
            var match = matchesArr[m];
            arrs[match.isDecoy()? 1 : 0].push (match.score());
        }
        return arrs;
    },

	matchScoreRange: function (matches, integerise) {
		var extent = d3.extent (matches, function (m) { return m.score(); });
		if (integerise) {
			extent = extent.map(function (val, i) { return Math[i === 0 ? "ceil" : "floor"](val + (i === 0 ? -1 : 1)); });
		}
		return extent;
	},

    // letters from http://www.hgmd.cf.ac.uk/docs/cd_amino.html
    // the four 'nh ester' amino acids
    // lys = k, ser = s, thr = t, tyr = y
    esterMap: {"K": true, "S": true, "T": true, "Y": true},
    esterBool: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map (function(n) { return {"K": true, "S": true, "T": true, "Y": true}[n]; }),

    getEsterLinkType: function (crossLink) {
        var toResIndex = crossLink.toResidue;
        var fromResIndex = crossLink.fromResidue;
        //console.log ("res", crossLink);
        //~ var pLink = crossLink.proteinLink;
        //var pLinkId = pLink.id;

        // might need to query protein model at this point if from and to prot data stops getting attached to residues

        var fromProt = crossLink.fromProtein;
        var toProt = crossLink.toProtein;

        var fromResType = this.getResidueType (fromProt, fromResIndex);
        var toResType = this.getResidueType (toProt, toResIndex);

        // http://jsperf.com/letter-match says using a boolean array for the letter values is generally quickest, have a poke if you disagree
        var fromEster = this.esterBool[fromResType.charCodeAt(0) - 65]; //this.esterMap[fromResType];
        var toEster = this.esterBool[toResType.charCodeAt(0) - 65]; //this.esterMap[toResType];

        return (fromEster ? 1 : 0) + (toEster ? 1 : 0);

    },

    getResidueType: function (protein, resIndex, seqAlignFunc) {
        var seq = protein.sequence;
        // Some sequence alignment stuff can be done if you pass in a func
        resIndex = seqAlignFunc ? seqAlignFunc (resIndex) : resIndex;
        // Is the sequence starting at 1, do the resIndex's start at 1?
        return seq[resIndex - 1];
    },

    getDirectionalResidueType: function (xlink, getTo, seqAlignFunc) {
        return CLMSUI.modelUtils.getResidueType (getTo ? xlink.toProtein : xlink.fromProtein, getTo ? xlink.toResidue : xlink.fromResidue, seqAlignFunc);
    },

    makeTooltipContents: {
        maxRows: 25,

		residueString: function (singleLetterCode) {
			return singleLetterCode + " (" + CLMSUI.modelUtils.amino1to3Map [singleLetterCode] + ")";
		},

        link: function (xlink, extras) {
            var linear = xlink.isLinearLink();
            var info = [
                ["From", xlink.fromProtein.name, xlink.fromResidue, CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getDirectionalResidueType(xlink, false))],
                linear ? ["To", "Linear", "---", "---"]
                    : ["To", xlink.toProtein.name, xlink.toResidue, CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getDirectionalResidueType(xlink, true))],
                ["Matches", xlink.filteredMatches_pp.length],
				["Highest Score", CLMSUI.modelUtils.highestScore(xlink)]
            ];

			var extraEntries = d3.entries (extras);
			extraEntries.forEach (function (entry) {
				info.push ([entry.key, entry.value]);
			});

            d3.entries(xlink.meta).forEach (function (entry) {
                if (! _.isObject (entry.value)) {
                    info.push ([entry.key, entry.value]);
                }
            });
            return info;
        },

        interactor: function (interactor) {
             return [["ID", interactor.id], ["Accession", interactor.accession], ["Size", interactor.size], ["Desc.", interactor.description]];
        },

        multilinks: function (xlinks, interactorId, residueIndex, extras) {
            var ttinfo = xlinks.map (function (xlink) {
                var linear = xlink.isLinearLink();
                var startIsTo = !linear && (xlink.toProtein.id === interactorId && xlink.toResidue === residueIndex);
                var residueCode = linear ? "---" : CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getDirectionalResidueType(xlink, !startIsTo));
                if (startIsTo) {
                    return [xlink.fromProtein.name, xlink.fromResidue, residueCode, xlink.filteredMatches_pp.length];
                } else {
                    return [linear ? "Linear" : xlink.toProtein.name, linear ? "---" : xlink.toResidue, residueCode, xlink.filteredMatches_pp.length];
                }
            });

			var extraEntries = d3.entries (extras);
			extraEntries.forEach (function (extraEntry) {
				extraEntry.value.forEach (function (val, i) {
					ttinfo[i].push (val);
				});
			});

            var sortFields = [3, 0, 1]; // sort by matches, then protein name, then res index
            var sortDirs = [1, -1, -1];
            ttinfo.sort (function(a, b) {
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
			extraEntries.forEach (function (extraEntry) {
				headers.push (extraEntry.key);
			});

            ttinfo.unshift (headers);
            ttinfo.tableHasHeaders = true;
            var length = ttinfo.length;
            var limit = CLMSUI.modelUtils.makeTooltipContents.maxRows;
            if (length > limit) {
                ttinfo = ttinfo.slice (0, limit);
                ttinfo.push (["+ "+(length-limit)+" More"]);
            }
            return ttinfo;
        },

        feature: function (feature) {
            var possFields = [["description"], ["type"], ["category"], ["fstart", "start"], ["fend", "end"]];
            var data = possFields
                .filter(function (field) { return feature[field[0]] != undefined; })
                .map(function(field) { return [field.length > 1 ? field[1] : field[0], feature[field[0]]]; })
            ;
             return data;
        },

        linkList: function (linkList, extras) {
            var extraEntries = d3.entries (extras);
            var fromProtein, toProtein;
            var details = linkList.map (function (crossLink, i) {
                var from3LetterCode = CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getDirectionalResidueType(crossLink, false));
                var to3LetterCode = CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getDirectionalResidueType(crossLink, true));
                fromProtein = crossLink.fromProtein.name;
                toProtein = crossLink.toProtein.name;
                var row = [crossLink.fromResidue+" "+from3LetterCode, crossLink.toResidue+" "+to3LetterCode];
                extraEntries.forEach (function (entry) {
                    row.push (entry.value[i]);
                });
                return row;
            });
            if (details.length) {
                var header = [fromProtein.replace("_", " "), toProtein.replace("_", " ")];
                extraEntries.forEach (function (entry) {
                    header.push (entry.key);
                });
                details.unshift (header);
                details.tableHasHeaders = true;
            } else {
                details = null;
            }
            return details;
        },

        match: function (match) {
            return [
               ["Match ID", match.match.id],
            ];
        },
    },

    highestScore: function (crosslink) {
		var scores = crosslink.filteredMatches_pp.map(function (m) {return +m.match.score();});
		//~ console.log(scores);
		var result = Math.max.apply(Math,scores);
		//~ console.log(result);
		return result;
	},

    makeTooltipTitle: {
        link: function (linkCount) { return "Linked Residue Pair" + (linkCount > 1 ? "s" : ""); },
        interactor: function (interactor) { return interactor.name.replace("_", " "); },
        residue: function (interactor, residueIndex, residueExtraInfo) {
            return interactor.name + ":" + residueIndex + "" + (residueExtraInfo ? residueExtraInfo : "") + " " +
                CLMSUI.modelUtils.makeTooltipContents.residueString (CLMSUI.modelUtils.getResidueType (interactor, residueIndex));
        },
        feature: function () { return "Feature"; },
        linkList: function (linkCount) { return "Linked Residue Pair" + (linkCount > 1 ? "s" : ""); },
    },
	
	findResiduesInSquare: function (convFunc, crossLinkMap, x1, y1, x2, y2, asymmetric) {
        var a = [];
		var xmin = Math.max (0, Math.round (Math.min (x1, x2)));
		var xmax = Math.round (Math.max (x1, x2));
		var ymin = Math.max (0, Math.round (Math.min (y1, y2)));
		var ymax = Math.round (Math.max (y1, y2));
		//console.log ("x", xmin, xmax, "y", ymin, ymax);
		
        for (var n = xmin; n <= xmax; n++) {
            var convn = convFunc (n, 0).convX;
            if (!isNaN(convn) && convn > 0) {
                for (var m = ymin; m <= ymax; m++) {
                    var conv = convFunc (n, m);
                    var convm = conv.convY;
                    var excludeasym = asymmetric && (conv.proteinX === conv.proteinY) && (convn > convm);

                    if (!isNaN(convm) && convm > 0 && !excludeasym) {
                        var k = conv.proteinX+"_"+convn+"-"+conv.proteinY+"_"+convm;
                        var crossLink = crossLinkMap.get(k);
                        if (!crossLink && (conv.proteinX === conv.proteinY)) {
                            k = conv.proteinY+"_"+convm+"-"+conv.proteinX+"_"+convn;
                            crossLink = crossLinkMap.get(k);
                        }
                        if (crossLink) {
                            a.push ({crossLink: crossLink, x: n, y: m});
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
        "*": "*" ,
    },

	aminoNameto1Map : {
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


    repopulateNGL: function (pdbInfo) {
        pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name);
        var params = {};    // {sele: ":A"};    // example: show just 'A' chain
        if (pdbInfo.ext) {
            params.ext = pdbInfo.ext;
        }
        var uri = pdbInfo.pdbCode ? "rcsb://"+pdbInfo.pdbCode : pdbInfo.pdbFileContents;
        var stage = pdbInfo.stage;
        var bbmodel = pdbInfo.bbmodel;

        stage.removeAllComponents();   // necessary to remove old stuff so old sequences don't pop up in sequence finding

		function returnFailure (reason) {
			var emptySequenceMap = [];
            emptySequenceMap.failureReason = "Error for "+pdbInfo.baseSeqId+", "+reason;
			emptySequenceMap.pdbid = pdbInfo.baseSeqId;
            bbmodel.trigger ("3dsync", emptySequenceMap);
		}

        stage.loadFile (uri, params)
            .catch (function (reason) {
                returnFailure (reason);
            })
            .then (function (structureComp) {

				console.log ("structureComp", structureComp);
				if (structureComp) {
					// match by alignment for searches where we don't know uniprot ids, don't have pdb codes, or when matching by uniprot ids returns no matches
					function matchByAlignment () {
						var protAlignCollection = bbmodel.get("alignColl");
						var pdbUniProtMap = CLMSUI.modelUtils.matchSequencesToProteins (protAlignCollection, nglSequences2, interactorArr,
							function(sObj) { return sObj.data; }
						);
						sequenceMapsAvailable (pdbUniProtMap);
					}

					var nglSequences2 = CLMSUI.modelUtils.getSequencesFromNGLModelNew (stage);
					var interactorMap = bbmodel.get("clmsModel").get("participants");
					var interactorArr = CLMS.arrayFromMapValues(interactorMap);

					// If have a pdb code AND legal accession IDs use a web service to glean matches between ngl protein chains and clms proteins
					// This is asynchronous so we use a callback
					if (pdbInfo.pdbCode && CLMSUI.modelUtils.getLegalAccessionIDs(interactorMap).length > 0) {
						CLMSUI.modelUtils.matchPDBChainsToUniprot (pdbInfo.pdbCode, nglSequences2, interactorArr, function (pdbUniProtMap) {
							if (pdbUniProtMap.fail) {
								returnFailure ("No valid data returned");
							} else if (!pdbUniProtMap.length) {    // no matches, fall back to aligning
								matchByAlignment();
							} else {
								sequenceMapsAvailable (pdbUniProtMap);
							}
						});
					}
					else {  // without access to pdb codes have to match comparing all proteins against all chains
						matchByAlignment();
					}

					// bit to continue onto after ngl protein chain to clms protein matching has been done
					function sequenceMapsAvailable (sequenceMap) {

						//console.log ("seqmpa", sequenceMap);
						//if (sequenceMap && sequenceMap.length) {
							sequenceMap.pdbid = pdbInfo.baseSeqId;
							var chainMap = {};
							sequenceMap.forEach (function (pMatch) {
								pMatch.data = pMatch.seqObj.data;
								pMatch.name = CLMSUI.modelUtils.make3DAlignID (pdbInfo.baseSeqId, pMatch.seqObj.chainName, pMatch.seqObj.chainIndex);
								chainMap[pMatch.id] = chainMap[pMatch.id] || [];
								chainMap[pMatch.id].push ({index: pMatch.seqObj.chainIndex, name: pMatch.seqObj.chainName});
								pMatch.otherAlignSettings = {semiLocal: true};
							});
							console.log ("chainmap", chainMap, "stage", stage, "\nhas sequences", sequenceMap);

							if (bbmodel.get("stageModel")) {
								 bbmodel.get("stageModel").stopListening();  // Stop the following 3dsync event triggering stuff in the old stage model
							}
							bbmodel.trigger ("3dsync", sequenceMap);
							// Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)

							// Make a new model and set of data ready for the ngl viewer
							var crosslinkData = new CLMSUI.BackboneModelTypes.NGLModelWrapperBB ();
							crosslinkData.set({
								structureComp: structureComp,
								chainMap: chainMap,
								pdbBaseSeqID: pdbInfo.baseSeqId,
								masterModel: bbmodel,
							});
							bbmodel.set ("stageModel", crosslinkData);
							// important that the new stagemodel is set first ^^^ before we setupLinks() on the model
							// otherwise the listener in the 3d viewer is still pointing to the old stagemodel when the
							// changed:linklist event is received. (i.e. it broke the other way round)
							crosslinkData.setupLinks (bbmodel.get("clmsModel"));
					}
				}
            })
        ;
    },


    getSequencesFromNGLModelNew: function (stage) {
        var sequences = [];

        stage.eachComponent (function (comp) {
            comp.structure.eachChain (function (c) {
                if (CLMSUI.modelUtils.isViableChain (c)) {    // short chains are ions/water molecules, ignore
                    console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname);
                    var resList = [];
                    c.eachResidue (function (r) {
                        resList.push (CLMSUI.modelUtils.amino3to1Map[r.resname] || "X");
                    });
                    sequences.push ({chainName: c.chainname, chainIndex: c.index, residueOffset: c.residueOffset, data: resList.join("")});
                }
            });
        });

        return sequences;
    },

    // Nice web-servicey way of doing ngl chain to clms protein matching
    // Except it depends on having a pdb code, not a standalone file, and all the uniprot ids present too
    // Therefore, current default is to use sequence matching to detect similarities
    matchPDBChainsToUniprot: function (pdbCode, nglSequences, interactorArr, callback) {
        $.get("https://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query="+pdbCode,
            function (data, status, xhr) {

                if (status === "success" && (data.contentType === "text/xml" || data.contentType === "application/xml")) {  // data is an xml fragment
                    var map = d3.map();

                    $(data).find("block").each (function (i, b) {
                        var segArr = $(this).find("segment[intObjectId]");
                        for (var n = 0; n < segArr.length; n += 2) {
                            var id1 = $(segArr[n]).attr("intObjectId");
                            var id2 = $(segArr[n+1]).attr("intObjectId");
                            var pdbis1 = _.includes(id1, ".") || !id1.match (CLMSUI.utils.commonRegexes.uniprotAccession);
                            var unipdb = pdbis1 ? {pdb: id1, uniprot: id2} : {pdb: id2, uniprot: id1};
                            map.set (unipdb.pdb+"-"+unipdb.uniprot, unipdb);
                        }
                    });
                    // sometimes there are several blocks for the same uniprot/pdb combination so had to map then take the values to remove duplicate pairings i.e. 3C2I
                    var mapArr = CLMS.arrayFromMapValues(map);

                    if (callback) {
                        var interactors = interactorArr.filter (function(i) { return !i.is_decoy; });

                        mapArr.forEach (function (mapping) {
                            var dotIndex = mapping.pdb.indexOf(".");
                            var chainName = dotIndex >= 0 ? mapping.pdb.slice(dotIndex + 1) : mapping.pdb.slice(-1);    // bug fix 27/01/17
                            var matchSeqs = nglSequences.filter (function (seqObj) {
                                return seqObj.chainName === chainName;
                            });
                            mapping.seqObj = matchSeqs[0];
                            var matchingInteractors = interactors.filter (function(i) {
                                var minLength = Math.min (i.accession.length, mapping.uniprot.length);
                                return i.accession.substr(0, minLength) === mapping.uniprot.substr(0, minLength);
                            });
                            mapping.id = matchingInteractors && matchingInteractors.length ? matchingInteractors[0].id : "none";
                        });

                        mapArr = mapArr.filter (function (mapping) { return mapping.id !== "none" && mapping.seqObj; });
						console.log ("mapArr", mapArr);
                        callback (mapArr);
                    }
                } else {	// usually some kind of error if reached here as we didn't detect xml
					var emptySequenceMap = [];
					emptySequenceMap.fail = true;
					callback (emptySequenceMap);
				}
            }
        );
    },

    /* Fallback protein-to-pdb chain matching routines for when we don't have a pdbcode to query
    the pdb web services or it's offline.
    */
    matchSequencesToProteins: function (protAlignCollection, sequenceObjs, proteins, extractFunc) {
        proteins = proteins.filter (function (protein) { return !protein.is_decoy; });
        var matchMatrix = {};
        proteins.forEach (function (prot) {
            //console.log ("prot", prot);
            var protAlignModel = protAlignCollection.get(prot.id);
            if (protAlignModel) {
                var seqs = extractFunc ? sequenceObjs.map (extractFunc) : sequenceObjs;
                //protAlignModel.set("semiLocal", true);  // needs to be done as initialisation not called on model (figure out why later)
                var alignResults = protAlignModel.alignWithoutStoring (seqs, {semiLocal: true});
                console.log ("alignResults", alignResults);
                var scores = alignResults.map (function (indRes) { return indRes.res[0]; });
                matchMatrix[prot.id] = scores;
            }
        });
        //console.log ("matchMatrix", matchMatrix, sequenceObjs);
        return CLMSUI.modelUtils.matrixPairings (matchMatrix, sequenceObjs);
    },

    // call with alignmentCollection as this context through .call
    addNewSequencesToAlignment : function (clmsModel) {
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
					this.addSeq (entry.id, "Canonical", entry.uniprot.sequence);
				}
                //~ console.log ("alignColl", this);
            }
        }, this);
    },

    matrixPairings: function (matrix, sequenceObjs) {
        var keys = d3.keys(matrix);
        var pairings = [];
        for (var n = 0; n < sequenceObjs.length; n++) {
            var max = {key: undefined, seqObj: undefined, score: 40};
            var seqObj = sequenceObjs[n];
            keys.forEach (function (key) {
                var score = matrix[key][n];
                //console.log ("s", n, score, score / sequenceObjs[n].data.length);
                if (score > max.score && (score / seqObj.data.length) > 1) {
                    max.score = score;
                    max.key = key;
                    max.seqObj = seqObj;
                }
            });
            if (max.key) {
                pairings.push ({id: max.key, seqObj: max.seqObj});
            }
        }
        return pairings;
    },

    not3DHomomultimeric: function (crossLink, chain1ID, chain2ID) {
        return chain1ID !== chain2ID || !crossLink.confirmedHomomultimer;
    },

    intersectObjectArrays: function (a, b, compFunc) {
        if (a && b && a.length && b.length && compFunc) {
            var map = d3.map (a, compFunc);
            var result = b.filter (function (elem) {
                return map.has (compFunc(elem));
            });
            return result;
        }
        return [];
    },

    getLegalAccessionIDs: function (interactorMap) {
        var ids = [];
        if (interactorMap) {
            ids = CLMS.arrayFromMapValues(interactorMap)
                .filter (function (prot) { return !prot.is_decoy; })
                .map (function(prot) { return prot.accession; })
                .filter (function (accession) { return accession.match (CLMSUI.utils.commonRegexes.uniprotAccession); })
            ;
        }
        return ids;
    },

    getPDBIDsForProteins: function (accessionIDs, successFunc) {
        if (accessionIDs.length) {
            var xmlString = "<orgPdbQuery><queryType>org.pdb.query.simple.UpAccessionIdQuery</queryType>"
                +"<description>PDB Query Using Uniprot IDs</description><accessionIdList>"
                +accessionIDs.join(",")
                +"</accessionIdList></orgPdbQuery>"
            ;
            var encodedXmlString = encodeURIComponent (xmlString);

            $.post("https://www.rcsb.org/pdb/rest/search/?req=browser&sortfield=Release Date", encodedXmlString, successFunc);
        }
    },

    loadUserFile: function (fileObj, successFunc) {
       if (window.File && window.FileReader && window.FileList && window.Blob) {
           var reader = new FileReader();

          // Closure to capture the file information.
          reader.onload = (function() {
            return function(e) {
                successFunc (e.target.result);
            };
          })(fileObj);

          // Read in the image file as a data URL.
          reader.readAsText(fileObj);
       }
    },

    make3DAlignID : function (baseID, chainName, chainIndex) {
        return baseID + ":" + chainName + ":" + chainIndex;
    },

    getProteinFromChainIndex: function (chainMap, chainIndex) {
        var entries = d3.entries (chainMap);
        var matchProts = entries.filter (function (entry) {
            return _.includes (_.pluck (entry.value, "index"), chainIndex);
        });
        return matchProts && matchProts.length ? matchProts[0].key : null;
    },

    // this avoids going via the ngl functions using data in a chainMap
    getChainNameFromChainIndex: function (chainMap, chainIndex) {
        var chainsPerProt = d3.values (chainMap);
        var allChains = d3.merge (chainsPerProt);
        var matchChains = allChains.filter (function (entry) {
            return entry.index === chainIndex;
        });
        return matchChains[0] ? matchChains[0].name : undefined;
    },

    crosslinkerSpecificityPerLinker: function (searchArray) {
        var crossSpec = CLMSUI.compositeModelInst.get("clmsModel").get("crosslinkerSpecificity");
		if (!crossSpec) {
			crossSpec = {"default": {name: "all", searches: new Set (searchArray.map(function(s) { return s.id; })), linkables: [new Set(["*"])]}};
		}
		return crossSpec;
        /*var linkableResSets = {};
        searchArray.forEach (function (search) {
            var crosslinkers = search.crosslinkers || [];

            crosslinkers.forEach (function (crosslinker) {
                var crosslinkerDescription = crosslinker.description;
                var crosslinkerName = crosslinker.name;
                var linkedAARegex = /LINKEDAMINOACIDS:(.*?)(?:;|$)/g;   // capture both sets if > 1 set
                //console.log ("cld", crosslinkerDescription);
                var resSet = linkableResSets[crosslinkerName];

                if (!resSet) {
                    resSet = {searches: new Set(), linkables: [], name: crosslinkerName};
                    linkableResSets[crosslinkerName] = resSet;
                }
                resSet.searches.add (search.id);

                var result = null;
                var i = 0;
                while ((result = linkedAARegex.exec(crosslinkerDescription)) !== null) {
                    if (!resSet.linkables[i]) {
                        resSet.linkables[i] = new Set();
                    }

                    var resArray = result[1].split(',');
                    resArray.forEach (function (res) {
                        var resRegex = /(cterm|nterm|[A-Z])(.*)?/i;
                        var resMatch = resRegex.exec(res);
                        if (resMatch) {
                            resSet.linkables[i].add(resMatch[1].toUpperCase());
                        }
                    });
                    i++;
                }

                resSet.heterobi = resSet.heterobi || (i > 1);
            });
        });

        console.log ("CROSS", linkableResSets);
        return linkableResSets;*/
    },

    // return indices of sequence whose letters match one in the residue set. Index is to the array, not to any external factor
    filterSequenceByResidueSet: function (seq, residueSet, all) {
        var rmap = [];
        for (var m = 0; m < seq.length; m++) {
            if (all || residueSet.has(seq[m])) {
                rmap.push (m);
            }
        }
        return rmap;
    },

    // Connect searches to proteins
    getProteinSearchMap: function (peptideArray, rawMatchArray) {
        var pepMap = d3.map (peptideArray, function (peptide) { return peptide.id; });
        var searchMap = {};
        rawMatchArray = rawMatchArray || [];
        rawMatchArray.forEach (function (rawMatch) {
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
        return searchMap;
    },

    updateLinkMetadata: function (metaDataFileContents, clmsModel) {
        var crossLinks = clmsModel.get("crossLinks");
        var protMap = d3.map();
        clmsModel.get("participants").forEach (function (value, key) {
            protMap.set (value.accession, key);
            protMap.set (value.name, key);
        });
        var first = true;
        var columns = [];
        var dontStoreArray = ["linkID", "LinkID", "Protein 1", "SeqPos 1", "Protein 2", "SeqPos 2", "Protein1", "Protein2", "SeqPos1", "SeqPos2"];
        var dontStoreSet = d3.set (dontStoreArray);
		var matchedCrossLinkCount = 0;
		function getValueN (ref, n, d) {
			return d[ref+" "+n] || d[ref+n];
		}

        d3.csv.parse (metaDataFileContents, function (d) {
            var linkID = d.linkID || d.LinkID;
            var crossLinkEntry = crossLinks.get(linkID);

            // Maybe need to generate key from several columns
            if (!crossLinkEntry) {
				var p1 = getValueN ("Protein", 1, d);
				var p2 = getValueN ("Protein", 2, d);
                var parts1 = p1 ? p1.split("|") : [];
                var parts2 = p2 ? p2.split("|") : [];
                var pkey1, pkey2;
                parts1.forEach (function (part) {
                    pkey1 = pkey1 || protMap.get(part);
                });
                parts2.forEach (function (part) {
                    pkey2 = pkey2 || protMap.get(part);
                });
                linkID = pkey1+"_"+getValueN("SeqPos", 1, d)+"-"+pkey2+"_"+getValueN("SeqPos", 2, d);
                crossLinkEntry = crossLinks.get(linkID);
            }

            if (crossLinkEntry) {
				matchedCrossLinkCount++;
                crossLinkEntry.meta = crossLinkEntry.meta || {};
                var meta = crossLinkEntry.meta;
                var keys = d3.keys(d);
                keys.forEach (function (key) {
                    var val = d[key];
                    if (val && !dontStoreSet.has(key)) {
                        if (!isNaN(val)) {
                            val = +val;
                        }
                        meta[key] = val;
                    }
                });
                if (first) {
					columns = _.difference (keys, dontStoreArray);
                    first = false;
                }
            }
        });
        if (columns) {
            CLMSUI.vent.trigger ("linkMetadataUpdated", {columns: columns, items: crossLinks, matchedItemCount: matchedCrossLinkCount});
        }
    },

	updateProteinMetadata: function (metaDataFileContents, clmsModel) {
        var proteins = clmsModel.get("participants");
        var first = true;
        var columns = [];
        var dontStoreArray = ["proteinID", "Accession"].map (function (str) { return str.toLocaleLowerCase(); });
        var dontStoreSet = d3.set (dontStoreArray);
		var matchedProteinCount = 0;

		var protMap = d3.map();
		proteins.forEach (function (value, key) {
            protMap.set (value.accession, key);
            protMap.set (value.name, key);
			protMap.set (value.id, key);
        });

        d3.csv.parse (metaDataFileContents, function (d) {
			if (first) {
				var keys = d3.keys(d).map (function (key) {
					return key.toLocaleLowerCase();
				});
				columns = _.difference (keys, dontStoreArray);
				first = false;
			}

            var proteinIDValue = d.proteinID || d.ProteinID || d.Accession || d.accession;
			var proteinID = protMap.get(proteinIDValue);
			if (proteinID !== undefined) {
				var protein = proteins.get (proteinID);

				if (protein) {
					matchedProteinCount++;
					var name = d.name || d.Name;
					protein.name = name || protein.name;

					protein.meta = protein.meta || {};
					var meta = protein.meta;
					d3.entries(d).forEach (function (entry) {
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
            CLMSUI.vent.trigger ("proteinMetadataUpdated", {columns: columns, items: proteins, matchedItemCount: matchedProteinCount});
        }
    },

	// test to ignore short chains and those that are just water molecules
    isViableChain: function (chainProxy) {
        return chainProxy.residueCount > 10 && (!chainProxy.entity || chainProxy.entity.description !== "water");
    },

    crosslinkCountPerProteinPairing: function (crossLinkArr) {
        var obj = {};
        crossLinkArr.forEach (function (crossLink) {

            // only show non-decoys, non-linears as we're only interested in real links with two ends
            if (!crossLink.isLinearLink() && !crossLink.isDecoyLink()) {
                var fromProtein = crossLink.fromProtein;
                var toProtein = crossLink.toProtein;
                var key = fromProtein.id + "-" + toProtein.id;
                if (!obj[key]) {
                    obj[key] = {
                        crossLinks:[],
                        fromProtein: fromProtein,
                        toProtein: toProtein,
                        label: fromProtein.name.replace("_", " ") + " - " + toProtein.name.replace("_", " ")
                    };
                }
                var slot = obj[key].crossLinks;
                slot.push (crossLink);
            }
        });
        return obj;
    },

    // features should be pre-filtered to an individual protein and to an individual type
    mergeContiguousFeatures: function (features) {
        features.sort (function (f1, f2) {
            return +f1.begin - +f2.begin;
        });
        var mergedRanges = [], furthestEnd = -10, mergeBegin = -10;
        features.forEach (function (f, i) {
            var b = +f.begin;
            var e = +f.end;
            if (b > furthestEnd + 1) { // if a gap between beginning of this range and the maximum end value found so far
                if (i) {    // if not the first feature (for which previous values are meaningless)
                    mergedRanges.push ({begin: mergeBegin, end: furthestEnd});  // then add the merged range
                }
                mergeBegin = b; // and then set the beginning of a new merged range
            }
            furthestEnd = Math.max (furthestEnd, e);
        });
        if (furthestEnd >= 0) {
            mergedRanges.push ({begin: mergeBegin, end: furthestEnd});  // add hanging range
        }

        var merged = mergedRanges.length < features.length ?    // if merged ranges less than original feature count
            mergedRanges.map (function (coords) { // make new features based on the new merged ranges
                return $.extend ({}, features[0], coords); // features[0] is used to get other fields
            })
            : features  // otherwise just use origina;s
        ;
        //window.mergerxi = merged;
        //console.log ("mergedFeatures", features, merged);
        return merged;
    },

    radixSort: function (categoryCount, data, bucketFunction) {
        var radixSortBuckets = Array.apply (null, Array(categoryCount)).map(function() { return []; });
        data.forEach (function (d) {
            var bucketIndex = bucketFunction (d);
            radixSortBuckets[bucketIndex].push (d);
        });
        //console.log ("buckets", radixSortBuckets);
        return d3.merge (radixSortBuckets);
    },


	// https://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string-in-javascript-without-using-try
	tryParseJSON: function (jsonString) {
		try {
			var o = JSON.parse(decodeURI(jsonString));	// decodeURI in case square brackets have been escaped in url transmission

			// Handle non-exception-throwing cases:
			// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
			// but... JSON.parse(null) returns null, and typeof null === "object",
			// so we must check for that, too. Thankfully, null is falsey, so this suffices:
			if (o && typeof o === "object") {
				return o;
			}
		}
		catch (e) { }

		return false;
	},

	parseURLQueryString: function (str) {
		var urlChunkMap = {};
		str.split("&").forEach (function (part) {
			var keyValuePair = part.split("=");
			var val = keyValuePair[1];
			//console.log ("kvp", keyValuePair);
			var jsonVal = CLMSUI.modelUtils.tryParseJSON (val);
			urlChunkMap[keyValuePair[0]] = val !== "" ? (Number.isNaN(Number(val)) ? (val == "true" ? true : (val == "false" ? false : (jsonVal ? jsonVal : val))) : Number(val)) : val;
		});
		//console.log ("ucm", urlChunkMap);
		return urlChunkMap;
	},

	makeURLQueryString: function (obj, commonKeyPrefix) {
		var attrEntries = d3.entries (obj);
		var parts = attrEntries.map (function (attrEntry) {
			var val = attrEntry.value;
			if (typeof val === "boolean") {
				val = +val;	// turn true/false to 1/0
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

	totalProteinLength: function (interactors) {
		return d3.sum (interactors, function (d) { return d.size; })
	},
};

CLMSUI.modelUtils.amino1to3Map = _.invert (CLMSUI.modelUtils.amino3to1Map);
CLMSUI.modelUtils.amino1toNameMap = _.invert (CLMSUI.modelUtils.aminoNameto1Map);

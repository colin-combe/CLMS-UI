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

    getResidueType: function (protein, resIndex, seqAlignFunc) {
        var seq = protein.sequence;
        // Some sequence alignment stuff can be done if you pass in a func
        resIndex = seqAlignFunc ? seqAlignFunc (resIndex) : resIndex;
        // seq is 0-indexed, but resIndex is 1-indexed so -1
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

            d3.entries(xlink.getMeta()).forEach (function (entry) {
                if (entry.value !== undefined && ! _.isObject (entry.value)) {
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
		return d3.max (crosslink.filteredMatches_pp.map (function (m) {return +m.match.score();}));
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
					// match by alignment func for searches where we don't know uniprot ids, don't have pdb codes, or when matching by uniprot ids returns no matches
					function matchByAlignment () {
						var protAlignCollection = bbmodel.get("alignColl");
						CLMSUI.vent.listenToOnce (CLMSUI.vent, "sequenceMatchingDone", function (matchMatrix) {
							var pdbUniProtMap = CLMSUI.modelUtils.matrixPairings (matchMatrix, nglSequences, protAlignCollection);
							sequenceMapsAvailable (pdbUniProtMap);
						});
						// sequenceMatchingDone event triggered in matchSequencesToExistingProteins when alignments done, sync or async
						CLMSUI.modelUtils.matchSequencesToExistingProteins (protAlignCollection, nglSequences, interactorArr,
							function(sObj) { return sObj.data; }
						);
					}

					var nglSequences = CLMSUI.modelUtils.getChainSequencesFromNGLModel (stage);
					var interactorMap = bbmodel.get("clmsModel").get("participants");
					var interactorArr = CLMS.arrayFromMapValues(interactorMap);

					// If have a pdb code AND legal accession IDs use a web service in matchPDBChainsToUniprot to glean matches
					// between ngl protein chains and clms proteins. This is asynchronous so we use a callback
					if (pdbInfo.pdbCode && CLMSUI.modelUtils.getLegalAccessionIDs(interactorMap).length) {
						CLMSUI.modelUtils.matchPDBChainsToUniprot (pdbInfo.pdbCode, nglSequences, interactorArr, function (pdbUniProtMap) {
							if (pdbUniProtMap.fail) {	// No data returned for this pdb codem fall back to aligning
								matchByAlignment();
								//returnFailure ("No valid uniprot data returned");
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

						console.log ("seqmpa", sequenceMap);
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


    getChainSequencesFromNGLModel: function (stage) {
        var sequences = [];

        stage.eachComponent (function (comp) {
            comp.structure.eachChain (function (c) {
				//console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname, c.qualifiedName());
                if (CLMSUI.modelUtils.isViableChain (c)) {    // short chains are ions/water molecules, ignore
                    var resList = [];
                    c.eachResidue (function (r) {
                        resList.push (CLMSUI.modelUtils.amino3to1Map[r.resname] || "X");
                    });
                    sequences.push ({chainName: c.chainname, chainIndex: c.index, residueOffset: c.residueOffset, data: resList.join("")});
					//console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname, c.qualifiedName(), resList.join(""));
                }
            });
        });

		console.log ("seq", sequences);
        return sequences;
    },

    // Nice web-servicey way of doing ngl chain to clms protein matching
    // Except it depends on having a pdb code, not a standalone file, and all the uniprot ids present too
    // Therefore, current default is to use sequence matching to detect similarities
    matchPDBChainsToUniprot: function (pdbCode, nglSequences, interactorArr, callback) {
		
		function handleError (data, status) {
			console.log ("error", data, status)
			var emptySequenceMap = [];
			emptySequenceMap.fail = true;
			callback (emptySequenceMap);
		}
		
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
					handleError (data, status);
				}
            }
        ).fail (function (jqxhr, status, error) {
			handleError (null, status);
		})
		;
    },

    // Fallback protein-to-pdb chain matching routines for when we don't have a pdbcode to query the pdb web services or it's offline.
    matchSequencesToExistingProteins: function (protAlignCollection, sequenceObjs, proteins, extractFunc) {
        proteins = proteins
			.filter (function (protein) { return !protein.is_decoy; })
			.filter (function (protein) { return protAlignCollection.get (protein.id); })
		;
        var matchMatrix = {};
		var seqs = extractFunc ? sequenceObjs.map (extractFunc) : sequenceObjs;
		
		// Filter out repeated sequences to avoid costly realignment calculation of the same sequences
		var filteredSeqInfo = CLMSUI.modelUtils.filterRepeatedSequences (seqs);
		
		function finished (matchMatrix) {
			// inflate score matrix to accommodate repeated sequences that were found and filtered out above
			CLMSUI.vent.trigger ("sequenceMatchingDone", CLMSUI.modelUtils.reinflateSequenceMap (matchMatrix, seqs, filteredSeqInfo));
		}
		
		var totalAlignments = filteredSeqInfo.uniqSeqs.length * proteins.length;
		CLMSUI.vent.trigger ("alignmentProgress", "Attempting to match "+proteins.length+" proteins to "+seqs.length+" additional sequences.");
	
		var start = performance.now();
		// webworker way, only do if enough proteins and cores to make it worthwhile
		if ((!window || !!window.Worker) && proteins.length > 20 && workerpool.cpus > 2) {
			var count = proteins.length;
			var pool = workerpool.pool ("js/alignWorker.js");
			
			proteins.forEach (function (prot, i) {
            	var protAlignModel = protAlignCollection.get (prot.id);
				var settings = protAlignModel.getSettings();
				settings.aligner = undefined;
				pool.exec ('protAlignPar', [prot.id, settings, filteredSeqInfo.uniqSeqs, {semiLocal: true}])
					.then(function (alignResultsObj) {
						// be careful this is async, protID might not be right unless you get it from returned object
						var alignResults = alignResultsObj.fullResults;
						var protID = alignResultsObj.protID;
					 	//console.log('result', /*alignResults,*/ prot.id);
						var protAlignModel2 = protAlignCollection.get (prot.id);
						var uniqScores = alignResults.map (function (indRes) {
							return protAlignModel2.getBitScore (indRes.res[0], protAlignModel2.get("scoreMatrix").attributes);
						});
							
						matchMatrix[protID] = uniqScores;
					})
					.catch(function (err) { console.log(err); })
					.then(function () {
						count--;
						if (count % 10 === 0) {
							//console.log ("done task,",count,"to go");
							CLMSUI.vent.trigger ("alignmentProgress", count+" proteins remaining to align.");
						}
						if (count === 0) {
							pool.terminate(); // terminate all workers when done
							console.log ("tidy pool. TIME PAR", performance.now() - start);
							
							finished (matchMatrix);
						}
					})
				;
			});	
		}
		// else do it on main thread
		else {
			// Do alignments
			proteins.forEach (function (prot) {
				var protAlignModel = protAlignCollection.get (prot.id);
				// Only calc alignments for unique sequences, we can copy values for repeated sequences in the next bit
				var alignResults = protAlignModel.alignWithoutStoring (filteredSeqInfo.uniqSeqs, {semiLocal: true});
				console.log ("alignResults", /*alignResults,*/  prot.id);	// printing alignResults uses lots of memory in console (prevents garbage collection)
				var uniqScores = alignResults.map (function (indRes) {
					return indRes.bitScore;
				});
				matchMatrix[prot.id] = uniqScores;
			});

			finished (matchMatrix);
		}
    },
	
	// return array of indices of first occurrence of a sequence when encountering a repetition
	// e.g. ["CAT", "DOG", "CAT", "DOG"] -> [undefined, undefined, 0, 1];
	indexSameSequencesToFirstOccurrence: function (sequences) {
		var firstIndex = [];
		sequences.forEach (function (seq, i) {
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
	
	filterRepeatedSequences: function (sequences) {
		// Filter out repeated sequences to avoid costly realignment calculation of the same sequences
		var sameSeqIndices = CLMSUI.modelUtils.indexSameSequencesToFirstOccurrence (sequences);
		var uniqSeqs = sequences.filter (function (seq, i) { return sameSeqIndices[i] === undefined; });	// unique sequences...
		var uniqSeqIndices = d3.range(0, sequences.length).filter (function (i) { return sameSeqIndices[i] === undefined; });	// ...and their indices in 'seqs'...
		var uniqSeqReverseIndex = _.invert (uniqSeqIndices);	// ...and a reverse mapping of their index in 'seqs' to their place in 'uniqSeqs'
		//console.log ("sss", sameSeqIndices, uniqSeqs, uniqSeqIndices, uniqSeqReverseIndex);	
		return {sameSeqIndices: sameSeqIndices, uniqSeqs: uniqSeqs, uniqSeqIndices: uniqSeqIndices, uniqSeqReverseIndex: uniqSeqReverseIndex};
	},
	
	reinflateSequenceMap: function (matchMatrix, sequences, filteredSeqInfo) {
		d3.keys(matchMatrix).forEach (function (protID) {
			var matchMatrixProt = matchMatrix[protID];
			matchMatrix[protID] = d3.range(0, sequences.length).map (function (i) {
				var sameSeqIndex = filteredSeqInfo.sameSeqIndices[i];
				var seqIndex = sameSeqIndex === undefined ? i : sameSeqIndex;
				var uniqSeqIndex = +filteredSeqInfo.uniqSeqReverseIndex[seqIndex];	// + 'cos invert above turns numbers into strings
				return matchMatrixProt[uniqSeqIndex]; 	
			});
		});

		return matchMatrix;
	},

    // call with alignmentCollection as this context through .call
    addNewSequencesToAlignment : function (clmsModel) {
        clmsModel.get("participants").forEach (function (entry) {
            //console.log ("entry", entry);
            if (!entry.is_decoy) {
                this.add ([{
                    id: entry.id,
                    displayLabel: entry.name.replace("_", " "),
                    refID: "Search",
                    refSeq: entry.sequence,
                }]);
                if (entry.uniprot){
					this.addSeq (entry.id, "Canonical", entry.uniprot.sequence);
				}
                //~ console.log ("alignColl", this);
            }
        }, this);
    },

    matrixPairings: function (matrix, sequenceObjs, protAlignCollection) {
        var entries = d3.entries(matrix);
        var pairings = [];
		var proteinSeqs = protAlignCollection.pluck("refSeq").map (function(seq) { return {size: seq.length};});
		var totalProteinLength = CLMSUI.modelUtils.totalProteinLength (proteinSeqs);

        for (var n = 0; n < sequenceObjs.length; n++) {
            var max = {key: undefined, seqObj: undefined, bitScore: 50, eScore: 0.00000001};
            var seqObj = sequenceObjs[n];
            entries.forEach (function (entry) {
				var protAlignModel = protAlignCollection ? protAlignCollection.get (entry.key) : undefined;
				var bitScore = entry.value[n];
				var eScore = CLMSUI.modelUtils.alignmentSignificancy (bitScore, totalProteinLength, seqObj.data.length);

                if (eScore < max.eScore) {	// lower eScore is better
                    max.key = entry.key;
                    max.seqObj = seqObj;
					max.bitScore = bitScore;
					max.eScore = eScore;
                }
            });
            if (max.key) {
                pairings.push ({id: max.key, seqObj: max.seqObj});
				console.log ("MAX SCORE", max);
            }
        }
		
        return pairings;
    },
	
	
	alignmentSignificancy: function (bitScore, dbLength, seqLength) {
		var exp = Math.pow (2, -bitScore);
		return dbLength * seqLength * exp;	// escore
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
    },

    // return indices of sequence whose letters match one in the residue set. Index is to the array, not to any external factor
    filterSequenceByResidueSet: function (seq, residueSet, all) {
        var rmap = all ? d3.range (0, seq.length) : [];
		if (!all) {
			for (var m = 0; m < seq.length; m++) {
				if (residueSet.has(seq[m])) {
					rmap.push (m);
				}
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
		var columnTypes = {};
        var dontStoreArray = ["linkID", "LinkID", "Protein 1", "SeqPos 1", "Protein 2", "SeqPos 2", "Protein1", "Protein2", "SeqPos1", "SeqPos2"];
        var dontStoreSet = d3.set (dontStoreArray);
		function getValueN (ref, n, d) {
			return d[ref+" "+n] || d[ref+n];
		}
		
		function parseProteinID (i, d) {
			var p = getValueN ("Protein", i, d);
			var parts = p ? p.split("|") : [];
			var pkey;
			parts.forEach (function (part) {
				pkey = pkey || protMap.get(part);
			});
			return pkey;
		}

		var matchedCrossLinks = [];
        d3.csv.parse (metaDataFileContents, function (d) {
            var linkID = d.linkID || d.LinkID;
            var crossLink = crossLinks.get(linkID);

            // Maybe need to generate key from several columns
            if (!crossLink) {
				var pkey1 = parseProteinID (1, d);
				var pkey2 = parseProteinID (2, d);
                linkID = pkey1+"_"+getValueN("SeqPos", 1, d)+"-"+pkey2+"_"+getValueN("SeqPos", 2, d);
                crossLink = crossLinks.get(linkID);
            }

            if (crossLink) {
				matchedCrossLinks.push (crossLink);
                var keys = d3.keys(d);
				
				if (first) {
					columns = _.difference (keys, dontStoreArray);
					columns.forEach (function (column) { columnTypes[column] = "numeric"; });
                    first = false;
                }
				
                keys.forEach (function (key) {
                    var val = d[key];
                    if (val && !dontStoreSet.has(key)) {
                        if (!isNaN(val)) {
                            val = +val;
                        } else {
							columnTypes[key] = "alpha";	// at least one entry in the column is non-numeric
						}
                        crossLink.setMeta (key, val);
                    }
                });
            }
        });
		
		var matchedCrossLinkCount = matchedCrossLinks.length;
		
		// If any data types have been detected as non-numeric, go through the links and maked sure they're all non-numeric
		// or sorting etc will throw errors
		d3.entries(columnTypes)
			.filter (function (entry) { return entry.value === "alpha"; })
			.forEach (function (entry) {
				matchedCrossLinks.forEach (function (matchedCrossLink) {
					var val = matchedCrossLink.getMeta (entry.key);
					if (val !== undefined) {
						matchedCrossLink.setMeta (entry.key, val.toString());
					}
				})
		    })
		;
		
		var registry = clmsModel.get("crossLinkMetaRegistry") || d3.set();
		columns.forEach (function (column) { registry.add (column); });
		clmsModel.set("crossLinkMetaRegistry", registry);
		
        if (columns) {
            CLMSUI.vent.trigger ("linkMetadataUpdated", {columns: columns, columnTypes: columnTypes, items: crossLinks, matchedItemCount: matchedCrossLinkCount}, {source: "file"});
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
	
	// Column clustering functions
	
	// normalise an array of values
	zscore: function (vals) {
		if (vals.length === 0) { return [undefined]; }
		if (vals.length === 1) { return [0]; }
		//console.log ("vals", vals);
		var avg = d3.mean (vals);
		var sd = d3.deviation (vals);
		return vals.map (function (val) {
			return val !== undefined ? (val - avg) / sd : undefined;
		});
	},
	
	flattenBinaryTree: function (tree, arr) {
		arr = arr || [];
		if (tree.value) {
			arr.push (tree.value);
		} else {
			this.flattenBinaryTree (tree.left, arr);
			this.flattenBinaryTree (tree.right, arr);
		}
		return arr;
	},
	
	// Calculate averages of grouped column values
	averageGroups: function (zscores, colNameGroups, averageFunc) {
		averageFunc = averageFunc || d3.mean;

		var groupIndices = zscores.map (function (zscore) { return zscore.groupIndex; });
		var colRange = _.range(colNameGroups.length);
		var avgColumns = colRange.map(function() { return []; });

		for (var n = 0; n < zscores[0].length; n++) {
			var groups = colRange.map(function() { return []; });

			for (var c = 0; c < zscores.length; c++) {
				if (groupIndices[c] !== undefined) {
					var val = zscores[c][n];
					if (val) {
						groups[groupIndices[c]].push (val);
					}
				}
			}

			var avgs = groups.map (function (group, i) {
				var avg = group.length ? averageFunc(group) : undefined;
				avgColumns[i].push (avg);
			});
		}

		avgColumns.forEach (function (avgColumn, i) {
			avgColumn.colName = "Avg Z ["+colNameGroups[i].join(";")+"]";
		});

		return avgColumns;
	},
	
	// add group indices to columns
	addGroupsToScoreColumns: function (zscores, options) {
		var columnNames = zscores.map (function (zs) { return zs.colName; });
		var columnNameGroups = _.pick (options.groups, columnNames);
		var uniqGroupValues = _.uniq (d3.values (columnNameGroups));
		var groupIndices = {};
		var colNameGroups = [];
		uniqGroupValues.forEach (function (gv, i) {
			groupIndices[gv] = i;
			colNameGroups.push ([]);
		});
		
		zscores.forEach (function (zscore) {
			var colName = zscore.colName;
			var groupName = columnNameGroups [colName];
			var groupIndex = groupIndices[groupName];
			zscore.groupIndex = groupIndex;
			colNameGroups[groupIndex].push (colName);
		});

		return colNameGroups;
	},
	
	// compact 2D arrays so that sub-arrays composed entirely of undefined elements are removed
	compact2DArray: function (arr2D) {
		return arr2D.filter (function (arr) {
			return !_.every (arr, function (val) { return val === undefined; });
		});
	},
	
	metaClustering: function (crossLinks, myOptions) {
		var defaults = {
			distance: "euclidean",
			linkage: "average",
			columns: ["pH4 1", "pH4 2", "pH4 3", "pH 5 1", "pH 5 2", "pH 5 3", "pH 6 1", "pH 6 2", "pH6 3", "pH 7 1", "pH 7 2", "pH 7 3", "pH 8 1", "pH 8 2", "pH 8 3", "pH 9 1", "pH 9 2", "pH 9 3", "pH 10 1", "pH 10 2", "pH10 3"],
			groups: {"pH4 1": undefined},
			accessor: function (crossLinks, dim) {
				return crossLinks.map (function (crossLink) {
					return crossLink[dim] || crossLink.getMeta(dim);
				});
			}
		};
		var options = $.extend ({}, defaults, myOptions);
		
		// calc zscores for each data column
		var zscores = options.columns.map (function (dim) {
			var vals = options.accessor (crossLinks, dim);
			var zscore = CLMSUI.modelUtils.zscore (vals);
			zscore.colName = dim;
			return zscore;
		}, this);
		
		var colNameGroups = CLMSUI.modelUtils.addGroupsToScoreColumns (zscores, options);
		//console.log ("zscores", zscores, colNameGroups);
		
		
		// add crosslink id to a row-based array, need to do this before next step, and then get rid of rows with no defined values
		function reduceLinks (linkArr, crossLinks) {
			linkArr.forEach (function (zslink, i) { zslink.clink = crossLinks[i]; });
			return CLMSUI.modelUtils.compact2DArray (linkArr);
		}
		
		
		// Calculate K-means and dimension tree on non-grouped dimensions
		var zScoresByLink = reduceLinks (d3.transpose (zscores), crossLinks);
		var ungroupedLinkScores = zScoresByLink; // zlinkGroupAvgScoresNormed; // zscoresByLink;
		var kmeans = clusterfck.kmeans (ungroupedLinkScores, undefined, options.distance);
		var zdistances = clusterfck.hcluster (ungroupedLinkScores, options.distance, options.linkage);
		var treeOrder = this.flattenBinaryTree (zdistances.tree);
		//console.log ("zs", zscoresByLink);
		//console.log ("kmeans", kmeans);
		//console.log ("distance", zdistances, treeOrder);
		
		kmeans.forEach (function (cluster, i) {
			cluster.forEach (function (arr) {
				var clink = arr.clink;
				clink.setMeta ("kmcluster", i+1);
			});
		});
		
		treeOrder.forEach (function (value, i) {
			var clink = value.clink;
			clink.setMeta ("treeOrder", i+1);
		});
		
		var zGroupAvgScores = CLMSUI.modelUtils.averageGroups (zscores, colNameGroups);
		var allZScores = zscores.concat (zGroupAvgScores);
		//console.log ("zlinkGroupAvgScores", zGroupAvgScores, zscores);
		
		// transpose to get scores per link not per column
		var allZScoresByLink = reduceLinks (d3.transpose (allZScores), crossLinks);
		//console.log ("concatZScoresByLink", concatZScoresByLink);
		
		var colNames = allZScores.map (function (col) { return col.colName; });
		var groupColumns = zGroupAvgScores.map (function (avgColumn) {
			return {name: avgColumn.colName, index: colNames.indexOf (avgColumn.colName)};
		});
		//console.log ("groupColumns", groupColumns);
		
		
		// Copy group scores to link meta attributes
		CLMSUI.modelUtils.updateMetaDataWithTheseColumns (allZScoresByLink, groupColumns);
		
		// Then tell the world these meta attributes have changed
		var newAndUpdatedColumns = groupColumns
			.map (function (groupCol) { return groupCol.name; })
			.concat (["kmcluster", "treeOrder"])
		;
		
		CLMSUI.vent.trigger ("linkMetadataUpdated", {
			columns: newAndUpdatedColumns, 
			columnTypes: _.object (newAndUpdatedColumns, _.range(newAndUpdatedColumns.length).map(function() { return "numeric"; })), 
			items: crossLinks, 
			matchedItemCount: allZScoresByLink.length
		});	
		
		return {cfk_kmeans: kmeans, cfk_distances: zdistances, zColumnNames: colNames, zscores: allZScoresByLink, groupColumns: groupColumns};
	},
	
	
	updateMetaDataWithTheseColumns: function (linkArr, columnNameIndexPairs) {
		linkArr.forEach (function (zlinkScore) {
			var clink = zlinkScore.clink;
			columnNameIndexPairs.forEach (function (columnNameIndexPair) {
				clink.setMeta (columnNameIndexPair.name, zlinkScore[columnNameIndexPair.index]);
			})
		});
		
	},
	
	normalize2DArrayToColumn: function (orig2DArr, normalColIndex) {
		var arr;
		
		if (normalColIndex >= 0) {
			arr = orig2DArr.map (function (row) { return row.slice(); });
			
			arr.forEach (function (row) {
				var base = row[normalColIndex];
				for (var n = 0; n < row.length; n++) {
					row[n] = base !== undefined && row[n] !== undefined ? row[n] - base : undefined;
				}
			});
		}
		
		return arr || orig2DArr;
	},

	// test to ignore short chains and those that aren't polymer chains (such as water molecules)
    isViableChain: function (chainProxy) {
		//console.log ("cp", chainProxy.entity, chainProxy.entity.type);
		// should be chainProxy.entity.isPolymer() but some hand-built ngl models muff these settings up
        return chainProxy.residueCount > 10 && (!chainProxy.entity || (!chainProxy.entity.isWater() && !chainProxy.entity.isMacrolide()));
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
                        crossLinks: [],
                        fromProtein: fromProtein,
                        toProtein: toProtein,
                        label: fromProtein.name.replace("_", " ") + " - " + toProtein.name.replace("_", " ")
                    };
                }
                obj[key].crossLinks.push (crossLink);
            }
        });
        return obj;
    },

    // features should be pre-filtered to an individual protein and to an individual type
    mergeContiguousFeatures: function (features) {
        features.sort (function (f1, f2) {
            return +f1.begin - +f2.begin;
        });
        var mergedRanges = [], furthestEnd, mergeBegin;
        features.forEach (function (f) {
            var b = +f.begin;
            var e = +f.end;
			
			if (furthestEnd === undefined) {	// first feature, initialise mergeBegin and furthestEnd
				mergeBegin = b;
				furthestEnd = e;
			} else {							// otherwise look for overlap with previous
				if (b > furthestEnd + 1) {	// if a gap between beginning of this range and the maximum end value found so far
					mergedRanges.push ({begin: mergeBegin, end: furthestEnd});  // then add the now finished old merged range
					mergeBegin = b; // and then set the beginning of a new merged range
				}
				furthestEnd = Math.max (furthestEnd, e);
			}
        });
        if (furthestEnd) {
            mergedRanges.push ({begin: mergeBegin, end: furthestEnd});  // add hanging range
        }

        var merged = mergedRanges.length < features.length ?    // if merged ranges less than original feature count
            mergedRanges.map (function (coords) { // make new features based on the new merged ranges
                return $.extend ({}, features[0], coords); // features[0] is used to get other fields
            })
            : features  // otherwise just use originals
        ;
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

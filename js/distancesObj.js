var CLMSUI = CLMSUI || {};

CLMSUI.DistancesObj = function (matrices, chainMap, pdbBaseSeqID) {
    this.matrices = matrices;
    this.chainMap = chainMap;
    this.pdbBaseSeqID = pdbBaseSeqID;
};

CLMSUI.DistancesObj.prototype = {
    
    constructor: CLMSUI.DistancesObj,
    
    getShortestLinks: function (links, angstromAccuracy) {
        angstromAccuracy = angstromAccuracy || 1;
        
        links.forEach (function (link) {
            link.distance = this.getXLinkDistanceFromChainCoords (
                this.matrices, link.residueA.resindex, link.residueB.resindex, link.residueA.chainIndex, link.residueB.chainIndex
            );
        }, this);
        
        var nestedLinks = d3.nest()
            .key (function(d) { return d.origId; })
            .sortValues (function (a, b) {
                var d = a.distance - b.distance;
                // if link distances are v. similar try and pick ones from the same chain(s) (the lowest numbered one)
                if (Math.abs(d) < angstromAccuracy) {
                    var mitotalDiff = (a.residueA.modelIndex + a.residueB.modelIndex) - (b.residueA.modelIndex + b.residueB.modelIndex);
                    if (mitotalDiff) {
                        d = mitotalDiff;
                    } else {
                        var citotalDiff = (a.residueA.chainIndex + a.residueB.chainIndex) - (b.residueA.chainIndex + b.residueB.chainIndex);
                        if (citotalDiff) { 
                            d = citotalDiff; 
                        } else {
                            var minDiff = Math.min (a.residueA.chainIndex, a.residueB.chainIndex) - Math.min (b.residueA.chainIndex, b.residueB.chainIndex);
                            if (minDiff) {
                                d = minDiff;
                            }
                        }
                    }
                }
                return (d < 0 ? -1 : (d > 0 ? 1 : 0));
            })
            .entries (links)
        ;
        
        var shortestLinks = nestedLinks.map (function (group) {
            return group.values[0];
        });
        
        CLMSUI.utils.xilog ("nestedLinks", links, nestedLinks, shortestLinks);
        
        return shortestLinks;
    },
    
    
    getXLinkDistance: function (xlink, alignCollBB, options) {
        options = options || {};
        var average = options.average || false;
        var returnChainInfo = options.returnChainInfo || false;
        var chainInfo = returnChainInfo ? {from: [], to: [], fromRes: [], toRes: []} : null;
        var chainMap = this.chainMap;
        var matrices = this.matrices;
        var pid1 = options.realFromPid || xlink.fromProtein.id; // use pids if passed in by options as first choice
        var pid2 = options.realToPid || xlink.toProtein.id; // (intended as replacements for decoy protein ids)
        var chains1 = chainMap[pid1];
        var chains2 = chainMap[pid2];
        var minDist;
        var totalDist = 0;
        var distCount = 0;

        // only calc distance if resIndex1 and resIndex2 return non-negative values
        // might miss a few distances where the alignments could be matched quite closely i.e. for link A->C residue C could be matched to D here ABCD srch -> AB-D pdb
        // but this way dodges a lot of zero length distances when alignments have big gaps in them i.e. ABCDEFGHIJKLMNOP srch -> A------------P pdb
        // what positions would E and J be, what is the length between E and J?
        if (chains1 && chains2) {
            for (var n = 0; n < chains1.length; n++) {
                var chainIndex1 = chains1[n].index;
                var chainName1 = chains1[n].name;
                var alignId1 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chainName1, chainIndex1);
                var resIndex1 = alignCollBB.getAlignedIndex (xlink.fromResidue, pid1, false, alignId1, true) - 1;   // -1 for ZERO-INDEXED
                
                if (resIndex1 >= 0) {
                    for (var m = 0; m < chains2.length; m++) {
                        var chainIndex2 = chains2[m].index;
                        var chainName2 = chains2[m].name;
                        var alignId2 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chainName2, chainIndex2);
                        var resIndex2 = alignCollBB.getAlignedIndex (xlink.toResidue, pid2, false, alignId2, true) - 1; // -1 for ZERO-INDEXED
                        // align from 3d to search index. resindex is 0-indexed so -1 before querying
                        //CLMSUI.utils.xilog ("alignid", alignId1, alignId2, pid1, pid2);
                        
                        if (resIndex2 >= 0 && CLMSUI.modelUtils.not3DHomomultimeric (xlink, chainIndex1, chainIndex2)) {
                            var dist = this.getXLinkDistanceFromChainCoords (matrices, resIndex1, resIndex2, chainIndex1, chainIndex2);
                            if (dist !== undefined) {
                                if (average) {
                                    totalDist += dist;
                                    distCount++;
                                    if (returnChainInfo) {
                                        chainInfo.from.push (chainName1);
                                        chainInfo.to.push (chainName2);
                                        chainInfo.fromRes.push (resIndex1);
                                        chainInfo.toRes.push (resIndex2);
                                    }
                                } else if (dist < minDist || minDist === undefined) {
                                    minDist = dist;
                                    if (returnChainInfo) {
                                        chainInfo.from = chainName1;
                                        chainInfo.to = chainName2;
                                        chainInfo.fromRes = resIndex1;
                                        chainInfo.toRes = resIndex2;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // allocate distance variable to average or smallest distance depending on 'average' flag
        var distance = average ? (distCount ? totalDist / distCount : undefined) : minDist;
        // if chaininfo asked for then return an object else just return the distance
        return returnChainInfo ? {distance: distance, chainInfo: chainInfo} : distance;
    },
    
    // resIndex1 and 2 are 0-based
    getXLinkDistanceFromChainCoords: function (matrices, resIndex1, resIndex2, chainIndex1, chainIndex2) {
        var dist;
        var distanceMatrix = matrices[chainIndex1+"-"+chainIndex2].distanceMatrix;
        var minIndex = resIndex1;   // < resIndex2 ? resIndex1 : resIndex2;
        //CLMSUI.utils.xilog ("matrix", matrix, chainIndex1+"-"+chainIndex2, resIndex1, resIndex2);
        if (distanceMatrix[minIndex] && distanceMatrix[minIndex][resIndex2]) {
            var maxIndex = resIndex2;   // < resIndex1 ? resIndex1 : resIndex2;
            dist = distanceMatrix[minIndex][maxIndex];
        } else {
			var sm = CLMSUI.compositeModelInst.get("stageModel");
            dist = sm ? sm.getSingleDistanceBetween2Residues (resIndex1, resIndex2, chainIndex1, chainIndex2) : 0;
        }
        //CLMSUI.utils.xilog ("dist", dist);
        return dist;
    },
	
	
    
    // options - withinProtein:true for no cross-protein sample links
    getSampleDistances: function (sampleLinkQuantity, crosslinkerSpecificityList, options) {
        options = options || {};
        var specificitySearchTotal = d3.sum (crosslinkerSpecificityList, function (rdata) { return rdata.searches.size; });
        CLMSUI.utils.xilog ("------ RANDOM DISTRIBUTION CALCS ------", crosslinkerSpecificityList);
        CLMSUI.utils.xilog (crosslinkerSpecificityList, "STOTS", specificitySearchTotal, this, this.matrices);
        var sampleLinksPerSearch = Math.ceil (sampleLinkQuantity / specificitySearchTotal);
        
        var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
        var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
        
        var distanceableSequences = this.calcDistanceableSequenceData();
        var distanceableSequencesByProtein = d3.map (d3.nest().key(function(d) { return d.protID; }).entries(distanceableSequences), function (d) { return d.key; });
        CLMSUI.utils.xilog ("dsp", distanceableSequencesByProtein);
        
        var alignedTerminalIndices = this.calcAlignedTerminalIndices (distanceableSequencesByProtein, clmsModel, alignCollBB);
        CLMSUI.utils.xilog ("ati", alignedTerminalIndices);
        
        
        var sampleDists = [];	// store for sample distances
        // For each crosslinker...
        crosslinkerSpecificityList.forEach (function (crosslinkerSpecificity) {

            var rmap = this.calcFilteredSequenceResidues (crosslinkerSpecificity, distanceableSequences, alignedTerminalIndices);
                    
            // Now loop through the searches that use this crosslinker...
            crosslinkerSpecificity.searches.forEach (function (searchID) {
                var search = clmsModel.get("searches").get(searchID);
                var protIDs = search.participantIDSet;
                
                // Filter residue lists down to those that were in this search's proteins
                var srmap = rmap.map (function (dirMap) { 
                    return (clmsModel.get("searches").size > 1) ? dirMap.filter (function(res) { return protIDs.has (res.protID); }) : dirMap; 
                });

                // If crosslinker is homobifunctional then copy a second residue list same as the first
                if (!crosslinkerSpecificity.heterobi) {
                    srmap[1] = srmap[0];
                }
                CLMSUI.utils.xilog ("rr", searchID, srmap);

                // Now pick lots of pairings from the remaining residues, one for each end of the crosslinker, so one from each residue list
				var searchMeta = {heterobi: crosslinkerSpecificity.heterobi, perSearch: sampleLinksPerSearch};
                if (options.withinProtein) {   // if intra links only allowed
                	this.generateSampleIntraOnlyDistancesBySearch (srmap, sampleDists, searchMeta, options.withinChain || false);	// set true for chain-specific self restriction
                } else {    // inter and intra links allowed (simpler)
                    this.generateSampleDistancesBySearch (srmap[0], srmap[1], sampleDists, sampleLinksPerSearch);
                }
            }, this);
        }, this);
        
        CLMSUI.utils.xilog ("RANDOM", sampleDists, "avg:", d3.sum(sampleDists) / (sampleDists.length || 1));
        CLMSUI.utils.xilog ("------ RANDOM DISTRIBUTION END ------");
        return sampleDists;
    },
	
	// Collect together sequence data that is available to do sample 3d distances on, by mapping
    // the 3d sequences to the search sequences, and taking those sub-portions of the search sequence
	calcDistanceableSequenceData: function () {
        var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
        
        var seqs = d3.entries(this.chainMap).map (function (chainEntry) {
            var protID = chainEntry.key;
            return chainEntry.value.map (function (chain) {
                var alignID = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chain.name, chain.index);
                var range = alignCollBB.getSearchRangeIndexOfMatches (protID, alignID);
				$.extend (range, {chainIndex: chain.index, protID: protID, alignID: alignID});
                return range;
            }, this);
        }, this);
        seqs = d3.merge (seqs); // collapse nested arrays
        CLMSUI.utils.xilog ("seqs", seqs);
		
		return seqs;
	},
	
	// n-terms and c-terms occur at start/end of proteins not peptides (as proteins are digested/split after cross-linking). dur.
    // Add protein terminals if within pdb chain ranges to alignedTerminalIndices array
	calcAlignedTerminalIndices: function (seqsByProt, clmsModel, alignCollBB) {
        var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
        seqsByProt.entries().forEach (function (protEntry) {
            var protKey = protEntry.key;
            var participant = clmsModel.get("participants").get(protKey);
            var seqValues = protEntry.value.values;
            var termTypes = ["ntermList", "ctermList"];

            [1, participant.size + 1].forEach (function (searchIndex, i) {
                var alignedTerminalIndex = alignedTerminalIndices[termTypes[i]];
                var alignedPos = undefined;
                seqValues.forEach (function (seqValue) {
                    if (searchIndex >= seqValue.first && searchIndex <= seqValue.last) {
                        alignedPos = {
                            searchIndex: searchIndex,
                            resIndex: alignCollBB.getAlignedIndex (searchIndex, protKey, false, seqValue.alignID, false),
                            chainIndex: seqValue.chainIndex,
                            protID: seqValue.protID,
                            resType: termTypes[i],
                        };
                    }    
                });
                if (alignedPos) {
                    alignedTerminalIndex.push (alignedPos);
                }
            });
        });
		
		return alignedTerminalIndices;
	},
	
	
	// Make one or two lists of residues from distanceableSequences that could map to each end of a crosslinker.
    // If the crosslinker is not heterobifunctional we only do one as it'll be the same at both ends.
	calcFilteredSequenceResidues: function (crosslinkerSpecificity, distanceableSequences, alignedTerminalIndices) {
		var linkableResidues = crosslinkerSpecificity.linkables;
        var rmap = [[],[]];
		var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
		
		for (var n = 0; n < linkableResidues.length; n++) { // might be >1 set, some linkers bind differently at each end (heterobifunctional)
			var all = linkableResidues[n].has ("*") || linkableResidues[n].has ("X") || linkableResidues[n].size === 0;
			distanceableSequences.forEach (function (distSeq) {
				CLMSUI.utils.xilog ("distSeq", distSeq);
				var protID = distSeq.protID;
				var alignID = distSeq.alignID;
				var filteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (distSeq.subSeq, linkableResidues[n], all);
				for (var m = 0; m < filteredSubSeqIndices.length; m++) {
					var searchIndex = distSeq.first + filteredSubSeqIndices[m];
					// assign if residue position has definite hit between search and pdb sequence, but not if it's a gap (even a single-letter gap).
					// That's the same criteria we apply to saying a crosslink occurs in a pdb in the first place
					// Justification: mapping hits between aaaa----------aaa and bbb-------bbb will map to nearest residue and give lots of zero
					// length distances when both cross-link residues are '-'
					var resIndex = alignCollBB.getAlignedIndex (searchIndex, protID, false, alignID, true);	// will be 1-indexed
					if (resIndex >= 0) {
						var datum = {
							searchIndex: searchIndex, 
							chainIndex: distSeq.chainIndex,
							protID: protID,
							resIndex: resIndex,
						};
						rmap[n].push (datum);
					}
				}
			}, this);
			if (linkableResidues[n].has("CTERM")) {
				rmap[n].push.apply (rmap[n], alignedTerminalIndices.ctermList);
			}
			if (linkableResidues[n].has("NTERM")) {
				rmap[n].push.apply (rmap[n], alignedTerminalIndices.ntermList);
			}
		}	
		
		CLMSUI.utils.xilog ("rmap", rmap, linkableResidues);
		return rmap;
	},
	
	// sameChainOnly == true for sample distances internal to same chains only, == false for sample distances internal to same protein (could be multiple chains)
	generateSampleIntraOnlyDistancesBySearch: function (srmap, randDists, metaData, sameChainOnly) {
		 // Convenience: Divide into list per protein for selecting intra-protein samples only
		var srmapPerProtChain = [{},{}];
		var protChainSet = d3.set();
		srmap.forEach (function (dirMap, i) {
			var perProtChainMap = srmapPerProtChain[i];

			dirMap.forEach (function (res) {
				var protID = res.protID;
				var chainID = res.chainIndex;
				var protChainID = sameChainOnly ? protID+"|"+chainID : protID;
				var perProtChainList = perProtChainMap[protChainID];
				if (!perProtChainList) {
					perProtChainMap[protChainID] = [res];
					protChainSet.add (protChainID);
				} else {
					perProtChainList.push (res);
				}
			});
			//console.log ("dirMap", dirMap, perProtMap, d3.nest().key(function(d) { return d.protID; }).entries(dirMap));
		});
		if (!metaData.heterobi) {
			srmapPerProtChain[1] = srmapPerProtChain[0];
		}
		CLMSUI.utils.xilog ("intra spp", srmapPerProtChain);
		
		// Assign randoms to inter-protein links based on number of possible pairings
		// e.g. if proteinA-A is 100->100 residues and proteinB-B is 20->20 residues
		// then the possible pairings are 10,000 (100x100) and 400 (20x20) and the randoms are allocated in that proportion
		var proportions = d3.entries(srmapPerProtChain[0]).map (function (entry) {
			var key = entry.key;
			var quant1 = entry.value.length;
			var opp = srmapPerProtChain[1][key];
			return {protChainID: entry.key, possiblePairings: opp ? quant1 * opp.length: 0};
		});
		var total = d3.sum (proportions, function (d) { return d.possiblePairings; });
		var propMap = d3.map (proportions, function(d) { return d.protChainID; })
		
		//var samplesPerProtein = metaData.perSearch / protSet.size();
		protChainSet.values().forEach (function (protChainID) {
			var samplesPerProtein = metaData.perSearch / total * propMap.get(protChainID).possiblePairings;
			this.generateSampleDistancesBySearch (srmapPerProtChain[0][protChainID], srmapPerProtChain[1][protChainID], randDists, Math.floor(samplesPerProtein));
		}, this);
		
		//console.log ("ppp", srmapPerProtChain, proportions, total, propMap);
	},
	
	generateSampleDistancesBySearch: function (rowMap, columnMap, randDists, count) {
		var rowCount = rowMap.length;
		var columnCount = columnMap.length;
		var possibleLinks = rowCount * columnCount;
		if (possibleLinks && count) {  // can't do this if no actual residues pairings left, or no sample links requested (count == 0)
			var hop = Math.max (1, possibleLinks / count);
			var maxRuns = Math.min (possibleLinks, count);
			CLMSUI.utils.xilog ("hop", hop, "possible link count", possibleLinks, maxRuns);
			
    		var residuesPerSide = Math.max (1, Math.round (Math.sqrt (count)));
    		var residueRowIndices = d3.range(0, Math.min (rowCount, residuesPerSide)).map (function (r) { return Math.floor (rowCount / residuesPerSide * r); });
			var residueColumnIndices = d3.range(0, Math.min (columnCount, residuesPerSide)).map (function (c) { return Math.floor (columnCount / residuesPerSide * c); });
			
			//console.log ("rro", residueRowIndices, residueColumnIndices, count)
			
			var self = this;
			residueRowIndices.forEach (function (rri) {
				var res1 = rowMap[rri];
				residueColumnIndices.forEach (function (rci) {
					var res2 = columnMap[rci];
					var dist = self.getXLinkDistanceFromChainCoords (self.matrices, res1.resIndex - 1, res2.resIndex - 1, res1.chainIndex, res2.chainIndex);
					if (!isNaN(dist) && dist > 0) {
						randDists.push (dist);
					}
				})
			})
		}
	}
};
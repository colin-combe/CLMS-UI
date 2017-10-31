var CLMSUI = CLMSUI || {};

CLMSUI.DistancesObj = function (matrices, chainMap, pdbBaseSeqID) {
    this.matrices = matrices;
    this.chainMap = chainMap;
    this.pdbBaseSeqID = pdbBaseSeqID;
};

CLMSUI.DistancesObj.prototype = {
    
    constructor: CLMSUI.DistancesObj,
    
    getShortestLinks: function (links) {
        links.forEach (function (link) {
            link.distance = this.getXLinkDistanceFromChainCoords (this.matrices, link.residueA.chainIndex, link.residueB.chainIndex, link.residueA.resindex, link.residueB.resindex);
        }, this);
        
        var nestedLinks = d3.nest()
            .key (function(d) { return d.origId; })
            .sortValues (function (a, b) {
                var d = a.distance - b.distance;
                // if link distances are v. similar try and pick ones from the same chain(s) (the lowest numbered one)
                if (Math.abs(d) < 0.01) {
                    d = (a.residueA.chainIndex + a.residueB.chainIndex) - (b.residueA.chainIndex + b.residueB.chainIndex);
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
        var chainInfo = returnChainInfo ? {from: [], to: []} : null;
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
                var resIndex1 = alignCollBB.getAlignedIndex (xlink.fromResidue, pid1, false, alignId1, true) - 1; 
                
                if (resIndex1 >= 0) {
                    for (var m = 0; m < chains2.length; m++) {
                        var chainIndex2 = chains2[m].index;
                        var chainName2 = chains2[m].name;
                        var alignId2 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chainName2, chainIndex2);
                        var resIndex2 = alignCollBB.getAlignedIndex (xlink.toResidue, pid2, false, alignId2, true) - 1; 
                        // align from 3d to search index. resindex is 0-indexed so -1 before querying
                        //CLMSUI.utils.xilog ("alignid", alignId1, alignId2, pid1, pid2);
                        
                        if (resIndex2 >= 0 && CLMSUI.modelUtils.not3DHomomultimeric (xlink, chainIndex1, chainIndex2)) {
                            var dist = this.getXLinkDistanceFromChainCoords (matrices, chainIndex1, chainIndex2, resIndex1, resIndex2);
                            if (dist !== undefined) {
                                if (average) {
                                    totalDist += dist;
                                    distCount++;
                                    if (returnChainInfo) {
                                        chainInfo.from.push (chainName1);
                                        chainInfo.to.push (chainName2);
                                    }
                                } else if (dist < minDist || minDist === undefined) {
                                    minDist = dist;
                                    if (returnChainInfo) {
                                        chainInfo.from = chainName1;
                                        chainInfo.to = chainName2;
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
    getXLinkDistanceFromChainCoords: function (matrices, chainIndex1, chainIndex2, resIndex1, resIndex2) {
        var dist;
        var distanceMatrix = matrices[chainIndex1+"-"+chainIndex2].distanceMatrix;
        var minIndex = resIndex1;   // < resIndex2 ? resIndex1 : resIndex2;
        //CLMSUI.utils.xilog ("matrix", matrix, chainIndex1+"-"+chainIndex2, resIndex1, resIndex2);
        if (distanceMatrix[minIndex] && distanceMatrix[minIndex][resIndex2]) {
            var maxIndex = resIndex2;   // < resIndex1 ? resIndex1 : resIndex2;
            dist = distanceMatrix[minIndex][maxIndex];
        } else {
            dist = CLMSUI.modelUtils.get3DDistance (CLMSUI.compositeModelInst, resIndex1, resIndex2, chainIndex1, chainIndex2);
        }
        //CLMSUI.utils.xilog ("dist", dist);
        return dist;
    },
    
    // options - intraOnly:true for no cross-protein random links
    getRandomDistances: function (size, residueSets, options) {
        options = options || {};
        residueSets = residueSets || {name: "all", searches: new Set(), linkables: new Set()};
        var stots = d3.sum (residueSets, function (rdata) { return rdata.searches.size; });
        CLMSUI.utils.xilog ("------ RANDOM DISTRIBUTION CALCS ------");
        CLMSUI.utils.xilog (residueSets, "STOTS", stots, this, this.matrices);
        var perSearch = Math.ceil (size / stots);
        
        // Collect together sequence data that is available to do random 3d distances on, by mapping
        // the 3d sequences to the search sequences, and taking those sub-portions of the search sequence
        var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
        var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
        var peptideTerminalPositions = clmsModel.get("terminiPositions") || d3.map();
        
        var seqs = d3.entries(this.chainMap).map (function (chainEntry) {
            var protID = chainEntry.key;
            return chainEntry.value.map (function (chain) {
                var alignID = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chain.name, chain.index);
                var range = alignCollBB.getSearchRangeIndexOfMatches (protID, alignID);
                range.chainIndex = chain.index;
                range.protID = protID;
                range.alignID = alignID;
                return range;
            }, this);
        }, this);
        seqs = d3.merge(seqs); // collapse nested arrays
        CLMSUI.utils.xilog ("seqs", seqs);
        
        var seqsByProt = d3.map (d3.nest().key(function(d) { return d.protID; }).entries(seqs), function (d) { return d.key; });
        CLMSUI.utils.xilog ("spp", seqsByProt, peptideTerminalPositions);
        /*
        var alignedTerminalIndices = {ntermList: [], ctermList: []};
        peptideTerminalPositions.entries().forEach (function (protEntry) {
            var protValue = protEntry.value;
            var protKey = protEntry.key;
            var seqValues = (seqsByProt.get(protKey) || {values: []}).values;
            CLMSUI.utils.xilog ("sv", seqValues);
            ["ctermList", "ntermList"].forEach (function (termType) {
                var alignedTerminalIndex = alignedTerminalIndices[termType];
                protValue[termType].forEach (function (searchIndex) {
                    var alignedPos = undefined;
                    seqValues.forEach (function (seqValue) {
                        if (searchIndex >= seqValue.first && searchIndex <= seqValue.last) {
                            alignedPos = {
                                searchIndex: searchIndex,
                                resIndex: alignCollBB.getAlignedIndex (searchIndex, protKey, false, seqValue.alignID, false),
                                chainIndex: seqValue.chainIndex,
                                protID: seqValue.protID,
                                resType: termType,
                            };
                        }    
                    });
                    if (alignedPos) {
                        alignedTerminalIndex.push (alignedPos);
                    }
                });
            }); 
        }, this);
        */
        
         
        // n-terms and c-terms occur at start/end of proteins not peptides (as proteins are digested/split after cross-linking). dur.
        // add protein terminals if within pdb chain ranges to alignedTerminalIndices array
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
        
        CLMSUI.utils.xilog ("ptp", peptideTerminalPositions, alignedTerminalIndices);
        
        
        var randDists = [];
        // For each crosslinker...
        residueSets.forEach (function (rdata) {
            // Make one or two lists of residues that could map to each end of the crosslinker.
            // If the crosslinker is not heterobifunctional we only do one as it'll be the same at both ends.
            var linkableResidues = rdata.linkables;
            var rmap = [[],[]];
            for (var n = 0; n < linkableResidues.length; n++) { // might be >1 set, some linkers bind differently at each end (heterobifunctional)
                var all = linkableResidues[n].has ("*") || linkableResidues[n].has ("X") || linkableResidues[n].size === 0;
                seqs.forEach (function (seq) {
                    CLMSUI.utils.xilog ("seq", seq);
                    var protID = seq.protID;
                    var filteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (seq.subSeq, linkableResidues[n], all);
                    for (var m = 0; m < filteredSubSeqIndices.length; m++) {
                        var searchIndex = seq.first + filteredSubSeqIndices[m];
                        // assign if residue position has definite hit between search and pdb sequence, but not if it's a gap (even a single-letter gap).
                        // That's the same criteria we apply to saying a crosslink occurs in a pdb in the first place
                        // Justification: mapping hits between aaaa----------aaa and bbb-------bbb will map to nearest residue and give lots of zero
                        // length distances when the residue is a '-'
                        var resIndex = alignCollBB.getAlignedIndex (searchIndex, protID, false, seq.alignID, true);
                        if (resIndex >= 0) {
                            var datum = {
                                searchIndex: searchIndex, 
                                chainIndex: seq.chainIndex,
                                protID: protID,
                                resIndex: resIndex,
                            };
                            rmap[n].push (datum);
                        }
                        /* 
                        else {
                            console.log ("< 0", resIndex, searchIndex, seq.protID, seq.alignID);
                        }
                        */
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
                    
            // Now loop through the searches that use this crosslinker...
            rdata.searches.forEach (function (searchID) {
                var search = clmsModel.get("searches").get(searchID);
                var protIDs = search.participantIDSet;
                
                // Filter residue lists down to those that were in this search's proteins
                var srmap = rmap.map (function (dirMap) { 
                    return (clmsModel.get("searches").size > 1) ? dirMap.filter (function(res) { return protIDs.has (res.protID); }) : dirMap; 
                });

                // If crosslinker is homobifunctional then copy a second residue list same as the first
                if (!rdata.heterobi) {
                    srmap[1] = srmap[0];
                }
                CLMSUI.utils.xilog ("rr", searchID, srmap);

                
                // Now pick lots of pairings from the remaining residues, one for each end of the crosslinker,
                // so one from each residue list
                if (options.intraOnly) {   // if intra links only allowed
                    // Convenience: Divide into list per protein for selecting intra-protein randoms only
                    var srmapPerProt = [{},{}];
                    srmap.forEach (function (dirMap, i) {
                        var perProtMap = srmapPerProt[i];
                        
                        dirMap.forEach (function (res) {
                            var protID = res.protID;
                            var perProtList = perProtMap[protID];
                            if (!perProtList) {
                                perProtMap[protID] = [res];
                            } else {
                                perProtList.push (res);
                            }
                        });
                        //console.log ("dirMap", dirMap, perProtMap, d3.nest().key(function(d) { return d.protID; }).entries(dirMap));
                    });
                    if (!rdata.heterobi) {
                        srmapPerProt[1] = srmapPerProt[0];
                    }
                    CLMSUI.utils.xilog ("intra", searchID, srmapPerProt);
                    
                    // make a list of counts of possible intra-protein residue links
                    var total = 0;
                    var counts = d3.entries(srmapPerProt[0])
                        // Filter out proteins with no suitable residues at the other end
                        .filter (function (protEntry) {
                            return srmapPerProt[1][protEntry.key];
                        })
                        // make the counts of lower and upper bounds
                        .map (function (protEntry) {
                            var key = protEntry.key;
                            var resCount1 = protEntry.value.length;
                            var resCount2 = srmapPerProt[1][key].length;
                            var combos = resCount1 * resCount2;
                            var val = {protID: key, lowerBound: total};
                            total += combos;
                            val.upperBound = total - 1;
                            return val;
                        })
                    ;
                    
                    var possibleLinks = total;
                    CLMSUI.utils.xilog ("counts", counts, total);
                    
                    if (possibleLinks) {  // can't do this if no actual residues pairings left
                        var hop = Math.max (1, possibleLinks / perSearch);
                        var maxRuns = Math.min (possibleLinks, perSearch);
                        var bisectCount = d3.bisector(function(d) { return d.upperBound; }).left;
                        CLMSUI.utils.xilog ("hop", hop, "possible link count", possibleLinks, maxRuns);
                        
                        for (var n = 0; n < maxRuns; n++) {
                            // This is Uniform
                            var ni = Math.floor (n * hop);
                            
                            // Find the protein that corresponds to this index 'ni'
                            var proteinIndex = bisectCount (counts, ni);
                            // Then turn it into a residue pairing internal to that protein
                            var count = counts[proteinIndex];
                            var withinIndex = ni - count.lowerBound;
                            var resList1 = srmapPerProt[0][count.protID];
                            var resList2 = srmapPerProt[1][count.protID];
                            var resIndex1 = Math.floor (withinIndex / resList2.length);
                            var resIndex2 = withinIndex % resList2.length;
                            var res1 = resList1[resIndex1];
                            var res2 = resList2[resIndex2];
                            if (!res1 || !res2) {
                                CLMSUI.utils.xilog ("intra", ni, proteinIndex, withinIndex, resIndex1, resIndex2);
                            }
   
                            //CLMSUI.utils.xilog ("rr", n, ni, resFlatIndex1, resFlatIndex2, res1, res2);
                            // -1's 'cos these indexes are 1-based and the get3DDistance expects 0-indexed residues
                            var dist = this.getXLinkDistanceFromChainCoords (this.matrices, res1.chainIndex, res2.chainIndex, res1.resIndex - 1, res2.resIndex - 1);
                            // dist is zero if same residues getting linked, which isn't really a plausible scenario, or is it?
                            if (!isNaN(dist) && dist > 0) {
                                randDists.push (dist);
                            }
                        }
                    }

                } else {    // inter and intra links allowed (simpler)
                    var possibleLinks = srmap[0].length * srmap[1].length;
                    if (possibleLinks) {  // can't do this if no actual residues pairings left
                        var hop = Math.max (1, possibleLinks / perSearch);
                        var maxRuns = Math.min (possibleLinks, perSearch);
                        CLMSUI.utils.xilog ("hop", hop, "possible link count", possibleLinks, maxRuns);

                        for (var n = 0; n < maxRuns; n++) {
                            // This is Uniform
                            var ni = Math.floor (n * hop);
                            var resFlatIndex1 = Math.floor (ni / srmap[1].length);
                            var resFlatIndex2 = ni % srmap[1].length;
                            /*
                            // This is Random
                            var resFlatIndex1 = Math.floor (Math.random() * srmap[0].length);
                            var resFlatIndex2 = Math.floor (Math.random() * srmap[1].length);
                            */
                            var res1 = srmap[0][resFlatIndex1];
                            var res2 = srmap[1][resFlatIndex2];

                            /*
                            if (res1.resIndex === res2.resIndex && res1.chainIndex === res2.chainIndex) {
                                console.log ("same res", res1, res2, resFlatIndex1, resFlatIndex2, srmap[0], srmap[1]);
                            }
                            */
                            //CLMSUI.utils.xilog ("inter", n, ni, resFlatIndex1, resFlatIndex2, res1, res2);
                            // -1's 'cos these indexes are 1-based and the get3DDistance expects 0-indexed residues
                            var dist = this.getXLinkDistanceFromChainCoords (this.matrices, res1.chainIndex, res2.chainIndex, res1.resIndex - 1, res2.resIndex - 1);
                            if (!isNaN(dist) && dist > 0) {
                                randDists.push (dist);
                            }
                        }
                    }
                }
            }, this);
        }, this);
        
        CLMSUI.utils.xilog ("RANDOM", randDists, "avg:", d3.sum(randDists) / (randDists.length || 1));
        CLMSUI.utils.xilog ("------ RANDOM DISTRIBUTION END ------");
        return randDists;
    },
};
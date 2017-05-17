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
        
        //console.log ("nestedLinks", links, nestedLinks, shortestLinks);
        
        return shortestLinks;
    },
    
    
    getXLinkDistance: function (xlink, alignCollBB, options) {
        options = options || {};
        var average = options.average || false;
        var chainMap = this.chainMap;
        var matrices = this.matrices;
        var pid1 = options.realFromPid || xlink.fromProtein.id; // use pids if passed in by options as first choice
        var pid2 = options.realToPid || xlink.toProtein.id; // (intended as replacements for decoy protein ids)
        var chains1 = chainMap[pid1];
        var chains2 = chainMap[pid2];
        var minDist;
        var totalDist = 0;
        var distCount = 0;

        if (chains1 && chains2) {
            for (var n = 0; n < chains1.length; n++) {
                var ind1 = chains1[n].index;
                var alignId1 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chains1[n].name, ind1);
                var resIndex1 = alignCollBB.getAlignedIndex (xlink.fromResidue, pid1, false, alignId1) - 1; 
                if (resIndex1 >= 0) {
                    for (var m = 0; m < chains2.length; m++) {
                        var ind2 = chains2[m].index;
                        var alignId2 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqID, chains2[m].name, ind2);
                        var resIndex2 = alignCollBB.getAlignedIndex (xlink.toResidue, pid2, false, alignId2) - 1; 
                        // align from 3d to search index. resindex is 0-indexed so +1 before querying
                        //console.log ("alignid", alignId1, alignId2, pid1, pid2);
                        if (resIndex1 >= 0 && resIndex2 >= 0 && CLMSUI.modelUtils.not3DHomomultimeric (xlink, ind1, ind2)) {
                            var dist = this.getXLinkDistanceFromChainCoords (matrices, ind1, ind2, resIndex1, resIndex2);
                            if (dist !== undefined) {
                                if (average) {
                                    totalDist += dist;
                                    distCount++;
                                } else if (dist < minDist || minDist === undefined) {
                                    minDist = dist;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return average ? (distCount ? totalDist / distCount : undefined) : minDist;
    },
    
    // resIndex1 and 2 are 0-based
    getXLinkDistanceFromChainCoords: function (matrices, chainIndex1, chainIndex2, resIndex1, resIndex2) {
        var dist;
        var distanceMatrix = matrices[chainIndex1+"-"+chainIndex2].distanceMatrix;
        var minIndex = resIndex1;   // < resIndex2 ? resIndex1 : resIndex2;
        //console.log ("matrix", matrix, chainIndex1+"-"+chainIndex2, resIndex1, resIndex2);
        if (distanceMatrix[minIndex]) {
            var maxIndex = resIndex2;   // < resIndex1 ? resIndex1 : resIndex2;
            dist = distanceMatrix[minIndex][maxIndex];
            if (dist === undefined) {
                dist = CLMSUI.modelUtils.get3DDistance (CLMSUI.compositeModelInst, resIndex1, resIndex2, chainIndex1, chainIndex2);
            }
        } else {
            dist = CLMSUI.modelUtils.get3DDistance (CLMSUI.compositeModelInst, resIndex1, resIndex2, chainIndex1, chainIndex2);
        }
        //console.log ("dist", dist);
        return dist;
    },
    
    flattenDistanceMatrix: function (matrixValue) {
        var isSymmetric = this.isSymmetricMatrix (matrixValue); // don't want to count distances in symmetric matrices twice
        var distanceMatrix = matrixValue.distanceMatrix;
        var distanceList = d3.values(distanceMatrix).map (function (row, i) {
            if (row && isSymmetric) {
                row = row.slice (0, Math.max (0, i)); // For future remembering if I change things: beware negative i, as negative value starts slice from end of array
            }
            return d3.values(row).filter (function(d) { return d && (d.length !== 0); });   // filter out nulls, undefineds, zeroes and empty arrays
        });
        return [].concat.apply([], distanceList);
    },
    
    getFlattenedDistances: function () {
        var matrixValues = d3.values (this.matrices);
        var perMatrixDistances = matrixValues.map (function (matrixValue) {
            return this.flattenDistanceMatrix (matrixValue);    
        }, this);
        console.log ("ad", perMatrixDistances);
        return [].concat.apply([], perMatrixDistances);
    },
    
    getMatCellFromIndex: function (cellIndex, matEndPoints, matValues) {
        var matrixIndex = d3.bisectRight (matEndPoints, cellIndex);
        var matrixValue = matValues[matrixIndex];
        var size = matrixValue.size;
        var isSymmetric = this.isSymmetricMatrix (matrixValue);
        
        var row, col;
        //var orig = cellIndex;
        cellIndex -= matrixIndex ? matEndPoints[matrixIndex - 1] : 0;
        if (isSymmetric) {
            row = Math.floor(-0.5 + Math.sqrt(0.25 + 2 * cellIndex));
            var triangularNumber = row * (row + 1) / 2;
            col = cellIndex - triangularNumber;
            row++;  // [0,0] is not used (first residue distance to itself), first usable distance is [1,0] in symmetrix matrix
        } else {
            row = Math.floor (cellIndex / size[1]);
            col = cellIndex - (row * size[1]);  
        }
        
        var distanceMatrix = matrixValue.distanceMatrix;
        var val = distanceMatrix[row] ? distanceMatrix[row][col] : undefined;
        if (val === undefined) {
            //CLMSUI.vent.trigger ("request3DDistance", row, col, matrixValue.chain1, matrixValue.chain2);
            val = CLMSUI.modelUtils.get3DDistance (CLMSUI.compositeModelInst, row, col, matrixValue.chain1, matrixValue.chain2);
            //console.log ("matrix", matrixValue, orig, cellIndex, matrixIndex, row, col, val);
        }
        return val;
    },
    
    isSymmetricMatrix: function (matrixValue) {
        return matrixValue.isSymmetric;
    },
    
    getRandomDistances: function (size, residueSets) {
        residueSets = residueSets || {name: "all", searches: new Set(), linkables: new Set()};
        var stots = d3.sum (residueSets, function (rdata) { return rdata.searches.size; });
        console.log (residueSets, "STOTS", stots, this, this.matrices);
        var perSearch = Math.ceil (size / stots);
        
        var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
        var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
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
        console.log ("seqs", seqs);
        
        var randDists = [];
        residueSets.forEach (function (rdata) {
            var linkableResidues = rdata.linkables;
            var all = linkableResidues.has ("*") || linkableResidues.size === 0;
            var rmap = [];
            seqs.forEach (function (seq) {
                var subSeq = seq.subSeq;
                for (var m = 0; m < subSeq.length; m++) {
                    if (all || linkableResidues.has(subSeq[m])) {
                        var searchIndex = seq.first + m;
                        rmap.push ({searchIndex: searchIndex, 
                                    chainIndex: seq.chainIndex,
                                    protID: seq.protID,
                                    resIndex: alignCollBB.getAlignedIndex (searchIndex, seq.protID, false, seq.alignID, false) });
                    }
                }
            });
            console.log ("rmap", rmap, linkableResidues);
                        
            rdata.searches.forEach (function (searchID) {
                var search = clmsModel.get("searches").get(searchID);
                var protIDs = search.participantIDSet;
                var srmap = (clmsModel.get("searches").size > 1) ? rmap.filter (function(res) { return protIDs.has (res.protID); }) : rmap;
                var resTot = srmap.length;
                console.log ("rr", searchID, resTot);

                for (var n = 0; n < perSearch; n++) {
                    var resFlatIndex1 = Math.floor (Math.random() * resTot);
                    // don't pick same index twice
                    var resFlatIndex2 = Math.floor (Math.random() * (resTot - 1));
                    if (resFlatIndex2 >= resFlatIndex1) {
                        resFlatIndex2++;
                    }
                    var res1 = srmap[resFlatIndex1];
                    var res2 = srmap[resFlatIndex2];
                    //console.log ("rr", resFlatIndex1, resFlatIndex2, res1, res2);
                    // -1's 'cos these indexes are 1-based and the get3DDistance expects 0-indexed residues
                    randDists.push (this.getXLinkDistanceFromChainCoords (this.matrices, res1.chainIndex, res2.chainIndex, res1.resIndex - 1, res2.resIndex - 1));
                }
            }, this)
        }, this);
        
        
        // old way
        /*
        var randDists = [];
        var tot = 0;
        var matrixValues = d3.values (this.matrices);
        var matEndPoints = matrixValues.map (function (matrixValue) {
            var isSymmetric = this.isSymmetricMatrix (matrixValue);
            var size = matrixValue.size;
            tot += size[0] * (isSymmetric ? (size[1] - 1) / 2 : size[1]);
            return tot;
        }, this);
        console.log ("matEndPoints", matEndPoints, matrixValues);
        
        if (size > tot) {   // use all distances as random background
            randDists = this.getFlattenedDistances ();
        } else {    // pick random distances randomly
            for (var n = 0; n < size; n++) {
                var cellIndex = Math.floor (Math.random () * tot);
                randDists.push (this.getMatCellFromIndex (cellIndex, matEndPoints, matrixValues));
            }
        }
        */
        
        console.log ("RANDOM", randDists);
        return randDists;
    },
};
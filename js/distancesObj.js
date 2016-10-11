var CLMSUI = CLMSUI || {};

CLMSUI.DistancesObj = function (matrices, chainMap, pdbBaseSeqId) {
    this.matrices = matrices;
    this.chainMap = chainMap;
    this.pdbBaseSeqId = pdbBaseSeqId;
};

CLMSUI.DistancesObj.prototype = {
    
    constructor: CLMSUI.DistancesObj,
    
    getShortestLinks: function (links) {
        links.forEach (function (link) {
            link.distance = this.getLinkDistanceChainCoords (this.matrices, link.residueA.chainIndex, link.residueB.chainIndex, link.residueA.resindex, link.residueB.resindex);
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
        
        console.log ("nestedLinks", links, nestedLinks, shortestLinks);
        
        return shortestLinks;
    },
    
    
    getXLinkDistance: function (xlink, alignCollBB, average) {
        var chainMap = this.chainMap;
        var matrices = this.matrices;
        var pid1 = xlink.fromProtein.id;
        var pid2 = xlink.toProtein.id;
        var chains1 = chainMap[pid1];
        var chains2 = chainMap[pid2];
        var minDist;
        var totalDist = 0;
        var distCount = 0;

        if (chains1 && chains2) {
            for (var n = 0; n < chains1.length; n++) {
                var ind1 = chains1[n].index;
                var alignId1 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqId, chains1[n].name, ind1);
                var resIndex1 = alignCollBB.getAlignedIndex (xlink.fromResidue, pid1, false, alignId1) - 1; 
                if (resIndex1 >= 0) {
                    for (var m = 0; m < chains2.length; m++) {
                        var ind2 = chains2[m].index;
                        var alignId2 = CLMSUI.modelUtils.make3DAlignID (this.pdbBaseSeqId, chains2[m].name, ind2);
                        var resIndex2 = alignCollBB.getAlignedIndex (xlink.toResidue, pid2, false, alignId2) - 1; 
                        // align from 3d to search index. resindex is 0-indexed so +1 before querying
                        //console.log ("alignid", alignId1, alignId2, pid1, pid2);
                        if (resIndex1 >= 0 && resIndex2 >= 0) {
                            var dist = this.getLinkDistanceChainCoords (matrices, ind1, ind2, resIndex1, resIndex2);
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
    
    getLinkDistanceChainCoords: function (matrices, chainIndex1, chainIndex2, resIndex1, resIndex2) {
        var dist;
        var matrix = matrices [chainIndex1+"-"+chainIndex2];
        var minIndex = resIndex1;   // < resIndex2 ? resIndex1 : resIndex2;
        //console.log ("matrix", matrix, chainIndex1+"-"+chainIndex2, resIndex1, resIndex2);
        if (matrix[minIndex]) {
            var maxIndex = resIndex2;   // < resIndex1 ? resIndex1 : resIndex2;
            dist = matrix[minIndex][maxIndex];
        }
        //console.log ("dist", dist);
        return dist;
    },
    
    flattenDistanceMatrix: function (distanceMatrix) {
        var distanceList = d3.values(distanceMatrix).map (function (row) {
            return d3.values(row).filter (function(d) { return d && (d.length !== 0); });   // filter out nulls, undefineds, zeroes and empty arrays
        });
        return [].concat.apply([], distanceList);
    },
    
    getFlattenedDistancesOld: function (interactorsArr) {
        console.log ("interactors", interactorsArr);
        var perProtDistances = interactorsArr.map (function (prot) {
            var values = d3.values(prot.distances);
            var protDists = values.map (function (value) {
                return CLMSUI.modelUtils.flattenDistanceMatrix (value);    
            });
            protDists = [].concat.apply([], protDists);
            return protDists;
        });
        var allDistances = [].concat.apply([], perProtDistances);
        return allDistances;
    },
    
    // WORK ON THIS TOMORROW
    getFlattenedDistances: function () {
        var matrixArr = d3.values (this.matrices);
        var perMatrixDistances = matrixArr.map (function (matrix) {
            return this.flattenDistanceMatrix (matrix);    
        }, this);
        console.log ("ad", perMatrixDistances);
        return [].concat.apply([], perMatrixDistances);
    },
};
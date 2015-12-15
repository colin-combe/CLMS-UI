var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {
    generateRandomDistribution: function (count, distanceMatrix) {
        var rd = [];
        var matSize = distanceMatrix.length;
        
        for (; --count >= 0;) {
             // floor them or we poke array with fractional values which gives us an infinite loop as no values are found
            var randIndex1 = Math.floor (Math.random() * matSize); 
            var randIndex2 = Math.floor (Math.random() * matSize);
            
            var val = (randIndex1 > randIndex2) 
                ? (distanceMatrix[randIndex1] ? distanceMatrix[randIndex1][randIndex2] : null)
                : (distanceMatrix[randIndex2] ? distanceMatrix[randIndex2][randIndex1] : null)
            ;
            if (val === null) {
                count++;
            } else {
                rd.push(val);
            }
        }
        
        return rd;
    },
    
    flattenDistanceMatrix: function (distanceMatrix) {
        var distanceList =  [].concat.apply([], distanceMatrix);
        distanceList = distanceList.filter(function(d) { return d !== null; });
        return distanceList;
    },
    
    flattenCrossLinkMatrix: function (crossLinks, distances) {
        var distArr = [];
        for (var crossLink of crossLinks) {
            //if (crossLink.check() === true) { // check() seems to cause full crosslink view to be drawn
                var toRes = crossLink.toResidue;
                var fromRes = crossLink.fromResidue;
                var highRes = Math.max(toRes, fromRes);
                var lowRes = Math.min(toRes, fromRes);
                var dist = distances[highRes] ? distances[highRes][lowRes] : null;
                if (dist !== null) {
                    distArr.push(+dist); // + is to stop it being a string
                }
            //~ }
        }

        return distArr;
    },
    

    flattenMatchesOld: function (matchesArr) {
        return matchesArr.map (function(m) { return m.score; });    
    },
    
    flattenMatches: function (matchesArr) {
        var arrs = [[],[]];
        matchesArr.forEach (function(m) {
            var pLink = m.crossLinks[0].proteinLink;
            var isDecoy = (pLink.toProtein.isDecoy() || pLink.fromProtein.isDecoy()) ? 1 : 0;
            //var isDecoy = (Math.random() > 0.8) ? 1: 0; 
            arrs[isDecoy].push (m.score);
        });
        return arrs;
        /*
        return matchesArr
            .filter (function (m) { 
                //return m.crossLinks[0].some (function(c) {
                    var pLink = m.crossLinks[0].proteinLink;
                    return pLink.toProtein.isDecoy() && pLink.fromProtein.isDecoy();
                //});
                
            })
            .map (function(m) { return m.score; })
        ;    
        */
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
        var pLink = crossLink.proteinLink;
        //var pLinkId = pLink.id;
        
        // might need to query protein model at this point if from and to prot data stops getting attached to residues
        
        var fromProt = pLink.fromProtein;
        var toProt = pLink.toProtein;
        
        var fromResType = this.getResidueType (fromProt, fromResIndex);
        var toResType = this.getResidueType (toProt, toResIndex);
        
        // http://jsperf.com/letter-match says using a boolean array for the letter values is generally quickest, have a poke if you disagree
        var fromEster = this.esterBool[fromResType.charCodeAt(0) - 65]; //this.esterMap[fromResType];
        var toEster = this.esterBool[toResType.charCodeAt(0) - 65]; //this.esterMap[toResType];
        
        return (fromEster ? 1 : 0) + (toEster ? 1 : 0);
        
    },
        
    getResidueType: function (protein, resIndex, seqAlignFunc) {
        var seq = protein.sequence;
        // eventually some sequence alignment stuff will be done
        resIndex = seqAlignFunc ? seqAlignFunc (resIndex) : resIndex;
        // Is the sequence starting at 1, do the resIndex's start at 1?
        return seq[resIndex - 1];
    },
     
    findResidueIDsInSquare : function (residueMap, sr1, er1, sr2, er2) {
        var a = [];
        for (var n = sr1; n <= er1; n++) {
            for (var m = sr2; m <= er2; m++) {
                var k = n+"-"+m;
                if (residueMap.get(k)) {
                    a.push (k);
                }
            }
        }
        return a;
    },
    
    findResidueIDsInSpiral : function (residueMap, cx, cy, side) {
        var a = [];
        var x = cx;
        var y = cy;
        var moves = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        var b = 1;
        for (var n = 0; n < side; n++) {
    
            for (var m = 0; m < moves.length; m++) {
                for (var l = 0; l < b; l++) {
                    var k = x+"-"+y;
                    if (residueMap.get(k)) {
                        a.push (k);
                    }
                    //console.log ("["+x+", "+y+"]");    
                    x += moves[m][0];
                    y += moves[m][1];
                }
                if (m == 1) {
                    b++;
                }
            }
            b++;
        }
        // tidy up last leg of spiral
        for (var n = 0; n < b; n++) {
            var k = x+"-"+y;
            if (residueMap.get(k)) {
                a.push (k);
            }
            //console.log ("["+x+", "+y+"]");    
            x += moves[0][0];
            y += moves[0][1];
        }
        return a;
    },
    
    RangeModel: Backbone.Model.extend ({
        initialize: function () {
            this
                .set ("active", false)
            ;
        }
    }),
    
        // I want MinigramBB to be model agnostic so I can re-use it in other places
    MinigramModelBB: Backbone.Model.extend ({
        data: function() { return [1,2,3,4]; },
        initialize: function (options) {
            this.set ({domainStart: 0, domainEnd: 100});
        }
    }),
};

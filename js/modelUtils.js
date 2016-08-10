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
    
    getCrossLinkDistances: function (crossLinks, distances) {
        var distArr = [];
        for (var crossLink of crossLinks) {
            var toRes = crossLink.toResidue;
            var fromRes = crossLink.fromResidue;
            var highRes = Math.max(toRes, fromRes);
            var lowRes = Math.min(toRes, fromRes);
            var dist = distances[highRes] ? distances[highRes][lowRes] : null;
            if (dist !== null) {
                distArr.push(+dist); // + is to stop it being a string
            }
        }

        return distArr;
    },
    

    flattenMatchesOld: function (matchesArr) {
        return matchesArr.map (function(m) { return m.score; });    
    },
    
    flattenMatches: function (matchesArr) {
        var arrs = [[],[]];
        matchesArr.forEach (function(m) { 
            arrs[m.is_decoy? 1 : 0].push (m.score);
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
    
    // lots of scores, what's the extent (min and max values)?
    getScoreExtent: function (matchesArr) {
        return d3.extent (matchesArr.map (function(d) { return d.score; }));
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
        "VAL": "V",
        "TRP": "W",
        "X": "X",
        "TYR": "Y",
        "GLX": "Z",
        "*": "*" ,
    },
    
    getSequencesFromNGLModel: function (stage, CLMSModel) {
        var sequences = [];
        var proteinIDIter = CLMSModel.get("interactors").entries();
        
        stage.eachComponent (function (comp) {   
            var pidArr = proteinIDIter.next().value;
            var pid = pidArr ? pidArr[0] : "Unknown"; // assuming proteins match 1-1 with stages, is a guess
            // but otherwise at mo have no way of knowing which stage belongs to which protein
            console.log ("pid", pid);
            
            comp.structure.eachModel (function(m) {
                var resList = [];
                console.log ("model", m);

                m.eachChain (function(c) {
                    console.log ("chain", c, c.residueCount, c.residueOffset);
                    if (c.residueOffset === 0) {    // just use first chain for the moment. is a hack.
                        c.eachResidue (function (r) {
                            var oneLetter = CLMSUI.modelUtils.amino3to1Map[r.resname];
                            resList.push (oneLetter || "X");    
                        });
                    }
                });
                sequences[sequences.length] = {id: pid, name: "3D_p"+m.index, data: resList.join("")};
            });
        });  

        return sequences;
    },
    
    linkHasHomomultimerMatch: function (xlink) {
        return xlink.filteredMatches_pp.some (function (matchAndPepPos) {
            return matchAndPepPos.match.confirmedHomomultimer;    
        });
    },
    
    aggregateCrossLinkFilteredMatches: function (xlinkarr) {
        var nestedArr = xlinkarr.map (function (xlink) {
            return xlink.filteredMatches_pp;
        });
        return [].concat.apply([], nestedArr);
    },
    
    getRandomSearchId : function (clmsModel, match) {
        // pitfall: maps store integer keys as strings, so toString here
        
        // (actually maps store integer keys as integers, 
        // these keys got converted to strings when they were previously propertyNames in an Object,
        // anyway, I added the toString() conversion for searchId to SpectrumMatch (ln.26)
        // so we don't have to bother about this anymore.
        // this is more commentary than this minor issue merits,
        // can delete when read... - col)
                
        var searchId = match.searchId;//.toString(); //see, I took it out
        var searchMap = clmsModel.get("searches");
        var searchData = searchMap.get(searchId);
        var randId = searchData.randId;    
        return randId;
    },
    
    isReverseProtein: function (prot1, prot2) {
        return (prot1.description === prot2.description && (prot1.is_decoy ^ prot2.is_decoy));
    },
    
    isIntraLink: function (crossLink) {
         return ((crossLink.toProtein.id === crossLink.fromProtein.id) || CLMSUI.modelUtils.isReverseProtein (crossLink.toProtein, crossLink.fromProtein));
    },
};

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
        var distanceList = [].concat.apply([], distanceMatrix);
        return distanceList.filter (function(d) { return d !== null && d !== undefined; });
    },
    
    getFlattenedDistances: function (interactorsArr) {
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
    
    getCrossLinkDistances2: function (crossLinks, interactorMap) {
        var distArr = [];
        for (var crossLink of crossLinks) {
            var dist = CLMSUI.compositeModelInst.getSingleCrosslinkDistance (crossLink);
            if (dist !== null && dist !== undefined) {
                distArr.push(+dist); // + is to stop it being a string
            }
            /*
            var toRes = crossLink.toResidue;
            var fromRes = crossLink.fromResidue;
            var toProt = crossLink.toProtein;
            var distances = toProt.distances;
            if (distances) {
                var highRes = Math.max(toRes, fromRes);
                var lowRes = Math.min(toRes, fromRes);
                var dist = distances[highRes] ? distances[highRes][lowRes] : null;
                if (dist !== null && dist !== undefined) {
                    distArr.push(+dist); // + is to stop it being a string
                }
            }
            */
        }
        console.log ("distArr", distArr);

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
        return d3.extent (Array.from(matchesArr.values()).map (function(d) { return d.score; }));
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
        link: function (xlink) {
            return [
                ["From", xlink.fromResidue, CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(xlink, false)], xlink.fromProtein.name],
                ["To", xlink.toResidue, CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(xlink, true)], xlink.toProtein.name],
                ["Matches", xlink.filteredMatches_pp.length],
            ];
        },
        
        interactor: function (interactor) {
             return [["ID", interactor.id], ["Accession", interactor.accession], ["Size", interactor.size], ["Desc.", interactor.description]];
        },
        
        multilinks: function (xlinks, interactorId, residueIndex) {
            var ttinfo = xlinks.map (function (xlink) {
                var startIsTo = (xlink.toProtein.id === interactorId && xlink.toResidue === residueIndex);
                var threeLetterCode = CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(xlink, !startIsTo)];
                if (startIsTo) {
                    return [xlink.fromResidue, threeLetterCode, xlink.fromProtein.name, xlink.filteredMatches_pp.length]; 
                } else {
                    return [xlink.toResidue, threeLetterCode, xlink.toProtein.name, xlink.filteredMatches_pp.length];
                }
            });
            var sortFields = [3, 0]; // sort by matches, then res index
            var sortDirs = [1, -1];
            ttinfo.sort (function(a, b) { 
                var diff = 0;
                for (var s = 0; s < sortFields.length && diff === 0; s++) {
                    var field = sortFields[s];
                    diff = (b[field] - a[field]) * sortDirs[s]; 
                }
                return diff;
            });
            ttinfo.unshift (["Pos", "Residue", "Protein", "Matches"]);
            return ttinfo;
        },
        
        feature: function (feature) {
             return [["Name", feature.id], ["Start", feature.fstart], ["End", feature.fend]];
        },
    },
    
    makeTooltipTitle: {
        residue: function (interactor, residueIndex, residueExtraInfo) {
            return residueIndex + "" + (residueExtraInfo ? residueExtraInfo : "") + " " + 
                CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getResidueType (interactor, residueIndex)] + " " + interactor.name;
        },    
        link: function () { return "Linked Residue Pair"; },   
        interactor: function (interactor) { return interactor.name.replace("_", " "); }, 
        feature: function () { return "Feature"; },
    },
     
    findResidueIDsInSquare : function (fromProtID, toProtID, crossLinkMap, sr1, er1, sr2, er2) {
        var a = [];
        for (var n = sr1; n <= er1; n++) {
            for (var m = sr2; m <= er2; m++) {
                var k = fromProtID+"_"+n+"-"+toProtID+"_"+m;
                var crossLink = crossLinkMap.get(k);
                if (crossLink) {
                    a.push (crossLink);
                }
            }
        }
        return a;
    },
    
    findResidueIDsInSpiral : function (fromProtID, toProtID, crossLinkMap, cx, cy, side) {
        var a = [];
        var x = cx;
        var y = cy;
        var moves = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        var b = 1;
        for (var n = 0; n < side; n++) {
    
            for (var m = 0; m < moves.length; m++) {
                for (var l = 0; l < b; l++) {
                    var k = fromProtID+"_"+x+"-"+toProtID+"_"+y;
                    var crossLink = crossLinkMap.get(k);
                    if (crossLink) {
                        a.push (crossLink);
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
            var k = fromProtID+"_"+x+"-"+toProtID+"_"+y;
            var crossLink = crossLinkMap.get(k);
            if (crossLink) {
                a.push (crossLink);
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
    
    getSequencesFromNGLModelNew: function (stage) {
        var sequences = [];
        
        stage.eachComponent (function (comp) {    
            comp.structure.eachChain (function (c) {
                console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname);
                if (c.residueCount > 10) {    // short chains are ions/water molecules, ignore
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
    
    /* Fallback protein-to-pdb chain matching routines for when we don't have a pdbcode to query 
    the pdb web services or it's offline. 
    */
    matchSequencesToProteins: function (sequenceObjs, proteins, extractFunc) {
        proteins = proteins.filter (function (protein) { return !protein.is_decoy; });
        var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
        var matchMatrix = {};
        proteins.forEach (function (prot) {
            //console.log ("prot", prot);
            var protAlignModel = alignCollection.get(prot.id);
            if (protAlignModel) {
                var seqs = extractFunc ? sequenceObjs.map (extractFunc) : sequenceObjs;
                protAlignModel.set("semiLocal", true);  // needs to be done as initialisation not called on model (figure out why later)
                var alignResults = protAlignModel.alignWithoutStoring (seqs);
                console.log ("alignResults", alignResults);
                var scores = alignResults.map (function (indRes) { return indRes.res[0]; });
                matchMatrix[prot.id] = scores;
            }   
        });
        console.log ("matchMatrix", matchMatrix);
        return CLMSUI.modelUtils.matrixPairings (matchMatrix, sequenceObjs);
    },
    
    matrixPairings: function (matrix, sequenceObjs) {
        var keys = d3.keys(matrix);
        var pairings = [];
        for (var n = 0; n < sequenceObjs.length; n++) {
            var max = {key: undefined, seqObj: undefined, score: 40};
            keys.forEach (function (key) {
                var score = matrix[key][n];
                console.log ("s", n, score, score / sequenceObjs[n].data.length);
                if (score > max.score && (score / sequenceObjs[n].data.length) > 1) {
                    max.score = score;
                    max.key = key;
                    max.seqObj = sequenceObjs[n];
                }
            });
            if (max.key) {
                pairings.push ({id: max.key, seqObj: max.seqObj});
            }
        }
        
        return pairings;
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
        return (prot1.description === prot2.description || prot1.accession === "REV_"+prot2.accession || "REV_"+prot1.accession === prot2.accession) && (prot1.is_decoy ^ prot2.is_decoy);
    },
    
    isIntraLink: function (crossLink) {
         return ((crossLink.toProtein.id === crossLink.fromProtein.id) || CLMSUI.modelUtils.isReverseProtein (crossLink.toProtein, crossLink.fromProtein));
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
    
    getPDBIDsForProteins: function (interactorMap, success) {
        var ids = Array.from(interactorMap.values())
            .filter (function (prot) { return !prot.is_decoy; })
            .map (function(prot) { return prot.accession; })
        ;
        
        var xmlString = "<orgPdbQuery><queryType>org.pdb.query.simple.UpAccessionIdQuery</queryType>"
            +"<description>PDB Query Using Uniprot IDs</description><accessionIdList>"
            +ids.join(",")
            +"</accessionIdList></orgPdbQuery>"
        ;
        
        var encodedXmlString = encodeURIComponent (xmlString);
        
        $.post("http://www.rcsb.org/pdb/rest/search/?req=browser&sortfield=Release Date", encodedXmlString, success);
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
    }
};

CLMSUI.modelUtils.amino1to3Map = _.invert (CLMSUI.modelUtils.amino3to1Map);

var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {
    flattenMatchesOld: function (matchesArr) {
        return matchesArr.map (function(m) { return m.score; });    
    },
    
    flattenMatches: function (matchesArr) {
        var arrs = [[],[]];
        var matchesLen = matchesArr.length;
        for (var m = 0; m < matchesLen; ++m) { 
			var match = matchesArr[m];
            arrs[match.is_decoy? 1 : 0].push (match.score);
        };
        return arrs;
    },
    
   // lots of scores, what's the extent (min and max values)?
    getScoreExtent: function (matchesArr) {
        return d3.extent (matchesArr, function(d) { return d.sc; });
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
                var from3LetterCode = CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(crossLink, false)];
                var to3LetterCode = CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(crossLink, true)];
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
            } else {
                details = null;
            }
            return details;   
        },
    },
    
    makeTooltipTitle: { 
        link: function (linkCount) { return "Linked Residue Pair" + (linkCount > 1 ? "s" : ""); },   
        interactor: function (interactor) { return interactor.name.replace("_", " "); }, 
        residue: function (interactor, residueIndex, residueExtraInfo) {
            return residueIndex + "" + (residueExtraInfo ? residueExtraInfo : "") + " " + 
                CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getResidueType (interactor, residueIndex)] + " " + interactor.name;
        },   
        feature: function () { return "Feature"; },
        linkList: function (linkCount) { return "Linked Residue Pair" + (linkCount > 1 ? "s" : ""); },   
    },
     
    findResiduesInSquare : function (convFunc, crossLinkMap, cx, cy, side) {
        var a = [];
        for (var n = cx - side; n <= cx + side; n++) {
            var convn = convFunc (n, 0).convX;
            if (!isNaN(convn) && convn > 0) {
                for (var m = cy - side; m <= cy + side; m++) {
                    var conv = convFunc (n, m);
                    var convm = conv.convY;
                    if (!isNaN(convm) && convm > 0) {
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
    
    commonRegexes: {
        uniprotAccession: new RegExp ("[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}", "i"),
        pdbPattern: "[A-Z0-9]{4}",
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
        console.log ("matchMatrix", matchMatrix, sequenceObjs);
        return CLMSUI.modelUtils.matrixPairings (matchMatrix, sequenceObjs);
    },
    
    matrixPairings: function (matrix, sequenceObjs) {
        var keys = d3.keys(matrix);
        var pairings = [];
        for (var n = 0; n < sequenceObjs.length; n++) {
            var max = {key: undefined, seqObj: undefined, score: 40};
            keys.forEach (function (key) {
                var score = matrix[key][n];
                //console.log ("s", n, score, score / sequenceObjs[n].data.length);
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
    
 /*   aggregateCrossLinkFilteredMatches: function (xlinkarr) {
        var nestedArr = xlinkarr.map (function (xlink) {
            return xlink.filteredMatches_pp;
        });
        return [].concat.apply([], nestedArr); //bad things happen for search inc decoys
    }, */
    
    getRandomSearchId : function (clmsModel, match) {
        var searchId = match.searchId;
        var searchMap = clmsModel.get("searches");
        var searchData = searchMap.get(searchId);
        var randId = searchData.randId;    
        return randId;
    },
    
    addDecoyFunctions: function (clmsBBModel, prefixes) {
        // Make map of reverse/random decoy proteins to real proteins
        prefixes = prefixes || ["REV_", "RAN_"];
        var prots = clmsBBModel.get("proteins");
        var nameMap = d3.map ();
        var accessionMap = d3.map ();
        prots.forEach (function (prot) {
            nameMap.set (prot.name, prot.id);
            accessionMap.set (prot.accession, prot.id);
        });
        var decoyToRealMap = d3.map ();
        var decoys = prots.filter(function (p) { return p.is_decoy; });
        decoys.forEach (function (decoyProt) {
            prefixes.forEach (function (pre) {
                var realProtIDByName = nameMap.get (decoyProt.name.substring(pre.length));
                var realProtIDByAccession = accessionMap.get (decoyProt.accession.substring(pre.length));
                if (realProtIDByName && realProtIDByAccession) {
                    decoyToRealMap.set (decoyProt.id, realProtIDByName);
                }
            });  
        });
        
        clmsBBModel.decoyToRealProteinMap = decoyToRealMap;
        clmsBBModel.getRealProteinID = function (decoyProteinID) {
            return this.decoyToRealProteinMap.get (decoyProteinID);
        };
        clmsBBModel.areDecoysPresent = function () { return this.decoyToRealProteinMap.size() > 0; };
        clmsBBModel.isMatchingProteinPair = function (prot1, prot2) {
            if (prot1.id === prot2.id) { return true; }
            var p1decoy = prot1.is_decoy;
            if (p1decoy === prot2.is_decoy) {   // won't be matching real+decoy pair if both are real or both are decoys  
                return false;
            }
            var decoy = p1decoy ? prot1 : prot2;
            var real = p1decoy ? prot2 : prot1;
            return this.getRealProteinID(decoy.id) === real.id;
        };
        clmsBBModel.isMatchingProteinPairFromIDs = function (prot1ID, prot2ID) {
            if (prot1ID === prot2ID) { return true; }
            var prot1 = this.get("participants").get(prot1ID);
            var prot2 = this.get("participants").get(prot2ID);
            return this.isMatchingProteinPair (prot1, prot2);
        };
        clmsBBModel.isIntraLink = function (crossLink) {
            return (crossLink.toProtein && this.isMatchingProteinPair (crossLink.toProtein, crossLink.fromProtein));
        };
        clmsBBModel.realProteinCount = prots.length - decoys.length;
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
    
    getLegalAccessionIDs (interactorMap) {
        var ids = [];
        if (interactorMap) {
            ids = Array.from(interactorMap.values())
                .filter (function (prot) { return !prot.is_decoy; })
                .map (function(prot) { return prot.accession; })
                .filter (function (accession) { return accession.match (CLMSUI.modelUtils.commonRegexes.uniprotAccession); })
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

            $.post("http://www.rcsb.org/pdb/rest/search/?req=browser&sortfield=Release Date", encodedXmlString, successFunc);
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
    
    pickCommonPDB: function (interactors) {
        var interactorVals = interactors.values();
        var invPDBMap = {};
        var validAcc = null;
        
        if (interactorVals.length < 4) {
            var protMap = {
                "1AO6": ["P02768-A"],
                "3NBS": ["P00004"],
                "3J7U": ["P00432"],
                "2CRK": ["P00563"],
                "1DPX": ["P00698"],
                "5D5R": ["P68082"],
            };

            [protMap].forEach (function (map) {
                d3.entries(map).forEach (function (entry) {
                    entry.value.forEach (function (val) {
                        invPDBMap[val] = entry.key;
                    }); 
                });
            });
            var protAccs = Array.from(interactorVals).map (function (prot) { return prot.accession; });
            validAcc = protAccs.find (function(acc) { return invPDBMap[acc] !== undefined; });
        }
        return invPDBMap [validAcc];    // quick protein accession to pdb lookup for now
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
    
    // If distances matrix not fully populated
    get3DDistance: function (compModel, res1Index, res2Index, chain1, chain2) {
        if (compModel) {
            var stageModel = compModel.get("stageModel");
            if (stageModel) {
                return stageModel.getSingleDistanceBetween2Residues (res1Index, res2Index, chain1, chain2);
            }
        }
        return 0;
    }
};

CLMSUI.modelUtils.amino1to3Map = _.invert (CLMSUI.modelUtils.amino3to1Map);

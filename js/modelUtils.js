var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {   
    flattenMatches: function (matchesArr) {
        var arrs = [[],[]];
        var matchesLen = matchesArr.length;
        for (var m = 0; m < matchesLen; ++m) { 
            var match = matchesArr[m];
            arrs[match.is_decoy? 1 : 0].push (match.score);
        };
        return arrs;
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
            var info = [
                ["From", xlink.fromResidue, CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(xlink, false)], xlink.fromProtein.name],
                ["To", xlink.toResidue, CLMSUI.modelUtils.amino1to3Map [CLMSUI.modelUtils.getDirectionalResidueType(xlink, true)], xlink.toProtein.name],
                ["Matches", xlink.filteredMatches_pp.length],
            ];
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
        hexColour: new RegExp ("#[0-9A-F]{3}([0-9A-F]{3})?", "i"),   // matches #3-char or #6-char hex colour strings
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
        
        stage.loadFile (uri, params)
            .then (function (structureComp) {
                var nglSequences2 = CLMSUI.modelUtils.getSequencesFromNGLModelNew (stage);
                var interactorMap = bbmodel.get("clmsModel").get("participants");
                var interactorArr = CLMS.arrayFromMapValues(interactorMap);
                // If have a pdb code AND legal accession IDs use a web service to glean matches between ngl protein chains and clms proteins
                if (pdbInfo.pdbCode && CLMSUI.modelUtils.getLegalAccessionIDs(interactorMap).length > 0) {
                    CLMSUI.modelUtils.matchPDBChainsToUniprot (pdbInfo.pdbCode, nglSequences2, interactorArr, function (pdbUniProtMap) {
                        //console.log ("pdb's pdbUniProtMap", pdbUniProtMap);
                        sequenceMapsAvailable (pdbUniProtMap);
                    });
                }
                else {  // without access to pdb codes have to match comparing all proteins against all chains
                    var protAlignCollection = bbmodel.get("alignColl");
                    var pdbUniProtMap = CLMSUI.modelUtils.matchSequencesToProteins (protAlignCollection, nglSequences2, interactorArr,
                        function(sObj) { return sObj.data; }
                    );
                    //console.log ("our pdbUniProtMap", pdbUniProtMap);
                    sequenceMapsAvailable (pdbUniProtMap);
                }

                // bit to continue onto after ngl protein chain to clms protein matching has been done
                function sequenceMapsAvailable (sequenceMap) {
                    
                    console.log ("seqmpa", sequenceMap);
                    //if (sequenceMap && sequenceMap.length) {
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
            })
        ;  
    },

    
    getSequencesFromNGLModelNew: function (stage) {
        var sequences = [];
        
        stage.eachComponent (function (comp) {    
            comp.structure.eachChain (function (c) {
                if (c.residueCount > 10) {    // short chains are ions/water molecules, ignore
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
        $.get("http://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query="+pdbCode,
            function (data, status, xhr) {                   
                if (status === "success") {
                    //console.log ("data", data);
                    var map = d3.map();
                    $(data).find("block").each (function(i,b) { 
                        var segArr = $(this).find("segment[intObjectId]"); 
                        for (var n = 0; n < segArr.length; n += 2) {
                            var id1 = $(segArr[n]).attr("intObjectId");
                            var id2 = $(segArr[n+1]).attr("intObjectId");
                            var pdbis1 = _.includes(id1, ".") || id1.charAt(0) !== 'P';
                            var unipdb = pdbis1 ? {pdb: id1, uniprot: id2} : {pdb: id2, uniprot: id1};
                            map.set (unipdb.pdb+"-"+unipdb.uniprot, unipdb);
                        }
                    });
                    // sometimes there are several blocks for the same uniprot/pdb combination so had to map then take the values to remove duplicate pairings i.e. 3C2I 
                    var mapArr = CLMS.arrayFromMapValues(map);
                    //console.log ("map", map, mapArr, nglSequences);
                    
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
                        mapArr = mapArr.filter (function (mapping) { return mapping.id !== "none"; });
                        callback (mapArr);
                    }
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
    },
    
    crosslinkerSpecificityPerLinker: function (searchArray) {
        
        var linkableResSets = {};
        for (var s = 0; s < searchArray.length; s++) {
            var search = searchArray[s];
            var crosslinkers = search.crosslinkers || [];
            var crosslinkerCount = crosslinkers.length;
            
            for (var cl = 0; cl < crosslinkerCount ; cl++) {
                var crosslinkerDescription = crosslinkers[cl].description;
                var crosslinkerName = crosslinkers[cl].name;
                var linkedAARegex = /LINKEDAMINOACIDS:(.*?)(?:;|$)/g;   // capture both sets if > 1 set
                console.log ("cld", crosslinkerDescription);
                var resSet = linkableResSets[crosslinkerName];
                
                if (!resSet) {
                    resSet = {searches: new Set(), linkables: [], name: crosslinkerName};
                    linkableResSets[crosslinkerName] = resSet;
                }
                resSet.searches.add (search.id);
                
                var result = null;
                var i = 0;
                while ((result = linkedAARegex.exec(crosslinkerDescription)) !== null) {
                    var resArray = result[1].split(',');
                    var resCount = resArray.length;
                    
                    if (!resSet.linkables[i]) {
                        resSet.linkables[i] = new Set();
                    }
                    
                    for (var r = 0; r < resCount; r++) {
                        var resRegex = /(cterm|nterm|[A-Z])(.*)?/i;
                        var resMatch = resRegex.exec(resArray[r]);
                        if (resMatch) {
                            resSet.linkables[i].add(resMatch[1].toUpperCase());
                        }
                    }
                    i++;
                }
                
                resSet.heterobi = resSet.heterobi || (i > 1);
            }
        }
        return linkableResSets;
    },
    
    // return indices of sequence whose letters match one in the residue set
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
        
    // Calculate c- and n-term positions in a per-protein map, pass in an array of peptide from searchmodel
   /* getTerminiPositions: function (peptideArray) {
        var perProtMap = d3.map();
        peptideArray.forEach (function (peptide) {
            var seqlen = peptide.sequence.length;
            for (var n = 0; n < peptide.pos.length; n++) {
                var pos = peptide.pos[n];
                var prot = peptide.prt[n];
                var protSet = perProtMap.get(prot);
                if (!protSet) {
                    protSet = {"ntermSet": d3.set(), "ctermSet": d3.set()};
                    perProtMap.set (prot, protSet);
                }
                protSet.ntermSet.add (pos);
                protSet.ctermSet.add (pos + seqlen - 1);
            }
        });

        perProtMap.forEach (function (id, termLists) {
            termLists.ntermList = termLists.ntermSet.values().map(function (v) { return +v; });
            termLists.ctermList = termLists.ctermSet.values().map(function (v) { return +v; });
        });

        return perProtMap;
    },*/
    
    updateLinkMetadata: function (metaDataFileContents, clmsModel) {
        var crossLinks = clmsModel.get("crossLinks");
        var protMap = d3.map();
        clmsModel.get("participants").forEach (function (value, key) {
            protMap.set (value.accession, key);
            protMap.set (value.name, key);
        });
        var first = true;
        var columns = [];
        var dontStoreArray = ["linkID", "LinkID", "Protein 1", "SeqPos 1", "Protein 2", "SeqPos 2"];
        var dontStoreSet = d3.set (dontStoreArray);
        d3.csv.parse (metaDataFileContents, function (d) {
            var linkID = d.linkID || d.LinkID;
            var crossLinkEntry = crossLinks.get(linkID);

            // Maybe need to generate key from several columns
            if (!crossLinkEntry) {
                var parts1 = d["Protein 1"].split("|");
                var parts2 = d["Protein 2"].split("|");
                var pkey1, pkey2;
                parts1.forEach (function (part) {
                    pkey1 = pkey1 || protMap.get(part);
                });
                parts2.forEach (function (part) {
                    pkey2 = pkey2 || protMap.get(part);
                });
                linkID = pkey1+"_"+d["SeqPos 1"]+"-"+pkey2+"_"+d["SeqPos 2"];
                crossLinkEntry = crossLinks.get(linkID);
            }
            
            if (crossLinkEntry) {
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
                    columns = d3.set(keys);
                    dontStoreArray.forEach (function (dont) {
                        columns.remove (dont);
                    });
                    columns = columns.values();
                    first = false;
                }
            }
        });
        if (columns && columns.length > 0) {
            CLMSUI.vent.trigger ("linkMetadataUpdated", columns, crossLinks);
        }    
    },
    
};

CLMSUI.modelUtils.amino1to3Map = _.invert (CLMSUI.modelUtils.amino3to1Map);

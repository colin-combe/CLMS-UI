var CLMSUI = CLMSUI || {};

CLMSUI.NGLUtils = {
    repopulateNGL: function (pdbInfo) {
        pdbInfo.baseSeqId = (pdbInfo.pdbCode || pdbInfo.name);
        var params = pdbInfo.params || {}; // {sele: ":A"};    // example: show just 'A' chain
        var uri = pdbInfo.pdbCode ? "rcsb://" + pdbInfo.pdbCode : pdbInfo.pdbFileContents;
        
        var multiplePDBURI = pdbInfo.pdbCode 
            ? pdbInfo.pdbCode.match(CLMSUI.utils.commonRegexes.multiPdbSplitter).map (function (code) { return {id: code, uri:"rcsb://"+code, local: false}; })
            : [{id: pdbInfo.name, uri: pdbInfo.pdbFileContents, local: true}]
        ;
        
        //multiplePDBURI.push ({id: "1H3O", uri: "rcsb://1H3O", local: false});
        console.log ("MP", multiplePDBURI);
        
        
        var stage = pdbInfo.stage;
        var bbmodel = pdbInfo.bbmodel;

        stage.removeAllComponents(); // necessary to remove old stuff so old sequences don't pop up in sequence finding

        function returnFailure(reason) {
            var emptySequenceMap = [];
            emptySequenceMap.failureReason = "Error for " + pdbInfo.baseSeqId + ", " + reason;
            emptySequenceMap.pdbid = pdbInfo.baseSeqId;
            bbmodel.trigger("3dsync", emptySequenceMap);
        }

        console.log ("params", params);
        
        Promise.all (
            //stage.loadFile("rcsb://1AO6", params)
            multiplePDBURI.map (function (pdbURI) {
                return stage.loadFile (pdbURI.uri, params);
            })
        )
        //stage.loadFile(uri, params)
            .catch (function (reason) {
                returnFailure(reason);
            })
            .then (function (structureCompArray) {

                CLMSUI.utils.xilog ("structureComp", structureCompArray);
            
                var structureComp;
                if (structureCompArray.length > 1) {
                    //structureCompArray 
                    var cs = NGL.concatStructures.apply (NGL, ["concat"].concat(structureCompArray.map (function (sc) { return sc.structure; })) );
                    //var cs = NGL.concatStructures ("concat", structureCompArray.map (function (sc) { return sc.structure; }));
                    var comp = stage.addComponentFromObject(cs);
                    comp.structure.title = structureCompArray.map (function (scomp) { return scomp.structure.title; }).join(", ");
                    structureComp = comp;
                } else {
                    structureComp = structureCompArray[0];
                }
            
                if (structureComp) {
                    // match by alignment func for searches where we don't know uniprot ids, don't have pdb codes, or when matching by uniprot ids returns no matches
                    function matchByXiAlignment (whichNGLSequences, pdbUniProtMap) {
                        var protAlignCollection = bbmodel.get("alignColl");
                        CLMSUI.vent.listenToOnce (CLMSUI.vent, "sequenceMatchingDone", function (matchMatrix) {
                            var pdbXiProtMap = CLMSUI.modelUtils.matrixPairings (matchMatrix, whichNGLSequences);
                            CLMSUI.utils.xilog ("XI PAIRED", pdbXiProtMap);
                            sequenceMapsAvailable (pdbXiProtMap.concat (pdbUniProtMap));    // concat uniprot service and xi matched pdb-protein pairs
                        });
                        // the above sequenceMatchingDone event is triggered in matchSequencesToExistingProteins when these further alignments done, sync or async
                        CLMSUI.NGLUtils.matchSequencesToExistingProteins (protAlignCollection, whichNGLSequences, interactorArr,
                            function(sObj) {
                                return sObj.data;
                            }
                        );
                    }

                    var nglSequences = CLMSUI.NGLUtils.getChainSequencesFromNGLStage(stage);
                    var interactorMap = bbmodel.get("clmsModel").get("participants");
                    var interactorArr = CLMS.arrayFromMapValues(interactorMap);

                    // If have a pdb code AND legal accession IDs use a web service in matchPDBChainsToUniprot to glean matches
                    // between ngl protein chains and clms proteins. This is asynchronous so we use a callback
                    if (pdbInfo.pdbCode && CLMSUI.modelUtils.getLegalAccessionIDs(interactorMap).length) {
                        console.log("WEB SERVICE CALLED");
                        CLMSUI.NGLUtils.matchPDBChainsToUniprot(multiplePDBURI /*pdbInfo.pdbCode*/, nglSequences, interactorArr, function (uniprotMappingResults) {
                            CLMSUI.utils.xilog ("UniprotMapRes", uniprotMappingResults, nglSequences);
                            if (uniprotMappingResults.remaining.length) { // Some PDB sequences don't have unicode protein matches in this search
                                var remainingSequences = _.pluck (uniprotMappingResults.remaining, "seqObj");   // strip the remaining ones back to just sequence objects
                                matchByXiAlignment (remainingSequences, uniprotMappingResults.uniprotMapped);   // fire them into xi alignment routine
                                //returnFailure ("No valid uniprot data returned");
                            } else {
                                sequenceMapsAvailable (uniprotMappingResults.uniprotMapped);
                            }
                        });
                    } else { // without access to pdb codes have to match comparing all proteins against all chains
                        matchByXiAlignment (nglSequences, []);
                    }

                    // bit to continue onto after ngl protein chain to clms protein matching has been done
                    function sequenceMapsAvailable (sequenceMap) {

                        CLMSUI.utils.xilog ("seqmap", sequenceMap);
                        //if (!_.isEmpty(sequenceMap)) {
                        //sequenceMap.pdbid = pdbInfo.baseSeqId;
                        var chainMap = {};
                        sequenceMap.forEach (function (pMatch) {
                            pMatch.data = pMatch.seqObj.data;
                            pMatch.name = CLMSUI.NGLUtils.make3DAlignID(pdbInfo.baseSeqId, pMatch.seqObj.chainName, pMatch.seqObj.chainIndex);
                            chainMap[pMatch.id] = chainMap[pMatch.id] || [];
                            chainMap[pMatch.id].push({
                                index: pMatch.seqObj.chainIndex,
                                name: pMatch.seqObj.chainName,
                                modelIndex: pMatch.seqObj.modelIndex
                            });
                            pMatch.otherAlignSettings = {
                                semiLocal: true
                            };
                        });
                        CLMSUI.utils.xilog ("chainmap", chainMap, "stage", stage, "\nhas sequences", sequenceMap);

                        if (bbmodel.get("stageModel")) {
                            bbmodel.get("stageModel").stopListening(); // Stop the following 3dsync event triggering stuff in the old stage model
                        }
                        bbmodel.trigger("3dsync", sequenceMap);
                        // Now 3d sequence is added we can make a new crosslinkrepresentation (as it needs aligning)

                        // Make a new model and set of data ready for the ngl viewer
                        var crosslinkData = new CLMSUI.BackboneModelTypes.NGLModelWrapperBB();
                        crosslinkData.set({
                            structureComp: structureComp,
                            chainMap: chainMap,
                            pdbBaseSeqID: pdbInfo.baseSeqId,
                            masterModel: bbmodel,
                        });
                        bbmodel.set("stageModel", crosslinkData);
                        // important that the new stagemodel is set first ^^^ before we setupLinks() on the model
                        // otherwise the listener in the 3d viewer is still pointing to the old stagemodel when the
                        // changed:linklist event is received. (i.e. it broke the other way round)
                        crosslinkData.setupLinks();
                    }
                }
            });
    },
    
    getChainSequencesFromNGLStructure: function (structureComponent) {
        var sequences = [];
        //console.log ("comp", structureComponent);
        
        structureComponent.structure.eachChain(function(c) {
            //console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname, c.qualifiedName());
            if (CLMSUI.NGLUtils.isViableChain(c)) { // short chains are ions/water molecules, ignore
                var resList = [];
                c.eachResidue(function(r) {
                    resList.push(CLMSUI.modelUtils.amino3to1Map[r.resname] || "X");
                });
                sequences.push ({
                    chainName: c.chainname,
                    chainIndex: c.index,
                    modelIndex: c.modelIndex,
                    residueOffset: c.residueOffset,
                    data: resList.join("")
                });
                //console.log ("chain", c, c.residueCount, c.residueOffset, c.chainname, c.qualifiedName(), resList.join(""));
            }
        });
        CLMSUI.utils.xilog ("seq", sequences);
        return sequences;
    },
    
    getChainSequencesFromNGLStage: function (stage) {
        var sequences = [];
        //console.log ("stage", stage);

        stage.eachComponent (function (comp) {
            sequences.push.apply (sequences, CLMSUI.NGLUtils.getChainSequencesFromNGLStructure (comp));
        });

        return sequences;
    },

    // Nice web-servicey way of doing ngl chain to clms protein matching (can be N-to-1)
    // Except it depends on having pdb codes, not a standalone file, and all the uniprot ids present too
    // Therefore, we need to return umatched sequences so we can fallback to using our own pairing algorithm if necessary
    matchPDBChainsToUniprot: function (pdbUris, nglSequences, interactorArr, callback) {

        var count = pdbUris.length;
        var dataArr = [];
        var requireXiAlign = [];
        
        /*
        function handleError(data, status) {
            console.log("error", data, status);
            var emptySequenceMap = [];
            emptySequenceMap.fail = true;
            callback(emptySequenceMap);
        }
        */

        function dealWithReturnedData (data) {
            //console.log ("DATAAA", data);
            var map = d3.map();

            $(data).find("block").each(function(i, b) {
                var segArr = $(this).find("segment[intObjectId]");
                for (var n = 0; n < segArr.length; n += 2) {
                    var id1 = $(segArr[n]).attr("intObjectId");
                    var id2 = $(segArr[n + 1]).attr("intObjectId");
                    var pdbis1 = _.includes(id1, ".") || !id1.match(CLMSUI.utils.commonRegexes.uniprotAccession);
                    var unipdb = pdbis1 ? {
                        pdb: id1,
                        uniprot: id2
                    } : {
                        pdb: id2,
                        uniprot: id1
                    };
                    map.set(unipdb.pdb + "-" + unipdb.uniprot, unipdb);
                }
            });
            // sometimes there are several blocks for the same uniprot/pdb combination so had to map then take the values to remove duplicate pairings i.e. 3C2I
            // we calculate the alignment later on, this routine is purely to pair pdb chains to our proteins via uniprot accession numbers
            var mapArr = CLMS.arrayFromMapValues(map);
            CLMSUI.utils.xilog ("PDB Service Map All", mapArr);

            if (callback) {
                var interactors = CLMSUI.modelUtils.filterOutDecoyInteractors (interactorArr);

                mapArr.forEach(function(mapping) {
                    var dotIndex = mapping.pdb.indexOf(".");
                    var chainName = dotIndex >= 0 ? mapping.pdb.slice(dotIndex + 1) : mapping.pdb.slice(-1); // bug fix 27/01/17
                    var matchSeqs = nglSequences.filter (function(seqObj) {
                        return seqObj.chainName === chainName;
                    });
                    mapping.seqObj = matchSeqs[0];
                    var matchingInteractors = interactors.filter (function (i) {
                        var minLength = Math.min(i.accession.length, mapping.uniprot.length);
                        return i.accession.substr(0, minLength) === mapping.uniprot.substr(0, minLength);
                    });
                    mapping.id = _.isEmpty(matchingInteractors) ? "none" : matchingInteractors[0].id;
                });

                requireXiAlign = mapArr.filter(function(mapping) {
                    return mapping.id === "none" && mapping.seqObj;
                });
                mapArr = mapArr.filter(function(mapping) {
                    return mapping.id !== "none" && mapping.seqObj;
                });
                CLMSUI.utils.xilog ("PDB Service Map Matched", mapArr);
                callback ({uniprotMapped: mapArr, remaining: requireXiAlign});
            }
        }
        
        pdbUris.forEach (function (pdbUri) {
            $.get("https://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query=" + pdbUri.id,
                function(data, status, xhr) {
                    if (status === "success" && (data.contentType === "text/xml" || data.contentType === "application/xml")) { // data is an xml fragment
                        dataArr.push (data);
                    } else { // usually some kind of error if reached here as we didn't detect xml
                        requireXiAlign.push (pdbUri);
                    }
                
                    count--;
                    if (count === 0) {
                        dealWithReturnedData (dataArr);
                    }
                }
            ).fail(function(jqxhr, status, error) {
                requireXiAlign.push (pdbUri);
                count--;
                if (count === 0) {
                    dealWithReturnedData (dataArr);
                }
            });
        });
        
        /*
        $.get("https://www.rcsb.org/pdb/rest/das/pdb_uniprot_mapping/alignment?query=" + pdbCode,
            function(data, status, xhr) {

                if (status === "success" && (data.contentType === "text/xml" || data.contentType === "application/xml")) { // data is an xml fragment
                    dealWithReturnedData (data);
                } else { // usually some kind of error if reached here as we didn't detect xml
                    handleError(data, status);
                }
            }
        )
        */
    },

    // Fallback protein-to-pdb chain matching routines for when we don't have a pdbcode to query the pdb web services or it's offline or we still have sequences in the pdb unmatched to proteins
    matchSequencesToExistingProteins: function (protAlignCollection, sequenceObjs, proteins, extractFunc) {
        CLMSUI.utils.xilog ("SEQS TO PAIR INTERNALLY", sequenceObjs);
        
        proteins = CLMSUI.modelUtils.filterOutDecoyInteractors (proteins)
            .filter(function(protein) {
                return protAlignCollection.get(protein.id);
            })
        ;
        var matchMatrix = {};
        var seqs = extractFunc ? sequenceObjs.map(extractFunc) : sequenceObjs;

        // Filter out repeated sequences to avoid costly realignment calculation of the same sequences
        var filteredSeqInfo = CLMSUI.modelUtils.filterRepeatedSequences(seqs);

        function finished (matchMatrix) {
            // inflate score matrix to accommodate repeated sequences that were found and filtered out above
            CLMSUI.vent.trigger("sequenceMatchingDone", CLMSUI.modelUtils.reinflateSequenceMap (matchMatrix, seqs, filteredSeqInfo));
        }

        function updateMatchMatrix(protID, alignResults) {
            var uniqScores = alignResults.map(function(indRes) {
                return indRes.avgBitScore;  //indRes.eScore;
            });
            matchMatrix[protID] = uniqScores;
        }

        var totalAlignments = filteredSeqInfo.uniqSeqs.length * proteins.length;
        CLMSUI.vent.trigger("alignmentProgress", "Attempting to match " + proteins.length + " proteins to " + seqs.length + " additional sequences.");

        var start = performance.now();
        // webworker way, only do if enough proteins and cores to make it worthwhile
        if ((!window || !!window.Worker) && proteins.length > 20 && workerpool.cpus > 2) {
            var count = proteins.length;
            var pool = workerpool.pool("js/alignWorker.js");

            proteins.forEach(function(prot, i) {
                var protAlignModel = protAlignCollection.get(prot.id);
                var settings = protAlignModel.getSettings();
                settings.aligner = undefined;
                pool.exec('protAlignPar', [prot.id, settings, filteredSeqInfo.uniqSeqs, {
                        semiLocal: true
                    }])
                    .then(function(alignResultsObj) {
                        // be careful this is async, so protID better obtained from returned object - might not be prot.id
                        updateMatchMatrix(alignResultsObj.protID, alignResultsObj.fullResults)
                    })
                    .catch(function(err) {
                        console.log(err);
                    })
                    .then(function() {
                        count--;
                        if (count % 10 === 0) {
                            CLMSUI.vent.trigger("alignmentProgress", count + " proteins remaining to align.");
                            if (count === 0) {
                                pool.terminate(); // terminate all workers when done
                                console.log("tidy pool. TIME PAR", performance.now() - start);
                                finished(matchMatrix);
                            }
                        }
                    });
            });
        }
        // else do it on main thread
        else {
            // Do alignments
            proteins.forEach(function(prot) {
                var protAlignModel = protAlignCollection.get(prot.id);
                // Only calc alignments for unique sequences, we can copy values for repeated sequences in the next bit
                var alignResults = protAlignModel.alignWithoutStoring(filteredSeqInfo.uniqSeqs, {
                    semiLocal: true
                });
                console.log("alignResults", /*alignResults,*/ prot.id); // printing alignResults uses lots of memory in console (prevents garbage collection)
                updateMatchMatrix(prot.id, alignResults)
            });

            finished(matchMatrix);
        }
    },
    
    make3DAlignID: function(baseID, chainName, chainIndex) {
        return baseID + ":" + chainName + ":" + chainIndex;
    },
    
    getProteinFromChainIndex: function(chainMap, chainIndex) {
        var entries = d3.entries(chainMap);
        var matchProts = entries.filter(function(entry) {
            return _.includes(_.pluck(entry.value, "index"), chainIndex);
        });
        return _.isEmpty(matchProts) ? null : matchProts[0].key;
    },

    // this avoids going via the ngl functions using data in a chainMap
    getChainNameFromChainIndex: function(chainMap, chainIndex) {
        var chainsPerProt = d3.values(chainMap);
        var allChains = d3.merge(chainsPerProt);
        var matchChains = allChains.filter(function(entry) {
            return entry.index === chainIndex;
        });
        return matchChains[0] ? matchChains[0].name : undefined;
    },
    
    getRangedCAlphaResidueSelectionForChain: function(chainProxy) { // chainProxy is NGL Object
        var min, max;
        chainProxy.eachResidue(function(rp) {
            var rno = rp.resno;
            if (!min || rno < min) {
                min = rno;
            }
            if (!max || rno > max) {
                max = rno;
            }
        });

        // The New Way - 0.5s vs 21.88s OLD (individual resno's rather than min-max)
        var sel = ":" + chainProxy.chainname + "/" + chainProxy.modelIndex + " AND " + min + "-" + max + ".CA";
        return sel;
    },
    
    // test to ignore short chains and those that aren't polymer chains (such as water molecules)
    isViableChain: function(chainProxy) {
        //console.log ("cp", chainProxy.entity, chainProxy.residueCount, chainProxy);
        // should be chainProxy.entity.isPolymer() but some hand-built ngl models muff these settings up
        return chainProxy.residueCount > 10 && (!chainProxy.entity || (!chainProxy.entity.isWater() && !chainProxy.entity.isMacrolide()));
    },
    
    not3DHomomultimeric: function(crossLink, chain1ID, chain2ID) {
        return chain1ID !== chain2ID || !crossLink.confirmedHomomultimer;
    },
};
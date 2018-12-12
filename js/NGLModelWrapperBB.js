var CLMSUI = CLMSUI || {};
CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

CLMSUI.BackboneModelTypes.NGLModelWrapperBB = Backbone.Model.extend({
    defaults: {
        masterModel: null,
        structureComp: null,
        chainMap: null,
        pdbBaseSeqID: null,
        linkList: null,
        fullDistanceCalcCutoff: 1200,
        allowInterModelDistances: false,
        showShortestLinksOnly: true,
    },

    initialize: function() {
        // When masterModel is declared, hang a listener on it that listens to change in alignment model as this
        // possibly changes links and distances in 3d model
        // this is in case 3d stuff has been set up before main model (used to happen that pdb's were autoloaded for some searches)
        this.listenToOnce (this, "change:masterModel", function() { // only do this once (should only happen once anyways but better safe than sorry)
            this.listenTo(this.getModel().get("alignColl"), "bulkAlignChange", function() {
                console.log("SET UP LINKS");
                this.setupLinks();
            });
        });
        
        this.listenTo (this, "change:allowInterModelDistances", function (model, val) {
            CLMSUI.vent.trigger ("changeAllowInterModelDistances", val);
        });
    },

    getModel: function() {
        return this.get("masterModel");
    },

    setupLinks: function() {
        this.calculateCAtomsAllResidues(this.getChainInfo().viableChainIndices);
        this.setFilteredLinkList ();
        var distancesObj = this.makeDistances();

        var clmsModel = this.getModel().get("clmsModel");
        // silent change and trigger, as loading in the same pdb file doesn't trigger the change automatically (as it generates an identical distance matrix)
        clmsModel
            .set("distancesObj", distancesObj, {
                silent: true
            })
            .trigger("change:distancesObj", clmsModel, clmsModel.get("distancesObj"))
        ;
        return this;
    },

    setLinkList: function (crossLinks) {
        var linkList = this.makeLinkList (crossLinks);
        var distanceObj = this.getModel().get("clmsModel").get("distancesObj");
        linkList = this.get("showShortestLinksOnly") && distanceObj ? distanceObj.getShortestLinks(linkList) : linkList;
        this.setLinkListWrapped (linkList);
        return this;
    },
    
    setFilteredLinkList: function () {
        this.setLinkList (this.getModel().getFilteredCrossLinks());
        return this;
    },


    // residueStore maps the NGL-indexed resides to PDB-index
    // so we take our alignment index --> which goes to NGL-sequence index with Alignment Collection's getAlignedIndex() --> 
    // then need to subtract 1, then --> which goes to PDB index with residueStore

    makeModelSubIndexedChainMap: function(chainMap) {
        var modelSubIndexedChainMap = {};
        d3.entries(chainMap).forEach(function(proteinEntry) {
            modelSubIndexedChainMap[proteinEntry.key] = d3.nest().key(function(d) {
                return d.modelIndex;
            }).entries(proteinEntry.value);
        });
        return modelSubIndexedChainMap;
    },
    
   

    makeLinkList: function(linkModel) {
        var structure = this.get("structureComp").structure;
        var pdbBaseSeqID = this.get("pdbBaseSeqID");
        var nextResidueId = 0;
        var structureId = null;
        var residueDict = {};
        var linkList = [];
        var residueProxy1 = structure.getResidueProxy();
        var residueProxy2 = structure.getResidueProxy();
        var chainProxy = structure.getChainProxy();
        var atomProxy = structure.getAtomProxy();
        var alignColl = this.getModel().get("alignColl");

        function getResidueId (globalNGLResIndex) {
            // TODO add structureId to key
            // TODO in NMR structures there are multiple models // mjg - chainIndex is unique across models
            if (residueDict[globalNGLResIndex] === undefined) {
                residueDict[globalNGLResIndex] = nextResidueId;
                nextResidueId++;
            }
            return residueDict[globalNGLResIndex];
        }
        
        function makeResidueObj (resIndex, chainIndex, residueProxy, structureID) {
            var ri = residueProxy.index;
            return {
                globalIndex: ri,
                resindex: resIndex,
                residueId: getResidueId (ri),
                resno: residueProxy.resno, // ngl resindex to resno conversion, as Selection() works with resno not resindex
                chainIndex: chainIndex,
                modelIndex: residueProxy.modelIndex,
                structureId: structureID    
            };
        }
        
        function addAtomPoints (pdbIndexedResidues) {
            pdbIndexedResidues.forEach (function (fat) {
                var atomIndex = this.getAtomIndex (fat.seqIndex, fat.chainIndex);
                fat.atomIndex = atomIndex;
                atomProxy.index = atomIndex;
                var coords = this.getAtomCoordinates (atomProxy);
                fat.coords = coords;
            }, this);
        }
        
        function makePDBIndexedResidues (perModelChainEntry, searchIndexResidue, protID) {
            var PDBResidues = perModelChainEntry.values.map (function (chainValue) {
                var chainIndex = chainValue.index;
                return {chainIndex: chainIndex, modelIndex: chainValue.modelIndex, seqIndex: alignColl.getAlignedIndex (searchIndexResidue, protID, false, CLMSUI.modelUtils.make3DAlignID (pdbBaseSeqID, chainValue.name, chainIndex), true) - 1}; // residues are 0-indexed in NGL so -1
            }).filter (function (datum) {
               return datum.seqIndex >= 0;
            });
            return PDBResidues;
        }
        
        function addExtraInfo (pdbIndexedResidue, residueProxy) {
            var ri = residueProxy.index;
            pdbIndexedResidue.globalIndex = ri;
            pdbIndexedResidue.resindex = pdbIndexedResidue.seqIndex;
            pdbIndexedResidue.residueId = getResidueId (ri);
            pdbIndexedResidue.resno = residueProxy.resno;   // ngl resindex to resno conversion, as NGL.Selection() works with resno values
            pdbIndexedResidue.structureId = null;
        }

        var t = performance.now();
        var chainMap = this.get("chainMap");
        // divide protein --> chain map into protein --> model --> chain map, we don't want to make links between different models
        var modelIndexedChainMap = this.makeModelSubIndexedChainMap(chainMap);
        var chainModelMapMap = d3.map();
        var chainValueMap = d3.map();
        d3.entries(chainMap).forEach (function (protEntry) { chainValueMap.set (protEntry.key, {values: protEntry.value}); });
        d3.entries(modelIndexedChainMap).forEach (function (protEntry) { 
            chainModelMapMap.set (protEntry.key, d3.map (protEntry.value, function(d) { return d.key; }));
        });
        var allowInterModelDistances = this.get("allowInterModelDistances");
        console.log ("chainValueMap", chainValueMap, modelIndexedChainMap);
        var octAccessorObj = {
            id: function (d) { return d; },
            x: function (d) { return d.coords[0]; },
            y: function (d) { return d.coords[1]; },
            z: function (d) { return d.coords[2]; },
        };

        linkModel.forEach (function (xlink) {
            // loop through fromProtein's models/chains in modelIndexedChainMap
            // Within that have an inner loop through toProtein's models/chains in modelIndexedChainMap
            // Match by model index so can't have crosslinks between different models
            var fromProtID = xlink.fromProtein.id;
            var toProtID = xlink.toProtein.id;
            var fromPerModelChains = allowInterModelDistances ? [chainValueMap.get(fromProtID)] : modelIndexedChainMap[fromProtID];
            var toPerModelChains = modelIndexedChainMap[toProtID];

            if (!_.isEmpty(fromPerModelChains) && !_.isEmpty(toPerModelChains)) {
                
                // get a map (key -> value) of the toPerModelChains entries 
                var toPerModelChainMap = chainModelMapMap.get (toProtID);
                var toChainMap = chainValueMap.get (toProtID); 
                    
                fromPerModelChains.forEach (function (fromPerModelChainEntry) {
                    var toChains = allowInterModelDistances ? toChainMap : toPerModelChainMap.get (fromPerModelChainEntry.key);  // bar possible crosslinks between models
                    if (toChains) { // don't proceed if inter model distances barred and no 'to' chains within current model
                        
                        var fromPDBResidues = makePDBIndexedResidues (fromPerModelChainEntry, xlink.fromResidue, fromProtID);
                        var toPDBResidues = makePDBIndexedResidues (toChains, xlink.toResidue, toProtID);
                        //console.log (fromPDBResidues, toPDBResidues);
                        
                        var alternativeCount = fromPDBResidues.length * toPDBResidues.length;
                        if (alternativeCount > 4) {
                            addAtomPoints.call (this, fromPDBResidues);
                            addAtomPoints.call (this, toPDBResidues);
                            var results = this.getMinimumDistance (fromPDBResidues, toPDBResidues, octAccessorObj, 200, xlink);
                            results.forEach (function (r) { r[2] = CLMSUI.utils.toNearest (r[2], 1); });
                            results.sort (function (a,b) {
                                var d = a[2] - b[2];
                                if (!d) {
                                    d = (a[0].modelIndex + a[1].modelIndex) - (b[0].modelIndex + b[1].modelIndex);
                                    if (!d) {
                                        d = (a[0].chainIndex + a[1].chainIndex) - (b[0].chainIndex + b[1].chainIndex);
                                        if (!d) {
                                            d = Math.min(a[0].chainIndex, a[1].chainIndex) - Math.min(b[0].chainIndex, b[1].chainIndex);
                                        }
                                    }
                                }
                                return d;
                            });
                            //console.log ("aa", alternativeCount, results);
                            fromPDBResidues = [results[0][0]];  // take top result for new fromPDBResidues array
                            toPDBResidues = [results[0][1]];    // take top result for new toPDBResidues array
                        }
                        
                        if (alternativeCount > 0) {
                        
                            fromPDBResidues.forEach (function (residueObj) {
                                chainProxy.index = residueObj.chainIndex;
                                residueProxy1.index = residueObj.seqIndex + chainProxy.residueOffset;
                                addExtraInfo (residueObj, residueProxy1);
                            }, this);

                            toPDBResidues.forEach (function (residueObj) {
                                chainProxy.index = residueObj.chainIndex;
                                residueProxy1.index = residueObj.seqIndex + chainProxy.residueOffset;
                                addExtraInfo (residueObj, residueProxy1);
                            }, this);

                            fromPDBResidues.forEach (function (fromPDB) {
                                //chainProxy.index = fromPDB.chainIndex;
                                //residueProxy1.index = fromPDB.seqIndex + chainProxy.residueOffset;

                                toPDBResidues.forEach (function (toPDB) {

                                    if (CLMSUI.modelUtils.not3DHomomultimeric (xlink, toPDB.chainIndex, fromPDB.chainIndex)) {
                                        //chainProxy.index = toPDB.chainIndex;
                                        //residueProxy2.index = toPDB.seqIndex + chainProxy.residueOffset;

                                        linkList.push({
                                            origId: xlink.id,
                                            linkId: linkList.length,
                                            residueA: fromPDB,
                                            residueB: toPDB,
                                            //residueA: makeResidueObj (fromPDB.seqIndex, fromPDB.chainIndex, residueProxy1, structureId),
                                            //residueB: makeResidueObj (toPDB.seqIndex, toPDB.chainIndex, residueProxy2, structureId),
                                        });
                                    }
                                }, this);
                            }, this);
                        }
                    }
                }, this);
            }
        }, this);

        console.log ("TIME", (performance.now() - t) / 1000, "seconds");
        console.log("linklist", linkList.length, linkList);
        return linkList;
    },

    setLinkListWrapped: function(linkList) {
        var residueIdToLinkIds = {};
        var linkIdMap = {};
        var residueIdMap = {};

        function insertResidue(residue, link) {
            var resID = residue.residueId;
            var list = residueIdToLinkIds[resID];
            if (list === undefined) {
                residueIdToLinkIds[resID] = [link.linkId];
            } else if (!_.includes(list, link.linkId)) {
                list.push(link.linkId);
            }
            residueIdMap[resID] = residue;
        }

        linkList.forEach(function(rl) {
            linkIdMap[rl.linkId] = rl;
            insertResidue(rl.residueA, rl);
            insertResidue(rl.residueB, rl);
        });

        var residueList = d3.values(residueIdMap);

        this._residueIdToLinkIds = residueIdToLinkIds;
        this._linkIdMap = linkIdMap;
        this._residueIdMap = residueIdMap;
        this._residueList = residueList;
        //console.log ("setLinkList", residueIdMap, residueList, residueIdToLinkIds, linkIdMap);

        this.set("linkList", linkList);
    },

    getLinks: function(residue) {
        if (residue === undefined) {
            return this.get("linkList");
        } else {
            var linkIds = this._residueIdToLinkIds[residue.residueId];
            return linkIds ? linkIds.map(function(l) {
                return this._linkIdMap[l];
            }, this) : [];
        }
    },

    getResidues: function(link) {
        if (link === undefined) {
            return this._residueList;
        } else if (Array.isArray(link)) {
            var residues = [];
            link.forEach(function(l) {
                residues.push(l.residueA, l.residueB); // push two values at once so don't use .map
            });
            return residues;
        } else {
            return [link.residueA, link.residueB];
        }
    },

    getSharedLinks: function(residueA, residueB) {
        var aLinks = this.getLinks (residueA);
        var bLinks = this.getLinks (residueB);
        var sharedLinks = CLMSUI.modelUtils.intersectObjectArrays (aLinks, bLinks, function(l) {
            return l.linkId;
        });
        return sharedLinks.length ? sharedLinks : false;
    },

    findResidues: function (nglGlobalResidueIndex) {
        var residues = this.getResidues().filter(function(r) {
            return r.globalIndex === nglGlobalResidueIndex;
        });
        console.log("find r", nglGlobalResidueIndex, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function(residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function(link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    },

    makeDistances: function() {
        return new CLMSUI.DistancesObj (this.getDistances(), this.get("chainMap"), this.get("pdbBaseSeqID"));
    },

    // The point of this is to build a distances cache so we don't have to keep asking the ngl components for them
    // For very large structures we just store the distances that map to crosslinks, so we have to get other distances by reverting to the ngl stuff
    // generally at CLMSUI.modelUtils.get3DDistance
    getDistances: function() {
        var chainInfo = this.getChainInfo();
        this.calculateCAtomsAllResidues(chainInfo.viableChainIndices);
        return this.getChainDistances(chainInfo.resCount > this.defaults.fullDistanceCalcCutoff);
    },

    getChainInfo: function() {
        var resCount = 0;
        var viableChainIndices = [];
        var self = this;
        //console.log ("strcutcomp", this.get("structureComp").structure);
        this.get("structureComp").structure.eachChain(function(cp) {
            // Don't include chains which are tiny or ones we can't match to a protein
            if (CLMSUI.modelUtils.isViableChain(cp) && CLMSUI.modelUtils.getProteinFromChainIndex(self.get("chainMap"), cp.index)) {
                resCount += cp.residueCount;
                viableChainIndices.push(cp.index);
            }
        });
        return {
            viableChainIndices: viableChainIndices,
            resCount: resCount
        };
    },

    calculateCAtomsAllResidues: function(chainIndices) {
        var chainProxy = this.get("structureComp").structure.getChainProxy();
        var atomProxy = this.get("structureComp").structure.getAtomProxy();
        var sele = new NGL.Selection();
        var chainCAtomIndices = {}; // keys on chain index, and within this keys on residue index
        var self = this;

        if (chainIndices) {
            chainIndices.forEach(function(ci) {
                chainProxy.index = ci;
                var atomIndices = chainCAtomIndices[ci] = [];
                // 918 in 5taf matches to just one atom, which isn't a carbon, dodgy pdb?

                var sel = self.getCAlphaAtomSelectionForChain(chainProxy);
                sele.setString(sel, true); // true = doesn't fire unnecessary dispatch events in ngl
                var ai = this.get("structureComp").structure.getAtomIndices(sele);

                // Building a resmap in one loop and then running through available residues in another loop because some (errored) residues don't have c-alpha atoms
                // This shouldn't happen, but it does i.e. 5taf, so a 1-to-1 loop between residues and atomIndices wouldn't work in all cases
                var resMap = [];
                ai.forEach(function(atomIndex) {
                    atomProxy.index = atomIndex;
                    resMap[atomProxy.resno] = atomIndex;
                }, this);

                // resno can run from N to M, but atomIndices will be ordered 0 to no. of residues
                chainProxy.eachResidue(function(rp) {
                    //console.log ("RP", rp.resno, rp.index);
                    var atomIndex = resMap[rp.resno];
                    atomIndices.push(atomIndex);
                });
            }, this);
        }

        this.set("chainCAtomIndices", chainCAtomIndices); // store for later
        return chainCAtomIndices;
    },

    getChainDistances: function (linksOnly) {
        var chainCAtomIndices = this.get("chainCAtomIndices");
        var keys = d3.keys(chainCAtomIndices);

        var matrixMap = {};
        var links = this.getLinks();

        keys.forEach (function (chain1) {
            for (var m = 0; m < keys.length; m++) {
                var chain2 = keys[m];
                var cindices1 = chainCAtomIndices[chain1];
                var cindices2 = chainCAtomIndices[chain2];
                matrixMap[chain1 + "-" + chain2] = {
                    chain1: chain1,
                    chain2: chain2,
                    isSymmetric: chain1 === chain2,
                    linksOnly: linksOnly,
                    size: [cindices1.length, cindices2.length],
                    distanceMatrix: linksOnly ?
                        this.getLinkDistancesBetween2Chains(cindices1, cindices2, +chain1, +chain2, links) :
                        this.getAllDistancesBetween2Chains(cindices1, cindices2, chain1, chain2)
                };
            }
        }, this);

        return matrixMap;
    },

    getChainLength: function(chainIndex) {
        var chain = this.get("chainCAtomIndices")[chainIndex];
        return chain ? chain.length : undefined;
    },

    notHomomultimeric: function(xlinkID, c1, c2) {
        var xlink = this.getModel().get("clmsModel").get("crossLinks").get(xlinkID);
        return CLMSUI.modelUtils.not3DHomomultimeric(xlink, c1, c2);
    },

    getLinkDistancesBetween2Chains: function(chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2, links) {
        links = links.filter(function(link) {
            return (link.residueA.chainIndex === chainIndex1 && link.residueB.chainIndex === chainIndex2 && this.notHomomultimeric(link.origId, chainIndex1, chainIndex2))
            /*||
                           (link.residueA.chainIndex === chainIndex2 && link.residueB.chainIndex === chainIndex1)*/
            ;
            // The reverse match condition produced erroneous links i.e. link chain3,49 to chain 2,56 also passed chain3,56 to chain2,49
        }, this);

        var matrix = [];
        var struc = this.get("structureComp").structure;
        var ap1 = struc.getAtomProxy();
        var ap2 = struc.getAtomProxy();

        links.forEach(function(link) {
            var idA = link.residueA.resindex;
            var idB = link.residueB.resindex;
            ap1.index = chainAtomIndices1[idA];
            ap2.index = chainAtomIndices2[idB];
            if (ap1.index !== undefined && ap2.index !== undefined) {
                var d = this.getAtomProxyDistance(ap1, ap2);
                //console.log ("link", link, chainIndex1, chainIndex2, idA, idB, ap1.index, ap2.index, d);
                matrix[idA] = matrix[idA] || [];
                matrix[idA][idB] = matrix[idA][idB] || [];
                matrix[idA][idB] = d;
            }
        }, this);

        return matrix;
    },

    getAllDistancesBetween2Chains: function(chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2) {
        var matrix = [];
        var struc = this.get("structureComp").structure;
        var ap1 = struc.getAtomProxy();
        var ap2 = struc.getAtomProxy();
        var cai2length = chainAtomIndices2.length;
        var diffChains = (chainIndex1 !== chainIndex2);

        for (var n = 0; n < chainAtomIndices1.length; n++) {
            ap1.index = chainAtomIndices1[n];
            var ap1undef = (ap1.index === undefined);
            var row = matrix[n] = [];
            for (var m = 0; m < cai2length; m++) {
                if (m !== n || diffChains) {
                    ap2.index = chainAtomIndices2[m];
                    row.push((ap1undef || ap2.index === undefined) ? undefined : this.getAtomProxyDistance(ap1, ap2));
                } else {
                    row.push(0);
                }
            }
        }

        return matrix;
    },
    
    getDistanceSquared: function (coords1, coords2) {
        var d2 = 0;
        for (var n = 0; n < coords1.length; n++) {
            var diff = coords1[n] - coords2[n];
            d2 += diff * diff;
        }
        return d2;
    },
    
    getAtomCoordinates: function (atomProxy) {
        return [atomProxy.x, atomProxy.y, atomProxy.z];
    },

    getAtomProxyDistance: function (ap1, ap2) {
        return ap1.modelIndex === ap2.modelIndex || this.get("allowInterModelDistances") ? ap1.distanceTo(ap2) : undefined;
    },

    // Residue indexes for this function start from zero per chain i.e. not global NGL index for residues
    getAtomIndex: function (resIndex, chainIndex, chainAtomIndices) {
        var cai = chainAtomIndices || this.get("chainCAtomIndices");
        var ci = cai[chainIndex];
        var ai = ci[resIndex];      
        return ai;
    },
    
    // resIndex1 and 2 are 0-indexed, with zero being first residue in pdb chain
    getSingleDistanceBetween2Residues: function(resIndex1, resIndex2, chainIndex1, chainIndex2) {
        var struc = this.get("structureComp").structure;
        var ap1 = struc.getAtomProxy();
        var ap2 = struc.getAtomProxy();
        var cai = this.get("chainCAtomIndices");
        ap1.index = this.getAtomIndex (resIndex1, chainIndex1, cai);
        ap2.index = this.getAtomIndex (resIndex2, chainIndex2, cai);

        return this.getAtomProxyDistance(ap1, ap2);
    },

    getCAlphaAtomSelectionForChain: function(chainProxy) {
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


    getSelectionFromResidueList: function(resnoList, options) { // set allAtoms to true to not restrict selection to alpha carbon atoms
        // options are 
        // allAtoms:true to not add on the AND .CA qualifier
        // chainsOnly:true when the resnoList only has chainIndices defined and no res
        options = options || {};
        var sele;

        // If no resnoList or is empty array make selection 'none'
        if (!resnoList || (Array.isArray(resnoList) && !resnoList.length)) {
            sele = "none";
        } else {
            // if resnoList == 'all' replace it with array of all residues
            if (resnoList === "all") {
                resnoList = this.crosslinkData.getResidues();
            }

            // if resnoList is single item, make it an array of the single item
            if (!Array.isArray(resnoList)) {
                resnoList = [resnoList];
            }

            var cp = this.get("structureComp").structure.getChainProxy();

            // new way (faster ngl interpretation for big selections!)
            var modelTree = d3.map();
            var tmp = resnoList.map(function(r) {
                cp.index = r.chainIndex;

                // Make a hierarchy of models --> chains --> residues to build a string from later
                var modelBranch = modelTree.get(cp.modelIndex);
                if (!modelBranch) {
                    var a = new d3.map();
                    modelTree.set(cp.modelIndex, a);
                    modelBranch = a;
                }

                var chainBranch = modelBranch.get(cp.chainname);
                if (!chainBranch) {
                    var a = new d3.set();
                    modelBranch.set(cp.chainname, a);
                    chainBranch = a;
                }

                chainBranch.add(r.resno);

                // randomiser
                /*
                var rsele = Math.ceil (Math.random() * cp.residueCount);    // random for testing
                chainBranch.add (rsele);
                if (cp.chainname) { rsele += ":" + cp.chainname; }
                if (cp.modelIndex !== undefined) { rsele += "/" + cp.modelIndex; }
                return rsele;
                */
            });

            //sele = "( " + tmp.join(" OR ") + " ) AND .CA";    // old way, much slower parsing by ngl -4500ms for 3jco
            //console.log ("sele", sele);  
            //console.log ("MODELTREE", modelTree);

            // Build an efficient selection string out of this tree i.e. don't repeat model and chain values for
            // every residue, group the relevant residues together and surround with a bracket
            var modParts = modelTree.entries().map(function(modelEntry) {
                var modelBranch = modelEntry.value;
                var perChainResidues = modelBranch.entries().map(function(chainEntry) {
                    var chainBranch = chainEntry.value;
                    // selection syntax picks up ":123" as residue 123 in chain "empty name", but ": AND 123" doesn't work. 
                    // Similarly ":/0 " works but "/0 AND :" doesn't.
                    // Shouldn't have many pdbs with empty chain names though.
                    if (chainEntry.key) {
                        var vals = chainBranch.values();
                        if (options.chainsOnly) {
                            return ":" + chainEntry.key;
                        } else if (vals.length === 1) {
                            return "( " + vals[0] + ":" + chainEntry.key + " )"; // if single val, chain:resno is quicker
                        } else {
                            vals = this.joinConsecutiveNumbersIntoRanges(vals);
                            return "( :" + chainEntry.key + " AND (" + vals.join(" OR ") + ") )";
                        }
                    } else {
                        if (options.chainsOnly) {
                            return ":/" + modelEntry.key;
                        }
                        var emptyChainNameRes = chainBranch.values().map(function(resVal) {
                            return resVal + ":";
                        });
                        return "( " + emptyChainNameRes.join(" OR ") + " )";
                    }
                }, this);
                return "( /" + modelEntry.key + " AND (" + perChainResidues.join(" OR ") + ") )";
            }, this);

            sele = "(" + modParts.join(" OR ") + " )" + (options.allAtoms || options.chainsOnly ? "" : " AND .CA");
            if (NGL.Debug) {
                console.log("SELE", sele);
            }
        }

        return sele;
    },

    // assumes vals are already sorted numerically (though each val is a string)
    joinConsecutiveNumbersIntoRanges: function (vals, joinString) {
        joinString = joinString || "-";

        if (vals && vals.length > 1) {
            var newVals = [];
            var last = +vals[0],
                start = +vals[0],
                run = 1; // initialise variables to first value

            for (var n = 1; n < vals.length + 1; n++) { // note + 1
                // add extra loop iteration using MAX_SAFE_INTEGER as last value.
                // loop will thus detect non-consecutive numbers on last iteration and output the last proper value in some form.
                var v = (n < vals.length ? +vals[n] : Number.MAX_SAFE_INTEGER);
                if (v - last === 1) { // if consecutive to last number just increase the run length
                    run++;
                } else { // but if not consecutive to last number...
                    // add the previous numbers either as a sequence (if run > 1) or as a single value (last value was not part of a sequence itself)
                    newVals.push(run > 1 ? start + joinString + last : last.toString());
                    run = 1; // then reset the run and start variables to begin at current value
                    start = v;
                }
                last = v; // make last value the current value for next iteration of loop
            }

            //CLMSUI.utils.xilog ("vals", vals, "joinedVals", newVals);
            vals = newVals;
        }
        return vals;
    },

    _getAtomIndexFromResidueObj: function (resObj) {
        var resno = resObj.resno;
        return resno !== undefined ? this.getAtomIndex (resObj.resindex, resObj.chainIndex) : undefined;
    },

    getFirstAtomPerChainSelection: function(chainIndexSet) {
        var comp = this.get("structureComp").structure;
        var sels = [];
        comp.eachChain(function(cp) {
            // if chain longer than 10 resiudes and (no chainindexset present or chain index is in chainindexset)
            if (CLMSUI.modelUtils.isViableChain(cp) && (!chainIndexSet || chainIndexSet.has(cp.index))) {
                sels.push(cp.atomOffset);
            }
        });
        return "@" + sels.join(",");
    },

    // Get a NGL selection for chains listing only the chainIndices passed in as a property of chainItems
    getChainSelection: function(chainItems) {
        var selectionString = "all";
        var showAll = chainItems.showAll || false;
        var chainIndices = chainItems.chainIndices || [];

        if (!showAll) {
            var chainList = chainIndices.map(function(chainIndex) {
                return {
                    chainIndex: chainIndex
                };
            });
            selectionString = this.getSelectionFromResidueList(chainList, {
                chainsOnly: true
            });
        }

        //CLMSUI.utils.xilog ("CHAIN SELE", selectionString);
        return selectionString;
    },

    // Return chain indices covered by currently visible proteins
    getShowableChains: function(showAll) {
        var protMap = CLMS.arrayFromMapValues(this.getModel().get("clmsModel").get("participants"));
        var prots = Array.from(protMap).filter(function(prot) {
            return !prot.hidden;
        }).map(function(prot) {
            return prot.id;
        });

        var chainIndices;
        if (protMap.length !== prots.length && !showAll) {
            chainIndices = prots.map(function(prot) {
                var protChains = this.get("chainMap")[prot] || [];
                return _.pluck(protChains, "index");
            }, this);
        } else {
            chainIndices = d3.entries(this.get("chainMap")).map(function(chainEntry) {
                return _.pluck(chainEntry.value, "index");
            });
        }
        chainIndices = d3.merge(chainIndices);
        CLMSUI.utils.xilog("SHOW CHAINS", chainIndices);
        return {
            showAll: showAll,
            chainIndices: chainIndices
        };
    },
    
    
    getMinimumDistance: function (points1, points2, accessorObj, maxDistance, xlink) {
        
        accessorObj = accessorObj || {};
        var points1Bigger = points1.length > points2.length;
        
        var bigPointArr = points1Bigger ? points1 : points2;
        var smallPointArr = points1Bigger ? points2 : points1;
        var octree = d3.octree ();
        octree
            .x(accessorObj.x || octree.x())
            .y(accessorObj.y || octree.y())
            .z(accessorObj.z || octree.z())
            .addAll (bigPointArr)
        ;
        
        maxDistance = maxDistance || 200;
        var ignoreFunc = function (point, treePoint) {
            return CLMSUI.modelUtils.not3DHomomultimeric (xlink, point.chainIndex, treePoint.chainIndex);
        };
        
        var nearest = smallPointArr.map (function (point) {
            return octree.find (octree.x()(point), octree.y()(point), octree.z()(point), maxDistance, point, ignoreFunc);
        });
        var dist = smallPointArr.map (function (point, i) {
            return this.getDistanceSquared (point.coords, nearest[i].coords);
        }, this);
        
        return d3.zip (points1Bigger ? nearest : smallPointArr, points1Bigger ? smallPointArr : nearest, dist);
    },
});
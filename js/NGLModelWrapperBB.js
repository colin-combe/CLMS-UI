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
        var chainInfo = this.getChainInfo();
        this.calculateCAtomsAllResidues(chainInfo.viableChainIndices);
        this.setFilteredLinkList ();

        // The point of this is to build a distances cache so we don't have to keep asking the ngl components for them
        // For very large structures we just store the distances that map to crosslinks, so we have to get other distances by reverting to the ngl stuff
        // generally at CLMSUI.modelUtils.get3DDistance
        var distances = this.getChainDistances(chainInfo.resCount > this.defaults.fullDistanceCalcCutoff);
        var distancesObj = new CLMSUI.DistancesObj (distances, this.get("chainMap"), this.get("pdbBaseSeqID"));

        var clmsModel = this.getModel().get("clmsModel");
        // silent change and trigger, as loading in the same pdb file doesn't trigger the change automatically (as it generates an identical distance matrix)
        clmsModel
            .set("distancesObj", distancesObj, {silent: true})
            .trigger("change:distancesObj", clmsModel, clmsModel.get("distancesObj"))
        ;
        return this;
    },
    
    setFilteredLinkList: function () {
        this.setLinkList (this.getModel().getFilteredCrossLinks());
        return this;
    },
    
    setLinkList: function (crossLinks) {
        var linkDataObj = this.makeLinkList (crossLinks);
        var distanceObj = this.getModel().get("clmsModel").get("distancesObj");
        if (this.get("showShortestLinksOnly") && distanceObj) {
            linkDataObj.fullLinkList = distanceObj.getShortestLinks(linkDataObj.fullLinkList);
        }
        this.setLinkListWrapped (linkDataObj);
        return this;
    },
   
    makeLinkList: function(linkModel) {
        var structure = this.get("structureComp").structure;
        var pdbBaseSeqID = this.get("pdbBaseSeqID");
        var nextResidueId = 0;
        var structureId = null;
        var residueDict = {};
        var fullLinkList = [];  // links where both ends are in pdb
        var halfLinkList = [];  // links where one end is in the pdb
        var residueProxy1 = structure.getResidueProxy();
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
            if (perModelChainEntry) {
                return perModelChainEntry.values.map (function (chainValue) {
                    var chainIndex = chainValue.index;
                    var alignID = CLMSUI.NGLUtils.make3DAlignID (pdbBaseSeqID, chainValue.name, chainIndex);
                    return {
                        chainIndex: chainIndex, 
                        modelIndex: chainValue.modelIndex, 
                        seqIndex: alignColl.getAlignedIndex (searchIndexResidue, protID, false, alignID, true) - 1,  // residues are 0-indexed in NGL so -1
                    };
                }).filter (function (datum) {
                   return datum.seqIndex >= 0;
                });
            }
            return [];
        }
        
        // add extra info to a residue object that's handy later on
        function addResidueExtraInfo (pdbIndexedResidue, residueProxy) {
            var ri = residueProxy.index;
            pdbIndexedResidue.globalIndex = ri;
            pdbIndexedResidue.resindex = pdbIndexedResidue.seqIndex;
            pdbIndexedResidue.residueId = getResidueId (ri);
            pdbIndexedResidue.resno = residueProxy.resno;   // ngl resindex to resno conversion, as NGL.Selection() works with resno values
            pdbIndexedResidue.structureId = null;
        }
        
        // call the previous function with the contents of an array of arrays
        // usually the to and from residues object lists
        function addResidueListsExtraInfo (residueObjLists) {
            residueObjLists.forEach (function (residueObjList) {
                residueObjList.forEach (function (residueObj) {
                    chainProxy.index = residueObj.chainIndex;
                    residueProxy1.index = residueObj.seqIndex + chainProxy.residueOffset;
                    addResidueExtraInfo (residueObj, residueProxy1);
                }, this);
            });
        }
        
        function addToHalfLinkList (crossLink, residueObjList) {
            residueObjList.forEach (function (residueObj) {
                halfLinkList.push ({
                    origId: crossLink.id,
                    linkId: halfLinkList.length,
                    residue: residueObj,
                });
            }, this);
        }

        var t = performance.now();
        var chainMap = this.get("chainMap");
        // divide protein --> chain map into protein --> model --> chain map, we don't want to make links between different models
        var modelIndexedChainMap = CLMSUI.modelUtils.makeSubIndexedMap(chainMap, "modelIndex");
        
        // d3.mapped and wrapped versions of chainMap and modelIndexedChainMap. Easier to use for some operations.
        var chainValueMap = d3.map(); 
        var chainModelMapMap = d3.map();
        d3.entries(chainMap).forEach (function (protEntry) { 
            chainValueMap.set (protEntry.key, {values: protEntry.value}); 
        });
        d3.entries(modelIndexedChainMap).forEach (function (protEntry) { 
            chainModelMapMap.set (protEntry.key, d3.map (protEntry.value, function(d) { return d.key; }));
        });

        var allowInterModelDistances = this.get("allowInterModelDistances");
        console.log ("chainValueMap", chainValueMap, chainModelMapMap, modelIndexedChainMap);
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

            var fromEmpty = _.isEmpty(fromPerModelChains);
            var toEmpty = _.isEmpty(toPerModelChains);
            // Don't continue if neither end of crosslink within pdb
            if (!fromEmpty && !toEmpty) {
                
                // get a map (key -> value) of the toPerModelChains entries 
                var toPerModelChainMap = chainModelMapMap.get (toProtID);
                var toChainMap = chainValueMap.get (toProtID); 
                
                var octreeIgnoreFunc = function (point1, point2) {
                    return CLMSUI.modelUtils.not3DHomomultimeric (xlink, point1.chainIndex, point2.chainIndex);
                };
                    
                fromPerModelChains.forEach (function (fromPerModelChainEntry) {
                    var toChains = allowInterModelDistances ? toChainMap : toPerModelChainMap.get (fromPerModelChainEntry.key);  // bar possible crosslinks between models
                    
                    //console.log ("XLINK CHAINS", fromPerModelChains, toPerModelChains);
                    
                    if (toChains) { // don't proceed if inter model distances barred and no 'to' chains within current model
                        
                        var fromPDBResidues = makePDBIndexedResidues (fromPerModelChainEntry, xlink.fromResidue, fromProtID);
                        var toPDBResidues = makePDBIndexedResidues (toChains, xlink.toResidue, toProtID);
                        //console.log (fromPDBResidues, toPDBResidues);
                        
                        var alternativeCount = fromPDBResidues.length * toPDBResidues.length;
                        if (alternativeCount > 4) {
                            addAtomPoints.call (this, fromPDBResidues);
                            addAtomPoints.call (this, toPDBResidues);
                            var results = CLMSUI.modelUtils.getMinimumDistance (fromPDBResidues, toPDBResidues, octAccessorObj, 200, octreeIgnoreFunc);
                            results.forEach (function (r) { r[2] = CLMSUI.utils.toNearest (r[2], 1); });
                            var prime = results[0];
                            results.forEach (function (res) {
                                var d = prime[2] - res[2];
                                if (d === 0) {
                                    d = (prime[0].modelIndex + prime[1].modelIndex) - (res[0].modelIndex + res[1].modelIndex);
                                    if (d === 0) {
                                        d = (prime[0].chainIndex + prime[1].chainIndex) - (res[0].chainIndex + res[1].chainIndex);
                                        if (d === 0) {
                                            d = Math.min(prime[0].chainIndex, prime[1].chainIndex) - Math.min(res[0].chainIndex, res[1].chainIndex);
                                        }
                                    }
                                }
                                if (d > 0) {
                                    prime = res;
                                }
                            });

                            //console.log ("aa", alternativeCount, results);
                            fromPDBResidues = [prime[0]];  // take top result for new fromPDBResidues array
                            toPDBResidues = [prime[1]];    // take top result for new toPDBResidues array
                        }
                        
                        addResidueListsExtraInfo ([fromPDBResidues, toPDBResidues]);
                        
                        if (alternativeCount > 0) {
                            fromPDBResidues.forEach (function (fromPDB) {
                                toPDBResidues.forEach (function (toPDB) {
                                    if (CLMSUI.modelUtils.not3DHomomultimeric (xlink, toPDB.chainIndex, fromPDB.chainIndex)) {
                                        fullLinkList.push({
                                            origId: xlink.id,
                                            linkId: fullLinkList.length,
                                            residueA: fromPDB,
                                            residueB: toPDB,
                                        });
                                    }
                                }, this);
                            }, this);
                        } else {
                            // one or more of the residues isn't within a pdb-indexed portion of the protein
                            addToHalfLinkList (xlink, fromPDBResidues);
                            addToHalfLinkList (xlink, toPDBResidues);
                        }
                    }
                }, this);
            } else if (!toEmpty || !fromEmpty) {    // only one end of link in a pdb-indexed protein
                var toChains = chainValueMap.get (toProtID); 
                var fromChains = chainValueMap.get (fromProtID); 
                
                // One of these residue lists will be empty
                var fromPDBResidues = makePDBIndexedResidues (fromChains, xlink.fromResidue, fromProtID);
                var toPDBResidues = makePDBIndexedResidues (toChains, xlink.toResidue, toProtID);
                addResidueListsExtraInfo ([fromPDBResidues, toPDBResidues]);
                addToHalfLinkList (xlink, fromPDBResidues);
                addToHalfLinkList (xlink, toPDBResidues);
            }
        }, this);

        console.log ("TIME", (performance.now() - t) / 1000, "seconds");
        //console.log ("linklist", linkList.length, linkList);
        //console.log ("halfLinkList", halfLinkList);
        return {fullLinkList: fullLinkList, halfLinkList: halfLinkList};
    },

    setLinkListWrapped: function (linkDataObj) {
        var linkList = linkDataObj.fullLinkList;
        var halfLinkList = linkDataObj.halfLinkList;
        var residueIdToFullLinkIds = {};
        var residueIdToHalfLinkIds = {};
        var linkIdMap = {};
        var halfLinkIdMap = {};
        var residueIdMap = {};
        
        halfLinkList.forEach (function (halfLink) {
            halfLinkIdMap[halfLink.linkId] = halfLink;
            insertResidue(halfLink.residue, halfLink, residueIdToHalfLinkIds);
        });
        
        function insertResidue (residue, link, map) {
            var resID = residue.residueId;
            var list = map[resID];
            if (list === undefined) {
                map[resID] = [link.linkId];
            } else if (!_.includes(list, link.linkId)) {
                list.push(link.linkId);
            }
            residueIdMap[resID] = residue;
        }

        linkList.forEach(function(link) {
            linkIdMap[link.linkId] = link;
            insertResidue(link.residueA, link, residueIdToFullLinkIds);
            insertResidue(link.residueB, link, residueIdToFullLinkIds);
        });

        // Useful maps for later work
        this._residueIdToFullLinkIds = residueIdToFullLinkIds;
        this._residueIdToHalfLinkIds = residueIdToHalfLinkIds;
        this._linkIdMap = linkIdMap;
        this._halfLinkIdMap = halfLinkIdMap;
        this._residueIdMap = residueIdMap;
        this._residueList = d3.values(residueIdMap);
        this._residueNGLIndexMap = _.indexBy (this._residueList, "globalIndex");
        this._fullLinkNGLIndexMap = {};
        linkList.forEach (function (link) {
            this._fullLinkNGLIndexMap[link.residueA.globalIndex+"-"+link.residueB.globalIndex] = link;
        }, this);
        this._origFullLinkCount = this.getOriginalCrossLinkCount (linkList);
        this._origHalfLinkCount = this.getOriginalCrossLinkCount (halfLinkList);
        
        //console.log ("setLinkList", residueIdMap, this._residueList, residueIdToFullLinkIds, linkIdMap);
        this.set("linkList", linkList);
    },

    getFullLinkCount: function () {
        return this._origFullLinkCount;    
    },
    
    getFullLinks: function (residue) {
        return residue === undefined ? this.get("linkList") : this.getFullLinksByResidueID (residue.residueId);
    },
    
    getFullLinkCountByResidue: function (residue) {
        var linkIds = this._residueIdToFullLinkIds[residue.residueId];
        return linkIds ? linkIds.length : 0;
    },
    
    getFullLinksByResidueID: function (residueId) {
        var linkIds = this._residueIdToFullLinkIds[residueId];
        return linkIds ? linkIds.map(function(l) {
            return this._linkIdMap[l];
        }, this) : [];
    },
    
    getHalfLinkCount: function () {
        return this._origHalfLinkCount;    
    },
    
    getHalfLinksByResidueID: function (residueId) {
        var linkIds = this._residueIdToHalfLinkIds[residueId];
        return linkIds ? linkIds.map(function(l) {
            return this._halfLinkIdMap[l];
        }, this) : [];
    },
    
    getFullLinkByGlobalIndex: function (residueGlobalIndex1, residueGlobalIndex2) {
        return this._fullLinkNGLIndexMap[residueGlobalIndex1 + "-" + residueGlobalIndex2];
    },

    getResidues: function (fullLink) {
        if (fullLink === undefined) {
            return this._residueList;
        } else if (Array.isArray(fullLink)) {
            var residues = [];
            fullLink.forEach(function(l) {
                residues.push(l.residueA, l.residueB); // push two values at once so don't use .map
            });
            return residues;
        } else {
            return [fullLink.residueA, fullLink.residueB];
        }
    },

    getSharedLinks: function(residueA, residueB) {
        var aLinks = this.getFullLinks (residueA);
        var bLinks = this.getFullLinks (residueB);
        var sharedLinks = CLMSUI.modelUtils.intersectObjectArrays (aLinks, bLinks, function(l) {
            return l.linkId;
        });
        return sharedLinks.length ? sharedLinks : false;
    },

    getResidueByGlobalIndex: function (nglGlobalResidueIndex) {
        return this._residueNGLIndexMap[nglGlobalResidueIndex];
    },

    hasResidue: function (residue) {
        return this._residueIdMap[residue.residueId] !== undefined;
    },

    hasLink: function (link) {
        return this._linkIdMap[link.linkId] !== undefined;
    },
    
    // Filter down a list of residue objects to those that are currently in the residueIdMap object
    getAvailableResidues: function (residues) {
        return residues.filter(function(r) {
            return this.hasResidue(r);
        }, this);
    },

    // Filter down a list of links to those that are currently in the linkIdMap object
    getAvailableLinks: function (linkObjs) {
        return linkObjs.filter(function(linkObj) {
            return this.hasLink(linkObj);
        }, this);
    },
    
    // Return original crosslinks from this model's link objects using origId property value
    getOriginalCrossLinks: function(linkObjs) {
        var xlinks = this.getModel().get("clmsModel").get("crossLinks");
        return linkObjs.map(function(linkObj) {
            return xlinks.get(linkObj.origId);
        });
    },
    
    getOriginalCrossLinkCount: function (linkObjs) {
        return d3.set(_.pluck (linkObjs, "origId")).size();
    },
    
    // Return an array of atom pair indices (along with original link id) for a given array of crosslink objects
    getAtomPairsFromLinks: function (fullLinkList) {
        var atomPairs = [];

        if (fullLinkList) {
            if (fullLinkList === "all") {
                fullLinkList = this.getFullLinks();
            }

            fullLinkList.forEach(function(link) {
                var atomA = this.getAtomIndexFromResidueObj (link.residueA);
                var atomB = this.getAtomIndexFromResidueObj (link.residueB);

                if (atomA !== undefined && atomB !== undefined) {
                    atomPairs.push([atomA, atomB, link.origId]);
                } else {
                    CLMSUI.utils.xilog("dodgy pair", link);
                }
            }, this);
            //CLMSUI.utils.xilog ("getAtomPairs", atomPairs);
        }

        return atomPairs;
    },

    getAtomPairsFromResidue: function (residue) {
        return this.getAtomPairsFromLinks (this.getFullLinks (residue));
    },

    getChainInfo: function() {
        var resCount = 0;
        var viableChainIndices = [];
        var self = this;
        //console.log ("strcutcomp", this.get("structureComp").structure);
        this.get("structureComp").structure.eachChain(function(cp) {
            // Don't include chains which are tiny or ones we can't match to a protein
            if (CLMSUI.NGLUtils.isViableChain(cp) && CLMSUI.NGLUtils.getProteinFromChainIndex(self.get("chainMap"), cp.index)) {
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

        if (chainIndices) {
            chainIndices.forEach(function(ci) {
                chainProxy.index = ci;
                var atomIndices = chainCAtomIndices[ci] = [];
                // 918 in 5taf matches to just one atom, which isn't a carbon, dodgy pdb?

                var sel = CLMSUI.NGLUtils.getRangedCAlphaResidueSelectionForChain(chainProxy);
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
        var entries = d3.entries(this.get("chainCAtomIndices"));
        var matrixMap = {};
        var links = this.getFullLinks();

        entries.forEach (function (chain1Entry) {
            var chain1 = chain1Entry.key;
            var cindices1 = chain1Entry.value;
            
            entries.forEach (function (chain2Entry) {
                var chain2 = chain2Entry.key;
                var cindices2 = chain2Entry.value;
                
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
            }, this);
        }, this);

        return matrixMap;
    },

    getChainLength: function(chainIndex) {
        var chain = this.get("chainCAtomIndices")[chainIndex];
        return chain ? chain.length : undefined;
    },


    getLinkDistancesBetween2Chains: function(chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2, links) {
        
        var notHomomultimeric = function (xlinkID, c1, c2) {
            var xlink = this.getModel().get("clmsModel").get("crossLinks").get(xlinkID);
            return CLMSUI.modelUtils.not3DHomomultimeric(xlink, c1, c2);
        };
        
        links = links.filter(function(link) {
            return (link.residueA.chainIndex === chainIndex1 && link.residueB.chainIndex === chainIndex2 && notHomomultimeric.call (this, link.origId, chainIndex1, chainIndex2))
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

    // make an array of pdb file compatible link entries for the supplied crosslink objects
    getAtomPairsFromLinksWithDistances: function (links) {
        var struc = this.get("structureComp").structure;
        var ap1 = struc.getAtomProxy();
        var ap2 = struc.getAtomProxy();
        var atomPairs = this.getAtomPairsFromLinks (links);

        atomPairs.forEach (function (pair) {
            ap1.index = pair[0];
            ap2.index = pair[1];
            if (ap1.index !== undefined && ap2.index !== undefined) {
                pair[3] = this.getAtomProxyDistance (ap1, ap2);
            }
        }, this);
        
        return atomPairs;
    },
    
    getPDBLinkString: function (links) {
        var pdbLinks = [];
        var struc = this.get("structureComp").structure;
        var ap = struc.getAtomProxy();
        var linkFormat = 'LINK        %-4s %-3s %1s%4d                %-4s %-3s %1s%4d   %6s %6s %5.2f';
        
        links.forEach (function (link) {
            var res1 = link.residueA;
            var res2 = link.residueB;
            var atomIndex1 = this.getAtomIndexFromResidueObj (res1);
            var atomIndex2 = this.getAtomIndexFromResidueObj (res2);
            ap.index = atomIndex1;
            var atomName1 = ap.atomname;
            var resName1 = ap.resname;
            var resSeq1 = ap.resno;
            var chainID1 = ap.chainname;
            ap.index = atomIndex2;
            var atomName2 = ap.atomname;
            var resName2 = ap.resname;
            var resSeq2 = ap.resno;
            var chainID2 = ap.chainname;
            
            var sym1 = "      ";
            var sym2 = "      ";
            var distance = Math.min (99.99, this.getSingleDistanceBetween2Residues (res1.resindex, res2.resindex, res1.chainIndex, res2.chainIndex));
            
            pdbLinks.push (sprintf (linkFormat, atomName1, resName1, chainID1, resSeq1, atomName2, resName2, chainID2, resSeq2, sym1, sym2, distance));
        }, this);
        
        return pdbLinks.join("\n");
    },
    
    
    getPDBConectString: function (links) {  // Conect is spelt right
        var pdbConects = [];
        var atomPairs = this.getAtomPairsFromLinks (links);
        var conectFormat = 'CONECT%5d%5d                                                                ';
        
        atomPairs.forEach (function (atomPair) {   
            pdbConects.push (sprintf (conectFormat, atomPair[0], atomPair[1]));
        }, this);
        
        return pdbConects.join("\n");
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
                            vals = CLMSUI.modelUtils.joinConsecutiveNumbersIntoRanges(vals);
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


    getAtomIndexFromResidueObj: function (resObj) {
        var resno = resObj.resno;
        return resno !== undefined ? this.getAtomIndex (resObj.resindex, resObj.chainIndex) : undefined;
    },

    getFirstAtomPerChainSelection: function(chainIndexSet) {
        var comp = this.get("structureComp").structure;
        var sels = [];
        comp.eachChain(function(cp) {
            // if chain longer than 10 resiudes and (no chainindexset present or chain index is in chainindexset)
            if (CLMSUI.NGLUtils.isViableChain(cp) && (!chainIndexSet || chainIndexSet.has(cp.index))) {
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
    
    getAllResidueCoordsForChain: function (chainIndex) {
        var structure = this.get("structureComp").structure;
        var atomProxy = structure.getAtomProxy();
        var nglAtomIndices = this.get("chainCAtomIndices")[chainIndex] || [];
        var atomCoords = nglAtomIndices.map (function (atomIndex) {
            atomProxy.index = atomIndex;
            var coords = this.getAtomCoordinates (atomProxy);
            return coords;
        }, this);
        return atomCoords;
    },
});
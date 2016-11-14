var CLMSUI = CLMSUI || {};
CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

CLMSUI.BackboneModelTypes.NGLModelWrapperBB = Backbone.Model.extend ({
    defaults: {
        masterModel: null,
        structureComp: null,
        chainMap: null,
        pdbBaseSeqID: null,
        linkList: null,
        lastFilterFunc: null,
    },
    
    initialize: function () {
        this.residueToAtomIndexMap = {};
       
        // When masterModel is declared, hang a listener on it that listens to change in alignment model as this
        // possibly changes links and distances in 3d model
        this.listenToOnce (this, "change:masterModel", function () {    // only do this once (should only happen once anyways but better safe than sorry)
            this.listenTo (this.getModel().get("alignColl"), "bulkAlignChange", function () {
                console.log ("SET UP LINKS");
                this.setupLinks (this.getModel().get("clmsModel"));
            });
        });
    },
    

    getModel: function () {
        return this.get("masterModel");
    },
    
    setupLinks: function (clmsModel) {
        var crossLinks = clmsModel.get("crossLinks");
        var filteredCrossLinks = CLMSUI.modelUtils.getFilteredNonDecoyCrossLinks (crossLinks); 
        this.setLinkList (filteredCrossLinks);
        var distancesObj = this.makeDistances ();   
        
        var distObjPreExists = clmsModel.get("distancesObj");
        var oldpdbid = distObjPreExists ? distObjPreExists.pdbBaseSeqID : undefined;
        clmsModel.set ("distancesObj", distancesObj);
        if (distObjPreExists && oldpdbid === clmsModel.get("distancesObj").pdbBaseSeqID) {
            console.log ("FORCE DISTANCES CHANGE EVENT");
            CLMSUI.vent.trigger ("distancesAdjusted");
        }
    },
    
    makeDistances: function () {
        return new CLMSUI.DistancesObj (this.getDistances(), this.get("chainMap"), this.get("pdbBaseSeqID"));
    },
    
    // residueStore maps the NGL-indexed resides to PDB-index
    // so we take our alignment index --> which goes to NGL-sequence index with Alignment Collection's getAlignedIndex() --> 
    // then need to subtract 1, then --> which goes to PDB index with residueStore
    makeLinkList: function (linkModel) {
        var structure = this.get("structureComp").structure;
        var pdbBaseSeqID = this.get("pdbBaseSeqID");
        var nextResidueId = 0;
        var structureId = null;
        var residueDict = {};
        var linkList = [];
        var residueProxy1 = structure.getResidueProxy();
        var residueProxy2 = structure.getResidueProxy();
        var chainProxy = structure.getChainProxy();      
        var alignColl = this.getModel().get("alignColl");

        function getResidueId (resIndex, chainIndex) {
            // TODO add structureId to key
            // TODO in NMR structures there are multiple models // mjg - chainIndex is unique across models
            var key = resIndex + ":" + chainIndex;
            if (residueDict[key] === undefined) {
                residueDict[key] = nextResidueId;
                nextResidueId++;
            }
            return residueDict[key];
        }

        var chainMap = this.get("chainMap");

        linkModel.forEach (function (xlink) {
            // loop through fromChainIndices / toChainIndices to pick out all possible links between two residues in different chains
            var fromChainIndices = _.pluck (chainMap[xlink.fromProtein.id], "index");
            var toChainIndices = _.pluck (chainMap[xlink.toProtein.id], "index");
            if (fromChainIndices && toChainIndices && fromChainIndices.length && toChainIndices.length) {
                fromChainIndices.forEach (function (fromChainIndex) {
                    chainProxy.index = fromChainIndex;
                    var fromResidue = alignColl.getAlignedIndex (xlink.fromResidue, xlink.fromProtein.id, false, CLMSUI.modelUtils.make3DAlignID (pdbBaseSeqID, chainProxy.chainname, fromChainIndex)) - 1;  // residues are 0-indexed in NGL so -1

                    if (fromResidue >= 0) {
                        residueProxy1.index = fromResidue + chainProxy.residueOffset;

                        toChainIndices.forEach (function (toChainIndex) {
                            chainProxy.index = toChainIndex;
                            var toResidue = alignColl.getAlignedIndex (xlink.toResidue, xlink.toProtein.id, false, CLMSUI.modelUtils.make3DAlignID (pdbBaseSeqID, chainProxy.chainname, toChainIndex)) - 1;    // residues are 0-indexed in NGL so -1

                            //console.log ("fr", fromResidue, "tr", toResidue);
                            if (toResidue >= 0 && CLMSUI.modelUtils.not3DHomomultimeric (xlink, toChainIndex, fromChainIndex)) {                   
                                residueProxy2.index = toResidue + chainProxy.residueOffset;

                                linkList.push ({
                                    origId: xlink.id,
                                    linkId: linkList.length,
                                    residueA: {
                                        resindex: fromResidue,
                                        residueId: getResidueId (fromResidue, fromChainIndex),
                                        resno: residueProxy1.resno, // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                        chainIndex: fromChainIndex,
                                        structureId: structureId
                                    },
                                    residueB: {
                                        resindex: toResidue,
                                        residueId: getResidueId (toResidue, toChainIndex),
                                        resno: residueProxy2.resno,   // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                        chainIndex: toChainIndex,
                                        structureId: structureId
                                    }
                                });
                            }
                        }, this);
                    }
                }, this);
            }
        }, this);

        //console.log ("linklist", linkList);        
        return linkList;
    },
    
    setLinkList: function (crossLinkMap, filterFunc) {
        var linkList = this.makeLinkList (crossLinkMap);
        // NASTY HACK. A view can supply an extra filter usually to strip out long links, depending on view option.
        // However, if setLinkList is called from a model rather than a view, we don't know the filter the view is using.
        // Nasty hack is to use the last used filter.
        // Ideally filtering should be done in view, but would then a) have to be done for every view rather than just once in the model
        // and b) would require a lot of refiltering of residues etc that are calculated next in setLinkListWrapped
        if (filterFunc) { 
            this.set("lastFilterFunc", filterFunc);
        }
        if (this.get("lastFilterFunc")) {
            linkList = this.get("lastFilterFunc")(linkList);
        }
        this.setLinkListWrapped (linkList);
        return this;
    },

    setLinkListWrapped: function (linkList) {
        var residueIdToLinkIds = {};
        var linkIdMap = {};
        var residueIdMap = {};
        var residueList = [];

        function insertResidue (residue, link) {
            var list = residueIdToLinkIds[residue.residueId];
            if (list === undefined) {
                residueIdToLinkIds[residue.residueId] = [link.linkId];
            } else if (! _.includes (list, link.linkId)) {
                list.push (link.linkId);
            }
            residueIdMap[residue.residueId] = residue;
        }

        linkList.forEach (function(rl) {
            linkIdMap[rl.linkId] = rl;
            insertResidue (rl.residueA, rl);
            insertResidue (rl.residueB, rl);
        });

        for (var residueId in residueIdMap){
            residueList.push (residueIdMap [residueId]);
        }

        this._residueIdToLinkIds = residueIdToLinkIds;
        this._linkIdMap = linkIdMap;
        this._residueIdMap = residueIdMap;
        this._residueList = residueList;
        //console.log ("setLinkList", residueIdMap, residueList, residueIdToLinkIds, linkIdMap);

        this.set ("linkList", linkList);
    },
    
    getResidueIdsFromLinkId: function (linkId) {
        var link = this.get("linkList")(linkId);
        return link ? [link.residueA.residueId, link.residueB.residueId] : undefined;
    },

    getLinks: function (residue) {
        if (residue === undefined) {
            return this.get("linkList");
        } else {
            var linkIds = this._residueIdToLinkIds[residue.residueId];
            return linkIds ? linkIds.map (function(l) {
                return this._linkIdMap[l];
            }, this) : [];
        }
    },

    getResidues: function (link) {
        if (link === undefined) {
            return this._residueList;
        } else if (Array.isArray (link)) {
            var residues = [];
            link.forEach (function(l) {
                residues.push (l.residueA, l.residueB);
            });
            return residues;
        } else {
            return [link.residueA, link.residueB];
        }
    },

    getSharedLinks: function (residueA, residueB) {
        var aLinks = this.getLinks (residueA);
        var bLinks = this.getLinks (residueB);
        var sharedLinks = CLMSUI.modelUtils.intersectObjectArrays (aLinks, bLinks, function(l) { return l.linkId; });
        return sharedLinks.length ? sharedLinks : false;
    },

    findResidues: function (resno, chainIndex) {
        var residues = this.getResidues().filter (function (r) {
            return r.resno === resno && r.chainIndex === chainIndex;
        });
        console.log ("find r", resno, chainIndex, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function (residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function (link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    },
    
    getDistances: function () {
        var resCount = 0;
        var viableChainIndices = [];
        var self = this;
        this.get("structureComp").structure.eachChain (function (cp) {
            // Don't include chains which are tiny or ones we can't match to a protein
            if (cp.residueCount > 20 && CLMSUI.modelUtils.getProteinFromChainIndex (self.get("chainMap"), cp.index)) {
                resCount += cp.residueCount;
                viableChainIndices.push (cp.index);
            }
        });
        
        console.log ("RESCOUNT", resCount, viableChainIndices);
        
        return this.getChainDistances (viableChainIndices, resCount > 1500);
    },
    
    getChainDistances: function (chainIndices, linksOnly) {
        var chainCAtomIndices = this.getCAtomsAllResidues (chainIndices);
        console.log ("residue atom indices", chainCAtomIndices);
        var keys = d3.keys (chainCAtomIndices);
        
        var matrixMap = {};
        var links = this.getLinks();
        
        keys.forEach (function (chain1) {
            for (var m = 0; m < keys.length; m++) {
                var chain2 = keys[m];
                matrixMap[chain1+"-"+chain2] = {
                    chain1: chain1,
                    chain2: chain2,
                    isSymmetric: chain1 === chain2,
                    distanceMatrix: linksOnly
                        ? this.getLinkDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2], +chain1, +chain2, links)
                        : this.getAllDistancesBetween2Chains (chainCAtomIndices [chain1], chainCAtomIndices [chain2], chain1, chain2)
                };
            }
        }, this);
        
        return matrixMap;
    },
    
    notHomomultimeric: function (xlinkID, c1, c2) {
        var xlink = this.getModel().get("clmsModel").get("crossLinks").get(xlinkID);
        return CLMSUI.modelUtils.not3DHomomultimeric (xlink, c1, c2);
    },
    
    getLinkDistancesBetween2Chains: function (chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2, links) {
        links = links.filter (function (link) {
            return (link.residueA.chainIndex === chainIndex1 && link.residueB.chainIndex === chainIndex2 && this.notHomomultimeric (link.origId, chainIndex1, chainIndex2) ) /*||
                (link.residueA.chainIndex === chainIndex2 && link.residueB.chainIndex === chainIndex1)*/;
            // The reverse match condition produced erroneous links i.e. link chain3,49 to chain 2,56 also passed chain3,56 to chain2,49
        }, this);
           
        var matrix = [];
        var ap1 = this.get("structureComp").structure.getAtomProxy();
        var ap2 = this.get("structureComp").structure.getAtomProxy();
        
        links.forEach (function (link) {
            var idA = link.residueA.resindex;   // was previously link.residueA.resno;
            var idB = link.residueB.resindex;   // " " link.residueB.resno;
            ap1.index = chainAtomIndices1[idA];
            ap2.index = chainAtomIndices2[idB];
            if (ap1.index !== undefined && ap2.index !== undefined) {
                var d = ap1.distanceTo (ap2);
                //console.log ("link", link, chainIndex1, chainIndex2, idA, idB, ap1.index, ap2.index, d);
                matrix[idA] = matrix[idA] || [];
                matrix[idA][idB] = matrix[idA][idB] || [];
                matrix[idA][idB] = d;
            }
        });
        
        return matrix;
    },
    
    getAllDistancesBetween2Chains: function (chainAtomIndices1, chainAtomIndices2, chainIndex1, chainIndex2) {
        var matrix = [];
        var ap1 = this.get("structureComp").structure.getAtomProxy();
        var ap2 = this.get("structureComp").structure.getAtomProxy();
        var cai2length = chainAtomIndices2.length;
        var diffChains = (chainIndex1 !== chainIndex2);
        
        for (var n = 0; n < chainAtomIndices1.length; n++) {
            ap1.index = chainAtomIndices1[n];
            var ap1undef = (ap1.index === undefined);
            var row = matrix[n] = [];
            for (var m = 0; m < cai2length; m++) {
                if (m !== n || diffChains) {
                    ap2.index = chainAtomIndices2[m];
                    row.push ((ap2.index === undefined || ap1undef) ? undefined : ap1.distanceTo(ap2));
                } else {
                    row.push(0);
                }
            }
        }
        
        return matrix;
    },
    
    getCAtomsAllResidues : function (chainIndices) {
        var chainProxy = this.get("structureComp").structure.getChainProxy();
        var sele = new NGL.Selection();
        var chainCAtomIndices = {};
        var self = this;
        
        if (chainIndices) {
            chainIndices.forEach (function (ci) {
                chainProxy.index = ci;
                var atomIndices = chainCAtomIndices[ci] = [];
                chainProxy.eachResidue (function (rp) {
                    var ai = self._getAtomIndexFromResidue (rp.resno, chainProxy, sele);
                    atomIndices.push (ai);
                });
            }, this);
        }
        
        console.log ("cac", chainCAtomIndices);
      
        return chainCAtomIndices;
    },
    
    // used to generate a cache to speed up distance selections / calculations
    _getAtomIndexFromResidue: function (resno, cproxy, sele) {
        var aIndex;
        
        if (resno !== undefined) {
            var chainIndex = cproxy.index;
            var key = resno + (chainIndex !== undefined ? ":" + chainIndex : "");
            aIndex = this.residueToAtomIndexMap [key];
            
            if (aIndex === undefined) {
                var chainName = cproxy.chainname;
                var modelIndex = cproxy.modelIndex;
                var resi = resno + (chainName ? ":" + chainName : "") + (modelIndex !== undefined ? "/"+modelIndex : "");
                sele.setString (resi  + " AND .CA");
                var ai = this.get("structureComp").structure.getAtomIndices (sele);
                aIndex = ai[0];
                if (aIndex === undefined) {
                    console.log ("undefined sele", sele.string, aIndex);
                }
                this.residueToAtomIndexMap[key] = aIndex;
            }
        }
        return aIndex;
    },
});
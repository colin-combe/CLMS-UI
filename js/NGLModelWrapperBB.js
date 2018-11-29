var CLMSUI = CLMSUI || {};
CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

CLMSUI.BackboneModelTypes.NGLModelWrapperBB = Backbone.Model.extend({
    defaults: {
        masterModel: null,
        structureComp: null,
        chainMap: null,
        pdbBaseSeqID: null,
        linkList: null,
        lastFilterFunc: null,
        fullDistanceCalcCutoff: 1200,
    },

    initialize: function() {
        this.residueToAtomIndexMap = {};

        // When masterModel is declared, hang a listener on it that listens to change in alignment model as this
        // possibly changes links and distances in 3d model
        // this is in case 3d stuff has been set up before main model (used to happen that pdb's were autoloaded for some searches)
        this.listenToOnce(this, "change:masterModel", function() { // only do this once (should only happen once anyways but better safe than sorry)
            this.listenTo(this.getModel().get("alignColl"), "bulkAlignChange", function() {
                console.log("SET UP LINKS");
                this.setupLinks(this.getModel().get("clmsModel"));
            });
        });
    },

    getModel: function() {
        return this.get("masterModel");
    },

    setupLinks: function(clmsModel) {
        this.setLinkList(this.getModel().getFilteredCrossLinks());
        var distancesObj = this.makeDistances();

        // silent change and trigger, as loading in the same pdb file doesn't trigger the change automatically
        clmsModel
            .set("distancesObj", distancesObj, {
                silent: true
            })
            .trigger("change:distancesObj", clmsModel, clmsModel.get("distancesObj"));
    },

    setLinkList: function(crossLinks, filterFunc) {
        var linkList = this.makeLinkList(crossLinks);
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
        this.setLinkListWrapped(linkList);
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
        var alignColl = this.getModel().get("alignColl");

        function getResidueId(resIndex, chainIndex) {
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
        // divide protein --> chain map into protein --> model --> chain map, we don't want to make links between different models
        var modelIndexedChainMap = this.makeModelSubIndexedChainMap(chainMap);

        linkModel.forEach(function(xlink) {
            // loop through fromProtein's models/chains in modelIndexedChainMap
            // Within that have an inner loop through toProtein's models/chains in modelIndexedChainMap
            // Match by model index so can't have crosslinks between different models
            var fromPerModelChains = modelIndexedChainMap[xlink.fromProtein.id];
            var toPerModelChains = modelIndexedChainMap[xlink.toProtein.id];

            if (fromPerModelChains && fromPerModelChains.length && toPerModelChains && toPerModelChains.length) {
                var toPerModelChainMap = d3.map(toPerModelChains, function(d) {
                    return d.key;
                });

                fromPerModelChains.forEach(function(fromPerModelChainEntry) {
                    var fromModelIndex = fromPerModelChainEntry.key;
                    var toChains = toPerModelChainMap.get(fromModelIndex);
                    if (toChains) { // only proceed if the model index in 'from' has a corresponding entry in toPerModelChainMap (only look for links within same model)

                        fromPerModelChainEntry.values.forEach(function(fromChainValue) {
                            var fromChainIndex = fromChainValue.index;
                            chainProxy.index = fromChainIndex;
                            var fromResidue = alignColl.getAlignedIndex(xlink.fromResidue, xlink.fromProtein.id, false, CLMSUI.modelUtils.make3DAlignID(pdbBaseSeqID, chainProxy.chainname, fromChainIndex), true) - 1; // residues are 0-indexed in NGL so -1

                            if (fromResidue >= 0) {
                                residueProxy1.index = fromResidue + chainProxy.residueOffset;

                                toChains.values.forEach(function(toChainValue) {
                                    var toChainIndex = toChainValue.index;
                                    chainProxy.index = toChainIndex;
                                    var toResidue = alignColl.getAlignedIndex(xlink.toResidue, xlink.toProtein.id, false, CLMSUI.modelUtils.make3DAlignID(pdbBaseSeqID, chainProxy.chainname, toChainIndex), true) - 1; // residues are 0-indexed in NGL so -1

                                    //console.log ("fr", fromResidue, "tr", toResidue);
                                    if (toResidue >= 0 && CLMSUI.modelUtils.not3DHomomultimeric(xlink, toChainIndex, fromChainIndex)) {
                                        residueProxy2.index = toResidue + chainProxy.residueOffset;

                                        linkList.push({
                                            origId: xlink.id,
                                            linkId: linkList.length,
                                            residueA: {
                                                resindex: fromResidue,
                                                residueId: getResidueId(fromResidue, fromChainIndex),
                                                resno: residueProxy1.resno, // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                                chainIndex: fromChainIndex,
                                                structureId: structureId
                                            },
                                            residueB: {
                                                resindex: toResidue,
                                                residueId: getResidueId(toResidue, toChainIndex),
                                                resno: residueProxy2.resno, // ngl resindex to resno conversion, as Selection() works with resno not resindex
                                                chainIndex: toChainIndex,
                                                structureId: structureId
                                            }
                                        });
                                    }
                                }, this);
                            }
                        });
                    }
                }, this);
            }
        }, this);

        console.log("linklist", linkList);
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
        var aLinks = this.getLinks(residueA);
        var bLinks = this.getLinks(residueB);
        var sharedLinks = CLMSUI.modelUtils.intersectObjectArrays(aLinks, bLinks, function(l) {
            return l.linkId;
        });
        return sharedLinks.length ? sharedLinks : false;
    },

    findResidues: function(resno, chainIndex) {
        var residues = this.getResidues().filter(function(r) {
            return r.resno === resno && r.chainIndex === chainIndex;
        });
        console.log("find r", resno, chainIndex, residues);
        return residues.length ? residues : false;
    },

    hasResidue: function(residue) {
        return this._residueIdMap[residue.residueId] === undefined ? false : true;
    },

    hasLink: function(link) {
        return this._linkIdMap[link.linkId] === undefined ? false : true;
    },



    makeDistances: function() {
        return new CLMSUI.DistancesObj(this.getDistances(), this.get("chainMap"), this.get("pdbBaseSeqID"));
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
        var chainCAtomIndices = {};
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

                chainProxy.eachResidue(function(rp) {
                    var key = rp.resno + (ci !== undefined ? ":" + ci : ""); // chainIndex is unique across models
                    var atomIndex = resMap[rp.resno];
                    self.residueToAtomIndexMap[key] = atomIndex;
                    atomIndices.push(atomIndex);
                });
            }, this);
        }

        this.set("chainCAtomIndices", chainCAtomIndices); // store for later
        return chainCAtomIndices;
    },

    getChainDistances: function(linksOnly) {
        var chainCAtomIndices = this.get("chainCAtomIndices");
        var keys = d3.keys(chainCAtomIndices);

        var matrixMap = {};
        var links = this.getLinks();

        keys.forEach(function(chain1) {
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
            var idA = link.residueA.resindex; // was previously link.residueA.resno;
            var idB = link.residueB.resindex; // " " link.residueB.resno;
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

    getAtomProxyDistance: function(ap1, ap2) {
        return ap1.modelIndex === ap2.modelIndex ? ap1.distanceTo(ap2) : undefined;
    },

    // resIndex1 and 2 are 0-indexed, with zero being first residue in pdb chain
    getSingleDistanceBetween2Residues: function(resIndex1, resIndex2, chainIndex1, chainIndex2) {
        var struc = this.get("structureComp").structure;
        var ap1 = struc.getAtomProxy();
        var ap2 = struc.getAtomProxy();
        var cai = this.get("chainCAtomIndices");
        var ci1 = cai[chainIndex1];
        var ci2 = cai[chainIndex2];
        ap1.index = ci1[resIndex1];
        ap2.index = ci2[resIndex2];

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
    joinConsecutiveNumbersIntoRanges: function(vals, joinString) {
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

    makeResidueSelectionString: function(resno, chainProxy) {
        var chainName = chainProxy.chainname;
        var modelIndex = chainProxy.modelIndex;
        return resno + (chainName ? ":" + chainName : "") + ".CA" + (modelIndex !== undefined ? "/" + modelIndex : ""); // + " AND .CA";
    },

    // used to generate a cache to speed up distance selections / calculations
    _getAtomIndexFromResidue: function(resno, cproxy, sele) {
        var aIndex;

        if (resno !== undefined) {
            var chainIndex = cproxy.index;
            var key = resno + (chainIndex !== undefined ? ":" + chainIndex : ""); // chainIndex is unique across models
            aIndex = this.residueToAtomIndexMap[key];

            if (aIndex === undefined) {
                sele.setString(this.makeResidueSelectionString(resno, cproxy), true); // true = doesn't fire unnecessary dispatch events in ngl
                var ai = this.get("structureComp").structure.getAtomIndices(sele);
                aIndex = ai[0];
                if (aIndex === undefined) {
                    console.log("undefined sele", sele.string, aIndex, ai);
                }
                this.residueToAtomIndexMap[key] = aIndex;
            }
        }
        return aIndex;
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
});



    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};
    
    CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend ({
        applyFilter: function () {
			var filterModel = this.get("filterModel");
            var clmsModel = this.get("clmsModel");
            var crossLinksArr = CLMS.arrayFromMapValues(clmsModel.get("crossLinks"));
			var clCount = crossLinksArr.length;
			
            if (filterModel) {
                filterModel.processTextFilters();   // saves doing stuff later on for every match
            }
			// if its FDR based filtering,
			// set all matches fdrPass att to false, then calc
			if (filterModel && filterModel.get("fdrMode")) {
				var matches = clmsModel.get("matches");
				var matchesLen = matches.length;
				for (var m = 0; m < matchesLen; ++m){
					matches[m].fdrPass = false;
				}
				var result = CLMSUI.fdr(crossLinksArr, {threshold: filterModel.get("fdrThreshold")});

				filterModel.set({
                    "interFdrCut": result[0].thresholdMet ? result[0].fdr : undefined, // undefined what threshold score should be if all links fail fdr
                    "intraFdrCut": result[1].thresholdMet ? result[1].fdr : undefined 
                }, {silent: true});
				
			}
            
            var proteinMatchFunc = clmsModel.isMatchingProteinPairFromIDs.bind(clmsModel);

            for (var i = 0; i < clCount; ++i) {
				var crossLink = crossLinksArr[i];
				if (filterModel) {
					crossLink.filteredMatches_pp = [];
					if (filterModel.get("fdrMode") === true) {
						// FDR mode
						var pass;
						if (crossLink.meta && crossLink.meta.meanMatchScore !== undefined) {
							var fdr = crossLink.meta.meanMatchScore;
							var intra = clmsModel.isIntraLink (crossLink);
							var cut = intra ? result[1].fdr : result[0].fdr;
							pass = fdr >= cut;
						}
            
						if (pass) {
							crossLink.filteredMatches_pp = crossLink.matches_pp.filter(
								function (value) {
									return filterModel.subsetFilter (value.match, proteinMatchFunc);
								}
							);

							crossLink.ambiguous = 
								!crossLink.filteredMatches_pp.some (function (matchAndPepPos) {
									return matchAndPepPos.match.crossLinks.length === 1;
								})
							;
							var filteredMatches_pp = crossLink.filteredMatches_pp;
							var filteredMatchCount = filteredMatches_pp.length;
							for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
								filteredMatches_pp[fm_pp].match.fdrPass = true;
							}    
						}
						//~ else {
							//~ alert("i just failed fdr check");
						//~ }
					} else { 
						//not FDR mode
						crossLink.ambiguous = true;
						crossLink.confirmedHomomultimer = false;
						var matches_pp = crossLink.matches_pp;
						var matchCount = matches_pp.length;
						for (var m = 0; m < matchCount; m++ ) {	
							var matchAndPepPos = matches_pp[m];
							var match = matchAndPepPos.match;
							var result = filterModel.subsetFilter (match, proteinMatchFunc)
											&& filterModel.validationStatusFilter(match)
											&& filterModel.navigationFilter(match);
							var decoys = filterModel.get("decoys");
							if (decoys === false && match.is_decoy === true){
								result = false;
							}
							
							if (result === true){
								crossLink.filteredMatches_pp.push(matchAndPepPos);
								if (match.crossLinks.length === 1) {
									crossLink.ambiguous = false;
								}
								if (match.confirmedHomomultimer === true) {
									crossLink.confirmedHomomultimer = true;
								}                       
							}
						}
					}
				}
				else { // no filter model, let everything thru
					crossLink.filteredMatches_pp = crossLink.matches_pp;
				}
            }

            this.filteredXLinks = {all: [], targets: [], linears: [], decoysTD: [], decoysDD: []};
			
			for (var i = 0; i < clCount; ++i) {
				var crossLink = crossLinksArr[i];
				if (crossLink.filteredMatches_pp.length) {
                    this.filteredXLinks.all.push(crossLink);
					if (!crossLink.fromProtein.is_decoy && crossLink.toProtein && !crossLink.toProtein.is_decoy) {
                        this.filteredXLinks.targets.push(crossLink);
					} 
                    else {
                        var linear = !crossLink.toProtein;
                        if (linear) {
                            this.filteredXLinks.linears.push(crossLink);
                        }
                        if (crossLink.fromProtein.is_decoy || (!linear && crossLink.toProtein.is_decoy)) {
                            // is it a TD or DD decoy, stick it in the right sub-cache
                            var decoyLinkCache = (linear || (crossLink.fromProtein.is_decoy === crossLink.toProtein.is_decoy)) ? "decoysDD" : "decoysTD";
                            this.filteredXLinks[decoyLinkCache].push(crossLink);
                        }
                    }
				}
            }
            //console.log ("xlinks", this.filteredXLinks);
            
            //hiding linkless participants
            var participantsArr = CLMS.arrayFromMapValues(clmsModel.get("participants"));
            var participantCount = participantsArr.length;                   
            for (var p = 0; p < participantCount; ++p) {
				 var participant = participantsArr[p]; 
				 participant.filteredNotDecoyNotLinearCrossLinks = [];
				 
				 var partCls = participant.crossLinks;
				 var partClCount = partCls.length;
				 
				 for (var pCl = 0; pCl < partClCount; ++pCl) {
					var pCrossLink = partCls[pCl];
					if (pCrossLink.filteredMatches_pp.length 
							&& !pCrossLink.fromProtein.is_decoy 
							&& pCrossLink.toProtein 
							&& !pCrossLink.toProtein.is_decoy) {
						participant.filteredNotDecoyNotLinearCrossLinks.push (pCrossLink);
					}
				}
				
				if (participant.filteredNotDecoyNotLinearCrossLinks.length > 0) {
					 participant.hidden = false;
				}
				else {
					participant.hidden = true;
				}			 
			}
			
			this.trigger ("filteringDone");
            this.trigger ("hiddenChanged");
                        
            return this;
        },

        getFilteredCrossLinks: function (type) {    // if type of crosslinks not declared, make it 'targets' by default
            return this.filteredXLinks[type || "targets"];
        },
        
        collateMatchRegions: function (crossLinks) {
            var fromPeptides = [], toPeptides = [], regs = [], prots = {};
            crossLinks.forEach (function (crossLink) {
                crossLink.filteredMatches_pp.forEach (function (matchAndPepPos) {
                    console.log ("match", match);
                    var smatch = matchAndPepPos.match;
                    var prot1 = smatch.matchedPeptides[0].prt[0];
                    var prot2 = smatch.matchedPeptides[1].prt[0];
                    prots[prot1] = prots[prot1] || [];
                    prots[prot2] = prots[prot2] || [];

                    var fromPepStart = matchAndPepPos.pepPos[0].start - 1;
                    var fromPepLength = matchAndPepPos.pepPos[0].length;
                    var toPepStart = matchAndPepPos.pepPos[1].start - 1;
                    var toPepLength = matchAndPepPos.pepPos[1].length;
                    
                    prots[prot1].push ({protein: prot1, start: fromPepStart, end: fromPepStart + fromPepStart });
                    prots[prot2].push ({protein: prot2, start: toPepStart, end: toPepStart + toPepLength }); 
                });
            });
            
            console.log ("match regions", prots);
            
            return prots;
        },
        
        // modelProperty can be "highlights" or "selection" (or a new one) depending on what array you want
        // to fill in the model
        // - i'm not sure this is a good name for this function - cc
        calcMatchingCrosslinks: function (modelProperty, crossLinks, andAlternatives, add) {
            if (crossLinks) {   // if undefined nothing happens, to remove selection pass an empty array - []
                if (add) {
                    var existingCrossLinks = this.get (modelProperty);
                    crossLinks = crossLinks.concat (existingCrossLinks);
                    //console.log ("excl", existingCrossLinks);
                }
                var crossLinkMap = d3.map (crossLinks, function(d) { return d.id; });

                if (andAlternatives) {
                    crossLinks.forEach (function (crossLink) {
                        if (crossLink.ambiguous || crossLink.ambig) {
                           this.recurseAmbiguity (crossLink, crossLinkMap);
                        }
                    }, this);
                }
                var dedupedCrossLinks = CLMS.arrayFromMapValues(crossLinkMap);
                this.set (modelProperty, dedupedCrossLinks);
            }
        },

		//not recursive
        recurseAmbiguity: function (crossLink, crossLinkMap) {
			// it doesn't need to be recursive;
			// only interested in alternative cross-links for ambiguous matches of this cross-link
			// -- its because a more ambiguous match, with a shorter version of the peptide, should already be in the matches of the orignal cross-link
			 
			// todo: we might want to highlight smallest possible set of alternatives
			// i.e. the alternative cross-links for the least ambiguous match,
			// this would consistent with other parts of the interface
			// e.g. if a cross-link has both ambiguous and non-ambiguous matches it is shown as not ambiguous
			
			var filteredMatchesAndPeptidePositions = crossLink.filteredMatches_pp;
			var fm_ppCount = filteredMatchesAndPeptidePositions.length;
			for (var fm_pp = 0; fm_pp <fm_ppCount; fm_pp++) {
				var crossLinks = filteredMatchesAndPeptidePositions[fm_pp].match.crossLinks;
				var clCount = crossLinks.length;
				
				for (var cl = 0; cl < clCount; cl++) {
					var mCrossLink = crossLinks[cl];
					crossLinkMap.set (mCrossLink.id, mCrossLink);
				}
			}
			
            /*//previous recursive function			
	        var matches = crossLink.filteredMatches_pp;
            matches.forEach (function (match) {
                var matchData = match.match;
                if (matchData.isAmbig()) {
                    matchData.crossLinks.forEach (function (overlapCrossLink) {
                        if (!crossLinkMap.has (overlapCrossLink.id)) {
                            crossLinkMap.set (overlapCrossLink.id, overlapCrossLink);
                            this.recurseAmbiguity (overlapCrossLink, crossLinkMap);
                        }
                    }, this);
                }
            }, this);
             */
        },
        
        //what type should selectedProtein be? Set? Array? Is a map needed?
        // agree map's not needed, prob just Array - cc
        setSelectedProteins: function (idArr, add) {
            var map = add ? new Map (this.get("selectedProtein")) : new Map ();
            if (add && idArr.length == 1 && map.has(idArr[0])) {// if ctrl/shift click and already selected the remove
				map.delete(idArr[0]);
			} else {
				idArr.forEach (function (id) {
					map.set (id, this.get("clmsModel").get("participants").get(id));    
				}, this);
			}
            //console.log ("map eq", map == this.get("selectedProtein"));
            // Currently (03/06/16) Maps/Sets don't trigger change functions even for new Objects
            // https://github.com/jashkenas/underscore/issues/2451
            // So need to force change event
            this.set ("selectedProtein", map);
            this.trigger ("change:selectedProtein", this);
            console.log ("map", this.get("selectedProtein"));
        },
        
        getSingleCrosslinkDistance: function (xlink, distancesObj, protAlignCollection, options) {
            // distancesObj and alignCollection can be supplied to function or, if not present, taken from model
            distancesObj = distancesObj || this.get("clmsModel").get("distancesObj");
            protAlignCollection = protAlignCollection || this.get("alignColl");  
            options = options || {average: false};
            if (options.calcDecoyProteinDistances) {
                if (xlink.fromProtein.is_decoy) {
                    options.realFromPid = this.get("clmsModel").getRealProteinID (xlink.fromProtein.id);
                }
                if (xlink.toProtein.is_decoy) {
                    options.realToPid = this.get("clmsModel").getRealProteinID (xlink.toProtein.id);
                }
            }
            
            return distancesObj ? distancesObj.getXLinkDistance (xlink, protAlignCollection, options) : undefined;
        },
        
        // includeUndefineds to true to preserve indexing of returned distances to input crosslinks
        getCrossLinkDistances: function (crossLinks, options) {
            options = options || {};
            var includeUndefineds = options.includeUndefineds || false;
            
            var distArr = [];
            var distModel = this.get("clmsModel").get("distancesObj");
            var protAlignCollection = this.get ("alignColl");
            var clCount = crossLinks.length;
            for (var cl = 0; cl < clCount; cl++) {
                var dist = this.getSingleCrosslinkDistance (crossLinks[cl], distModel, protAlignCollection, options);
                if (dist != null) {
                    distArr.push (options.returnChainInfo ? dist : +dist); // + is to stop it being a string
                }
                else if (includeUndefineds) {
                    distArr.push (undefined);
                }
            }
            //console.log ("distArr", distArr);

            return distArr;
        }, 
    });

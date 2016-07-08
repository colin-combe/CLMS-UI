

    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};
    
    CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend ({
        applyFilter: function () {
            var filterModel = this.get("filterModel");
            var crossLinks = this.get("clmsModel").get("crossLinks").values();
            for (var crossLink of crossLinks) {
                crossLink.filteredMatchesAndPeptidePositions = [];
                crossLink.ambiguous = true;
                crossLink.confirmedHomomultimer = false;
                for (matchAndPepPos of crossLink.matchesAndPeptidePositions) {	
                    var match = matchAndPepPos.match;
                    var result = filterModel.filter(match); // terrible hack here, that match shouldn't be an array
                    //console.log("result:"+result);
                    if (result === true){
                        crossLink.filteredMatchesAndPeptidePositions.push(matchAndPepPos);
                        if (match.crossLinks.length === 1) {
                            crossLink.ambiguous = false;
                        }
                        if (match.crossLinks.hd === true) {
                            crossLink.confirmedHomomultimer = true;
                        }                       
                    }
                }
            }
        },

        getFilteredCrossLinks: function (crossLinks) {
            //console.log ("crosslinks", crossLinks);
            var result = new Map;

            crossLinks.forEach (function (value, key) {
                if (!value.filteredMatches || value.filteredMatches.length > 0) { result.set (key, value); }
            }, this);

            return result;

            //return crossLinks.filter (function(cLink) {
            //    return cLink.filteredMatches.length > 0;
            //}); 
        },
        
        collateMatchRegions: function (crossLinks) {
            var fromPeptides = [], toPeptides = [], regs = [], prots = {};
            crossLinks.forEach (function (crossLink) {
                crossLink.filteredMatches.forEach (function (match) {
                    console.log ("mmatch", match);
                    var smatch = match[0];
                    var prot1 = smatch.protein1[0];
                    var prot2 = smatch.protein2[0];
                    prots[prot1] = prots[prot1] || [];
                    prots[prot2] = prots[prot2] || [];
                    prots[prot1].push ({protein: prot1, start: match[1], end: match[1] + match[2] });
                    prots[prot2].push ({protein: prot2, start: match[3], end: match[3] + match[4] }); 
                });
            });
            
            console.log ("match regions", prots);
            
            return prots;
        },
        
        // modelProperty can be "highlights" or "selection" (or a new one) depending on what array you want
        // to fill in the model
        calcMatchingCrosslinks: function (modelProperty, crossLinks, andAlternatives, add) {
            if (add) {
                var existingCrossLinks = this.get (modelProperty);
                crossLinks = crossLinks.concat (existingCrossLinks);
                console.log ("excl", existingCrossLinks);
            }
            var crossLinkMap = d3.map (crossLinks, function(d) { return d.id; });

            if (andAlternatives) {
                crossLinks.forEach (function (crossLink) {
                    if (crossLink.ambiguous || crossLink.ambig) {
                       this.recurseAmbiguity (crossLink, crossLinkMap);
                    }
                }, this);
            }
            var dedupedCrossLinks = crossLinkMap.values();
            this.set (modelProperty, dedupedCrossLinks);
        },

        recurseAmbiguity: function (crossLink, crossLinkMap) {
            var matches = crossLink.filteredMatches;
            matches.forEach (function (match) {
                var matchData = match[0];
                if (matchData.isAmbig()) {
                    matchData.crossLinks.forEach (function (overlapCrossLink) {
                        if (!crossLinkMap.has (overlapCrossLink.id)) {
                            crossLinkMap.set (overlapCrossLink.id, overlapCrossLink);
                            this.recurseAmbiguity (overlapCrossLink, crossLinkMap);
                        }
                    }, this);
                }
            }, this);
        },
        
        //what type should selectedProtein be? Set? Array? Is a map needed?
        setSelectedProteins: function (idArr, add) {
            var map = add ? new Map (this.get("selectedProtein")) : new Map ();
            idArr.forEach (function (id) {
                map.set (id, this.get("clmsModel").get("interactors").get(id));    
            }, this);
            console.log ("map eq", map == this.get("selectedProtein"));
            // Currently (03/06/16) Maps/Sets don't trigger change functions even for new Objects
            // https://github.com/jashkenas/underscore/issues/2451
            // So need to force change event
            this.set ("selectedProtein", map);
            this.trigger ("change:selectedProtein", this);
            console.log ("map", this.get("selectedProtein"));
        }
    
    });

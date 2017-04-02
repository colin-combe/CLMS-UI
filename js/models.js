var CLMSUI = CLMSUI || {};

CLMSUI.BackboneModelTypes = _.extend (CLMSUI.BackboneModelTypes || {},

{
    DistancesModel: Backbone.Model.extend({
        flattenedDistances: function () {
            //return CLMSUI.modelUtils.flattenDistanceMatrix (this.get("distances"));
        }
    }),

    FilterModel: Backbone.Model.extend ({
        defaults: {
			manualMode: true,
			fdrMode: false,
			//subset
            linears: true,
            crosslinks: true,
            selfLinks: true,
            betweenLinks: true,
            ambig: true,
            aaApart: 10,
            pepLength: 4,
            //validation status
            A: true, B: true, C: true, Q: true, unval: true, AUTO: true,
            decoys: true,
            //fdr
            fdrThreshold: 0.05,
            interFdrCut: undefined,
            intraFdrCut: undefined,
            //navigation
            pepSeq: "",
            protNames: "",
            charge: "",
            runName: "",
            scanNumber: "",   
        },

        initialize: function () {
            // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
            if (!this.get("matchScoreCutoff")) {
                this.set ("matchScoreCutoff", [0,100]);
            }
            // scoreExtent used to restrain text input values
            this.scoreExtent = this.get("matchScoreCutoff").slice(0);
            this.valMap = d3.map ();
            this.valMap.set ("?", "Q");
        },

        subsetFilter: function (match, matchingProteinPairFunc) {
            matchingProteinPairFunc = matchingProteinPairFunc || function (p1, p2) { return p1 === p2; }; // naive default match
			//linears? - if linear (linkPos === 0) and linears not selected return false
            //cross-links? - if xl (linkPos > 0) and xls not selected return false
            if (this.get (match.linkPos1 > 0 ? "crosslinks" : "linears") === false) {
                return false;
            }
 			
			//ambigs? - if ambig's not selected and match is ambig return false
			if (!this.get("ambig") && match.isAmbig()) {
				return false;
			}

			//self-links? - if self links's not selected and match is self link return false
			// possible an ambiguous self link will still get displayed
            var hideSelfLinks = !this.get("selfLinks");
            var hideBetweenLinks = !this.get("betweenLinks");
			if ((hideSelfLinks || hideBetweenLinks) && match.matchedPeptides.length > 1) {
				var isSelfLink = true;
				var prots = match.matchedPeptides[0].prt;
                var p1 = prots[0];
				for (var i = 1; i < prots.length; i++) {
                    // not enough to match id's, one might be decoy protein, the other real
					if (!matchingProteinPairFunc (prots[i], p1)) {
						 isSelfLink = false;
						 break;
					 }
				}
                prots = match.matchedPeptides[1].prt;
				for (var i = 0; i < prots.length; i++) {
                    // not enough to match id's, one might be decoy protein, the other real
					if (!matchingProteinPairFunc (prots[i], p1)) {
						isSelfLink = false;
						break;
					}
				}
				if ((isSelfLink && hideSelfLinks) || (!isSelfLink && hideBetweenLinks)) {
					return false;
				}
			}
            

			//temp
            var aaApart = +this.get("aaApart");
            if (!isNaN(aaApart)) {
                 //if not ambig && is selfLink
                if (match.confirmedHomomultimer === false
						&& match.isAmbig() === false//match.matchedPeptides[0].prt.length == 1 && match.matchedPeptides[1].prt.length == 1
                        && match.crossLinks[0].isSelfLink()){//match.matchedPeptides[0].prt[0] == match.matchedPeptides[1].prt[0]) {
					var unambigCrossLink = match.crossLinks[0];
                    var calc = unambigCrossLink.toResidue - unambigCrossLink.fromResidue - 1;
					if (calc < aaApart){
						return false;
					}
				}
            }
            
            var pepLengthFilter = this.get("pepLength");
            //~ return match.matchedPeptides[0].sequence.length > pepLengthFilter
                //~ && match.matchedPeptides[1].sequence.length > pepLengthFilter;
            if (!isNaN(pepLengthFilter)) {
                if (match.matchedPeptides[0].sequence.length <= pepLengthFilter || 
					(match.matchedPeptides[1] && match.matchedPeptides[1].sequence.length <= pepLengthFilter)) {
                    return false;
                }
            }

            return true;
            
       },
       
       validationStatusFilter: function (match){
			// if fail score cut off, return false;
            if (match.score < this.get("matchScoreCutoff")[0] || match.score > this.get("matchScoreCutoff")[1]){
				return false;
			}        
			
            var vChar = match.validated;
            if (vChar == 'R') return false;
            if (this.get(vChar) || this.get(this.valMap.get(vChar))) return true;
           /*
            if (vChar == 'A' && this.get("A")) return true;
            if (vChar == 'B' && this.get("B")) return true;
            if (vChar == 'C' && this.get("C")) return true;
            if (vChar == '?' && this.get("Q")) return true;
            */
            
            if (match.autovalidated && this.get("AUTO")) return true;
			if (!match.autovalidated && !vChar && this.get("unval")) return true;
           
            return false;
		},
       
       navigationFilter: function (match) {
      	
			//peptide seq check
			if (seqCheck(this.get("pepSeq")) === false) {
				return false;
			}
			
			//protein name check
			if (proteinNameCheck(this.get("protNames")) === false) {
				return false;
			}
			
			//charge check
			var chargeFilter = this.get("charge");
			if (chargeFilter && match.precursorCharge != chargeFilter){
				return false;
			}

			//run name check
			var runNameFilter = this.get("runName");
			if (runNameFilter && 
					match.runName().toLowerCase().indexOf(runNameFilter.toLowerCase()) == -1){
				return false;
			}

			//scan number check
			var scanNumberFilter = this.get("scanNumber");
			if (scanNumberFilter && 
					match.scanNumber.toString().toLowerCase()
						.indexOf(scanNumberFilter.toLowerCase()) == -1){
				return false;
			}

			//end of filtering check
			return true;

			//util functions used in nav filter check:
          
            //peptide seq check function
			function seqCheck(searchString) {
				if (searchString) {
					var matchedPeptides = match.matchedPeptides;
					var matchedPepCount = matchedPeptides.length;
					
					var pepStrings = searchString.split('-');
					var pepStringsCount = pepStrings.length;
					
					if (pepStringsCount ==1) {
						for (var mp = 0; mp < matchedPepCount; mp++) {
							var matchedPeptide = matchedPeptides[mp];
							if (matchedPeptide.sequence.indexOf(searchString.toUpperCase()) != -1
								|| matchedPeptide.seq_mods.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
								return true;
							}
						}
						return false;
					}
					
					var used = []; 
					var pepStringCount = pepStrings.length;
					//TODO: theres a problem here, order of search strings is affecting results
					// (if one pep seq occurs in both peptides and the other in only one)
					for (var ps = 0; ps < pepStringCount; ps++) {
						var pepString = pepStrings[ps];
						if (pepString){
							var found = false;
							for (var i = 0; i < matchedPepCount; i++){
								var matchedPeptide = matchedPeptides[i];
								if (found === false && typeof used[i] == 'undefined'){
									if (matchedPeptide.sequence.indexOf(pepString.toUpperCase()) != -1
									 || matchedPeptide.seq_mods.toLowerCase().indexOf(pepString.toLowerCase()) != -1) {
										 found = true;
										 used[i] = true;
									}
								}
							}
							if (found === false) return false;					
						}
					}
				}
				return true;
			}            
			
            //protein name check
			function proteinNameCheck(searchString) {
				if (searchString) {
					var matchedPeptides = match.matchedPeptides;
					var matchedPepCount = matchedPeptides.length
					
					var nameStrings = searchString.split('-');
					var nameStringCount = nameStrings.length;
					
					if (nameStringCount ==1) {
						for (var mp = 0; mp < matchedPepCount; mp++) {
							var pids = matchedPeptides[mp].prt;
							var pidCount = pids.length;
							for (var p = 0; p < pidCount; p++ ) {

								var interactor = CLMSUI.compositeModelInst.get("clmsModel").get("participants").get(pids[p]);
								var toSearch = interactor.name + " " + interactor.description;
								if (toSearch.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
									return true;
								}
							
							}
						}
						return false;
					}
					
					var used = [];
					for (var ns = 0; ns < nameStringCount; ns++) {
						var nameString  = nameStrings[ns];
						if (nameString){
							var found = false;
							for (var i = 0; i < matchedPepCount; i++){
								var matchedPeptide = matchedPeptides[i];
								if (found === false && typeof used[i] == 'undefined'){
									var pids = matchedPeptide.prt;
									var pidCount = pids.length;
									for (var p = 0; p < pidCount; p++ ) {
										var interactor = CLMSUI.compositeModelInst.get("clmsModel").get("participants").get(pids[p]);
										var toSearch = interactor.name + " " + interactor.description;
										if (toSearch.toLowerCase().indexOf(nameString.toLowerCase()) != -1) {
											found = true;
											used[i] = true;
										}
									}
								}
							}
							if (found === false) return false;					
						}
					}
				}
				return true;
			}
        },
        
        stateString: function () {
            var fields = [];
            var zeroFormat = d3.format (".4f");
            var zeroFormatFields = d3.set(["intraFdrCut", "interFdrCut", "scores"]);
            if (this.get("fdrMode")) {
                fields = ["fdrMode", "fdrThreshold", "ambig", "betweenLinks", "selfLinks", "aaApart", "pepLength"];
                // no point listing inter/intra fdr cut if between/self links aren't active
                if (this.get("betweenLinks")) {
                    fields.splice (1, 0, "interFdrCut");
                }
                if (this.get("selfLinks")) {
                    fields.splice (1, 0, "intraFdrCut");
                }
            } else {
                var fieldSet = d3.set (d3.keys (this.attributes));
                var antiFields = ["fdrThreshold", "interFdrCut", "intraFdrCut", "fdrMode"];
                antiFields.forEach (function (af) { fieldSet.remove (af); });
                fields = fieldSet.values();
            }
            fields = fields.filter (function (field) {
                var val = this.get(field);
                return !(val === "" || val === false || val === undefined);    
            }, this);
            //console.log ("fields", fields);
            
            var strValue = function (field, val) {
                if (val === true) {
                    return "";
                }
                if (zeroFormatFields.has(field) && !isNaN(val)) {
                    return zeroFormat(val);
                }
                if ($.isArray (val)) {
                    var arrayStr = val.map (function (elem) {
                        return strValue (field, elem); 
                    });
                    return arrayStr.join("¦");
                }
                return val;
            };
            
            var strParts = fields.map (function(field) {
                var val = this.get(field);
                return field + (val === true ? "" : "=" + strValue (field, val));
            }, this);
            return strParts.join("-");
        },
        
       /*
       filterLink: function (link) {
            if (link.meta && link.meta.meanMatchScore !== undefined) {
                var fdr = link.meta.meanMatchScore;
                var intra = CLMSUI.modelUtils.isIntraLink (link);
                return fdr >= this.get (intra ? "intraFdrCut" : "interFdrCut");
            }
            return false;
        }*/
    }),

    // I want MinigramBB to be model agnostic so I can re-use it in other places
    MinigramModel: Backbone.Model.extend ({
        defaults: {
            domainStart: 0,
            domainEnd: 100,
        },
        data: function() { return [1,2,3,4]; },
    }),

    TooltipModel: Backbone.Model.extend ({
        defaults: {
            location: null,
            header: "Tooltip",
        },
        initialize: function () {
            // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
            this.set("contents", ["Can show", "single items", "lists or", "tables"]);
        }
    }),

    BlosumModel: Backbone.Model.extend ({
        initialize: function() {
            //console.log ("Blosum model initialised", this);
        },
    }),

});

// this is separate to get round the fact BlosumModel won't be available within the same declaration
CLMSUI.BackboneModelTypes = _.extend (CLMSUI.BackboneModelTypes || {},
{
    BlosumCollection: Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.BlosumModel,
        url: "R/blosums.json",
        parse: function(response) {
            // turn json object into array, add keys to value parts, then export just the values
            var entries = d3.entries (response);
            var values = entries.map (function (entry) {
                entry.value.key = entry.key;
                return entry.value;
            });

            console.log ("response", response, values);
            return values;
        }
    }),
});

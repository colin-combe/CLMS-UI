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
            ambig: true,
            aaApart: 0,
            pepLength: 4,
            //validation status
            A: true, B: true, C: true, Q: true, unval: true, AUTO: true,
            //fdr
            interFDRCut: undefined,
            intraFDRCut: undefined,
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
        },

        subsetFilter: function (match) {
			//linears? - if linear and linears not selected return false
            if (match.linkPos1 == 0 && this.get("linears")  == false) return false; 
			//cross-links? - if xl and xls not selected return false
            if (match.linkPos1 > 0 && this.get("crosslinks") == false) return false; 

			//ambigs? - if ambig's not selected and match is ambig return false
			if (this.get("ambig") == false) {
				if (match.isAmbig()) return false;
			}

			//self-links? - if self links's not selected and match is self link return false
			// possible an ambiguous self link will still get displayed
			if (this.get("selfLinks") == false) {
				var isSelfLink = true;
				var p1 = match.protein1[0];
				for (var i = 1; i < match.protein1.length; i++) {
					if (match.protein1[i] != p1){
						 isSelfLink = false;
						 break;
					 }
				}
				for (var i = 0; i < match.protein2.length; i++) {
					if (match.protein2[i] != p1){
						isSelfLink = false;
						break;
					}
				}
				if (isSelfLink) {
					return false;
				}
			}
			
            var aaApart = +this.get("aaApart");
            if (!isNaN(aaApart)) {
                 //if not ambig && is selfLink
                if (match.confirmedHomomultimer === false
						&& match.protein1.length == 1 && match.protein2.length == 1
                        && match.protein1[0] == match.protein2[0]) {
					var unambigCrossLink = match.crossLinks[0];
                    var calc = unambigCrossLink.toResidue - unambigCrossLink.fromResidue - 1;
					if (calc < aaApart){
						return false;
						
					}
				}
            }
            
            var pepLengthFilter = this.get("pepLength");
            if (!isNaN(pepLengthFilter)) {
                 //if not ambig && is selfLink
                if (match.pepSeq1.length <= pepLengthFilter || match.pepSeq2.length <= pepLengthFilter) {
                    return false;
                }
            }
            
            return true;
            
       },
       
       validationStatusFilter: function (match){
        
            var vChar = match.validated;
            if (vChar == 'R') return false;
            if (vChar == 'A' && this.get("A")) return true;
            if (vChar == 'B' && this.get("B")) return true;
            if (vChar == 'C' && this.get("C")) return true;
            if (vChar == '?' && this.get("Q")) return true;
            
            if (match.autovalidated && this.get("AUTO")) return true;
			if (match.autovalidated == false && !vChar && this.get("unval")) return true;
            return false;
      
			// if fail score cut off, return false;
            if (match.score < this.get("matchScoreCutoff")[0] || match.score > this.get("matchScoreCutoff")[1]){
				return false;
			}
		},
       
       navigationFilter: function (match) {
      	
			//peptide seq check
			if (seqCheck(this.get("pepSeq")) == false) {
				return false;
			};
			
			//protein name check
			if (proteinNameCheck(this.get("protNames")) == false) {
				return false;
			};
			
			//charge check
			var chargeFilter = this.get("charge");
			if (chargeFilter && match.precursorCharge != chargeFilter){
				return false;
			}

			//run name check
			var runNameFilter = this.get("runName");
			if (runNameFilter && 
					match.runName.toLowerCase().indexOf(runNameFilter.toLowerCase()) == -1){
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
					var pepStrings = searchString.split('-');
					if (pepStrings.length ==1) {
						for (matchedPeptide of match.matchedPeptides) {
							if (matchedPeptide.sequence.indexOf(searchString.toUpperCase()) != -1
								|| matchedPeptide.seq_mods.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
								return true;
							}
						}
						return false;
					}
					
					var used = [], matchedPepCount = match.matchedPeptides.length;
					for (pepString of pepStrings) {
						if (pepString){
							var found = false;
							for (var i = 0; i < matchedPepCount; i++){
								var matchedPeptide = match.matchedPeptides[i];
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
					var nameStrings = searchString.split('-');
					if (nameStrings.length ==1) {
						for (matchedPeptide of match.matchedPeptides) {
							for (pid of matchedPeptide.prt) {

								var interactor = CLMSUI.compositeModelInst.get("clmsModel").get("participants").get(pid);
								var toSearch = interactor.name + " " + interactor.description;
								if (toSearch.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
									return true;
								}
							
							}
						}
						return false;
					}
					
					var used = [], matchedPepCount = match.matchedPeptides.length;
					for (nameString of nameStrings) {
						if (nameString){
							var found = false;
							for (var i = 0; i < matchedPepCount; i++){
								var matchedPeptide = match.matchedPeptides[i];
								if (found === false && typeof used[i] == 'undefined'){
									for (pid of matchedPeptide.prt) {
										var interactor = CLMSUI.compositeModelInst.get("clmsModel").get("participants").get(pid);
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
        
       filterLink: function (link) {
            if (link.meta && link.meta.meanMatchScore !== undefined) {
                var fdr = link.meta.meanMatchScore;
                var intra = CLMSUI.modelUtils.isIntraLink (link);
                return fdr >= this.get (intra ? "intraFDRCut" : "interFDRCut");
            }
            return false;
        }
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
            console.log ("Blosum model initialised", this);
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

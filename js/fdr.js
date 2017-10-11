var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinksArr, options) {
    
    var defaultScoreCalcFunc = function (crossLink) {      // default function is based on quadratic mean (rms)
        var filtered = crossLink.matches_pp
            .filter (function (match_pp) {
                // filter out matches which don't pass current subset filter (used to be just peptide length we considered here)
                return filterModel.subsetFilter (match_pp.match, proteinMatchFunc);
            })
        ;
        return Math.sqrt (d3.mean (filtered, function(match_pp) { return match_pp.match.score * match_pp.match.score; }) || 0);
    };
    
    // 'threshold' can be legitimately undefined to have no fdr   
    options = _.extend ({}, {scoreCalcFunc: defaultScoreCalcFunc, threshold: undefined, filterLinears: false}, options);
    
    var filterModel = options.filterModel;
    var clmsModel = options.CLMSModel;
    if (!filterModel || !clmsModel) {
        return null;
    }
    
    var proteinMatchFunc = clmsModel.isMatchingProteinPairFromIDs.bind(clmsModel);
    
    // Work out link score based on a function of the related match scores
    var clCount = crossLinksArr.length;
    for (var i = 0; i < clCount; ++i) {
		var crossLink = crossLinksArr[i];
        crossLink.meta = crossLink.meta || {};
        crossLink.meta.meanMatchScore = options.scoreCalcFunc (crossLink);
    }
    
    // filter out linears
    if (options.filterLinears) {
        crossLinksArr = crossLinksArr.filter (function (link) { return !link.isLinearLink(); });
    }
    
    // Divide crosslinks into inter and intra-protein groups, and sort them by the scores just calculated
    var arrLabels = ["Inter", "Intra"];
    var linkArrs = _.partition (crossLinksArr, function (xLink) { return !xLink.isSelfLink (); });
    linkArrs.forEach (function (linkArr) { 
        linkArr.sort (function(a,b) { return a.meta.meanMatchScore - b.meta.meanMatchScore; }); 
    });  // in ascending order (lowest first)
    //console.log ("linkArrs", linkArrs);
    
    // What kind of link is this, TT, DT or DD? (0, 1 or 2)
    function decoyClass (link) {
        return (link.fromProtein.is_decoy ? 1 : 0) + ((!link.toProtein || link.toProtein.is_decoy) ? 1 : 0);
    }
    
    // Loop through both groups and work out the fdr
    var fdrResult = linkArrs.map (function (linkArr, index) {
        var fdr = 1, t = [0,0,0,0], cutoffIndex = 0, runningFdr = [], fdrScoreCutoff;
        
        if (linkArr.length && options.threshold !== undefined) {
            // first run, count tt, td, and dd
            linkArr.forEach (function (link) {
                if (link.meta.meanMatchScore > 0) {
                    t[decoyClass(link)]++;
                } else {
					t[3]++;
				}
            });

            //console.log ("totals tt td dd", t, linkArr);
            var nonzero = d3.sum(t) > 0;
            var runningMin = Number.POSITIVE_INFINITY;
            
            // decrement the counters on second run
            linkArr.forEach (function (link, i) {
                // A. Apply score first
                fdr = (t[1] - t[2]) / (t[0] || 1);
                runningMin = Math.min (fdr, runningMin);
                fdr = runningMin;
                runningFdr.push (fdr);
                link.meta.fdr = fdr;
                //console.log ("fdr", arrLabels[index], fdr, t, link.meta.meanMatchScore);

                // B. then change running totals
                if (link.meta.meanMatchScore > 0) {
                    t[decoyClass(link)]--;
                }
                i++;
                if (fdr <= options.threshold && cutoffIndex === 0) {
                    cutoffIndex = i;
                    //console.log ("cutoff totals tt td dd", t, link, cutoffIndex);
                }
            });

            if (cutoffIndex === 0) {    // if cutoff was never met
                cutoffIndex = linkArr.length;   // then set cutoffindex to last index in array
            }
            
            cutoffIndex = Math.max (cutoffIndex - 1, 0);
            var lastLink = linkArr[cutoffIndex];
            fdrScoreCutoff = nonzero ? lastLink.meta.meanMatchScore : 0.001;

            if (false) {
                console.log (arrLabels[index]+" post totals tt td dd (should be zero)", t);
                console.log ("runningFdr", runningFdr, "final fdr", fdr);
                console.log (fdr, "fdr of", options.threshold, "met or lower at index", cutoffIndex, "link", lastLink, "and fdr score", fdrScoreCutoff);
            }
        }

        return {label: arrLabels[index], index: cutoffIndex, fdr: fdrScoreCutoff, totals: t, thresholdMet: fdr !== undefined && !(fdr > options.threshold)};
    });
    
    return fdrResult;
};

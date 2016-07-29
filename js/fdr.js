var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinks, options) {
    
    var threshold = options.threshold;  // can be legitimately undefined to have no fdr
    
    var defaultPeptideLength = 4;
    var peptideLength = options.peptideLength || defaultPeptideLength;
    
    
    var defaultScoreCalcFunc = function (crossLink) {      // default is quadratic mean (rms)
        var filtered = crossLink.matches_pp
            .filter (function (match_pp) {
                return match_pp.match.pepSeq1.length > peptideLength && match_pp.match.pepSeq2.length > peptideLength;
            })
        ;
        return Math.sqrt (d3.mean (filtered, function(match_pp) { return match_pp.match.score * match_pp.match.score; }) || 0);
    };
    var scoreCalcFunc = options.scoreCalcFunc || defaultScoreCalcFunc;
    
    crossLinks.forEach (function (crossLink) {
        crossLink.meta = crossLink.meta || {};
        crossLink.meta.fdrScore = scoreCalcFunc (crossLink);
    });
    
    
    var clinkArr = Array.from (crossLinks.values());
    var linkArrs = [[],[]];
    var arrLabels = ["Inter", "Intra"];
    clinkArr.forEach (function (crossLink) {
        var intra = CLMSUI.modelUtils.isIntraLink (crossLink) ? 1 : 0;
        linkArrs[intra].push(crossLink);
    });
    linkArrs.forEach (function (linkArr) { 
        linkArr.sort (function(a,b) { return a.meta.fdrScore - b.meta.fdrScore; }); 
    });  // in ascending order (smallest first)

    console.log ("linkArrs", linkArrs);
    
    function decoyClass (link) {
        return (link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0);
    }
    
    var fdrResult = linkArrs.map (function (linkArr, index) {
        var fdr = 1, t = [0,0,0], i = 0, runningFdr = [], fdrScore = undefined;
        
        if (linkArr.length && threshold !== undefined) {
            // first run, count tt, td, and dd
            linkArr.forEach (function (link) {
                if (link.meta.fdrScore > 0) {
                    t[decoyClass(link)]++;
                }
            });

            console.log ("totals tt td dd", t);
            
            // decrement the counters on second run
            while (fdr > threshold && i < linkArr.length) {
                var link = linkArr[i];
                fdr = (t[1] - t[2]) / (t[0] || 1);
                runningFdr.push (fdr);
                //console.log ("fdr", arrLabels[index], fdr, t, link.meta.fdrScore);

                if (link.meta.fdrScore > 0) {
                    t[decoyClass(link)]--;
                }
                i++;
            }

            i = Math.max (i-1, 0);
            var lastLink = linkArr[i];
            fdrScore = lastLink.meta.fdrScore;

            if (false) {
                console.log ("post totals tt td dd", t);
                console.log ("runningFdr", runningFdr);
                console.log ("fdr of",threshold,"at index",i,"link",lastLink,"and fdr score", fdrScore);
            }
        }

        return {label: arrLabels[index], index: i, fdr: fdrScore, totals: t, thresholdMet: fdr !== undefined && !(fdr > threshold)};
    });
    
    return fdrResult;
};

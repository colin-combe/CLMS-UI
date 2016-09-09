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
        crossLink.meta.meanMatchScore = scoreCalcFunc (crossLink);
    });
    
    var clinkArr = Array.from (crossLinks.values());
    var linkArrs = [[],[]];
    var arrLabels = ["Inter", "Intra"];
    clinkArr.forEach (function (crossLink) {
        var intra = CLMSUI.modelUtils.isIntraLink (crossLink) ? 1 : 0;
        linkArrs[intra].push(crossLink);
    });
    linkArrs.forEach (function (linkArr) { 
        linkArr.sort (function(a,b) { return a.meta.meanMatchScore - b.meta.meanMatchScore; }); 
    });  // in ascending order (lowest first)

    console.log ("linkArrs", linkArrs);
    
    function decoyClass (link) {
        return (link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0);
    }
    
    var fdrResult = linkArrs.map (function (linkArr, index) {
        var fdr = 1, t = [0,0,0], i = 0, cutoffIndex = 0, runningFdr = [], fdrScoreCutoff = undefined;
        
        if (linkArr.length && threshold !== undefined) {
            // first run, count tt, td, and dd
            linkArr.forEach (function (link) {
                if (link.meta.meanMatchScore > 0) {
                    t[decoyClass(link)]++;
                }
            });

            console.log ("totals tt td dd", t, linkArr);
            
            
            // decrement the counters on second run
            linkArr.forEach (function (link, i) {
                fdr = (t[1] - t[2]) / (t[0] || 1);
                runningFdr.push (fdr);
                link.meta.fdr = fdr;
                //console.log ("fdr", arrLabels[index], fdr, t, link.meta.meanMatchScore);

                if (link.meta.meanMatchScore > 0) {
                    t[decoyClass(link)]--;
                }
                i++;
                if (fdr <= threshold && cutoffIndex === 0) {
                    cutoffIndex = i;
                }
            });

            cutoffIndex = Math.max (cutoffIndex - 1, 0);
            var lastLink = linkArr[cutoffIndex];
            fdrScoreCutoff = lastLink.meta.meanMatchScore;

            if (true) {
                console.log ("post totals tt td dd", t);
                console.log ("runningFdr", runningFdr);
                console.log ("fdr of",threshold,"met or lower at index",cutoffIndex,"link",lastLink,"and fdr score", fdrScoreCutoff);
            }
        }

        return {label: arrLabels[index], index: cutoffIndex, fdr: fdrScoreCutoff, totals: t, thresholdMet: fdr !== undefined && !(fdr > threshold)};
    });
    
    return fdrResult;
};

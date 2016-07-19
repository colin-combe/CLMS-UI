var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinks, options) {
    
    var defaultThreshold = 0.05;
    var threshold = options.threshold || defaultThreshold;
    
    var defaultPeptideLength = 4;
    var peptideLength = options.peptideLength || defaultPeptideLength;
    
    
    var defaultScoreCalcFunc = function (crossLink) {      // default is quadratic mean (rms)
        var filtered = crossLink.matches
            .filter (function (match) {
                return match[0].pepSeq1.length > peptideLength && match[0].pepSeq2.length > peptideLength;
            })
        ;
        return Math.sqrt (d3.mean (filtered, function(match) { return match[0].score * match[0].score; }) || 0);
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
        var fdr = 1, t = [0,0,0], i = 0, lastLink = {fdrScore: undefined};
        var runningFdr = [];
        if (linkArr.length) {
            // count tt, td, and dd
            linkArr.forEach (function (link) {
                if (link.meta.fdrScore > 0) {
                    t[decoyClass(link)]++;
                }
            });

            i = 0;
            console.log ("totals tt td dd", t);
            
            // decrement the counters on second run
            while (fdr > threshold && i < linkArr.length) {
                var link = linkArr[i];
                fdr = (t[1] - t[2]) / (t[0] || 1);
                runningFdr.push (fdr);
                console.log ("fdr", arrLabels[index], fdr, t, link.meta.fdrScore);
                
                if (link.meta.fdrScore > 0) {
                    t[decoyClass(link)]--;
                }
                i++;
            }

            console.log ("post totals tt td dd", t);
            console.log ("runningFdr", runningFdr);
            i = Math.max (i-1, 0);
            lastLink = linkArr[i];
            console.log ("i", i, lastLink);
            console.log ("fdr of",threshold,"at index",i,"link",lastLink,"and fdr score", lastLink.meta.fdrScore);
        }

        return {label: arrLabels[index], index: i, fdr: lastLink.meta.fdrScore, totals: t, thresholdMet: !(fdr > threshold)};
    });
    
    return fdrResult;
};
var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinks, options) {
    
    var defaultThreshold = 0.05;
    var threshold = options.threshold || defaultThreshold;
    
    var defaultPeptideLength = 4;
    var peptideLength = options.peptideLength || defaultPeptideLength;
    
    console.log ("options", options);
    
    
    var defaultScoreCalcFunc = function (crossLink) {      // default is quadratic mean (rms)
        var filtered = crossLink.matches
            .filter (function (match) {
                //console.log ("match", match);
                return match[0].pepSeq1.length > peptideLength && match[0].pepSeq2.length > peptideLength;
            })
        ;
        return Math.sqrt (d3.mean (filtered, function(match) { return match[0].score * match[0].score; }) || 0);
    };
    var scoreCalcFunc = options.scoreCalcFunc || defaultScoreCalcFunc;
    
    crossLinks.forEach (function (crossLink) {
        crossLink.fdrScore = scoreCalcFunc (crossLink);
    });
    
    
    var clinkArr = Array.from (crossLinks.values());
    var linkArrs = [[],[]];
    var arrLabels = ["Inter", "Intra"];
    clinkArr.forEach (function (crossLink) {
        var intra = ((crossLink.toProtein.id === crossLink.fromProtein.id) || CLMSUI.modelUtils.isReverseProtein (crossLink.toProtein, crossLink.fromProtein)) ? 1 : 0;
        linkArrs[intra].push(crossLink);
    });
    linkArrs.forEach (function (linkArr) { 
        linkArr.sort (function(a,b) { return a.fdrScore - b.fdrScore; }); 
    });  // in ascending order

    console.log ("linkArrs", linkArrs);
    
    var fdrResult = linkArrs.map (function (linkArr, index) {
        var fdr = 1, t = [0,0,0], i = 0, lastLink = {fdrScore: undefined};
        var runningFdr = [];
        if (linkArr.length) {
            linkArr.forEach (function (link) {
                if (link.fdrScore > 0) {
                    var a = (link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0);
                    t[a]++;
                }
            });

            i = 0;
            console.log ("totals tt td dd", t);
            
            while (fdr > threshold && i < linkArr.length) {
                var link = linkArr[i];

                fdr = (t[1] - t[2]) / t[0];
                runningFdr.push (fdr);
                if (link.fdrScore > 0) {
                    t[(link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0)]--;
                }
                console.log ("fdr", arrLabels[index], fdr, t);
                i++;
            }

            console.log ("post totals tt td dd", t);
            console.log ("runningFdr", runningFdr);
            i--;
            lastLink = linkArr[i];
            console.log ("i", i, lastLink);
            console.log ("fdr of",threshold,"at index",i,"link",lastLink,"and fdr score", lastLink.fdrScore);
        }

        return {label: arrLabels[index], index: i, fdr: lastLink.fdrScore, totals: t, thresholdMet: !(fdr > threshold)};
    });
    
    
    
    return fdrResult;
};
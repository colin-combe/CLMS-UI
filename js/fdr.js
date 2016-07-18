var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinks, threshold) {
    crossLinks.forEach (function (crossLink) {
        var linkScore = crossLink.matches.reduce (function(total, match) {
            return total + (match[0].score * match[0].score);
        }, 0);
        crossLink.fdrScore = Math.sqrt(linkScore);  // quadratic mean (rms)
    });
    
    var clinkArr = Array.from (crossLinks.values());
    clinkArr.sort (function(a,b) { return b.fdrScore - a.fdrScore; });  // in descending order
    var fdr = 0, t = [0,0,0], i = 0;
    
    while (fdr < threshold && i < clinkArr.length) {
        var link = clinkArr[i];
        var p1 = link.fromProtein.is_decoy;
        var p2 = link.toProtein.is_decoy;
        var a = (p1 ? 1 : 0) + (p2 ? 1 : 0);
        t[a]++;
        
        if (t[0]) {
            //from http://www.mcponline.org/content/suppl/2013/12/12/M113.034009.DC1/mcp.M113.034009-1.pdf
            fdr = (t[1] - t[2]) / t[0];
        }
        
        console.log ("fdr", fdr, t);
        i++;
    }
    
    i--;
    var lastLink = clinkArr[i];
    console.log ("fdr of",threshold,"at index",i,"link",lastLink,"and fdr score", lastLink.fdrScore);
    
    return {index: i, fdr: lastLink.fdrScore, totals: t, thresholdMet: !(fdr < threshold)};
};
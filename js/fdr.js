var CLMSUI = CLMSUI || {};

CLMSUI.fdr = function (crossLinks) {
    crossLinks.forEach (function (crossLink, crossLinkID) {
        var linkScore = crossLink.matches.reduce (function(total, match) {
            return total + (match[0].score * match[0].score);
        }, 0);
        crossLink.fdrScore = Math.sqrt(linkScore);
    });
    
    var clinkArr = Array.from (crossLinks.values());
    clinkArr.sort (function(a,b) { return a.fdrScore - b.fdrScore; });
    
    var fdr = 0;
    var target = 0.05;
    var t = [0,0,0], i = 0;
    
    
    while (fdr < target || i < clinkArr.length) {
        var link = clinkArr[i];
        var p1 = link.fromProtein.is_decoy;
        var p2 = link.toProtein.is_decoy;
        var a = +[p1 ? 1 : 0] + (+[p2 ? 1 : 0]);
        t[a]++;
        
        if (t[2]) {
            fdr = t[2] / t[0];
        }
        
        console.log ("fdr", fdr, t);
        i++;
    }
    
    
    

    
};
var CLMSUI = CLMSUI || {};

CLMSUI.modelUtils = {
    generateRandomDistribution: function (count, distanceMatrix) {
        var rd = [];
        var matSize = distanceMatrix.length;
        
        for (; --count >= 0;) {
             // floor them or we poke array with fractional values which gives us an infinite loop as no values are found
            var randIndex1 = Math.floor (Math.random() * matSize); 
            var randIndex2 = Math.floor (Math.random() * matSize);
            
            var val = (randIndex1 > randIndex2) 
                ? (distanceMatrix[randIndex1] ? distanceMatrix[randIndex1][randIndex2] : null)
                : (distanceMatrix[randIndex2] ? distanceMatrix[randIndex2][randIndex1] : null)
            ;
            if (val == null) {
                count++;
            } else {
                rd.push(val);
            }
        }
        
        return rd;
    },
    
    flattenDistanceMatrix: function (distanceMatrix) {
        var distanceList =  [].concat.apply([], distanceMatrix);
        distanceList = distanceList.filter(function(d) { return d !== null; });
        return distanceList;
    },
    
    
};
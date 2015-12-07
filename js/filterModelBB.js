var CLMSUI = CLMSUI || {};

CLMSUI.FilterModelBB = Backbone.Model.extend ({
    initialize: function () {
        this.set ({
            "A": true, "B": true, "C": true, "Q": false,
            "AUTO": false,
            "selfLinks": true, "ambig": true,
            "cutoff": [0,100]
        });   
    },
    
    filter: function (match) {
        var vChar = match.validated;
        var scorePass = (!match.score || (match.score >= this.get("cutoff")[0] && match.score <= this.get("cutoff")[1]));
        if (!scorePass) { return false; }
        
        if (vChar == 'A' && this.get("A")) return true;
        if (vChar == 'B' && this.get("B")) return true;
        if (vChar == 'C' && this.get("C")) return true;
        if (vChar == '?' && this.get("Q")) return true;
        if (match.autovalidated && this.get("AUTO")) return true;
        return false;
    }
});
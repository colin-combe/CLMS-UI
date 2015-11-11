var CLMSUI = CLMSUI || {};

CLMSUI.FilterModelBB = Backbone.Model.extend ({
    initialize: function () {
        this
            .set ("A", true)
            .set ("B", true)
            .set ("C", true)
            .set ("Q", false)
            .set ("AUTO", false)
            .set ("selfLinks", true)
            .set ("ambig", true)
            .set ("cutoff", 0)
        ;
        
    },
    
    filter: function (match) {
        var vChar = match.validated;
        var scorePass = (!match.score || match.score >= this.get("cutOff"))
        
        if (vChar == 'A' && this.get("A") && scorePass) return true;
        if (vChar == 'B' && this.get("B") && scorePass) return true;
        if (vChar == 'C' && this.get("C") && scorePass) return true;
        if (vChar == '?' && this.get("Q") && scorePass) return true;
        if (match.autovalidated && this.get("AUTO") && scorePass) return true;
        return false;
    }
});
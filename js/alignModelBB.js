(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};

    global.CLMSUI.AlignModelBB = global.Backbone.Model.extend ({
        defaults: {
            "gapOpenScore" : -3,
            "gapExtendScore" : -2,
            "matchScore": 1,
            "misScore": -1,
            "refSeq": "CHATTER",
            "compSeqs": ["CAT"],
            "compLabels": ["Demo"],
            "local": false,
        },
        
        align: function () {
            var scores = {
                match: this.get("matchScore"), 
                mis: this.get("misScore"), 
                gapOpen: this.get("gapOpenScore"), 
                gapExt: this.get("gapExtendScore")
            };
            
            var refSeq = this.get("refSeq");
            var fullResults = this.get("compSeqs").map (function (cSeq) {
                return global.CLMSUI.SequenceUtils.align (cSeq, refSeq, scores, this.get("local"));
            }, this);
            
            var refResults = fullResults.map (function (res) {
               return {str: res.fmt[1]}; 
            });
            
            var compResults = fullResults.map (function (res, i) {
               return {
                   str: res.fmt[0], 
                   refStr: res.fmt[1], 
                   indexFromRef: res.indx.qToTarget, 
                   indexToRef: res.indx.tToQuery, 
                   cigar: res.res[2], 
                   score: res.res[0], 
                   label: this.get("compLabels")[i]}; 
                }, 
                this
            );
            
            this
                .set ("refAlignments", refResults)
                .set ("compAlignments", compResults)
            ;
            
            return this;
        },
    });
})(this); 
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    global.CLMSUI.BackboneModelTypes = global.CLMSUI.BackboneModelTypes || {};

    global.CLMSUI.BackboneModelTypes.AlignModel = global.Backbone.Model.extend ({
        defaults: {
            "displayLabel": "A Protein",    // label to display in collection view for this model
            "scoreMatrix": undefined,   // slot for a BLOSUM type matrix
            "matchScore": 6,    // match and mis should be superceded by the score matrix if present
            "misScore": -6,
            "gapOpenScore" : 10,
            "gapExtendScore" : 1,
            "gapAtStartScore": 0,   // fixed penalty for starting with a gap (semi-global alignment)
            "refSeq": "CHATTER",
            "refID": "Canonical",
            "compSeqs": ["CAT"],
            "compIDs": ["Demo"],
            "local": false,
            "sequenceAligner": global.CLMSUI.GotohAligner,
        },
        
        initialize: function () {
            //this.set("compIDs", ["Demo"]);
            
            // do more with these change listeners if we want to automatically run align function on various parameters changing;
            // or we may just want to call align manually when things are known to be done
            this.listenTo (this, "change", function() { 
                console.log ("something in align settings changed", this.changed); 
                if (!("refAlignments" in this.changed) && !("compAlignments" in this.changed)) {
                    console.log ("and it's not the final results so lets runs align again");
                    this.align();
                }
            });
            
            return this;
        },
        
        align: function () {
            console.log ("alignModel", this);
            var matrix = this.get("scoreMatrix");
            if (matrix) { matrix = matrix.attributes; } // matrix will be a Backbone Model
            
            var scores = {
                matrix: matrix,
                match: this.get("matchScore"), 
                mis: this.get("misScore"), 
                gapOpen: this.get("gapOpenScore"), 
                gapExt: this.get("gapExtendScore"),
                gapAtStart: this.get("gapAtStartScore")
            };
            
            var refSeq = this.get("refSeq");
            var aligner = this.get("sequenceAligner");
            var fullResults = this.get("compSeqs").map (function (cSeq) {
                return aligner.align (cSeq, refSeq, scores, this.get("local"));
            }, this);
            
            var refResults = fullResults.map (function (res) {
               return {str: res.fmt[1], label: this.get("refID")}; 
            }, this);
            
            var compResults = fullResults.map (function (res, i) {
               return {
                   str: res.fmt[0], 
                   refStr: res.fmt[1], 
                   convertToRef: res.indx.qToTarget, 
                   convertFromRef: res.indx.tToQuery, 
                   cigar: res.res[2], 
                   score: res.res[0], 
                   label: this.get("compIDs")[i]}; 
                }, 
                this
            );
            
            console.log ("rr", refResults, compResults);
            
            this
                .set ("refAlignments", refResults)
                .set ("compAlignments", compResults)
            ;
            
            return this;
        },
    });
    
    
    global.CLMSUI.BackboneModelTypes.AlignCollection = global.Backbone.Collection.extend ({
        model: global.CLMSUI.BackboneModelTypes.AlignModel,
        
        // use this to grab merger of new and existing arrays for a model attribute before adding/merging the collection's models themselves
        mergeArrayAttr: function (modelId, attrName, appendThis) {
            var model = this.get(modelId);
            if (model) {
                var attr = model.get(attrName);
                if (attr && global.$.type(attr) === "array") {
                    appendThis.unshift.apply (appendThis, attr);
                }
            }
            return appendThis;
        },
    });
    
})(this); 

    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

    CLMSUI.BackboneModelTypes.AlignModel = Backbone.Model.extend ({
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
            "semiLocal": false,
            "maxAlignWindow": 1000,
            "sequenceAligner": CLMSUI.GotohAligner,
        },
        
        initialize: function () {
            //this.set("compIDs", ["Demo"]);
            
            // do more with these change listeners if we want to automatically run align function on various parameters changing;
            // or we may just want to call align manually when things are known to be done
            this.listenTo (this, "change", function() { 
                console.log ("something in align settings changed", this.changed); 
                console.log ("this semi", this.get("semiLocal"));
                if (!("refAlignments" in this.changed) && !("compAlignments" in this.changed)) {
                    console.log ("and it's not the final results so lets runs align again");
                    this.align();
                }
            });
            
            return this;
        },
        
        align: function () {
            console.log ("alignModel", this);
            
            var fullResults = this.alignWithoutStoring (this.get("compSeqs"));
            
            var refResults = fullResults.map (function (res) {
               return {str: res.fmt[1], label: this.get("refID")}; 
            }, this);
            
            this.seqIndex = {};
            
            var compResults = fullResults.map (function (res, i) {
                    var seqLabel = this.get("compIDs")[i];
                    this.seqIndex[seqLabel] = i;

                   return {
                       str: res.fmt[0], 
                       refStr: res.fmt[1], 
                       convertToRef: res.indx.qToTarget, 
                       convertFromRef: res.indx.tToQuery, 
                       cigar: res.res[2], 
                       score: res.res[0], 
                       label: seqLabel,
                   }; 
                }, 
                this
            );
            
            console.log ("align results", refResults, compResults);
            
            this
                .set ("refAlignments", refResults)
                .set ("compAlignments", compResults)
            ;
            
            return this;
        },
        
        alignWithoutStoring: function (compSeqArray) {
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
            var fullResults = compSeqArray.map (function (cSeq) {
                var alignWindowSize = (refSeq.length > this.get("maxAlignWindow") ? this.get("maxAlignWindow") : undefined);
                return aligner.align (cSeq, refSeq, scores, this.get("local"), this.get("semiLocal"), alignWindowSize);
            }, this);
            
            return fullResults;
        },
        
        getCompSequence: function (seqName) {
            var sInd = this.seqIndex[seqName];
            return sInd !== undefined ? this.get("compAlignments")[sInd] : undefined;
        },
        
        // These following routines assume that 'index' passed in is 1-indexed, and the return value wanted will be 1-indexed too
        // if no compSeq will return undefined
        // will return NaN for out of bound indices
        mapToSearch: function (seqName, index) {
            var compSeq = this.getCompSequence (seqName);
            return compSeq ? compSeq.convertToRef [index - 1] + 1: undefined;
        },
        
        mapFromSearch: function (seqName, index) {
            var compSeq = this.getCompSequence (seqName);
            return compSeq ? compSeq.convertFromRef [index - 1] + 1 : undefined;
        },
        
        bulkMapToSearch: function (seqName, indices) {
            var compSeq = this.getCompSequence (seqName);
            return compSeq ? indices.map (function(i) { return compSeq.convertToRef [i - 1] + 1; }) : undefined;
        },
        
        bulkMapFromSearch: function (seqName, indices) {
            var compSeq = this.getCompSequence (seqName);
            return compSeq ? indices.map (function(i) { return compSeq.convertFromRef [i - 1] + 1; }) : undefined;
        },
    });
    
    
    CLMSUI.BackboneModelTypes.AlignCollection = Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.AlignModel,
         
        addSeq: function (modelId, seqId, seq, otherSettingsObj) {
            var model = this.get(modelId);
            if (model) {
                console.log ("entry", modelId, seqId, seq, model.seqIndex);
                
                var sInd = model.seqIndex[seqId];
                if (sInd !== undefined) {   // if there's already a 3d entry replace it
                    model.get("compSeqs")[sInd] = seq;
                    model.set("compSeqs", model.get("compSeqs").slice(0));
                    model.trigger("change", model); // change listener in alignment model is non-specific so not 'change:compSeqs'
                } else {    // otherwise add it
                    var modelParams = otherSettingsObj || {};
                    $.extend (modelParams, {
                        "id": modelId,
                        "compIDs": this.mergeArrayAttr (modelId, "compIDs", [seqId]),
                        "compSeqs": this.mergeArrayAttr (modelId, "compSeqs", [seq]),
                    });
                    this.add ([modelParams], {merge: true});
                }
                console.log ("this align coll", this);
            }
        },
        
        // use this to grab merger of new and existing arrays for a model attribute before adding/merging the collection's models themselves
        mergeArrayAttr: function (modelId, attrName, appendThis) {
            var model = this.get(modelId);
            if (model) {
                var attr = model.get(attrName);
                if (attr && $.type(attr) === "array") {
                    appendThis.unshift.apply (appendThis, attr);
                }
            }
            return appendThis;
        },
    });
    
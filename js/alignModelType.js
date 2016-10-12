
    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

    CLMSUI.BackboneModelTypes.SeqModel = Backbone.Model.extend ({
        defaults: {
            semiLocal: false,
        },
        
        intialize: function () {
            this.listenTo (this, "change", function() { 
                console.log ("sm. something in align settings changed", this.changed); 
                if (!("refAlignment" in this.changed) && !("compAlignment" in this.changed)) {
                    console.log ("sm. and it's not the final results so lets runs align again");
                    this.align();
                }
            });
            
            return this;
        },
        
        align: function () {
            var fullResults = this.get("holderModel").alignWithoutStoring (
                [this.get("compSeq")], {local: this.get("local"), semiLocal: this.get("semiLocal")}
            );
            
            var refResults = fullResults.map (function (res) {
               return {str: res.fmt[1], label: this.get("holderModel").get("refID")}; 
            }, this);
            
            var compResults = fullResults.map (function (res) {
                return {
                       str: res.fmt[0], 
                       refStr: res.fmt[1], 
                       convertToRef: res.indx.qToTarget, 
                       convertFromRef: res.indx.tToQuery, 
                       cigar: res.res[2], 
                       score: res.res[0], 
                       label: this.get("compID"),
                   }; 
                }, 
                this
            );
            
            console.log ("align results", refResults, compResults);
            
            this
                .set ("refAlignment", refResults[0])
                .set ("compAlignment", compResults[0])
            ;
            
            return this;
        },
    });

    CLMSUI.BackboneModelTypes.SeqCollection = Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.SeqModel,
        
        initialize: function () {
            this.listenTo (this, "add", function (addedModel) { 
                console.log ("add seqcoll arguments", arguments);
                addedModel.align();
            });
            return this;
        }
    });

    CLMSUI.BackboneModelTypes.AlignModel = Backbone.Model.extend ({
        // return defaults as result of a function means arrays aren't shared between model instances
        // http://stackoverflow.com/questions/17318048/should-my-backbone-defaults-be-an-object-or-a-function
        defaults: function() {
            return {
                "displayLabel": "A Protein",    // label to display in collection view for this model
                "scoreMatrix": undefined,   // slot for a BLOSUM type matrix
                "matchScore": 6,    // match and mis should be superceded by the score matrix if present
                "misScore": -6,
                "gapOpenScore" : 10,
                "gapExtendScore" : 1,
                "gapAtStartScore": 0,   // fixed penalty for starting with a gap (semi-global alignment)
                "refSeq": "CHATTER",
                "refID": "Example",
                //"compSeqs": [],
                //"compIDs": [],
                //"local": [],
                //"semiLocal": [],
                "maxAlignWindow": 1000,
                "sequenceAligner": CLMSUI.GotohAligner,
                "seqCollection": new CLMSUI.BackboneModelTypes.SeqCollection (),
            };
        },
        
        initialize: function () {
            //this.set("compIDs", ["Demo"]);
            
            this.seqIndex = {};
            // do more with these change listeners if we want to automatically run align function on various parameters changing;
            // or we may just want to call align manually when things are known to be done
            
            
            this.listenTo (this, "change", function() { 
                console.log ("something in align settings changed", this.changed); 
                console.log ("this semi", this.get("semiLocal"));
                if (!("refAlignments" in this.changed) && !("compAlignments" in this.changed)) {
                    console.log ("and it's not the final results so lets runs align again");
                    this.get("seqCollection").forEach (function(model) {
                        console.log ("seqModel", model);
                        model.align();
                    });
                    //this.align();
                }
            });
            
            return this;
        },
        
        /*
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
        */
        
        alignWithoutStoring: function (compSeqArray, tempSemiLocal) {
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
            console.log ("csa", compSeqArray);
            var fullResults = compSeqArray.map (function (cSeq) {
                var alignWindowSize = (refSeq.length > this.get("maxAlignWindow") ? this.get("maxAlignWindow") : undefined);
                var localAlign = (tempSemiLocal && tempSemiLocal.local);// || this.get("local")[i];
                var semiLocalAlign = (tempSemiLocal && tempSemiLocal.semiLocal);// || this.get("semiLocal")[i];
                return aligner.align (cSeq, refSeq, scores, !!localAlign, !!semiLocalAlign, alignWindowSize);
            }, this);
            
            console.log ("fr", fullResults);
            
            return fullResults;
        },
        
        getCompSequence: function (seqName) {
            var seqModel = this.get("seqCollection").get(seqName);
            console.log ("seqModel", seqModel);
            //var sInd = this.seqIndex[seqName];
            //return sInd !== undefined ? this.get("compAlignments")[sInd] : undefined;
            return seqModel !== undefined ? seqModel.get("compAlignment") : undefined;
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
                
                /*
                var sInd = model.seqIndex[seqId];
                if (sInd !== undefined) {   // if there's already a 3d entry replace it
                    model.get("compSeqs")[sInd] = seq;
                    model.set("compSeqs", model.get("compSeqs").slice(0));
                    model.trigger("change", model); // change listener in alignment model is non-specific so not 'change:compSeqs'
                } else {    // otherwise add it
                    var modelParams = otherSettingsObj || {};
                    $.extend (modelParams, {
                        "id": modelId,
                        "compIDs": this.mergeArrayAttr (model, "compIDs", [seqId]),
                        "compSeqs": this.mergeArrayAttr (model, "compSeqs", [seq]),
                        "semiLocal": this.mergeArrayAttr (model, "semiLocal", [!!otherSettingsObj.semiLocal]),
                        "local": this.mergeArrayAttr (model, "local", [!!otherSettingsObj.local]),
                    });
                    console.log ("mp", modelId, modelParams);
                    this.add ([modelParams], {merge: true});
                    */
                    console.log ("modseq", seqId, seq, otherSettingsObj);
                    model.get("seqCollection").add (
                        [{id: seqId, compID: seqId, compSeq: seq, semiLocal: !!otherSettingsObj.semiLocal, local: !!otherSettingsObj.lLocal,
                        holderModel: model}]
                    );
                //}
                console.log ("this align coll", this);
            }
        },
        
        // use this to grab merger of new and existing arrays for a model attribute before adding/merging the collection's models themselves
        mergeArrayAttr: function (model, attrName, appendThis) {
            if (model) {
                var attr = model.get(attrName);
                if (attr && $.type(attr) === "array") {
                    appendThis.unshift.apply (appendThis, attr);
                }
            }
            return appendThis;
        },
        
        // Moved here from NGLViewBB.js, convenience function to convert an index in a given align sequence in a given align model to the search sequence
        // (or vice versa)
        // TODO, need to check for decoys (protein has no alignment)
        // conversion here works to and from the resindex local to a chain
        getAlignedIndex: function (resIndex, proteinID, toSearchSeq, sequenceID) {
            var alignModel = this.get (proteinID);
            var alignPos = resIndex;
            
            if (alignModel) {
                var seqLength = alignModel.getCompSequence(sequenceID)[toSearchSeq ? "convertFromRef" : "convertToRef"].length;
                alignPos = toSearchSeq ? alignModel.mapToSearch (sequenceID, resIndex) : alignModel.mapFromSearch (sequenceID, resIndex);
                //console.log (resIndex, "->", alignPos, alignModel);
                // if alignPos == 0 then before seq, if alignpos <== -seqlen then after seq
                //console.log (pdbChainSeqId, "seqlen", seqLength);
                if (alignPos === 0 || alignPos <= -seqLength) { // returned alignment is outside (before or after) the alignment target
                    alignPos = null;    // null can be added / subtracted to without NaNs, which undefined causes
                }
                if (alignPos < 0) { alignPos = -alignPos; }   // otherwise < 0 indicates no equal index match, but is within the target, do the - to find nearest index
            }
            
            return alignPos;    //this will be 1-indexed or null
        },
    });
    
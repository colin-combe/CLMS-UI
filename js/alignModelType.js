    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

    // Model for one sequence pairing
    CLMSUI.BackboneModelTypes.SeqModel = Backbone.Model.extend ({
        defaults: {
            local: false,
            semiLocal: false,
        },
        
        align: function () {
            var fullResult = this.get("holderModel").alignWithoutStoring (
                [this.get("compSeq")], {local: this.get("local"), semiLocal: this.get("semiLocal")}
            )[0];
            
            var refResult = {str: fullResult.fmt[1], label: this.get("holderModel").get("refID")}; 
            
            var compResult = {
               str: fullResult.fmt[0], 
               refStr: fullResult.fmt[1], 
               convertToRef: fullResult.indx.qToTarget, 
               convertFromRef: fullResult.indx.tToQuery, 
               cigar: fullResult.res[2], 
               score: fullResult.res[0], 
               label: this.get("compID"),
            }; 
            
            //console.log ("align results", refResult, compResult);    
            // redundant looking alignStr variable is used so we can directly monitor changes in it with backbone rather than dig through compAlignment object
            this.set ({refAlignment: refResult, compAlignment: compResult, alignStr: fullResult.fmt[0]});
            
            return this;
        },
    });

    // Collection of multiple single sequence pairing models from above
    CLMSUI.BackboneModelTypes.SeqCollection = Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.SeqModel,
        
        initialize: function () {
            this.listenTo (this, "add", function (addedModel) { 
                //~ console.log ("new sequence added. align it.", arguments);
                this.currentlyAddingModel = addedModel;
                addedModel.align();
                this.currentlyAddingModel = null;
            });
            return this;
        }
    });

    // Model of sequence alignment settings for a protein (including the above collection as an attribute)
    CLMSUI.BackboneModelTypes.ProtAlignModel = Backbone.Model.extend ({
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
                "maxAlignWindow": 1000,
                "sequenceAligner": CLMSUI.GotohAligner,
                "seqCollection": new CLMSUI.BackboneModelTypes.SeqCollection (),
            };
        },
        
        initialize: function () {
            // this is where changes to gap scores and blosum choices are picked up
            this.listenTo (this, "change", function() { 
                //~ console.log ("something in per protein align settings changed so realign all prot seqs", this.changed); 
                this.get("seqCollection").forEach (function (model) {
                    model.align();
                });
            });
            
            this.listenTo (this.get("seqCollection"), "change:alignStr", function (seqModel) {
                //console.log ("collection catching one of its model's alignStr changing", arguments);
                this.trigger ("nonTrivialAlignmentChange", seqModel); 
            });
            
            return this;
        },
        
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

            var fullResults = compSeqArray.map (function (cSeq) {
                var alignWindowSize = (refSeq.length > this.get("maxAlignWindow") ? this.get("maxAlignWindow") : undefined);
                var localAlign = (tempSemiLocal && tempSemiLocal.local);// || this.get("local")[i];
                var semiLocalAlign = (tempSemiLocal && tempSemiLocal.semiLocal);// || this.get("semiLocal")[i];
                return aligner.align (cSeq, refSeq, scores, !!localAlign, !!semiLocalAlign, alignWindowSize);
            }, this);
            
            //console.log ("fr", fullResults);
            
            return fullResults;
        },
        
        getCompSequence: function (seqName) {
            var seqModel = this.get("seqCollection").get(seqName);
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
        
        getSearchIndexOfFirstMatch: function (seqName) {
            var compSeq = this.getCompSequence (seqName);
            var cref = compSeq.convertToRef;
            var val = undefined;
            for (var n = 0; n < cref.length; n++) {
                if (cref[n] >= 0) {
                    val = cref[n];
                    break;
                }
            }
            return val;   
        }
    });
    
    
    // A collection of the above protein level models
    CLMSUI.BackboneModelTypes.ProtAlignCollection = Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.ProtAlignModel,
        
        initialize: function () {
             this.listenTo (this, "nonTrivialAlignmentChange", function () {
                this.nonTrivialChange = true;
            });
        },
        
        nonTrivialChange: undefined,
         
        addSeq: function (modelId, seqId, seq, otherSettingsObj) {
            var model = this.get (modelId);
            if (model) {
                //console.log ("entry", modelId, seqId, seq, otherSettingsObj);
                model.get("seqCollection").add (
                    [{id: seqId, compID: seqId, compSeq: seq, semiLocal: !!otherSettingsObj.semiLocal, local: !!otherSettingsObj.lLocal, holderModel: model}]
                );
            }
            return this;
        },
        
        bulkAlignChangeFinished: function () {
            if (this.nonTrivialChange !== false) {
                this.trigger ("bulkAlignChange", true);
                console.log ("BULK ALIGN CHANGE");
                this.nonTrivialChange = false;
            }
        },
        
        // Moved here from NGLViewBB.js, convenience function to convert an index in a given align sequence in a given align model to the search sequence
        // (or vice versa)
        // TODO, need to check for decoys (protein has no alignment)
        // conversion here works to and from the resindex local to a chain
        // IMPORTANT: The following routine assumes that 'index' passed in is 1-indexed, and the return value wanted will be 1-indexed too
        getAlignedIndex: function (resIndex, proteinID, toSearchSeq, sequenceID, keepNegativeValue) {
            var protAlignModel = this.get (proteinID);
            var alignPos = resIndex;
            
            if (protAlignModel) {
                var seqLength = protAlignModel.getCompSequence(sequenceID)[toSearchSeq ? "convertFromRef" : "convertToRef"].length;
                alignPos = toSearchSeq ? protAlignModel.mapToSearch (sequenceID, resIndex) : protAlignModel.mapFromSearch (sequenceID, resIndex);
                //console.log (resIndex, "->", alignPos, protAlignModel);
                // if alignPos == 0 then before seq, if alignpos <== -seqlen then after seq
                //console.log (pdbChainSeqId, "seqlen", seqLength);
                if (alignPos === 0 || alignPos <= -seqLength) { // returned alignment is outside (before or after) the alignment target
                    alignPos = null;    // null can be added / subtracted to without NaNs, which undefined causes
                }
                if (alignPos < 0 && !keepNegativeValue) { alignPos = -alignPos; }   // otherwise < 0 indicates no equal index match, but is within the target, do the - to find nearest index
            }
            
            return alignPos;    //this will be 1-indexed or null
        },
        
        getAlignmentsAsFeatures: function (protID, includeCanonical) {
            var model = this.get(protID);
            if (model) {
                return model.get("seqCollection").models
                    .map (function (seqModel) {
                        var alignment = seqModel.get("compAlignment");
                        return {
                            begin: 1, 
                            start: 1, //todo - why begin and start
                            end: alignment.convertToRef.length, 
                            name: alignment.label, 
                            protID: protID, 
                            id: protID+" "+alignment.label, 
                            category: "Alignment", 
                            type: "PDB aligned region", 
                            alignmentID: seqModel.get("compID")
                        };
                    })
                    .filter(function (alignFeature) {
                        return includeCanonical || alignFeature.name !== "Canonical";     
                    })
                ;
            }
            return [];
        },
        
        getAlignmentSearchRange: function (proteinID, sequenceID) {
            var protAlignModel = this.get (proteinID);
            if (protAlignModel) {
                var arr = protAlignModel.getCompSequence(sequenceID).convertToRef;
                var first = _.find (arr, function(item) { return item > 0; });
                var last = _.findLastIndex (arr, function (item) { return item > 0; });
                return [first + 1, (last > 0 ? arr[last] + 1 : undefined)];
            } else {
                return [undefined, undefined];
            }
        },
    });
    
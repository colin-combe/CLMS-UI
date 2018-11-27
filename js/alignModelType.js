    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};

    // Model for one sequence pairing
    CLMSUI.BackboneModelTypes.SeqModel = Backbone.Model.extend({
        defaults: {
            local: false,
            semiLocal: false,
        },

        align: function() {
            var fullResult = this.get("holderModel").alignWithoutStoring(
                [this.get("compSeq")], {
                    local: this.get("local"),
                    semiLocal: this.get("semiLocal")
                }
            )[0];

            var refResult = {
                str: fullResult.fmt[1],
                label: this.get("holderModel").get("refID")
            };

            var compResult = {
                str: fullResult.fmt[0],
                refStr: fullResult.fmt[1],
                convertToRef: fullResult.indx.qToTarget,
                convertFromRef: fullResult.indx.tToQuery,
                cigar: fullResult.res[2],
                score: fullResult.res[0],
                bitScore: fullResult.bitScore,
                eScore: fullResult.eScore,
                label: this.get("compID"),
            };

            //console.log ("align results", refResult, compResult);
            // redundant looking alignStr variable is used so we can directly monitor changes in it with backbone rather than dig through compAlignment object
            this.set({
                refAlignment: refResult,
                compAlignment: compResult,
                alignStr: fullResult.fmt[0]
            });

            return this;
        },
    });

    // Collection of multiple single sequence pairing models from above
    CLMSUI.BackboneModelTypes.SeqCollection = Backbone.Collection.extend({
        model: CLMSUI.BackboneModelTypes.SeqModel,

        initialize: function() {
            this.listenTo(this, "add", function(addedModel) {
                //~ console.log ("new sequence added. align it.", arguments);
                this.currentlyAddingModel = addedModel;
                addedModel.align();
                this.currentlyAddingModel = null;
            });
            return this;
        }
    });

    // Model of sequence alignment settings for a protein (including the above collection as an attribute)
    CLMSUI.BackboneModelTypes.ProtAlignModel = Backbone.Model.extend({
        // return defaults as result of a function means arrays aren't shared between model instances
        // http://stackoverflow.com/questions/17318048/should-my-backbone-defaults-be-an-object-or-a-function
        defaults: function() {
            return {
                "displayLabel": "A Protein", // label to display in collection view for this model
                "scoreMatrix": undefined, // slot for a BLOSUM type matrix
                "matchScore": 6, // match and mis should be superceded by the score matrix if present
                "misScore": -6,
                "gapOpenScore": 10,
                "gapExtendScore": 1,
                "gapAtStartScore": 0, // fixed penalty for starting with a gap (semi-global alignment)
                "refSeq": "CHATTER",
                "refID": "Example",
                "maxAlignWindow": 1000,
                "sequenceAligner": CLMSUI.GotohAligner,
                "seqCollection": new CLMSUI.BackboneModelTypes.SeqCollection(),
            };
        },

        initialize: function() {
            // this is where changes to gap scores and blosum choices are picked up
            this.listenTo(this, "change", function() {
                // console.log ("something in per protein align settings changed so realign all prot seqs", this.changed);
                // change to displayLabel doesn't affect alignment so ignore if just this has changed
                if (!(this.hasChanged("displayLabel") && d3.keys(this.changedAttributes()).length === 1)) {
                    this.get("seqCollection").forEach(function(model) {
                        model.align();
                    });
                }
            });

            // if the alignStr between a refAlignment and compAlignment has changed then declare a non-trivial change
            this.listenTo(this.get("seqCollection"), "change:alignStr", function(seqModel) {
                //console.log ("collection catching one of its model's alignStr changing", arguments);
                this.trigger("nonTrivialAlignmentChange", seqModel);
            });

            // redo sequence name labels if protein metadata updates names
            this.listenTo(CLMSUI.vent, "proteinMetadataUpdated", function(metaMetaData) {
                var columns = metaMetaData.columns;
                var interactors = metaMetaData.items;
                if (!columns || columns.indexOf("name") >= 0) {
                    var interactor = interactors.get(this.get("id"));
                    if (interactor) {
                        this.set("displayLabel", interactor.name.replace("_", " "));
                    }
                }
            });

            return this;
        },

        alignWithoutStoring: function(compSeqArray, tempSemiLocal) {
            return this.alignWithoutStoringWithSettings(compSeqArray, tempSemiLocal, this.getSettings());
        },

        alignWithoutStoringWithSettings: function(compSeqArray, tempSemiLocal, settings) {
            var alignWindowSize = (settings.refSeq.length > settings.maxAlignWindow ? settings.maxAlignWindow : undefined);
            var localAlign = (tempSemiLocal && tempSemiLocal.local);
            var semiLocalAlign = (tempSemiLocal && tempSemiLocal.semiLocal);

            var fullResults = compSeqArray.map(function(cSeq) {
                var bioseqResults = settings.aligner.align(cSeq, settings.refSeq, settings.scoringSystem, !!localAlign, !!semiLocalAlign, alignWindowSize);
                bioseqResults.bitScore = this.getBitScore(bioseqResults.res[0], settings.scoringSystem.matrix);
                bioseqResults.eScore = this.alignmentSignificancy(bioseqResults.bitScore, settings.refSeq.length, cSeq.length);
                return bioseqResults;
            }, this);

            //console.log ("fr", fullResults);

            return fullResults;
        },

        getBitScore: function(rawScore, blosumData) {
            var lambda = (blosumData ? blosumData.lambda : 0.254) || 0.254;
            var K = (blosumData ? blosumData.K : 0.225042) || 0.225042;
            var bitScore = ((lambda * rawScore) - Math.log(K)) / Math.LN2;
            return bitScore;
        },

        alignmentSignificancy: function(bitScore, dbLength, seqLength) {
            var exp = Math.pow(2, -bitScore);
            return dbLength * seqLength * exp; // escore
        },

        getSettings: function() {
            var matrix = this.get("scoreMatrix");
            if (matrix) {
                matrix = matrix.attributes;
            } // matrix will be a Backbone Model

            var scoringSystem = {
                matrix: matrix,
                match: this.get("matchScore"),
                mis: this.get("misScore"),
                gapOpen: this.get("gapOpenScore"),
                gapExt: this.get("gapExtendScore"),
                gapAtStart: this.get("gapAtStartScore")
            };

            var refSeq = this.get("refSeq");
            var aligner = this.get("sequenceAligner");

            return {
                scoringSystem: scoringSystem,
                refSeq: refSeq,
                aligner: aligner,
                maxAlignWindow: this.get("maxAlignWindow")
            };
        },

        getCompSequence: function(seqName) {
            var seqModel = this.get("seqCollection").get(seqName);
            return seqModel !== undefined ? seqModel.get("compAlignment") : undefined;
        },

        // These following routines assume that 'index' passed in is 1-indexed, and the return value wanted will be 1-indexed too
        // if no compSeq will return undefined
        // will return NaN for out of bound indices
        mapToSearch: function(seqName, index) {
            var compSeq = this.getCompSequence(seqName);
            return compSeq ? compSeq.convertToRef[index - 1] + 1 : undefined;
        },

        mapFromSearch: function(seqName, index) {
            var compSeq = this.getCompSequence(seqName);
            return compSeq ? compSeq.convertFromRef[index - 1] + 1 : undefined;
        },

        bulkMapToSearch: function(seqName, indices) {
            var compSeq = this.getCompSequence(seqName);
            return compSeq ? indices.map(function(i) {
                return compSeq.convertToRef[i - 1] + 1;
            }) : undefined;
        },

        bulkMapFromSearch: function(seqName, indices) {
            var compSeq = this.getCompSequence(seqName);
            return compSeq ? indices.map(function(i) {
                return compSeq.convertFromRef[i - 1] + 1;
            }) : undefined;
        },

        rangeToSearch: function(seqName, index1, index2) {
            var i1 = this.mapToSearch(seqName, index1);
            var i2 = this.mapToSearch(seqName, index2);
            var seqLength = this.getCompSequence(seqName).convertFromRef.length;

            if ((i1 === 0 && i2 === 0) || (i1 <= -seqLength && i2 <= -seqLength)) {
                return null; // both points outside (and same side) of sequence we attempted to match to
            }

            if (i1 <= 0) {
                i1 = -i1;
            } // <= 0 indicates no equal index match, do the - to find nearest index
            if (i2 <= 0) {
                i2 = -i2;
            } // <= 0 indicates no equal index match, do the - to find nearest index

            return [i1, i2];
        },

        // find the first and last residues in a sequence that map to existing residues in the search sequence (i.e aren't
        // opening or trailing gaps), and return these coordinates in terms of the search sequence
        getSearchRangeIndexOfMatches: function(seqName) {
            var compSeq = this.getCompSequence(seqName);
            var nonNegative = function(num) {
                return num >= 0;
            };
            var first = compSeq ? _.find(compSeq.convertToRef, nonNegative) + 1 : undefined;
            var index = compSeq ? _.findLastIndex(compSeq.convertToRef, nonNegative) : -1;
            var last = index >= 0 ? compSeq.convertToRef[index] + 1 : undefined;
            var subSeq = first && last ? this.get("refSeq").substring(first - 1, last) : "";
            return {
                first: first,
                last: last,
                subSeq: subSeq
            };
        },

        // For a given sequence return a list of the sequential indices
        // i.e. as above but split for gaps
        blockify: function(seqName) {
            var seq = this.getCompSequence(seqName);
            var index = seq.convertToRef;
            var blocks = [];
            var start = index[0];
            for (var n = 0; n < index.length - 1; n++) {
                if (Math.abs(index[n + 1] - index[n]) > 1) { // if non-contiguous numbers i.e. a break
                    if (index[n] >= 0) {
                        blocks.push({
                            begin: start + 1,
                            end: index[n] + 1
                        });
                    }
                    start = index[n + 1];
                }
            }
            blocks.push({
                begin: start + 1,
                end: _.last(index) + 1
            });

            blocks = CLMSUI.modelUtils.mergeContiguousFeatures(blocks);

            return blocks;
        },
    });


    // A collection of the above protein level models
    CLMSUI.BackboneModelTypes.ProtAlignCollection = Backbone.Collection.extend({
        model: CLMSUI.BackboneModelTypes.ProtAlignModel,

        initialize: function() {
            this.listenTo(this, "nonTrivialAlignmentChange", function() {
                this.nonTrivialChange = true;
            });
        },

        comparator: "displayLabel",

        possibleComparators: [{
                label: "Name",
                compFunc: "displayLabel"
            },
            {
                label: "No. of Aligned Sequences",
                compFunc: function(m) {
                    return m.get("seqCollection").length;
                }
            },
            {
                label: "Total Alignment Score",
                compFunc: function(m) {
                    return d3.sum(m.get("seqCollection").pluck("compAlignment").map(function(ca) {
                        return ca.score;
                    }))
                }
            }
        ],

        nonTrivialChange: undefined,

        addSeq: function(modelId, seqId, seq, otherSettingsObj) {
            var model = this.get(modelId);
            otherSettingsObj = otherSettingsObj || {};
            if (model) {
                //console.log ("entry", modelId, seqId, seq, otherSettingsObj);
                model.get("seqCollection").add(
                    [{
                        id: seqId,
                        compID: seqId,
                        compSeq: seq,
                        semiLocal: !!otherSettingsObj.semiLocal,
                        local: !!otherSettingsObj.lLocal,
                        holderModel: model
                    }]
                );
            }
            return this;
        },

        bulkAlignChangeFinished: function() {
            if (this.nonTrivialChange !== false) {
                this.trigger("bulkAlignChange", true);
                console.log("BULK ALIGN CHANGE");
                this.nonTrivialChange = false;
            }
        },

        // Moved here from NGLViewBB.js, convenience function to convert an index in a given align sequence in a given align model to the search sequence
        // (or vice versa)
        // TODO, need to check for decoys (protein has no alignment)
        // conversion here works to and from the resindex local to a chain
        // IMPORTANT: The following routine assumes that 'index' passed in is 1-indexed, and the return value wanted will be 1-indexed too
        getAlignedIndex: function(resIndex, proteinID, toSearchSeq, sequenceID, keepNegativeValue) {
            var protAlignModel = this.get(proteinID);
            var alignPos = resIndex;

            if (protAlignModel) {
                // seqLength attribution NOT wrong way round.
                // we use seqLength to determine whether a negative (no direct match) index is somewhere within the matched-to sequence or outside of it altogether
                // e.g. pairing sequences, ref = ABCDEFGHI, nonRef = CDFG
                // cfr = [-1, -1, 0, 1, -2, 2, 3, -5, -5]
                // ctr = [2, 3, 5, 6]
                // when say going from 'E' in ref to nonref (fromSearch, cfr to ctr) , value for cfr index is -2, which is bigger than -4 (neg length of ctr) so value is within
                // when say going from 'H' in ref to nonref (fromSearch, cfr to ctr) , value for cfr index is -5, which is smaller than/equal to -4 (neg length of ctr) so value is outside
                var seqLength = protAlignModel.getCompSequence(sequenceID)[toSearchSeq ? "convertFromRef" : "convertToRef"].length;
                alignPos = toSearchSeq ? protAlignModel.mapToSearch(sequenceID, resIndex) : protAlignModel.mapFromSearch(sequenceID, resIndex);
                //console.log (resIndex, "->", alignPos, "toSearch: ", toSearchSeq, seqLength);
                // if alignPos == 0 then before seq, if alignpos <== -seqlen then after seq
                //console.log (pdbChainSeqId, "seqlen", seqLength);
                if (alignPos === 0 || alignPos <= -seqLength) { // returned alignment is outside (before or after) the alignment target
                    alignPos = null; // null can be added / subtracted to without NaNs, which undefined causes
                } else if (alignPos < 0 && !keepNegativeValue) {
                    alignPos = -alignPos;
                } // otherwise < 0 indicates no equal index match, but is within the target, do the - to find nearest index
            }

            return alignPos; //this will be 1-indexed or null
        },

        getSearchRangeIndexOfMatches: function(proteinID, sequenceID) {
            var protAlignModel = this.get(proteinID);
            return protAlignModel ? protAlignModel.getSearchRangeIndexOfMatches(sequenceID) : [undefined, undefined];
        },

        getAlignmentsAsFeatures: function(protID, includeCanonical) {
            var model = this.get(protID);
            if (model) {
                return model.get("seqCollection").models
                    .map(function(seqModel) {
                        var alignment = seqModel.get("compAlignment");
                        return {
                            begin: 1,
                            start: 1, //todo - why begin and start
                            end: alignment.convertToRef.length,
                            name: alignment.label,
                            protID: protID,
                            id: protID + " " + alignment.label,
                            category: "Alignment",
                            type: "PDB aligned region",
                            alignmentID: seqModel.get("compID")
                        };
                    })
                    .filter(function(alignFeature) {
                        return includeCanonical || alignFeature.name !== "Canonical";
                    });
            }
            return [];
        },
    });

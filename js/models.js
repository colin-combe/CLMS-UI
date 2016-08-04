var CLMSUI = CLMSUI || {};

CLMSUI.BackboneModelTypes = _.extend (CLMSUI.BackboneModelTypes || {},

{
    DistancesModel: Backbone.Model.extend({
        flattenedDistances: function () {
            return CLMSUI.modelUtils.flattenDistanceMatrix (this.get("distances"));
        }
    }),

    FilterModel: Backbone.Model.extend ({
        defaults: {
            "A": true, "B": true, "C": true, "Q": false,
            "AUTO": false,
            "selfLinks": true,
            "ambig": true,
            "seqSep": "",
        },

        initialize: function () {
            // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
            this.set ("cutoff", [0,100]);
        },

        filter: function (match) {
            //~ match = match[0];
            var vChar = match.validated;
            var scorePass = (!match.score || (match.score >= this.get("cutoff")[0] && match.score <= this.get("cutoff")[1]));
            if (!scorePass) { return false; }

            var seqSepFilter = this.get("seqSep");
            if (!isNaN(seqSepFilter)) {
                 //if not ambig && is selfLink
                if (match.protein1.length == 1 && match.protein2
                        && match.protein1[0] == match.protein2[0]) {
                    var unambigCrossLink = match.crossLinks[0];
                    if ((unambigCrossLink.toResidue - unambigCrossLink.fromResidue) < seqSepFilter){
                        return false;
                    }
                }
            }

            if (vChar == 'A' && this.get("A")) return true;
            if (vChar == 'B' && this.get("B")) return true;
            if (vChar == 'C' && this.get("C")) return true;
            if (vChar == '?' && this.get("Q")) return true;
            if (match.autovalidated && this.get("AUTO")) return true;
            return false;
        }
    }),


    RangeModel: Backbone.Model.extend ({
        defaults: {
            active: false
        },
    }),

        // I want MinigramBB to be model agnostic so I can re-use it in other places
    MinigramModel: Backbone.Model.extend ({
        defaults: {
            domainStart: 0,
            domainEnd: 100,
        },
        data: function() { return [1,2,3,4]; },
    }),

    TooltipModel: Backbone.Model.extend ({
        defaults: {
            location: null,
            header: "Tooltip",
        },
        initialize: function () {
            // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
            this.set("contents", ["Can show", "single items", "lists or", "tables"]);
        }
    }),

    BlosumModel: Backbone.Model.extend ({
        initialize: function() {
            console.log ("Blosum model initialised", this);
        },
    }),


    TestModel: Backbone.Model.extend ({
        defaults : {
            prime: "animal",
            //secondaries: ["blee", "whee"],
            tertiary: 36,
        },

        initialize: function () {
            // http://stackoverflow.com/questions/6433795/backbone-js-handling-of-attributes-that-are-arrays
            // ^^^setting an array in defaults passes that same array reference to every instantiated model, so do it in initialize
            this.set ("secondaries", ["blee", "whee"]);
        },
    }),

});

// this is separate to get round the fact BlosumModel won't be available within the same declaration
CLMSUI.BackboneModelTypes = _.extend (CLMSUI.BackboneModelTypes || {},
{
    BlosumCollection: Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.BlosumModel,
        url: "R/blosums.json",
        parse: function(response) {
            // turn json object into array, add keys to value parts, then export just the values
            var entries = d3.entries (response);
            var values = entries.map (function (entry) {
                entry.value.key = entry.key;
                return entry.value;
            });

            console.log ("response", response, values);
            return values;
        }
    }),

    TestCollection: Backbone.Collection.extend ({
        model: CLMSUI.BackboneModelTypes.TestModel,

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
    }),
});

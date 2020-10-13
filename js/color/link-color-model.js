var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.DefaultLinkColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function() {
        this
            .set("labels", this.get("colScale").copy().range(["Self Cross-Links", "Self Cross-Links (Overlapping Peptides)", "Between Protein Cross-Links"]))
            .set("type", "ordinal")
        ;
    },
    getValue: function(crossLink) {
        return crossLink.isSelfLink() || crossLink.isLinearLink() ? (crossLink.confirmedHomomultimer ? 1 : 0) : 2;
    },
});


CLMSUI.BackboneModelTypes.GroupColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function(attrs, options) {

        this.searchMap = options.searchMap;
        // find the search to group mappings
        var groups = new Map();
        var searchArray = CLMS.arrayFromMapValues(this.searchMap);
        searchArray.forEach(function(search) {
            var arr = groups.get(search.group);
            if (!arr) {
                arr = [];
                groups.set(search.group, arr);
            }
            arr.push(search.id);
        });

        // build scales on the basis of this mapping
        var groupDomain = [-1]; //[undefined];
        var labelRange = ["Multiple Groups"];
        var groupArray = CLMS.arrayFromMapEntries(groups);
        groupArray.forEach(function(group) {
            groupDomain.push(group[0]);
            labelRange.push("Group " + group[0] + " (" + group[1].join(", ") + ")");
        });

        var groupCount = groups.size;
        var colScale;

        var multiGroupColour = "#202020"; // default colour for links involved in multiple groups
        if (groupCount < 11) {
            var colArr = [multiGroupColour].concat(groupCount < 6 ? colorbrewer.Dark2[5] : colorbrewer.Paired[10]);
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
        } else { // more than 10 groups, not really feasible to find colour scale that works - a d3.scale that always returns gray?
            colScale = d3.scale.linear().domain([-1, 0]).range([multiGroupColour, "#448866"]).clamp(true);
            labelRange = ["Multiple Groups", "Single Group"];
        }
        this
            .set("colScale", colScale)
            .set("labels", this.get("colScale").copy().range(labelRange))
            .set("type", "ordinal")
        ;
    },
    getValue: function(crossLink) {
        //check if link uniquely belongs to one group
        var filteredMatchesAndPepPositions = crossLink.filteredMatches_pp;

        var value = null;
        for (var fm_pp = filteredMatchesAndPepPositions.length; --fm_pp >= 0;) {
            var match = filteredMatchesAndPepPositions[fm_pp].match;
            var group = this.searchMap.get(match.searchId).group;
            if (!value) {
                value = group;
            } else if (value !== group) {
                value = -1;    //undefined;
                break;
            }
        }
        // choose value if link definitely belongs to just one group or set as undefined (-1)
        return value;
    },
    getColourByValue: function(val) {
        var scale = this.get("colScale");
        // the ordinal scales will have had a colour for undefined already added to their scales (in initialize)
        // if it's the linear scale [-1 = multiple, 0 = single] and value is undefined we change it to -1 so it then takes the [multiple] colour value
        if (val === undefined && scale.domain()[0] === -1) {
            val = -1;
        }
        // now all 'undefined' values will get a colour so we don't have to check/set undefined colour here like we do in the default getColour function
        return scale(val);
    },
    getColour: function(crossLink) {
        return this.getColourByValue (this.getValue (crossLink));
    },
});

CLMSUI.BackboneModelTypes.DistanceColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function() {
        this
            .set("type", "threshold")
            .set("labels", this.get("colScale").copy().range(["Within Distance", "Borderline", "Overlong"]))
            .set("unit", "Å")
        ;
    },
    getValue: function(crossLink) {
        return crossLink.getMeta("distance");
        //return CLMSUI.compositeModelInst.getSingleCrosslinkDistance(crossLink);
    },
});

CLMSUI.BackboneModelTypes.InterProteinColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function(properties, options) {
        var colScale;
        var labels = ["Same Protein"];
        var proteinIDs = _.pluck (CLMSUI.modelUtils.filterOutDecoyInteractors (CLMS.arrayFromMapValues(options.proteins)), "id");

        if (proteinIDs && proteinIDs.length > 2 && proteinIDs.length < 6) {
            var groupDomain = ["same"];
            proteinIDs.forEach (function (proteinID1, i) {
                for (var m = i + 1; m < proteinIDs.length; m++) {
                    groupDomain.push (this.makeProteinPairKey(proteinID1, proteinIDs[m]));
                    labels.push (options.proteins.get(proteinID1).name + " - " + options.proteins.get(proteinIDs[m]).name);
                }
            }, this);
            var colArr = colorbrewer.Set3[10].slice();
            colArr.unshift("grey");
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
        } else {
            colScale = d3.scale.ordinal().range(["blue", "grey"]).domain(["other", "same"]);
            labels = ["Other", "Same"];
            this.overload = true;   // too many proteins for sensible number of colours
        }

        this
            .set("colScale", colScale)
            .set("labels", this.get("colScale").copy().range(labels))
        ;
    },

    makeProteinPairKey: function(pid1, pid2) {
        return pid1 < pid2 ? pid1 + "---" + pid2 : pid2 + "---" + pid1;
    },

    getValue: function(crossLink) {
        var id1 = crossLink.fromProtein.id;
        var id2 = crossLink.toProtein ? crossLink.toProtein.id : undefined;
        return (id2 === undefined || id1 === id2) ? "same" : (this.overload ? "other" : this.makeProteinPairKey(id1, id2));
    },
});


CLMSUI.BackboneModelTypes.MetaDataColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function(properties, options) {
        var domain = this.get("colScale").domain();
        var labels;
        if (this.isCategorical()) {
            labels = domain.map(function(domVal) {
                return String(domVal)
                    .toLowerCase()
                    .replace(/\b[a-z](?=[a-z]{1})/g, function(letter) {
                        return letter.toUpperCase();
                    });
            });
        } else {
            labels = (domain.length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]);
            domain.map(function(domVal, i) {
                labels[i] += " (" + domVal + ")";
            });
        }

        this.set("labels", this.get("colScale").copy().range(labels));
    },
    getValue: function (obj) {  // obj can be anything with a getMeta function - crosslink or, now, proteins
        return obj.getMeta(this.get("field"));
    },
});

/* Colour model that doesn't use crosslink properties, if querying by crosslink will just return undefined colour */
/* Q: What's the point then? A: it can be used to return colours to values, and also as it extends ColourModel we */
/* can change the colours in the legend panel. */
CLMSUI.BackboneModelTypes.NonCrossLinkColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function() {
        var domain = this.get("colScale").domain();
        var labels = (domain.length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]);
        domain.map(function(domVal, i) {
            labels[i] += " (" + domVal + ")";
        });

        this
            .set("labels", this.get("colScale").copy().range(labels))
            .set("title", this.get("id"))
            .set("longDescription", this.get("id"))
        ;
    },
    getValue: function() {
        return undefined;
    },
});


/* Colour model based on map of crosslinks to values rather than properties of crosslinks themselves */
/* Good for making models based on calculated / derived values */
CLMSUI.BackboneModelTypes.MapBasedLinkColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function() {
        var domain = this.get("colScale").domain();
        var labels = (domain.length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]);
        domain.map(function(domVal, i) {
            labels[i] += " (" + domVal + ")";
        });

        this.set("labels", this.get("colScale").copy().range(labels));
    },
    getValue: function(obj) {   // obj is generally a crosslink, but can be any object with an id property that is a key in a supplied valueMap
        return this.get("valueMap")[obj.id];
    },
});
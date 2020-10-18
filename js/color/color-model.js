var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.ColourModel = Backbone.Model.extend({
    defaults: {
        title: undefined,
        longDescription: undefined,
        type: "linear",
        fixed: false,
        undefinedColour: "#aaa",
        undefinedLabel: "Unknown",
        unit: "",
    },
    setDomain: function(newDomain) {
        this.get("colScale").domain(newDomain);
        this.triggerColourModelChanged({
            domain: newDomain
        });
        return this;
    },
    setRange: function(newRange) {
        this.get("colScale").range(newRange);
        this.triggerColourModelChanged({
            range: newRange
        });
        return this;
    },
    getDomainIndex: function (obj) {    // obj is generally a crosslink, but is non-specific at this point
        const val = this.getValue(obj);
        const dom = this.get("colScale").domain();
        return val != undefined ? (this.get("type") !== "ordinal" ? d3.bisect(dom, val) : dom.indexOf(val)) : undefined;
    },
    getDomainCount: function() {
        const domain = this.get("colScale").domain();
        return this.isCategorical() ? (this.get("type") === "threshold" ? domain.length + 1 : domain.length) : domain[1] - domain[0] + 1;
    },
    getColour: function(obj) {  // obj is generally a crosslink, but is non-specific at this point
        const val = this.getValue(obj);
        return val !== undefined ? this.get("colScale")(val) : this.get("undefinedColour");
    },
    getColourByValue: function(val) {
        return val !== undefined ? this.get("colScale")(val) : this.get("undefinedColour");
    },
    triggerColourModelChanged: function(changedAttrs) {
        this.trigger("colourModelChanged", this, changedAttrs);
    },
    isCategorical: function() {
        return this.get("type") !== "linear";
    },
    getLabelColourPairings: function () {
        const colScale = this.get("colScale");
        const labels = this.get("labels").range().concat(this.get("undefinedLabel"));
        const minLength = Math.min(colScale.range().length, this.get("labels").range().length);  // restrict range used when ordinal scale
        const colScaleRange = colScale.range().slice(0, minLength).concat(this.get("undefinedColour"));
        return d3.zip (labels, colScaleRange);
    },
});

CLMSUI.BackboneModelTypes.ColourModelCollection = Backbone.Collection.extend({
    model: CLMSUI.BackboneModelTypes.ColourModel,
});



CLMSUI.linkColour.setupColourModels = function (userConfig) {
    const defaultConfig = {
        default: {domain: [0, 1, 2], range: ["#9970ab", "#35978f", "#35978f"]},
        distance: {domain: [15, 25], range: ['#5AAE61', '#FDB863', '#9970AB']}
    };
    const config = $.extend(true, {}, defaultConfig, userConfig);    // true = deep merging

    CLMSUI.linkColour.defaultColoursBB = new CLMSUI.BackboneModelTypes.DefaultLinkColourModel({
        colScale: d3.scale.ordinal().domain(config.default.domain).range(config.default.range),
        title: "Crosslink Type",
        longDescription: "Default colour scheme, differentiates self links with overlapping peptides.",
        id: "Default"
    });

    const makeGroupColourModel = function () {
        return new CLMSUI.BackboneModelTypes.GroupColourModel({
            title: "Group",
            longDescription: "Differentiate crosslinks by search group when multiple searches are viewed together.",
            id: "Group",
        }, {
            searchMap: CLMSUI.compositeModelInst.get("clmsModel").get("searches"),
        });
    };

    CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();

    CLMSUI.linkColour.interProteinColoursBB = new CLMSUI.BackboneModelTypes.InterProteinColourModel({
        title: "Protein-Protein Colouring",
        longDescription: "Differentiate crosslinks by the proteins they connect. Suitable for 3 to 5 proteins only.",
        id: "InterProtein",
        type: "ordinal"
    }, {
        proteins: CLMSUI.compositeModelInst.get("clmsModel").get("participants")
    });

    CLMSUI.linkColour.distanceColoursBB = new CLMSUI.BackboneModelTypes.DistanceColourModel({
        colScale: d3.scale.threshold().domain(config.distance.domain).range(config.distance.range),
        title: "Distance (Å)",
        longDescription: "Colour crosslinks by adjustable distance category. Requires PDB file to be loaded (via Load -> PDB Data).",
        id: "Distance",
        superDomain: [0, 120], // superdomain is used in conjunction with drawing sliders, it's the maximum that the values in the threshold can be
    });

    //init highest score colour model
    const hiScores = [];
    for (let crosslink of CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks").values()){
        const scores = crosslink.filteredMatches_pp.map(function(m) {
            return m.match.score();
        });
        hiScores.push(Math.max.apply(Math, scores));
    }

    const hiScoresColScale = d3.scale.quantile()
        .domain(hiScores)
        .range(colorbrewer.PRGn[4]);

    CLMSUI.linkColour.highestScoreColoursBB = new CLMSUI.BackboneModelTypes.HighestScoreColourModel({
        colScale: hiScoresColScale, //d3.scale.threshold().domain(config.distance.domain).range(config.distance.range),
        title: "Highest Score",
        longDescription: "Highest score from supporting matches that meet current filter.",
        id: "HiScores",
        // superDomain: [0, 120], // superdomain is used in conjunction with drawing sliders, it's the maximum that the values in the threshold can be
    });

    const linkColourCollection = new CLMSUI.BackboneModelTypes.ColourModelCollection([
        CLMSUI.linkColour.defaultColoursBB,
        CLMSUI.linkColour.interProteinColoursBB,
        CLMSUI.linkColour.groupColoursBB,
        CLMSUI.linkColour.distanceColoursBB,
        CLMSUI.linkColour.highestScoreColoursBB
    ]);

    // If necessary, swap in newly added colour scale with same id as removed (but current) scale pointed to by linkColourAssignment
    const replaceCurrentLinkColourAssignment = function (collection) {
        const currentColourModel = CLMSUI.compositeModelInst.get("linkColourAssignment");
        if (currentColourModel && !currentColourModel.collection) {
            CLMSUI.compositeModelInst.set("linkColourAssignment", collection.get(currentColourModel.get("id")));
        }
    };

    // Just the group colour scale is replaced for this event
    /*linkColourCollection.listenTo(CLMSUI.compositeModelInst.get("clmsModel"), "change:matches", function() {
        this.remove("Group");   // remove old group scale
        CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();
        this.add (CLMSUI.linkColour.groupColoursBB);    // add new group scale
        replaceCurrentLinkColourAssignment(this);   // replace existing selected scale if necessary
    });*/

    // All colour scales with ids in metadataFields array are removed (if already extant) and new scales added
    linkColourCollection.listenTo(CLMSUI.vent, "linkMetadataUpdated", function(metaMetaData) {
        const columns = metaMetaData.columns;
        const crossLinks = metaMetaData.items;
        const colMaps = columns.map(function (field) {
            return CLMSUI.linkColour.makeColourModel(field, field, crossLinks);
        });
        this.remove(columns);
        this.add(colMaps);
        replaceCurrentLinkColourAssignment(this);
    });

    CLMSUI.linkColour.Collection = linkColourCollection;


    // Protein colour schemes

    CLMSUI.linkColour.defaultProteinColoursBB = new CLMSUI.BackboneModelTypes.DefaultProteinColourModel ({
        colScale: d3.scale.ordinal().domain([0]).range(["#fff"]),
        title: "Default Protein Colour",
        longDescription: "Default protein colour.",
        id: "Default Protein"
    });

    // Can add other metadata-based schemes to this collection later
    const proteinColourCollection = new CLMSUI.BackboneModelTypes.ColourModelCollection([
        CLMSUI.linkColour.defaultProteinColoursBB,
    ]);

    // If necessary, swap in newly added colour scale with same id as removed (but current) scale pointed to by linkColourAssignment
    const replaceCurrentProteinColourAssignment = function (collection) {
        const currentColourModel = CLMSUI.compositeModelInst.get("proteinColourAssignment");
        if (currentColourModel && !currentColourModel.collection) {
            CLMSUI.compositeModelInst.set("proteinColourAssignment", collection.get(currentColourModel.get("id")));
        }
    };

    // All colour scales with ids in metadataFields array are removed (if already extant) and new scales added
    proteinColourCollection.listenTo(CLMSUI.vent, "proteinMetadataUpdated", function(metaMetaData) {
        const columns = metaMetaData.columns;
        const proteins = metaMetaData.items;
        const colMaps = columns.map(function (field) {
            return CLMSUI.linkColour.makeColourModel(field, field, proteins);
        });
        this.remove(columns);
        this.add(colMaps);
        replaceCurrentProteinColourAssignment(this);
    });

    CLMSUI.linkColour.ProteinCollection = proteinColourCollection;
};

CLMSUI.linkColour.colourRangeMaker = function (extents) {
    let range = ["green", "blue"];
    if (extents[0] < 0 && extents[1] > 0) {
        extents.splice(1, 0, 0);
        range.splice(1, 0, "#888");
    } else if (extents[0] === extents[1]) {
        range = ["#888"];
    }
    return range;
};

CLMSUI.linkColour.makeColourModel = function(field, label, links) {
    const linkArr = links.length ? links : CLMS.arrayFromMapValues(links);
    // first attempt to treat as if numbers
    const extents = d3.extent(linkArr, function (link) {
        return link.getMeta(field);
    });
    let range = CLMSUI.linkColour.colourRangeMaker(extents);

    // see if it is a list of colours
    const hexRegex = CLMSUI.utils.commonRegexes.hexColour;
    const dataIsColours = (hexRegex.test(extents[0]) && hexRegex.test(extents[1]));
    let isCategorical = false;

    // if it isn't a list of colours and consists of only a few unique values, make it categorical
    if (!dataIsColours) {
        const uniq = d3.set(linkArr.map(function (link) {
            return link.getMeta(field);
        })).size();
        // if the values in this metadata form 6 or less distinct values count it as categorical
        isCategorical = uniq < 7;
        if (isCategorical) {
            //extents.push(undefined);  // removed, undefined will automatically get assigned a value in an ordinal scale if present
            range = colorbrewer.Dark2[8].slice();
        }
    }

    const newColourModel = new CLMSUI.BackboneModelTypes.MetaDataColourModel({
        colScale: (isCategorical ? d3.scale.ordinal() : d3.scale.linear()).domain(extents).range(range),
        id: label,
        title: label || field,
        longDescription: (label || field) + ", " + (isCategorical ? "categorical" : "") + " data extracted from Cross-Link metadata.",
        field: field,
        type: isCategorical ? "ordinal" : "linear",
    });

    if (dataIsColours) {
        // if data is just a list of colours make this colour scale just return the value for getColour
        newColourModel.getColour = function(crosslink) {
            const val = this.getValue(crosslink);
            return val !== undefined ? val : this.get("undefinedColour");
        };
        newColourModel.getColourByValue = function(val) {
            return val !== undefined ? val : this.get("undefinedColour");
        };
        newColourModel
            .set("fixed", true)
            .set("longDescription", (label || field) + ", fixed colours per crosslink from metadata. Not editable.")
        ;
    }

    return newColourModel;
};

CLMSUI.BackboneModelTypes.MetaDataColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend({
    initialize: function(properties, options) {
        const domain = this.get("colScale").domain();
        let labels;
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

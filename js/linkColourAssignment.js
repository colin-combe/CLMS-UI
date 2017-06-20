var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.ColourModel = Backbone.Model.extend ({
    defaults: {
        title: undefined,
    },
    setDomain : function (newDomain) {
        this.get("colScale").domain(newDomain);
        this.triggerColourModelChanged ({domain: newDomain});
    },
    setRange: function (newRange) {
        this.get("colScale").range(newRange);
        this.triggerColourModelChanged ({range: newRange});
    },
    triggerColourModelChanged: function (obj) {
        this.trigger ("colourModelChanged", obj);
        if (this.collection) {
            this.collection.trigger ("aColourModelChanged", this, obj);
        }
    },
});

CLMSUI.BackboneModelTypes.ColourModelCollection = Backbone.Collection.extend ({
    model: CLMSUI.BackboneModelTypes.ColourModel,
});


CLMSUI.BackboneModelTypes.DefaultColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
        this.set("labels", this.get("colScale").copy().range(["Self Link", "Homomultimer Link", "Between Protein Link"]));
    },
    getColour: function (crossLink) {
        return this.get("colScale")(crossLink.isSelfLink() || crossLink.toProtein === null ? (crossLink.confirmedHomomultimer ? 1 : 0) : 2);
    },
});


CLMSUI.BackboneModelTypes.GroupColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function (attrs, options) {
        
        this.searchMap = options.searchMap;
        //put d3.scale for group colour assignment in compositeModel
        var groups = new Map();
		var searchArray = CLMS.arrayFromMapValues(this.searchMap);
		var searchCount = searchArray.length;
        for (var s = 0; s < searchCount; s++) {
            var val = searchArray[s];
            var arr = groups.get(val.group);
            if (!arr) {
                arr = [];
                groups.set (val.group, arr);
            }
            arr.push (val.id);
        }

        var groupDomain = [undefined];
        var labelRange = ["Multiple Group"];
        var groupArray = CLMS.arrayFromMapEntries(groups);
        var groupCount = groupArray.length;
        for (var g = 0; g < groupCount; g++) {
			var group = groupArray[g];
            groupDomain.push (group[0]);
            labelRange.push ("Group "+group[0]+" ("+group[1].join(", ")+")");
        }

        var groupCount = groups.size;
        var colScale;

        var multiGroupColour = "#202020";
        if (groupCount < 6) {
            var colArr = [multiGroupColour].concat(colorbrewer.Dark2[5]);
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
        } else if (groupCount < 11) {
            var colArr = [multiGroupColour].concat(colorbrewer.Paired[10]);
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
        } else { // more than 10 groups, not really feasible to find colour scale that works
                //a d3.scale that always returns gray?
            colScale = d3.scale.linear().domain([-1,0]).range([multiGroupColour, "#448866"]).clamp(true);
            labelRange = ["Multiple Group", "Single Group"];
        }
        this.set("colScale", colScale);
        this.set("labels", this.get("colScale").copy().range(labelRange));
    },
    getColour: function (crossLink) {	
         //check number of groups to choose appropriate colour scheme,
        // (only do once)
        //check if link uniquely belongs to one group
        var groupCheck = d3.set();
        var filteredMatchesAndPepPositions = crossLink.filteredMatches_pp;
        var filteredMatches_ppCount = filteredMatchesAndPepPositions.length;
        for (var fm_pp = 0; fm_pp < filteredMatches_ppCount; fm_pp++) {
            var match = filteredMatchesAndPepPositions[fm_pp].match; 
            var group = this.searchMap.get(match.searchId).group; 	
            groupCheck.add(group);
        }
        var scale = this.get("colScale");
        // choose value or right unknown value (linear scales don't do undefined)
        var groupCheckArr = CLMS.arrayFromMapValues(groupCheck); 
        var value = (groupCheckArr.length === 1 ? groupCheckArr[0] : (scale.domain()[0] === -1 ? -1 : undefined));
        return scale (value);		
    },
});

CLMSUI.BackboneModelTypes.DistanceColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
        this.set("labels", this.get("colScale").copy().range(["Within Distance", "Borderline", "Overlong"]));
    },
    getDistance : function (crossLink) {
        return CLMSUI.compositeModelInst.getSingleCrosslinkDistance (crossLink);
    },
    getColour: function (crossLink) {
        return this.get("colScale")(this.getDistance (crossLink));
    },
});


CLMSUI.BackboneModelTypes.MetaDataColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
        var length = this.get("colScale").domain().length;
        this.set("labels", this.get("colScale").copy().range(length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]));
    },
    getValue : function (crossLink) {
        return crossLink.meta ? crossLink.meta[this.get("field")] : undefined;
    },
    getColour: function (crossLink) {
        return this.get("colScale")(this.getValue (crossLink));
    },
});


CLMSUI.linkColour.setupColourModels = function () {
    CLMSUI.linkColour.defaultColoursBB = new CLMSUI.BackboneModelTypes.DefaultColourModel ({
        colScale: d3.scale.ordinal().domain([0,1,2]).range([
            CLMS.xiNET.defaultSelfLinkColour.toRGB(), CLMS.xiNET.homodimerLinkColour.toRGB(), CLMS.xiNET.defaultInterLinkColour.toRGB()
        ]),
        title: "Default",
        id: "Default"
    });
    
    var makeGroupColourModel = function () {
        return new CLMSUI.BackboneModelTypes.GroupColourModel ({
            title: "Group",
            id: "Group",
        }, {
            searchMap: CLMSUI.compositeModelInst.get("clmsModel").get("searches"),
        });
    };
    
    CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();
    
    CLMSUI.linkColour.distanceColoursBB = new CLMSUI.BackboneModelTypes.DistanceColourModel ({
        colScale: d3.scale.threshold().domain([0,1]).range(['#5AAE61','#FDB863','#9970AB']),
        title: "Distance",
        id: "Distance",
    });

    // add distanceColoursBB to this collection later if needed
    CLMSUI.linkColour.Collection = new CLMSUI.BackboneModelTypes.ColourModelCollection ([
        CLMSUI.linkColour.defaultColoursBB,
        CLMSUI.linkColour.groupColoursBB,
        CLMSUI.linkColour.distanceColoursBB,
    ]);
    
    // Just the group colour scale is replaced for this event
    CLMSUI.linkColour.Collection.listenTo (CLMSUI.vent, "csvLoadingDone", function () {
        console.log ("loading done");    
        console.log ("this", this);
        this.remove ("Group");
        CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();
        this.add (CLMSUI.linkColour.groupColoursBB);
    });
    
    // All colour scales with ids in metadataFields array are removed (if already extant) and added
    CLMSUI.linkColour.Collection.listenTo (CLMSUI.vent, "linkMetadataUpdated", function (metadataFields, crossLinks) {
        var colMaps = metadataFields.map (function (field) {
            return CLMSUI.linkColour.makeColourModel (field, field, crossLinks);
        })
        console.log ("link metadata parsing done", arguments);    
        this.remove (metadataFields);
        this.add (colMaps);
        
        var fieldSet = d3.set (metadataFields);
        // WHAT TO DO WHEN REMOVED SCHEME IS CURRENT SCHEME?
    });
};

CLMSUI.linkColour.makeColourModel = function (field, label, links) {
    var linkArr = CLMS.arrayFromMapValues (links);
    var extents = d3.extent (linkArr, function(link) { return link.meta ? link.meta[field] : undefined; });
    if (extents[0] < 0 && extents[1] > 0) {
        extents.splice (1, 0, 0);
    }
    var range = extents.length == 2 ? ["red", "blue"] : ["red", "white", "blue"];
    
    console.log ("extents", extents);
    return new CLMSUI.BackboneModelTypes.MetaDataColourModel (
        {
            colScale: d3.scale.linear().domain(extents).range(range),
            id: label,
            title: label || field,
            field: field,
        },
        links
    );
};


CLMSUI.linkColour.addColourModel = function (colourModel) {
    CLMSUI.linkColour.Collection.add (colourModel);
};

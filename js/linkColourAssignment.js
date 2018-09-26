var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.ColourModel = Backbone.Model.extend ({
    defaults: {
        title: undefined,
		longDescription: undefined,
		type: "linear",
		fixed: false,
    },
    setDomain: function (newDomain) {
        this.get("colScale").domain(newDomain);
        this.triggerColourModelChanged ({domain: newDomain});
        return this;
    },
    setRange: function (newRange) {
        this.get("colScale").range(newRange);
        this.triggerColourModelChanged ({range: newRange});
        return this;
    },
    getDomainIndex: function (crossLink) {
        var val = this.getValue(crossLink);
		var dom = this.get("colScale").domain();
        return val != undefined ? (this.get("type") !== "ordinal" ? d3.bisect (dom, val) : dom.indexOf (val)) : undefined
        ;
    },
    getDomainCount: function () {
        var domain = this.get("colScale").domain();
        return this.isCategorical() ? (this.get("type") === "threshold" ? domain.length + 1 : domain.length) : domain[1] - domain[0] + 1; 
    },
    getColour: function (crossLink) {
        var val = this.getValue (crossLink);
        return val !== undefined ? this.get("colScale")(val) : this.undefinedColour;
    },
    getColourByValue: function (val) {
        return val !== undefined ? this.get("colScale")(val) : this.undefinedColour;
    },
    triggerColourModelChanged: function (obj) {
        this.trigger ("colourModelChanged", obj);
        if (this.collection) {
            this.collection.trigger ("aColourModelChanged", this, obj);
        }
    },
    isCategorical: function () { return this.get("type") !== "linear"; },
    undefinedColour: "#888",
});

CLMSUI.BackboneModelTypes.ColourModelCollection = Backbone.Collection.extend ({
    model: CLMSUI.BackboneModelTypes.ColourModel,
});


CLMSUI.BackboneModelTypes.DefaultColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
        this
            .set("labels", this.get("colScale").copy().range(["Self Cross-Links", "Self Cross-Links (Overlapping Peptides)", "Between Protein Cross-Links"]))
			.set("type", "ordinal")
        ;
    },
    getValue: function (crossLink) {
        return crossLink.isSelfLink() || crossLink.isLinearLink() ? (crossLink.confirmedHomomultimer ? 1 : 0) : 2;
    },

});


CLMSUI.BackboneModelTypes.GroupColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function (attrs, options) {
        
        this.searchMap = options.searchMap;
        // find the search to group mappings
        var groups = new Map();
        var searchArray = CLMS.arrayFromMapValues(this.searchMap);
        searchArray.forEach (function (search) {
            var arr = groups.get(search.group);
            if (!arr) {
                arr = [];
                groups.set (search.group, arr);
            }
            arr.push (search.id);
        });

        // build scales on the basis of this mapping
        var groupDomain = [undefined];
        var labelRange = ["Multiple Group"];
        var groupArray = CLMS.arrayFromMapEntries(groups);
        groupArray.forEach (function (group) {
            groupDomain.push (group[0]);
            labelRange.push ("Group "+group[0]+" ("+group[1].join(", ")+")");
        });

        var groupCount = groups.size;
        var colScale;

        var multiGroupColour = "#202020";   // default colour for links involved in multiple groups
        if (groupCount < 11) {
            var colArr = [multiGroupColour].concat(groupCount < 6 ? colorbrewer.Dark2[5] : colorbrewer.Paired[10]);
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
        } else { // more than 10 groups, not really feasible to find colour scale that works - a d3.scale that always returns gray?
            colScale = d3.scale.linear().domain([-1,0]).range([multiGroupColour, "#448866"]).clamp(true);
            labelRange = ["Multiple Group", "Single Group"];
        }
        this
            .set ("colScale", colScale)
            .set ("labels", this.get("colScale").copy().range(labelRange))
			.set ("type", "ordinal")
        ;
    },
    getValue: function (crossLink) {    
        //check if link uniquely belongs to one group
        var filteredMatchesAndPepPositions = crossLink.filteredMatches_pp;
        /*
        var groupCheck = d3.set();
        for (var fm_pp = filteredMatchesAndPepPositions.length; --fm_pp >= 0;) {
            var match = filteredMatchesAndPepPositions[fm_pp].match; 
            var group = this.searchMap.get(match.searchId).group;   
            groupCheck.add(group);
        }
        var groupCheckArr = groupCheck.values();
        var value = (groupCheckArr.length === 1 ? groupCheckArr[0] : undefined);
        */
        var foundGroup = null;
        for (var fm_pp = filteredMatchesAndPepPositions.length; --fm_pp >= 0;) {
            var match = filteredMatchesAndPepPositions[fm_pp].match; 
            var group = this.searchMap.get(match.searchId).group;   
            if (!foundGroup) {
                foundGroup = group;
            } else if (foundGroup !== group) {
                foundGroup = undefined;
                break;
            }
        }
        // choose value if link definitely belongs to just one group or set as undefined
        var value = foundGroup;
        return value;       
    },
    getColourByValue: function (val) {
        var scale = this.get("colScale");
        // the ordinal scales will have had a colour for undefined already added to their scales (in initialize)
        // if it's the linear scale [-1 = multiple, 0 = single] and value is undefined we change it to -1 so it then takes the [multiple] colour value
        if (val === undefined && scale.domain()[0] === -1) {
            val = -1;
        }
        // now all 'undefined' values will get a colour so we don't have to check/set undefined colour here like we do in the default getColour function
        return scale(val);
    },
    getColour: function (crossLink) {
        var val = this.getValue (crossLink);
        return this.getColourByValue (val);
    },
});

CLMSUI.BackboneModelTypes.DistanceColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
        this
			.set ("type", "threshold")
            .set ("labels", this.get("colScale").copy().range(["Within Distance", "Borderline", "Overlong"]))
        ;
    },
    getValue: function (crossLink) {
        return CLMSUI.compositeModelInst.getSingleCrosslinkDistance (crossLink);
    },
});

CLMSUI.BackboneModelTypes.InterProteinColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function (properties, options) {
		var colScale;
		var labels = ["Same Protein"];
		var proteinIDs = CLMS.arrayFromMapValues(options.proteins)
			.filter (function(p) { return ! p.is_decoy; })
			.map (function (p) { return p.id; })
		;
		
		if (proteinIDs && proteinIDs.length > 2 && proteinIDs.length < 6) {
			var groupDomain = ["same"];
			for (var n = 0; n < proteinIDs.length; n++) {
				for (var m = n+1; m < proteinIDs.length; m++) {
					groupDomain.push (this.makeProteinPairKey (proteinIDs[n], proteinIDs[m]));
					labels.push (options.proteins.get(proteinIDs[n]).name+" - "+options.proteins.get(proteinIDs[m]).name);
				}
			}
			var colArr = colorbrewer.Set3[10];
			colArr.unshift ("grey");
            colScale = d3.scale.ordinal().range(colArr).domain(groupDomain);
		} else {
			colScale = d3.scale.ordinal().range(["blue", "grey"]).domain(["other", "same"]);
			labels = ["Other", "Same"];
		}

        this
			.set ("colScale", colScale)
			.set ("labels", this.get("colScale").copy().range(labels))
		;
    },
	
	makeProteinPairKey: function (pid1, pid2) {
		return pid1 < pid2 ? pid1 + "---" + pid2 : pid2 + "---" + pid1;
	},
	
    getValue: function (crossLink) {
		var id1 = crossLink.fromProtein.id;
		var id2 = crossLink.toProtein ? crossLink.toProtein.id : undefined;
		return (id2 === undefined || id1 === id2) ? "same" : this.makeProteinPairKey (id1, id2);
    },
});


CLMSUI.BackboneModelTypes.MetaDataColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function (properties, options) {
        var domain = this.get("colScale").domain();
        var labels;
        if (this.isCategorical()) {
			labels = domain.map (function (domVal) { 
                return String(domVal)
                    .toLowerCase()
                    .replace(/\b[a-z](?=[a-z]{2})/g, function(letter) {
                        return letter.toUpperCase(); 
                    })
                ;
            });
        } else {
            labels = (domain.length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]);
            domain.map (function (domVal, i) {
                labels[i] += " (" + domVal + ")";
            });
        }
        
        this.set ("labels", this.get("colScale").copy().range(labels));
    },
    getValue: function (crossLink) {
        return crossLink.meta ? crossLink.meta[this.get("field")] : undefined;
    },
});

/* Colour model that doesn't use crosslink properties, if querying by crosslink will just return undefined colour */
/* Q: What's the point then? A: it can be used to return colours to values, and also as it extends ColourModel we */
/* can change the colours in the legend panel. */
CLMSUI.BackboneModelTypes.NonCrossLinkColourModel = CLMSUI.BackboneModelTypes.ColourModel.extend ({
    initialize: function () {
		var domain = this.get("colScale").domain();
		var labels = (domain.length === 2 ? ["Min", "Max"] : ["Min", "Zero", "Max"]);
		domain.map (function (domVal, i) {
			labels[i] += " (" + domVal + ")";
		});
		
		this
			.set ("labels", this.get("colScale").copy().range(labels))
			.set ("title", this.get("id"))
			.set ("longDescription", this.get("id"))
		;
    },
    getValue: function () {
        return undefined;
    },
});



CLMSUI.linkColour.setupColourModels = function () {
    CLMSUI.linkColour.defaultColoursBB = new CLMSUI.BackboneModelTypes.DefaultColourModel ({
        colScale: d3.scale.ordinal().domain([0,1,2]).range([
            "#9970ab", "#a50f15", "#35978f"
        ]),
        title: "Cross-Link Type",
		longDescription: "Default colour scheme, differentiates self and between Cross-Links.",
        id: "Default"
    });
    
    var makeGroupColourModel = function () {
        return new CLMSUI.BackboneModelTypes.GroupColourModel ({
            title: "Group",
			longDescription: "Differentiate Cross-Links by search group when multiple searches are viewed together.",
            id: "Group",
        }, {
            searchMap: CLMSUI.compositeModelInst.get("clmsModel").get("searches"),
        });
    };
    
    CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();
	
	CLMSUI.linkColour.interProteinColoursBB = new CLMSUI.BackboneModelTypes.InterProteinColourModel ({
        title: "Protein-Protein Colouring",
		longDescription: "Differentiate Cross-Links by the proteins they connect. Suitable for 3 to 5 proteins only.",
        id: "InterProtein",
		type: "ordinal"
	}, {
		proteins: CLMSUI.compositeModelInst.get("clmsModel").get("participants")
	});
    
    CLMSUI.linkColour.distanceColoursBB = new CLMSUI.BackboneModelTypes.DistanceColourModel ({
        colScale: d3.scale.threshold().domain([15, 25]).range(['#5AAE61','#FDB863','#9970AB']),
        title: "Distance (Å)",
		longDescription: "Colour Cross-Links by adjustable distance category. Requires PDB file to be loaded (via Load -> PDB Data).",
        id: "Distance",
		superDomain: [0, 35],	// superdomain is used in conjunction with drawing sliders, it's the maximum that the values in the threshold can be
    });

    // add distanceColoursBB to this collection later if needed
    CLMSUI.linkColour.Collection = new CLMSUI.BackboneModelTypes.ColourModelCollection ([
        CLMSUI.linkColour.defaultColoursBB,
		CLMSUI.linkColour.interProteinColoursBB,
        CLMSUI.linkColour.groupColoursBB,
        CLMSUI.linkColour.distanceColoursBB,
    ]);
    
    // If necessary, swap in newly added colour scale with same id as removed (but current) scale pointed to by linkColourAssignment
    var replaceCurrentLinkColourAssignment = function (collection) {
        var currentColourModel = CLMSUI.compositeModelInst.get("linkColourAssignment");
        if (!currentColourModel.collection) {
            CLMSUI.compositeModelInst.set ("linkColourAssignment", collection.get(currentColourModel.get("id")));
        }
    };
    
    // Just the group colour scale is replaced for this event
    //CLMSUI.linkColour.Collection.listenTo (CLMSUI.vent, "csvLoadingDone", function () {
    CLMSUI.linkColour.Collection.listenTo (CLMSUI.compositeModelInst.get("clmsModel"), "change:matches", function () {
        this.remove ("Group");
        CLMSUI.linkColour.groupColoursBB = makeGroupColourModel();
        this.add (CLMSUI.linkColour.groupColoursBB);
        
        replaceCurrentLinkColourAssignment (this);
    });
    
    // All colour scales with ids in metadataFields array are removed (if already extant) and added
    CLMSUI.linkColour.Collection.listenTo (CLMSUI.vent, "linkMetadataUpdated", function (metaMetaData) {
		var columns = metaMetaData.columns;
		var crossLinks = metaMetaData.items;
        var colMaps = columns.map (function (field) {
            return CLMSUI.linkColour.makeColourModel (field, field, crossLinks);
        });  
        this.remove (columns);
        this.add (colMaps);
        
        replaceCurrentLinkColourAssignment (this);
    });
	
	CLMSUI.linkColour.Collection.listenTo (CLMSUI.vent, "addNonCrossLinkColourModel", function (data) {
		this.remove (data.id);
		var newModel = CLMSUI.linkColour.makeNonCrossLinkColourModel (data.id, data.domain);
        this.add (newModel);
        replaceCurrentLinkColourAssignment (this);
    });
};

CLMSUI.linkColour.makeColourModel = function (field, label, links) {
    var linkArr = CLMS.arrayFromMapValues (links);
	// first attempt to treat as if numbers
    var extents = d3.extent (linkArr, function(link) { return link.meta ? link.meta[field] : undefined; });
    var range = ["red", "blue"];
    if (extents[0] < 0 && extents[1] > 0) {
        extents.splice (1, 0, 0);
        range.splice (1, 0, "#aaa");
    }
	
	// see if it is a list of colours
	var hexRegex = CLMSUI.utils.commonRegexes.hexColour;
	var dataIsColours = (hexRegex.test(extents[0]) && hexRegex.test(extents[1]));
    
	// if it isn't a list of colours and only a few uinique values, make it categorical
    var uniq = d3.set (linkArr.map (function(link) { return link.meta ? link.meta[field] : undefined; })).size();
    // if the values in this metadata form 6 or less distinct values count it as categorical
    var isCategorical = uniq < 7;
    if (isCategorical && !dataIsColours) {
        extents.push (undefined);
        range = colorbrewer.Dark2[8];
    }
    
    var newColourModel = new CLMSUI.BackboneModelTypes.MetaDataColourModel ({
        colScale: (isCategorical ? d3.scale.ordinal() : d3.scale.linear()).domain(extents).range(range),
        id: label,
        title: label || field,
		longDescription: (label || field) + ", " + (isCategorical ? "categorical" : "") + " data extracted from Cross-Link metadata.", 
        field: field,
		type: isCategorical ? "ordinal" : "linear",
    });
    
    if (dataIsColours) {
        // if data is just a list of colours make this colour scale just return the value for getColour
        newColourModel.getColour = function (crossLink) {
            var val = this.getValue (crossLink);
            return val !== undefined ? val : this.undefinedColour;
        };
        newColourModel.getColourByValue = function (val) { return val !== undefined ? val : this.undefinedColour; };
		newColourModel
			.set ("fixed", true)
			.set ("longDescription", (label || field) + ", fixed colours per Cross-Link from metadata. Not editable.")
		;
    }
    
    return newColourModel;
};

CLMSUI.linkColour.makeNonCrossLinkColourModel = function (id, domain) {
	var extents = d3.extent (domain);
	var range = ["red", "blue"];
    if (extents[0] < 0 && extents[1] > 0) {
        extents.splice (1, 0, 0);
        range.splice (1, 0, "#aaa");
    }
	
	var newColourModel = new CLMSUI.BackboneModelTypes.NonCrossLinkColourModel ({
        colScale: d3.scale.linear().domain(extents).range(range),
        id: id,
    });
	
	return newColourModel;
};


//CLMSUI.domainColours = d3.scale.ordinal().range(colorbrewer.Set1[7]);//.slice().reverse());

CLMSUI.domainColours = function (catName, typeName) {
	catName = (catName || "undefined").replace(/_/g, " ").toLocaleLowerCase();
	catName = CLMSUI.domainColours.dict[catName] || catName;
	typeName = (typeName || "undefined").toLocaleLowerCase();
	var id = catName+"-"+typeName;

	if (!CLMSUI.domainColours.cols[id]) {
		var catColour = CLMSUI.domainColours.baseScale (catName);
		var hash = 0, i, chr;
		if (typeName) {
			for (i = 0; i < typeName.length; i++) {
				chr   = typeName.charCodeAt(i);
				hash  = ((hash << 5) - hash) + chr;
				hash |= 0; // Convert to 32bit integer
			}
		}

		var shade = (hash & 255) / 255;
		shade = (shade * 0.7) + 0.2;
		var hsl = d3.hsl(catColour);
		var newHsl = d3.hsl (hsl.h, shade, shade);
		CLMSUI.domainColours.cols[id] = newHsl.toString(); 
	}
	return CLMSUI.domainColours.cols[id];
};

CLMSUI.domainColours.cols = {
	"aa-cross-linkable": "#a6cee3",
	"aa-digestible": "#1f78b4",
	"alignment-pdb aligned region": "#b2df8a",
};
CLMSUI.domainColours.baseScale = d3.scale.ordinal()
	.range(colorbrewer.Set3[11])
	.domain (["aa", "alignment", "molecule processing", "regions", "sites", "amino acid modifications", "natural variations", "experimental info", "secondary structure", "undefined"])
;
CLMSUI.domainColours.dict = {
	"domains and sites": "sites",
	"structural": "secondary structure",
	"variants": "natural variations",
	"ptm": "amino acid modifications",
	"mutagenesis": "experimental info",
	"sequence information": "experimental info",
};
CLMSUI.domainColours.set = function (catName, typeName, colour) {
	catName = (catName || "undefined").replace(/_/g, " ").toLocaleLowerCase();
	catName = CLMSUI.domainColours.dict[catName] || catName;
	typeName = (typeName || "undefined").toLocaleLowerCase();
	var id = catName + "-" + typeName;
	CLMSUI.domainColours.cols[id] = colour;
	// some sort of redraw trigger / backbone event firing?
};

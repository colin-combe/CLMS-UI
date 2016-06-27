
    var CLMSUI = CLMSUI || {};
    CLMSUI.linkColour = CLMSUI.linkColour || {};
    
    CLMSUI.linkColour.defaultColours = function (crossLink) {
        return CLMSUI.linkColour.defaultColours.colScale (crossLink.isSelfLink() || crossLink.toProtein === null);
	};
    CLMSUI.linkColour.defaultColours.init = function () {};
    CLMSUI.linkColour.defaultColours.colScale = 
        d3.scale.ordinal().domain([true,false]).range([CLMS.xiNET.defaultSelfLinkColour.toRGB(), CLMS.xiNET.defaultInterLinkColour.toRGB()])
    ;
    CLMSUI.linkColour.defaultColours.labels = CLMSUI.linkColour.defaultColours.colScale.copy().range(["Self-Link", "Inter-Protein Link"]);
    CLMSUI.linkColour.defaultColours.title = "Default";



    CLMSUI.linkColour.byGroup = function (crossLink) {	
		var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
        console.log (CLMSUI.compositeModelInst.get("clmsModel"));
        //check number of groups to choose appropriate colour scheme,
		// (only do once)
		CLMSUI.linkColour.byGroup.init();
		//check if link uniquely belongs to one group
		var groupCheck = d3.set();
		var filteredMatches = crossLink.filteredMatches;
		for (match of filteredMatches) {
			var match = match[0];//fix this weirdness with array ( [0] ), its so wrong
			var group = searches.get(match.searchId).group; 	
			groupCheck.add(group);
		}
		if (groupCheck.values().length == 1){
			return CLMSUI.linkColour.groupColourScale(groupCheck.values()[0]);
		}
		else  {
			return CLMSUI.linkColour.groupColourScale(-1);
		}			
	};
    CLMSUI.linkColour.byGroup.init = function () {
        var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
        if (typeof CLMSUI.linkColour.groupColourScale == 'undefined') {
			//put d3.scale for group colour assignment in compositeModel
            var groups = new Set();
			for(search of searches) {
				groups.add(search.group);
			}
			var groupCount = groups.size; 
            var labels = [];
			if (groupCount < 6) {
                var colArr = colorbrewer.Dark2[5];
                colArr = ["black"].concat(colArr);
				CLMSUI.linkColour.groupColourScale = d3.scale.ordinal().range(colArr).domain(d3.range(-1, 5, 1));
                labels = CLMSUI.linkColour.groupColourScale.domain().map (function (d) {
                    return (d < 0 ? "Multiple" : "Group "+d);
                });
			}
			else if (groupCount < 11){
                var colArr = colorbrewer.Paired[10];
                colArr = ["black"].concat(colArr);
				CLMSUI.linkColour.groupColourScale = d3.scale.ordinal().range(colArr).domain(d3.range(-1, 10, 1));
                labels = CLMSUI.linkColour.groupColourScale.domain().map (function (d) {
                    return (d < 0 ? "Multiple" : "Group "+d);
                });
			}	
			else { // more than 10 groups, not really feasible to find colour scale that works
				//a d3.scale that always returns gray?
                CLMSUI.linkColour.groupColourScale = d3.scale.linear().domain([-1,0]).range(["black", "#767676"]).clamp(true);
                labels = ["Cross-Group", "Single"];
			}
            CLMSUI.linkColour.byGroup.colScale = CLMSUI.linkColour.groupColourScale;
            CLMSUI.linkColour.byGroup.labels = CLMSUI.linkColour.byGroup.colScale.copy().range(labels);
            console.log ("colscale", CLMSUI.linkColour.groupColourScale);
		}
    };
    CLMSUI.linkColour.byGroup.title = "Group";


CLMSUI.BackboneModelTypes.ColourModel = Backbone.Model.extend ({});

CLMSUI.linkColour.defaultColoursBB = new CLMSUI.BackboneModelTypes.ColourModel ({
    getColour: function (crossLink) {
        return this.colScale (crossLink.isSelfLink() || crossLink.toProtein === null);
    },
    init: function () {},
    colScale: d3.scale.ordinal().domain([true,false]).range([CLMS.xiNET.defaultSelfLinkColour.toRGB(), CLMS.xiNET.defaultInterLinkColour.toRGB()]),
    labels: CLMSUI.linkColour.defaultColours.colScale.copy().range(["Self-Link", "Inter-Protein Link"]),
    title: "Default"
});
/*

if (this.crosslinkViewer.groups.values().length > 1 && this.crosslinkViewer.groups.values().length < 5) {
			var groupCheck = d3.set();
			for (var i=0; i < countFilteredMatches; i++) {
				var match = filteredMatches[i][0];//fix this weirdness with array?
				groupCheck.add(match.group);
			}
			if (groupCheck.values().length == 1){
				var c = this.crosslinkViewer.linkColours(groupCheck.values()[0]);
				this.line.setAttribute("stroke", c);
		  		this.line.setAttribute("transform", "scale (1 1)");
				this.highlightLine.setAttribute("transform", "scale (1 1)");
			}
			else  {
				this.line.setAttribute("stroke", "#000000");
				if (this.selfLink()){
					this.line.setAttribute("transform", "scale (1 -1)");
					this.highlightLine.setAttribute("transform", "scale (1 -1)");
				}
			}
			//else this.line.setAttribute("stroke", "purple");//shouldn't happen
		}
		else if (this.selfLink() === true && this.colour == null){
			if (this.hd === true) {
				this.line.setAttribute("stroke", CLMS.xiNET.homodimerLinkColour.toRGB());
				this.line.setAttribute("transform", "scale(1, -1)");
				this.line.setAttribute("stroke-width", CLMS.xiNET.homodimerLinkWidth);
				this.highlightLine.setAttribute("transform", "scale(1, -1)");
			}
			else {
				this.line.setAttribute("stroke", xiNET.defaultSelfLinkColour.toRGB());
				this.line.setAttribute("transform", "scale(1, 1)");
				this.line.setAttribute("stroke-width", xiNET.linkWidth);
				this.highlightLine.setAttribute("transform", "scale(1, 1)");
			}
		}
		else if (this.selfLink() === true) {
			this.line.setAttribute("stroke-width", xiNET.linkWidth);
		}
*/


    CLMSUI = CLMSUI || {};
    CLMSUI.linkColour = CLMSUI.linkColour || {};
    
    CLMSUI.linkColour.defaultColours = function (crossLink) {
	
		if (crossLink.isSelfLink() || crossLink.toProtein === null) {
			return CLMS.xiNET.defaultSelfLinkColour.toRGB();
		} else {
			return CLMS.xiNET.defaultInterLinkColour.toRGB();
		}
	
	};
    
    CLMSUI.linkColour.byGroup = function (crossLink) {	
		var searches = CLMSUI.compositeModelInst.get("clmsModel").get("searches");
        //check number of groups to choose appropriate colour scheme,
		// (only do once)
		if (typeof CLMSUI.linkColour.groupColourScale == 'undefined') {
			//put d3.scale for group colour assignment in compositeModel
            var groups = new Set();
			for(search of searches) {
				groups.add(search.group);
			}
			var groupCount = groups.size; 
			if (groupCount < 6) {
				CLMSUI.linkColour.groupColourScale = d3.scale.ordinal().range(colorbrewer.Dark2[5]);
			}
			else if (groupCount < 11){
				CLMSUI.linkColour.groupColourScale = d3.scale.ordinal().range(colorbrewer.Paired[10]);
			}	
			else { // more than 10 groups, not really feasible to find colour scale that works
				//a d3.scale that always returns gray?
				CLMSUI.linkColour.groupColourScale = d3.scale.ordinal().range(["#767676"]);
			}
		}
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
			return "black";
		}			
	};
    
    
    
    
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

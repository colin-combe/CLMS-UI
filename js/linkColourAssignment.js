
    CLMSUI = CLMSUI || {};
    CLMSUI.linkColour = CLMSUI.linkColour || {};
    
    CLMSUI.linkColour.defaultColours = function (crossLink) {
	
		if (crossLink.isSelfLink() || crossLink.toProtein === null) {
			return CLMS.xiNET.defaultSelfLinkColour.toRGB();
		} else {
			return CLMS.xiNET.defaultInterLinkColour.toRGB();
		}
	
	};
    
    CLMSUI.linkColour.group = function (crossLink) {	
		var groups = CLMSUI.compositeModelInst.get("clmsModel").get("groups");
		var groupCount =  groups.size;
		if (groupCount > 1 && groupCount < 11) {
			if (!CLMSUI.groupColours){
				if (groupCount < 6) {
					CLMSUI.groupColours = d3.scale.ordinal().range(colorbrewer.Dark2[5]);
				}
				else {
					CLMSUI.groupColours = d3.scale.ordinal().range(colorbrewer.Paired[10]);
				}	
				//~ var groups = this.groups.values();
				//~ for (var g = 0; g < groupCount; g++) {
					//~ this.linkColours(groups[g]);
				//~ }
				//~ this.legendChanged();
			}
			
			var groupCheck = d3.set();
			var filteredMatches =crossLink.filteredMatches;
			for (match of filteredMatches) {
				var match = match[0];//fix this weirdness with array ( [0] ), its so wrong
				groupCheck.add(match.group);
			}
			
			if (groupCheck.values().length == 1){
				return CLMSUI.groupColours(groupCheck.values()[0]);
			}
			else  {
				return "black";
			}			
		
		}
		else {
			return "gray";
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

var CLMSUI = CLMSUI || {};

CLMSUI.SearchSummaryViewBB = CLMSUI.utils.BaseFrameView.extend ({
     events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
    },
    
    initialize: function (viewOptions) {
        CLMSUI.KeyViewBB.__super__.initialize.apply (this, arguments);
        
        this.listenTo (this.model, "change:matches", this.render);
		var self = this;
		
		var mainPanel = d3.select(this.el)
			.append("div").attr("class", "panelInner")
				.append("div").attr ("class", "verticalFlexContainer")
		;
        
		mainPanel.append("button")
			.classed ("btn btn-1 btn-1a flexStatic", true)
			.text("Download Search Descriptions")
			.on ("click", function () {
				var searchString = Array.from(self.model.get("searches").values())
					.map (function (search) { return search.id; })
					.join("-")
				;
				download (self.exportDescriptions(), "plain/text", "search_description_"+searchString+".txt", true);
			})
		;
        mainPanel.append("div").attr("class", "searchSummaryDiv");
        
        return this;
    },
    
    render: function () {
        var searches = this.model.get("searches");
        $(".searchSummaryDiv").JSONView(CLMS.arrayFromMapValues(searches));
        $('.searchSummaryDiv').JSONView('collapse', 2);

        return this;
    },

	searchDescriptionTemplate: "The identification of cross-links was performed with <%= version %> using the following parameters: MS accuracy, <%= ms1Value %> <%= ms1Units %>; MS/MS accuracy, <%= ms2Value %> <%= ms2Units %>; enzyme, <%= enzymeNames %>; maximum missed cleavages, <%= missedCleavages %>; maximum number of modifications, <%= maxModifications %>; fixed modification, <%= fixedModList %>; variable modifications, <%= varModList %>; and modification by the [??? hydrolyzed or the ammonia reacted cross-linker on lysine, serine, threonine, tyrosine, and the protein N terminus]. Cross-linking was allowed to involve <%= crossLinkerDesc %>.",
	
	exportDescriptions: function () {
		var template = _.template (this.searchDescriptionTemplate);
		var searches = Array.from (this.model.get("searches").values());
		var linkerData = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searches);
		//console.log ("LD", linkerData);
		
		var descriptions = searches.map (function (search) {
			
			// crosslinker descriptions for each search
			var crossLinkerDescs = search.crosslinkers.map (function (clink) {
				var linkerDatum = linkerData[clink.name];
				var linkables = linkerDatum.linkables;
				var obj = { 
					name: linkerDatum.name, 
					first: Array.from(linkables[0].values())
						.map(function(code) { return CLMSUI.modelUtils.amino1toNameMap[code].replace("_", "-"); })
						.join(", ") 
				};
				if (linkerDatum.heterobi) {
					obj.second = Array.from(linkables[1].values())
						.map(function(code) { return CLMSUI.modelUtils.amino1toNameMap[code].replace("_", "-"); })
						.join(", ") 
				}
				return obj;
			});
			
			// other values for each search
			var values = {
				version: search.version ? "Xi-Version "+search.version : search.notes,
				ms1Value: search.mstolerance,
				ms1Units: search.mstoleranceunits,
				ms2Value: search.ms2tolerance,
				ms2Units: search.ms2toleranceunits,
				enzymeNames: search.enzymes.map (function (enz) { return enz.name; }).join (", "),
				missedCleavages: search.missedcleavages,
				maxModifications: search.modifications.length,
				fixedModList: search.modifications
					.filter(function (mod) { return mod.fixed === "t"; })
					.map (function (mod) { return mod.name; })
					.join (", "),
				varModList: search.modifications
					.filter(function (mod) { return mod.fixed === "f"; })
					.map (function (mod) { return mod.name; })
					.join (", "),
				crossLinkerDesc: crossLinkerDescs
					.map (function (clinkDesc) {
						return clinkDesc.name+" on "+clinkDesc.first + (clinkDesc.second ? " -> "+clinkDesc.second : "")
					})
					.join(", ")
			}
			
			// turn crosslinker and other values into description per search
			return template (values);
		});
		
		// rationalise so that searches with the same exact description shared a paragraph in the output
		var dmap = d3.map();
		descriptions.forEach (function (desc, i) {
			var arr = dmap.get (desc);
			if (!arr) {
				arr = [];
				dmap.set (desc, arr);
			}
			arr.push (searches[i].id)
		});
		
		var fullDesc = dmap.entries()
			.map (function (entry) {
				return "Search "+entry.value.join(", ")+" -> "+entry.key;
			})
			.join ("\r\n\r\n")
		; 
		
		return fullDesc;
	},
    
    identifier: "Search Summaries",
});

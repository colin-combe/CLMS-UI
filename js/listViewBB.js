//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
    
  var CLMSUI = CLMSUI || {};

  CLMSUI.ListViewBB = CLMSUI.utils.BaseFrameView.extend ({   
        
    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{
      });
    },
		
	defaultOptions: {
		xlabel: "Residue Index 1",
		ylabel: "Residue Index 2",
		chartTitle: "Cross-Link Matrix",
		chainBackground: "white",
		matrixObj: null,
		selectedColour: "#ff0",
		highlightedColour: "#f80",
		linkWidth: 5,
		tooltipRange: 3,
	},

    initialize: function (viewOptions) {
        CLMSUI.ListViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;
        
        this.margin = {
            top:    this.options.chartTitle  ? 30 : 0,
            right:  20,
            bottom: this.options.xlabel ? 40 : 25,
            left:   this.options.ylabel ? 60 : 40
        };
        
        this.colourScaleModel = viewOptions.colourScaleModel;
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("listView", true); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div").attr("class", "toolbar");
        
		/*
        this.controlDiv.append("button")
            .attr ("class", "downloadButton2 btn btn-1 btn-1a")
            .text (CLMSUI.utils.commonLabels.downloadImg+"SVG")
        ;
        
        var setSelectTitleString = function () {
            var selElem = d3.select (d3.event.target);
            selElem.attr("title", selElem.selectAll("option")
                .filter(function() { return d3.select(this).property("selected"); })
                .text()
            );
        };
    
        this.controlDiv.append("label")
            .attr("class", "btn")
            .append ("span")
                .attr("class", "noBreak")
                .text("Show Protein Pairing")
                .append("select")
                    .attr("id", mainDivSel.attr("id")+"chainSelect")
                    .on ("change", function (d) {
                        var value = this.value;
                        var selectedDatum = d3.select(this).selectAll("option")
                            .filter(function(d) { return d3.select(this).property("selected"); })
                            .datum()
                        ;
                        self.setAndShowPairing (selectedDatum.value);
                        var selElem = d3.select(d3.event.target);
                        setSelectTitleString (selElem);
                    })
        ;
		*/
		
		var columnMetaData = [
            {name: "ID", type: "alpha", tooltip: "", visible: true, id: "id"},
			{name: "Ambiguous", type: "boolean", tooltip: "", visible: true, id: "ambiguous"},
			{name: "Match Count", type: "numeric", tooltip: "", visible: true, id: "matchCount"},
        ];
		
		var initialValues = {
			filters: {id: false, ambiguous: false},	
		};
		var cellStyles = {
			name: "varWidthCell", 
			file_name: "varWidthCell2",
		};
		var tooltipHelper = function (d, field) {
			return d.value.id + ": " + d.value[field];
		}
		var tooltips = {
			notes: function(d) { return tooltipHelper (d, "notes"); },
			name: function(d) { return tooltipHelper (d, "status"); },
			file_name: function(d) { return tooltipHelper (d, "file_name"); },
			enzyme: function(d) { return tooltipHelper (d, "enzyme"); },
			crosslinkers: function(d) { return tooltipHelper (d, "crosslinkers"); },
		};
		var colourRows = function (rowSelection) {
			var selectedCrossLinks = self.model.getMarkedCrossLinks("selection");
			var selectedSet = d3.set (_.pluck (selectedCrossLinks, "id"));
			
			var highlightedCrossLinks = self.model.getMarkedCrossLinks("highlights");
			var highlightedSet = d3.set (_.pluck (highlightedCrossLinks, "id"));
			
			rowSelection.each (function (d) {
				d3.select(this).style ("background", highlightedSet.has(d.id) ? self.options.highlightedColour : (selectedSet.has(d.id) ? self.options.selectedColour : null));	
			});
		}
		var addRowListeners = function (rowSelection) {
			rowSelection.on ("click", function (d) {
				console.log ("clicked", d, self.model);
				self.model.setMarkedCrossLinks ("selection", [d], false, d3.event.ctrlKey);	
			});
			rowSelection.on ("mouseover", function (d) {
				self.model.setMarkedCrossLinks ("highlights", [d], false, d3.event.ctrlKey);	
			});
		};
		var empowerRows = function (rowSelection) {
			colourRows (rowSelection);
			addRowListeners (rowSelection);
		};
		var modifiers = {
			id: function(d) { return d.id; },
			ambiguous: function(d) { return d.ambiguous; },
			matchCount: function (d) { return d.matches_pp.length; }
		};
        
		var headerEntries = columnMetaData.map (function (cmd) { return {key: cmd.id, value: cmd}; });
		var d3tab = flexWrapperPanel.append("div").attr("class", "d3tableContainer")
			.datum({
				data: Array.from (self.model.get("clmsModel").get("crossLinks").values()), 
				headerEntries: headerEntries, 
				cellStyles: cellStyles,
				tooltips: tooltips,
				columnOrder: headerEntries.map (function (hentry) { return hentry.key; }),
			})
		;
		var table = CLMSUI.d3Table ();
		table (d3tab);
		//applyHeaderStyling (d3tab.selectAll("thead tr:first-child").selectAll("th"));
		console.log ("table", table);

		// set initial filters
		var keyedFilters = {};
		headerEntries.forEach (function (hentry) {
			var findex = table.getColumnIndex (hentry.key);
			//console.log (hentry, "ind", findex, initialValues.filters);
			keyedFilters[hentry.key] = {value: initialValues.filters[findex], type: hentry.value.type}	
		});
		//console.log ("keyedFilters", keyedFilters);

		table
			.filter (keyedFilters)
			.dataToHTML (modifiers)
			.postUpdate (empowerRows)
		;

		// set initial sort
		if (initialValues.sort && initialValues.sort.column) {
			table
				.orderKey (headerEntries[initialValues.sort.column].key)
				.orderDir (initialValues.sort.sortDesc ? "desc" : "asc")
				.sort()
			;
		}

		/*
		var dispatch = table.dispatch();
		dispatch.on ("columnHiding", storeColumnHiding);
		dispatch.on ("filtering", storeFiltering);
		dispatch.on ("ordering", storeOrdering);
         */
		// rerender crosslinks if selection/highlight changed, filteringDone or colourmodel changed
        this.listenTo (this.model, "filteringDone", this.render);
		this.listenTo (this.model, "change:selection change:highlights change:linkColourAssignment currentColourModelChanged", function() {
			colourRows (table.getAllRowsSelection());
		});
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render);   // colourScaleModel is pointer to distance colour model, so thsi triggers even if not current colour model (redraws background)
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.distancesChanged);  // Entire new set of distances
        this.listenTo (this.model.get("clmsModel"), "change:matches", this.matchesChanged);  // New matches added (via csv generally)
        this.listenTo (CLMSUI.vent, "distancesAdjusted", this.render);  // Existing residues/pdb but distances changed
		
		this.table = table;
		
        this.render();
    },
         
    matchesChanged: function () {
        var entries = this.makeProteinPairingOptions();
        var pairing = this.getCurrentPairing (entries[0], true);
        this.matrixChosen (pairing);
        this.render();
        return this;
    },
        
    // New PDB File in town
    distancesChanged: function () {
        d3.select(this.el).selectAll(".chainDropdown").style("display", null);  // show chain dropdowns
        this
            .makeNewChainShowSets()
            .makeChainOptions (this.getCurrentProteinIDs())
            .render()
        ;
        return this;
    },
        
    getSingleLinkDistances: function (crossLink) {
		return this.model.getSingleCrosslinkDistance (crossLink);
		/*
        var alignColl = this.model.get("alignColl");
        var distanceObj = this.model.get("clmsModel").get("distancesObj");
        return distanceObj ? distanceObj.getXLinkDistance (crossLink, alignColl) : undefined;
		*/
    },

    render: function () {
        if (this.isVisible()) {
            console.log ("LIST RENDER");
			this.table.update();
        }
        return this;
    },
        
    identifier: "List",
        
    optionsToString: function () {
        var matrixObj = this.options.matrixObj;
        return [matrixObj.fromProtein, matrixObj.toProtein]
            .map (function (protein) { return protein.name.replace("_", " "); })
            .join("-")
        ;
    },
});
    
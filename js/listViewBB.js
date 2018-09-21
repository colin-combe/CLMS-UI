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
		  "mouseleave .d3table tbody": "clearHighlight",
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
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("listView", true); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div").attr("class", "toolbar");
		
		var selfModel = this.model;
		var distanceFunc = function (d) {
			return selfModel.getSingleCrosslinkDistance (d);
		}

		// first column is hidden column which has fixed filter later on to only show filtered cross-links
		var columnSettings = {	
			filtered: {columnName: "Filtered", type: "numericGt", tooltip: "", visible: false, accessor: function (d) { return d.filteredMatches_pp.length; }},
			protein: {columnName: "Protein", type: "alpha", tooltip: "", visible: true, accessor: function (d) { return d.fromProtein.name + (d.toProtein ? " " + d.toProtein.name : ""); }},
			matchCount: {columnName: "Match Count", type: "numeric", tooltip: "", visible: true, accessor: function (d) { return d.filteredMatches_pp.length; }},
			distance: {columnName: "Distance", type: "numeric", tooltip: "", visible: true, accessor: distanceFunc, cellStyle: "number", cellD3EventHook: this.makeColourSchemeBackgroundHook ("Distance")},
		};
		
		var initialValues = {
			filters: {filtered: 0},	
		};
		var tooltipHelper = function (d, field) {
			return d.value.id + ": " + d.value[field];
		}
		var tooltips = {
			/*
			notes: function(d) { return tooltipHelper (d, "notes"); },
			name: function(d) { return tooltipHelper (d, "status"); },
			file_name: function(d) { return tooltipHelper (d, "file_name"); },
			enzyme: function(d) { return tooltipHelper (d, "enzyme"); },
			crosslinkers: function(d) { return tooltipHelper (d, "crosslinkers"); },
			*/
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
		var distance2dp = d3.format(".2f");
		var dataToHTMLModifiers = {
			filtered: function (d) { return d.filteredMatches_pp.length; },
			protein: function (d) { return d.fromProtein.name + (d.toProtein ? " " + d.toProtein.name : ""); },
			matchCount: function (d) { return d.filteredMatches_pp.length; },
			distance: function(d) { var dist = distanceFunc(d); return dist != undefined ? distance2dp(dist) : ""; },
		};
		d3.entries(dataToHTMLModifiers).forEach (function (entry) {
			columnSettings[entry.key].dataToHTMLModifier = dataToHTMLModifiers[entry.key];	
		});
        
		var d3tableElem = flexWrapperPanel.append("div").attr("class", "d3tableContainer verticalFlexContainer")
			.datum({
				data: Array.from (self.model.get("clmsModel").get("crossLinks").values()), 
				columnSettings: columnSettings,
				columnOrder: d3.keys(columnSettings),
			})
		;
		var d3table = CLMSUI.d3Table ();
		d3table (d3tableElem);
		
		//console.log ("table", d3table);

		// Bespoke filter type to hide rows not in current filtered crosslinks
		d3table.typeSettings ("numericGt", {
			preprocessFunc: function (d) { return d; },
			filterFunc: function (datum, d) { return datum > d; },
			comparator: d3table.typeSettings("numeric").comparator,		
		});
		
		//table.getFilterCells().style("display", "none");

		// set initial filters
		var keyedFilters = {};
		d3.keys(columnSettings).forEach (function (columnKey) {
			keyedFilters[columnKey] = initialValues.filters[columnKey];	
		});

		d3table
			.filter (keyedFilters)
			.postUpdate (empowerRows)
		;

		// rerender crosslinks if selection/highlight changed or filteringDone
        this.listenTo (this.model, "filteringDone", this.render);
		this.listenTo (this.model, "change:selection change:highlights", function() {
			colourRows (d3table.getAllRowsSelection());
		});
        this.listenTo (CLMSUI.linkColour.Collection, "aColourModelChanged", this.render);   // colourScaleModel is pointer to distance colour model, so thsi triggers even if not current colour model (redraws background)
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj change:matches", this.render);  // Entire new set of distances  or ew matches added (via csv generally)
        this.listenTo (CLMSUI.vent, "distancesAdjusted", this.render);  // Existing residues/pdb but distances changed
		this.listenTo (CLMSUI.vent, "linkMetadataUpdated", function (metaData) {
			this.updateTableData(metaData).render();
		}); // New/Changed metadata attributes present
		this.d3table = d3table;
		
        this.render();
    },
        
    getSingleLinkDistance: function (crossLink) {
		return this.model.getSingleCrosslinkDistance (crossLink);
    },
	  
	clearHighlight: function () {
		this.model.setMarkedCrossLinks ("highlights", [], false, false);
        return this;
	},
	  
	makeColourSchemeBackgroundHook: function (columnKey) {
		return function (cellSel) {
			cellSel.style("background", function(d) { 
				var colScheme = CLMSUI.linkColour.Collection.get(columnKey);
				var dValue = colScheme.getValue (d.value);
				return dValue !== undefined ? colScheme.getColour(d.value) : "none";
			});
		};
	},
	  
	updateTableData: function (metaData) {
		var columnSettings = this.d3table.columnSettings();

		metaData.columns.map (function (mcol) {
			var columnType = metaData.columnTypes[mcol];
			
			var accFunc = function (d) { return d.meta ? d.meta[mcol] : ""; };
			var cellD3Hook = columnType === "numeric" && CLMSUI.linkColour.Collection.get(mcol) ? 
				this.makeColourSchemeBackgroundHook (mcol) : undefined
			;

			columnSettings[mcol] = {
				columnName: mcol, 
				type: columnType || "alpha", 
				tooltip: "", 
				visible: true, 
				accessor: accFunc, 
				dataToHTMLModifier: accFunc, 
				cellStyle: columnType === "numeric" ? "number" : undefined,
				cellD3EventHook: cellD3Hook,
			};
		}, this);
		
		this.d3table
			.columnSettings (columnSettings)
			.columnOrder (d3.keys(columnSettings))
		;
		
		this.d3table (this.d3table.getSelection());
		return this;
	},

    render: function () {
        if (this.isVisible()) {
			var filter = this.d3table.filter ();
			filter.filtered = 0;
			this.d3table.filter(filter).update();
        }
        return this;
    },
        
    identifier: "List View",
        
    optionsToString: function () {
        var matrixObj = this.options.matrixObj;
        return [matrixObj.fromProtein, matrixObj.toProtein]
            .map (function (protein) { return protein.name.replace("_", " "); })
            .join("-")
        ;
    },
});
    
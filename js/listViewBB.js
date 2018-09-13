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
		
		var selfModel = this.model;
		var distanceFunc = function (d) {
			var distancesObj = selfModel.get("clmsModel").get("distancesObj");
        	var protAlignCollection = selfModel.get("alignColl");
			return selfModel.getSingleCrosslinkDistance (d, distancesObj, protAlignCollection, {});
		}
		
		// first column is hidden column which has fixed filter later on to only show filtered cross-links
		var columnMetaData = [			
			{columnName: "Filtered", type: "numericGt", tooltip: "", visible: false, id: "filtered", accessor: function (d) { return d.filteredMatches_pp.length; }},
			{columnName: "Protein", type: "alpha", tooltip: "", visible: true, id: "protein", accessor: function (d) { return d.fromProtein.name + (d.toProtein ? " " + d.toProtein.name : ""); }},
			{columnName: "Match Count", type: "numeric", tooltip: "", visible: true, id: "matchCount", accessor: function (d) { return d.filteredMatches_pp.length; }},
			{columnName: "Distance", type: "numeric", tooltip: "", visible: true, id: "distance", accessor: distanceFunc},
        ];
		
		var initialValues = {
			filters: {filtered: 0},	
		};
		var cellStyles = {
			name: "varWidthCell", 
			distance: "number",
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
		var modifiers = {
			filtered: function (d) { return d.filteredMatches_pp.length; },
			protein: function (d) { return d.fromProtein.name + (d.toProtein ? " " + d.toProtein.name : ""); },
			matchCount: function (d) { return d.filteredMatches_pp.length; },
			distance: function(d) { var dist = distanceFunc(d); return dist != undefined ? distance2dp(dist) : ""; },
		};
        
		var columnSettings = columnMetaData.map (function (cmd) { return {key: cmd.id, value: cmd}; });
		var d3tableElem = flexWrapperPanel.append("div").attr("class", "d3tableContainer verticalFlexContainer")
			.datum({
				data: Array.from (self.model.get("clmsModel").get("crossLinks").values()), 
				columnSettings: columnSettings, 
				cellStyles: cellStyles,
				tooltips: tooltips,
				columnOrder: columnSettings.map (function (hentry) { return hentry.key; }),
			})
		;
		var d3table = CLMSUI.d3Table ();
		d3table (d3tableElem);
		//applyHeaderStyling (d3tab.selectAll("thead tr:first-child").selectAll("th"));
		
		// pull table into it's own div so we can do overflow and scrolling
		var flexNestDiv = d3tableElem.append("div").attr("class", "extraContainerDiv");
		$(flexNestDiv[0]).append($(d3tableElem.select("table")[0]));
		console.log ("table", d3table);

		// Bespoke filter type to hide rows not in current filtered crosslinks
		d3table.typeSettings ("numericGt", {
			preprocessFunc: function (d) { return d; },
			filterFunc: function (datum, d) { return datum > d; },
			comparator: d3table.typeSettings("numeric").comparator,		
		});
		
		//table.getFilterCells().style("display", "none");

		// set initial filters
		var keyedFilters = {};
		columnSettings.forEach (function (hentry) {
			var findex = d3table.getColumnIndex (hentry.key);
			keyedFilters[hentry.key] = initialValues.filters[findex];	
		});

		d3table
			.filter (keyedFilters)
			.dataToHTML (modifiers)
			.postUpdate (empowerRows)
		;

		// set initial sort
		if (initialValues.sort && initialValues.sort.column) {
			d3table
				.orderKey (columnSettings[initialValues.sort.column].key)
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
			colourRows (d3table.getAllRowsSelection());
		});
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render);   // colourScaleModel is pointer to distance colour model, so thsi triggers even if not current colour model (redraws background)
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.render);  // Entire new set of distances
        this.listenTo (this.model.get("clmsModel"), "change:matches", this.render);  // New matches added (via csv generally)
        this.listenTo (CLMSUI.vent, "distancesAdjusted", this.render);  // Existing residues/pdb but distances changed
		this.listenTo (CLMSUI.vent, "linkMetadataUpdated", this.render); // New/Changed metadata attributes present
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

    render: function () {
		var self = this;
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
    
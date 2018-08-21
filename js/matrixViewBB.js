//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015
    
    var CLMSUI = CLMSUI || {};

    CLMSUI.DistanceMatrixViewBB = CLMSUI.utils.BaseFrameView.extend ({   
        
    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{
      		"mousemove .mouseMat": "brushNeighbourhood",
		  "mousemove .clipg": "brushNeighbourhood",
		  "mouseleave .viewport": "cancelHighlights",
		  "mouseleave .clipg": "cancelHighlights",
		  "input .dragPanRB": "setMatrixDragMode",
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
		tooltipRange: 7,
		matrixDragMode: "Pan",
		margin: {top: 30, right: 20, bottom: 40, left: 60},
	},

    initialize: function (viewOptions) {
        CLMSUI.DistanceMatrixViewBB.__super__.initialize.apply (this, arguments);
        
        var self = this;
        
		var marginLimits = {
			top:    this.options.chartTitle  ? 30 : undefined,
            bottom: this.options.xlabel ? 40 : undefined,
            left:   this.options.ylabel ? 60 : undefined
		};
        $.extend (this.options.margin, marginLimits);
        
        this.colourScaleModel = viewOptions.colourScaleModel;
        
        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("matrixView", true); 
        
        var flexWrapperPanel = mainDivSel.append("div")
            .attr ("class", "verticalFlexContainer")
        ;
        
        this.controlDiv = flexWrapperPanel.append("div").attr("class", "toolbar");
        
        this.controlDiv.append("button")
            .attr ("class", "downloadButton btn btn-1 btn-1a")
            .text (CLMSUI.utils.commonLabels.downloadImg+"SVG")
        ;
		
		var buttonHolder = this.controlDiv.append("span").attr("class", "noBreak reducePadding");
		// Radio Button group to decide pan or select
        var toggleButtonData = [
			{class: "dragPanRB", label: "Drag to Pan", id: "dragPan", tooltip: "Left-click and drag pans the matrix. Mouse-wheel zooms.", group: "matrixDragMode", value: "Pan"},
			{class: "dragPanRB", label: "Or Select", id: "dragSelect", tooltip: "Left-click and drag selects an area in the matrix", group: "matrixDragMode", value: "Select"},
        ];
        toggleButtonData
            .forEach (function (d) {
				$.extend (d, {type: "radio", inputFirst: false, value: d.value || d.label});
				if (d.initialState === undefined && d.group && d.value) {	// set initial values for radio button groups
					d.initialState = (d.value === this.options[d.group]);
				}
            }, this)
        ;
        CLMSUI.utils.makeBackboneButtons (buttonHolder, self.el.id, toggleButtonData);
		
        
        var setSelectTitleString = function () {
            var selElem = d3.select (d3.event.target);
            selElem.attr("title", selElem.selectAll("option")
                .filter(function() { return d3.select(this).property("selected"); })
                .text()
            );
        };
    
        this.controlDiv.append("label")
            .attr("class", "btn selectHolder")
            .append ("span")
                .attr("class", "noBreak")
                .text("Show Protein Pairing ►")
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
        
        // Various view options set up, then put in a dropdown menu
        this.chainDropdowns = ["prot1", "prot2"].map (function (prot) {
            var optid = this.el.id+"Options_"+prot;
            this.controlDiv.append("p").attr("id", optid);
            return new CLMSUI.DropDownMenuViewBB ({
                el: "#"+optid,
                model: CLMSUI.compositeModelInst.get("clmsModel"),
                myOptions: {
                    title: "Chain "+prot+" ▼",
					tooltipModel: this.model.get("tooltipModel"),
					tooltip: {header: "PDB Chains", contents: "Turn on/off plotting of individual PDB chains along this axis."},
                    menu: [],
                    closeOnClick: false,
                    classed: "chainDropdown",
                }
            });
        }, this);
        
        // Hide chain choices at first
        d3.select(this.el).selectAll(".chainDropdown").style("display", "none");
        
             
        var chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr ("flex-grow", 1)
            .style("position", "relative")
        ;      
        
        var viewDiv = chartDiv.append("div")
            .attr("class", "viewDiv")
        ;

        
        // Scales
        this.x = d3.scale.linear();
        this.y = d3.scale.linear();
        
        this.zoomStatus = d3.behavior.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() { self.zoomHandler (self); })
        ;
        
        // Canvas viewport and element
        var canvasViewport = viewDiv.append("div")
            .attr ("class", "viewport")
            .style ("top", this.options.margin.top + "px")
            .style ("left", this.options.margin.left + "px")
            .call (self.zoomStatus)
        ;
        
        this.canvas = canvasViewport
			.append("canvas")
			.style ("background", this.options.background)	// override standard background colour with option
			.style ("display", "none")
		;
		
		canvasViewport.append("div")
			.attr ("class", "mouseMat")
		;

        
        // SVG element
        this.svg = viewDiv.append("svg");
        
        // Defs
        this.svg.append("defs")
            .append("clipPath")
            .attr ("id", "matrixClip")
            .append("rect")
                .attr ("x", 0)
                .attr ("y", 0)
                .attr ("width", 0)
                .attr ("height", 0)
        ;

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.options.margin.left + "," + this.options.margin.top + ")")
        ;
		
		this.brush = d3.svg.brush()
            .x(self.x)
            .y(self.y)
            //.clamp ([false, false])
            .on("brush", function() {} )
            .on("brushend", function (val) { self.selectNeighbourhood (self.brush.extent()); })
        ;
		
        
        // Add clippable and pan/zoomable viewport made of two group elements
        this.clipGroup = this.vis.append("g")
            .attr("class", "clipg")
            .attr("clip-path", "url(#matrixClip)")
        ;
        this.zoomGroup = this.clipGroup.append("g");
		this.zoomGroup.append("g").attr("class", "blockAreas");
		this.zoomGroup.append("g").attr("class", "backgroundImage").append("image");
		this.zoomGroup.append("g").attr("class", "crossLinkPlot");
		this.zoomGroup.append("g")
            .attr("class", "brush")
            .call(self.brush)
        ;
        
        // Axes setup
        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
        this.yAxis = d3.svg.axis().scale(this.y).orient("left");
        
        this.vis.append("g").attr("class", "y axis");
        this.vis.append("g").attr("class", "x axis");
        
        
        // Add labels
        var labelInfo = [
            {class: "axis", text: this.options.xlabel, dy: "0em"},
            {class: "axis", text: this.options.ylabel, dy: "1em"},
            {class: "matrixHeader", text: this.options.chartTitle, dy: "-0.5em"},
        ];

        this.vis.selectAll("g.label")
            .data(labelInfo)
            .enter()
            .append ("g")
            .attr("class", "label")
            .append("text")
                .attr("class", function(d) { return d.class; })
                .text(function(d) { return d.text; })
                .attr("dy", function(d) { return d.dy; })
        ;
         
		// rerender crosslinks if selection/highlight changed, filteringDone or colourmodel changed
        this.listenTo (this.model, "change:selection change:highlights filteringDone currentColourModelChanged", this.renderCrossLinks);
        this.listenTo (this.model, "change:linkColourAssignment", this.render);
        this.listenTo (this.colourScaleModel, "colourModelChanged", this.render);   // colourScaleModel is pointer to distance colour model, so thsi triggers even if not current colour model (redraws background)
        this.listenTo (this.model.get("clmsModel"), "change:distancesObj", this.distancesChanged);  // Entire new set of distances
        this.listenTo (this.model.get("clmsModel"), "change:matches", this.matchesChanged);  // New matches added (via csv generally)
        this.listenTo (CLMSUI.vent, "distancesAdjusted", this.render);  // Existing residues/pdb but distances changed
        this.listenTo (CLMSUI.vent, "proteinMetadataUpdated", function () {
			this.makeProteinPairingOptions();
			this.updateAxisLabels();
		});
		
        var entries = this.makeProteinPairingOptions();
        var startPairing = entries && entries.length ? entries[0].value : undefined;
        this.setAndShowPairing (startPairing);
		
		this.setMatrixDragMode ({target: {value: this.options.matrixDragMode}});
    },
        
    relayout: function () {
        this.resize();
        return this;
    },
        
    setAndShowPairing: function (pairing) {
        this
            .matrixChosen (pairing)
            .resetZoomHandler (this)
            .render()
        ;
    }, 
        
    makeProteinPairingOptions: function () {
        var crossLinks = CLMS.arrayFromMapValues (this.model.get("clmsModel").get("crossLinks"));
        var totals = CLMSUI.modelUtils.crosslinkCountPerProteinPairing (crossLinks);
        var entries = d3.entries (totals);
        
        var nonEmptyEntries = entries.filter (function (entry) {
            return entry.value.crossLinks.length;     
        });
        
        nonEmptyEntries.sort (function (a,b) {
            return b.value.crossLinks.length - a.value.crossLinks.length;    
        });
        
        var mainDivSel = d3.select(this.el);
        var matrixOptions = mainDivSel.select("#"+mainDivSel.attr("id")+"chainSelect")
            .selectAll("option")
            .data (nonEmptyEntries, function(d) { return d.key; })
        ;
        matrixOptions.exit().remove();
        matrixOptions
            .enter()
            .append("option")
        ;
        matrixOptions
            .property ("value", function(d) { return d.key;})
            .text (function(d) { return "["+d.value.crossLinks.length+"] "+d.value.label; })
        ;
        
        return nonEmptyEntries.length ? nonEmptyEntries : entries;
    },
        
    getCurrentPairing: function (pairing, onlyIfNoneSelected) {
        var mainDivSel = d3.select(this.el);
        var selected = mainDivSel.select("#"+mainDivSel.attr("id")+"chainSelect")
            .selectAll("option")
            .filter (function(d) { return d3.select(this).property("selected"); })
        ;
        return (selected.size() === 0 && onlyIfNoneSelected) ? pairing : selected.datum().value;
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
		
	updateAxisLabels : function () {
		var protIDs = this.getCurrentProteinIDs(); 
        this.vis.selectAll("g.label text").data(protIDs)
        	.text (function(d) { return d.labelText; })
        ; 
    	this.makeChainOptions (protIDs);
	},
        
    matrixChosen: function (proteinPairValue) {
        if (proteinPairValue) {
            this.options.matrixObj = proteinPairValue;

            var seqLengths = this.getSeqLengthData();
            this.x.domain([1, seqLengths.lengthA + 1]);
            this.y.domain([seqLengths.lengthB + 1, 1]);   

            // Update x/y labels and axes tick formats
            this.xAxis.tickFormat (this.alignedIndexAxisFormat);
            this.yAxis.tickFormat (this.alignedIndexAxisFormat);
			
			this.updateAxisLabels();
        }
        
        return this;
    },
        
        
    // 3 chain set object wrapper routines
    makeNewChainShowSets: function () {
        var distanceObj = this.model.get("clmsModel").get("distancesObj");
        if (distanceObj) {
            var chainVals = d3.merge(d3.values(distanceObj.chainMap)).map(function(cd) { return cd.index; });
            this.showChains = [
                d3.set (chainVals),
                d3.set (chainVals)
            ];
        }
        return this;
    },
        
    chainMayShow: function (dropdownIndex, chainIndex) {
        return this.showChains[dropdownIndex].has(chainIndex);    
    },
        
    setChainShowState: function (dropdownIndex, chainIndex, show) {
        this.showChains[dropdownIndex][show ? "add" : "remove"](chainIndex);
        return this;
    },
        
        
    makeChainOptions: function (proteinIDs) {
        var self = this;
        
        var clickFunc = function (d3target) {
            var datum = d3target.datum(); //this;
            var index = datum.index;
            var dropdownIndex = datum.dropdownIndex;
            var checked = d3target.property("checked");
            self
                .setChainShowState (dropdownIndex, index, checked)
                .renderBackgroundMap()
            ;
        };

        var axisOrientations = ["X", "Y"];
        this.chainDropdowns.forEach (function (dropdown, i) {
            var distanceObj = self.model.get("clmsModel").get("distancesObj");
            if (distanceObj) {
                var pid = proteinIDs[i].proteinID;
                var chainMap = distanceObj.chainMap;
                var chains = chainMap[pid] || [];
                dropdown.updateTitle (axisOrientations[i]+": "+proteinIDs[i].labelText+" Chains ▼");
                
                // make button data for this protein and dropdown combination
                var toggleButtonData = chains.map (function (chain, ii) {
                    return {
                        initialState: self.chainMayShow (i, chain.index), 
                        class: "chainChoice", 
                        label: "Chain "+chain.name+":"+chain.index, 
                        id: chain.name+"-"+chain.index+"-"+pid,
                        dropdownIndex: i,
                        index: chain.index, 
                        type: "checkbox",
                        inputFirst: true,
                        func: clickFunc,
                    };
                });
                
                var dropEl = dropdown.el;
                // make buttons for this protein and dropdown combination using the button data
                CLMSUI.utils.makeBackboneButtons (d3.select(dropEl), dropEl.id, toggleButtonData);
                // tell the dropdown that these buttons are the new menu and to rerender the dropdown menu with them
                dropdown.options.menu = toggleButtonData.map (function(d) { return {id: dropEl.id + d.id, func: clickFunc}; });
                dropdown.render();
            }
        }, this);

        return this;
    },
               
    alignedIndexAxisFormat: function (searchIndex) {
        return d3.format(",.0f")(searchIndex);
    },
        
    getCurrentProteinIDs : function () {
        var mObj = this.options.matrixObj;
        return mObj ? [
            {chainIDs: null, proteinID: mObj.fromProtein.id, labelText: mObj.fromProtein.name.replace("_", " ")}, 
            {chainIDs: null, proteinID: mObj.toProtein.id, labelText: mObj.toProtein.name.replace("_", " ")}
        ] : [null, null];
    },
        
    getChainsForProtein: function (proteinID) {
        return this.model.get("clmsModel").get("distancesObj").chainMap[proteinID];    
    },
        
    addAlignIDs: function (proteinIDsObj) {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        proteinIDsObj.forEach (function (pid) {
            pid.alignID = null;
            if (pid.proteinID) {
                var chainName = CLMSUI.modelUtils.getChainNameFromChainIndex (distancesObj.chainMap, pid.chainID);
                pid.alignID = CLMSUI.modelUtils.make3DAlignID (distancesObj.pdbBaseSeqID, chainName, pid.chainID);
            }
        }, this);
        return proteinIDsObj;
    },
        
        
    // Tooltip functions     
    convertEvtToXY: function (evt) {
        var sd = this.getSizeData();
		
		// *****!$$$ finally, cross-browser
		var elem = d3.select(this.el).select(".viewport");
		var px = evt.pageX - $(elem.node()).offset().left;
		var py = evt.pageY - $(elem.node()).offset().top;		
		//console.log ("p", evt, px, py, evt.target, evt.originalEvent.offsetX);

		var t = this.zoomStatus.translate();
		var baseScale = Math.min (sd.width / sd.lengthA, sd.height / sd.lengthB);
		var scale = baseScale * this.zoomStatus.scale();
		//console.log ("XXXY", this.zoomStatus.scale(), baseScale, scale, t);

		px -= t[0];	// translate
		py -= t[1];
		//console.log ("p2", px, py);

		px /= scale;	// scale
		py /= scale;
		//console.log ("p3", px, py);
		
		px++;	// +1 cos crosslinks are 1-indexed
		py = (sd.lengthB - 1) - py;	// flip because y is bigger at top
		//console.log ("p4", px, py);
		
        return [Math.round(px), Math.round(py)];
    },
		
	grabNeighbourhoodLinks: function (extent) {
        var filteredCrossLinks = this.model.getFilteredCrossLinks ();
        var filteredCrossLinkMap = d3.map (filteredCrossLinks, function(d) { return d.id; });
        var proteinIDs = this.getCurrentProteinIDs();
        var convFunc = function (x, y) {    // x and y are 0-indexed
            return {
                convX: x, 
                convY: y, 
                proteinX: proteinIDs[0] ? proteinIDs[0].proteinID : undefined, 
                proteinY: proteinIDs[1] ? proteinIDs[1].proteinID : undefined,
            };
        };
        var neighbourhoodLinks = CLMSUI.modelUtils.findResiduesInSquare (convFunc, filteredCrossLinkMap, extent[0][0], extent[0][1], extent[1][0], extent[1][1], true);
        return neighbourhoodLinks;
    },
		
	selectNeighbourhood: function (extent) {
        var add = d3.event.ctrlKey || d3.event.shiftKey;  // should this be added to current selection?
        var linkWrappers = this.grabNeighbourhoodLinks (extent);
        var crossLinks = _.pluck (linkWrappers, "crossLink");   
        this.model.setMarkedCrossLinks ("selection", crossLinks, false, add);
    },
		
        
    // Brush neighbourhood and invoke tooltip
    brushNeighbourhood: function (evt) {
        var xy = this.convertEvtToXY (evt);
		var halfRange = this.options.tooltipRange / 2;
		var highlightExtent = d3.transpose (xy.map (function (xory) { return [xory - halfRange, xory + halfRange]; }));	// turn xy into extent equivalent
        var linkWrappers = this.grabNeighbourhoodLinks (highlightExtent);
        var crossLinks = _.pluck (linkWrappers, "crossLink");
        
        // invoke tooltip before setting highlights model change for quicker tooltip response
        this.invokeTooltip (evt, linkWrappers);
        this.model.setMarkedCrossLinks ("highlights", crossLinks, true, false);
    },
		
	cancelHighlights: function () {
		this.model.setMarkedCrossLinks ("highlights", [], true, false);
	},
		
	setMatrixDragMode: function (evt) {
		this.options.matrixDragMode = evt.target.value;
		var top = d3.select(this.el);
		if (this.options.matrixDragMode === "Pan") {
			top.select(".viewport").call (this.zoomStatus);
			top.selectAll(".clipg .brush rect").style ("pointer-events", "none");
		} else {
			top.select(".viewport").on (".zoom", null);
			top.selectAll(".clipg .brush rect").style ("pointer-events", null);
		}
		return this;
	},
        
    getSingleLinkDistances: function (crossLink) {
		return this.model.getSingleCrosslinkDistance (crossLink);
    },
        
    invokeTooltip : function (evt, linkWrappers) {
        if (this.options.matrixObj) {
            linkWrappers.forEach (function (linkWrapper) {
                linkWrapper.distance = this.getSingleLinkDistances (linkWrapper.crossLink);
                linkWrapper.distanceFixed = linkWrapper.distance ? linkWrapper.distance.toFixed(2) : "Unknown";
            }, this);
            linkWrappers.sort (function (a, b) { return b.distance - a.distance; });
            var crossLinks = _.pluck (linkWrappers, "crossLink");
            var linkDistances = _.pluck (linkWrappers, "distanceFixed");

            this.model.get("tooltipModel")
                .set("header", CLMSUI.modelUtils.makeTooltipTitle.linkList (crossLinks.length - 1))
                .set("contents", CLMSUI.modelUtils.makeTooltipContents.linkList (crossLinks, {"Distance (Å)": linkDistances}))
                .set("location", evt)
            ;
            this.trigger ("change:location", this.model, evt);  // necessary to change position 'cos d3 event is a global property, it won't register as a change
        }
    },
    // end of tooltip functions  
    
    zoomHandler: function (self) {
        var sizeData = this.getSizeData();
        var width = sizeData.width;
        var height = sizeData.height;
        // bounded zoom behavior adapted from https://gist.github.com/shawnbot/6518285
        // (d3 events translate and scale values are just copied from zoomStatus)
        
        var widthRatio = width / sizeData.lengthA;
        var heightRatio = height / sizeData.lengthB;
        var minRatio = Math.min (widthRatio, heightRatio);
        
        var fx = sizeData.lengthA * minRatio;
        var fy = sizeData.lengthB * minRatio;

        var tx = Math.min (0, Math.max (d3.event.translate[0], fx - (fx * d3.event.scale)));
        var ty = Math.min (0, Math.max (d3.event.translate[1], fy - (fy * d3.event.scale)));
        //console.log ("tx", tx, ty, fx, fy, width, height);
        self.zoomStatus.translate ([tx, ty]);
        self.panZoom();
    },
        
    resetZoomHandler: function (self) {
        self.zoomStatus.scale(1.0).translate([0, 0]);
        return this;
    },
        
    // That's how you define the value of a pixel //
    // http://stackoverflow.com/questions/7812514/drawing-a-dot-on-html5-canvas
    // moved from out of render() as firefox in strict mode objected
    drawPixel: function (cd, pixi, r, g, b, a) {
        var index = pixi * 4;
        cd[index] = r;
        cd[index + 1] = g;
        cd[index + 2] = b;
        cd[index + 3] = a;
    },
            
    drawPixel32: function (cd, pixi, r, g, b, a) {
        cd[pixi] = (a << 24) + (b << 16) + (g << 8) + r;
    },
    
    render: function () {
        if (this.options.matrixObj && this.isVisible()) {
            console.log ("MATRIX RENDER");

            this
                .resize()
                .renderBackgroundMap ()
                .renderCrossLinks ({isVisible: true})
            ;
        }
        return this;
    },
		
	// draw white blocks in background to demarcate areas covered by active pdb chains
	renderChainBlocks: function (alignInfo) {
		
		// Find continuous blocks in chain when mapped to search sequence (as chain sequence may have gaps in) (called in next bit of code)
		var splitChain = function (alignInfo) {
			var seq = this.model.get("alignColl").get(alignInfo.proteinID).getCompSequence(alignInfo.alignID);
			var index = seq.convertToRef;
			var blocks = [];
			var start = index[0];
			for (var n = 0; n < index.length - 1; n++) {
				if ((index[n+1] - index[n]) > 1) {  // if non-contiguous numbers
					blocks.push ({first: start + 1, last: index[n] + 1});
					start = index[n + 1];
				}
			}
			blocks.push ({first: start + 1, last: index [index.length - 1] + 1});
			return blocks;
		};
		
		var seqLengths = this.getSeqLengthData();
        var seqLengthB = seqLengths.lengthB - 1;   

		// Work out blocks for each chain, using routine above
		var blockMap = {};
		d3.merge(alignInfo).forEach (function (alignDatum) {
			blockMap[alignDatum.alignID] = splitChain.call (this, alignDatum);    
		}, this);
		//console.log ("blockMap", blockMap);

		// Draw backgrounds for each pairing of chains
		var blockAreas = this.zoomGroup.select(".blockAreas");
		var blockSel = blockAreas.selectAll(".chainArea");
		blockSel.remove();
		
		alignInfo[0].forEach (function (alignInfo1) {
			var blocks1 = blockMap[alignInfo1.alignID];

			alignInfo[1].forEach (function (alignInfo2) {
				var blocks2 = blockMap[alignInfo2.alignID];

				blocks1.forEach (function (brange1) {
					blocks2.forEach (function (brange2) {
						blockAreas.append ("rect")
							.attr ("x", brange1.first - 1)
							.attr ("y", seqLengthB - (brange2.last - 1))
							.attr ("width", brange1.last - brange1.first + 1)
							.attr ("height", brange2.last - brange2.first + 1)
							.attr ("class", "chainArea")
							.style ("fill", this.options.chainBackground)
						;
					}, this);
				}, this);

			}, this);
		}, this);					  
	},
        
    renderBackgroundMap: function () {
        var distancesObj = this.model.get("clmsModel").get("distancesObj");
        
        // only render background if distances available
        if (distancesObj) {
			
			// Get alignment info for chains in the two proteins, filtering to chains that are marked as showable
            var proteinIDs = this.getCurrentProteinIDs();
            var alignInfo = proteinIDs.map (function (proteinID, i) {
                var pid = proteinID.proteinID;
                var chains = distancesObj.chainMap[pid];
                if (chains) {
                    var chainIDs = chains
                        .filter (function (chain) { return this.chainMayShow (i, chain.index); }, this)
                        .map (function (chain) { return {proteinID: pid, chainID: chain.index}; })
                    ;
                    return this.addAlignIDs (chainIDs);
                }
                return [];
            }, this);
            //console.log ("ALLL", alignInfo);
			
			// draw the areas covered by pdb chain data
			this.renderChainBlocks (alignInfo);
			
			// Work out if at least one of the matrices has distances beyond just the crosslinks
			var linksOnly = true;
			alignInfo[0].forEach (function (alignInfo1) {
                var chainIndex1 = alignInfo1.chainID;
                alignInfo[1].forEach (function (alignInfo2) {
                    var chainIndex2 = alignInfo2.chainID;
                    var distanceMatrixValue = distancesObj.matrices[chainIndex1+"-"+chainIndex2];
                    linksOnly &= distanceMatrixValue.linksOnly;
                }, this);
            }, this);
			
			// If so, it's worth drawing the background, setting up the canvas etc
			if (linksOnly) {
				// shrink canvas / hide image if not showing it
				this.canvas
					.attr("width", 1)
					.attr("height", 1)
				;
				this.zoomGroup.select(".backgroundImage").select("image").style("display", "none");
			} else {
				var seqLengths = this.getSeqLengthData();
				this.canvas
					.attr("width",  seqLengths.lengthA)
					.attr("height", seqLengths.lengthB)
				;
				var canvasNode = this.canvas.node();
				var ctx = canvasNode.getContext("2d");       
				ctx.clearRect (0, 0, canvasNode.width, canvasNode.height);

				var rangeDomain = this.colourScaleModel.get("colScale").domain();
				var min = rangeDomain[0];
				var max = rangeDomain[1];
				var rangeColours = this.colourScaleModel.get("colScale").range();
				var cols = rangeColours;//.slice (1,3);
				// have slightly different saturation/luminance for each colour so shows up in black & white
				var colourArray = cols.map (function(col, i) {
					col = d3.hsl(col);
					col.s = 0.4;// - (0.1 * i);
					col.l = 0.85;// - (0.1 * i);
					return col.rgb();
				});

				var seqLengthB = seqLengths.lengthB - 1;    

				CLMSUI.times = CLMSUI.times || [];
				var start = performance.now();

				// function to draw one matrix according to a pairing of two chains (called in loop later)
				var drawDistanceMatrix = function (imgDataArr, minArray, matrixValue, alignInfo1, alignInfo2) {
					var alignColl = this.model.get("alignColl");
					var distanceMatrix = matrixValue.distanceMatrix;
					var pw = this.canvas.attr("width");

					// precalc some stuff that would get recalculatd a lot in the inner loop
					var preCalcSearchIndices = d3.keys(distanceMatrix[0]).map (function (dIndex) {
						return alignColl.getAlignedIndex (+dIndex + 1, alignInfo2.proteinID, true, alignInfo2.alignID, true) - 1;
					});
					//console.log ("pcsi", preCalcSearchIndices, this);

					// draw chain values, aligned to search sequence
					for (var i = 0; i < distanceMatrix.length; i++){
						var row = distanceMatrix[i];
						var searchIndex1 = alignColl.getAlignedIndex (i + 1, alignInfo1.proteinID, true, alignInfo1.alignID, true) - 1;
						if (row && searchIndex1 >= 0) {
							for (var j = 0, len = row.length; j < len; j++) {   // was seqLength     
								var distance = row[j];
								if (distance < max) {
									var searchIndex2 = preCalcSearchIndices[j];
									if (searchIndex2 > 0) {
										var index = searchIndex1 + ((seqLengthB - searchIndex2) * pw);
										var val = minArray ? minArray[index] : 0;
										if (val === 0 || val > distance) {
											var col = colourArray [distance > min ? 1 : 0];
											this.drawPixel (imgDataArr, index, col.r, col.g, col.b, 255);
											//drawPixel32 (data, i + ((seqLength - j) * pw), col.r, col.g, col.b, 255);
											if (minArray) {
												minArray[index] = val;
											}
										}
									}
								}
							}
						}
					}
				};

				var middle = performance.now();

				var canvasData = ctx.getImageData (0, 0, this.canvas.attr("width"), this.canvas.attr("height"));
				var cd = canvasData.data;
				var minArray = (alignInfo[0].length * alignInfo[1].length) > 1 ? new Float32Array (this.canvas.attr("width") * this.canvas.attr("height")) : undefined;

				// draw actual content of chain pairings
				alignInfo[0].forEach (function (alignInfo1) {
					var chainIndex1 = alignInfo1.chainID;
					alignInfo[1].forEach (function (alignInfo2) {
						var chainIndex2 = alignInfo2.chainID;
						var distanceMatrixValue = distancesObj.matrices[chainIndex1+"-"+chainIndex2];
						drawDistanceMatrix.call (this, cd, minArray, distanceMatrixValue, alignInfo1, alignInfo2);
					}, this);
				}, this);

				ctx.putImageData (canvasData, 0, 0);

				var end = performance.now();
				CLMSUI.times.push (Math.round (end - middle));
				//console.log ("CLMSUI.times", CLMSUI.times);

				this.zoomGroup.select(".backgroundImage").select("image")
					.style ("display", null)	// default value
					.attr ("width", this.canvas.attr("width"))
					.attr ("height", this.canvas.attr("height"))
					.attr ("href", canvasNode.toDataURL("image/png"))
				;
			}
        }
        return this;
    },
        
    renderCrossLinks: function (options) {
        
        if ((options && options.isVisible) || (this.options.matrixObj && this.isVisible())) {
            var self = this;

            if (this.options.matrixObj) {       
                var colourScheme = this.model.get("linkColourAssignment");

                var seqLengths = this.getSeqLengthData();
                var seqLengthB = seqLengths.lengthB - 1;
                var xStep = 1;//minDim / seqLengthA;
                var yStep = 1;//minDim / seqLengthB;
                var linkWidth = this.options.linkWidth;
                var linkWidthOffset = (linkWidth - 1) / 2;
                var xLinkWidth = linkWidth * xStep;
                var yLinkWidth = linkWidth * yStep;

                var proteinIDs = this.getCurrentProteinIDs();

                var filteredCrossLinks = this.model.getFilteredCrossLinks ();//.values();
                var selectedCrossLinkIDs = d3.set (_.pluck (this.model.getMarkedCrossLinks("selection"), "id"));
                var highlightedCrossLinkIDs = d3.set (_.pluck (this.model.getMarkedCrossLinks("highlights"), "id"));

                var finalCrossLinks = Array.from(filteredCrossLinks).filter (function (crossLink) {
                    return (crossLink.toProtein.id === proteinIDs[0].proteinID && crossLink.fromProtein.id === proteinIDs[1].proteinID) || (crossLink.toProtein.id === proteinIDs[1].proteinID && crossLink.fromProtein.id === proteinIDs[0].proteinID);
                }, this);

                var sortedFinalCrossLinks = CLMSUI.modelUtils.radixSort (3, finalCrossLinks, function (link) {
                    return highlightedCrossLinkIDs.has (link.id) ? 2 : (selectedCrossLinkIDs.has (link.id) ? 1 : 0);
                });
                
                var fromToStore = sortedFinalCrossLinks.map (function (crossLink) {
                    return [crossLink.fromResidue - 1, crossLink.toResidue - 1];
                });

                var linkSel = this.zoomGroup.select(".crossLinkPlot").selectAll("rect.crossLink")
                    .data(sortedFinalCrossLinks, function(d) { return d.id; })
                    .order()
                ;
                linkSel.exit().remove();
                linkSel.enter().append("rect")
                    .attr ("class", "crossLink")
                    .attr ("width", xLinkWidth)
                    .attr ("height", yLinkWidth)
                ;
                linkSel
                    .attr("x", function(d, i) { return fromToStore[i][0] - linkWidthOffset; })
                    .attr("y", function(d, i) { return (seqLengthB - fromToStore[i][1]) - linkWidthOffset; })
                    .each (function (d) {
                        var high = highlightedCrossLinkIDs.has (d.id);
                        var selected = selectedCrossLinkIDs.has (d.id);
						var ambig = d.ambiguous;
                        d3.select(this)
							.style ("fill-opacity", ambig ? 0.6 : null)
                            .style ("fill", high ?  self.options.highlightedColour : (selected ? self.options.selectedColour : colourScheme.getColour(d)))
							.style ("stroke-dasharray", ambig ? 3 : null)
                            .style ("stroke", high || selected ? "black" : (ambig ? colourScheme.getColour(d) : null))
                            //.style ("stroke-opacity", high || selected ? 0.4 : null)
                        ;
                    })
                ;
            }
        }
        
        return this;
    },
        
    getSizeData: function () {
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
        var cy = jqElem.height(); //this.svg.node().clientHeight;
        var width = Math.max (0, cx - this.options.margin.left - this.options.margin.right);
        var height = Math.max (0, cy - this.options.margin.top  - this.options.margin.bottom);
        //its going to be square and fit in containing div
        var minDim = Math.min (width, height);
        
        var sizeData = this.getSeqLengthData();
        $.extend (sizeData, {cx: cx, cy: cy, width: width, height: height, minDim: minDim,});
        return sizeData;
    },
        
    getSeqLengthData: function () {
        var mObj = this.options.matrixObj;
        var size = mObj ? [mObj.fromProtein.size, mObj.toProtein.size] : [0, 0];
        return {lengthA: size[0], lengthB: size[1]};
    },
    
    // called when things need repositioned, but not re-rendered from data
    resize: function () {     
        console.log ("matrix resize");
        var sizeData = this.getSizeData(); 
        var minDim = sizeData.minDim;
        		
        // fix viewport new size, previously used .attr, but then setting the size on the child canvas element expanded it, some style trumps attr thing
        //var widthRatio = minDim / sizeData.lengthA;
        //var heightRatio = minDim / sizeData.lengthB;
        var widthRatio = sizeData.width / sizeData.lengthA;
        var heightRatio = sizeData.height / sizeData.lengthB;
        var minRatio = Math.min (widthRatio, heightRatio);
        var diffRatio = widthRatio / heightRatio;
        
        var viewPort = d3.select(this.el).select(".viewport");
        
        var fx = sizeData.lengthA * minRatio;
        var fy = sizeData.lengthB * minRatio;
        
        //console.log (sizeData, "rr", widthRatio, heightRatio, minRatio, diffRatio, "FXY", fx, fy);
        
        viewPort
            .style("width",  fx+"px")
            .style("height", fy+"px")
        ;
        
        d3.select(this.el).select("#matrixClip > rect")
            .attr ("width", fx)
            .attr ("height", fy)
        ;
 
        // Need to rejig x/y scales and d3 translate coordinates if resizing
        // set x/y scales to full domains and current size (range)
        this.x
            .domain([1, sizeData.lengthA + 1])
            .range([0, fx])
        ;

        // y-scale (inverted domain)
        this.y
			.domain([sizeData.lengthB + 1, 1])
            .range([0, fy])
        ;
		
		// update brush
		this.brush
			.x(this.x.copy().range(this.x.domain().slice()))
			.y(this.y.copy().range(this.y.domain().slice().reverse()))
		;
		this.zoomGroup.select(".brush").call(this.brush);
		//console.log ("BRUSH", this.brush);
		
		// make sure brush rectangle is big enough to cover viewport (accommodate for scaling)
		this.zoomGroup.select(".brush rect.background")
		    .attr ("width", sizeData.lengthA)
            .attr ("height", sizeData.lengthB)
        ;
        
        //var approxTicks = Math.round (minDim / 50); // 50px minimum spacing between ticks
        this.xAxis.ticks (Math.round (fx / 50)).outerTickSize(0);
        this.yAxis.ticks (Math.round (fy / 50)).outerTickSize(0);     
        
        // then store the current pan/zoom values
        var curt = this.zoomStatus.translate();
        var curs = this.zoomStatus.scale();
        
        // reset reference x and y scales in zoomStatus object to be x and y scales above
        this.zoomStatus.x(this.x).y(this.y);

        // modify translate coordinates by change (delta) in display size
        var deltaz = this.last ? (minDim / this.last) : 1;
        //console.log ("deltaz", deltaz);
        this.last = minDim;
        curt[0] *= deltaz;
        curt[1] *= deltaz;
        // feed current pan/zoom values back into zoomStatus object
        // (as setting .x and .y above resets them inside zoomStatus)
        // this adjusts domains of x and y scales
        this.zoomStatus.scale(curs).translate(curt);
        
        // Basically the point is to readjust the axes when the display space is resized, but preserving their current zoom/pan settings
        // separately from the scaling due to the resizing
        
        // pan/zoom canvas
        this.panZoom ();   
        
        return this;
    },
        
    // Used to do this just on resize, but rectangular areas mean labels often need re-centred on panning
    repositionLabels: function (sizeData) {
        // reposition labels
        //console.log ("SD", sizeData, this.options.margin);
        var labelCoords = [
            {x: sizeData.right / 2, y: sizeData.bottom + this.options.margin.bottom - 5, rot: 0}, 
            {x: -this.options.margin.left, y: sizeData.bottom / 2, rot: -90},
            {x: sizeData.right / 2, y: 0, rot: 0}
        ];
        this.vis.selectAll("g.label text")
            .data (labelCoords)
            .attr ("transform", function(d) {
                return "translate("+d.x+" "+d.y+") rotate("+d.rot+")";
            })
        ;
        return this;
    },
    
    // called when panning and zooming performed
    panZoom: function () {
        
        var self = this;
        var sizeData = this.getSizeData();
        
        // rescale and position canvas according to pan/zoom settings and available space
        var baseScale = Math.min (sizeData.width / sizeData.lengthA, sizeData.height / sizeData.lengthB);
        var scale = baseScale * this.zoomStatus.scale();
        var scaleString = "scale("+scale+")";
        var translateString = "translate("+this.zoomStatus.translate()[0]+"px,"+ this.zoomStatus.translate()[1]+"px)";
		var translateStringAttr = "translate("+this.zoomStatus.translate()[0]+","+ this.zoomStatus.translate()[1]+")";
        var transformStrings = {attr: translateStringAttr + " " + scaleString, style: translateString + " " + scaleString};
        
		// for some reason using a css transform style on an svg group doesn't play nice in firefox (i.e. wrong positions reported, offsetx/y mangled etc)
		// , so use attr transform instead
        [/*{elem: d3.select(this.el).select(".mouseMat"), type: "style"},*/ {elem: this.zoomGroup, type: "attr"}].forEach (function (d3sel) {
			if (d3sel.type === "attr") {
				d3sel.elem.attr ("transform", transformStrings[d3sel.type])
			}
            else { 
				var tString = transformStrings[d3sel.type];
				["-ms-transform", "-moz-transform", "-o-transform", "-webkit-transform", "transform"].forEach (function (styleName) {
					d3sel.elem.style (styleName, tString);
				})
			}
        });
        
        // If bottom edge of canvas is higher up than bottom of viewport put the x axis beneath it
        var cvs = $(this.canvas.node());
        var viewport = cvs.parent();
        sizeData.viewHeight = $.zepto ? viewport.height() : viewport.outerHeight(true);
        sizeData.viewWidth = $.zepto ? viewport.width() : viewport.outerWidth(true);

        var bottom = sizeData.viewHeight; /*Math.min (
            cvs.position().top + (($.zepto ? cvs.height() : cvs.outerHeight(true)) * scale), 
            sizeData.viewHeight
        ); */
        var right = sizeData.viewWidth; /*Math.min (
            cvs.position().left + (($.zepto ? cvs.width() : cvs.outerWidth(true)) * scale), 
            sizeData.viewWidth
        );*/
        
        // redraw axes
        this.vis.select(".y")
            .call(self.yAxis)
        ;
        
        this.vis.select(".x")
            .attr("transform", "translate(0," + bottom + ")")
            .call(self.xAxis)
        ;
        
        CLMSUI.utils.declutterAxis (this.vis.select(".x"));
        
        sizeData.bottom = bottom;
        sizeData.right = right;
        this.repositionLabels (sizeData);
        
        //console.log ("sizeData", sizeData);
        
        return this;
    },
        
    identifier: "Matrix View",
        
    optionsToString: function () {
        var matrixObj = this.options.matrixObj;
        return [matrixObj.fromProtein, matrixObj.toProtein]
            .map (function (protein) { return protein.name.replace("_", " "); })
            .join("-")
        ;
    },
});
    
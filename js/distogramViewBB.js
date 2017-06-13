//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js


    var CLMSUI = CLMSUI || {};
    
    CLMSUI.DistogramBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
               "click .intraRandomButton": "reRandom",
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.DistogramBB.__super__.initialize.apply (this, arguments);

            var defaultOptions = {
                xlabel: "Cα-Cα Distance (Å)",
                ylabel: "Count",
                seriesNames: ["Cross Links", "Decoys (TD-DD)", "Random"],
                subSeriesNames: viewOptions.colourScaleModel ? viewOptions.colourScaleModel.get("labels").range() : ["Short", "Good", "Overlong"],
                scaleOthersTo: {"Random": "Cross Links"},
                chartTitle: "Distogram",
                intraRandomOnly: false,
                maxX: 90
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);
            this.options.groups = [this.options.subSeriesNames];
            this.colourScaleModel = viewOptions.colourScaleModel;

            this.precalcedDistributions = {};
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var template = _.template ("<DIV class='buttonPanel'></DIV><DIV class='panelInner distoDiv' flex-grow='1'></DIV>");
            mainDivSel.append("div")
                .attr ("class", "verticalFlexContainer")
                .html(
                    template ({})
                )
            ;
            
            var buttonData = [
                {class: "downloadButton", label: CLMSUI.utils.commonLabels.downloadImg+"SVG", type: "button", id: "download"},
                {class: "intraRandomButton", label: "Self Randoms Only", type: "checkbox", id: "intraRandom", initialState: this.options.intraRandomOnly, title: "Show only random links between same protein", noBreak: false},
            ];
            
            var buttonPanel = mainDivSel.select("div.buttonPanel");
            CLMSUI.utils.makeBackboneButtons (buttonPanel, self.el.id, buttonData);

            var chartDiv = mainDivSel.select(".distoDiv")
                .attr ("id", mainDivSel.attr("id")+"c3Chart")
            ;

            // make 'empty' columns for all series and sub-series
            var columnsAsNamesOnly = d3.merge([this.options.seriesNames, this.options.subSeriesNames]).map (function(sname) { return [sname]; });

            var chartID = "#" + chartDiv.attr("id");
            // Generate the C3 Chart
            this.chart = c3.generate({
                bindto: chartID,
                transition: {
                    duration: 0,
                },
                data: {
                    columns: columnsAsNamesOnly,
                    type: 'bar',
                    groups: this.options.groups || this.options.seriesNames,
                    colors: {
                        "Cross Links": "#44d",
                        Random: "#888",
                        "Decoys (TD-DD)": "#d44",
                    },
                    selection: {
                        enabled: false,
                        grouped: true,
                        multiple: true,
                        draggable: true
                    },
                    ondragend: function (extent) {
                        console.log ("extent", extent);
                    },
                    order: null,
                },
                bar: {
                    width: {
                        ratio: 0.8 // this makes bar width 50% of length between ticks
                            // need to poke c3.js code to see why the bars are initally zero width (whatever it calculates from is zero too I suspect)
                    }
                    //width: 8 // this makes bar width 8px
                },
                axis: {
                    x: {
                        label: {
                            text: this.options.xlabel,
                            position: "outer-right",
                        },
                        //max: this.options.maxX,
                        padding: {  // padding of 1 ticks to right of chart to stop bars in last column getting clipped
                          left: 0,
                          right: 1,
                        },
                        tick: {
                            culling: {
                                max: Math.floor (this.options.maxX / 10)
                            }
                        }
                    },
                    y: {
                        label: this.options.ylabel,
                        tick: { // blank non-whole numbers on y axis with this function
                            // except this does the same for tooltips, so non-whole numbers dont get shown in tooltips unless tooltip.value overridden below
                            format: function (n) {
                                return (n == Math.floor(n)) ? n : "";
                            }
                        }
                    }
                },
                legend: {
                    //hide: this.options.seriesNames
                },
                grid: {
                    lines: {
                        front: false,   // stops overlong and short gridlines obscuring actual data
                    },
                },
                padding: {
                    left: 40, // need this fixed amount if y labels change magnitude i.e. single figures only to double figures causes a horizontal jump
                    right: 20,
                    top: 0
                },
                tooltip: {
                    format: {
                        title: function (x) {
                            return self.options.xlabel + " " + x;
                        },
                        name: function (name) {
                            return name + " " + self.options.ylabel;
                        },
                        value: function (value, ratio, id) {
                            var v = "";
                            if (value !== undefined) {
                                v = value.toFixed (id === "Random" ? 1 : 0);
                                if (id !== "Random") {
                                    v += "<span style='visibility:hidden; margin: 0'>.0</span>";
                                }
                            }
                            return v;
                        },
                    },  
                    contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
                        var text = this.getTooltipContent (d, defaultTitleFormat, defaultValueFormat, color);
                        return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>'); // anti-sanitise
                    },
                },
                subchart: {
                    show: false,
                    size: {
                        height: 0
                    },
                },
                title: {
                    text: this.options.chartTitle
                },
            });
            this.chart.hide ("Cross Links", {withLegend: true});    // doesn't work properly if done in configuration above
            if (! this.model.get("clmsModel").get("decoysPresent")) {   
                this.chart.hide ("Decoys (TD-DD)", {withLegend: true}); // if no decoys, hide the decoy total series
            }
            
            
            function distancesAvailable () {
                console.log ("DISTOGRAM RAND DISTANCES CALCULATED");
                this.recalcRandomBinning();
                this.render();
                // hide random choice button if only 1 protein
                var self = this;
                d3.select(this.el).select("#distoPanelintraRandom")
                    .style ("display", self.model.get("clmsModel").get("participants").size > 1 ? null : "none")
                ;
            }

            this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
            this.listenTo (this.colourScaleModel, "colourModelChanged", function() { this.render ({noRescale:true, recolourOnly: true}); } /*relayout*/); // have details (range, domain) of distance colour model changed?
            this.listenTo (this.model.get("clmsModel"), "change:distancesObj", distancesAvailable); // new distanceObj for new pdb
            this.listenTo (CLMSUI.vent, "distancesAdjusted", distancesAvailable);   // changes to distancesObj with existing pdb (usually alignment change)
            
            if (this.model.get("clmsModel").get("distancesObj")) {
                distancesAvailable();
            }
            
            return this;
        },

        render: function (options) {
            
            options = options || {};
            
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                console.log ("re rendering distogram");

                var TT = 0, TD = 1, DD = 2;
                var series = this.getRelevantCrossLinkDistances();
                var seriesLengths = series.map (function(d) { return d.length; });

                // Add data and placeholders for random data
                series.push ([]);
                seriesLengths.push (this.randArrLength);  // we want to scale random distribution to unfiltered crosslink dataset size
                
                // Add sub-series data
                // split TT list into sublists for length
                var colModel = this.colourScaleModel;
                var colDomain = colModel.get("colScale").domain();
                var splitSeries = [[],[],[]];
                series[TT].forEach (function (val) {
                    var cat = val < colDomain[0] ? 0 : (val > colDomain[1] ? 2 : 1);
                    splitSeries[cat].push (val);
                });
                for (var n = 0; n < splitSeries.length; n++) {
                    series.push (splitSeries[n]);
                    seriesLengths.push (splitSeries[n].length);
                }
               
                // Add DD Decoys as temporary series for aggregation
                var seriesNames = d3.merge ([this.options.seriesNames, this.options.subSeriesNames]);  // copy and merge series and subseries names
                seriesNames.splice (DD, 0, "Decoys (DD)");
                
                //console.log ("seriesLengths", seriesLengths);
                var removeCatchAllCategory = true;
                var countArrays = this.aggregate (series, seriesLengths, this.precalcedDistributions, removeCatchAllCategory, seriesNames);
                
                //console.log ("ca", countArrays, countArrays[DD]);
                // Adjust the TD count by subtracting the matching DD count, to get TD-DD, then discard the DD series
                countArrays[TD].forEach (function (v, i) {
                    countArrays[TD][i] = Math.max (v - countArrays[DD][i], 0);  // subtract DD from TD counts  
                });
                countArrays.splice (DD,1);   // remove DD, its purpose is done
                seriesNames.splice (DD,1);
                //console.log ("ca2", countArrays);

                //var maxY = d3.max(countArrays[0]);  // max calced on real data only
                // if max y needs to be calculated across all series
                var maxY = d3.max(countArrays, function(array) {
                    return d3.max(removeCatchAllCategory ? array : array.slice (0, -1));  // ignore last element in array if not already removed as it's dumping ground for everything over last value 
                });
                maxY = Math.max (maxY, 1);
                //console.log ("maxY", maxY);
                
                // add names to front of arrays as c3 demands (need to wait until after we calc max otherwise the string gets returned as max)
                countArrays.forEach (function (countArray,i) { countArray.unshift (seriesNames[i]); }, this);
                //console.log ("thresholds", thresholds);
                
                
                
                //console.log ("countArrays", countArrays);

                
                var redoChart = function () {
                    var colMap = this.getSeriesColours();
                    this.chart.load({
                        columns: countArrays,
                        colors: colMap,
                    });
                    this
                        .makeBarsSitBetweenTicks()
                        .makeChartTitle(splitSeries)
                    ;
                };
                
                 // Jiggery-pokery to stop c3 doing redraws on every single command (near enough)
                var tempHandle = c3.chart.internal.fn.redraw;
                c3.chart.internal.fn.redraw = function () {};
                var chartInternal = this.chart.internal;

                if (options.noRescale) {
                    chartInternal.config.interaction_enabled = false; // don't recalc event rectangles, no need
                    countArrays = countArrays.filter (function (arr) {  // don't need to reload randoms either
                        return arr[0] !== "Random";
                    });
                    redoChart.call (this);
                    c3.chart.internal.fn.redraw = tempHandle;
                    tempHandle.call (chartInternal, {withLegend: true});
                    chartInternal.config.interaction_enabled = true;  // reset interaction flag
                } else {
                    var curMaxY = this.chart.axis.max().y;
                    // only reset maxY (i.e. the chart scale) if necessary as it causes redundant repaint (given we load and repaint straight after)
                    // so only reset scale if maxY is bigger than current chart value or maxY is less than half of current chart value
                    if (curMaxY === undefined || curMaxY < maxY || curMaxY / maxY >= 2) {   
                        console.log ("resetting axis max from", curMaxY, "to", maxY, "nrs", options.noRescale);
                        this.chart.axis.max({y: maxY});
                    }
                    redoChart.call (this);
                    c3.chart.internal.fn.redraw = tempHandle;
                    tempHandle.call (chartInternal, {withLegend: true, withUpdateOrgXDomain: true, withUpdateXDomain: true});
                }
                            
                //console.log ("data", distArr, binnedData);
            }

            return this;
        },
        
        // Hack to move bars right by half a bar width so they sit between correct values rather than over the start of an interval
        makeBarsSitBetweenTicks: function () {
            var internal = this.chart.internal;
            var halfBarW = internal.getBarW (internal.xAxis, 1) / 2;
            d3.select(this.el).selectAll(".c3-chart-bars").attr("transform", "translate("+halfBarW+",0)");
            return this;
        },
        
        // reset title
        makeChartTitle: function (splitSeries) {
            var commaed = d3.format(",");
            var linkReport = splitSeries.map (function (split) { return split.length; });
            var total = d3.sum (linkReport);
            var linkReportStr = linkReport.map (function (count, i) {
                return commaed(count)+" "+this.options.subSeriesNames[i];
            }, this);
            
            var titleText = this.options.chartTitle +": "+commaed(total)+" Cross-Links - "+linkReportStr.join(", ");
            
            d3.select(this.el).select(".c3-title").text (titleText);
            //this.chart.internal.redrawTitle();
            
            return this;
        },
        
        getRelevantCrossLinkDistances: function () {
            /*
            var filteredCrossLinks = this.model.getFilteredCrossLinks ("all");   
            function decoyClass (link) {
                return (link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0);
            }
            var links = [[],[],[]];

            filteredCrossLinks.forEach (function (xlink) {
                if (xlink.toProtein) {  // ignore linears
                    links [decoyClass (xlink)].push (xlink);
                }
            });
            console.log ("links", links);
            */
            var links = [this.model.getFilteredCrossLinks (), this.model.getFilteredCrossLinks ("decoysTD"), this.model.getFilteredCrossLinks ("decoysDD")];
            
            return [
                this.model.getCrossLinkDistances (links[0]),    // TT
                this.model.getCrossLinkDistances (links[1], {calcDecoyProteinDistances: true}),  // TD
                this.model.getCrossLinkDistances (links[2], {calcDecoyProteinDistances: true}),  // DD
            ];
        },
        
        aggregate: function (series, seriesLengths, precalcedDistributions, removeLastEntry, seriesNames) {
            // get extents of all arrays, concatenate them, then get extent of that array
            var extent = d3.extent ([].concat.apply([], series.map (function(d) { return d3.extent(d); })));
            //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
            var thresholds = d3.range (d3.min ([0, Math.floor(extent[0])]), d3.max ([1 /*Math.ceil(extent[1])*/, this.options.maxX]));
            //console.log ("thresholds", thresholds, extent);
            if (thresholds.length === 0) {
                thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
            }

            var countArrays = series.map (function (aseries, i) {
                var aseriesName = seriesNames[i];
                var rescaleToSeries = this.options.scaleOthersTo[aseriesName];
                var rescaleLength = 1;
                if (rescaleToSeries) {
                    var rsIndex = seriesNames.indexOf (rescaleToSeries);
                    rescaleLength = rsIndex >= 0 ? seriesLengths[rsIndex] : 1; 
                    //console.log ("rescale", aseriesName, rescaleToSeries, seriesNames, rsIndex, seriesLengths);
                }
                
                var binnedData = precalcedDistributions[aseriesName]
                    ? precalcedDistributions[aseriesName]
                    : d3.layout.histogram().bins(thresholds)(aseries)
                ;
                //console.log (aseriesName, "binnedData", aseries, binnedData);

                var scale = rescaleToSeries ? rescaleLength / (seriesLengths[i] || rescaleLength) : 1;
                return binnedData.map (function (nestedArr) {
                    return nestedArr.y * scale;
                });
            }, this);
            
            if (removeLastEntry) {  // optionally remove the dumping ground entries for values bigger than max cutoff
                countArrays.forEach (function (array) {
                    array.pop();
                });
            }

            return countArrays;
        },
        
        reRandom: function () {
            this.options.intraRandomOnly = !this.options.intraRandomOnly;
            this.recalcRandomBinning();
            this.render();
        },
        

        recalcRandomBinning: function () {
            // need to calc getRelevant as we want random to be proportionate to count of filtered links that have 3d distances
            var distArr = this.getRelevantCrossLinkDistances();
            //var randArr = this.model.get("clmsModel").get("distancesObj").getFlattenedDistances();
            var linkCount = distArr[0].length; // d3.sum (distArr, function(d) { return d.length; });   // random count prop to real links, not decoys as well
            console.log ("model", this.model);
            var searchArray = CLMS.arrayFromMapValues(this.model.get("clmsModel").get("searches"));
            var residueSets = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray);
            console.log ("ress", residueSets);
            var randArr = this.model.get("clmsModel").get("distancesObj").getRandomDistances (
                Math.min ((linkCount * 100) || 10000, 100000), 
                d3.values (residueSets),
                {intraOnly: this.options.intraRandomOnly},
            );
            var thresholds = d3.range(0, this.options.maxX);
            var binnedData = d3.layout.histogram()
                .bins(thresholds)
                (randArr)
            ;
            this.randArrLength = randArr.length;
            this.precalcedDistributions = this.precalcedDistributions || {};
            this.precalcedDistributions["Random"] = binnedData;
            console.log ("RANDOM", binnedData);
        },

        relayout: function () {
            // fix c3 setting max-height to current height so it never gets bigger y-wise
            // See https://github.com/masayuki0812/c3/issues/1450
            d3.select(this.el).select(".c3")
                .style("max-height", "none")
                .style ("position", null)
            ;   
            //this.redrawColourRanges();
            this.chart.resize();
            this.makeBarsSitBetweenTicks ();
            return this;
        },
        
        getSeriesColours: function () {
            var colModel = this.colourScaleModel;
            var colScale = colModel.get("colScale");
            var colLabels = colModel.get("labels");
            var colDomain = colScale.domain();
            /*
            this.chart.xgrids([{value: colDomain[0], text: colLabels.range()[0]+' ↑'}, {value: colDomain[1], text: colLabels.range()[2]+' ↓', class:"overLengthGridRule"}]);
            */
            
            var colRange = colScale.range();
            var colMap = {};
            this.options.subSeriesNames.forEach (function (subSeries, i) {
                colMap[subSeries] = colRange[i];
            });
            return colMap;
            
            //this.chart.data.colors (colMap);
            //return this;    
        },

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            CLMSUI.DistogramBB.__super__.remove.apply (this, arguments);    
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();
        },
        
        identifier: "Distogram",
        
        optionsToString: function () {
            var seriesIDs = this.chart.data().map (function (series) { return series.id; });
            var hiddenIDsSet = d3.set (this.chart.internal.hiddenTargetIds);
            seriesIDs = seriesIDs.filter (function (sid) {
                return !hiddenIDsSet.has (sid);
            });
            return seriesIDs.join("-").toUpperCase();    
        },
    });

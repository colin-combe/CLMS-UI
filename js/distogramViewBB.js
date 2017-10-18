//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js


    var CLMSUI = CLMSUI || {};
    
    CLMSUI.DistogramBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if (_.isFunction(parentEvents)) {
              parentEvents = parentEvents();
          }
          return _.extend ({}, parentEvents, {
               "click .intraRandomButton": "reRandom",
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.DistogramBB.__super__.initialize.apply (this, arguments);

            var defaultOptions = {
                xlabel: "Cα-Cα Distance (Å)",
                ylabel: "Count",
                seriesNames: ["Cross-Links", "Decoys (TD-DD)", "Random"],
                subSeriesNames: [],
                scaleOthersTo: {"Random": "Cross-Links"},
                chartTitle: "Distogram",
                intraRandomOnly: false,
                maxX: 90
            };
            
            var barOptions = [
                {func: function(c) { return [c.filteredMatches_pp.length]; }, label: "Cross-Link Match Count", decimalPlaces: 0},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.score; }); }, label: "Match Score", decimalPlaces: 2, matchLevel: true},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorMZ; }); }, label: "Match Precursor MZ", decimalPlaces: 4, matchLevel: true},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.precursorCharge; }); }, label: "Match Precursor Charge", decimalPlaces: 0,  matchLevel: true},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.calc_mass; }); }, label: "Match Calculated Mass", decimalPlaces: 4, matchLevel: true},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return m.match.massError(); }); }, label: "Match Mass Error", decimalPlaces: 4, matchLevel: true},
                {func: function(c) { return c.filteredMatches_pp.map (function (m) { return Math.min (m.pepPos[0].length, m.pepPos[1].length); }); }, label: "Match Smaller Peptide Length", decimalPlaces: 0, matchLevel: true},
                {func: function(c) { return [self.model.getSingleCrosslinkDistance (c)]; }, label: "Cα-Cα Distance (Å)", decimalPlaces: 2},
            ];
            
            var barOptions2 = [
                {func: function() { return this.getRelevantCrossLinkDistances(); }, label: "Cα-Cα Distance (Å)", decimalPlaces: 2}, 
                {func: function() { return this.getRelevantMatchCount(); }, label: "Cross-Link Match Count", decimalPlaces: 0},
            ];
            
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.precalcedDistributions = {};
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var template = _.template ("<DIV class='toolbar'></DIV><DIV class='panelInner distoDiv' flex-grow='1'></DIV>");
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
            
            var toolbar = mainDivSel.select("div.toolbar");
            CLMSUI.utils.makeBackboneButtons (toolbar, self.el.id, buttonData);
            
            // Add a select widget for picking axis data type
            CLMSUI.utils.addMultipleSelectControls ({
                addToElem: toolbar, 
                selectList: ["X"], 
                optionList: barOptions2, 
                selectLabelFunc: function (d) { return d+" Axis Attribute"; }, 
                optionLabelFunc: function (d) { return d.label; }, 
                changeFunc: function () { self.render(); },
            });
            toolbar.selectAll("label").filter(function(d) { return d === "X"; }).style("display", "none");   // temp hiding until full ready

            var chartDiv = mainDivSel.select(".distoDiv")
                .attr ("id", mainDivSel.attr("id")+"c3Chart")
            ;

            // make 'empty' columns for all series and sub-series
            var columnsAsNamesOnly = d3.merge([this.options.seriesNames, this.options.subSeriesNames]).map (function(sname) { return [sname]; });

            var chartID = "#" + chartDiv.attr("id");
            var firstRun = true;
            // Generate the C3 Chart
            this.chart = c3.generate({
                bindto: chartID,
                transition: {
                    duration: 0,
                },
                data: {
                    columns: columnsAsNamesOnly,
                    type: 'bar',
                    //groups: [this.options.subSeriesNames] || this.options.seriesNames,
                    colors: {
                        "Cross-Links": "#44d",
                        Random: "#888",
                        "Decoys (TD-DD)": "#d44",
                    },
                    selection: {
                        enabled: false,
                        grouped: true,
                        multiple: true,
                        draggable: true,
                    },
                    ondragend: function (extent) {
                        console.log ("extent", extent);
                    },
                    onclick: function (d, elem) {
                        self.highlightOrSelect ("selection", this.data(), d);
                    },
                    onmouseover: function (d) {
                        self.highlightOrSelect ("highlights", this.data(), d);
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
                          left: 0,  // 0.5,  // 0.5 used when we moved axis instead of bars to get alignments of bars between ticks
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
                    focus: {
                        show: false,
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
                            var xlabel = self.chart.internal.config.axis_x_label;
                            return (xlabel.text || xlabel) + " " + x;
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
                        return _.unescape (text);
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
                onrendered: function () {
                    if (firstRun) {
                        firstRun = false; 
                        this.api.hide ("Cross-Links", {withLegend: true});    // doesn't work properly if done in configuration above
                        if (! self.model.get("clmsModel").get("decoysPresent")) {   
                            this.api.hide ("Decoys (TD-DD)", {withLegend: true}); // if no decoys, hide the decoy total series
                        }
                    }
                    self.makeBarsSitBetweenTicks (this);
                },
                onmouseout: function () {
                    self.model.setMarkedCrossLinks ("highlights", [], false, false);
                },
            });

            
            function distancesAvailable () {
                console.log ("DISTOGRAM RAND DISTANCES CALCULATED");
                this.options.reRandom = true;
                this.render();
                // hide random choice button if only 1 protein
                var self = this;
                d3.select(this.el).select("#distoPanelintraRandom")
                    .style ("display", self.model.get("clmsModel").realProteinCount > 1 ? null : "none")
                ;
            }

            this.listenTo (this.model, "filteringDone", this.render);   // listen for custom filteringDone event from model
            this.listenTo (this.model, "currentColourModelChanged", function() { this.render ({noAxesRescale: true, recolourOnly: true}); }); // have details (range, domain, colour) of current colour model changed?
            this.listenTo (this.model, "change:linkColourAssignment", function() { this.render ({newColourModel: true}); });    // listen for colour model getting swapped in and out
            this.listenTo (this.model.get("clmsModel"), "change:distancesObj", distancesAvailable); // new distanceObj for new pdb
            this.listenTo (CLMSUI.vent, "distancesAdjusted", distancesAvailable);   // changes to distancesObj with existing pdb (usually alignment change)
            
            if (this.model.get("clmsModel").get("distancesObj")) {
                distancesAvailable();
            }
            
            return this;
        },

        render: function (options) {
            
            options = options || {};
            
            if (this.isVisible()) {
                // Update X Label if necessary
                var funcMeta = this.getSelectedOption ("X");
                var curXLabel = this.chart.internal.config.axis_x_label;
                var newX = curXLabel !== funcMeta.label;
                if (newX) {
                    this.chart.axis.labels ({x: funcMeta.label});
                }
                
                console.log ("re rendering distogram");

                var TT = 0, TD = 1, DD = 2;
                var measurements = this.getDataCount();
                //var series = measurements.values;
                var series = measurements.linksWithValues;
                var seriesLengths = _.pluck (series, "length");
                
                // Get colour model. If chosen colour model is non-categorical, default to distance colours.
                var colModel = this.model.get("linkColourAssignment");
                if (colModel.type === "linear") {
                    colModel = CLMSUI.linkColour.distanceColoursBB;
                }
                this.colourScaleModel = colModel;
                this.options.subSeriesNames = colModel.get("labels").range();
                
                // Add sub-series data
                // split TT list into sublists for length
                var splitSeries = d3.range(0, colModel.getDomainCount()).map (function () { return []; });
                
                //console.log ("measurements", measurements);
                measurements.linksWithValues[TT].forEach (function (linkDatum) {
                    var cat = colModel.getDomainIndex (linkDatum[0]);
                    splitSeries[cat].push (linkDatum);
                });
                
                
                splitSeries.forEach (function (subSeries) {
                    series.push (subSeries);
                    seriesLengths.push (subSeries.length);
                });
                //console.log ("series", series, this.colourScaleModel);
               
                // Add DD Decoys as temporary series for aggregation
                var seriesNames = d3.merge ([measurements.seriesNames, this.options.subSeriesNames]);  // copy and merge series and subseries names
                //seriesNames.splice (DD, 0, "Decoys (DD)");
                
                //console.log ("seriesLengths", seriesLengths);
                var removeCatchAllCategory = true;
                var countArrays = this.aggregate (series, seriesLengths, this.precalcedDistributions, removeCatchAllCategory, seriesNames);
                
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
                    var chartOptions = {
                        columns: countArrays,
                        colors: this.getSeriesColours(),
                    };
                    if (options.newColourModel) {
                        chartOptions.unload = true;
                    }
                    this.chart.load (chartOptions);
                    if (this.chart.groups().length === 0 || options.newColourModel) {
                         this.chart.groups ([this.options.subSeriesNames]);
                    }
                    this
                        //.makeBarsSitBetweenTicks()
                        .makeChartTitle(splitSeries)
                    ;
                    this.hideShowSeries ("Random", measurements.seriesNames.indexOf ("Random") >= 0);
                };
                
                 // Jiggery-pokery to stop c3 doing total redraws on every single command (near enough)
                var tempHandle = c3.chart.internal.fn.redraw;
                c3.chart.internal.fn.redraw = function () {};
                var tempTitleHandle = c3.chart.internal.fn.redrawTitle;
                c3.chart.internal.fn.redrawTitle = function () {};
                var chartInternal = this.chart.internal;
                var shortcut = this.compareNewOldData (countArrays) && !newX;
                //console.log ("SHORTCUT", shortcut);

                if (options.noAxesRescale) {    // doing something where we don't need to rescale x/y axes or relabel (resplitting existing data usually)
                    countArrays = countArrays.filter (function (arr) {  // don't need to reload randoms either
                        return arr[0] !== "Random";
                    });
                    redoChart.call (this);
                    c3.chart.internal.fn.redraw = tempHandle;
                    tempHandle.call (chartInternal, {withTrimXDomain: false, withDimension: false, withEventRect: false, withTheseAxes: []});
                    // Quicker way to just update c3 chart legend colours
                    chartInternal.svg.selectAll("."+chartInternal.CLASS.legendItemTile).style("stroke", chartInternal.color);
                    c3.chart.internal.fn.redrawTitle = tempTitleHandle;
                } else if (shortcut) {  // doing something where we don't need to rescale x axes (filtering existing data usually)
                    this.resetMaxY();
                    redoChart.call (this);
                    c3.chart.internal.fn.redraw = tempHandle;
                    tempHandle.call (chartInternal, {withTrimXDomain: false, withDimension: false, withEventRect: false, withTheseAxes: ["axisY"]});
                    c3.chart.internal.fn.redrawTitle = tempTitleHandle;
                } else {    // normal
                    this.resetMaxY();
                    c3.chart.internal.fn.redrawTitle = tempTitleHandle;
                    redoChart.call (this);
                    c3.chart.internal.fn.redraw = tempHandle;
                    tempHandle.call (chartInternal, {withLegend: true, withUpdateOrgXDomain: true, withUpdateXDomain: true});
                }
                            
                //console.log ("data", distArr, binnedData);
            }

            return this;
        },
        
        // only reset maxY (i.e. the chart scale) if necessary as it causes redundant repaint (given we load and repaint straight after)
        // so only reset scale if maxY is bigger than current chart value or maxY is less than half of current chart value
        resetMaxY: function (maxY) {
            var curMaxY = this.chart.axis.max().y;
            if (curMaxY === undefined || curMaxY < maxY || curMaxY / maxY >= 2) {   
                console.log ("resetting axis max from", curMaxY, "to", maxY);
                this.chart.axis.max({y: maxY});
            }
            return this;
        },
            
        // Show hide series depending on whether data is present for it (active) and whether it's currently shown or not
        hideShowSeries: function (seriesName, active) {
            var hidden = this.chart.internal.hiddenTargetIds;
            var curHidden = hidden.indexOf(seriesName) >= 0;
            if (curHidden === active) {
                var func = active ? "show" : "hide";
                this.chart[func](seriesName, {withLegend: true});
            }
        },
        
        // Hack to move bars right by half a bar width so they sit between correct values rather than over the start of an interval
        makeBarsSitBetweenTicks: function (chartObj) {
            var internal = chartObj || this.chart.internal;
            //console.log ("internal", internal.xAxis, internal.xAxis.g, internal.axes);
            var halfBarW = internal.getBarW (internal.xAxis, 1) / 2 || 0;
            d3.select(this.el).selectAll(".c3-event-rects,.c3-chart-bars").attr("transform", "translate("+halfBarW+",0)");
            return this;
        },
        
        // reset title
        makeChartTitle: function (splitSeries) {
            var commaed = d3.format(",");
            var linkReport = _.pluck (splitSeries, "length");
            var total = d3.sum (linkReport);
            var linkReportStr = linkReport.map (function (count, i) {
                return commaed(count)+" "+this.options.subSeriesNames[i];
            }, this);
            
            var titleText = this.options.chartTitle +": "+commaed(total)+" Cross-Links - "+linkReportStr.join(", ");
            
            d3.select(this.el).select(".c3-title").text (titleText);
            //this.chart.internal.redrawTitle();
            
            return this;
        },
        
        // See if new and old data are of the same series and of the same lengths
        // (we can then shortcut the c3 drawing code somewhat)
        compareNewOldData: function (newData) {
            var oldData = this.chart.data();
            //console.log ("oldData", this.chart, oldData, newData);
            if (oldData.length !== newData.length) {
                return false;
            }
            var oldNewMatch = newData.every (function (newSeries) {
                var oldSeries = this.chart.data.values(newSeries[0]);
                return oldSeries && oldSeries.length === newSeries.length - 1;
            }, this);
            
            //console.log ("match", oldNewMatch);
            return oldNewMatch;
        },
        
        getRelevantCrossLinkDistances: function () {
            var recalcRandomBinning = function (linkCount) {
                var searchArray = CLMS.arrayFromMapValues(this.model.get("clmsModel").get("searches"));
                var residueSets = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray);
                //console.log ("ress", residueSets);
                var randArr = this.model.get("clmsModel").get("distancesObj").getRandomDistances (
                    Math.min ((linkCount * 100) || 10000, 100000), 
                    d3.values (residueSets),
                    {intraOnly: this.options.intraRandomOnly}
                );
                var thresholds = this.getBinThresholds ([[]]);
                var binnedData = d3.layout.histogram()
                    .bins(thresholds)
                    (randArr)
                ;
                console.log ("RANDOM", binnedData, randArr.length);

                return {data: binnedData, origSize: randArr.length};
            };
            
            var links = [
                this.model.getFilteredCrossLinks (), 
                this.model.getFilteredCrossLinks ("decoysTD"), 
                this.model.getFilteredCrossLinks ("decoysDD")
            ];
            
            var distances = [
                this.model.getCrossLinkDistances (links[0], {includeUndefineds: true}),    // TT
                this.model.getCrossLinkDistances (links[1], {calcDecoyProteinDistances: true}),  // TD
                this.model.getCrossLinkDistances (links[2], {calcDecoyProteinDistances: true}),  // DD
            ];
            
            links[0] = links[0].filter (function (link, i) {
                return distances[0][i] !== undefined;    
            });
            distances[0] = distances[0].filter (function (dist) { return dist !== undefined; });

            var joins = links.map (function (linkList, i) {
                return _.zip (linkList, distances[i]);    
            });
            
            if (this.options.reRandom) {
                this.precalcedDistributions["Random"] = recalcRandomBinning.call (this, distances[0].length);
                this.options.reRandom = false;
            }
            distances.push (this.precalcedDistributions["Random"]);
            joins.push (this.precalcedDistributions["Random"]);
            
            return {
                linksWithValues: joins,
                viableFilteredTargetLinks: links[0],
                values: distances,
                seriesNames: ["Cross-Links", "Decoys (TD-DD)", "Decoys (DD)", "Random"],
            };
        },
        
        getRelevantMatchCount: function () {
            var links = [
                this.model.getFilteredCrossLinks (), 
                this.model.getFilteredCrossLinks ("decoysTD"), 
                this.model.getFilteredCrossLinks ("decoysDD")
            ];
            
            var counts = links.map (function (linkArr) {
                return linkArr.map (function (link) {
                    return link.filteredMatches_pp.length;    
                });
            });
            
            var joins = links.map (function (linkList, i) {
                return _.zip (linkList, counts[i]);    
            });

            return {
                linksWithValues: joins,
                viableFilteredTargetLinks: links[0],
                values: counts,
                seriesNames: ["Cross-Links", "Decoys (TD-DD)", "Decoys (DD)"],
            };
        },
        
        getSelectedOption: function (axisLetter) {
            var funcMeta;

            d3.select(this.el)
                .selectAll("select")
                    .filter(function(d) { return d === axisLetter; })
                    .selectAll("option")
                    .filter(function() { return d3.select(this).property("selected"); })
                    .each (function (d) {
                        funcMeta = d;
                    })
            ;

            return funcMeta;
        },
        
        getDataCount: function () {
            var funcMeta = this.getSelectedOption ("X");
            return funcMeta.func.call(this);
            //return this.getRelevantCrossLinkDistances();    
        },
        
        getBinThresholds: function (series) {
            // get extents of all arrays, concatenate them, then get extent of that array
            var extent = d3.extent ([].concat.apply([], series.map (function(item) { return d3.extent(item, function (d) { return d[0]; }); })));
            //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
            var thresholds = d3.range (d3.min ([0, Math.floor(extent[0])]), d3.max ([1 /*Math.ceil(extent[1])*/, this.options.maxX]));
            //console.log ("thresholds", thresholds, extent);
            if (thresholds.length === 0) {
                thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
            }
            return thresholds;
        },
        
        aggregate: function (series, seriesLengths, precalcedDistributions, removeLastEntry, seriesNames) {

            var thresholds = this.getBinThresholds (series);
            //console.log ("precalcs", precalcedDistributions, seriesNames);

            var countArrays = series.map (function (aseries, i) {
                var aseriesName = seriesNames[i];
                var rescaleToSeries = this.options.scaleOthersTo[aseriesName];
                var rescaleLength = 1;
                if (rescaleToSeries) {
                    var rsIndex = seriesNames.indexOf (rescaleToSeries);
                    rescaleLength = rsIndex >= 0 ? seriesLengths[rsIndex] : 1; 
                    //console.log ("rescale", aseriesName, rescaleToSeries, seriesNames, rsIndex, seriesLengths);
                }
                
                var pcd = precalcedDistributions[aseriesName];
                var binnedData = pcd ? pcd.data : 
                    d3.layout
                        .histogram()
                        .value (function (d) { return d[1]; })  // [1] is the actual value, [0] is the crosslink
                        .bins(thresholds)(aseries)
                ;
                var dataLength = pcd ? pcd.origSize : seriesLengths[i];
                if (i === 0) {
                    this.currentBins = binnedData;  // Keep a list of the bins for crosslinks for easy reference when highlighting / selecting
                }
                //console.log (aseriesName, "binnedData", aseries, binnedData, rescaleToSeries, rescaleLength, dataLength);

                var scale = rescaleToSeries ? rescaleLength / (dataLength || rescaleLength) : 1;
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
            this.options.reRandom = true;
            this.render();
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
            //this.makeBarsSitBetweenTicks (this.chart.internal);
            return this;
        },
        
        getSeriesColours: function () {
            var colScale = this.colourScaleModel.get("colScale");
            /*
            var colModel = this.colourScaleModel;
            var colLabels = colModel.get("labels");
            var colDomain = colScale.domain();
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
        
        highlightOrSelect: function (type, c3Data, c3MouseData) {
            var seriesIndex = _.indexOf (_.pluck (c3Data, "id"), c3MouseData.id);  // get the series id associated with the c3 mouse data
            if (seriesIndex === 0) {    // ...and then only run this routine for the first series in the c3 dataset
                var bin = this.currentBins[c3MouseData.index];  // get bin for the c3 index under mouse
                var crossLinks = bin.map (function (linkData) { return linkData[0]; }); // get the link data from that bin
                var ev = d3.event || {};
                this.model.setMarkedCrossLinks (type, crossLinks, false, ev.ctrlKey || ev.shiftKey);    // set marked cross links according to type and modal keys
            }
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
            var seriesIDs = _.pluck (this.chart.data.shown(), "id");
            return seriesIDs.join("-").toUpperCase();    
        },
    });

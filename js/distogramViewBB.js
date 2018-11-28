/*jslint nomen: true, vars: true*/
//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js


var CLMSUI = CLMSUI || {};

CLMSUI.DistogramBB = CLMSUI.utils.BaseFrameView.extend({
    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            "click .randomScope": "reRandom",
        });
    },

    defaultOptions: {
        xlabel: "X Value",
        ylabel: "Count",
        seriesNames: ["Cross-Links", "Decoys (TD-DD)", "Random", "Selected"],
        subSeriesNames: [],
        scaleOthersTo: {
            "Random": "Cross-Links"
        },
        chartTitle: this.identifier,
        maxX: 90,
        attributeOptions: null,
        xStandardTickFormat: d3.format(","),
        randomScope: "All",
        unknownID: "Unknown",
        selectedColour: "#ff0",
    },

    initialize: function(viewOptions) {
        //this.defaultOptions.chartTitle = this.identifier;
        CLMSUI.DistogramBB.__super__.initialize.apply(this, arguments);

        this.attrExtraOptions = {
            "Distance": {
                conditions: [{
                    includeUndefineds: true
                }, {
                    calcDecoyProteinDistances: true
                }, {
                    calcDecoyProteinDistances: true
                }], // TT, TD then DD
                showRandoms: true,
            }
        };

        this.options.attributeOptions = CLMSUI.compositeModelInst.get("clmsModel").attributeOptions;

        this.precalcedDistributions = {
            Random: {
                data: [],
                origSize: 0
            }
        };

        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        mainDivSel.append("div")
            .attr("class", "verticalFlexContainer")
            .html("<DIV class='toolbar'></DIV><DIV class='panelInner distoDiv' flex-grow='1'></DIV>");

        var buttonData = [{
            class: "downloadButton",
            label: CLMSUI.utils.commonLabels.downloadImg + "SVG",
            type: "button",
            id: "download"
        }, ];
        var toolbar = mainDivSel.select("div.toolbar");
        CLMSUI.utils.makeBackboneButtons(toolbar, self.el.id, buttonData);

        // Various view options set up, then put in a dropdown menu
        var toggleButtonData = [{
                label: "All combinations (Between & Self)",
                id: "All",
                d3tooltip: "Calculate random links from within and between all proteins",
                value: "All"
            },
            {
                label: "Within proteins only (Self)",
                id: "Intra",
                d3tooltip: "Only calculate random links from within the same proteins",
                value: "Intra"
            },
            {
                label: "Within chains only (Self in same protein copy)",
                id: "Chain",
                d3tooltip: "Only calculate random links from within the same chain",
                value: "Chain"
            },
        ];
        toggleButtonData
            .forEach(function(d) {
                $.extend(d, {
                    inputFirst: true,
                    class: "randomScope",
                    group: "randomScope",
                    type: "radio"
                });
                if (d.initialState === undefined && d.group && d.value) { // set initial values for radio button groups
                    d.initialState = (d.value === this.options[d.group]);
                }
            }, this);
        CLMSUI.utils.makeBackboneButtons(toolbar, self.el.id, toggleButtonData);

        var optid = this.el.id + "RandomOptions";
        toolbar.append("p").attr("id", optid);
        new CLMSUI.DropDownMenuViewBB({
            el: "#" + optid,
            model: CLMSUI.compositeModelInst.get("clmsModel"),
            myOptions: {
                title: "Random Scope ▼",
                menu: toggleButtonData.map(function(d) {
                    d.id = self.el.id + d.id;
                    d.tooltip = d.d3tooltip;
                    return d;
                }),
                closeOnClick: false,
                titleTooltip: {
                    header: "Random Scope",
                    contents: "Decide scope of random distances."
                },
                tooltipModel: CLMSUI.compositeModelInst.get("tooltipModel"),
            }
        });

        // Add a select widget for picking axis data type
        this.setMultipleSelectControls(toolbar, this.options.attributeOptions, false);

        var chartDiv = mainDivSel.select(".distoDiv")
            .attr("id", mainDivSel.attr("id") + "c3Chart");

        // make 'empty' columns for all series and sub-series
        var columnsAsNamesOnly = d3.merge([this.options.seriesNames, this.options.subSeriesNames]).map(function(sname) {
            return [sname];
        });

        var chartID = "#" + chartDiv.attr("id");
        var firstRun = true;
        // Generate the C3 Chart
        this.chart = c3.generate({
            bindto: chartID,
            transition: {
                duration: 0, // no animations, causes bugs in c3 when actions performed rapidly
            },
            data: {
                columns: columnsAsNamesOnly,
                type: 'bar',
                colors: {
                    "Cross-Links": "#44d",
                    Random: "#444",
                    Selected: "url(#selectedStripe)",
                    "Decoys (TD-DD)": "#d44",
                },
                empty: {
                    label: {
                        text: "Currently No Data For This Attribute"
                    }
                },
                selection: {
                    enabled: false,
                    grouped: true,
                    multiple: true,
                    draggable: true,
                },
                onclick: function(d) {
                    self.highlightOrSelect("selection", this.data(), d);
                },
                onmouseover: function(d) {
                    self.highlightOrSelect("highlights", this.data(), d);
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
                    padding: { // padding of 1 ticks to right of chart to stop bars in last column getting clipped
                        left: 0, // 0.5,  // 0.5 used when we moved axis instead of bars to get alignments of bars between ticks
                        right: 1,
                    },
                    tick: {
                        format: function(v, returnUnformattedToo) {
                            var val = (v + (self.options.minX || 0)) * (self.options.gapX || 1);
                            var formattedVal = self.options.xCurrentTickFormat(val);
                            return returnUnformattedToo ? {
                                val: val,
                                formattedVal: formattedVal
                            } : formattedVal;
                        },
                    }
                },
                y: {
                    label: this.options.ylabel,
                    tick: { // blank non-whole numbers on y axis with this d3 format function
                        // except this does the same for tooltips, so non-whole numbers dont get shown in tooltips unless tooltip.value overridden below
                        format: d3.format(",d")
                    }
                }
            },
            grid: {
                lines: {
                    front: false, // stops overlong and short gridlines obscuring actual data
                },
                focus: {
                    show: false,
                },
            },
            padding: {
                left: 56, // need this fixed amount if y labels change magnitude i.e. single figures only to double figures causes a horizontal jump
                right: 20,
                top: 6
            },
            tooltip: {
                format: {
                    title: function(x) {
                        var tickFunc = self.chart.internal.config.axis_x_tick_format;
                        var realX = tickFunc(x, true);
                        var nextX = tickFunc(x + 1, true);
                        var realXVal = realX.val;
                        var nextXVal = nextX.val;
                        var funcMeta = self.getSelectedOption("X");
                        var invPow = Math.pow(10, -(funcMeta.decimalPlaces || 0));
                        var barIsRange = (nextXVal - realXVal) > invPow;
                        var endOfRange = invPow === 1 ? self.options.xCurrentTickFormat(nextXVal - invPow) : "<" + self.options.xCurrentTickFormat(nextXVal);
                        var xlabel = self.chart.internal.config.axis_x_label;
                        return (xlabel.text || xlabel) + " " + realX.formattedVal + (barIsRange ? " to " + endOfRange : "");
                    },
                    name: function(name) {
                        return name + " " + self.options.ylabel;
                    },
                    value: function(count, ratio, id) {
                        var c = "";
                        if (count !== undefined) {
                            c = count.toFixed(id === "Random" ? 1 : 0);
                            if (id !== "Random") {
                                c += "<span style='visibility:hidden; margin: 0'>.0</span>";
                            }
                        }
                        return c;
                    },
                },
                contents: function(d, defaultTitleFormat, defaultValueFormat, color) {
                    var text = this.getTooltipContent(d, defaultTitleFormat, defaultValueFormat, color);
                    return _.unescape(text);
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
            onrendered: function() {
                if (firstRun) {
                    firstRun = false;
                    this.api.hide("Cross-Links", {
                        withLegend: true
                    }); // doesn't work properly if done in configuration above
                    if (!self.model.get("clmsModel").get("decoysPresent")) {
                        this.api.hide("Decoys (TD-DD)", {
                            withLegend: true
                        }); // if no decoys, hide the decoy total series
                    }
                }
                self.makeBarsSitBetweenTicks(this);
            },
            onmouseout: function() {
                self.model.setMarkedCrossLinks("highlights", [], false, false);
            },
        });

        // make pattern fill for selected bars
        var pattern = d3.select(chartID).select("defs")
            .append("pattern")
            .attr("id", "selectedStripe")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", "10")
            .attr("height", "10")
            .attr("patternTransform", "rotate(45)");
        pattern.append("rect").attr("x", "0").attr("y", "0").attr("width", "10").attr("height", "10").style("fill", this.options.selectedColour)
        pattern.append("line").attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "10");
        pattern.append("line").attr("x1", "5").attr("y1", "0").attr("x2", "5").attr("y2", "10");

        function distancesAvailable() {
            console.log("DISTOGRAM RAND DISTANCES CALCULATED");
            this.options.reRandom = true;
            this.render();
            // hide random choice button if only 1 protein
            this.showRandomButton();
        }

        this.listenTo(this.model, "filteringDone", this.render); // listen for custom filteringDone event from model
        this.listenTo(this.model, "currentColourModelChanged", function() {
            this.render({
                noAxesRescale: true,
                recolourOnly: true
            });
        }); // have details (range, domain, colour) of current colour model changed?
        this.listenTo(this.model, "change:linkColourAssignment", function() {
            this.render({
                newColourModel: true
            });
        }); // listen for colour model getting swapped in and out
        this.listenTo(this.model, "selectionMatchesLinksChanged", function() {
            this.render({
                noAxesRescale: true
            });
        }); // update selection series
        this.listenTo(this.model.get("clmsModel"), "change:distancesObj", distancesAvailable); // new distanceObj for new pdb
        this.listenTo(CLMSUI.vent, "distancesAdjusted PDBPermittedChainSetsUpdated", distancesAvailable); // changes to distancesObj with existing pdb (usually alignment change) or change in pdb assembly meaning certain chains can't be used
        this.listenTo(CLMSUI.vent, "linkMetadataUpdated", function(metaMetaData) {
            var columns = metaMetaData.columns;
            //console.log ("HELLO", arguments);
            var newOptions = columns.map(function(column) {
                return {
                    id: column,
                    label: column,
                    decimalPlaces: 2,
                    matchLevel: false,
                    linkFunc: function(c) {
                        return c.getMeta() ? [c.getMeta(column)] : [];
                    },
                    unfilteredLinkFunc: function(c) {
                        return c.getMeta() ? [c.getMeta(column)] : [];
                    },
                };
            });

            self.setMultipleSelectControls(mainDivSel.select("div.toolbar"), newOptions, true);
        });

        if (this.model.get("clmsModel").get("distancesObj")) {
            distancesAvailable();
        }

        return this;
    },

    setMultipleSelectControls: function(elem, options, keepOld) {
        var self = this;
        CLMSUI.utils.addMultipleSelectControls({
            addToElem: elem,
            selectList: ["X"],
            optionList: options,
            keepOldOptions: keepOld || false,
            selectLabelFunc: function(d) {
                return "Plot This Data On The " + d + " Axis ►";
            },
            optionLabelFunc: function(d) {
                return d.label;
            },
            optionValueFunc: function(d) {
                return d.id;
            },
            changeFunc: function() {
                self.render();
            },
            idFunc: function(d) {
                return d.id;
            },
        });
    },

    render: function(options) {

        options = options || {};

        if (this.isVisible()) {
            // Update X Label if necessary
            var funcMeta = this.getSelectedOption("X");
            var curXLabel = this.chart.internal.config.axis_x_label;
            var newX = (curXLabel !== funcMeta.label);
            if (newX) { // if a new attribute set on the x axis, change the x axis label and tick format if necessary
                this.options.xCurrentTickFormat = funcMeta.valueFormat || this.options.xStandardTickFormat;
                this.chart.axis.labels({
                    x: funcMeta.label
                });
            }
            this.showRandomButton();

            var TT = 0,
                TD = 1,
                DD = 2;
            var seriesData = this.getDataCount(); // get series data, split into colour scheme sub-categories later

            // Get colour model. If chosen colour model is non-categorical, default to distance colours.
            var colModel = this.model.get("linkColourAssignment");
            if (!colModel.isCategorical()) {
                colModel = CLMSUI.linkColour.defaultColoursBB; // make default colour choice for histogram if current colour model is continuous
            }
            this.colourScaleModel = colModel;

            // Add sub-series data
            // split TT list into sublists for length
            var splitSeries = colModel.get("labels").range().concat([this.options.unknownID]).map(function(name) {
                return {
                    name: name,
                    linkValues: []
                };
            });

            //console.log ("measurements", measurements);
            seriesData[TT].linkValues.forEach(function(linkDatum) {
                var cat = colModel.getDomainIndex(linkDatum[0]);
                if (cat === undefined) {
                    cat = splitSeries.length - 1;
                }
                splitSeries[cat].linkValues.push(linkDatum);
            });

            // add sub-series data to main series array
            splitSeries.forEach(function(subSeries) {
                subSeries.isSubSeries = true;
                seriesData.push(subSeries);
            });

            //console.log ("seriesLengths", seriesLengths);
            var removeCatchAllCategory = (this.options.maxX !== undefined);
            var countArrays = this.aggregate(seriesData, this.precalcedDistributions, removeCatchAllCategory);


            function removeSeries(seriesID, onlyIfEmpty) {
                var seriesIndex = _.findIndex(seriesData, function(series) {
                    return series.name === seriesID;
                });
                if (seriesIndex >= 0) {
                    var hide = !onlyIfEmpty || seriesData[seriesIndex].linkValues.length === 0;
                    if (hide) {
                        seriesData.splice(seriesIndex, 1);
                        countArrays.splice(seriesIndex, 1);
                    }
                }
            }

            // Adjust the TD count by subtracting the matching DD count, to get TD-DD, then discard the DD series
            countArrays[TD].forEach(function(v, i) {
                countArrays[TD][i] = Math.max(v - countArrays[DD][i], 0); // subtract DD from TD counts
            });
            removeSeries("Decoys (DD)", false); // remove DD, its purpose is done

            //var maxY = d3.max(countArrays[0]);  // max calced on real data only
            // if max y needs to be calculated across all series
            var maxY = d3.max(countArrays, function(array) {
                return d3.max(removeCatchAllCategory ? array : array.slice(0, -1)); // ignore last element in array if not already removed as it's dumping ground for everything over last value
            });
            maxY = Math.max(maxY, 1);
            //console.log ("maxY", maxY);

            // add names to front of arrays as c3 demands (need to wait until after we calc max otherwise the string gets returned as max)
            countArrays.forEach(function(countArray, i) {
                countArray.unshift(seriesData[i].name);
            }, this);
            //console.log ("thresholds", thresholds);
            //console.log ("countArrays", countArrays);

            if (this.isEmpty(seriesData)) {
                countArrays = [
                    []
                ];
            }

            var redoChart = function() {
                // Remove 'Unknown' category if empty
                removeSeries.call(this, this.options.unknownID, true);
                removeSeries.call(this, "Selected", true);

                var currentlyLoaded = _.pluck(this.chart.data(), "id");
                var toBeLoaded = countArrays.map(function(arr) {
                    return arr[0];
                });
                var unload = _.difference(currentlyLoaded, toBeLoaded);
                var newloads = _.difference(toBeLoaded, currentlyLoaded);
                console.log("series", currentlyLoaded, toBeLoaded, unload, newloads);

                this.options.subSeriesNames = seriesData
                    .filter(function(d) {
                        return d.isSubSeries;
                    })
                    .map(function(d) {
                        return d.name;
                    });

                var subSeriesLengths = seriesData
                    .filter(function(d) {
                        return d.isSubSeries;
                    })
                    .map(function(d) {
                        return d.linkValues.length;
                    });

                var chartOptions = {
                    columns: countArrays,
                    colors: this.getSeriesColours(this.options.subSeriesNames),
                };
                if (unload.length) {
                    chartOptions.unload = unload;
                }

                this.chart.load(chartOptions);
                if (this.chart.groups().length === 0 || options.newColourModel) {
                    this.chart.groups([this.options.subSeriesNames]);
                }

                this
                    .makeChartTitle(subSeriesLengths, colModel, d3.select(this.el).select(".c3-title"), this.getSelectedOption("X").matchLevel);

                return {
                    unload: unload,
                    newloads: newloads
                };
            };

            // Jiggery-pokery to stop c3 doing total redraws on every single command (near enough)
            var tempHandle = c3.chart.internal.fn.redraw;
            c3.chart.internal.fn.redraw = function() {};
            var tempTitleHandle = c3.chart.internal.fn.redrawTitle;
            c3.chart.internal.fn.redrawTitle = function() {};
            var chartInternal = this.chart.internal;
            var shortcut = this.compareNewOldData(countArrays) && !newX;
            //console.log ("SHORTCUT", shortcut, this.chart);

            if (options.noAxesRescale) { // doing something where we don't need to rescale x/y axes or relabel (resplitting existing data usually)
                var seriesChanges = redoChart.call(this);
                c3.chart.internal.fn.redraw = tempHandle;
                tempHandle.call(chartInternal, {
                    withTrimXDomain: false,
                    withDimension: false,
                    withEventRect: false,
                    withTheseAxes: [],
                    withLegend: seriesChanges.newloads.length ? true : false
                });
                // Quicker way to just update c3 chart legend colours
                chartInternal.svg.selectAll("." + chartInternal.CLASS.legendItemTile).style("stroke", chartInternal.color);
                c3.chart.internal.fn.redrawTitle = tempTitleHandle;
            } else if (shortcut) { // doing something where we don't need to rescale x axes (filtering existing data usually)
                this.resetMaxY();
                redoChart.call(this);
                c3.chart.internal.fn.redraw = tempHandle;
                tempHandle.call(chartInternal, {
                    withTrimXDomain: false,
                    withDimension: false,
                    withEventRect: false,
                    withTheseAxes: ["axisY"]
                });
                c3.chart.internal.fn.redrawTitle = tempTitleHandle;
            } else { // normal
                this.resetMaxY();
                c3.chart.internal.fn.redrawTitle = tempTitleHandle;
                redoChart.call(this);
                c3.chart.internal.fn.redraw = tempHandle;
                tempHandle.call(chartInternal, {
                    withLegend: true,
                    withUpdateOrgXDomain: true,
                    withUpdateXDomain: true
                });
                CLMSUI.utils.declutterAxis(d3.select(this.el).select(".c3-axis-x"));
            }

            //console.log ("data", distArr, binnedData);
        }

        return this;
    },

    // only reset maxY (i.e. the chart scale) if necessary as it causes redundant repaint (given we load and repaint straight after)
    // so only reset scale if maxY is bigger than current chart value or maxY is less than half of current chart value
    resetMaxY: function(maxY) {
        //maxY = maxY || 1;
        var curMaxY = this.chart.axis.max().y;
        console.log("curMaxY", curMaxY, "my", maxY);
        if (curMaxY === undefined || curMaxY < maxY || curMaxY / maxY >= 2) {
            console.log("resetting axis max from", curMaxY, "to", maxY);
            this.chart.axis.max({
                y: maxY
            });
        }
        return this;
    },

    // Hack to move bars right by half a bar width so they sit between correct values rather than over the start of an interval
    makeBarsSitBetweenTicks: function(chartObj) {
        var internal = chartObj || this.chart.internal;
        //console.log ("internal", internal.xAxis, internal.xAxis.g, internal.axes);
        var halfBarW = internal.getBarW(internal.xAxis, 1) / 2 || 0;
        d3.select(this.el).selectAll(".c3-event-rects,.c3-chart-bars").attr("transform", "translate(" + halfBarW + ",0)");
        return this;
    },

    // See if new and old data are of the same series and of the same lengths
    // (we can then shortcut the c3 drawing code somewhat)
    compareNewOldData: function(newData) {
        var oldData = this.chart.data();
        //console.log ("oldData", this.chart, oldData, newData);
        if (oldData.length !== newData.length) {
            return false;
        }
        var oldNewMatch = newData.every(function(newSeries) {
            var oldSeries = this.chart.data.values(newSeries[0]);
            return oldSeries && oldSeries.length === newSeries.length - 1;
        }, this);

        //console.log ("match", oldNewMatch);
        return oldNewMatch;
    },

    getFilteredLinksByDecoyStatus: function() {
        return {
            links: [
                this.model.getFilteredCrossLinks(),
                this.model.getFilteredCrossLinks("decoysTD"),
                this.model.getFilteredCrossLinks("decoysDD"),
                this.model.getMarkedCrossLinks("selection"),
            ],
            seriesNames: ["Cross-Links", "Decoys (TD-DD)", "Decoys (DD)", "Selected"]
        };
    },

    recalcRandomBinning: function(linkCount) {
        var searchArray = CLMS.arrayFromMapValues(this.model.get("clmsModel").get("searches"));
        var crosslinkerSpecificityMap = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray);
        var distObj = this.model.get("clmsModel").get("distancesObj");
        var rscope = this.options.randomScope;
        var randArr = distObj ? distObj.getSampleDistances(
                d3.median([10000, linkCount * 100, 100000]),
                d3.values(crosslinkerSpecificityMap), {
                    withinProtein: rscope === "Intra" || rscope === "Chain",
                    withinChain: rscope === "Chain"
                }
            ) :
            [];
        var thresholds = this.getBinThresholds([
            []
        ]);
        var binnedData = d3.layout.histogram()
            .bins(thresholds)
            (randArr);
        console.log("RANDOM", binnedData, randArr.length);

        return {
            data: binnedData,
            origSize: randArr.length
        };
    },

    getRelevantAttributeData: function(attrMetaData) {
        var linkFunc = attrMetaData.linkFunc;
        var linkData = this.getFilteredLinksByDecoyStatus();
        var seriesNames = linkData.seriesNames;
        var links = linkData.links;
        //console.log ("links", links);

        var extras = this.attrExtraOptions[attrMetaData.id] || {
            conditions: []
        };
        var conditions = extras.conditions;

        var joinedCounts = links.map(function(linkArr, i) {
            var condition = conditions[i];
            var vals = [];
            linkArr.forEach(function(link) {
                var res = linkFunc.call(this, link, condition);
                if (res != undefined) {
                    if (attrMetaData.matchLevel) { // if multiple values returned for a link (is match data)
                        var filteredMatches = link.filteredMatches_pp;
                        res.forEach(function(matchValue, i) {
                            vals.push([link, matchValue, filteredMatches[i]]);
                        });
                    } else if (res[0]) {
                        vals.push([link, res[0]]);
                    }
                }
            }, this);
            return vals;
        }, this);

        // Add Random series if plotting distance data
        if (extras.showRandoms) {
            if (this.options.reRandom) {
                this.precalcedDistributions["Random"] = this.recalcRandomBinning.call(this, joinedCounts[0].length);
                this.options.reRandom = false;
            }
            joinedCounts.push(this.getPrecalcedDistribution("Random"));
            seriesNames.push("Random");
        }

        return d3.zip(joinedCounts, seriesNames).map(function(pair) {
            return {
                linkValues: pair[0],
                name: pair[1]
            }
        });
    },

    getSelectedOption: function(axisLetter) {
        var funcMeta;

        d3.select(this.el)
            .selectAll("select")
            .filter(function(d) {
                return d === axisLetter;
            })
            .selectAll("option")
            .filter(function() {
                return d3.select(this).property("selected");
            })
            .each(function(d) {
                funcMeta = d;
            });

        return funcMeta;
    },

    getDataCount: function() {
        var funcMeta = this.getSelectedOption("X");
        this.options.maxX = funcMeta.maxVal;
        return this.getRelevantAttributeData.call(this, funcMeta);
    },

    isEmpty: function(series) {
        return series.every(function(aSeries) {
            return !aSeries.linkValues.length;
        });
    },

    getBinThresholds: function(seriesData, accessor) {
        accessor = accessor || function(d) {
            return d;
        }; // return object/variable/number as is as standard accessor
        // get extents of all arrays, concatenate them, then get extent of that array
        var extent = d3.extent([].concat.apply([], seriesData.map(function(singleSeries) {
            return singleSeries.linkValues ? d3.extent(singleSeries.linkValues, accessor) : [0, 1];
        })));
        var min = d3.min([0, Math.floor(extent[0])]);
        var max = d3.max([1, this.options.maxX || Math.ceil(extent[1])]);
        var step = Math.max(1, CLMSUI.utils.niceRound((max - min) / 100));
        var thresholds = d3.range(min, max + (step * 2), step);
        //console.log ("thresholds", thresholds, extent, min, max, step, this.options.maxX, series);

        if (thresholds.length === 0) {
            thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
        }
        return thresholds;
    },

    getPrecalcedDistribution: function(seriesName) {
        return this.precalcedDistributions[seriesName];
    },

    aggregate: function(seriesData, precalcedDistributions, removeLastEntry) {

        var thresholds = this.getBinThresholds(seriesData, function(d) {
            return d[1];
        });
        //console.log ("precalcs", precalcedDistributions, seriesNames);
        this.currentBins = [];

        var countArrays = seriesData.map(function(series, i) {
            var aseries = series.linkValues;
            var seriesName = series.name;
            var rescaleToSeries = this.options.scaleOthersTo[seriesName];
            var rescaleLength = 1;
            if (rescaleToSeries) {
                var rsIndex = _.findIndex(seriesData, function(s) {
                    return s.name === rescaleToSeries;
                });
                rescaleLength = rsIndex >= 0 ? seriesData[rsIndex].linkValues.length : 1;
                //console.log ("rescale", aseriesName, rescaleToSeries, seriesNames, rsIndex, seriesLengths);
            }

            var pcd = this.getPrecalcedDistribution(seriesName);
            var binnedData = pcd ? pcd.data :
                d3.layout
                .histogram()
                .value(function(d) {
                    return d[1];
                }) // [1] is the actual value, [0] is the crosslink
                .bins(thresholds)(aseries || []);
            var dataLength = pcd ? pcd.origSize : aseries.length;
            this.currentBins[i] = {
                bin: binnedData,
                id: seriesName
            }; // Keep a list of the bins for crosslinks for easy reference when highlighting / selecting
            //console.log ("CURRENT BINS", this.currentBins, i, aseries);
            //console.log (aseriesName, "binnedData", aseries, binnedData, rescaleToSeries, rescaleLength, dataLength);

            var scale = rescaleToSeries ? rescaleLength / (dataLength || rescaleLength) : 1;
            return binnedData.map(function(nestedArr) {
                return nestedArr.y * scale;
            });
        }, this);

        if (removeLastEntry) { // optionally remove the dumping ground entries for values bigger than max cutoff
            countArrays.forEach(function(array) {
                array.pop();
            });
        }

        this.options.minX = thresholds[0];
        this.options.gapX = thresholds[1] - thresholds[0];

        return countArrays;
    },

    reRandom: function(evt) {
        this.options.randomScope = evt.target.value;
        this.options.reRandom = true;
        this.render();
    },

    showRandomButton: function() {
        var self = this;
        var funcMeta = this.getSelectedOption("X");
        var extras = this.attrExtraOptions[funcMeta.id] || {};
        d3.select(this.el).select("#distoPanelRandomOptions")
            .style("display", /*self.model.get("clmsModel").targetProteinCount > 1 && */ extras.showRandoms ? null : "none");
    },

    relayout: function() {
        // fix c3 setting max-height to current height so it never gets bigger y-wise
        // See https://github.com/masayuki0812/c3/issues/1450
        d3.select(this.el).select(".c3")
            .style("max-height", "none")
            .style("position", null);
        //this.redrawColourRanges();
        this.chart.resize();
        CLMSUI.utils.declutterAxis(d3.select(this.el).select(".c3-axis-x"));
        //this.makeBarsSitBetweenTicks (this.chart.internal);
        return this;
    },

    getSeriesColours: function(seriesNames) {
        var colModel = this.colourScaleModel;
        var colScale = colModel.get("colScale");

        /*
        var colLabels = colModel.get("labels");
        var colDomain = colScale.domain();
        this.chart.xgrids([{value: colDomain[0], text: colLabels.range()[0]+' ↑'}, {value: colDomain[1], text: colLabels.range()[2]+' ↓', class:"overLengthGridRule"}]);
        */

        var colRange = colScale.range();
        var colMap = {};
        seriesNames.forEach(function(seriesName, i) {
            colMap[seriesName] = colRange[i];
        });
        colMap[this.options.unknownID] = colModel.undefinedColour;
        return colMap;
    },

    highlightOrSelect: function(type, c3Data, c3MouseData) {
        var seriesIndex = _.indexOf(_.pluck(c3Data, "id"), c3MouseData.id); // get the series id associated with the c3 mouse data
        var matchBasedSelection = this.getSelectedOption("X").matchLevel;
        var hidden = this.chart.internal.hiddenTargetIds;
        //console.log ("this currentBins", this.currentBins, this.options.subSeriesNames);
        if (seriesIndex === 0) { // ...and then only run this routine for the first series in the c3 dataset (could be any, important thing is just do it once)
            var bins = this.currentBins
                .filter(function(seriesBin) {
                    var seriesID = seriesBin.id;
                    var subSeries = this.options.subSeriesNames.indexOf(seriesID) >= 0;
                    var curHidden = hidden.indexOf(seriesID) >= 0;
                    return subSeries && !curHidden;
                }, this)
                .map(function(seriesBin) {
                    return seriesBin.bin[c3MouseData.index];
                });
            var bin = d3.merge(bins);
            //console.log ("bins", bins, bin);

            var ev = d3.event || {};
            if (matchBasedSelection) {
                var matches = bin.map(function(linkData) {
                    return linkData[2];
                }); // get the link data from that bin
                this.model.setMarkedMatches(type, matches, false, ev.ctrlKey || ev.shiftKey); // set marked cross links according to type and modal keys
            } else {
                var crossLinks = bin.map(function(linkData) {
                    return linkData[0];
                }); // get the link data from that bin
                this.model.setMarkedCrossLinks(type, crossLinks, false, ev.ctrlKey || ev.shiftKey); // set marked cross links according to type and modal keys
            }
        }
    },

    // removes view
    // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
    remove: function() {
        CLMSUI.DistogramBB.__super__.remove.apply(this, arguments);
        // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
        this.chart = this.chart.destroy();
    },

    identifier: "Histogram View",

    optionsToString: function() {
        var seriesIDs = _.pluck(this.chart.data.shown(), "id");
        var funcMeta = this.getSelectedOption("X");
        return funcMeta.label + "-" + seriesIDs.join("-").toUpperCase();
    },
});
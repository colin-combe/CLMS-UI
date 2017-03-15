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
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            CLMSUI.DistogramBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
                xlabel: "Cα-Cα Distance (Å)",
                ylabel: "Count",
                seriesNames: ["Cross Links", "Decoys (TD-DD)", "Random"],
                scaleOthersTo: {"Random": "Cross Links"},
                chartTitle: "Distogram",
                maxX: 90
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);
            this.colourScaleModel = viewOptions.colourScaleModel;

            this.precalcedDistributions = {};
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            mainDivSel.append("div").style("height", "40px")
                .append("button")
                .attr("class", "btn btn-1 btn-1a downloadButton")
                .text(CLMSUI.utils.commonLabels.downloadImg+"SVG");

            var chartDiv = mainDivSel.append("div")
                .attr("class", "panelInner distoDiv")
                .attr ("id", mainDivSel.attr("id")+"c3Chart")
            ;

            // Generate the C3 Chart
            var bid = "#" + chartDiv.attr("id");
            var columnsAsNamesOnly = this.options.seriesNames.map (function(sname) { return [sname]; });

            this.chart = c3.generate({
                bindto: bid,
                data: {
                    columns: columnsAsNamesOnly,
                    type: 'bar',
                    colors: {
                        Random: "#888",
                        "Decoys (TD-DD)": "#d44",
                    },
                    color: function (colour, d) {
                        var rm = self.colourScaleModel;
                        if (rm && d.id && d.id === "Cross Links") {
                            return rm.get("colScale")(d.x);
                        }
                        else if (rm && !d.id && d === "Cross Links") {
                            return rm.get("colScale").range()[2];
                        }
                        return colour;
                    },
                    selection: {
                        enabled: true,
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
                        padding: {
                          left: 0,
                          right: 0,
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
                        }
                    },           
                },
                title: {
                    text: this.options.chartTitle
                }
            });
            
            function distancesAvailable () {
                console.log ("DISTOGRAM RAND DISTANCES CALCULATED");
                this.recalcRandomBinning();
                this.render();
            }

            this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
            this.listenTo (this.colourScaleModel, "colourModelChanged", this.relayout); // replacement for listening to rangeModel
            this.listenTo (this.model.get("clmsModel"), "change:distancesObj", distancesAvailable); // new distanceObj for new pdb
            this.listenTo (CLMSUI.vent, "distancesAdjusted", distancesAvailable);   // changes to distancesObj with existing pdb (usually alignment change)
            
            if (this.model.get("clmsModel").get("distancesObj")) {
                distancesAvailable();
            }
            
            return this;
        },

        render: function () {
            
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                console.log ("re rendering distogram");

                var TT = 0, TD = 1, DD = 2;
                var series = this.getRelevantCrossLinkDistances();
                var seriesLengths = series.map (function(d) { return d.length; });
                //console.log ("series", series);

                // Add data and placeholders for random data
                series.push ([]);
                seriesLengths.push (this.randArrLength);  // we want to scale random distribution to unfiltered crosslink dataset size
                
                // Add DD Decoys as temporary series for aggregation
                var seriesNames = this.options.seriesNames.slice();  // copy series names
                seriesNames.splice (DD, 0, "Decoys (DD)");
                
                //console.log ("seriesLengths", seriesLengths);
                var removeCatchAllCategory = true;
                var countArrays = this.aggregate (series, seriesLengths, this.precalcedDistributions, removeCatchAllCategory, seriesNames);
                
                //console.log ("ca", countArrays, countArrays[DD]);
                // Adjust the TD count by subtracting the matching DD count, to get TD-DD, then discard the DD series
                countArrays[TD].forEach (function (v, i) {
                    countArrays[TD][i] = Math.max (v - countArrays[DD][i], 0);  // subtract DD from TD counts  
                });
                countArrays.splice (DD,1);   // remove DD
                //console.log ("ca2", countArrays);

                //var maxY = d3.max(countArrays[0]);  // max calced on real data only
                // if max y needs to be calculated across all series
                var maxY = d3.max(countArrays, function(array) {
                    return d3.max(removeCatchAllCategory ? array : array.slice (0, -1));  // ignore last element in array as it's dumping ground for everything over last value 
                });
                //console.log ("maxY", maxY);
                
                // add names to front of arrays as c3 demands (need to wait until after we calc max otherwise the string gets returned as max)
                countArrays.forEach (function (countArray,i) { countArray.unshift (this.options.seriesNames[i]); }, this);
                
                //console.log ("thresholds", thresholds);
                var curMaxY = this.chart.axis.max().y;
                // only reset maxY (i.e. the chart scale) if necessary as it causes redundant repaint (given we load and repaint straight after)
                // so only reset scale if maxY is bigger than current chart value or maxY is less than half of current chart value
                if (curMaxY === undefined || curMaxY < maxY || curMaxY / maxY >= 2) {   
                    console.log ("resetting axis max from", curMaxY, "to", maxY);
                    this.chart.axis.max({y: maxY});
                }

                this.chart.load({
                    columns: countArrays
                });
                
                // Hack to move bars right by half a bar width so they sit between correct values rather than over the start of an interval
                var internal = this.chart.internal;
                var halfBarW = internal.getBarW (internal.xAxis, 1) / 2;
                d3.select(this.el).selectAll(".c3-chart-bars").attr("transform", "translate("+halfBarW+",0)");

                //console.log ("data", distArr, binnedData);
            }

            return this;
        },
        
        getRelevantCrossLinkDistances: function () {
            var crossLinkMap = this.model.get("clmsModel").get("crossLinks");  // do values() after filtering in next line
            var filteredCrossLinks = this.model.getFilteredCrossLinks (crossLinkMap);   
            function decoyClass (link) {
                return (link.fromProtein.is_decoy ? 1 : 0) + (link.toProtein.is_decoy ? 1 : 0);
            }
            var links = [[],[],[]];
            filteredCrossLinks.forEach (function (xlink) {
                links [decoyClass (xlink)].push (xlink);
            });
            //console.log ("links", links);
            
            return [
                this.model.getCrossLinkDistances2 (links[0]/*filteredCrossLinks*//*.values()*/),    // TT
                this.model.getCrossLinkDistances2 (links[1], {includeUndefineds: false, calcDecoyProteinDistances: true}),  // TD
                this.model.getCrossLinkDistances2 (links[2], {includeUndefineds: false, calcDecoyProteinDistances: true}),  // DD
            ];
        },
        
        aggregate: function (series, seriesLengths, precalcedDistributions, removeLastEntry, seriesNames) {
            // get extents of all arrays, concatenate them, then get extent of that array
            var extent = d3.extent ([].concat.apply([], series.map (function(d) { return d3.extent(d); })));
            //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
            var thresholds = d3.range (Math.min (0, Math.floor(extent[0])), Math.max (1 /*Math.ceil(extent[1])*/, this.options.maxX));
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
                }
                
                var binnedData = precalcedDistributions[aseriesName]
                    ? precalcedDistributions[aseriesName]
                    : d3.layout.histogram().bins(thresholds)(aseries)
                ;
                //console.log (aseriesName, "binnedData", binnedData);

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
        

        recalcRandomBinning: function () {
            // need to calc getRelevant as we want random to be proportionate to count of filtered links that have 3d distances
            var distArr = this.getRelevantCrossLinkDistances();
            //var randArr = this.model.get("clmsModel").get("distancesObj").getFlattenedDistances();
            var linkCount = distArr[0].length; // d3.sum (distArr, function(d) { return d.length; });   // random count prop to real links, not decoys as well
            var randArr = this.model.get("clmsModel").get("distancesObj").getRandomDistances (Math.min ((linkCount * 100) || 10000, 100000));
            var thresholds = d3.range(0, this.options.maxX);
            var binnedData = d3.layout.histogram()
                .bins(thresholds)
                (randArr)
            ;
            this.randArrLength = randArr.length;
            this.precalcedDistributions = this.precalcedDistributions || {};
            this.precalcedDistributions["Random"] = binnedData;
        },

        relayout: function () {
            // fix c3 setting max-height to current height so it never gets bigger y-wise
            // See https://github.com/masayuki0812/c3/issues/1450
            d3.select(this.el).select(".c3").style("max-height", "none");   
            this.chart.resize();
            return this;
        },

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            CLMSUI.DistogramBB.__super__.remove.apply (this, arguments);    
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();
        },
        
        identifier: "Distogram",
    });

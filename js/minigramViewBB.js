//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

    var CLMSUI = CLMSUI || {};

    CLMSUI.MinigramViewBB = Backbone.View.extend ({
        events: {
            // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
        },

        initialize: function (viewOptions) {
            var defaultOptions = {
                maxX: 80,
                height: 60,
                width: 180,
                xAxisHeight: 20
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.precalcedDistributions = {};

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el).attr("class", "minigram");

            var chartDiv = mainDivSel.append("div")
                .attr("id", this.el.id+"c3Chart")
                .attr("class", "c3minigram")
            ;

            // Generate the C3 Chart
            var bid = "#" + chartDiv.attr("id");

            this.chart = c3.generate({
                bindto: bid,
                data: {
                    //x: 'x',
                    columns: [
                        [this.options.seriesName],
                    ],
                    type: 'bar',
                    colors: this.options.colors || {
                        actual: "#555",
                        random: "#aaa"
                    },
                    /*
                    selection: {
                        enabled: true,
                        grouped: true,
                        multiple: true,
                        draggable: true
                    },
                    */
                },
                size: {
                    width: this.options.width,
                    height: this.options.height
                },
                padding: {
                    bottom: 0,
                    left: 10,
                    top: 0,
                    right: 10,
                },
                bar: {
                    width: {
                        ratio: 0.8 // this makes bar width 50% of length between ticks
                    }
                },
                tooltip: {
                    show: false    // minidist is too small, tooltip obscures everything
                },
                legend: {
                    show: false
                },
                axis: {
                    y: {
                        show: false
                    },
                    x: {
                        height: this.options.xAxisHeight,
                        show: true,
                        padding: {
                          left: 0,
                          right: 0,
                        }
                    }
                },
                subchart: {
                    show: true,
                    onbrush: function (domain) {
                        // eventually do snapping: http://bl.ocks.org/mbostock/6232620

                        // the below fires one change:domainStart event, one change:domainEnd event and one change event (if we want to process both changes together)
                        // console.log ("minigram domain", domain[0], domain[1]);
                        self.model.set ({"domainStart": domain[0], "domainEnd": domain[1]});
                    },
                    size: {
                        height: this.options.height - this.options.xAxisHeight // subchart doesnt seem to account for x axis height and sometimes we lose tops of bars
                    },
                    axis: {
                        x: {
                            show: true,
                        }
                    }
                }
            });

            this.chart.internal.axes.x.style("display", "none");    // hacky, but hiding x axis and showing subchart x axis loses numbers in subchart axis

            var brush = d3.select(this.el).selectAll("svg .c3-brush");
            var flip = {"e":1, "w":-1};
            brush.selectAll(".resize").append("path")
                .attr ("transform", function(d) { return "translate(0,0) scale("+(flip[d])+",1)"; })
                .attr ("d", "M 1 0 V 20 L 10 10 Z")
            ;

            this.relayout();
            this.render();

            return this;
        },

        render: function () {
            var self = this;
            var dataSeries = this.model.data();

            // aggregate data into bar chart friendly form
            var seriesLengths = dataSeries.map (function(s) { return s.length; });
            var countArrays = this.aggregate (dataSeries, seriesLengths, this.precalcedDistributions);

            var maxY = d3.max(countArrays[0]);  // max calced on real data only
            // if max y needs to be calculated across all series
            //var maxY = d3.max(countArrays, function(array) {
            //    return d3.max(array);
            //});

            // add names to front of arrays as c3 demands (need to wait until after we calc max otherwise the string gets returned as max)
            countArrays.forEach (function (countArray,i) { countArray.unshift (self.options.seriesNames[i]); });

            var curMaxY = this.chart.axis.max().y;
            if (curMaxY === undefined || curMaxY < maxY) {   // only reset maxY if necessary as it causes redundant repaint (given we load and repaint straight after)
                this.chart.axis.max ({y: maxY});
            }

            this.chart.load({
                columns: countArrays
            });

            // Hack to move bars right by half a bar width so they sit between correct values rather than over the start of an interval
            var internal = this.chart.internal;
            var halfBarW = internal.getBarW (internal.subXAxis, 1) / 2;
            d3.select(this.el).selectAll(".c3-chart-bars").attr("transform", "translate("+halfBarW+",0)");

            //console.log ("data", distArr, binnedData);
            return this;
        },

        aggregate: function (series, seriesLengths, precalcedDistributions) {
            // get extents of all arrays, concatenate them, then get extent of that array
            var extent = d3.extent ([].concat.apply([], series.map (function(d) { return d3.extent(d); })));

            //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
            var thresholds = d3.range (Math.min (0, Math.floor(extent[0])), Math.max (Math.ceil(extent[1]), this.options.maxX) + 2);
            if (thresholds.length === 0) {
                thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
            }

            var sIndex = this.options.seriesNames.indexOf (this.options.scaleOthersTo);
            var targetLength = sIndex >= 0 ? seriesLengths[sIndex] : 1;

            var countArrays = series.map (function (aseries, i) {
                var aseriesName = this.options.seriesNames[i];
                var binnedData = precalcedDistributions[aseriesName]
                    ? precalcedDistributions[aseriesName]
                    : d3.layout.histogram().bins(thresholds)(aseries)
                ;

                var scale = sIndex >= 0 ? targetLength / (seriesLengths[i] || targetLength) : 1;
                return binnedData.map (function (nestedArr) {
                    return nestedArr.y * scale;
                });
            }, this);

            return countArrays;
        },

        relayout: function () {
            // fix c3 setting max-height to current height so it never gets bigger y-wise
            // See https://github.com/masayuki0812/c3/issues/1450
            //d3.select(this.el).select(".c3").style("max-height", "none");
            // kill brush clip so we can see brush arrows at chart extremeties
            d3.select(this.el).select(".c3-brush").attr("clip-path", "");

            this.chart.resize();
            return this;
        },

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();

            // this line destroys the containing backbone view and it's events
            Backbone.View.prototype.remove.call(this);
        }

    });

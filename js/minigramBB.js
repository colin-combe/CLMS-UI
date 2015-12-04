//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.MinigramBB = global.Backbone.View.extend ({
        events: {
            // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
        },

        initialize: function (viewOptions) {
            console.log("arg options", viewOptions);
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
            
            console.log ("mainDivSel", mainDivSel, chartDiv, this.el, this.el.id);

            // Generate the C3 Chart
            var bid = "#" + chartDiv.attr("id");

            this.chart = c3.generate({
                bindto: bid,
                data: {
                    //x: 'x',
                    columns: [
                        //['x'],
                        [this.options.seriesName],
                    ],
                    type: 'bar',
                    colors: {
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
                    
                    /*
                    ondragend: function (extent) {
                        console.log ("extent", extent);
                    }
                    */
                },
                size: {
                    width: this.options.width,
                    height: this.options.height
                },
                padding: {
                    bottom: 0,
                },
                bar: {
                    width: {
                        ratio: 0.8 // this makes bar width 50% of length between ticks
                            // need to poke c3.js code to see why the bars are initally zero width (whatever it calculates from is zero too I suspect)
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
                        show: true
                    }
                },
                subchart: {
                    show: true,
                    onbrush: function (domain) {
                        self.model
                            .set ({
                                "domainStart": domain[0],
                                "domainEnd": domain[1]
                            })
                            .trigger("dualChange", self, domain)  // fire this, and listeners can listen to this event to pick up both changes at once rather than separately
                        ; 
                    },
                    size: {
                        height: this.options.height - this.options.xAxisHeight // subchart doesnt seem to account for x axis height and sometimes we lose tops of bars
                    },  
                    axis: {
                        x: {
                            show: true
                        }
                    }
                }
            });
            
            this.chart.internal.axes.x.style("display", "none");    // hacky, but hiding x axis and showing subchart x axis loses numbers in subchart axis
            
            var brush = d3.select(this.el).selectAll("svg .c3-brush");
            var flip = {"e":1, "w":-1};
            brush.selectAll(".resize").append("path")
                .attr ("transform", function(d) { return "translate(0,0) scale("+(2*flip[d])+",2)"; })
                .attr ("d", "M 0 0 V 10 L 5 5 Z")
            ;   
  
            this.recalcRandomBinning();
            
            this.render();
            
            return this;
        },

        render: function () {
                   
            var valArr = this.model.data();

            var extent = d3.extent(valArr);
            console.log ("valArr", valArr);
            //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
            var thresholds = d3.range(Math.min(0, Math.floor(extent[0])), Math.max (Math.ceil(extent[1]), this.options.maxX));
            if (thresholds.length === 0) {
                thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
            }

            var self = this;
            var seriesArr = [
                {data: valArr, name: this.options.seriesName, scale: 1.0},
                {data: [1] /*should be precalced*/, name: "Random", scale: valArr.length / (this.randArrLength || valArr.length)}
            ];

            var countArrays = seriesArr.map (function (series) {

                var binnedData = self.precalcedDistributions[series.name]
                    ? self.precalcedDistributions[series.name]
                    : d3.layout.histogram().bins(thresholds)(series.data)
                ;

                var countData = binnedData.map(function (nestedArr) {
                    return nestedArr.y * series.scale;
                });

                return countData;
            });


            var maxY = d3.max(countArrays[0]);  // max calced on real data only
            // if max y needs to be calculated across all series
            //var maxY = d3.max(countArrays, function(array) {
            //    return d3.max(array);
            //});

            // add names to front of arrays as c3 demands

            countArrays.forEach (function (countArray,i) { countArray.unshift (seriesArr[i].name); });


            // if this is an unfiltered data set, set the max Y axis value (don't want it to shrink when filtering starts)
            var maxAxes = {};
                console.log ("maxy", maxY);
            //if (+xlv.cutOff <= xlv.scores.min) {
                maxAxes.y = maxY;
            //}

            //var xNames = thresholds.slice(0, thresholds.length - 1).unshift("x");

            //console.log ("thresholds", thresholds);
            //console.log ("maxAxes", maxAxes);
            this.chart.axis.max(maxAxes);
            this.chart.load({
                columns: countArrays
            });

            //console.log ("data", distArr, binnedData);

            return this;
        },

        recalcRandomBinning: function () {
            console.log ("precalcing random bins for minigram view");
            var randArr = [2,3,4];
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
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();

            // this line destroys the containing backbone view and it's events
            global.Backbone.View.prototype.remove.call(this);
        }

    });
    
} (this));

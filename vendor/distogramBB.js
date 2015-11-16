//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

var CLMSUI = CLMSUI || {};

CLMSUI.DistogramBB = Backbone.View.extend({
    tagName: "div",
    className: "dynDiv",
    events: {
        // following line commented out, mouseup sometimes not called on element if pointer drifts outside element 
        // and dragend not supported by zepto, fallback to d3 instead (see later)
        // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
        "click .downloadButton": "downloadSVG",
        "click .closeButton": "hideView"
    },

    initialize: function (viewOptions) {
        console.log("arg options", viewOptions);
        var defaultOptions = {
            xlabel: "Distance",
            ylabel: "Count",
            seriesName: "Cross Links",
            chartTitle: "Distogram",
            maxX: 80
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        this.precalcedDistributions = {};
        this.displayEventName = viewOptions.displayEventName;

        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        // Set up some html scaffolding in d3
        CLMSUI.utils.addDynDivScaffolding(mainDivSel);
        
        // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
        var drag = d3.behavior.drag().on ("dragend", function() { self.relayout(); });
        mainDivSel.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
            .call (drag)
        ;

        mainDivSel.append("div").style("height", "40px")
            .append("button")
            .attr("class", "btn btn-1 btn-1a downloadButton")
            .text("Download Image");

        var chartDiv = mainDivSel.append("div")
            .attr("class", "panelInner distoDiv")
            .attr("id", "currentSampleDistogram")
            .style("position", "relative")
            .style("height", "calc( 100% - 40px )")
        ;
        //CLMSUI.utils.addFourCorners(mainDivSel);

        chartDiv.selectAll("*").remove();

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
                    Random: "#aaa"
                },
                color: function (colour, d) {
                    var rm = self.model.get("rangeModel");
                    if (d.id && d.id !== "Random" && rm.get("active") && rm.get("scale")) {
                        return rm.get("scale")(d.x);
                    }
                    else if (!d.id && d !== "Random") {
                        return rm.get("scale").range()[2];
                    }
                    return colour;
                }
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
                    label: this.options.xlabel //,
                        //max: this.options.maxX
                },
                y: {
                    label: this.options.ylabel,
                    tick: { // blank non-whole numbers on y axis with this function
                        // except this does the same for tooltips, so non-whole numbers dont get shown in tooltips unless tooltip.value overridden below
                        //format: function (n) {
                        //    console.log ("tooltipping", n);
                        //    return (n == Math.floor(n)) ? n : "";
                        //}
                    }
                }
            },
            legend: {
                //hide: [this.options.seriesName]
            },
            padding: {
                //left: 40, // need this fixed amount if y labels change magnitude i.e. single figures only to double figures causes a horizontal jump
                right: 20
            },
            tooltip: {
                grouped: true,
                format: {
                    title: function (x) {
                        return self.options.xlabel + " " + x;
                    },
                    name: function (name/*, ratio, id, index*/) {
                        return name + " " + self.options.ylabel;
                    },
                    value: function (value, ratio, id) {
                        var v = value.toFixed (id === "Random" ? 1 : 0);
                        if (id !== "Random") {
                            v += "<span style='visibility:hidden; margin: 0'>.0</span>";
                        }
                        return v;
                    }
                }
            },
            title: {
                text: this.options.chartTitle
            }
        });

        console.log("this", this);

        this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
        this.listenTo (this.model.get("distancesModel"), "change:distances", this.recalcRandomBinning);
        
        this.recalcRandomBinning();

        if (viewOptions.displayEventName) {
            this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible);
        }
    },

    downloadSVG: function () {
        var svgString = CLMSUI.utils.getSVG(d3.select(this.el).select("svg"));
        download(svgString, 'application/svg', 'distogram.svg');
    },

    hideView: function () {
        CLMSUI.vent.trigger (this.displayEventName, false);
    },

    setVisible: function (show) {
        console.log("event display in distogram", show);
        d3.select(this.el).style('display', show ? 'block' : 'none');

        if (show) {
            this
                .relayout() // need to resize first sometimes so render gets correct width/height coords
                .render()
            ;
        }
    },

    render: function () {
        
        console.log ("re rendering distogram");

        var allProtProtLinks = this.model.get("clmsModel").get("proteinLinks").values();
        var allCrossLinks = allProtProtLinks[0].residueLinks.values();
        var distances = this.model.get("distancesModel").get("distances");

        //console.log ("distances", distances);
        var distArr = [];
        for (var i = 0; i < allCrossLinks.length; i++) {
            var crossLink = allCrossLinks[i];
            if (crossLink.check() === true) { // check() seems to cause full crosslink view to be drawn
                var toRes = crossLink.toResidue;
                var fromRes = crossLink.fromResidue;
                var highRes = Math.max(toRes, fromRes);
                var lowRes = Math.min(toRes, fromRes);
                var dist = distances[highRes] ? distances[highRes][lowRes] : null;
                if (dist !== null) {
                    distArr.push(+dist); // + is to stop it being a string
                }
            }
        }

        //var randArr = CLMSUI.modelUtils.generateRandomDistribution (1, distances);
        //var randArr = this.model.get("distancesModel").get("flattenedDistances");
        //console.log ("random", randArr);

        var extent = d3.extent(distArr);
        //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
        var thresholds = d3.range(Math.min(0, Math.floor(extent[0])), this.options.maxX);
        if (thresholds.length === 0) {
            thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
        }
        
        var self = this;
        var seriesArr = [
            {data: distArr, name: this.options.seriesName, scale: 1.0},
            {data: [1] /*should be precalced*/, name: "Random", scale: distArr.length / (this.randArrLength || distArr.length)}
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
        console.log ("precalcing random bins for distogram view");
        var randArr = this.model.get("distancesModel").flattenedDistances();
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
        
        // remove drag listener
        d3.select(this.el).selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br").on(".drag", null); 
        
        // this line destroys the containing backbone view and it's events
        Backbone.View.prototype.remove.call(this);
    }

});
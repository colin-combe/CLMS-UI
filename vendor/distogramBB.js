//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

var CLMSUI = CLMSUI || {};

CLMSUI.DistogramBB = Backbone.View.extend({
    tagName: "div",
    className: "dynDiv",
    events: {},

    initialize: function (viewOptions) {
        console.log("arg options", viewOptions);
        var defaultOptions = {
            xlabel: "Distance",
            ylabel: "Count",
            title: "Cross Links"
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        this.displayEventName = viewOptions.displayEventName;

        var self = this;

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        // Set up some html scaffolding in d3
        //CLMSUI.utils.addDynDivParentBar(mainDivSel);
        CLMSUI.utils.addDynDivScaffolding(mainDivSel);

        mainDivSel.append("div").style("height", "40px")
            .append("button")
            .attr("class", "btn btn-1 btn-1a downloadButton")
            .text("Download Image");

        var chartDiv = mainDivSel.append("div")
            .attr("class", "panelInner")
            .attr("id", "distoDiv")
            .style("position", "relative");
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
                    [this.options.title]
                ],
                type: 'bar',
                color: function (colour, d) {
                    var rm = self.model.get("rangeModel");
                    if (d.id && rm.get("active") && rm.get("scale")) {
                        return rm.get("scale")(d.x);
                    }
                    return colour;
                }
            },
            bar: {
                width: {
                    ratio: 0.9 // this makes bar width 50% of length between ticks
                        // need to poke c3.js code to see why the bars are initally zero width (whatever it calculates from is zero too I suspect)
                }
                //width: 8 // this makes bar width 8px
            },
            axis: {
                x: {
                    label: this.options.xlabel //,
                        //max: 40
                },
                y: {
                    label: this.options.ylabel,
                    tick: { // blank non-whole numbers on y axis with this function
                        format: function (n) {
                            return (n == Math.floor(n)) ? n : "";
                        }
                    }
                }
            },
            legend: {
                hide: [this.options.title]
            },
            padding: {
                left: 45
            },
            tooltip: {
                format: {
                    title: function (x) {
                        return self.options.xlabel + " " + x;
                    },
                    name: function (name, ratio, id, index) {
                        return name + " " + self.options.ylabel;
                    }
                }
            }
        });

        console.log("this", this);

        this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout);

        if (viewOptions.displayEventName) {
            this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible)
        }
    },

    downloadSVG: function (evt) {
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


        var extent = d3.extent(distArr);
        //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
        var thresholds = d3.range(Math.min(0, Math.floor(extent[0])), 41);
        if (thresholds.length === 0) {
            thresholds = [0, 1]; // need at least 1 so empty data gets represented as 1 empty bin
        }
        var binnedData = d3.layout.histogram()
            .bins(thresholds)
            (distArr);

        var countData = binnedData.map(function (nestedArr) {
            return nestedArr.y;
        });
        var maxY = d3.max(countData);
        countData.unshift(this.options.title);

        // if this is an unfiltered data set, set the max Y axis value (don't want it to shrink when filtering starts)
        var maxAxes = {};
        //if (+xlv.cutOff <= xlv.scores.min) {
        //    maxAxes.y = maxY;
        //}

        //var xNames = thresholds.slice(0, thresholds.length - 1).unshift("x");

        //console.log ("thresholds", thresholds);
        //console.log ("maxAxes", maxAxes);
        this.chart.axis.max(maxAxes)
        this.chart.load({
            columns: [
                //xNames,
                countData
            ]
        });

        //console.log ("data", distArr, binnedData);

        return this;
    },

    relayout: function () {
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
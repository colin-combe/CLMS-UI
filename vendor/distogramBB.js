//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

var CLMSUI = CLMSUI || {};

CLMSUI.DistogramBB = Backbone.View.extend ({
    tagName: "div",
    className: "panelInner",
    events: {},
    
    initialize: function () {
        
        var defaultOptions = {xlabel: "Distance", ylabel: "Count", title: "Cross Links"};
        for (var attrname in this.myOptions) { defaultOptions[attrname] = this.myOptions[attrname]; }
        this.options = defaultOptions;
        
        // this.el is the dom element this should be getting added to, replaces targetDiv
        d3.select(this.el).style("position","relative").selectAll("*").remove();   
        var bid = "#" + d3.select(this.el).attr("id");
        var self = this;
        
        this.chart = c3.generate({
            bindto: bid,
            data: {
                //x: 'x',
                columns: [
                    //['x'],
                    [this.options.title]
                ]
                ,type: 'bar'
                ,color: function (colour, d) {
                    if (d.id && self.model.get("active") && self.model.get("scale")) {
                        return self.model.get("scale")(d.x);
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
                    label: this.options.xlabel//,
                    //max: 40
                },
                y: {
                    label: this.options.ylabel,
                    tick: {  // blank non-whole numbers on y axis with this function
                       format: function(n) {
                            return (n == Math.floor(n)) ? n: "";
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
                    title: function (x) { return self.options.xlabel + " " + x;},
                    name: function (name, ratio, id, index) { return name+" "+self.options.ylabel; }
                }
            }
        });
        
        console.log ("model", this.model.attributes);
        
        this.listenTo (this.model, "change:filter", this.render);
        this.listenTo (this.model, "change:scale", this.relayout);
    },
    
    render: function (model, distances) {
        
        // 1-line hack till xlv is backbonealised
        var xlv = model;
        
        var allProtProtLinks = xlv.proteinLinks.values();
        var allCrossLinks = allProtProtLinks[0].residueLinks.values();

        //console.log ("distances", distances);
        var distArr = [];
        var filteringDone = (+xlv.cutOff > xlv.scores.min);
        
        for (var i =0; i < allCrossLinks.length; i ++) {
            var crossLink = allCrossLinks[i];
            if (crossLink.check() === true) {    // check() seems to cause full crosslink view to be drawn
                var toRes = crossLink.toResidue;
                var fromRes = crossLink.fromResidue;
                var highRes = Math.max (toRes, fromRes);
                var lowRes = Math.min (toRes, fromRes);
                //console.log ("h", highRes, distances[highRes]); // sometimes some nulls at the start of each subarray were meaning values werent existing?
                var dist = distances[highRes] ? distances[highRes][lowRes] : null;
                if (dist !== null) {
                    distArr.push (+dist);   // + is to stop it being a string
                }
            }
        }


        var extent = d3.extent (distArr);
        //var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), Math.max (40, Math.ceil(extent[1])) + 1);
        var thresholds = d3.range (Math.min(0, Math.floor(extent[0])), 41);
        if (thresholds.length === 0) {
            thresholds = [0,1]; // need at least 1 so empty data gets represented as 1 empty bin
        }
        var binnedData = d3.layout.histogram()
            .bins(thresholds)  
            (distArr)
        ;

        var countData = binnedData.map (function (nestedArr) {
           return nestedArr.y; 
        });
        var maxY = d3.max (countData);
        countData.unshift (this.options.title);

        //var xNames = thresholds.slice(0, thresholds.length - 1).unshift("x");

        // if this is an unfiltered data set, set the max Y axis value (don't want it to shrink when filtering starts)
        var maxAxes = {};
        if (!filteringDone) {
            maxAxes.y = maxY;
        }
        
        //console.log ("thresholds", thresholds);
        //console.log ("maxAxes", maxAxes);
        this.chart.axis.max (maxAxes)
        this.chart.load ({
            columns: [
                //xNames,
                countData
            ]
        });

        //console.log ("data", distArr, binnedData);
        
        return this;
    },
    
    redraw: function (distances, xlv) {
        this.render (xlv, distances);   // deliberate swap round
    },
    
    relayout: function () {
        this.chart.resize();
    }
    
});


//		a view of the filter model state
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		js/filterViewBB.js

var CLMSUI = CLMSUI || {};

CLMSUI.FilterViewBB = Backbone.View.extend({
    tagName: "span",
    className: "filterGroup",
    events: {},

    initialize: function (viewOptions) {
        console.log("arg options", viewOptions);
        var defaultOptions = {
            toggles: [
                {"label":"A", "id":"A"},
                {"label":"B", "id":"B"},
                {"label":"C", "id":"C"},
                {"label":"?", "id":"Q"},
                {"label":"auto", "id":"AUTO"},
            ],
            toggleSpecials: [
                {label: "Self-Links", id: "selfLinks"},
                {label: "Ambiguous", id: "ambig"},
            ]
        };
        this.options = _.extend(defaultOptions, viewOptions.myOptions);

        var self = this;
        
        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);
        mainDivSel.selectAll("label")
            .data(this.options.toggles, function(d) { return d.id; })
            .enter()
            .append ("label")
                .text (function(d) { return d.label; })
                .append ("input")
                    .attr ("id", function(d) { return d.id; })
                    .attr ("class", "filterTypeToggle")
                    .attr ("type", "checkbox")
                    .property ("checked", function(d) { return self.model.get(d.id); })
        ;
        
        var slider = mainDivSel.append ("div").attr("id", "scoreSlider");
        slider.append("p").text("Score:");
        slider.append("p").attr("id", "cutoffLabel").text("cut-off");
        slider.append("p").attr("class", "scoreLabel").attr("id", "scoreLabel1");
        slider.append("input").attr({
            "id": "slide", 
            "type": "range",
            "min" : 0,  // these don't need to be taken from model. We pick 0-100 and modify those values with model data later when needed
            "max": 100,
            "step": 1,
            "value": self.model.get("cutoff")
        });
        slider.append("p").attr("class","scoreLabel").attr("id", "scoreLabel2");
        
        
        mainDivSel.selectAll("label")
            .data(this.options.toggleSpecials, function(d) { return d.id; })
            .enter()
            .append ("label")
                .text (function(d) { return d.label; })
                .append ("input")
                    .attr ("id", function(d) { return d.id; })
                    .attr ("class", "filterSpecialToggle")
                    .attr ("type", "checkbox")
                    .property ("checked", function(d) { return self.model.get(d.id); })
        ;

        // onclick="//xlv.showSelfLinks(document.getElementById('selfLinks').checked)"
		// onclick="//xlv.showAmbig(document.getElementById('ambig').checked)"
 
        if (self.model.get("scores") === null){
            slider.style('display', 'none');
        } else {
            d3.select('#scoreLabel1').html ('['+this.getMinScore());
            d3.select('#scoreLabel2').html (this.getMaxScore()+']');
            this.sliderChanged ({target: d3.select("#slide").node()});
            slider.style('display', 'inline-block');
        }
        
        this.displayEventName = viewOptions.displayEventName;

        /*
        //this.listenTo (this.model, "change:filter", this.render);

        if (viewOptions.displayEventName) {
            this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible)
        }
        */
    },
    
    filter: function (evt) {
        console.log ("this filterBB filter", evt);   
        var target = evt.target;
        var id = target.id;
        this.model.set (id, target.checked);
    },
    
    filterSpecial: function (evt) {
        console.log ("this filterBB filterSpecial", evt);   
        var target = evt.target;
        var id = target.id;
        this.model.set (id, target.checked);
    },
    
    sliderDecimalPlaces: 1,
    
    getMaxScore: function () {
        var scores = this.model.get("scores");
        return scores ? CLMSUI.utils.dpNumber (scores.max, this.sliderDecimalPlaces, Math.ceil) : 0;
    },
    
    getMinScore: function () {
        var scores = this.model.get("scores");
        return scores ? CLMSUI.utils.dpNumber (scores.min, this.sliderDecimalPlaces, Math.floor) : 0;
    },
    
    sliderChanged: function (evt) {
        var slide = evt.target;
        var min = this.getMinScore();
        var max = this.getMaxScore()
        var cut = ((slide.value / 100) * (max - min)) + (min / 1);
        cut = cut.toFixed (this.sliderDecimalPlaces);
        d3.select("#cutoffLabel").text(cut);
        this.model.set ("cutoff", cut);
    },
    
    render: function () {
        return this;
    },

    // removes view
    // not really needed unless we want to do something extra on top of the prototype remove function
    remove: function () {
        // this line destroys the containing backbone view and it's events
        Backbone.View.prototype.remove.call(this);
    }

});
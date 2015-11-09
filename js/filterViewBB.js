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
        slider.append("p").attr("class", "scoreLabel").attr("id", "scoreLabel1");
        slider.append("input").attr({
            "id": "slide", 
            "type": "range",
            "min" : 0,
            "max": 100,
            "step": 1,
            "value": self.model.get("cutoff")
        });
        slider.append("p").attr("class","scoreLabel").attr("id", "scoreLabel2");
        slider.append("p").attr("id", "cutoffLabel").text("(cut-off)");
        
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
 
        this.displayEventName = viewOptions.displayEventName;

      

        /*
        //this.listenTo (this.model, "change:filter", this.render);
        this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout);

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
    
    sliderChanged: function (evt) {
        var slide = evt.target;
        var sliderDecimalPlaces = 2;
        var powerOfTen = Math.pow(10, sliderDecimalPlaces);

        var cut = ((slide.value / 100)
        //            * (getMaxScore() - getMinScore()))
         //           + (getMinScore() / 1)
                   );
        cut = cut.toFixed(sliderDecimalPlaces);
        //var cutoffLabel = document.getElementById("cutoffLabel");
        //cutoffLabel.innerHTML = '(' + cut + ')';
        //xlv.setCutOff(cut);
        //CLMSUI.filterFunc();    // this is calling xlv redraw as well
        this.model.set ("cutoff", cut); // FIX with above c ode
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
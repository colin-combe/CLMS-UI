(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.AlignSettingsViewBB = global.Backbone.View.extend ({
        events: {
            "change input": "inputChanged",
            "keyup input": "inputKeyed",
            "change select": "selectChanged",
        },

        initialize: function (viewOptions) {         
            var controls = d3.select(this.el);
            var inputArray = [
                {label: "Gap Open Penalty", prop:"gapOpenScore", type:"number", min: 0, max: 99},
                {label: "Gap Extend Penalty", prop:"gapExtendScore", type:"number", min: 0, max: 99},
                {label: "Score Matrix", prop:"scoreMatrix", type:"select", options: this.model.scoreMatrices },
            ];
            var inputSel = controls.selectAll("div.controlBlock")
                .data(inputArray, function(d) { return d.prop; })
            ;
            var inputElems = inputSel.enter()
                .append("div")
                .attr("class", "controlBlock")
            ;
            inputElems.append("label").text(function(d) { return d.label; });
            //inputElems.append("input").attr("type",function(d) { return d.type; });
            
            inputElems.each (function(datum) {
                if (datum.type !== "select") {
                    d3.select(this).append("input").attr("type", datum.type).attr("min", datum.min).attr("max", datum.max);
                } else {
                    var seli = d3.select(this).append("select").attr("name", datum.prop);
                    seli.selectAll("option").data(datum.options)
                        .enter()
                        .append("option")
                        .attr("value", function(d) { return d.key; })
                        .text (function(d) { return d.key; })
                    ;
                }
            });
            
            
            this.listenTo (this.model, "change:compAlignments", this.render);
            
            this.render();
            
            return this;
        },
        
        render: function () {
            console.log ("control rerendering");
            var self = this;
            var controls = d3.select(this.el).selectAll("div.controlBlock input");
            controls.attr("value", function(d) { return self.model.get(d.prop); });
            
            return this;
        },
          
        inputChanged: function (evt) {
            var control = d3.select(evt.target);
            var controlDatum = control.datum();
            this.model.set (controlDatum.prop, controlDatum.type === "number" ? +control.property("value") : control.property("value"));
        },
        
        inputKeyed: function (evt) {
            var key = evt.which || evt.keyCode || 0;
            if (key === 13) {
                this.inputChanged (evt);
            }
        },
        
        selectChanged: function (evt) {
            var control = d3.select(evt.target);
            var controlDatum = control.datum();
            var selectedOption = control.selectAll("option").filter(function(d,i) { return i == control.property("selectedIndex"); });
            this.model.set (controlDatum.prop, selectedOption.datum().value);   // actual matrix dataset is stored in d3 data, not in html option attributes
        }
    });
})(this);
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.AlignSettingsViewBB = Backbone.View.extend ({
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
                //{label: "Score Matrix", prop:"scoreMatrix", type:"select", options: this.model.scoreMatrices },
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
                 
            this
                .listenTo (this.model, "change:compAlignments", this.render)
                .render()
            ;
            
            return this;
        },
        
        render: function () {
            console.log ("control rerendering");
            var self = this;
            var controls = d3.select(this.el).selectAll("div.controlBlock input");
            console.log ("selfm", self.model, controls.datum());
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
    
    CLMSUI.CollectionAsSelectViewBB = Backbone.View.extend ({
        events: {
            "change select": "selectChanged",
        },
        
        initialize: function (viewOptions) {
            var topElem = d3.select(this.el).append("DIV").attr("class", "controlBlock");
            var tpl = _.template ("<LABEL><%= label %></LABEL><SELECT name='<%= name %>'></SELECT>");
            topElem.html (tpl ({label: viewOptions.label || "Label", name: viewOptions.name || "Name"})); 
            
            this
                .listenTo (this.collection, "sync", function () { 
                    console.log ("Collection fetched and synced for view", this);
                    this.render();
                })
                // If collection has fetched quickly then the sync event maybe fired before we registered the listener
                // above, thus we add an immediate this.render() afterwards as a safety net
                .render()
            ;
            return this;
        },
        
        render: function () {
            console.log ("blosum select control rerendering");
            var self = this;
            
            var options = d3.select(this.el).select("select").selectAll("option")
                .data (this.collection.models, function(d) { return d.cid; })
            ;
            
            options
                .enter()
                .append("option")
                // because d will be a Backbone Model we use the .get notation to get values
                .attr("value", function(d) { return d.get("key"); })  
                .text (function(d) { return d.get("key"); })
            ;
            
            options.property ("selected", function(d) { return d.cid == self.lastSelected; });
            
            options.exit().remove();

            return this;
        },

        // In case the selected score matrix is set from another view or model, we should reflect that choice here
        setSelected: function (aModel) {
            console.log ("aModel", aModel);
            if (aModel && aModel.cid !== this.lastSelected) {
                this.lastSelected = aModel.cid;
                this.render();
            }
            return this;
        },
        
        selectChanged: function (evt) {
            var control = d3.select(evt.target);
            var selectedOption = control.selectAll("option").filter(function() { return this.selected; });
            this.collection.trigger ("modelSelected", selectedOption.datum());
        }
    });

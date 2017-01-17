
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.DropDownMenuViewBB = Backbone.View.extend ({
        events: {
            "mouseenter .menuTitle": "switchVis",
            "click .menuTitle": "toggleVis",
            "click li": "menuSelection",
        },
        
        initialize: function (viewOptions) {
            var emptyFunc = function () {};
            var defaultOptions = {
                title: "A DD Menu",
                closeOnClick: true,
                menu: [{name:"Wazzup", func: emptyFunc}, {name:"Buddy", func: emptyFunc}],
                groupByAttribute: "group",
                labelByAttribute: "name",
                toggleAttribute: "state",
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            d3.select(this.el)
                .attr("class", "btn dropdown")
                .append("span")
                    .attr("class", "menuTitle")
                    .text(this.options.title)
            ;
            
            this.render();
            return this;
        },
        
        render: function () {
            var self = this;
            if (this.collection) {
                var lastCat = null;
                var adata = [];
                this.collection.each (function (model) {
                    //console.log ("model", model);
                    var cat = model.get(self.options.groupByAttribute);
                    var cbdata = ({
                        id: (model.get(self.options.labelByAttribute)+"Placeholder").replace(/ /g, "_"),   // ids may not contain spaces 
                        label: model.get(self.options.labelByAttribute),
                        sectionEnd: lastCat !== cat,
                    });
                    adata.push (cbdata);
                    lastCat = cat;

                    var cbView = new CLMSUI.utils.checkBoxView ({
                        model: model,
                        myOptions: {id: cbdata.id, label: cbdata.label, toggleAttribute: self.options.toggleAttribute, labelFirst: self.options.labelFirst}
                    });
                    self.$el.append(cbView.$el);
                }); 
                
                this.options.menu = adata.map (function(cbdata) { return { id: cbdata.id, sectionEnd: cbdata.sectionEnd}; });
            }
            
            var choices = d3.select(this.el).append("div").append("ul").selectAll("li")
                .data (this.options.menu, function (d) { return d.name || d.id; })
            ;
            choices.enter().append("li").each(function(d) {
                var ind = d3.select(this);
                if (d.name) {
                    ind.text(d.name);
                } else if (d.id) {
                    var targetSel = d3.select("#"+d.id); 
                    if (!targetSel.empty()) {
                        var targetNode = targetSel.node();
                        if (targetNode.parentElement) {
                            targetNode.parentElement.removeChild (targetNode);
                        }
                        ind.node().appendChild(targetNode);
                    }
                }
            }); 
            
            choices
                .filter(function(d) { return d.sectionEnd; })
                .insert ("hr")
            ;
            
            return this;
        },
        
        // hide/show or disable menu items by id array ["#myid", "#id2", etc]
        filter: function (idArr, show) {
            //d3.selectAll(idArr.join(",")).style ("display", show ? null : "none");
            d3.selectAll(idArr.join(","))
                .style ("color", show ? null : "#888")
                .selectAll("input")
                    .property("disabled", !show)
            ;
            return this;
        },
        
        isShown: function () {
            return d3.select(this.el).select("div").style("display") !== "none";
        },
        
        toggleVis : function () {
            var show = this.isShown();
            // if showing then hide all other menus, really should do it via an event but...
            if (!show) {
                d3.selectAll(".dropdown div").style("display", "none");
            }
            this.setVis (!show);
        },
        
        hideVis: function () {
            this.setVis (false);
        },
        
        setVis: function (show) {
            CLMSUI.DropDownMenuViewBB.anyOpen = show;    // static var. Set to true if any menu clicked open.
            d3.select(this.el).select("div")
                .style ("display", show ? "block" : "none")
            ;
        },
        
        switchVis: function () {
            if (CLMSUI.DropDownMenuViewBB.anyOpen && !this.isShown()) {
                this.toggleVis();
            }
        },
        
        menuSelection: function (evt) {  
            var d3target = d3.select (evt.target);
            if (d3target && d3target.datum() && d3target.datum().func) {
                (d3target.datum().func)(); // as value holds function reference
            }
            
            if (this.options.closeOnClick) {
                this.hideVis();
            }
        },
    });

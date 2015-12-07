
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.DropDownMenuViewBB = global.Backbone.View.extend ({
        events: {
            "click .menuTitle": "toggleVis",
            "click li": "menuSelection",
            "blur .dropdown": "hideVis"
        },

        initialize: function (viewOptions) {
            var emptyFunc = function () {};
            var defaultOptions = {
                title: "A DD Menu",
                menu: [{name:"Wazzup", func: emptyFunc}, {name:"Buddy", func: emptyFunc}]
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            var placeholder = mainDivSel.attr("class", "btn dropdown");
            placeholder.append("span").attr("class", "menuTitle").text(this.options.title);           
            
            var choices = placeholder.append("div").append("ul").selectAll("li")
                .data (this.options.menu, function (d) { return d.name; })
            ;
            choices.enter().append("li").each(function(d,i) {
                var ind = d3.select(this);
                if (!d.id) {
                    ind.text(d.name);
                } else {
                    ind.node().appendChild(d3.select(d.id).node());
                }
                //ind.text(function(d) { return d.name; });
            });
            
            return this;
        },
        
        toggleVis : function () {
            var curVal = d3.select(this.el).select("div").style("display");
            this.setVis (curVal === "none");
        },
        
        hideVis: function () {
            this.setVis (false);
        },
        
        setVis: function (show) {
            d3.select(this.el).select("div")
                .style ("display", show ? "block" : "none")
            ;
        },
        
        menuSelection: function (evt) {  
            var d3target = d3.select (evt.target);
            if (d3target && d3target.datum().func) {
                (d3target.datum().func)(); // as value holds function reference
            }
            
            this.hideVis();
        },
    });
})(this);
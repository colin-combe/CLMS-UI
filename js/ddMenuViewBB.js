
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.DropDownMenuViewBB = global.Backbone.View.extend ({
        events: {
            "mouseenter .menuTitle": "switchVis",
            "click .menuTitle": "toggleVis",
            "click li": "menuSelection",
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
                .data (this.options.menu, function (d) { return d.name || d.id; })
            ;
            choices.enter().append("li").each(function(d) {
                var ind = d3.select(this);
                if (d.name) {
                    ind.text(d.name);
                } else if (d.id) {
                    var targetNode = d3.select("#"+d.id).node();
                    if (targetNode.parentElement) {
                        targetNode.parentElement.removeChild (targetNode);
                    }
                    ind.node().appendChild(targetNode);
                }
                //ind.text(function(d) { return d.name; });
            });
            
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
            global.CLMSUI.DropDownMenuViewBB.anyOpen = show;    // static var. Set to true if any menu clicked open.
            d3.select(this.el).select("div")
                .style ("display", show ? "block" : "none")
            ;
        },
        
        switchVis: function () {
            if (global.CLMSUI.DropDownMenuViewBB.anyOpen && !this.isShown()) {
                this.toggleVis();
            }
        },
        
        menuSelection: function (evt) {  
            var d3target = d3.select (evt.target);
            if (d3target && d3target.datum() && d3target.datum().func) {
                (d3target.datum().func)(); // as value holds function reference
            }
            
            this.hideVis();
        },
    });
})(this);
//	protein info view
//
//	Martin Graham, Rappsilber Laboratory, 2015


var CLMSUI = CLMSUI || {};

CLMSUI.ProteinInfoViewBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
            }
            return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            CLMSUI.CircularViewBB.__super__.initialize.apply (this, arguments);
            
            var self = this;
            var defaultOptions = {
                nodeWidth: 10,  // this is a percentage measure
                tickWidth: 23,
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            mainDivSel.append("div")
                .attr ("class", "panelInner")
                .classed ("proteinInfoPanel", true)
            ;
                
            return this;
        },
    
        render: function () {
            var prots = Array.from (this.model.get("interactors").values());
            prots.sort (function(a,b) { return a.name.localeCompare (b.name); });
            var tabs = d3.select(this.el).select("div.panelInner");
            
            var protJoin = tabs.selectAll("section").data(prots);
            protJoin.exit().remove();
            var newProts = protJoin.enter().append("section");
            
            var newHeaders = newProts.append("h2")
                .on ("click", function(d) {
                    var assocTable = d3.select("#protInfo"+d.id);
                    var tableDisplay = (assocTable.style("display") == "none");
                    assocTable.style("display", tableDisplay ? "block" : "none");
                    d3.select(this).select("svg").style("transform", "rotate("+(tableDisplay ? 180 : 90)+"deg)")
                })
            ;
            newHeaders.append("svg")
                .append("polygon")
                    .attr("points", "0,14 7,0 14,14")
            ;
            newHeaders.append("span").text(function(d) { return d.name.replace("_", " "); });
            
            var tables = newProts.append("table")
                .html("<thead><tr><th>Property</th><th>Value</th></tr></thead><tbody></tbody>")
                .attr("id", function(d) { return "protInfo"+d.id; })
            ;
            
            var rowFilterFunc = function(entries) {
                return entries.filter (function (entry) {
                    if ($.isArray(entry.value)) {
                        entry.value = entry.value.length;
                    }
                    return ! ($.isFunction(entry.value) || $.isPlainObject(entry.value)); 
                })
            };

            var tbodies = tables.select("tbody");
            var rowJoin = tbodies.selectAll("tr").data(function(d) { return rowFilterFunc (d3.entries(d)); });
            rowJoin.exit().remove();
            var newRows = rowJoin.enter().append("tr");
            newRows.append("td").text(function(d) { return d.key; });
            newRows.append("td").text(function(d) { return d.value; });

            protJoin.each(function(d,i) {
                var assocTable = d3.select("#protInfo"+d.id);
                var tableDisplay = (assocTable.style("display") == "none");  
                d3.select(this).select("svg").style("transform", "rotate("+(tableDisplay ? 90 : 180)+"deg)");
            });
            
            return this;
        },
});
            
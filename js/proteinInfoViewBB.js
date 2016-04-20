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
                fixedFontKeys: d3.set(["sequence"]),
                removeTheseKeys: d3.set (["canonicalSeq"])
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
            // only render if visible
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                
                var setArrow = function (d) {
                    var assocTable = d3.select("#protInfo"+d.id);
                    var tableDisplay = (assocTable.style("display") == "none");  
                    console.log ("td2", tableDisplay);
                    d3.select(this).select("svg").style("transform", "rotate("+(tableDisplay ? 90 : 180)+"deg)");
                };
                
                var prots = Array.from (this.model.get("interactors").values());
                prots.sort (function(a,b) { return a.name.localeCompare (b.name); });
                var tabs = d3.select(this.el).select("div.panelInner");

                console.log ("prot info model", this.model);

                var protJoin = tabs.selectAll("section").data(prots);
                protJoin.exit().remove();
                var newProts = protJoin.enter().append("section");

                var newHeaders = newProts.append("h2")
                    .on ("click", function(d) {
                        var assocTable = d3.select("#protInfo"+d.id);
                        var tableDisplay = (assocTable.style("display") == "none");
                        console.log ("td1", tableDisplay);
                        assocTable.style("display", tableDisplay ? "table" : "none");
                        setArrow.call (this, d);         
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

                var self = this;

                var rowFilterFunc = function(d) {
                    var entries = d3.entries(d);
                    var badKeys = self.options.removeTheseKeys;
                    return entries.filter (function (entry) {
                        if ($.isArray(entry.value)) {
                            entry.value = entry.value.length;
                        }
                        if (entry.key === "sequence") {
                            entry.value =  self.makeInteractiveSeqString (d, d.sequence, d.crossLinks);
                        }
                        return ! ($.isFunction(entry.value) || $.isPlainObject(entry.value) || (badKeys && badKeys.has(entry.key))); 
                    });
                };

                var tbodies = tables.select("tbody");
                var rowJoin = tbodies.selectAll("tr").data(function(d) { return rowFilterFunc (d); });
                rowJoin.exit().remove();
                var newRows = rowJoin.enter().append("tr");
                newRows.append("td").text(function(d) { return d.key; });
                newRows.append("td")
                    .html(function(d) { return d.value; })
                    .classed ("fixedSizeFont", function(d) { return self.options.fixedFontKeys && self.options.fixedFontKeys.has (d.key); })
                ;

                protJoin.each (setArrow);
            }

            return this;
        },
    
        makeInteractiveSeqString: function (protein, seq, xlinks) {
             var proteinId = protein.id;
            var map = d3.map (xlinks, function(d) { return d.id; });
            var endPoints = {};
            map.values().forEach (function (xlink) {
                if (proteinId === xlink.fromProtein.id) {
                    var fromRes = xlink.fromResidue;
                    endPoints[fromRes] = endPoints[fromRes] || [];
                    endPoints[fromRes].push (xlink);
                }
                if (proteinId === xlink.toProtein.id) {
                    var toRes = xlink.toResidue;
                    endPoints[toRes] = endPoints[toRes] || [];
                    endPoints[toRes].push (xlink);
                }
            });
            var endPointEntries = d3.entries (endPoints);
            endPointEntries.sort (function(a,b) { return a.key - b.key; });
            //console.log ("endpoints", endPointEntries);
            
            
            var strSegs = [];
            var last = 0;
            endPointEntries.forEach (function (ep) {
                var pos = +ep.key;
                strSegs.push (seq.slice(last, pos-1));
                strSegs.push ("<span class='hit'>"+seq.charAt(pos-1)+"</span>");
                last = pos;
            });
            strSegs.push (seq.slice (last, seq.length));
            var iStr = strSegs.join("");
            //console.log ("iStr", iStr);
            
            return iStr;        
        },
});
            
//  protein info view
//
//  Martin Graham, Rappsilber Laboratory, 2015


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
            CLMSUI.ProteinInfoViewBB.__super__.initialize.apply (this, arguments);
            
            var self = this;
            var defaultOptions = {
                fixedFontKeys: d3.set(["sequence", "seq"]),
                removeTheseKeys: d3.set (["canonicalSeq"]),
                expandTheseKeys: d3.set (["uniprotFeatures"]),
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            mainDivSel.append("div")
                .attr ("class", "panelInner")
                .classed ("proteinInfoPanel", true)
                .append("h1")
                    .attr("class", "infoHeader")
                    .text("Selected Info for 0 Proteins")
            ;
            
            this.listenTo (this.model, "change:selectedProtein", this.render);
                
            return this;
        },
    
        render: function () {
            // only render if visible
            console.log ("prot info render called");
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                
                var setArrow = function (d) {
                    var assocTable = d3.select("#protInfo"+d.id);
                    var tableIsHidden = (assocTable.style("display") == "none");  
                    d3.select(this)
                        .style("background", tableIsHidden ? "none" : "#55a")
                        .select("svg")
                            .style("transform", "rotate("+(tableIsHidden ? 90 : 180)+"deg)")
                    ;
                };
                
                var dataSource = this.model.get("selectedProtein");
                var prots = dataSource ? Array.from (dataSource.values()) : [];
                prots.sort (function(a,b) { return a.name.localeCompare (b.name); });
                var tabs = d3.select(this.el).select("div.panelInner");
                
                tabs.select("h1.infoHeader").text("Selected Info for "+prots.length+" Protein"+(prots.length !== 1 ? "s" : ""));

                var protJoin = tabs.selectAll("section").data(prots, function(d) { return d.id; });
                protJoin.exit().remove();
                var newProts = protJoin.enter().append("section");

                var newHeaders = newProts.append("h2")
                    .on ("click", function(d) {
                        var assocTable = d3.select("#protInfo"+d.id);
                        var tableIsHidden = (assocTable.style("display") == "none");
                        assocTable.style("display", tableIsHidden ? "table" : "none");         
                        setArrow.call (this, d);  
                    })
                    .on ("mouseover", function(d) {
                        // eventually backbone shared highlighting code to go here   
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

                var rowFilterFunc = function (d, entries) {
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
                
                // yet another cobble a table together function, but as a string
                var makeTable237 = function (arrOfObjs) {
                    var t = "<table><tr>";
                    var headers = d3.keys(arrOfObjs[0]);
                    headers.forEach (function(h) {
                        t+="<TH>"+h+"</TH>";
                    });
                    t += "</TR>";
                    arrOfObjs.forEach (function (obj) {
                        t += "<TR>";
                        d3.values(obj).forEach (function(h) {
                            t+="<TD>"+h+"</TD>";
                        }); 
                        t += "</TR>";
                    });
                    t += "</TABLE>";
                    return t;
                };
                
                var arrayExpandFunc = function (d, entries) {
                    var newEntries = [];
                    var expandKeys = self.options.expandTheseKeys;
                    entries.forEach (function (entry) {
                        // this way makes a row in main table per array entry
                        /*
                        newEntries.push (entry);
                        if (expandKeys && expandKeys.has(entry.key)) {
                            var vals = d[entry.key];
                            vals.forEach (function (val, i) {
                                newEntries.push ({key: i, value: d3.values(val).join(",\t") });
                            });
                        }
                        */
                        // this way makes a nested table in a row of the main table
                        if (expandKeys && expandKeys.has(entry.key)) {
                            newEntries.push ({key: entry.key, value: makeTable237 (d[entry.key])});
                        } else {
                            newEntries.push (entry);
                        }
                    });
                    return newEntries;
                };

                var tbodies = tables.select("tbody");
                var rowJoin = tbodies.selectAll("tr").data(function(d) { return arrayExpandFunc (d, rowFilterFunc (d, d3.entries(d))); });
                rowJoin.exit().remove();
                var newRows = rowJoin.enter().append("tr");
                newRows.append("td").text(function(d) { return d.key; });
                newRows.append("td")
                    .html(function(d) { return d.value; })
                    .classed ("fixedSizeFont", function(d) { return self.options.fixedFontKeys && self.options.fixedFontKeys.has (d.key); })
                ;

                protJoin.selectAll("h2").each (setArrow);
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
            

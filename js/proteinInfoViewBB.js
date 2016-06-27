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
                
                var dataSource = this.model.get("selectedProtein");
                var prots = dataSource ? Array.from (dataSource.values()) : [];
                prots.sort (function(a,b) { return a.name.localeCompare (b.name); });
                var tabs = d3.select(this.el).select("div.panelInner");
                
                tabs.select("h1.infoHeader").text("Selected Info for "+prots.length+" Protein"+(prots.length !== 1 ? "s" : ""));
                
                var self = this;

                var rowFilterFunc = function (d) {   
                    var entries = d3.entries(d);
                    console.log ("pe", entries);
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
                
                var cellFunc = function(d) { 
                    d3.select(this).html (d.value);
                };
                
                var headerFunc = function(d) { return d.name.replace("_", " "); };
                
                CLMSUI.utils.sectionTable.call (this, tabs, prots, "protInfo", ["Property", "Value"], headerFunc, rowFilterFunc, cellFunc);
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
            

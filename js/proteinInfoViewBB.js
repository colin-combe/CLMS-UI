//  protein info view
//
//  Martin Graham, Rappsilber Laboratory, 2015


var CLMSUI = CLMSUI || {};

CLMSUI.ProteinInfoViewBB = CLMSUI.utils.BaseFrameView.extend({
    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({
            "mouseenter .sectionTable h2": "highlightProteins",
            "mouseleave .sectionTable h2": "unhighlightProteins",
        }, parentEvents, {});
    },

    defaultOptions: {
        fixedFontKeys: d3.set(["sequence", "seq"]),
        removeTheseKeys: d3.set(["canonicalSeq", "seq_mods", "filteredNotDecoyNotLinearCrossLinks", "hidden"]),
        expandTheseKeys: d3.set(["uniprotFeatures", "meta"]),
    },

    initialize: function(viewOptions) {
        CLMSUI.ProteinInfoViewBB.__super__.initialize.apply(this, arguments);

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);
        mainDivSel.append("div")
            .attr("class", "panelInner")
            .classed("proteinInfoPanel", true)
            .append("h1")
            .attr("class", "infoHeader")
            .text("Info for 0 Selected Proteins");

        this.listenTo(this.model, "change:selectedProteins proteinMetadataUpdated", this.render);
        this.listenTo(this.model, "filteringDone change:selection change:highlights", this.showCrossLinksState);
        this.listenTo(this.model, "change:highlightedProteins", this.showProteinHighlightsState);

        return this;
    },

    render: function() {
        // only render if visible
        console.log("prot info render called");
        if (this.isVisible()) {
            var dataSource = this.model.get("selectedProteins");
            var prots = dataSource; // ? CLMS.arrayFromMapValues(dataSource) : [];
            prots.sort(function(a, b) {
                return a.name.localeCompare(b.name);
            });
            var tabs = d3.select(this.el).select("div.panelInner");

            tabs.select("h1.infoHeader")
                .text("Info for " + prots.length + " Selected Protein" + (prots.length !== 1 ? "s" : ""));

            var self = this;

            var rowFilterFunc = function(d) {
                var entries = d3.entries(d);
                var badKeys = self.options.removeTheseKeys;
                return entries.filter(function(entry) {
                    if ($.isArray(entry.value)) {
                        entry.value = entry.value.length;
                    } else if (entry.key === "sequence") {
                        entry.value = self.makeInteractiveSeqString(d, d.sequence, d.crossLinks, true);
                    }
                    return !($.isFunction(entry.value) || (badKeys && badKeys.has(entry.key)));
                });
            };

            var cellFunc = function(d, i) {
                d3.select(this).html(i === 0 ? d.value.replace("_", " ") : d.value);
            };

            var headerFunc = function(d) {
                return d.name.replace("_", " ");
            };

            CLMSUI.utils.sectionTable.call(this, tabs, prots, "protInfo", ["Property", "Value"], headerFunc, rowFilterFunc, cellFunc, [0]);

            tabs.selectAll("span.hit")
                .on("click", function() {
                    var idArray = self.splitDataAttr(d3.select(this), "data-linkids");
                    var crossLinks = self.getCrossLinksFromIDs(idArray, true);
                    self.model.setMarkedCrossLinks("selection", crossLinks, true, d3.event.ctrlKey);
                })
                .on("mouseover", function() {
                    //console.log ("model", self.model);
                    var d3sel = d3.select(this);
                    var idArray = self.splitDataAttr(d3sel, "data-linkids");
                    var crossLinks = self.getCrossLinksFromIDs(idArray, true);
                    var posData = self.splitDataAttr(d3sel, "data-pos", "_");
                    var interactor = self.model.get("clmsModel").get("participants").get(posData[0]);

                    self.model.get("tooltipModel")
                        .set("header", "Cross-Linked with " + CLMSUI.modelUtils.makeTooltipTitle.residue(interactor, +posData[1]))
                        .set("contents", CLMSUI.modelUtils.makeTooltipContents.multilinks(crossLinks, posData[0], +posData[1]))
                        .set("location", {
                            pageX: d3.event.pageX,
                            pageY: d3.event.pageY
                        });
                    self.model.setMarkedCrossLinks("highlights", crossLinks, true, false);
                })
                .on("mouseout", function() {
                    self.model.get("tooltipModel").set("contents", null);
                    self.model.setMarkedCrossLinks("highlights", [], false, false);
                });

            this.showCrossLinksState();
        }

        return this;
    },

    showCrossLinksState: function() {
        var self = this;
        //console.log ("in prot info filter");
        if (this.isVisible()) {
            var selectedLinks = self.model.getMarkedCrossLinks("selection");
            var selidset = d3.set(_.pluck(selectedLinks, "id"));
            var highlightedLinks = self.model.getMarkedCrossLinks("highlights");
            var highidset = d3.set(_.pluck(highlightedLinks, "id"));

            d3.select(this.el).selectAll("span.hit")
                .each(function() {
                    var d3sel = d3.select(this);
                    var idArray = self.splitDataAttr(d3sel, "data-linkids");
                    var crossLinks = self.getCrossLinksFromIDs(idArray, true);
                    //d3sel.classed ("filteredOutResidue", crossLinks.length === 0);
                    var selYes = crossLinks.some(function(xlink) {
                        return selidset.has(xlink.id);
                    });
                    //d3sel.classed ("selected", selYes);
                    var highYes = crossLinks.some(function(xlink) {
                        return highidset.has(xlink.id);
                    });
                    //d3sel.classed ("highlighted", highYes);

                    // setting attr("class") once as a string is multiple times quicker than 3x .classed calls (roughly 5-6x quicker)
                    var classStr = ["hit"]; // maintain the span element's hit class state
                    if (crossLinks.length === 0) {
                        classStr.push("filteredOutResidue");
                    }
                    if (selYes) {
                        classStr.push("selected");
                    }
                    if (highYes) {
                        classStr.push("highlighted");
                    }
                    d3sel.attr("class", classStr.join(" "));
                });
        }
        return this;
    },

    showProteinHighlightsState: function() {
        var highlightSet = d3.set(_.pluck(this.model.get("highlightedProteins"), "id"));
        d3.select(this.el).selectAll(".sectionTable h2")
            .classed("highlighted", function(d) {
                return highlightSet.has(d.id);
            });
        return this;
    },

    highlightProteins: function(evt) {
        this.model.setHighlightedProteins([d3.select(evt.target).datum()]);
        return this;
    },

    unhighlightProteins: function() {
        this.model.setHighlightedProteins([]);
        return this;
    },

    splitDataAttr: function(d3sel, dataAttrName, splitChar) {
        var ids = d3sel.attr(dataAttrName);
        return ids ? ids.split(splitChar || ",") : [];
    },

    getCrossLinksFromIDs: function(linkIDs, filter) {
        linkIDs = d3.set(linkIDs).values(); // strips out duplicates

        var allLinks = this.model.get("clmsModel").get("crossLinks");
        var crossLinks = linkIDs.map(function(linkId) {
            return allLinks.get(linkId);
        });

        if (filter) {
            crossLinks = crossLinks.filter(function(xlink) {
                return xlink.filteredMatches_pp.length > 0;
            });
        }
        return crossLinks;
    },

    makeInteractiveSeqString: function(protein, seq, xlinks, filterDecoys) {
        var proteinId = protein.id;
        if (filterDecoys) {
            xlinks = xlinks.filter(function(xlink) {
                return !xlink.isDecoyLink();
            });
        }
        var map = d3.map(xlinks, function(d) {
            return d.id;
        });
        var endPoints = {};
        map.forEach(function(id, xlink) { // saves calculating values() - map.values().forEach (function (xlink)
            if (proteinId === xlink.fromProtein.id) {
                var fromRes = xlink.fromResidue;
                endPoints[fromRes] = endPoints[fromRes] || [];
                endPoints[fromRes].push(xlink);
            }
            //added check for no toProtein (for linears)
            //if ( /*!xlink.isLinearLink() &&*/ xlink.isSelfLink()) { // if linear then will fail for selflink anyways
            if (!xlink.isLinearLink() && proteinId === xlink.toProtein.id) { // if linear then will fail for selflink anyways
                var toRes = xlink.toResidue;
                // In cases of homomultimers linking same residue indices, don't add twice
                if (toRes !== xlink.fromResidue || proteinId !== xlink.fromProtein.id) {
                    endPoints[toRes] = endPoints[toRes] || [];
                    endPoints[toRes].push(xlink);
                }
            }
        });
        var endPointEntries = d3.entries(endPoints);
        endPointEntries.sort(function(a, b) {
            return a.key - b.key;
        });

        var strSegs = [];
        var last = 0;
        endPointEntries.forEach(function(ep) {
            var pos = +ep.key;
            var linkIds = _.pluck(ep.value, "id");
            strSegs.push(seq.slice(last, pos - 1));
            strSegs.push("<span class='hit' data-pos='" + (proteinId + "_" + pos) + "' data-linkids='" + linkIds.join(",") + "'>" + seq.charAt(pos - 1) + "</span>");
            last = pos;
        });
        strSegs.push(seq.slice(last, seq.length));
        var iStr = strSegs.join("");
        //console.log ("iStr", iStr);

        return iStr;
    },

    identifier: "Selected Protein Info",
});

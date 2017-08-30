
    var CLMSUI = CLMSUI || {};

    CLMSUI.SelectionTableViewBB = Backbone.View.extend ({
        events: {},

        initialize: function (options) {
            this.options = options;
            var holdingDiv = d3.select(this.el).append("DIV").attr("class", "selectView");
            holdingDiv.html ("<div class='controlBar'><span class='pager'></span><span class='crossLinkTotal'></span></DIV><DIV class='scrollHolder'><TABLE><THEAD><TR></TR></THEAD></TABLE></DIV>");

            // redraw table on filter change if crosslinks selected (matches may have changed)
            this.listenTo (this.model, "filteringDone", function () {
                //~ if (this.model.get("selection").length > 0) {
                    this.render();
                //~ }
            });

            // rerender if a match's validation details have changed
            this.listenTo (this.model, "matchValidationStateUpdated", function () {
                //~ if (this.model.get("selection").length > 0) {
                    this.render();
                //~ }
            });
            
            this.listenTo (this.model, "change:selection", function () {
                //~ if (this.model.get("selection").length > 0) {
                    this.render();
                //~ }
            });
            
            // highlight selected match table row (or not if nothing selected)
            this.listenTo (this.model, "change:lastSelectedMatch", function () {
                var selMatch = this.model.get("lastSelectedMatch");
                this.clearTableHighlights();
                if (selMatch && selMatch.match) {
                    d3.select(this.el).select("tr#match"+selMatch.match.id).classed ("spectrumShown2", true);
                }
            });

            var tableDataPropOrder = [
                "id","ambiguity", "protein1", "pepPos1", "pepSeq1raw", "linkPos1",
                "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score", 
                "autovalidated", "validated", "group", "runName", "scanNumber", 
                "precursorCharge", "expMZ", "expMass", "matchMZ", "matchMass", "massError", //"precursorIntensity",
            ];

            this.headerLabels = {
                "id": "PSM ID",
                "ambiguity": "Ambiguity",
                "protein1": "Protein 1",
                "pepPos1": "Pep Pos",
                "pepSeq1raw": "Pep 1 Sequence",
                "linkPos1": "Link Pos",
                "protein2": "Protein 2",
                "pepPos2": "Pep Pos",
                "pepSeq2raw": "Pep 2 Sequence",
                "linkPos2": "Link Pos",
                "score": "Score",
                "autovalidated": "Auto",
                "validated": "Manual",
                "group": "Group",
                "runName": "Run Name",
                "scanNumber": "Scan Number",
                "precursorCharge": "Charge",
                "expMZ": "Exp M/Z",
                "expMass": "Exp Mass",
                "matchMZ": "Match M/Z",
                "matchMass": "Match Mass",
                "massError": "Mass Error",
                //~ "precursorIntensity": "Intensity",
            };

            this.numberColumns = d3.set (["ambiguity", "score", "linkPos1", "linkPos2", "pepPos1", "pepPos2", "precursorCharge", "expMZ", "expMass", "matchMZ", "matchMass", "massError", "precursorItensity", ]);
            this.colSectionStarts = d3.set (["protein1", "protein2", "score"]);//i added protein1 also - cc
            this.monospacedColumns = d3.set (["pepSeq1raw", "pepSeq2raw"]);
            this.maxWidthColumns = d3.set (["protein1", "protein2"]);

            // entries commented out until a replacement is found for xlv
            var headerFilterFuncs = {
                "ambiguity": function () { return false; },
                //~ "protein1": function () { return false; },
                //~ "protein2": function () { return false; },
                //~ "pepPos1": function () { return false; },
                //~ "pepPos2": function () { return false; },
                "autovalidated": function () { return CLMSUI.compositeModelInst.get("clmsModel").get("autoValidatedPresent");},
                "validated": function () { return true;} //CLMS.model.manualValidatedFound; },
            };

            this.filteredProps = tableDataPropOrder.filter(
                function (prop) {
                    var f = headerFilterFuncs [prop];
                    return f ? f() : true;
                }
            );

            var self = this;
            //var twoZeroPadder = d3.format(".2f");
            var massZeroPadder = d3.format(".6f");
            this.cellFuncs = {
                    "id": function (d) { return d.id; },
                    "ambiguity": function (d) { return d.matchedPeptides[0].prt.length *
                                    ((d.matchedPeptides[1].prt.length != 0)? d.matchedPeptides[1].prt.length : 1); },
                    "protein1": function (d) {
                        return CLMSUI.utils.proteinConcat (d, 0, self.model.get("clmsModel"));
                    },
                    "protein2": function (d) {
                        return CLMSUI.utils.proteinConcat (d, 1, self.model.get("clmsModel"));
                    },
                    "runName": function(d) { return d.runName(); },
                    "group": function(d) { return d.group(); },
                    "pepPos1": function(d) { return CLMSUI.utils.pepPosConcat (d, 0); },
                    "pepPos2": function(d) { return CLMSUI.utils.pepPosConcat (d, 1); },
                    "pepSeq1raw": function(d) { return d.matchedPeptides[0].seq_mods; },
                    "pepSeq2raw": function(d) {
                        var dmp1 = d.matchedPeptides[1];
                        return dmp1 ? dmp1.seq_mods : "";
					},
                    "linkPos1": function(d) { return d.linkPos1; },
                    "linkPos2": function(d) { return d.linkPos2; },
                    "score": function (d) { return d.score;}, //temp hack//twoZeroPadder (d.score); },
                  
					"expMZ": function(d) { return massZeroPadder (d.expMZ()); },
					"expMass": function(d) { return massZeroPadder (d.expMass()); },
					"matchMZ": function(d) { return massZeroPadder (d.matchMZ()); },
					"matchMass": function(d) { return massZeroPadder (d.matchMass()); },
					"massError": function(d) { return massZeroPadder (d.massError()); },
            		//~ "precursorIntensity": function(d) { return d.precursorIntensity; },
            };

            this.page = 1;
            this.pageSize = 50;
            var pager = d3.select(this.el).select(".pager");
            if (!self.options.mainModel) {
                pager.append("span").text("Page:");

                pager.append("input")
                    .attr ("type", "number" )
                    .attr ("min", "1" )
                    .attr ("max", "999" )
                    .style ("display", "inline-block")
                    .on ("input", function () {
                        // this check stops deleting final character resetting page to 1 all the time
                        if (d3.event.inputType !== "deleteContentBackward" && this.value) { // "deleteContentBackward" is chrome specific
                            self.setPage(this.value);
                        }
                    });
            } else {
                pager.append("span").text("Alternative Explanations");
            }
            
            d3.select(this.el).select(".controlBar").insert("span", ":first-child").text(this.identifier);
         },

        render: function () {
            this.updateTable ();
        },

        updateTable: function () {
            this.selectedXLinkArray = this.model.getMarkedCrossLinks("selection")
                .filter (function (xlink) { return xlink.filteredMatches_pp.length > 0; })
                .sort (function (a,b) { return b.filteredMatches_pp[0].match.score - a.filteredMatches_pp[0].match.score; })    // sorts links by top match score
            ;
            var selectedXLinkCount = this.selectedXLinkArray.length;

            var self = this;

            // draw if selected crosslink count > 0 or is 'freshly' zero
            if (selectedXLinkCount > 0 || this.lastCount > 0) {
                this.lastCount = selectedXLinkCount;
                console.log ("rendering table view of selected crosslinks", this, this.model);

                var headerRow = d3.select(this.el).select("THEAD TR");
                var headerJoin = headerRow.selectAll("TH").data(this.filteredProps, function(d) { return d; });

                headerJoin.exit().remove();
                // See https://github.com/mbostock/d3/issues/2722 as I kick off about case sensitivity
                headerJoin.enter().append("th")
                    .html (function(d) { return self.headerLabels[d]; })
                    .classed ("colSectionStart", function(d) {
                        return self.colSectionStarts.has(d);
                    })
                ;

                this.setPage(this.page);
            }
        },

        clearTableHighlights : function() {
            d3.select(this.el).selectAll("tr").classed('spectrumShown2', false);
        },

        setPage : function (pg) {
            var pageCount = Math.floor(this.selectedXLinkArray.length / this.pageSize) + 1;
            pg = Math.max (Math.min (pg, pageCount), 1);
            this.page = pg;
            var input = d3.select(this.el).select(".pager>input");
            input.property("value", pg);
            var panelHeading = d3.select(this.el).select(".crossLinkTotal");
            var selectedXLinkCount = this.selectedXLinkArray.length;
            var lower = (selectedXLinkCount === 0)? 0 : ((pg - 1) * this.pageSize) + 1;
            var upper = (pg * this.pageSize);
            if (upper > selectedXLinkCount) {
                upper = selectedXLinkCount;
            }
            panelHeading.text(lower + " - " + upper + " of " +
                selectedXLinkCount + " Cross-Link" + ((selectedXLinkCount != 1)? "s":""));
            var tablePage = this.selectedXLinkArray.slice((this.page - 1) * this.pageSize,
                                                this.page * this.pageSize);
            this.addRows (tablePage, this.filteredProps);
            console.log ("PAGE SET");
        },

        addRows : function (selectedLinkArray, filteredProps) {
            var self = this;
            //var proteinMap = this.model.get("clmsModel").get("participants");

            var colspan = d3.select(this.el).select("THEAD").selectAll("TH").size();    // get number of TH elements in header for colspan purposes

            // helper functions
            // return filtered matches from given crosslink
            var getMatches = function (xlink) {
                return _.pluck (xlink.filteredMatches_pp, "match");
            };

            // make nice id string from cross link object
            var niceCrossLinkName = function (crosslink /*, i */) {
                return /*(i+1)+". "+*/"Matches for "+crosslink.fromProtein.name+", "
                    + (crosslink.isLinearLink() ? "linear peptides" : (crosslink.fromResidue+" --- "
                    +  crosslink.toProtein.name+", "+crosslink.toResidue));
            };

            // table building starts here
            // match crosslinks up to tbody sections
            var xlinkTBodyJoin = d3.select(this.el).select("TABLE").selectAll("TBODY")
                .data(selectedLinkArray, function(d) { return d.id; })
            ;

            xlinkTBodyJoin.exit().remove();
            xlinkTBodyJoin.enter()
                .append("TBODY")
                .append("TR")
                    .append("TD")
                    .attr ("colspan", colspan)
            ;
            xlinkTBodyJoin.order(); // reorder existing dom elements so they are in same order as data (selectedLinkArray)
            
            // all tbody
            xlinkTBodyJoin
                .select("TR")
                    .select("TD")
                    .text (niceCrossLinkName)
            ;


            // Within each tbody section, match rows up to matches within each crosslink
            var tjoin = xlinkTBodyJoin.selectAll("TR.matchRow").data (function(d) { return getMatches(d); }, function(d) { return d.id; });
            tjoin.exit().remove();
            tjoin.enter().append("tr").attr("class", "matchRow");
            tjoin.order();
            tjoin
                .attr("id", function(d) { return 'match'+d.id; })
                .on("click", function(d) {
                    var mainModel = self.options.mainModel;
                    if (mainModel) {
						//TODO: fix?
						//~ if (mainModel.get("clmsModel").get("matches").has(d.id) == true) {
							//~ d3.select(".validationControls").style("display", "block");
						//~ } else {
							//~ d3.select(".validationControls").style("display", "none");
                        //~ }
						mainModel.set ("lastSelectedMatch", {match: d, directSelection: true});
                    } else {
                    	d3.select(".validationControls").style("display", "block");
                    }
                    if (d.src) { // if the src att is missing its from a csv file
						self.model.trigger("change:lastSelectedMatch", self.model, {match: d, directSelection: true});
					}
                })
                .classed ("spectrumShown2", function(d) {
                    var lsm = self.model.get("lastSelectedMatch");
                    return lsm && lsm.match ? lsm.match.id === d.id : false;
                })
            ;

            // Within each row, match cells up to individual pieces of match information
            var cellJoin = tjoin.selectAll("TD").data (this.filteredProps, function(d) { return d; });
            cellJoin.exit().remove();
            cellJoin.enter().append("td");
            
            var getText = function (d) {
                var link = d3.select(this.parentNode).datum();
                var cellFunc = self.cellFuncs[d];
                return cellFunc ? cellFunc(link) : (link[d] || "");
            };

            cellJoin
                .classed ("number", function(d) {
                    return self.numberColumns.has(d);
                })
                .classed ("colSectionStart", function(d) {
                    return self.colSectionStarts.has(d);
                })
                .classed ("monospaced", function(d) {
                    return self.monospacedColumns.has(d);
                })
                .classed ("maxWidth", function (d) {
                    return self.maxWidthColumns.has (d);
                })
                .text (getText)
                .each (function (d) {
                    if (self.maxWidthColumns.has (d)) {
                        d3.select(this).attr("title", getText.call (this, d));
                    }
                })
            ;
        },

        setVisible: function (show) {
            d3.select(this.el).style('display', show ? 'block' : 'none');
            if (show) {
                this.render();
            }
        },
        
        identifier: "Match Table",
    });

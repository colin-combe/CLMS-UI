var CLMSUI = CLMSUI || {};

CLMSUI.SelectionTableViewBB = Backbone.View.extend({
    events: {
        "mouseenter tr.matchRow": "highlight",
        "mouseleave table": "highlight",
    },

    initialize: function (options) {
        this.options = options || {};
        var holdingDiv = d3.select(this.el).append("DIV").attr("class", "selectView verticalFlexContainer");
        holdingDiv.html("<div class='controlBar'><span class='pager'></span><span class='crossLinkTotal'></span></DIV><DIV class='scrollHolder'><TABLE><THEAD><TR></TR></THEAD></TABLE></DIV>");

        // redraw table on filter change if any of 1) filtering done, 2) match validation state updated, or 3) crosslinks selected (matches may have changed)
        this.listenTo (this.model, "filteringDone matchValidationStateUpdated selectionMatchesLinksChanged", function () {
            //~ if (this.model.get("selection").length > 0) {
            this.render();
            //~ }
        });

        // emphasise selected match table row (or not if nothing selected)
        this.listenTo(this.model, "change:lastSelectedMatch", function (model, selMatch) {
            this.clearCurrentRowHighlight();
            if (selMatch && selMatch.match) {
                d3.select(this.el).select("tr#match" + selMatch.match.id).classed("spectrumShown2", true);
            }
        });
        
		// emphasise highlighted (brushed) match table rows
        this.listenTo (this.model, "change:match_highlights", function (model, highlightedMatches) {
            this.setTableHighlights (highlightedMatches.values());
        });
        

        var tableDataPropOrder = [
                "id", "ambiguity", "protein1", "pepPos1", "pepSeq1raw", "linkPos1",
                "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score",
                "autovalidated", "validated", "group", "runName", "scanNumber",
                "precursorCharge", "expMZ", "expMass", "matchMZ", "matchMass", "massError",
                "precursorIntensity", "elutionStart", "elutionEnd",
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
            "matchMZ": "Calc M/Z",
            "matchMass": "Calc Mass",
            "massError": "Mass Error",
            "precursorIntensity": "Intensity",
            "elutionStart": "Elut.Start",
            "elutionEnd": "Elut.End",
        };

        this.numberColumns = d3.set(["ambiguity", "score", "linkPos1", "linkPos2", "pepPos1", "pepPos2", "precursorCharge", "expMZ", "expMass", "matchMZ", "matchMass", "massError", "precursorItensity", ]);
        this.colSectionStarts = d3.set(["protein1", "protein2", "score"]); //i added protein1 also - cc
        this.monospacedColumns = d3.set(["pepSeq1raw", "pepSeq2raw"]);
        this.maxWidthColumns = d3.set(["protein1", "protein2"]);

        // entries commented out until a replacement is found for xlv
        var headerFilterFuncs = {
            "ambiguity": function () {
                return false;
            },
            //~ "protein1": function () { return false; },
            //~ "protein2": function () { return false; },
            //~ "pepPos1": function () { return false; },
            //~ "pepPos2": function () { return false; },
            "autovalidated": function () {
                return false;//CLMSUI.compositeModelInst.get("clmsModel").get("autoValidatedPresent");
            },
            "validated": function () {
                return false;
            }, //CLMS.model.manualValidatedFound; },
            "precursorIntensity": function () {return false;},
            "elutionStart": function () {return false;},
            "elutionEnd": function () {return false;}
        };

        this.filteredProps = tableDataPropOrder.filter(
            function (prop) {
                var f = headerFilterFuncs[prop];
                return f ? f() : true;
            }
        );

        var self = this;
        var twoZeroPadder = d3.format(".2f");
        var massZeroPadder = d3.format(".6f");
		var scientific = d3.format(".4e");
        this.cellFuncs = {
            "id": function (d) {
                return d.id;
            },
            "ambiguity": function (d) {
                return d.matchedPeptides[0].prt.length *
                    ((d.matchedPeptides[1].prt.length != 0) ? d.matchedPeptides[1].prt.length : 1);
            },
            "protein1": function (d) {
                return CLMSUI.utils.proteinConcat(d, 0, self.model.get("clmsModel"));
            },
            "protein2": function (d) {
                return CLMSUI.utils.proteinConcat(d, 1, self.model.get("clmsModel"));
            },
            "runName": function (d) {
                return d.runName();
            },
            "group": function (d) {
                return d.group();
            },
            "pepPos1": function (d) {
                return CLMSUI.utils.pepPosConcat(d, 0);
            },
            "pepPos2": function (d) {
                return CLMSUI.utils.pepPosConcat(d, 1);
            },
            "pepSeq1raw": function (d) {
                return d.matchedPeptides[0].seq_mods;
            },
            "pepSeq2raw": function (d) {
                var dmp1 = d.matchedPeptides[1];
                return dmp1 ? dmp1.seq_mods : "";
            },
            "linkPos1": function (d) {
                return d.linkPos1;
            },
            "linkPos2": function (d) {
                return d.linkPos2;
            },
            "score": function (d) {
                return twoZeroPadder(d.score);
            }, //temp hack//twoZeroPadder (d.score); },

            "expMZ": function (d) {
                return massZeroPadder(d.expMZ);
            },
            "expMass": function (d) {
                return massZeroPadder(d.expMass());
            },
            "matchMZ": function (d) {
                return massZeroPadder(d.calcMZ);
            },
            "matchMass": function (d) {
                return massZeroPadder(d.calcMass());
            },
            "massError": function (d) {
                return massZeroPadder(d.massError());
            },
            "precursorIntensity": function(d) { return scientific (d.precursor_intensity); },
            "elutionStart": function(d) { return d.elution_time_start; },
            "elutionEnd": function(d) { return d.elution_time_end; },
        };

        this.page = 1;
        this.pageSize = this.options.pageSize || 20;
        var pager = d3.select(this.el).select(".pager");
        if (!self.options.mainModel) {
            pager.append("span").text("Page:");

            pager.append("input")
                .attr("type", "number")
                .attr("min", "1")
                .attr("max", "999")
                .style("display", "inline-block")
                .on("input", function () {
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
        this.updateTable();
    },
    
    getMatches: function (xlink) {
        var selectedMatches = this.model.getMarkedMatches("selection");
        return _.pluck(xlink.filteredMatches_pp, "match")
            .filter(function (m) {
                return selectedMatches.has(m.id);
            }) // selection now done on a per-match basis
        ;
    },

    updateTable: function () {
        this.matchCountIndices = this.model.getMarkedCrossLinks("selection")
            // map to reduce filtered matches to selected matches only
             .map (function (xlink) {
                var selectedMatches = this.getMatches (xlink);
                return {id: xlink.id, link: xlink, matches: selectedMatches};
            }, this)
            // Then get rid of links with no selected and filtered matches
            .filter(function (selLinkMatchData) {
                return selLinkMatchData.matches.length;
            })
            // Then sort links by top remaining match score for each link
            .sort(function (a, b) {
                return b.matches[0].score - a.matches[0].score;
            })
        ;
        
        var count = 0;
        // add count metadata to matchCountIndices
        this.matchCountIndices.forEach (function (selLinkMatchData) {
            selLinkMatchData.runningTotalStart = count;
            count += selLinkMatchData.matches.length;
            selLinkMatchData.runningTotalEnd = count;
        });
        
        var selectedXLinkCount = this.matchCountIndices.length;

        var self = this;

        // draw if selected crosslink count > 0 or is 'freshly' zero
        if (selectedXLinkCount > 0 || this.lastCount > 0) {
            this.lastCount = selectedXLinkCount;
            console.log("rendering table view of selected crosslinks", this, this.model);

            var headerRow = d3.select(this.el).select("THEAD TR");
            var headerJoin = headerRow.selectAll("TH").data(this.filteredProps, function (d) { return d; });

            headerJoin.exit().remove();
            // See https://github.com/mbostock/d3/issues/2722 as I kick off about case sensitivity
            headerJoin.enter().append("th")
                .html(function (d) {
                    return self.headerLabels[d];
                })
                .classed("colSectionStart", function (d) {
                    return self.colSectionStarts.has(d);
                });

            this.setPage(this.page);
        }
    },

    setPage: function (pg) {
        // limit page number and set text elements
        var mci = this.matchCountIndices;
        var totalSelectedFilteredMatches = mci.length ? mci[mci.length - 1].runningTotalEnd : 0;

        //var pageCount = Math.floor(this.selectedXLinkArray.length / this.pageSize) + 1;
        var pageCount = Math.floor (totalSelectedFilteredMatches / this.pageSize) + 1;
        pg = Math.max (Math.min (pg, pageCount), 1);
        this.page = pg;
        var input = d3.select(this.el).select(".pager>input");
        input.property("value", pg);
              
        var limit = totalSelectedFilteredMatches; // selectedXLinkCount;
        var lower = (limit === 0) ? 0 : ((pg - 1) * this.pageSize) + 1;
        var upper = Math.min (pg * this.pageSize, limit);
        
        var lowerPageCount = (this.page - 1) * this.pageSize;
        var upperPageCount = lowerPageCount + this.pageSize;
        var bisect = d3.bisector (function(d) { return d.runningTotalEnd; });
        var lowerLink = bisect.right (mci, lowerPageCount);
        var upperLink = bisect.left (mci, upperPageCount);
        upperLink = Math.min (upperLink, mci.length - 1);
        var matchBounds = {};
        if (mci.length) {
            // set bounds for start and end matches
            matchBounds.startMatch = lowerPageCount - mci[lowerLink].runningTotalStart;
            matchBounds.endMatch = upperPageCount - mci[upperLink].runningTotalStart;
        }
        //console.log ("bisect", mci, lowerLink, upperLink, matchBounds);
        
        var panelHeading = d3.select(this.el).select(".crossLinkTotal");
        var commaFormat = d3.format(",");
        var selectedXLinkCount = this.matchCountIndices.length;
        panelHeading.text (
            commaFormat(lower) + " - " + commaFormat(upper) + " of " +
            commaFormat(totalSelectedFilteredMatches) + " Selected Match"+((totalSelectedFilteredMatches != 1) ? "es" : "")
            + " across "+
            commaFormat(selectedXLinkCount) + " Cross-Link" + ((selectedXLinkCount !== 1) ? "s" : "")
        );
        
        var tablePage = this.matchCountIndices.slice (lowerLink, upperLink + 1);
        this.addRows (tablePage, this.filteredProps, matchBounds);
    },

    // code that maintains the rows in the table
    addRows: function (selectedLinkArray, filteredProps, firstLastLinkMatchBounds) {
        filteredProps = filteredProps || this.filteredProps;
        var self = this;
        //var proteinMap = this.model.get("clmsModel").get("participants");
        var identityFunc = function (d) {
            return d.id;
        };

        var colspan = d3.select(this.el).select("THEAD").selectAll("TH").size(); // get number of TH elements in header for colspan purposes

        // helper function
        // make nice id string from cross link object
        var niceCrossLinkName = function (crosslink /*, i */ ) {
            var matchCount = crosslink.runningTotalEnd - crosslink.runningTotalStart;
            crosslink = crosslink.link;
            return /*(i+1)+". "+*/ matchCount+" Selected Match"+(matchCount > 1 ? "es" : "")+" for " + crosslink.fromProtein.name + ", " +
                (crosslink.isLinearLink() ? "linear peptides" : (crosslink.fromResidue + " --- " +
                    crosslink.toProtein.name + ", " + crosslink.toResidue));
        };

        // table building starts here
        // match crosslinks up to tbody sections
        var xlinkTBodyJoin = d3.select(this.el).select("TABLE").selectAll("TBODY")
            .data(selectedLinkArray, identityFunc);

        xlinkTBodyJoin.exit().remove();
        xlinkTBodyJoin.enter()
            .append("TBODY")
            .append("TR")
            .append("TD")
            .attr("colspan", colspan)
        ;
        xlinkTBodyJoin.order(); // reorder existing dom elements so they are in same order as data (selectedLinkArray)

        // all tbody
        xlinkTBodyJoin
            .select("TR>TD")
            .text(niceCrossLinkName)
        ;


        // Within each tbody section, match table rows up to matches within each crosslink
        var tjoin = xlinkTBodyJoin.selectAll("TR.matchRow").data(function (d, i) {
            var md = d.matches; //self.getMatches (d.link);
            // paging by matches means we may begin part way through a link's matches and end partway through a link's matches
            if (i === 0 || i === selectedLinkArray.length - 1) {
                md = md.slice (
                    i === 0 ? firstLastLinkMatchBounds.startMatch || 0 : 0, 
                    i === selectedLinkArray.length - 1 ? firstLastLinkMatchBounds.endMatch || md.length : md.length
                );
            }
            return md;
        }, identityFunc);
        tjoin.exit().remove();
        tjoin.enter().append("tr")
            .attr("class", "matchRow")
            .attr("id", function (d) {
                return 'match' + d.id;
            }) // since we key the rows on d.id this won't change, so we can set it for all time in enter()
            .on("click", function (d) {
                var mainModel = self.options.mainModel;
                if (mainModel) {
                    //TODO: fix?
                    //~ if (mainModel.get("clmsModel").get("matches").has(d.id) == true) {
                    //~ d3.select(".validationControls").style("display", "block");
                    //~ } else {
                    //~ d3.select(".validationControls").style("display", "none");
                    //~ }
                    mainModel.set("lastSelectedMatch", {
                        match: d,
                        directSelection: true
                    });
                } else {
                    d3.select(".validationControls").style("display", "block");
                }
                if (d.src) { // if the src att is missing its from a csv file
                    self.model.trigger("change:lastSelectedMatch", self.model, {
                        match: d,
                        directSelection: true
                    });
                }
            });
        tjoin.order();
        tjoin
            .classed("spectrumShown2", function (d) {
                var lsm = self.model.get("lastSelectedMatch");
                return lsm && lsm.match ? lsm.match.id === d.id : false;
            });

        
        // Within each row, match cells up to individual pieces of match information
        var possClasses = ["number", "colSectionStart", "monospaced", "maxWidth"];
        var cellJoin = tjoin.selectAll("TD").data(filteredProps /*, function(d) { return d; }*/ );
        cellJoin.exit().remove();
        cellJoin.enter()
            .append("td")
            // this is quicker than doing individual .classed (or an aggregated .classed even)
            // but only safe to use if confident these are the only possible classes applicable to these elements
            // individual .classed = ~37.5% of addRows time, .attr("class") = ~11% of addRows time
            .attr("class", function (d) {
                var states = [
                        self.numberColumns.has(d),
                        self.colSectionStarts.has(d),
                        self.monospacedColumns.has(d),
                        self.maxWidthColumns.has(d),
                    ];
                var classes = possClasses.filter(function (cd, ci) {
                    return states[ci];
                });
                return classes.join(" ");
            })
        // The above states shouldn't change over the cells lifetime, so do it once in enter rather than repeatedly in the () selection below
        ;

        var getText = function (d) {
            var link = d3.select(this.parentNode).datum();
            var cellFunc = self.cellFuncs[d];
            return cellFunc ? cellFunc(link) : (link[d] || "");
        };

        cellJoin
            /*
            .classed ("number", function(d) {
                return self.numberColumns.has(d);
            })
            .classed ("colSectionStart", function(d) {
                return self.colSectionStarts.has(d);
            })
            .classed ("monospaced", function(d) {
                return self.monospacedColumns.has(d),
                
            })
            .classed ("maxWidth", function (d) {
                return self.maxWidthColumns.has (d);
            })
            */
            .text(getText)
            .each(function (d) {
                /*
                d3.select(this).classed ({
                    number: self.numberColumns.has(d),
                    colSectionStart: self.colSectionStarts.has(d),
                    monospaced: self.monospacedColumns.has(d),
                    maxWidth: self.maxWidthColumns.has (d),
                });
                */

                if (self.maxWidthColumns.has(d)) {
                    d3.select(this).attr("title", getText.call(this, d));
                }
            });
    },

    setVisible: function (show) {
        d3.select(this.el).style('display', show ? 'block' : 'none');
        if (show) {
            this.render();
        }
    },
    
    clearCurrentRowHighlight: function () {
        d3.select(this.el).selectAll("tr").classed('spectrumShown2', false);
        return this;
    },
    
    setTableHighlights: function (highlightedMatches) {
        var highlightedMatchIDs = d3.set (_.pluck (highlightedMatches, "id"));
        d3.select(this.el).selectAll("tr.matchRow").classed("highlighted", function(d) {
            return highlightedMatchIDs.has (d.id);
        });
        return this;
    },
    
    // this is called when mouse moved over a row
    // and should via the backbone models and events eventually call setTableHighlights above too
    highlight: function (evt) {
        var datum = d3.select(evt.currentTarget).datum();
        this.model.setMarkedMatches ("highlights", datum ? [{match: datum}] : [], true, evt.ctrlKey || evt.shiftKey);
        return this;
    },

    identifier: "Selected Match Table",
});

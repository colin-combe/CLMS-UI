
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.SelectionTableViewBB = Backbone.View.extend ({
        events: {},

        initialize: function (options) {
			this.options = options;
            var holdingDiv = d3.select(this.el).append("DIV").attr("class", "selectView");
            holdingDiv.html ("<DIV class='crossLinkTotal'></DIV><DIV class='scrollHolder'><TABLE><THEAD><TR></TR></THEAD></TABLE></DIV>"); 
            
            // redraw table on filter change if crosslinks selected (matches may have changed)
            this.listenTo (this.model, "filteringDone", function () {
                if (this.model.get("selection").length > 0) {
                    this.render();
                }  
            });
            
            // rerender if a match's validation details have changed
            this.listenTo (this.model, "matchValidationStateUpdated", function () {
                if (this.model.get("selection").length > 0) {
                    this.render();
                }  
            });            
            /*
            this.listenTo (this.model, "change:selection", function () {
                if (this.model.get("selection").length > 0) {
                    this.render();
                }  
            });
            */
            // highlight selected match table row (or not if nothing selected)
            this.listenTo (this.model, "change:lastSelectedMatch", function () {
                var selMatch = this.model.get("lastSelectedMatch");
                this.clearTableHighlights();
                if (selMatch && selMatch.match) {
                    d3.select(this.el).select("tr#match"+selMatch.match.id).classed ("spectrumShown2", true);
                }
            }); 
         },
        
        render: function () {
            this.updateTable ();
		},
        
        updateTable: function () {
            var selectedXLinkArray = this.model.get("selection")
                .filter (function (xlink) { return xlink.filteredMatchesAndPeptidePositions.length > 0; })
                .sort (function (a,b) { return b.filteredMatchesAndPeptidePositions[0].match.score - a.filteredMatchesAndPeptidePositions[0].match.score; })    // sorts links by top match score
            ;
            var selectedXLinkCount = selectedXLinkArray.length;
            
            var self = this;
                
            var panelHeading = d3.select(this.el).select(".crossLinkTotal");
            if (!self.options.secondaryModel) {
				panelHeading.text(selectedXLinkCount+" CrossLink"+(selectedXLinkCount !== 1 ? "s" : "")+ " selected.");
			} else {
				panelHeading.text("Alternative Explanations:");
			}
            // draw if selected crosslink count > 0 or is 'freshly' zero
            if (selectedXLinkCount > 0 || this.lastCount > 0) {
                this.lastCount = selectedXLinkCount;
                console.log ("rendering table view of selected crosslinks", this, this.model);
                
                var tableDataPropOrder = [
                    "protein1", "pepPos1", "pepSeq1raw", "linkPos1", 
                    "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score", "precursorCharge",
                    "autovalidated", "validated", "group", "runName", "scanNumber",
                ];       
                                                                                   
                var headerLabels = {
                   "protein1": "Protein 1",
                    "pepPos1": "Pep Pos",
                    "pepSeq1raw": "Pep Sequence",
                    "linkPos1": "Link Pos",
                    "protein2": "Protein 2",
                    "pepPos2": "Pep Pos",
                    "pepSeq2raw": "Pep Sequence",
                    "linkPos2": "Link Pos",
                    "score": "Score",
                    "autovalidated": "Auto",
                    "validated": "Manual",
                    "group": "Group",
                    "runName": "Run Name",
                    "scanNumber": "Scan Number",    
                    "precursorCharge": "Charge",
                };
                
                this.numberColumns = d3.set (["score", "linkPos1", "linkPos2", "pepPos1", "pepPos2", "precursorCharge"]);
                this.colSectionStarts = d3.set (["protein2", "score"]);
                this.monospacedColumns = d3.set (["pepSeq1raw", "pepSeq2raw"]);
                
                // entries commented out until a replacement is found for xlv
                var headerFilterFuncs = {
                    "autovalidated": function () { return CLMS.model.autoValidatedFound; },
                    "validated": function () { return CLMS.model.manualValidatedFound; },
                };
                
                var filteredProps = tableDataPropOrder.filter(
                    function (prop) { 
                        var f = headerFilterFuncs [prop];
                        return f ? f() : true;
                    }
                );
                                                                                   
                var headerRow = d3.select(this.el).select("THEAD TR");
                var headerJoin = headerRow.selectAll("TH").data(filteredProps, function(d) { return d; });
                
                headerJoin.exit().remove();
                // See https://github.com/mbostock/d3/issues/2722 as I kick off about case sensitivity
                headerJoin.enter().append("th")
                    .html (function(d) { return headerLabels[d]; })
                    .classed ("colSectionStart", function(d) {
                        return self.colSectionStarts.has(d);
                    })
                ;

                this.addRows (selectedXLinkArray, filteredProps);
            }
        },


        clearTableHighlights : function() {
            d3.select(this.el).selectAll("tr").classed('spectrumShown2', false);
        },

    
        addRows : function (selectedLinkArray, filteredProps) {   
            var self = this;
            var proteinMap = this.model.get("clmsModel").get("interactors");
            
            var colspan = d3.select(this.el).select("THEAD").selectAll("TH").size();    // get number of TH elements in header for colspan purposes
            
            // helper functions
            // return filtered matches from given crosslink
            var getMatches = function (xlink) {
                var matches = xlink.filteredMatchesAndPeptidePositions.map (function (m) {
                    return m.match;
                });
                return matches;
            };
                                    
            // make nice id string from cross link object
            var niceCrossLinkName = function (crosslink, i) {
                return /*(i+1)+". "+*/"Matches for "+crosslink.fromProtein.name+", "
                    + (crosslink.toProtein? (crosslink.fromResidue+" --- "
                    +  crosslink.toProtein.name+", "+crosslink.toResidue) : "linear peptides");     
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
					var secondaryModel = self.options.secondaryModel;
					if (secondaryModel) {
						secondaryModel.set ("lastSelectedMatch", {match: d, directSelection: true});
					} else {
						self.model.set ("lastSelectedMatch", {match: d, directSelection: true});
					}
                })
                .classed ("spectrumShown2", function(d) {
                    var lsm = self.model.get("lastSelectedMatch");
                    return lsm && lsm.match ? lsm.match.id === d.id : false;
                })
            ;
        
            // Within each row, match cells up to individual pieces of match information
            var cellJoin = tjoin.selectAll("TD").data (filteredProps, function(d) { return d; });
            cellJoin.exit().remove();
            cellJoin.enter().append("td");
            
        
            var cellFuncs = {
                "protein1": function (d) { return CLMSUI.utils.proteinConcat (d, "protein1"); },
                "protein2": function (d) { return CLMSUI.utils.proteinConcat (d, "protein2"); },
                "pepPos1": function(d) { return CLMSUI.utils.arrayConcat (d, "pepPos1"); },
                "pepPos2": function(d) { return CLMSUI.utils.arrayConcat (d, "pepPos2"); },
                "linkPos1": function(d) { return d.linkPos1; },
                "linkPos2": function(d) { return d.linkPos2; },
                "score": function (d) { return d.score; },
                // .controller is not a property of a match, but manual / auto will be filtered out at
                // header stage eventually anyways
                /*
                "validated": function () { return d.controller.manualValidatedFound ? d.validated : ""; },
                "autoValidated": function () { return d.controller.autoValidatedFound ? d.autoValidated : ""; },
                */
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
                .text (function (d) {
                    var link = d3.select(this.parentNode).datum();
                    var cellFunc = cellFuncs[d];
                    return cellFunc ? cellFunc(link) : (link[d] || "");
                })
            ;
        },
        
        setVisible: function (show) {
            d3.select(this.el).style('display', show ? 'block' : 'none');
            if (show) {
                this.render();
            }
        },
    });

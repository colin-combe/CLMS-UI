(function (global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.SelectionTableViewBB = global.Backbone.View.extend ({
        events: {},

        initialize: function () {
            var holdingDiv = d3.select(this.el).append("DIV").attr("class", "selectView");
            holdingDiv.html ("<TABLE><THEAD><TR></TR></THEAD><TBODY></TBODY></TABLE>"); 
        },
        
        render: function () {
            this.updateTable ();
        },
        
        updateTable: function () {
            console.log("MODEL", this.model);
            var selectedXLinkArray = this.model.get("selection");

            if (selectedXLinkArray.length > 0) {
                
                var tableDataPropOrder = [
                    "protein1", "pepPos1", "pepSeq1raw", "linkPos1", 
                    "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score",
                    "autovalidated", "validated", "group", "runName", "scanNumber",
                ];       
                                                                                   
                var headerLabels = {
                   "protein1": "Protein1",
                    "pepPos1": "PepPos1",
                    "pepSeq1raw": "PepSeq1",
                    "linkPos1": "LinkPos1",
                    "protein2": "Protein2",
                    "pepPos2": "PepPos2",
                    "pepSeq2raw": "PepSeq2",
                    "linkPos2": "LinkPos2",
                    "score": "Score",
                    "autovalidated": "Auto",
                    "validated": "Manual",
                    "group": "Group",
                    "runName": "Run Name",
                    "scanNumber": "Scan Number",		
                };
                
                // entries commented out until a replacement is found for xlv
                var headerFilterFuncs = {
                    //"autovalidated": function () { return xlv.autoValidatedFound; },
                    //"validated": function () { return xlv.manualValidatedFound; },
                };
                
                var filteredProps = tableDataPropOrder.filter(
                    function (prop) { 
                        var f = headerFilterFuncs [prop];
                        return f ? f() : true;
                    }
                );
                                                                                   
                var headerRow = d3.select(this.el).select("THEAD TR");
                console.log ("headerRow", headerRow, filteredProps, headerRow.selectAll("TH"));
                var headerJoin = headerRow.selectAll("TH").data(filteredProps, function(d) { return d; });
                
                headerJoin.exit().remove();
                // See https://github.com/mbostock/d3/issues/2722 as I kick off about case sensitivity
                headerJoin.enter().append("th")
                    .text (function(d) { return headerLabels[d]; })
                ;

                this.addRows (filteredProps);
            }
        },


        clearTableHighlights : function() {
            d3.select(this.el).selectAll("tr").classed('spectrumShown', false);
        },

    
        addRows : function (filteredProps) {   
            var self = this;
            var selectedLinkArray = this.model.get("selection");

            // make fresh array with protein links expanded out into constituent residue links
            var resLinks = [];
            selectedLinkArray.forEach (function(link) {
                link.filteredMatches.forEach (function (m) {
                    resLinks.push (m[0]);
                });
                /*
                if (link.residueLinks) {   //its a ProteinLink
                    resLinks.push.apply (resLinks, link.residueLinks.values());
                } else {    //must be ResidueLink
                    resLinks.push (link);			
                }		
                */
            });
            console.log ("resLinks", resLinks);
        
            var tbody = d3.select(this.el).select("TBODY");
            var tjoin = tbody.selectAll("TR").data (resLinks, function(d) { return d.id; });
        
            tjoin.exit().remove();
            tjoin.enter().append("tr");
        
            if (typeof loadSpectra == "function") {
                tjoin
                    .attr("id", function(d) { return 'match'+d.id; })
                    .on("click", function(d) {
                        loadSpectra (d.id, d.pepSeq1, d.linkPos1, d.pepSeq2, d.linkPos2);
                        self.clearTableHighlights();
                        d3.selectAll("#match"+d.id).attr("class", "spectrumShown");
                    })
                ;
            }
        
            var cellJoin = tjoin.selectAll("TD").data(filteredProps, function(d) { return d; });
            cellJoin.exit().remove();
            cellJoin.enter().append("td");
        
            var cellFuncs = {
                "score": function (d) { 
                    return ((typeof d.score !== 'undefined')? d.score.toFixed(4) : 'undefined'); 
                },
                // .controller is not a property of a match, but manual / auto will be filtered out at
                // header stage eventually anyways
                /*
                "validated": function () { 
                    return d.controller.manualValidatedFound ? d.validated : "";
                },
                "autoValidated": function () { 
                    return d.controller.autoValidatedFound ? d.autoValidated : "";
                },
                */
            };
        
            cellJoin.text (function (d, i, ii) {
                var link = resLinks [ii];
                console.log ("link", link);
                var cellFunc = cellFuncs[d];
                return cellFunc ? cellFunc(link) : link[d];
            });
        },
        
        setVisible: function (show) {
            var current = d3.select(this.el).style("display");
            var next = show ? 'block' : 'none';
            d3.select(this.el).style('display', next);
            if (current !== next) {
                
            }
            if (show) {
                this.render();
            }
        },
    });
    
} (this));

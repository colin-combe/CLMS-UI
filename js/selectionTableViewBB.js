
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.SelectionTableViewBB = Backbone.View.extend ({
        events: {},

        initialize: function () {
            var holdingDiv = d3.select(this.el).append("DIV").attr("class", "selectView");
            holdingDiv.html ("<DIV class='crossLinkTotal'></DIV><DIV class='scrollHolder'><TABLE><THEAD><TR></TR></THEAD></TABLE></DIV>"); 
        },
        
        render: function () {
            this.updateTable ();
        },
        
        updateTable: function () {
            var selectedXLinkArray = this.model.get("selection").filter (
                function (xlink) { return xlink.filteredMatches.length > 0; }
            );
            var selectedXLinkCount = selectedXLinkArray.length;
            
            d3.select(this.el).select(".crossLinkTotal").text(selectedXLinkCount+" CrossLink"+(selectedXLinkCount !== 1 ? "s" : "")+ " selected.");

            // draw if selected crosslink count > 0 or is 'freshly' zero
            if (selectedXLinkCount > 0 || this.lastCount > 0) {
                this.lastCount = selectedXLinkCount;
                console.log ("rendering table view of selected crosslinks", this, this.model);
                
                var tableDataPropOrder = [
                    "protein1", "pepPos1", "pepSeq1raw", "linkPos1", 
                    "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score",
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
                };
                
                var self = this;
                this.numberColumns = d3.set (["score", "linkPos1", "linkPos2", "pepPos1", "pepPos2"]);
                this.colSectionStarts = d3.set (["protein2", "score"]);
                this.monospacedColumns = d3.set (["pepSeq1raw", "pepSeq2raw"]);
                
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
            d3.select(this.el).selectAll("tr").classed('spectrumShown', false);
        },

    
        addRows : function (selectedLinkArray, filteredProps) {   
            var self = this;
            var proteinMap = this.model.get("clmsModel").get("interactors");
            
            var colspan = d3.select(this.el).select("THEAD").selectAll("TH").size();    // get number of TH elements in header for colspan purposes
            
            // helper functions
            // return filtered matches from given crosslink
            var getMatches = function (xlink) {
                var matches = xlink.filteredMatches.map (function (m) {
                    return m[0];
                });
                return matches;
            };
            
            // return comma-separated list of protein names from array of protein ids
            var proteinConcat = function (d, field) {
                var pnames =  d[field].map (function(pid) { return proteinMap.get(pid).name; });
                return pnames.join(",");
            };
            
            var arrayConcat = function (d, field) {
                return d[field].length ? d[field].join(", ") : d[field];
            };
            
            // make nice id string from cross link object
            var niceCrossLinkName = function (crosslink, i) {
                return /*(i+1)+". "+*/"Matches for "+crosslink.fromProtein.name+", "+crosslink.fromResidue+" --- "+crosslink.toProtein.name+", "+crosslink.toResidue;      
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
        
            tjoin
                .attr("id", function(d) { return 'match'+d.id; })
                .on("click", function(d) {
                    CLMSUI.vent.trigger ("individualMatchSelected", d);
                    self.clearTableHighlights();
                    d3.select(this).classed ("spectrumShown", true);
                })
            ;
        
            // Within each row, match cells up to individual pieces of match information
            var cellJoin = tjoin.selectAll("TD").data(filteredProps, function(d) { return d; });
            cellJoin.exit().remove();
            cellJoin.enter().append("td");
            
        
            var cellFuncs = {
                "protein1": function (d) { return proteinConcat (d, "protein1"); },
                "protein2": function (d) { return proteinConcat (d, "protein2"); },
                "pepPos1": function(d) { return arrayConcat (d, "pepPos1"); },
                "pepPos2": function(d) { return arrayConcat (d, "pepPos2"); },
                "linkPos1": function(d) { return arrayConcat (d, "linkPos1"); },
                "linkPos2": function(d) { return arrayConcat (d, "linkPos2"); },
                "score": function (d) { return ((typeof d.score !== 'undefined')? d.score.toFixed(2) : 'undefined'); },
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

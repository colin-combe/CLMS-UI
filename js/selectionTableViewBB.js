
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
            console.log ("table model", this.model);
            
            var selectedXLinkArray = this.model.get("selection");
            var selectedXLinkCount = selectedXLinkArray.length;
            
            d3.select(this.el).select(".crossLinkTotal").text(selectedXLinkCount+" CrossLink"+(selectedXLinkCount > 1 ? "s" : "")+ " selected.");

            if (selectedXLinkCount > 0) {
                
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
            var proteinMap = this.model.get("clmsModel").get("interactors");

            console.log ("selectedLinks", selectedLinkArray);
            
            var colspan = d3.select(this.el).select("THEAD").selectAll("TH").size();    // get number of TH elements in header for colspan purposes
            
            // helper functions
            // return filtered matches from given crosslink
            var getMatches = function (xlink) {
                var matches = xlink.filteredMatches.map (function (m) {
                    return m[0];
                });
                console.log ("xlink matches", xlink, matches);
                return matches;
            };
            
            // return comma-separated list of protein names from array of protein ids
            var proteinConcat = function (d, field) {
                var pnames =  d[field].map (function(pid) { return proteinMap.get(pid).name; });
                return pnames.join(",");
            };
            
            // make nice id string from cross link object
            var niceCrossLinkName = function (crosslink) {
                return crosslink.fromProtein.name+", "+crosslink.fromResidue+" --- "+crosslink.toResidue+", "+crosslink.toProtein.name;      
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
                    .text (function(d,i) { return (i+1)+". "+niceCrossLinkName(d); })
            ;
            
            
            // Within each tbody section, match rows up to matches within each crosslink
            var tjoin = xlinkTBodyJoin.selectAll("TR.matchRow").data (function(d) { return getMatches(d); }, function(d) { return d.id; });
            tjoin.exit().remove();
            tjoin.enter().append("tr").attr("class", "matchRow");
        
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
        
            // Within each row, match cells up to individual pieces of match information
            var cellJoin = tjoin.selectAll("TD").data(filteredProps, function(d) { return d; });
            cellJoin.exit().remove();
            cellJoin.enter().append("td");
        
            var cellFuncs = {
                "protein1": function (d) {
                    return proteinConcat (d, "protein1");
                },
                "protein2": function (d) {
                    return proteinConcat (d, "protein2");
                },
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
        
            cellJoin.text (function (d) {
                var link = d3.select(this.parentNode).datum();
                //console.log ("link", link);
                var cellFunc = cellFuncs[d];
                return cellFunc ? cellFunc(link) : (link[d] || "empty");
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
    

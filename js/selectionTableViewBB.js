(function (global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.SelectionTableViewBB = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.SelectionTableViewBB.__super__.initialize.apply (this, arguments);
            
            var topDiv = d3.select(this.el).append("DIV").attr("class", "selectView");
            topDiv.html ("<TABLE><THEAD><TR></TR></THEAD><TBODY></TBODY></TABLE>"); 
        },
        
        render: function () {
            updateTable ();
        },
        
        updateTable: function () {
            //console.log("SELECTED:", selectedLinks);
            var selectionDiv = this.el;
            var selectedLinkArray = this.model.get("selection");
            var selectedLinkCount = selectedLinkArray.length;

            var bd = d3.select('#bottomDiv');
            var splt = d3.select('#splitterDiv');

            if (selectedLinkCount === 0) {
                //selectionDiv.innerHTML = "<p>No selection.</p>" + 
                //	"<p>To hide this panel click the X in its top right corner or uncheck the selection checkbox in the top right of the window.</p>";
                this.setVisible (false);
                //this.showSelectionPanel(false);

            }
            else {
                
                if (selectionShown == false) {
                    //showSelectionPanel(true);
                    this.setVisible (true);
                }
                
                var tableDataPropOrder = [
                    "protein1", "pepPos1", "pepSeq1raw", "linkPos1", 
                    "protein2", "pepPos2", "pepSeq2raw", "linkPos2", "score",
                    "autovalidated", "validated", "group", "runName", "scanNumber",
                ];       
                                                                                   
                var headerLabels = {
                   "protein1": "Protein1",
																			"pepPos1": "PepPos1",
																			"pepSeq1Raw": "PepSeq1",
																			"linkPos1": "LinkPos1",
																			"protein2": "Protein2",
																			"pepPos2": "PepPos2",
																			"pepSeq2Raw": "PepSeq2",
																			"linkPos2": "LinkPos2",
																			"score": "Score",
																			"autovalidated": "Auto",
																			"validated": "Manual",
																			"group": "Group",
																			"runName": "Run Name",
																			"scanNumber": "Scan Number",		
                };
                
                var headerFilterFuncs = {
                    "autovalidated": function () { return xlv.autoValidatedFound; },
                    "validated": function () { return xlv.manualValidatedFound; },
                };
                
                var filteredProps = tableDataPropOrder.filter(
                    function (prop) { 
                        var f = headerFilterFuncs [prop];
                        return f ? f() : true;
                    }
                );
                                                                                   
                var headerRow = d3.select(this.el).select("THEAD TR");
                var headerJoin = headerRow.selectAll("TH").data(filteredProps);
                
                headerJoin.exit().remove();
                headerJoin.enter().append("TH")
                    .attr ("text", function(d) { return headerLabels[d]; })
                ;

                this.addRows (filteredProps)
            }
        },


        clearTableHighlights : function() {
            d3.select(this.el).selectAll("tr").classed('spectrumShown', false);
        },

    
        addRows : function (filteredProps) {   
            var selectionDiv = this.el;
            var selectedLinkArray = this.model.get("selection");

            // make fresh array with protein links expanded out into constituent residue links
            var resLinks = [];
            selectedLinkArray.forEach (function(link) {
                if (link.residueLinks) {   //its a ProteinLink
                    resLinks.push.apply (resLinks, link.residueLinks.values());
                } else {    //must be ResidueLink
                    resLinks.push (link);			
                }		
            });

        
            var tbody = d3.select(this.el).select("TBODY");
            var tjoin = tbody.selectAll("TR").data (resLinks, function(d) { return d.id; });
        
            tjoin.exit.remove();
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
            cellJoin.enter().append("TD");
        
            var cellFuncs = {
                "score": function (d) { 
                    return ((typeof d.score !== 'undefined')? d.score.toFixed(4) : 'undefined'); 
                },
                "validated": function () { 
                    return d.controller.manualValidatedFound ? d.validated : "";
                },
                "autoValidated": function () { 
                    return d.controller.autoValidatedFound ? d.autoValidated : "";
                },
            };
        
            cellJoin.text (function (d, i, ii) {
                var link = resLinks [ii];
                var cellFunc = cellFuncs[d];
                return cellFunc ? cellFunc[link] : link[d];
            });
        },
        
         // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            global.CLMSUI.DistogramBB.__super__.remove.apply (this, arguments);    
        
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();
        },
    });
    
} (this));

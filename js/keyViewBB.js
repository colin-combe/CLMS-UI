var CLMSUI = CLMSUI || {};

CLMSUI.KeyViewBB = CLMSUI.utils.BaseFrameView.extend ({
     events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
              "change input[type='color']": "changeColour",
              "click .downloadButton3": "downloadKey",
          });
    },
    
    initialize: function (viewOptions) {
        CLMSUI.KeyViewBB.__super__.initialize.apply (this, arguments);
        
        var topDiv = d3.select(this.el).append("div")
            .attr("class", "verticalFlexContainer keyPanel")
            .html("<div class='toolbar'></div><div class='panelInner' flex-grow='1'></div><img src='./images/logos/rappsilber-lab-small.png'/>")
        ;         
        this.controlDiv = topDiv.select(".toolbar");
        this.controlDiv.append("button")
            .attr ("class", "downloadButton3 btn btn-1 btn-1a")
            .text ("Download Link Colour Scheme as SVG")
        ;
        this.controlDiv.append("p").attr("id", "linkColourDropdownPlaceholder");
        
        var chartDiv = topDiv.select(".panelInner");
        var svgs = {
            clinkp : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke'/>",
            ambigp : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke ambiguous'/>",
            multip : "<line x1='0' y1='15' x2='50' y2='15' class='multiLinkStroke'/><line x1='0' y1='15' x2='50' y2='15' class='defaultStroke'/>",
            selflinkp: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='defaultStroke selfLink'/>",
            selflinkpc: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='defaultStroke selfLink homomultimer dynColour'/>",
            clinkr : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke dynColour'/>",
            ambigr : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke ambiguous dynColour'/>",
            selflinkr: "<path d='m 3,28 v -10 a 15,15 0 0 1 30,0 v 10' class='defaultStroke selfLink dynColour'/>",
            homom: "<path d='m 18,2 q -9,25, 0,27 q 9,-2 0,-27' class='defaultStroke selfLink homomultimer dynColour'/>",
            selflinkinter: "<path d='m 3,28 l 14,-20 l 14,20' class='defaultStroke selfLink dynColour'/>",
            linkmodpep: "<path d='m 12,2 v 25 l -8,-5 l 8,-5' class='defaultStroke selfLink dynColour filled'/><path d='m 30,2 v 25 l -8,-5 l 8,-5' class='defaultStroke ambiguous selfLink dynColour'/>",
            highlight: "<rect x='0' y='8' width='50' height ='15' class='highlighted'/><text x='24' y='18' class='peptideAAText'>LIEKFLR<text>"
        };
        
        var texts = {
            clinkp: "Cross-Link(s) between different proteins",
            ambigp: "Ambiguous Cross-Link(s)",
            multip: "Multiple Linkage Sites",
            selflinkp: "Self Cross-Link(s); could include Cross-Links not between the same molecule of same protein",
            selflinkpc: "Self Cross-Link(s); definitely includes Cross-Links not between the same molecule of same protein",
            clinkr: "Cross Link between different proteins",
            ambigr: "Ambiguous Cross-Link",
            selflinkr: "Self Cross-Link in same protein. Could link either same or two different molecules",
            homom: "Self Cross-Link with Overlapping Peptides. Cannot be the same molecule, so either between two different molecules of same protein (Homomultimeric) or a mis-identification",
            selflinkinter: "Intra-molecular Self Link (definitely links same molecule e.g. from internally linked peptide)",
            linkmodpep: "Linker modified peptide (unfilled = ambiguous)",
            highlight: "Highlighted linked peptide",
        };
        
        var sectionData = [
            {
                id: "colourKey",
                header: "Link Colour Scheme",
                rows: []
            },
            {
                id: "proteinKey",
                header: "Protein-Protein Level",
                rows: ["clinkp", "ambigp", "multip", "selflinkp", "selflinkpc"].map (function(row) {
                    return [row, texts[row]];
                })
            },
            {
                id: "residueKey",
                header: "Residue Level",
                rows: ["clinkr", "ambigr", "selflinkr", "homom", /*"selflinkinter", "linkmodpep",*/ "highlight"].map (function(row) {
                    return [row, texts[row]];
                })
            },
        ];
        
        var headerFunc = function(d) { return d.header.replace("_", " "); };
        var rowFilterFunc = function(d) { 
            return d.rows.map (function(row) {
                return {key: row[0], value: row[1]};
            });
        };
        var cellFunc = function (d,i) {
            var sel = d3.select(this);
            if (i === 0) {
                sel.append("svg")
                    .attr ("class", "miniKey")
                    .html (svgs[d.value])
                ;       
            } else {
                sel.text (d.value);
            }
        };
		
		var self = this;
		var clickFunc = function (showSection, d) {
			if (showSection && d.header === "Link Colour Scheme" && self.sliderSubView) {
				self.sliderSubView.show (true);
			}
		}
        
        CLMSUI.utils.sectionTable.call (this, chartDiv, sectionData, "keyInfo", ["Mark", "Meaning"], headerFunc, rowFilterFunc, cellFunc, [0], clickFunc);
        
        var colScheme = CLMSUI.linkColour.defaultColoursBB;
        var notLinear = function () { return false; };
        var cols = {
            intra: {isSelfLink: function () { return true; }, isLinearLink: notLinear, filteredMatches_pp: [],}, 
            homom: {isSelfLink: function () { return true; }, isLinearLink: notLinear, confirmedHomomultimer: true, filteredMatches_pp: [{match: {confirmedHomomultimer: true}}],}, 
            inter: {isSelfLink: function () { return false; }, isLinearLink: notLinear, filteredMatches_pp: [],}
        };
        d3.keys(cols).forEach (function(key) {
            cols[key].colour = colScheme.getColour(cols[key]);
            //console.log ("key", key, cols[key]);
        }/*, colScheme*/);
        
        chartDiv.selectAll("table").selectAll("path.dynColour,line.dynColour")
            .each (function() {
                var d3Sel = d3.select(this);
                var colType = d3Sel.classed("selfLink") ? (d3Sel.classed("homomultimer") ? "homom" : "intra") : "inter";
                var colour = cols[colType].colour;
                d3Sel.style("stroke", colour);
                if (d3Sel.classed("filled")) {
                    d3Sel.style("fill", colour);  
                }
            })
        ;
            
        this.listenTo (this.model, "change:linkColourAssignment", this.render);
        // update is only triggered once when adding/removing multiple models to/from a collection
        this.listenTo (CLMSUI.linkColour.Collection, "update", this.render);
        
        return this;
    },
    
    changeColour: function (evt) {
        var colourAssign = this.model.get("linkColourAssignment");
        if (colourAssign) {
            var newValue = evt.target.value;
            var rowData = d3.select(evt.target.parentNode.parentNode).datum();
            var i = rowData[rowData.length - 1];
            var colScale = colourAssign.get("colScale");
            colScale.range()[i] = newValue;
            // this will fire a change event for this colour model
            colourAssign.setRange (colScale.range());
        }
    },
	
	relayout: function () {
		//console.log ("dragend fired");
		var colourAssign = this.model.get("linkColourAssignment");
		if (colourAssign && colourAssign.get("type") === "threshold" && this.sliderSubView) {
			this.sliderSubView.resize().render();
		}
		return this;
	},
    
    render: function () {
		
        var colourSection =[{
            header: "Link Colour Scheme",
            rows: []
        }];
        
        //console.log ("RERENDER COLOUR KEYS", arguments);
        
        var colourAssign = this.model.get("linkColourAssignment");
        if (colourAssign) {
            var colScale = colourAssign.get("colScale");

            colourSection[0].rows = colourAssign.get("labels").range().map (function (val, i) {
                var rgbCol = colScale.range()[i];
                var rgbHex = d3.rgb(rgbCol).toString();
                var span = "<input type='color' value='"+rgbHex+"' title='Press to change colour for "+val+"'/>";
                return [span, val, i];
            });

            var updateSection = d3.select(this.el).selectAll("section").data(colourSection, function(d) { return d.header; });
            updateSection.select("h2 span").text(function(d) { return d.header+": "+colourAssign.get("title"); });

            var rowSel = updateSection.select("tbody").selectAll("tr")
                .data(function(d) { return d.rows; }, function (d) { return !d.rows ? d.join(",") : ""; }) // key function = all fields joined
            ;
            rowSel.exit().remove();
            rowSel.enter().append("tr");

            var cellSel = rowSel.selectAll("td").data(function(d) { return d.slice(0,2); });
            cellSel
                .enter()
                .append("td")
                .html (function(d) { return d; })
            ;
			
			// always remove old sliderSubView if present
			if (this.sliderSubView) {
				this.sliderSubView.remove();
				this.sliderSubView = null;
			}
	
			// add in new sliderview if appropriate
			if (colourAssign.get("type") === "threshold") {		
				var pid = this.el.id;
				var tcs = updateSection.select(".threecs");
				if (tcs.empty()) {
					updateSection.select("table tbody").append("tr").append("td")
						.attr("colspan", 2)
						.append("div")
							.attr("id", pid+"3cs")
							.attr("class", "threecs")
					;
				}
				
				this.sliderSubView = new CLMSUI.ThreeColourSliderBB ({
					el: "#"+pid+"3cs",
					model: colourAssign,
					unitText: " Å",
					title: colourAssign.get("title")+" Cutoffs",
					orientation: "horizontal",
					absolutePosition: false,
					sliderThickness: 25,
				})
					.show (true)
				;
				
				d3.select("#"+pid).selectAll(".brushValueText").style("display", "none");
			}
        }
        
        return this;
    },
    
    downloadKey: function () {
        var tempSVG = d3.select(this.el).append("svg").attr("class", "temp");
        CLMSUI.utils.updateColourKey (this.model, tempSVG);
        this.downloadSVG (null, tempSVG);
        tempSVG.remove();
    },
    
    identifier: "Xi Legend",
});

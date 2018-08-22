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
            .html("<div class='toolbar'></div><div class='panelInner' flex-grow='1'></div>")
        ;         
        this.controlDiv = topDiv.select(".toolbar");
        this.controlDiv.append("label").attr("id", "linkColourDropdownPlaceholder");
        
        var chartDiv = topDiv.select(".panelInner");
		
		this.setupColourSection (chartDiv);
		this.setupLegendSection (chartDiv);
           
        this.listenTo (this.model, "change:linkColourAssignment", this.render);
        // update is only triggered once when adding/removing multiple models to/from a collection
        this.listenTo (CLMSUI.linkColour.Collection, "update", this.render);
        
        return this;
    },
	
	setupColourSection: function (chartDiv) {
		var sectionDiv = chartDiv.append("div");
		//sectionDiv.append("h3").text("Chosen Colour Scheme Legend").attr("class", "groupHeader");
		
		var sectionData = [
            {
                id: "colourKey",
                header: "Current Cross-Link Colour Scheme",
                rows: [],
            },
		];
		
		var headerFunc = function(d) { return d.header.replace("_", " "); };
        var rowFilterFunc = function(d) { 
            return d.rows.map (function(row) {
                return {key: row[0], value: row[1]};
            });
        };
        var cellFunc = function (d) {
            d3.select(this).text(d.value);
        };
		var self = this;
		var clickFunc = function (showSection, d) {
			if (showSection && d.id === "colourKey" && self.sliderSubView) {
				self.sliderSubView.show (true);
			}
		}
		
		CLMSUI.utils.sectionTable.call (this, sectionDiv, sectionData, "colourInfo", ["Colour (Editable)", "Meaning"], headerFunc, rowFilterFunc, cellFunc, [0], clickFunc);
		
		sectionDiv.append("button")
            .attr ("class", "downloadButton3 btn btn-1 btn-1a")
            .text ("Download This Colour Scheme as SVG")
        ;
	},
	
	setupLegendSection: function (chartDiv) {
		var sectionDiv = chartDiv.append("div");
		sectionDiv.append("h3").text("View Legends").attr("class", "groupHeader");
		
		var svgs = {
            clinkp : "<line x1='0' y1='15' x2='50' y2='15' class='monochrome'/>",
            ambigp : "<line x1='0' y1='15' x2='50' y2='15' class='monochrome ambiguous'/>",
            multip : "<line x1='0' y1='15' x2='50' y2='15' class='multiLinkStroke'/><line x1='0' y1='15' x2='50' y2='15' class='monochrome'/>",
            selflinkp: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='monochrome antialias'/>",
            selflinkpc: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='monochrome selfLink antialias homomultimer dynColour'/>",
			annotp: "<g class='antialias'><circle cx='25' cy='15' r='10' class='monochrome'></circle><path d='M 25 5 a 9 9 0 0 1 9 7 L 25 15 Z' class='annotationLegend'></path></g>",
            clinkr : "<line x1='0' y1='15' x2='50' y2='15' class='monochrome'/>",
            ambigr : "<line x1='0' y1='15' x2='50' y2='15' class='monochrome ambiguous'/>",
            selflinkr: "<path d='m 3,28 v -10 a 15,10 0 0 1 44,0 v 10' class='monochrome antialias'/>",
            homom: "<path d='m 25,2 q -9,25, 0,27 q 9,-2 0,-27' class='monochrome antialias'/>",
            selflinkinter: "<path d='m 3,28 l 14,-20 l 14,20' class='monochrome selfLink dynColour'/>",
            linkmodpep: "<path d='m 12,2 v 25 l -8,-5 l 8,-5' class='monochrome selfLink dynColour filled'/><path d='m 30,2 v 25 l -8,-5 l 8,-5' class='monochrome ambiguous selfLink dynColour'/>",
            highlight: "<rect x='0' y='8' width='50' height ='15' class='highlighted'/><text x='24' y='18' class='peptideAAText'>LIEKFLR<text>",
			annotr: "<rect x='3' y='10' width='44' height='10' class='monochrome'></rect><rect x='5' y='10' width='12' height='10' class='annotationLegend'></rect>",
			circleCrossLink: "<path d='m 3 15 q 22 -10, 44 0' class='monochrome antialias'></path>",
			circleAnnot:"<g class='antialias'><path d='m 3 10 a 50 50 0 0 0 44 0 l 3 10 a 50 50 0 0 1 -50 0 Z' class='circleNode'></path><path d='m 3 10 a 50 50 0 0 0 15 5 l -1 10 a 50 50 0 0 1 -17 -5 Z' class='annotationLegend' style='stroke:none;'></path></g>",
			scatterNormal: "<rect x='10' y='14' width='5' height='5' class='scatterNormal'></rect>",
			scatterDecoy: "<rect x='10' y='14' width='5' height='5' class='scatterDecoy'></rect>",
			scatterAmbig: "<rect x='10' y='14' width='5' height='5' class='scatterAmbig'></rect>",
			scatterHighlighted: "<rect x='10' y='14' width='5' height='5' class='scatterNormal highlighted'></rect>",
			scatterSelected: "<rect x='10' y='14' width='5' height='5' class='scatterNormal selected'></rect>",
			alignMatch: "<text x='24' y='18' class='peptideAAText'>LIEKFLR<text>",
			alignMissing: "<rect x='0' y='8' width='50' height ='15' class='seqDelete'/><text x='24' y='18' class='peptideAAText'>-------<text>",
			alignExtra: "<rect x='0' y='8' width='50' height ='15' class='seqInsert'/><text x='24' y='18' class='peptideAAText'>LIEKFLR<text>",
			alignVariation: "<rect x='0' y='8' width='50' height ='15' class='seqVar'/><text x='24' y='18' class='peptideAAText'>LIEKFLR<text>",
        };
        
        var texts = {
            clinkp: "Cross-Link(s) between different proteins.",
            ambigp: "Ambiguous Cross-Link(s).",
            multip: "Multiple Linkage Sites.",
            selflinkp: "Self Cross-Link(s); could include Cross-Links not between the same molecule of same protein.",
            selflinkpc: "Self Cross-Link(s); definitely includes Cross-Links not between the same molecule of same protein.",
			annotp: "Annotation range in contracted protein",
            clinkr: "Cross Link between different proteins.",
            ambigr: "Ambiguous Cross-Link.",
            selflinkr: "Self Cross-Link in same protein. Could link either the same or two different molecules of the same protein.",
            homom: "Self Cross-Link with Overlapping Peptides. Cannot be the same molecule, so it's either between two different molecules of the same protein (Homomultimeric) or a mis-identification.",
            selflinkinter: "Intra-molecular Self Link (definitely links same molecule e.g. from internally linked peptide).",
            linkmodpep: "Linker modified peptide (unfilled = ambiguous).",
            highlight: "Highlighted linked peptide (XiNet only).",
			annotr: "Annotation range in expanded protein",
			circleCrossLink: "Cross-Link",
			circleAnnot: "Annotation region in protein",
			scatterNormal: "Cross-Link or Match.",
			scatterDecoy: "Decoy Cross-Link or Match.",
			scatterAmbig: "Ambiguous Cross-Link or Match.",
			scatterHighlighted: "Highlighted Cross-Link or Match.",
			scatterSelected: "Selected Cross-Link or Match.",
			alignMatch: "Matching residues between sequences.",
			alignMissing: "Deleted/missing residues when compared to search sequence.",
			alignExtra: "Inserted/extra residues when compared to search sequence.",
			alignVariation: "Residue variations when compared to search sequence.",
        };
        

		var viewLegendSectionData = [
            {
                id: "proteinKey",
                header: "XiNet Protein-Protein Level Legend",
                rows: ["clinkp", "multip", "selflinkp", "selflinkpc", "ambigp", "annotp"].map (function(row) {
                    return [row, texts[row]];
                })
            },
            {
                id: "residueKey",
                header: "XiNet Residue Level Legend",
                rows: ["clinkr", "selflinkr", "homom", "ambigr", "highlight", "annotr"].map (function(row) {
                    return [row, texts[row]];
                })
            },
			{
                id: "circularKey",
                header: "Circular View Legend",
                rows: ["circleCrossLink", "homom", "ambigr", "circleAnnot"].map (function(row) {
                    return [row, texts[row]];
                })
            },
			{
                id: "matrixKey",
                header: "Matrix View Legend",
                rows: ["scatterNormal", "scatterAmbig", "scatterHighlighted", "scatterSelected"].map (function(row) {
                    return [row, texts[row]];
                })
            },
			{
                id: "scatterplotKey",
                header: "Scatterplot Legend",
                rows: ["scatterNormal", "scatterDecoy", "scatterAmbig", "scatterHighlighted", "scatterSelected"].map (function(row) {
                    return [row, texts[row]];
                })
            },
			{
                id: "alignmentKey",
                header: "Alignment Legend",
                rows: ["alignMatch", "alignMissing", "alignExtra", "alignVariation"].map (function(row) {
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
		
        
        CLMSUI.utils.sectionTable.call (this, sectionDiv, viewLegendSectionData, "keyInfo", ["Mark", "Meaning"], headerFunc, rowFilterFunc, cellFunc, [0], null);
        
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
        
        sectionDiv.selectAll("table").selectAll("path.dynColour,line.dynColour")
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
            header: "Current Cross-Link Colour Scheme",
            rows: []
        }];
        
		// Update colour key section
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
			
			// hide / disable various pieces of the table if the color scheme is uneditable
			var isFixed = colourAssign.get("fixed");
			if (isFixed) {
				updateSection.selectAll("input[type='color']").attr("title", "Not editable.");
			}
			updateSection.select("tbody").selectAll("input").property("disabled", isFixed);
			updateSection.select("caption").text(isFixed ? "Colour scheme is active, but not editable." : "");
			
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

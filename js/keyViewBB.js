var CLMSUI = CLMSUI || {};

CLMSUI.KeyViewBB = CLMSUI.utils.BaseFrameView.extend ({
    initialize: function () {
        CLMSUI.KeyViewBB.__super__.initialize.apply (this, arguments);
        
        var topDiv = d3.select(this.el).append("div")
            .attr("class", "panelInner")
            .html("<h1 class='infoHeader'>Xi Legend</h1><div class='panelInner'></div><img src='./images/logos/rappsilber-lab-small.png'/>")
        ;       
        var chartDiv = topDiv.select(".panelInner");

        
        var svgs = {
            clinkp : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke'/>",
            ambigp : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke ambiguous'/>",
            multip : "<line x1='0' y1='15' x2='50' y2='15' class='multiLinkStroke'/><line x1='0' y1='15' x2='50' y2='15' class='defaultStroke'/>",
            selflinkp: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='defaultStroke selfLink'/>",
            selflinkpc: "<path d='m 3,15 q 1.5,-10 9,-10 a 15,15 0 0 1 10,10 q 0,6 -10,9' class='defaultStroke selfLink homomultimer'/>",
            clinkr : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke dynColour'/>",
            ambigr : "<line x1='0' y1='15' x2='50' y2='15' class='defaultStroke ambiguous dynColour'/>",
            selflinkr: "<path d='m 3,28 v -10 a 15,15 0 0 1 30,0 v 10' class='defaultStroke selfLink dynColour'/>",
            homom: "<path d='m 18,2 q -9,25, 0,27 q 9,-2 0,-27' class='defaultStroke selfLink homomultimer'/>",
            selflinkinter: "<path d='m 3,28 l 14,-20 l 14,20' class='defaultStroke selfLink dynColour'/>",
            linkmodpep: "<path d='m 12,2 v 25 l -8,-5 l 8,-5' class='defaultStroke selfLink dynColour filled'/><path d='m 30,2 v 25 l -8,-5 l 8,-5' class='defaultStroke selfLink dynColour'/>",
            highlight: "<rect x='0' y='8' width='50' height ='15' class='highlighted'/><text x='24' y='18' class='peptideAAText'>LIEKFLR<text>"
        };
        
        var colScheme = CLMSUI.linkColour.defaultColours;
        var cols = {
            intra: {isSelfLink: function () { return true;}}, 
            inter: {isSelfLink: function () { return false;}}
        };
        d3.keys(cols).forEach (function(key) {
            cols[key].colour = colScheme (cols[key]);
        });
        console.log ("cols", cols);
        
        var sections = [
            {
                id: "proteinKey",
                header: "Protein-protein level",
                rows: [
                    ["clinkp", "Cross-link"],
                    ["ambigp", "Ambiguous"],
                    ["multip", "Multiple Linkage Sites"],
                    ["selflinkp", "Self-link; possibly inter- or intra-molecular"],
                    ["selflinkpc", "Self-link; includes confirmed inter-molecular"],
                ]
            },
            {
                id: "residueKey",
                header: "Residue level",
                rows: [
                    ["clinkr", "Cross-link"],
                    ["ambigr", "Ambiguous"],
                    ["selflinkr", "Self-link (inter- or intra-molecular)"],
                    ["homom", "Inter-molecular self-link (homomultimeric link)"],
                    ["selflinkinter", "Intra-molecular self link (e.g. from internally linked peptide)"],
                    ["linkmodpep", "Linker modified peptide (unfilled = ambiguous)"],
                    ["highlight", "Highlighted linked peptide"],
                ]
            },
            {
                id: "colourKey",
                header: "Colour Scheme",
                rows: []
            }
        ];
        
         var setArrow = function (d) {
            var assocTable = d3.select("#keyInfo"+d.id);
            var tableIsHidden = (assocTable.style("display") == "none");  
            d3.select(this)
                .style("background", tableIsHidden ? "none" : "#55a")
                .select("svg")
                    .style("transform", "rotate("+(tableIsHidden ? 90 : 180)+"deg)")
            ;
        };
        
        var sections = chartDiv.selectAll("section").data(sections, function(d) { return d.header; })
            .enter()
            .append("section")
        ;
        
        var newHeaders = sections.append("h2")
            .on ("click", function(d) {
                var assocTable = d3.select("#keyInfo"+d.id);
                var tableIsHidden = (assocTable.style("display") == "none");
                assocTable.style("display", tableIsHidden ? "table" : "none");         
                setArrow.call (this, d);  
            })
            .on ("mouseover", function(d) {
                // eventually backbone shared highlighting code to go here   
            })
        ;
        newHeaders.append("svg")
            .append("polygon")
                .attr("points", "0,14 7,0 14,14")
        ;
        newHeaders.append("span").text(function(d) { return d.header.replace("_", " "); });
        
        var tables = sections.append("table")
            .html("<thead><tr><th>Mark</th><th>Meaning</th></tr></thead><tbody></tbody>")
            .attr("id", function(d) { return "keyInfo"+d.id; })
        ;
        
        var tbodies = tables.select("tbody");
        var trows = tbodies.selectAll("tr.dataBased").data(function(d) { return d.rows; })
            .enter()
            .append("tr")
            .attr("class", "dataBased")
        ;
        
        trows.selectAll("td").data(function(d) { return d; })
            .enter()
            .append("td")
            .text(function(d,i) { return i ? d : ""; })
            .each (addSvg)
        ;
        
        function addSvg (d,i) {
            if (i === 0) {
                d3.select(this).append("svg")
                    .attr ("class", "miniKey")
                    .html (svgs[d])
                ;       
            }
        }
        
        tables.selectAll("path,line")
            .filter (function() {
                return d3.select(this).classed("dynColour");
            })
            .each (function() {
                var d3Sel = d3.select(this);
                var colType = d3Sel.classed("selfLink") ? "intra" : "inter";
                var colour = cols[colType].colour;
                d3Sel.style("stroke", colour);
                if (d3Sel.classed("filled")) {
                    d3Sel.style("fill", colour);  
                }
            })
        ;
        
        sections.selectAll("h2").each (setArrow);
            
        this.listenTo (this.model, "change:linkColourAssignment", this.render);
        
        return this;
    },
    
    render: function () {
        var colourSection =[{
            header: "Colour Scheme",
            rows: []
        }];
        
        var colourAssign = this.model.get("linkColourAssignment");
        colourAssign.init();
        var colourRange = colourAssign.colScale.range();
        colourSection[0].rows = colourRange.map (function (val, i) {
            return ["Colour "+i, "<span style='background-color:"+val+"'>Colour</span>"];
        });
        
        var updateSection = d3.select(this.el).selectAll("tbody").data(colourSection, function(d) { return d.header; });
        updateSection.select("th").text(function(d) { return d.header+": "+colourAssign.title; });
        var rowSel = updateSection.selectAll("tr.dataBased").data(function(d) { return d.rows; });
        rowSel.exit().remove();
        rowSel.enter().append("tr").attr("class", "dataBased");
        var cellSel = rowSel.selectAll("td").data(function(d) { return d; });
        cellSel.enter().append("td");
        cellSel.html (function(d) { return d; });
    }
});
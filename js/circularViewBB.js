//		circular protein crosslink view
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015


(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.CircularViewBB = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.CircularViewBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
                nodeWidth: 15,
                tickWidth: 23,
                gap: 5,
                linkParse: function (link) { 
                    return {fromPos: link.fromResidue - 1, fromNodeID: link.proteinLink.fromProtein.id, 
                            toPos: link.toResidue - 1, toNodeID: link.proteinLink.toProtein.id};
                },
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            // defs to store path definitions for curved text, two nested g's, one for translating, then one for rotating
            var template = _.template ("<DIV style='height:40px'><button class='<%= buttonClass %>'><%= buttonLabel %></button></DIV>"+
                                       "<DIV class='panelInner circleDiv' style='height:calc(100% - 40px)'><svg class='<%= svgClass %>'><defs></defs><g><g></g></g></svg></DIV>");
            mainDivSel.append("div")
                .attr ("class", "panelInner")
                .html(
                    template ({
                        svgClass: "circularView", 
                        buttonClass: "btn btn-1 btn-1a downloadButton", 
                        buttonLabel: "Download SVG",
                    })
                )
            ;
            
            var degToRad = Math.PI / 180;
            
            // Lets user rotate diagram
            var drag = d3.behavior.drag();
            drag.on ("dragstart", function() {
                var curTheta = d3.transform (svg.select("g g").attr("transform")).rotate * degToRad;
                var mc = d3.mouse(this);
                var dragStartTheta = Math.atan2 (mc[1] - self.radius, mc[0] - self.radius);
                drag.offTheta = curTheta - dragStartTheta;
            })
            .on ("drag", function() {
                var dmc = d3.mouse(this);
                var theta = Math.atan2 (dmc[1] - self.radius, dmc[0] - self.radius);
                theta += drag.offTheta;
                svg.select("g g").attr("transform", "rotate("+(theta / degToRad)+")");
            });
            
            
            
            var svg = mainDivSel.select("svg")
                .call (drag)
            ;
            

            
 
            this.color = d3.scale.ordinal()
                .domain([0,2])
                .range(["#beb", "#ebb" , "#bbe"])
            ;
            
            this.line = d3.svg.line.radial()
                .interpolate("bundle")
                .tension(0.45)
                .radius(function(d) { return d.rad; })
                .angle(function(d) { return d.ang * degToRad; })
            ;

            this.arc = d3.svg.arc()
                .innerRadius(90)
                .outerRadius(100)
                .startAngle(function(d) { return d.start * degToRad; }) // remembering to convert from degs to radians
                .endAngle(function(d) { return d.end * degToRad; })
            ;
            
            this.textArc = d3.svg.arc()
                .innerRadius(90)
                .outerRadius(90)
                .startAngle(function(d) { return d.start * degToRad; }) // remembering to convert from degs to radians
                .endAngle(function(d) { return d.end * degToRad; })
            ;
            
                                            
            this.clearTip = function () {
                self.model.get("tooltipModel").set("contents", null);
            };
                
            this.nodeTip = function (d) {
                var interactor = self.model.get("clmsModel").get("interactors").get(d.id);
                self.model.get("tooltipModel")
                    .set("header", interactor.name.replace("_", " "))
                    .set("contents", [
                        ["ID", interactor.id], ["Accession", interactor.accession],["Size", interactor.size]
                    ])
                    .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                ;
            };
                
            this.linkTip = function (d) {
                var xlink = self.model.get("clmsModel").get("crossLinks").get(d.id);
                console.log ("tooltipped crosslink", xlink);
                self.model.get("tooltipModel")
                    .set("header", "XLink")
                    .set("contents", [
                        ["From", xlink.fromResidue, xlink.proteinLink.fromProtein.name],
                        ["To", xlink.toResidue, xlink.proteinLink.toProtein.name],
                        ["Current<br>Matches", xlink.filteredMatches.length]
                    ])
                    .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                ;
            };
                
                
            this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
            //this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
            //this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
            this.listenTo (this.model, "change:selection", this.showSelected); 
            
            return this;
        },
        
        idFunc: function (d) { return d.id; },

        calcLayout: function (nodeArr, linkArr, range, options) {

            var defaults = {
                gap: 5,
                linkParse: function(link) { return {
                    fromPos: link.fromPos, fromNodeID: link.fromNodeID, toPos: link.toPos, toNodeID: link.toNodeID
                }; },
            };
            var _options = _.extend(defaults, options);
            
            var totalLength = nodeArr.reduce (function (total, interactor) {
                return total + interactor.size;    
            }, 0);
           
            // work out the length a gap needs to be in the domain to make a _options.gap length in the range
            var realRange = range[1] - range[0];
            var noOfGaps = nodeArr.length;
            // Fix so gaps never take more than a quarter the display circle in total
            _options.gap = Math.min ((realRange / 4) / (noOfGaps * _options.gap), 1.0) * _options.gap;
            console.log ("og", _options.gap);
        
            var ratio = totalLength / (realRange - (_options.gap * noOfGaps));
            var dgap = _options.gap * ratio;
            totalLength += dgap * noOfGaps;
            
            var scale = d3.scale.linear().domain([0,totalLength]).range(range);
            
            
            var nodeCoordMap = d3.map();
            var total = dgap / 2;   // start with half gap, so gap at top is symmetrical (like a double top)
            nodeArr.forEach (function (node) {
                var size = node.size;
                nodeCoordMap.set (node.id, {id: node.id, name: node.name, rawStart: total, start: scale(total), end: scale(total + size), size: size} );
                total += size + dgap;
            });
            
            var linkCoords = [];
            linkArr.forEach (function (crossLink) {
                var tofrom = _options.linkParse (crossLink);
                linkCoords.push ({
                    id: crossLink.id, 
                    start: scale (tofrom.fromPos + nodeCoordMap.get(tofrom.fromNodeID).rawStart), 
                    end: scale (tofrom.toPos + nodeCoordMap.get(tofrom.toNodeID).rawStart),
                });
            });
            
            
            return { nodes: nodeCoordMap.values(), links: linkCoords };
        },
        
        showSelected: function () {
            var selectedIDs = this.model.get("selection").map((function(xlink) { return xlink.id; }));
            var idset = d3.set (selectedIDs);
            var thinLinks = d3.select(this.el).selectAll(".circleGhostLink");
            thinLinks.classed ("selectedCircleLink", function(d) { return idset.has(d.id); });
            console.log ("sods", selectedIDs);
            return this;
        },
        
        convertLinks: function (links, rad) {
            var newLinks = links.map (function (link) {
                return {id: link.id, coords: [{ang: link.start, rad: rad},{ang: (link.start + link.end) /2, rad: 0}, {ang: link.end, rad: rad}] };
            });
            return newLinks;
        },
	
        getRadius: function (d3sel) {
            var zelem = $(d3sel.node());
            var diameter = Math.min (zelem.width(), zelem.height());
            return diameter / 2;
        },

        render: function () {
            
            if (global.CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {

                console.log ("re rendering circular view");
                
                var interactors = this.model.get("clmsModel").get("interactors");
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                console.log (this.model, "interactors", interactors, "clmsModel", crossLinks);
                
                var filteredInteractors = [];
                interactors.forEach (function (value) {
                    if (!value.isDecoy()) {
                        filteredInteractors.push (value);
                    }
                });
                var filteredCrossLinks = [];
                crossLinks.forEach (function (value) {
                    var plink = value.proteinLink;
                    if (value.filteredMatches && value.filteredMatches.length > 0 && !plink.fromProtein.isDecoy() && !plink.toProtein.isDecoy()) {
                        filteredCrossLinks.push (value);
                    }
                });
                
                var layout = this.calcLayout (filteredInteractors, filteredCrossLinks, [0,360], this.options);
                console.log ("layout", layout);

                var svg = d3.select(this.el).select("svg");
                this.radius = this.getRadius (svg);
                var outerNodeRadius = this.radius - this.options.tickWidth;
                var innerNodeRadius = outerNodeRadius - this.options.nodeWidth;
                
                this.arc.innerRadius(innerNodeRadius).outerRadius(outerNodeRadius);
                this.textArc.innerRadius(innerNodeRadius+1).outerRadius(innerNodeRadius+1); // both radii same for textArc
                

                var nodes = layout.nodes;
                var links = layout.links;
                var newLinks = this.convertLinks (links, innerNodeRadius);
                console.log ("newLinks", newLinks);
                
                var self = this;
                
                var gTrans = svg.select("g");
                gTrans.attr("transform", "translate(" + this.radius + "," + this.radius + ")");
                var gRot = gTrans.select("g");
                //gRot.attr("transform", "rotate(0)");
                
                   
                // draw thin links
                var linkJoin = gRot.selectAll(".circleLink").data(newLinks, self.idFunc);
                
                linkJoin.exit().remove();
                
                linkJoin.enter()
                    .append("path")
                        .attr("class", "circleLink")
                ;
                
                linkJoin
                    .attr("d", function(d) { return self.line(d.coords); })
                ;
            
                
                
                // draw thick, invisible links (used for highlighting and mouse event capture)
                var ghostLinkJoin = gRot.selectAll(".circleGhostLink").data(newLinks, self.idFunc);
                
                ghostLinkJoin.exit().remove();
                
                ghostLinkJoin.enter()
                    .append("path")
                        .attr("class", "circleGhostLink")
                        .on ("mouseenter", self.linkTip)
                        .on ("mouseleave", self.clearTip)
                        .on ("click", function (d) {
                            self.model.set("selection", [crossLinks.get(d.id)]);
                        })
                ;
                
                ghostLinkJoin
                    .attr("d", function(d) { return self.line(d.coords); })
                ;
                
                // draw nodes (around edge)
                this.drawNodes (gRot, nodes);
                // draw scales on nodes - adapted from http://bl.ocks.org/mbostock/4062006
                this.drawTicks (gRot, nodes, outerNodeRadius);
                // draw names on nodes
                this.drawText (gRot, nodes);
            }

            return this;
        },
        
        drawNodes: function (g, nodes) {
            var self = this;
            var nodeJoin = g.selectAll(".circleNode").data(nodes, self.idFunc);

            nodeJoin.exit().remove();

            nodeJoin.enter()
                .append('path')
                    .attr("class", "circleNode")
                    .on("mouseenter", self.nodeTip)
                    .on("mouseleave", self.clearTip)
            ;

            nodeJoin
                .attr("d", this.arc)
                .style("fill", function(d,i) { return self.color(i); })
            ;    
            
            return this;
        },
        
        drawTicks: function (g, nodes, radius) {
            var self = this;
            var tot = nodes.reduce (function (total, node) {
                return total + node.size;    
            }, 0);
           
            var tickGap = Math.ceil ((tot / 360) * 5 / 20) * 20;
            
            var groupTicks = function (d) {
              var k = (d.end - d.start) / d.size;
              var tRange = d3.range(0, d.size, tickGap);
              tRange[0] = 1;
              tRange[tRange.length-1] = d.size;
              return tRange.map(function(v, i) {
                return {
                  angle: ((v-1) * k) + d.start,
                  label: i % 5 && i < tRange.length - 1 ? null : v,
                };
              });
            };

            var groupTickJoin = g.selectAll("g.tickGroups")
                .data(nodes, self.idFunc)
            ;

            groupTickJoin.exit().remove();

            groupTickJoin.enter()
                .append("g")
                .attr ("class", "tickGroups")
            ;


            var indTickJoin = groupTickJoin.selectAll("g.tick")
                .data(groupTicks)
            ;

            indTickJoin.exit().remove();

            var newTicks = indTickJoin.enter()
                .append("g")
                .attr("class", "tick")
            ;

            var llength = Math.min (this.options.tickWidth, 5);
            newTicks.append("line")
                .attr("x1", 1)
                .attr("y1", 0)
                .attr("x2", llength)
                .attr("y2", 0)
            ;

            newTicks.append("text")
                .attr("x", 8)
                .attr("dy", ".35em")
                .classed ("justifyTick", function(d) { return d.angle > 180; })
                .text(function(d) { return d.label; })
            ;

            indTickJoin
                .attr("transform", function(d) {
                    return "rotate(" + (d.angle - 90) + ")" + "translate(" + radius + ",0)";
                })
            ;
            
            return this;
        },
        
        drawText: function (g, nodes) {
            var self = this;
            
            var defs = d3.select(this.el).select("svg defs");
            var pathId = function (d) { return self.el.id + d.id; };
            
            // only add names to nodes with 10 degrees of display or more
            var tNodes = nodes.filter (function(d) { return (d.end - d.start) > 10; });
            
            var pathJoin = defs.selectAll("path").data (tNodes, self.idFunc);
            pathJoin.exit().remove();
            pathJoin.enter().append("path")
                .attr("id", pathId)
            ;
            pathJoin
                .attr("d", function(d) {
                    var pathd = self.textArc (d);
                    console.log ("pathd", pathd);
                    // only want one curve, not solid arc shape, so chop path string
                    var cutoff = pathd.indexOf("L");
                    if (cutoff >= 0) {
                        var midAng = (d.start + d.end) / 2;
                        // use second curve in arc for labels on bottom of circle to make sure text is left-to-right + chop off end 'Z',
                        // use first curve otherwise
                        pathd = (midAng > 90 && midAng < 270) ? 
                            "M" + pathd.substring (cutoff + 1, pathd.length - 1) : pathd.substring (0, cutoff);
                    }
                    return pathd;
                })
            ;
            
            var textJoin = g.selectAll("text.circularNodeLabel")
                .data (tNodes, self.idFunc)
            ;
            textJoin.exit().remove();
            textJoin.enter()
                .append("text")
                .attr ("class", "circularNodeLabel")
                    .attr ("dy", function(d) { return (((d.start + d.end) / 2) > 90 && ((d.start + d.end) / 2) < 270) ? "1em" : null; })
                    .append("textPath")
                        .attr("startOffset", "50%")
                        .attr("xlink:href", function(d) { return "#" + pathId(d); })  
                        .text (function(d) { return d.name.replace("_", " "); })
            ;
            
            return this;
        },
        
        relayout: function () {
            this.render();
            return this;     
        },


        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            global.CLMSUI.CircularViewBB.__super__.remove.apply (this, arguments);    
        }

    });
    
} (this));

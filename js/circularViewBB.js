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
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            
            mainDivSel.append("svg")
                .attr ("class", "circularView")
                .append("g")
            ;
            
 
            this.color = d3.scale.ordinal()
                .domain([0,2])
                .range(["#f7f7f7", "#67a9cf" , "#ef8a62"])
            ;

            var radConst = Math.PI / 180;
            
            this.line = d3.svg.line.radial()
                .interpolate("bundle")
                .tension(0.45)
                .radius(function(d) { return d.rad; })
                .angle(function(d) { return d.ang * radConst; })
            ;

            this.arc = d3.svg.arc()
                .innerRadius(100)
                .outerRadius(90)
                .startAngle(function(d) { return d.start * radConst; }) // remembering to convert from degs to radians
                .endAngle(function(d) { return d.end * radConst; })
            ;
                
            this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
            //this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
            this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
            
            return this;
        },

        calcLayout: function (interactors, crossLinks, range, options) {

            var _options = _.extend({gap: 5}, options);
            
            var realInteractors = [];
            interactors.forEach (function (value) {
                if (!value.isDecoy()) {
                    realInteractors.push (value);
                }
            });
            
            var totalLength = realInteractors.reduce (function (total, interactor) {
                return total + interactor.size;    
            }, 0);
            
            // work out the length a gap needs to be in the domain to make a _options.gap length in the range
            var realRange = range[1] - range[0];
            var noOfGaps = realInteractors.length;
            var ratio = totalLength / (realRange - (_options.gap * noOfGaps));
            var dgap = _options.gap * ratio;
            totalLength += dgap * noOfGaps;
            
            var scale = d3.scale.linear().domain([0,totalLength]).range(range);
            
            
            var nodeMap = d3.map();
            var total = 0;
            realInteractors.forEach (function (interactor) {
                var size = interactor.size;
                nodeMap.set (interactor.id, {id: interactor.id, rawStart: total, start: scale(total), end: scale(total + size), size: size} );
                total += size + dgap;
            });
            
            var linkMap = d3.map ();
            crossLinks.forEach (function (value, key) {
                var fromProt = value.proteinLink.fromProtein;
                var toProt = value.proteinLink.toProtein;

                if (!fromProt.isDecoy() && !toProt.isDecoy()) {
                    var fromRes = value.fromResidue;
                    var toRes = value.toResidue;
                    linkMap.set (key, {
                        id: key, 
                        start: scale (fromRes + nodeMap.get(fromProt.id).rawStart), 
                        end: scale (toRes + nodeMap.get(toProt.id).rawStart),
                    });
                }
            });
            
            
            return { nodes: nodeMap.values(), links: linkMap.values() };
        },
        
        convertLinks: function (links, rad) {
            var newLinks = links.map (function (link) {
                return {id: link.id, coords: [{ang: link.start, rad: rad},{ang: (link.start + link.end) /2, rad: 0}, {ang: link.end, rad: rad}] };
            });
            return newLinks;
        },
	

        render: function () {
            
            if (global.CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {

                console.log ("re rendering circular view");
                
                var interactors = this.model.get("clmsModel").get("interactors");
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                console.log ("interactors", interactors, "clmsModel", crossLinks);
                var layout = this.calcLayout (interactors, crossLinks, [0,360], this.options);
                console.log ("layout", layout);

                var svg = d3.select(this.el).select("svg");
                var width = $(svg.node()).width();
                var height = $(svg.node()).height();
                var diameter = Math.min (width, height);
                var radius = diameter / 2;
                var outerNodeRadius = radius - this.options.tickWidth;
                var innerNodeRadius = outerNodeRadius - this.options.nodeWidth;
                
                this.arc.innerRadius(innerNodeRadius).outerRadius(outerNodeRadius);
                
                console.log ("width", width, height);
                var nodes = layout.nodes;
                var links = layout.links;
                var newLinks = this.convertLinks (links, innerNodeRadius);
                console.log ("newLinks", newLinks);
                
                var self = this;
                
                
                                
                var clearTip = function () {
                    self.model.get("tooltipModel").set("contents", null);
                };
                
                var nodeTip = function (d) {
                    var interactor = interactors.get(d.id);
                    self.model.get("tooltipModel")
                        .set("header", interactor.name)
                        .set("contents", [["ID", interactor.id], ["Size", interactor.size]])
                        .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                    ;
                };
                
                var linkTip = function (d) {
                    var xlink = crossLinks.get(d.id);
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
                
                

                var svgg = svg.select("g");
                svgg.attr("transform", "translate(" + radius + "," + radius + ")");
                
                   
                // draw thin links
                var linkJoin = svgg.selectAll(".circleLink").data(newLinks, function(d) { return d.id; });
                
                linkJoin.exit().remove();
                
                linkJoin.enter()
                    .append("path")
                        .attr("class", "circleLink")
                ;
                
                linkJoin
                    .attr("d", function(d) { return self.line(d.coords); })
                ;
            
                
                
                // draw thick, invisible links (used for highlighting and mouse event capture)
                var ghostLinkJoin = svgg.selectAll(".circleGhostLink").data(newLinks, function(d) { return d.id; });
                
                ghostLinkJoin.exit().remove();
                
                ghostLinkJoin.enter()
                    .append("path")
                        .attr("class", "circleGhostLink")
                        .on ("mouseenter", linkTip)
                        .on ("mouseleave", clearTip)
                ;
                
                ghostLinkJoin
                    .attr("d", function(d) { return self.line(d.coords); })
                ;
                

                // draw nodes (around edge)
                var nodeJoin = svgg.selectAll(".circleNode").data(nodes, function (d) { return d.id; });
                
                nodeJoin.exit().remove();
                
                nodeJoin.enter()
                    .append('path')
                        .attr("class", "circleNode")
                        .on("mouseenter", nodeTip)
                        .on("mouseleave", clearTip)
                ;
                
                nodeJoin
                    .attr("d", this.arc)
                    .style("fill", function(d,i) { return self.color(i); })
                ;
                
                
                // draw scales on nodes - adapted from http://bl.ocks.org/mbostock/4062006
                var groupTicks = function (d) {
                  var k = (d.end - d.start) / d.size;
                  var tRange = d3.range(0, d.size, 20);
                  tRange[0] = 1;
                  tRange[tRange.length-1] = d.size;
                  return tRange.map(function(v, i) {
                    return {
                      angle: ((v-1) * k) + d.start,
                      label: i % 5 && i < tRange.length - 1 ? null : v,
                    };
                  });
                };
                
                var groupTickJoin = svgg.selectAll("g.tickGroups")
                    .data(nodes, function (d) { return d.id; })
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
                    //.style("transform", function(d) { return d.angle > 180 ? "rotate(180deg)translateX(-16px)" : null; })
                    //.style("text-anchor", function(d) { return d.angle > 180 ? "end" : null; })
                    .text(function(d) { return d.label; })
                ;
                
                indTickJoin
                    .attr("transform", function(d) {
                        return "rotate(" + (d.angle - 90) + ")" + "translate(" + outerNodeRadius + ",0)";
                    })
                ;   
            }

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

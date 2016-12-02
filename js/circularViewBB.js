//      circular protein cross-link view
//
//      Martin Graham, Colin Combe, Rappsilber Laboratory, 2015


    var CLMSUI = CLMSUI || {};


    CLMSUI.circleLayout = function  (nodeArr, linkArr, featureArrs, range, options) {

        var defaults = {
            gap: 5,
            linkParse: function(link) { return {
                fromPos: link.fromPos, fromNodeID: link.fromNodeID, toPos: link.toPos, toNodeID: link.toNodeID
            }; },
            featureParse: function (feature, node) {
                return {
                    fromPos: feature.start - 1,
                    toPos: feature.end// - 1
                };
            },
        };
        var _options = _.extend(defaults, options);

        var totalLength = nodeArr.reduce (function (total, interactor) {
            return total + interactor.size;
        }, 0);


        var realRange = range[1] - range[0];
        var noOfGaps = nodeArr.length;
        // Fix so gaps never take more than a quarter the display circle in total
        _options.gap = Math.min ((realRange / 4) / noOfGaps, _options.gap);

        // work out the length a gap needs to be in the domain to make a _options.gap length in the range
        var ratio = totalLength / (realRange - (_options.gap * noOfGaps));
        var dgap = _options.gap * ratio;
        totalLength += dgap * noOfGaps;

        var scale = d3.scale.linear().domain([0,totalLength]).range(range);


        var nodeCoordMap = d3.map();
        var total = dgap / 2;   // start with half gap, so gap at top is symmetrical (like a double top)

        nodeArr.forEach (function (node) {
            var size = node.size;
            // start ... end goes from scale (0 ... size), 1 bigger than 1-indexed size
            nodeCoordMap.set (node.id, {id: node.id, name: node.name, rawStart: total, start: scale(total), end: scale(total + size), size: size});
            total += size + dgap;
            //console.log ("prot", nodeCoordMap.get(node.id));
        });


        var featureCoords = [];
        featureArrs.forEach (function (farr, i) {
            var nodeID = nodeArr[i].id;
            var nodeCoord = nodeCoordMap.get (nodeID);
            farr.forEach (function (feature) {
                var tofrom = _options.featureParse (feature, nodeID);
                //console.log ("nc", nodeCoord, tofrom.fromPos, tofrom.toPos, feature);
                featureCoords.push ({
                    id: feature.id || feature.notes || feature.name,
                    category: feature.category,
                    name: feature.name,
                    nodeID: nodeID,
                    fstart: tofrom.fromPos + 1,
                    fend: tofrom.toPos,
                    start: scale (tofrom.fromPos + nodeCoord.rawStart),
                    end: scale (tofrom.toPos + nodeCoord.rawStart),
                });
            });
        });

        var linkCoords = [];
        linkArr.forEach (function (link) {
            var tofrom = _options.linkParse (link);
            linkCoords.push ({
                id: link.id,
                start: scale (0.5 + tofrom.fromPos + nodeCoordMap.get(tofrom.fromNodeID).rawStart),
                end: scale (0.5 + tofrom.toPos + nodeCoordMap.get(tofrom.toNodeID).rawStart),
            });
        });

        // End result
        // 0...1...2...3...4...5...6...7...8...9...10 - node start - end range for protein length 10 (1-indexed)
        // ..1...2...3...4...5...6...7...8...9...10.. - link positions set to 1-indexed link pos minus 0.5
        // 0...2...............5..................... - feature range [2..5] starts at node start -1 to node end to cover approporiate links

        return { nodes: nodeCoordMap.values(), links: linkCoords, features: featureCoords};
    };

    CLMSUI.CircularViewBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
              "click .niceButton": "reOrder",
              "click .flipIntraButton": "flipIntra",
              "click .showResLabelsButton": "showResLabelsIfRoom",
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.CircularViewBB.__super__.initialize.apply (this, arguments);

            var self = this;
            var defaultOptions = {
                nodeWidth: 10,  // this is a percentage measure
                tickWidth: 23,
                tickLabelCycle: 5,  // show label every nth tick
                gap: 5,
                uniprotFeatureFilterSet: d3.set(["DOMAIN", "Alignment"]),
                linkParse: function (link) {
                    // turn toPos and fromPos to zero-based index
                    return {fromPos: link.fromResidue - 1, fromNodeID: link.fromProtein.id,
                            toPos: link.toResidue - 1, toNodeID: link.toProtein.id};
                },
                featureParse: function (feature, nodeid) {
                    // feature.start and .end are 1-indexed, and so are the returned convStart and convEnd values
                    var convStart = feature.start;
                    var convEnd = feature.end;
                    var protAlignModel = self.model.get("alignColl").get(nodeid);
                    if (protAlignModel) {
                        var alignmentID = feature.alignmentID || "Canonical";
                        convStart = protAlignModel.mapToSearch (alignmentID, feature.start);
                        convEnd = protAlignModel.mapToSearch (alignmentID, feature.end);
                        if (convStart <= 0) { convStart = -convStart; }   // <= 0 indicates no equal index match, do the - to find nearest index
                        if (convEnd <= 0) { convEnd = -convEnd; }         // <= 0 indicates no equal index match, do the - to find nearest index
                    }
                    convStart = Math.max (0, convStart - 1);    // subtract one, but don't have negative values
                    if (isNaN(convEnd) || convEnd === undefined) {
                        convEnd = feature.end;
                    }
                    //convEnd--;    // commented out as convEnd must extend by 1 so length of displayed range is (end-start) + 1
                    // e.g. a feature that starts/stops at some point has length of 1, not 0

                    console.log ("convStart", feature.start, convStart, "convEnd", feature.end, convEnd, protAlignModel);
                    return {fromPos: convStart, toPos: convEnd};
                },
                intraOutside: true,
                showResLabels: true,
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            // defs to store path definitions for curved text, two nested g's, one for translating, then one for rotating
            var template = _.template ("<DIV class='buttonPanel'></DIV><DIV class='panelInner circleDiv'><svg class='<%= svgClass %>'><defs></defs><g><g></g></g></svg></DIV>");
            mainDivSel.append("div")
                .attr ("class", "panelInner")
                .style ("display", "table")
                .html(
                    template ({
                        svgClass: "circularView",
                    })
                )
            ;
            var buttonData = [
                {label:"Export SVG", class:"downloadButton", type: "button"},
                {label:"AutoLayout", class :"niceButton", type: "button"},
                {label:"Flip Self Links", class:"flipIntraButton", type: "button"},
                {label:"Show Residue Labels If Few", class:"showResLabelsButton", type: "checkbox", optionValue: this.options.showResLabels, title: "Depends on space"},
            ];
            mainDivSel.select("div.buttonPanel").selectAll("button").data(buttonData.filter(function(bd) { return bd.type === "button"; }))
                .enter()
                .append("button")
                .text(function(d) { return d.label; })
                .attr("class", function(d) { return d.class; })
                .classed("btn btn-1 btn-1a", true)
            ;
            mainDivSel.select("div.buttonPanel").selectAll("label").data(buttonData.filter(function(bd) { return bd.type === "checkbox"; }))		
                .enter()		
                .append ("label")		
                .attr ("class", "btn")		
                    .append ("span")		
                    .attr("class", "noBreak")		
                    .text(function(d) { return d.label; })		
                    .attr ("title", function(d) { return d.title; })		
                    .append("input")		
                        .attr("type", "checkbox")		
                        .attr("class", function(d) { return d.class; })		
                        .property ("checked", function(d) { return d.optionValue; })		
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

            // Cycle colours through features
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

            var arcs = ["arc", "textArc", "featureArc", "resLabelArc"];
            arcs.forEach (function(arc) {
                this[arc] = d3.svg.arc()
                    .innerRadius(90)
                    .outerRadius(100)
                    .startAngle(function(d) { return d.start * degToRad; }) // remembering to convert from degs to radians
                    .endAngle(function(d) { return d.end * degToRad; })
                ;
            }, this);

            this.clearTip = function () {
                self.model.get("tooltipModel").set("contents", null);
            };

            this.nodeTip = function (d) {
                var interactor = self.model.get("clmsModel").get("participants").get(d.id);
                self.model.get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.interactor (interactor))
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.interactor (interactor))
                    .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                ;
            };

            this.linkTip = function (d) {
                var xlink = self.model.get("clmsModel").get("crossLinks").get(d.id);
                self.model.get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.link())
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.link (xlink))
                    .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                ;
            };

            this.featureTip = function (d) {
                self.model.get("tooltipModel")
                    .set("header", CLMSUI.modelUtils.makeTooltipTitle.feature())
                    .set("contents", CLMSUI.modelUtils.makeTooltipContents.feature (d))
                    .set("location", {pageX: d3.event.pageX, pageY: d3.event.pageY})
                ;
            };

            // initial Order
            this.interactorOrder = CLMSUI.utils.circleArrange (this.model.get("clmsModel").get("participants"));
            // return order as is
            //this.interactorOrder =  (Array.from (this.model.get("clmsModel").get("participants").values()))
            //    .map(function(p) { return p.id; });

            var alignCall = 0;
            var renderPartial = function (renderPartArr) { self.render ({changed: d3.set (renderPartArr), }); };
            // listen to custom filteringDone event from model
            this.listenTo (this.model, "filteringDone", function () { renderPartial (["links"]); });
            this.listenTo (this.model, "change:selection", this.showSelected);
            this.listenTo (this.model, "change:highlights", this.showHighlighted);
            this.listenTo (this.model.get("alignColl"), "bulkAlignChange", function () {
                console.log (++alignCall, ". CIRCULAR VIEW AWARE OF ALIGN CHANGES", arguments);
                renderPartial (["features"]);
            });
            this.listenTo (this.model, "change:linkColourAssignment", function () { renderPartial (["links"]); });
            this.listenTo (this.model, "currentColourModelChanged", function () { renderPartial (["links"]); });
            this.listenTo (this.model, "change:selectedProtein", function () { renderPartial (["nodes"]); });
            return this;
        },

        reOrder: function () {
            this.interactorOrder = CLMSUI.utils.circleArrange (this.model.get("clmsModel").get("participants"));
            this.render();
        },

        flipIntra: function () {
            this.options.intraOutside = !this.options.intraOutside;
            this.render();
        },
        
        showResLabelsIfRoom: function () {		
            this.options.showResLabels = !this.options.showResLabels;		
            this.render();		
        },

        idFunc: function (d) { return d.id; },

        showSelected: function () {
            this.showSelectedOnTheseElements (d3.select(this.el).selectAll(".circleGhostLink"), this);
            return this;
        },

        showSelectedOnTheseElements: function (d3Selection, thisContext) {
            var selectedIDs = thisContext.model.get("selection").map((function(xlink) { return xlink.id; }));
            var idset = d3.set (selectedIDs);
            d3Selection.classed ("selectedCircleLink", function(d) { return idset.has(d.id); });
            return this;
        },

        showHighlighted: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                var highlights = this.model.get("highlights");
                if (highlights) {
                    var highlightedIDs = highlights.map((function(xlink) { return xlink.id; }));
                    var idset = d3.set (highlightedIDs);
                    var thickLinks = d3.select(this.el).selectAll(".circleGhostLink");
                    thickLinks.classed ("highlightedCircleLink", function(d) { return idset.has(d.id); });
                }
            }
            return this;
        },

        actionNodeLinks: function (nodeId, actionType, add, startPos, endPos) {
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            var filteredCrossLinks = CLMSUI.modelUtils.getFilteredNonDecoyCrossLinks (crossLinks);
            var anyPos = startPos == undefined && endPos == undefined;
            startPos = startPos || 0;
            endPos = endPos || 100000;
            var matchLinks = filteredCrossLinks.filter (function(link) {
                return (link.fromProtein.id === nodeId && (anyPos || (link.fromResidue >= startPos && endPos >= link.fromResidue))) ||
                        (link.toProtein.id === nodeId && (anyPos || (link.toResidue >= startPos && endPos >= link.toResidue)));
            });
            this.model.calcMatchingCrosslinks (actionType, matchLinks, actionType === "highlights", add);
            //this.model.set (actionType, matchLinks);
        },

        convertLinks: function (links, rad1, rad2) {
            var xlinks = this.model.get("clmsModel").get("crossLinks");
            var intraOutside = this.options.intraOutside;
            var bowOutMultiplier = 1.3 * (intraOutside ? 1.6 : 1);

            var newLinks = links.map (function (link) {
                var xlink = xlinks.get (link.id);
                var homom = xlink.confirmedHomomultimer; // TODO: need to deal with this changing
                var intra = xlink.toProtein.id === xlink.fromProtein.id;
                var out = intraOutside ? intra && !homom : homom;
                var rad = out ? rad2 : rad1;
                var bowRadius = out ? rad2 * bowOutMultiplier: 0;
                return {id: link.id, coords: [{ang: link.start, rad: rad},{ang: (link.start + link.end) / 2, rad: bowRadius}, {ang: link.end, rad: rad}] };
            }, this);
            return newLinks;
        },

        getMaxRadius: function (d3sel) {
            var zelem = $(d3sel.node());
            return Math.min (zelem.width(), zelem.height()) / 2;
        },

        filterInteractors: function (interactors) {
            var filteredInteractors = [];
            interactors.forEach (function (value) {
                if (!value.is_decoy) {
                    filteredInteractors.push (value);
                }
            });
            return filteredInteractors;
        },

        filterFeatures: function (featureArrays) {
            var features = d3.merge (featureArrays.filter (function(arr) { return arr !== undefined; }));
            return features ? features.filter (function (f) { 
                return !f.category || this.options.uniprotFeatureFilterSet.has (f.category);
            }, this) : [];
        },

        render: function (options) {
            console.log ("render args", arguments);
            var changed = options ? options.changed : undefined;

            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {

                console.log ("re-rendering circular view");

                var interactors = this.model.get("clmsModel").get("participants");
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                console.log ("interactorOrder", this.interactorOrder);
                //console.log ("model", this.model);

                var filteredInteractors = this.filterInteractors (interactors);
                var filteredCrossLinks = CLMSUI.modelUtils.getFilteredNonDecoyCrossLinks (crossLinks);
                
                // If only one protein hide some options, and make links go in middle
                d3.select(this.el).selectAll("button.niceButton,button.flipIntraButton")
                    .style("display", (filteredInteractors.length < 2) ? "none" : null)
                ;
                if (filteredInteractors.length < 2) { this.options.intraOutside = false; }

                // set interactors to same order as interactor order
                //console.log ("ofi", filteredInteractors);
                var fmap = d3.map (filteredInteractors, function(d) { return d.id; });
                filteredInteractors = [];
                this.interactorOrder.forEach (function (interactorId) {
                    if (fmap.has(interactorId)) {
                        filteredInteractors.push (fmap.get(interactorId));
                    }
                });

                // After rearrange interactors, because filtered features depends on the interactor order
                var alignColl = this.model.get("alignColl");
                var filteredFeatures = filteredInteractors.map (function (inter) {
                    return this.filterFeatures ([inter.uniprotFeatures, alignColl.getAlignmentsAsFeatures (inter.id)]);
                }, this);
                //console.log ("filteredFeatures", filteredFeatures);

                var layout = CLMSUI.circleLayout (filteredInteractors, filteredCrossLinks, filteredFeatures, [0,360], this.options);
                //console.log ("layout", layout);

                var svg = d3.select(this.el).select("svg");
                this.radius = this.getMaxRadius (svg);
                var tickRadius = (this.radius - this.options.tickWidth) * (this.options.intraOutside ? 0.8 : 1.0); // shrink radius if lots of links on outside
                var innerNodeRadius = tickRadius * ((100 - this.options.nodeWidth) / 100);
                var innerFeatureRadius = tickRadius * ((100 - (this.options.nodeWidth* 0.7)) / 100);
                var textRadius = (tickRadius + innerNodeRadius) / 2;

                var arcRadii = [
                    {arc: "arc", inner: innerNodeRadius, outer: tickRadius},
                    {arc: "featureArc", inner: innerFeatureRadius, outer: tickRadius}, // both radii same for textArc
                    {arc: "textArc", inner: textRadius, outer: textRadius}, // both radii same for textArc		
                    {arc: "resLabelArc", inner: innerNodeRadius, outer: textRadius},		
                 ];		
                 arcRadii.forEach (function (arcData) {		
                     this[arcData.arc].innerRadius(arcData.inner).outerRadius(arcData.outer);		
                 }, this);

                var nodes = layout.nodes;
                var links = layout.links;
                var features = layout.features;
                // turns link end & start angles into something d3.svg.arc can use
                var linkCoords = this.convertLinks (links, innerNodeRadius, tickRadius);
                //console.log ("linkCoords", linkCoords);

                var gTrans = svg.select("g");
                gTrans.attr("transform", "translate(" + this.radius + "," + this.radius + ")");
                var gRot = gTrans.select("g");
                //gRot.attr("transform", "rotate(0)");

                // draw links
                if (!changed || changed.has("links")) {
                    this.drawLinks (gRot, linkCoords);
                }
                if (!changed || changed.has("nodes")) {
                    // draw nodes (around edge)
                    this.drawNodes (gRot, nodes);
                    // draw scales on nodes - adapted from http://bl.ocks.org/mbostock/4062006
                    this.drawNodeTicks (gRot, nodes, tickRadius);
                }
                if (!changed || changed.has("features")) {
                     // draw features
                    this.drawFeatures (gRot, features);
                }
                if (!changed) {
                    // draw names on nodes
                    this.drawNodeText (gRot, nodes);
                }
                if (!changed || changed.has("links")) {		
                    this.drawResidueLetters (gRot, linkCoords);		
                }
            }

            return this;
        },

        drawLinks: function (g, links) {

            var self = this;
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            //console.log ("clinks", crossLinks);
            var colourScheme = this.model.get("linkColourAssignment");


            // draw thick, invisible links (used for highlighting and mouse event capture)
            var ghostLayer = g.select("g.ghostLayer");
            if (ghostLayer.empty()) {
                ghostLayer = g.append("g").attr("class", "ghostLayer");
            }

            var ghostLinkJoin = ghostLayer.selectAll(".circleGhostLink").data(links, self.idFunc);
            ghostLinkJoin.exit().remove();
            ghostLinkJoin.enter()
                .append("path")
                    .attr("class", "circleGhostLink")
                    .on ("mouseenter", function(d) {
                        self.linkTip (d);
                        self.model.calcMatchingCrosslinks ("highlights",  [crossLinks.get(d.id)], true, false);
                        //self.model.set ("highlights", [crossLinks.get(d.id)]);
                        //self.model.collateMatchRegions ([crossLinks.get(d.id)]);
                    })
                    .on ("mouseleave", function() {
                        self.clearTip ();
                        self.model.set ("highlights", []);
                    })
                    .on ("click", function (d) {
                        var add = d3.event.ctrlKey || d3.event.shiftKey;
                        self.model.calcMatchingCrosslinks ("selection", [crossLinks.get(d.id)], false, add);
                        //self.model.set ("selection", [crossLinks.get(d.id)]);
                    })
                    .call (self.showSelectedOnTheseElements, self)
            ;
            ghostLinkJoin
                .attr("d", function(d) { return self.line(d.coords); })
            ;

            // draw thin links
            var thinLayer = g.select("g.thinLayer");
            if (thinLayer.empty()) {
                thinLayer = g.append("g").attr("class", "thinLayer");
            }
            var linkJoin = thinLayer.selectAll(".circleLink").data(links, self.idFunc);
            //var hasNew = linkJoin.enter().size() > 0;
            linkJoin.exit().remove();
            linkJoin.enter()
                .append("path")
                    .attr("class", "circleLink")
            ;
            linkJoin
                .attr("d", function(d) { return self.line(d.coords); })
                .style("stroke", function(d) { return colourScheme.getColour(crossLinks.get(d.id)); })
                .classed ("ambiguous", function(d) { return crossLinks.get(d.id).ambiguous; })
            ;
        },

        drawNodes: function (g, nodes) {
            var self = this;
            var nodeJoin = g.selectAll(".circleNode").data(nodes, self.idFunc);

            nodeJoin.exit().remove();

            nodeJoin.enter()
                .append('path')
                    .attr("class", "circleNode")
                    .on("mouseenter", function(d) {
                        self.nodeTip (d);
                        self.actionNodeLinks (d.id, "highlights", false);
                    })
                    .on("mouseleave", function() {
                        self.clearTip ();
                        self.model.set ("highlights", []);
                    })
                    .on("click", function(d) {
                        var add = d3.event.ctrlKey || d3.event.shiftKey;
                        self.actionNodeLinks (d.id, "selection", add);
                        self.model.setSelectedProteins ([d.id], add);
                    })
            ;

            nodeJoin
                .attr("d", this.arc)
                .classed ("selected", function(d) {
                    var map = self.model.get("selectedProtein");
                    return map && map.has(d.id);
                })
            ;

            return this;
        },

        drawNodeTicks: function (g, nodes, radius) {
            var self = this;
            var tot = nodes.reduce (function (total, node) {
                return total + node.size;
            }, 0);

            var tickValGap = (tot / 360) * 5;
            var tickGap = CLMSUI.utils.niceRound (tickValGap);

            var groupTicks = function (d) {
                var k = (d.end - d.start) / (d.size || 1);
                var tRange = d3.range(0, d.size, tickGap);
                // make first tick at 1, not 0 (as protein indices are 1-based)
                tRange[0] = 1;
                // decide whether to add extra tick for last value (d.size) or replace last tick if close enough
                var tlen = tRange.length;
                var lastIndex = tlen - (d.size - tRange[tlen - 1] <= tickGap / 3 ? 1 : 0);
                tRange[lastIndex] = d.size;
                tlen = tRange.length;

                var labelCycle = self.options.tickLabelCycle;
                return tRange.map(function(v, i) {
                    //console.log ("d.start", d);
                    return {
                        angle: (((v-1) + 0.5) * k) + d.start, // v-1 cos we want 1 to be at the zero pos angle, +0.5 cos we want it to be a tick in the middle
                        // show label every labelCycle'th tick starting with first.
                        // Exceptions: Show label for last tick. Don't show for second last tick (unless that tick is the first). It looks nicer.
                        label: (i % labelCycle && i < tlen - 1) || (i == tlen - 2 && i > 0) ? null : v,
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
                .text(function(d) { return d.label; })
            ;

            indTickJoin
                .attr("transform", function(d) {
                    return "rotate(" + (d.angle - 90) + ")" + "translate(" + radius + ",0)";
                })
                .select("text")
                    .classed ("justifyTick", function(d) { return d.angle > 180; })
            ;

            return this;
        },

        drawNodeText: function (g, nodes) {
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
                    // console.log ("pathd", pathd);
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
            
            // add labels to layer, to ensure they 'float' above feature elements added directly to g
            var nodeLabelLayer = g.select("g.nodeLabelLayer");
            if (nodeLabelLayer.empty()) {
                nodeLabelLayer = g.append("g").attr("class", "nodeLabelLayer");
            }

            var textJoin = nodeLabelLayer.selectAll("text.circularNodeLabel")
                .data (tNodes, self.idFunc)
            ;
            textJoin.exit().remove();
            textJoin.enter()
                .append("text")
                .attr ("class", "circularNodeLabel")
                    .attr ("dy", "0.3em")
                    .append("textPath")
                        .attr("startOffset", "50%")
                        .attr("xlink:href", function(d) { return "#" + pathId(d); })
                        .text (function(d) { return d.name.replace("_", " "); })
            ;

            return this;
        },

        drawFeatures : function (g, features) {
            var self = this;
            features.sort (function (a,b){
                var diff = (b.end - b.start) - (a.end - a.start);
                return (diff < 0 ? -1 : (diff > 0 ? 1 : 0));
            });
            console.log ("features", features);
            
            var featureLayer = g.select("g.featureLayer");
            if (featureLayer.empty()) {
                featureLayer = g.append("g").attr("class", "featureLayer");
            }
            
            var featureJoin = featureLayer.selectAll(".circleFeature").data(features, self.idFunc);

            featureJoin.exit().remove();

            featureJoin.enter()
                .append('path')
                    .attr("class", "circleFeature")
                    .on("mouseenter", function(d) {
                        self.featureTip (d);
                        self.actionNodeLinks (d.nodeID, "highlights", false, d.fstart, d.fend);
                    })
                    .on ("mouseleave", function() {
                        self.clearTip ();
                        self.model.set ("highlights", []);
                    })
                    .on("click", function(d) {
                        var add = d3.event.ctrlKey || d3.event.shiftKey;
                        self.actionNodeLinks (d.nodeID, "selection", add, d.fstart, d.fend);
                    })
            ;


            featureJoin
                .attr("d", this.featureArc)
                .style("fill", function(d) { return CLMSUI.domainColours(d.name); })
            ;

            return this;
        },
        
        
        drawResidueLetters : function (g, links) {
            
            var circumference = this.resLabelArc.innerRadius()() * 2 * Math.PI;
            //console.log ("ff", this.resLabelArc, this.resLabelArc.innerRadius(), this.resLabelArc.innerRadius()(), circumference);
            if (circumference / links.length < 30 || !this.options.showResLabels) {    // arbitrary cutoff decided by me (mjg)
                links = [];
            }
            
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            var resMap = d3.map();
            links.forEach (function (link) {
                var xlink = crossLinks.get (link.id);
                resMap.set (xlink.fromProtein.id+"-"+xlink.fromResidue, {polar: link.coords[0], res: CLMSUI.modelUtils.getResidueType (xlink.fromProtein, xlink.fromResidue)});
                resMap.set (xlink.toProtein.id+"-"+xlink.toResidue, {polar: link.coords[2], res: CLMSUI.modelUtils.getResidueType (xlink.toProtein, xlink.toResidue)});
            });
            var degToRad = Math.PI / 180;
            
            var letterLayer = g.select("g.letterLayer");
            if (letterLayer.empty()) {
                letterLayer = g.append("g").attr("class", "letterLayer");
            }
            
            var resJoin = letterLayer.selectAll(".residueLetter").data(resMap.entries(), function(d) { return d.key; });
            
            resJoin.exit().remove();
            
            resJoin.enter()
                .append("text")
                .attr ("class", "residueLetter")
                .text (function(d) { return d.value.res; })
            ;
            
            resJoin
                .attr("transform", function(d) {
                    var polar = d.value.polar;
                    var rang = (polar.ang - 90) * degToRad;
                    var x = polar.rad * Math.cos (rang);
                    var y = polar.rad * Math.sin (rang);
                    var rot = (polar.ang < 90 || polar.ang > 270) ? polar.ang : polar.ang + 180;
                    return "rotate ("+rot+" "+x+" "+y+") translate("+x+" "+y+")";   
                })
                .attr ("dy", function(d) {
                    var polar = d.value.polar;
                    return (polar.ang < 90 || polar.ang > 270) ? "0.8em" : "-0.1em";
                })
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
            CLMSUI.CircularViewBB.__super__.remove.apply (this, arguments);
        }
    });

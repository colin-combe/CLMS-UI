//		GO terms viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2019

var CLMSUI = CLMSUI || {};

CLMSUI.GoTermsViewBB = CLMSUI.utils.BaseFrameView.extend({

    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            "keyup .goTextMatch": "goTextMatch",
        });
    },

    defaultOptions: {
        margin: {
            top: 5,
            right: 5,
            bottom: 5,
            left: 5
        },
        canHideToolbarArea: true,
        canTakeImage: true,
    },

    initialize: function(viewOptions) {
        CLMSUI.GoTermsViewBB.__super__.initialize.apply(this, arguments);

        var self = this;

        // targetDiv could be div itself or id of div - lets deal with that
        // Backbone handles the above problem now - element is now found in this.el
        //avoids prob with 'save - web page complete'
        var mainDivSel = d3.select(this.el).classed("goTermsView", true);

        var flexWrapperPanel = mainDivSel.append("div")
            .attr("class", "verticalFlexContainer");

        var controlDiv = flexWrapperPanel.append("div").attr("class", "toolbar toolbarArea");
        this.termSelect = controlDiv.append("label")
            .attr("class", "btn selectHolder")
            .append("span")
            //.attr("class", "noBreak")
            .text("Term Type ►")
            .append("select")
            .attr("id", mainDivSel.attr("id") + "goTermSelect")
            .on("change", function() {
                self.updateThenRender();
            });

        var termSelectData = ["cellular_component", "biological_process", "molecular_function"];

        var options = this.termSelect.selectAll("option")
            .data(termSelectData)
            .enter()
            .append("option");

        // Set the text and value for your options

        options.text(function(d) {
                return d;
            })
            .attr("value", function(d) {
                return d;
            });
        
        controlDiv.append("input")
            .attr ("type", "text")
            .attr ("placeholder", "Search Go Term Names...")
            .attr ("class", "btn-1 goTextMatch")
        ;

        this.chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr("flex-grow", 1)
            .style("position", "relative");

        // SVG element
        this.svg = this.chartDiv.append("svg");
        this.svg.on("click", function(d) {
                // self.model.set("groupedGoTerms", []);
                // self.model.trigger("groupedGoTermsChanged");
            })
            .on("contextmenu", function(d) {
                //d3.event.preventDefault();
                // react on right-clicking
                //self.fixed = [];
                //self.render();
            });
        var margin = this.options.margin;
        this.vis = this.svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        this.backgroundGroup = this.vis.append("g");
        // this.linkGroup = vis.append("g");
        this.foregroundGroup = this.vis.append("g");
        this.listenTo(this.model.get("clmsModel"), "change:matches", this.updateThenRender); // New matches added (via csv generally)
        this.listenTo(this.model, "hiddenChanged", this.updateThenRender);

        this.sankey = d3.sankey().nodeWidth(15);
        //this.fixed = [];

        //markers
        var data = [{
            id: 1,
            name: 'diamond',
            path: 'M 0,-7.0710768 L -7.0710894,0 L 0,7.0710589 L 7.0710462,0 L 0,-7.0710768 z',
            viewbox: '-5 -5 15 15',
            transform: 'scale(0.7) translate(5,0)',
            color: 'orange'
        }, {
            id: 2,
            name: 'arrow',
            path: "M 8.7185878,4.0337352 L -2.2072895,0.016013256 L 8.7185884,-4.0017078 C 6.9730900,-1.6296469 6.9831476,1.6157441 8.7185878,4.0337352 z",
            viewbox: '-5 -5 15 15',
            transform: 'scale(1.1) translate(1,0)',
            color: 'black'
        }];

        var defs = this.svg.append('svg:defs');
        var marker = defs.selectAll('marker')
            .data(data)
            .enter()
            .append('svg:marker')
            .attr('id', function(d) {
                return 'marker_' + d.name;
            })
            .attr('markerHeight', 15)
            .attr('markerWidth', 15)
            .attr('markerUnits', 'userSpaceOnUse')
            // .attr('orient', 'auto')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('viewBox', function(d) {
                return d.viewbox;
            })
            .append('svg:path')
            .attr('d', function(d) {
                return d.path;
            })
            .attr('fill', function(d) {
                return d.color;
            })
            .attr('transform', function(d) {
                return d.transform;
            })
        ;
        
        // initial update done via hiddenChanged trigger above - which is called after all views are set up
        //this.update();  // can do this here as go terms are available on the view's initialisation
    },
                 
                 
    goTextMatch: function (evt) {
        var self = this;
        var val = evt.target.value;
        var regex = new RegExp (val, "i");
        var textPos = this.textPos.bind(this);

        var interactorSet = new Set();
        var nodes = this.foregroundGroup.selectAll(".node")
            .each (function (d) {
                d.strMatch = val && val.length > 1 && d.name.match(regex);
                if (d.strMatch) {
                    d.term.getInteractors (interactorSet);
                }
            })
            .sort (function (a, b) {
                return (a.strMatch ? 1 : 0) - (b.strMatch ? 1 : 0);
            })
            .classed ("highlightedGOTerm", function (d) { return d.strMatch; })
        ;

        nodes.select("rect")
            .style ("stroke", function (d) { return d.strMatch ? null : d3.rgb(d.color).darker(2); })
        ;

        nodes.select("text")
            .attr ("clip-path", function (d) { return d.strMatch ? null : self.textOrient (d); })
            .call (textPos, function() { return false; })
        ;

        var interactors = Array.from (interactorSet.values());
        this.model[evt.key === "Enter" || evt.keyCode === 13 || evt.which === 13 ? "setSelectedProteins" : "setHighlightedProteins"](interactors, false);    
    },

    update: function() {
        var termType = d3.select("#goTermsPanelgoTermSelect")
            .selectAll("option")
            .filter(function() { return d3.select(this).property("selected"); })
            .datum()
            .trim()
        ;

        var go = this.model.get("go");
        //associate go terms with proteins (clear them first)
        for (var g of go.values()) {
            var gints = g.interactors;
            if (gints && gints.size > 0) {
                gints.clear();
            }
            var gints2 = g.treeInteractorSet;
            if (gints2 && gints2.size > 0) {
                gints2.clear();
            }
        }

        var proteins = this.model.get("clmsModel").get("participants").values();
        for (var protein of proteins) {
            if (protein.uniprot) {
                for (var goId of protein.uniprot.go) {
                    var goTerm = go.get(goId);
                    if (goTerm) {
                        goTerm.interactors = goTerm.interactors || new Set ();  // Lazy instantiation
                        goTerm.interactors.add(protein);
                    }
                }
            }
        }

        var nodes = new Map();
        var linksMap = new Map();

                CLMSUI.GoTerm.prototype.getCount= 0;
        if (termType == "biological_process") {
            //var ints = go.get("GO0008150").getInteractors (new Set(), true);
            sankeyNode("GO0008150");
        } else if (termType == "molecular_function") {
            //var ints = go.get("GO0003674").getInteractors (new Set(), true);
            sankeyNode("GO0003674");
        } else { // default to cellular component
            //var ints = go.get("GO0005575").getInteractors (new Set(), true);
            sankeyNode("GO0005575");
        }

        console.log ("getInteractor count", CLMSUI.GoTerm.prototype.getCount);

        function sankeyNode(goId, interactorSet) {
            if (!nodes.has(goId)) {
                var goTerm = go.get(goId);
                var node = {
                    name: goTerm.name,
                    id: goTerm.id,
                    term: goTerm,
                };
                nodes.set(node.id, node);
                interactorSet = interactorSet || goTerm.getInteractors();
                
                if (goTerm.part_of) {
                    for (var partOfId of goTerm.part_of) {
                        var partOfTerm = go.get(partOfId);
                        if (partOfTerm.namespace == goTerm.namespace) {
                            var linkId = partOfId + "_" + node.id;
                            var link = {
                                source: sankeyNode(partOfId),
                                target: node,
                                value: interactorSet.size,
                                id: linkId,
                                partOf: true
                            };
                            linksMap.set(linkId, link);
                        }
                    }
                }
                if (goTerm.is_a) {
                    for (var superclassId of goTerm.is_a) {
                        var superclassTerm = go.get(superclassId);
                        if (superclassTerm.namespace == goTerm.namespace) {
                            var linkId = superclassId + "_" + node.id;
                            var link = {
                                source: sankeyNode(superclassId),
                                target: node,
                                value: interactorSet.size,
                                id: linkId,
                                partOf: false
                            };
                            linksMap.set(linkId, link);
                        }
                    }
                }
                if (goTerm.parts) {
                    for (var partId of goTerm.parts) {
                        var partTerm = go.get(partId);
                        if (partTerm.namespace == goTerm.namespace) {
                            var partInteractorSet = partTerm.getInteractors();
                            if (partInteractorSet && partInteractorSet.size > 1) {
                                sankeyNode(partId, partInteractorSet);
                            }
                        }
                    }
                }
                if (goTerm.subclasses) {
                    for (var subclassId of goTerm.subclasses) {
                        var subclassTerm = go.get(subclassId);
                        if (subclassTerm.namespace == goTerm.namespace) {
                            var subclassInteractorSet = subclassTerm.getInteractors();
                            if (subclassInteractorSet && subclassInteractorSet.size > 1) {
                                sankeyNode(subclassId, subclassInteractorSet);
                            }
                        }
                    }
                }
                return node;
            } else {
                return nodes.get(goId);
            }
        }

        this.data = {
            "nodes": Array.from(nodes.values()),
            "links": Array.from(linksMap.values())
        };
         
        return this;
    },
    
    leftRightSwitch: function (d) {
        return d.x < this.sankey.size()[0] / 1.5;   // if true, right
    },
    
    textOrient: function (d) {
        var orient = this.leftRightSwitch(d) ? "right" : "left";
        return "url(#sankeyColumn"+orient+")";
    },
    
    textPos: function (sel, val1) {
        var self = this;
        sel
            .filter (function (d) { return !self.leftRightSwitch(d); })
            .style ("text-anchor", function (d) { return d.strMatch || val1(d) ? "end" : "start"; })
            .attr ("x", function (d) { return d.strMatch || val1(d) ? -6 : -self.colWidth + self.sankey.nodeWidth(); })
        ;
    },
    

    render: function() {
        if (this.isVisible()) {
            //this.update();
            if (this.data) {

                //console.log("RENDERING GO TERMS");
                var jqElem = $(this.svg.node());
                var cx = jqElem.width(); //this.svg.node().clientWidth;
                var cy = jqElem.height(); //this.svg.node().clientHeight;
                var margin = this.options.margin;
                var width = Math.max(0, cx - margin.left - margin.right);
                var height = Math.max(0, cy - margin.top - margin.bottom);

                this.sankey
                    .nodes(this.data.nodes)
                    .links(this.data.links)
                    .size([width, height])
                    .layout(32)
                ;
                
                console.log ("res", this.sankey);
                var maxDepth = d3.max (this.data.nodes, function (d) { return d.depth; });
                var colWidth = (width - this.sankey.nodePadding() - this.sankey.nodeWidth()) / maxDepth;
                this.colWidth = colWidth;
                console.log ("data", this.data, maxDepth, colWidth);
                
                this.svg.select("defs").selectAll("clipPath.sankeyColumn").remove();
                var leftRight = [
                  {x: -colWidth + this.sankey.nodeWidth(), width: colWidth - this.sankey.nodeWidth(), orient: "left"},
                  {x: 0, width: colWidth, orient: "right"}
                ];
                this.svg.select("defs").selectAll("clipPath.sankeyColumn")
                    .data(leftRight)
                    .enter()
                    .append("clipPath")
                    .attr ("id", function(d) { return "sankeyColumn" + d.orient; })
                    .attr ("class", "sankeyColumn")
                    .append("rect")
                        .attr ("y", -10)
                        .attr ("height", height + 10)
                        .attr ("x", function(d) { return d.x; })
                        .attr ("width", function (d) { return d.width; })
                ;

                var color = d3.scale.category20();

                var path = this.sankey.link();
                var self = this;
                
                var textPos = self.textPos.bind(self);
                

                var linkSel = self.backgroundGroup.selectAll(".goLink")
                    .data(this.data.links,
                        function(d) {
                            return d.id;
                        }
                    );

                linkSel.enter()
                    .append("path")
                    .attr("class", "goLink")
                    .style("stroke", function(d) {
                        return d.partOf ? "#fdc086" : "black"; //"#bdbdbd"
                    })
                    .style("display", "none")
                    .attr('marker-start', function(d, i) {
                        return 'url(#marker_' + (d.partOf ? "diamond" : "arrow") + ')';
                    })
                ;
                // .on("mouseover", function(d) {d3.select(this).style("stroke-opacity", 1);})
                // .on("mouseout", function(d) {d3.select(this)scale(1.1) .style("stroke-opacity", 0);});
                // .append("title")
                // .text(function(d) {
                //     return d.target.name + (d.partOf ? " is part of " : " is a ") + d.source.name + "\n" + d.value;
                // });


                var nodeSel = this.foregroundGroup.selectAll(".node")
                    .data(this.data.nodes, function(d) {
                        return d.id;
                    })
                ;        

                var nodeEnter = nodeSel.enter().append("g")
                    .attr("class", "node")
                    // .call(d3.behavior.drag()
                    //     .origin(function(d) {
                    //         return d;
                    //     })
                    //     .on("drag", dragmove));
                    .on("click", function(d) {
                        self.model.setSelectedProteins([], false);
                        self.model.setSelectedProteins(Array.from(d.term.getInteractors().values()), true);
                        // self.model.get("groupedGoTerms").push(d.term);
                        // self.model.trigger("groupedGoTermsChanged");
                        d3.event.stopPropagation();
                    })
                    .on("mouseover", function(d) {
                        var term = d.term;
                        nodeSel
                            .style("display", function(d2) {
                                return term.isDirectRelation(d2.term) ? null : "none";  // ? 1 : 0;
                            })
                            .select ("text")
                            .attr ("clip-path", function (d2) {
                                return d2.strMatch || term.isDirectRelation(d2.term) ? null : self.textOrient(d2);  // ? 1 : 0;
                            })
                            .call (textPos, function () { return true; })
                        ;
                        
                        //nodeSel.style("opacity", function(d2) {
                       //     return term.isDirectRelation(d2.term) ? 1 : 0;
                        //});
                        //nodeSel.select("rect").attr("fill", function(dr) {
                            //return d == dr ? d.color = color(d.name.replace(/ .*/, "")) : "none";
                        //});
                        
                        linkSel.style("display", function(dlink) {
                            return d == dlink.source || d == dlink.target ? null : "none";
                        });
                        
                        self.model.get("tooltipModel")
                            .set("header", "GO Term "+d.id)
                            .set("contents", CLMSUI.modelUtils.makeTooltipContents.goTerm(d.term))
                            .set("location", {
                                pageX: d3.event.pageX,
                                pageY: d3.event.pageY
                            })
                        ;

                        self.model.setHighlightedProteins(Array.from(term.getInteractors().values()));
                    })
                    .on("mouseout", function() {
                        //if (self.fixed.length == 0) {
                        nodeSel
                            .style("display", null)
                            .select ("text")
                            .attr ("clip-path", function(d2) { return d2.strMatch ? null : self.textOrient(d2); })
                            .call (textPos, function () { return false; }) 
                        ;
                        //nodeSel.style("opacity", 1);
                        //nodeSel.select("rect").attr("fill", function(d) {
                        //    return d.color = color(d.name.replace(/ .*/, ""));
                        //});
                        linkSel.style("display", "none");
                        // }
                        self.model.get("tooltipModel").set("contents", null);
                        self.model.setHighlightedProteins([]);
                    })
                    .on("contextmenu", function(d) {
                        //d3.event.preventDefault();
                        //d3.event.stopPropagation();
                        // react on right-clicking
                        //self.fixed.push(d.id);

                    });

                nodeEnter.append("rect")
                    .attr("width", self.sankey.nodeWidth())
                    .style("fill", function(d) {
                        return d.color = color(d.name.replace(/ .*/, ""));
                        // var toFill = (self.fixed.length == 0 || self.fixed.contains(d.id));
                        // return toFill ? color(d.name.replace(/ .*/, "")) : "none";
                    })
                    .style("fill-opacity", function(d) {
                        return 0.2; //d.color = color(d.name.replace(/ .*/, ""));
                    })
                    .style("stroke", function(d) {
                        return d3.rgb(d.color).darker(2);
                    })
                ;

                nodeEnter.append("text")
                    .attr("dy", ".35em")
                    .attr("clip-path", function(d) { return self.textOrient(d); })
                    .text(function(d) {
                        return d.name;
                    });

                nodeSel.attr("transform", function(d) {
                    return "translate(" + (d.x ? d.x : 0) + "," + (d.y ? d.y : 0) + ")";
                });
                nodeSel.select("rect")
                    .attr("height", function(d) {
                        return Math.max(1, (d.dy ? d.dy : 0));
                    });
                nodeSel.select("text")
                    .attr("x", function(d) {
                        //return (d.x < width / 1.5) ? 6 + self.sankey.nodeWidth() : -6;
                        return (d.x < width / 1.5) ? 6 + self.sankey.nodeWidth() : -colWidth + self.sankey.nodeWidth() ;
                    })
                    .style("text-anchor", function(d) {
                        return "start";
                        //return self.leftRightSwitch(d) ? "start" : "end";
                    })
                    .attr("y", function(d) {
                        return (d.dy ? d.dy : 0) / 4;
                    }) 
                ;

                linkSel.attr("d", path);
                // .style("stroke-width", function(d) {
                //     return 4;//Math.max(1, (d.dy ? d.dy : 0));
                // });

                nodeSel.exit().remove();
                linkSel.exit().remove();

                function dragmove(d) {
                    d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
                    self.sankey.relayout();
                    linkSel.attr("d", path);
                }
            }
        }

        return this;
    },
    
    updateThenRender: function () {
        if (this.isVisible()) {
            return this.update().render();  
        }
        return this;
    },
    
    relayout: function(descriptor) {
        if (descriptor && descriptor.dragEnd) { // avoids doing two renders when view is being made visible
            this.render();
        }
        return this;
    },

    reshow: function() {
        return this.update();
    },

    // called when things need repositioned, but not re-rendered from data
    // gets called before render
    resize: function() {
        return this.render();
    },

    identifier: "Go Terms View",
});

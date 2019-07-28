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
            // "mousemove .mouseMat": "brushNeighbourhood",
        });
    },

    defaultOptions: {
        margin: {
            top: 5,
            right: 5,
            bottom: 5,
            left: 5
        },
    },

    initialize: function(viewOptions) {
        CLMSUI.DistanceMatrixViewBB.__super__.initialize.apply(this, arguments);

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
            .on("change", function(d) {
                self.update();
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

        this.chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr("flex-grow", 1)
            .style("position", "relative");

        // SVG element
        this.svg = this.chartDiv.append("svg");
        var margin = this.options.margin;
        this.vis = this.svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");; //.attr("transform", "translate(" + 310 + "," + 310 + ")");
        this.backgroundGroup = this.vis.append("g");
        // this.linkGroup = vis.append("g");
        this.foregroundGroup = this.vis.append("g");
        this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        //this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);
        this.sankey = d3.sankey().nodeWidth(15);

    },

    //resize gets called before render
    update: function() {
        var termType = d3.select("#goTermsPanelgoTermSelect").selectAll("option")
            .filter(function(d) {
                return d3.select(this).property("selected");
            })
            .datum().trim();

        var nodes = new Map();
        var linkSubsetMap = new Map();
        var dag = CLMSUI.compositeModelInst.get("goDags")[termType];

        function sankeyNode(dagNode) {
            if (!nodes.has(dagNode.id)) {
                var node = {
                    name: dagNode.name,
                    id: dagNode.id,
                    term: dagNode,
                };
                nodes.set(node.id, node);
                //todo - refactor away copy'n'paste
                for (var p of dagNode.part_ofParents) {
                    var fromId = p.id;
                    var toId = node.id;
                    var linkId = fromId + "_" + toId;
                    var link = {};
                    link.source = sankeyNode(p);
                    if (!link.source) {
                        console.log("!?!?");
                    }
                    link.target = node;
                    link.value = dagNode.getInteractors().size;
                    link.id = linkId;
                    link.partOf = true;
                    linkSubsetMap.set(linkId, link);
                }
                for (var p of dagNode.is_aParents) {
                    var fromId = p.id;
                    var toId = node.id;
                    var linkId = fromId + "_" + toId;
                    var link = {};
                    link.source = sankeyNode(p);
                    if (!link.source) {
                        console.log("!?!?");
                    }
                    link.target = node;
                    link.value = dagNode.getInteractors().size;
                    link.id = linkId;
                    link.partOf = false;
                    linkSubsetMap.set(linkId, link);
                }
                for (var c of dagNode.part_ofChildren) {
                    if (c.getInteractors().size > 1) {
                        sankeyNode(c);
                    }
                }
                for (var c of dagNode.is_aChildren) {
                    if (c.getInteractors().size > 1) {
                        sankeyNode(c);
                    }
                }
                return node;
            } else {
                return nodes.get(dagNode.id);
            }
        };

        sankeyNode(dag);

        var data = {
            "nodes": Array.from(nodes.values()),
            "links": Array.from(linkSubsetMap.values())
        };


        var self = this;
        self.energy = data;
        self.render();
    },

    render: function() {
        if (this.energy) {
            //console.log("RENDERING GO TERMS");
            var jqElem = $(this.svg.node());
            var cx = jqElem.width(); //this.svg.node().clientWidth;
            var cy = jqElem.height(); //this.svg.node().clientHeight;
            var margin = this.options.margin;
            var width = Math.max(0, cx - margin.left - margin.right);
            var height = Math.max(0, cy - margin.top - margin.bottom);

            this.sankey = d3.sankey().nodeWidth(15);
            this.sankey
                .nodes(this.energy.nodes)
                .links(this.energy.links)
                .size([width, height])
                .layout(32);

            var color = d3.scale.category20();

            var path = this.sankey.link();
            var self = this;

            var energy = self.energy;


            var linkSel = self.backgroundGroup.selectAll(".goLink")
                .data(energy.links
                      .sort(function(a, b) {
                        return b.value - a.value;
                    })
                    ,
                    function(d) {
                        return d.id;
                    }
                );

            linkSel.enter()
                .append("path")
                // .attr("d", path)
                .attr("class", "goLink")
                // .style("stroke-width", function(d) {
                //     return Math.max(1, (d.dy ? d.dy : 0));
                // })
                .style("stroke", function(d) {
                    return d.partOf ? "orange" : "black"
                })
                .append("title")
                .text(function(d) {
                    return d.target.name + (d.partOf ? " is part of " : " is a ") + d.source.name + "\n" + d.value;
                });


            var nodeSel = this.foregroundGroup.selectAll(".node")
                .data(energy.nodes, function(d) {
                    return d.id;
                });

            var nodeEnter = nodeSel.enter().append("g")
                .attr("class", "node")
                // .attr("transform", function(d) {
                //     return "translate(" + (d.x ? d.x : 0) + "," + (d.y ? d.y : 0) + ")";
                // })
                // .call(d3.behavior.drag()
                //     .origin(function(d) {
                //         return d;
                //     })
                //     .on("drag", dragmove));
                .on("click", function(d) {
                    self.model.setSelectedProteins([], false);
                    self.model.setSelectedProteins(Array.from(d.term.getInteractors().values()), true);
                })
                .on("mouseover", function(d) {
                    var term = d.term;
                    d3.select(this).select("circle").classed("highlightedProtein", true);
                    self.model.get("tooltipModel")
                        .set("header", "GO Term")
                        .set("contents", CLMSUI.modelUtils.makeTooltipContents.goTerm(term))
                        .set("location", {
                            pageX: d3.event.pageX,
                            pageY: d3.event.pageY
                        });
                    self.model.setHighlightedProteins(Array.from(term.getInteractors().values()));
                })
                .on("mouseout", function(d) {
                    d3.select(this).select("circle").classed("highlightedProtein", false);
                    self.model.get("tooltipModel").set("contents", null);
                    self.model.setHighlightedProteins([]);
                });

            nodeEnter.append("rect")
                .attr("width", self.sankey.nodeWidth())
                // .attr("height", function(d) {
                //     return Math.max(1, (d.dy ? d.dy : 0));
                // })
                .style("fill", function(d) {
                    return d.color = color(d.name.replace(/ .*/, ""));
                })
                .style("stroke", function(d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
                .text(function(d) {
                    return d.name + "\n" + d.value;
                });

            nodeEnter.append("text")
                // .attr("x", -6)

                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                // .attr("transform", null)
                .text(function(d) {
                    return d.name;
                })
                // .filter(function(d) {
                //     return d.x < width / 2;
                // })
                // .attr("x", 6 + self.sankey.nodeWidth())
                .attr("text-anchor", "start");


            nodeSel.attr("transform", function(d) {
                return "translate(" + (d.x ? d.x : 0) + "," + (d.y ? d.y : 0) + ")";
            });
            nodeSel.select("rect")
                .attr("height", function(d) {
                    return Math.max(1, (d.dy ? d.dy : 0));
                });
            nodeSel.select("text")
            .attr("x", function(d) {
                return (d.x < width / 2) ? 6 + self.sankey.nodeWidth() : -6;
            })
            .attr("text-anchor", function(d) {
                return (d.x < width / 2) ? "start" : "end";
            })
            .attr("y", function(d) {
                return (d.dy ? d.dy : 0) / 4;
            })

            linkSel.attr("d", path)
                .style("stroke-width", function(d) {
                    return Math.max(1, (d.dy ? d.dy : 0));
                });

            nodeSel.exit().remove();
            linkSel.exit().remove();

            function dragmove(d) {
                d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
                self.sankey.relayout();
                linkSel.attr("d", path);
            }
        }

    },

    relayout: function() {
        this.resize();
        return this;
    },

    // called when things need repositioned, but not re-rendered from data
    // gets called before render
    resize: function() {
        //     // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        //     var jqElem = $(this.svg.node());
        //     var cx = jqElem.width(); //this.svg.node().clientWidth;
        //     var cy = jqElem.height(); //this.svg.node().clientHeight;
        //     var margin = this.options.margin;
        //     var width = Math.max(0, cx - margin.left - margin.right);
        //     var height = Math.max(0, cy - margin.top - margin.bottom);
        //
        // //debug
        // if (!this.boundsDebug) {
        //     this.boundsDebug = this.svg.append("rect").attr("x", 5).attr("y", 5).style("stroke", "red").style("fill", "none");
        // }
        //
        // this.boundsDebug.attr("width", width).attr("height", height);
        this.render();
        return this;
    },

    // highlightedProteinsChanged: function() {
    //     var highlightedParticipants = this.model.get("highlightedProteins");
    //     for (var highlightedParticipant of highlightedParticipants) {
    //         //console.log("*", highlightedParticipant.go);
    //         if (highlightedParticipant.go) {
    //             for (var goTerm of highlightedParticipant.go) {
    //                 d3.select("#" + goTerm)
    //                     .style("fill", "yellow");
    //             }
    //         }
    //     }
    //     return this;
    // },

    /*        selectedProteinsChanged: function() {
            for (var group of this.groupMap.values()) {
                if (group.children) {
                    group._children = group.children;
                    group.children = null;
                }
            }

            var selectedParticipants = this.model.get("selectedProteins");
            for (var selectedParticipant of selectedParticipants) {
                console.log("**", selectedParticipant.go);
                if (selectedParticipant.go) {
                    for (var goTerm of selectedParticipant.go) {
                        // d3.select("circle")
                        //   .style("fill", "#000");
                        if (this.groupMap.has(goTerm)) {
                            console.log("!", goTerm);
                            var group = this.groupMap.get(goTerm);
                            this.expandToShow(group);
                        }

                    }
                }
            }
            this.render(this.root);
            //this.resize();
            return this;
        },
    */
    identifier: "Go Terms View",
});

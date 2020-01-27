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
            top: 30,
            right: 20,
            bottom: 40,
            left: 60
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

        var termSelectData = ["cellular_component", "cellular_component part_of", "biological_process is_a", "biological_process part_of", "molecular_function is_a", "molecular_function part_of"];

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

        var vis = this.svg.append("g"); //.attr("transform", "translate(" + 310 + "," + 310 + ")");

        // this.svg.call(d3.behavior.zoom()
        //     .scaleExtent([1 / 2, 4])
        //     .on("zoom", zoomed));
        //
        // function zoomed() {
        //     vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        // }
        // ************** Generate the tree diagram	 *****************
        var margin = {
                top: 20,
                right: 120,
                bottom: 20,
                left: 120
            },
            width = 960 - margin.right - margin.left,
            height = 500 - margin.top - margin.bottom;

        this.i = 0;
        this.diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

        // var svg = d3.select("body").append("svg")
        //     .attr("width", width + margin.right + margin.left)
        //     .attr("height", height + margin.top + margin.bottom)
        //     .append("g")
        //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



        //four  layers
        this.backgroundGroup = vis.append("g");
        this.linkGroup = vis.append("g");
        this.foregroundGroup = vis.append("g");

        //this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);
        this.tree = d3.layout.tree().size(500, 500); //width, height);

        this.update();  // can do this here as go terms are available on the view's initialisation
    },

    render: function() {
        var termType = d3.select("#goTermsPanelgoTermSelect").selectAll("option")
            .filter(function(d) {
                return d3.select(this).property("selected");
            })
            .datum();

        var dag = this.model.get("goDags")[termType];

        function treeNode(dagNode, treeParent) {
            var node = {
                name: dagNode.name,
                parent: treeParent ? treeParent.name : null,
                _children: [],
                term: dagNode
            };
            for (var c of dagNode.is_aChildren) {
                if (c.getInteractors().size > 0) {
                    node._children.push(treeNode(c, node));
                }
            }
            return node;
        }

        this.root = treeNode(dag);

        this.root.x0 = 250; //height / 2;
        this.root.y0 = 0;

        this.update(this.root);
    },

    update: function(source) {
        var duration = 750;

        // Compute the new tree layout.
        var nodes = this.tree.nodes(this.root), //.reverse(),
            links = this.tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
        });

        var self = this;

        // Update the nodes…
        var node = this.foregroundGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++self.i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("contextmenu", function(d, i) {
                d3.event.preventDefault();
                // react on right-clicking
                self.click(d);
            })
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

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -13 : 13;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 10)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the nodes…
        var nodeBackground = this.backgroundGroup.selectAll("circle.nodeBackground")
            .data(nodes, function(d) {
                return d.id || (d.id = ++self.i)
            });

        // Enter any new nodes at the parent's previous position.
        var nodeBackgroundEnter = nodeBackground.enter().append("circle")
            .attr("class", "nodeBackground")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("contextmenu", function(d, i) {
                d3.event.preventDefault();
                // react on right-clicking
                self.click(d);
            })
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
            })
            .attr("r", function(d) {
                return Math.sqrt(d.term.getInteractors().size / Math.PI) * 20;
            })
            .style("fill", function(d) {
                return "white";
            });


        // Transition nodes to their new position.
        var nodeBackgroundUpdate = nodeBackground.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });
        //
        // nodeUpdate.select("circle")
        //     .attr("r", 10)
        //     .style("fill", function(d) {
        //         return d._children ? "lightsteelblue" : "#fff";
        //     });
        //
        // nodeUpdate.select("text")
        //     .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeBackgroundExit = nodeBackground.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeBackgroundExit.select("circle")
            .attr("r", 1e-6);

        /*

                var backgroundCircleSel = this.backgroundGroup.selectAll(".bcNode")
                    .data(nodes, function(d) {
                        return d.id;
                    });

                var bcEnter = backgroundCircleSel.enter().append("circle")
                    .classed("bcNode", true)
                    .attr("r", function(d) {
                      // console.log("I", d.getInteractors().size)
                        return Math.sqrt(d.getInteractors().size / Math.PI) * 10;
                    })
                backgroundCircleSel.exit().remove();*/

        // Update the links…
        var link = this.linkGroup.selectAll("path.goLink")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "goLink")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return self.diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", self.diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return self.diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    },

    // Toggle children on click.
    click: function(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        this.update(d);
    },

    relayout: function() {
        // relayout called before render
        this.resize();
        return this;
    },

    // called when things need repositioned, but not re-rendered from data
    resize: function() {
        console.log("resize");
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        var jqElem = $(this.chartDiv.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
        var cy = jqElem.height(); //this.svg.node().clientHeight;
        var margin = this.options.margin;
        var width = Math.max(0, cx); // - margin.left - margin.right);
        var height = Math.max(0, cy); // - margin.top - margin.bottom);
        this.svg.style("width", width).style("height", height);
        this.tree = d3.layout.tree().size([width, height]);
        if (this.root) {
            this.update(this.root);
        }

        return this;
    },

    highlightedProteinsChanged: function() {
        var highlightedParticipants = this.model.get("highlightedProteins");
        for (var highlightedParticipant of highlightedParticipants) {
            //console.log("*", highlightedParticipant.go);
            if (highlightedParticipant.go) {
                for (var goTerm of highlightedParticipant.go) {
                    d3.select("#" + goTerm)
                        .style("fill", "yellow");
                }
            }
        }
        return this;
    },

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

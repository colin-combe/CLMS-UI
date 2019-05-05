//		a matrix viewer
//
//		Colin Combe, Martin Graham
//		Rappsilber Laboratory, 2015

var CLMSUI = CLMSUI || {};

CLMSUI.GoTermsViewBB = CLMSUI.utils.BaseFrameView.extend({

    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            // "mousemove .mouseMat": "brushNeighbourhood",
            // "mousemove .clipg": "brushNeighbourhood",
            // "mouseleave .viewport": "cancelHighlights",
            // "mouseleave .clipg": "cancelHighlights",
            // "input .dragPanRB": "setMatrixDragMode",
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
                var value = this.value;
                var selectedDatum = d3.select(this).selectAll("option")
                    .filter(function(d) {
                        return d3.select(this).property("selected");
                    })
                    .datum();
                //self.setAndShowPairing(selectedDatum.value);
                var selElem = d3.select(d3.event.target);
                //setSelectTitleString(selElem);
            });


        var chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr("flex-grow", 1)
            .style("position", "relative");

        var viewDiv = chartDiv.append("div")
            .attr("class", "viewDiv");


        // SVG element
        this.svg = viewDiv.append("svg");

        this.vis = this.svg.append("g")
            .attr("transform", "translate(" + this.options.margin.left + "," + this.options.margin.top + ")");

        this.diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

        this.duration = 750;

        var self = this;
        this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);

        this.i = 0;
    },

    update: function() {

        var termSelectData = ["biological_ process"]; //, "molecular_function"];

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


        // ************** Generate the tree diagram	 *****************

        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        // var jqElem = $(this.svg.node());
        // var cx = jqElem.width(); //this.svg.node().clientWidth;
        // var cy = jqElem.height(); //this.svg.node().clientHeight;
        // var margin = this.options.margin;
        // var width = Math.max(0, cx - margin.left - margin.right);
        // var height = Math.max(0, cy - margin.top - margin.bottom);

        this.groupMap = new Map();
        var go = CLMSUI.compositeModelInst.get("go");
        console.log("go size:" + go.size)
        var self = this;
        // this.root = {};
        // this.root.name = "root";
        // this.root.id = "root";
        // this.root._children = [];

        function checkTerm(term) {
            if (!self.groupMap.has(term.id)) {
                var group = term;
                // group.name = term.name;
                // group.id = term.id;
                group.children = [];
                group.parents = [];

                if (term.is_a.size > 0) {
                    if (group.parent) {
                        alert("multiple isa/partof?");
                    }
                    var is_aValues = term.is_a.values();
                    for (var potentialParent of is_aValues) {
                        var parentId = potentialParent.split(" ")[0];
                        var parentTerm = go.get(parentId);
                        group.parents.push(parentTerm);
                        checkTerm(parentTerm);
                        parentTerm.children.push(group);
                    }

                    // if (potentialParents.length > 1) {
                    //   console.log("!" + !term.name, potentialParents)
                    // }

                    // var parentTerm = potentialParents[0];
                    // var parentGroup = checkTerm(parentTerm);
                    // if (parentGroup) {

                    // parentGroup._children.push(group);
                    // }
                    // }
                    // if (term.relationship) {
                    //     // console.log("£", term.relationship);
                    //     if (group.parent) {
                    //         alert("multiple isa/partof?");
                    //     }
                    //     var splitRel = term.relationship.split(" ");
                    //     if (splitRel[0] == "part_of") {
                    //         var parentGroup = checkTerm(splitRel[1]);
                    //         // if (parentGroup) {
                    //         group.parent = parentGroup;
                    //         parentGroup._children.push(group);
                    //         // }
                    //     }


                } else if (term.id == "GO0008150") {
                    self.biologicalProcess = group;
                } else if (term.id == "GO0003674") {
                    self.molecularFunction = group;
                } else if (term.id == "GO0005575") {
                    self.cellularComponent = group;
                }
                // else {
                //   group.parent = self.root;
                //   self.root._children.push(group);
                // }
                self.groupMap.set(group.id, group);
                return group;
            } else {
                return self.groupMap.get(term.id);
            }
            return null;
        };

        if (go) {
            for (var t of go.values()) {
                if (t.namespace == "biological_process") {
                    checkTerm(t);
                }
            }
        }

        this.root = this.biologicalProcess;

        var size = this.getTreeSize();

        this.root.x0 = size[1] / 2;
        this.root.y0 = 0;

        this.render(this.root);
    },

    render: function(source) {
      if (this.d3cola) {
        this.d3cola.stop();
      }

        // if (this.tree) {
        // Compute the new tree layout.
        // var nodes = this.tree.nodes(this.root).reverse(),
        //     links = this.tree.links(nodes);
        //
        // // Normalize for fixed-depth.
        // nodes.forEach(function(d) {
        //     d.y = d.depth * 180;
        // });

        var nodes = new Map(); // not hidden nodes
        var links = new Map();
        var l = 0, depthLimit = 3;
        recurseGroup(this.root, l);
        //
        // for (var c of this.root.children) {
        //     recurseGroup(c, 2);
        // }

        function recurseGroup(group, l) {
            if (!nodes.has(group.id)) {
                  if (l < depthLimit) {
                    console.log("rG:" + l, group);
                    nodes.set(group.id, group);
                    for (var p of group.parents) {
                        recurseGroup(p, l);
                        var fromId = p.id;
                        var toId = group.id;
                        var linkId = fromId + "-" + toId;
                        if (!links.has(linkId)) {
                            var linkObj = {};
                            linkObj.source = p; //.getRenderedParticipant();
                            linkObj.target = group; //.getRenderedParticipant();
                            linkObj.id = linkId;
                            links.set(linkId, linkObj);
                        }

                    }
                    for (var c of group.children) {
                        recurseGroup(c, l + 1);
                    }
                 }
            }
        };

        //  this.cola = cola.d3adaptor().nodes(nodes).avoidOverlaps(true);

        var bBox = this.svg.node().getBoundingClientRect();
        var width = 1000; //bBox ? bBox.width : 500;
        var height = 1000; //bBox ? bBox.height : 500;
        var k = 30; //Math.sqrt((width * height ) / (this.renderedProteins.size * this.renderedProteins.size));

        nodes = CLMS.arrayFromMapValues(nodes);
        var edges = CLMS.arrayFromMapValues(links);



        this.d3cola = cola.d3adaptor(d3);//.convergenceThreshold(0.1);

        this.d3cola
            .avoidOverlaps(true)
            .convergenceThreshold(1e-3)
            .flowLayout('x', 150)
            .size([width, height])
            .nodes(nodes)
            .links(edges);
          //  .jaccardLinkLengths(150);

        var link = this.vis.selectAll(".link")
            .data(edges)
            .enter().append("path")
            .attr("class", "link");

        var margin = 10,
            pad = 12;
        var node = this.vis.selectAll(".node")
            .data(nodes)
            .enter().append("rect")
            .classed("node", true)
            .attr('rx', 5)
            .attr('ry', 5)
            .call(this.d3cola.drag);

        var label = this.vis.selectAll(".label")
            .data(nodes)
            .enter().append("text")
            .attr("class", "label")
            .text(function(d) {
                return d.name;
            })
            .call(this.d3cola.drag)
            .each(function(d) {
                var b = this.getBBox();
                var extra = 2 * margin + 2 * pad;
                d.width = b.width + extra;
                d.height = b.height + extra;
            });

        var lineFunction = d3.svg.line()
            .x(function(d) {
                return d.x;
            })
            .y(function(d) {
                return d.y;
            });

        /*
                        var routeEdges = function() {
                            d3cola.prepareEdgeRouting();
                            link.attr("d", function(d) {
                                return lineFunction(d3cola.routeEdge(d
                                    // show visibility graph
                                    //, function (g) {
                                    //    if (d.source.id === 10 && d.target.id === 11) {
                                    //    g.E.forEach(function (e) {
                                    //        vis.append("line").attr("x1", e.source.p.x).attr("y1", e.source.p.y)
                                    //            .attr("x2", e.target.p.x).attr("y2", e.target.p.y)
                                    //            .attr("stroke", "green");
                                    //    });
                                    //    }
                                    //}
                                ));
                            });
                            if (isIE()) link.each(function(d) {
                                this.parentNode.insertBefore(this, this)
                            });
                        }*/
        this.d3cola.start(50, 100, 200).on("tick", function() {
            node.each(function(d) {
                    d.innerBounds = d.bounds.inflate(-margin);
                })
                .attr("x", function(d) {
                    return d.innerBounds.x;
                })
                .attr("y", function(d) {
                    return d.innerBounds.y;
                })
                .attr("width", function(d) {
                    return d.innerBounds.width();
                })
                .attr("height", function(d) {
                    return d.innerBounds.height();
                });

            link.attr("d", function(d) {
                // var route = cola.svg.makeEdgeBetween(d.source.innerBounds, d.target.innerBounds, 5);
                // return lineFunction([route.sourceIntersection, route.arrowStart]);
            });
            // if (isIE()) link.each(function(d) {
            //     this.parentNode.insertBefore(this, this)
            // });

            label
                .attr("x", function(d) {
                    return d.x
                })
                .attr("y", function(d) {
                    return d.y + (margin + pad) / 2
                });

        }); //.on("end", routeEdges);


        return this;
    },
    //
    // render: function(source) {
    //     if (this.tree) {
    //         // Compute the new tree layout.
    //         var nodes = this.tree.nodes(this.root).reverse(),
    //             links = this.tree.links(nodes);
    //
    //         // Normalize for fixed-depth.
    //         nodes.forEach(function(d) {
    //             d.y = d.depth * 180;
    //         });
    //
    //         //var i = 0;
    //         var self = this;
    //         // Update the nodes…
    //         var node = this.vis.selectAll("g.node")
    //             .data(nodes, function(d) {
    //                 return d.id || (d.id = ++self.i);
    //             });
    //
    //         var self = this;
    //         // Enter any new nodes at the parent's previous position.
    //         var nodeEnter = node.enter().append("g")
    //             .attr("class", "node")
    //             // .attr("title", function(d) {
    //             //     return d.name;
    //             // })
    //             .attr("transform", function(d) {
    //                 return "translate(" + source.y0 + "," + source.x0 + ")";
    //             })
    //             .on("click", function(d) {
    //                 self.model.setSelectedProteins([], false);
    //                 self.toSelect = new Set();
    //                 self.selectTerm(d);
    //                 self.model.setSelectedProteins(Array.from(self.toSelect), true);
    //                 self.click(d);
    //             })
    //             .on("mouseover", function(d) {
    //                 d3.select(this).select("circle").classed("highlightedProtein", true);
    //                 self.model.get("tooltipModel")
    //                     .set("header", "GO Term")
    //                     .set("contents", CLMSUI.modelUtils.makeTooltipContents.goTerm(d))
    //                     .set("location", {
    //                         pageX: d3.event.pageX,
    //                         pageY: d3.event.pageY
    //                     });
    //             })
    //             .on("mouseout", function(d) {
    //                 d3.select(this).select("circle").classed("highlightedProtein", false);
    //                 self.model.get("tooltipModel").set("contents", null);
    //             });
    //
    //         nodeEnter.append("circle")
    //             .attr("id", function(d) {
    //                 return d.id;
    //             })
    //             .attr("r", 1e-6)
    //             .style("fill", function(d) {
    //                 return d._children ? "lightsteelblue" : "#fff";
    //             });
    //
    //         nodeEnter.append("text")
    //             .attr("x", function(d) {
    //                 return d.children || d._children ? -13 : 13;
    //             })
    //             .attr("dy", ".35em")
    //             .attr("text-anchor", function(d) {
    //                 return d.children || d._children ? "end" : "start";
    //             })
    //             .text(function(d) {
    //                 return d.name;
    //             })
    //             .style("fill-opacity", 1e-6);
    //
    //         // Transition nodes to their new position.
    //         var nodeUpdate = node.transition()
    //             .duration(self.duration)
    //             .attr("transform", function(d) {
    //                 return "translate(" + d.y + "," + d.x + ")";
    //             });
    //
    //         nodeUpdate.select("circle")
    //             .attr("r", 10)
    //             .style("fill", function(d) {
    //                 //  return d._children ? "lightsteelblue" : "#fff";
    //             });
    //
    //         nodeUpdate.select("text")
    //             .style("fill-opacity", 1);
    //
    //         // Transition exiting nodes to the parent's new position.
    //         var nodeExit = node.exit().transition()
    //             .duration(self.duration)
    //             .attr("transform", function(d) {
    //                 return "translate(" + source.y + "," + source.x + ")";
    //             })
    //             .remove();
    //
    //         nodeExit.select("circle")
    //             .attr("r", 1e-6);
    //
    //         nodeExit.select("text")
    //             .style("fill-opacity", 1e-6);
    //
    //         // Update the links…
    //         var link = this.vis.selectAll("path.goLink")
    //             .data(links, function(d) {
    //                 return d.target.id;
    //             });
    //
    //         // Enter any new links at the parent's previous position.
    //         link.enter().insert("path", "g")
    //             .attr("class", "goLink")
    //             .attr("d", function(d) {
    //                 var o = {
    //                     x: source.x0,
    //                     y: source.y0
    //                 };
    //                 return self.diagonal({
    //                     source: o,
    //                     target: o
    //                 });
    //             });
    //
    //         // Transition links to their new position.
    //         link.transition()
    //             .duration(self.duration)
    //             .attr("d", self.diagonal);
    //
    //         // Transition exiting nodes to the parent's new position.
    //         link.exit().transition()
    //             .duration(self.duration)
    //             .attr("d", function(d) {
    //                 var o = {
    //                     x: source.x,
    //                     y: source.y
    //                 };
    //                 return self.diagonal({
    //                     source: o,
    //                     target: o
    //                 });
    //             })
    //             .remove();
    //
    //         // Stash the old positions for transition.
    //         nodes.forEach(function(d) {
    //             d.x0 = d.x;
    //             d.y0 = d.y;
    //         });
    //     }
    //     return this;
    // },

    // Toggle children on click.
    /*    click: function(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            this.render(d); // TODO
        },

        // Toggle children on click.
        expandToShow: function(d) {
            console.log("expanding:" + d.name, d)
            if (d._children) {
                d.children = d._children;
                d._children = null;
            }
            if (d.parent) {
                // var group = this.groupMap.get(d.parent);
                // if (group) {
                this.expandToShow(d.parent);
            } else {
                console.log("no parent?", d.name);
            }
            // }
        },


        selectTerm: function(d) {
            var goId = d.id;
            var proteins = this.model.get("clmsModel").get("participants");
            for (var protein of proteins.values()) {
                if (protein.go && protein.go.has(goId)) {
                    this.toSelect.add(protein);
                }
            }
            var children = d.children ? d.children : d._children;
            if (children) {
                for (var child of children) {
                    this.selectTerm(child);
                }
            }
        },
    */
    relayout: function() {
        this.resize();
        return this;
    },

    // called when things need repositioned, but not re-rendered from data
    resize: function() {
        // Firefox returns 0 for an svg element's clientWidth/Height, so use zepto/jquery width function instead
        // var jqElem = $(this.svg.node());
        // var cx = jqElem.width(); //this.svg.node().clientWidth;
        // var cy = jqElem.height(); //this.svg.node().clientHeight;
        // var margin = this.options.margin;
        // var width = Math.max(0, cx - margin.left - margin.right);
        // var height = Math.max(0, cy - margin.top - margin.bottom);
        //this.update(this.treeData2);
        //this.tree.size(this.getTreeSize());
//        this.render();
        return this;
    },

    getTreeSize: function() {
        // compute the new height
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, this.root);
        var newHeight = d3.max(levelWidth) * 30; // 20 pixels per line
        //tree = tree.size([newHeight, w]);

        var width = 2000;

        this.svg.attr("width", width + "px");
        this.svg.attr("height", newHeight + "px");
        var margin = this.options.margin;
        // var width = Math.max(0, cx - margin.left - margin.right);
        // var height = Math.max(0, cy - margin.top - margin.bottom)
        return [newHeight - margin.top - margin.bottom, width - margin.left - margin.right];
    },

    highlightedProteinsChanged: function() {
        var highlightedParticipants = this.model.get("highlightedProteins");
        for (var highlightedParticipant of highlightedParticipants) {
            //console.log("*", highlightedParticipant.go);
            if (highlightedParticipant.go) {
                for (var goTerm of highlightedParticipant.go) {
                    d3.select("#" + goTerm)
                        .style("fill", "#000");
                }
            }
        }
        return this;
    },

    selectedProteinsChanged: function() {
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

    identifier: "Go Terms View",
});

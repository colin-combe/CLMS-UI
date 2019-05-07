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

        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 5)
            .attr('refY', 5)
            .attr('markerWidth', 10)
            .attr('markerHeight', 8)
            .attr('orient', 'auto-start-reverse')
            .append('svg:path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', '#000');

        this.vis = this.svg.append("g");
        // .attr("transform", "translate(" + this.options.margin.left + "," + this.options.margin.top + ")");

        //        this.duration = 750;

        var self = this;
        this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        //  this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);
        this.d3cola = cola.d3adaptor(d3); //.convergenceThreshold(0.1);

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



        this.groupMap = new Map();
        var go = CLMSUI.compositeModelInst.get("go");
        console.log("go size:" + go.size)
        var self = this;

        function checkTerm(term) {
            if (!self.groupMap.has(term.id)) {
                var group = term;
                // group.name = term.name;
                // group.id = term.id;
                group.children = [];
                group.parents = [];
                group.height = 100;
                group.width = 100;
                group.expanded = false;
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
        this.root.expanded = true;
        // this.root.x0 = size[1] / 2;
        // this.root.y0 = 0;

        // this.render(this.root);
    },

    render: function() {
        console.log("GO RENDER!");
        if (this.d3cola) {
            this.d3cola.stop();
        }

        var nodes = new Map(); // not hidden nodes
        var links = new Map();
        var l = 0,
            depthLimit = 3;
        recurseGroup(this.root, l);
        //
        // for (var c of this.root.children) {
        //     recurseGroup(c, 2);
        // }

        function recurseGroup(group, l) {
            if (!nodes.has(group.id)) {
                // if (l < depthLimit) {
                //console.log("rG:" + l, group);
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
                if (group.expanded) {
                    for (var c of group.children) {
                        recurseGroup(c, l + 1);
                    }
                }
                // }
            }
        };

        var bBox = this.svg.node().getBoundingClientRect();
        var width = 4500; //bBox ? bBox.width : 500;
        var height = 4500; //bBox ? bBox.height : 500;

        nodes = CLMS.arrayFromMapValues(nodes);
        edges = CLMS.arrayFromMapValues(links);




        this.d3cola
            .avoidOverlaps(true)
            .convergenceThreshold(1e-3)
            .flowLayout('x', 100)
            .size([width, height])
            .nodes(nodes)
            .links(edges);
        //  .jaccardLinkLengths(150);

        var self = this;
        var margin = 10,
            pad = 12;
        var node = this.vis.selectAll(".node")
            .data(nodes, function(d) {
                return d.id;
            });

        var nodeEnter = node.enter().append("g")
            .classed("node", true)
            .on("click", function(d) {
                // self.model.setSelectedProteins([], false);
                // self.toSelect = new Set();
                // self.selectTerm(d);
                // self.model.setSelectedProteins(Array.from(self.toSelect), true);
                self.click(d);
            });

        // .on("mouseover", function(d) {
        //     d3.select(this).select("circle").classed("highlightedProtein", true);
        //     self.model.get("tooltipModel")
        //         .set("header", "GO Term")
        //         .set("contents", CLMSUI.modelUtils.makeTooltipContents.goTerm(d))
        //         .set("location", {
        //             pageX: d3.event.pageX,
        //             pageY: d3.event.pageY
        //         });
        // })
        // .on("mouseout", function(d) {
        //     d3.select(this).select("circle").classed("highlightedProtein", false);
        //     self.model.get("tooltipModel").set("contents", null);
        // });
      ///  node.exit().remove();

        nodeEnter.append("circle")
            .attr('r', 25);

        nodeEnter.append("text")
            .attr("class", "label")
            .text(function(d) {
                return d.name;
            });

        var link = this.vis.selectAll(".link")
            .data(edges, function(d) {
                return d.id;
            });

        var linkEnter =
            link.enter().append("line") //.append("path")
            .attr("class", "goLink");

        //link.exit().remove();

        this.d3cola.start(50, 100, 200).on("tick", function() {
            node
                // .each(function(d) {
                //         d.innerBounds = d.bounds.inflate(-margin);
                //     })
                // .attr("cx", function(d) {
                //     return d.x;
                // })
                // .attr("cy", function(d) {
                //     return d.y;
                // });

                .attr("transform", function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
            // .attr("width", function(d) {
            //     return d.innerBounds.width();
            // })
            // .attr("height", function(d) {
            //     return d.innerBounds.height();
            // });

            link.attr("x1", function(d) {
                return d.source.x;
            }).attr("y1", function(d) {
                return d.source.y;
            }).attr("x2", function(d) {
                return d.target.x;
            }).attr("y2", function(d) {
                return d.target.y;
            });
            // if (isIE()) link.each(function(d) {
            //     this.parentNode.insertBefore(this, this)
            // });

            // label
            //     .attr("x", function(d) {
            //         return d.x
            //     })
            //     .attr("y", function(d) {
            //         return d.y + (margin + pad) / 2
            //     });

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
    click: function(d) {
        d.expanded = true;
        // if (d.children) {
        //     d._children = d.children;
        //     d.children = null;
        // } else {
        //     d.children = d._children;
        //     d._children = null;
        // }
        this.render(); // TODO
    },

    /*
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
        // this.resize();
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
    /*
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
    */
    identifier: "Go Terms View",
});

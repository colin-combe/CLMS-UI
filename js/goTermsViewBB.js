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


        this.chartDiv = flexWrapperPanel.append("div")
            .attr("class", "panelInner")
            .attr("flex-grow", 1)
            .style("position", "relative");

        // SVG element
        this.svg = this.chartDiv.append("svg");

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

        this.svg.call(d3.behavior.zoom()
            .scaleExtent([1 / 2, 4])
            .on("zoom", zoomed));

        function zoomed() {
            self.vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }
        //        this.duration = 750;


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

        this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        //  this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);

        this.d3cola = cola.d3adaptor(d3)
    },

    update: function() {
        this.goTrees = CLMSUI.compositeModelInst.get("goTrees");
        this.root = this.goTrees.biologicalProcess;
        this.root.expanded = true;
        // this.render(this.root);
    },

    render: function() {
        console.log("GO RENDER!");
        if (this.d3cola) {
            this.d3cola.stop();
        }
        var self = this;
        var nodes = new Map(); // not hidden nodes
        var linkSubsetMap = new Map();
        var depthMap = new Map();
        recurseGroup(this.root);

        function recurseGroup(group) {
            if (!nodes.has(group.id)) { //}&& group.getInteractors().size > 0) {
                nodes.set(group.id, group);
                var sameDepthArr = depthMap.get(group.depth);
                if (!sameDepthArr) {
                    sameDepthArr = [];
                    depthMap.set(group.depth, sameDepthArr)
                }
                sameDepthArr.push(group);

                for (var p of group.parents) {
                    recurseGroup(p);
                    var fromId = p.id;
                    var toId = group.id;
                    var linkId = fromId + "_" + toId;
                    var link = linkSubsetMap.get(linkId);
                    if (!link) {
                        var link = {};
                        link.source = p; //.getRenderedParticipant();
                        link.target = group; //.getRenderedParticipant();
                        link.id = linkId;
                        linkSubsetMap.set(linkId, link);
                    }
                }
                if (group.expanded) {
                    for (var c of group.children) {
                        recurseGroup(c);
                    }
                }
            }
        };

        var bBox = this.chartDiv.node().getBoundingClientRect();
        var width = bBox ? bBox.width : 500;
        var height = bBox ? bBox.height : 500;

        nodes = CLMS.arrayFromMapValues(nodes);
        edges = CLMS.arrayFromMapValues(linkSubsetMap);

        console.log("wh:", width, height);
        var constraints = [];
        for (var sameDepth of depthMap.values()) {
            var constraint = {
                "type": "alignment",
                "axis": "x",
                //     "offsets": [
                //         {"node": "1","offset": "0"},
                //         {"node": "2", "offset": "0"},
                //         {"node": "3", "offset": "0"}
                //     ]
            }
            var offsets = [];
            for (var n of sameDepth) {
                var ni = nodes.indexOf(n);
                offsets.push({node: ni, offset:0});
            }
            constraint.offsets = offsets;
            constraints.push(constraint);
        }

        delete this.d3cola._lastStress;
        delete this.d3cola._alpha;
        delete this.d3cola._descent;
        delete this.d3cola._rootGroup;

        console.log("CONST", constraints)

        this.d3cola
            .avoidOverlaps(true)
            .convergenceThreshold(0.1)
            // .size([width, height * 4])
            .nodes(nodes)
            .links(edges)
            //.symmetricDiffLinkLengths()
            // .jaccardLinkLengths(40);
            .constraints(constraints)
            .flowLayout('x', 300)
            ;

        var self = this;
        var margin = 10,
            pad = 12;
        var node = this.vis.selectAll(".node")
            .data(nodes, function(d) {
                return d.id;
            });

        var nodeEnter = node.enter().append("g")
            .classed("node", true)
            .attr("id", function(d) {
                return d.id;
            })
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
        node.exit().remove();
        nodeEnter.append("circle")
            //.attr('r', 25);
            .attr("r", function(d) {
                return d.expanded ? 0 : d.getBlobRadius();
            });

        nodeEnter.append("text")
            .attr("class", "label")
            .text(function(d) {
                return d.depth + d.name;
            });

        var link = this.vis.selectAll(".goLink")
            .data(edges, function(d) {
                return d.id;
            });

        var linkEnter =
            link.enter().append("line") //.append("path")
            .classed("goLink", true)
            .attr("id", function(d) {
                return d.id;
            });

        link.exit().remove();

        //        node.select("circle").attr("r", function (d) {return d.expanded? 0 : d.getBlobRadius();})
        var nodeDebug = this.vis.selectAll(".nodeDebug")
            .data(nodes, function(d) {
                return d.id;
            });

        var nodeDebugEnter = nodeDebug
            .enter().append('rect')
            .classed('node', true)
            .attr({
                rx: 5,
                ry: 5
            })
            .style('stroke', "red")
            .style('fill', "none");

        nodeDebug.exit().remove();

        this.d3cola.start(10, 15, 20).on("tick", function() {
            node.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
            // .attr("width", function(d) {
            //     return d.innerBounds.width();
            // })
            // .attr("height", function(d) {
            //     return d.innerBounds.height();
            // });

            nodeDebug.attr({
                x: function(d) {
                    return d.bounds.x
                },
                y: function(d) {
                    return d.bounds.y
                },
                width: function(d) {
                    return 50;//d.bounds.width()
                },
                height: function(d) {
                    return 50;//d.bounds.height()
                }
            });

            link.attr("x1", function(d) {
                return d.source.x;
            }).attr("y1", function(d) {
                return d.source.y;
            }).attr("x2", function(d) {
                return d.target.x;
            }).attr("y2", function(d) {
                return d.target.y;
            });

        }); //.on("end", routeEdges);

        return this;
    },

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
        this.render();
    },

    /*
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

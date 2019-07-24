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
        var margin = this.options.margin;
        this.vis = this.svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");; //.attr("transform", "translate(" + 310 + "," + 310 + ")");
        this.backgroundGroup = this.vis.append("g");
        // this.linkGroup = vis.append("g");
        this.foregroundGroup = this.vis.append("g");
        this.listenTo(CLMSUI.vent, "goAnnotationsUpdated", this.update);
        //this.listenTo(this.model, "change:highlightedProteins", this.highlightedProteinsChanged);
        // this.listenTo(this.model, "change:selectedProteins", this.selectedProteinsChanged);
        this.sankey = d3.sankey();

    },

    //resize gets called before render
    update: function() {
        var termType = d3.select("#goTermsPanelgoTermSelect").selectAll("option")
            .filter(function(d) {
                return d3.select(this).property("selected");
            })
            .datum();

        var dag = CLMSUI.compositeModelInst.get("goDags")[termType];

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

/*
var nodes = new Map(); // not hidden nodes
var linkSubsetMap = new Map();
var depthMap = new Map();

if (this.root) {
    recurseGroup(this.root);
}

function recurseGroup(group) {
    if (!nodes.has(group.id)) {
        nodes.set(group.id, group);
        var sameDepthArr = depthMap.get(group.depth);
        if (!sameDepthArr) {
            sameDepthArr = [];
            depthMap.set(group.depth, sameDepthArr)
        }
        sameDepthArr.push(group);

        for (var p of group.is_a) { //getClosestVisibleParents().values()) {
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
            for (var c of group.is_aChildren) {
                recurseGroup(c);
            }
        }
    }
};

nodes = Array.from(nodes.values());

*/


        this.root = dag; //treeNode(dag);

        this.root.x0 = 250; //height / 2;
        this.root.y0 = 0;

        //
        // var jqElem = $(this.svg.node());
        // var cx = jqElem.width(); //this.svg.node().clientWidth;
        // var cy = jqElem.height(); //this.svg.node().clientHeight;
        // var margin = this.options.margin;
        // var width = Math.max(0, cx - margin.left - margin.right);
        // var height = Math.max(0, cy - margin.top - margin.bottom);

        var self = this;
        d3.json("energy.json", function(energy) {
            self.energy = energy;


            //self.render(this.root);
        });
    },

    render: function() {
        //        if (this.sankey) {
        console.log("RENDERING GO TERMS");
        var jqElem = $(this.svg.node());
        var cx = jqElem.width(); //this.svg.node().clientWidth;
        var cy = jqElem.height(); //this.svg.node().clientHeight;
        var margin = this.options.margin;
        var width = Math.max(0, cx - margin.left - margin.right);
        var height = Math.max(0, cy - margin.top - margin.bottom);

        this.sankey.nodeWidth(15)
            .nodePadding(10)
            .size([width, height]);


        this.sankey
            .nodes(this.energy.nodes)
            .links(this.energy.links)
            .layout(32);

        var formatNumber = d3.format(",.0f"),
            format = function(d) {
                return formatNumber(d) + " TWh";
            },
            color = d3.scale.category20();


        var path = this.sankey.link();
        var self = this;

        var energy = self.energy;



        var linkSel = self.backgroundGroup.selectAll(".goLink")
            .data(energy.links);

        var link = linkSel.enter().append("path")
            .sort(function(a, b) {
                return b.dy - a.dy;
            });

        link.append("title")
            .text(function(d) {
                return d.source.name + " → " + d.target.name + "\n" + format(d.value);
            });

        linkSel.exit().remove();

        var nodeSel = this.foregroundGroup.selectAll(".node")
            .data(energy.nodes);

        function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            self.sankey.relayout();
            link.attr("d", path);
        }

        var node = nodeSel
            .enter().append("g")
            .attr("class", "node");
            // .call(d3.behavior.drag()
            //     .origin(function(d) {
            //         return d;
            //     })
            //     .on("dragstart", function() {
            //         this.parentNode.appendChild(this);
            //     })
            //     .on("drag", dragmove));

        node.append("rect")
            .attr("width", self.sankey.nodeWidth())
            .style("fill", function(d) {
                return d.color = color(d.name.replace(/ .*/, ""));
            })
            .style("stroke", function(d) {
                return d3.rgb(d.color).darker(2);
            })
            .append("title")
            .text(function(d) {
                return d.name + "\n" + format(d.value);
            });

        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) {
                return d.dy / 2;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) {
                return d.name;
            })
            .filter(function(d) {
                return d.x < width / 2;
            })
            .attr("x", 6 + self.sankey.nodeWidth())
            .attr("text-anchor", "start");

        nodeSel.exit().remove();


        nodeSel.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
        nodeSel.selectAll("rect").attr("height", function(d) {
            return d.dy;
        });
        linkSel.attr("d", path).attr("class", "goLink")
            .style("stroke-width", function(d) {
                return Math.max(1, d.dy);
            });


        function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            self.sankey.relayout();
            link.attr("d", path);
        }
        //  }

    },


    // Toggle children on click.
    // click: function(d) {
    //     d.expanded = !d.expanded;
    //     this.render();
    // },

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







/*
            // add in the links
            var link = this.backgroundGroup.selectAll(".link")
                .data(energy.links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", path)
                .style("stroke-width", function(d) {
                    return Math.max(1, d.dy);
                })
                .sort(function(a, b) {
                    return b.dy - a.dy;
                });

            // add the link titles
            link.append("title")
                .text(function(d) {
                    return d.source.name + " → " +
                        d.target.name + "\n" + format(d.value);
                });

            // add in the nodes
            var node = this.foregroundGroup.selectAll(".node")
                .data(energy.nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.behavior.drag()
                    .origin(function(d) {
                        return d;
                    })
                    .on("dragstart", function() {
                        this.parentNode.appendChild(this);
                    })
                    .on("drag", dragmove));

            // add the rectangles for the nodes
            node.append("rect")
                .attr("height", function(d) {
                    return d.dy;
                })
                .attr("width", this.sankey.nodeWidth())
                .style("fill", function(d) {
                    return d.color = color(d.name.replace(/ .*/
/*, ""));
                })
                .style("stroke", function(d) {
                    return d3.rgb(d.color).darker(2);
                })
                .append("title")
                .text(function(d) {
                    return d.name + "\n" + format(d.value);
                });

            // add in the title for the nodes
            node.append("text")
                .attr("x", -6)
                .attr("y", function(d) {
                    return d.dy / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("transform", null)
                .text(function(d) {
                    return d.name;
                })
                .filter(function(d) {
                    return d.x < width / 2;
                })
                .attr("x", 6 + this.sankey.nodeWidth())
                .attr("text-anchor", "start");
*/

var CLMSUI = CLMSUI || {};
CLMSUI.utils = CLMSUI.utils || {};

CLMSUI.utils.circleArrange = function (proteins, options) {
    
    function makeNodeEdgeList (protein) {
        var node = {id: protein.id, length: protein.size, edges:[]};
        var edgeIds = d3.set();

        if (protein.crossLinks) {
            protein.crossLinks.forEach (function (clink) {
                // must have active matches, no intra-protein links, no repeated edges
                if (clink.filteredMatches_pp.length > 0
                    && clink.toProtein // added this check to account for linears (they have no toProtein)
                    && clink.fromProtein.id !== clink.toProtein.id && !edgeIds.has(clink.id)) {
                    var isFromId = clink.fromProtein.id === protein.id;
                    node.edges.push ({
                        edgeId: clink.id,
                        pos: isFromId ? clink.fromResidue : clink.toResidue,
                        otherNode: isFromId ? clink.toProtein.id : clink.fromProtein.id,
                        otherPos: isFromId ? clink.toResidue : clink.fromResidue,
                    });
                    edgeIds.add (clink.id);
                }
            });
        }
        // MJG might not need to sort if nesting anyways - 21/03/2017 - update: yeah, we don't need to
        //node.edges.sort (function (a,b) { return b.pos-a.pos; });
        node.total = node.edges.length;
        //console.log ("flat edges", node.edges);
        
        node.edges = d3.nest()
            .key(function(d) { return d.pos; })
            .entries(node.edges)
        ;
        //console.log ("nested edges", node.edges);

        return node;
    }
    
    
    function makeNodeEdgeLists (proteins) {
        var map = CLMS.arrayFromMapValues(proteins).map (function (protein) {
            return makeNodeEdgeList (protein);
        });
        return map;
    }
    
    
    // pick which node to start with
    var nextNodeAlternatives = {
        
        // pick node with most number of edges to nodes in pmap
        inwardConn: function (nodeLinkArr, pMap) {
           var max = {max: -1, node: null};
            nodeLinkArr.forEach (function (nodeLink) {
                if (!pMap[nodeLink.id]) {
                    var cur = 0;
                    nodeLink.edges.forEach (function(pos) {
                        pos.values.forEach (function (edge) {
                            if (pMap[edge.otherNode]) {
                                cur++;
                            }
                        });
                    });
                    if (cur > max.max) {
                        max.max = cur;
                        max.node = nodeLink;
                    }
                }
            }); 
            return max;
        },
    
    
        // pick node with least number of edges to nodes not in pmap
        outwardConn: function (nodeLinkArr, pMap) {
            var min = {min: Number.MAX_SAFE_INTEGER, node: null};
            nodeLinkArr.forEach (function (nodeLink) {
                if (!pMap[nodeLink.id]) {
                    var cur = 0;
                    nodeLink.edges.forEach (function (pos) {
                        pos.values.forEach (function (edge) {
                            if (!pMap[edge.otherNode]) {
                                cur++;
                            }
                        });
                    });
                    if (cur < min.min) {
                        min.min = cur;
                        min.node = nodeLink;
                    }
                }
            }); 

            return min;
        }
    };
    
    
    // pick which end to add subsequent nodes to.
    var endingAlternatives = {
        
        // Baur & Brandes, crossing reduction in circular layouts
        // http://algo.uni-konstanz.de/publications/bb-crcl-04.pdf
        
        // Baur end append routine 1
        randomEnd: function (order, node) {
            var pos = (Math.random() > 0.5) ? order.length : 0;
            order.splice (pos, 0, node);
        },

        // Baur end append routine 2
        fixedEnd: function (order, node) {
            order.push (node);
        },

        // Baur end append routine 3
        // Calculate lengths of links to be added and work out which end the total will be shortest at.
        leastLengthEnd: function (order, node, interLinks) {
            
            var allDistance = interLinks.reduce (function (tot, node) {
                return tot + node.length;
            }, 0);
            
            var orderDistance = order.reduce (function (tot, node) {
                return tot + node.length;
            }, 0);
    
            var thisNodeSize = node.length;

            var runDistance = 0;
            var leftDistance = 0;
            var rightDistance = 0;
            order.forEach (function (pnode) {
                pnode.edges.forEach (function (pos) {
                    pos.values.forEach (function (edge) {
                        //console.log ("val", val);
                        if (edge.otherNode === node.id) {
                            var leftDist = (thisNodeSize - edge.otherPos) + runDistance + edge.pos;
                            var circLeftDistance = Math.min (allDistance - leftDist, leftDist); // might be closer via circle 'gap'
                            leftDistance += circLeftDistance;

                            var rightDist = (orderDistance + edge.otherPos) - (runDistance + edge.pos);
                            var circRightDistance = Math.min (allDistance - rightDist, rightDist); // might be closer via circle 'gap'
                            rightDistance += circRightDistance;
                        }
                    });
                });
                runDistance += pnode.length;
            });

            //console.log (node, "left", leftDistance, "right", rightDistance);  
            var pos = (leftDistance > rightDistance) ? order.length : 0;
            order.splice (pos, 0, node);

            return order;
        },


        // Baur end append routine 4A - added stuff by me
        // check for open-edge crossings on individual level
        // check for open-edge crossings in added protein too depending on direction added
        leastCrossingsEnd: function (order, node, interLinks, pMap) {

            var returnMinOrder = function (crossings, orders) {
                var order = orders[0];
                var min = 1000;
                for (var n = 0; n < crossings.length; n++) {
                    if (crossings[n] < min) {
                        min = crossings[n];
                        order = orders[n];
                    }
                }
                return order;
            };
            
            var lcrossTest = [node].concat(order);
            var rcrossTest = order.concat(node);
            var orders = [lcrossTest, rcrossTest];
            //console.log ("l", lcrossTest, rcrossTest, node, order);
            var crossings = orders.map (function (run) {
                var tot = 0;
                var active = 0;
                var activeSet = d3.set();
                run.forEach (function (pnode) {
                    pnode.edges.forEach (function (pos) {
                        var curActive = active;
                        var openCount = 0;
                        pos.values.forEach (function (edge) {
                            var enode = edge.otherNode;
                            var isOpenEdge = !(enode === node.id || pMap[enode]); // is edge that has unlinked endpoint in current node set
                            if (isOpenEdge) {
                                openCount++;
                            } else if (activeSet.has(edge.edgeId)) {
                                activeSet.remove (edge.edgeId);
                                active--;
                                curActive--;
                            } else {
                                activeSet.add (edge.edgeId);
                                active++;
                            }
                        });
                        tot += (curActive * openCount); // use curClosed so we don't include links opened at same pos as crossings
                        //console.log ("pnode", pnode, "pos", pos, "curClosed", curClosed, "openCount", openCount, "tot", tot);
                    });    
                });
                return tot;
            });

            order = returnMinOrder (crossings, orders);
            //console.log ("leastCross", crossings);   
            return order;
        },
    };


    var shuffleAlternatives = {
        leastCrossingsEnd2: function (order, node, interLinks, pMap, variations) {

            //console.log ("RUN", run);
            function countCrossing (run) {
                var tot = 0;
                var active = 0;
                var activeSet = d3.set();
                var activeArr = [];

                run.forEach (function (pnode) {
                    //console.log ("NODE", pnode.id, pnode);
                    pnode.edges.forEach (function (pos) {
                        var curActive = active;
                        var openCount = 0;
                        var l = activeArr.length;
                        var removed = [];
                        pos.values.forEach (function (edge) {
                            if (activeSet.has(edge.edgeId)) {
                                //activeSet.remove (edge.edgeId);
                                active--;
                                curActive--;
                                removed.push (activeArr.indexOf(edge.edgeId)); 
                            }
                        });
                        var remLen = removed.length;
                        if (remLen) {
                            removed.sort (function(a,b) { return a - b; }); // grr, default is to sort numbers alphabetically
                            //console.log ("removed", removed, activeArr);
                            for (var n = remLen ; --n >= 0;) {
                                var rpos = removed[n];
                                var ropen = ((l - rpos) - (remLen - n));
                                tot += ropen;
                                //console.log ("r", l-rpos, l, rpos, ropen, activeArr, activeArr.length, tot);   
                                activeArr.splice(rpos, 1);
                            }
                            //console.log ("postremoved", activeArr);
                        }

                        pos.values.forEach (function (edge) {
                            var enode = edge.otherNode;
                            var isOpenEdge = !(enode === node.id || pMap[enode]); // is edge that has unlinked endpoint in current node set
                            if (isOpenEdge) {
                                openCount++;
                            } else if (activeSet.has(edge.edgeId)) {
                                activeSet.remove (edge.edgeId);
                            } else {
                                activeSet.add (edge.edgeId);
                                activeArr.push (edge.edgeId);
                                active++;
                            }
                        });

                        tot += (curActive * openCount); // use curActive so we don't include links opened at same pos as crossings
                        //console.log ("pnode", pnode, "pos", pos, "curActive", curActive, "activeArr", activeArr, "openCount", openCount, "tot", tot);
                    });    
                });
                return tot;
            }

            // Random shuffle
            function shuffle () {
                var newOrder = order.slice(0);
                var n = Math.floor ((Math.random() * order.length));
                var m = Math.floor ((Math.random() * order.length));
                var temp = newOrder[n];
                newOrder[n] = newOrder[m];
                newOrder[m] = temp;
                return newOrder;
            }

            var min = 100000;
            var shuffledOrder = order;
            for (var n = 0; n < variations && min > 0; n++) {
                var crossings = countCrossing (shuffledOrder);
                if (crossings < min) {
                    min = crossings;
                    order = shuffledOrder;
                }
                shuffledOrder = shuffle(order);
                //console.log (crossings, shuffledOrder, "cur | min", min, order);
            }

            return order;
        }
    };
    

    
    function sort (interLinks, options) {
        var order = [];
        var pMap = {};
        interLinks.sort (function(a,b) {
            return b.total - a.total;
        });
        
        console.log (this);
          
        for (var n = 0; n < interLinks.length; n++) {
            // pick the next node to add to the previously added nodes
            var choice = nextNodeAlternatives[options.crossingMethod] (interLinks, pMap);

            // pick which end of the list of previously added nodes to add this next node to
            order = endingAlternatives["leastCrossingsEnd"](order, choice.node, interLinks, pMap);
            pMap[choice.node.id] = true;
        }
        
        order = shuffleAlternatives["leastCrossingsEnd2"](order, {id: null}, interLinks, pMap, 50);
        return order;
    }
    
    var pArray = CLMS.arrayFromMapValues(proteins);
    if (pArray.length < 2) {
        return (pArray.length === 1 ? [pArray[0].id] : []);
    }
    
    
    var interLinks = makeNodeEdgeLists (proteins);
    var defaults = {crossingMethod: "inwardConn", endType: "leastCrossingsEnd"};
    var combinedOptions = $.extend ({}, defaults, options || {});
    
    return sort(interLinks, combinedOptions).map(function(node) { return node.id; });
};

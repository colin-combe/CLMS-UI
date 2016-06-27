var CLMSUI = CLMSUI || {};
CLMSUI.utils = CLMSUI.utils || {};

CLMSUI.utils.circleArrange = function (proteins) {
    
    function makeNodeEdgeList (protein) {
        var node = {id: protein.id, length: protein.size, edges:[]};
        var edgeIds = d3.set();
        protein.crossLinks.forEach (function (clink) {
            // must have active matches, no intra-protein links, no repeated edges
            if (clink.filteredMatches.length > 0 && clink.fromProtein.id !== clink.toProtein.id && !edgeIds.has(clink.id)) {
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
        node.edges.sort (function (a,b) { return b.pos-a.pos; });
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
        var map = Array.from(proteins.values()).map (function (protein) {
            return makeNodeEdgeList (protein);
        });
        return map;
    }
    
    
    // pick node with most number of edges to nodes in pmap
    function inwardConn (nodeLinkArr, pMap) {
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
    }
    
    
    // pick node with least number of edges to nodes not in pmap
    function outwardConn (nodeLinkArr, pMap) {
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
    
    // Baur end append routine 1
    function randomEnd (order, node) {
        var pos = (Math.random() > 0.5) ? order.length : 0;
        order.splice (pos, 0, node);
    }
    
    // Baur end append routine 2
    function fixedEnd (order, node) {
        order.push (node);
    }
    
    // Baur end append routine 3
    function leastLengthEnd (order, node, interLinks) {
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
    }
    
    function returnMinOrder (crossings, orders) {
        var order = orders[0];
        var min = 1000;
        for (var n = 0; n < crossings.length; n++) {
            if (crossings[n] < min) {
                min = crossings[n];
                order = orders[n];
            }
        }
        return order;
    }

    
    // Baur end append routine 4A - added stuff by me
    // check for open-edge crossings on individual level
    // check for open-edge crossings in added protein too depending on direction added
    function leastCrossingsEnd (order, node, interLinks, pMap) {

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
    }
    
    
    function leastCrossingsEnd2 (order, node, interLinks, pMap, variations) {

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
            console.log (crossings, shuffledOrder, "cur | min", min, order);
        }

        return order;
    }
    
    
    function sort (interLinks) {
        var order = [];
        var pMap = {};
        interLinks.sort (function(a,b) {
            return b.total - a.total;
        });
        
        for (var n = 0; n < interLinks.length; n++) {
            var choice = inwardConn (interLinks, pMap);
            //console.log ("choice", choice);
            //fixedEnd (pOrder, choice.protein);
            //leastLengthEnd (order, choice.node, interLinks);
            order = leastCrossingsEnd (order, choice.node, interLinks, pMap);
            pMap[choice.node.id] = true;
        }
        
        order = leastCrossingsEnd2 (order, {id: null}, interLinks, pMap, 50);
        return order;
    }
    
    var pArray = Array.from (proteins.values());
    if (pArray.length < 2) {
        return (pArray.length === 1 ? [pArray[0].id] : []);
    }
    
    var interLinks = makeNodeEdgeLists (proteins);
    return sort(interLinks).map(function(node) { return node.id; });
};
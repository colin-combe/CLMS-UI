var CLMSUI = CLMSUI || {};

CLMSUI.utils = {
    getSVG: function (d3SvgSelection) {
        console.log ("domElem", d3SvgSelection.node());
        var a = d3SvgSelection.node().outerHTML;
        a=a.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events" ');
        return'<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'+a;
    },
    
    addFourCorners: function (d3DivSelection) {
        var classNames = ["dynDiv_resizeDiv_tl", "dynDiv_resizeDiv_tr", "dynDiv_resizeDiv_bl", "dynDiv_resizeDiv_br"];
        var fourCorners = d3DivSelection
            .selectAll("div")
            .data(classNames, function(d) { return d; })    // key on classnames
            .enter()
            .append("div")
                .attr("class", function(d) { return d; } )  // make class the classname entry
        ;
        return fourCorners;
    },
    
    addDynDivParentBar: function (d3DivSelection) {
        var parentBar = d3DivSelection
            .append("div")
            .attr("class", "dynDiv_moveParentDiv")
                .append ("i")
                .attr ("class", "fa fa-times-circle closeButton")
                // below 2 lines not needed as handled/set up in respective backbone view (now using closeButton class as identifier)
                // means we dont need hardcoded unique ids or top-level functions like showDistoPanel hanging around the code
                //.attr ("id", "distoHide")
                //.on ("click", function() { showDistoPanel (false); })
        ;
        return parentBar;
    },
    
    addDynDivScaffolding : function (d3DivSelection) {
        CLMSUI.utils.addDynDivParentBar (d3DivSelection);
        CLMSUI.utils.addFourCorners (d3DivSelection);
    },
    
    // http://stackoverflow.com/questions/10066630/how-to-check-if-element-is-visible-in-zepto
    isZeptoDOMElemVisible : function (zeptoElem) {   // could be a jquery-ref'ed elem as well
        return (zeptoElem.css('display') != 'none' && zeptoElem.css('visibility') != 'hidden' && zeptoElem.height()>0);
    },
    
    // try .layerX / .layerY first as .offsetX / .offsetY is wrong in firefox
    // in fact don't use layerX / offsetX, they're unreliable cross-browser
    crossBrowserElementX : function (evt, optElem) {
        return evt.clientX - $(optElem || evt.target).offset().left;    // use evt.target if no optional element passed
        //return (evt.layerX || evt.offsetX) - evt.target.offsetLeft;    
    },
    
    crossBrowserElementY : function (evt) {
        return evt.clientY - $(optElem || evt.target).offset().top; 
    },
    
    checkBoxView: Backbone.View.extend ({
        tagName: "span",
        className: "buttonPlaceholder",
        events: {
            "click input": "checkboxClicked"
        },
    
        initialize: function (viewOptions) {
            var self = this;
            var defaultOptions = {
                labelFirst: true
            };   
            this.options = _.extend(defaultOptions, viewOptions.myOptions);
                
            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el);
            if (!sel.attr("id")) {
                sel.attr("id", this.options.id);
            }
            var myid = "#" + sel.attr("id");
            
            var labs = sel.append("label")
                .attr("class", "btn")
                .style("padding-left", "0px")
            ;
            if (this.options.labelFirst) {
                labs.append("span").text(this.options.label);
            }
            labs.append ("input")
                .attr ("id", myid+"ChkBx")
                .attr("type", "checkbox")
            ;
            if (!this.options.labelFirst) {
                labs.append("span").text(this.options.label);
            }
            
            this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
        },
        
        showState : function (boolVal) {
            d3.select(this.el).select("input").property("checked", boolVal);
        },
        
        checkboxClicked: function () {
            CLMSUI.vent.trigger (this.options.eventName, d3.select(this.el).select("input").property("checked"));
        }
    }),
    
    addCheckboxBackboneView : function (options) {                        
        return new CLMSUI.utils.checkBoxView ({myOptions: options});        
    },
    
    dpNumber: function (num, decimalPlaces, roundFunc) {
        var powerOfTen = Math.pow (10, decimalPlaces);
        return (roundFunc(num * powerOfTen) / powerOfTen).toFixed(decimalPlaces);
    },
    
    niceRoundMap: {1: 1, 2: 2, 3: 3, 4: 5, 5: 5, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10},
    
    niceRound: function (val) {
        var log = Math.floor (Math.log10 (val));
        var pow = Math.pow (10, log);
        val = Math.ceil (val / pow);  // will now be a number 1-10
        var roundVal = CLMSUI.utils.niceRoundMap[val];
        roundVal *= pow;
        return roundVal;
    },
    
    displayError: function (condition, message) {
        if (condition()) {
            var box = d3.select("#clmsErrorBox");
            if (box.size() == 0) {
                box = d3.select("body").append("div").attr("id", "clmsErrorBox");
            }
            
            box
                .style("display", "block")
                .html (message)
            ;
        }
    },
    
    RadioButtonFilterViewBB: Backbone.View.extend ({
        tagName: "div",
        events: {
            "click .singleRadioButton": "changeFilter"
        },
        initialize: function (initData) {
            var defaultOptions = {
                states: [0,1],
                labels: ["Option 1", "Option 2"],
                header: "A Filter",
                eventName: undefined,
                labelGroupFlow: "horizontalFlow"
            };
            this.options = _.extend(defaultOptions, initData.myOptions);   
            if (this.options.eventName) {
                this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
            }
            this.render();
        },
         
         render: function () {
             var self = this;
             var con = d3.select(this.el);           
             con.append("p").attr("class", "headerLabel").text(this.options.header);
             
             var sel = con.selectAll("label.singleChoice").data(this.options.states);
             var labs = sel.enter()
                .append ("label")
                .attr("class", "singleChoice "+self.options.labelGroupFlow)
             ;
             labs 
                .append ("input")
                .attr("type", "radio")
                .attr("name", self.el.id + "RBGroup")
                .attr("value", function(d) { return d; })
                .attr("class", "singleRadioButton")
                //.property("checked", function(d,i) { return i == self.options.presetIndex; })
             ;
            var labels = this.options.labels;
             labs.append("span").text(function(d,i) { return labels[i]; });
         },
        
        showState : function (filterVal) {
            //console.log ("in show state rb", filterVal);
            var self = this;
            d3.select(this.el).selectAll("input.singleRadioButton")
                .property("checked", function(d,i) { return self.options.states[i] == filterVal; })
            ;
        },
         
         changeFilter: function (evt) {
             if (this.options.eventName) {
                CLMSUI.vent.trigger (this.options.eventName, +evt.currentTarget.value);
             }
         }
     }),
    
    BaseFrameView: Backbone.View.extend ({
        
        events: {
            // following line commented out, mouseup sometimes not called on element if pointer drifts outside element 
            // and dragend not supported by zepto, fallback to d3 instead (see later)
            // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
            "click .downloadButton": "downloadSVG",
            "click .closeButton": "hideView",
            "click": "bringToTop",
        },
        
        initialize: function (viewOptions) {
            
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            // Set up some html scaffolding in d3
            CLMSUI.utils.addDynDivScaffolding (mainDivSel);

            // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
            var drag = d3.behavior.drag().on ("dragend", function() { self.relayout(); });
            mainDivSel.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
                .call (drag)
            ;
            
            if (this.displayEventName) {
                this.listenTo (CLMSUI.vent, this.displayEventName, this.setVisible);
            }
            
            return this;
        },
        
        render: function () {
            return this;
        },
        
        relayout: function () {
            return this;
        },
        
        downloadSVG: function () {
            //var svgString = CLMSUI.utils.getSVG(d3.select(this.el).select("svg"));
            var svgSel = d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);
            //console.log ("xml", svgXML);
            download (svgXML, 'application/svg', "view.svg");
        },
        
        hideView: function () {
            CLMSUI.vent.trigger (this.displayEventName, false);
        },
        
        // find z-indexes of all visible, movable divs, and make the current one a higher z-index
        // then a bit of maths to reset the lowest z-index so they don't run off to infinity
        bringToTop : function () {
            var z = [];
            var activeDivs = d3.selectAll(".dynDiv").filter (function() {
                return CLMSUI.utils.isZeptoDOMElemVisible ($(this));
            });
            // default z-index is "auto" on firefox, + on this returns NaN, so need || 0 to make it sensible
            activeDivs.each (function(d,i) { z[i] = +d3.select(this).style("z-index") || 0; });   // all the z-indexes
            var range = d3.extent (z/*.filter (function(zi) { return zi !== 0; })*/);
            activeDivs.style("z-index", function() {
                return Math.max (0, +d3.select(this).style("z-index") - range[0] + 1);
            });
            d3.select(this.el).style("z-index", range[1] - range[0] + 2);
        },

        setVisible: function (show) {
            d3.select(this.el).style ('display', show ? 'block' : 'none');

            if (show) {
                this
                    .relayout() // need to resize first sometimes so render gets correct width/height coords
                    .render()
                ;
                this.bringToTop();
            }
        },
        
        // Ask if view is currently visible in the DOM
        isVisible: function () {
            return CLMSUI.utils.isZeptoDOMElemVisible (this.$el);   
        },
        
        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy a c3 view just to be sure)
        remove: function () {
            // remove drag listener
            d3.select(this.el).selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br").on(".drag", null); 

            // this line destroys the containing backbone view and it's events
            Backbone.View.prototype.remove.call(this);
        }
    }),
};


CLMSUI.utils.KeyViewBB = CLMSUI.utils.BaseFrameView.extend ({
    initialize: function () {
        CLMSUI.utils.KeyViewBB.__super__.initialize.apply (this, arguments);
        
        var chartDiv = d3.select(this.el).append("div")
            .attr("class", "panelInner")
        ;       
        // we don't replace the html of this.el as that ends up removing all the little re-sizing corners and the dragging bar div
        chartDiv.html ("<img id='defaultLinkKey' src='./images/fig3_1.svg'><br><img id='logo' src='./images/logos/rappsilber-lab-small.png'>");
        
        return this;
    }
});


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
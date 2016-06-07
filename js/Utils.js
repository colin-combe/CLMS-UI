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

CLMSUI.utils.circleArrange = function (proteins, crosslinks) {
    function chunk (proteins, crosslinks) {
        var map = {};
        proteins.forEach (function (protein) {
            map[protein.id] = {total: 0};    
        });
        crosslinks.forEach (function (xlink) {
            if (xlink.toProtein.id !== xlink.fromProtein.id) {
                var pto = xlink.toProtein.id;
                var pfrom = xlink.fromProtein.id;
                map[pto] = map[pto] || {};
                map[pfrom] = map[pfrom] || {};
                map[pto][pfrom] = map[pto][pfrom] || 0;
                map[pto][pfrom]++;    
                map[pto].total++;
                map[pfrom][pto] = map[pfrom][pto] || 0;
                map[pfrom][pto]++;    
                map[pfrom].total++;
            }
        });
        console.log ("map", map);
        return map;
    }
    
    console.log ("proteins", proteins);
    var interLinks = chunk (proteins, crosslinks);
    
    
    function inwardConn (interLinkArr, pMap) {
       var max = {max: -1, protein: null};
        interLinkArr.forEach (function (interLink) {
            console.log ("il", interLink);
            if (!pMap[interLink.key]) {
                var cur = 0;
                var vals = d3.entries(interLink.value);
                vals.forEach (function(val) {
                    console.log ("val", val);
                    if (pMap[val.key]) {
                        cur += val.value;
                    }
                });
                if (cur > max.max) {
                    max.max = cur;
                    max.protein = interLink.key;
                }
            }
        }); 
        
        return max;
    }
    
    function outwardConn (interLinkArr, pMap) {
       var min = {min: Number.MAX_SAFE_INTEGER, protein: null};
        interLinkArr.forEach (function (interLink) {
            console.log ("ol", interLink);
            if (!pMap[interLink.key]) {
                var cur = 0;
                var vals = d3.entries(interLink.value);
                vals.forEach (function(val) {
                    console.log ("val", val);
                    if (!pMap[val.key] && val.key !== "total") {
                        cur += val.value;
                    }
                });
                if (cur < min.min) {
                    min.min = cur;
                    min.protein = interLink.key;
                }
            }
        }); 
        
        return min;
    }
    
    // Baur end append routine 1
    function randomEnd (pOrder, protein) {
        if (Math.random() > 0.5) {
            pOrder.push (protein);
        } else {
            pOrder.splice (0, 0, protein);
        }
    }
    
    // Baur end append routine 2
    function fixedEnd (pOrder, protein) {
        pOrder.push (protein);
    }
    
    // Baur end append routine 3
    function leastLengthEnd (pOrder, protein, interLinks, proteins) {
        var leftDistance = 0;
        var runDistance = 0;
        pOrder.forEach (function (pid) {
            var linksB = interLinks[pid][protein] || 0;
            var proteinB = proteins.get(pid);
            //console.log ("pb", interLinks, linksB, pid, protein, proteinB);
            var linkDistance = ((proteinB.size / 2) + runDistance) * linksB;
            runDistance += proteinB.size;
            leftDistance += linkDistance;
        });
        
        runDistance = 0;
        var rightDistance = 0;
        for (var n = pOrder.length; --n >= 0;) {
            var pid = pOrder[n];
            var linksB = interLinks[pid][protein] || 0;
            var proteinB = proteins.get(pid);
            var linkDistance = ((proteinB.size / 2) + runDistance) * linksB;
            runDistance += proteinB.size;
            rightDistance += linkDistance;
        }
        
        //console.log (protein, "left", leftDistance, "right", rightDistance);  
        if (leftDistance < rightDistance) {
            pOrder.splice (0, 0, protein);
        } else {
            pOrder.push (protein);
        }
    }
    
    // Baur end append routine 4
    function leastCrossingsEnd (pOrder, protein, interLinks, proteins, pMap) {
        var protCrossings = interLinks[protein];
        var openLinkArr = pOrder.map (function (prot) {
            var links = d3.entries(interLinks[prot]);
            var openLinks = 0;
            links.forEach (function(link) {
                if (link.key !== "total" && !pMap[link.key] && link.key !== protein) {
                    openLinks += link.value;
                }
            });
            return openLinks;
        });
        
        var totCount = 0;
        var fArr = pOrder.slice(0).reverse().map (function (prot) {
            var linkCount = protCrossings[prot] || 0;
            totCount += linkCount;
            return totCount - linkCount;
        });
        fArr.reverse();
        
        totCount = 0;
        var rArr = pOrder.map (function (prot) {
            var linkCount = protCrossings[prot] || 0;
            totCount += linkCount;
            return totCount - linkCount;
        });
        rArr.reverse();
        
        var fScore = 0;
        var ftArr = fArr.map (function (val, i) {
            fScore += val * openLinkArr[i];
            return val * openLinkArr[i];
        });
        
        var revOpenLinkArr = openLinkArr.slice(0).reverse();
        var rScore = 0;
        var rtArr = rArr.map (function (val, i) {
            rScore += val * revOpenLinkArr[i];
            return val * revOpenLinkArr[i];
        });
        
        console.log ("leastCross", openLinkArr, fArr, rArr, ftArr, rtArr, fScore, rScore);
        
        if (fScore < rScore) {
            pOrder.splice (0, 0, protein);
        } else {
            pOrder.push (protein);
        }
    }
    
    
    function sort (interLinks) {
        var pOrder = [];
        var pMap = {};
        var interLinkArr = d3.entries(interLinks);
        interLinkArr.sort (function(a,b) {
            return b.value.total - a.value.total;
        });
        pOrder.push (interLinkArr[0].key);
        pMap[interLinkArr[0].key] = true;
        
        for (var n = 0; n < interLinkArr.length - 1; n++) {
            var choice = inwardConn (interLinkArr, pMap);
            
            console.log ("choice", choice);
            //fixedEnd (pOrder, choice.protein);
            leastLengthEnd (pOrder, choice.protein, interLinks, proteins);
            //leastCrossingsEnd (pOrder, choice.protein, interLinks, proteins, pMap);
            pMap[choice.protein] = true;
        }
        
        console.log ("ila", interLinkArr, pMap, pOrder);
        return pOrder;
    }
    
    return sort (interLinks);
};
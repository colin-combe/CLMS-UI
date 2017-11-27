var CLMSUI = CLMSUI || {};

CLMSUI.utils = {
    
    debug: false,
    
    xilog: function () {
        if (this.debug && (typeof(console) !== 'undefined')) {
            console.log.apply (console, arguments);
        }
    },
    
    commonRegexes: {
        uniprotAccession: new RegExp ("[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}", "i"),
        pdbPattern: "[A-Za-z0-9]{4}",
        hexColour: new RegExp ("#[0-9A-F]{3}([0-9A-F]{3})?", "i"),   // matches #3-char or #6-char hex colour strings
    },
    
    // return comma-separated list of protein names from array of protein ids
    proteinConcat: function (d, matchedPeptideIndex, clmsModel) {
        var mpeptides = d.matchedPeptides[matchedPeptideIndex];
        var pnames = mpeptides ? mpeptides.prt.map (function(pid) {return clmsModel.get("participants").get(pid).name;}) : [];
        return pnames.join(",");
    },

    pepPosConcat: function (d, matchedPeptideIndex) {
        var mpeptides = d.matchedPeptides[matchedPeptideIndex];
        return mpeptides ? mpeptides.pos.join(", ") : "";
    },
    
    commonLabels: {
        downloadImg: "Download Image As ",  // http://ux.stackexchange.com/a/61757/76906 
    },

    addFourCorners: function (d3DivSelection) {
        var classNames = ["dynDiv_resizeDiv_tl", "dynDiv_resizeDiv_tr", "dynDiv_resizeDiv_bl", "dynDiv_resizeDiv_br"];
        var fourCorners = d3DivSelection
            .selectAll("div")
            .data(classNames, function(d) { return d; })    // key on classnames
            .enter()
            .append("div")
                .attr("class", function(d) { return d; } )  // make class the classname entry
                .classed ("draggableCorner", true)
        ;
            
        return fourCorners;
    },

    addDynDivParentBar: function (d3DivSelection) {
        var parentBar = d3DivSelection
            .append("div")
            .attr("class", "dynDiv_moveParentDiv")
        ;
        
        parentBar
            .append("span")
            .attr("class", "dynTitle")
            //.text ("Title")
        ;
        
        parentBar
            .append ("i")
            .attr ("class", "fa fa-times-circle closeButton")
        ;
        return parentBar;
    },

    addDynDivScaffolding : function (d3DivSelection) {
        CLMSUI.utils.addDynDivParentBar (d3DivSelection);
        CLMSUI.utils.addFourCorners (d3DivSelection);
    },

    // http://stackoverflow.com/questions/10066630/how-to-check-if-element-is-visible-in-zepto
    isZeptoDOMElemVisible : function (zeptoElem) {   // could be a jquery-ref'ed elem as well
        //console.log ("zepto", zeptoElem);
        var display = zeptoElem.css('display') !== 'none';
        return display && (zeptoElem.css('visibility') !== 'hidden') && (zeptoElem.height() > 0);
    },

    // try .layerX / .layerY first as .offsetX / .offsetY is wrong in firefox
    // in fact don't use layerX / offsetX, they're unreliable cross-browser
    crossBrowserElementX : function (evt, optElem) {
        return evt.clientX - $(optElem || evt.target).offset().left;    // use evt.target if no optional element passed
        //return (evt.layerX || evt.offsetX) - evt.target.offsetLeft;
    },

    crossBrowserElementY : function (evt, optElem) {
        return evt.clientY - $(optElem || evt.target).offset().top;
    },
    
    buttonView: Backbone.View.extend ({
        tagName: "span",
        className: "buttonPlaceholder",
        events: {
            "click button": "buttonClicked"
        },

        initialize: function (viewOptions) {
            var defaultOptions = {};
            this.options = _.extend (defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el);
            if (!sel.attr("id")) {
                sel.attr("id", this.options.id);
            }

            sel.append("button")
                .attr("class", "btn")
                .text (this.options.label)
            ;
        },

        buttonClicked: function () {
            CLMSUI.vent.trigger (this.options.eventName, true);
        }
    }),

    checkBoxView: Backbone.View.extend ({
        tagName: "span",
        className: "buttonPlaceholder",
        events: {
            "click input": "checkboxClicked"
        },

        initialize: function (viewOptions) {
            var defaultOptions = {
                labelFirst: true
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el);
            if (!sel.attr("id")) {
                sel.attr("id", this.options.id.replace(/ /g, "_"));
            }

            var labs = sel.append("label")
                .attr("class", "btn")
            ;
            labs.append ("input")
                .attr ("id", sel.attr("id")+"ChkBx")
                .attr("type", "checkbox")
            ;
            var labelText = this.options.labelFirst ? labs.insert("span", ":first-child") : labs.append("span");
            labelText.text (this.options.label);
            
            // Remember to listen to changes to model or global event state that come from outside the view (keeps it in sync with models)
            if (this.model && this.options.toggleAttribute) {
                this.listenTo (this.model, "change:"+this.options.toggleAttribute, this.showState);
            } else if (this.options.eventName) {
                this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
            }
        },

        showState : function (args) {
            var boolVal = arguments.length > 1 ? arguments[1] : arguments[0];
            d3.select(this.el).select("input").property("checked", boolVal);
        },

        checkboxClicked: function () {
            var checked = d3.select(this.el).select("input").property("checked");
            if (this.model && this.options.toggleAttribute) {
                this.model.set (this.options.toggleAttribute, checked);
            } else if (this.options.eventName) {
                CLMSUI.vent.trigger (this.options.eventName, checked);
            }
        }
    }),

    niceRoundMap: {1: 1, 2: 2, 3: 3, 4: 5, 5: 5, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10},

    niceRound: function (val) {
        var log = Math.floor (Math.log(val) / Math.log(10));//no log10 func in IE
        var pow = Math.pow (10, log);
        val = Math.ceil (val / pow);  // will now be a number 1-10
        var roundVal = CLMSUI.utils.niceRoundMap[val];
        roundVal *= pow;
        return roundVal;
    },
    
    // correlates to d3's .round with decimal places function
    ceil: function (val, decimalPlaces) {
        var pow = Math.pow (10, decimalPlaces);
        val *= pow;
        val = Math.ceil (val);
        return val / pow;
    },
    
    floor: function (val, decimalPlaces) {
        var pow = Math.pow (10, decimalPlaces);
        val *= pow;
        val = Math.floor (val);
        return val / pow;
    },

    displayError: function (condition, message) {
        if (condition()) {
            var box = d3.select("#clmsErrorBox");
            if (box.empty()) {
                box = d3.select("body").append("div").attr("id", "clmsErrorBox");
            }

            box
                .style ("display", "block")
                .html (message)
            ;
        }
    },
        
    convertCanvasToImage: function (canvas, image, callback) {
        image
            .attr ("width", canvas.attr("width"))
            .attr ("height", canvas.attr("height"))
            .attr ("transform", canvas.style("transform"))
            .attr ("xlink:href", function () {
                return canvas.node().toDataURL ("image/png");
            })
            //.attr ("xlink:href", "http://www.spayaware.ie/images/cat.png")
        ;
        callback (image);
    },
    
    declutterAxis: function (d3AxisElem) {
        var last = Number.NEGATIVE_INFINITY;
        d3AxisElem.selectAll(".tick text")
            .each (function () {
                var text = d3.select(this);
                var bounds = this.getBoundingClientRect();
                var overlap = bounds.x < last;
                //console.log ("bounds", bounds);
                text.style ("visibility", overlap ? "hidden" : null);
                if (!overlap) {
                    last = bounds.x + bounds.width;
                }
            })
        ;
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
    
    // Routine assumes on click methods are added via backbone definitions, though they could be added later with d3
    // targetDiv is a d3 select element
    // buttonData array of objects of type:
    // {class: "circRadio", label: "Alphabetical", id: "alpha", type: "radio"|"checkbox"|"button", 
    // initialState: true|false, group: "sort", title: "tooltipText", noBreak: true|false},
    makeBackboneButtons: function (targetDiv, baseID, buttonData) { 
        var makeID = function (d) { return baseID + d.id; };
        
        // Don't make buttons whose id already exists
        buttonData = buttonData.filter (function (d) {
            return d3.select("#"+makeID(d)).empty();   
        });
        
        targetDiv.selectAll("button.tempClass")  // .tempClass ensures existing buttons aren't picked up, only new ones created
            .data (buttonData.filter(function(bd) { return bd.type === "button"; }), function(d) { return d.id; })
            .enter()
            .append("button")
                .text (function(d) { return d.label; })
                .attr ("class", function(d) { return d.class; })
                .classed ("btn btn-1 btn-1a", true) // and we don't class .temp so these can't be picked up by a subsequent call to make backbonebuttons
                .attr("id", makeID)
        ;
            
        var cboxes = targetDiv.selectAll("label.tempClass")
            .data (buttonData.filter(function(bd) { return bd.type === "checkbox" || bd.type === "radio"; }), function(d) { return d.id; })		
            .enter()		
            .append ("label")		
                .attr ("class", "btn noBreak")
                .attr ("title", function(d) { return d.title; })
                .attr ("id", makeID)
        ;
        
        cboxes
            .filter (function(d) { return !d.inputFirst; })
            .append ("span")		
                .style ("white-space", function(d) { return d.noBreak ? "nowrap" : "normal"; })
                .text (function(d) { return d.label; })		
        ;
        
        cboxes.append ("input")		
            .attr("type", function(d) { return d.type; })		
            .attr("class", function(d) { return d.class; })		
            .property ("checked", function(d) { return d.initialState; })
            .each (function(d) {
                if (d.group) {
                    d3.select(this).attr("name", d.group);
                }
            })
        ;
        
        cboxes
            .filter (function(d) { return d.inputFirst; })
            .append ("span")		
                .style ("white-space", function(d) { return d.noBreak ? "nowrap" : "normal"; })
                .text (function(d) { return d.label; })		
        ;
    },
    
    // Functions for making useful file names
    
    objectStateToAbbvString: function (object, fields, zeroFormatFields, abbvMap) {
        fields = fields.filter (function (field) {
            var val = object.get ? object.get(field) || object[field] : object[field];
            return !(val === "" || val === false || val === undefined);    
        }, this);

        //console.log ("fields", fields);
        
        var zeroFormat = d3.format (".4f");
        var strValue = function (field, val) {
            if (val === true) {
                return "";
            }
            if (zeroFormatFields.has(field) && !isNaN(val)) {
                return zeroFormat(val);
            }
            if ($.isArray (val)) {
                var arrayStr = val.map (function (elem) {
                    return strValue (field, elem); 
                });
                return arrayStr.join("-");
            }
            return val;
        };

        var strParts = fields.map (function(field) {
            var val = object.get ? object.get(field) || object[field] : object[field];
            return (abbvMap[field] || field.toUpperCase()) + (val === true ? "" : "=" + strValue (field, val));
        }, this);
        return strParts.join(".");    
    },
    
    filterStateToString: function () {
        var filterStr = CLMSUI.compositeModelInst.get("filterModel").stateString();
        return filterStr.substring(0, 160);
    },
    
    searchesToString: function () {
        var searches = Array.from (CLMSUI.compositeModelInst.get("clmsModel").get("searches"));
        var searchKeys = searches.map (function (search) { return search[0]; }); // just the keys
        var searchStr = ("SRCH="+searchKeys.join("-")).substring(0, 40);
        return searchStr;
    },
    
    makeLegalFileName: function (fileNameStr) {
        var newStr = fileNameStr.replace (/[^a-zA-Z0-9-=&()¦_\\.]/g, ""); 
        newStr = newStr.substring (0, 240);
        return newStr;
    },
    
    
    // Function for making a colour key as an svg group element
    updateColourKey: function (model, svgElem) {
        var keyGroup = svgElem.select("g.key");
        if (keyGroup.empty()) {
            svgElem
                .append("g").attr("class", "key")
                    .append("text").attr("class", "keyTitle")
            ;
        }
        keyGroup = svgElem.select("g.key");
        
        var colourAssign = model.get("linkColourAssignment");
        if (colourAssign) {
            keyGroup.select("text.keyTitle")
                .attr("y", 12)
                .attr("text-decoration", "underline")
                .text ("Key: "+colourAssign.get("title"))
            ;
            
            var colScale = colourAssign.get("colScale");
            var labels = colourAssign.get("labels");
            var pairUp = d3.zip (colScale.range(), labels.range());
            
            var colourElems = keyGroup.selectAll("g.keyPoint").data(pairUp);
            colourElems.exit().remove();
            var newElems = colourElems.enter().append("g")
                .attr("class", "keyPoint")
                .attr("transform", function(d,i) { return "translate(0,"+((i+1)*15)+")"; })
            ;
            newElems.append("rect")
                .attr("width", 16)
                .attr("height", 4)
                .attr("y", 5)
            ;
            newElems.append("text")
                .attr("x", 19)
                .attr("y", 12)
            ;
            colourElems.select("rect").style("fill", function (d, i) { return d[0]; });
            colourElems.select("text").text(function (d, i) { return d[1]; });
        }
        
    },
    
    
    // settings can be
    // addToElem - element to add select elements to
    // selectList - names of select elements to add
    // optionList - options to add to each select element (same)
    // selectLabelFunc - function to set human readable name for select element label
    // optionLabelFunc - function to set human readable name for option
    // changeFunc - function that runs when change event occurs on a select element
    // initialSelectionFunc - function that decides initially set option
    addMultipleSelectControls: function (settings) {
        var defaults = {
            selectList: [],
            optionList: [],
            selectLabelFunc: function (d) { return d; },
            optionLabelFunc: function (d) { return d; },
            initialSelectionFunc: function (d,i) { return i === 0; }
        };
        settings = _.extend (defaults, settings);
        
        // Add a number of select widgets for picking axes data types
        var selectHolders = settings.addToElem.selectAll("label.selectHolder")
            .data(settings.selectList, function(d) { return d.id ? d.id : d; })
        ;
        
        // new select elements
        selectHolders
            .enter()
            .append ("label")
            .attr ("class", "btn selectHolder")
                .append ("span")
                .attr ("class", "noBreak")
                .text (settings.selectLabelFunc)
                .append("select")
                    .on ("change", settings.changeFunc)
        ;
        
        var optionData = settings.optionList.slice();
        if (settings.keepOldOptions) {
            var existingOptions = selectHolders.select("select").selectAll("option");
            var oldData = existingOptions.length ? existingOptions.data() : [];
            //console.log ("OLD DATA", oldData);
            optionData = oldData.concat(optionData);
        }
        //console.log ("SETTUINGS", optionData);
        
        // add options to new and existing select elements
        var selects = selectHolders.selectAll("select");
        selects
            .selectAll("option")
            .data (optionData)
                .enter()
                .append ("option")
                .text (settings.optionLabelFunc)
                .property ("selected", settings.initialSelectionFunc)  // necessary for IE not to fall over later (it detects nothing is selected otherwise)
        ;
        
        return selects;
    },

    
    BaseFrameView: Backbone.View.extend ({

        events: {
            // following line commented out, mouseup sometimes not called on element if pointer drifts outside element
            // and dragend not supported by zepto, fallback to d3 instead (see later)
            // "mouseup .draggableCorner": "relayout",    // do resize without dyn_div alter function
            "click .downloadButton": "downloadSVG",
            "click .downloadButton2": "downloadSVGWithCanvas",
            "click .closeButton": "hideView",
            "click": "bringToTop",
        },

        initialize: function (viewOptions) {

            // window level options that don't depend on type of view
            var defaultOptions = {canBringToTop: true};
            this.options = _.extend (defaultOptions, viewOptions.myOptions);
            
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            // Set up some html scaffolding in d3
            CLMSUI.utils.addDynDivScaffolding (mainDivSel);
            mainDivSel.select(".dynTitle").text (this.identifier);

            // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
            var drag = d3.behavior.drag().on ("dragend", function() { self.relayout({dragEnd: true}); });
            mainDivSel.selectAll(".draggableCorner")
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

        // use thisSVG d3 selection to set a specific svg element to download, otherwise take first in the view
        downloadSVG: function (event, thisSVG) {
            var svgSel = thisSVG || d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);
            //console.log ("xml", svgXML);
            
            var fileName = this.filenameStateString().substring (0,240);
            download (svgXML, 'application/svg', fileName+".svg");
        },

        canvasImageParent: "svg",
        
        /**
        Called when we need to change a canvas element to an image to add to a cloned svg element we download.
        Needs canvasImageParent set to decide where to place it in an svg (e.g. for matrix we put it in a g with a clipPath)
        And add an extra css rule after the style element's already been generated to try and stop the image anti-aliasing
        */
        downloadSVGWithCanvas: function () {
            var svgSel = d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var detachedSVG = svgStrings[0];
            var detachedSVGD3 = d3.select (detachedSVG);
            var self = this;

            // Add image to existing clip in svg, (as first-child so sibling group holding links appears on top of it)
            var img = detachedSVGD3
                .select(self.canvasImageParent)  // where to add image
                .insert ("svg:image", ":first-child")
            ;

            // Add a rule to stop the image being anti-aliased (i.e. blurred)
            img.attr("class", "sharpImage");
            var extraRule = "image.sharpImage {image-rendering: optimizeSpeed; image-rendering: -moz-crisp-edges; -ms-interpolation-mode: nearest-neighbor; image-rendering: pixelated; }";
            var style = detachedSVGD3.select("style");
            style.text (style.text() + "\n" + extraRule);

            var fileName = this.filenameStateString()+".svg";
            // Now convert the canvas and its data to the image element we just added and download the whole svg when done
            CLMSUI.utils.convertCanvasToImage (this.canvas, img, function () {
                var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), detachedSVG);
                download (svgXML, "application/svg", fileName);
            });
        },
        

        hideView: function () {
            CLMSUI.vent.trigger (this.displayEventName, false);
        },

        // find z-indexes of all visible, movable divs, and make the current one a higher z-index
        // then a bit of maths to reset the lowest z-index so they don't run off to infinity
        bringToTop : function () {
            if (this.options.canBringToTop !== false && this.el.id !== CLMSUI.utils.BaseFrameView.staticLastTopID) {
                var sortArr = [];
                var activeDivs = d3.selectAll(".dynDiv").filter (function() {
                    return CLMSUI.utils.isZeptoDOMElemVisible ($(this));
                });
                console.log ("this view", this);

                // Push objects containing the individual divs as selections along with their z-indexes to an array
                activeDivs.each (function() { 
                    // default z-index is "auto" on firefox, + on this returns NaN, so need || 0 to make it sensible
                    var zindex = d3.select(this).style("z-index"); //*/ d3.select(this).datum() ? d3.select(this).datum()("z-index") : 0;
                    zindex = zindex || 0;
                    sortArr.push ({z: zindex, selection: d3.select(this)}); 
                });
                // Sort that array by the z-index
                // Then reset the z-index incrementally based on that sort - stops z-index racing away to a number large enough to overwrite dropdown menus
                sortArr
                    .sort (function (a,b) {
                        return a.z > b.z ? 1 : (a.z < b.z ? -1 : 0);
                    })
                    .forEach (function (sorted, i) {
                        sorted.selection
                            .style ("z-index", i + 1)
                        ;    
                    })
                ;
                // Make the current window top of this pile
                d3.select(this.el)
                    .style("z-index", sortArr.length + 1)
                ;

                CLMSUI.utils.BaseFrameView.staticLastTopID = this.el.id;    // store current top view as property of 'class' BaseFrameView (not instance of view)
                //console.log ("sortArr", sortArr);
            }
        },

        setVisible: function (show) {
            this.visible = show;
            d3.select(this.el)
                .style ('display', show ? 'block' : 'none')
                .classed ('dynDivVisible', show)
            ;

            if (show) {
                this
                    .relayout() // need to resize first sometimes so render gets correct width/height coords
                    .render()
                ;
                this.bringToTop();
            }
        },

        // Ask if view is currently visible in the DOM (use boolean for performance, querying dom for visibility often took ages)
        isVisible: function () {
            var start = window.performance.now();
            CLMSUI.utils.xilog (this.$el.toString(), "isVis start:", start);
            //var answer = CLMSUI.utils.isZeptoDOMElemVisible (this.$el);
            var answer = this.visible;
            CLMSUI.utils.xilog (this.$el, "isVis time:" + answer , (window.performance.now() - start));
            return answer;
        },

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy a c3 view just to be sure)
        remove: function () {
            // remove drag listener
            d3.select(this.el).selectAll(".draggableCorner").on(".drag", null);

            // this line destroys the containing backbone view and it's events
            Backbone.View.prototype.remove.call(this);
        },
        
        identifier: "Base",
        
        makeChartTitle: function (counts, colourScheme, titleElem, matchLevel) {
            var labels = colourScheme.isCategorical() ? colourScheme.get("labels").range() : [];
            var commaed = d3.format(",");
            var total = d3.sum (counts);
            var linkCountStr = counts.map (function (count, i) {
                return commaed(count)+" "+(labels[i] ? labels[i] : "Unknown");
            }, this);

            var titleText = this.identifier +": "+commaed(total)+(matchLevel ? " Matches - " : " Cross-Links - ")+linkCountStr.join(", ");

            titleElem.text (titleText);

            return this;
        },
        
        // return any relevant view states that can be used to label a screenshot etc
        optionsToString: function () {
            return "";
        },
        
        // Returns a useful filename given the view and filters current states
        filenameStateString: function () {
            return CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString()+"--"+this.identifier+"-"+this.optionsToString()+"--"+CLMSUI.utils.filterStateToString());
        },
    },
    {
        staticLastTopID: 1, // stores id of last view which was 'brought to top' as class property. So I don't need to do expensive DOM operations sometimes.
    }),
};

CLMSUI.utils.ColourCollectionOptionViewBB = Backbone.View.extend ({
    initialize: function (options) {
        var self = this;
        d3.select(this.el)
            .append("span")
            .text("Choose Link Colour Scheme ")
        ;
        
        var addOptions = function (selectSel) {
            var optionSel = selectSel
                .selectAll("option")
                .data (self.model.pluck("title"))   // this picks the title attribute from all models in BB collection, returned as array
            ;
            optionSel.exit().remove();
            optionSel.enter().append("option");
            optionSel
                .text (function (d) { return d; })
                .order()
            ;
        };

        d3.select(this.el)
            .append("select")
            .attr("id", "linkColourSelect")
            .on ("change", function () {
                if (options.storeSelectedAt) {
                    var colourModel = self.model.at (d3.event.target.selectedIndex);
                    //CLMSUI.compositeModelInst.set("linkColourAssignment", colourModel);
                    options.storeSelectedAt.model.set (options.storeSelectedAt.attr, colourModel);
                }
            })
            .call (addOptions)
        ;

        if (options.storeSelectedAt) {
            this.listenTo (options.storeSelectedAt.model, "change:"+options.storeSelectedAt.attr, function (compModel, newColourModel) {
                //console.log ("colourSelector listening to change Link Colour Assignment", this, arguments);
                this.setSelected (newColourModel);
            });
        }
        
        this.listenTo (this.model, "update", function () {
            d3.select(this.el).select("select#linkColourSelect").call (addOptions);
        });

        return this;
    },

    setSelected: function (model) {
        d3.select(this.el)
            .selectAll("option")
            .property ("selected", function(d) {
                return d === model.get("title");
            })
        ;

        return this;
    }
});

CLMSUI.utils.sectionTable = function (domid, data, idPrefix, columnHeaders, headerFunc, rowFilterFunc, cellFunc) {
    //console.log ("data", data, this, arguments);

    var setArrow = function (d) {
        var assocTable = d3.select("#"+idPrefix+d.id);
        d3.select(this).classed ("tableShown", assocTable.style("display") !== "none");
    };

    var dataJoin = domid.selectAll("section").data(data, function(d) { return d.id; });
    dataJoin.exit().remove();
    var newElems = dataJoin.enter().append("section").attr("class", "sectionTable");

    var newHeaders = newElems.append("h2")
        .on ("click", function(d) {
            var assocTable = d3.select("#"+idPrefix+d.id);
            var tableIsHidden = (assocTable.style("display") == "none");
            assocTable.style("display", tableIsHidden ? "table" : "none");
            setArrow.call (this, d);
        })
        .on ("mouseover", function(d) {
            // eventually backbone shared highlighting code to go here
        })
    ;
    newHeaders.append("svg")
        .append("polygon")
            .attr("points", "2,1 16,8 2,15")
    ;
    newHeaders.append("span").text(headerFunc);

    var tables = newElems.append("table")
        .html("<thead><tr><th>"+columnHeaders[0]+"</th><th>"+columnHeaders[1]+"</th></tr></thead><tbody></tbody>")
        .attr("id", function(d) { return idPrefix+d.id; })
    ;

    var self = this;

    // yet another cobble a table together function, but as a string
    var makeTable237 = function (arrOfObjs) {
        var t = "<table><tr>";
        var headers = d3.keys(arrOfObjs[0]);
        headers.forEach (function(h) {
            t+="<TH>"+h+"</TH>";
        });
        t += "</TR>";
        arrOfObjs.forEach (function (obj) {
            t += "<TR>";
            d3.values(obj).forEach (function(h) {
                t+="<TD>"+h+"</TD>";
            });
            t += "</TR>";
        });
        t += "</TABLE>";
        return t;
    };

    var arrayExpandFunc = function (d, entries) {
        var expandKeys = self.options.expandTheseKeys;
        var newEntries = entries.map (function (entry) {
            return (expandKeys && expandKeys.has(entry.key)) ?
                {key: entry.key, value: makeTable237 (d[entry.key])} : entry
            ;
        });
        return newEntries;
    };

    var tbodies = tables.select("tbody");
    var rowJoin = tbodies.selectAll("tr").data(function(d) { return arrayExpandFunc (d, rowFilterFunc (d)); });
    rowJoin.exit().remove();
    var newRows = rowJoin.enter().append("tr");

    newRows.selectAll("td").data(function(d) { return [{key: d.key, value: d.key}, {key: d.key, value: d.value}]; })
        .enter()
        .append("td")
        .classed ("fixedSizeFont", function(d,i) { return self.options.fixedFontKeys && self.options.fixedFontKeys.has (d.key) && i; })
        .each (cellFunc)
    ;

    dataJoin.selectAll("h2").each (setArrow);
};




CLMSUI.utils.c3mods = function () {
    var c3guts = c3.chart.internal.fn;
    var c3funcs = c3.chart.fn;
    
    c3guts.redrawMirror = c3guts.redraw;
    c3funcs.enableRedraw = function (enable, immediate) {
        c3guts.enableRedrawFlag = enable;
         console.log ("YO REDA", c3guts.enableRedrawFlag, this);
        if (immediate) {
            console.log ("YOOOO", c3guts.enableRedrawFlag, this);
            //c3guts.redraw.call (this);
        }
    };
    
    c3guts.redraw = function (options, transitions) {
        console.log ("this", this);
        var c3guts = c3.chart.internal.fn;
        this.accumulatedOptions = $.extend({}, this.accumulatedOptions, options || {});
        if (c3guts.enableRedrawFlag) {
            this.redrawMirror (this.accumulatedOptions, transitions);
            this.accumulatedOptions = {};
        } 
        console.log ("accum", c3guts.enableRedrawFlag, this.accumulatedOptions);
    };
};

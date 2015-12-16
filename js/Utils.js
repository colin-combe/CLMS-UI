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
    
    addCheckboxBackboneView : function (parentSel, options) {                        
        var cboxViewInst = new CLMSUI.utils.checkBoxView ({
            el: "#"+parentSel.attr("id"),
            myOptions: options,
        });        
    },
    
    dpNumber: function (num, decimalPlaces, roundFunc) {
        var powerOfTen = Math.pow (10, decimalPlaces);
        return (roundFunc(num * powerOfTen) / powerOfTen).toFixed(decimalPlaces);
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
            var svgString = global.CLMSUI.utils.getSVG(d3.select(this.el).select("svg"));
            download(svgString, 'application/svg', 'distogram.svg');
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
            activeDivs.each(function(d,i) { z[i] = +d3.select(this).style("z-index"); });   // all the z-indexes
            var range = d3.extent (z.filter (function(zi) { return zi !== 0; }));
            //console.log (range, "z-indexes", z);
            
            activeDivs.style("z-index", function() {
                return Math.max (0, +d3.select(this).style("z-index") - range[0] + 1);
            });
            d3.select(this.el).style("z-index", range[1] - range[0] + 2);
        },

        setVisible: function (show) {
            d3.select(this.el).style('display', show ? 'block' : 'none');

            if (show) {
                this
                    .relayout() // need to resize first sometimes so render gets correct width/height coords
                    .render()
                ;
            }
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
        
        var mainDivSel = d3.select(this.el);
        var chartDiv = mainDivSel.append("div")
            .attr("class", "panelInner")
        ;       
        chartDiv.html ("<img id='defaultLinkKey' src='./images/fig3_1.svg'><br><img id='logo' src='./images/logos/rappsilber-lab-small.png'>");
        
        this.render();
        return this;
    }
});
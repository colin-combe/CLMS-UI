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
            this.eventName = viewOptions.eventName;
                
            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el);
            var myid = "#" + sel.attr("id");
            sel.append("label")
                .attr("class", "btn")
                .style("padding-left", "0px")
                .text (viewOptions.label)
                .append ("input")
                    .attr ("id", myid+"ChkBx")
                    .attr("type", "checkbox")
            ;
            
            this.listenTo (CLMSUI.vent, this.eventName, this.showState);
        },
        
        showState : function (boolVal) {
            d3.select(this.el).select("input").property("checked", boolVal);
        },
        
        checkboxClicked: function () {
            CLMSUI.vent.trigger (this.eventName, d3.select(this.el).select("input").property("checked"));
        }
    }),
    
    addCheckboxBackboneView : function (parentSel, options) {                        
        var cboxViewInst = new CLMSUI.utils.checkBoxView ({
            el: "#"+parentSel.attr("id"),
            label: options.label,
            eventName: options.eventName
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
    
};
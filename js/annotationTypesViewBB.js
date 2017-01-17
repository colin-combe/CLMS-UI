
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.AnnotationTypesViewBB = Backbone.View.extend ({
        events: {
            "mouseenter .menuTitle": "switchVis",
            "click .menuTitle": "toggleVis",
            //~ "click li": "menuSelection",
       },

       initialize: function (viewOptions) {
            var emptyFunc = function () {};
            var defaultOptions = {
                title: "ANNOTATIONS",
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            var placeholder = mainDivSel.attr("class", "btn dropdown");
            placeholder.append("span").attr("class", "menuTitle").text(this.options.title);           
            
            var choices = placeholder.append("div").append("ul").attr("id","annotationsUL");

			return this;
		},
    
         // hide/show or disable menu items by id array ["#myid", "#id2", etc]
        filter: function (idArr, show) {
            //d3.selectAll(idArr.join(",")).style ("display", show ? null : "none");
            d3.selectAll(idArr.join(","))
                .style ("color", show ? null : "#888")
                .selectAll("input")
                    .property("disabled", !show)
            ;
            return this;
        },
        
        isShown: function () {
            return d3.select(this.el).select("div").style("display") !== "none";
        },
        
        toggleVis : function () {
            var show = this.isShown();
            // if showing then hide all other menus, really should do it via an event but...
            if (!show) {
                d3.selectAll(".dropdown div").style("display", "none");
            }
            this.setVis (!show);
        },
        
        hideVis: function () {
            this.setVis (false);
        },
        
        setVis: function (show) {
            CLMSUI.DropDownMenuViewBB.anyOpen = show;    // static var. Set to true if any menu clicked open.
            d3.select(this.el).select("div")
                .style ("display", show ? "block" : "none")
            ;
        },
        
        switchVis: function () {
            if (CLMSUI.DropDownMenuViewBB.anyOpen && !this.isShown()) {
                this.toggleVis();
            }
        },
        
        //~ menuSelection: function (evt) {  
            //~ var d3target = d3.select (evt.target);
            //~ if (d3target && d3target.datum() && d3target.datum().func) {
                //~ (d3target.datum().func)(); // as value holds function reference
            //~ }
            //~ 
            //~ this.hideVis();
        //~ },
    });
    
    CLMSUI.AnnotationTypeViewBB = Backbone.View.extend ({
        //~ tagName: "span",
        //~ className: "buttonPlaceholder",
        events: {
            "click input": "checkboxClicked"
        },

        initialize: function (viewOptions) {
            //~ var defaultOptions = {
                //~ labelFirst: true
            //~ };
            //~ this.options = _.extend(defaultOptions, viewOptions.myOptions);

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var sel = d3.select(this.el).append("span");
            sel.classed("buttonPlaceholder", true);
            //~ if (!sel.attr("id")) {
                //~ sel.attr("id", this.options.id);
            //~ }

            var labs = sel.append("label")
                .attr("class", "btn")
            ;
            labs.append ("input")
                .attr ("id", "#"+sel.attr("id")+"ChkBx")
                .attr("type", "checkbox")
            ;
            var labelText = /* this.options.labelFirst ? labs.insert("span", ":first-child") :*/ labs.append("span");
            labelText.text (this.model.get("type"));

            //~ this.listenTo (CLMSUI.vent, this.options.eventName, this.showState);
        },

        showState : function (boolVal) {
            d3.select(this.el).select("input").property("checked", boolVal);
        },

        checkboxClicked: function () {
            console.warn ("ANNOT CLICKED", this.model);
            this.model.set("shown", d3.select(this.el).select("input").property("checked"));
        }
    });

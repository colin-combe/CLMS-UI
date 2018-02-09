
    var CLMSUI = CLMSUI || {};
    
    CLMSUI.DropDownMenuViewBB = Backbone.View.extend ({
        events: {
            "mouseenter .menuTitle": "switchVis",
            "click .menuTitle": "toggleVis",
            "click li": "menuSelection",
            // martin - i had to add another event here to listen to key presses in the text input, 
            // or we do without refreshes on key presses, or maybe theres a better way you know of...
            "keyup li > input": "menuSelection",
        },
        
        initialize: function (viewOptions) {
            var emptyFunc = function () {};
            var defaultOptions = {
                title: "A DD Menu",
                closeOnClick: true,
                menu: [{name:"Wazzup", func: emptyFunc}, {name:"Buddy", func: emptyFunc}],
                groupByAttribute: "group",
                labelByAttribute: "name",
                toggleAttribute: "state",
            };
            this.options = _.extend (defaultOptions, viewOptions.myOptions);
            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            d3.select(this.el)
                .attr("class", "btn dropdown")
                .call (function (sel) {
                    if (self.options.classed) {
                        sel.classed (self.options.classed, true);
                    }   
                })
                .append("span")
                    .attr("class", "menuTitle")
            ;
            
            d3.select(this.el).append("div").append("ul");
            
            this
                .updateTitle (this.options.title)
                .update()
                .render()
            ;
            return this;
        },
        
        updateTitle: function (newTitle) {
            this.options.title = newTitle;
            d3.select(this.el).select("span.menuTitle").text (this.options.title);
            return this;
        },
        
        update: function () {
            var self = this;
            if (this.collection) {
                var lastCat = null;
                var adata = [];
                this.collection.each (function (model) {
                    //console.log ("model", model);
                    var cat = model.get(self.options.groupByAttribute);
                    var cbdata = ({
                        id: model.get("id") || (model.get(self.options.labelByAttribute)+"Placeholder"),   // ids may not contain spaces 
                        label: model.get(self.options.labelByAttribute),
                    });
                    if (adata.length && lastCat !== cat) {  // have to access last datum to say it's the last in its category
                        adata[adata.length - 1].sectionEnd = true; 
                    }
                    adata.push (cbdata);
                    lastCat = cat;

                    var cbView = new CLMSUI.utils.checkBoxView ({
                        model: model,
                        myOptions: {id: cbdata.id, label: cbdata.label, toggleAttribute: self.options.toggleAttribute, labelFirst: self.options.labelFirst}
                    });
                    self.$el.append(cbView.$el);
                }); 
                
                this.options.menu = adata.map (function(cbdata) { return { id: cbdata.id, sectionEnd: cbdata.sectionEnd}; });
            }  
            return this;
        },
        
        render: function () {
            var listHolder = d3.select(this.el).select("div ul");
            var choices = listHolder.selectAll("li")
                .data (this.options.menu, function (d) { return d.name || d.id; })
            ;
            
            choices.exit().remove();
            
            choices.enter().append("li").each (function (d) {
                var ind = d3.select(this);
                if (d.name) {
                    ind.text(d.name);
                } else if (d.id) {
                    var targetSel = d3.select("#"+d.id.replace(/ /g, "_")); 
                    if (!targetSel.empty()) {
                        var targetNode = targetSel.node();
                        if (targetNode.parentElement) {
                            targetNode.parentElement.removeChild (targetNode);
                        }
                        ind.node().appendChild (targetNode);

                        if (targetSel.datum() == undefined) {
                            ind.select("#"+d.id.replace(/ /g, "_"));//martin magic
                        }
                    }
                }
				if (d.title) {
					ind.attr ("title", d.title);
				}
            }); 
            
            choices
                .filter(function(d) { return d.sectionEnd; })
                .insert ("hr")
            ;
            
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

        menuSelection: function (evt) {  
            var d3target = d3.select (evt.target);
            if (d3target && d3target.datum() && d3target.datum().func) {
                var context = d3target.datum().context || this;
                (d3target.datum().func).call (context, d3target); // as value holds function reference
            }
            
            if (this.options.closeOnClick) {
				var definitelyClose = d3target && d3target.datum() && d3target.datum().closeOnClick !== false;
				if (definitelyClose) {
                	this.hideVis();
				}
            }
        }
    });


    CLMSUI.AnnotationDropDownMenuViewBB = CLMSUI.DropDownMenuViewBB.extend ({
        events: function() {
            var parentEvents = CLMSUI.DropDownMenuViewBB.prototype.events;
            if(_.isFunction (parentEvents)){
                parentEvents = parentEvents();
            }
            return _.extend ({}, parentEvents, {
                //"click li label": "showColour",
            });
        },

        initialize: function () {
            CLMSUI.AnnotationDropDownMenuViewBB.__super__.initialize.apply (this, arguments);
            
            //CLMSUI.domainColours.range(['#000000', '#e69f00', '#56b4e9', '#2b9f78', '#f0e442', '#0072b2', '#d55e00', '#cc79a7']);
            d3.select("#annotationsDropdownPlaceholder").selectAll("li label")
                .insert ("span", ":first-child")
                .attr ("class", "colourSwatchSquare")
                .style ("background", "transparent")
            ;
            
            // listen to a checkbox on one of this collection's models getting clicked and firing a change in the model
            this.listenTo (this.collection, "change:shown", function (featureTypeModel, shown) { 
                this.setColour (featureTypeModel, shown);
            });
        },
        
        setColour: function (featureTypeModel, shown) {
            d3.select("#annotationsDropdownPlaceholder").selectAll("li")
                .filter (function(d) { return d.id === featureTypeModel.id; })
                .select(".colourSwatchSquare")
                .style ("background", function (d) { 
                    var col = CLMSUI.domainColours(d.id.toUpperCase());
                    var scale = d3.scale.linear().domain([0,1]);
                    scale.range(["white", col]);
                    return shown ? scale (0.5) : "transparent";
                })
            ;
        },
    });


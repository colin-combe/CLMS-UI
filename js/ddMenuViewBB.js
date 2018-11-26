
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
				sectionHeader: function () { return ""; },
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
				.updateTooltip (this.options.titleTooltip)
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

		updateTooltip: function (tooltipObj) {
			if (tooltipObj && this.options.tooltipModel) {
				var self = this;
				d3.select(this.el).select("span.menuTitle")
					.on ("mouseenter", function () {
						self.options.tooltipModel
					    	.set("header", tooltipObj.header)
            				.set("contents", tooltipObj.contents)
            				.set("location", d3.event)
						;
                        self.options.tooltipModel.trigger ("change:location");
					})
					.on ("mouseleave", function () {
						self.options.tooltipModel.set ("contents", null);
					})
				;
			}
			return this;
		},

        update: function () {
            var self = this;
            if (this.collection) {
                var lastCat = null;
                var adata = [];
                this.collection.each (function (model) {
					var cbdata = model.toJSON();	// doesn't actually make json, just copies model attributes to object that can then be jsonified (or overwritten safely)
                    $.extend (cbdata, {
                        id: model.get("id") || (model.get(self.options.labelByAttribute)+"Placeholder"),   // ids may not contain spaces
                        label: model.get(self.options.labelByAttribute),
						tooltip: model.get("tooltip"),
                    });
					var cat = model.get (self.options.groupByAttribute);
                    if (lastCat !== cat) {  // have to access last datum to say it's the last in its category
						if (adata.length) {	// ignore sectionEnd for first item
                        	_.last(adata).sectionEnd = true;
						}
						cbdata.sectionBegin = true;
                    }
                    adata.push (cbdata);
                    lastCat = cat;

					var options = $.extend ({toggleAttribute: self.options.toggleAttribute, labelFirst: self.options.labelFirst}, cbdata);
					if (self.options.tooltipModel) {
						options.tooltipModel = self.options.tooltipModel;
					}
                    var cbView = new CLMSUI.utils.checkBoxView ({
                        model: model,
                        myOptions: options,
                    });
                    self.$el.append(cbView.$el);
                });

                this.options.menu = adata;
            }
            return this;
        },

        render: function () {
            var listHolder = d3.select(this.el).select("div ul");
            var choices = listHolder.selectAll("li")
                .data (this.options.menu, function (d) { return d.name || d.id; })
            ;

            choices.exit().remove();

			var ttm = this.options.tooltipModel;

            choices.enter().append("li").each (function (d) {
                var ind = d3.select(this);
                if (d.name) {
                    ind.text(d.name);
                } else if (d.id) {
                    var targetSel = d3.select("#"+CLMSUI.utils.makeLegalDomID (d.id));
                    if (!targetSel.empty()) {
                        var targetNode = targetSel.node();
                        if (targetNode.parentElement) {
                            targetNode.parentElement.removeChild (targetNode);
                        }
                        ind.node().appendChild (targetNode);

                        if (targetSel.datum() == undefined) {
                            ind.select("#"+CLMSUI.utils.makeLegalDomID (d.id));	//martin magic
                        }
                    }
                }

				// if tooltip data provided, add either as title attribute or if the tooltipmodel passed as an option, use that
				if (d.tooltip) {
					if (ttm) {
						ind.on ("mouseenter", function () {
							ttm
								.set ("header", d.name || d.label)
								.set ("contents", d.tooltip+".")
								.set ("location", d3.event)
							;
							ttm.trigger ("change:location");
						}).on ("mouseleave", function () {
							ttm.set ("contents", null);
						});
					} else {
						ind.attr ("title", d.tooltip || d.title);
					}
				}
            }, this);

			var self = this;
            choices.classed ("sectionEnd", function(d) { return d.sectionEnd; });

			choices
                .filter(function(d) { return d.sectionBegin; })
                .insert ("span", ":first-child").attr("class", "ddSectionHeader").text (self.options.sectionHeader)
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
				"click button.downloadAnnotationKey" : "downloadKey",
            });
        },

        initialize: function () {
            CLMSUI.AnnotationDropDownMenuViewBB.__super__.initialize.apply (this, arguments);
			var self = this;

            var items = d3.select(this.el).selectAll("li");

			var colourControls = items
				.insert ("label", ":nth-last-child(1)")	// insert pushes data to label
				.attr ("class", "colourSwatchLabel")
				.style ("visibility", function(d) {
					return self.collection.get(d.id).get("shown") ? null : "hidden";
				})
			;

			colourControls
                .append("span")
                .attr ("class", "colourSwatchSquare")
				.attr ("title", "Click to change colour")
            ;


			function colourChange (d) {
				var value = d3.select(this).property("value");
				CLMSUI.domainColours.set (d.category, d.type, value);
				var model = self.collection.get (d.id);	// d3 id's are same as model id's ('cos ddmenu generates the d3 elements using the collection)
				self.collection.trigger ("change:shown", model, model.get("shown"));
			}

			// add colour input widgets, but hide them and call them when pressing the colour swatch
			colourControls
                .append ("input")
                .attr ("type", "color")
				.attr ("class", "hiddenColourInput")
				.property ("value", function(d) { return CLMSUI.domainColours (d.category, d.type); })
				.on ("change", colourChange)
				.on ("input", colourChange)
            ;


			items.select(".buttonPlaceholder").classed("aaButtonPlaceholder", true).select("label");	// .select pushes data to label

			d3.select(this.el).select("div")
				.append("button")
				.text("Download Selected Annotation Key as SVG")
				.classed ("btn btn-1 btn-1a downloadAnnotationKey", true)
			;

			this.decideSVGButtonEnabled();

            // listen to a checkbox on one of this collection's models getting clicked and firing a change in the model
            this.listenTo (this.collection, "change:shown", function (featureTypeModel, shown) {
                this.setColour (featureTypeModel, shown);
            });
        },

		decideSVGButtonEnabled: function () {
			var shownCount = this.collection.where({shown:true}).length;
			d3.select(this.el).select("Button.downloadAnnotationKey").property("disabled", shownCount === 0);
		},

        setColour: function (featureTypeModel, shown) {
            d3.select(this.el).selectAll("li")
                .filter (function(d) { return d.id === featureTypeModel.id; })
                .select(".colourSwatchLabel")
				.style ("visibility", shown ? null : "hidden")
					.select(".colourSwatchSquare")
					.style ("background", function (d) {
						var col = CLMSUI.domainColours (d.category, d.type);
						var scale = d3.scale.linear().domain([0,1]).range(["white", col]);
						return shown ? scale (0.5) : "none";
					})
            ;

			this.decideSVGButtonEnabled();
        },

		downloadKey: function () {
			var tempSVG = d3.select(this.el).append("svg").attr("class", "temp").style("text-transform", "capitalize");
			CLMSUI.utils.updateAnnotationColourKey (
				this.collection.where({shown: true}),
				tempSVG,
				{
					colour: function (d) { return CLMSUI.domainColours (d.category, d.type); },
					label: function (d) { return (d.category ? d.category.replace(/_/g, " ")+": " : "") + d.type; },
					title: this.identifier,
				}
			);
			var contentsSize = tempSVG.select("g").node().getBoundingClientRect();
			tempSVG.attr("width", contentsSize.width).attr("height", contentsSize.height);	// make svg adjust to contents
			this.downloadSVG (null, tempSVG);
			tempSVG.remove();
		},

		// use thisSVG d3 selection to set a specific svg element to download, otherwise take first in the view
        downloadSVG: function (event, thisSVG) {
            var svgSel = thisSVG || d3.select(this.el).selectAll("svg");
            var svgArr = [svgSel.node()];
            var svgStrings = CLMSUI.svgUtils.capture (svgArr);
            var svgXML = CLMSUI.svgUtils.makeXMLStr (new XMLSerializer(), svgStrings[0]);

            var fileName = this.filenameStateString().substring (0,240);
            download (svgXML, 'application/svg', fileName+".svg");
        },

		// return any relevant view states that can be used to label a screenshot etc
        optionsToString: function () {
            return "";
        },

		identifier: "Sequence Annotations",

        filenameStateString: function () {
            return CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString()+"--"+this.identifier);
        },
    });

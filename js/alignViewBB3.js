    var CLMSUI = CLMSUI || {};
    
    CLMSUI.AlignCollectionViewBB = CLMSUI.utils.BaseFrameView.extend ({
        
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if (_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({
              "change input.alignRadio" : "radioClicked",
              "mouseleave label": "clearTooltip",
          }, parentEvents, {});
        },
        
        initialize: function (viewOptions) {
            CLMSUI.AlignCollectionViewBB.__super__.initialize.apply (this, arguments);
            
            var topElem = d3.select(this.el);
            var modelViewID = topElem.attr("id") + "IndView";
            var holdingDiv = topElem.append("DIV").attr("class", "alignView");
            var template = _.template ("<P class='alignHeader'><%= headerText %></P><DIV class='checkHolder'></DIV><DIV id='<%= alignModelViewID %>'></DIV><DIV id='<%= alignControlID %>'></DIV><DIV id='<%= alignControlID2 %>'></DIV>");
            holdingDiv.html (template ({
                headerText: "Select Protein Name in Tab for Details",
                alignModelViewID: modelViewID,
                alignControlID: modelViewID+"Controls",
                alignControlID2: modelViewID+"Controls2",
            }));  
            
            holdingDiv.selectAll("DIV:not(.checkHolder)").attr("class", "alignSettings");
            
            this.tooltipModel = viewOptions.tooltipModel;   
            
            this.alignViewBlosumSelector = new CLMSUI.CollectionAsSelectViewBB ({
                el:"#"+modelViewID+"Controls2",
                collection: CLMSUI.blosumCollInst,
                label: "Score Matrix",
                name: "BlosumSelector",
            });
            
            var firstModel = this.collection.models[0];
            this.setFocusModel (firstModel);
            
            this.listenTo (this.collection, "bulkAlignChange", function () {
                this.render();
            });
            return this;
        },
        
        hollowElement: function (view) {
            view.stopListening();   // remove backbone events bound with listenTo etc 
            $(view.el).off();       // remove dom events
            var a = d3.select(view.el);
            a.selectAll("*").remove();  // remove all elements underneath el
        },
        
        clearTooltip: function () {
            if (this.tooltipModel) {
                this.tooltipModel.set ("contents", null);
            }
            return this;
        },
        
        render: function () {
            var topElem = d3.select(this.el);
            var list = topElem.select("DIV.checkHolder");
            var proteins = list.selectAll("span.alignTab").data(this.collection.models, function(d) { return d.id; });
            var self = this;
            
            proteins.exit().remove();
            
            var pspans = proteins.enter().append("span").attr("class", "alignTab");
            
            pspans.append("input")
                .attr ("class", "alignRadio")
                .attr ("type", "radio")
                .attr ("name", topElem.attr("id")+"pgroup")
                .attr ("id", function(d,i) { return topElem.attr("id")+"pgroup"+i; })
                .attr ("value", function(d) { return d.id; })
                .property ("checked", function (d,i) { return i === 0; })
            ;
            
            pspans.append("label")
                .attr ("for", function(d,i) { return topElem.attr("id")+"pgroup"+i; })
                .on ("mouseover", function(d) {
                    self.tooltipModel
                        .set ("header", d.get("displayLabel"))
                        .set("contents", [
                            ["Aligned Sequences", d.get("seqCollection") ? d.get("seqCollection").length : 0],
                            //[d.label+" Length", nformat(d.convertToRef.length)], ["Align Score", scoreFormat(d.score)],
                        ])
                        .set("location", d3.event)
                    ;
                    self.tooltipModel.trigger ("change:location");
                })
            ;
            
            // label count can change for existing protein
            proteins.select("label")
                .html (function(d) {
                    var seqCount = d.get("seqCollection") ? d.get("seqCollection").length : 0;
                    return d.get("displayLabel") + (seqCount ? "<span class='alignSeqCount'>"+seqCount+"</span>" : "");
                })
            ;
            
            proteins.order();
            
            return this;
        },
        
        radioClicked: function (evt) {
            var model = this.collection.get (evt.target.value);
            this.setFocusModel (model);
        },
        
        setFocusModel: function (model) {
            var prevModel = this.modelView ? this.modelView.model : undefined;
            if (prevModel) {
                console.log ("old modelView", this.modelView);
                this.alignViewBlosumSelector.stopListening (prevModel);
                this.hollowElement (this.modelView);
                this.hollowElement (this.alignViewSettings);
                //this.modelView.remove();
                //this.alignViewSettings.remove();
            }
        
            // Safely swap these models in/out, maybe by generating new views altogether
            // http://stackoverflow.com/questions/9271507/how-to-render-and-append-sub-views-in-backbone-js
            // http://stackoverflow.com/questions/8591992/backbone-change-model-of-view
            // http://stackoverflow.com/questions/21411059/backbone-reusable-view-set-new-model-to-existing-view?lq=1
        
            if (model) {
                console.log ("model", model);
                var modelViewID = d3.select(this.el).attr("id") + "IndView"; 
                
                this.modelView = new CLMSUI.ProtAlignViewBB ({
                    el: "#"+modelViewID, 
                    model: model,
                    tooltipModel: this.tooltipModel,
                });

                this.alignViewSettings = new CLMSUI.AlignSettingsViewBB ({
                    el:"#"+modelViewID+"Controls",
                    model: model,
                });
                
                console.log ("new modelView", this.modelView);

                this.alignViewBlosumSelector
                    .setSelected (model.get("scoreMatrix"))
                    .listenTo (model, "change:scoreMatrix", function (protAlignModel, scoreMatrix) { // and then make it track it thereafter
                        this.setSelected (scoreMatrix);
                    })
                ;
                
                this.modelView.render();
            }
            return this;
        },
        
        identifier: "Alignment View",
    });
    
    CLMSUI.ProtAlignViewBB = Backbone.View.extend ({
		defaults: {
			defaultSeqShowSetting: 3,
		},
		
        events: {
            "mouseleave td.seq>span" : "clearTooltip",
            "change input.diff" : "render",
            "mouseleave th": "clearTooltip",
        },

        initialize: function (viewOptions) {      
            this.tooltipModel = viewOptions.tooltipModel;
            
            var topElem = d3.select(this.el);
            var holdingDiv = topElem.append("DIV").attr("class", "alignView");
            var template = _.template ("<DIV class='tableWrapper'><TABLE><THEAD><TR><TH><%= firstColHeader %></TH><TH><%= secondColHeader %></TH></TR></THEAD><TBODY></TBODY></TABLE></DIV><div class='alignChoiceGroup'></div>");
            holdingDiv.html (template ({
                    firstColHeader: "Name", 
                    secondColHeader: "Sequence", 
            }));    
			var labelData = [
				{label: "Show differences only", value: 1},
				{label: "Show all", value: 3},
				{label: "Show similarities only", value: 2},
			];
			d3.select(this.el).select(".alignChoiceGroup").selectAll("label").data (labelData)
				.enter()
				.append("label")
				.text (function (d) { return d.label})
					.append("input")
					.attr("type", "radio")
					.attr("class", "diff")
					.attr("name", "alignChoice")
					.attr("value", function(d) { return d.value; })
			;
            
            //this.listenTo (this.model, "change:compAlignment", this.render);
			d3.select(this.el).select(".alignChoiceGroup input[type=radio][value='"+this.defaults.defaultSeqShowSetting+"']").property("checked", true);
            this.listenTo (this.model.get("seqCollection"), "change:compAlignment", function (affectedModel) {
                this.render ({affectedModel: affectedModel});
            });
            this.ellipStr = new Array(10).join("\"");
            //this.ellipStr = new Array(10).join("\u2026");
            
            return this;
        },
        
        ellipFill: function (length) {
            var sigfigs = length ? Math.floor (Math.log10 (length)) + 1 : 0;
            return this.ellipStr.substring (0, sigfigs);
        },
        
        makeIndexString: function (length, unit) {
            unit = unit || 10;
            
            var iFillStr = new Array(unit).join(" ");
            iFillStr += "\u2022";
            var segs = [iFillStr];
            
            for (var n = 1; n < length / unit; n++) {
                var iStr = ((n * unit)).toString();
                var gStr = iFillStr.substr (-(unit - iStr.length));
                segs.push(iStr);
                segs.push(gStr);
            }
            return segs.join("");
        },

        render: function (obj) {
            var affectedModel = obj ? obj.affectedModel : undefined;
            console.log ("rerendering alignment for", affectedModel);
            var place = d3.select(this.el).select("tbody");
            var self = this;
			
			var selectedRadioValue = d3.select(this.el).select("input[name='alignChoice']:checked").property("value");
			// keep this value and set it as a default for this view. Seems OK as this only affects visual output, not the model
			// that is supplying the information. Plus there is only 1 of these views at a time, so changing the defaults doesn't bother any other views.
			this.defaults.defaultSeqShowSetting = +selectedRadioValue;
            var showSimilar = (selectedRadioValue & 2) > 0;
			var showDiff = (selectedRadioValue & 1) > 0;
            
            // I suppose I could do a view per model rather than this, but it fits the d3 way of doing things
            var seqModels = this.model.get("seqCollection").models.filter (function (m) {
                return !affectedModel || (affectedModel.id === m.id);
            });
            var refs = seqModels.map (function (seqModel) {
                return seqModel.get("refAlignment");
            });
            var comps = seqModels.map (function (seqModel) {
                return seqModel.get("compAlignment");
            });
            //console.log ("refs, comps", refs, comps);
            
			function ellipsisInsertContextless (size, strArr1, strArr2) {
				var estr = this.ellipFill (size);
				strArr1.push (estr);
				strArr2.push (estr);
			};
			var ellipsisInsert = ellipsisInsertContextless.bind (this);
			
			var MATCH = 0, DELETE = 1, INSERT = 2, VARIATION = 3;
			var classes = ["seqMatch", "seqDelete", "seqInsert", "seqVar"];
			
			function makeOpenSpanTag (streakType, start, end) {
				console.log ("st", streakType, classes);
				return "<span class='"+classes[streakType]+"' data-start='"+start+"' data-end='"+end+"'>";	
			};
			
            comps.forEach (function (seq) {
                var rstr = seq.refStr;
                var str = seq.str;
				//var rstr = "ABC----HIJKLMNOPQR-TUVWXYZABC";
				//var str =  "ABCDEFGHIAKLM-OPQRS-UV----ABC";
                var l = [];
                var rf = [];
                var streak = MATCH;
				var inOtherStreak = false;
                var i = 0;
				
                for (var n = 0; n < str.length; n++) {
                    var c = str[n];
                    var r = rstr[n];
					var rhyphen = (r === "-");
					var chyphen = (c === "-");

					// end of inserted or deleted streak? make span, add characters, close span
                    if ((!chyphen && streak === DELETE) || (c === r && streak === VARIATION) || (!rhyphen && streak === INSERT)) {
						l.push (makeOpenSpanTag (streak, i, n));
						if (showDiff) {
							rf.push (rstr.substring (i,n));
							l.push (str.substring (i,n));
						} else if (n > i) {	// or add ellipses if showDiff is true
							ellipsisInsert (n - i, l, rf);
                        }
						l.push ("</span>");
						streak = MATCH;
						i = n;
                    }
              
					// start of streak present in ref but missing in c
                    if (chyphen && streak !== DELETE) {
						// add previous characters
						l.push (makeOpenSpanTag (streak, i, n));
						inOtherStreak = (streak === INSERT || streak === VARIATION);
						if ((inOtherStreak && showDiff) || (!inOtherStreak && showSimilar)) {
							rf.push (rstr.substring (i,n));
							l.push (str.substring (i,n));
						} else if (n > i) {	// or add ellipses if showDiff is true
							ellipsisInsert (n - i, l, rf);
						}
						l.push ("</span>");
						streak = DELETE;
                        i = n;
                    }
					// start of streak present in c but missing in ref
                    else if (rhyphen && streak !== INSERT) {
						// add previous characters
						l.push (makeOpenSpanTag (streak, i, n));
						inOtherStreak = (streak === DELETE || streak === VARIATION);
						if ((inOtherStreak && showDiff) || (!inOtherStreak && showSimilar)) {
							rf.push (rstr.substring(i,n));
							l.push (str.substring(i,n));
						} else if (n > i) {	// or add ellipses if showDiff is true
							ellipsisInsert (n - i, l, rf);
						}
						l.push ("</span>");
						streak = INSERT;
                        i = n;
                    }
					// start of streak present in c and different in ref
                    else if (!chyphen && !rhyphen && c !== r && streak !== VARIATION) {
						// add previous characters
						l.push (makeOpenSpanTag (streak, i, n));
						inOtherStreak = (streak === DELETE || streak === INSERT);
						if ((inOtherStreak && showDiff) || (!inOtherStreak && showSimilar)) {
							rf.push (rstr.substring(i,n));
							l.push (str.substring(i,n));
						} else if (n > i) {	// or add ellipses if showDiff is true
							ellipsisInsert (n - i, l, rf);
						}
						l.push ("</span>");
						streak = VARIATION;
                        i = n;
                    }
                }
                
				// deal with remaining sequence when end reached
				var openStreak = streak !== MATCH;
				l.push (makeOpenSpanTag (streak, i, n));
                if ((openStreak && showDiff) || (!openStreak && showSimilar)) {
					l.push (str.substring(i,n));
					rf.push (rstr.substring(i,n));
                } else if (n > i) {
                    ellipsisInsert (n - i, l, rf);
                }
				l.push("</span>");
				streak = MATCH;
                
                seq.decoratedRStr = showSimilar && showDiff ? rstr : rf.join('');
                seq.decoratedStr = l.join('');
                var max = Math.max (seq.str.length, seq.refStr.length);
                seq.indexStr = this.makeIndexString(max,20).substring(0, max);
            }, this);
            
            var allSeqs = [];
            var wrap = 2;
            refs.forEach (function(r,i) { allSeqs.push(comps[i]); allSeqs.push(comps[i]); /* allSeqs.push(comps[i]); */});

            var nformat = d3.format(",d");
            var scoreFormat = function (val) {
                return val === Number.MAX_VALUE ? "Exact" : nformat (val);
            };
            
            var rowBind = place.selectAll("tr")
                .data(allSeqs, function (d, i) { return d.label + (i % wrap); })
            ;
            
            //rowBind.exit().remove();  // removes other rows if only 1 affectedmodel passed in. Don't want that.
            
            var newRows = rowBind
                .enter()
                .append ("tr")
                .attr ("id", function(d, i) { return "seqComp"+d.label+(i % wrap); })
            ;
            
            newRows.append("th")
                .attr("class", "seqLabel")
                .html (function (d, i) { 
                    var v = i % wrap; 
                    return (v === 0) ? self.model.get("refID") : (v === 1 ? d.label : "Index"); 
                })
                .on ("mouseenter", function(d) {
                    self.tooltipModel
                        .set ("header", self.model.get("displayLabel"))
                        .set("contents", [
                            ["Align Sequence", d.label],
                            ["Search Length", nformat(d.convertFromRef.length)], 
                            [d.label+" Length", nformat(d.convertToRef.length)], 
                            ["Align Score", scoreFormat(d.score)],
                        ])
                        .set("location", d3.event)
                    ;
                    self.tooltipModel.trigger ("change:location");
                })
            ;
            
            newRows.append("td")
                .attr("class", "seq")
                .append ("span")
            ;
            
            rowBind.select("th");   // Pushes changes in datum on existing rows in rowBind down to the th element
            
            rowBind.select ("td > span")
                .html (function(d,i) {
                    var v = i % wrap; 
                    return (v === 0) ? d.decoratedRStr : (v === 1 ? d.decoratedStr : d.indexStr); 
                })
            ;
			
			var seqTypeLabelMap = {
				"seqMatch": "Matching",
				"seqDelete": "Missing",
				"seqInsert": "Extra",
				"seqVar": "Different"
			};

			rowBind.selectAll("td > span > span")
				.on("mouseenter", function (d) {
					//console.log ("hi", this);
					if (self.tooltipModel) {
						var span = d3.select(this);
						var parent = d3.select(this.parentNode);
						var parentDatum = parent.datum();
						self.tooltipModel
							.set("header", parentDatum.label+" compared")
							.set("contents", [
								["AAs are", seqTypeLabelMap[span.attr("class")]],
								["Start", +span.attr("data-start") + 1],	// + 1 for 1-based index
								["End", span.attr("data-end")],
							])
							.set("location", d3.event)
						;
						self.tooltipModel.trigger ("change:location");
					}
				}
			);
            
            return this;
        },
        
        clearTooltip: function () {
            if (this.tooltipModel) {
                this.tooltipModel.set ("contents", null);
            }
            return this;
        },
    });

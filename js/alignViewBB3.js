

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.AlignCollectionViewBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if (_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({
              "change input.alignRadio" : "radioClicked",
          }, parentEvents, {});
        },
        
        initialize: function (viewOptions) {
            CLMSUI.AlignCollectionViewBB.__super__.initialize.apply (this, arguments);
            
            var topElem = d3.select(this.el);
            var modelViewID = topElem.attr("id") + "IndView";
            var holdingDiv = topElem.append("DIV").attr("class", "alignView");
            var template = _.template ("<P class='alignHeader'><%= headerText %></P><DIV class='checkHolder'></DIV><DIV id='<%= alignModelViewID %>'></DIV><DIV id='<%= alignControlID %>'></DIV><DIV id='<%= alignControlID2 %>'></DIV>");
            holdingDiv.html (template ({
                headerText: "Available Proteins for Alignment",
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
            return this;
        },
        
        hollowElement: function (view) {
            view.stopListening();   // remove backbone events bound with listenTo etc 
            $(view.el).off();       // remove dom events
            var a = d3.select(view.el);
            a.selectAll("*").remove();  // remove all elements underneath el
        },
        
        render: function () {
            console.log ("AlignCollView", this);
            var topElem = d3.select(this.el);
            var list = topElem.select("DIV.checkHolder");
            var proteins = list.selectAll("span").data(this.collection.models, function(d) { return d.id; });
            
            proteins.exit().remove();
            
            var pspans = proteins.enter().append("span");
            
            pspans.append("input")
                .attr ("class", "alignRadio")
                .attr ("type", "radio")
                .attr ("name", topElem.attr("id")+"pgroup")
                .attr ("id", function(d,i) { return topElem.attr("id")+"pgroup"+i; })
                .attr ("value", function(d) { return d.id; })
                .property ("checked", function (d,i) { return i === 0; })
            ;
            
            pspans.append("label")
                .text (function(d) { return d.get("displayLabel"); })
                .attr ("for", function(d,i) { return topElem.attr("id")+"pgroup"+i; })
            ;
            
            return this;
        },
        
        radioClicked: function (evt) {
            console.log ("evt", evt, evt.target);
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
                
                this.modelView = new CLMSUI.AlignViewBB3 ({
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
                    .listenTo (model, "change:scoreMatrix", function(alignModel, scoreMatrix) { // and then make it track it thereafter
                        this.setSelected (scoreMatrix);
                    })
                ;
                
                this.modelView.render();
            }
            return this;
        },
    });
    
    CLMSUI.AlignViewBB3 = Backbone.View.extend ({
        events: {
            "mouseleave td.seq>span" : "clearTooltip",
            "change input.diff" : "render",
        },

        initialize: function (viewOptions) {      
            this.tooltipModel = viewOptions.tooltipModel;
            
            var topElem = d3.select(this.el);
            var holdingDiv = topElem.append("DIV").attr("class", "alignView");
            var template = _.template ("<DIV class='tableWrapper'><TABLE><THEAD><TR><TH><%= firstColHeader %></TH><TH><%= secondColHeader %></TH></TR></THEAD><TBODY></TBODY></TABLE></DIV><div><label><%= diffLabel %></label><input type='checkbox' class='diff'></input></div>");
            holdingDiv.html (template ({
                    firstColHeader:"Name", 
                    secondColHeader:"Sequence", 
                    diffLabel:"Show differences only",
            }));       
            
            //this.listenTo (this.model, "change:compAlignments", this.render);
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
            
            var showDiff = d3.select(this.el).select("input.diff").property("checked");
            
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
            
            comps.forEach (function (seq) {
                var rstr = seq.refStr;
                var str = seq.str;
                var l = [];
                var rf = [];
                var delStreak = false;
                var misStreak = false;
                var i = 0;
                for (var n = 0; n < str.length; n++) {
                    var c = str[n];
                    var r = rstr[n];
                    if ((c !== "-" && delStreak) || (c === r && misStreak)) {
                        rf.push (rstr.substring(i,n));
                        l.push (str.substring(i,n));
                        l.push ("</span>");
                        i = n;
                        delStreak = false;
                        misStreak = false;
                    }
              
                    if (c === "-" && !delStreak) {
                        delStreak = true;
                        if (misStreak || !showDiff) {
                            rf.push (rstr.substring(i,n));
                            l.push (str.substring(i,n));
                            if (misStreak) {
                                l.push ("</span>");
                                misStreak = false;
                            }
                        } else if (n > i) {
                            var estr = this.ellipFill (n - i);
                            l.push (estr);
                            rf.push (estr);
                        }
                        
                        l.push ("<span class='seqDelete'>");
                        i = n;
                    }
                    else if (c !== "-" && c !== r && !misStreak) {
                        misStreak = true;
                        if (delStreak || !showDiff) {
                            rf.push (rstr.substring(i,n));
                            l.push (str.substring(i,n));
                            if (delStreak) {
                                l.push ("</span>");
                                delStreak = false;
                            }
                        } else if (n > i) {
                            var estr = this.ellipFill (n - i);
                            l.push (estr);
                            rf.push (estr);
                        }
      
                        l.push ("<span class='seqMismatch'>");
                        i = n;
                    }
                }
                
                if (misStreak || delStreak || !showDiff) {
                    l.push (str.substring(i,n));
                    rf.push (rstr.substring(i,n));
                    if (misStreak || delStreak) {
                        l.push("</span>");
                        misStreak = false;
                        delStreak = false;
                    }
                } else if (n > i) {
                    var estr = this.ellipFill (n - i);
                    l.push (estr);
                    rf.push (estr);
                }
                
                seq.decoratedRStr = showDiff ? rf.join('') : rstr;
                seq.decoratedStr = l.join('');
                var max = Math.max (seq.str.length, seq.refStr.length);
                seq.indexStr = this.makeIndexString(max,20).substring(0, max);
            }, this);
            
            var allSeqs = [];
            var wrap = 2;
            refs.forEach (function(r,i) { allSeqs.push(comps[i]); allSeqs.push(comps[i]); /* allSeqs.push(comps[i]); */});

            
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
            ;
            
            newRows.append("td")
                .attr("class", "seq")
                .append ("span")
                    // mousemove can't be done as a backbone-defined event because we need access to the d datum that d3 supplies
                    .on ("mousemove", function(d) {
                        self.invokeTooltip (d, this);
                    })
            ;
            
            rowBind.select ("td > span")
                .html (function(d,i) {
                    var v = i % wrap; 
                    return (v === 0) ? d.decoratedRStr : (v === 1 ? d.decoratedStr : d.indexStr); 
                })
            ;
            
            return this;
        },
        
        clearTooltip: function (evt) {
            if (this.tooltipModel) {
                 this.tooltipModel.set ("contents", null);
            }
            return this;
        },
        
        invokeTooltip: function (d, elem) {
            if (this.tooltipModel) {
                var xx = CLMSUI.utils.crossBrowserElementX (d3.event, elem);
                var width = $.zepto ? $(elem).width() : $(elem).outerWidth();
                var str = d.str;
                var charWidth = width / str.length;
                var charIndex = Math.floor (xx / charWidth);
                
                /*
                var evt = d3.event;
                var xs = {offsetX: evt.offsetX, clientX: evt.clientX, layerX: evt.layerX, pageX: evt.pageX, screenX: evt.screenX, x: evt.x};
                var offs = {offsetLeft: elem.offsetLeft, scrollLeft: elem.scrollLeft};
                console.log ("moved xs", xs, "offs", offs);
                console.log ("@", xx, width, charIndex, d3.event, d3.event.target, elem);
                //console.log (d.convertToRef, d.convertFromRef);
                */
                
                var t = d.refStr ? d.convertToRef[charIndex] : charIndex;

                this.tooltipModel.set("header", d.label).set("contents", [
                    ["Align Index", charIndex + 1],
                    ["Value", str[charIndex]],
                    ["Ref Value", d.refStr ? d.refStr[charIndex] : str[charIndex]],
                ]).set("location", d3.event);
                this.tooltipModel.trigger ("change:location");
            }
            return this;
        },
    });

(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.AlignViewBB2 = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if (_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
              "change input[type=number]": "inputChanged"
          });
        },

        initialize: function (viewOptions) {
            global.CLMSUI.AlignViewBB2.__super__.initialize.apply (this, arguments);
            
            this.tooltipModel = viewOptions.tooltipModel;
            
            var topElem = d3.select(this.el);
            var topDiv = topElem.append("DIV").attr("class", "alignView");
            var tpl = _.template ("<TABLE><THEAD><TR><TH><%= firstColHeader %></TH><TH><%= secondColHeader %></TH></TR></THEAD><TBODY></TBODY></TABLE><DIV class='<%= alignControlClass %>'></DIV>");
            topDiv.html (tpl ({firstColHeader:"Name", secondColHeader:"Sequence", alignControlClass:"alignSettings"}));       
            
            var controls = topDiv.select(".alignSettings");
            var inputArray = [
                {label: "Gap Open Score", prop:"gapOpenScore", type:"number"},
                {label: "Gap Extend Score", prop:"gapExtendScore", type:"number"},
                {label: "Score Matrix", prop:"scoreMatrix", type:"input"},
            ];
            var inputSel = controls.selectAll("div.controlBlock")
                .data(inputArray, function(d) { return d.prop; })
            ;
            var inputElems = inputSel.enter()
                .append("div")
                .attr("class", "controlBlock")
            ;
            inputElems.append("label").text(function(d) { return d.label; });
            inputElems.append("input").attr("type",function(d) { return d.type; });
            
            
            this.listenTo (this.model, "change:compAlignments", this.render);
            
            return this;
        },
        
        render: function () {
            console.log ("rerendering alignment");
            var place = d3.select(this.el).select("tbody");
            var self = this;
            
            var refs = this.model.get("refAlignments");
            var comps = this.model.get("compAlignments");
            var sids = [this.model.get("refID")].concat(this.model.get("compIDs"));
            var allSeqs = refs.concat(comps);
            
            var controls = d3.select(this.el).selectAll(".alignSettings div.controlBlock input");
            controls.attr("value", function(d) { return self.model.get(d.prop); });
            
            place.selectAll("tr").remove();
            
            allSeqs.slice(1).forEach (function (seq) {
                var rstr = seq.refStr;
                var str = seq.str;
                var l = [];
                var delStreak = false;
                var misStreak = false;
                var i = 0;
                for (var n = 0; n < str.length; n++) {
                    var c = str[n];
                    var r = rstr[n];
                    if ((c !== "-" && delStreak) || (c === r && misStreak)) {
                        l.push (str.substring(i,n));
                        l.push ("</span>");
                        i = n;
                        delStreak = false;
                        misStreak = false;
                    }
              
                    if (c === "-" && !delStreak) {
                        delStreak = true;
                        l.push (str.substring(i,n));
                        l.push ("<span class='seqDelete'>");
                        i = n;
                    }
                    else if (c !== "-" && c !== r && !misStreak) {
                        misStreak = true;
                        l.push (str.substring(i,n));
                        l.push ("<span class='seqMismatch'>");
                        i = n;
                    }
                }
                
                l.push (str.substring(i,n));
                if (misStreak || delStreak) {
                    l.push("</span>");
                }

                seq.decoratedStr = l.join('');
            });

            var containerID = d3.select(this.el).attr("id");
            
            var seqRows = place.selectAll("tr")
                .data(allSeqs)
                .enter()
                .append ("tr")
                .attr ("id", function(d,i) { return containerID+sids[i]; })
            ;
            
            seqRows.append("td")
                .attr("class", "seqLabel")
                .html (function(d) { return d.label; })
            ;
            
            seqRows.append("td")
                .attr("class", "seq")
                .append ("span")
                    .html (function(d) { return d.decoratedStr || d.str; })
                    .on ("mousemove", function(d) {
                        if (self.tooltipModel) {
                            self.invokeTooltip (d, this);
                        }
                    })
                    .on ("mouseleave", function() {
                        if (self.tooltipModel) {
                            self.tooltipModel.set ("contents", null);
                        }
                    })
            ;
            
            return this;
        },
        
        invokeTooltip: function (d, elem) {
            var xx = d3.event.offsetX;
            var width = $.zepto ? $(elem).width() : $(elem).outerWidth();
            var str = d.str;
            var charWidth = width / str.length;
            var charIndex = Math.floor (xx / charWidth);
            console.log ("@", xx, width, charIndex);
            console.log (d.convertToRef, d.convertFromRef);
            
            var t = d.refStr ? d.convertToRef[charIndex] : charIndex;
                
            this.tooltipModel.set("header", d.label).set("contents", [
                ["Index", charIndex],
                ["Value", str[charIndex]],
                ["Ref Value", d.refStr ? d.refStr[charIndex] : str[charIndex]],
            ]).set("location", d3.event);
            this.tooltipModel.trigger ("change:location");
        },
        
        inputChanged: function (evt) {
            var control = d3.select(evt.target);
            var controlDatum = control.datum();
            console.log (controlDatum.prop, +control.property("value"));
            this.model.set (controlDatum.prop, +control.property("value"));
        }
    });
})(this);
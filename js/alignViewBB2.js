(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.AlignViewBB2 = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if (_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.AlignViewBB2.__super__.initialize.apply (this, arguments);
            
            var topElem = d3.select(this.el);
            topElem.append("div").attr("class","alignView");
            
            this.listenTo (this.model, "change:compAlignments", this.render);
            
            return this;
        },
        
        render: function () {
            console.log ("rerendering alignment");
            var place = d3.select(this.el).select("div.alignView");
            
            var refs = this.model.get("refAlignments");
            var comps = this.model.get("compAlignments");
            var allSeqs = refs.concat(comps);
            
            place.selectAll("p").remove();
            
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

                seq.viewStr = l.join('');
            });

            
            place.selectAll("tr.seq")
                .data(allSeqs)
                .enter()
                .append ("p")
                .html (function(d) { return d.viewStr || d.str; })
            ;
            
            return this;
        },
    });
})(this);
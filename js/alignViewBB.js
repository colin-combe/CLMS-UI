(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.AlignViewBB = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.AlignViewBB.__super__.initialize.apply (this, arguments);
            
            var topElem = d3.select(this.el);
            topElem.append("table").attr("class","alignView");;
            
            this.listenTo (this.model, "change:compAlignments", this.render);
            
            return this;
        },
        
        render: function () {
            var table = d3.select(this.el).select("table");
            
            var refs = this.model.get("refAlignments");
            var comps = this.model.get("compAlignments");
            var allSeqs = refs.concat(comps);
            
            var maxLength = d3.max (allSeqs, function(seq) {
                return seq.str.length;
            });
            
            table.selectAll("tr").remove();
            
            /*
            var topCells = table.append("tr").attr("class", "firstRow")
                .selectAll("th")
                .data (d3.range (maxLength))
            ;
            topCells.enter().append("th").text(function(d) { return d; });
            */
            var rows = table.selectAll("tr.seq")
                .data(allSeqs)
                .enter()
                .append ("tr")
                .attr("class", "seq")
            ;
            
            rows.selectAll("td")
                .data(function(d) { return d.str.split(''); })
                .enter()
                .append("td")
                .text(function(d) { return d; })
                .style ("background", function(d,i,ii) { 
                    if (d === '-') return "#44a";
                    var cSeqRef = allSeqs[ii].refStr;
                    if (cSeqRef && cSeqRef[i] !== d) {
                        return "#f80";
                    }
                    return null;
                })
            ;
            
            return this;
        },
    });
})(this);
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.AlignViewBB2 = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.AlignViewBB2.__super__.initialize.apply (this, arguments);
            
            var topElem = d3.select(this.el);
            topElem.append("div").attr("class","alignView");;
            
            this.listenTo (this.model, "change:compAlignments", this.render);
            
            return this;
        },
        
        render: function () {
            var place = d3.select(this.el).select("div.alignView");
            
            var refs = this.model.get("refAlignments");
            var comps = this.model.get("compAlignments");
            var allSeqs = refs.concat(comps);
            
            place.selectAll("p").remove();
            
            /*
            var topCells = table.append("tr").attr("class", "firstRow")
                .selectAll("th")
                .data (d3.range (maxLength))
            ;
            topCells.enter().append("th").text(function(d) { return d; });
            */
            var rows = place.selectAll("tr.seq")
                .data(allSeqs)
                .enter()
                .append ("p")
                .text (function(d) { return d.str; });
            ;
            
            return this;
        },
    });
})(this);
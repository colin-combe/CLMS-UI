
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};

    global.CLMSUI.TooltipViewBB = global.Backbone.View.extend ({
        class: "CLMStooltip",
        initialize: function () {
            var tooltip = d3.select(this.el);
            tooltip.style ("visibility", "hidden");
            tooltip.append("h2");
            tooltip.append("p");
            this.holdDuration = 10000;
            this.fadeDuration = 200;
            this.mouseOffset = 10;
            
            this.listenTo (this.model.get("event"), "change", this.setPosition); 
            this.listenTo (this.model.get("contents"), "change", this.render);           
        },
        render : function() {
            var self = this;
            var tooltip = d3.select(this.el);
            tooltip.select("h2").text(this.model.get("header"));
            tooltip.select("p").text(this.model.get("contents"));
             tooltip
                .transition()
                .style ("visibility", "visible")
                .style ("opacity", null)
                .transition()
                .duration(self.holdDuration)
                .each ("end", function() {
                    self.setToFade();
                })
             ;
            
            return this;     
        },
        setPosition: function (e) {
            var tooltip = d3.select(this.el);
            var dw = $(document).width();
            var dh = $(document).height();
            var ww = $(window).width();
            var wh = $(window).height();
            var sx = $(document).scrollLeft();
            var sy = $(document).scrollTop();

            var tx = e.pageX;
            var ty = e.pageY;
            var tw = $el.outerWidth();
            var th = $el.outerHeight();

            var allDefinedAndNonZero = (dw && dh && tw && th && ww && wh); // test all widths/heights are non-zero and defined
            var newtx, newty;

            if (allDefinedAndNonZero) {
                var roomBelow = ty + th + this.mouseOffset < Math.min (dh, wh + sy);
                newty = roomBelow ? ty + this.mouseOffset : ty - th - this.mouseOffset;

                var roomRight = tx + tw + this.mouseOffset < Math.min (dw, ww + sx);
                newtx = roomRight ? tx + this.mouseOffset : tx - tw - this.mouseOffset;
            } else {
                newtx = tx;
                newty = ty;
            }
            
            tooltip.style("x",newtx+"px").style("y",newty+"px");
            
            return this;
        },
        setToFade: function () {
            var self = this;
            var tooltip = d3.select(this.el);
            tooltip
                .transition()
                .duration (self.fadeDuration)
                .style ("opacity", 0)
                .each ("end", function () {
                    tooltip.style ("visibility", "hidden");
                })
            ;
            return this;
        }
    });
})(this);
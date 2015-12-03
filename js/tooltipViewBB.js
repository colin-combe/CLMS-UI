
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};

    global.CLMSUI.TooltipViewBB = global.Backbone.View.extend ({
        className: "CLMStooltip",
        initialize: function () {
            var tooltip = d3.select(this.el);
            tooltip.style ("visibility", "hidden");
            tooltip.append("h2");
            tooltip.append("p");
            this.holdDuration = 10000;
            this.fadeDuration = 200;
            this.mouseOffset = 10;
            
            this.listenTo (this.model, "change:location", this.setPosition); 
            this.listenTo (this.model, "change:contents", this.render);           
            this.listenTo (this.model, "change:header", this.render);           
        },
        render : function() {
            //console.log ("yo tooltip render", arguments);
            
            var contents = this.model.get("contents");
            if (contents === null) {
                this.setToFade();
                return;
            }
            
            var self = this;
            var tooltip = d3.select(this.el);
            tooltip.select("h2").text(this.model.get("header"));
            

            var oned = $.isArray(contents);
            var twod = oned ? $.isArray(contents[0]) : false;
            
            var cstring;
            if (twod) {
                cstring="<table>";
                var rtype = "th";
                for (var n = 0; n < contents.length; n++) {
                    var row = contents[n];
                    var str = "";
                    for (var m = 0; m < row.length; m++) {
                        str += "<"+rtype+">"+row[m]+"</"+rtype+">";
                      
                    }
                    rtype = "td";
                    cstring += "<tr>" + str + "</tr>";
                }
                cstring += "</table>";
            } else if (oned) {
                cstring="<ul>";
                for (var n = 0; n < contents.length; n++) {
                    cstring += "<li>"+contents[n];
                }
                cstring += "</ul>";
            } else {
                cstring = contents;
            }
            
            tooltip.select("p").html(cstring);
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
        setPosition: function () {
            var e = this.model.get("location");

            var tooltip = d3.select(this.el);
            var dw = $(document).width();
            var dh = $(document).height();
            var ww = $(window).width();
            var wh = $(window).height();
            var sx = $(document).scrollLeft();
            var sy = $(document).scrollTop();

            var tx = e.pageX;
            var ty = e.pageY;
            var tw = this.$el.width();  // outerWidth in JQuery, width in Zepto
            var th = this.$el.height(); // ditto, but for height

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
            
            tooltip.style("left",newtx+"px").style("top",newty+"px");
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
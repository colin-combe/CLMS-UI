
    var CLMSUI = CLMSUI || {};

    CLMSUI.TooltipViewBB = Backbone.View.extend ({
        className: "CLMStooltip",
        initialize: function () {
            var tooltip = d3.select(this.el);
            tooltip.style ("visibility", "hidden");
            tooltip.append("h2");
            tooltip.append("p");
            this.holdDuration = 10000;
            this.fadeDuration = 200;
            this.mouseOffset = 60;
            this.numberFormat = function (val) { return d3.round (val, 6); };
            
            this.listenTo (this.model, "change:location", this.setPosition); 
            this.listenTo (this.model, "change:contents change:header", this.render);                  
        },
        render: function() {     
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
                var headerCount = 0;
                contents.forEach (function (row) {
                    headerCount = headerCount || row.length;
                    var str = "";
                    var colspan = "";
                    for (var m = 0; m < row.length; m++) {
                        if (m === row.length - 1 && row.length < headerCount) {
                            colspan = " COLSPAN=\"" + (headerCount - row.length + 1)+"\"";
                        }
                        var val = isNaN(row[m]) ? row[m] : self.numberFormat(row[m]);
                        str += "<"+rtype+colspan+">"+val+"</"+rtype+">";
                    }
                    rtype = "td";
                    cstring += "<tr>" + str + "</tr>";
                });
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
            
            //console.log ("event", e);

            var tooltip = d3.select(this.el);
            var doc = $(document);
            var win = $(window);
            var dw = doc.width();
            var dh = doc.height();
            var ww = win.width();
            var wh = win.height();
            var sx = win.scrollLeft();
            var sy = win.scrollTop();

            var tx = e.pageX;
            var ty = e.pageY;
            var tw = $.zepto ? this.$el.width() : this.$el.outerWidth();  // outerWidth in JQuery, width in Zepto
            var th = $.zepto ? this.$el.height() : this.$el.outerHeight(); // ditto, but for height

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

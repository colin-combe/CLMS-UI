
(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};

    global.CLMSUI.TooltipModelBB = global.Backbone.Model.extend ({
        initialize: function () {
            this
                .set("location", null)
                .set("header", "Tooltip")
                .set("contents", ["Can show", "single items", "lists or", "tables"])
            ;
        }
    });
})(this);
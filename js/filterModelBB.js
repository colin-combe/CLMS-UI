var CLMSUI = CLMSUI || {};

CLMSUI.FilterModelBB = Backbone.Model.extend ({
    initialize: function () {
        this
            .set ("A", true)
            .set ("B", true)
            .set ("C", true)
            .set ("Q", false)
            .set ("AUTO", false)
            .set ("selfLinks", true)
            .set ("ambig", true)
            .set ("cutoff", 0)
        ;
    }
});
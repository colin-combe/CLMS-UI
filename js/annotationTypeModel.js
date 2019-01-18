var CLMSUI = CLMSUI || {};

CLMSUI.BackboneModelTypes.AnnotationType = Backbone.Model.extend({
    defaults: {
        id: undefined,
        category: undefined,
        type: undefined,
        shown: false,
    },
    initialize: function(options) {
        var defaultOptions = {};
        this.options = _.extend(defaultOptions, options);
        this
            .set("id", options.category + "-" + options.type)
            .set("category", options.category)
            .set("type", options.type);
    },

});

CLMSUI.BackboneModelTypes.AnnotationTypeCollection = Backbone.Collection.extend({
    initialize: function (models, options) {
        this.listenTo (CLMSUI.vent, "userAnnotationsUpdated", function (details) {
            if (details.types) {
                this.add (details.types);
            }
        });
    },
    model: CLMSUI.BackboneModelTypes.AnnotationType,
    comparator: function(model) {
        return model.get("id");
    },
});
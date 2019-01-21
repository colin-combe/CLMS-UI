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
            .set("type", options.type)
        ;
    },

});

CLMSUI.BackboneModelTypes.AnnotationTypeCollection = Backbone.Collection.extend({
    initialize: function (models, options) {
        this.listenTo (CLMSUI.vent, "userAnnotationsUpdated", function (details) {
            if (details.types) {
                // modelId declaration below is needed to stop same ids getting added - https://github.com/jashkenas/backbone/issues/3533
                this.add (details.types);
            }
        });
    },
    model: CLMSUI.BackboneModelTypes.AnnotationType,
    modelId: function (attrs) { 
        return attrs.category + "-" + attrs.type;
    },
    comparator: function(model) {
        return model.get("id");
    },
});
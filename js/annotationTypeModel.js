var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.AnnotationType = Backbone.Model.extend ({
    defaults: {
        id: undefined,
        category: undefined,
        type: undefined,
        shown: false, 
    },
    initialize: function (options) {
            var defaultOptions = {};
			this.options = _.extend(defaultOptions, options);
			this.set("id", options.category + "-" +  options.type);
			this.set("category", options.category);
 			this.set("type", options.type);
    },

});

CLMSUI.BackboneModelTypes.AnnotationTypeCollection = Backbone.Collection.extend ({
    model: CLMSUI.BackboneModelTypes.AnnotationType,
    comparator: function (model) {
        return model.get("id");
    },
});

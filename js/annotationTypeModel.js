var CLMSUI = CLMSUI || {};
CLMSUI.linkColour = CLMSUI.linkColour || {};

CLMSUI.BackboneModelTypes.AnnotationType = Backbone.Model.extend ({
    defaults: {
        category: undefined,
        type: undefined,
        shown: false, 
    },
    initialize: function (options) {
            var defaultOptions = {};
			this.options = _.extend(defaultOptions, options);
			this.set();
 			this.set();
    },
});

CLMSUI.BackboneModelTypes.AnnotationTypeCollection = Backbone.Collection.extend ({
    model: CLMSUI.BackboneModelTypes.AnnotationType,
});

//  protein info view
//
//  Martin Graham, Rappsilber Laboratory, 2015


var CLMSUI = CLMSUI || {};

CLMSUI.URLSearchBoxViewBB = CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
            var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
            if(_.isFunction(parentEvents)){
                parentEvents = parentEvents();
            }
            return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            CLMSUI.URLSearchBoxViewBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {};
            this.options = _.extend ({}, this.options, defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            var innerPanel = mainDivSel.append("div")
                .attr ("class", "panelInner")
            ;
			
            innerPanel.append("h1")
            	.text("Share Current URL with filter")
            ;
			
			innerPanel.append("input")
				.attr("type", "text")
				.attr("length", "50")
			;
            
            this.listenTo (this.model, "change", this.render);
                
			console.log ("oUJHJKLptions", this.options);
            return this;
        },
    
        render: function () {
            // only render if visible
            d3.select(this.el).select("input[type=text]").property("value", this.model.urlString());
            return this;
        },
    
        identifier: "Share Search URL",
});
            

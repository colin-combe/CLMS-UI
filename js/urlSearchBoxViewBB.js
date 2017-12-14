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
			mainDivSel.classed ("urlSearchBox", true);
			
            var innerPanel = mainDivSel.append("div")
                .attr ("class", "panelInner")
            ;
			
            innerPanel.append("h1")
            	.text("Share URL with current filter settings")
            ;
			
			var flexPanel = innerPanel.append("div")
				.attr("display", "flex")
			;
			
			var but = flexPanel.append("button")
				.classed ("btn btn-1 btn-1a", true)
				.style ("display", "inline-block")
				.style ("flex-grow", "0")
				.attr ("title", "Copy URL to Clipboard")
			;
			
			but.append("i")
				.attr("class", "fa fa-xi fa-clipboard")
				.style("flex-grow", "1")
			;
				
			flexPanel.append("input")
				.attr("type", "text")
				.attr("readonly", "true")
				.attr("length", "500")
			;
            
            this.listenTo (this.model, "change", this.render);
                
            return this;
        },
    
        render: function () {
            // only render if visible
			if (this.isVisible()) {
				var d3el = d3.select(this.el);
            	d3el.select("input[type=text]").property("value", this.model.urlString());
				var input = d3el.select("input[type=text]").node();
				input.focus();
				input.select();
			}
            return this;
        },
    
        identifier: "Share Search URL",
});

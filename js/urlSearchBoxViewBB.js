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
            return _.extend({
				"click button.copyClipboard" : "copyToClipboard",
			},parentEvents,{});
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
            	.text("Click button to copy link to clipboard")
            ;
			
			var flexPanel = innerPanel.append("div")
				.attr("class", "flexBox")
			;
			
			var but = flexPanel.append("button")
				.classed ("btn btn-1 btn-1a flexStatic copyClipboard", true)
				.attr ("title", "Copy Link to Clipboard")
			;
			
			but.append("i")
				.attr("class", "fa fa-xi fa-clipboard")
			;
				
			flexPanel.append("input")
				.attr ("class", "flexStretch")
				.attr ("type", "text")
				.attr ("readonly", "true")
				.attr ("length", "500")
			;
            
            this.listenTo (this.model, "change", this.render);
                
            return this;
        },
    
        render: function () {
            // only render if visible
			if (this.isVisible()) {
				var d3input = d3.select(this.el).select("input[type=text]");
            	d3input.property("value", this.model.urlString());
				var input = d3input.node();
				input.focus();
				input.select();
				input.blur();
			}
            return this;
        },
	
		copyToClipboard: function () {
			var input = d3.select(this.el).select("input[type=text]").node();
			input.focus();
			input.select();
			document.execCommand("Copy");
			return this;	
		},
    
        identifier: CLMSUI.utils.commonLabels.shareLink,
});

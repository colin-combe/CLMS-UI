var CLMSUI = CLMSUI || {};

CLMSUI.SearchSummaryViewBB = CLMSUI.utils.BaseFrameView.extend ({
     events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
              "change input[type='color']": "changeColour",
          });
    },
    
    initialize: function (viewOptions) {
        CLMSUI.KeyViewBB.__super__.initialize.apply (this, arguments);
        
        var defaultOptions = {};
        this.options = _.extend(defaultOptions, viewOptions.myOptions);
        
        this.listenTo (this.model, "change:matches", this.render);
        
        d3.select(this.el).append("div").attr("class", "searchSummaryDiv panelInner");
        
        return this;
    },
    

    render: function () {
		//d3.select(this.el).append("div");
        var searches = this.model.get("searches");
        $(".searchSummaryDiv").JSONView(Array.from(searches.values()));
        $('.searchSummaryDiv').JSONView('collapse', 2);

        
        return this;
    },
    
    identifier: "Search Summaries",
});

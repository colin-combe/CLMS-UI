//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

(function(win) {
    "use strict";

    win.CLMSUI = win.CLMSUI || {};
    
    win.CLMSUI.NGLViewBB = win.CLMSUI.utils.BaseFrameView.extend({

        events: function() {
          var parentEvents = win.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
            "click .centreButton": "centerView",
            "click .downloadButton": "downloadImage",
          });
        },

        initialize: function (viewOptions) {
            win.CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
            
            console.log("arg options", viewOptions);
            var defaultOptions = {
                //~ xlabel: "Distance",
                //~ ylabel: "Count",
                //~ seriesName: "Cross Links",
                //~ chartTitle: "Distogram",
                //~ maxX: 80
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            //~ this.precalcedDistributions = {};
            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);

            var toolbar = mainDivSel.append("div").style("height", "40px");
            
            
            toolbar.append("button")
                .attr("class", "btn btn-1 btn-1a centreButton")
                .text("Centre");
			
			toolbar.append("label")
                .attr("class", "btn")
                .text("Distance labels")
                .append("input")
                .attr("type", "checkbox")
                .attr("class", "distanceLabelCB");
			
			toolbar.append("label")
                .attr("class", "btn")
                .text("Selected only")
                .append("input")
                .attr("type", "checkbox")
                .attr("class", "selectedOnlyCB");
			
			toolbar.append("button")
                .attr("class", "btn btn-1 btn-1a downloadButton")
                .text("Download Image");
			
		

            this.chartDiv = mainDivSel.append("div")
                .attr("class", "panelInner")
                .attr("id", "ngl")
                //~ .style("position", "relative")
                .style("height", "calc( 100% - 40px )")
            ;
 
            this.chartDiv.selectAll("*").remove();
            
			//create 3D network viewer
			if ( ! Detector.webgl ) {
				Detector.addGetWebGLMessage(mainDivSel); 
			}
			else {
				this.stage = new NGL.Stage( "ngl" );//this.chartDiv[0][0] );
				this.stage.loadFile( "rcsb://1AO6", { sele: ":A" } )


				.then( function(
				structureComp ){

					var linkList = [];
					
					for(var crossLink of self.model.get("clmsModel").get("crossLinks").values()){

						linkList.push( {
							fromResidue: crossLink.fromResidue,
							toResidue: crossLink.toResidue
						} );

					}
					
					linkList = transformLinkList( linkList, "A" );
					
					var crosslinkData = new CrosslinkData( linkList );

					var xlRepr = new CrosslinkRepresentation(
						self.stage, structureComp, crosslinkData, {
							highlightedColor: "lightgreen",
							sstrucColor: "wheat",
							displayedDistanceColor: "tomato"
						}
					);
				});
				
			}        

            this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
            //this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
        },

        downloadImage: function () {
			this.stage.exportImage( 1, true, false, false );
            //~ var png = NGL.screenshot(this.stage.viewer);
            //~ download(png , 'image/png', 'ngl.png');
        },

        render: function () {
            if (win.CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                console.log ("re rendering NGL view");
                this.stage.handleResize();
            }

            return this;
        },

        relayout: function () {
			this.stage.handleResize();
            return this;
        },
		
		centerView: function () {
			this.stage.centerView();
            return this;
        },

    });
    
} (this));

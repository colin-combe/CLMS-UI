//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js

(function(win) {
    "use strict";

    win.CLMSUI = win.CLMSUI || {};
    
    win.CLMSUI.NGLViewBB = Backbone.View.extend({
        tagName: "div",
        className: "dynDiv",
        events: {
            // following line commented out, mouseup sometimes not called on element if pointer drifts outside element 
            // and dragend not supported by zepto, fallback to d3 instead (see later)
            // "mouseup .dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br": "relayout",    // do resize without dyn_div alter function
            "click .centreButton": "centerView",
            "click .downloadButton": "downloadImage",
            "click .closeButton": "hideView"
        },

        initialize: function (viewOptions) {
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

            // Set up some html scaffolding in d3
            win.CLMSUI.utils.addDynDivScaffolding(mainDivSel);

            // add drag listener to four corners to call resizing locally rather than through dyn_div's api, which loses this view context
            var drag = d3.behavior.drag().on ("dragend", function() { self.relayout(); });
            mainDivSel.selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br")
                .call (drag)
            ;

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
                       
            if (viewOptions.displayEventName) {
                this.listenTo (CLMSUI.vent, viewOptions.displayEventName, this.setVisible);
            }
        },

        downloadImage: function () {
			this.stage.exportImage( 1, true, false, false );
            //~ var png = NGL.screenshot(this.stage.viewer);
            //~ download(png , 'image/png', 'ngl.png');
        },

        hideView: function () {
            win.CLMSUI.vent.trigger (this.displayEventName, false);
        },

        setVisible: function (show) {
            d3.select(this.el).style('display', show ? 'block' : 'none');

            if (show) {
                this
                    //.relayout() // need to resize first sometimes so render gets correct width/height coords
                    .render()
                ;
            }
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

        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            this.chart = this.chart.destroy();

            // remove drag listener
            d3.select(this.el).selectAll(".dynDiv_resizeDiv_tl, .dynDiv_resizeDiv_tr, .dynDiv_resizeDiv_bl, .dynDiv_resizeDiv_br").on(".drag", null); 

            // this line destroys the containing backbone view and it's events
            Backbone.View.prototype.remove.call(this);
        }

    });
    
} (this));

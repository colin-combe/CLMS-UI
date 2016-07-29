//		a distance histogram
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015
//
//		distogram/Distogram.js


    var CLMSUI = CLMSUI || {};
    
    CLMSUI.NGLViewBB = CLMSUI.utils.BaseFrameView.extend({

        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
            "click .centreButton": "centerView",
            "click .downloadButton": "downloadImage",
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.NGLViewBB.__super__.initialize.apply (this, arguments);
            
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
    var self = this;
			if ( ! Detector.webgl ) {
				Detector.addGetWebGLMessage(mainDivSel); 
			}
			else {
				this.stage = new NGL.Stage( "ngl" );//this.chartDiv[0][0] );
				this.stage.loadFile( "rcsb://1AO6", { sele: ":A" } )


				.then (function (structureComp) {
					
					   var crosslinkData = new CrosslinkData (self.makeLinkList (self.model.get("clmsModel").get("crossLinks")));

					   self.xlRepr = new CrosslinkRepresentation(
						      self.stage, structureComp, crosslinkData, {
							         highlightedColor: "lightgreen",
							         sstrucColor: "wheat",
							         displayedDistanceColor: "tomato"
						      }
					   );
                    
                        var sequences = CLMSUI.modelUtils.getSequencesFromNGLModel (self.stage, self.model.get("clmsModel"));
                        console.log ("stage", self.stage, "\nhas sequences", sequences);
                        // hacky thing to alert anything else interested the sequences are available as we are inside an asynchronous callback
                        self.model.trigger ("3dsync", sequences);  
                        self.listenTo (self.model.get("filterModel"), "change", self.showFiltered);    // any property changing in the filter model means rerendering this view
                        //this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
                        self.listenTo (self.model.get("clmsModel"), "change:selection", self.showSelected);
				});
				
			}        


        },
        
        showSelected: function () {
            console.log ("stage", this.stage);
        },
        
        makeLinkList: function (linkModel) {
            var linkList = [];
            console.log ("linkModel", linkModel);
					
            for(var crossLink of linkModel.values()) {
				linkList.push( {
				    fromResidue: crossLink.fromResidue,
				    toResidue: crossLink.toResidue
				});     
            }
					
            return transformLinkList (linkList, "A");	
        },
        
        filterCrossLinks: function (crossLinks) {
            var filteredCrossLinks = [];
            crossLinks.forEach (function (value) {
                if (value.filteredMatches_pp && value.filteredMatches_pp.length > 0 && !value.fromProtein.is_decoy && !value.toProtein.is_decoy) {
                    filteredCrossLinks.push (value);
                }
            });
            return filteredCrossLinks;
        },
        
        showFiltered: function () {
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            var filteredCrossLinks = this.filterCrossLinks (crossLinks);
            console.log ("xlRepr", this.xlRepr);
            //var availableLinks = this.xlRepr._getAvailableLinks();
            console.log ("linx", filteredCrossLinks, filteredCrossLinks.size);
            this.xlRepr.setDisplayedLinks (this.makeLinkList (filteredCrossLinks));
        },

        downloadImage: function () {
			 this.stage.exportImage( 1, true, false, false );
            //~ var png = NGL.screenshot(this.stage.viewer);
            //~ download(png , 'image/png', 'ngl.png');
        },

        render: function () {
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
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


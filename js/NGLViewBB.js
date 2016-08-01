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
					
                    var crossLinks = self.model.get("clmsModel").get("crossLinks");
                    var crosslinkData = new CrosslinkData (self.makeLinkList (crossLinks));

                   self.xlRepr = new CrosslinkRepresentation(
                          self.stage, structureComp, crosslinkData, {
                                 highlightedColor: "lightgreen",
                                 sstrucColor: "wheat",
                                 displayedDistanceColor: "tomato"
                          }
                   );

                    console.log ("xlRepr", self.xlRepr);
                    console.log ("crossLinks", crossLinks);
                    var dd = self.xlRepr.getLinkDistances (self.xlRepr._getAllAtomObjectPairs());
                    console.log ("distances", dd.length, dd);

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
        
        // TODO, need to check if a) alignments are loaded and b) check for decoys (protein has no alignment)
        align: function (resIndex, proteinID) {
            var alignModel = this.model.get("alignColl").get (proteinID);
            //console.log ("am", proteinID, alignModel);
            //console.log ("ids", alignModel.get("compAlignments"));
            var alignPos = resIndex;
            /*
            if (alignModel) {
                alignPos = alignModel.mapFromSearch ("3D_p0", resIndex);
                console.log (resIndex, "->", alignPos);
                if (alignPos < 0) { alignPos = -alignPos; }   // <= 0 indicates no equal index match, do the - to find nearest index
            }
            */
            return alignPos;
        },
        
        makeLinkList: function (linkModel) {
            var linkList = [];
            console.log ("aligns", this.model.get("alignColl"));
            console.log ("alignModel", this.model.get("alignColl"));
            for (var xlink of linkModel.values()) {
                console.log ("xl", xlink);
                linkList.push ({
                    fromResidue: this.align (xlink.fromResidue, xlink.fromProtein.id),
                    toResidue: this.align (xlink.toResidue, xlink.toProtein.id),
                });
            }
            console.log ("ll", linkList);
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
            if (CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {
                var crossLinks = this.model.get("clmsModel").get("crossLinks");
                var filteredCrossLinks = this.filterCrossLinks (crossLinks);
                //console.log ("linx", filteredCrossLinks, filteredCrossLinks.size);

                var linkList = this.makeLinkList (filteredCrossLinks);
                this.xlRepr.setDisplayedLinks (linkList);  // seems to be equivalent to line below but doesn't incur spacefill calcs?
                //this.xlRepr.crosslinkData.setLinkList (linkList);
            }
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


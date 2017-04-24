//  xiNET
//
//  Colin Combe, Martin Graham, Rappsilber Laboratory, 2015
//
//  CrosslinkViewerBB.js

    var CLMSUI = CLMSUI || {};
    
    CLMSUI.RnaLikeViewBB = CLMSUI.utils.BaseFrameView.extend({
        events: function() {
          var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{
			  
          });
        },

        initialize: function (viewOptions) {
            CLMSUI.CircularViewBB.__super__.initialize.apply (this, arguments);

		var yourDiv = this.el;
		var Rna = require("drawrnajs");

var input = [
    "GANYNNHNAAGNNAU",
    ""
];
		
		var pars = Array.from(this.model.get("clmsModel").get("participants").values());
		var participant = pars[0];
		var s = "";
		var db = "";
		for (var i = 0; i < participant.sequence.length; i++)
			{db = db + ".";
			s = s + "A";	}
		var app = new Rna({
			el: yourDiv,
			seq: s,
			dotbr: input[1],
			layout: "naview",
			seqpanel: true,
			optspanel: true,
			resindex: true
		})
		app.render();
		//Add hydrogen bonds manually
//~ app.struct.get("links").newBond("3", "6")
//~ app.struct.get("links").newBond("2", "7")
//~ app.struct.get("links").newBond("1", "8")
//~ app.struct.get("links").newBond("9", "14")
//~ app.struct.get("links").newBond("10", "13")

//Change the bond type of the two NN-Basepairs
//to non-canonical hydrogen bond and bond type of
//the canonical AU base pair to non-canonical
//~ app.vis.changeBondType("11to12", "non-canonical")
//~ app.vis.changeBondType("4to5", "non-canonical")
//~ app.vis.changeBondType("9to14", "non-canonical")

//~ //Add the non-canonical h-bond between A and G
//~ app.vis.addNCBond(0, 14)
//~ 
//~ //Set bond edges for the non-canonical hydrogen bonds
//~ app.vis.setLeontisWesthof("2to7", "sghgtrans")
//~ app.vis.setLeontisWesthof("1to8", "hghgtrans")
//~ app.vis.setLeontisWesthof("10to13", "sghgtrans")
//~ app.vis.setLeontisWesthof("9to14", "wchgtrans")
//~ app.vis.setLeontisWesthof("0to14", "sghgcis")
				var crossLinksArr = Array.from(this.model.get("clmsModel").get("crossLinks").values());
            var clCount = crossLinksArr.length; 
            var clmsModel = this.model.get("clmsModel");          
            for(var cl =0 ; cl < clCount; cl++){
				var crossLink = crossLinksArr[cl];
                if (clmsModel.isDecoyLink(crossLink) == false) {
					app.struct.get("links").newBond(crossLink.fromResidue + "", crossLink.toResidue + "")
                }
            }
		
			//~ this.listenTo (this.model, "filteringDone", this.render); 
		},
		
		render: function () {
			//~ this.app.render();
		},
		
		identifier: "2D RNA-like",
        
    });

//  CLMS-UI
//  Copyright 2015 Colin Combe, Rappsilber Laboratory, Edinburgh University
//
//  This file is part of CLMS-UI.
//
//  CLMS-UI is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  CLMS-UI is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with CLMS-UI.  If not, see <http://www.gnu.org/licenses/>.

var CLMSUI = CLMSUI || {};

var split = Split (["#topDiv", "#bottomDiv"], { direction: "vertical", sizes: [60,40], minSize: [200,10], });



// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views

CLMSUI.init = CLMSUI.init || {};

CLMSUI.init.views = function () {
    
    var windowIds = ["spectrumPanelWrapper", "keyPanel", "nglPanel", "distoPanel", "matrixPanel", "alignPanel", "circularPanel", "proteinInfoPanel"];
    // something funny happens if I do a data join and enter instead
    // ('distoPanel' datum trickles down into chart axes due to unintended d3 select.select inheritance)
    // http://stackoverflow.com/questions/18831949/d3js-make-new-parent-data-descend-into-child-nodes
    windowIds.forEach (function (winid) {
        d3.select("body").append("div")
            .attr("id", winid)
            .attr("class", "dynDiv")
        ;
    });
    
    var filterModel = CLMSUI.compositeModelInst.get("filterModel");     
    var filterViewGroup = new CLMSUI.FilterViewBB ({
        el: "#filterPlaceholder", 
        model: filterModel
    });

    var miniDistModelInst = new CLMSUI.BackboneModelTypes.MinigramModel ();
    miniDistModelInst.data = function() {
        var matches = CLMSUI.modelUtils.flattenMatches (CLMSUI.compositeModelInst.get("clmsModel").get("matches"));
        return matches; // matches is now an array of arrays    //  [matches, []];
    };

    var scoreDistributionView = new CLMSUI.MinigramViewBB ({
        el: "#filterPlaceholderSliderHolder",
        model: miniDistModelInst,
        myOptions: {
            maxX: 0,    // let data decide
            seriesNames: ["Matches", "Decoys"],
            //scaleOthersTo: "Matches",
            xlabel: "Score",
            ylabel: "Count",
            height: 50,
            colors: {"Matches":"blue", "Decoys":"red"}
        }
    });


    // When the range changes on the mini histogram model pass the values onto the filter model
    filterModel.listenTo (miniDistModelInst, "change", function (model) {
        this.set ("cutoff", [model.get("domainStart"), model.get("domainEnd")]); 
    }, this);


    // If the ClmsModel matches attribute changes then tell the mini histogram view
    scoreDistributionView
        .listenTo (CLMSUI.clmsModelInst, "change:matches", this.render) // if the matches changes (likely?) need to re-render the view too
        // below should be bound eventually if filter changes, but c3 currently can't change brush pos without internal poking about
        //.listenTo (this.model.get("filterModel"), "change", this.render)  
    ;       

    // Generate checkboxes
    var checkBoxData = [
        //{id: "nglChkBxPlaceholder", label: "3D", eventName:"nglShow"},
        //{id: "distoChkBxPlaceholder", label: "Distogram", eventName:"distoShow"},
        //{id: "matrixChkBxPlaceholder", label: "Matrix", eventName:"matrixShow"},
        {id: "alignChkBxPlaceholder", label: "Alignment", eventName:"alignShow"},
        //{id: "keyChkBxPlaceholder", label: "Legend", eventName:"keyShow"},
        {id: "circularChkBxPlaceholder", label: "Circular", eventName:"circularShow"},
        {id: "spectrumChkBxPlaceholder", label: "Spectrum", eventName:"spectrumShow"},
        {id: "proteinInfoChkBxPlaceholder", label: "Protein Info", eventName:"proteinInfoShow"},
    ];
    checkBoxData.forEach (function (cbdata) {
        var cbView = CLMSUI.utils.addCheckboxBackboneView ({id: cbdata.id, label:cbdata.label, eventName:cbdata.eventName, labelFirst: false});
        $("#viewDropdownPlaceholder").append(cbView.$el);
    })

    // Add them to a drop-down menu (this rips them away from where they currently are)
    new CLMSUI.DropDownMenuViewBB ({
        el: "#viewDropdownPlaceholder",
        model: CLMSUI.clmsModelInst,
        myOptions: {
            title: "View",
            menu: checkBoxData.map (function(cbdata) { return { id: cbdata.id }; })
        }
    });


    if (HSA_Active){
        /*Distance slider */
        var distSliderDiv = d3.select("#sliderDiv");
        var distSlider = new CLMSUI.DistanceSliderBB ({el: "#sliderDiv", model: CLMSUI.rangeModelInst });
        distSlider.brushmove();
        //CLMSUI.rangeModelInst.set ("scale", scale);
        //var stats = d3.select(this.targetDiv).append("div").attr("id","statsDiv");
        //distoViewer.setData(xlv.distances,xlv);
    }
    else {
        // if not #viewDropdownPlaceholder, then list individual ids in comma-separated list: #nglChkBxPlaceholder , #distoChkBxPlaceholder etc
        //d3.select('#viewDropdownPlaceholder').style("display", "none");
    }		
    
    new CLMSUI.DropDownMenuViewBB ({
        el: "#expDropdownPlaceholder",
        model: CLMSUI.clmsModelInst,
        myOptions: {
            title: "Export",
            menu: [
                {name: "Links", func: downloadLinks}, {name:"Matches", func: downloadMatches}, 
                {name: "Residues", func: downloadResidueCount}, {name: "SVG", func: downloadSVG}
            ]
        }
    })

    // This generates the legend div, we don't keep a handle to it - the event object has one
    new CLMSUI.utils.KeyViewBB ({
        el: "#keyPanel",
        displayEventName: "keyShow",
    });
    
    new CLMSUI.CircularViewBB ({
        el: "#circularPanel",
        displayEventName: "circularShow",
        model: CLMSUI.compositeModelInst,
    });
};

CLMSUI.init.viewsThatNeedAsyncData = function () {
	
    d3.select("body").append("div").attr({"id": "tooltip2", "class": "CLMStooltip"});
    var tooltipView = new CLMSUI.TooltipViewBB ({
        el: "#tooltip2",
        model: CLMSUI.tooltipModelInst,
    });

    crosslinkViewer = new CLMS.xiNET.CrosslinkViewer ({
        el: "#networkDiv", 
        model: CLMSUI.compositeModelInst,
        myOptions: {layout: storedLayout}
    });

    var distoViewer = new CLMSUI.DistogramBB ({
        el: "#distoPanel", 
        model: CLMSUI.compositeModelInst,
        displayEventName: "distoShow",
        myOptions: {
            chartTitle: "Cross-Link Distogram",
            seriesName: "Actual"
        }
    });
    
    
    // World of code smells vol.1
    // selectionViewer declared before spectrumWrapper because...
    // 1. Both listen to event A, selectionViewer to build table, spectrumWrapper to do other stuff
    // 2. Event A in spectrumWrapper fires event B
    // 3. selectionViewer listens for event B to highlight row in table - which means it must have built the table
    // 4. Thus selectionViewer must do it's routine for event A before spectrumWrapper, so we initialise it first
    var selectionViewer = new CLMSUI.SelectionTableViewBB ({
        el: "#bottomDiv",
        model: CLMSUI.compositeModelInst,
    });
    // redraw / hide table on selected cross-link change
    selectionViewer.listenTo (CLMSUI.compositeModelInst, "change:selection", function (model, selection) {
        var emptySelection = (selection.length === 0);
        split.collapse (emptySelection);    // this is a bit hacky as it's referencing the split component in another view
        this.setVisible (!emptySelection);    
    });
    split.collapse (true);
    selectionViewer.setVisible (false);
    
    var spectrumWrapper = new SpectrumViewWrapper ({
        el:"#spectrumPanelWrapper",
        model: CLMSUI.compositeModelInst, 
        displayEventName: "spectrumShow",
        myOptions: {wrapperID: "spectrumPanel"}
    });
    
    var spectrumModel = new AnnotatedSpectrumModel();
    var spectrumViewer = new SpectrumView ({
        model: spectrumModel, 
        el:"#spectrumPanel",
    });
    var fragKey = new FragmentationKeyView ({model: spectrumModel, el:"#spectrumPanel"});


    // This makes a matrix viewer
    var matrixViewer = new CLMSUI.DistanceMatrixViewBB ({
        el: "#matrixPanel", 
        model: CLMSUI.compositeModelInst,
        displayEventName: "matrixShow",
    });


    // This stuffs a basic filter view into the matrix view
    var matrixInner = d3.select(matrixViewer.el).select("div.panelInner");
    var matrixFilterEventName = "filterEster";
    /*
    matrixInner.insert("div", ":first-child").attr("class", "buttonColumn").attr("id", "matrixButtons");
    var matrixFilterView = new CLMSUI.utils.RadioButtonFilterViewBB ({
        el: "#matrixButtons",
        myOptions: {
            states: [0, 1, 2],
            labels: ["Any to Any", "NHS to Any", "NHS to NHS"],
            header: "NHS Ester Filter",
            labelGroupFlow: "verticalFlow",
            eventName: matrixFilterEventName
        }
    });
    */

    // the matrix view listens to the event the basic filter view generates and changes a variable on it
    matrixViewer.listenTo (CLMSUI.vent, matrixFilterEventName, function (filterVal) {
        this.filterVal = filterVal;
        this.render();
    });
    CLMSUI.vent.trigger (matrixFilterEventName, 0); // Transmit initial value to both filter and matrix. Makes sure radio buttons and display are synced

    // This is all done outside the matrix view itself as we may not always want a matrix view to have this 
    // functionality. Plus the views don't know about each other now.
    // We could set it up via a parent view which all it does is be a container to these two views if we think that approach is better.



    // Alignment View
    var alignViewer = new CLMSUI.AlignCollectionViewBB ({
        el:"#alignPanel",
        collection: CLMSUI.alignmentCollectionInst,
        displayEventName: "alignShow",
        tooltipModel: CLMSUI.tooltipModelInst
    });

    CLMSUI.alignmentCollectionInst.listenTo (CLMSUI.compositeModelInst, "3dsync", function (sequences) {
        sequences.forEach (function (entry) {
            console.log ("entry", entry);
            this.add ([{
                "id": entry.id,
                "compIDs": this.mergeArrayAttr (entry.id, "compIDs", [entry.name]),
                "compSeqs": this.mergeArrayAttr (entry.id, "compSeqs", [entry.data]),
            }], {merge: true});
        }, this);

        console.log ("3D sequences poked to collection", this);
    });

    if (HSA_Active) { 
        var nglViewer = new CLMSUI.NGLViewBB ({
            el: "#nglPanel", 
            model: CLMSUI.compositeModelInst,
            displayEventName: "nglShow",
        });
    }
    
    // Update spectrum view when extrenal resize event called
    spectrumViewer.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });
    fragKey.listenTo (CLMSUI.vent, "resizeSpectrumSubViews", function () {
        this.resize();
    });
    
    // "individualMatchSelected" in CLMSUI.vent is link event between selection table view and spectrum view
    // used to transport one Match between views
    spectrumViewer.listenTo (CLMSUI.vent, "individualMatchSelected", function (match) {
        if (match) { 
            var randId = CLMSUI.modelUtils.getRandomSearchId (CLMSUI.compositeModelInst.get("clmsModel"), match);
            CLMSUI.loadSpectra (match, randId, this.model);
        } else {
            this.model.clear();
        }
    });
    
        
    new CLMSUI.ProteinInfoViewBB ({
        el: "#proteinInfoPanel",
        displayEventName: "proteinInfoShow",
        model: CLMSUI.compositeModelInst,
    });
    
};


function onDistanceSliderChange3D(scale){
	//showKeyPanel(false);
	var domain = scale.domain();
	var lowerLimit = domain[1];
	var upperLimit = domain[2];
	var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
	var rc = rLinks.length;

	var within = [];

	for (var j = 0; j < rc; j++) {
		var resLink = rLinks[j];

		var d = null;
		if (distances[resLink.toResidue]) {
			d = distances[resLink.toResidue][resLink.fromResidue];
		}
		var d = parseFloat(d);
		if (isNaN(d) === true){
			d = -1;
		}

		if (d > 0 && d < lowerLimit) {
			within.push(resLink);
		}

	}

	for (var w = 0; w < within.length; w++){

	}
}

function saveLayout () {
	var layout = crosslinkViewer.getLayout();
	var xmlhttp = new XMLHttpRequest();
	var url = "./php/saveLayout.php";
	console.log(CLMSUI.sid);
	var params =  "sid=" + CLMSUI.sid + "&layout="+encodeURIComponent(layout.replace(/[\t\r\n']+/g,""));
	xmlhttp.open("POST", url, true);
	//Send the proper header information along with the request
	xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
		if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			console.log(xmlhttp.responseText, true);
		}
	}
	xmlhttp.send(params);
}

function changeAnnotations(){
	var annotationSelect = document.getElementById('annotationsSelect');
	crosslinkViewer.setAnnotations(annotationSelect.options[annotationSelect.selectedIndex].value);
};

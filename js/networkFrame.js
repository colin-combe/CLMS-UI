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

"use strict";

var CLMSUI = CLMSUI || {};

/*
 * Horizontal splitter JS
 */
var marginBottom = 95;
var minBottomDivHeight = 120;
var splitterDivHeight = 20;
var splitterDragging = false;
var splitterDiv = document.getElementById("splitterDiv");
var topDiv = document.getElementById("topDiv");
var bottomDiv = document.getElementById("bottomDiv");
var main = document;//.getElementById("main");
splitterDiv.onmousedown = function(evt) {
	CLMSUI.splitterDragging = true;
};
main.onmousemove = function(evt) {
	if (CLMSUI.splitterDragging === true || !evt){
		var element = topDiv;
		var top = 0;
		do {
			top += element.offsetTop  || 0;
			element = element.offsetParent;
		} while(element);
		var topDivHeight;
		if (evt) topDivHeight = evt.pageY - top - (splitterDivHeight / 2);
		else topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
		if (topDivHeight < 0) topDivHeight = 0;
		var bottomDivHeight = window.innerHeight - top - topDivHeight - splitterDivHeight - marginBottom;
		if (bottomDivHeight < minBottomDivHeight){
			bottomDivHeight = minBottomDivHeight;
			topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
		}
		topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
		bottomDiv.setAttribute("style", "height:"+bottomDivHeight+"px;");
	};
}
main.onmouseup = function(evt) {
	splitterDragging = false;
}

window.onresize = function(event) {
	//if (document.getElementById('selectionChkBx').checked == true) {
    //if (selectionShown == true) {
    if (selectionPanel.isShown() == true) {
		main.onmousemove();//event);}
	} else {
		var element = topDiv;
		var top = 0;
		do {
			top += element.offsetTop  || 0;
			element = element.offsetParent;
		} while(element);
		var topDivHeight = window.innerHeight - top - marginBottom;
		topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
	}
};

/*
 *
 *  Hide / show floaty panels (including Selection)
 *
 */
//~ var selChkBx = document.getElementById('selectionChkBx');
//~ selChkBx.checked = false;
var selectionShown = false;
var selectionPanel = new SelectionPanel("selectionDiv");

/*
if (selectionPanel.isShown() == false) {
    selectionPanel.show (true);
}
*/

var showSpectrumPanel = function (show) {
	d3.select('#spectrumPanel').style('display', show ? 'block' : 'none');
}



// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views

CLMSUI.init = CLMSUI.init || {};

CLMSUI.init.views = function () {
    var filterViewGroup = new CLMSUI.FilterViewBB ({
        el: "#filterPlaceholder", 
        model: CLMSUI.filterModelInst
    });

    var miniDistModelInst = new CLMSUI.BackboneModelTypes.MinigramModel ();
    miniDistModelInst.data = function() {
        var matches = CLMSUI.modelUtils.flattenMatches (CLMSUI.clmsModelInst.get("matches"));
        return matches; // matches is now an array of arrays    //  [matches, []];
    };

    console.log("*>" + CLMSUI.clmsModelInst.get("matches").length);

    var miniDistView = new CLMSUI.MinigramViewBB ({
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
    CLMSUI.filterModelInst.listenTo (miniDistModelInst, "change", function (model) {
        this.set ("cutoff", [model.get("domainStart"), model.get("domainEnd")]); 
    }, this);


    // If the ClmsModel matches attribute changes then tell the mini histogram view
    miniDistView
        .listenTo (CLMSUI.clmsModelInst, "change:matches", this.render) // if the matches changes (likely?) need to re-render the view too
        // below should be bound eventually if filter changes, but c3 currently can't change brush pos without internal poking about
        //.listenTo (this.model.get("filterModel"), "change", this.render)  
    ;       

    // Generate checkboxes
    var checkBoxData = [
        {id: "nglChkBxPlaceholder", label: "3D", eventName:"nglShow"},
        {id: "distoChkBxPlaceholder", label: "Distogram", eventName:"distoShow"},
        {id: "matrixChkBxPlaceholder", label: "Matrix", eventName:"matrixShow"},
        {id: "alignChkBxPlaceholder", label: "Alignment", eventName:"alignShow"},
        {id: "keyChkBxPlaceholder", label: "Legend", eventName:"keyShow"},
    ];
    checkBoxData.forEach (function (cbdata) {
        CLMSUI.utils.addCheckboxBackboneView (d3.select("#"+cbdata.id), {label:cbdata.label, eventName:cbdata.eventName, labelFirst: false});
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
        var distSliderDiv = d3.select("#topDiv").append("div").attr("id","sliderDiv");
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
    d3.select('#linkColourSelect').style('display','none');


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
};

CLMSUI.init.viewsThatNeedAsyncData = function () {
    d3.select("body").append("div").attr({"id": "tooltip2", "class": "CLMStooltip"});
    var tooltipView = new window.CLMSUI.TooltipViewBB ({
        el: "#tooltip2",
        model: CLMSUI.tooltipModelInst,
    });

    var crosslinkViewer = new window.CLMS.xiNET.CrosslinkViewer ({
        el: "#topDiv", 
        model: CLMSUI.compositeModelInst,
    });

    var distoViewer = new window.CLMSUI.DistogramBB ({
        el: "#distoPanel", 
        model: CLMSUI.compositeModelInst,
        displayEventName: "distoShow",
        myOptions: {
            chartTitle: "Cross-Link Distogram",
            seriesName: "Actual"
        }
    });


    // This makes a matrix viewer
    var matrixViewer = new window.CLMSUI.DistanceMatrixViewBB ({
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
    var alignViewer = new window.CLMSUI.AlignCollectionViewBB ({
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
        var nglViewer = new window.CLMSUI.NGLViewBB ({
            el: "#nglPanel", 
            model: CLMSUI.compositeModelInst,
            displayEventName: "nglShow",
        });
    }
    
    var selectionViewer = new window.CLMSUI.SelectionTableViewBB ({
        el: "#bottomDiv",
        model: window.CLMSUI.compositeModelInst,
        displayEventName: "ignoreThisFlag",
    });
    selectionViewer.listenTo (window.CLMSUI.compositeModelInst, "change:selection", function (model, selection) {
        console.log ("args", arguments);
        this.setVisible (selection.length > 0);    
    });


    //init spectrum viewer
    var spectrumDiv = document.getElementById('spectrumDiv');
    var spectrumViewer = new SpectrumViewer(spectrumDiv);
};



function loadSpectra(id, pepSeq1, linkPos1, pepSeq2, linkPos2){
	spectrumViewer.clear();
	showSpectrumPanel(true);
	var xmlhttp = new XMLHttpRequest();
	var url = "./php/spectra.php";
	var params =  "id=" + id;
	xmlhttp.open("POST", url, true);
	//Send the proper header information along with the request
	xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xmlhttp.onreadystatechange = function() {//Call a function when the state changes.
		if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			spectrumViewer.clear();// tidy up, could be AJAX synchronisation issues
			spectrumViewer.setData(pepSeq1, linkPos1, pepSeq2, linkPos2, xmlhttp.responseText);
		}
	}
	xmlhttp.send(params);
};

function onDistanceSliderChange(scale){
	//~ var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
	//~ var rc = rLinks.length;
	//~ for (var j = 0; j < rc; j++) {
		//~ var resLink = rLinks[j];
		//~ var d = null;
		//~ if (xlv.distances[resLink.toResidue]) {
			//~ d = xlv.distances[resLink.toResidue][resLink.fromResidue];
		//~ }
		//~ var d = parseFloat(d);
		//~ if (isNaN(d) === true){
			//~ d = -1;
		//~ }
		//~ resLink.colour = scale(d);
		//~ resLink.line.setAttribute("stroke", resLink.colour);
	//~ }
}

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
	var layout = xlv.getLayout();
	var xmlhttp = new XMLHttpRequest();
	var url = "./php/saveLayout.php";
	var params =  "sid=" + xlv.sid + "&layout="+encodeURIComponent(layout.replace(/[\t\r\n']+/g,""));
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
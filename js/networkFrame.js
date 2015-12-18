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

CLMSUI.rangeModelInst = new CLMSUI.modelUtils.RangeModel ({ scale: d3.scale.linear() });
CLMSUI.tooltipModelInst = new CLMSUI.TooltipModelBB ();

var compositeModel = new Backbone.Model ({
    distancesModel: CLMSUI.distancesInst,
    clmsModel: CLMSUI.clmsModelInst,
    rangeModel: CLMSUI.rangeModelInst,
    filterModel: CLMSUI.filterModelInst,
    tooltipModel: CLMSUI.tooltipModelInst,
    applyFilter: function () {
		
		var filterModel = this.get("filterModel");
		var crossLinks = this.get("clmsModel").get("crossLinks").values();
		for (var crossLink of crossLinks) {
			crossLink.filteredMatches = [];
			var unfilteredMatchCount = crossLink.matches.length;
			for (var i = 0; i < unfilteredMatchCount; i++){
				var match = crossLink.matches[i];
				var result = filterModel.filter(match);
				//console.log("result:"+result);
				if (result === true){
					crossLink.filteredMatches.push(match);
				}
			}
		}
		
	}   
});

compositeModel.listenTo(CLMSUI.filterModelInst, "change", compositeModel.get("applyFilter"));

// http://stackoverflow.com/questions/11609825/backbone-js-how-to-communicate-between-views

d3.select("body").append("div").attr("id", "tooltip2").attr("class", "CLMStooltip");
var tooltipView = new window.CLMSUI.TooltipViewBB ({
    el: "#tooltip2",
    model: CLMSUI.tooltipModelInst
});

var crosslinkViewer = new window.CLMS.xiNET.CrosslinkViewer ({
    el: "#topDiv", 
    model: compositeModel,
});

var distoViewer = new window.CLMSUI.DistogramBB ({
    el: "#distoPanel", 
    model: compositeModel,
    displayEventName: "distoShow",
    myOptions: {
        chartTitle: "Cross-Link Distogram",
        seriesName: "Actual"
    }
});


// This makes a matrix viewer
var matrixViewer = new window.CLMSUI.DistanceMatrixViewBB ({
    el: "#matrixPanel", 
    model: compositeModel,
    displayEventName: "matrixShow"
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



//var alignViewer = new window.CLMSUI.AlignViewBB ({
var alignViewer = new window.CLMSUI.AlignViewBB2 ({
    el:"#alignPanel",
    model: CLMSUI.alignmentModel,
    displayEventName: "alignShow"
});




// Resizing of panels
/*
ByRei_dynDiv.api.alter = function() {
	var mode = ByRei_dynDiv.cache.modus;
	console.log('Div is alter...',  'ID', ByRei_dynDiv.api.elem, 'elem',  ByRei_dynDiv.api, 'Mode', mode);
    
	if (mode != "moveparent") {
		if (ByRei_dynDiv.api.elem == 3){
			spectrumViewer.resize();
		}
		else if (ByRei_dynDiv.api.elem == 2){
			//stage.handleResize();
		}
	}
};
*/


var nglViewer = new window.CLMSUI.NGLViewBB ({
    el: "#nglPanel", 
    model: compositeModel,
    displayEventName: "nglShow"
});


//init spectrum viewer
var spectrumDiv = document.getElementById('spectrumDiv');
var spectrumViewer = new SpectrumViewer(spectrumDiv);

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
	xlv.setAnnotations(annotationSelect.options[annotationSelect.selectedIndex].value);
};

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
	splitterDragging = true;
};
main.onmousemove = function(evt) {
	if (splitterDragging === true || !evt){
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


var kChkBx = document.getElementById('keyChkBx');
kChkBx.checked = false;
var hChkBx = document.getElementById('helpChkBx');
hChkBx.checked = false;
var showKeyPanel = function (show) {
	var kp = d3.select('#keyPanel');
	if (show) {
		kp.style('display', 'block');
	} else {
		kp.style('display', 'none');
	}
	kChkBx.checked = show;
}
var showHelpPanel = function (show) {
	var hp = d3.select('#helpPanel');
	if (show) {
		hp.style('display', 'block');
	} else {
		hp.style('display', 'none');
	}
	hChkBx.checked = show;
}
var showSpectrumPanel = function (show) {
	var sp = d3.select('#spectrumPanel');
	if (show) {
		sp.style('display', 'block');
	} else {
		sp.style('display', 'none');
	}
}
function showNglPanel(show) {
	var np = d3.select('#nglPanel');
	if (show) {
		np.style('display', 'block');
	} else {
		np.style('display', 'none');
	}
	document.getElementById('nglChkBx').checked = show;
	if (!stage){
		initNGL();
		//~ var residueLinks = xlv.proteinLinks.values()[0].residueLinks.values();
		//~ var stage;
		//~ var xlRepr;
//~ 
		//~ NGL.init( function(){
				//~ stage = new NGL.Stage( "nglDiv" );
				//~ stage.loadFile( "rcsb://1AO6", { sele: ":A" } ).then(
				//~ function( comp ){
					//~ xlRepr = new CrosslinkRepresentation( stage, comp, residueLinks
				//~ );
			//~ } );
		//~ } );
	}
}

//init distogram viewer
var distoDiv = document.getElementById('distoDiv');

//var distoViewer = new Distogram(distoDiv);

// DO TOMORROW
var CLMSUI = CLMSUI || {};
CLMSUI.rangeModel = Backbone.Model.extend ({
    initialize: function () {
        this
            .set ("active", false)
        ;
    }
});
CLMSUI.rangeModelInst = new CLMSUI.rangeModel ({ scale: d3.scale.linear() });

var distoViewer = new CLMSUI.DistogramBB ({el: "#distoDiv", model: CLMSUI.rangeModelInst});


var showDistoPanel = function (show) {
	var sp = d3.select('#distoPanel');
	sp.style('display', show ? 'block' : 'none');

    distoChkBx.checked = show;
    if (show) {
        distoViewer.relayout(); 
        CLMSUI.filterFunc();
    }
}


// Resizing of panels
ByRei_dynDiv.api.alter = function() {
	var
	mode = ByRei_dynDiv.cache.modus;

	console.log('Div is alter...'
	+ '<br>ID: ' + ByRei_dynDiv.api.elem
	+ '<br>Mode: ' + mode
	+ '');
	if (mode != "moveparent") {
		if (ByRei_dynDiv.api.elem == 3){
			spectrumViewer.resize();
		}
		else if (ByRei_dynDiv.api.elem == 2){
			//stage.handleResize();
		}
	}
};

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
	showKeyPanel(false);
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


/*Score slider*/
function initSlider(){
	if (xlv.scores === null){
		d3.select('#scoreSlider').style('display', 'none');
	}
	else {
		document.getElementById('scoreLabel1').innerHTML = "Score:&nbsp;&nbsp;" + getMinScore();
		document.getElementById('scoreLabel2').innerHTML = getMaxScore();
		sliderChanged();
		d3.select('#scoreSlider').style('display', 'inline-block');
	}
};

var sliderDecimalPlaces = 1;
function getMinScore(){
	if (xlv.scores){
		var powerOfTen = Math.pow(10, sliderDecimalPlaces);
		return (Math.floor(xlv.scores.min * powerOfTen) / powerOfTen)
				.toFixed(sliderDecimalPlaces);
	}
}
function getMaxScore(){
	if (xlv.scores){
		var powerOfTen = Math.pow(10, sliderDecimalPlaces);
		return (Math.ceil(xlv.scores.max * powerOfTen) / powerOfTen)
				.toFixed(sliderDecimalPlaces);
	}
}
function sliderChanged(){
	var slide = document.getElementById('slide');
	var powerOfTen = Math.pow(10, sliderDecimalPlaces);

	var cut = ((slide.value / 100)
				* (getMaxScore() - getMinScore()))
				+ (getMinScore() / 1);
	cut = cut.toFixed(sliderDecimalPlaces);
	var cutoffLabel = document.getElementById("cutoffLabel");
	cutoffLabel.innerHTML = '(' + cut + ')';
	xlv.setCutOff(cut);
    CLMSUI.filterFunc();    // this is calling xlv redraw as well
}

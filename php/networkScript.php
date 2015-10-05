<?php
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
?>
<script>
	//<![CDATA[
		
	 "use strict";
	 
	/*
	 *views dropdown
	 */ 
	// $(".checkbox-dropdown").click(function () {
		// $(this).toggleClass("is-active");
	// });
	// $(".checkbox-dropdown ul").click(function(e) {
		// e.stopPropagation();
	// }); 
	//~ var dropdownDiv = document.getElementsByClassName("checkbox-dropdown")[0];
	//~ dropdownDiv.onclick = function (){
		//~ dropdownDiv.setAttribute("class", "is-active");
	//~ };
	
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
	main.onmousemove();
	window.onresize = function(event) {
		if (selChkBx.checked == true) {
			main.onmousemove();//event);}
		} else {
			var topDivHeight = window.innerHeight - top - marginBottom;
			topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
		}
	};
	
	/*
	 *
	 *  Hide / show floaty panels (including Selection)
	 *
	 */		
	var selChkBx = document.getElementById('selectionChkBx');
	selChkBx.checked = true;
	var showSelectionPanel = function (show) {
		var bd = d3.select('#bottomDiv');
		var splt = d3.select('#splitterDiv');
		if (show) {
			bd.style('display', 'block');
			splt.style('display', 'block');
			main.onmousemove();
		} else {
			bd.style('display', 'none');
			splt.style('display', 'none');
			var element = topDiv;
			var top = 0;
			do {
				top += element.offsetTop  || 0;
				element = element.offsetParent;
			} while(element);
			var topDivHeight = window.innerHeight - top - marginBottom;
			topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
		}
		selChkBx.checked = show;
	}
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
		}
	}
	// Resizing of panels
	ByRei_dynDiv.api.alter = function() {
		var
		mode = ByRei_dynDiv.cache.modus;

		//~ console.log('Div is alter...'
		//~ + '<br>ID: ' + ByRei_dynDiv.api.elem
		//~ + '<br>Mode: ' + mode
		//~ + '');
		
		if (ByRei_dynDiv.api.elem == 3){
			spectrumViewer.resize();
		}
		else if (ByRei_dynDiv.api.elem == 2){
			stage.viewer.onWindowResize();
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


	// for NGL
	var stage;

	/*
	* xiNET init JS
	*/

	var xlv;
	//~ https://thechamplord.wordpress.com/2014/07/04/using-javascript-window-onload-event-properly/
	window.addEventListener("load", function() {

		var targetDiv = document.getElementById('topDiv');
		xlv = new xiNET.Controller(targetDiv);
		
		<?php
		include './php/loadData.php';
		include '../annotations.php';
		?>
		
		var s = d3.map(searchesShown);
		var title = s.keys().toString() + " : " + s.values().toString();//JSON.stringify(searchesShown);
		document.title = title;
		
		if (s.keys().length > 1) {
			showKeyPanel(true);
		}
		
		if (HSA_Active){
				
			/*Distance slider */
			var distSliderDiv = d3.select(targetDiv).append("div").attr("id","sliderDiv");
			var distSlider = new DistanceSlider("sliderDiv", this);
			var stats = d3.select(this.targetDiv).append("div").attr("id","statsDiv");
			distSlider.brushMoved.add(onDistanceSliderChange); //add listener
			distSlider.brushMoved.add(onDistanceSliderChange3D); //add listener
			var scale = d3.scale.threshold()
				.domain([0, 15, 25])
				.range(['black', '#5AAE61','#FDB863','#9970AB']);
			onDistanceSliderChange(scale);
							
		}
		else {
			document.getElementById('nglCbLabel').setAttribute('style','display:none;');
		}		
		document.getElementById('linkColourSelect').setAttribute('style','display:none;');
			
		function onDistanceSliderChange(scale){
			var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
			var rc = rLinks.length;
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
				resLink.colour = scale(d);
				resLink.line.setAttribute("stroke", resLink.colour);
			}				
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
						
		//register callbacks
		xlv.linkSelectionCallbacks.push(function (selectedLinks){
			//console.log("SELECTED:", selectedLinks);
			var selectionDiv = document.getElementById("selectionDiv");
			var selectedLinkArray = selectedLinks.values();
			var selectedLinkCount = selectedLinkArray.length;
			if (selectedLinkCount === 0) {
				selectionDiv.innerHTML = "<p>No selection.</p>";
			}
			else {
				var out = ""

				var scoresTable = "<table><tr>";
				//~ scoresTable += "<th>Id</th>";
				scoresTable += "<th>Protein1</th>";
				scoresTable += "<th>PepPos1</th>";
				scoresTable += "<th>PepSeq1</th>";
				scoresTable += "<th>LinkPos1</th>";
				scoresTable += "<th>Protein2</th>";
				scoresTable += "<th>PepPos2</th>";
				scoresTable += "<th>PepSeq2</th>";
				scoresTable += "<th>LinkPos2</th>";
				scoresTable += "<th>Score</th>";
				if (xlv.autoValidatedFound === true){
					scoresTable += "<th>Auto</th>";
				}
				if (xlv.manualValidatedFound === true){
					scoresTable += "<th>Manual</th>";
				}
					scoresTable += "<th>Group</th>";
				scoresTable += "<th>Run name</th>";
				scoresTable += "<th>Scan number</th>";
				scoresTable += "</tr>";

				out +=  scoresTable;

				for (var i = 0; i < selectedLinkCount; i++) {
					var aLink = selectedLinkArray[i];
					if (aLink.residueLinks) {//its a ProteinLink
						out += proteinLinkToHTML(aLink);
					}else {//must be ResidueLink
						out += residueLinkToHTML(aLink);						
					}							
				}

				out += "</table>";

				selectionDiv.innerHTML = out;
			}
		});

		xlv.legendCallbacks.push(function (linkColours, domainColours) {
			var coloursKeyDiv = document.getElementById('key');
			if ((linkColours && linkColours.domain().length > 0) || (domainColours && domainColours.domain().length > 0)){
				var table = "<table>";
				var domain, range;
				if (linkColours){
					domain = linkColours.domain();
					range = linkColours.range();
					for (var i = 0; i < domain.length; i ++){
						var temp = new RGBColor(range[i%20]);
						table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:3px;background:"
								+ temp.toRGB() + ";'></div></td><td>"
								+ searchesShown[domain[i]] +"</td></tr>";
					}	
					table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:3px;background:"
								+ "#000;" + ";'></div></td><td>"
								+ "Not unique" +"</td></tr>";
					
				}
				if (domainColours) {
					domain = domainColours.domain();
					range = domainColours.range();
					//table += "<tr style='height:10px;'></tr>";
					for (var i = 0; i < domain.length; i ++){
						//make opauq version of transparnet colour on white
						//~ http://stackoverflow.com/questions/2049230/convert-rgba-color-to-rgb
						var temp = new RGBColor(range[i%20]);
						//~ Target.R = ((1 - Source.A) * BGColor.R) + (Source.A * Source.R)
						//~ Target.G = ((1 - Source.A) * BGColor.G) + (Source.A * Source.G)
						//~ Target.B = ((1 - Source.A) * BGColor.B) + (Source.A * Source.B)
						var opaque = {};
						opaque.r = ((1 - 0.6) * 1) + (0.6 * (temp.r / 255));
						opaque.g = ((1 - 0.6) * 1) + (0.6 * (temp.g / 255));
						opaque.b = ((1 - 0.6) * 1) + (0.6 * (temp.b / 255));
						var col = "rgb(" +Math.floor(opaque.r * 255 ) +","
							+ Math.floor(opaque.g * 255) +","+Math.floor(opaque.b * 255)+ ")";
						table += "<tr><td style='padding:5px;width:70px;'><div style='width:60px;height:30px;background:"
								+ col + ";border:1px solid "
								+ range[i%20] + ";'></div></td><td>"
								+ domain[i] +"</td></tr>";
					}
				}
				table = table += "</table>";
				coloursKeyDiv.innerHTML = table;
			}
			else {
				coloursKeyDiv.innerHTML = '<img id="defaultLinkKey" src="./images/fig3_1.svg"><br><img id="logo" src="./images/logos/rappsilber-lab-small.png">';
			}
		});

		xlv.initProteins();
		xlv.initLayout();
		//~ xlv.checkLinks();
		
		/* Init filter bar */
		initSlider();
		changeAnnotations();
		xlv.selfLinksShown = document.getElementById('selfLinks').checked;
		xlv.ambigShown = document.getElementById('ambig').checked;
		xlv.filter = function (match) {
			var vChar = match.validated;
			if (vChar == 'A' && document.getElementById('A').checked && (!match.score || match.score >= xlv.cutOff)) return true;
			else if (vChar == 'B' && document.getElementById('B').checked  && (!match.score || match.score >= xlv.cutOff)) return true;
			else if (vChar == 'C' && document.getElementById('C').checked && (!match.score || match.score >= xlv.cutOff)) return true;
			else if (vChar == '?' && document.getElementById('Q').checked && (!match.score || match.score >= xlv.cutOff)) return true;
			else if (match.autovalidated && document.getElementById('AUTO').checked && (!match.score || match.score >= xlv.cutOff))  return true;
			else return false;
		};




	});





	function saveLayout () {
		var layout = xlv.getLayout();
		var xmlhttp = new XMLHttpRequest();
		var url = "./php/saveLayout.php";
		//~ console.log('^'+xlv.sid+'^');
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

	function changeLinkColours(){
		var linkColourSelect = document.getElementById('linkColourSelect');
		var selectedOption = linkColourSelect.options[linkColourSelect.selectedIndex].value;
		var rLinks = xlv.proteinLinks.values()[0].residueLinks.values();
		var rc = rLinks.length;
		alert(selectedOption);
		//~ if (selectedOption === "Search") {
			//~ for (var j = 0; j < rc; j++) {
				//~ rLinks[j].colour = null;
			//~ }				
			//~ xlv.checkLinks();
		//~ } else {				
			for (var j = 0; j < rc; j++) {
				var resLink = rLinks[j];
				var d;
				//~ if (selectedOption === "Search"){
					//~ d = distances[resLink.fromResidue][resLink.toResidue];
				//~ } else {
					d = distances[resLink.toResidue][resLink.fromResidue];
				//~ }
				if (isNan(d)){
					d = 999;
				}
				if (d <= 10) {
					resLink.colour = '#1B7837';
				}
				else if (d <= 15) {
					resLink.colour = '#5AAE61';
				}
				else if (d <= 25) {
					resLink.colour = '#FDB863';
				}
				else if (d <= 30) {
					resLink.colour = '#9970AB';
				}
				else {
					resLink.colour = '#762A83';
				}
				resLink.line.setAttribute("stroke", resLink.colour);
			}
		//~ }
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
	}

	function exportSVG(){
		var svg = xlv.getSVG();
		var b64svg = window.btoa(svg);
		
		//window.open("./php/download.php?content=" + b64svg);
		
		/*var http = new XMLHttpRequest();
		
		var url = "./php/download.php";
		var params = "content=" + b64svg;
		http.open("POST", url, true);

		//Send the proper header information along with the request
		http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		http.setRequestHeader("Content-length", params.length);
		http.setRequestHeader("Connection", "close");

		http.onreadystatechange = function() {//Call a function when the state changes.
			if(http.readyState == 4 && http.status == 200) {
				console.log(http.responseText);
			}
		}
		http.send(params);*/
		
		var path = "./php/download.php";
		var method = method || "post"; // Set method to post by default if not specified.

		// The rest of this code assumes you are not using a library.
		// It can be made less wordy if you use one.
		var form = document.createElement("form");
		form.setAttribute("method", method);
		form.setAttribute("action", path);

		//~ for(var key in params) {
			//~ if(params.hasOwnProperty(key)) {
				var hiddenField = document.createElement("input");
				hiddenField.setAttribute("type", "hidden");
				hiddenField.setAttribute("name", "content");
				hiddenField.setAttribute("value", b64svg);

				form.appendChild(hiddenField);
			 //~ }
		//~ }

		document.body.appendChild(form);
		form.submit();
	}

	function residueCount() {
		var csv = '"Residue(s)","Occurences(in_unique_links)"\r\n';
		//~ var matches = xlv.matches;//.values();
		//~ var matchCount = matches.length;
		var residueCounts = d3.map(); 
		var residuePairCounts = d3.map(); 

		var pLinks = xlv.proteinLinks.values();
		var pLinkCount = pLinks.length;
		for (var pl = 0; pl < pLinkCount; pl++){
			var resLinks = pLinks[pl].residueLinks.values();
			var resLinkCount = resLinks.length;
			for (var rl =0; rl < resLinkCount; rl ++) {
				var residueLink = resLinks[rl];
				var filteredMatches = residueLink.getFilteredMatches();
				if (filteredMatches.length > 0){
					
					var linkedRes1 = residueLink.proteinLink.fromProtein.sequence[residueLink.fromResidue - 1];
					var linkedRes2 = residueLink.proteinLink.toProtein.sequence[residueLink.toResidue - 1];
					incrementCount(linkedRes1);
					incrementCount(linkedRes2);
					
					var pairId;
					if (linkedRes1 > linkedRes2) {
						pairId = linkedRes2 + "-" + linkedRes1;
					} else {
						pairId = linkedRes1 + "-" + linkedRes2;
					}

					var c = parseInt(residuePairCounts.get(pairId));
					if (isNaN(c)){
						residuePairCounts.set(pairId, 1);
					}else {
						c++;
						residuePairCounts.set(pairId, c);
					}						
				}
			}		  		
		}

		residuePairCounts.forEach(function (k,v){
			csv += '"' + k + '","' 
						+ v + '"\r\n';	
		});
		residueCounts.forEach(function (k,v){
			csv += '"' + k + '","' 
						+ v + '"\r\n';	
		});

		function incrementCount(res){
			var c = parseInt(residueCounts.get(res));
			if (isNaN(c)){
				residueCounts.set(res, 1);
			}else {
				c++;
				residueCounts.set(res, c);
			}				
		}
			
		if (Blob) {
			var blob = new Blob([csv], {type: "data:text/csv;charset=utf-8" });
			saveAs(blob, "xiNET-export.csv");
		} else {	
			var wnd = window.open("data:text/csv;charset=utf-8;base64," + window.btoa(csv), 'residueCount.csv');
		}
	}

	//used when link clicked
	function proteinLinkToHTML(proteinLink) {
		var linkInfo = "";
		var resLinks = proteinLink.residueLinks.values();
		var resLinkCount = resLinks.length;
		for (var i = 0; i < resLinkCount; i++) {
			var resLink = resLinks[i];
			linkInfo += residueLinkToHTML(resLink);
		}
		return linkInfo;
	};

	function residueLinkToHTML(residueLink){
		var matches = residueLink.getFilteredMatches();
		var c = matches.length;
		var rows = "";
		for (var j = 0; j < c; j++) {
			var match = matches[j][0];

			var htmlTableRow = "<tr>";
			if (typeof loadSpectra == "function"){
				htmlTableRow = "<tr onclick=\"loadSpectra('"+match.id+"','"+match.pepSeq1+"',"
					+match.linkPos1+",'"+match.pepSeq2+"',"+match.linkPos2+");\">";
			}

			//~ htmlTableRow += "<td><p>" + match.id
				//~ + "</p></td>";
			htmlTableRow += "<td><p>" + match.protein1
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.pepPos1
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.pepSeq1raw
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.linkPos1
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.protein2
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.pepPos2
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.pepSeq2raw
				+ "</p></td>";
			htmlTableRow += "<td><p>" + match.linkPos2
				+ "</p></td>";

			htmlTableRow += "<td><p>" +
			((typeof match.score !== 'undefined')? match.score.toFixed(4) : 'undefined')
			+ "</p></td>";

			if (match.controller.autoValidatedFound === true){
				htmlTableRow += "<td><p>" + match.autovalidated
					+ "</p></td>";
			}

			if (match.controller.manualValidatedFound === true){
				htmlTableRow += "<td><p>" + match.validated
					+ "</p></td>";
			}
			htmlTableRow += "<td><p>" + match.group
					+ "</p></td>";
			htmlTableRow += "<td><p>" + match.runName
					+ "</p></td>";
			htmlTableRow += "<td><p>" + match.scanNumber
					+ "</p></td>";
			htmlTableRow += "</tr>";
			rows += htmlTableRow;
		}
		return rows;
	}

	//]]>								
</script>
<?php include "./php/nglFunctions.php"; ?>

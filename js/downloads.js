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
 
function downloadMatches(){
	var csv = getMatchesCSV();
	download(csv, 'text/csv', 'matches.csv');//+s.keys().toString());
}
function downloadLinks(){
	var csv = getLinksCSV();
	download(csv, 'text/csv', 'links.csv');//+s.keys().toString());
}
function downloadResidueCount(){
	var csv = getResidueCount();
	download(csv, 'text/csv', 'residueCount.csv');//+s.keys().toString());
}
function downloadSVG(){
	var svg = crosslinkViewer.getSVG();
	download(svg, 'application/svg', 'xiNET-output.svg');//+s.keys().toString());
}
function downloadSpectrumSVG(){
	var svg = spectrumViewer.getSVG();
	download(svg, 'application/svg', 'spectrum.svg');//+s.keys().toString());
}
					
function download(content, contentType, fileName) {
	var b64svg = window.btoa(content);
	var path = "./php/download.php";
	var method = method || "post"; // Set method to post by default if not specified.

	var form = document.createElement("form");
	form.setAttribute("method", method);
	form.setAttribute("action", path);

	var hiddenContentField = document.createElement("input");
	hiddenContentField.setAttribute("type", "hidden");
	hiddenContentField.setAttribute("name", "content");
	hiddenContentField.setAttribute("value", b64svg);
	form.appendChild(hiddenContentField);

	var hiddenContentTypeField = document.createElement("input");
	hiddenContentTypeField.setAttribute("type", "hidden");
	hiddenContentTypeField.setAttribute("name", "contentType");
	hiddenContentTypeField.setAttribute("value", contentType);
	form.appendChild(hiddenContentTypeField);

	var hiddenFilenameField = document.createElement("input");
	hiddenFilenameField.setAttribute("type", "hidden");
	hiddenFilenameField.setAttribute("name", "fileName");
	hiddenFilenameField.setAttribute("value", fileName);
	form.appendChild(hiddenFilenameField);

	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
}

function getMatchesCSV () {
	var csv = '"Id","Protein1","PepPos1","PepSeq1","LinkPos1","Protein2","PepPos2","PepSeq2","LinkPos2","Score","Group"\r\n';
	var matches = CLMSUI.compositeModelInst.get("clmsModel").get("matches");
	var matchCount = matches.length;
	var filterModel = CLMSUI.compositeModelInst.get("filterModel");
	for (var i = 0; i < matchCount; i++){
		var match = matches[i];
		var result = filterModel.filter(match);
		if (result === true){
			csv += '"' + match.id + '","' + match.protein1 + '","' +match.pepPos1 + '","' 
				+ match.pepSeq1 + '","' + match.linkPos1 + '","' 
				+ match.protein2 + '","' + match.pepPos2 + '","'
				+ match.pepSeq2 + '","' + match.linkPos2 + '","'
				+ match.score + '","' + match.group + '"\r\n';
		}
	}
	return csv;
}

function getLinksCSV(){
	var csv = '"Protein1","LinkPos1","LinkedRes1","Protein2","LinkPos2","LinkedRes2","HighestScore"';
	
	var searchIds = [];
	var i = 0;
	for (var name in CLMSUI.searchesShown) {
		csv += ',"Search_'+ name +'"';
		searchIds[i] = name;
		i++;
	}
	
	csv += '\r\n';

	var crossLinks = CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks").values();
	for (residueLink of crossLinks){
		var filteredMatches = residueLink.getFilteredMatches();
		if (filteredMatches.length > 0){
			csv += '"' + residueLink.fromProtein.readableId() + '","' 
				+ residueLink.fromResidue + '","' + residueLink.fromProtein.sequence[residueLink.fromResidue - 1] + '","'
				+ residueLink.toProtein.readableId() + '","'
				+ residueLink.toResidue + '","';
			if (residueLink.toProtein && residueLink.toResidue) {
				csv += residueLink.toProtein.sequence[residueLink.toResidue - 1];
			}
			
			var highestScore = null;
			var searchesFound = new Array (searchIds.length);
			var filteredMatchCount = filteredMatches.length;
			for (var m = 0; m < filteredMatchCount; m++) {
				var match = filteredMatches[m][0];//sort this mess
				if (highestScore == null || match.score > highestScore) {
					highestScore = match.score.toFixed(4);
				}
				var si = searchIds.indexOf(match.group + "");
				searchesFound[si] = "X";
			}
			csv += '","' + highestScore;
			console.log(searchesFound);
			for (var s = 0; s < searchIds.length; s++){					
				csv +=  '","';
				if (searchesFound[s] === "X") csv += "X";				
			}
			csv += '"\r\n';
		}
	}		  		
	return csv;
}

function getResidueCount() {
	var csv = '"Residue(s)","Occurences(in_unique_links)"\r\n';
	//~ var matches = xlv.matches;//.values();
	//~ var matchCount = matches.length;
	var residueCounts = d3.map();
	var residuePairCounts = d3.map();

	//~ var pLinks = xlv.proteinLinks.values();
	//~ var pLinkCount = pLinks.length;
	//~ for (var pl = 0; pl < pLinkCount; pl++){
		//~ var resLinks = pLinks[pl].residueLinks.values();
		//~ var resLinkCount = resLinks.length;
		//~ for (var rl =0; rl < resLinkCount; rl ++) {
			//~ var residueLink = resLinks[rl];
			
	var crossLinks = CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks").values();
	for (residueLink of crossLinks){
		var filteredMatches = residueLink.getFilteredMatches();
		if (filteredMatches.length > 0){

			var linkedRes1 = residueLink.fromProtein.sequence[residueLink.fromResidue - 1];
			var linkedRes2 = residueLink.toProtein.sequence[residueLink.toResidue - 1];
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
	return csv;
}

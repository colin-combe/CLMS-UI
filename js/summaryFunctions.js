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
proteinLinkToHTML = function(proteinLink) {
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
		//~ linkInfo += scoresTable;
	//~ }

	return rows;
}
</script>


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
</script>

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
    var filename = CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString() + "--matches--" + CLMSUI.utils.filterStateToString()) + ".csv";
    download(csv, 'text/csv', filename);
}
function downloadLinks(){
    var csv = getLinksCSV();
    var filename = CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString() + "--links--" + CLMSUI.utils.filterStateToString()) + ".csv";
    download(csv, 'text/csv', filename);
}
function downloadResidueCount(){
    var csv = getResidueCount();
    var filename = CLMSUI.utils.makeLegalFileName (CLMSUI.utils.searchesToString() + "--residueCount--" + CLMSUI.utils.filterStateToString()) + ".csv";
    download(csv, 'text/csv', filename);
}

function download(content, contentType, fileName) {
    //var b64svg = window.btoa(content);
    // because btoa borks on unicode characters > 1 byte. http://ecmanaut.blogspot.co.uk/2006/07/encoding-decoding-utf8-in-javascript.html
    var b64svg = window.btoa(unescape(encodeURIComponent(content)));
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
    var csv = '"Id","Protein 1","SeqPos 1","PepPos 1","PepSeq 1","LinkPos 1","Protein 2","SeqPos 2","PepPos 2","PepSeq 2","LinkPos 2","Score","Charge","Exp m/z","ExpMass","Match m/z","MatchMass","MassError","AutoValidated","Validated","Search","RunName","ScanNumber"\r\n';
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
    var matches = clmsModel.get("matches");
    var matchCount = matches.length;
    var proteinMatchFunc = clmsModel.isMatchingProteinPairFromIDs.bind(clmsModel);
    var filterModel = CLMSUI.compositeModelInst.get("filterModel");

    for (var m = 0; m < matchCount; ++m){
		var match = matches[m];
        var result;
        if (filterModel.get("fdrMode") === true) {
			result = match.fdrPass;
		} else {
			result = filterModel.subsetFilter (match, proteinMatchFunc)
						&& filterModel.validationStatusFilter(match)
      && filterModel.scoreFilter(match)
						&& filterModel.navigationFilter(match);
		}
        if (result === true){
            var pp1 = CLMSUI.utils.pepPosConcat(match, 0);
            var pp2 = CLMSUI.utils.pepPosConcat(match, 1);
            csv += '"' + match.id + '","' + CLMSUI.utils.proteinConcat(match, 0, CLMSUI.compositeModelInst.get("clmsModel"))
                + '","' + (+pp1 + match.linkPos1 - 1)
                + '","' + pp1 + '","'
                + match.matchedPeptides[0].seq_mods + '","' + match.linkPos1 + '","'
                + (match.matchedPeptides[1]? CLMSUI.utils.proteinConcat(match, 1, CLMSUI.compositeModelInst.get("clmsModel")) : "")
                + '","' + (+pp2 + match.linkPos2 - 1)
                + '","' + pp2 + '","'
                + (match.matchedPeptides[1]? match.matchedPeptides[1].seq_mods : "") + '","' + match.linkPos2 + '","'
                + match.score + '","' + match.precursorCharge + '","'  + match.expMZ() + '","' + match.expMass() + '","' 
                + match.matchMZ() + '","' + match.matchMass() + '","' + match.massError() + '","' 
                + match.autovalidated + '","' + match.validated + '","'
                + match.searchId + '","' + match.runName() + '","' + match.scanNumber + '"\r\n';
        }
    }
    return csv;
}


function getLinksCSV(){
    var validatedTypes = ["A", "B", "C", "?", "R"];
    
    var headerArray = ["Protein 1","SeqPos 1","LinkedRes 1","Protein 2","SeqPos 2","LinkedRes 2","Highest Score","Match Count","AutoValidated","Validated","Link FDR","3D Distance","From Chain","To Chain", "PDB SeqPos 1", "PDB SeqPos 2"];
    var searchIds = Array.from (CLMSUI.compositeModelInst.get("clmsModel").get("searches").keys());
    for (var i = 0; i < searchIds.length; i++ ) {
        headerArray.push ("Search_"+searchIds[i]);
    }
    console.log ("searchIds", searchIds);
    var headerRow = '"' + headerArray.join('","') + '"';

    var crossLinks = CLMS.arrayFromMapValues(CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks"));
    crossLinks = crossLinks.filter (function (crossLink) { return crossLink.filteredMatches_pp.length > 0; });
    var physicalDistances = CLMSUI.compositeModelInst.getCrossLinkDistances (crossLinks, {includeUndefineds: true, returnChainInfo: true, calcDecoyProteinDistances: true});
    //console.log ("pd", physicalDistances);
    var distance2dp = d3.format(".2f");
    
    /*
    crossLinks.forEach (function (crossLink, i) {
        var linear = crossLink.isLinearLink();
        var filteredMatchesAndPepPos = crossLink.filteredMatches_pp;
        csv += '"' + mostReadableId(crossLink.fromProtein) + '","'
            + crossLink.fromResidue + '","' + crossLink.fromProtein.sequence[crossLink.fromResidue - 1] + '","'
            + (linear ? "" : mostReadableId(crossLink.toProtein)) + '","'
            + crossLink.toResidue + '","';
        if (!linear && crossLink.toResidue) {
            csv += crossLink.toProtein.sequence[crossLink.toResidue - 1];
        }

        var highestScore = null;
        var searchesFound = new Set();
        var filteredMatchCount = filteredMatchesAndPepPos.length;    // me n lutz fix
        var linkAutovalidated = false;
        var validationStats = [];
        for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
            var match = filteredMatchesAndPepPos[fm_pp].match;
            if (highestScore == null || match.score > highestScore) {
                highestScore = match.score.toFixed(4);
            }
            if (match.autovalidated === true) {linkAutovalidated = true;}
            validationStats.push(match.validated);
            searchesFound.add(match.searchId);
        }
        //console.log ("sf", searchesFound);
        csv += '","' + highestScore;
        csv += '","' + filteredMatchCount;
        csv += '","' + linkAutovalidated;
        csv +=  '","' + validationStats.toString();
        csv += '","' + (crossLink.meta ? crossLink.meta.fdr : undefined);
		var distExists; // = physicalDistances[i].distance;
        if (physicalDistances[i]) {
			distExists = physicalDistances[i].distance;
		} else {
			distExists = false;
		}
        csv += '","' + (distExists ? distance2dp (distExists) : undefined);
        csv += '","' + (distExists ? physicalDistances[i].chainInfo.from : undefined);
        csv += '","' + (distExists ? physicalDistances[i].chainInfo.to : undefined);

        for (var s = 0; s < searchIds.length; s++){
            csv +=  '","';
            if (searchesFound.has(searchIds[s])){
				csv += "X";
			}
        }

        csv += '"\r\n';
    }, this);
    */
    
     var rows = crossLinks.map (function (crossLink, i) {
        var row = [];
        var linear = crossLink.isLinearLink();
        var filteredMatchesAndPepPos = crossLink.filteredMatches_pp;
        row.push (
            mostReadableId(crossLink.fromProtein), crossLink.fromResidue, crossLink.fromProtein.sequence[crossLink.fromResidue - 1], 
            (linear ? "" : mostReadableId(crossLink.toProtein)), crossLink.toResidue,
            !linear && crossLink.toResidue ? crossLink.toProtein.sequence[crossLink.toResidue - 1] : ""
        );

        var highestScore = null;
        var searchesFound = new Set();
        var filteredMatchCount = filteredMatchesAndPepPos.length;    // me n lutz fix
        var linkAutovalidated = false;
        var validationStats = [];
        for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
            var match = filteredMatchesAndPepPos[fm_pp].match;
            if (highestScore == null || match.score > highestScore) {
                highestScore = match.score.toFixed(4);
            }
            if (match.autovalidated === true) {linkAutovalidated = true;}
            validationStats.push(match.validated);
            searchesFound.add(match.searchId);
        }
        //console.log ("sf", searchesFound);
        row.push (highestScore, filteredMatchCount, linkAutovalidated, validationStats.toString(), (crossLink.meta ? crossLink.meta.fdr : undefined));
        var pDist = physicalDistances[i];
        if (pDist && pDist.distance) {
            var chain = pDist.chainInfo;
            row.push (distance2dp (pDist.distance), chain.from, chain.to, chain.fromRes + 1, chain.toRes + 1);  // +1 to return to 1-INDEXED
		} else {
            row.push ("", "", "", "", "");
		}     

        for (var s = 0; s < searchIds.length; s++){
            row.push (searchesFound.has(searchIds[s]) ? "X" : "");
        }

        return '"' + row.join('","') + '"';
    }, this);
    
    rows.unshift (headerRow);
    var csv = rows.join("\r\n") + '\r\n';
    return csv;
}

function getResidueCount() {
    var csv = '"Residue(s)","Occurences(in_unique_links)"\r\n';
    //~ var matches = xlv.matches;//.values();
    //~ var matchCount = matches.length;
    var residueCounts = d3.map();
    var residuePairCounts = d3.map();

    var crossLinksArray = CLMS.arrayFromMapValues(CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks"));
    var crossLinkCount = crossLinksArray.length;
    for (var cl = 0; cl < crossLinkCount; cl++){
		var residueLink = crossLinksArray[cl];
        if (residueLink.filteredMatches_pp.length > 0){

            var linkedRes1 = residueLink.fromProtein.sequence[residueLink.fromResidue - 1];
            if (!linkedRes1) { linkedRes1 = ""}
            var linkedRes2 = residueLink.isLinearLink() ? "" : residueLink.toProtein.sequence[residueLink.toResidue - 1];
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

mostReadableId = function (protein) {
    if (protein.accession && protein.name) {
        return "sp|" + protein.accession + "|" + protein.name;
    }
    else if (protein.name) {
        return protein.name;
    }
    else if (protein.accession) {
        return protein.accession;
    }
    else {
        return protein.id;
    }
}


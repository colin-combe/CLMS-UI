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
    var csv = '"Id","Protein1","SeqPos1","PepPos1","PepSeq1","LinkPos1","Protein2","SeqPos2","PepPos2","PepSeq2","LinkPos2","Score","AutoValidated","Validated","Search","RunName","ScanNumber"\r\n';
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
						&& filterModel.navigationFilter(match);
							}
        if (result === true){
            var pp1 = CLMSUI.utils.pepPosConcat(match, 0);
            var pp2 = CLMSUI.utils.pepPosConcat(match, 1);
            csv += '"' + match.id + '","' + CLMSUI.utils.proteinConcat(match, 0, CLMSUI.compositeModelInst.get("clmsModel"))
                + '","' + (+pp1 + match.linkPos1 - 1)
                + '","' + pp1 + '","'
                + match.matchedPeptides[0].sequence + '","' + match.linkPos1 + '","'
                + CLMSUI.utils.proteinConcat(match, 1, CLMSUI.compositeModelInst.get("clmsModel"))
                + '","' + (+pp2 + match.linkPos2 - 1)
                + '","' + pp2 + '","'
                + match.matchedPeptides[1].sequence + '","' + match.linkPos2 + '","'
                + match.score + '","' + match.autovalidated + '","' + match.validated + '","'
                + match.searchId + '","' + match.runName() + '","' + match.scanNumber + '"\r\n';
        }
    }
    return csv;
}


function getLinksCSV(){
    var validatedTypes = ["A", "B", "C", "?", "R"];
    
    var csv = '"Protein 1","SeqPos 1","LinkedRes 1","Protein 2","SeqPos 2","LinkedRes 2","Highest Score","Match Count","AutoValidated","Validated","Link FDR","3D Distance"';
    

    var searchIds = {};
    var i = 0;
    for (id of CLMSUI.compositeModelInst.get("clmsModel").get("searches").keys()) {
        csv += ',"Search_'+ id +'"';
        searchIds[i] = id;
        i++;
    }
    console.log ("searchIds", searchIds);

    csv += '\r\n';

    var crossLinks = Array.from (CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks").values());
    crossLinks = crossLinks.filter (function (crossLink) { return crossLink.filteredMatches_pp.length > 0; });
    var physicalDistances = CLMSUI.compositeModelInst.getCrossLinkDistances2 (crossLinks, {includeUndefineds: true});
    
    crossLinks.forEach (function (crossLink, i) {
        var filteredMatchesAndPepPos = crossLink.filteredMatches_pp;
        csv += '"' + mostReadableId(crossLink.fromProtein) + '","'
            + crossLink.fromResidue + '","' + crossLink.fromProtein.sequence[crossLink.fromResidue - 1] + '","'
            + mostReadableId(crossLink.toProtein) + '","'
            + crossLink.toResidue + '","';
        if (crossLink.toProtein && crossLink.toResidue) {
            csv += crossLink.toProtein.sequence[crossLink.toResidue - 1];
        }

        var highestScore = null;
        var searchesFound = {};
        var filteredMatchCount = filteredMatchesAndPepPos.length;    // me n lutz fix
        var linkAutovalidated = false;
        var validationStats = [];
        for (matchAndPepPos of filteredMatchesAndPepPos) {
            var match = matchAndPepPos.match;
            if (highestScore == null || match.score > highestScore) {
                highestScore = match.score.toFixed(4);
            }
            if (match.autovalidated === true) {linkAutovalidated = true;}
            validationStats.push(match.validated);
            searchesFound[match.searchId] = true;
        }
        console.log ("sf", searchesFound);
        csv += '","' + highestScore;
        csv += '","' + filteredMatchCount;
        csv += '","' + linkAutovalidated;
        csv +=  '","' + validationStats.toString();
        csv += '","' + (crossLink.meta ? crossLink.meta.fdr : undefined);
        csv += '","' + (physicalDistances[i] ? physicalDistances[i].toFixed(2) : undefined);

        for (var s = 0; s < searchIds.length; s++){
            csv +=  '","';
            if (searchesFound[searchIds[s]]) csv += "X";
        }

        csv += '"\r\n';
    }, this);
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
        if (residueLink.filteredMatches_pp.length > 0){

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


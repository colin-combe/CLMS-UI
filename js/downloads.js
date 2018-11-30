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

function downloadFilename(type) {
    return CLMSUI.utils.makeLegalFileName(CLMSUI.utils.searchesToString() + "--" + type + "--" + CLMSUI.utils.filterStateToString()) + ".csv";
}

function downloadMatches() {
    download(getMatchesCSV(), 'text/csv', downloadFilename("matches"));
}

function downloadLinks() {
    download(getLinksCSV(), 'text/csv', downloadFilename("links"));
}

function downloadResidueCount() {
    download(getResidueCount(), 'text/csv', downloadFilename("residueCount"));
}

function download(content, contentType, fileName) {
    //var b64svg = window.btoa(content);

    var modernWeb;
    try {
      modernWeb = !!new Blob();
    } catch (e) {
      modernWeb = false;
    }

    console.log("svg filename", fileName, modernWeb);

    if (!modernWeb) {
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
    } else {
        var oldToNewTypes = {
            "application/svg": "image/svg+xml;charset=utf-8",
            "plain/text": "plain/text;charset=utf-8",
        };
        var newContentType = oldToNewTypes[contentType] || contentType;

        function dataURItoBlob(binary) {
            var array = [];
            
            // https://stackoverflow.com/a/18729931/368214
            // fixes unicode bug
             for (var i=0; i < binary.length; i++) {
                var charcode = binary.charCodeAt(i);
                if (charcode < 0x80) array.push(charcode);
                else if (charcode < 0x800) {
                    array.push(0xc0 | (charcode >> 6), 
                              0x80 | (charcode & 0x3f));
                }
                else if (charcode < 0xd800 || charcode >= 0xe000) {
                    array.push(0xe0 | (charcode >> 12), 
                              0x80 | ((charcode>>6) & 0x3f), 
                              0x80 | (charcode & 0x3f));
                }
                // surrogate pair
                else {
                    i++;
                    // UTF-16 encodes 0x10000-0x10FFFF by
                    // subtracting 0x10000 and splitting the
                    // 20 bits of 0x0-0xFFFFF into two halves
                    charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                              | (binary.charCodeAt(i) & 0x3ff));
                    array.push(0xf0 | (charcode >>18), 
                              0x80 | ((charcode>>12) & 0x3f), 
                              0x80 | ((charcode>>6) & 0x3f), 
                              0x80 | (charcode & 0x3f));
                }
            }
            return new Blob([new Uint8Array(array)], {
                type: newContentType
            });
        }

        var blob = dataURItoBlob(content);

        if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
            var a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            // Give filename you wish to download
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    //var fileType = fileName.split(".").slice(-1).pop() || "";	// fancy way of getting last element in array without lots of a = arr, a.length-1 etc
    //CLMSUI.utils.displayError (function() { return true; }, "Downloaded "+fileType.toUpperCase()+" File:<br>"+fileName, "#091d42", 0.6);
}


function mostReadableId(protein) {
    if (protein.accession && protein.name) {
        return "sp|" + protein.accession + "|" + protein.name;
    } else if (protein.name) {
        return protein.name;
    } else if (protein.accession) {
        return protein.accession;
    } else {
        return protein.id;
    }
}


function getMatchesCSV() {
    var csv = '"Id","Protein1","SeqPos1","PepPos1","PepSeq1","LinkPos1","Protein2","SeqPos2","PepPos2","PepSeq2","LinkPos2","Score","Charge","ExpMz","ExpMass","CalcMz","CalcMass","MassError","AutoValidated","Validated","Search","RawFileName","ScanNumber","ScanIndex","CrossLinkerModMass","FragmentTolerance","IonTypes","Decoy1","Decoy2","3D Distance","From Chain","To Chain","PDB SeqPos 1","PDB SeqPos 2"\r\n';
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");

    var distance2dp = d3.format(".2f");

    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all");
    var matchMap = d3.map();

    // do it like this so ambiguous matches (belonging to >1 crosslink) aren't repeated
    crossLinks.forEach(function(crossLink) {
        crossLink.filteredMatches_pp.forEach(function(match) {
            matchMap.set(match.match.id, match.match);
        })
    });
    //console.log ("CL", crossLinks, matchMap);

    /*
	var count = 0;
	var matchCount = matches.length;
	var matches = clmsModel.get("matches");

    var filterModel = CLMSUI.compositeModelInst.get("filterModel");
    var proteinMatchFunc = clmsModel.isMatchingProteinPairFromIDs.bind(clmsModel);

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
			count++;
		*/

    matchMap.values().forEach(function(match) {
        var peptides1 = match.matchedPeptides[0];
        var peptides2 = match.matchedPeptides[1];
        var pp1 = CLMSUI.utils.pepPosConcat(match, 0);
        var pp2 = CLMSUI.utils.pepPosConcat(match, 1);
        var lp1 = CLMSUI.utils.fullPosConcat(match, 0);
        var lp2 = CLMSUI.utils.fullPosConcat(match, 1);

        var decoy1 = clmsModel.get("participants").get(peptides1.prt[0]).is_decoy;
        var decoy2 = peptides2 ? clmsModel.get("participants").get(peptides2.prt[0]).is_decoy : "";

        // Work out distances for this match - ambiguous matches will have >1 crosslink
        var crossLinks = match.crossLinks;
        var distances = CLMSUI.compositeModelInst.getCrossLinkDistances(crossLinks, {
            includeUndefineds: true,
            returnChainInfo: true,
            calcDecoyProteinDistances: true
        });
        var distances2DArr = distances.map(function(dist) {
            return dist && dist.distance ? [distance2dp(dist.distance), dist.chainInfo.from, dist.chainInfo.to, dist.chainInfo.fromRes, dist.chainInfo.toRes] : ["", "", "", "", ""];
        });
        var distancesTransposed = d3.transpose(distances2DArr); // transpose so distance data now grouped in array by field (distance, tores, etc)
        var distancesJoined = distancesTransposed.map(function(arr) {
            return arr.join(", ");
        });

        var data = [
            match.id, CLMSUI.utils.proteinConcat(match, 0, clmsModel), lp1, pp1, peptides1.seq_mods, match.linkPos1, (peptides2 ? CLMSUI.utils.proteinConcat(match, 1, clmsModel) : ""), lp2, pp2, (peptides2 ? peptides2.seq_mods : ""), match.linkPos2, match.score(), match.precursorCharge, match.expMZ(), match.expMass(), match.calcMZ(), match.calcMass(), match.massError(), match.autovalidated, match.validated, match.searchId, match.runName(), match.scanNumber, match.scanIndex, match.crossLinkerModMass(), match.fragmentToleranceString(), match.ionTypesString(), decoy1, decoy2, distancesJoined.join('","')
        ];
        csv += '"' + data.join('","') + '"\r\n';
        /*
        }
    }
	*/
    });

    //console.log ("MCSV", count, matchMap.values().length);
    return csv;
}


function getLinksCSV() {
    var validatedTypes = ["A", "B", "C", "?", "R"];
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");

    var headerArray = ["Protein1", "SeqPos1", "LinkedRes1", "Protein2", "SeqPos2", "LinkedRes2", "Highest Score", "Match Count", "AutoValidated", "Validated", "Link FDR", "3D Distance", "From Chain", "To Chain", "PDB SeqPos 1", "PDB SeqPos 2"];
    var searchIDs = Array.from(clmsModel.get("searches").keys());
    for (var i = 0; i < searchIDs.length; i++) {
        headerArray.push("Search_" + searchIDs[i]);
    }
    console.log("searchIds", searchIDs);

    var metaColumns = (clmsModel.get("crossLinkMetaRegistry") || d3.set()).values();
    headerArray = headerArray.concat(metaColumns);

    var headerRow = '"' + headerArray.join('","') + '"';

    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all");

    var physicalDistances = CLMSUI.compositeModelInst.getCrossLinkDistances(crossLinks, {
        includeUndefineds: true,
        returnChainInfo: true,
        calcDecoyProteinDistances: true
    });
    //console.log ("pd", physicalDistances);
    var distance2dp = d3.format(".2f");

    var rows = crossLinks.map(function(crossLink, i) {
        var row = [];
        var linear = crossLink.isLinearLink();
        var filteredMatchesAndPepPos = crossLink.filteredMatches_pp;
        row.push(
            mostReadableId(crossLink.fromProtein), crossLink.fromResidue, crossLink.fromProtein.sequence[crossLink.fromResidue - 1],
            (linear ? "" : mostReadableId(crossLink.toProtein)), crossLink.toResidue, !linear && crossLink.toResidue ? crossLink.toProtein.sequence[crossLink.toResidue - 1] : ""
        );

        var highestScore = null;
        var searchesFound = new Set();
        var filteredMatchCount = filteredMatchesAndPepPos.length; // me n lutz fix
        var linkAutovalidated = false;
        var validationStats = [];
        for (var fm_pp = 0; fm_pp < filteredMatchCount; fm_pp++) {
            var match = filteredMatchesAndPepPos[fm_pp].match;
            if (highestScore == null || match.score() > highestScore) {
                highestScore = match.score().toFixed(4);
            }
            if (match.autovalidated === true) {
                linkAutovalidated = true;
            }
            validationStats.push(match.validated);
            searchesFound.add(match.searchId);
        }
        row.push(highestScore, filteredMatchCount, linkAutovalidated, validationStats.toString(), crossLink.getMeta("fdr"));

        // Distance info
        var pDist = physicalDistances[i];
        if (pDist && pDist.distance) {
            var chain = pDist.chainInfo;
            row.push(distance2dp(pDist.distance), chain.from, chain.to, chain.fromRes + 1, chain.toRes + 1); // +1 to return to 1-INDEXED
        } else {
            row.push("", "", "", "", "");
        }

        // Add presence in searches
        for (var s = 0; s < searchIDs.length; s++) {
            row.push(searchesFound.has(searchIDs[s]) ? "X" : "");
        }

        // Add metadata information
        for (var m = 0; m < metaColumns.length; m++) {
            var mval = crossLink.getMeta(metaColumns[m]);
            if (mval === undefined) {
                mval = "";
            }
            row.push(mval);
        }

        return '"' + row.join('","') + '"';
    }, this);

    rows.unshift(headerRow);
    var csv = rows.join("\r\n") + '\r\n';
    return csv;
}

function getResidueCount() {
    var csv = '"Residue(s)","Occurences(in_unique_links)"\r\n';
    //~ var matches = xlv.matches;//.values();
    //~ var matchCount = matches.length;
    var residueCounts = d3.map();
    var residuePairCounts = d3.map();

    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all"); // already pre-filtered
    crossLinks.forEach(function(residueLink) {
        var linkedRes1 = residueLink.fromProtein.sequence[residueLink.fromResidue - 1];
        if (!linkedRes1) {
            linkedRes1 = ""
        }
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
        if (isNaN(c)) {
            residuePairCounts.set(pairId, 1);
        } else {
            c++;
            residuePairCounts.set(pairId, c);
        }
    });

    residuePairCounts.forEach(function(k, v) {
        csv += '"' + k + '","' +
            v + '"\r\n';
    });
    residueCounts.forEach(function(k, v) {
        csv += '"' + k + '","' +
            v + '"\r\n';
    });

    function incrementCount(res) {
        var c = parseInt(residueCounts.get(res));
        if (isNaN(c)) {
            residueCounts.set(res, 1);
        } else {
            c++;
            residueCounts.set(res, c);
        }
    }
    return csv;
}

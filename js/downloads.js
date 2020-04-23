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

function downloadFilename(type, suffix) {
    suffix = suffix || "csv";
    return CLMSUI.utils.makeLegalFileName(CLMSUI.utils.searchesToString() + "--" + type + "--" + CLMSUI.utils.filterStateToString()) + "." + suffix;
}

function downloadMatches() {
    download(getMatchesCSV(), 'text/csv', downloadFilename("matches"));
}

function downloadSSL() {

// $("#newGroupName").dialog({
//   modal: true,
//   buttons: {
//     'OK': function () {
//       var newGroupName = $('input[name="newGroupName"]').val();
//       alert(name);
      download(getSSL(newGroupName), 'text/csv', "test.ssl"); //downloadFilename("ssl"));
//       // storeData(name);
//       $(this).dialog('close');
//     },
//     'Cancel': function () {
//       $(this).dialog('close');
//     }
//   }
// });

}

function downloadLinks() {
    download(getLinksCSV(), 'text/csv', downloadFilename("links"));
}

function downloadPPIs() {
    download(getPPIsCSV(), 'text/csv', downloadFilename("PPIs"));
}

function downloadResidueCount() {
    download(getResidueCount(), 'text/csv', downloadFilename("residueCount"));
}

function downloadModificationCount() {
    download(getModificationCount(), 'text/csv', downloadFilename("modificationCount"));
}

function downloadProteinAccessions() {
    download(getProteinAccessions(), 'text/csv', downloadFilename("proteinAccessions"));
}

function download(content, contentType, fileName) {
    //var b64svg = window.btoa(content);

    var modernWeb = CLMSUI.utils.isModernWeb();

    //console.log ("svg filename", fileName, modernWeb);

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
            var te;

            try {
                te = new TextEncoder("utf-8");
            } catch (e) {
                te = undefined;
            }

            if (te) {
                array = te.encode(binary); // html5 encoding api way
            } else {
                // https://stackoverflow.com/a/18729931/368214
                // fixes unicode bug
                for (var i = 0; i < binary.length; i++) {
                    var charcode = binary.charCodeAt(i);
                    if (charcode < 0x80) array.push(charcode);
                    else if (charcode < 0x800) {
                        array.push(0xc0 | (charcode >> 6),
                            0x80 | (charcode & 0x3f));
                    } else if (charcode < 0xd800 || charcode >= 0xe000) {
                        array.push(0xe0 | (charcode >> 12),
                            0x80 | ((charcode >> 6) & 0x3f),
                            0x80 | (charcode & 0x3f));
                    }
                    // surrogate pair
                    else {
                        i++;
                        // UTF-16 encodes 0x10000-0x10FFFF by
                        // subtracting 0x10000 and splitting the
                        // 20 bits of 0x0-0xFFFFF into two halves
                        charcode = 0x10000 + (((charcode & 0x3ff) << 10) |
                            (binary.charCodeAt(i) & 0x3ff));
                        array.push(0xf0 | (charcode >> 18),
                            0x80 | ((charcode >> 12) & 0x3f),
                            0x80 | ((charcode >> 6) & 0x3f),
                            0x80 | (charcode & 0x3f));
                    }
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
            window.URL.revokeObjectURL(a.href); // clear up url reference to blob so it can be g.c.'ed
        }

        blob = null;
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


function mostReadableMultipleId (match, matchedPeptideIndex, clmsModel) {
    var mpeptides = match.matchedPeptides[matchedPeptideIndex];
    var proteins = mpeptides ? mpeptides.prt.map(function(pid) {
        return clmsModel.get("participants").get(pid);
    }) : [];
    return proteins.map (function (prot) { return mostReadableId (prot); }, this).join(";");
}


function getMatchesCSV() {
    var csv = '"Id","Protein1","SeqPos1","PepPos1","PepSeq1","LinkPos1","Protein2","SeqPos2","PepPos2","PepSeq2","LinkPos2","Score","Charge","ExpMz","ExpMass","CalcMz","CalcMass","MassError","AutoValidated","Validated","Search","RawFileName","PeakListFileName","ScanNumber","ScanIndex","CrossLinkerModMass","FragmentTolerance","IonTypes","Decoy1","Decoy2","3D Distance","From Chain","To Chain","PDB SeqPos 1","PDB SeqPos 2","LinkType","DecoyType","Retention Time"\r\n';
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
    var participants = clmsModel.get("participants");
    var distance2dp = d3.format(".2f");

    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all");
    var matchMap = d3.map();

    // do it like this so ambiguous matches (belonging to >1 crosslink) aren't repeated
    console.log ("start map");
    var zz = performance.now();
    crossLinks.forEach(function(crossLink) {
        crossLink.filteredMatches_pp.forEach(function(match) {
            matchMap.set(match.match.id, match.match);
        });
    });
    console.log ("finish map", performance.now() - zz, "ms.");
    zz = performance.now();

    matchMap.values().forEach(function(match) {
        var peptides1 = match.matchedPeptides[0];
        var peptides2 = match.matchedPeptides[1];
        var pp1 = CLMSUI.utils.pepPosConcat(match, 0);
        var pp2 = CLMSUI.utils.pepPosConcat(match, 1);
        var lp1 = CLMSUI.utils.fullPosConcat(match, 0);
        var lp2 = CLMSUI.utils.fullPosConcat(match, 1);

        var decoy1 = participants.get(peptides1.prt[0]).is_decoy;
        // TODO: looks to rely on "" == false, prob doesn't give right result for linears
        var decoy2 = peptides2 ? participants.get(peptides2.prt[0]).is_decoy : "";

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

        var linkType;
        if (match.isAmbig()) {
            linkType = "Ambig.";
        } else if (participants.get(match.matchedPeptides[0].prt[0]).accession == "___AMBIGUOUS___" || (match.matchedPeptides[1] && participants.get(match.matchedPeptides[1].prt[0]).accession == "___AMBIGUOUS___")) {
            linkType = "__AMBIG__";
        } else if (match.crossLinks[0].isSelfLink()) {
            linkType = "Self";
        } else {
            linkType = "Between";
        }

        var decoyType = (decoy1 && decoy2) ? "DD" : (decoy1 || decoy2 ? "TD" : "TT");
        var retentionTime = match.retentionTime !== undefined ? match.retentionTime : (match.elution_time_end === -1 ? match.elution_time_start : "");

        var data = [
            match.id, mostReadableMultipleId(match, 0, clmsModel), lp1, pp1, peptides1.seq_mods, match.linkPos1, (peptides2 ? mostReadableMultipleId(match, 1, clmsModel) : ""), lp2, pp2, (peptides2 ? peptides2.seq_mods : ""), match.linkPos2, match.score(), match.precursorCharge, match.expMZ(), match.expMass(), match.calcMZ(), match.calcMass(), match.massError(), match.autovalidated, match.validated, match.searchId, match.runName(), match.peakListFileName(), match.scanNumber, match.scanIndex, match.crossLinkerModMass(), match.fragmentToleranceString(),  "" /*match.ionTypesString()*/, decoy1, decoy2, distancesJoined.join('","'), linkType, decoyType, retentionTime
        ];
        csv += '"' + data.join('","') + '"\r\n';
        /*
        }
    }
	*/
    });

    console.log ("build string", performance.now() - zz, "ms.");

    //console.log ("MCSV", count, matchMap.values().length);
    return csv;
}

function getSSL(newGroupName) {
    var csv = 'file\tscan\tcharge\tsequence\tscore-type\tscore\tId\tProtein1\tSeqPos1\tPepPos1\tPepSeq1\tLinkPos1\tProtein2\tSeqPos2\tPepPos2\tPepSeq2\tLinkPos2\tCharge\tExpMz\tExpMass\tCalcMz\tCalcMass\tMassError\tAutoValidated\tValidated\tSearch\tRawFileName\tPeakListFileName\tScanNumber\tScanIndex\tCrossLinkerModMass\tFragmentTolerance\tIonTypes\r\n';
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
    //var mass6dp = d3.format(".6f");

    var deltaMassRegex = /DELTAMASS:(.*)/
    var massRegex = /MASS:(.*)/
    var modifiedRegex = /MODIFIED:(.*);/
    var modificationDeltasMap = new Map();
    for (var search of clmsModel.get("searches").values()) {
        for (var mod of search.modifications) {
            var sym = mod.symbol;
            var delta;
            var desc = mod.description;
            var deltaMatch = +deltaMassRegex.exec(desc);
            if (deltaMatch) {
                delta = deltaMatch[1];
            } else {
                var modified = modifiedRegex.exec(desc)[1]
                delta = massRegex.exec(desc)[1] - CLMSUI.modelUtils.amino1toMass[modified];
            }

            if (delta > 0) {
                delta = "[+" + delta + "]";
            } else {
                delta = "[" + delta + "]";
            }

            modificationDeltasMap.set(sym, delta);

        }
    }

    console.log("modDeltas", modificationDeltasMap);



    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all");
    var matchMap = d3.map();

    // do it like this so ambiguous matches (belonging to >1 crosslink) aren't repeated
    crossLinks.forEach(function(crossLink) {
        crossLink.filteredMatches_pp.forEach(function(match) {
            matchMap.set(match.match.id, match.match);
        });
    });

    var notUpperCase = /[^A-Z]/g;
    var makeSslPepSeq = function(seq, linkPos) {
        notUpperCase.lastIndex = 0;
        if (notUpperCase.test(seq)) {
            for (var modInfo of modificationDeltasMap.entries()) {
                seq = seq.replace(new RegExp(modInfo[0], 'g'), modInfo[1]);
            }
        }
        var sslSeqLinkIndex = findIndexofNthUpperCaseLetter(seq, linkPos);
        return seq.slice(0, sslSeqLinkIndex + 1) + "[+1.008]" + seq.slice(sslSeqLinkIndex + 1, seq.length);
    };
    var findIndexofNthUpperCaseLetter = function(str, n) { // n is 1-indexed here
        str = str || "";
        var i = -1;
        while (n > 0 && i < str.length) {
            i++;
            var c = str[i];
            if (c >= "A" && c <= "Z") n--;
        }
        return i === str.length ? undefined : i;
    };

    matchMap.values().forEach(function(match) {
        var peptide1 = match.matchedPeptides[0];
        var peptide2 = match.matchedPeptides[1];

        var decoy1 = clmsModel.get("participants").get(peptide1.prt[0]).is_decoy;
        // TODO: looks to rely on "" == false, prob doesn't give right result for linears
        var decoy2 = peptide2 ? clmsModel.get("participants").get(peptide2.prt[0]).is_decoy : "";

        var decoyType;
        if (decoy1 && decoy2) {
            decoyType = "DD";
        } else if (decoy1 || decoy2) {
            decoyType = "TD";
        } else {
            decoyType = "TT";
        }

        if (decoyType == "TT") {
            var pep1sslSeq = makeSslPepSeq(peptide1.seq_mods, match.linkPos1);
            var pep2sslSeq = makeSslPepSeq(peptide2.seq_mods, match.linkPos2);
            var crosslinkerModMass = match.crossLinkerModMass();
            //var sequence = pep1sslSeq + "K[+" + (crosslinkerModMass - 112.099857) + "]" + pep2sslSeq;
	    var joiningAAModMass = (crosslinkerModMass - 112.099857);
            var sequence = pep1sslSeq;
            if (joiningAAModMass > 0) {
                sequence = sequence + "K[+" + joiningAAModMass + "]" + pep2sslSeq;
            } else {
                sequence = sequence + "K[" + joiningAAModMass + "]" + pep2sslSeq;
            }

            var pp1 = CLMSUI.utils.pepPosConcat(match, 0);
            var pp2 = CLMSUI.utils.pepPosConcat(match, 1);
            var lp1 = CLMSUI.utils.fullPosConcat(match, 0);
            var lp2 = CLMSUI.utils.fullPosConcat(match, 1);

            var data = [
                match.peakListFileName(),
                match.scanNumber,
                match.precursorCharge,
                sequence,
                "UNKNOWN",
                match.score(),
                match.id,
                CLMSUI.utils.proteinConcat(match, 0, clmsModel),
                lp1,
                pp1,
                peptide1.seq_mods,
                match.linkPos1,
                (peptide1 ? CLMSUI.utils.proteinConcat(match, 1, clmsModel) : ""),
                lp2,
                pp2,
                (peptide2 ? peptide2.seq_mods : ""),
                match.linkPos2,
                match.precursorCharge,
                match.expMZ(),
                match.expMass(),
                match.calcMZ(),
                match.calcMass(),
                match.massError(),
                match.autovalidated,
                match.validated,
                match.searchId,
                match.runName(),
                match.peakListFileName(),
                match.scanNumber,
                match.scanIndex,
                match.crossLinkerModMass(),
                match.fragmentToleranceString(),
                "" /*match.ionTypesString()*/
            ];
            csv += data.join('\t') + '\r\n';
        }
    });

    //console.log ("MCSV", count, matchMap.values().length);
    return csv;
}


function getLinksCSV() {
    var validatedTypes = ["A", "B", "C", "?", "R"]; //todo - what is this for - cc
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");

    var headerArray = ["Protein1", "SeqPos1", "LinkedRes1", "Protein2", "SeqPos2", "LinkedRes2", "Highest Score", "Match Count", "DecoyType", "AutoValidated", "Validated", "Link FDR", "3D Distance", "From Chain", "To Chain"];//, "PDB SeqPos 1", "PDB SeqPos 2"];
    var searchIDs = Array.from(clmsModel.get("searches").keys());
    searchIDs.forEach(function(sid) {
        headerArray.push("Search_" + sid);
    });
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

        var decoyType;
        if (linear) {
            if (crossLink.fromProtein.is_decoy) {
                decoyType = "D";
            }
            else {
                decoyType = "T";
            }
        } else {
            var decoy1 = crossLink.fromProtein.is_decoy;
            var decoy2 = crossLink.toProtein.is_decoy;
            if (decoy1 && decoy2) {
                decoyType = "DD";
            } else if (decoy1 || decoy2) {
                decoyType = "TD";
            } else {
                decoyType = "TT";
            }
        }

        row.push(highestScore, filteredMatchCount, decoyType, linkAutovalidated, validationStats.toString(), crossLink.getMeta("fdr"));

        // Distance info
        var pDist = physicalDistances[i];
        if (pDist && pDist.distance) {
            var chain = pDist.chainInfo;
            row.push(distance2dp(pDist.distance), chain.from, chain.to);//, chain.fromRes + 1, chain.toRes + 1); // +1 to return to 1-INDEXED
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
            row.push(mval === undefined ? "" : mval);
        }

        return '"' + row.join('","') + '"';
    }, this);

    rows.unshift(headerRow);
    var csv = rows.join("\r\n") + '\r\n';
    return csv;
}

function getPPIsCSV() {
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");

    var headerArray = ["Protein1", "Protein2", "Unique Distance Restraints", "DecoyType"];
    // var searchIDs = Array.from(clmsModel.get("searches").keys());
    // searchIDs.forEach(function(sid) {
    //     headerArray.push("Search_" + sid);
    // });
    // console.log("searchIds", searchIDs);

    // var metaColumns = (clmsModel.get("crossLinkMetaRegistry") || d3.set()).values();
    // headerArray = headerArray.concat(metaColumns);

    var headerRow = '"' + headerArray.join('","') + '"';
    var rows = [headerRow];

    var crosslinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all");

    var ppiMap = new Map();

    for (let crosslink of crosslinks) {
        // its ok, fromProtein and toProtein are already alphabetically ordered
        var ppiId = crosslink.fromProtein.id;
        if (!crosslink.isLinearLink()) {
            ppiId = ppiId + "-" + crosslink.toProtein.id;
        }
        var ppi = ppiMap.get(ppiId);
        if (!ppi) {
            ppi = [];
            ppiMap.set(ppiId, ppi);
        }
        ppi.push(crosslink);
    }

    for (let ppi of ppiMap.values()) {
        var aCrosslink = ppi[0];
        var linear = aCrosslink.isLinearLink();

        var decoyType;
        if (linear) {
            if (aCrosslink.fromProtein.is_decoy) {
                decoyType = "D";
            }
            else {
                decoyType = "T";
            }
        } else {
            var decoy1 = aCrosslink.fromProtein.is_decoy;
            var decoy2 = aCrosslink.toProtein.is_decoy;
            if (decoy1 && decoy2) {
                decoyType = "DD";
            } else if (decoy1 || decoy2) {
                decoyType = "TD";
            } else {
                decoyType = "TT";
            }
        }

        rows.push([mostReadableId(aCrosslink.fromProtein), (linear ? "" : mostReadableId(aCrosslink.toProtein)), ppi.length, decoyType].join(","))
    }

    /*    var ppiMap = crossLinks.map(function(crossLink, i) {
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

            // // Add presence in searches
            // for (var s = 0; s < searchIDs.length; s++) {
            //     row.push(searchesFound.has(searchIDs[s]) ? "X" : "");
            // }
            //
            // // Add metadata information
            // for (var m = 0; m < metaColumns.length; m++) {
            //     var mval = crossLink.getMeta(metaColumns[m]);
            //     row.push(mval === undefined ? "" : mval);
            // }

            return '"' + row.join('","') + '"';
        }, this);

    */
    var csv = rows.join("\r\n") + '\r\n';
    return csv;
}

function getResidueCount() {
    var csv = '"Residue(s)","Occurences(in_unique_links)"\r\n';
    //~ var matches = xlv.matches;//.values();
    //~ var matchCount = matches.length;
    var residueCountMap = d3.map();
    var residuePairCountMap = d3.map();

    var crossLinks = CLMSUI.compositeModelInst.getFilteredCrossLinks("all"); // already pre-filtered
    crossLinks.forEach(function(residueLink) {
        var linkedRes1 = residueLink.fromProtein.sequence[residueLink.fromResidue - 1] || "";
        var linkedRes2 = residueLink.isLinearLink() ? "" : residueLink.toProtein.sequence[residueLink.toResidue - 1];
        incrementCount(residueCountMap, linkedRes1);
        incrementCount(residueCountMap, linkedRes2);

        var pairId = (linkedRes1 > linkedRes2) ? linkedRes2 + "-" + linkedRes1 : linkedRes1 + "-" + linkedRes2;
        incrementCount(residuePairCountMap, pairId);
    });

    residuePairCountMap.forEach(function(k, v) {
        csv += '"' + k + '","' +
            v + '"\r\n';
    });
    residueCountMap.forEach(function(k, v) {
        csv += '"' + k + '","' +
            v + '"\r\n';
    });

    function incrementCount(map, res) {
        var c = parseInt(map.get(res));
        if (isNaN(c)) {
            map.set(res, 1);
        } else {
            c++;
            map.set(res, c);
        }
    }
    return csv;
}
function getModificationCount() {
    var csv = '"Modification(s)","TT","TD","DD"\r\n';
    var matches = CLMSUI.compositeModelInst.get("clmsModel").get("matches");

    var modCountMap = new Map();
    var modByResCountMap = new Map();
    var regex = /[A-Z]([a-z0-9]+)/g;
    var filterModel = CLMSUI.compositeModelInst.get("filterModel");
    var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");

    for (var match of matches) {
        var pass = filterModel.subsetFilter(match) &&
            filterModel.validationStatusFilter(match) &&
            filterModel.scoreFilter(match) &&
            filterModel.decoyFilter(match);

        if (pass) {

          var peptide1 = match.matchedPeptides[0];
          var peptide2 = match.matchedPeptides[1];

          var decoy1 = clmsModel.get("participants").get(peptide1.prt[0]).is_decoy;
          var decoy2 = peptide2 ? clmsModel.get("participants").get(peptide2.prt[0]).is_decoy : false;

          var decoyTypeIndex;
          if (decoy1 && decoy2) {
              decoyTypeIndex = 2;
          } else if (decoy1 || decoy2) {
              decoyTypeIndex = 1;
          } else {
              decoyTypeIndex = 0;
          }

          countMods(match.matchedPeptides[0].seq_mods, decoyTypeIndex);
            if (match.matchedPeptides[1]) {
                countMods(match.matchedPeptides[1].seq_mods, decoyTypeIndex)
            }
        }
    }

    function countMods(pep, decoyIndex) {
        var result = pep.matchAll(regex);
        if (result) {
            var modSet = new Set();
            var modByResSet = new Set();
            for (var m of result) {
                //console.log(pep, "::", m);
                modSet.add(m[1]);
                modByResSet.add(m[0]);
            }
            for (var mod of modSet) {
                var modCount = modCountMap.get(mod);
                if (typeof modCount == "undefined") {
                    var counts = [0, 0, 0];
                    modCountMap.set(mod, counts);
                    counts[decoyIndex] = counts[decoyIndex] + 1;
                } else {
                    ++modCount[decoyIndex];
                }
            }
            for (var modByRes of modByResSet) {
                var modByResCount = modByResCountMap.get(modByRes);
                if (!modByResCount) {
                    var counts = [0, 0, 0];
                    modByResCountMap.set(modByRes, counts);
                    ++counts[decoyIndex];
                } else {
                    ++modByResCount[decoyIndex];
                }
            }
        }
    }

    // var mapSort1 = new Map([...modCountMap.entries()].sort((a, b) => b[1] - a[1]));
    // var mapSort2 = new Map([...modByResCountMap.entries()].sort((a, b) => b[1] - a[1]));

    for (var e of modCountMap.entries()) {
        csv += '"' + e[0] + '","' + e[1][0] + '","' + e[1][1] + '","' + e[1][2] + '"\r\n';
    };

    csv += '"",,,""\r\n"",,,""\r\n"",,,""\r\n';

    for (var e of modByResCountMap.entries()) {
      csv += '"' + e[0] + '","' + e[1][0] + '","' + e[1][1] + '","' + e[1][2] + '"\r\n';
    };

    return csv;
}

function getProteinAccessions() {
    var accs = [];
    var proteins = CLMSUI.compositeModelInst.get("clmsModel").get("participants").values();
    for (var p of proteins) {
        if (!p.hidden) {
            accs.push(p.accession);
        }
    }
    return accs.join(",");
}

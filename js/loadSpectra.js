var CLMSUI = CLMSUI || {};

CLMSUI.loadSpectra = function (match, randId, spectrumModel) {

    var xiAnnotRoot = CLMSUI.xiAnnotRoot || "";

    var annotationRequest = {};

    var peptides = [];
    var linkSites = [];
    peptides[0] = CLMSUI.arrayifyPeptide(match.matchedPeptides[0].seq_mods);
    linkSites[0] = {"id":0, "peptideId":0, "linkSite": match.linkPos1}
    if (match.matchedPeptides[1]) {
        peptide[1] = CLMSUI.arrayifyPeptide(match.matchedPeptides[1].seq_mods);    
        linkSites[0] = {"id":0, "peptideId":0, "linkSite": match.linkPos2}
    }
    
    annotationRequest.Peptides = peptides;
    annotationRequest.LinkSite = linkSites;
    annotationRequest.annotation = {};
    var ionTypes = match.ions.split(";");
    var ionTypeCount = ionTypes.length;
    var ions = [];
    for (var it = 0; it < ionTypeCount; it++) {
        var ionType = ionTypes[it];
        ions.push({"Type": (ionType.charAt(0).toUpperCase() + ionType.slice(1) + "Ion")});
    }
    annotationRequest.annotation.ions = ions;
    annotationRequest.annotation.fragmentTolerance = match.spectrum.ft;
    var crossLinker = {};
    crossLinker.modMass = match.matchedPeptides[0].clModMass;
    annotationRequest["cross-linker"] = crossLinker; // yuk
    annotationRequest.precursorCharge = match.precursorCharge;
    annotationRequest.precursorMZ = match.expMZ;
    
    console.log("ANNOTATIONrEQUEST", annotationRequest);

    d3.json ('./php/createSpecReq.php?id='+match.id, function(error, json) {
        if (error) {
            console.log ("error", error, "for", url);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
            console.log ("json:", json, "for", url);
        }
    });

    // 
    // var url = xiAnnotRoot + "annotate/"
    //     + match.searchId + "/" + (randId || "12345") + "/" + match.id 
    //     + "/?peptide=" + match.matchedPeptides[0].seq_mods 
    //     + ((match.matchedPeptides[1])? ("&peptide=" + match.matchedPeptides[1].seq_mods) : "")
    //     + ((match.linkPos1)? ("&link=" + match.linkPos1) : "")
    //     + ((match.linkPos2)? ("&link=" + match.linkPos2) : "")
    // ;
    // 
    // d3.json (url, function(error, json) {
    //     if (error) {
    //         console.log ("error", error, "for", url);
    //         d3.select("#range-error").text ("Cannot load spectra from URL");
    //         spectrumModel.clear();
    //     } else {
    //         d3.select("#range-error").text ("");
    //         spectrumModel.set ({JSONdata: json, match: match, randId: randId}); 
    //     }
    // });
}; 

CLMSUI.arrayifyPeptide = function (seq_mods) {
    var peptide = {};
    peptide.sequence = [];

	var seq_AAonly = seq_mods.replace('/[^A-Z]/' , '');
	var seq_length = seq_AAonly.length; 
 
	for (var i = 0; i < seq_length; i++) {
        peptide.sequence[i] = {"aminoAcid":seq_AAonly[i], "Modification":"" }
	}

    var re = /[^A-Z]+/g;
    var offset = 1;
    while (result = re.exec(seq_mods)) {
        peptide.sequence[result.index - offset]["Modification"] = result[0] 
    }
    return peptide;
}
			
CLMSUI.validate = function (matchId, validationStatus, randId, successCallBack) {
    $.ajax ({
        type: "POST",
        url: "./php/validateMatch.php",
        data: "mid=" + matchId + "&val=" + validationStatus + "&randId="+randId,
        contentType: "application/x-www-form-urlencoded",
        success: function (data, status, xhr){
            console.log ("SUCCESS VALIDATION", data, status, xhr.responseText);
            successCallBack();
        },
    });
};

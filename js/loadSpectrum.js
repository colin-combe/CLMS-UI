var CLMSUI = CLMSUI || {};

//TODO - rename to loadSpectrum
CLMSUI.loadSpectra = function (match, randId, spectrumModel, ignoreResultUnlessLastRequested) {

    console.log("loadSpectra match:" + match.id);
    console.log("fragmentTolerance:", match.fragmentTolerance());
    console.log("ionTypes:", match.ionTypes());
    console.log("crossLinkerModMass:", match.crossLinkerModMass());

//    d3.text ('../CLMS-model/php/peakList.php?sid='+match.searchId+'-'+randId+'&spid='+match.spectrumId, function(error, text) {
//            if (error) {
//                console.log ("error getting peak list", error);
//            } else {
//                console.log ("peakList:", text);
//            }
//    });

    var xiAnnotRoot = CLMSUI.xiAnnotRoot || "";

    var url = xiAnnotRoot + "annotate/"
        + match.searchId + "/" + (randId || "12345") + "/" + match.id
        + "/?peptide=" + match.matchedPeptides[0].seq_mods
        + ((match.matchedPeptides[1])? ("&peptide=" + match.matchedPeptides[1].seq_mods) : "")
        + ((match.linkPos1)? ("&link=" + match.linkPos1) : "")
        + ((match.linkPos2)? ("&link=" + match.linkPos2) : "")
    ;

	CLMSUI.loadSpectra.lastRequestedID = match.id;

    d3.json (url, function(error, json) {
        if (error) {
            console.log ("error", error, "for", url);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
			//console.log ("ann json", json);
			//console.log (json.annotation.psmID, CLMSUI.loadSpectra.lastRequestedID);
			if (!ignoreResultUnlessLastRequested || (json && json.annotation && json.annotation.psmID && json.annotation.psmID === CLMSUI.loadSpectra.lastRequestedID)) {
				d3.select("#range-error").text ("");
				spectrumModel.set ({JSONdata: json, match: match, randId: randId});
			}
        }
    });
};

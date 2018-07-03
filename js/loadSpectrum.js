var CLMSUI = CLMSUI || {};
var xiSPEC = xiSPEC || {};

//TODO - rename to loadSpectrum
CLMSUI.loadSpectra = function (match, randId, spectrumModel, ignoreResultUnlessLastRequested) {

    var formatted_data = {};

    formatted_data.sequence1 = match.matchedPeptides[0].seq_mods;
    formatted_data.linkPos1 = match.linkPos1 - 1;
    if (match.matchedPeptides[1]) {
        formatted_data.sequence2 = match.matchedPeptides[1].seq_mods;
        formatted_data.linkPos2 = match.linkPos2 - 1;
    }
    formatted_data.crossLinkerModMass = match.crossLinkerModMass()
    formatted_data.modifications = xiSPEC.SpectrumModel.knownModifications;
    formatted_data.precursorCharge = match.precursorCharge;
    formatted_data.fragmentTolerance = match.fragmentTolerance();

    var ions = match.ionTypes();
    formatted_data.ionTypes = ions.map(function(ion){ return ion.type.replace("Ion", "")}).join(';')
    formatted_data.precursorMZ = match.expMZ();

    console.log("loadSpectra match:" + match.id);

    //TODO: ignoreResultUnlessLastRequested reimplementation
    d3.text ('../CLMS-model/php/peakList.php?sid='+match.searchId+'-'+randId+'&spid='+match.spectrumId, function(error, text) {
            if (error) {
                console.log ("error getting peak list", error);
            } else {
                formatted_data.peaklist = JSON.parse(text).map(function(p){ return [p.mz, p.intensity]; });
                console.log(formatted_data);
                xiSPEC.setData(formatted_data);
            }
    });

    // var xiAnnotRoot = CLMSUI.xiAnnotRoot || "";
    //
    // var url = xiAnnotRoot + "annotate/"
    //     + match.searchId + "/" + (randId || "12345") + "/" + match.id
    //     + "/?peptide=" + match.matchedPeptides[0].seq_mods
    //     + ((match.matchedPeptides[1])? ("&peptide=" + match.matchedPeptides[1].seq_mods) : "")
    //     + ((match.linkPos1)? ("&link=" + match.linkPos1) : "")
    //     + ((match.linkPos2)? ("&link=" + match.linkPos2) : "")
    // ;
    //
	// CLMSUI.loadSpectra.lastRequestedID = match.id;
    //
    // d3.json (url, function(error, json) {
    //     if (error) {
    //         console.log ("error", error, "for", url);
    //         d3.select("#range-error").text ("Cannot load spectra from URL");
    //         spectrumModel.clear();
    //     } else {
	// 		//console.log ("ann json", json);
	// 		//console.log (json.annotation.psmID, CLMSUI.loadSpectra.lastRequestedID);
	// 		if (!ignoreResultUnlessLastRequested || (json && json.annotation && json.annotation.psmID && json.annotation.psmID === CLMSUI.loadSpectra.lastRequestedID)) {
	// 			d3.select("#range-error").text ("");
	// 			spectrumModel.set ({JSONdata: json, match: match, randId: randId});
	// 		}
    //     }
    // });
};

var CLMSUI = CLMSUI || {};

CLMSUI.loadSpectra = function (match, randId, spectrumModel) {
    
    var xiAnnotRoot = CLMSUI.xiAnnotRoot || "";

    var url = xiAnnotRoot + "/xiAnnotator/annotate/"
        + match.searchId + "/" + (randId || "12345") + "/" + match.id 
        + "/?peptide=" + match.matchedPeptides[0].seq_mods 
        + ((match.matchedPeptides[1])? ("&peptide=" + match.matchedPeptides[1].seq_mods) : "")
        + ((match.linkPos1)? ("&link=" + match.linkPos1) : "")
        + ((match.linkPos2)? ("&link=" + match.linkPos2) : "")
    ;
    
    d3.json (url, function(error, json) {
        if (error) {
            console.log ("error", error, "for", url);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
            d3.select("#range-error").text ("");
            spectrumModel.set ({JSONdata: json, match: match, randId: randId}); 
        }
    });
}; 
			
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

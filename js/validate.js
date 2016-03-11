var CLMSUI = CLMSUI || {};

CLMSUI.loadSpectra = function (match, randId, spectrumModel) {

    var url = "http://129.215.14.63/xiAnnotator/annotate/"
        + match.group + "/" + (randId || "12345") + "/" + match.id 
        + "/?peptide=" + match.pepSeq1raw 
        + "&peptide=" + match.pepSeq2raw
        + "&link=" + match.linkPos1
        + "&link=" + match.linkPos2
    ;
    
    d3.json (url, function(error, json) {
        if (error) {
            console.log ("error", error, "for", url);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
            spectrumModel.set ({JSONdata: json}); 
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
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
        linkSites[1] = {"id":0, "peptideId":1, "linkSite": match.linkPos2}
    }

    annotationRequest.Peptides = peptides;
    annotationRequest.LinkSite = [];//linkSites;

    annotationRequest.annotation = {};
    /*annotationRequest.annotation =  {
                                // "fragmentTolerance":{"tolerance":"0.01","unit":"Da"},
                                // "modifications":[
                                //     {"aminoAcids":["M"],"id":"oxidation","mass":"15.994915"}
                                //     //{"aminoAcids":["C"],"id":"carbamidomethyl","mass":"57.021465"},
                                //     //{"aminoAcids":["Q"],"id":"ammonia-loss","mass":"-17.026548"},
                                //     //{"aminoAcids":["A"],"id":"acetyl","mass":"42.010567"}
                                // ],
                                // "ions":[
                                //     {"type":"PeptideIon"},
                                //     {"type":"BIon"},
                                //     {"type":"YIon"}],
                                // "cross-linker":{"modMass":0},
                                // "precursorCharge":3,
                                // "precursorMZ":1102.9017300194,
                                // "custom":[""]
                            };
*/
    var fragTolArr = match.spectrum.ft.split(" ");
    annotationRequest.annotation.fragmentTolerance = {"tolerance":+fragTolArr[0], "unit":fragTolArr[1]};

    // //todo modifications
    annotationRequest.annotation.modifications = CLMSUI.compositeModelInst.get('clmsModel').get('modifications');
//[
    //    {"aminoAcids":["M"],"id":"oxidation","mass":"15.994915"}
    //     //{"aminoAcids":["C"],"id":"carbamidomethyl","mass":"57.021465"},
    //     //{"aminoAcids":["Q"],"id":"ammonia-loss","mass":"-17.026548"},
    //     //{"aminoAcids":["A"],"id":"acetyl","mass":"42.010567"}
//];



    //annotationRequest.annotation.modifications = [{aminoAcids: ["M"], id: "oxidation", mass: "15.994915"}];

    var ionTypes = match.ions.split(";");
    var ionTypeCount = ionTypes.length;
    var ions = [];
    for (var it = 0; it < ionTypeCount; it++) {
        var ionType = ionTypes[it];
        ions.push({"type": (ionType.charAt(0).toUpperCase() + ionType.slice(1) + "Ion")});
    }
    annotationRequest.annotation.ions = ions;

    var crossLinker = {};
    crossLinker.modMass = 0;//+match.matchedPeptides[0].clModMass;
    annotationRequest.annotation["cross-linker"] = crossLinker; // yuk
    //
    annotationRequest.annotation.precursorCharge = +match.precursorCharge;
    annotationRequest.annotation.precursorMZ = +match.expMZ;
    annotationRequest.annotation.custom = [""];



    //var annotationRequest = CLMSUI.convert_to_json_request(match);

    d3.text ('./php/getPeakList.php?uid='+match.searchId+'&spid='+match.spectrumId, function(error, text) {
        if (error) {
            console.log ("error getting peak list", error);
            d3.select("#range-error").text ("Cannot load spectra from URL");
            spectrumModel.clear();
        } else {
            //console.log ("peakList:", text);
            var peakJson = [];
            var peaks = text.split('\n');
            var peakCount = peaks.length;
            for (var p = 0; p < peakCount; p++) {
                var peak = peaks[p].trim();
                if (peak != ""){
                    peakParts = peak.split(/\s+/);
                    peakJson.push({"mz":+peakParts[0], "intensity":+peakParts[1]})
                }
            }
            annotationRequest.peaks = peakJson;

            annotationRequestJson = JSON.stringify(annotationRequest)
            console.log(annotationRequestJson);

    		var response = $.ajax({
    			type: "POST",
    			headers: {
    			    'Accept': 'application/json',
    			    'Content-Type': 'application/json'
    			},
    			data: /*JSON.stringify({
                    "Peptides":
                        [{"sequence":
                            [{"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"T","Modification":""},
                            {"aminoAcid":"I","Modification":""},
                            {"aminoAcid":"L","Modification":""},
                            {"aminoAcid":"N","Modification":""},
                            {"aminoAcid":"T","Modification":""},
                            {"aminoAcid":"D","Modification":""},
                            {"aminoAcid":"I","Modification":""},
                            {"aminoAcid":"D","Modification":""},
                            {"aminoAcid":"G","Modification":""},
                            {"aminoAcid":"D","Modification":""},
                            {"aminoAcid":"G","Modification":""},
                            {"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"S","Modification":""},
                            {"aminoAcid":"E","Modification":""},
                            {"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"A","Modification":""},
                            {"aminoAcid":"A","Modification":""},
                            {"aminoAcid":"S","Modification":""},
                            {"aminoAcid":"G","Modification":""},
                            {"aminoAcid":"E","Modification":""},
                            {"aminoAcid":"N","Modification":""},
                            {"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"Q","Modification":""},
                            {"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"Q","Modification":""},
                            {"aminoAcid":"V","Modification":""},
                            {"aminoAcid":"I","Modification":""},
                            {"aminoAcid":"A","Modification":""},
                            {"aminoAcid":"H","Modification":""},
                            {"aminoAcid":"G","Modification":""},
                            {"aminoAcid":"A","Modification":""},
                            {"aminoAcid":"K","Modification":""}
                        ]}],
                        "LinkSite":[],
                        "peaks":[
                            {"mz":227.17424,"intensity":20800},
                            {"mz":228.13336,"intensity":19650},
                            {"mz":244.09386,"intensity":3174},
                            {"mz":251.17549,"intensity":16580},
                            {"mz":269.18515,"intensity":5319},
                            {"mz":272.1724,"intensity":3247},
                            {"mz":275.17096,"intensity":39330},
                            {"mz":293.1127,"intensity":4215},
                            {"mz":296.19647,"intensity":323800},
                            {"mz":311.1711,"intensity":4737},
                            {"mz":314.20578,"intensity":105000},
                            {"mz":316.14978,"intensity":5239},
                            {"mz":328.22247,"intensity":24420},
                            {"mz":329.18234,"intensity":15120},
                            {"mz":331.1247,"intensity":12130},
                            {"mz":333.18777,"intensity":5266},
                            {"mz":341.21317,"intensity":27010},
                            {"mz":387.1907,"intensity":5461},
                            {"mz":394.2186,"intensity":3804},
                            {"mz":397.24362,"intensity":4058},
                            {"mz":399.29642,"intensity":41910},
                            {"mz":400.18384,"intensity":4005},
                            {"mz":409.28198,"intensity":5474},
                            {"mz":410.2396,"intensity":17640},
                            {"mz":412.22974,"intensity":49590},
                            {"mz":422.15475,"intensity":6327},
                            {"mz":424.25403,"intensity":3225},
                            {"mz":426.19513,"intensity":3989},
                            {"mz":427.29068,"intensity":69520},
                            {"mz":428.24533,"intensity":5014},
                            {"mz":442.26376,"intensity":17540},
                            {"mz":444.21112,"intensity":35430},
                            {"mz":454.2286,"intensity":3395},
                            {"mz":458.2256,"intensity":4403},
                            {"mz":478.2976,"intensity":2871},
                            {"mz":483.26703,"intensity":81450},
                            {"mz":487.27777,"intensity":9455},
                            {"mz":493.27426,"intensity":2968},
                            {"mz":496.314,"intensity":13910},
                            {"mz":507.29416,"intensity":10300},
                            {"mz":511.2891,"intensity":5917},
                            {"mz":517.2927,"intensity":4331},
                            {"mz":523.3244,"intensity":13650},
                            {"mz":529.2972,"intensity":13050},
                            {"mz":539.2801,"intensity":5446},
                            {"mz":540.26666,"intensity":10900},
                            {"mz":541.3345,"intensity":31960},
                            {"mz":557.293,"intensity":23540},
                            {"mz":559.2333,"intensity":4680},
                            {"mz":579.35156,"intensity":4655},
                            {"mz":596.3508,"intensity":55340},
                            {"mz":606.3558,"intensity":11710},
                            {"mz":618.3615,"intensity":3390},
                            {"mz":623.2927,"intensity":3104},
                            {"mz":624.36755,"intensity":14870},
                            {"mz":627.2978,"intensity":4271},
                            {"mz":629.2867,"intensity":3946},
                            {"mz":640.3273,"intensity":3823},
                            {"mz":642.34546,"intensity":26040},
                            {"mz":644.2907,"intensity":10900},
                            {"mz":653.3464,"intensity":3441},
                            {"mz":654.2943,"intensity":3312},
                            {"mz":660.24945,"intensity":5354},
                            {"mz":670.3743,"intensity":4916},
                            {"mz":672.2993,"intensity":4395},
                            {"mz":673.3319,"intensity":4053},
                            {"mz":685.391,"intensity":3392},
                            {"mz":686.3092,"intensity":3614},
                            {"mz":695.4169,"intensity":34640},
                            {"mz":696.87964,"intensity":4199},
                            {"mz":713.2826,"intensity":3944},
                            {"mz":715.32635,"intensity":3842},
                            {"mz":722.37415,"intensity":3317},
                            {"mz":731.2926,"intensity":11850},
                            {"mz":736.3782,"intensity":3339},
                            {"mz":739.3962,"intensity":22070},
                            {"mz":755.3209,"intensity":3957},
                            {"mz":757.4133,"intensity":45990},
                            {"mz":759.3073,"intensity":9394},
                            {"mz":768.371,"intensity":3657},
                            {"mz":773.33075,"intensity":14460},
                            {"mz":785.4208,"intensity":16350},
                            {"mz":786.4505,"intensity":21310},
                            {"mz":812.3438,"intensity":4744},
                            {"mz":823.479,"intensity":79100},
                            {"mz":827.3543,"intensity":13190},
                            {"mz":835.4567,"intensity":4642},
                            {"mz":842.3789,"intensity":3765},
                            {"mz":844.3779,"intensity":5935},
                            {"mz":852.4824,"intensity":19980},
                            {"mz":856.4182,"intensity":3585},
                            {"mz":865.1584,"intensity":3617},
                            {"mz":869.3585,"intensity":5511},
                            {"mz":870.4885,"intensity":13720},
                            {"mz":872.41675,"intensity":3884},
                            {"mz":874.51807,"intensity":14100},
                            {"mz":875.53186,"intensity":31900},
                            {"mz":883.37305,"intensity":3821},
                            {"mz":887.37756,"intensity":11740},
                            {"mz":899.5178,"intensity":16830},
                            {"mz":901.3962,"intensity":12100},
                            {"mz":909.3933,"intensity":4494},
                            {"mz":922.5426,"intensity":45470},
                            {"mz":927.4204,"intensity":5121},
                            {"mz":943.45404,"intensity":4028},
                            {"mz":944.4395,"intensity":11010},
                            {"mz":953.9981,"intensity":5515},
                            {"mz":954.51514,"intensity":17060},
                            {"mz":955.1484,"intensity":4161},
                            {"mz":955.4593,"intensity":17320},
                            {"mz":967.5183,"intensity":4689},
                            {"mz":968.4765,"intensity":8414},
                            {"mz":970.41315,"intensity":4559},
                            {"mz":980.4713,"intensity":4115},
                            {"mz":983.4351,"intensity":4146},
                            {"mz":985.514,"intensity":20040},
                            {"mz":987.166,"intensity":4500},
                            {"mz":996.5011,"intensity":5312},
                            {"mz":1000.47144,"intensity":4867},
                            {"mz":1001.4468,"intensity":5481},
                            {"mz":1014.4662,"intensity":4824},
                            {"mz":1030.063,"intensity":4597},
                            {"mz":1033.5784,"intensity":15720},
                            {"mz":1036.5221,"intensity":4724},
                            {"mz":1038.5918,"intensity":13050},
                            {"mz":1039.5505,"intensity":5180},
                            {"mz":1040.4868,"intensity":5135},
                            {"mz":1050.6074,"intensity":87600},
                            {"mz":1054.5287,"intensity":4691},
                            {"mz":1064.522,"intensity":10760},
                            {"mz":1066.5436,"intensity":5825},
                            {"mz":1071.5023,"intensity":11950},
                            {"mz":1072.0369,"intensity":11030},
                            {"mz":1083.5255,"intensity":14170},
                            {"mz":1084.5848,"intensity":11680},
                            {"mz":1087.513,"intensity":4489},
                            {"mz":1091.5411,"intensity":12540},
                            {"mz":1102.6582,"intensity":763500},
                            {"mz":1104.6326,"intensity":50060},
                            {"mz":1109.5304,"intensity":5616},
                            {"mz":1149.6826,"intensity":29390},
                            {"mz":1153.0793,"intensity":16630},
                            {"mz":1153.5541,"intensity":5386},
                            {"mz":1157.5698,"intensity":10350},
                            {"mz":1159.5204,"intensity":6066},
                            {"mz":1178.5565,"intensity":5457},
                            {"mz":1196.5807,"intensity":10130},
                            {"mz":1202.5265,"intensity":10650},
                            {"mz":1210.1049,"intensity":9569},
                            {"mz":1214.5948,"intensity":11880},
                            {"mz":1216.5828,"intensity":5751},
                            {"mz":1238.5608,"intensity":5378},
                            {"mz":1262.6144,"intensity":5898},
                            {"mz":1263.7147,"intensity":60570},
                            {"mz":1267.618,"intensity":12550},
                            {"mz":1295.6571,"intensity":20660},
                            {"mz":1313.6515,"intensity":22430},
                            {"mz":1315.6284,"intensity":10560},
                            {"mz":1351.6499,"intensity":5675},
                            {"mz":1387.5988,"intensity":10820},
                            {"mz":1392.749,"intensity":17030},
                            {"mz":1400.653,"intensity":9328},
                            {"mz":1449.7798,"intensity":108700},
                            {"mz":1480.7327,"intensity":11070},
                            {"mz":1483.7665,"intensity":13860},
                            {"mz":1488.242,"intensity":15690},
                            {"mz":1511.7278,"intensity":11810},
                            {"mz":1518.786,"intensity":5757},
                            {"mz":1520.7909,"intensity":5626},
                            {"mz":1524.7211,"intensity":5890},
                            {"mz":1536.8093,"intensity":139900},
                            {"mz":1590.8286,"intensity":12970},
                            {"mz":1607.8494,"intensity":108000},
                            {"mz":1610.7881,"intensity":16630},
                            {"mz":1611.7611,"intensity":10470},
                            {"mz":1629.7859,"intensity":13400},
                            {"mz":1678.884,"intensity":133300},
                            {"mz":1682.8335,"intensity":11340},
                            {"mz":1764.8334,"intensity":14390},
                            {"mz":1765.8116,"intensity":10780},
                            {"mz":1777.9615,"intensity":51090},
                            {"mz":1869.9645,"intensity":10710},
                            {"mz":1907.0026,"intensity":13530},
                            {"mz":1994.0314,"intensity":105400},
                            {"mz":2093.0781,"intensity":13360},
                            {"mz":2150.1167,"intensity":83610},
                            {"mz":2185.98,"intensity":34740},
                            {"mz":2265.144,"intensity":22320},
                            {"mz":2322.1648,"intensity":119100},
                            {"mz":2420.1946,"intensity":27430},
                            {"mz":2437.1992,"intensity":141000},
                            {"mz":2532.2952,"intensity":14480},
                            {"mz":2550.2944,"intensity":72720},
                            {"mz":2647.2693,"intensity":14590},
                            {"mz":2651.5122,"intensity":11560},
                            {"mz":2665.3186,"intensity":86970},
                            {"mz":2748.3582,"intensity":17910},
                            {"mz":2750.3118,"intensity":29450},
                            {"mz":2766.359,"intensity":115700},
                            {"mz":2801.3896,"intensity":4327},
                            {"mz":2844.3794,"intensity":14770},
                            {"mz":2862.4067,"intensity":38550},
                            {"mz":2880.3887,"intensity":164700},
                            {"mz":2975.4998,"intensity":17960},
                            {"mz":2976.4539,"intensity":36740},
                            {"mz":2993.4858,"intensity":59820},
                            {"mz":3089.5176,"intensity":19450},
                            {"mz":3106.5696,"intensity":12920},
                            {"mz":3288.598,"intensity":10860},
                            {"mz":3290.6553,"intensity":37260}
                        ],
                        "annotation":{
                            "fragmentTolerance":{"tolerance":"0.01","unit":"Da"},
                            "modifications":[
                                {"aminoAcids":["M"],"id":"oxidation","mass":"15.994915"},
                                {"aminoAcids":["C"],"id":"carbamidomethyl","mass":"57.021465"},
                                {"aminoAcids":["Q"],"id":"ammonia-loss","mass":"-17.026548"},
                                {"aminoAcids":["A"],"id":"acetyl","mass":"42.010567"}
                            ],
                            "ions":[
                                {"type":"PeptideIon"},
                                {"type":"BIon"},
                                {"type":"YIon"}],
                            "cross-linker":{"modMass":0},
                            "precursorCharge":3,
                            "precursorMZ":1102.9017300194,
                            "custom":[""]
                        }
                }),*/
                JSON.stringify(annotationRequest),
    			async: false,
    			url: xiAnnotRoot + "annotate/FULL",
    			success: function(data) {
    				//ToDo: Error handling -> talked to Lutz, he will implement transfer of error message as json
    				console.log("annotation response:", data);
    				spectrumModel.set({"JSONdata": data, match: match, randId: randId});
    				//self.setData();

    				// if (self.otherModel !== undefined){
    				// 	var json_data_copy = jQuery.extend({}, data);
    				// 	self.otherModel.set({"JSONdata": json_data_copy, "JSONrequest": json_request});
    				// 	self.otherModel.trigger("change:JSONdata");
    				// }
    				//self.trigger('request_annotation:done');
    			}
    		});

            /*var url = xiAnnotRoot + "annotate/" + annotationRequestJson;

            console.log("URL!:", url)

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
            */
        }
    });
};
/*
xiSPEC.convert_to_json_request = function (data) {

    // defaults
    if(data.ionTypes === undefined){
        data.ionTypes = "peptide;b;y";
    }
    if(data.crossLinkerModMass === undefined){
        data.crossLinkerModMass = 0;
    }
    if(data.modifications === undefined){
        data.modifications = [];
    }
    if(data.fragmentTolerance === undefined){
        data.fragmentTolerance = {"tolerance": '20.0', 'unit': 'ppm'};
    }


    var annotationRequest = {};
    var peptides = [];
    var linkSites = [];
    peptides[0] = CLMSUI.arrayifyPeptide(data.sequence1);

    if(data.linkPos1 !== undefined){
        linkSites[0] = {"id":0, "peptideId":0, "linkSite": data.linkPos1};
    }
    if (data.sequence2 !== undefined) {
        peptide[1] = xiSPEC.arrayifyPeptide(data.sequence2);
        linkSites[1] = {"id":0, "peptideId":1, "linkSite": data.linkPos1}
    }

    var peaks = [];
    for (var i = 0; i < data.peaklist.length; i++) {
        peaks.push(
            {"intensity": data.peaklist[i][1], "mz": data.peaklist[i][0]}
        );
    }

    annotationRequest.Peptides = peptides;
    annotationRequest.LinkSite = linkSites;
    annotationRequest.peaks = peaks;
    annotationRequest.annotation = {};

    var ionTypes = data.ionTypes.split(";");
    var ionTypeCount = ionTypes.length;
    var ions = [];
    for (var it = 0; it < ionTypeCount; it++) {
        var ionType = ionTypes[it];
        ions.push({"type": (ionType.charAt(0).toUpperCase() + ionType.slice(1) + "Ion")});
    }
    annotationRequest.annotation.fragmentTolerance = data.fragmentTolerance;
    annotationRequest.annotation.modifications = data.modifications;
    annotationRequest.annotation.ions = ions;
    annotationRequest.annotation["cross-linker"] = {'modMass': data.crossLinkerModMass}; // yuk
    annotationRequest.annotation.precursorMZ = data.precursorMZ;
    annotationRequest.annotation.precursorCharge = data.precursorCharge;
    annotationRequest.annotation.custom = [];

    console.log("request", annotationRequest);
    return annotationRequest;

};*/

CLMSUI.arrayifyPeptide = function (seq_mods) {
    var peptide = {};
    peptide.sequence = [];

    var seq_AAonly = seq_mods.replace(/[^A-Z]/g, '')
    var seq_length = seq_AAonly.length;

    for (var i = 0; i < seq_length; i++) {
        peptide.sequence[i] = {"aminoAcid":seq_AAonly[i], "Modification":"" }
    }

    var re = /[^A-Z]+/g;
    var offset = 1;
    var result;
    while (result = re.exec(seq_mods)) {
        console.log(result);
        peptide.sequence[result.index - offset]["Modification"] = result[0];
        offset += result[0].length;
    }
    return peptide;
}

/*
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
*/

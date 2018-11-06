if (importScripts) {
	importScripts ("bioseq32.js", "../../vendor/js/workerpool.js");
}

function protAlignPar (protID, settings, compSeqArray, tempSemiLocal) {
	
	var fullResults = compSeqArray.map (function (cSeq) {
		var alignWindowSize = (settings.refSeq.length > settings.maxAlignWindow ? settings.maxAlignWindow : undefined);
		var localAlign = (tempSemiLocal && tempSemiLocal.local);
		var semiLocalAlign = (tempSemiLocal && tempSemiLocal.semiLocal);
		return CLMSUI.GotohAligner.align (cSeq, settings.refSeq, settings.scoringSystem, !!localAlign, !!semiLocalAlign, alignWindowSize);
	});

	return {fullResults: fullResults, protID: protID};
}

// create a worker and register public functions
workerpool.worker ({
	protAlignPar: protAlignPar
});

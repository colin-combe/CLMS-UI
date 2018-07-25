function callback (model) {
	console.log ("model", model);
	var clmsModel = model.get("clmsModel");
	
	QUnit.start();

	QUnit.module ("Parsing");
	QUnit.test("JSON to Model Parsing", function (assert) {
		var expectedLinks = 162;
		var expectedMatches = 291;
		assert.deepEqual(clmsModel.get("crossLinks").size, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" crosslinks, Passed!");
		assert.deepEqual(clmsModel.get("matches").length, expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" matches, Passed!");
	});
	
	QUnit.module ("Filtering");
	QUnit.test("Filter testing", function (assert) {
		var expectedLinks = 5;
		model.get("filterModel").set ({
			decoys: false,
			betweenLinks: true,
			A: true,
			B: true,
			C: true,
			Q: true,
			AUTO: false,
			ambig: false,
			linears: false,
			matchScoreCutoff: [undefined, undefined],
			pepLength: 0,
		});
		// changes to filtermodel changes getFilteredCrossLinks contents via backbone event
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks, Passed!");
		
		expectedLinks = 162;
		model.get("filterModel").set ({AUTO: true});
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks with adding auto=true, Passed!");
		
		expectedLinks = 156;
		model.get("filterModel").set ({pepLength: 6});
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks with adding peplength=6, Passed!");
	});
	
	
	
	QUnit.module ("Selecting", {
		beforeEach : function () {
			model.get("filterModel").set ({AUTO: true}, {pepLength: 0});
			model.setMarkedCrossLinks ("selection", [], false, false, false);	// Tidy up. Clear selection.
		}
	});
	// 3 cross links
	// 2000171_1-2000171_11 has 1 match
	// 2000171_415-2000171_497 has 2 matches
	// 2000171_190-2000171_425 has 17 matches (2 of which are marked rejected and don't pass filter)
	// 20 matches in total (18 will pass minimal filter state)
	
	QUnit.test("Empty selection testing", function (assert) {
		var expectedLinks = 0;
		var expectedMatches = 0;
		model.setMarkedCrossLinks ("selection", [], false, false, false);
		assert.deepEqual(model.getMarkedCrossLinks("selection").length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" selected crosslinks on setting empty crosslink selection, Passed!");
		assert.deepEqual(model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches on setting empty crosslink selection, Passed!");
		
		model.setMarkedMatches ("selection", [], false, false, false);
		assert.deepEqual(model.getMarkedCrossLinks("selection").length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" selected crosslinks on setting empty match selection, Passed!");
		assert.deepEqual(model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches on setting empty match selection, Passed!");
	});
	
	QUnit.test("Cross-link Selection testing", function (assert) {
		var expectedLinks = 3;
		var expectedMatches = 18;
		var crossLinks = clmsModel.get("crossLinks");
		var selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_415-2000171_497"), crossLinks.get("2000171_190-2000171_425")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, false, false);
		
		assert.deepEqual(model.getMarkedCrossLinks("selection").length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" selected crosslinks on setting 3 crosslinks selection, Passed!");
		assert.deepEqual(model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches on setting 3 crosslinks selection, Passed!");
	});
	
	QUnit.test("Match Selection testing", function (assert) {
		var expectedLinks = 2;
		var expectedMatches = 3;
		var crossLinks = clmsModel.get("crossLinks");
		var selectedMatches = d3.merge ([crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,1), crossLinks.get("2000171_190-2000171_425").matches_pp.slice(0,2)]);
		model.setMarkedMatches ("selection", selectedMatches, false, false, false);
		
		assert.deepEqual(model.getMarkedCrossLinks("selection").length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" selected crosslinks on setting 3 matches selection, Passed!");
		assert.deepEqual(model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches on setting 3 matches selection, Passed!");
	});
	
	QUnit.test("Adding Cross-link selection to prior Cross-link Selection testing", function (assert) {
		var expectedLinkIDs = ["2000171_415-2000171_497", "2000171_190-2000171_425"].sort();
		var expectedMatches = 17;
		var crossLinks = clmsModel.get("crossLinks");
		
		var selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_415-2000171_497")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, false, false);
		
		selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_190-2000171_425")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, true, false);	// add to existing selection
		
		assert.deepEqual(_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual(model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches, Passed!");
	});
	
	
	QUnit.test("Adding Match Selection to prior Match Selection testing", function (assert) {
		var expectedLinkIDs = ["2000171_415-2000171_497", "2000171_190-2000171_425"].sort();
		var expectedMatchIDs = [625825062, 625825067, 625825068, 625826126].sort();
		var crossLinks = clmsModel.get("crossLinks");
		
		var selectedMatches = d3.merge ([crossLinks.get("2000171_1-2000171_11").matches_pp.slice(0,1), crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,2), crossLinks.get("2000171_190-2000171_425").matches_pp.slice(0,2)]);
		model.setMarkedMatches ("selection", selectedMatches, false, false, false);
		
		selectedMatches = d3.merge ([
			crossLinks.get("2000171_1-2000171_11").matches_pp.slice(0,1), 
			crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,1), 
			crossLinks.get("2000171_190-2000171_425").matches_pp.slice(1,4)
		]);
		model.setMarkedMatches ("selection", selectedMatches, false, true, false);	// add to existing selection
		
		assert.deepEqual(_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual(_.pluck(model.getMarkedMatches("selection").values(), "id").sort(), expectedMatchIDs, "Expected "+JSON.stringify(expectedMatchIDs)+" selected matches, Passed!");
	});
	
	
	QUnit.test("Adding Match Selection to prior Cross-link Selection testing", function (assert) {
		var expectedLinkIDs = ["2000171_415-2000171_497", "2000171_190-2000171_425"].sort();
		var expectedMatches = 4;	// Two of 2000171_190-2000171_425 matches are marked rejected and don't pass filter
		var crossLinks = clmsModel.get("crossLinks");
		
		var selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_415-2000171_497")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, false, false);
		
		var selectedMatches = d3.merge ([
			crossLinks.get("2000171_1-2000171_11").matches_pp.slice(0,1), 
			crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,1), 
			crossLinks.get("2000171_190-2000171_425").matches_pp.slice(1,4)
		]);
		model.setMarkedMatches ("selection", selectedMatches, false, true, false);	// add to existing selection
		
		assert.deepEqual (_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual (model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches, Passed!");
	});
	
	QUnit.test("Adding Cross-Link Selection to prior Match Selection testing", function (assert) {
		var expectedLinkIDs = ["2000171_415-2000171_497", "2000171_190-2000171_425"].sort();
		var expectedMatches = 17;
		var crossLinks = clmsModel.get("crossLinks");
		
		var selectedMatches = d3.merge ([crossLinks.get("2000171_1-2000171_11").matches_pp.slice(0,1), crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,2)]);
		model.setMarkedMatches ("selection", selectedMatches, false, false, false);
		
		var selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_190-2000171_425")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, true, false);	// add to existing selection
		
		assert.deepEqual (_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual (model.getMarkedMatches("selection").size(), expectedMatches, "Expected "+JSON.stringify(expectedMatches)+" selected matches, Passed!");
	});
	
	QUnit.test("Adding no Cross-Links to prior Cross-link Selection testing", function (assert) {	
		var crossLinks = clmsModel.get("crossLinks");
		var selectedLinks = [crossLinks.get("2000171_1-2000171_11"), crossLinks.get("2000171_415-2000171_497")];
		model.setMarkedCrossLinks ("selection", selectedLinks, false, false, false);
		var expectedLinkIDs = _.pluck (model.getMarkedCrossLinks("selection"), "id").sort();
		var expectedMatchIDs = _.pluck (model.getMarkedMatches("selection").values(), "id").sort();
		
		model.setMarkedCrossLinks ("selection", [], false, true, false);	// add to existing selection
		
		assert.deepEqual (_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual (_.pluck(model.getMarkedMatches("selection").values(), "id").sort(), expectedMatchIDs, "Expected "+JSON.stringify(expectedMatchIDs)+" selected matches, Passed!");
	});
	
	QUnit.test("Adding no Matches to prior Match Selection testing", function (assert) {
		var crossLinks = clmsModel.get("crossLinks");
		var selectedMatches = d3.merge ([crossLinks.get("2000171_1-2000171_11").matches_pp.slice(0,1), crossLinks.get("2000171_415-2000171_497").matches_pp.slice(0,1)]);
		model.setMarkedMatches ("selection", selectedMatches, false, false, false);
		var expectedLinkIDs = _.pluck (model.getMarkedCrossLinks("selection"), "id").sort();
		var expectedMatchIDs = _.pluck (model.getMarkedMatches("selection").values(), "id").sort();
		
		model.setMarkedMatches ("selection", [], false, true, false);	// add to existing selection
		
		assert.deepEqual (_.pluck(model.getMarkedCrossLinks("selection"), "id").sort(), expectedLinkIDs, "Expected "+JSON.stringify(expectedLinkIDs)+" selected crosslinks, Passed!");
		assert.deepEqual (_.pluck(model.getMarkedMatches("selection").values(), "id").sort(), expectedMatchIDs, "Expected "+JSON.stringify(expectedMatchIDs)+" selected matches, Passed!");
	});
	
	
	QUnit.module ("NGL Selection Language");
	
	QUnit.test ("Generate Selection with range", function (assert) {
		var examples = [
			{data: undefined, expected: undefined},
			{data: [], expected: []},
			{data: ["7"], expected: ["7"]},
			{data: ["7", "9"], expected: ["7","9"]},
			{data: ["10", "11", "12", "13", "14", "15"], expected: ["10-15"]},
			{data: ["97", "98", "99", "100", "101"], expected: ["97-101"]},
			{data: ["12", "13", "14", "19", "20", "21", "234", "235", "236"], expected: ["12-14","19-21","234-236"]},
			{data: ["6", "22", "23", "24"], expected: ["6","22-24"]},
			{data: ["6", "7", "8", "22"], expected: ["6-8","22"]},
		];
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		examples.forEach (function (example) {
			var actualValue = stageModel.joinConsecutiveNumbersIntoRanges (example.data);
			assert.deepEqual (actualValue, example.expected, "Expected "+example.expected+" when mapping from "+example.data);
		})
	});
	
	QUnit.test ("Generate Single Residue Selection", function (assert) {
		
		var examples = [
			{data: {chainIndex: 0, resno: 282}, expected: "282:A.CA/0"},
			{data: {chainIndex: 1, resno: 281}, expected: "281:B.CA/0"},
		];
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var chainProxy = stageModel.get("structureComp").structure.getChainProxy();
		examples.forEach (function (example) {
			chainProxy.index = example.data.chainIndex;
			var actualValue = stageModel.makeResidueSelectionString (example.data.resno, chainProxy);
			assert.deepEqual (actualValue, example.expected, "Expected "+example.expected+" when mapping from "+JSON.stringify(example.data));
		})
	});
	
	QUnit.test ("Generate Nested Selection", function (assert) {
		
		var expectedValue = "(( /0 AND (( :A AND (107 OR 125 OR 131 OR 161-162 OR 190 OR 415 OR 425 OR 466 OR 497) ) OR ( :B AND (107 OR 125 OR 131 OR 161-162 OR 190 OR 415 OR 425 OR 466 OR 497) )) ) ) AND .CA";
		var data = [
			{"resindex":410,"residueId":0,"resno":415,"chainIndex":0,"structureId":null},{"resindex":492,"residueId":1,"resno":497,"chainIndex":0,"structureId":null},{"resindex":492,"residueId":2,"resno":497,"chainIndex":1,"structureId":null},{"resindex":410,"residueId":3,"resno":415,"chainIndex":1,"structureId":null},{"resindex":185,"residueId":4,"resno":190,"chainIndex":0,"structureId":null},{"resindex":420,"residueId":5,"resno":425,"chainIndex":0,"structureId":null},{"resindex":420,"residueId":6,"resno":425,"chainIndex":1,"structureId":null},{"resindex":185,"residueId":7,"resno":190,"chainIndex":1,"structureId":null},{"resindex":120,"residueId":8,"resno":125,"chainIndex":0,"structureId":null},{"resindex":156,"residueId":9,"resno":161,"chainIndex":0,"structureId":null},{"resindex":156,"residueId":10,"resno":161,"chainIndex":1,"structureId":null},{"resindex":120,"residueId":11,"resno":125,"chainIndex":1,"structureId":null},{"resindex":126,"residueId":12,"resno":131,"chainIndex":0,"structureId":null},{"resindex":157,"residueId":13,"resno":162,"chainIndex":0,"structureId":null},{"resindex":157,"residueId":14,"resno":162,"chainIndex":1,"structureId":null},{"resindex":126,"residueId":15,"resno":131,"chainIndex":1,"structureId":null},{"resindex":102,"residueId":16,"resno":107,"chainIndex":0,"structureId":null},{"resindex":461,"residueId":17,"resno":466,"chainIndex":0,"structureId":null},{"resindex":461,"residueId":18,"resno":466,"chainIndex":1,"structureId":null},{"resindex":102,"residueId":19,"resno":107,"chainIndex":1,"structureId":null}
		];
		
		var expectedValue2 = "(( /0 AND (( 415:A ) OR ( 497:B )) ) ) AND .CA";
		var expectedValue3 = "(( /0 AND (( 415:A ) OR ( 497:B )) ) )";
		var expectedValue4 = "(( /0 AND (:A OR :B) ) )";
		var data2 = [data[0], data[2]];
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		
		var actualValue = stageModel.getSelectionFromResidueList (data);
		assert.deepEqual (actualValue, expectedValue, "Expected "+expectedValue+" when mapping from "+JSON.stringify(data));
		
		actualValue = stageModel.getSelectionFromResidueList (data2);
		assert.deepEqual (actualValue, expectedValue2, "Expected "+expectedValue2+" when mapping from "+JSON.stringify(data2));
		
		actualValue = stageModel.getSelectionFromResidueList (data2, {allAtoms: true});
		assert.deepEqual (actualValue, expectedValue3, "Expected "+expectedValue3+" when mapping from "+JSON.stringify(data2)+" with option allAtoms");
		
		actualValue = stageModel.getSelectionFromResidueList (data2, {chainsOnly: true});
		assert.deepEqual (actualValue, expectedValue4, "Expected "+expectedValue4+" when mapping from "+JSON.stringify(data2)+" with option chainsOnly");
	});
	
	
	QUnit.module ("3D Distances");
	
	QUnit.test ("Mapping to PDB", function (assert) {
		var expectedMapping = [411, 493];
		
		var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
		var alignModel = alignCollection.get("2000171");
		var actualMapping = alignModel.bulkMapFromSearch ("1AO6:A:0", [415, 497]);
	
		assert.deepEqual (actualMapping, expectedMapping, "Expected "+expectedMapping+" when mapping from [415,497] to 1ao6 pdb indices, Passed!");
	});
	
	QUnit.test ("Mapping from PDB", function (assert) {
		var expectedMapping = [415, 497];
		
		var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
		var alignModel = alignCollection.get("2000171");
		var actualMapping = alignModel.bulkMapToSearch ("1AO6:A:0", [411, 493]);
	
		assert.deepEqual (actualMapping, expectedMapping, "Expected "+expectedMapping+" when mapping from pdb [411, 493] back to search indices, Passed!");
	});
	
	QUnit.test ("Chain Info", function (assert) {
		var expectedMapping = {viableChainIndices: [0,1], resCount: 1156};
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var actualMapping = stageModel.getChainInfo ();
	
		assert.deepEqual (actualMapping, expectedMapping, "Expected "+JSON.stringify(expectedMapping)+" chain info, Passed!");
	});
	
	QUnit.test ("C-Alpha Atom Selection String", function (assert) {
		var expectedMapping = ":A/0 AND 5-582.CA";
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var chainProxy = stageModel.get("structureComp").structure.getChainProxy();
		chainProxy.index = 0;
		var actualMapping = stageModel.getCAlphaAtomSelectionForChain (chainProxy);
	
		console.log ("SM", stageModel);
		
		assert.deepEqual (actualMapping, expectedMapping, "Expected "+expectedMapping+" NGL Selection String generated, Passed!");
	});
	
	QUnit.test ("C-Alpha Atom Indices [last 20]", function (assert) {
		var expectedMapping = {
			0: [4455, 4463, 4472, 4481, 4488, 4494, 4505, 4510, 4519, 4528, 4532, 4541, 4550, 4558, 4565, 4570, 4575, 4581, 4590, 4595],
			1: [9054, 9062, 9071, 9080, 9087, 9093, 9104, 9109, 9118, 9127, 9131, 9140, 9149, 9157, 9164, 9169, 9174, 9180, 9189, 9194]
		};	// last 20 in each
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var shortenThese = [0, 1];
		var actualMapping = $.extend({}, stageModel.calculateCAtomsAllResidues (shortenThese));	// copy object so as not to affect original (causes error)
		shortenThese.forEach (function (index) {
			actualMapping[index] = actualMapping[index].slice(-20);
		});
	
		assert.deepEqual (actualMapping, expectedMapping, "Expected "+JSON.stringify(expectedMapping)+" NGL C-Alpha atom indices, Passed!");
	});
	
	QUnit.test ("Single Cross-Link Distance validated on NGLViewer", function (assert) {
		var crossLinks = clmsModel.get("crossLinks");
		var singleCrossLink = crossLinks.get("2000171_415-2000171_497");
		var expectedDistance = 9.13;	// as measured on nglviewer (2 decimal places)
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		// -5 cos 4 difference in pdb / search alignments, and another 1 because this function is 0-indexed.
		var actualDistance = stageModel.getSingleDistanceBetween2Residues (415 - 5 , 497 - 5, 0, 0);	// 0 chain has slightly longer distance
		actualDistance = +(actualDistance.toFixed(2));
		
		assert.deepEqual (actualDistance, expectedDistance, "Expected "+expectedDistance+" distance (2 d.p.) for A chain 415-497 crosslink, Passed!");
	});
	
	QUnit.test ("Same Cross-Link Distance, different indexing methods 1", function (assert) {
		var crossLinks = clmsModel.get("crossLinks");
		var singleCrossLink = crossLinks.get("2000171_415-2000171_497");
		var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
		
		// this will be shortest distance of chain possibilities - 0-0, 0-1, 1-0, 1-1
		var actualDistance = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj").getXLinkDistance (singleCrossLink, alignCollection);
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		// -5 cos 4 difference in pdb / search alignments, and another 1 because this function is 0-indexed.
		var actualDistance2 = stageModel.getSingleDistanceBetween2Residues (415 - 5 , 497 - 5, 1, 1);	// 1 appears to be shortest distance
			
		assert.deepEqual (actualDistance, actualDistance2, "Expected "+actualDistance2+" distance in both methods (B chain 415-497 crosslink), Passed!");
	});
	
	QUnit.test ("Compare Link-Only Distance Generation with All Distance Generation", function (assert) {
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var crossLinks = stageModel.get("linkList");
		
		var matrices1 = stageModel.getChainDistances (true);
		var matrices2 = stageModel.getChainDistances (false);
		
		var list1 = [];
		var list2 = [];

		crossLinks.forEach (function (crossLink) {
			var chainIndex = crossLink.residueA.chainIndex + "-" + crossLink.residueB.chainIndex;
			list1.push (matrices1[chainIndex].distanceMatrix[crossLink.residueA.resindex][crossLink.residueB.resindex]);
			list2.push (matrices2[chainIndex].distanceMatrix[crossLink.residueA.resindex][crossLink.residueB.resindex]);
		});
		
		assert.deepEqual (list1, list2, "Expected "+list1.join(", ")+" distance (2 d.p.) for both link-only and all distance matrix link distances, Passed!");
	});
	
	
	QUnit.module ("Random Distance Generation");
	
	
	QUnit.test ("Calc Distanceable Sequence MetaData", function (assert) {
		var dseq = "SEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAA";
		var expectedValue = [
			{first: 5, last: 582, subSeq: dseq, chainIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq, chainIndex: 1, protID: "2000171", alignID: "1AO6:B:1"}
		];
		CLMSUI.utils.debug = true;
		
		var distObj = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj");
		var actualValue = distObj.calcDistanceableSequenceData ();
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as distanceable sequence metadata, Passed!");
	});
	
	
	QUnit.test ("Include Terminal Indices", function (assert) {
		var expected = {ntermList: [], ctermList: []};	// because pdb for 1ao6 is within the larger sequence so neither cterm nor nterm match
		CLMSUI.utils.debug = true;
		
		var clmsModel = CLMSUI.compositeModelInst.get("clmsModel");
		var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
		var alignID = CLMSUI.modelUtils.make3DAlignID ("1AO6", "A", 0);
        var seqRange = alignCollBB.getSearchRangeIndexOfMatches ("2000171", alignID);
		$.extend (seqRange, {alignID: alignID, chainIndex: 0, protID: "2000171"});
		var seqMap = d3.map ();
		seqMap.set ("2000171", {key: "2000171", values: [seqRange]});
		var alignedTerminalIndices = clmsModel.get("distancesObj").calcAlignedTerminalIndices (seqMap, clmsModel, alignCollBB);
		assert.deepEqual (alignedTerminalIndices, expected, "Expected "+JSON.stringify(expected)+" as end terminals out of PDB range, Passed!");
	});
	
	
	QUnit.test ("Sequence Filtering by Cross-Linkable Residues", function (assert) {
		var expected = [535, 536, 540, 552, 555, 559, 561, 568, 569, 574];	// last 10 KSTY
		var expected2 = [568, 569, 570, 571, 572, 573, 574, 575, 576, 577];	// last 10 everything
		CLMSUI.utils.debug = true;
		
		var searchArray = CLMS.arrayFromMapValues (CLMSUI.compositeModelInst.get("clmsModel").get("searches"));
		var residueSets = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray);
		var linkableResidues = residueSets["wrong mass SDA "].linkables;
		
		var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
		var alignID = CLMSUI.modelUtils.make3DAlignID ("1AO6", "A", 0);
        var seqRange = alignCollBB.getSearchRangeIndexOfMatches ("2000171", alignID);
		var filteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (seqRange.subSeq, linkableResidues[1], false);	// 1 is KSTY
		filteredSubSeqIndices = filteredSubSeqIndices.slice(-10);	// last 10
		
		assert.deepEqual (filteredSubSeqIndices, expected, "Expected "+expected.join(", ")+" as last 10 KSTY cross-linkable filtered sequence indices, Passed!");
		
		
		filteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (seqRange.subSeq, linkableResidues[0], false);	// 0 is everything
		filteredSubSeqIndices = filteredSubSeqIndices.slice(-10);	// last 10
		
		assert.deepEqual (filteredSubSeqIndices, expected2, "Expected "+expected2.join(", ")+" as last 10 everything cross-linkable filtered sequence indices, Passed!");
	});
	
	
	QUnit.test ("Calc Filtered Residue Points from Cross-linker Specificity", function (assert) {
		var expectedValue = [535, 536, 540, 552, 555, 559, 561, 568, 569, 574];	// last 10 KSTY
		expectedValue = expectedValue.map (function (v) {
			return {chainIndex: 1, protID: "2000171", resIndex: v+1, searchIndex: v+5}	// resindex 1-indexed, sdearchIndex 4 on from that, last 10 residues will be chain 1
		});
		CLMSUI.utils.debug = true;
		
		var searchArray = CLMS.arrayFromMapValues (CLMSUI.compositeModelInst.get("clmsModel").get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var dseq = "SEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAA";
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq, chainIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq, chainIndex: 1, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj");
		var actualValue = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
				console.log ("actualValue", actualValue);
		actualValue = actualValue[1]; // the KSTY & NTERM residues
		actualValue = actualValue.slice(-10);	// The last 10 values
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as last 10 KSTY cross-linkable filtered residue points, Passed!");
	});
	
	
	
	QUnit.test ("Random Distance Generation, 1 Search", function (assert) {
		var expectedValue = [];
		CLMSUI.utils.debug = true;
		
		var searchArray = CLMS.arrayFromMapValues (CLMSUI.compositeModelInst.get("clmsModel").get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var dseq = "SEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAA";
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq, chainIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq, chainIndex: 1, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
				console.log ("actualValue", actualValue);
		var randomDists = [];
		distObj.generateRandomDistancesBySearch (filteredResidueMap, randomDists, {hetero: true, perSearch: 100});
		var actualValue = randomDists;
		console.log ("randArr", actualValue);
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as random distances, Passed!");
	});
	
	
	
	/*
	QUnit.test ("Random Distance Generation", function (assert) {
		var expected = [];
		CLMSUI.utils.debug = true;
		
		var searchArray = CLMS.arrayFromMapValues (CLMSUI.compositeModelInst.get("clmsModel").get("searches"));
		var residueSets = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray);
		var distObj = CLMSUI.compositeModelInst.get("clmsModel").get("distancesObj");
		var randArr = distObj.getRandomDistances (10, d3.values (residueSets), {intraOnly: false});
		console.log ("randArr", randArr);
		
		assert.deepEqual (randArr, expected, "Expected "+expected.join(", ")+" as random distances, Passed!");
	});
	*/
	
}

function testSetupNew (cbfunc) {
	d3.json ("10003.json", function (options) {
		CLMSUI.vent.listenToOnce (CLMSUI.vent, "initialSetupDone", function () {
			CLMSUI.compositeModelInst.get("clmsModel").listenToOnce (CLMSUI.compositeModelInst.get("clmsModel"), "change:distancesObj", function () {
				console.log ("distances obj changed");
				cbfunc (CLMSUI.compositeModelInst);
			});
		
			var stage = new NGL.Stage ("ngl", {/*fogNear: 20, fogFar: 100,*/ backgroundColor: "white", tooltip: false});
			CLMSUI.modelUtils.repopulateNGL ({pdbCode: "1AO6", stage: stage, bbmodel: CLMSUI.compositeModelInst});
			console.log ("here");
		});
		
		options.blosumOptions = {url: "../R/blosums.json"};
		CLMSUI.init.pretendLoad();	// add 1 to allDataLoaded bar (we aren't loading views here)
		CLMSUI.init.models (options);
	});
}

function testSetup (cbfunc) {
	d3.json ("10003.json", function (options) {
		CLMSUI.init.modelsEssential (options);
		
		cbfunc (CLMSUI.compositeModelInst);
	});
}

testSetupNew (callback);
function callback (model) {
	console.log ("model", model);
	var clmsModel = model.get("clmsModel");
	CLMSUI.utils.debug = true;
	
	var dseq1AO6 = "SEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAA";
	
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
		model.get("filterModel").resetFilter().set ({AUTO: false});
		// changes to filtermodel changes getFilteredCrossLinks contents via backbone event
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks, Passed!");
		
		expectedLinks = 162;
		model.get("filterModel").set ({AUTO: true});
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks with adding auto=true, Passed!");
		
		expectedLinks = 156;
		model.get("filterModel").set ({pepLength: 6});
		assert.deepEqual(model.getFilteredCrossLinks().length, expectedLinks, "Expected "+JSON.stringify(expectedLinks)+" filtered crosslinks with adding peplength=6, Passed!");
        
        model.get("filterModel").resetFilter();
	});
	
	
	
	QUnit.module ("Selecting", {
		beforeEach : function () {
			model.get("filterModel").resetFilter().set ({AUTO: true}, {pepLength: 0});
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
	
	
	QUnit.module ("Alignment Tests");
    
    
    QUnit.test ("Scoring", function (assert) {
        var scoringSystem = {
            matrix: CLMSUI.blosumCollInst.get("Blosum100").attributes,
            match: 10, 
            mis: -6, 
            gapOpen: 10, 
            gapExt: 1,
            gapAtStart: 0
        };
        var refSeq = "ABCDEFGHIIKLMNNPQRSTTVWXYZ";
        
        var tests = [
            // * means any, X means missing
            {seq: "ABCDEFGHIIKLMNNPQRSTTVWXYZ", expScore: 251},
            {seq: "BCDEFGHIIKLMNNPQRSTTVWXYZ", expScore: 241},
            {seq: "BCDEFGHIIKLMNNPQRSTTVWXY", expScore: 235},
            {seq: "BCDETVWXY", expScore: 6 + 14 + 10 + 10 + -25 + 9 + 8 + 17 + -3 + 12},
            {seq: "ABCD", expScore: 38},
            {seq: "XYZ", expScore: 18},
            {seq: "Z", expScore: 7},   // in the blosum100 matrix Z matches to E (score:7) better than it matches to itself (6). Weird.
            {seq: "BCDH", expScore: 30 + 13 - 13},   // aligner puts in gap and matches H-H as H-H score (13) plus gap penalty (-13 = 0) exceeds E-H score (-2)
            {seq: "BCDY", expScore: 30 - 7},   // aligner goes for matching E-Y (-7) as gap penalty too long (30+) for Y-Y score (12) to recover from
            {seq: "BCDDEF", expScore: 6 + 14 + 10 + 10 + 11 - 11},   // aligner inserts gap (-11) in target to accommodate extra D
            {seq: "BCDDDDDDDDEF", expScore: 6 + 14 + 10 + 10 + 11 - 17},   // aligner inserts gap (-17) in target to accommodate lots of D's
            {seq: "BY", expScore: 12},   // aligner inserts B (no penalty as at start) and matches Y-Y
        ];
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var actual = tests.map (function (test) {
            return this.CLMSUI.GotohAligner.align (test.seq, refSeq, scoringSystem, false, true, 1000);
        });
        var actualScores = actual.map (function (v) { return v.res[0]; });
        var expectedScores = tests.map (function (v) { return v.expScore; });
        var fmts = actual.map (function (v) { return v.fmt[0]; });
        var cigars = actual.map (function (v) { return v.cigar; });
		assert.deepEqual (actualScores, expectedScores, "Expected "+JSON.stringify(expectedScores)+JSON.stringify(cigars)+JSON.stringify(fmts)+" when generating scores from bioseq32.js");
	});
	
	QUnit.test ("Sequence generation from PDB chains", function (assert) {
		var expected = [
			{chainName: "A", chainIndex: 0, modelIndex: 0, residueOffset: 0, data: dseq1AO6},
			{chainName: "B", chainIndex: 1, modelIndex: 0, residueOffset: 578, data: dseq1AO6},
		];
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var actual = CLMSUI.modelUtils.getChainSequencesFromNGLModel (stageModel.get("structureComp").stage);
		assert.deepEqual (actual, expected, "Expected "+JSON.stringify(expected)+" when generating sequences from `1AO6`");
	});
	
	
	QUnit.test ("Matrix pairings", function (assert) {
		var testMatrix = {    // E-values per search sequence per pdb id
			"1AO6": [0.01, 0.001, 1e-35],
			"1AO7": [1e-30, 1e-15, 1e-30],
			"1AO8": [1e-40, 1e-50, 1e-10],
		};
		var testSeqs = [{data: "ABCD"}, {data: "EFGH"}, {data: "IJKL"}];
		var expectedValue = [
			{id: "1AO8", seqObj: {data: "ABCD"}},
			{id: "1AO8", seqObj: {data: "EFGH"}},
			{id: "1AO6", seqObj: {data: "IJKL"}},
		];
		var actualValue = CLMSUI.modelUtils.matrixPairings (testMatrix, testSeqs);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as matrix pairing, Passed!");
	});
	
	
	QUnit.test ("Align test", function (assert) {
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var chainSequences = CLMSUI.modelUtils.getChainSequencesFromNGLModel (stageModel.get("structureComp").stage);
		var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
		var protAlignModel = alignCollection.get ("2000171");
        var actualValue = protAlignModel.alignWithoutStoring (
			chainSequences.map (function (cs) { return cs.data; }), 
			{semiLocal: true}
		).map (function (res) { return res.str; });	
		var expectedValue = ["score=5735; pos=0; cigar=4D578M3D\n", "score=5735; pos=0; cigar=4D578M3D\n"];
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as alignment result, Passed!");
	});
    
    
    QUnit.module ("NGL Model Wrapper");
	
    QUnit.test ("Divide protein to ngl chain mapping by intermediate model step", function (assert) {
		var data = {
            10001: [{modelIndex:1, chain: "A"}, {modelIndex:1, chain: "B"}, {modelIndex:2, chain: "C"}],
            10002: [{modelIndex:1, chain: "4"}]
        };
        var expectedValue = {
            10001: [{key: "1", values: [{modelIndex:1, chain: "A"}, {modelIndex:1, chain: "B"}]}, {key:"2", values: [{modelIndex:2, chain: "C"}]}],
            10002: [{key: "1", values: [{modelIndex:1, chain: "4"}]}]
        };
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
        var actualValue = stageModel.makeModelSubIndexedChainMap (data);
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" when mapping from "+JSON.stringify(data));
	});
    
	
	QUnit.module ("NGL Selection Language");
	
	QUnit.test ("Range Concatenation", function (assert) {
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
			assert.deepEqual (actualValue, example.expected, "Expected "+example.expected+" when concatenating "+example.data);
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
			{resindex:410, residueId:0, resno:415, chainIndex:0, structureId:null},{resindex:492, residueId:1, resno:497, chainIndex:0, structureId:null},{resindex:492, residueId:2, resno:497, chainIndex:1, structureId:null},{resindex:410, residueId:3, resno:415, chainIndex:1, structureId:null},{resindex:185, residueId:4, resno:190, chainIndex:0, structureId:null},{resindex:420, residueId:5, resno:425, chainIndex:0, structureId:null},{resindex:420, residueId:6, resno:425, chainIndex:1, structureId:null},{resindex:185, residueId:7, resno:190, chainIndex:1, structureId:null},{resindex:120, residueId:8, resno:125, chainIndex:0, structureId:null},{resindex:156, residueId:9, resno:161, chainIndex:0, structureId:null},{resindex:156, residueId:10, resno:161, chainIndex:1, structureId:null},{resindex:120, residueId:11, resno:125, chainIndex:1, structureId:null},{resindex:126, residueId:12, resno:131, chainIndex:0, structureId:null},{resindex:157, residueId:13, resno:162, chainIndex:0, structureId:null},{resindex:157, residueId:14, resno:162, chainIndex:1, structureId:null},{resindex:126, residueId:15, resno:131, chainIndex:1, structureId:null},{resindex:102, residueId:16, resno:107, chainIndex:0, structureId:null},{resindex:461, residueId:17, resno:466, chainIndex:0, structureId:null},{resindex:461, residueId:18, resno:466, chainIndex:1, structureId:null},{resindex:102, residueId:19, resno:107, chainIndex:1, structureId:null}
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
    
    QUnit.test ("Get Chain Start Positions as Atom Indices (for label representation)", function (assert) {
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var chainStartSele = stageModel.getFirstAtomPerChainSelection (d3.set([0,1 ]));
        var expectedValue = "@0,4599";
		assert.deepEqual (chainStartSele, expectedValue, "Expected "+expectedValue+" for chain start atom NGL selection, Passed!");
	});
    
    
    QUnit.test ("Get Just Chain Selection", function (assert) {
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		var chainSele = stageModel.getChainSelection ({showAll: false, chainIndices: [0,1]});
        var expectedValue = "(( /0 AND (:A OR :B) ) )";
		assert.deepEqual (chainSele, expectedValue, "Expected "+expectedValue+" for just chain selection, Passed!");
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
		var actualDistance = clmsModel.get("distancesObj").getXLinkDistance (singleCrossLink, alignCollection);
		
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
		// -5 cos 4 difference in pdb / search alignments, and another 1 because this function is 0-indexed.
		var actualDistance2 = stageModel.getSingleDistanceBetween2Residues (415 - 5 , 497 - 5, 1, 1);	// 1 appears to be shortest distance
			
		assert.deepEqual (actualDistance, actualDistance2, "Expected "+actualDistance2+" distance in both methods (B chain 415-497 crosslink), Passed!");
	});
    
    
    QUnit.test ("2 different functions for returning atom indices", function (assert) {
		var crossLinks = clmsModel.get("crossLinks");
		var singleCrossLink = crossLinks.get("2000171_415-2000171_497");
		var alignCollection = CLMSUI.compositeModelInst.get("alignColl");
		
		// this will be shortest distance of chain possibilities - 0-0, 0-1, 1-0, 1-1
		var stageModel = CLMSUI.compositeModelInst.get("stageModel");
        var cproxy = stageModel.get("structureComp").structure.getChainProxy();
        var sele = new NGL.Selection();
        cproxy.index = 0;
        var atomIndexA = stageModel.getAtomIndex (0, 0); // residue 0-indexed here
        var atomIndexB = stageModel._getAtomIndexFromResidue (5, cproxy, sele); // residue is NGL resno (5 resno = 0 resindex)
			
		assert.deepEqual (atomIndexA, atomIndexB, "Expected "+atomIndexA+" index in both methods (A chain 415 residue), Passed!");
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
		var expectedValue = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 0, protID: "2000171", alignID: "1AO6:B:1"}
		];
		
		var distObj = clmsModel.get("distancesObj");
		var actualValue = distObj.calcDistanceableSequenceData ();
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as distanceable sequence metadata, Passed!");
	});
	
	
	QUnit.test ("Include Terminal Indices", function (assert) {
		var expected = {ntermList: [], ctermList: []};	// because pdb for 1ao6 is within the larger sequence so neither cterm nor nterm match
		
		var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
		var alignID = CLMSUI.modelUtils.make3DAlignID ("1AO6", "A", 0);
        var seqRange = alignCollBB.getSearchRangeIndexOfMatches ("2000171", alignID);
		$.extend (seqRange, {alignID: alignID, chainIndex: 0, protID: "2000171"});
		var seqMap = d3.map ();
		seqMap.set ("2000171", {key: "2000171", values: [seqRange]});
		var alignedTerminalIndices = clmsModel.get("distancesObj").calcAlignedTerminalIndices (seqMap, clmsModel, alignCollBB);
		assert.deepEqual (alignedTerminalIndices, expected, "Expected "+JSON.stringify(expected)+" as end terminals out of PDB range, Passed!");
	});
	
	QUnit.test ("Filter Sequence By Residue Set = I and W", function (assert) {
		var expectedValue = [20, 137, 209, 259, 266, 285, 383, 508, 518];
		var actualValue = CLMSUI.modelUtils.filterSequenceByResidueSet (dseq1AO6, new d3.set(["I", "W"]));
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as filtered residue indices, Passed!");
	});
	
	QUnit.test ("Filter Sequence By Residue Set = All", function (assert) {
		var expectedValue = d3.range (0, dseq1AO6.length);
		var actualValue = CLMSUI.modelUtils.filterSequenceByResidueSet (dseq1AO6, null, true);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as filtered residue indices, Passed!");
	});
	
	
	QUnit.test ("Filter Multiple Sequences by Cross-Linkable Specificity Setting", function (assert) {
		var expected = [535, 536, 540, 552, 555, 559, 561, 568, 569, 574];	// last 10 KSTY
		var expected2 = d3.range (0, dseq1AO6.length);	// everything
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var residueSets = CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray);
		var linkableResidues = residueSets["wrong mass SDA "].linkables;
		
		var alignCollBB = CLMSUI.compositeModelInst.get("alignColl");
		var alignID = CLMSUI.modelUtils.make3DAlignID ("1AO6", "A", 0);
        var seqRange = alignCollBB.getSearchRangeIndexOfMatches ("2000171", alignID);
		var actualFilteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (seqRange.subSeq, linkableResidues[1], false);	// 1 is KSTY
		actualFilteredSubSeqIndices = actualFilteredSubSeqIndices.slice(-10);	// last 10
		
		assert.deepEqual (actualFilteredSubSeqIndices, expected, "Expected "+expected.join(", ")+" as last 10 KSTY cross-linkable filtered sequence indices, Passed!");
		
		
		actualFilteredSubSeqIndices = CLMSUI.modelUtils.filterSequenceByResidueSet (seqRange.subSeq, linkableResidues[0], false);	// 0 is everything
		
		assert.deepEqual (actualFilteredSubSeqIndices, expected2, "Expected "+expected2.join(", ")+" as everything cross-linkable filtered sequence indices, Passed!");
	});
	
	
	QUnit.test ("Calc Filtered Residue Points from Cross-linker Specificity", function (assert) {
		var expectedValue = [535, 536, 540, 552, 555, 559, 561, 568, 569, 574];	// last 10 KSTY
		expectedValue = expectedValue.map (function (v) {
			return {chainIndex: 1, protID: "2000171", resIndex: v+1, searchIndex: v+5}	// resindex 1-indexed, sdearchIndex 4 on from that, last 10 residues will be chain 1
		});
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 0, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var actualValue = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		actualValue = actualValue[1]; // the KSTY & NTERM residues
		actualValue = actualValue.slice(-10);	// The last 10 values
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as last 10 KSTY cross-linkable filtered residue points, Passed!");
	});
	
	
	
	QUnit.test ("Sample Distance Generation, 1 Search, rounded to nearest integer", function (assert) {
		var expectedValue = [27, 36, 58, 41, 99, 77, 88, 93, 84, 44, 29, 48, 64, 47, 55, 38, 55, 69, 53, 26, 21, 17, 33, 23, 91, 68, 72, 73, 70, 44, 28, 29, 15, 11, 89, 69, 63, 66, 69, 41, 19, 47, 44, 20, 78, 64, 61, 78, 74, 99, 78, 88, 93, 84, 27, 36, 58, 41, 55, 38, 55, 69, 53, 45, 29, 48, 64, 47, 90, 68, 72, 73, 70, 26, 21, 17, 33, 23, 89, 69, 64, 66, 69, 44, 28, 29, 15, 11, 78, 64, 61, 78, 74, 42, 19, 48, 44, 20];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 0, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		var sampleDists = [];
		distObj.generateSampleDistancesBySearch (filteredResidueMap[0], filteredResidueMap[1], sampleDists, {linksPerSearch: 100});
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
	
	
	QUnit.test ("Sample Distance Generation, 1 Search, restricted to same protein id (dimer / full search equivalent), rounded to nearest integer", function (assert) {
		var expectedValue = [27, 36, 58, 41, 99, 77, 88, 93, 84, 44, 29, 48, 64, 47, 55, 38, 55, 69, 53, 26, 21, 17, 33, 23, 91, 68, 72, 73, 70, 44, 28, 29, 15, 11, 89, 69, 63, 66, 69, 41, 19, 47, 44, 20, 78, 64, 61, 78, 74, 99, 78, 88, 93, 84, 27, 36, 58, 41, 55, 38, 55, 69, 53, 45, 29, 48, 64, 47, 90, 68, 72, 73, 70, 26, 21, 17, 33, 23, 89, 69, 64, 66, 69, 44, 28, 29, 15, 11, 78, 64, 61, 78, 74, 42, 19, 48, 44, 20];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 0, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		var sampleDists = [];
		// heterobidirectional crosslinker, between same protein id only - should be the same returned values as the previous test
        var options = {linksPerSearch: 100, heterobi: true, restrictToChain: false, restrictToProtein: true};
		distObj.generateSubDividedSampleDistancesBySearch (filteredResidueMap, sampleDists, options);
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
	
	
	QUnit.test ("Sample Distance Generation, 1 Search, restricted to same chain (monomer equivalent), rounded to nearest integer", function (assert) {
		var expectedValue = [28, 33, 39, 50, 47, 55, 28, 10, 27, 46, 47, 40, 38, 44, 39, 34, 36, 64, 34, 29, 13, 20, 20, 28, 40, 34, 46, 43, 35, 20, 18, 18, 22, 50, 51, 24, 26, 47, 37, 29, 31, 60, 32, 35, 56, 47, 36, 31, 28, 34, 39, 50, 47, 56, 29, 10, 27, 46, 47, 39, 38, 45, 39, 35, 36, 65, 34, 29, 13, 20, 21, 28, 40, 34, 46, 43, 35, 21, 18, 18, 22, 50, 51, 24, 25, 47, 38, 29, 31, 60, 32, 35, 56, 48, 36, 31];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 0, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		var sampleDists = [];
		// heterobidirectional crosslinker, between same chains only
        var options = {linksPerSearch: 100, heterobi: true, restrictToChain: true, restrictToProtein: true};
		distObj.generateSubDividedSampleDistancesBySearch (filteredResidueMap, sampleDists, options);
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
    
    
    QUnit.test ("Sample Distance Generation, 1 Search, restricted to same model index (artificially set to make monomer equivalent), rounded to nearest integer", function (assert) {
		var expectedValue = [28, 33, 39, 50, 47, 55, 28, 10, 27, 46, 47, 40, 38, 44, 39, 34, 36, 64, 34, 29, 13, 20, 20, 28, 40, 34, 46, 43, 35, 20, 18, 18, 22, 50, 51, 24, 26, 47, 37, 29, 31, 60, 32, 35, 56, 47, 36, 31, 28, 34, 39, 50, 47, 56, 29, 10, 27, 46, 47, 39, 38, 45, 39, 35, 36, 65, 34, 29, 13, 20, 21, 28, 40, 34, 46, 43, 35, 21, 18, 18, 22, 50, 51, 24, 25, 47, 38, 29, 31, 60, 32, 35, 56, 48, 36, 31];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 1, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		var sampleDists = [];
        var cimimap = d3.map({0: 0, 1: 1}); // artifically associate each chain with a different model
		// heterobidirectional crosslinker, between same chains only
        var options = {linksPerSearch: 100, heterobi: true, restrictToChain: false, restrictToModel: true, restrictToProtein: true};
		distObj.generateSubDividedSampleDistancesBySearch (filteredResidueMap, sampleDists, options, cimimap);
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
    
    
     QUnit.test ("Sample Distance Generation, 1 Search, 2 different models, but inter-model distance flag set to true, rounded to nearest integer", function (assert) {
		var expectedValue = [27, 36, 58, 41, 99, 77, 88, 93, 84, 44, 29, 48, 64, 47, 55, 38, 55, 69, 53, 26, 21, 17, 33, 23, 91, 68, 72, 73, 70, 44, 28, 29, 15, 11, 89, 69, 63, 66, 69, 41, 19, 47, 44, 20, 78, 64, 61, 78, 74, 99, 78, 88, 93, 84, 27, 36, 58, 41, 55, 38, 55, 69, 53, 45, 29, 48, 64, 47, 90, 68, 72, 73, 70, 26, 21, 17, 33, 23, 89, 69, 64, 66, 69, 44, 28, 29, 15, 11, 78, 64, 61, 78, 74, 42, 19, 48, 44, 20];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distanceableSequences = [
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 0, modelIndex: 0, protID: "2000171", alignID: "1AO6:A:0"},
			{first: 5, last: 582, subSeq: dseq1AO6, chainIndex: 1, modelIndex: 1, protID: "2000171", alignID: "1AO6:B:1"}
		];
		var alignedTerminalIndices = {ntermList: [], ctermList: []};
		
		var distObj = clmsModel.get("distancesObj");
		var filteredResidueMap = distObj.calcFilteredSequenceResidues (crosslinkerSpecificityList[0], distanceableSequences, alignedTerminalIndices);
		var sampleDists = [];
        var cimimap = d3.map({0: 0, 1: 1}); // artifically associate each chain with a different model
		// heterobidirectional crosslinker, between same chains only
         
        var options = {linksPerSearch: 100, heterobi: true, restrictToChain: false, restrictToModel: false, restrictToProtein: true};
		distObj.generateSubDividedSampleDistancesBySearch (filteredResidueMap, sampleDists, options, cimimap);
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
	
	QUnit.test ("Run through DistancesObj right from getSampleDistances, 1 Search, restricted to same chain (monomer equivalent), rounded to nearest integer", function (assert) {
		var expectedValue = [28, 33, 39, 50, 47, 55, 28, 10, 27, 46, 47, 40, 38, 44, 39, 34, 36, 64, 34, 29, 13, 20, 20, 28, 40, 34, 46, 43, 35, 20, 18, 18, 22, 50, 51, 24, 26, 47, 37, 29, 31, 60, 32, 35, 56, 47, 36, 31, 28, 34, 39, 50, 47, 56, 29, 10, 27, 46, 47, 39, 38, 45, 39, 35, 36, 65, 34, 29, 13, 20, 21, 28, 40, 34, 46, 43, 35, 21, 18, 18, 22, 50, 51, 24, 25, 47, 38, 29, 31, 60, 32, 35, 56, 48, 36, 31];
		
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker(searchArray));
		var distObj = clmsModel.get("distancesObj");
		
		var sampleDists = distObj.getSampleDistances (100, crosslinkerSpecificityList, {withinProtein: true, withinChain: true});
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
    
    
    QUnit.test ("Run through DistancesObj right from getSampleDistances, no crosslinker specified, 1 Search, restricted to same model (artifically set, to make monomer equivalent), rounded to nearest integer", function (assert) {
		var expectedValue = [28, 44, 13, 43, 51, 60, 28, 44, 24, 44, 29, 35, 44, 44, 37, 49, 51, 55, 13, 24, 37, 30, 41, 51, 43, 44, 49, 30, 38, 48, 51, 29, 51, 41, 38, 11, 60, 35, 55, 51, 48, 11, 29, 45, 13, 43, 51, 60, 29, 44, 25, 44, 29, 35, 45, 44, 38, 49, 51, 55, 13, 25, 38, 30, 41, 50, 43, 44, 49, 30, 38, 48, 51, 29, 51, 41, 38, 11, 60, 35, 55, 50, 48, 11];
		
		var crossSpec = clmsModel.get("crosslinkerSpecificity");
		clmsModel.set ("crosslinkerSpecificity", null);	// null crosslink specificity for this test
		var searchArray = CLMS.arrayFromMapValues (clmsModel.get("searches"));
		var crosslinkerSpecificityList = d3.values (CLMSUI.modelUtils.crosslinkerSpecificityPerLinker (searchArray));
		var distObj = clmsModel.get("distancesObj");
		
		var sampleDists = distObj.getSampleDistances (100, crosslinkerSpecificityList, {withinProtein: true, withinChain: true});
		var actualValue = sampleDists.map (function (v) { return Math.round(v); });
		
		clmsModel.set ("crosslinkerSpecificity", crossSpec);	// restore crosslink specs
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sampled distances, Passed!");
	});
	
	QUnit.module ("Model Utils Functions");
	
	QUnit.test ("Get max score of crosslink matches", function (assert) {
		var testCrossLink = {
			filteredMatches_pp: [
				{match: { score: function () { return "cat"; }}},
				{match: { score: function () { return 12.04; }}},
				{match: { score: function () { return 11.34; }}},
				{match: { score: function () { return null; }}},
			]	
		};
		var expectedValue = 12.04;
		var actualValue = CLMSUI.modelUtils.highestScore (testCrossLink);
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as highest score, Passed!");
	});
	
	
	QUnit.test ("Index same sequences to first occurence", function (assert) {
		var testSeqs = [
			"ABCDEFGHIJKLM",
			"BABARACUS",
			"ABCDEFGHIJKLM",
			"HANNIBALSMITH",
			"BABARACUS",
			"FACE",
			"FACE"
		];
		var expectedValue = [undefined, undefined, 0, undefined, 1, undefined, 5];
		var actualValue = CLMSUI.modelUtils.indexSameSequencesToFirstOccurrence (testSeqs);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as index array, Passed!");
	});
	
	QUnit.test ("Filter repeated Sequences", function (assert) {
		var testSeqs = [
			"ABCDEFGHIJKLM",
			"BABARACUS",
			"ABCDEFGHIJKLM",
			"HANNIBALSMITH",
			"BABARACUS",
			"FACE",
			"FACE"
		];
		var expectedValue = {
			sameSeqIndices: [undefined, undefined, 0, undefined, 1, undefined, 5],
			uniqSeqs: ["ABCDEFGHIJKLM", "BABARACUS", "HANNIBALSMITH", "FACE"],
			uniqSeqIndices: [0, 1, 3, 5],
			uniqSeqReverseIndex: {"0": "0", "1": "1", "3": "2", "5": "3"}
		};
		var actualValue = CLMSUI.modelUtils.filterRepeatedSequences (testSeqs);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as repeated sequence result, Passed!");
	});
	
	
	QUnit.test ("Reinflate sequence map", function (assert) {
		var testSeqs = [
			"ABCDEFGHIJKLM",
			"BABARACUS",
			"ABCDEFGHIJKLM",
			"HANNIBALSMITH",
			"BABARACUS",
			"FACE",
			"FACE"
		];
		var matchMatrix = {Prot1: [1, 2, 3, 4], Prot2: [2, 4, 6, 8]};
		var filteredSeqInfo = {
			sameSeqIndices: [undefined, undefined, 0, undefined, 1, undefined, 5],
			uniqSeqs: ["ABCDEFGHIJKLM", "BABARACUS", "HANNIBALSMITH", "FACE"],
			uniqSeqIndices: [0, 1, 3, 5],
			uniqSeqReverseIndex: {"0": "0", "1": "1", "3": "2", "5": "3"}
		};
		
		var expectedValue = {Prot1: [1, 2, 1, 3, 2, 4, 4], Prot2: [2, 4, 2, 6, 4, 8, 8]};
		var actualValue = CLMSUI.modelUtils.reinflateSequenceMap (matchMatrix, testSeqs, filteredSeqInfo);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as reinflated sequence result, Passed!");
	});
	
	
	QUnit.test ("Crosslink count per protein pairing", function (assert) {
		var crossLinks = CLMS.arrayFromMapValues (clmsModel.get("crossLinks"));
		var expectedCrossLinkIDs = crossLinks.map (function (crossLink) { return crossLink.id; });
		var expectedValue = {"2000171-2000171" : {crossLinks: expectedCrossLinkIDs, fromProtein: "2000171", toProtein: "2000171", label: "ALBU HUMAN - ALBU HUMAN"}};
		var actualValue = CLMSUI.modelUtils.crosslinkCountPerProteinPairing (crossLinks);	
		d3.values(actualValue).forEach (function (pairing) {	// do this as otherwise stringify will kick off about circular structures, so just match ids
			pairing.fromProtein = pairing.fromProtein.id;
			pairing.toProtein = pairing.toProtein.id;
			pairing.crossLinks = pairing.crossLinks.map (function (crossLink) { return crossLink.id; });
		});
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as crosslink protein pairing value, Passed!");
	});
	
	
	QUnit.test ("Merge contiguous features", function (assert) {
		var testArrs = [
			[
				{begin: 1, end: 1},
				{begin: 2, end: 2},
				{begin: 4, end: 4},
				{begin: 5, end: 10},
				{begin: 6, end: 8},
				{begin: 7, end: 12},
				{begin: 20, end: 30},
			],
			[
				{begin: -15, end: 6}
			],
			[
				{begin: -12, end: 8},
				{begin: -15, end: 6}
			]
		];
		
		var expectedValue = [
			[
				{begin: 1, end: 2},
				{begin: 4, end: 12},
				{begin: 20, end: 30}
			],
			[
				{begin: -15, end: 6}
			],
			[
				{begin: -15, end: 8}
			]
		];
		
		var actualValue = testArrs.map (function (testArr, i) {
			return CLMSUI.modelUtils.mergeContiguousFeatures (testArr);
		});
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as contiguous feature ranges, Passed!");
	});
	
	
	QUnit.test ("Radix sort", function (assert) {
		var testArr = [2, 4, 6, 6, 3, 2, 1, 4, 2, 4, 6, 8, 1, 2, 4, 6, 9, 0];
		var expectedValue = [0, 1, 1, 2, 2, 2, 2, 3, 4, 4, 4, 4, 6, 6, 6, 6, 8, 9];
		var actualValue = CLMSUI.modelUtils.radixSort (10, testArr, function(d) { return d; });
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as sorted by radix, Passed!");
	});
	
	
	QUnit.test ("Parse URL Query String", function (assert) {
		var testString = "sid=10003-secret&decoys=1&unval=1&linear=1&cats=true&anon=";
		var expectedValue = {sid: "10003-secret", decoys: 1, unval: 1, linear: 1, cats: true, anon: ""};
		var actualValue = CLMSUI.modelUtils.parseURLQueryString (testString);
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as parsed URL query string, Passed!");
	});
	
	
	QUnit.test ("Make URL Query String", function (assert) {
		var testObj = {sid: "10003-secret", decoys: 1, unval: 1, linear: 1, cats: true, anon: ""};
		var expectedValue = ["sid=10003-secret", "decoys=1", "unval=1", "linear=1", "cats=1", "anon="];	// true gets turned to 1, false to 0
		var actualValue = CLMSUI.modelUtils.makeURLQueryString (testObj, "");
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as constructed URL query string, Passed!");
	});
	
	
	QUnit.test ("Update Protein Metadata", function (assert) {
		var expectedValue = {columns: ["cat", "dog"], items: clmsModel.get("participants"), matchedItemCount: 1};
		CLMSUI.vent.listenToOnce (CLMSUI.vent, "proteinMetadataUpdated", function (actualValue) {
			assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as proteinmetadata event data, Passed!");
			
			var actualValue2 = clmsModel.get("participants").get("2000171").meta;
			var expectedValue2 = {cat: 2, dog: 4};
			assert.deepEqual (actualValue2, expectedValue2, "Expected "+JSON.stringify(expectedValue2)+" as protein meta value, Passed!");
		})
		
		var fileContents = "ProteinID,cat,dog\n2000171,2,4\n";
		var actualValue = CLMSUI.modelUtils.updateProteinMetadata (fileContents, clmsModel);	
	});
	
	
	QUnit.test ("Update Crosslink Metadata", function (assert) {
		var expectedValue = {columns: ["cat", "dog"], columnTypes: {cat: "numeric", dog: "numeric"}, items: clmsModel.get("crossLinks"), matchedItemCount: 2};
		CLMSUI.vent.listenToOnce (CLMSUI.vent, "linkMetadataUpdated", function (actualValue) {
			assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as linkmetadata event data, Passed!");
			
			var actualValue2 = clmsModel.get("crossLinks").get("2000171_415-2000171_497").getMeta();
			var expectedValue2 = {cat: 2, dog: 4};
			assert.deepEqual (actualValue2, expectedValue2, "Expected "+JSON.stringify(expectedValue2)+" as link meta value, Passed!");
		});
		
		var fileContents = "Protein 1,SeqPos 1,Protein 2,SeqPos 2,cat,dog\n"
			+"ALBU_HUMAN,415,ALBU_HUMAN,497,2,4\n"
			+"ALBU_HUMAN,190,ALBU_HUMAN,425,3,5\n"
		;
		var actualValue = CLMSUI.modelUtils.updateLinkMetadata (fileContents, clmsModel);	
	});
	
	
	QUnit.test ("ZScore array of values", function (assert) {
		var expectedValue = [-1.49, -1.16, -0.83, -0.5, -0.17, 0.17, 0.5, 0.83, 1.16, 1.49];
		var testNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		var actualValue = CLMSUI.modelUtils.zscore(testNumbers).map(function (num) {
			return +(num).toFixed(2);
		});
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as z-value output, Passed!");
	});
	
	
	QUnit.test ("Compact 2D array", function (assert) {
		var expectedValue = [[1, 2, undefined, 3], [4, 5, 6, 7]];
		var testNumbers = [[1, 2, undefined, 3], [undefined, undefined, undefined, undefined], [4, 5, 6, 7]];
		var actualValue = CLMSUI.modelUtils.compact2DArray (testNumbers);
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as compacted 2D array, Passed!");
	});
	
	
	QUnit.test ("makeColumnGroupIndices", function (assert) {
		var expectedValue = [["a", "b"],["c"]];
		var options = {groups: d3.map({a: "cat", b: "cat", c: "dog"})};
		var testNumbers = [[1, 1, 1, 1, 1],[3, 3, 3, 3, 3],[5, 5, 5, 5, 5]];
		["a", "b", "c"].forEach (function (val, i) { testNumbers[i].colName = val; });
		var actualValue = CLMSUI.modelUtils.makeColumnGroupIndices(testNumbers, options);
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as groups, Passed!");
		
		expectedValue = [0, 0, 1];
		actualValue = testNumbers.map (function (arr) { return arr.groupIndex; });
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as attached score group indices, Passed!");
	});
	
	
	QUnit.test ("Average columns by group", function (assert) {
		var expectedValue = [[2, 2, 2, 2, 2], [5, 5, 5, 5, 5]];
		["Avg Z[a;b]", "Avg Z[c]"].forEach (function (val, i) { expectedValue[i].colName = val; });
		
		var testNumbers = [[1, 1, 1, 1, 1],[3, 3, 3, 3, 3],[5, 5, 5, 5, 5],[7, 7, 7, 7, 7]];
		var columnGroupNames = [["a", "b"], ["c"]];
		[0,0,1].forEach (function (val, i) { testNumbers[i].groupIndex = val; });	// 7's not given groupIndex
		var actualValue = CLMSUI.modelUtils.averageGroups(testNumbers, columnGroupNames);
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as z-value output, Passed!");
	});
	
	
	QUnit.test ("Normalise 2D array to column", function (assert) {
		var testArr = [
			[2, 3, 4],
			[1, 2, 3],
			[4, 5, 6],
			[7, undefined, 9],	// column 1 value is undefined, this is the column we try to normalise against
			[undefined, 11, 12],	// column 0 value is undefined, just one of the other columns
		];
		
		var expectedValue = [
			[-1, 0, 1],
			[-1, 0, 1],
			[-1, 0, 1],
			[undefined, undefined, undefined],	// normalise row to an undefined value = all row undefined
			[undefined, 0, 1]	// normalise undefined value to known value = that value stays undefined
		];
		
		var actualValue = CLMSUI.modelUtils.normalize2DArrayToColumn (testArr, 1);	// normalise to column 1
		
		// stringify turns undefined to null for printout, but it's a match
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as normalised array, Passed!");
	});
	
	
	QUnit.test ("Update crosslink metadata with column data", function (assert) {
		var expectedValue = [{cat: 1, dog: 2}, {cat: 3, dog: 4}];
		
		var testLinks = CLMS.arrayFromMapValues (CLMSUI.compositeModelInst.get("clmsModel").get("crossLinks")).slice(0,2);
		var testZScores = [[1, 2],[3, 4]];
		testLinks.forEach (function (crossLink, i) { testZScores[i].clink = crossLink; });
		var testColumnNameIndexPair = [{name: "cat", index: 0}, {name: "dog", index: 1}];
		CLMSUI.modelUtils.updateMetaDataWithTheseColumns (testZScores, testColumnNameIndexPair);
		
		var actualValue = testLinks.map (function (testLink) { return testLink.getMeta(); });
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as updated metadata values, Passed!");
	});
    
    QUnit.module ("File download string generation");
    
    QUnit.test ("Residues CSV", function (assert) {
        model.get("filterModel")
            .resetFilter()
            .set ({AUTO: false})
        ;
		var expectedValue = "\"Residue(s)\",\"Occurences(in_unique_links)\"\r\n\"V-Y\",\"1\"\r\n\"E-K\",\"2\"\r\n\"T-Y\",\"1\"\r\n\"D-K\",\"1\"\r\n\"V\",\"1\"\r\n\"Y\",\"2\"\r\n\"K\",\"3\"\r\n\"E\",\"2\"\r\n\"T\",\"1\"\r\n\"D\",\"1\"\r\n";
		var actualValue = getResidueCount();
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as Residues CSV, Passed!");
        
        model.get("filterModel").resetFilter();
	});
    
    QUnit.test ("Links CSV", function (assert) {
        model.get("filterModel")
            .resetFilter()
            .set ({AUTO: false})
        ;
		var expectedValue = "\"Protein1\",\"SeqPos1\",\"LinkedRes1\",\"Protein2\",\"SeqPos2\",\"LinkedRes2\",\"Highest Score\",\"Match Count\",\"AutoValidated\",\"Validated\",\"Link FDR\",\"3D Distance\",\"From Chain\",\"To Chain\",\"PDB SeqPos 1\",\"PDB SeqPos 2\",\"Search_10003\",\"cat\",\"dog\"\r\n\"sp|P02768-A|ALBU_HUMAN\",\"415\",\"V\",\"sp|P02768-A|ALBU_HUMAN\",\"497\",\"Y\",\"19.0000\",\"2\",\"true\",\"B,B\",\"\",\"8.79\",\"B\",\"B\",\"411\",\"493\",\"X\",\"2\",\"4\"\r\n\"sp|P02768-A|ALBU_HUMAN\",\"190\",\"K\",\"sp|P02768-A|ALBU_HUMAN\",\"425\",\"E\",\"17.3400\",\"4\",\"true\",\"A,C,A,A\",\"\",\"12.07\",\"B\",\"B\",\"186\",\"421\",\"X\",\"3\",\"5\"\r\n\"sp|P02768-A|ALBU_HUMAN\",\"125\",\"T\",\"sp|P02768-A|ALBU_HUMAN\",\"161\",\"Y\",\"17.3200\",\"1\",\"true\",\"C\",\"\",\"15.26\",\"A\",\"A\",\"121\",\"157\",\"X\",\"\",\"\"\r\n\"sp|P02768-A|ALBU_HUMAN\",\"131\",\"E\",\"sp|P02768-A|ALBU_HUMAN\",\"162\",\"K\",\"17.0300\",\"1\",\"true\",\"?\",\"\",\"8.30\",\"A\",\"A\",\"127\",\"158\",\"X\",\"\",\"\"\r\n\"sp|P02768-A|ALBU_HUMAN\",\"107\",\"D\",\"sp|P02768-A|ALBU_HUMAN\",\"466\",\"K\",\"13.9400\",\"1\",\"true\",\"B\",\"\",\"8.37\",\"B\",\"B\",\"103\",\"462\",\"X\",\"\",\"\"\r\n";
        
        // add the metadata from the other test, so it's always the same columns/values (i.e. test order doesn't change outcome of this test)
        var fileContents = "Protein 1,SeqPos 1,Protein 2,SeqPos 2,cat,dog\n"
			+"ALBU_HUMAN,415,ALBU_HUMAN,497,2,4\n"
			+"ALBU_HUMAN,190,ALBU_HUMAN,425,3,5\n"
		;
		CLMSUI.modelUtils.updateLinkMetadata (fileContents, clmsModel);	
        
		var actualValue = getLinksCSV();
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as Cross-Links CSV, Passed!");
        
        model.get("filterModel").resetFilter();
	});
    
    
    QUnit.test ("Matches CSV", function (assert) {
        model.get("filterModel")
            .resetFilter()
            .set ({AUTO: false})
        ;
		var expectedValue = 	"\"Id\",\"Protein1\",\"SeqPos1\",\"PepPos1\",\"PepSeq1\",\"LinkPos1\",\"Protein2\",\"SeqPos2\",\"PepPos2\",\"PepSeq2\",\"LinkPos2\",\"Score\",\"Charge\",\"ExpMz\",\"ExpMass\",\"CalcMz\",\"CalcMass\",\"MassError\",\"AutoValidated\",\"Validated\",\"Search\",\"RawFileName\",\"ScanNumber\",\"ScanIndex\",\"CrossLinkerModMass\",\"FragmentTolerance\",\"IonTypes\",\"Decoy1\",\"Decoy2\",\"3D Distance\",\"From Chain\",\"To Chain\",\"PDB SeqPos 1\",\"PDB SeqPos 2\"\r\n\"625824830\",\"ALBU_HUMAN\",\"425\",\"415\",\"VPQVSTPTLVEVSR\",\"11\",\"ALBU_HUMAN\",\"190\",\"182\",\"LDELRDEGKASSAK\",\"9\",\"15.42\",\"5\",\"623.13706032591\",\"3110.6489192951553\",\"623.136349226899\",\"3110.6453638001\",\"1.1430088099583773\",\"true\",\"C\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"23756\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"12.07\",\"B\",\"B\",\"185\",\"420\"\r\n\"625825062\",\"ALBU_HUMAN\",\"425\",\"414\",\"KVPQVSTPTLVEVSR\",\"12\",\"ALBU_HUMAN\",\"190\",\"182\",\"LDELRDEGKASSAK\",\"9\",\"14.8\",\"5\",\"648.75679602991\",\"3238.747597815155\",\"648.755341826899\",\"3238.7403268001\",\"2.245013283436167\",\"true\",\"A\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"21558\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"12.07\",\"B\",\"B\",\"185\",\"420\"\r\n\"625825067\",\"ALBU_HUMAN\",\"425\",\"414\",\"KVPQVSTPTLVEVSR\",\"12\",\"ALBU_HUMAN\",\"190\",\"182\",\"LDELRDEGKASSAK\",\"9\",\"15.19\",\"5\",\"648.75676475862\",\"3238.747441458705\",\"648.755341826899\",\"3238.7403268001\",\"2.196736350321131\",\"true\",\"A\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"22016\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"12.07\",\"B\",\"B\",\"185\",\"420\"\r\n\"625825068\",\"ALBU_HUMAN\",\"425\",\"414\",\"KVPQVSTPTLVEVSR\",\"12\",\"ALBU_HUMAN\",\"190\",\"182\",\"LDELRDEGKASSAK\",\"9\",\"17.34\",\"4\",\"810.69382619827\",\"3238.746198925564\",\"810.692358166904\",\"3238.7403268001\",\"1.8130893099008054\",\"true\",\"A\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"21877\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"12.07\",\"B\",\"B\",\"185\",\"420\"\r\n\"625826126\",\"ALBU_HUMAN\",\"497\",\"485\",\"RPCcmFSALEVDETYVPK\",\"13\",\"ALBU_HUMAN\",\"415\",\"414\",\"KVPQVSTPTLVEVSR\",\"2\",\"10.59\",\"3\",\"1211.3077209543\",\"3630.901333462263\",\"1211.3060024002457\",\"3630.8961778001\",\"1.4199420503630487\",\"true\",\"B\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"32246\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"8.79\",\"B\",\"B\",\"410\",\"492\"\r\n\"625826136\",\"ALBU_HUMAN\",\"497\",\"485\",\"RPCcmFSALEVDETYVPK\",\"13\",\"ALBU_HUMAN\",\"415\",\"414\",\"KVPQVSTPTLVEVSR\",\"2\",\"19\",\"4\",\"908.73262202769\",\"3630.901382243244\",\"908.731320916904\",\"3630.8961778001\",\"1.4333770202208327\",\"true\",\"B\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"32195\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"8.79\",\"B\",\"B\",\"410\",\"492\"\r\n\"625827037\",\"ALBU_HUMAN\",\"466\",\"446\",\"MoxPCcmAEDYLSVVLNQLCcmVLHEKTPVSDR\",\"21\",\"ALBU_HUMAN\",\"107\",\"107\",\"DDNPNLPR\",\"1\",\"13.94\",\"5\",\"843.01100363988\",\"4210.018635865004\",\"843.009827426899\",\"4210.0127548001\",\"1.3969232985363071\",\"true\",\"B\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"50388\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"8.37\",\"B\",\"B\",\"102\",\"461\"\r\n\"625827168\",\"ALBU_HUMAN\",\"125\",\"115\",\"LVRPEVDVMCcmTAFHDNEETFLK\",\"11\",\"ALBU_HUMAN\",\"161\",\"161\",\"YKAAFTECcmCcmQAADK\",\"1\",\"17.32\",\"6\",\"733.17742554659\",\"4393.020894478266\",\"733.1765762668957\",\"4393.0157988001\",\"1.1599498839643183\",\"true\",\"C\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"33444\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"15.26\",\"A\",\"A\",\"120\",\"156\"\r\n\"625828211\",\"ALBU_HUMAN\",\"131\",\"115\",\"LVRPEVDVMCcmTAFHDNEETFLK\",\"17\",\"ALBU_HUMAN\",\"162\",\"161\",\"YKAAFTECcmCcmQAADK\",\"2\",\"17.03\",\"6\",\"733.17716390522\",\"4393.019324630046\",\"733.1765762668957\",\"4393.0157988001\",\"0.8025989678416844\",\"true\",\"?\",\"10003\",\"E151023_07_Lumos_CS_AB_IN_190_HCD_HSA_SDA_3\",\"35032\",\"0\",\"82.0413162600906\",\"20 ppm\",\"b;y;peptide;\",\"false\",\"false\",\"8.30\",\"A\",\"A\",\"126\",\"157\"\r\n";
        
		var actualValue = getMatchesCSV();
		
		assert.deepEqual (actualValue, expectedValue, "Expected "+JSON.stringify(expectedValue)+" as Matches CSV, Passed!");
        
        model.get("filterModel").resetFilter();
	});
	
}

function testSetupNew (cbfunc) {
	d3.json ("10003.json", function (options) {
		CLMSUI.vent.listenToOnce (CLMSUI.vent, "initialSetupDone", function () {
			CLMSUI.compositeModelInst.get("clmsModel").listenToOnce (CLMSUI.compositeModelInst.get("clmsModel"), "change:distancesObj", function () {
				console.log ("distances obj changed");
				cbfunc (CLMSUI.compositeModelInst);
			});
		
			var stage = new NGL.Stage ("ngl", {tooltip: false});
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
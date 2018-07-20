function callback (model) {
	console.log ("model", model);
	var clmsModel = model.get("clmsModel");

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
}

function testSetupNew (cbfunc) {
	d3.json ("10003.json", function (options) {
		var allDataLoaded = _.after (2, function() {
			console.log ("blee");
			CLMSUI.compositeModelInst.get("clmsModel").listenTo (CLMSUI.compositeModelInst.get("clmsModel"), "change:distancesObj", function () {
				cbfunc (CLMSUI.compositeModelInst);
			});
		
			var stage = new NGL.Stage ("ngl", {/*fogNear: 20, fogFar: 100,*/ backgroundColor: "white", tooltip: false});
			CLMSUI.modelUtils.repopulateNGL ({pdbCode: "1AO6", stage: stage, bbmodel: CLMSUI.compositeModelInst});
		});
		
		options.blosumOptions = {url: "../R/blosums.json"};
		CLMSUI.init.models (options);
	});
}

function testSetup (cbfunc) {
	d3.json ("10003.json", function (options) {
		CLMSUI.init.modelsEssential (options);
		
		cbfunc (CLMSUI.compositeModelInst);
	});
}

testSetup (callback);
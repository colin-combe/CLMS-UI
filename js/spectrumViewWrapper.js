var CLMSUI = CLMSUI || {};

var SpectrumViewWrapper = CLMSUI.utils.BaseFrameView.extend({

    events: function() {
      var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
      if(_.isFunction(parentEvents)){
          parentEvents = parentEvents();
      }
      return _.extend({},parentEvents,{});
    },


    initialize: function (options) {
        var myOptions = options.myOptions;
        SpectrumViewWrapper.__super__.initialize.apply (this, arguments);

        var _html = "" // i think its a mistake (of mine, I think - cc) to use id's in following instaed of classes... its a backbone thing
            //~ +"<div id='spectrum'>"
            +"<div id='spectrumControls'>"
            +"<div id='spectrumControlsTop'>"
            +"<button class='downloadButton'>"
            +(CLMSUI.utils.commonLabels.downloadImg+"SVG")
            +"</button>"
            +"<button id='reset'>Reset Zoom</button>"
            +"<button id='clearHighlights'>Clear Highlights</button>"
            +"</div>"
            +"<div  id='spectrumControlsBottom'>"
            +"<label id='colorSelectorLabel'>Colour scheme:</label>"
            +"<select id='colorSelector'></select>"
            +"<label>Lossy Labels<input id='lossyChkBx' type='checkbox'></label>"
            +"<label>Measure<input id='measuringTool' type='checkbox'></label>"
            +"<label class='movePeakLabels' >Move Labels<input id='moveLabels' type='checkbox'></label>"
            +"<form id='setrange'><label>m/z Range:</label>"
             +"<input type='text' id='xleft' size='7'>"
             +"<input type='text' id='xright' size='7'>"
             +"<input type='submit' value='set range'>"
             +"<span id='range-error'></span>"
            +"</form>"
            +"</div>"
            +"</div>"
            +"<div class='heightFill'>"
            +"<svg id='spectrumSVG'></svg>"
            +"<div id='measureTooltip'></div>"
            +"</div>"
            +"<div class='validationControls'>"
            +"</div>"
            //~ +"</div>"
            +"<div id='alternatives'>"
            +"</div>"
        ;

        d3.select(this.el)
            .append("div")
            .attr("id", myOptions.wrapperID)
            // http://stackoverflow.com/questions/90178/make-a-div-fill-the-height-of-the-remaining-screen-space?rq=1
            .style ("display", "table")
            .html (_html)
        ;

        d3.select("#"+myOptions.wrapperID)
            .selectAll("button")
            .classed ("btn btn-1 btn-1a", true)
        ;

        d3.select(this.el).selectAll("label")
            .classed ("btn", true)
        ;

        var colOptions = [
            {value: "RdBu", text: "Red & Blue"},
            {value: "BrBG", text: "Brown & Teal"},
            {value: "PiYG", text: "Pink & Green"},
            {value: "PRGn", text: "Purple & Green"},
            {value: "PuOr", text: "Orange & Purple"},
        ];
        d3.select("#colorSelector").selectAll("option").data(colOptions)
            .enter()
            .append("option")
            .attr ("value", function(d) { return d.value; })
            .text (function(d) { return d.text; })
        ;


        if (CLMSUI.loggedIn) {
            this.validationMap = {A: "A", B: "B", C: "C", "?": "Q", R: "R"};
            var buttonData = d3.entries(this.validationMap).map (function(entry) { return {label: entry.key, klass: entry.value}; });

            // Add validation buttons
            var self = this;
            d3.select(this.el).select("div.validationControls")
                .append("table")
                .append("tr")
                .selectAll("td")
                .data (buttonData)
                .enter()
                .append("td")
                .append("button")
                    .attr ("class", function(d) { return "validationButton "+d.klass; })
                    .text (function(d) { return d.label; })
                    .on ("click", function (d) {
                        var lsm = self.model.get("lastSelectedMatch");
                        if (lsm && lsm.match) {
                            var randId = CLMSUI.modelUtils.getRandomSearchId (self.model.get("clmsModel"), lsm.match);
                            //console.log ("randId", randId);
                            CLMSUI.validate (lsm.match.id, d.label, randId, function() {
                                lsm.match.validated = d.label;
                                self.setButtonValidationState (lsm.match);
                                self.model.trigger ("matchValidationStateUpdated");
                                self.model.applyFilter();


                            });
                        }
                    })
            ;
        }

        this.alternativesModel = new CLMSUI.BackboneModelTypes.CompositeModelType ({
            //~ filterModel: filterModelInst,
            selection: [], //will contain cross-link objects
        });

        // World of code smells vol.1
        // selectionViewer declared before spectrumWrapper because...
        // 1. Both listen to event A, selectionViewer to build table, spectrumWrapper to do other stuff
        // 2. Event A in spectrumWrapper fires event B
        // 3. selectionViewer listens for event B to highlight row in table - which means it must have built the table
        // 4. Thus selectionViewer must do it's routine for event A before spectrumWrapper, so we initialise it first
        var altsSelectionViewer = new CLMSUI.SelectionTableViewBB ({
            el: "#alternatives",
            model: this.alternativesModel,
            mainModel: this.model
        });

        //~ var split = Split (["#spectrum", "#alternatives"],
                //~ { direction: "vertical", sizes: [60,40], minSize: [200,10],
                    //~ onDragEnd: function () {CLMSUI.vent.trigger ("resizeSpectrumSubViews", true); }
                //~ }
        //~ );

        // redraw / hide table on selected cross-link change
        altsSelectionViewer.listenTo (this.alternativesModel, "change:selection", function (model, selection) {
            altsSelectionViewer.render();
            //~ alert();
            //~ var emptySelection = (selection.length === 0);
            //~ split.collapse (emptySelection);    // this is a bit hacky as it's referencing the split component in another view

        });
        altsSelectionViewer.setVisible (true);
        //~ split.collapse (true);
        //~ selectionViewer.setVisible (false);



        // Only if spectrum viewer visible...
        // When crosslink selection changes, pick highest scoring filtered match of the set
        // and tell it to show the spectrum for that match
        this.listenTo (this.model, "change:selection", function (model, selection) {
            /* var fMatches = CLMSUI.modelUtils.aggregateCrossLinkFilteredMatches (selection);

            if (fMatches.length === 0) {
                this.model.set ("lastSelectedMatch", {match: null, directSelection: false});
            } else {
                fMatches.sort (function(a,b) { return b.match.score - a.match.score; });
                this.model.set ("lastSelectedMatch", {match: fMatches[0].match, directSelection: false});
            } */

            var highestScore = Number.MIN_VALUE;
            var highestScoringMatch = null;

            var selectionLen = selection.length;

            for (var sCl = 0; sCl < selectionLen; ++sCl) {
                var filteredMatches_pp = selection[sCl].filteredMatches_pp;
                //var fmLen = filteredMatches_pp.length;
                //~ for (var fm = 0; fm < fmLen; ++fm) { //could kinda get rid of this loop, coz DB query orders by score
                //ok, i'm doing that
                if (filteredMatches_pp[0]) { 
                    var match = filteredMatches_pp[0].match;
                    if (match.score > highestScore) {
						highestScore = match.score;
                        highestScoringMatch = match;
                    }
                }
            }
			//todo: why isn't following clearing spec viewer if match is null
            this.model.set ("lastSelectedMatch", {match: highestScoringMatch, directSelection: false});

        });

        this.listenTo (this.model, "change:lastSelectedMatch", function (model, selectedMatch) {
            this.triggerSpectrumViewer (selectedMatch.match, selectedMatch.directSelection);
        });

        this.newestSelectionShown = true;
        this.enableControls (false);
    },

    enableControls: function (state) {
        d3.select(this.el)
            .selectAll(".validationControls,#spectrumControls")
            .style ("background", state ? null : "#888888")
            .selectAll("*")
            .property("disabled", !state)
        ;
    },

    setButtonValidationState: function (match) {
        d3.select(this.el).selectAll("button.validationButton").classed("validatedState", false);
        if (match && match.validated) {
            var klass = this.validationMap[match.validated];
            if (klass) {
                d3.select(this.el).select("."+klass).classed("validatedState", true);
            }
        }
    },

    triggerSpectrumViewer: function (match, forceShow) {
        //console.log ("MATCH selected", match, forceShow);
        if (this.isVisible() || forceShow) {
            this.newestSelectionShown = true;
            var visible = !!match;
            if (this.isVisible() !== visible) {
                //console.log ("CHANGE VISIBILITY");
                CLMSUI.vent.trigger ("spectrumShow", visible);
            }
            CLMSUI.vent.trigger ("individualMatchSelected", match);
            this.enableControls (match);
            if (CLMSUI.loggedIn) {
                this.setButtonValidationState (match);
            }
        } else {
            this.newestSelectionShown = false;
        }
    },

    relayout: function () {
        // if a new selected match has been made while the spectrum viewer was hidden,
        // load it in when the spectrum viewer is made visible
        if (!this.newestSelectionShown) {
            //console.log ("LAZY LOADING SPECTRUM");
            var selectedMatch = this.model.get("lastSelectedMatch") || {match: null};
            this.triggerSpectrumViewer (selectedMatch.match, true);
        }
        // resize the spectrum on drag
        CLMSUI.vent.trigger ("resizeSpectrumSubViews", true);

        var altModel = this.alternativesModel.get("clmsModel");
        var keepDisplayNone = (altModel && altModel.get("matches").length === 1); // altModel check as sometime clmsModel isn't populated (undefined)

        var alts = d3.select("#alternatives");
        var w = alts.node().parentNode.parentNode.getBoundingClientRect().width - 20;
        alts.attr("style", "width:"+w+"px;"+(keepDisplayNone ? " display: none;" : "")); //dont know why d3 style() aint working
        // mjg - i dunno why d3.style doesn't work either - i might replace later the layout of the wrapper with a flexbox based layout to see if that helps.
        //cc - yes, probably better, theres old code of mine scattered around that should use flexbox also...
        // anyways at the moment replacing the entire style attribute wipes out display: none when single alt explanation so I've added the above bit of code.
        //alts.style("width", w+"px");
        return this;
    },
    
    identifier: "Spectrum",
    
    optionsToString: function () {
        console.log ("this", this);
        var match = this.primaryMatch;
        var description = [
            {field: "id"},
            {label: "prot1", value: CLMSUI.utils.proteinConcat (match, 0, this.model.get("clmsModel"))},
            {label: "pep1", value: match.matchedPeptides[0].sequence},
            {label: "pos1", value: match.matchedPeptides[0].pos[0]},
            {field: "linkPos1"},
        ];
        if (match.matchedPeptides[1]) {
            description.push (
                {label: "prot2", value: CLMSUI.utils.proteinConcat (match, 1, this.model.get("clmsModel"))},
                {label: "pep2", value: match.matchedPeptides[1].sequence},
                {label: "pos2", value: match.matchedPeptides[1].pos[0]},
                {field: "linkPos2"}
            );
        }
        description.push (
            {field: "score"},
            {field: "autovalidated", label: "Auto"},
            {field: "validated", label: "Val"},
            //["precursorCharge"],
            {field: "searchId"},
            {label:"run", value: match.runName()},
            {field: "scanNumber"},
            {field: "is_decoy", label:"Decoy"}
        );
        description.forEach (function (desc) {
            if (!desc.value) {
                desc.value = match [desc.field];
                if (desc.value === undefined) { desc.value = "null"; }
            }
        });
        //description.push(["crossLinks", match.crossLinks.map(function(xlink) { return xlink.id; }).join("&") ]);
        var description1 = description.map (function (desc) { return (desc.label || desc.field)+"="+desc.value; });
        var joinedDescription = description1.join ("-");
        return joinedDescription;                        
    },
    
    // Returns a useful filename given the view and filters current states
    filenameStateString: function () {
        return CLMSUI.utils.makeLegalFileName (this.identifier+"-"+this.optionsToString());
    },
});

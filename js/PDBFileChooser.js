//		Backbone view and controller for NGL 3D viewer
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, Alex Rose, PDB
//
//		js/PDBFileChooser.js

var CLMSUI = CLMSUI || {};

CLMSUI.PDBFileChooserBB = CLMSUI.utils.BaseFrameView.extend({

    events: function() {
        var parentEvents = CLMSUI.utils.BaseFrameView.prototype.events;
        if (_.isFunction(parentEvents)) {
            parentEvents = parentEvents();
        }
        return _.extend({}, parentEvents, {
            "click .pdbWindowButton": "launchExternalPDBWindow",
            "click .ebiPdbWindowButton": "launchExternalEBIPDBWindow",
            "change .selectPdbButton": "selectPDBFile",
            "keyup .inputPDBCode": "enteringPDBCode",
            "click button.PDBSubmit": "loadPDBCode",
        });
    },

    initialize: function(viewOptions) {
        CLMSUI.PDBFileChooserBB.__super__.initialize.apply(this, arguments);

        // this.el is the dom element this should be getting added to, replaces targetDiv
        var mainDivSel = d3.select(this.el);

        var wrapperPanel = mainDivSel.append("div")
            .attr("class", "panelInner");

        var toolbar = wrapperPanel.append("div").attr("class", "toolbar");

        toolbar.append("span")
            .attr("class", "btn nopadLeft nopadRight sectionDivider2 dashedBorder")
            .text("Either")
            .append("div")
            .append("label")
            .attr("class", "btn btn-1 btn-1a fakeButton")
            .append("span")
            //.attr("class", "noBreak")
            .text("Select Local PDB File")
            .append("input")
            .attr({
                type: "file",
                accept: ".txt,.cif,.pdb",
                class: "selectPdbButton"
            });;

        var pdbCodeSpan = toolbar.append("span")
            .attr("class", "btn sectionDivider2 nopadLeft")
            .text("or Enter 4-character PDB ID")
            .append("div");

        pdbCodeSpan.append("input")
            .attr({
                type: "text",
                class: "inputPDBCode",
                maxlength: 4,
                pattern: CLMSUI.utils.commonRegexes.pdbPattern,
                size: 6,
                title: "Enter a PDB ID here e.g. 1AO6"
            })
            .property("required", true);

        pdbCodeSpan.append("span").attr("class", "prompt").text("→");

        pdbCodeSpan.append("button")
            .attr("class", "PDBSubmit btn btn-1 btn-1a")
            .text("Enter")
            .property("disabled", true);

        var queryBox = toolbar.append("div")
            .attr("class", "verticalFlexContainer queryBox");

        queryBox.append("p").attr("class", "smallHeading").text("PDB Query Services");

        queryBox.append("button")
            .attr("class", "pdbWindowButton btn btn-1 btn-1a")
            .text("Show PDBs Matching UniProt Accessions @ RCSB.Org")
            .attr("title", "Queries via uniprot accession numbers (can be multiple)");

        queryBox.append("button")
            .attr("class", "ebiPdbWindowButton btn btn-1 btn-1a")
            .text("Show PDBs Matching Protein Sequence @ EBI")
            .attr("title", "Queries via individual protein sequence");

        queryBox.selectAll("button")
            .append("i").attr("class", "fa fa-xi fa-external-link");

        this.updateProteinDropdown(queryBox);


        wrapperPanel.append("div").attr("class", "messagebar").html("&nbsp;"); //.style("display", "none");

        this.stage = new NGL.Stage("ngl", { /*fogNear: 20, fogFar: 100,*/
            backgroundColor: "white",
            tooltip: false
        });
        console.log("STAGE", this.stage);
        // populate 3D network viewer if hard-coded pdb id present

        function sanitise(str) {
            return str.replace(/[^a-z0-9 ,.?!]/ig, '');
        }

        this.listenTo(this.model.get("clmsModel"), "change:matches", function() {
            this.updateProteinDropdown(d3.select(this.el).select(".queryBox"));
        });
        this.listenTo(CLMSUI.vent, "proteinMetadataUpdated", function() {
            this.updateProteinDropdown(d3.select(this.el).select(".queryBox"));
        });

        this.listenTo(this.model, "3dsync", function(sequences) {
            var count = sequences && sequences.length ? sequences.length : 0;
            var success = count > 0;
            this.setCompletedEffect();

            var msg = sequences.failureReason ? "" : "Completed Loading " + sanitise(sequences.pdbid) + ".<br>";
            msg += success ? "✓ Success! " + count + " sequence" + (count > 1 ? "s" : "") + " mapped between this search and the PDB file." :
                sanitise((sequences.failureReason || "No sequence matches found between this search and the PDB file") +
                    ". Please check the PDB file or code is correct.");
            this.setStatusText(msg, success);
        });

        this.listenTo(CLMSUI.vent, "alignmentProgress", function(msg) {
            this.setStatusText(msg);
        })
    },

    updateProteinDropdown: function(parentElem) {
        CLMSUI.utils.addMultipleSelectControls({
            addToElem: parentElem,
            selectList: ["Proteins"],
            optionList: CLMS.arrayFromMapValues(this.model.get("clmsModel").get("participants")).filter(function(prot) {
                return !prot.is_decoy;
            }),
            keepOldOptions: false,
            selectLabelFunc: function() {
                return "Select Protein for EBI Sequence Search ►";
            },
            optionLabelFunc: function(d) {
                return d.name;
            },
            optionValueFunc: function(d) {
                return d.id;
            },
            idFunc: function(d) {
                return d.id;
            },
            //changeFunc: function () { self.axisChosen().render(); },
        });

    },


    launchExternalPDBWindow: function() {
        // http://stackoverflow.com/questions/15818892/chrome-javascript-window-open-in-new-tab
        // annoying workaround whereby we need to open a blank window here and set the location later
        // otherwise chrome/pop-up blockers think it is some spammy popup rather than something the user wants.
        // Basically chrome has this point in this function as being traceable back to a user click event but the
        // callback from the ajax isn't.
        var newtab = window.open("", "_blank");
        var accessionIDs = CLMSUI.modelUtils.getLegalAccessionIDs(CLMSUI.compositeModelInst.get("clmsModel").get("participants"));
        if (accessionIDs.length) {
            CLMSUI.modelUtils.getPDBIDsForProteins(
                accessionIDs,
                function(data) {
                    var ids = data.split("\n");
                    var lastID = ids[ids.length - 2]; // -2 'cos last is actually an empty string after last \n
                    newtab.location = "https://www.rcsb.org/pdb/results/results.do?qrid=" + lastID;
                }
            );
        } else {
            newtab.document.body.innerHTML = "No legal Accession IDs are in the current dataset. These are required to query the PDB service.";
        }
    },


    getSelectedOption: function(higherElem, selectName) {
        var funcMeta;

        //this.controlDiv
        higherElem
            .selectAll("select")
            .filter(function(d) {
                return d === selectName;
            })
            .selectAll("option")
            .filter(function() {
                return d3.select(this).property("selected");
            })
            .each(function(d) {
                funcMeta = d;
            });

        return funcMeta;
    },

    launchExternalEBIPDBWindow: function() {
        var chosenSeq = (this.getSelectedOption(d3.select(this.el).select(".toolbar"), "Proteins") || {
            sequence: ""
        }).sequence;
        window.open("http://www.ebi.ac.uk/pdbe-srv/PDBeXplore/sequence/?seq=" + chosenSeq + "&tab=PDB%20entries", "_blank");
    },

    setWaitingEffect: function() {
        this.setStatusText("Please Wait...");
        d3.select(this.el).selectAll(".toolbar, .fakeButton").property("disabled", true).attr("disabled", true);
        d3.select(this.el).selectAll(".toolbar .btn").property("disabled", true);
    },

    setCompletedEffect: function() {
        d3.select(this.el).selectAll(".toolbar, .fakeButton").property("disabled", false).attr("disabled", null);
        d3.select(this.el).selectAll(".toolbar .btn").property("disabled", false);
    },

    setStatusText: function(msg, success) {
        var mbar = d3.select(this.el).select(".messagebar"); //.style("display", null);
        var t = mbar.html(msg);
        if (success !== undefined) {
            t = t.transition().delay(0).duration(1000).style("color", (success === false ? "red" : (success ? "blue" : null)));
            t.transition().duration(5000).style("color", "#091d42");
        } else {
            t.style("color", "#091d42");
        }
    },

    selectPDBFile: function(evt) {
        this.setWaitingEffect();
        var self = this;
        var fileObj = evt.target.files[0];

        CLMSUI.modelUtils.loadUserFile(fileObj, function(pdbFileContents) {
            var blob = new Blob([pdbFileContents], {
                type: 'application/text'
            });
            var fileExtension = fileObj.name.substr(fileObj.name.lastIndexOf('.') + 1);
            CLMSUI.modelUtils.repopulateNGL({
                pdbFileContents: blob,
                ext: fileExtension,
                name: fileObj.name,
                stage: self.stage,
                bbmodel: self.model
            });
        });
    },

    enteringPDBCode: function(evt) {
        var valid = this.isPDBCodeValid();
        d3.select(this.el).select(".PDBSubmit").property("disabled", !valid);
        if (valid && evt.keyCode === 13) { // if return key pressed do same as pressing 'Enter' button
            this.loadPDBCode();
        }
    },

    loadPDBCode: function() {
        var pdbCode = d3.select(this.el).select(".inputPDBCode").property("value");
        this.setWaitingEffect();
        CLMSUI.modelUtils.repopulateNGL({
            pdbCode: pdbCode,
            stage: this.stage,
            bbmodel: this.model
        });
    },

    isPDBCodeValid: function() {
        var elem = d3.select(this.el).select(".inputPDBCode");
        return elem.node().checkValidity();
    },

    identifier: "PDB File Chooser",
});
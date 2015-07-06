<?php
//  CLMS-UI
//  Copyright 2015 Colin Combe, Rappsilber Laboratory, Edinburgh University
//
//  This file is part of CLMS-UI.
//
//  CLMS-UI is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  CLMS-UI is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with CLMS-UI.  If not, see <http://www.gnu.org/licenses/>.
?>
	<script>
	function linkSummary() {
		var html = "TEST";

			//~ var links = xlv.proteinLinks.values();
			//~ var lc = links.length;
			//~ for (var l = 0; l < lc; l++) {
				//~ var link = links[l];
				//~ html += "<u>" + link.fromProtein.name + " - " + link.toProtein.name + "</u><br/>"
				//~ //inter protein res links
				//~ var c2 = link.residueLinks.values().length;
				//~ var lcount = 0;
				//~ for (var rl = 0; rl < c2; rl++) {
					//~ var set1 = false;
					//~ var set2 = false;
					//~ var set3 = false;
//~ 
					//~ var resLink = link.residueLinks.values()[rl];
					//~ var count = resLink.matches.length;
					//~ for (var i = 0; i < count; i++) {
						//~ var match = resLink.matches[i];
						//~ if (match.search_id == PV.set1)
							//~ set1 = true;
						//~ else if (match.search_id == PV.set2)
							//~ set2 = true;
						//~ else if (match.search_id == PV.set3)
							//~ set3 = true;
					//~ }
					//~ if (set1 && !set2 && !set3)
						//~ set1Links.push(resLink);
					//~ else
					//~ if (!set1 && set2 && !set3)
						//~ set2Links.push(resLink);
					//~ else
					//~ if (!set1 && !set2 && set3)
						//~ set3Links.push(resLink);
					//~ else
						//~ nonuniqueLinks.push(resLink);
				//~ }
			//~ }		

		var wnd = window.open();//"about:blank", "", "_blank");
		wnd.document.write(html);
	}
/*
		if (PV.set1 !== undefined) {
			var set1Links = [];
			var set2Links = [];
			var set3Links = [];
			var nonuniqueLinks = [];



			set1Links.sort(function(a, b) {
				var result = (a.fromResidue - 0) - (b.fromResidue - 0);
				if (result === 0) {
					result = (a.toResidue - 0) - (b.toResidue - 0)
				}
				return result;
			});
			set2Links.sort(function(a, b) {
				var result = (a.fromResidue - 0) - (b.fromResidue - 0);
				if (result === 0) {
					result = (a.toResidue - 0) - (b.toResidue - 0)
				}
				return result;
			});

			set3Links.sort(function(a, b) {
				var result = (a.fromResidue - 0) - (b.fromResidue - 0);
				if (result === 0) {
					result = (a.toResidue - 0) - (b.toResidue - 0)
				}
				return result;
			});

			nonuniqueLinks.sort(function(a, b) {
				var result = (a.fromResidue - 0) - (b.fromResidue - 0);
				if (result === 0) {
					result = (a.toResidue - 0) - (b.toResidue - 0)
				}
				return result;
			});

			var html = "<br/><strong>Search ID: " + PV.set1 + " only (" + set1Links.length + " links)</strong><br/><br/>";
			var c2 = set1Links.length;
			for (var rl = 0; rl < c2; rl++) {
				var resLink = set1Links[rl];
				html += resLink.fromProtein.name.substring(0, 4) + ", <strong>" + resLink.fromResidue + "</strong> (" + link.fromProtein.sequence[resLink.fromResidue - 1]
						+ ") - "
						+ resLink.toProtein.name.substring(0, 4) + ", <strong>" + resLink.toResidue + "</strong> (" + link.toProtein.sequence[resLink.toResidue - 1] + "), " + "";

				html += resLink.matches[0].pep1Seq + " to " + resLink.matches[0].pep2Seq + "</br>";


			}

			html += "<br/><strong>Search ID: " + PV.set2 + " only (" + set2Links.length + " links)</strong><br/><br/>";
			var c2 = set2Links.length;
			for (var rl = 0; rl < c2; rl++) {
				var resLink = set2Links[rl];
				html += resLink.fromProtein.name.substring(0, 4) + ", <strong>" + resLink.fromResidue + "</strong> (" + link.fromProtein.sequence[resLink.fromResidue - 1]
						+ ") - "
						+ resLink.toProtein.name.substring(0, 4) + ", <strong>" + resLink.toResidue + "</strong> (" + link.toProtein.sequence[resLink.toResidue - 1] + "), " + "";

				html += resLink.matches[0].pep1Seq + " to " + resLink.matches[0].pep2Seq + "</br>";
			}

			html += "<br/><strong>Search ID: " + PV.set3 + " only (" + set3Links.length + " links)</strong><br/><br/>";
			var c2 = set3Links.length;
			for (var rl = 0; rl < c2; rl++) {
				var resLink = set3Links[rl];
				html += resLink.fromProtein.name.substring(0, 4) + ", <strong>" + resLink.fromResidue + "</strong> (" + link.fromProtein.sequence[resLink.fromResidue - 1]
						+ ") - "
						+ resLink.toProtein.name.substring(0, 4) + ", <strong>" + resLink.toResidue + "</strong> (" + link.toProtein.sequence[resLink.toResidue - 1] + "), " + "";

				html += resLink.matches[0].pep1Seq + " to " + resLink.matches[0].pep2Seq + "</br>";
			}



			html += "<br/><strong>Non-unique - multiple searches (" + nonuniqueLinks.length + " links)</strong><br/><br/>";
			var c2 = nonuniqueLinks.length;
			for (var rl = 0; rl < c2; rl++) {
				var resLink = nonuniqueLinks[rl];
				html += resLink.fromProtein.name.substring(0, 4) + ", <strong>" + resLink.fromResidue + "</strong> (" + link.fromProtein.sequence[resLink.fromResidue - 1]
						+ ") - "
						+ resLink.toProtein.name.substring(0, 4) + ", <strong>" + resLink.toResidue + "</strong> (" + link.toProtein.sequence[resLink.toResidue - 1] + "), " + "";

				html += resLink.matches[0].pep1Seq + " to " + resLink.matches[0].pep2Seq + "</br>";
			}
			PV.html(html);
		}
		else
		{*/
		/*	var html = "Link summary (after filtering) for search ID: " + xlv.sid + "<br/><br/>";
			var links = XiPV.proteinLinks.values();
			var lc = links.length;
			for (var l = 0; l < lc; l++) {
				var link = links[l];
				//            if (link.fromProt != link.toProt){
				html += "<u>" + link.fromProtein.name + " - " + link.toProtein.name + "</u><br/><br/>"
							+"FromProtein, FromResidue, FromAA, ToProtein, ToResidue, ToAA, HighestScore, NumberMatches, Distance<br/>";
				//inter protein res links
				var c2 = link.residueLinks.values().length;
				var lcount = 0;
				for (var rl = 0; rl < c2; rl++) {
					var resLink = link.residueLinks.values()[rl];
					var matchFound = false;

					var scans = "[scan numbers:";
					var count = resLink.matches.length;

					var highestScore = 0;
					var noMatches = 0;
					var d;
					if (typeof XiPV.shortestDists !== 'undefined') {d = XiPV.shortestDists[resLink.id];}
					for (var i = 0; i < count; i++) {
						var match = resLink.matches[i];
						if (match.check()) {
							noMatches++;

							if (match.score > highestScore) {
								highestScore = match.score;
							}

							if (matchFound)
								scans += ", ";
							else
								matchFound = true;
							scans += match.scan_no;
						}
					}
					if (matchFound) {
						html += link.fromProtein.name + ", " + resLink.fromResidue + ", " + link.fromProtein.sequence[resLink.fromResidue - 1]
								+ ", "
								+ link.toProtein.name + ", " + resLink.toResidue + ", " + link.toProtein.sequence[resLink.toResidue - 1] + ", " + highestScore + ", " + noMatches + ", " + d + "<br/>";
						lcount++;
					}
				}
				html += "<br/><br/>(" + lcount + " unique links)<br/><br/>";
				//            }
			}
			PV.html(html);
		//~ }
		 

	}

	function residueSummary() {
		var html = "<h2>Summary of linked residues (currently ignores score cut-off)</h2>";
		var resTypes = {};
		var resPairTypes = {};

		var prots = XiPV.proteins.values();
		var proteinCount = prots.length;
		for (var p = 0; p < proteinCount; p++) {
			var protein = prots[p];
			//            var intraCount = 0;

			var proteinSelfLink = XiPV.proteinLinks.get(protein.id + "-" + protein.id);
			if (proteinSelfLink != undefined) {
				//        alert("in");
				var internalLinks = proteinSelfLink.residueLinks.values();
				var iLinkCount = internalLinks.length;
				for (var l = 0; l < iLinkCount; l++) {

					//                    intraCount++;
					var intLink = internalLinks[l];
					var res1 = protein.sequence[intLink.fromResidue - 1];
					var res2 = protein.sequence[intLink.toResidue - 1];
					if (res2 < res1) {
						var temp = res1;
						res1 = res2;
						res2 = temp;
					}
					var resPairKey = res1 + '-' + res2;
					var resPairCount = resPairTypes[resPairKey];
					if (resPairCount == undefined) {
						resPairCount = {key: resPairKey, lnkCnt: 0, links: {}};
						resPairTypes[resPairKey] = resPairCount;
					}
					resPairCount["lnkCnt"]++;
					//                    addLinkSummary(intLink, resPairCount["links"]);

					var res1Count = resTypes[res1];
					if (res1Count == undefined) {
						res1Count = {key: res1, lnkCnt: 0, links: {}};
						resTypes[res1] = res1Count;
					}
					res1Count["lnkCnt"]++;
					//                    addLinkSummary(intLink, res1Count["links"]);

					var res2Count = resTypes[res2];
					if (res2Count == undefined) {
						res2Count = {key: res2, lnkCnt: 0, links: {}};
						resTypes[res2] = res2Count;
					}

					res2Count["lnkCnt"]++;
					//                    addLinkSummary(intLink, res2Count["links"]);
				}
			}
		}



		var links = XiPV.proteinLinks.values();
		var linkCount = links.length;
		for (var l = 0; l < linkCount; l++) {
			var link = links[l];
			if (link.fromProtein != link.toProtein) {
				//                            html += "<u>Inter protein links:"+link.id+"</u><br/><br/>"
				//inter protein res links
				var c2 = link.residueLinks.values().length;
				var interCount = 0;
				for (var rl = 0; rl < c2; rl++) {
					var resLink = link.residueLinks.values()[rl];
					var res1 = resLink.fromProtein.sequence[resLink.fromResidue - 1];
					var res2 = resLink.toProtein.sequence[resLink.toResidue - 1];
					if (res2 < res1) {
						var temp = res1;
						res1 = res2;
						res2 = temp;
					}
					var resPairKey = res1 + '-' + res2;
					var resPairCount = resPairTypes[resPairKey];
					if (resPairCount == undefined) {
						resPairCount = {key: resPairKey, lnkCnt: 0, links: {}};
						resPairTypes[resPairKey] = resPairCount;
					}
					resPairCount["lnkCnt"]++;
					//                                    addLinkSummary(intLink, resPairCount["links"]);

					var res1Count = resTypes[res1];
					if (res1Count == undefined) {
						res1Count = {key: res1, lnkCnt: 0, links: {}};
						resTypes[res1] = res1Count;
					}
					res1Count["lnkCnt"]++;
					//                addLinkSummary(resLink, res1Count["links"]);

					var res2Count = resTypes[res2];
					if (res2Count == undefined) {
						res2Count = {key: res2, lnkCnt: 0, links: {}};
						resTypes[res2] = res2Count;
					}

					res2Count["lnkCnt"]++;
					//                addLinkSummary(resLink, res2Count["links"]);}
					//                            html += " (" + interCount + " unique links)<br/>";
				}
			}
		}

		//            html += "<u>"+ protein.name + " <b>(" + intraCount + " unique internal links)</b></u><br/><br/> ";
		//            var table1 = "<table><tr><th>Residue Pairs</th><th>#Unique links</th>"
		//                + "<th>Links</th><th>Details</th></tr>\n";
		//            html += getTableFromResTypeObj(resPairTypes, table1);// + '<pre>' + JSON.stringify(resTypes, null, '\t') + '</pre>';

		html += getTableFromResTypeObj(resPairTypes);
		html += '<br/>';
		html += getTableFromResTypeObj(resTypes);// + '<pre>' + JSON.stringify(resTypes, null, '\t') + '</pre>';


		PV.html(html);
		//
		function addLinkSummary(link, linkInfo) {
			var mCount = link.matches.length;
			var summary = link.id + " (" + mCount + " matches), scans: ";

			var lnkMatches = new Array();
			for (var i = 0; i < mCount; i++) {
				var match = link.matches[i];
				lnkMatches.push({scan_no: match.scan_no,
					score: roundNumber(match.score, 3),
					auto: match.autovalidated,
					val: match.validated});
			}
			lnkMatches.sort(function(a, b) {
				return b["score"] - a["score"]
			});
			linkInfo[link.id] = lnkMatches;
		}
		//
		function getTableFromResTypeObj(resTypes) {
			var sortable = toArray(resTypes);
			sortable.sort(function(a, b) {
				return b["lnkCnt"] - a["lnkCnt"]
			});
			//
			var table = "<table><tr><th>Residue</th><th>#occurences in unique links</th></tr>\n";

			//
			for (var i = 0; i < sortable.length; i++) {
				var resPairRowCount = 0;
				var resPair = sortable[i];
				var uLnkCount = resPair.lnkCnt;
				table += "<tr><td>"
						+ resPair.key + "</td>"
						+ "<td>"
						+ resPair.lnkCnt + "</td></tr>";
				//                var first = true;
				//                var rCnt = 0;
				//                for (var lnk in resPair["links"]){
				//                    rCnt++;
				//                    var linkDetails = resPair["links"][lnk];
				//                    if (!first) table += "<tr>";
				//                    else first = false;
				//                    table += "<td>"+lnk+"</td><td>";
				//                    var summary = "<b>" + linkDetails.length + " matches.</b> Scans[score]:"
				//                    for (var l = 0; l < linkDetails.length; l++){
				//                        var m = linkDetails[l];
				//                        summary += " #" + m.scan_no + " [" + m.score + "] ";
				//                    }
				//                    table += summary + "</td></tr>";
				//                }
				//                for (var thisCodeIsTerrible = 0; thisCodeIsTerrible < (uLnkCount - rCnt); thisCodeIsTerrible++){
				//                    table += "<tr><td></td><td></td></tr>";
				//                }
				//                table += "</td></tr>";
			}
			table += "</table>";
			return table;// + '<pre>' + JSON.stringify(sortable, null, '\t') + '</pre>';
		}
		//
		function toArray(obj) {
			var arr = new Array();
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					arr.push(obj[key]);
				}
			}
			return arr;
		}
	}*/
</script>

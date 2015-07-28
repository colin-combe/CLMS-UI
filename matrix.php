<!--
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
-->
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
		<meta http-equiv="content-type" content="text/html; charset=utf-8" />
		<meta name="description" content="common platform for downstream analysis of CLMS data" />
<!--
		<meta name="viewport" content="initial-scale=1, maximum-scale=1">
-->
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black">
		<link rel="icon" type="image/ico" href="./images/favicon.ico">

		<link rel="stylesheet" href="./css/reset.css" />
		<link rel="stylesheet" href="./css/style.css" />
		<link rel="stylesheet" href="./css/xiNET.css">
		
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
        <script type="text/javascript" src="./vendor/rgbcolor.js"></script>        
        <script type="text/javascript" src="../matrix/Matrix.js"></script>
        <script type="text/javascript" src="../matrix/Distances.js"></script>
        
        <!--xiNET dev-->
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Init.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/MouseEvents.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/TouchEvents.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Layout.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Refresh.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ToolTips.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Match.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Link.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Protein.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/Annotation.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/ProteinLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/model/ResidueLink.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ExternalControls.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/Rotator.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/xiNET_Storage.js"></script>
        <script type="text/javascript" src="../crosslink-viewer/src/controller/ReadCSV.js"></script>
    </head>
    <body>
		<!-- Main -->
<!--
		<div id="main">
-->
			<div style="zoom:0.8;" id="matrixDiv"></div>
			<div id="noDiv" style="display:none;"></div>
<!--
		</div> 
-->

		<script>
     		//<![CDATA[
			"use strict";
		
			//var distances = [[]];

			window.addEventListener("load", function() {
				var matrix = new Graph("matrixDiv");
				/*
				d3.csv("../out2.csv", function(csv){
					var domainArray = [];
					var digitsRegex = /....(\d*)/g;
					for (var i = 0; i < csv.length; i++){
						var xwalkLink = csv[i];
										//id, 
							//pep1_protIDs, pep1_positions, pep1_seq, linkPos1, 
							//pep2_protIDs, pep2_positions, pep2_seq, linkPos2,
							//score, dataSetId, autovalidated, validated

						var id = "'"+xwalkLink.aa1 + "to" + xwalkLink.aa2+"'";
						digitsRegex.lastIndex = 0;
						var linkPos1 = parseInt(digitsRegex.exec(xwalkLink.aa1)[1]);	
						digitsRegex.lastIndex = 0;
						var linkPos2 = parseInt(digitsRegex.exec(xwalkLink.aa2)[1]);	
						
						var seqDist = parseFloat(xwalkLink.seqDist);
						var eucDist = parseFloat(xwalkLink.eucDist);
						var sasDist = parseFloat(xwalkLink.sasDist);
						if (linkPos1 > linkPos2){
							var swap = linkPos2;
							linkPos2 = linkPos1;
							linkPos1 = swap;
						}
						// if (seqDist > 12) {
							// domainArray.push(sasDist);
							if (!distances[linkPos1]){
								distances[linkPos1] = [];
							}
							if (!distances[linkPos2]){
								distances[linkPos2] = [];
							}
							
							distances[linkPos1][linkPos2] = sasDist; 
							// distances[linkPos2][linkPos1] = eucDist; 
						// }
						
					}
					
					d3.csv("../HSA_dist2.csv", function(eucData){
						for (var d = 0; d < eucData.length; d++){
							var euc = eucData[d];
							linkPos1 = parseInt(euc.FromResidue);	
							linkPos2 = parseInt(euc.ToResidue);	
							eucDist = parseFloat(euc.Angstrom);
							var fromAA = euc.FromAA.trim();
							var toAA = euc.ToAA.trim();
							//LYS#SER#TYR#THR
							if (eucDist <= 34 && (fromAA == 'LYS'
								|| fromAA == 'SER'
								|| fromAA == 'TYR'
								|| fromAA == 'THR'
								|| toAA == 'LYS'
								|| toAA == 'SER'
								|| toAA == 'TYR'
								|| toAA == 'THR')
								){
								if (linkPos1 > linkPos2){
									var swap = linkPos2;
									linkPos2 = linkPos1;
									linkPos1 = swap;
								}
								if (!distances[linkPos1]){
									distances[linkPos1] = [];
								}
								if (!distances[linkPos2]){
									distances[linkPos2] = [];
								}
								//console.log(linkPos1 + " " +linkPos2 + " " + eucDist);
								distances[linkPos2][linkPos1] = eucDist; 
							}
						}
					} );
				
				} );			*/				
						//matrixDiv.innerHTML = JSON.stringify(distances);
						
						
						var targetDiv = document.getElementById('noDiv');
						var xlv = new xiNET.Controller(targetDiv);
						
						xlv.addProtein ('741824','ALBU','DAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAALGL','ALBU_HUMAN Serum albumin active OS=Homo sapiens GN=ALB PE=1 SV=2','P02768-A','585')
						xlv.addMatches([[178080209,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",7,15.232505106071397,2467,"t","A"],[178118869,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[11],"FKDLGEENFK",2,14.543739890542351,2467,"t","A"],[178028736,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[1],"DAHKsda-loopSEVAHR",1,14.162799697370383,2467,"t","A"],[178155602,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLKK",22,"741824",[13],"DLGEENFK",5,14.117891178933629,2467,"t","A"],[178059918,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,14.063175960740029,2467,"t","A"],[178054692,"741824",[161],"YKAAFTECcmCcmQAADK",1,"741824",[11],"FKsda-loopDLGEENFK",7,14.060830572084473,2467,"t","A"],[178092357,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,14.0500270826337,2467,"t","A"],[177993407,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.994850342029494,2467,"t",""],[178132266,"741824",[52],"TCcmVADESAENCcmDK",5,"741824",[1],"DAHKsda-loopSEVAHR",1,13.97878165192937,2467,"f","A"],[178043005,"741824",[65],"SLHTLFGDKLCcmTVATLR",1,"741824",[52],"TCcmVADESAENCcmDK",12,13.954776594869907,2467,"f","A"],[178092292,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.932340341316813,2467,"t",""],[178013383,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[13],"DLGEENFK",4,13.910993413953301,2467,"t","A"],[178141349,"741824",[65],"SLHTLFGDKLCcmTVATLR",1,"741824",[52],"TCcmVADESAENCcmDK",10,13.907678496045381,2467,"f","A"],[177972585,"741824",[161],"YKAAFTECcmCcmQAADK",1,"741824",[11],"FKsda-loopDLGEENFK",7,13.876327675107024,2467,"t",""],[178102606,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.821002882446228,2467,"t",""],[178015340,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLK",20,"741824",[161],"YKAAFTECcmCcmQAADK",1,13.80885316305968,2467,"t","A"],[178092862,"741824",[501],"EFNAETFTFHADICcmTLSEK",17,"741824",[525],"KQTALVELVK",2,13.794404827157098,2467,"t","A"],[178136590,"741824",[415],"VPQVSTPTLVEVSR",11,"741824",[187],"DEGKASSAKsda-loopQR",4,13.75869573312998,2467,"t","A"],[178054517,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.67471445003692,2467,"t",""],[177979267,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.630677446563755,2467,"t",""],[178124037,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.612308352001657,2467,"t",""],[178150969,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLK",21,"741824",[161],"YKAAFTECcmCcmQAADK",1,13.61194404960375,2467,"t","A"],[178150069,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",7,13.560549257470848,2467,"t",""],[178102626,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.557092895157979,2467,"t",""],[178097453,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[1],"DAHKsda-loopSEVAHR",1,13.49417351580424,2467,"t",""],[178012985,"741824",[337],"RHPDYSVVLLLR",4,"741824",[210],"AFKAWAVAR",3,10.749640161058887,2467,"t",""]]);
						
						<?php //include 'php/loadData.php' ?>

						matrix.setData(distances, xlv);
						

			} );

			
			//]]>
        </script>
	</body>
</html>

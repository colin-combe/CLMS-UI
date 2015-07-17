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

		<script type="text/javascript" src="/js/build/ngl.embedded.min.js"></script>
        <script type="text/javascript" src="./vendor/d3.js"></script>
        <script type="text/javascript" src="./vendor/colorbrewer.js"></script>
       	<script type="text/javascript" src="./vendor/FileSaver.js"></script>
        <script type="text/javascript" src="./vendor/rgbcolor.js"></script>
        
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
		<div id="main">
			<div>
				<div id="topDiv">
					<div id="topLeftDiv">
					</div>
					<div id="topRightDiv">
						<div >
							<label>Distance labels
								<input id="distLabels"
									   onclick="distanceLabels(document.getElementById('distLabels').checked);"
									   type="checkbox"
								/>
							</label>
						</div>
						<div id="nglDiv"></div>
					</div>
				</div>
								
				<div id=splitterDiv class="horizontalSplitter noMarg"></div>

				<div id="bottomDiv" class="overlay-box noMarg">
						<p>Selection details (todo)</p>
				</div>
				<script>
				//<![CDATA[
					var marginBottom = 0;
					var minBottomDivHeight = 40;
					var splitterDivHeight = 20;
					var splitterDragging = false;
					var splitterDiv = document.getElementById("splitterDiv");
					var topDiv = document.getElementById("topDiv");
					var bottomDiv = document.getElementById("bottomDiv");
					var main = document.getElementById("main");
					splitterDiv.onmousedown = function(evt) {
						splitterDragging = true;
					}
					main.onmousemove = function(evt) {
						if (splitterDragging === true || !evt){
							var element = topDiv;
							var top = 0;
							do {
								top += element.offsetTop  || 0;
								element = element.offsetParent;
							} while(element);
							var topDivHeight;
							if (evt) topDivHeight = evt.pageY - top - (splitterDivHeight / 2);
							else topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
							if (topDivHeight < 0) topDivHeight = 0;
							var bottomDivHeight = window.innerHeight - top - topDivHeight - splitterDivHeight - marginBottom;
							if (bottomDivHeight < minBottomDivHeight){
								bottomDivHeight = minBottomDivHeight;
								topDivHeight = window.innerHeight - top - splitterDivHeight - minBottomDivHeight- marginBottom;
							}
							topDiv.setAttribute("style", "height:"+topDivHeight+"px;");
							bottomDiv.setAttribute("style", "height:"+bottomDivHeight+"px;");
						};
					}
					main.onmouseup = function(evt) {
						splitterDragging = false;
					}

					main.onmousemove();

				//]]>
				</script>
			</div>

		</div><!-- MAIN -->

		<script>
     		//<![CDATA[
			var stage;
			
			var xlRes = {};
			var xlResList = [];
			var xlBond = {};

			window.addEventListener("load", function() {
				//create 2D network viewer
				var targetDiv = document.getElementById('topLeftDiv');
				xlv = new xiNET.Controller(targetDiv);
				
				xlv.addProtein ('741824','ALBU','DAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAKTCVADESAENCDKSLHTLFGDKLCTVATLRETYGEMADCCAKQEPERNECFLQHKDDNPNLPRLVRPEVDVMCTAFHDNEETFLKKYLYEIARRHPYFYAPELLFFAKRYKAAFTECCQAADKAACLLPKLDELRDEGKASSAKQRLKCASLQKFGERAFKAWAVARLSQRFPKAEFAEVSKLVTDLTKVHTECCHGDLLECADDRADLAKYICENQDSISSKLKECCEKPLLEKSHCIAEVENDEMPADLPSLAADFVESKDVCKNYAEAKDVFLGMFLYEYARRHPDYSVVLLLRLAKTYETTLEKCCAAADPHECYAKVFDEFKPLVEEPQNLIKQNCELFEQLGEYKFQNALLVRYTKKVPQVSTPTLVEVSRNLGKVGSKCCKHPEAKRMPCAEDYLSVVLNQLCVLHEKTPVSDRVTKCCTESLVNRRPCFSALEVDETYVPKEFNAETFTFHADICTLSEKERQIKKQTALVELVKHKPKATKEQLKAVMDDFAAFVEKCCKADDKETCFAEEGKKLVAASQAALGL','ALBU_HUMAN Serum albumin active OS=Homo sapiens GN=ALB PE=1 SV=2','P02768-A','585')
				xlv.addMatches([[178080209,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",7,15.232505106071397,2467,"t","A"],[178118869,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[11],"FKDLGEENFK",2,14.543739890542351,2467,"t","A"],[178028736,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[1],"DAHKsda-loopSEVAHR",1,14.162799697370383,2467,"t","A"],[178155602,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLKK",22,"741824",[13],"DLGEENFK",5,14.117891178933629,2467,"t","A"],[178059918,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,14.063175960740029,2467,"t","A"],[178054692,"741824",[161],"YKAAFTECcmCcmQAADK",1,"741824",[11],"FKsda-loopDLGEENFK",7,14.060830572084473,2467,"t","A"],[178092357,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,14.0500270826337,2467,"t","A"],[177993407,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.994850342029494,2467,"t",""],[178132266,"741824",[52],"TCcmVADESAENCcmDK",5,"741824",[1],"DAHKsda-loopSEVAHR",1,13.97878165192937,2467,"f","A"],[178043005,"741824",[65],"SLHTLFGDKLCcmTVATLR",1,"741824",[52],"TCcmVADESAENCcmDK",12,13.954776594869907,2467,"f","A"],[178092292,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.932340341316813,2467,"t",""],[178013383,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[13],"DLGEENFK",4,13.910993413953301,2467,"t","A"],[178141349,"741824",[65],"SLHTLFGDKLCcmTVATLR",1,"741824",[52],"TCcmVADESAENCcmDK",10,13.907678496045381,2467,"f","A"],[177972585,"741824",[161],"YKAAFTECcmCcmQAADK",1,"741824",[11],"FKsda-loopDLGEENFK",7,13.876327675107024,2467,"t",""],[178102606,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.821002882446228,2467,"t",""],[178015340,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLK",20,"741824",[161],"YKAAFTECcmCcmQAADK",1,13.80885316305968,2467,"t","A"],[178092862,"741824",[501],"EFNAETFTFHADICcmTLSEK",17,"741824",[525],"KQTALVELVK",2,13.794404827157098,2467,"t","A"],[178136590,"741824",[415],"VPQVSTPTLVEVSR",11,"741824",[187],"DEGKASSAKsda-loopQR",4,13.75869573312998,2467,"t","A"],[178054517,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.67471445003692,2467,"t",""],[177979267,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",3,13.630677446563755,2467,"t",""],[178124037,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.612308352001657,2467,"t",""],[178150969,"741824",[115],"LVRPEVDVMCcmTAFHDNEETFLK",21,"741824",[161],"YKAAFTECcmCcmQAADK",1,13.61194404960375,2467,"t","A"],[178150069,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKDLGEENFK",7,13.560549257470848,2467,"t",""],[178102626,"741824",[161],"YKAAFTECcmCcmQAADK",2,"741824",[11],"FKsda-loopDLGEENFK",7,13.557092895157979,2467,"t",""],[178097453,"741824",[52],"TCcmVADESAENCcmDK",6,"741824",[1],"DAHKsda-loopSEVAHR",1,13.49417351580424,2467,"t",""],[178012985,"741824",[337],"RHPDYSVVLLLR",4,"741824",[210],"AFKAWAVAR",3,10.749640161058887,2467,"t",""]]);
				
				//xiNET initialisation
				xlv.initLayout();
				xlv.initProteins();



				//create 3D network viewer
				if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
				NGL.init( function(){
					stage = new NGL.Stage( "nglDiv" );
					stage.loadFile( "rcsb://1AO6", {
						onLoad: prepareStructure,
						sele: ":A"
					} );
					stage.signals.atomPicked.add( handleAtomPicking );
					
					//register callbacks
					xlv.linkSelectionCallbacks.push(function (selectedResidueLinks){
						console.log("SELECTED:", selectedResidueLinks);
						var rl = selectedResidueLinks.values()[0];
						if( rl && stage ){
							console.log( rl.fromResidue, rl.toResidue );
							stage.getRepresentationsByName( "linkedRes" )
								.setSelection( rl.fromResidue + " OR " + rl.toResidue );
						}else{
							stage.getRepresentationsByName( "linkedRes" )
								.setSelection( "none" );
						}
					});
					xlv.linkHighlightsCallbacks.push(function (highlightedLinks){
						console.log("HIGHLIGHTED:", highlightedLinks);
						var rl = highlightedLinks.values()[0];
						if( rl && stage ){
							console.log( rl.fromResidue, rl.toResidue );
							stage.getRepresentationsByName( "focusedBondRes" )
								.setSelection( rl.fromResidue + " OR " + rl.toResidue );
						}else{
							stage.getRepresentationsByName( "focusedBondRes" )
								.setSelection( "none" );
						}
					});				
				} );

			} );


			function handleAtomPicking( atom, bond ){

				var focusedComp = stage.getRepresentationsByName( "focusedRes" );
				var linkedComp = stage.getRepresentationsByName( "linkedRes" );
				var focusedBondComp = stage.getRepresentationsByName( "focusedBondRes" );

				if( !focusedComp || !linkedComp || !focusedBondComp ) return;

				if( atom !== undefined && bond === undefined ){

					var linkedRes = xlRes[ atom.resno ];

					if( linkedRes ){

						focusedComp.setSelection( resToSele( atom.resno ) );
						linkedComp.setSelection( resToSele( linkedRes ) );

						document.getElementById('bottomDiv').innerHTML = "[" + atom.resno + "] " + linkedRes.join( ", ");

					}else{

						focusedComp.setSelection( "none" );
						linkedComp.setSelection( "none" );

						document.getElementById('bottomDiv').innerHTML =  "none";

					}

					focusedBondComp.setSelection( "none" );

				}else if( bond !== undefined ){

					var bondedRes = xlBond[ getBondName( bond ) ];

					if( bondedRes ){

						focusedBondComp.setSelection( resToSele( bondedRes ) );

						document.getElementById('bottomDiv').innerHTML = bondedRes.join( ", ");

					}else{

						focusedBondComp.setSelection( "none" );

						document.getElementById('bottomDiv').innerHTML =  "none";

					}

					focusedComp.setSelection( "none" );
					linkedComp.setSelection( "none" );

				}else{

					focusedComp.setSelection( "none" );
					linkedComp.setSelection( "none" );
					focusedBondComp.setSelection( "none" );

					document.getElementById('bottomDiv').innerHTML = "none";

				}

			}


			function resToSele( resnoList, asSelection ){

				if( !Array.isArray( resnoList ) ) resnoList = [ resnoList ];
				var sele = "( " + resnoList.join( " OR " ) + " ) AND .CA";
				return asSelection ? new NGL.Selection( sele ) : sele;

			}


			function getBondName( bond ){

				var resno1, resno2;

				if( arguments.length > 1 ){
					resno1 = arguments[ 0 ];
					resno2 = arguments[ 1 ];
				}else{
					resno1 = bond.atom1.resno;
					resno2 = bond.atom2.resno;
				}

				if( resno1 > resno2 ){
					var tmp = resno1
					resno1 = resno2;
					resno2 = tmp;
				}

				return resno1 + "|" + resno2;

			}
				

			function prepareStructure( comp ){

				structure = comp.structure;

				comp.requestGuiVisibility( false );

				comp.addRepresentation( "cartoon", { color: "residueindex" } );

				comp.addRepresentation( "spacefill", {
					sele: "none",
					color: new THREE.Color( "white" ).getHex(),
					scale: 0.6,
					name: "allRes"
				} );

				comp.addRepresentation( "spacefill", {
					sele: "none",
					color: new THREE.Color( "fuchsia" ).getHex(),
					scale: 1.2,
					transparent: true,
					opacity: 0.7,
					name: "focusedRes"
				} );

				comp.addRepresentation( "spacefill", {
					sele: "none",
					color: new THREE.Color( "fuchsia" ).getHex(),
					scale: 0.9,
					name: "linkedRes"
				} );

				stage.centerView( true );
				comp.centerView( true );

				prepareCrosslinkData();
			}

			function prepareCrosslinkData(){
				var residueLinks = xlv.proteinLinks.values()[0].residueLinks.values();
				for (var i = 0; i < residueLinks.length; i++){
					var rl = residueLinks[i];
					
					var resno1 = rl.fromResidue;
					var resno2 = rl.toResidue

					if( xlRes[ resno1 ] === undefined ){
						xlRes[ resno1 ] = [];
					}
					xlRes[ resno1 ].push( resno2 );

					if( xlRes[ resno2 ] === undefined ){
						xlRes[ resno2 ] = [];
					}
					xlRes[ resno2 ].push( resno1 );

					xlBond[ getBondName( resno1, resno2 ) ] = [ resno2, resno1 ];

				} ;

				xlResList = Object.keys( xlRes );

				stage.getRepresentationsByName( "allRes" )
					.setSelection( resToSele( xlResList ) );

				makeCrosslinkStructure();

			}


			function makeCrosslinkStructure(){

				xlStructure = new NGL.StructureSubset(
					structure, resToSele( xlResList, true )
				);
				xlStructure.bondSet.clear();

				var residueLinks = xlv.proteinLinks.values()[0].residueLinks.values();
				console.log("crosslink count:"+residueLinks.length);
				for (var i = 0; i < residueLinks.length; i++){
					var rl = residueLinks[i];

					var resno1 = rl.fromResidue;
					var resno2 = rl.toResidue

					var a1 = xlStructure.getAtoms( resToSele( resno1, true ), true );
					var a2 = xlStructure.getAtoms( resToSele( resno2, true ), true );

					if( a1 && a2 ){
						xlStructure.bondSet.addBond( a1, a2 );
					}

				};

				var comp = stage.addComponentFromObject( xlStructure, { name: "xlinks" } )

				comp.addRepresentation( "licorice", {
					sele: "*",
					color: new THREE.Color( "lightgrey" ).getHex()
				} );

				comp.addRepresentation( "licorice", {
					sele: "none",
					color: new THREE.Color( "fuchsia" ).getHex(),
					scale: 2.5,
					transparent: true,
					opacity: 0.6,
					name: "focusedBondRes"
				} );

				//~ comp.addBufferRepresentation( getLabelBuffer(), {
					//~ name: "distanceLabel"
				//~ } );

			}


			function getLabelBuffer(){

				var n = xlStructure.bondSet.bondCount;

				var bondLabel = new Array( n );
				var bondCenter = new Float32Array( n * 3 );

				var i = 0;
				var i3 = 0;

				xlStructure.bondSet.eachBond( function( bond ){

					var a1 = bond.atom1;
					var a2 = bond.atom2;

					bondLabel[ i ] = a1.distanceTo( a2 ).toFixed( 2 );

					bondCenter[ i3 + 0 ] = ( a1.x + a2.x ) / 2;
					bondCenter[ i3 + 1 ] = ( a1.y + a2.y ) / 2;
					bondCenter[ i3 + 2 ] = ( a1.z + a2.z ) / 2;

					i += 1;
					i3 += 3;

				} );

				console.log( bondLabel, bondCenter );

				var buffer = new NGL.TextBuffer(
					bondCenter,
					NGL.Utils.uniformArray( n, 2.5 ),
					NGL.Utils.uniformArray3( n, 1.0, 1.0, 1.0 ),
					bondLabel,
					{
						nearClip: true
					}
				);

				console.log( buffer )

				return buffer;

			}
			
			//]]>
        </script>
	</body>
</html>

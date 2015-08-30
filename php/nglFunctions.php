<script>
//<![CDATA[

 "use strict";

var xlRes = {};
var xlResList = [];
var xlBond = {};
var xlPair = [];

var structure;
var strucComp;

function initNGL(){
	//create 3D network viewer
	if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
	else {
		NGL.init( function(){
		stage = new NGL.Stage( "nglDiv" );

		stage.loadFile( "rcsb://1AO6", {
			onLoad: prepareStructure,
			sele: ":A"
		} );
		//~ stage.signals.onPicking.add( handlePicking );

		/* register callbacks for ngl */

		xlv.linkSelectionCallbacks.push(function (selectedLinks){
			console.log("SELECTED:", selectedLinks);
			var rl = selectedLinks.values()[0];
			if( rl && rl.toResidue && stage ){
				console.log( rl.fromResidue, rl.toResidue );
				stage.getRepresentationsByName( "allRes" )
					.setSelection("(" + rl.fromResidue + " OR " + rl.toResidue + ") AND .CA");
				stage.getRepresentationsByName( "focusedBond" )
					.setSelection( rl.fromResidue + " OR " + rl.toResidue );//resToSele(rl.fromResidue + "|" + rl.toResidue) );
			}else{
				stage.getRepresentationsByName( "allRes" )
					.setSelection("none");//resToSele( xlResList ));
				stage.getRepresentationsByName( "focusedBond" )
					.setSelection("none");					
				}
			});
		});

		//~ xlv.linkHighlightsCallbacks.push(function (highlightedLinks){
			//~ console.log("HIGHLIGHTED:", highlightedLinks);
			//~ var rl = highlightedLinks.values()[0];
			//~ if( rl && stage ){
				//~ console.log( rl.fromResidue, rl.toResidue );
				//~ stage.getRepresentationsByName( "focusedBondRes" )
					//~ .setSelection( rl.fromResidue + " OR " + rl.toResidue );
			//~ }else{
				//~ stage.getRepresentationsByName( "focusedBondRes" )
					//~ .setSelection( "none" );
			//~ }
		//~ });
	}
}

function handlePicking( d ){

	var focusedComp = stage.getRepresentationsByName( "focusedRes" );
	var linkedComp = stage.getRepresentationsByName( "linkedRes" );
	var focusedBondComp = stage.getRepresentationsByName( "focusedBond" );

	if( !focusedComp || !linkedComp || !focusedBondComp ) return;

	if( d.atom !== undefined && d.bond === undefined ){

		var linkedRes = xlRes[ d.atom.resno ];

		if( linkedRes ){

			focusedComp.setSelection( resToSele( d.atom.resno ) );
			linkedComp.setSelection( resToSele( linkedRes ) );

			//~ textElm.setValue( "[" + d.atom.resno + "] " + linkedRes.join( ", " ) );

		}else{

			focusedComp.setSelection( "none" );
			linkedComp.setSelection( "none" );

			//~ textElm.setValue( "none" );

		}

		focusedBondComp.setSelection( "none" );

	}else if( d.bond !== undefined ){

		var bondedRes = xlBond[ getBondName( d.bond ) ];

		if( bondedRes ){

			focusedBondComp.setSelection( resToSele( bondedRes ) );

			//~ textElm.setValue( bondedRes.join( ", " ) );

		}else{

			focusedBondComp.setSelection( "none" );

			//~ textElm.setValue( "none" );

		}

		focusedComp.setSelection( "none" );
		linkedComp.setSelection( "none" );

	}else{

		focusedComp.setSelection( "none" );
		linkedComp.setSelection( "none" );
		focusedBondComp.setSelection( "none" );

		//~ textElm.setValue( "none" );

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

	strucComp = comp;
	structure = comp.structure;

	comp.requestGuiVisibility( false );

	comp.addRepresentation( "cartoon", {color: "#cccccc"});//"residueindex" } );

	comp.addRepresentation( "spacefill", {
		sele: "none",
		color: new THREE.Color( "white" ).getHex(),
		scale: 0.6,
		name: "allRes"
	} );
/*
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
*/
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

		var a1 = structure.getAtoms( resToSele( resno1, true ), true );
		var a2 = structure.getAtoms( resToSele( resno2, true ), true );

		if( a1 && a2 ){
		    xlPair.push( [ resToSele( resno1 ), resToSele( resno2 ) ] );
		}

	};

	xlResList = Object.keys( xlRes );

	stage.getRepresentationsByName( "allRes" )
		.setSelection( resToSele( xlResList ) );
 /*
	strucComp.addRepresentation( "distance", {
		atomPair: xlPair,
		color: new THREE.Color( "lightgrey" ).getHex(),
		labelSize: 0.001,
		name: "bond"
		} );
*/
	//'#5AAE61','#FDB863','#9970AB'
	strucComp.addRepresentation( "distance", {
			atomPair: xlPair,
			sele: "none",
			color: new THREE.Color( "fuchsia" ).getHex(),
			labelSize: 2.0,
			scale: 1.5,
			//~ transparent: true,
			//~ opacity: 0.6,
			name: "focusedBond"
	} );

}
//]]>
</script>

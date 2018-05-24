<?php

function get_link_sites($pep, $pep_index){
	$linkSitesArr = array();
	
	//ToDO: not future proof for multi-links
	$pep_nomods = preg_replace ( '/[^A-Z#]+/' , '' , $pep);
	preg_match_all( "/#[0-9]?/" , $pep_nomods, $matches, PREG_OFFSET_CAPTURE);

	if (sizeof($matches[0]) == 0){
		array_push($linkSitesArr, array('id' => -1, 'peptideId' => $pep_index, 'linkSite' => -1));
	}

	foreach ($matches[0] as $matchgroup) {
		//extract cl number
		$cl_index = (preg_match("/[0-9]+/", $matchgroup[0], $match) != 0) ? $match : 0;
		array_push($linkSitesArr, array('id' => $cl_index, 'peptideId' => $pep_index, 'linkSite' => $matchgroup[1]-1));
	}

	return $linkSitesArr;
}

function pep_to_array($pep){
	$mods = array();
	$pep = preg_replace( '/#[0-9]?/' , '' , $pep);
	$pepAAseq = str_split(preg_replace ( '/[^A-Z]/' , '' , $pep));
	$pep_array = array();

	foreach ($pepAAseq as $letter) {
		array_push($pep_array, array('aminoAcid' => $letter, 'Modification' => ''));
	}

	preg_match_all('/[^A-Z]+/', $pep, $matches, PREG_OFFSET_CAPTURE);

	$offset = 1;
	foreach ($matches[0] as $matchgroup) {
		$pep_array[$matchgroup[1] - $offset]['Modification'] = $matchgroup[0];
		$offset += strlen($matchgroup[0]);
	}
	return array('sequence' => $pep_array);
}

?>

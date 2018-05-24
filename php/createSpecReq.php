<?php

	require('functions.php');
/*
	if (session_status() === PHP_SESSION_NONE){session_start();}

	if ($_GET['tmp'] == '1'){
		$dbname = "tmp/".$_GET['db'];
	}
	elseif (isset($_GET['db'])){
		$dbname = "saved/".$_GET['db'];
	}
	else {
		die();
	}

	//check authentication
	if(!isset($_SESSION['access'])) $_SESSION['access'] = array();
	if(!in_array($_GET['db'], $_SESSION['access'])){
		//if no valid authentication re-test authentication
		//this includes a connection string to the sql database
		require('../../xiSPEC_sql_conn.php');
		require('checkAuth.php');
	}
	// re-check authentication
	if(!in_array($_GET['db'], $_SESSION['access'])){
		$json['error'] = "Authentication error occured!";
		die(json_encode($json));
	}

	$xiSPEC_ms_parser_dir = '../../xiSPEC_ms_parser/';
	$dir = 'sqlite:'.$xiSPEC_ms_parser_dir.'/dbs/'.$dbname.'.db';
	$dbh = new PDO($dir) or die("cannot open the database");
	$dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    */
	// $query = "SELECT * FROM identifications as i
	// JOIN peakLists AS pl ON i.peakList_id = pl.id
	// WHERE i.id ='".$_GET['id']."';";
	$si_id = $_GET['id'];

	$query = "SELECT
		pep1_table.seq_mods AS pep1,
		pep2_table.seq_mods AS pep2,
		pep1_table.link_site AS linkpos1,
		pep2_table.link_site AS linkpos2,
		si.charge_state AS charge,
		sp.peak_list AS peak_list,
		sp.frag_tol AS frag_tolerance,
		pep1_table.crosslinker_modmass as crosslinker_modmass1,
		pep2_table.crosslinker_modmass as crosslinker_modmass2,
		si.ions as ion_types,
		si.exp_mz as exp_mz
		FROM spectrum_identifications AS si
		LEFT JOIN (SELECT * FROM spectra WHERE upload_id = 1) AS sp ON (si.spectrum_id = sp.id)
		LEFT JOIN peptides AS pep1_table ON (si.pep1_id = pep1_table.id)
		LEFT JOIN peptides AS pep2_table ON (si.pep2_id = pep2_table.id)
		WHERE si.id = $si_id AND si.upload_id = 1;";

    include('../../connectionString.php');
    $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());
    $result = pg_query($query) or die('Query failed: ' . pg_last_error());

	// die($query);

	// foreach ($dbh->query($query) as $row)
	// {
	// 	$result = $row;
	// }

	// peptides
	$peptides = array();
	array_push($peptides, pep_to_array($result['pep1']));
	if ($result['pep2'] != ''){
		array_push($peptides, pep_to_array($result['pep2']));
	}


	$linkSites = array();
	if ($result['linkpos1'] != -1){
		//in the database 0 is N-terminal while 1 is first aa sidechain
		//xiAnnotator does not make this distinction atm and is 0 based
		$linkPos1 = intval($result['linkpos1']);
		if ($linkPos1 != 0){
			$linkPos1--; //change to 0 based index
			if ($linkPos1 == sizeof($peptides[0]['sequence']))
				$linkPos1--; //C-terminal link to last aa
		}
		array_push($linkSites, array('id' => 0, 'peptideId' => 0, 'linkSite' => $linkPos1 ));

		$linkPos2 = intval($result['linkpos2']);
		if ($linkPos2 != 0){
			$linkPos2--; //change to 0 based index
			if ($linkPos2 == sizeof($peptides[1]['sequence']))
				$linkPos2--; //C-terminal link to last aa
		}
		array_push($linkSites, array('id' => 0, 'peptideId' => 1, 'linkSite' => $linkPos2 ));
	}


	//peak block
	$peaklist = explode("\n", $result['peak_list']);

	$peaks = array();
	foreach ($peaklist as $peak) {
			$peak = trim($peak);
			if ($peak != ""){
					$parts = preg_split('/\s+/', $peak);
					if(count($parts) > 1)
							array_push($peaks, array('mz' => floatval($parts[0]), 'intensity' => floatval($parts[1])));
			}
	}


	//annotation block
	// $fragTol = explode(' ', $result['frag_tolerance'], 2);
	// $tol = array("tolerance" => $fragTol[0], "unit" => $fragTol[1]);

	if ($result['pep2']){
		$crosslinker_modmass = $result['crosslinker_modmass1'] + $result['crosslinker_modmass2'];
	}
	else {
		$crosslinker_modmass = 0;
	}
	$cl = array('modMass' => $crosslinker_modmass);
	$preCharge = intval($result['charge']);

	$ions = array();
	$ion_types = explode(';', $result['ion_types']);
	foreach ($ion_types as $ion) {
		array_push($ions, array('type' => ucfirst($ion).'Ion'));
	}
	//ToDo: get DB modifications only once from DB and save in model
	/*$query =  "SELECT * FROM modifications ;";
	$modifications = array();
	foreach ($dbh->query($query) as $row)
	{
		array_push($modifications, array('aminoAcids' => str_split($row['residues']), 'id' => $row['mod_name'], 'mass' => $row['mass']));

	}
*/
	// if ($fragTol[1] == "Da"){
	// 	$customCfg = "LOWRESOLUTION:true\n";
	// }
	// else {
	// 	$customCfg = "LOWRESOLUTION:false\n";
	// }

	$annotation = array(
		'fragmentTolerance' => $tol,
	//	'modifications' => $modifications,
		'ions' => $ions,
		'cross-linker' => $cl,
		'precursorCharge' => $preCharge,
		'precursorMZ' => floatval($result['exp_mz']),
		'custom' => ['']
	);

	// $annotation = json_decode($result['annotation']);

	//final array
	$postData = array('Peptides' => $peptides, 'LinkSite' => $linkSites, 'peaks' => $peaks, 'annotation' => $annotation);

	$postJSON = json_encode($postData);
	//var_dump(json_encode($postData));
	//die();


print $postJSON;



// $jsonArr = json_decode($peakList, true);
//die();
// if (array_key_exists('custom', $jsonArr['annotation'])){
// 	if (strpos($jsonArr['annotation']['custom'], "LOWRESOLUTION:false"))
// 		$jsonArr['annotation']['custom'] += "LOWRESOLUTION:false\n";
// }
// else{
// 	$jsonArr['annotation']['custom'] = "LOWRESOLUTION:false\n";
// }

// print json_encode($jsonArr);

?>


<?php

	$pageStartTime = microtime(true);
	include('../../connectionString.php');
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());


	$sid = urldecode($_GET["sid"]);
	$id_rands = explode("," , $sid);
	$sid = str_replace(',','', $sid );
	$sid = str_replace('-','', $sid );
	
	$showDecoys = false;//urldecode($_GET["decoys"]);
	$showAll = false;//urldecode($_GET["all"]);

	$pattern = '/[^0-9,\-]/';
	if (preg_match($pattern, $sid)){
		header();
		echo ("<!DOCTYPE html>\n<html><head></head><body>Numbers only for group ids</body></html>");
		exit;
	}

	include('../connectionString.php');
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

	$search_randGroup = [];
	
	for ($i = 0; $i < count($id_rands); $i++) {
		$s = [];		
		$dashSeperated = explode("-" , $id_rands[$i]);
		$randId = implode('-' , array_slice($dashSeperated, 1 , 4));
		$id = $dashSeperated[0];
		$res = pg_query("SELECT search.name, sequence_file.file_name"
					." FROM search, search_sequencedb, sequence_file "
					."WHERE search.id = search_sequencedb.search_id "
					."AND search_sequencedb.seqdb_id = sequence_file.id "
					."AND search.id = '".$id."';") 
					or die('Query failed: ' . pg_last_error());
		$line = pg_fetch_array($res, null, PGSQL_ASSOC);
		$name = $line['name'];
		$filename = $line['file_name'];
		
		$s["id"] = $id;
		$s["randId"] = $randId;
		$s["name"] = $name;
		$s["filename"] = $filename;
		if (count($dashSeperated) == 6){
			$s["group"] = $dashSeperated[5];
		} else {
            $s["group"] = "'NA'";
        }
		$search_randGroup[$id] = $s;

	}
	$searchMeta = "var searchMeta = " . json_encode($search_randGroup) . ';';
	
	
	
	
	echo "CLMSUI.sid = '".$sid."';\n";// TODO - this needs to change
	
	echo $searchMeta;
	
	if ($filename == "HSA-Active.FASTA"){
		echo "var HSA_Active = true;\n";
		include('./php/distances.php');
	}
	else {
		echo "var HSA_Active = false;\n";
		echo "var distances = [];\n";
	}
	
/*	$sid = urldecode($_GET["sid"]);
	//only allow digits or ',' or '-' in url params
	$pattern = '/[^0-9,\-]/';
	if (preg_match($pattern, $sid)){
		header();
		echo ("<!DOCTYPE html>\n<html><head></head><body>Numbers only for group ids</body></html>");
		exit;
	}

	//the CLMSUI.sid identifier is used when saving layouts
	echo "CLMSUI.sid = '".preg_replace('/(,|\-)/','', $sid )."';\n";

	$searchId_rand_group = explode("," , $sid);
	$showDecoys = true;//urldecode($_GET["decoys"]);
	$showAll = true;//urldecode($_GET["all"]);

	include('../../connectionString.php');
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

	echo '<pre style="width:100%;">';

	$searchId_randGroup = [];
	
	for ($i = 0; $i < count($searchId_rand_group); $i++) {
		$s = [];		
		$dashSeperated = explode("-" , $searchId_rand_group[$i]);
		$randId = implode('-' , array_slice($dashSeperated, 1 , 4));
		$id = $dashSeperated[0];
		$res = pg_query("SELECT search.name, sequence_file.file_name"
					." FROM search, search_sequencedb, sequence_file "
					."WHERE search.id = search_sequencedb.search_id "
					."AND search_sequencedb.seqdb_id = sequence_file.id "
					."AND search.id = '".$id."';") 
					or die('Query failed: ' . pg_last_error());
		$line = pg_fetch_array($res, null, PGSQL_ASSOC);
		$name = $line['name'];
		$filename = $line['file_name'];
		
		$s["id"] = $id;
		$s["randId"] = $randId;
		$s["name"] = $name;
		$s["filename"] = $filename;
		if (count($dashSeperated) == 6){
			$s["group"] = $dashSeperated[5];
		} else {
            $s["group"] = "NA";
        }
		$searchId_randGroup[$id] = $s;

	}
	echo "var searchMeta = " . json_encode($searchId_randGroup, JSON_PRETTY_PRINT) . ";\n\n";
	
	echo "//temp - if (HSA_Active == true) then we might have a go at some 3d stuff\n";
	if ($filename == "HSA-Active.FASTA"){
		echo "var HSA_Active = true;\n";
		include('./php/distances.php');
	}
	else {
		echo "var HSA_Active = false;\n";
		echo "var distances = [];\n\n";
	}
	
	echo "//saved layout - some work needed here to make it work with aggregated searches\n";
	echo "storedLayout = null;\n\n";
	if (count($searchId_randGroup) == 1) {
		$layoutQuery = "SELECT t1.layout AS l "
				. " FROM layouts AS t1 "
				. " LEFT OUTER JOIN layouts AS t2 "
				. " ON (t1.search_id = t2.search_id AND t1.time < t2.time) "
				. " WHERE t1.search_id LIKE '" . $sid . "' AND t2.search_id IS NULL;";
		$layoutResult = $res = pg_query($layoutQuery) or die('Query failed: ' . pg_last_error());
		while ($line = pg_fetch_array($layoutResult, null, PGSQL_ASSOC)) {
			
			echo "storedLayout = " . stripslashes($line["l"]) . ";\n\n";
			
		}
	}
	
	$WHERE = ' ';
	$c = 0;
	for ($i = 0; $i < count($searchId_randGroup); $i++) {
		$search = array_values($searchId_randGroup)[$i];
		if ($c > 0){
			$WHERE = $WHERE.' OR ';
		}
		$c++;
		$randId = $search["randId"];//substr($agg, $dashPos + 1);
		$id = $search["id"];//substr($agg, 0, ($dashPos));
		$WHERE = $WHERE.'(sm.search_id = '.$id.' AND s.random_id = \''.$randId.'\''.') ';
	}*/
	
	
	$sid = 3266;
	
	/*
	 * SPECTRUM MATCHES AND MATCHED PEPTIDES
	 */
	$query = "	
		SELECT 
			mp.match_id, mp.match_type, mp.peptide_id, 
			mp.link_position + 1 AS link_position,
			sm.score, sm.autovalidated, sm.validated, sm.rejected,
			sm.search_id, sm.precursor_charge, 
			sp.scan_number
		FROM 
			(select * from spectrum_match where search_id = ".$sid." and dynamic_rank) sm 
		INNER JOIN 
			(select * from matched_peptide where search_id = ".$sid.") mp 
			ON sm.id = mp.match_id 
		INNER JOIN spectrum sp ON sm.spectrum_id = sp.id 
		ORDER BY sm.id;";
	$startTime = microtime(true);
	$res = pg_query($query) or die('Query failed: ' . pg_last_error());
	$endTime = microtime(true);
	echo '//db time: '.($endTime - $startTime)."ms\n";
	echo '//rows:'.pg_num_rows($res)."\n";
	$startTime = microtime(true);
	echo "var tempMatches = [\n";
	$peptideIds = array();
	$line = pg_fetch_array($res, null, PGSQL_ASSOC);
	while ($line){// = pg_fetch_array($res, null, PGSQL_ASSOC)) {
			$peptideId = $line["peptide_id"];
			$peptideIds[$peptideId] = 1;
			echo "{"
				. '"id":' . $line["match_id"] . ','
				. '"ty":' . $line["match_type"] . ','
				. '"pi":' . $peptideId . ','
				. '"lp":'. $line["link_position"]. ','
				. '"sc":' . round($line["score"], 5) . ','
				. '"si":' . $line["search_id"] . ',';
			$autoVal =  $line["autovalidated"];
			if (isset($autoVal)){
				echo '"av":"' . $autoVal.'"' . ',';
			}
			$val = $line["validated"];
			if (isset($val)){
				echo '"v":"'.$val.'"' . ',';
			}
			$rej = $line["rejected"];
			if (isset($rej)){
				echo '"rj":"'.$rej.'"' . ',';
			}
			echo '"r":"' . "run" . '",'
				. '"sn":' . $line["scan_number"]. ','
				. '"pc":' . $line["precursor_charge"]
				. "}";
			$line = pg_fetch_array($res, null, PGSQL_ASSOC);
			if ($line) {echo ",\n";}
	}
	echo "\n];\n";
	$endTime = microtime(true);
	echo '//php time: '.($endTime - $startTime)."ms\n\n";
	
	/*
	 * PEPTIDES
	 */
	$implodedPepIds = '('.implode(array_keys($peptideIds), ",").')';
	$query = "SELECT pep.id, (array_agg(pep.sequence))[1] as sequence, 
		array_agg(hp.protein_id) as proteins, array_agg(hp.peptide_position) as positions
		FROM (SELECT id, sequence FROM peptide WHERE id IN "
				.$implodedPepIds.") pep
		INNER JOIN (SELECT peptide_id, protein_id, peptide_position
		FROM has_protein WHERE peptide_id IN "
				.$implodedPepIds.") hp ON pep.id = hp.peptide_id 
		GROUP BY id;";
	$startTime = microtime(true);
	$res = pg_query($query) or die('Query failed: ' . pg_last_error());
	$endTime = microtime(true);
	echo '//db time: '.($endTime - $startTime)."ms\n";
	echo '//rows:'.pg_num_rows($res)."\n";
	echo "var peptides = [\n";
	$line = pg_fetch_array($res, null, PGSQL_ASSOC);
	while ($line){// = pg_fetch_array($res, null, PGSQL_ASSOC)) {
			$proteins = $line["proteins"];
			$proteinsArray = explode(",",substr($proteins, 1, strlen($proteins) - 2));
			$c = count($proteinsArray);
			foreach ($proteinsArray as $v) {
				$proteinIds[$v] = 1;
			}
			$positions = $line['positions'];
			echo '{"id":' . $line["id"] . ','
				. '"seq":"' . $line["sequence"] . '",' 
				. '"prt":[' . implode($proteinsArray, ',') . '],' 
				. '"pos":[' . substr($positions, 1, strlen($positions) - 2) . ']' 
				. "}";
			$line = pg_fetch_array($res, null, PGSQL_ASSOC);
			if ($line) {echo ",\n";}
	}
	echo "\n];\n";
	$endTime = microtime(true);
	echo '//php time: '.($endTime - $startTime)."ms\n\n";
	
	/*
	 * PROTEINS
	 */
	$query = "SELECT id, name, description, accession_number, sequence, is_decoy
			FROM protein WHERE id IN (".implode(array_keys($proteinIds), ",").")";
	$startTime = microtime(true);
	$res = pg_query($query) or die('Query failed: ' . pg_last_error());
	$endTime = microtime(true);
	echo '//db time: '.($endTime - $startTime)."ms\n";
	echo '//rows:'.pg_num_rows($res)."\n";
	echo "var proteins = [\n";
	$line = pg_fetch_array($res, null, PGSQL_ASSOC);
	while ($line){// = pg_fetch_array($res, null, PGSQL_ASSOC)) {
			$isDecoy = ($line["is_decoy"] == "t")? 'true' : 'false';
			$pId = $line["id"];
			//~ echo '"' . $pId . '":{'
			echo '{'
				. '"id":' . $pId . ',' 
				. '"name":"' . $line["name"] . '",' 
				. '"desc":"' . $line["description"] . '",' 
				. '"accession":"' .$line["accession_number"]  . '",'
				. '"seq":"' .$line["sequence"] . '",' 
				. '"decoy":' .$isDecoy 
				. "}";
			$line = pg_fetch_array($res, null, PGSQL_ASSOC);
			if ($line) {echo ",\n";}
	}
	echo "\n];\n";
	$endTime = microtime(true);
	echo '//php time: '.($endTime - $startTime)."ms\n\n";
	
	
	$endTime = microtime(true);
	echo "\n//page time: ".($endTime - $pageStartTime)."ms\n\n";
	
	// Free resultset
	pg_free_result($res);
	// Closing connection
	pg_close($dbconn);
?>

//var CLMSUI = CLMSUI || {};
           	
//var options = {proteins: proteins, peptides: peptides, rawMatches: tempMatches, searches: {}};
//CLMSUI.clmsModelInst = new window.CLMS.model.SearchResultsModel (options);



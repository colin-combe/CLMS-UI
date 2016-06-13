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

	$pageStartTime = microtime(true);
	include('../connectionString.php');
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());


	$sid = urldecode($_GET["sid"]);
	$id_rands = explode("," , $sid);
	$sid = str_replace(',','', $sid );
	$sid = str_replace('-','', $sid );
	
	$pattern = '/[^0-9,\-]/';
	if (preg_match($pattern, $sid)){
		exit;
	}

	$searchId_randGroup = [];
	
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
		$searchId_randGroup[$id] = $s;

	}
	$searchMeta = "var searchMeta = " . json_encode($searchId_randGroup, JSON_PRETTY_PRINT) . ";\n";
	
	echo "CLMSUI.sid = '".$sid."';\n";// TODO - this needs to change
	
	echo $searchMeta;
	
	if (false){//$filename == "HSA-Active.FASTA"){
		echo "var HSA_Active = true;\n";
		include('./php/distances.php');
	}
	else {
		echo "var HSA_Active = false;\n";
		echo "var distances = [];\n";
	}
	
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

	$WHERE_withRand = ' ';
	$WHERE_withoutRand = ' ';
	for ($i = 0; $i < count($searchId_randGroup); $i++) {
		$search = array_values($searchId_randGroup)[$i];
		if ($i > 0){
			$WHERE_withRand = $WHERE_withRand.' OR ';
			$WHERE_withoutRand = $WHERE_withoutRand.' OR ';
		}
		$randId = $search["randId"];
		$id = $search["id"];
		$WHERE_withRand = $WHERE_withRand.'(search_id = '.$id.' AND random_id = \''.$randId.'\''.') ';
		$WHERE_withoutRand = $WHERE_withoutRand.'(search_id = '.$id.')';
	}


	
	/*
	 * SPECTRUM MATCHES AND MATCHED PEPTIDES
	 */
	
	
	//old DB
	$query = "	
		SELECT 
			mp.match_id, mp.match_type, mp.peptide_id, 
			mp.link_position + 1 AS link_position, 
			sm.score, sm.autovalidated, sm.validated, sm.rejected,
			sm.search_id, sm.precursor_charge, sm.is_decoy,
			sp.scan_number, r.run_name
		FROM 
			(SELECT sm.id, sm.score, sm.autovalidated, sm.validated, sm.rejected,
			sm.search_id, sm.precursor_charge, sm.is_decoy, sm.spectrum_id
			FROM spectrum_match sm INNER JOIN search s ON search_id = s.id 
			WHERE ".$WHERE_withRand." AND dynamic_rank AND (NOT is_decoy)
			AND ((sm.autovalidated = true AND (sm.rejected != true OR sm.rejected is null)) OR
			(sm.validated LIKE 'A') OR (sm.validated LIKE 'B') OR (sm.validated LIKE 'C')
			OR (sm.validated LIKE '?')) 
			) sm 
		INNER JOIN 
			(SELECT mp.match_id, mp.match_type, mp.peptide_id, 
			mp.link_position
			FROM matched_peptide mp WHERE link_position != -1) mp 
			ON sm.id = mp.match_id 
		INNER JOIN spectrum sp ON sm.spectrum_id = sp.id 	
		INNER JOIN (SELECT run_name, spectrum_match_id from  v_export_materialized 
			WHERE (".$WHERE_withoutRand.") AND dynamic_rank = true 
			AND (NOT is_decoy)) r ON sm.id = r.spectrum_match_id		
		ORDER BY sm.id;";
		
	//New DB
	/*
	$query = "	
		SELECT 
			mp.match_id, mp.match_type, mp.peptide_id, 
			mp.link_position + 1 AS link_position, 
			sm.score, sm.autovalidated, sm.validated, sm.rejected,
			sm.search_id, sm.precursor_charge, sm.is_decoy,
			sp.scan_number
		FROM 
			(SELECT sm.id, sm.score, sm.autovalidated, sm.validated, sm.rejected,
			sm.search_id, sm.precursor_charge, sm.is_decoy, sm.spectrum_id
			FROM spectrum_match sm INNER JOIN search s ON search_id = s.id 
			WHERE ".$WHERE_withRand." AND dynamic_rank) sm 
		INNER JOIN 
			(SELECT mp.match_id, mp.match_type, mp.peptide_id, 
			mp.link_position
			FROM matched_peptide mp WHERE ".$WHERE_withoutRand.") mp 
			ON sm.id = mp.match_id 
		INNER JOIN spectrum sp ON sm.spectrum_id = sp.id 		
		ORDER BY sm.id;";*/
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
				. '"si":' . $line["search_id"] . ','
				. '"dc":"' . $line["is_decoy"] . '",';
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
			echo '"r":"' . $line["run_name"]. '",'//"run" . '",'
				. '"sn":' . $line["scan_number"]. ','
				. '"pc":' . $line["precursor_charge"]
				. "}";
		$line = pg_fetch_array($res, null, PGSQL_ASSOC);
			if ($line) {echo ",\n";}
	}
	echo "\n];\n";
	$endTime = microtime(true);
	echo '//php time: '.($endTime - $startTime)."ms\n\n";
	
	$proteinIdField = "hp.protein_id";
	if (count($searchId_randGroup) > 1) {
		$proteinIdField = "p.accession_number";
	} 
	/*
	 * PEPTIDES
	 */
	$implodedPepIds = '('.implode(array_keys($peptideIds), ",").')';
	$query = "SELECT pep.id, (array_agg(pep.sequence))[1] as sequence, 
		array_agg(".$proteinIdField.") as proteins, array_agg(hp.peptide_position) as positions
		FROM (SELECT id, sequence FROM peptide WHERE id IN "
				.$implodedPepIds.") pep
		INNER JOIN (SELECT peptide_id, protein_id, peptide_position
		FROM has_protein WHERE peptide_id IN "
				.$implodedPepIds.") hp ON pep.id = hp.peptide_id ";
	if (count($searchId_randGroup) > 1) {
		$query = $query."INNER JOIN protein p ON hp.protein_id = p.id ";
	}	
	$query = $query."GROUP BY pep.id;";	  
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
				. '"prt":["' . implode($proteinsArray, '","') . '"],' 
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
	 
	$proteinIdField = "id";
	if (count($searchId_randGroup) > 1) {
		$proteinIdField = "accession_number";
	} 
	 
	$query = "SELECT ".$proteinIdField." AS id, 
			CASE WHEN name IS NULL OR name = '' OR name = 'REV_' THEN accession_number 
			ELSE name END AS name,
			description, accession_number, sequence, is_decoy
			FROM protein WHERE ".$proteinIdField." IN ('".implode(array_keys($proteinIds), "','")."')";
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
				. '"id":"' . $pId . '",' 
				. '"name":"' . $line["name"] . '",' 
				. '"description":"' . $line["description"] . '",' 
				. '"accession":"' .$line["accession_number"]  . '",'
				. '"seq":"' .$line["sequence"] . '",' 
				. '"is_decoy":' .$isDecoy 
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

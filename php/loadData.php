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


	$startTime = microtime(true);
	$sid = urldecode($_GET["sid"]);
	$pattern = '/[^0-9,\-]/';
	if (preg_match($pattern, $sid)){
		header();
		echo ("<!DOCTYPE html>\n<html><head></head><body>You're having a laugh.</body></html>");
		exit;
	}

	$peptidesTempTableName = 'tempMatchedPeptides' . preg_replace('/(.|:)/', "_", $_SERVER['REMOTE_ADDR']) . '_' . time();
	$proteinTempTableName = 'tempHasProtein'.preg_replace('/(.|:)/', "_", $_SERVER['REMOTE_ADDR']).time();
	
	if (strpos($sid,',') === false) { //if not aggregation of more than one search

		$dashPos = strpos($sid,'-');
		$randId = substr($sid, $dashPos + 1);
		$sid = substr($sid, 0, ($dashPos));

		
		$q_makeTempMatchedPeptides = 
			'SELECT matched_peptide.match_id, spectrum_match.score,'
			. ' matched_peptide.match_type,  matched_peptide.peptide_id, matched_peptide.link_position + 1 AS link_position, '
			. ' spectrum_match.autovalidated, spectrum_match.validated, spectrum_match.rejected, '
			. ' spectrum.scan_number, spectrum_match.search_id, peptide.sequence AS pepseq  INTO TEMPORARY '
			. $peptidesTempTableName 
			. ' FROM matched_peptide, (SELECT * FROM spectrum_match WHERE SEARCH_ID = '
			. $sid
			. ' AND dynamic_rank = true) spectrum_match, spectrum, search, peptide  WHERE spectrum_match.search_id = '
			. $sid
			. ' AND spectrum.id = spectrum_match.spectrum_id '
			. ' AND spectrum_match.search_id = search.id '
			. ' AND matched_peptide.peptide_id = peptide.id '
			. ' AND search.random_id = \''.$randId.'\''
			. ' AND spectrum_match.id = matched_peptide.match_id '
			. ' AND spectrum_match.is_decoy != true AND '
			. ' ((spectrum_match.autovalidated = true AND (spectrum_match.rejected != true  OR spectrum_match.rejected is null)) OR'
			. ' (spectrum_match.validated LIKE \'A\') OR (spectrum_match.validated LIKE \'B\') OR (spectrum_match.validated LIKE \'C\')  '
			. ' OR (spectrum_match.validated LIKE \'?\')) '
			. ' AND matched_peptide.link_position != -1;';

		$q_makeTempHasProtein = 
			'SELECT has_protein.peptide_id, has_protein.protein_id, (peptide_position + 1) as peptide_position INTO TEMPORARY '
			. $proteinTempTableName 
			. ' FROM has_protein, ' . $peptidesTempTableName
			. ' WHERE ' . $peptidesTempTableName 
			. '.peptide_id = has_protein.peptide_id GROUP BY  has_protein.peptide_id, has_protein.protein_id, peptide_position;';

		$q_hasProtein = 'SELECT peptide_id, array_to_string(array_agg(protein_id), \',\') as proteins, array_to_string(array_agg(peptide_position), \',\') as positions FROM '
				. $proteinTempTableName . ' GROUP BY '. $proteinTempTableName .'.peptide_id';


	// turns out that array_agg()[1] is quicker than the (SQL script created) first() function
	$q_proteins = 'SELECT protein.id, (array_agg(protein.name))[1] AS name, (array_agg(protein.description))[1] AS description, (array_agg(protein.sequence))[1] AS sequence, (array_agg(protein.protein_length))[1] AS size, (array_agg(protein.accession_number))[1] AS accession'
		  .' FROM protein, '
		  .	$proteinTempTableName . ' WHERE ' . $proteinTempTableName 
		  .'.protein_id = protein.id  GROUP BY protein.id;';
	}
	else { //its an aggregation of more than one search
		$sets = explode("," , $sid);
		$WHERE = ' ';
		for ($i = 0; $i < count($sets); $i++) {
			if ($i > 0){
				$WHERE = $WHERE.' OR ';
			}
			$agg = $sets[$i];
		$dashPos = strpos($agg,'-');
			$randId = substr($agg, $dashPos + 1);
			$sid = substr($agg, 0, ($dashPos));
			$WHERE = $WHERE.'(spectrum_match.search_id = '.$sid.' AND search.random_id = \''.$randId.'\''.') ';
		}

		$q_makeTempMatchedPeptides = 'SELECT matched_peptide.match_id, spectrum_match.score,'.
			' matched_peptide.match_type,  matched_peptide.peptide_id, matched_peptide.link_position, '
			.' spectrum_match.autovalidated, spectrum_match.validated, spectrum_match.rejected, spectrum.scan_number, spectrum_match.search_id, peptide.sequence AS pepSeq  INTO TEMPORARY '
			. $peptidesTempTableName
			.' FROM matched_peptide, spectrum_match, spectrum, peptide, search WHERE ('.$WHERE.')'
			.' AND spectrum.id = spectrum_match.spectrum_id '
			.' AND spectrum_match.search_id = search.id '
			.' AND peptide.id = matched_peptide.peptide_id '
			.' AND spectrum_match.id = matched_peptide.match_id AND spectrum_match.is_decoy != true AND '
			.'((spectrum_match.autovalidated = true AND (spectrum_match.rejected != true  OR spectrum_match.rejected is null)) OR'
			.' (spectrum_match.validated LIKE \'A\') OR (spectrum_match.validated LIKE \'B\') OR (spectrum_match.validated LIKE \'C\')   OR (spectrum_match.validated LIKE \'?\'));';
	
		$q_makeTempHasProtein = 'SELECT has_protein.peptide_id, has_protein.protein_id, peptide_position, (array_agg(protein.accession_number))[1] as accession  INTO TEMPORARY ' .
				$proteinTempTableName . ' FROM has_protein, ' 
				. $peptidesTempTableName .', protein'
				.' WHERE ' . $peptidesTempTableName 
				.'.peptide_id = has_protein.peptide_id AND has_protein.protein_id = protein.id GROUP BY has_protein.peptide_id, has_protein.protein_id, peptide_position;';

		$q_hasProtein = 'SELECT peptide_id, array_to_string(array_agg(accession), \',\') as proteins, array_to_string(array_agg(peptide_position), \',\') as positions FROM '
				. $proteinTempTableName . ' GROUP BY '. $proteinTempTableName .'.peptide_id';
		// turns out that array_agg()[1] is quicker than the (SQL script created) first() function
		$q_proteins = 'SELECT protein.accession_number as id, (array_agg(protein.name))[1] AS name, (array_agg(protein.description))[1] AS description, (array_agg(protein.sequence))[1] AS sequence, (array_agg(protein.protein_length))[1] AS size, (array_agg(protein.accession_number))[1] AS accession'
			  .' FROM protein, '
			  .	$proteinTempTableName . ' WHERE ' . $proteinTempTableName 
			  .'.protein_id = protein.id  GROUP BY protein.accession_number;';
	}

	// DO THIS BEFORE: =# CREATE INDEX match_idx ON matched_peptide(match_id);
	$q_matchedPeptides = 'SELECT '. $peptidesTempTableName .'.*, proteins, positions FROM '
			.$peptidesTempTableName . ', ('	.$q_hasProtein.') AS prt WHERE '
			. $peptidesTempTableName .'.peptide_id = prt.peptide_id ORDER BY score DESC, match_id, match_type;';

			// following unneeded as ther are no matched_peptides with multiple possible links positions
			// ' GROUP BY matched_peptide.match_id, matched_peptide.match_type, matched_peptide.peptide_id;';



	echo "xlv.sid = \"" . $sid . "\";";

	include('../connectionString.php');
	$dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());
	$res = pg_query($q_makeTempMatchedPeptides) or die('Query failed: ' . pg_last_error());
	$res = pg_query($q_makeTempHasProtein) or die('Query failed: ' . pg_last_error());

	if (strpos($sid, ',') === false) {
		$layoutQuery = "SELECT t1.layout AS l "
				. " FROM layouts AS t1 "
				. " LEFT OUTER JOIN layouts AS t2 "
				. " ON (t1.search_id = t2.search_id AND t1.time < t2.time) "
				. " WHERE t1.search_id = " . $sid . " AND t2.search_id IS NULL;";
		echo "//" . htmlspecialchars($layoutQuery) . "\n";
		$layoutResult = $res = pg_query($layoutQuery) or die('Query failed: ' . pg_last_error());
		while ($line = pg_fetch_array($layoutResult, null, PGSQL_ASSOC)) {
			echo "   xlv.setLayout('" . $line["l"] . "');";
		}
	} else if ($set1 != '') {
		echo 'PV.set1 = ' . $set1 . ';';
		echo 'PV.set2 = ' . $set2 . ';';
		if ($set3 != null)
			echo 'PV.set3 = ' . $set3 . ';';
	}

	$res = pg_query($q_proteins) or die('Query failed: ' . pg_last_error());
	$line = pg_fetch_array($res, null, PGSQL_ASSOC);
	while ($line) {
		//may or may not have enclosing single quotes in DB. We need them.
		$seq = $line["sequence"];

		if (substr($seq, 0, 1) != "'")
			$seq = "'" . $seq . "'";

		$name = str_replace(")", "", str_replace("(", "", str_replace("'", "", $line["name"])));

		$underscore_pos = strpos($name,'_');
		$name = substr($name, 0, $underscore_pos);
		
		$id = $line["id"];
		if (strpos($sid,',') !== false) { //if aggregation
			$id = $line["accession"];
		}
		
		echo 'xlv.addProtein (' .
		'\''.$id . '\',' .
		'\'' . $name . "'" . ',' .
		$seq .
		',' . '\'' . str_replace(")", "", str_replace("(", "", str_replace("'", "", $line["description"]))) . "'" .
		',\'' . str_replace("'", "", $line["accession"]) . '\',' .
		'\'' . $line["size"] . '\'' .
		')';
		$line = pg_fetch_array($res, null, PGSQL_ASSOC);
		if ($line) {
			echo ";\n";
		}
	}
	echo "\n\n";

	//            echo "//".htmlspecialchars($q_matchedPeptides)."\n";
	$res = pg_query($q_matchedPeptides) or die('Query failed: ' . pg_last_error());

	//echo "PV_addMatches([";

	$match_id;
	$match_type;
	$match_score;
	$match_autovalidated;
	$match_validated;
	$match_rejected;

	$pep1_link_position;
	$pep1_positions;
	$pep1_prot_ids;

	$pep2_link_position;
	$pep2_positions;
	$pep2_prot_id;

	$waitingForFirstMatch = true;
	while ($line = pg_fetch_array($res, null, PGSQL_ASSOC)) {
		$match_type = $line["match_type"];
		if ($match_type == 1) {
			$match_id = $line["match_id"];
			$match_score = $line["score"];
			$match_autovalidated = $line["autovalidated"];
			$match_validated = $line["validated"];
			$match_rejected = $line["rejected"];
			$scan_number = $line["scan_number"];
			$search_id = $line["search_id"];

			$pep1_link_position = $line['link_position'];
			$pep1_positions = '[' . $line["positions"] . ']';
			$pep1_prot_ids = '"' . $line["proteins"] . '"';
			$pep1_seq =  '"' . $line["pepseq"] . '"';
			$waitingForFirstMatch = false;
		} else if ($match_type == 2) {
			if ($match_id == $line["match_id"]) {
				$pep2_link_position = $line['link_position'];
				$pep2_positions = '[' . $line["positions"] . ']';
				$pep2_prot_ids = '"' . $line["proteins"] . '"';
				$pep2_seq =  '"' . $line["pepseq"] . '"';

				if ($waitingForFirstMatch != true) {



	//~ xlv.addMatch(114707836,0,[227],"646637",2,[504],"646637",12.707581181979121,'t','','','1999','1633');

	//~ xinet.Controller.prototype.addMatch = function(pep1_protIDs, pep1_positions,
			//~ pep2_protIDs, pep2_positions,
			//~ id, score, linkPos1, linkPos2, pep1_seq, pep2_seq) {


					echo 'xlv.addMatch(' . $pep1_prot_ids . ','. $pep1_positions . ','
										 . $pep2_prot_ids . ','. $pep2_positions . ','
										 . $match_id . ',' . $match_score . ','
										 . ($pep1_link_position). ','
										 . ($pep2_link_position). ','
										 . ($pep1_seq). ','
										 . ($pep2_seq)
										 . ',\'' . $match_autovalidated . '\',\'' . $match_validated . '\',\'' . $match_rejected
										 . "');\n";
					 //~
					//~
					//~ . '\',\'' . $scan_number . '\',\'' . $search_id

					$waitingForFirstMatch = true;
				}
			}
		}
	}

	// Free resultset
	pg_free_result($res);


	// Closing connection
	pg_close($dbconn);
?>

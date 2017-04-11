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

//$pageStartTime = microtime(true);

if (count($_GET) > 0) {

    include('../connectionString.php');
    $dbconn = pg_connect($connectionString) or die('Could not connect: ' . pg_last_error());

    $sid = urldecode($_GET["sid"]);
    //SQL injection defense
    $pattern = '/[^0-9,\-]/';
    if (preg_match($pattern, $sid)){
        exit;
    }

    $unval = false;
    if (isset($_GET['unval'])){
        if ($_GET['unval'] === '1' || $_GET['unval'] === '0'){
            $unval = (bool) $_GET['unval'];
        }
    }

    $decoys = false;
    if (isset($_GET['decoys'])){
        if ($_GET['decoys'] === '1' || $_GET['decoys'] === '0'){
            $decoys = (bool) $_GET['decoys'];
        }
    }

    $linears = false;
    if (isset($_GET['linears'])) {
        if ($_GET['linears'] === '1' || $_GET['linears'] === '0')     {
            $linears = (bool) $_GET['linears'];
        }
    }

    $spectrum = '';
    if (isset($_GET['spectrum'])) {
        $spectrum= (string) $_GET['spectrum'];
    }

    $lowestScore = 0;
    if (isset($_GET['lowestScore'])) {
        $lowestScore= (float) $_GET['lowestScore'];
    }

    //keep the long identifier for this combination of searches
    echo '{"sid":"'.$sid.'",';

    //get search meta data
    $id_rands = explode("," , $sid);
    $searchId_randGroup = [];
    for ($i = 0; $i < count($id_rands); $i++) {
        //$s = [];
        $dashSeperated = explode("-" , $id_rands[$i]);
        $randId = implode('-' , array_slice($dashSeperated, 1 , 4));
        $id = $dashSeperated[0];
        //~ $searchDataQuery = "SELECT search.name, sequence_file.file_name"
                    //~ ." FROM search, search_sequencedb, sequence_file "
                    //~ ."WHERE search.id = search_sequencedb.search_id "
                    //~ ."AND search_sequencedb.seqdb_id = sequence_file.id "
                    //~ ."AND search.id = '".$id."';";

        $searchDataQuery = "SELECT s.id, s.name, s.private, s.submit_date, s.notes, s.random_id,

    (
        SELECT json_agg(sf.*) FROM (
         SELECT search_id, name, file_name, decoy_file, file_path, notes, upload_date,
         user_name AS uploaded_by
         FROM search_sequencedb
         INNER JOIN sequence_file
         ON search_sequencedb.seqdb_id = sequence_file.id
         INNER JOIN users
         ON sequence_file.uploadedby = users.id
         WHERE search_sequencedb.search_id = s.id
        ) sf
    )
    AS sequence_files,

    (
        SELECT json_agg(r.*)

        FROM search_acquisition sa

        INNER JOIN (
            SELECT acq_id, run_id,
                    run.name AS run_name,
                    run.file_path AS run_file_path,
                    acquisition.name AS acquisition_name,
                    users.user_name AS uploaded_by,
                    notes
            FROM run
            INNER JOIN acquisition ON run.acq_id = acquisition.id
            INNER JOIN users ON acquisition.uploadedby = users.id
            ) r
        ON sa.run_id = r.run_id AND sa.acq_id = r.acq_id
        WHERE sa.search_id = s.id
      ) AS runs,


    (SELECT json_agg(e.*) FROM (
         SELECT id, name, description FROM enzyme
    ) e  WHERE ps.enzyme_chosen = e.id) AS enzymes,

    (SELECT json_agg(cm.*) FROM (
         SELECT paramset_id, name, description, fixed FROM chosen_modification
         INNER JOIN modification
         ON chosen_modification.mod_id = modification.id
    ) cm  WHERE cm.paramset_id = ps.id) AS modifications,

    (SELECT json_agg(cc.*) FROM (
     SELECT paramset_id, name, mass, is_decoy, description FROM chosen_crosslinker
     INNER JOIN crosslinker
     ON chosen_crosslinker.crosslinker_id = crosslinker.id
    ) cc  WHERE cc.paramset_id = ps.id) AS crosslinkers,

    (SELECT json_agg(cl.*) FROM (
     SELECT paramset_id, name, lost_mass, description FROM chosen_losses
     INNER JOIN loss
     ON chosen_losses.loss_id = loss.id
    ) cl  WHERE cl.paramset_id = ps.id) AS losses

    FROM search s
    INNER JOIN parameter_set ps ON s.paramset_id = ps.id
    WHERE s.id = '".$id."';";

        $res = pg_query($searchDataQuery)
                    or die('Query failed: ' . pg_last_error());
        $line = pg_fetch_array($res, null, PGSQL_ASSOC);

        if (count($dashSeperated) == 6){
            $line["group"] = $dashSeperated[5];
        } else {
            $line["group"] = "'NA'";
        }
        $searchId_randGroup[$id] = $line;
    }

    //problems with unwanted escaping / quote marks introduced by json_encode
    $temp = json_encode($searchId_randGroup);
    $temp = preg_replace("/\\\\n/", "", $temp);
    $temp = preg_replace("/\"\[/", "[", $temp);
    $temp = preg_replace("/\]\"/", "]", $temp);
    $temp = stripslashes($temp);

    echo "\"searches\":" . $temp . ",\n";


    //Stored layouts
    if (count($searchId_randGroup) == 1) { // no saved layouts for aggregations at moment
        $layoutQuery = "SELECT t1.layout AS l "
                . " FROM layouts AS t1 "
                . " WHERE t1.search_id LIKE '" . $sid . "' "
                . " AND t1.time = (SELECT max(t1.time) FROM layouts AS t1 "
                . " WHERE t1.search_id LIKE '" . $sid . "' );";

        $layoutResult = $res = pg_query($layoutQuery) or die('Query failed: ' . pg_last_error());
        while ($line = pg_fetch_array($layoutResult, null, PGSQL_ASSOC)) {
            echo "\"xiNETLayout\":" . stripslashes($line["l"]) . ",\n\n";
        }
    }

    //load data -
    $WHERE_spectrumMatch = ' ( '; //WHERE clause for spectrumMatch table
    $WHERE_matchedPeptide = ' ( ';//WHERE clause for matchedPeptide table
    for ($i = 0; $i < count($searchId_randGroup); $i++) {
        $search = array_values($searchId_randGroup)[$i];
        if ($i > 0){
            $WHERE_spectrumMatch = $WHERE_spectrumMatch.' OR ';
            $WHERE_matchedPeptide = $WHERE_matchedPeptide.' OR ';
        }
        $randId = $search["random_id"];
        $id = $search["id"];
        $WHERE_spectrumMatch = $WHERE_spectrumMatch.'(search_id = '.$id.' AND random_id = \''.$randId.'\''.') ';
        $WHERE_matchedPeptide = $WHERE_matchedPeptide.'search_id = '.$id.'';
    }
    $WHERE_spectrumMatch = $WHERE_spectrumMatch.' AND score >= '.$lowestScore.') ';
    $WHERE_matchedPeptide = $WHERE_matchedPeptide.' ) ';

    if ($decoys == false){
        $WHERE_spectrumMatch = $WHERE_spectrumMatch.' AND (NOT is_decoy) ';
    }

    if ($unval == false){
        $WHERE_spectrumMatch = $WHERE_spectrumMatch." AND ((sm.autovalidated = true AND (sm.rejected != true OR sm.rejected is null)) OR
                    (sm.validated LIKE 'A') OR (sm.validated LIKE 'B') OR (sm.validated LIKE 'C')
                    OR (sm.validated LIKE '?')) ";
    }


    if ($spectrum) {
        $WHERE_spectrumMatch = $WHERE_spectrumMatch.' AND spectrum_id = ' . $spectrum . ' ';
    } else {
        $WHERE_spectrumMatch = $WHERE_spectrumMatch.' AND dynamic_rank ';
    }

    // MJG. 06/09/16. Changed query 'cos it crashed when using old db
    $isNewQuery = pg_query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'spectrum_source'");
    $isNewQueryRow = pg_fetch_object ($isNewQuery);
    $oldDB = ($isNewQueryRow->count == 0 ? true : false);
    //pg_query("SELECT * FROM spectrum_source LIMIT 0") or ($oldDB = true);

    /*
     * SPECTRUM MATCHES AND MATCHED PEPTIDES
     */

    if ($oldDB == true) {
        //old DB

        $query = "
            SELECT
                mp.match_id, mp.match_type, mp.peptide_id,
                mp.link_position + 1 AS link_position,
                sm.score, sm.autovalidated, sm.validated, sm.rejected,
                sm.search_id, sm.precursor_charge, sm.is_decoy, sm.spectrum_id,
                sp.scan_number, r.run_name
            FROM
                (SELECT sm.id, sm.score, sm.autovalidated, sm.validated, sm.rejected,
                sm.search_id, sm.precursor_charge, sm.is_decoy, sm.spectrum_id
                FROM spectrum_match sm INNER JOIN search s ON search_id = s.id
                WHERE ".$WHERE_spectrumMatch.")
                sm
            INNER JOIN
                (SELECT mp.match_id, mp.match_type, mp.peptide_id,
                mp.link_position
                FROM matched_peptide mp WHERE link_position != -1) mp
                ON sm.id = mp.match_id
            INNER JOIN spectrum sp ON sm.spectrum_id = sp.id
            INNER JOIN (SELECT run_name, spectrum_match_id from  v_export_materialized
                WHERE (".$WHERE_matchedPeptide.")
                ) r ON sm.id = r.spectrum_match_id
            ORDER BY score DESC, sm.id, mp.match_type;";
    }
    else {
        //New DB

        if ($linears == false){
            $WHERE_matchedPeptide = $WHERE_matchedPeptide." AND link_position != -1 ";
        }

        $query = "
                SELECT
                mp.match_id, mp.match_type, mp.peptide_id,
                mp.link_position + 1 AS link_position, sm.spectrum_id,
                sm.score, sm.autovalidated, sm.validated, sm.rejected,
                sm.search_id, sm.is_decoy, sm.calc_mass, sm.precursor_charge,
                sp.scan_number, sp.source_id as source,
                /*sp.precursor_intensity,*/ sp.precursor_mz
            FROM
                (SELECT sm.id, sm.score, sm.autovalidated, sm.validated, sm.rejected,
                sm.search_id, sm.precursor_charge, sm.is_decoy, sm.spectrum_id,
                sm.calc_mass
                FROM spectrum_match sm INNER JOIN search s ON search_id = s.id
                WHERE ".$WHERE_spectrumMatch.") sm
            INNER JOIN
                (SELECT mp.match_id, mp.match_type, mp.peptide_id,
                mp.link_position
                FROM matched_peptide mp WHERE ".$WHERE_matchedPeptide.") mp
                ON sm.id = mp.match_id
            INNER JOIN spectrum sp ON sm.spectrum_id = sp.id
            ORDER BY score DESC, sm.id, mp.match_type;";
    }
    $startTime = microtime(true);
    $res = pg_query($query) or die('Query failed: ' . pg_last_error());
    $endTime = microtime(true);
    //~ echo '/*db time: '.($endTime - $startTime)."ms\n";
    //~ echo '/*rows:'.pg_num_rows($res)."\n";
    $startTime = microtime(true);
    echo "\"rawMatches\":[\n";
    $peptideIds = array();
    $sourceIds = array();
    $line = pg_fetch_array($res, null, PGSQL_ASSOC);
    while ($line){// = pg_fetch_array($res, null, PGSQL_ASSOC)) {
            $peptideId = $line["peptide_id"];
            $peptideIds[$peptideId] = 1;
            $sourceId = $line["source"];
            $sourceIds[$sourceId] = 1;
            echo "{"
                . '"id":' . $line["match_id"] . ','
                . '"ty":' . $line["match_type"] . ','
                . '"pi":' . $peptideId . ','
                . '"lp":'. $line["link_position"]. ','
                . '"spec":' . $line["spectrum_id"] . ','
                . '"sc":' . round($line["score"], 2) . ','
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
            echo '"src":"' . $sourceId. '",'//"run" . '",'
                . '"sn":' . $line["scan_number"]. ','
                . '"pc_c":' . $line["precursor_charge"]. ','
            //  . '"pc_i":' . round($line["precursor_intensity"], 3). ','
                . '"pc_mz":' . round($line["precursor_mz"], 6). ','
                . '"cm":' . round($line["calc_mass"], 6)
                . "}";
            $line = pg_fetch_array($res, null, PGSQL_ASSOC);
            if ($line) {echo ",\n";}
    }
    echo "\n],\n";
    $endTime = microtime(true);
    //~ echo '/*php time: '.($endTime - $startTime)."ms\n\n";

    $proteinIdField = "hp.protein_id";
    if (count($searchId_randGroup) > 1) {
        $proteinIdField = "p.accession_number";
    }

    /*
     * SPECTRUM SOURCES
     */
    if (sizeof($sourceIds) === 0) {
        echo "\"spectrumSources\":[],";
    } else {
        $implodedSourceIds = '('.implode(array_keys($sourceIds), ",").')';
        $query = "SELECT src.id, src.name
            FROM spectrum_source AS src WHERE src.id IN "
                    .$implodedSourceIds.";";
        $startTime = microtime(true);
        $res = pg_query($query) or die('Query failed: ' . pg_last_error());
        $endTime = microtime(true);
        //~ echo '//db time: '.($endTime - $startTime)."ms\n";
        //~ echo '//rows:'.pg_num_rows($res)."\n";
        echo "\"spectrumSources\":[\n";
        $line = pg_fetch_array($res, null, PGSQL_ASSOC);
        while ($line){// = pg_fetch_array($res, null, PGSQL_ASSOC)) {
                echo '{"id":' . $line["id"] . ','
                    . '"name":"' . $line["name"] . '"}';
                $line = pg_fetch_array($res, null, PGSQL_ASSOC);
                if ($line) {echo ",\n";}
                }
        echo "\n],\n";
        $endTime = microtime(true);
    }



    /*
     * PEPTIDES
     */
    if (sizeof($peptideIds) === 0) {
        echo "\"peptides\":[],";
        echo "\"proteins\":[]}";
    } else {
        $implodedPepIds = '('.implode(array_keys($peptideIds), ",").')';
        $query = "SELECT pep.id, (array_agg(pep.sequence))[1] as sequence,
            array_agg(".$proteinIdField.") as proteins, array_agg(hp.peptide_position + 1) as positions
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
        //~ echo '//db time: '.($endTime - $startTime)."ms\n";
        //~ echo '//rows:'.pg_num_rows($res)."\n";
        echo "\"peptides\":[\n";
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
                    . '"seq_mods":"' . $line["sequence"] . '",'
                    . '"prt":["' . implode($proteinsArray, '","') . '"],'
                    . '"pos":[' . substr($positions, 1, strlen($positions) - 2) . ']'
                    . "}";
                $line = pg_fetch_array($res, null, PGSQL_ASSOC);
                if ($line) {echo ",\n";}
                }
        echo "\n],\n";
        $endTime = microtime(true);
        //~ echo '/*php time: '.($endTime - $startTime)."ms*/\n\n";


        /*
         * PROTEINS
         */

        $proteinIdField = "id";
        if (count($searchId_randGroup) > 1) {
            $proteinIdField = "accession_number";
        }

        $query = "SELECT ".$proteinIdField." AS id,
                CASE WHEN name IS NULL OR name = '' OR name = 'REV_' OR name = 'RAN_' THEN accession_number
                ELSE name END AS name,
                description, accession_number, sequence, is_decoy
                FROM protein WHERE ".$proteinIdField." IN ('".implode(array_keys($proteinIds), "','")."')";
        $startTime = microtime(true);
        $res = pg_query($query) or die('Query failed: ' . pg_last_error());
        $endTime = microtime(true);
        //~ echo '/*db time: '.($endTime - $startTime)."ms*/\n";
        //~ echo '/*rows:'.pg_num_rows($res)."*/\n";
        echo "\"proteins\":[\n";
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
                    . '"seq_mods":"' .$line["sequence"] . '",'
                    . '"is_decoy":' .$isDecoy
                    . "}";
                $line = pg_fetch_array($res, null, PGSQL_ASSOC);
                if ($line) {echo ",\n";}
            }
        echo "\n],";
        echo '"oldDB":'.($oldDB == 1 ? "true" : "false"); // Is this from the old db?
        echo "}\n";
        $endTime = microtime(true);
        //~ echo '/*php time: '.($endTime - $startTime)."ms*/\n\n";



        $endTime = microtime(true);
        //~ echo "\n/*page time: ".($endTime - $pageStartTime)."ms*/\n\n";
    }

    // Free resultset
    pg_free_result($res);
    // Closing connection
    pg_close($dbconn);

}
?>

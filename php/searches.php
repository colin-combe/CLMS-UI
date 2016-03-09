<?php
	session_start();
	//you could comment out following 4 lines and have no login authentication. 
	if (!$_SESSION['session_name']) {
		header("location:login.html");
		exit;
	}
	include('../../connectionString.php');
	//open connection
	$dbconn = pg_connect($connectionString)
		or die('Could not connect: ' . pg_last_error());
		
	$searches = $_POST["searches"];
	
	if ($searches == "MINE"){
		pg_prepare($dbconn, "my_query",
		"SELECT search.id, (array_agg(user_name))[1] as user_name, (array_agg(search.submit_date))[1] AS submit_date, (array_agg(search.name))[1] AS name, (array_agg(search.status))[1] AS status, (array_agg(search.random_id))[1] AS random_id, array_agg(sequence_file.file_name) AS file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND users.user_name = $1 AND status != 'hide' GROUP BY search.id ORDER BY submit_date DESC ;");
	$result = pg_execute($dbconn, "my_query", [$_SESSION['session_name']]);
	}
	else {
		$q = 
		"SELECT search.id, (array_agg(user_name))[1] as user_name, (array_agg(search.submit_date))[1] AS submit_date, (array_agg(search.name))[1] AS name, (array_agg(search.status))[1] AS status, (array_agg(search.random_id))[1] AS random_id, array_agg(sequence_file.file_name) AS file_name FROM search, users, search_sequencedb, sequence_file WHERE search.uploadedby = users.id AND search.id = search_sequencedb.search_id AND search_sequencedb.seqdb_id = sequence_file.id AND status != 'hide' GROUP BY search.id ORDER BY submit_date DESC ;";	
		$result = pg_query($q) or die('Query failed: ' . pg_last_error());
	}
	// Execute the prepared query
	while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
		$id = $line['id'];
		$urlPart = $id.'-'.$line['random_id'];
		
		echo "<tr><td><a id=".$line['name']." href='./network.php?sid=" . urlencode($urlPart) . "'>" . $line['name'] . "</a>" . "</td>";
		
		$searchFile = $line['file_name'];
		

		$status = $line['status'];
		$statusSpacePos = strpos($status, ' ');
		if ($statusSpacePos > 0){
			$status = substr($line['status'], 0, $statusSpacePos);
		}
		echo "<td><strong>" .$status. "</strong></td>";

		echo "<td><a id=".$line['name']." href='./validate.php?sid=" . urlencode($urlPart) . "'>validate</a>" . "</td>";
	

		echo "<td>" .$searchFile. "</td>";
		echo "<td>" .substr($line['submit_date'], 0, strpos($line['submit_date'], '.')) . "</td>";
		echo "<td>" .$id . "</td>";
		if ($searches == "MINE"){
			echo "<td></td>";
		} else {
			echo "<td>" .$line['user_name'] . "</td>";
		}
		echo  "<td class='centre'><input type='checkbox' class='aggregateCheckbox' value='". $urlPart . "'></td>";
		echo "</tr>\n";
		
	}
?>

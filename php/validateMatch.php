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

include('../../connectionString.php');
$dbconn = pg_connect($connectionString)
        or die('Could not connect to database.');
// Prepare a query for execution
pg_prepare($dbconn, "my_query",
	'UPDATE spectrum_match SET validated = $1 WHERE id = $2 AND search_id IN (SELECT id FROM search WHERE random_id = $3);');
// Execute the prepared query
$val = $_POST["val"];
$mid = $_POST["mid"];
$randId = $_POST["randId"];
$result = pg_execute($dbconn, "my_query", [$val, $mid, $randId]);
// Free resultset
pg_free_result($result);
// Closing connection
pg_close($dbconn);
?>

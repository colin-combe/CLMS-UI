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
$sid = $_POST["sid"];
$layout = addslashes($_POST["layout"]);
$desc = addslashes($_POST["desc"]);
$user_id = "7";

$dbconn = pg_connect($connectionString)
        or die('Could not connect: ' . pg_last_error());
//
$query = "INSERT INTO layouts (search_id, user_id, layout, description)"
        . "VALUES (".$sid.",".$user_id.",'".$layout."','".$desc."');";

echo $query;

$result = pg_query($query) or die('Query failed: ' . pg_last_error());
?>

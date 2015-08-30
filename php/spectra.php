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
$id = $_POST["id"];
// Connecting, selecting database
$dbconn = pg_connect($connectionString)
        or die('Could not connect: ' . pg_last_error());
// Prepare a query for execution
$result = pg_prepare($dbconn, "my_query", 
'SELECT expmz, absoluteintesity as absolute_intensity, fragment_name, isprimarymatch, matchedpeptide  FROM v_spec_viewer_advanced_materialized WHERE spectrum_match_id = $1;') 
 or die(pg_last_error());
// Execute the prepared query
//error_log("spec id:".$id);
$export = pg_execute($dbconn, "my_query", [$id]);
$fields = pg_num_fields ( $export );

for ( $i = 0; $i < $fields; $i++ )
{
    $header .= pg_field_name( $export , $i ) . ",";
}

while( $row = pg_fetch_row( $export ) )
{
    $line = '';
    foreach( $row as $value )
    {                                            
        if ( ( !isset( $value ) ) || ( $value == "" ) )
        {
            $value = ",";
        }
        else
        {
            $value = str_replace( '"' , '""' , $value );
            $value = '"' . $value . '"' . ",";
        }
        $line .= $value;
    }
    $data .= trim( $line ) . "\n";
}
$data = str_replace( "\r" , "" , $data );

if ( $data == "" )
{
    $data = "\n(0) Records Found!\n";                        
}

//header("Content-type: application/octet-stream");
//header("Content-Disposition: attachment; filename=your_desired_name.xls");
//header("Pragma: no-cache");
//header("Expires: 0");
print "$header\n$data";
//~ echo $data;
?>

<?php
// Printing results in HTML
function print_results($result) {
    $count = 0;
    echo "<table>\n";
    echo "\t<tr>\n";
    for ($field_number = 0; $field_number < pg_num_fields($result); $field_number++) {
        echo "\t\t<th>" . pg_field_name($result, $field_number) . "</th>\n";
    }
    echo "\t</tr>\n";
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        echo "\t<tr>\n";
        foreach ($line as $col_value) {
            echo "\t\t<td>$col_value</td>\n";
        }
        echo "\t</tr>\n";
        $count++;
    }
    echo "</table>\n";
    if ($count > 1) echo '<p>(' . $count . ' matches)</p>';
    else echo '<p>(' . $count . ' match)</p>';
}
?>

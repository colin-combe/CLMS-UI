<?php
session_start();
if (!$_SESSION['session_name']) {
    header("location:login.html");
}

$pageName = "search";

include('../connectionString.php');
//open connection
$dbconn = pg_connect($connectionString)
        or die('Could not connect: ' . pg_last_error());
?>
<!DOCTYPE html>
<html lang="en">
    <?php include('./head.php'); ?>
    <body>
        <?php include('./header.php'); ?>
        <?php include('./leader.php'); ?>

        <div class="page-container">
            <?php include('./navigation.php'); ?>


            <div class="main-body">
                <div class="acquisitions-group">
                    <h3>Acquisition</h3>
                    <div class="left-column">
                        <div class="upload-button">
                            <a onClick="$('.acquisitions-group').hide();$('.acquisitions-upload').show();" class="btn btn-large btn-block btn-inverse">Upload</a>
                        </div> <!-- UPLOAD BUTTON -->
                    </div> <!-- LEFT COLUMN -->
                    <p class="ortext">Or</p>
                    <div class="right-column">
                        <div class="browse-button">
                            <a onClick="$('.acquisitions-group').hide();$('.acquisitions-previous').show();" class="btn btn-large btn-block btn-inverse">Browse previous</a>
                        </div> <!-- BROWSE BUTTON -->
                    </div> <!-- RIGHT COLUMN -->
                </div> <!-- ACQUISITIONS GROUP -->

                <div class="acquisitions-upload" style="display:none;">
                    <h3>Acquisition Upload</h3>
                    <br/>
                    <input class="acquis-name" type="text" value="" placeholder="Type acquisition name here" /></input>
                    <!-- The file upload form used as target for the file upload widget -->
                    <form class="fileupload" action="./upload/uploadIndex.php" method="POST" enctype="multipart/form-data">
                        <!-- Redirect browsers with JavaScript disabled to the origin page -->
                <!--        <noscript><input type="hidden" name="redirect" value="http://blueimp.github.io/jQuery-File-Upload/"></noscript>-->
                        <!-- The fileupload-buttonbar contains buttons to add/delete files and start/cancel the upload -->
                        <div class="row fileupload-buttonbar">
                            <div class="span7">
                                <!-- The fileinput-button span is used to style the file input field as button -->
                                <span class="btn btn-success fileinput-button">
                                    <i class="icon-plus icon-white"></i>
                                    <span>Add files...</span>
                                    <input type="file" name="files[]" multiple>
                                </span>
                                <button type="submit" class="btn btn-primary start">
                                    <i class="icon-upload icon-white"></i>
                                    <span>Start upload</span>
                                </button>
                                <button type="reset" class="btn btn-warning cancel">
                                    <i class="icon-ban-circle icon-white"></i>
                                    <span>Cancel upload</span>
                                </button>
                                <button type="button" class="btn btn-danger delete">
                                    <i class="icon-trash icon-white"></i>
                                    <span>Delete</span>
                                </button>
                                <input type="checkbox" class="toggle">
                                <!-- The loading indicator is shown during file processing -->
                                <span class="fileupload-loading"></span>
                            </div>
                            <!-- The global progress information -->
                            <div class="span5 fileupload-progress fade">
                                <!-- The global progress bar -->
                                <div class="progress progress-success progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                                    <div class="bar" style="width:0%;"></div>
                                </div>
                                <!-- The extended global progress information -->
                                <div class="progress-extended">&nbsp;</div>
                            </div>
                        </div>
                        <!-- The table listing the files available for upload/download -->
                        <table role="presentation" class="table table-striped"><tbody class="files"></tbody></table>
                    </form>
                </div>

                <div class="acquisitions-previous" style="display:none;">
                    <h3>Previous Acquisitions</h3>
                    <br/>
                    <?php
                    $query = "SELECT name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from acquisition JOIN users ON (acquisition.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
                    $result = pg_query($query) or die('Query failed: ' . pg_last_error());
                    print_results($result, "previousAcqui");
                    // free resultset
                    pg_free_result($result);
                    ?>
                    <script>
                        $('#previousAcqui').dataTable( {
                            "bPaginate": true,
                            "bLengthChange": false,
                            "bFilter": true,
                            "bSort": false,
                            "bInfo": true,
                            "bAutoWidth": true
                        } );
                    </script>
                </div>


                <div class="sequence-db-group">
                    <h3>Sequence Database</h3>
                    <div class="left-column">
                        <div class="upload-button">
                            <a  onClick="$('.sequence-db-group').hide();$('.sequence-db-upload').show();" href="#sequenceupload" class="btn btn-large btn-block btn-inverse">Upload</a>
                        </div> <!-- UPLOAD BUTTON -->
                    </div> <!-- LEFT COLUMN -->
                    <p class="ortext">Or</p>
                    <div class="right-column">
                        <div class="browse-button">
                            <a onClick="$('.sequence-db-group').hide();$('.sequence-db-previous').show();" class="btn btn-large btn-block btn-inverse">Browse previous</a>
                        </div> <!-- BROWSE BUTTON -->
                    </div> <!-- RIGHT COLUMN -->
                </div> <!-- SEQUENCE DB GROUP -->

                <div class="sequence-db-upload" style="display:none;">
                    <h3>Sequence Database Upload</h3>
                    <br/>
                    <input class="sequence-db-name" type="text" value="" placeholder="Type sequence db name here..." /></input>
                    <!-- The file upload form used as target for the file upload widget -->
                    <form class="fileupload" action="upload/uploadIndex.php" method="POST" enctype="multipart/form-data">
                        <!-- Redirect browsers with JavaScript disabled to the origin page -->
                <!--        <noscript><input type="hidden" name="redirect" value="http://blueimp.github.io/jQuery-File-Upload/"></noscript>-->
                        <!-- The fileupload-buttonbar contains buttons to add/delete files and start/cancel the upload -->
                        <div class="row fileupload-buttonbar">
                            <div class="span7">
                                <!-- The fileinput-button span is used to style the file input field as button -->
                                <span class="btn btn-success fileinput-button">
                                    <i class="icon-plus icon-white"></i>
                                    <span>Add files...</span>
                                    <input type="file" name="files[]" multiple>
                                </span>
                                <button type="submit" class="btn btn-primary start">
                                    <i class="icon-upload icon-white"></i>
                                    <span>Start upload</span>
                                </button>
                                <button type="reset" class="btn btn-warning cancel">
                                    <i class="icon-ban-circle icon-white"></i>
                                    <span>Cancel upload</span>
                                </button>
                                <button type="button" class="btn btn-danger delete">
                                    <i class="icon-trash icon-white"></i>
                                    <span>Delete</span>
                                </button>
                                <input type="checkbox" class="toggle">
                                <!-- The loading indicator is shown during file processing -->
                                <span class="fileupload-loading"></span>
                            </div>
                            <!-- The global progress information -->
                            <div class="span5 fileupload-progress fade">
                                <!-- The global progress bar -->
                                <div class="progress progress-success progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                                    <div class="bar" style="width:0%;"></div>
                                </div>
                                <!-- The extended global progress information -->
                                <div class="progress-extended">&nbsp;</div>
                            </div>
                        </div>
                        <!-- The table listing the files available for upload/download -->
                        <table role="presentation" class="table table-striped"><tbody class="files"></tbody></table>
                    </form>
                </div>

                <div class="sequence-db-previous" style="display:none;">
                    <h3>Previous Acquisitions</h3>
                    <br/>
                    <?php
                    $query = "SELECT name AS Name, to_char(upload_date, 'YYYY-MM-DD HH:MI') AS Date, users.user_name AS User from sequence_file JOIN users ON (sequence_file.uploadedby = users.id) where uploadedby = " . $_SESSION['user_id'] . " ORDER BY upload_date DESC;";
                    $result = pg_query($query) or die('Query failed: ' . pg_last_error());
                    print_results($result, "previousSeqDb");
                    // free resultset
                    pg_free_result($result);
                    ?>
                    <script>
                        //                $(document).ready(function() {
                        $('#previousSeqDb').dataTable( {
                            "bPaginate": true,
                            "bLengthChange": false,
                            "bFilter": true,
                            "bSort": false,
                            "bInfo": true,
                            "bAutoWidth": true
                        } );
                        //} );
                    </script>
                </div>

                <!--                <form   name="login_form" method="post" action="searchParameters.php">-->
                <div class="search-params-group">

                    <h3>Search Parameters</h3>
                    <div class="left-column">
                        <div class="mstol-line">
                            <h5>MS TOLERANCE</h5>
                            <input class="mstol" type="text" value="" placeholder="4" />
                            <div class="switch" data-on-label="ppm" data-off-label="Da"  data-on="success" data-off="warning">
                                <input type="checkbox" checked/>
                            </div>
                        </div> <!-- MSTOL LINE -->
                        <div class="crosslinker-enzyme-line">
                            <h5>CROSS-LINKER</h5>
                            <div  class="cross-linker">
                                <select name="herolist" size="15" class="select-block span3">
                                    <?php
                                    $query = "SELECT id, name from crosslinker;";
                                    $result = pg_query($query) or die('Query failed: ' . pg_last_error());
                                    resultsAsOptions($result);
                                    // free resultset
                                    pg_free_result($result);
                                    ?>
                                </select>
                            </div> <!-- CROSS-LINKER -->
                        </div> <!-- CROSSLINKER-ENZYME-LINE -->
                        <div class="cleavage-losses-line">
                            <h5>MISSED CLEAVAGES</h5>
                            <input type="text" value="" placeholder="4" />
                        </div> <!-- CLEAVAGE LOSSES LINE -->
                        <div class="mods-line">
                            <h5>FIXED MODS</h5>
                            <div size="4" class="fixed-mods">
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Oxidation (M)
                                </label>
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Carbamidomethylation
                                </label>
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Arg 6
                                </label>
                            </div> <!-- FIXED MODS -->
                        </div> <!-- MODS LINE -->
                    </div> <!-- LEFT COLUMN -->
                    <div class="right-column">
                        <div class="mstol-line">
                            <div class="ms2-grouped">
                                <h5>MS2 TOLERANCE</h5>
                                <input class="mstol" type="text" value="" placeholder="20" />
                                <div class="switch" data-on-label="ppm" data-off-label="Da"  data-on="success" data-off="warning">
                                    <input type="checkbox" checked/>
                                </div>
                            </div> <!-- MS2 GROUPED -->
                        </div> <!-- MSTOL LINE -->
                        <div class="crosslinker-enzyme-line">
                            <h5>ENZYME</h5>
                            <div class="enzyme">
                                <select name="herolist" size="15" class="select-block span3">
                                    <?php
                                    $query = "SELECT id, name from enzyme;";
                                    $result = pg_query($query) or die('Query failed: ' . pg_last_error());
                                    resultsAsOptions($result);
                                    // free resultset
                                    pg_free_result($result);
                                    ?>
                                </select>
                            </div> <!-- ENZYME -->
                        </div>  <!-- CROSSLINKER-ENZYME-LINE -->
                        <div class="cleavage-losses-line">
                            <h5 class="losses-title">LOSSES</h5>
                            <div class="switch" data-on-label="On" data-off-label="Off" style="margin-top:15px;">
                                <input type="checkbox"/>
                            </div>
                        </div> <!-- CLEAVAGE LOSSES LINE -->
                        <div class="mods-line">
                            <h5 class="varmods-title">VAR MODS</h5>
                            <div class="var-mods">
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Oxidation (M)
                                </label>
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Carbamidomethylation
                                </label>
                                <label class="checkbox" for="checkbox1">
                                    <input type="checkbox" value="" id="checkbox1" data-toggle="checkbox">
                                    Arg 6
                                </label>
                            </div> <!-- VAR MODS -->
                        </div> <!-- MODS LINE -->
                    </div> <!-- RIGHT COLUMN -->
                </div> <!-- SEARCH PARAMS GROUP -->
                <div class="search-notes-group">
                    <h3>Search Notes</h3>
                    <textarea class="search-notes" type="text" value="" placeholder="Click here to start typing..." /></textarea>
                    <!-- SUBMIT BUTTON -->
<!--                        <input id="submitSearch" name="Submit" value="Submit Search" type="submit" class="btn btn-primary btn-large btn-block"/>-->

                    <section class="progress-demo">
                        <button class="ladda-button" onclick="alert('Please do not press this button again.')" data-color="purple" data-style="expand-right"><span class="ladda-label">Start Processing</span></button>
                    </section>
                    <!--                     SUCCESSFUL UPLOAD ICON-->
                    <!--                    <div class="control-group success">
                                            <i class="input-icon fui-check-inverted"></i>
                                        </div>  CONTROL GROUP SUCCESS-->
                </div> <!-- SEARCH NOTES GROUP -->
                <!--                </form>-->
            </div> <!-- MAIN BODY -->
        </div> <!-- PAGE CONTAINER -->

        <?php include('./footer.php'); ?>

        <!--TODO - sort out these scripts-->
        <!-- The jQuery UI widget factory, can be omitted if jQuery UI is already included -->
        <script src="js/uploadJS/vendor/jquery.ui.widget.js"></script>
        <!-- The Templates plugin is included to render the upload/download listings -->
        <script src="http://blueimp.github.io/JavaScript-Templates/js/tmpl.min.js"></script>
        <!-- The Load Image plugin is included for the preview images and image resizing functionality -->
        <script src="http://blueimp.github.io/JavaScript-Load-Image/js/load-image.min.js"></script>
        <!-- The Canvas to Blob plugin is included for image resizing functionality -->
        <script src="http://blueimp.github.io/JavaScript-Canvas-to-Blob/js/canvas-to-blob.min.js"></script>
        <!-- Bootstrap JS is not required, but included for the responsive demo navigation -->
<!--            <script src="http://blueimp.github.io/cdn/js/bootstrap.min.js"></script>-->
        <!-- blueimp Gallery script -->
        <script src="http://blueimp.github.io/Gallery/js/blueimp-gallery.min.js"></script>
        <!-- The Iframe Transport is required for browsers without support for XHR file uploads -->
        <script src="js/uploadJS/jquery.iframe-transport.js"></script>
        <!-- The basic File Upload plugin -->
        <script src="js/uploadJS/jquery.fileupload.js"></script>
        <!-- The File Upload processing plugin -->
        <script src="js/uploadJS/jquery.fileupload-process.js"></script>
        <!-- The File Upload image preview & resize plugin -->
        <script src="js/uploadJS/jquery.fileupload-image.js"></script>
        <!-- The File Upload audio preview plugin -->
        <script src="js/uploadJS/jquery.fileupload-audio.js"></script>
        <!-- The File Upload video preview plugin -->
        <script src="js/uploadJS/jquery.fileupload-video.js"></script>
        <!-- The File Upload validation plugin -->
        <script src="js/uploadJS/jquery.fileupload-validate.js"></script>
        <!-- The File Upload user interface plugin -->
        <script src="js/uploadJS/jquery.fileupload-ui.js"></script>
        <!-- The main application script -->
        <script src="js/uploadJS/main.js"></script>


        <!-- Load JS here for greater good =============================-->
<!--            <script src="js/jquery-1.8.3.min.js"></script>-->
        <script src="js/jquery-ui-1.10.3.custom.min.js"></script>
        <script src="js/jquery.ui.touch-punch.min.js"></script>
        <script src="js/bootstrap.min.js"></script>
        <script src="js/bootstrap-select.js"></script>
        <script src="js/bootstrap-switch.js"></script>
        <script src="js/flatui-checkbox.js"></script>
        <script src="js/flatui-radio.js"></script>
        <script src="js/jquery.tagsinput.js"></script>
        <script src="js/jquery.placeholder.js"></script>
        <script src="js/jquery.stacktable.js"></script>
        <script src="http://vjs.zencdn.net/c/video.js"></script>
        <script src="js/application.js"></script>

        <script>
            $(document).ready(function () {
                var top = $('.todo').offset().top - parseFloat($('.todo').css('marginTop').replace(/auto/, 0));
                $(window).scroll(function (event) {
                    // what the y position of the scroll is
                    var y = $(this).scrollTop();

                    // whether that's below the form
                    if (y >= top) {
                        // if so, ad the fixed class
                        $('.todo').addClass('fixed');
                    } else {
                        // otherwise remove it
                        $('.todo').removeClass('fixed');
                    }
                });
            });
        </script>



    </body>

    <!-- The template to display files available for upload -->
    <script id="template-upload" type="text/x-tmpl">
        {% for (var i=0, file; file=o.files[i]; i++) { %}
        <tr class="template-upload fade">
            <td>
                <span class="preview"></span>
            </td>
            <td>
                <p class="name">{%=file.name%}</p>
                {% if (file.error) { %}
                <div><span class="label label-important">Error</span> {%=file.error%}</div>
                {% } %}
            </td>
            <td>
                <p class="size">{%=o.formatFileSize(file.size)%}</p>
                {% if (!o.files.error) { %}
                <div class="progress progress-success progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="bar" style="width:0%;"></div></div>
                {% } %}
            </td>
            <td>
                {% if (!o.files.error && !i && !o.options.autoUpload) { %}
                <button class="btn btn-primary start">
                    <i class="icon-upload icon-white"></i>
                    <span>Start</span>
                </button>
                {% } %}
                {% if (!i) { %}
                <button class="btn btn-warning cancel">
                    <i class="icon-ban-circle icon-white"></i>
                    <span>Cancel</span>
                </button>
                {% } %}
            </td>
        </tr>
        {% } %}
    </script>
    <!-- The template to display files available for download -->
    <script id="template-download" type="text/x-tmpl">
        {% for (var i=0, file; file=o.files[i]; i++) { %}
        <tr class="template-download fade">
            <td>
                <span class="preview">
                    {% if (file.thumbnail_url) { %}
                    <a href="{%=file.url%}" title="{%=file.name%}" class="gallery" download="{%=file.name%}"><img src="{%=file.thumbnail_url%}"></a>
                    {% } %}
                </span>
            </td>
            <td>
                <p class="name">
                    <a href="{%=file.url%}" title="{%=file.name%}" class="{%=file.thumbnail_url?'gallery':''%}" download="{%=file.name%}">{%=file.name%}</a>
                </p>
                {% if (file.error) { %}
                <div><span class="label label-important">Error</span> {%=file.error%}</div>
                {% } %}
            </td>
            <td>
                <span class="size">{%=o.formatFileSize(file.size)%}</span>
            </td>
            <td>
                <button class="btn btn-danger delete" data-type="{%=file.delete_type%}" data-url="{%=file.delete_url%}"{% if (file.delete_with_credentials) { %} data-xhr-fields='{"withCredentials":true}'{% } %}>
                        <i class="icon-trash icon-white"></i>
                    <span>Delete</span>
                </button>
                <input type="checkbox" name="delete" value="1" class="toggle">
            </td>
        </tr>
        {% } %}
    </script>
</html>

<?php
// free resultset
pg_free_result($result);

//close connection
pg_close($dbconn);

// Printing results in HTML, assuming id and name field in result set
function resultsAsOptions($result) {
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        echo "\t<option value='" . $line['id'] . "'>" . $line['name'] . "</option>\n";
    }
}

// Printing results in HTML
function print_results($result, $tableId) {
    $count = 0;
    echo "<table id='" . $tableId . "'>\n<thead>";
    echo "\t<tr>\n";
    for ($field_number = 0; $field_number < pg_num_fields($result); $field_number++) {
        echo "\t\t<th>" . pg_field_name($result, $field_number) . "</th>\n";
    }
    echo "\t\t<th>Selected</th>\n";
    echo "\t</tr>\n\t</thead>\n\t<tbody>";
    while ($line = pg_fetch_array($result, null, PGSQL_ASSOC)) {
        echo "\t<tr>\n";
        foreach ($line as $col_value) {
            echo "\t\t<td>$col_value</td>\n";
        }
        echo "\t\t<td><input type='checkbox'></td>\n";
        echo "\t</tr>\n";
        $count++;
    }
    echo "</tbody>\n</table>\n";
//    echo '<p>(' . $count . ' rows)</p>';
}
?>


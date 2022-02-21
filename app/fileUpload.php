<?php
//Overworld server file upload controller
error_reporting(E_ALL);
$world = $_SERVER['HTTP_X_WORLD'];
$fn = (isset($_SERVER['HTTP_X_FILENAME']) ? $_SERVER['HTTP_X_FILENAME'] : false);
//echo $fn;
if ($fn) {
	// AJAX call
	if (!file_exists("uploads/".$world)) {
		mkdir("uploads/".$world,0776);
	}
	file_put_contents (
		//'uploads/' . $contentCell . '/' . $fn,
		'uploads/' . $world . '/' . $fn,
		file_get_contents('php://input')
	);
	//makeThumbnails("uploads/"+$contentCell+"/", $fn, "");
	echo "$fn uploaded";
    echo " : " . $world;
	exit();
}


?>

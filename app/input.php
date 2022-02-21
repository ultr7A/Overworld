<?php
//Overworld server (formerly phong galaxy server)
error_reporting(E_ALL);

$connection = mysqli_connect("localhost", "root", "Maria1337DB", "spacehexagon_overworld");
if(!$connection) {
    echo 'Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error();
}
$response = "";
$entityTransaction = $_POST["entityTransaction"];
$entityJson = $_POST["entityJSON"];
$world = $_POST["world"];
$entityId = $_POST["entityId"];
$contentFlag = $_POST["contentFlag"];
$worldFlag = $_POST["worldFlag"];
//$text = $_GET["text"];
if ($entityTransaction == "create") {
	//lookup server update id
	$serverUpdateId = mysqli_query($connection,"select max(updateId) from `" . $world . "` where 1;");

	if (!$serverUpdateId) {
		mysqli_query($connection , "create table `"  . $world . "` (updateId integer PRIMARY KEY AUTO_INCREMENT, jsonRecord text);");
		$serverUpdateId = 0;
	} else {
        $serverUpdateId = mysqli_fetch_array($serverUpdateId)[0];
		$serverUpdateId++;
	}
    if ($serverUpdateId <= 1024) {
            $entityJson = str_replace("ENTITY_ID", $serverUpdateId, $entityJson);
            //$entityJson = str_replace("'ENTITY_TEXT'","'" . urlencode($text) . "'",$entityJson);
            //mysqli_query($connection,"insert into `" . $world . "` values (" . $serverUpdateId . "," . $entityJson . ");");
            mysqli_query($connection,"insert into `" . $world . "` values (DEFAULT, " . $entityJson . ");");
            if($contentFlag==1){
                mysqli_query($connection,"insert into RecentPosts values (default,'". $world ."',".$serverUpdateId .");");
            }
            /*if($worldFlag==1){                   // will need to insert user id below
                mysqli_query($connection,"insert into SubWorlds values (default,'". $_POST["subWorld"] ."','".$_POST["subWorldData"] ."',-1);");
            }*/
         $response = $serverUpdateId;
	} else {
		$response = "-1";
	}
} else if ($entityTransaction=="update") {
	//$response = "update `" .  $worldKey . "` set jsonRecord = " . $entityJson . " where updateId = " .$entityId . ";";
	 mysqli_query($connection,"update `" .  $world . "` set jsonRecord = " . $entityJson . " where updateId = " .$entityId . ";");
} else if ($entityTransaction=="delete") {
	// if this object has an innerSpace, delete that table too
	$entity = mysqli_query($connection,"select * from `" . $world . "` where updateId = " .$entityId . ";");
	$entity = mysqli_fetch_array($entity);
	$innerSpace = explode(",",$entity[1]);
	// maybe put instructions to be read by serverInput that say to delete an object of an update id
	// put some kind of broadcast section in serverOutput
	mysqli_query($connection,"delete from `" . $world . "` where updateId = " . $entityId . ";");
	// should probably put code here to delete nested realities inside of the portal... or not...
}

mysqli_close($connection);
echo $response;

?>

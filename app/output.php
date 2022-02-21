<?php
//Overworld server (previously phong galaxy server)
error_reporting(E_ALL);
 // error_reporting(E_ALL);
ini_set('display_errors', 'On');
//$requestedCells = $_GET["cells"];
$connection = mysqli_connect("localhost", "root", "Maria1337DB", "spacehexagon_overworld");
if(!$connection)
{ echo 'Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error();}
$cells = array();
$response = "";
$world = $_GET["world"];
$updateId = $_GET["updateId"];

     $serverUpdateId = mysqli_query($connection,"select MAX(updateId) as updateId from `" . $world . "`;");
     if(!$serverUpdateId)
     {
        $serverUpdateId=1;
        mysqli_query($connection , "create table `"  . $world . "` (updateId integer PRIMARY KEY AUTO_INCREMENT, jsonRecord text);");
     } else {
        $serverUpdateId = mysqli_fetch_array($serverUpdateId)["updateId"];
        if($serverUpdateId>$updateId) //check if the server has a newer version of this cell
        {
            $result = mysqli_query($connection,"select * from `" . $world . "` where updateId > " .$updateId . ";");
            $response .= 'worldContent = {"world":"'.$world.'","updateId":' . $serverUpdateId . ',"entities":[';
            while($row = mysqli_fetch_array($result))
            {
               //$fix = str_replace("'",'"',$row["jsonRecord"]);
               $response .=  $row["jsonRecord"] . ",";
            }
            $response .= "]};";
            //$response = str_replace(",]","]",$response);
        }
     }

mysqli_close($connection);
echo $response;
//echo $response;
?>

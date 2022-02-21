<?php
$connection = mysqli_connect("localhost", "root", "Maria1337DB", "spacehexagon_overworld");
if(!$connection)
{ echo 'Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error();}
if(isset($_POST["world"]) ){
    $world = $_POST["world"];
    $worldData = mysqli_query($connection,"select WorldData from `SubWorlds` where WorldName = '" .$world . "';");
    $worldData = mysqli_fetch_array($worldData);
    echo $worldData["WorldData"];
} else {
    $allWorldData = mysqli_query($connection,"select WorldData from `SubWorlds` where 1;");
    echo '{ "worlds":[';
    $counter = mysqli_num_rows($allWorldData) -1;
    while($worldData = mysqli_fetch_array($allWorldData)){
        echo $worldData["WorldData"];
        if($counter > 0){
         $counter --;
         echo ",";
        }
    }
    echo ']}';
}
mysqli_close($connection);
?>

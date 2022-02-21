<?php
//Overworld server (previously phong galaxy server)
//error_reporting(E_ALL);
error_reporting(E_ALL);
ini_set('display_errors', 'On');

if(isset($_GET["mode"]))
{
   $mode = $_GET["mode"];
} else if(isset($_POST["mode"])) {
    $mode = $_POST["mode"];
} else {
    $mode = "content";
}
$response = "";
$connection = mysqli_connect("localhost", "root", "Maria1337DB", "spacehexagon_overworld");
if(!$connection)
{
    echo 'Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error();
} else {
   if($mode=="recent")
   {
       $RecentPosts = mysqli_query($connection,"select * from `RecentPosts` order by id DESC;");
       $response = "[";
       $numRecentPosts = mysqli_num_rows($RecentPosts);
      $rowCounter = 0;
    while( $result = mysqli_fetch_array($RecentPosts))
    {
        $rowCounter++;
        $RecentPostId = $result["id"];
        $postWorld = $result["worldKey"];
     $result = mysqli_query($connection,"select * from `" . $postWorld  . "` where updateId = " .$result["entityId"] . ";");
     $result = mysqli_fetch_array($result);
        if($rowCounter<=16){

        $response .= $result["jsonRecord"].",";
        } else if($numRecentPosts >=32){

             mysqli_query($connection,"delete from RecentPosts where id=" . $RecentPostId . ";");
             mysqli_query($connection,"insert into PostArchives values (default,'". $postWorld .",".$result["updateId"].");");
        }
    }
       $response .="]";
   } else {
    $id = $_GET["id"];
    $worldKey = $_GET["worldKey"];
    $result = mysqli_query($connection,"select * from `" . $worldKey . "` where updateId = " .$id . ";");
    $result = mysqli_fetch_array($result);
    if($mode == "content")
    {
         //$content = explode(",",$result["jsonRecord"]);
        // $response .= urldecode($content[24]);//substr($content[24],1,-1));
       // function utf8_urldecode($str) { $str = preg_replace("/%u([0-9a-f]{3,4})/i","&#x\\1;",urldecode($str)); return html_entity_decode($str,null,'UTF-8');; }
       // $response .=utf8_urldecode($content[24]);
         $response = '<html><head><title>Overworld</title><script>function renderContent(){eval("content=' . $result["jsonRecord"] .';"); document.body.innerHTML=decodeURIComponent(content[12]);}</script></head><body onload="renderContent()"></body></html>';
       // $response .= //print_r($content);
    } else {
        $response .= $result["jsonRecord"];
    }
   }
}
mysqli_close($connection);
echo $response;
?>

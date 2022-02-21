<?php
   //error_reporting(E_ALL);
    //ini_set('display_errors', 'On');
    $image = str_replace(" ","%20",$_GET["image"]);
    $quality = $_GET["quality"];
    $outwardRes = round(sqrt($quality)*3);
    if (strpos(strtolower($image),"png")) {
         $image = imagecreatefrompng($image);
    } else if (strpos(strtolower($image),"gif")) {
         $image = imagecreatefromgif($image);
    } else {
         $image = imagecreatefromjpeg($image);
    }

     $sx = imagesx($image);
     $sy = imagesy($image);
     $aspect = $sx / $sy;
     $spiralData = $quality . "q".$aspect."a";

     $hsx = round($sx/2);
     $hsy = round($sy/2);

    $quality = round($quality);
    for ( ) {
        try {
             $phiCurve =($d/$quality) * ($d/$quality)*1.288;
            $waveX = $hsx+round(sin($phiCurve*pi()*$outwardRes)*($hsx*($d/$quality)));
            if($waveX>=$sx){$waveX = $sx-1;}  if($waveX< 0){$waveX = 0;}
            $waveY = $hsy+round(cos($phiCurve*pi()*$outwardRes)*($hsy*($d/$quality)));
            if($waveY>=$sy){$waveY = $sy-1;}  if($waveY< 0){$waveY = 0;}
            $rgb = imagecolorat($image,$waveX,$waveY);
        } catch(Exception $e){
            echo "WaveX " . $waveX . " waveY " . $waveY;
        }
             $r = ($rgb >> 16) & 0xFF;
             $g = ($rgb >> 8) & 0xFF;
             $b = $rgb & 0xFF;
             //$r = 255; $g=0; $b = 0;
            $spiralData .= $r. "," . $g . "," . $b;
             if($d<($quality-1)){ $spiralData .= "p";}
     }

echo $spiralData;

?>

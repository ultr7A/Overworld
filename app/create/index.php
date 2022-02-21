<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
 if ($_SERVER["REQUEST_METHOD"] === 'POST') {
     $connection = mysqli_connect("localhost", "root", "Maria1337DB", "spacehexagon_overworld");
     if (!$connection) {
        echo 'Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error();
     }
     if (isset($_POST["Edit"])) {
        $user_id = $_POST["user_id"];
        $worldData = mysqli_query($connection,"select WorldData from `SubWorlds` where user_id = " . $user_id . ";");
        $jsonData = mysqli_fetch_array($worldData);
        if (!empty($jsonData)){
            echo '{"UserWorlds":[' . $jsonData["WorldData"];
            while ($jsonData = mysqli_fetch_array($worldData)){
                echo "," . $jsonData["WorldData"] ;
            }
            echo '],"currentWorld":0}';
        } else {
            echo '{"UserWorlds":[],"currentWorld":0}';
        }
        mysqli_close($connection);
        exit();
    }
  }
?>
<!DOCTYPE html>
<html>
    <head>
        <?php
            $username = "";
            $user_id = -1;
            if ($_SERVER["REQUEST_METHOD"] === 'POST') {
				if (isset($_POST["signup"])) {
					$password =  password_hash($_POST["password"], PASSWORD_BCRYPT);
                    $user_data = json_encode(array (
                        // user data here...
                    ));
                    $user = mysqli_query($connection,"select * from `Users` where username = '" . $_POST["username"] . "';");
                    if (mysqli_num_rows($user)==0) {
                        mysqli_query($connection,"insert into `Users` (username,password,email,user_data) values ('" . $_POST["username"] . "','" . $password . "','" . $_POST["email"] . "','" . $user_data . "');");
                    }  else {    // else the user already exists:
                       echo "<h2 class='validation' >Unfortunately the username entered is not available; please try another.</h2>";
                    }
				}

				if (isset($_POST["login"])) {
                    $user = mysqli_query($connection,"select * from `Users` where username = '" . $_POST["username"] . "';");
                    $user = mysqli_fetch_array($user);
                    if (password_verify($_POST["password"],$user["password"])) {
                        $username = $_POST["username"];
                        $user_id = $user["id"];
                    } else {
                        echo "<h2 class='validation' >Incorrect Username Or Password.</h2>";
                        //mysqli_close($connection);
                       // exit();
                    }
				}

				if (isset($_POST["World_Name"])) {   // if a new world is being created or current world is beind edited (may change)
					$world = $_POST["World_Name"];
                    $okToSave = true;
                     $worldData = mysqli_query($connection,"select * from `SubWorlds` where WorldName = '" . $world . "';");
                     $worldData = mysqli_fetch_array($worldData);
                     if (!empty($worldData)) {
                         $jsonData = json_decode($worldData[2], true);
                           if ($worldData["user_id"]!=$user_id){
                                echo "<h2 class='validation' >World Name Is Already Taken.</h2>";
                                mysqli_close($connection);
                               $okToSave = false;
                           }
                     }
                    if ($okToSave) {
                        $red = (float)$_POST["red"];
                        $green = (float)$_POST["green"];
                        $blue = (float)$_POST["blue"];
                        $worldDirectory = "uploads/" . $_POST["World_Name"] . "/";
                         if(!file_exists("../" . $worldDirectory)){ mkdir("../" . $worldDirectory,0777); }
                         $backgroundImagePath  = $_POST["File_Name"];
                         $terrainImagePath = $_POST["Terrain_File_Name"];
                         if(isset($_FILES["Background_Image"]) && strlen($_FILES["Background_Image"]["tmp_name"]) > 1){
                            $backgroundImagePath = $worldDirectory . $_FILES["Background_Image"]["name"];
                             move_uploaded_file($_FILES["Background_Image"]["tmp_name"],"../".$backgroundImagePath);
                             $red = $green  = $blue = 1.0;
                         }
                         if(isset($_FILES["Terrain_Texture"]) && strlen($_FILES["Terrain_Texture"]["tmp_name"]) > 1){
                            $terrainImagePath = $worldDirectory . $_FILES["Terrain_Texture"]["name"];
                             move_uploaded_file($_FILES["Terrain_Texture"]["tmp_name"],$terrainImagePath);
                             //echo $worldDirectory . $_FILES["Terrain_Texture"]["name"];
                         }
                        $rows = mysqli_query($connection,"select max(id) as id from `SubWorlds`;");
                        $theta =  mysqli_fetch_array($rows)["id"];
                        if ($theta == 0) {
                            $theta = 1;
                        }
                        $portalX = ((sin(pi()*2*($theta/12.0))*160000)/($theta*$theta)*0.15);
                        $portalY = ((sin(pi()*2*($theta/12.0))*10000)/($theta*$theta)*0.15);
                        $portalZ = ((cos(pi()*2*($theta/12.0))*160000)/($theta*$theta)*0.15);
                        if (isset($_POST["resetGallery"])) {
                            if ($_POST["resetGallery"]=="reset") {
                                $jsonData["generator"]["content"] = array();
                            }
                        }
                         $worldDataArray = array(
                             "user_id"=>$user_id,
                             "subspace"=>$_POST["World_Name"],
                             "mesh"=>array(
                                 "position"=>array(
                                     "x"=> $portalX,
                                     "y"=> $portalY,
                                     "z"=> $portalZ,
                                 )
                             ),
                             "color" => array($red,$green,$blue),
                             "material" => $_POST["Premade_Texture"],
                             "fileName" => $backgroundImagePath,
                             "boundaryOptions" => array(
                                 "boundaryType" =>$_POST["Physical_Boundaries"],
                                 "color"=>array((float)$_POST["terrain_red"],(float)$_POST["terrain_green"],(float)$_POST["terrain_blue"]),
                                 "terrainTexture" =>$terrainImagePath,
                                 "premadeTerrainTexture" => (isset($_POST["Premade_Terrain_Texture"]) ? $_POST["Premade_Terrain_Texture"] : ""),
                                 "deformSurface" => isset($_POST["Deform_Surface"]) ? true : false,
                             ),
                             "generator" => array(
                                "type" => $_POST["Generator_Type"], //$jsonData["generator"]["type"],
                                "seed" => (isset($jsonData["generator"]["seed"]) ? $jsonData["generator"]["seed"] : array()),
                                "content" => (isset($jsonData["generator"]["content"]) ? $jsonData["generator"]["content"] : array()),
                             ),
                             "options" => array(
                                "general" =>array(
                                    "rangedSelectObject" => isset($_POST["Ranged_Select_Object"]) ? true : false,
                                    "submitContent" => isset($_POST["Submit_Content"]) ? true : false,
                                    "attachFilesToObject" => isset($_POST["Attach_Files_To_Object"]) ? true : false,
                                    "embedHTMLInObject" => isset($_POST["Embed_HTML_In_Object"]) ? true : false,
                                    "embedLinkInObject" => isset($_POST["Embed_Link_In_Object"]) ? true : false
                                ),
                                "constructive" => array(
                                    "createNewStructure" => isset($_POST["Create_New_Structure"]) ? true : false,
                                    "buildOnToObject" => isset($_POST["Build_On_To_Object"]) ? true : false,
                                    "cubeSnappingBrush" => isset($_POST["Cube_Snapping_Brush"]) ? true : false,
                                    "continuousObjectBrush" => isset($_POST["Continuous_Object_Brush"]) ? true : false
                                ),
                                "destructive" => array(
                                    "deleteObject"=>isset($_POST["Delete_Object"]) ? true : false,
                                    "cutHoleInObject"=>isset($_POST["Cut_Hole_In_Object"]) ? true : false,
                                    "combatOptions"=>array(
                                        "attackStructures"=>isset($_POST["Attack_Structures"]) ? true : false,
                                        "attackOtherUsers"=>isset($_POST["Attack_Other_Users"]) ? true : false,
                                        "availableWeapons"=>array(
                                            "standard"
                                        ),
                                    )
                                )
                             )
                         );
                         if(count($_FILES['filesToUpload']['tmp_name'])) {
                            $file = -1;
                            while (++$file < count($_FILES['filesToUpload']['tmp_name'])) {
                                $filePath = "uploads/" . $_POST["World_Name"] . "/" . basename($_FILES['filesToUpload']["name"][$file]);
                                if(move_uploaded_file($_FILES['filesToUpload']["tmp_name"][$file], "../" . $filePath)) {
                                    array_push($worldDataArray["generator"]["content"], $filePath);
                                }

                            }
                         }
                         $serializedWorldData = json_encode($worldDataArray);
                         $serializedWorldData = str_replace('"on"',"true",$serializedWorldData);   // echo $serializedWorldData;

                          // check if world already exists....
                         $worldData = mysqli_query($connection,"select WorldData from `SubWorlds` where WorldName = '" .$world . "';");
                         $worldData = mysqli_fetch_array($worldData);
                         if (empty($worldData)) {
                            mysqli_query($connection,"insert into `SubWorlds` (WorldName,WorldData,user_id) values ('" . $world . "','" . $serializedWorldData . "'," . $user_id . ");");
                            // get highest update id
                             $highestId = mysqli_query($connection,"select max(updateId) as updateId from `Overworld`;");
                             $highestId = mysqli_fetch_array($highestId)["updateId"];
                             // insert a portal into the overworld
                             $portalMaterial = $_POST["Premade_Texture"];
                             $portalImage = "";
                             if(preg_match("/(jpg|png|jpeg)/",$worldDataArray["fileName"])) {
                                 $portalImage = $worldDataArray["fileName"];
                             }
				            $objectScale = sqrt(($portalX*$portalX)+($portalY*$portalY)+($portalZ*$portalZ))/10000;
	        	            $portalSize = array(1000 * $objectScale, 1000 * $objectScale,1000 * $objectScale);
                             $portal = "[". ( $highestId + 1) . ",'Portal To " . $worldDataArray["subspace"] . "','Overworld','sphere','"
                                 . $portalMaterial . "',[" . $worldDataArray["color"][0] . ","
                                 . $worldDataArray["color"][1] . ","
                                 . $worldDataArray["color"][2] . "],[".$portalSize[0].",".$portalSize[1].",".$portalSize[2]."],["
                                 . $portalX . ",". $portalY. "," . $portalZ . "],'" . $worldDataArray["fileName"] .
                                 "',[0,0,0,1],'Solid','','','','" . $portalImage ."','Not_Implemented','"
                                 . $worldDataArray["subspace"] . "',false,'','',". (1900 * $objectScale)  ."]";
                             mysqli_query($connection,"insert into `Overworld` values (" . ($highestId+1) . ',"' . $portal . '");');
                         }  else {
                            // echo $worldData["WorldData"];
                            mysqli_query($connection,"update `SubWorlds` set WorldData = '" . $serializedWorldData . "' where WorldName = '" . $world . "';");
                         }


                    }
				}
                mysqli_close($connection);
            }

        ?>
        <title>New World | Overworld</title>
        <meta name='theme-color' content='rgb(71, 20, 137)'>
        <link rel="icon" type="image/png" href="../graphics/purple-square.png" >
        <style>
            html{
            }
            body{
                padding:0px;
                margin:0px;
                width:100%;
                height:100%;
                background:black;
                background-size:100%;
                background-image:url(../graphics/create_background.png);
                color:white;

                font-family:helvetica, sans-serif;
            }
            header{

            }

        </style>
        <link rel="stylesheet" href="../css/frontend.css" type="text/css" >
        <script src="../lib/three/three.min.js"></script>
<!--        <script src="../js//boilerplate/vendor/three.js/three.min.js"></script>-->
        <script src="../lib/threex/threex.dragpancontrols.js"></script>
        <script src="../lib/three/Detector.js"></script>
        <!--
            <script src="js/three/"></script>-->
        <?php if ($username != "") { ?>
        <script>
            var userName = "<?php echo $username; ?>";
            var userId = <?php echo $user_id; ?>;
            var textures = {
                 rainbowCircuitTexture:null,
                 colorCircuitTexture:null,
                 colorFlowTexture:null,
                 rockTexture2:null,
                 hyperPanelTexture:null,
            };
            var time = 0.0;
            textures.colorCircuitTexture = THREE.ImageUtils.loadTexture("../graphics/colorCircuit2.png");
            textures.colorCircuitTexture.repeat.set( 1.0, 1.0 );
            textures.colorCircuitTexture.wrapS = textures.colorCircuitTexture.wrapT = THREE.RepeatWrapping;
            textures.colorCircuitTexture.needsUpdate = true;
            //rock texture
            textures.rockTexture2 = THREE.ImageUtils.loadTexture("../graphics/rocks_contrast.jpg");
            textures.rockTexture2.repeat.set( 1.0, 1.0 );
            textures.rockTexture2.wrapS = textures.rockTexture2.wrapT = THREE.RepeatWrapping;
            textures.rockTexture2.needsUpdate = true;
            //color flow texture
            textures.colorFlowTexture = THREE.ImageUtils.loadTexture("../graphics/noise_1.png");
            textures.colorFlowTexture.repeat.set( 1.0, 1.0 );
            textures.colorFlowTexture.wrapS = textures.colorFlowTexture.wrapT = THREE.RepeatWrapping;
            textures.colorFlowTexture.needsUpdate = true;
            //hyper panel texture
            textures.hyperPanelTexture = THREE.ImageUtils.loadTexture("../graphics/hyperPanel.png");
            textures.hyperPanelTexture.repeat.set( 1.0, 1.0 );
            textures.hyperPanelTexture.wrapS = textures.hyperPanelTexture.wrapT = THREE.RepeatWrapping;
            textures.hyperPanelTexture.needsUpdate = true;
            //rainbow circuit material
            textures.rainbowCircuitTexture = THREE.ImageUtils.loadTexture("../graphics/alphaRainbowCircuit.png"); //alphaRainbowCircuit
            textures.rainbowCircuitTexture.wrapS = textures.rainbowCircuitTexture.wrapT =2;
            textures.rainbowCircuitTexture.repeat.set( 1, 1 );
            textures.rainbowCircuitTexture.needsUpdate = true;

            function animate () {
                requestAnimationFrame( animate );
                camera.position.set(Math.sin(time)*400.0,200,Math.cos(time)*400.0);
                camera.lookAt(new THREE.Vector3(0,0,0));
                time += 0.001;
                render(); // do the render
            }

            function render () { // render the scene
                //cameraControls.update(); // update camera controls
                renderer.render( scene, camera );    // actually render the scene
            }
            window.onload = function init () {
                if (Detector.webgl) {
                    renderer = new THREE.WebGLRenderer({
                        antialias		: false	// to get smoother output
                    });
                    renderer.setClearColor( 0x000000, 1 );
                    //}else{
                    //	Detector.addGetWebGLMessage();
                    //	return true;
                } else {
                    renderer = new THREE.CanvasRenderer();
                }
                renderer.setSize( window.innerWidth/2.0, window.innerHeight );
                renderer.domElement.setAttribute("class","visualizer");
                document.body.appendChild(renderer.domElement);

                scene = new THREE.Scene();   // create a scene
                camera = new THREE.PerspectiveCamera(65, window.innerWidth/2.0 / window.innerHeight, 1, 100000 );   // put a camera in the scene
                camera.position.set(0, 400, -500);
                scene.add(camera);

                light =  new THREE.PointLight(0xffffff,1.0,10000);
                camera.add(light);
                // TO DO
                // ADD LIGHT TO CAMERA HERE (to make terrain materials shaded)


                var skyMaterial = new THREE.MeshBasicMaterial({wireframe:true,side:1});
                sky = new THREE.Mesh(new THREE.OctahedronGeometry(15000,3),skyMaterial);
                scene.add(sky);

                // create a camera contol
                //cameraControls	= new THREEx.DragPanControls(camera)

               window.onresize = function windowResize(){
                   renderer.setSize( window.innerWidth/2.0, window.innerHeight );
                   camera.aspect = window.innerWidth/2.0 / window.innerHeight;
                   camera.updateProjectionMatrix();
               };
                // allow 'p' to make screenshot
               // THREEx.Screenshot.bindKey(renderer);
                // allow 'f' to go fullscreen where this feature is supported
//                if( THREEx.FullScreen.available() ){
//                    THREEx.FullScreen.bindKey();
//                    document.getElementById('inlineDoc').innerHTML	+= "- <i>f</i> for fullscreen";
//                }

                //THREE.CSG.toCSG(dots)

                var geometry	= new THREE.TorusGeometry( 101, 10.42 );
                var material	= new THREE.MeshNormalMaterial();
                var mesh	= new THREE.Mesh( geometry, material );
                scene.add( mesh );
                animate();

                (function() {
                    var startingWorld,
                    request = new XMLHttpRequest();
                    request.onreadystatechange = function () {
                        if (request.readyState==4 && request.status==200) {
                            window.worldData = JSON.parse(request.responseText);
                            console.log(window.worldData);
                            if(worldData.UserWorlds.length!==0){
                                startingWorld = parseInt(document.querySelector("input[name=lastWorldIndex]").value);
                                switchWorlds(startingWorld);
                            } else {
                                newWorld();
                            }
                        }
                    };

                    request.open("POST","?",true);
                    request.setRequestHeader("Content-type","application/x-www-form-urlencoded");
                    request.send("Edit=true&user_id=<?php echo $user_id; ?>");
            } )();
            }

            function boundariesChanged (elem) {
                var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                var surfaceProperties = document.querySelector(".surface_properties");
                var deformSurfaceContainer = document.querySelector("#deformSurfaceContainer");
                if(elem.value != "none"){
                    surfaceProperties.style.height = "auto";
                    deformSurfaceContainer.style.display = elem.value != "asymptote" ? "inline" : "none";
                    worldSettings.boundaryOptions.color[0] = 1;
                    worldSettings.boundaryOptions.color[1] = 1;
                    worldSettings.boundaryOptions.color[2] = 1;
                    document.querySelector("input[name=terrain_red]").value = 1;
                    document.querySelector("input[name=terrain_green]").value = 1;
                    document.querySelector("input[name=terrain_blue]").value = 1;
                    worldSettings.boundaryOptions.premadeTerrainTexture = "rock2";
                    document.querySelector("select[name=Premade_Terrain_Texture]").value = "rock2";
                 } else {
                     if(elem.value == "none" || elem.value == "asymptote" ){
                        surfaceProperties.style.height = "0px";
                        deformSurfaceContainer.style.display = "none";
                     }
                 }
                 updateWorldSettings();
            }

            // depricated
            function colorChanged (elem, i) {
                var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                worldSettings.color[i] = elem.value;
                updateVisualization(worldSettings);
            }

            function resetColor (elem) {
                console.log(elem.value);
                var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                document.querySelector("input[name=red]").value  = 1;
                document.querySelector("input[name=green]").value  = 1;
                document.querySelector("input[name=blue]").value  = 1;
                worldSettings.color = [1,1,1];

                updateVisualization(worldSettings);
            }

            function resetBackgroundImage () {
                 var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                document.querySelector("input[name=File_Name]").value = "";
                document.querySelector("input[name=Background_Image]").value = "";
                document.querySelector("#generated_background").style.display="block";
                document.querySelector("select[name=Premade_Texture]").value = "plastic";
                document.querySelector("select[name=Premade_Texture]").onchange();
                updateWorldSettings();
                //updateVisualization(worldSettings);
            }

            function resetGalleryMedia() {
                worldData.UserWorlds[worldData.currentWorld].generator.content = [];
                document.querySelector("[name=resetGallery]").setAttribute("value", "reset");
                document.querySelector("#generatorStatus").innerHTML = 0 + " media files on display";
            }
           // this replaces it...
            function updateWorldSettings () {
                var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                worldSettings.subspace = document.querySelector("input[name=World_Name]").value;
                worldSettings.mesh.position.x = document.querySelector("input[name=positionX]").value;
                worldSettings.mesh.position.y = document.querySelector("input[name=positionY]").value;
                worldSettings.mesh.position.z = document.querySelector("input[name=positionZ]").value;
                worldSettings.fileName = document.querySelector("input[name=File_Name]").value;
                worldSettings.material = document.querySelector("select[name=Premade_Texture]").value;

                worldSettings.boundaryOptions.boundaryType = document.querySelector("select[name=Physical_Boundaries]").value;
                worldSettings.boundaryOptions.premadeTerrainTexture = document.querySelector("select[name=Premade_Terrain_Texture]").value;  // double check this!!!

                worldSettings.color[0] = document.querySelector("input[name=red]").value;
                worldSettings.color[1] = document.querySelector("input[name=green]").value;
                worldSettings.color[2] = document.querySelector("input[name=blue]").value;

                worldSettings.boundaryOptions.deformSurface = document.querySelector("input[name=Deform_Surface]").checked;
                worldSettings.boundaryOptions.color[0] = document.querySelector("input[name=terrain_red]").value;
                worldSettings.boundaryOptions.color[1] = document.querySelector("input[name=terrain_green]").value;
                worldSettings.boundaryOptions.color[2] = document.querySelector("input[name=terrain_blue]").value;

                worldSettings.options.general.rangedSelectObject = document.querySelector("input[name=Ranged_Select_Object]").checked;
                worldSettings.options.general.submitContent = document.querySelector("input[name=Submit_Content]").checked;
                worldSettings.options.general.attachFilesToObject = document.querySelector("input[name=Attach_Files_To_Object]").checked;
                worldSettings.options.general.embedHTMLInObject = document.querySelector("input[name=Embed_HTML_In_Object]").checked;
                worldSettings.options.general.embedLinkInObject= document.querySelector("input[name=Embed_Link_In_Object]").checked;

                worldSettings.options.constructive.createNewStructure = document.querySelector("input[name=Create_New_Structure]").checked;
                worldSettings.options.constructive.buildOnToObject = document.querySelector("input[name=Build_On_To_Object]").checked;
                worldSettings.options.constructive.continuousObjectBrush = document.querySelector("input[name=Continuous_Object_Brush]").checked;
                worldSettings.options.constructive.cubeSnappingBrush = document.querySelector("input[name=Cube_Snapping_Brush]").checked;

                worldSettings.options.destructive.deleteObject = document.querySelector("input[name=Delete_Object]").checked;
                worldSettings.options.destructive.cutHoleInObject = document.querySelector("input[name=Cut_Hole_In_Object]").checked;
                worldSettings.options.destructive.combatOptions.attackOtherUsers = document.querySelector("input[name=Attack_Other_Users]").checked;
                worldSettings.options.destructive.combatOptions.attackStructures =  document.querySelector("input[name=Attack_Structures]").checked;
                console.log(worldSettings.options.destructive.cutHoleInObject);

                var generatorInput = document.querySelector("select[name=Generator_Type]");
                generatorInput.value = (document.querySelector("#filesToUpload").files.length > 0 ? "gallery" : generatorInput.value);
                worldSettings.generator.type =  generatorInput.value;
                var backgroundUpload = document.querySelector("input[name=Background_Image]");
                if (backgroundUpload.files.length > 0) {
                    worldSettings.material = "plastic";
                    document.querySelector("select[name=Premade_Texture]").value = "plastic";
                }
                //worldSettings.generator.content = document.querySelector("#filesToUpload").files;  // might not work as is

                updateVisualization(worldSettings);
            }



            function updateVisualization (worldSettings) {
                console.log(worldSettings.boundaryOptions.boundaryType);
                 var map = null;
                 if (worldSettings.fileName.length > 0){
                    map = THREE.ImageUtils.loadTexture("../"+worldSettings.fileName);
                 } else {
                    switch (worldSettings.material) {
                        case "hyperPanel":
                            map = textures.hyperPanelTexture;
                        break;
                        case "rock2":
                            map = textures.rockTexture2;
                        break;
                        case "colorCircuit":
                            map = textures.colorCircuitTexture;
                        break;
                        case "colorFlow":
                            map = textures.colorFlowTexture;
                        break;
                    }
                 }
                var skyMaterial = new THREE.MeshBasicMaterial({wireframe:worldSettings.material=="wireFrame",map:map,
                            color:new THREE.Color(worldSettings.color[0],worldSettings.color[1],worldSettings.color[2]),
                            fog:false,side:1});
                scene.remove(sky);
                sky = new THREE.Mesh(new THREE.OctahedronGeometry(1500,3),skyMaterial);
                scene.add(sky);
                var boundaryGeom = null;
                if (worldSettings.boundaryOptions.boundaryType != "none"){
                    var settings = { };
                     if (worldSettings.boundaryOptions.terrainTexture.length > 0) {
                        settings = { map: THREE.ImageUtils.loadTexture("../"+worldSettings.boundaryOptions.terrainTexture) };
                     } else {
                        switch(worldSettings.boundaryOptions.premadeTerrainTexture){
                            case "hyperPanel":
                                settings = {
                                    specular: 0xffffff,
                                    shininess: 8,
                                    bumpMap: textures.hyperPanelTexture,
                                    bumpScale: 10,
                                    metal: false,
                                    map: textures.hyperPanelTexture, fog: true };
                            break;
                            case "rock2":
                                settings = {
                                    specular: 0xffffff,
                                    shininess: 4,
                                    bumpMap: textures.rockTexture2,
                                    bumpScale: 10,
                                    metal: false,
                                    map: textures.rockTexture2, fog: true };
                            break;
                            case "colorCircuit":
                                settings = {
                                    specular: 0xffffff,
                                    shininess: 8,
                                    bumpMap: textures.colorCirtuitTexture,
                                    bumpScale: 10,
                                    metal: false,
                                    map: textures.colorCircuitTexture, fog: true };
                            break;
                            case "colorFlow":
                                settings = { map:textures.colorFlowTexture, fog: true };
                            break;
                        }
                     }

                    var boundaryMaterial = new THREE.MeshPhongMaterial(settings);
                    boundaryMaterial.color = new THREE.Color(worldSettings.boundaryOptions.color[0],
                                                             worldSettings.boundaryOptions.color[1],
                                                             worldSettings.boundaryOptions.color[2]);
                    boundaryMaterial.specular = color = new THREE.Color(worldSettings.boundaryOptions.color[0],
                                                             worldSettings.boundaryOptions.color[1],
                                                             worldSettings.boundaryOptions.color[2]);
                    boundaryMaterial.wireframe = (worldSettings.boundaryOptions.premadeTerrainTexture == "wireFrame" ? true : false);

                    if (typeof(boundaries)!='undefined') { scene.remove(boundaries); }
                    switch (worldSettings.boundaryOptions.boundaryType){
                     case "plane":
                        boundaryGeom = new THREE.PlaneGeometry(1600,1600,32,32);
                        if (worldSettings.boundaryOptions.deformSurface){
                            var vertices = boundaryGeom.vertices, vertex = vertices.length-1;
                            while(vertex > -1){
                                vertices[vertex].z = Math.random()*70.0;
                                vertex --;
                            }
                        }
                        if(settings.map){ settings.map.repeat.set(12,12); }
                     break;
                     case "planetoid":
                        boundaryGeom = new THREE.OctahedronGeometry(200,4);
                        if (worldSettings.boundaryOptions.deformSurface){
                            var vertices = boundaryGeom.vertices, vertex = vertices.length-1;
                            while(vertex > -1){
                                vertices[vertex].z*= 1.0 + Math.random()/5.0;
                                vertices[vertex].y*= 1.0 + Math.random()/5.0;
                                vertices[vertex].x*= 1.0 + Math.random()/5.0;
                                vertex --;
                            }
                        }
                        if (settings.map){ settings.map.repeat.set(4,2); }
                     break;
                     default: break;
                    }

                    if (worldSettings.boundaryOptions.deformSurface){
                        boundaryGeom.verticesNeedUpdate = true;
                        boundaryGeom.computeFaceNormals();
                        boundaryGeom.computeVertexNormals();    // requires correct face normals
                    }

                    boundaries = new THREE.Mesh(boundaryGeom,boundaryMaterial);
                    if(worldSettings.boundaryOptions.boundaryType == "plane"){
                        boundaries.rotation.set(-Math.PI/2.0,0,0);
                    }

                    scene.add(boundaries);
                } else {
                    if(typeof(boundaries)!='undefined'){ scene.remove(boundaries); }
                }
                // scene.remove(boundaries);
            }

            function switchWorlds (direction) {
                // direction is an int -1, 1 or 0 to load the first world
                worldData.currentWorld += direction;
                document.querySelector("input[name=lastWorldIndex]").value = worldData.currentWorld;
                if(worldData.currentWorld < 0) { worldData.currentWorld = worldData.UserWorlds.length-1;  }
                if(worldData.currentWorld > worldData.UserWorlds.length-1) { worldData.currentWorld = 0;  }
                var worldSettings = worldData.UserWorlds[worldData.currentWorld];
                document.querySelector("input[name=World_Name]").value = worldSettings.subspace;
                document.querySelector("input[name=File_Name]").value = worldSettings.fileName;
                if(worldSettings.fileName.length>0){
                    document.querySelector("#generated_background").style.display = "none";
                }

                (function(){
                    var m = worldSettings.material;
                    if(m == "hyperPanel" || m == "rock2" || m == "colorCircuit" || m == "colorFlow" || m == "wireFrame" ){
                        document.querySelector("select[name=Premade_Texture]").value = m;
                    }
                })();

                if(worldSettings.boundaryOptions.boundaryType == "none"){
                    if(typeof(boundaries)!='undefined'){ scene.remove(boundaries); }
                    document.querySelector(".surface_properties").style.height = "0px";
                } else {
                    document.querySelector(".surface_properties").style.height = "auto";
                }

                document.querySelector("input[name=positionX]").value = worldSettings.mesh.position.x;
                document.querySelector("input[name=positionY]").value = worldSettings.mesh.position.y;
                document.querySelector("input[name=positionZ]").value = worldSettings.mesh.position.z;
                document.querySelector("select[name=Physical_Boundaries]").value = worldSettings.boundaryOptions.boundaryType;
                document.querySelector("select[name=Premade_Terrain_Texture]").value = worldSettings.boundaryOptions.premadeTerrainTexture;
                document.querySelector("input[name=Deform_Surface]").checked = worldSettings.boundaryOptions.deformSurface;
                document.querySelector("input[name=red]").value = worldSettings.color[0];
                document.querySelector("input[name=green]").value = worldSettings.color[1];
                document.querySelector("input[name=blue]").value = worldSettings.color[2];
                document.querySelector("input[name=terrain_red]").value = worldSettings.boundaryOptions.color[0];
                document.querySelector("input[name=terrain_green]").value = worldSettings.boundaryOptions.color[1];
                document.querySelector("input[name=terrain_blue]").value = worldSettings.boundaryOptions.color[2];
                document.querySelector("input[name=Terrain_File_Name]").value = worldSettings.boundaryOptions.terrainTexture;
                document.querySelector("input[name=Ranged_Select_Object]").checked = worldSettings.options.general.rangedSelectObject;
                document.querySelector("input[name=Submit_Content]").checked = worldSettings.options.general.submitContent;
                document.querySelector("input[name=Attach_Files_To_Object]").checked = worldSettings.options.general.attachFilesToObject;
                document.querySelector("input[name=Embed_HTML_In_Object]").checked = worldSettings.options.general.embedHTMLInObject;
                document.querySelector("input[name=Embed_Link_In_Object]").checked = worldSettings.options.general.embedLinkInObject;
                document.querySelector("input[name=Create_New_Structure]").checked = worldSettings.options.constructive.createNewStructure;
                document.querySelector("input[name=Build_On_To_Object]").checked = worldSettings.options.constructive.buildOnToObject;
                document.querySelector("input[name=Continuous_Object_Brush]").checked = worldSettings.options.constructive.continuousObjectBrush;
                document.querySelector("input[name=Cube_Snapping_Brush]").checked = worldSettings.options.constructive.cubeSnappingBrush;
                document.querySelector("input[name=Delete_Object]").checked =  worldSettings.options.destructive.deleteObject;
                document.querySelector("input[name=Cut_Hole_In_Object]").checked = worldSettings.options.destructive.cutHoleInObject;
                document.querySelector("input[name=Attack_Other_Users]").checked = worldSettings.options.destructive.combatOptions.attackOtherUsers;
                document.querySelector("input[name=Attack_Structures]").checked =  worldSettings.options.destructive.combatOptions.attackStructures;


                if(worldSettings.subspace!=""){
                    document.querySelector("#enterName").style.display="none";
                    document.querySelector("input[name=World_Name]").style.display="none";
                    var worldName = document.querySelector("#worldName");
                    worldName.style.display="inline-block";
                    worldName.innerHTML = "<h1>"+worldSettings.subspace+"</h1>";// + " by " + userName;
                    worldName.setAttribute("href","../?g=2&w="+encodeURIComponent(worldSettings.subspace));
                } else {
                    document.querySelector("#enterName").style.display="inline-block";
                    document.querySelector("input[name=World_Name]").style.display="inline-block";
                    document.querySelector("#worldName").style.display="none";
                }
                document.querySelector("[name=Generator_Type]").value = worldSettings.generator.type;
                if (worldSettings.generator.type = "gallery") {
                    document.querySelector("#generatorStatus").innerHTML = worldSettings.generator.content.length + " media files on display";
                }
                updateVisualization(worldSettings);
            }

            function newWorld () {
                document.querySelector("#enterName").style.display="inline-block";
                document.querySelector("input[name=World_Name]").style.display="inline-block";
                document.querySelector("#worldName").style.display="none";
                var newWorldData = {"user_id": userId,
                                    "subspace":"",
                                    "mesh":{
                                        "position": {"x":0, "y":0, "z":0}
                                    },"color": ["1", "1", "1"],
                                    "material": "wireFrame",
                                    "fileName": "",
                                    "boundaryOptions": {
                                        "boundaryType": "none",
                                        "color": ["0","0","0"],
                                        "terrainTexture": "",
                                        "premadeTerrainTexture": "",
                                        "deformSurface": false
                                    },
                                    "generator":{
                                        "type": "none",
                                        "seed": 0,
                                        "content": []
                                    },
                                    "options":{
                                        "general":{
                                            "rangedSelectObject": true,
                                            "submitContent": true,
                                            "attachFilesToObject": true,
                                            "embedHTMLInObject":true,
                                            "embedLinkInObject":true
                                        },"constructive":{
                                            "createNewStructure": true,
                                            "buildOnToObject": true,
                                            "cubeSnappingBrush": true,
                                            "continuousObjectBrush": true
                                        },"destructive":{
                                            "deleteObject": true,
                                            "cutHoleInObject": true,
                                            "combatOptions":{
                                                "attackStructures": true,
                                                "attackOtherUsers": true,
                                                "availableWeapons": ["standard"]
                                            },"rangedSelectObject": true
                                        }
                                    }
                                   };
                worldData.UserWorlds.push(newWorldData);
                worldData.currentWorld = worldData.UserWorlds.length -2;
                switchWorlds(1);


            }

        </script>
<?php } ?>
    </head>
    <body>
        <header>

        </header>
        <?php if ($username != "") { ?>
        <form class='worldCreation' action="?" method="POST" enctype="multipart/form-data">
            <strong id='enterName' >Enter a name for your world: </strong><a rel="nofollow" href="" id='worldName' style='display:none;'></a>
            <input type='text' value='' name='World_Name' onchange="updateWorldSettings()"/><br>
            <input type='button' class='switchWorlds' value="< Previous" onclick="switchWorlds(-1);" />
            <input type='button' class='switchWorlds' value="Next >" onclick="switchWorlds(1);" />
            <input type='button' class='switchWorlds' value='New World' onclick='newWorld();'>
             <input type='submit' class='switchWorlds' value="Save Settings" />
            <br>
            <strong>Upload a photosphere or other image for your background.</strong><br>
             (non 2.0 aspect ratio images will be re-processed)<br>
            <input type='file' name='Background_Image' onchange="resetColor(this)" />
            <input type='button' value='Reset Background Image' onclick="resetBackgroundImage()"><br>
            <input type='hidden' name='File_Name' value="" / >
            <input type='hidden' name='positionX' value="" / >
            <input type='hidden' name='positionY' value="" / >
            <input type='hidden' name='positionZ' value="" / >

            <input type='hidden' name='lastWorldIndex' value="<?php echo isset($_POST['lastWorldIndex']) ? $_POST['lastWorldIndex'] : 0; ?>" / >

            <br>
            <fieldset id='generated_background'>
                <strong>Alternately, generate a background based on the following: </strong>
                <br/>
                <select name='Premade_Texture' onchange="updateWorldSettings()" class="materialSelect">
                    <option value="plastic">Solid / No Texture</option>
                    <option value="hyperPanel">Metal</option>
                    <option value="rock2">Rock</option>
                    <option value="colorCircuit">Color Circuit</option>
                    <option value="colorFlow">Color Flow</option>
                    <option value="wireFrame">WireFrame</option>
                   <!--  <option value="photosphere1">Cloudy Day</option>
                    <option value="photosphere2">Trees</option> -->
                </select>
                <div class='colorHolder'>
                    <label for='red'>Red</label><input type='range' min='0' max='1' step='0.01' value='0' name='red' onchange="updateWorldSettings()"/><br>
                    <label for='green'>Green</label><input type='range' min='0' max='1' step='0.01' value='0' name='green'  onchange="updateWorldSettings()" /><br>
                    <label for='blue'>Blue</label><input type='range' min='0' max='1' step='0.01' value='0' name='blue'  onchange="updateWorldSettings()" /><br>
                </div>
                <br>
            </fieldset>
            <br>
            <strong>Choose the type of physical boundaries for your world:  </strong>
            <br>
            <select name='Physical_Boundaries' onchange="boundariesChanged(this)"  >
                <option value="none">None (empty space)</option>
                <option value="asymptote">Spatial Asymptote</option>
                <option value="plane">Plane</option>
                <option value="planetoid">Planetoid</option>
            </select>
            <span id='deformSurfaceContainer' style='display:none;' >
                Deform Surface? <input name='Deform_Surface' type='checkbox' onchange="updateWorldSettings()" />
                <br>
            </span>
            &nbsp;  &nbsp;
            <fieldset style='height:0px;' class='surface_properties'>
                <strong>Upload A Terrain Texture</strong><input type='file' name='Terrain_Texture' />
                <input type='hidden' name='Terrain_File_Name' value="" / ><br><br>
                <strong>Alternately, you can generate a terrain texture based on the following:</strong> <br>
                <select name='Premade_Terrain_Texture' onchange="updateWorldSettings()" class="materialSelect">
                    <option selected value="plastic">Solid / No Texture</option>
                    <option value="hyperPanel">Metal</option>
                    <option value="rock2">Rock</option>
                    <option value="colorCircuit">Color Circuit</option>
                    <option value="colorFlow">Color Flow</option>
                    <option value="wireFrame">WireFrame</option>
                </select>
                <div class='colorHolder' >
                    <label for='terrain_red'>Red</label><input type='range' min='0' max='1' step='0.01' value='0' name='terrain_red' onchange="updateWorldSettings()" /><br>
                    <label for='terrain_green'>Green</label><input type='range' min='0' max='1' step='0.01' value='0' name='terrain_green' onchange="updateWorldSettings()" /><br>
                    <label for='terrain_blue'>Blue</label><input type='range' min='0' max='1' step='0.01' value='0' name='terrain_blue'onchange="updateWorldSettings()" /><br>
                </div>
            </fieldset>
            <br>
            <strong>Choose tools and abilities you'd like guests to have access to:</strong>
            <br>
            <br>
            <table>
                <tr>
                    <td>General</td><td></td><td>Constructive</td><td></td><td>Destructive</td><td></td>
                </tr>
                <tr>
                    <td>Ranged Select Object</td><td><input type='checkbox' name='Ranged_Select_Object' onchange="updateWorldSettings()" /></td>
                    <td>Create New Structure</td><td><input type='checkbox'  name='Create_New_Structure' onchange="updateWorldSettings()"/></td>
                    <td>Delete Object</td><td><input type='checkbox'  name='Delete_Object' onchange="updateWorldSettings()"/></td>
                </tr>
                 <tr>
                     <td>Submit Content</td><td><input type='checkbox'  name='Submit_Content' /></td>
                     <td>Build On To Object</td><td><input type='checkbox'  name='Build_On_To_Object' onchange="updateWorldSettings()" /></td>
                    <td>Destroy Structures</td><td><input type='checkbox'  name='Attack_Structures' onchange="updateWorldSettings()" /></td>
                </tr>
                <tr>
                    <td>Attach Files To Object</td><td><input type='checkbox'  name='Attach_Files_To_Object' onchange="updateWorldSettings()"/></td>
                    <td class="cs" >*Continuous Object Brush</td><td><input type='checkbox'  name='Continuous_Object_Brush' onchange="updateWorldSettings()"/></td>
                     <td class="cs" >*Cut Hole In Object</td><td><input type='checkbox'  name='Cut_Hole_In_Object' onchange="updateWorldSettings()" /></td>
                </tr>
                <tr>
                    <td>Embed HTML In Object</td><td><input type='checkbox'  name='Embed_HTML_In_Object' onchange="updateWorldSettings()" /></td>
                    <td class="cs" >*Cube Snapping Brush</td><td><input type='checkbox'  name='Cube_Snapping_Brush' onchange="updateWorldSettings()" /></td>
                    <td>Combat Other Users</td><td><input type='checkbox'  name='Attack_Other_Users' onchange="updateWorldSettings()" /></td>
                </tr>
                <tr>
                    <td>Embed Link In Object</td><td><input type='checkbox'  name='Embed_Link_In_Object' onchange="updateWorldSettings()" /></td>
                    <td></td><td></td><td> <span  class="cs" >* Comming soon</span></td>
                </tr>
            </table>
            <div class="generators">
                <h2>Generators: (Coming Soon!)</h2><br>
                <h3>Galleries are currently partially supported.</h3>
                <label for="Generator_Type">Generator Type:</label>&nbsp;&nbsp;
                <select name="Generator_Type" onchange="updateWorldSettings()" >
                    <option value="none">None</option>
                    <option value="gallery">Gallery</option>
                    <option value="maze">Maze</option>
                    <option value="sky road">Sky Road</option>
                </select>
                <br>
                <h2>Generator Settings: </h2>
                <fieldset class='generator_settings'>
                    <strong>Upload Images</strong>
                    <input name="filesToUpload[]" id="filesToUpload" type="file" multiple="" onchange="updateWorldSettings()" />
                    <span id="generatorStatus">0 media files on display</span>
                    <input type='button' onclick='resetGalleryMedia()' value="Reset Gallery">
                    <input type='hidden' name='resetGallery' value='' />
                </fieldset>
                <br>
            </div>
            <input type="hidden" name="login" value="1" />
            <input name="username" type="hidden" value="<?php echo $_POST["username"]; ?>" />
            <input name="password" type='hidden' value="<?php echo $_POST["password"]; ?>" />
        </form>
        <?php } else { ?>
        <div class="formContainer">
            <h1>Overworld Editor</h1>
            <h2 class="title">First, login or sign up for an account:</h2>
             <form action = "?" method="POST" >
               <h3>Log in</h3>
               <input type="hidden" name="login" value="1" />
                 <div class='auth_field'>
                     <span class='label'>User Name:</span><input name="username" autofocus type="text" />
                 </div>
                 <div class='auth_field'>
                     <span class='label'>Password:</span><input name="password" type='password' value="" />
                 </div>
                 <input type='submit' value='Log In'/>
            </form>
            <br>
            <form action = "?" method="POST" >
             <h3>Sign up</h3>
               <input type="hidden" name="signup" value="1" />
                <div class='auth_field'>
                    <span class='label'>Email:</span> <input name="email" type='text' value="" />
                </div>
                <div class='auth_field'>
                    <span class='label'>User Name:</span> <input name="username" type="text" />
                </div>
                <div class='auth_field'>
                    <span class='label'>Password:</span> <input name="password" type='password' value="" />
                </div>
                <input type='submit' value='Sign Up'/>
            </form>
            <br>
            <h4>You can use this account to log in and edit your creations later.</h4>
        </div>
        <?php } ?>
    </body>


</html>

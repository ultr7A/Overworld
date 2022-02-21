// Overworld: World Management System (previously known as Phong Galaxy)
// by Jeremy Evans: jeremy@spacehexagon.com
//                  http://spacehexagon.com
// version: 0.9

var animate;
var mobile = false;
var tabletMode = false;
var controls;
var scene;
var renderer;
var hasAskedFullscreen = false;
var upScaling = 1.0;
var three = {camera: null,renderer: null, composer: null,scene: null};
var postprocessing = {enabled: true, depthOfField: false};
var physicsWorker  = null;
var startAnimation = null;
var entitiesNode = new THREE.Object3D();
var boundaries = undefined;
var entityBufferTimeout;
var worldDepth = 0; // 0 == the overworld , other numbers represent nested planes of existence
var worldPath = [{name:"",offset:[0,0,0]}]; // takes objects {name:"world",offset:[1000,1000,1000]}
var world = "Overworld"; // other values prefix database tables for separate data
var worldSettings = {
    name:"Overworld",
    subspace:"Overworld",
   	color: [0.15,0.15,0.15],
    boundaryOptions: {
        boundaryType: "asymptote",
       // premadeTerrainTexture:"rock"
    },
    generator: {
        type: "none",
        content: [],
        seed: 0
    },
    options:{
        general:{
            "rangedSelectObject":true,"submitContent":true,"attachFilesToObject":true,"embedHTMLInObject":true,"embedLinkInObject":true
        },constructive:{
            "createNewStructure":true,"buildOnToObject":true,"cubeSnappingBrush":true,"continuousObjectBrush":true
        },destructive:{
            "deleteObject":true,"cutHoleInObject":true,"combatOptions":{
                "attackStructures":false,"attackOtherUsers":false,"availableWeapons":["standard"]}}}
};
var gui;
var observer;
var observerNode = new THREE.Object3D();
//var betweenSpace = false;
var normalMouse = false;
var tools = ["Fire Bullet(s)","Place Object","Delete Object"];
var forward;
var fadeHUDTimeout;
var decayTimeout = false;
var colorSliders = [];
var postProcessingLevel = 1;
var customTextures = []; // set string texture paths / uri's
var spiralTextures = []; // three.js textures keyed to uris
var plasmaUniforms = null;
var textures = {
	 skyTexture:null,
	 skyCubeMap: null,
	 plasmaTexture: null,
	 rainbowCircuitTexture: null,
	 colorCircuitTexture: null,
	 colorCircuitSpecular: null,
	 colorFlowTexture: null,
	 rockTexture2: null,
	 rockBumpTexture: null,
	 hyperPanelTexture: null,
	 hyperPanelBumpTexture: null,
	 bulletTexture: null,
     flashTexture: null,
	 glowTexture: null,
	 htmlIconTexture: null,
}
var materials = {
	skyMaterial:null,
    plasmaMaterial:null,
    htmlIconMaterial:null,
    rainbowCircuitMaterial:null,
    bulletMaterial:null,
    material_depth: new THREE.MeshDepthMaterial()
}
var sounds = {
    burstBullet: "audio/bullet-sound.ogg",
    autoCannon: "audio/auto-bullet.ogg",
    energy: "audio/saw-buzz.ogg",
    impact: "audio/impact-sound-lowpass.ogg",
    impactDamage: "audio/impact-sound.ogg",

}
var projectiles = [];
var firedProjectiles = [];

var screenSpiralData = "";
var imageAspect;

var selectedIndicator = null;
var lightBoxViewer;
var nullInput;

var users = [];

Settings = {
    hq: true,
    stereo: false,
    aa: false,
    fov: 75,
    fullscreen: false,
    init: function () {
        if (localStorage.getItem("hq") == null) {
            localStorage.setItem("hq", true);
            localStorage.setItem("aa", false);
            localStorage.setItem("stereo", false);
            localStorage.setItem("stereoDepth", 10);
        }
        this.hq = localStorage.getItem("hq") == "true" ? true : false;
        this.aa = localStorage.getItem("aa") == "true" ? true : false;
        this.stereo = localStorage.getItem("stereo") == "true" ? true : false;
        this.stereoDepth = parseInt(localStorage.getItem("stereoDepth"));
    },
    setFov: function (degrees) {
        this.fov = degrees;
        localStorage.setItem("fov", this.fov);
        location.href = location.href;
    },
    toggleSetting: function (setting) {
        this[setting] = !this[setting];
        localStorage.setItem(setting, this[setting]);
        location.href = location.href;
    },
    setStereoDepth: function (value) {
        this.stereoDepth = value;
        localStorage.setItem("stereoDepth", value);
        location.href = location.href;
    },
    toggleFullscreen: function (elem) {
        if (!document.fullscreenElement &&
              !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
            this.fullscreen = true;
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
              document.documentElement.msRequestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
              document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
              document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            this.fullscreen = false;
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
              document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            }
        }
    }
};

var socket = io.connect("https://subnexus.fm:8081", {secure:true, port: 8080});
socket.on('user update', function(userData){
    var user, userShield,
        userData = JSON.parse(userData);    //console.log(userData);
    if (userData.userId != observer.userId && userData.world == worldSettings.subspace) {
        //console.log(userData.userId);
        if (typeof users[userData.userId] == 'undefined') {
            user = users[userData.userId] = new THREE.Mesh(
                new THREE.OctahedronGeometry(333,1),
                new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true})
            );
            userShield = new THREE.Mesh(new THREE.OctahedronGeometry(444,2),
                                        new THREE.MeshBasicMaterial({wireframe: true})
                                       );
            user.add(userShield);
            user.autoUpdateMatrix = false;
            three.scene.add(user);
        }
        user = users[userData.userId];
        if (worldSettings.boundaryOptions.boundaryType == "asymptote") {
            var userScale = new THREE.Vector3(userData.position.x, userData.position.y, userData.position.z).length() / 10000;
            user.scale.set(userScale,userScale,userScale);
        } else {
            user.scale.set(1, 1, 1);
        }
        user.position.set(userData.position.x,userData.position.y,userData.position.z);
        user.quaternion.set(userData.quaternion.x,userData.quaternion.y,userData.quaternion.z,userData.quaternion.w);
        user.updateMatrix();
    }
});

socket.on('fire projectile', function(projectileData) {
        var projectile,
            mesh,
            projectileGeometry,
            projectileMaterial,
            projectileData = JSON.parse(projectileData);    //console.log(userData);
        if(projectileData.world == worldSettings.subspace && projectileData.userId != observer.userId){
            firedProjectiles.push(new FiredProjectile(projectileData.type,projectileData.userId,projectileData.position,projectileData.quaternion,projectileData.timeToLive,projectileData.velocity));
    }
});

socket.on('remove user', function(userData){
    var user,
        userData = JSON.parse(userData);    //console.log(userData);
        three.scene.remove(users[userData.userId]);
    console.log("remove user");
});

socket.on('remove entity',function(objectData){
   var object,
       objectData = JSON.parse(objectData),
       count = entitiesNode.children.length-1;
    console.log("remote delete");
    console.log(objectData.userId != observer.userId);
    if(objectData.userId != observer.userId && objectData.world == worldSettings.name ){
        while(count > -1 ){
            if(entitiesNode.children[count].entity.id == objectData.id){
                entitiesNode.remove(entitiesNode.children[count]);
                break;
            }
            count --;
        }
    }
});

socket.on('chat message',function(packet){
   var packet = JSON.parse(packet),
   chatMessage = document.createElement("div"),
   chatMessages = document.querySelector("#chat-messages");
   chatMessage.setAttribute("class","chat-message");
   chatMessage.innerHTML = decodeURIComponent(packet.message);
   chatMessages.appendChild(chatMessage);
   if(! gui.chatVisible){
        gui.fadeChat(1);
       setTimeout(function(){
           gui.fadeChat(0);
       },6000);
   }
});

var modelsToLoad;
var arrowGeometry;  //ship geometry
var blockGeometry;
var ModelLoader = new THREE.JSONLoader();

//window.onbeforeunload = function(){
//    socket.emit('remove user','{"userId":'+observer.userId+'}');
//    event.preventDefault();
//    return false;
//}


function descriptionToMaterial (material,color,forceBasic,customImage,spiralDataString) {//string, array [0,0.5,1], bool, disabled, string
	var mat = null;
	var colorEnabled=false;
	switch (material) {
        case "transparent":
            var settings ={
			    transparent: true,
                opacity: 0.0
			};
            mat = new THREE.MeshBasicMaterial(settings);
        break;
		case "customImage":
			var settings = {
				map:customTextures[customImage]
			};
			if (forceBasic) {
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
		break;
        case "spiralmap":
             if (!spiralTextures[customImage]) {
                (function () {
                    var header = spiralDataString.split("v"), // parse out the version and corner colors
                        allImageData = header[1].split("x"), // get spiral and corner colors
                        iData = allImageData[1].match(/.{1,6}/g), // get spiral array
                        cvs = document.createElement("canvas"),
                        cs = postProcessingLevel < 2 ? 512 : 1024, //window.innerHeight;
                        ctx = cvs.getContext("2d"),
                        halfHeight = cs / 2, halfWidth = cs / 2,
                        numRings = 48, numCircles = 0, ring = 0, circle = 0,
                        theta = 0, xCoord = 0, yCoord = 0, index = iData.length-1, pixelRatio = window.devicePixelRatio,
                        color = "";
                    cvs.setAttribute("width", cs);
                    cvs.setAttribute("height", cs);
                    for (ring = numRings-1; ring > 0; ring--) {
                        numCircles = numRings - ring;
                        for (circle = numCircles-1; circle > 0; circle--) {
                            theta = 0.1 * (numRings - ring) + circle / numCircles * Math.PI*2;
                            xCoord = Math.round(halfWidth + Math.sin(theta) * halfWidth * (ring/numRings));
                            yCoord = Math.round(halfHeight + Math.cos(theta) * halfHeight * (ring/numRings));
                            color = iData[index];
                            ctx.fillStyle = '#'+color;
                            ctx.beginPath();
                            ctx.arc(xCoord, yCoord, 7 + 0.06 * ((ring / pixelRatio) * (ring / pixelRatio)), 0, 2 * Math.PI, false);
                            ctx.fill();
                            index--;
                        }
                    }
                    spiralTextures[customImage] = new THREE.Texture(cvs);
                    spiralTextures[customImage].needsUpdate = true;
                    spiralTextures[customImage].spiralData = spiralDataString;
                })();
            }

            if (spiralTextures[customImage] != undefined) {
                        /*if(postProcessingLevel > 1){
                            var settings ={
                                 map:  spiralTextures[customImage],
                                specular: 0xffffff,
                                shininess: 5,
                                bumpMap: spiralTextures[customImage],
                                bumpScale: 22,
                                metal: true,
                            };
                        } else {*/
                         var settings ={
                             map:  spiralTextures[customImage]
                            };
                        //}
            }
            if (forceBasic){
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
        break;

		case "bullet":
			mat = materials.bulletMaterial;
		break;
		case "sky":
			mat = materials.skyMaterial;
		break;
		case "plastic":
			if (forceBasic==true) {
				mat = new THREE.MeshBasicMaterial();
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial({fog:true});
                mat.specularMap = textures.hyperPanelBumpTexture;
                mat.specular = new THREE.Color();
                mat.specular.setRGB(1,1,1);
			} else {
				mat = new THREE.MeshLambertMaterial({map:textures.hyperPanelTexture,fog:true});
            }
			mat.color.setRGB(parseFloat(color[0]), parseFloat(color[1]), parseFloat(color[2]));
		break;
            case "plastic_nomap":
			if (forceBasic == true){
				mat = new THREE.MeshBasicMaterial();
			} else if(postProcessingLevel > 1) {
				mat = new THREE.MeshPhongMaterial();
			} else {
				mat = new THREE.MeshLambertMaterial();
            }
            colorEnabled = true;
		break;
		case "glass":
			if (postProcessingLevel>1) {
				var settings ={ specular: 0xffffff,
				shininess: 8,
				bumpMap: textures.colorFlowAlphaTexture,//colorFlowTexture,
				bumpScale: 10,
				metal: false,
				//map:colorFlowAlphaTexture,
				transparent:true,
				opacity:0.66,
				envMap: textures.skyCubeMap
				};
			} else {
				var settings ={ map:textures.colorFlowTexture, transparent:true, opacity:0.6,specular: 0xffffff,
				shininess: 8,envMap: textures.skyCubeMap};
			}
			if(forceBasic == true){
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
			colorEnabled = true;
		break;
		case "rainbowCircuit":
			mat = materials.rainbowCircuitMaterial;
		break;
		case "colorCircuit":
			if ( postProcessingLevel<=1) {
				var settings ={
           		map:textures.colorCircuitTexture,
           		fog:true

        		};
			} else {
				var settings ={
				map:textures.colorCircuitTexture,
				fog:true,
				specular: 0xffffff,
				shininess: 10,
                //bumpMap: colorCircuitSpecular,
                bumpMap: textures.colorCircuitTexture,
				//specularMap:textures.colorCircuitSpecular,
                envMap:textures.skyCubeMap,
                bumpScale: 20,
				metal: false
				};
			}
			if (forceBasic == true) {
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
			colorEnabled=true;
		break;
		case "wireFrame":
			var settings ={
				wireframe:true,
                fog:false,
				wireframeLinewidth: 2
			};
			mat = forceBasic==true ? new THREE.MeshBasicMaterial(settings) : new THREE.MeshBasicMaterial(settings);
			colorEnabled=true;
		break;
		case "selectedIndicator":
			var settings ={
			  map:textures.selectedIndicatorTexture,
			  fog:false,
			  transparent:true,
			  side:2
			};
			mat = new THREE.MeshBasicMaterial(settings);
		break;
		case "hyperPanel":
			if (postProcessingLevel > 1) {
				/*hyperPanelUniforms = {
    			red: {
        			type: 'f', // a float
        			value:color[0]
    				},
    			green: {
        			type: 'f', // a float
        			value: color[1]
    				},
    			blue: {
        			type: 'f', // a float
        			value: color[2]
    				},
				};
				hyperPanelShaderMaterial = new THREE.ShaderMaterial({
				uniforms:hyperPanelUniforms,
				vertexShader:  document.getElementById("hyperPanelVertexShader").innerHTML,
				fragmentShader:document.getElementById("hyperPanelFragmentShader").innerHTML,
				overdraw:true

			});  mat = hyperPanelShaderMaterial; */
				colorEnabled=true;
				var settings ={
				map:textures.hyperPanelTexture,
				fog:true,
				specular: 0xffffff,
				shininess: 10,
				bumpMap:textures.hyperPanelBumpTexture,
				bumpScale: 12,
				metal: true,

                    //envMap: skyCubeMap
				};
			mat = forceBasic==true ? new THREE.MeshBasicMaterial(settings) : new THREE.MeshPhongMaterial(settings);
			} else {
				colorEnabled=true;
				var settings ={
				map:textures.hyperPanelTexture,
				fog:true
				};
			mat = forceBasic==true ? new THREE.MeshBasicMaterial(settings) : new THREE.MeshLambertMaterial(settings);
			}
			//colorEnabled=true;
		break;
		case "colorFlow":
			var settings ={
				map:textures.colorFlowTexture,
				fog:true
			};
			if (forceBasic == true) {
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel > 1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
			colorEnabled=true;
		break;
		case "rock2":
			if (postProcessingLevel>1) {
				var settings = {
                    map:textures.rockTexture2,
                    fog:true,
                    specular: 0xffffff,
                    shininess: 15,
                    bumpMap:textures.rockBumpTexture,
                    bumpScale: 19,
                    metal: true
				};
			} else {
                var settings = {
                    map:textures.rockTexture2,
                    fog:true
                };
			}
			if (forceBasic==true) {
				mat = new THREE.MeshBasicMaterial(settings);
			} else if(postProcessingLevel>1) {
				mat = new THREE.MeshPhongMaterial(settings);
			} else {
				mat = new THREE.MeshLambertMaterial(settings);
			}
		break;
	}
	if (color != "" && colorEnabled) {
        mat.color.setRGB(parseFloat(color[0]),parseFloat(color[1]),parseFloat(color[2]));
        if(typeof(mat.specular)!='undefined') {
            mat.specular.setRGB(parseFloat(color[0]),parseFloat(color[1]),parseFloat(color[2]));
        }
	}
	return mat;
}

function exitMenu() {
     gui.hideGUI();
   /* if(mobile)
	{
		if(renderer.domElement.webkitRequestFullscreen)
		{
			renderer.domElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else if(renderer.domElement.mozRequestFullScreen){
		    	renderer.domElement.mozRequestFullScreen();
		} else if(renderer.domElement.requestFullscreen){
		 	renderer.domElement.requestFullscreen();
		}
	}*/
}

function exitFullscreen() {
	if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
}
lightBoxViewer = {
		init: function init () { // call onload
			lightBoxViewer.Container = document.getElementById("lightBoxContainer");
			lightBoxViewer.element = document.getElementById("lightBox");
			lightBoxViewer.content = document.getElementById("lightBoxContent");
			lightBoxViewer.title = document.getElementById("lightBoxTitle");
		},
		lightBox: function lightBox (title, html, noBackground) {
			if (mobile) {
				exitFullscreen();
			}
			normalMouse = true;
			previewButton = document.querySelector("#previewButton");
			if(typeof(noBackground)=='boolean' && noBackground == true) {
				lightBoxViewer.Container.style.background=""; gui.showGUI();
				previewButton.style.display = "inline-block";
			} else {
				previewButton.style.display = "none";
			}
			if (postProcessingLevel == 1  || ( postProcessingLevel == 2 & !postprocessing.depthOfField)) { //blur canvas
				three.renderer.domElement.style["-webkit-filter"] = "blur(4px)";
				three.renderer.domElement.style["filter"] = "blur(4px)";
			}
			lightBoxViewer.Container.style.display="block";
			lightBoxViewer.Container.style.height=window.innerHeight+"px";
			lightBoxViewer.content.innerHTML = html;
			lightBoxViewer.title.innerHTML="<h2>"+title+"</h2>";
			lightBoxViewer.Container.children[0].style.opacity = 1;
		},
		closeLightBox: function closeLightBox () {
			normalMouse = false;
			three.renderer.domElement.style["-webkit-filter"] = ""; //unblur canvas
			three.renderer.domElement.style["filter"] = "";
			lightBoxViewer.content.innerHTML="";
			lightBoxViewer.Container.style.display="none";
			lightBoxViewer.Container.style.height="0px";
            lightBoxViewer.Container.children[0].style.opacity = 0;
			console.log("close lightbox startAnimation");
			if (mobile) {  // go back into fullscreen so mobile touch controls work
			/*	if(renderer.domElement.webkitRequestFullscreen)
	    		{
	    			renderer.domElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
	    		} else if(renderer.domElement.mozRequestFullScreen){
	    			renderer.domElement.mozRequestFullScreen();
	    		} else if(renderer.domElement.requestFullscreen){
	   				renderer.domElement.requestFullscreen();
	   			}*/
	   			window.onresize();
			}

		},
		previewContent: function previewContent() {
			lightBoxViewer.saveAndClose();
			gui.actionPanel.style.display = "none";
			gui.leftPanel.style.display = "none";
			var previewText = objectTextTextbox.value;
			var hasScript = previewText.search("<script>");
			var set=previewText;
			if(hasScript!=-1)
			{
				set = set.split("<script>");
				set = set[0]+set[1].split("</script>")[1];
			}
			lightBoxViewer.lightBox("This object contains information:",set);
			document.querySelector("#returnButton").onclick = textEdit;
			if(hasScript!=-1)
			{
				previewText = previewText.split("<script>");
				set = previewText[1].split("</script>");
				scriptElement = document.createElement("script");
				scriptElement.innerHTML=set[0];
				document.getElementById("lightBoxContent").appendChild(scriptElement);
			}
		},
		saveAndClose: function saveAndClose() {
			var returnButton = document.getElementById('returnButton');
	        document.querySelector("#templateButton").style.display='none';
			//unhide under-gui
			gui.actionPanel.style.display = "block";
			gui.leftPanel.style.display = "block";
			//unblur
			three.renderer.domElement.style["-webkit-filter"] = "";
			three.renderer.domElement.style["filter"] = "";
			console.log("save and close");
			gui.codeMirrorEditor.toTextArea();
			gui.objectTextTextbox.value=gui.textEditArea.value;

			lightBoxViewer.content.innerHTML="";
			lightBoxViewer.Container.style.display="none";
			lightBoxViewer.Container.style.height="0px";
			returnButton.setAttribute('onclick','lightBoxViewer.closeLightBox()');
			returnButton.setAttribute('value','Return');
		}
	};
function textEdit () {
	// needs a preview button to call lightBoxViewer.previewContent();
	//animate = function(){};
	lightBoxViewer.lightBox("Text Edit","<textarea id='textEdit' style='width:100%;height:100%;background:rgba(0,0,0,0.3);color:#fff;'></textarea> ",true /* text edit mode, dont put background*/ );
	gui.actionPanel.style.display = "none";
	gui.leftPanel.style.display = "none";

	var returnButton = document.getElementById('returnButton');
	gui.objectTextTextbox = document.getElementById('objectTextTextbox');
    document.querySelector("#templateButton").style.display='inline-block';
	returnButton.setAttribute('value','Save and close');
	gui.textEditArea = document.getElementById('textEdit');
	gui.textEditArea.value = gui.objectTextTextbox.value;
	//code mirror stuff
	 var mixedMode = {
        name: "htmlmixed",
        scriptTypes: [{matches: /\/x-handlebars-template|\/x-mustache/i,
                       mode: null},
                      {matches: /(text|application)\/(x-)?vb(a|script)/i,
                       mode: "vbscript"}]
      };
      gui.codeMirrorEditor = CodeMirror.fromTextArea(gui.textEditArea, {mode: mixedMode, tabMode: "indent"});
     console.log(gui.codeMirrorEditor);
     var newEditor = document.getElementById("lightBoxContent").children[1];
      newEditor.setAttribute("style","position:absolute;top:10px;bottom:0px;max-height:95%;");
      document.querySelector("textarea[autocapitalize='off']").focus();
	returnButton.setAttribute('onclick','lightBoxViewer.saveAndClose()');
	gui.textEditArea.value = gui.objectTextTextbox.value;
	gui.textEditArea.focus();
}

function handleTemplateChange (element) {
    if (element.value=="HTML") {
        gui.codeMirrorEditor.setValue(gui.htmlTemplate);
    }
}

function fade (elements, to) {
	for (e=0; e<elements.length; e++) {
		element = elements[e];
        element.setAttribute("style","display:inline-block;opacity:"+to+";");
		//if(to==0){setTimeout(function(){element.style.display="none";},1000);}
	}
}

function Entity (name,id,containingWorldKey,geometry,material,color,mesh,size,physics,behaviour,text,link,image,sound,subspace,key,extra,fileName,spiralData,radius) {
	this.name=name;
	this.id=id;
	this.geometry=geometry;
	this.material=material;
	this.color=color;
	this.mesh=mesh;
	this.size=size;
	this.physics=physics;
	this.behaviour=behaviour;
	this.text=text;
	this.link=link;
	this.image=image;
	this.sound=sound;
	this.subspace=subspace;
	this.key=key;
	this.extra=extra;
    this.spiralData=spiralData;
    this.radius = radius;
	this.fileName=fileName;
	this.fadeInProgress=0.0;
	this.explosionProgress=0.0;
	this.containingWorldKey=containingWorldKey;
    this.contentFlag = (text!="" || subspace!="" || link!="" || image!="" || fileName!="");
	//alert(this.mesh);
	mesh.id = id;
	mesh.entity = this;
	if (this.subspace.length > 0) {     //console.log("init overportal");
        mesh.material.side = 1;
        var overPortalMaterial =  new THREE.MeshBasicMaterial({map:textures.glowTexture,transparent:true, opacity:0.5});
        overPortalMaterial.color.setRGB(color[0], color[1], color[2]);
        var overPortal = new THREE.Mesh(
            new THREE.OctahedronGeometry(size[0]+size[1]+size[2]/1.5, 4),
           overPortalMaterial
        );
        overPortal.autoUpdateMatrix = false;
        if (this.fileName.length < 1) {
            mesh.add(overPortal);
        }
        overPortal.updateMatrix();
    }
	entitiesNode.add(this.mesh);
};

function addEntityFromDescription (name,
				            id,
		/*array [x,y,z]	*/ containingWorldKey,
		  /*string cube*/geometry,
		  /*string rock*/material,
		  /*array [r,g,b]*/color,
		  /*array [x,y,z]*/size,
		  /*array [x,y,z]*/position,
		  /*array [x,y,z]*/fileName,
		  /*array [x,y,z,w]*/quaternion,physics,behaviour,text,link,image,sound,subspace,key,extra,spiralData,radius)
{
	size[0] = parseFloat(size[0]);
	size[1] = parseFloat(size[1]);
	size[2] = parseFloat(size[2]);
	var mesh = null,
        contentFlag = (text!="" || subspace!="" || link!="" || image!="" || fileName!="") ? 1 : 0,
        mat = null;
    physicsWorker.postMessage('{"command":"addObject","data":{"id":'+(id==-1?(entitiesNode.updateId+1):id)+
                              ',"worldKey":"'+world+
                              '","contentFlag":'+contentFlag+
                              ',"physics":"'+physics+
                              '","radius":'+radius+
                              ',"extra":"'+extra+
                              '","shape":"'+geometry+
                              '","size":['+size[0]+','+size[1]+','+size[2]+']'+
                              ',"position":['+position[0]+','+position[1]+','+position[2]+']}}');

	if (/<\/[a-z0-9]*>/i.test(text) ) { // if its html content, put the icon
		mat = materials.htmlIconMaterial;
		geometry = "box";
		size[0] = size[1] = size[0]>size[2]?size[0]:size[1];
		size[2] = size[0]/6;
	} else if(text != "") { // its plain text content, show it on the object
		var duplicate = document.getElementById(text);
		if(!duplicate) {
            var textCanvasSize = 1024;
			//text = text.replace("<colon>",":");
			var textCanvas = document.createElement("canvas");
			textCanvas.setAttribute("id",text);
			document.body.appendChild(textCanvas);
			textCanvas.setAttribute("style","display:none;");
            var textCanvasContext = textCanvas.getContext("2d");
   			//console.log(textCanvasContext);
            textCanvas.width = textCanvasSize;
            textCanvas.height = textCanvasSize;
            var fontSize = (38+Math.round(1800 / text.length));
    			textCanvasContext.fillStyle = "#000000";
    			textCanvasContext.fillRect(0,0,textCanvasSize,textCanvasSize);
    			textCanvasContext.font = fontSize+"pt helvetica";
    			textCanvasContext.textBaseline = "top";
    			textCanvasContext.fillStyle = "rgb("+Math.round(color[0]*255)+","+Math.round(color[1]*255)+","+Math.round(color[2]*255)+")";
    			var lines = Math.ceil(0.0005*text.length*fontSize);
    			//console.log("lines "+lines);
    			if (lines > 0) {
    				for (line=0; line<lines; line++) {
    					textLine=text.substr(line*Math.ceil(text.length/lines),Math.ceil(text.length/lines));
    					textCanvasContext.fillText(textLine, 10, line*fontSize);//50);
    				}
    			} else {
    				textCanvasContext.fillText(text, 10, 0);
    			}
		} else {
			textCanvas = duplicate;
		}
        var textTexture = new THREE.Texture(textCanvas);
 		textTexture.needsUpdate=true;
   		var textMaterial = new THREE.MeshBasicMaterial({
                map: textTexture,
                side: 0
    		});
		mat =  textMaterial;
	} else {
        if (geometry == "block" || geometry == "arrow") {
            mat = descriptionToMaterial("plastic_nomap",color);
        } else { // } else if(image=="" || fileName=="") {
            if(image != "" && material == "spiralmap" && spiralData.length > 0){
                mat = descriptionToMaterial("spiralmap",[1,1,1],false,image,spiralData);
            } else if(image != ""){
                customTextures[fileName] = THREE.ImageUtils.loadTexture(fileName, THREE.UVMapping, function(){});
                mat = descriptionToMaterial("customImage",[1,1,1],false,fileName);
            } else {
                mat = descriptionToMaterial(material,color);
            }
        }
    }
    var hr = radius / 2;
    var compoundObjectMaterials = [];
    if (extra != "") {
        boundingSize = 600 + radius;
        newGeometry = null;
    } else {
        switch (geometry) {
            case "block":
                mesh = new THREE.Mesh(blockGeometry,mat);
                mesh.scale.set(size[0],size[1],size[2]);
            break;
             case "arrow":
                mesh = new THREE.Mesh(arrowGeometry,mat);
                mesh.scale.set(size[0],size[1],size[2]);
            break;
            case "box":
                mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mat);
            break;
            case "sphere":
                if (material == "wireFrame") {
                    mesh = new THREE.Mesh(new THREE.OctahedronGeometry((size[0]+size[1]+size[2])/1.5, 3),mat);
                } else {
                    mesh = new THREE.Mesh(new THREE.SphereGeometry((size[0]+size[1]+size[2]/3.0),36,36),mat);
                }
            break;
          	case "octahedron": mesh = new THREE.Mesh(new THREE.OctahedronGeometry((size[0]+size[1]+size[2])/3,0),mat); break;
            case "plane":
                mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),mat);
                mat.side=2;
            break;
            case "cylinder":
                mesh = new THREE.Mesh(new THREE.CylinderGeometry(size[0],size[0],(size[1])/2, (postProcessingLevel>1?32:16), 1, false),mat);
            break;
            case "arrow":
                mesh = new THREE.Mesh(arrowGeometry,mat);
                mesh.scale.set(size[0],size[1],size[2]);
            break;
        }
    }

	if (extra != "") { //add extra parts
        var partBSP = null,
            entityBSP = null,
            newGeometry = null,
            finalGeometry = null,
		    ext = extra.split('<ExtraPart>'),
            ep = 1,
            f = 0;
		for (ep = 1; ep < ext.length; ep++) {
			ext[ep] = ext[ep].split(",");
			newGeometry = null;
			switch (ext[ep][0]) {
				case "block":// newGeometry = new THREE.Mesh(blockGeometry,mat); newGeometry.scale.set(extra[ep][8],extra[ep][9],extra[ep][10]); break
                case "box": newGeometry = new THREE.BoxGeometry(ext[ep][5],ext[ep][6],ext[ep][7]); break;
				case "sphere": newGeometry = new THREE.OctahedronGeometry((ext[ep][5]+ext[ep][6]+ext[ep][7])/3,4); break;
                case "plane": newGeometry = new THREE.PlaneGeometry(ext[ep][5],ext[ep][6]); break;
				case "cylinder": newGeometry = new THREE.CylinderGeometry(ext[ep][5],ext[ep][5],(ext[ep][6])/2, (postProcessingLevel>1?32:24), 1, false); break;
				case "arrow": mesh = new THREE.Mesh(arrowGeometry,mat); break;
			}
            compoundObjectMaterials.push( descriptionToMaterial(ext[ep][12],[ ext[ep][13], ext[ep][14], ext[ep][15] ]) );
			var newMesh = new THREE.Mesh(newGeometry);
			newMesh.position.set(ext[ep][2],ext[ep][3],ext[ep][4]);
            newMesh.quaternion.set(parseFloat(ext[ep][8]), parseFloat(ext[ep][9]), parseFloat(ext[ep][10]), parseFloat(ext[ep][11]));
            newMesh.updateMatrix();
            if (ep == 1) {
                entityBSP = new ThreeBSP(newMesh);
            } else {
                partBSP = new ThreeBSP(newMesh);
                entityBSP = entityBSP.union(partBSP);
            }
		}
        finalGeom = entityBSP.toGeometry();
        ep = ext.length;
        f = finalGeom.faces.length;
        while (f -- > 1) {  // verify this .... make sure it still works (not just on ParticleCloud)
            finalGeom.faces[f].materialIndex = Math.floor((ext.length-1)*(f / finalGeom.faces.length));
        }
        mesh =  new THREE.Mesh(finalGeom, new THREE.MeshFaceMaterial( compoundObjectMaterials));
        mesh.matrixAutoUpdate = false;
        mesh.position.set(parseFloat(position[0]), parseFloat(position[1]), parseFloat(position[2]));
        mesh.quaternion.set(parseFloat(quaternion[0]), parseFloat(quaternion[1]), parseFloat(quaternion[2]), parseFloat(quaternion[3]));
        mesh.updateMatrix();
        if (!(geometry=="box" && postProcessingLevel==1)) {
            mesh.geometry.computeFaceNormals();
        //    mesh.geometry.computeVertexNormals();
        }
	} else {
        mesh.matrixAutoUpdate = false;
        mesh.quaternion.set(parseFloat(quaternion[0]), parseFloat(quaternion[1]), parseFloat(quaternion[2]), parseFloat(quaternion[3]));
        mesh.position.set(parseFloat(position[0]), parseFloat(position[1]), parseFloat(position[2]));
        mesh.updateMatrix();
        mesh.geometry.computeFaceNormals();
        mesh.geometry.computeVertexNormals();
    }

	quat = mesh.quaternion;
	pos = mesh.position;

	mesh.entity = new Entity(name,id,containingWorldKey,geometry,material,color,mesh,size,physics,behaviour,text,link,image,sound,subspace,key,extra,fileName,spiralData,radius);
	return mesh.entity;
}




function deleteEntity(entity) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function () {
		if (request.readyState == 4 && request.status == 200) {
   			//entity.id = request.responseText;
			//entitiesNode[cc].updateId=entity.id; // possible duplication fix
    	}
	}
	request.open("POST","/overworld/app/input.php",true);
    request.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	request.send("world="+world+"&entityTransaction=delete&entityId="+entity.id+"&");
	entitiesNode.remove(entity.mesh);
}



function blowUp (entity, bullet) {
		if (entity) {
			if (entity.explosionProgress < 2.0) {
			entity.explosionProgress += 0.2;
			entity.mesh.material.transparent = true;
			entity.mesh.material.opacity = Math.cos((entity.explosionProgress/2)*Math.PI);
			entity.mesh.scale.set(entity.mesh.scale.x*(1+entity.explosionProgress),
							       entity.mesh.scale.y*(1+entity.explosionProgress),
							       entity.mesh.scale.z*(1+entity.explosionProgress));
			entity.mesh.updateMatrix();
			setTimeout(function () { blowUp(entity,bullet) }, 50);
			} else {
				if (typeof(bullet)!='undefined') {
					entity.mesh.firedProjectile.timeToLive = 0;
				} else {
                    deleteEntity(entity);
				}
			}
		}
}


	function fadeIn(entity) {
		if (entity) {
			if (entity.fadeInProgress<(entity.intendedOpacity || 1) ) {
				if (entity.fadeInProgress == 0) {
					if (entity.mesh.material.transparent==true) {
						entity.intendedOpacity = entity.mesh.material.opacity;
					} else {
						entity.mesh.material.transparent=true;
					}
				}
				entity.fadeInProgress+=0.1;
				entity.mesh.material.opacity=entity.fadeInProgress;
				setTimeout(function(){fadeIn(entity)},50);
			} else {
				if (entity.intendedOpacity) {
					entity.mesh.material.opacity = entity.intendedOpacity;
				} else {
					entity.mesh.material.opacity = 1;
					entity.mesh.material.transparent=false;
				}
			}
		}
	}

	function getClosestEntity (from, selectRange, bulletMode) {  // if initialcontainingWorldKey, find content cel
        var findingEntities  = entitiesNode,
            small = selectRange,
            foundEntity = null,
            boundingRadius = 1000,
            distance = 0;
            if (typeof(findingEntities) == 'undefined'){ findingEntities = {children:[]}; }  // no children if entities are undefined
            for (var i=0;i<findingEntities.children.length;i++) {
				if (findingEntities.children[i]!=null) {
				    foundMesh = findingEntities.children[i];
				    distance = Math.sqrt(Math.pow(foundMesh.position.x-from.x,2)+
                                         Math.pow(foundMesh.position.y-from.y,2)+
                                         Math.pow(foundMesh.position.z-from.z,2));
                    if (typeof(foundMesh.entity)!='undefined'){
                        boundingRadius = foundMesh.entity.radius; //slightly bigger than average dimensions?
                    }
                    if (distance < (small + boundingRadius)){
				        small = distance;
				        foundEntity = foundMesh.entity;
				    }
				    //console.log("boundingRadius "+boundingRadius);
				    //console.log("distance: "+distance);
				    //console.log("small: "+small);
				}
            }
            return {
                entity:foundEntity,
				distance:small
            };
    }


    function FiredProjectile(type, userId, position, quaternion, timeToLive, initialVelocity) {
        var bullet = null,
            bulletGeometry = null,
            bulletMaterial = null,
            bulletSound = null;
        switch (type) {
            case "default":
                bulletGeometry = new THREE.OctahedronGeometry(50,3);
                bulletMaterial = new THREE.MeshBasicMaterial({
                    color:0x88aaff,
                    transparent:true,
                    opacity:0.9,
                    map:textures.glowTexture
                });
                bullet = new THREE.Mesh(bulletGeometry,bulletMaterial);
                bullet.quaternion.set(quaternion.x-(-0.01+Math.random()*0.02),
											    quaternion.y-(-0.01+Math.random()*0.02),
											    quaternion.z-(-0.02+Math.random()*0.04),quaternion.w);
                //bullet.quaternion.multiplyVector3(new THREE.Vector3(-0.5,0,0));
                this.speed = 140;
                bulletSound = document.createElement("audio");
                bulletSound.setAttribute("src",sounds.burstBullet);
                bulletSound.setAttribute("style","display:none;");
                bulletSound.setAttribute('controls',false);
                bulletSound.play();

            break;
        }
        bullet.firedProjectile = this;
        bullet.autoUpdateMatrix = false;
        bullet.position = new THREE.Vector3(position.x,position.y,position.z);
        three.scene.add(bullet);
	   this.mesh = bullet;
	   this.timeToLive = timeToLive;
	   this.velocity = new THREE.Vector3(initialVelocity.x,initialVelocity.y,initialVelocity.z);//velocity;
       this.type = type;
       this.userId = userId;
       var flash = new THREE.Mesh(new THREE.PlaneGeometry(100,400),
                                  new THREE.MeshBasicMaterial({map:textures.flashTexture,
                                                               transparent:true, side:2}));
       bullet.add(flash);
        flash.rotation.set(Math.PI / 2, 0, 0);
        flash.updateMatrix();
       flash.translateY(400);
       flash.autoUpdateMatrix = false;
       setTimeout(function(){ bullet.remove(flash); },50);
}

window.onload = function() {
    console.log("Overworld 0.9.3");
    console.log("(c) Jeremy Evans 2015");
    console.log("Initializing...");
    (function(){
    	var testCVS = document.createElement("canvas");
    	if(!testCVS.getContext("webgl")){
    		console.log("ERROR: WebGL Not Available");
    		alert("WebGL is not available or is turned off in your browser.\nDownload Google Chrome or Mozilla Firefox to enable high performance 3D graphics.");
    	} else {
    		console.log("WebGL Enabled Browser Detected")
    	}
    })();
	document.body.focus();
	// detect mobile browser script
	mobile = false;  // for tablets.....   |android|ipad|playbook|silk      add to first regex???
	(function(a,b){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))mobile=true;})(navigator.userAgent||navigator.vendor||window.opera,'http://detectmobilebrowser.com/mobile');
	// detect tablet mobile browser
	if (mobile == false) {
	   (function(a,b){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|android|ipad|playbook|silk|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))mobile=true; tabletMode = true;})(navigator.userAgent||navigator.vendor||window.opera,'http://detectmobilebrowser.com/mobile');

    } else {
        document.body.style.overflow='scroll';
    }
	if (mobile) {//&& !tabletMode)
		document.querySelector("#meta-viewport").setAttribute("content","width=device-width");
	}
	nullInput = document.getElementById("nullInput");
    lightBoxViewer.init();
    window.params = {};
    if (location.href.search("\\?")!=-1) {
        hrefParams = location.href.split('?')[1].split('&');
        for (x in hrefParams) {
            params[hrefParams[x].split('=')[0]] = hrefParams[x].split('=')[1];
        }
    }
    if (typeof params['g'] == 'undefined') {
        params['g'] = 1;
    }
    if (typeof params['n'] == 'undefined') {
        params['n'] = 1;
    }

    postProcessingLevel = params['g'];

    (function () {
    	var antialias = typeof(params["a"])!="undefined";
    	renderer = new THREE.WebGLRenderer({antialias:antialias, alpha: true});
    })();
    three.renderer = renderer;
    renderer.setClearColor({r:0,g:0,b:0},1);
    if (params['u']!=null) {
        upScaling = parseFloat(params['u']);
    }
    renderer.setSize( window.innerWidth/upScaling, window.innerHeight/upScaling );
	if (mobile) {
        if (!tabletMode || navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
            renderer.setSize( window.innerWidth, window.innerHeight );
           // renderer.domElement.setAttribute('style','position:absolute;width:100%;height:100%;');
        } else {
             //dont use high dpi so tablets can get a decent frame rate
            if (upScaling > 1) {
                renderer.domElement.setAttribute('style','position:absolute;width:100%;height:100%;-webkit-transform:scale3d('+upScaling+','+upScaling+',1); -moz-transform:scale3d('+upScaling+','+upScaling+',1); transform:scale3d('+upScaling+','+upScaling+',1);');
            } else {
                renderer.domElement.setAttribute('style','position:absolute;width:100%;height:100%;');
            }
        }
    }
	renderer.autoClear = false;
	document.body.insertBefore(renderer.domElement,document.getElementById("selectedActionPanel"));
	renderer.domElement.oncontextmenu = function (){ return false; };
    renderer.domElement.setAttribute("id","viewportCanvas");
    var hasAskedFullscreen = false;
    var scene = new THREE.Scene();
    three.scene = scene;
  	//if(!mobile) { scene.fog = new THREE.FogExp2( 0x101010, 0.000020 ); }
  	three.scene.add(entitiesNode);
    entitiesNode.position.set(0,0,0);
    entitiesNode.autoUpdateMatrix = false;
    entitiesNode.updateMatrix();
    entitiesNode.updateId = 0;

    if (params['g'] == '3') {
        postprocessing.scene = new THREE.Scene();
                postprocessing.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2,  window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000 );
                postprocessing.camera.position.z = 100;
                postprocessing.scene.add( postprocessing.camera );

                var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
                postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
                postprocessing.rtTextureColor = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );

                var bokeh_shader = THREE.BokehShader;

                postprocessing.bokeh_uniforms = THREE.UniformsUtils.clone( bokeh_shader.uniforms );

                postprocessing.bokeh_uniforms[ "tColor" ].value = postprocessing.rtTextureColor;
                postprocessing.bokeh_uniforms[ "tDepth" ].value = postprocessing.rtTextureDepth;
                postprocessing.bokeh_uniforms[ "focus" ].value = 4.0;
                postprocessing.bokeh_uniforms[ "aspect" ].value = window.innerWidth / (window.innerHeight);
                postprocessing.bokeh_uniforms[ "aperture" ].value = 0.014;
                postprocessing.bokeh_uniforms[ "maxblur" ].value = 1.4;

                postprocessing.materialBokeh = new THREE.ShaderMaterial( {
                            uniforms: postprocessing.bokeh_uniforms,
                            vertexShader: bokeh_shader.vertexShader,
                            fragmentShader: bokeh_shader.fragmentShader
                        } );

                postprocessing.quad = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight ), postprocessing.materialBokeh );
                postprocessing.quad.position.z = - 500;
                postprocessing.scene.add( postprocessing.quad );
    }

   	if (params['s'] == '1') {
        document.body.style.cursor = "none";
    	var width = window.innerWidth;
    	var height = window.innerHeight;
    	camera = new THREE.Object3D();
    	// remember that things refer to children 0 of camera
    	three.cameraLeft = new THREE.PerspectiveCamera(70, (width/2)/height, 0.1,250000);
    	camera.add(three.cameraLeft);
    	three.cameraLeft.position.set(-8.0,0,0);
    	three.cameraRight = new THREE.PerspectiveCamera(70, (width/2)/height, 0.1, 250000);
    	camera.add(three.cameraRight);
    	three.cameraRight.position.set(8.0,0,0);
    } else {
    	if(mobile){
            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05,250000);
    	} else {
    		if(window.innerWidth < 1900){
                camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05,250000);
    		} else {
                camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05,250000);
    		}
    	}
    }

    if (params['t'] == '1') {
        var video = document.getElementById('video');
        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
        var tracker = new tracking.ObjectTracker('face');
        tracker.setInitialScale(4);
        tracker.setStepSize(2);
        tracker.setEdgesDensity(0.1);
        tracking.track('#video', tracker, { camera: true });
        tracker.on('track', function (event) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            event.data.forEach(function (rect) {
                context.strokeStyle = '#a64ceb';
                context.strokeRect(rect.x, rect.y, rect.width, rect.height);
                context.font = '11px Helvetica';
                context.fillStyle = "#fff";
                context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
                context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
            });
        });
    }


    camera.targetFocus = 1.13;
    camera.smoothFocus = false;
	scene.add(camera);
	three.camera = camera;
	//forward object for forward vector
	forward = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true, wireframeLinewidth: 2}));
	forward.visible = true; //false;

	camera.add(forward);
	forward.matrixAutoUpdate = false;
	forward.position.set(0,0,-570);
	forward.rotation.set(0,0,Math.PI/4);
	forward.updateMatrix();

    // ambientLight = new THREE.AmbientLight(0x222222);
        //scene.add(ambientLight);
    three.light = new THREE.PointLight( 0xffffff, 0.85, 2000000 );//new THREE.SpotLight(0xFFFFFF);
    scene.add(three.light);

     //observerLight = new THREE.PointLight( 0xffffff, 0.66,3800);
    (function(){
        observerLight = new THREE.SpotLight( 0xffffff,0.7);
        observerLight.position.set(0,0,1);
        observerLight.target = camera;
        camera.add(observerLight);
    })();
//  } else {
//    light.castShadow = true;
//      light.exponent = 2;
//    light.shadowMapWidth = 1024;
//    light.shadowMapHeight = 1024;
//    light.shadowDarkness = 0.5;
//    light.shadowCameraNear = 500;
//    light.shadowCameraFar = 4000;
//    light.shadowCameraFov = 30;
//  }

	rayCast = function () {
        var pointedAtEntity = null,
			distance = 100000,
			rayVector = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),
			raycaster = new THREE.Raycaster(camera.position,rayVector),
			intersects = raycaster.intersectObjects(entitiesNode.children);
		if (intersects.length > 0) {
			pointedAtEntity = intersects[0].object.entity;
			distance = intersects[0].distance;
			pointedAtEntity.distance = distance;
		}
		return {entity:pointedAtEntity, distance:distance};
	}


    //sky // disabling the other version for now
  if (mobile) {
        var skyTexture2 = THREE.ImageUtils.loadTexture("graphics/rasterSkyCloudLayer.jpg");
    	var skyTexture = THREE.ImageUtils.loadTexture("graphics/stars_1.5blur.jpg");
        skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;
		skyTexture2.wrapS = skyTexture2.wrapT = THREE.RepeatWrapping;
		// set repeat?
		skyTexture.needsUpdate = true;
		skyTexture2.needsUpdate = true;
		var fastSkyVertexShader = document.getElementById('simpleUvVertexShader').innerHTML;
		var fastSkyFragmentShader = document.getElementById('fastSkyFragmentShader').innerHTML;
		var attributes = {}; // custom attributes
		var fastSkyShaderUniforms = {    // custom uniforms (your textures)
  		tOne: { type: "t", value: skyTexture },
  		tSec: { type: "t", value: skyTexture2 }
	};

  	materials.skyMaterial = new THREE.ShaderMaterial({
  	uniforms: fastSkyShaderUniforms,
  	attributes: attributes,
 	 vertexShader: fastSkyVertexShader,
  	fragmentShader: fastSkyFragmentShader,
	side:1
	});

    } else {
    	//shader sky
    	var bwStars = THREE.ImageUtils.loadTexture( "graphics/stars_1.5blur.jpg" );  // star texture
        var cloud = THREE.ImageUtils.loadTexture( "graphics/clouds10.jpg"  );
        //var tmpDate = new Date();
       // dayTime = tmpDate.getHours()*3600 + tmpDate.getMinutes()*60 + tmpDate.getSeconds();
		plasmaUniforms = {
    		time: {
        	   type: 'f', // a float
        	   value: 80000//dark
    		},
    		tex: {
    			type: "t",
    			value: cloud// ideally this texture shouldn't have much color
    		 },
            tex2: {
    			type: "t",
    			value: bwStars// ideally this texture shouldn't have much color
    		 }
		};
		materials.plasmaMaterial = new THREE.ShaderMaterial({
    		uniforms:plasmaUniforms,
			vertexShader:  document.getElementById("skyVertexShader").innerHTML,
			fragmentShader:document.getElementById("skyFragmentShader").innerHTML,
			overdraw:true,
			side:1,
			fog:false,
            depthWrite: false
		});
		materials.skyMaterial = materials.plasmaMaterial;

    }

	materials.skyMaterial.fog = false;

    sky = new THREE.Mesh(new THREE.SphereGeometry(240000,20,20),materials.skyMaterial);
	//sky.overdraw = true;
    sky.matrixAutoUpdate = false;
    observerNode.position.set(-1000+Math.random()*2000,-1000+Math.random()*2000,-1000+Math.random()*2000);
	scene.add(observerNode);
	observerNode.add(sky);

	//rainbow circuit material
	textures.rainbowCircuitTexture = THREE.ImageUtils.loadTexture("graphics/alphaRainbowCircuit.png"); //alphaRainbowCircuit
	textures.rainbowCircuitTexture.wrapS = textures.rainbowCircuitTexture.wrapT =2;
	textures.rainbowCircuitTexture.repeat.set( 1, 1 );
	textures.rainbowCircuitTexture.needsUpdate = true;
	var settings ={
		map:textures.rainbowCircuitTexture,
	    transparent:true,
	    fog:false
	 };
	materials.rainbowCircuitMaterial = new THREE.MeshLambertMaterial(settings);

if (postProcessingLevel > 0) {
	skyCubeUrls = [
      'graphics/cloudsEnvMap.jpg',
      'graphics/cloudsEnvMap.jpg',
      'graphics/cloudsEnvMap.jpg',
    'graphics/cloudsEnvMap.jpg',
     'graphics/cloudsEnvMap.jpg',
      'graphics/cloudsEnvMap.jpg'
    ];

	textures.skyCubeMap =  THREE.ImageUtils.loadTextureCube(skyCubeUrls);
	textures.skyCubeMap.needsUpdate=true;
	textures.skyCubeMap.format = THREE.RGBFormat;
}
	//color circuit texture
	textures.colorCircuitTexture = THREE.ImageUtils.loadTexture("graphics/colorCircuit2.png");
	textures.colorCircuitTexture.repeat.set( 1.0, 1.0 );
    textures.colorCircuitTexture.wrapS = textures.colorCircuitTexture.wrapT = THREE.RepeatWrapping;
	textures.colorCircuitTexture.needsUpdate = true;

	//color circuit specular
	textures.colorCircuitSpecular = THREE.ImageUtils.loadTexture("graphics/colorCircuitSpecular.png");
	textures.colorCircuitSpecular.repeat.set( 1.0, 1.0 );
    textures.colorCircuitSpecular.wrapS = textures.colorCircuitSpecular.wrapT = THREE.RepeatWrapping;
	textures.colorCircuitSpecular.needsUpdate = true;

	//selected Indicator texture
	textures.selectedIndicatorTexture = THREE.ImageUtils.loadTexture("graphics/selected.png");
	textures.selectedIndicatorTexture.repeat.set( 1.0, 1.0 );
    textures.selectedIndicatorTexture.wrapS = textures.selectedIndicatorTexture.wrapT = THREE.RepeatWrapping;
	textures.selectedIndicatorTexture.needsUpdate = true;

	//color flow texture
	textures.colorFlowTexture = THREE.ImageUtils.loadTexture("graphics/noise_1.png");
	textures.colorFlowTexture.repeat.set( 1.0, 1.0 );
    textures.colorFlowTexture.wrapS = textures.colorFlowTexture.wrapT = THREE.RepeatWrapping;
	textures.colorFlowTexture.needsUpdate = true;

	//rock texture
	textures.rockTexture2 = THREE.ImageUtils.loadTexture("graphics/rocks_contrast.jpg");
	textures.rockTexture2.repeat.set( 1.0, 1.0 );
    textures.rockTexture2.wrapS = textures.rockTexture2.wrapT = THREE.RepeatWrapping;
	textures.rockTexture2.needsUpdate = true;

	//rock bumpmap texture
	textures.rockBumpTexture = THREE.ImageUtils.loadTexture("graphics/rockContrastBump.jpg");
	textures.rockBumpTexture.repeat.set( 1.0, 1.0 );
    textures.rockBumpTexture.wrapS = textures.rockBumpTexture.wrapT = THREE.RepeatWrapping;
	textures.rockBumpTexture.needsUpdate = true;


	//hyper organic material
	textures.htmlIconTexture = THREE.ImageUtils.loadTexture("graphics/htmlIcon_1.png");
	//htmlIconTexture.repeat.set( 1, 1 );
	textures.htmlIconTexture.wrapS = textures.htmlIconTexture.wrapT = THREE.RepeatWrapping;
	textures.htmlIconTexture.needsUpdate = true;
	materials.htmlIconMaterial = new THREE.MeshLambertMaterial({
            map:textures.htmlIconTexture,
	    	fog:false
        });

	textures.hyperPanelTexture = THREE.ImageUtils.loadTexture("graphics/hyperPanel.png");
	textures.hyperPanelTexture.repeat.set( 1.0, 1.0 );
    textures.hyperPanelTexture.wrapS = textures.hyperPanelTexture.wrapT = THREE.RepeatWrapping;
	textures.hyperPanelTexture.needsUpdate = true;

	//hyperPanelBumpTexture
	textures.hyperPanelBumpTexture = THREE.ImageUtils.loadTexture("graphics/hyperPanelBump.png");
	textures.hyperPanelBumpTexture.repeat.set( 1.0, 1.0 );
    textures.hyperPanelBumpTexture.wrapS = textures.hyperPanelBumpTexture.wrapT = THREE.RepeatWrapping;
	textures.hyperPanelBumpTexture.needsUpdate = true;

	//bullet
	textures.bulletTexture = THREE.ImageUtils.loadTexture("graphics/bullet.png");
	textures.bulletTexture.wrapS = textures.bulletTexture.wrapT = 3;
	textures.bulletTexture.repeat.set( 4, 1 );
	textures.bulletTexture.needsUpdate = true;
	//muzzle flashTexture
    textures.flashTexture = THREE.ImageUtils.loadTexture("graphics/flash.png");
	textures.flashTexture.wrapS = textures.flashTexture.wrapT = 3;
	textures.flashTexture.repeat.set( 1, 1 );
	textures.flashTexture.needsUpdate = true;

	textures.glowTexture = THREE.ImageUtils.loadTexture("graphics/glow.png");
	textures.glowTexture.wrapS = textures.glowTexture.wrapT = THREE.RepeatWrapping;
	textures.glowTexture.repeat.set( 1, 1 );
	textures.glowTexture.needsUpdate = true;

	materials.bulletMaterial = new THREE.MeshBasicMaterial({
            				map:textures.bulletTexture,
					color:0xBBBBFF,
	    				fog:false,
	   				transparent:true
       				 });


	var bulletGeometry = new THREE.SphereGeometry(40, 12, 12);

	projectiles = {
		bullet : {
            geometry: bulletGeometry,
            material: materials.bulletMaterial
		}
	};

	// create gui
	selectedActionPanel = document.getElementById("selectedActionPanel");
	menuPromptPanel = document.getElementById("menuPromptPanel");
	if (mobile) {
		menuPromptPanel.innerHTML="Tap the top left to show controls";
	} else {
		menuPromptPanel.innerHTML="Press Escape to show controls";
	}

	leftPanel = document.getElementById("leftPanel");
	leftPanel.setAttribute("class","leftPanelActive");

	kineticPanel  = document.getElementById("kineticPanel");
	kineticPanel.updateInterval = 7;
	kineticPanel.updateState = 0;
	kineticPanel.on = true;
	kineticPanel.setAttribute("style","text-align:center;");
	kineticPanel.close = function close () {
		kineticPanel.on=false;
		kineticPanel.setAttribute('style','display:none;');
	}

	kineticPanel.update = function update () {

		if (kineticPanel.updateState == kineticPanel.updateInterval) {
			document.getElementById('positionx').innerHTML = Math.round(observer.node.position.x);
			document.getElementById('positiony').innerHTML = Math.round(observer.node.position.y);
			document.getElementById('positionz').innerHTML = Math.round(observer.node.position.z);
//			document.getElementById('velocityx').innerHTML = Math.round(observer.velocity.x*100)/100;
//			document.getElementById('velocityy').innerHTML = Math.round(observer.velocity.y*100)/100;
//			document.getElementById('velocityz').innerHTML = Math.round(observer.velocity.z*100)/100;
			kineticPanel.updateState=0;
		}
		kineticPanel.updateState ++;
	}

	actionPanel =  document.getElementById("actionPanel");
	actionPanel.updateInterval=6;
	actionPanel.updateState=0;
	actionPanel.setAttribute("class","actionPanelActive");

	actionPanel.updateSliderColor = function () {
		var color = "rgb(";
		for(var cs=0;cs<colorSliders.length;cs++) {
			color += Math.round(colorSliders[cs].value*255);
			if(cs<2) { color +=',';}
		}
		color += ')';
		for(var cs=0;cs<colorSliders.length;cs++) {
			colorSliders[cs].parentNode.style.backgroundColor = color;
        }
	}

	actionPanel.initSliders = function () {
		var redSlider = document.createElement("input");
		redSlider.setAttribute("id","RedSliderControl");
		redSlider.setAttribute("type","range");
		redSlider.setAttribute("min","0.0");
		redSlider.setAttribute("step","0.01");
		redSlider.setAttribute("max","1.0");
		redSlider.setAttribute('value',0.7);
        redSlider.setAttribute("style","width:88%;");
		redSlider.setAttribute('onchange','actionPanel.updateSliderColor()');
		//redSlider.onclick = colorSliderClicked;
		document.getElementById("redSlider").appendChild(redSlider);

		//greenSlider = SliderControl("Green",colorSliderDragged);
		var greenSlider = document.createElement("input");
		greenSlider.setAttribute("id","GreenSliderControl");
		greenSlider.setAttribute("type","range");
		greenSlider.setAttribute("min","0.0");
		greenSlider.setAttribute("step","0.01");
		greenSlider.setAttribute("max","1.0");
		greenSlider.setAttribute('value',0.1);
        greenSlider.setAttribute("style","width:88%;");
		greenSlider.setAttribute('onchange','actionPanel.updateSliderColor()');
		//greenSlider.onclick = colorSliderClicked;
		document.getElementById("greenSlider").appendChild(greenSlider);

		var blueSlider = document.createElement("input");
		blueSlider.setAttribute("id","BlueSliderControl");
		blueSlider.setAttribute("type","range");
		blueSlider.setAttribute("min","0.0");
		blueSlider.setAttribute("step","0.01");
		blueSlider.setAttribute("max","1.0");
		blueSlider.setAttribute('value',1.0);
        blueSlider.setAttribute("style","width:88%;");
		blueSlider.setAttribute('onchange','actionPanel.updateSliderColor()');
		document.getElementById("blueSlider").appendChild(blueSlider);

        var xSlider = document.createElement("input");
		xSlider.setAttribute("id","XSliderControl");
		xSlider.setAttribute("type","range");
		xSlider.setAttribute("min","1");
		xSlider.setAttribute("step","1");
		xSlider.setAttribute("max","2000.0");
		xSlider.setAttribute('value',700.0);
        xSlider.setAttribute("style","width:88%;");
		document.getElementById("xSlider").appendChild(xSlider);

        var ySlider = document.createElement("input");
		ySlider.setAttribute("id","YSliderControl");
		ySlider.setAttribute("type","range");
		ySlider.setAttribute("min","1");
		ySlider.setAttribute("step","1");
		ySlider.setAttribute("max","2000.0");
		ySlider.setAttribute('value',50.0);
        ySlider.setAttribute("style","width:88%;");
        document.getElementById("ySlider").appendChild(ySlider);

        var zSlider = document.createElement("input");
		zSlider.setAttribute("id","ZSliderControl");
		zSlider.setAttribute("type","range");
		zSlider.setAttribute("min","1");
		zSlider.setAttribute("step","1");
		zSlider.setAttribute("max","2000.0");
		zSlider.setAttribute('value',700.0);
        zSlider.setAttribute("style","width:88%;");
		document.getElementById("zSlider").appendChild(zSlider);

		colorSliders = [redSlider,greenSlider,blueSlider];
		actionPanel.updateSliderColor();
	}

	actionPanel.clear = function clear() {
		document.getElementById('objectNameTextbox').setAttribute('value','');
		document.getElementById('objectShapeSelect').setAttribute('value','box');
		document.getElementById('objectMaterialSelect').setAttribute('value','plastic');
		document.getElementById('RedSliderControl').setAttribute('value','0.4');
		document.getElementById('GreenSliderControl').setAttribute('value','0.1');
		document.getElementById('BlueSliderControl').setAttribute('value','1.1');
		document.getElementById('XSliderControl').setAttribute('value','450');
		document.getElementById('YSliderControl').setAttribute('value','32');
		document.getElementById('ZSliderControl').setAttribute('value','450');
		//update the sliders to visually show that their values have changed
		//actionPanel.updateSliders();
	}


	actionPanel.update = function update () {
		if (actionPanel.updateState == actionPanel.updateInterval) {
			actionPanel.updateState=0;
		}
		actionPanel.updateState ++;
	}

	gui = {
		kineticPanel:kineticPanel,
		actionPanel:actionPanel,
		leftPanel:leftPanel,
		helpButton:document.getElementById("helpButton"),
		codeMirrorEditor:null,
		update: function update () {
			kineticPanel.update();
		},
		visible: false,
		lastSelectedWorld: "Select World",
		htmlTemplate: "<html>\n\t<head>\n\t\t<script>\n\t\t\t //code you want to run goes here\n\t\t</script>\n\t\t<style>\n\t\t\t /* custom style rules can go here */ \n\t\t</style>\n\t</head>\n\t<body>\n\t\t<!--Content you want to appear goes here-->\n\t</body>\n</html>",
		toggleMenu: function toggleMenu () {
			if (gui.visible) {
                document.querySelector("#objectLinkTextbox").setAttribute("disabled","disabled");
				gui.hideGUI();
			} else {
                document.querySelector("#objectLinkTextbox").removeAttribute("disabled");
				gui.showGUI();
			}},
			showHelp: function showHelp () {
		        exitMenu();
		        var helpHTML = '<span class="instructions" >'+
		            '<input type="button" style="font-size:200%;margin-top:20px;margin-bottom:20px;display:block;" value="Continue" onclick="lightBoxViewer.closeLightBox();">'+
		            'Use WASD to accelerate forward, left, back right. <br>'+
		              'Use R and F to accelerate vertically.<br>'+
		              'Use mouse pointing to turn and Q and E to roll.<br>'+
		              'Hold left shift to move more precisely with velocity stabilization.<br><br>'+
                      'Left click to use the current Tool.<br>'+
		              'You can press C and V to cycle back and forward through your tools while not in the control panel. <br>'+
		              'Press Escape to use your Control Panel and see all options<br>'+
		              'Press Space or right click while pointing at an object to select it.<br><br>'+
		              'When placing objects, hold left click to preview your object before you place it.<br>'+
		              'Let go of left click to place your object.<br>'+
		              'To delete an object, first select it, then switch to the delete tool and click.<br><br>'+
		              'From the Control Panel, you can specify text to be tagged in the object you place.<br>'+
		              'Just click the text textbox to be taken to a code editor (HTML/css/javascript are allowed).<br>'+
		              'When done editing, click Save And Close to return to the Control Panel.<br><br>'+
                      'To create your own worlds, open the control panel and click \'Create a new world\'.<br>'+
		              'While in a user created world, you can use your Control Panel to<br> designate the object you place as a portal to any other world.<br>'+
		              'If need be, you can create \'hub\' worlds containing many portals to other worlds.<br>'+
		              'Flying far enough away from the center of any world will bring you back through the portal you went through last.</span>';
		        helpHTML += "<div class='controls'><table class='controlsTable'>"+
                            "<tr style='background-color:rgb(255,0,0);'><td>Move Mouse</td><td>Look Around (Pitch / Yaw)</td></tr>"+
                            "<tr style='background-color:rgb(200,0,0);'><td>Left Click</td><td>Use Current Tool</td></tr>"+
                            "<tr style='background-color:rgb(255,100,0);'><td>Right Click</td><td>Scan Object</td></tr>"+
                            "</table>  <br>"+
                              "<table class='controlsTable'>"+
                                "<tr style='background-color:rgb(255,0,0);'>"+
                                    "<td>Escape</td><td>Show / Hide Menu</td></tr>"+
                                "<tr style='background-color:rgb(200, 0, 0);'><td>W A S D</td><td>Accelerate Forward / Left / Back / Right</td></tr>"+
                                "<tr style='background-color:rgb(255, 100, 0);'><td>R F</td><td>Accelerate Up / Down</td></tr>"+
                                "<tr style='background-color:rgb(50, 200, 0);'><td>SHIFT</td><td>Slow Down</td></tr>"+
                                "<tr style='background-color:rgb(50, 100, 250);'><td>SPACE</td><td>Scan Object</td></tr>"+
                                "<tr style='background-color:rgb(50, 50, 220);'><td>Q E</td><td>Roll Left / Right</td></tr>"+
                                "<tr style='background-color:rgb(150, 0, 200);'>"+
                                    "<td>C V</td><td>Switch Tool Next / Previous</td>"+
                                "</tr>"+
                                "<tr style='background-color:rgb(255, 0, 255);'>"+
                                    "<td>T</td><td>Enter Chat Message</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td colspan='2' style='width:100%; padding:0%; background:#444; '>"+
                                         "<img src='graphics/vectorKeyboardLeft.jpg' id='desktopFirstTimeImage'>"+
                                    "</td>"+
                                "</tr>"+
                            "</table>"+
                            "<br/>"+
                        "</div>";
			   lightBoxViewer.lightBox("How to navigate and interact:",helpHTML)
		    },
        chatVisible:false,
        sendChat: function sendChat () {
            var chatInput = document.querySelector("#chat-input");
            var message = encodeURIComponent( chatInput.value );
            socket.emit("chat message",'{"userId":' + observer.userId + ',"message":"' + message + '"}');
            chatInput.value = "";
        },
        toggleChat: function toggleChat(force){
            if (typeof force != 'undefined'){
                gui.chatVisible = force
            } else {
                gui.chatVisible =! gui.chatVisible;
            }
            clearTimeout( gui.chatTimeout );
            if (gui.chatVisible){
                gui.fadeChat(1);
                document.querySelector("#chat-input").focus();
            } else {
                gui.fadeChat(0);
            }
            normalMouse = gui.chatVisible;
            document.querySelector("#chat-input-container").style.display = gui.chatVisible ? "block" : "none";
        }
	};

    document.querySelector("#chat-input").addEventListener('keypress',function (evt) {
        if (evt.which == 13) {
            gui.sendChat();
        }
    },false);

	gui.helpButton.onclick = gui.showHelp;

	document.getElementById("worldPortal").addEventListener("change",function (evt) {
		gui.lastSelectedWorld = evt.target.value;
	});


  document.getElementById('fileUpload').addEventListener('change', scanLocalImage, false);

	gui.temporaryHUD = function temporaryHUD() {
		clearTimeout(fadeHUDTimeout);
		//fade(document.querySelectorAll(".menuPrompt , .selectedAction"),1.0);
		fade(document.querySelectorAll("#selectedActionPanel, #menuPromptPanel"),1.0);
        fadeHUDTimeout = setTimeout(function(){fade(document.querySelectorAll("#selectedActionPanel, #menuPromptPanel"),0);},6000);
	}

	gui.showGUI = function showGUI() {
		//show gui
		observer.velocity.multiplyScalar(0.0);
		this.visible = true;
		this.kineticPanel.updateState = gui.kineticPanel.updateInterval;
		this.kineticPanel.update();
		leftPanel.style.display = "block";
		actionPanel.style.display = "block";
		//prevent selectedActionName from being shown since the action panel shows that information anyway
		selectedActionPanel.style.display = "none";
		menuPromptPanel.innerHTML = "Press Esc To<br / >Return To Exit Menu";
		menuPromptPanel.setAttribute("class","exitMenuPrompt");
		//change mouse behaviour to allow for clicking on gui
		//if(!mobile) { controls.domElement = null; }
		nullInput.focus();
		normalMouse = true;
		//controls.normalMouse = true;
		if (postProcessingLevel == 1  || (postProcessingLevel == 2 && !postprocessing.depthOfField)) {
				//blur canvas
				three.renderer.domElement.style["-webkit-filter"] = "blur(3px)";
				three.renderer.domElement.style["filter"] = "blur(3px)";
        }
        // load world data to allow creating portals
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                //console.log(xhr.responseText);
                var worlds = JSON.parse(xhr.responseText).worlds;
                var wCtr = worlds.length -1;
                var worldSelectOptions = "";
                while(wCtr >= 0){
                    worldSelectOptions += "<option value='" +worlds[wCtr].subspace+ "'>" + worlds[wCtr].subspace + "</option>";
                    wCtr--;
                }
                document.getElementById("worldPortal").innerHTML = "<option value='Select World'>Select World</option>" + worldSelectOptions;
                document.getElementById("worldPortal").value = gui.lastSelectedWorld;
                // build select element from this... maybe store it in an object somewhere (in case the server doesn't respond or something)
                // ... and replace the current select with it
                worldSettings.worlds = worlds;
            }
        }
        xhr.open("POST","/overworld/app/world.php",true);
        xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        xhr.send();

		//animate = function(){};
	}

	gui.hideGUI = function hideGUI () {
		lightBoxViewer.closeLightBox();
		//hide gui
		gui.visible = false;
		leftPanel.style.display = "none";
		actionPanel.style.display = "none";
		//allow selectedActionName to be shown
		selectedActionPanel.style.display="block";
		if (mobile) {
			menuPromptPanel.innerHTML = "Tap the top left to show controls";
		} else {
			menuPromptPanel.innerHTML = "Press Escape to show controls";
		}
		menuPromptPanel.setAttribute("class","menuPrompt");
		//change mouse behaviour to allow for Mouse Look navigation
		nullInput.focus();
		//document.getElementById('objectSubspaceTextbox').blur();
		//controls.domElement = document.querySelector("#viewportCanvas");//document.body;
		normalMouse = false;
		//controls.normalMouse = false;
	    gui.toggleChat(false);
		gui.temporaryHUD();
		//startAnimation();
	}

    gui.fadeChat = function fadeChat(inOut) {
        var chatContainer = document.querySelector("#chat-container");
        if(inOut == 1){
            chatContainer.style.display = "inline-block";
        } else {
            gui.chatTimeout = setTimeout(function(){
                chatContainer.style.display = "none";
            },500);
        }
        chatContainer.style.opacity = inOut;
    }
	// temporary scene / intitial scene
	function initialScene (ctr) {
		var shape="box",
			material="colorFlow",
			fileName="";
		if (ctr < 128) {
			var name="initialBox"+ctr,
				color=[(Math.sin(Math.PI*2*ctr/12.0)/2.0)+0.5,(Math.cos(Math.PI*2*ctr/12.0)/2.0)+0.5,1],
				position=[((Math.sin(Math.PI*2*(ctr/12.0))*160000)/(ctr*ctr)*0.15),
                          ((Math.sin(Math.PI*2*(ctr/12.0))*10000)/(ctr*ctr)*0.15),
                          ((Math.cos(Math.PI*2*(ctr/12.0))*160000)/(ctr*ctr)*0.15)],
				quaternion=[0,0,0,Math.PI*2*(ctr/24.0)],
				objectScale = Math.sqrt((position[0]*position[0])+(position[1]*position[1])+(position[2]*position[2]))/10000,
	        	size=[800*objectScale,800*objectScale,800*objectScale];
			var newEntity = addEntityFromDescription(name,ctr,world,shape,material,color,size,position,fileName,quaternion,"solid","standard","","","","","",false,"","",800*objectScale);
			fadeIn(newEntity);
			//saveEntity(newEntity);
			ctr++;
            console.log("position",position);
			setTimeout(function(){initialScene(ctr);},50);
		}
	}



    function loadEntities () {
            if (Math.sqrt(Math.pow(observer.node.position.x,2)+Math.pow(observer.node.position.y,2)+Math.pow(observer.node.position.z,2))>75000){
                observer.transcend();
                    return;
            }
        	// request entities...
			request = new XMLHttpRequest();
            request.world = world;
			request.onreadystatechange = function () {
				if (request.readyState==4 && request.status==200) {
   					//console.log(request.responseText);
   					worldContent = {"world":world,"updateId":entitiesNode.updateId,"entities":[]};
                    eval(request.responseText); // JSON.parse(request.responseText);
                    if(request.world != worldContent.world){ return; }
                    entitiesNode.updateId = worldContent.updateId;
                    //console.log(worldContent.updateId);
                    for (var newEntityCtr = worldContent.entities.length-1; newEntityCtr > -1; newEntityCtr--) {
                        var e = worldContent.entities[newEntityCtr];
                        addEntityFromDescription(e[1],  // name  // note: switched with id (see PhongServerOutput.php)
                                             e[0],  // id  // note: switched with name (see above)
                                             e[2], // containingWorldKey
                                             e[3], //shape
                                             e[4], //material
                                               e[5], //color
                                               e[6], //size
                                             e[7], //position
                                            e[8], //fileName
                                             e[9], //quaternion
                                             e[10], //physics
                                           e[11], //behaviour
                                           unescape(decodeURIComponent(e[12])), //text
                                           e[13], //link
                                           e[14], //image
                                           e[15], //sound
                                           e[16], //subspace
                                           e[17], //key switch
                                           e[18],//extra
                                           e[19], // radius
                                           e[20]); //spiraldata like 255,127,31_200,100,5
                    }
                    if (!decayTimeout) {
                        decayEntities();
                    }
			    }
            };

            request.open("GET","output.php?world="+world+"&updateId="+entitiesNode.updateId+"&time="+Date.now(), true);
        //console.log("output.php?world="+world+"&updateIds="+updateIds+"&scaleIndex="+loadIndex);
			request.send();
            entityBufferTimeout = setTimeout(function(){loadEntities();},3000);
    }


    window.decayEntities = function () {
        var killItems = 2,  e = Math.floor(Math.random()*entitiesNode.children.length-1);
        if (worldSettings.subspace=="Overworld" && entitiesNode.children.length > 360) {
            if (e >= 0) {
               while (killItems-- >= 0) {
                   e = Math.floor(Math.random()*entitiesNode.children.length-1);
                    entity = entitiesNode.children[e].entity;
                    while (!(entity.subspace.length < 1 &&entity.text.length < 1 &&entity.extra.length < 1
                               &&entity.link.length < 1 &&entity.fileName.length < 1 &&entity.spiralData.length < 1)) {
                        e = Math.floor(Math.random()*entitiesNode.children.length-1);
                        entity = entitiesNode.children[e].entity;
                    }
                    //console.log("removing space junk", e, entity);
                    blowUp(entity);
                }
            }
        }
        decayTimeout = setTimeout(decayEntities, 6000);
    }


   function saveEntity (entity,update) {
		var highestId = 0;
		if (!update) {
			entitiesNode.updateId++;
			entity.id = entitiesNode.updateId;
		}
		// build string
		var jsonRecord =   (update==true?"["+entity.id+",'":"[ENTITY_ID,'")+
	 /*string name */  entity.name+"','"
	  /*array containingWorldKey*/    +entity.containingWorldKey+"','"
		/*string cube*/+entity.geometry+"','"
		/*string rock*/+entity.material+"',"
      /*array [r,g,b]*/+"["+entity.color[0]+","+entity.color[1]+","+entity.color[2]+"],"
      /*array [x,y,z]*/+"["+entity.size[0]+","+entity.size[1]+","+entity.size[2]+"],"
   	  /*array [x,y,z]*/+"["+entity.mesh.position.x+","+entity.mesh.position.y+","+entity.mesh.position.z+","+"],"
      /*array [x,y,z]*/+"'"+entity.fileName+"',"
    /*array [x,y,z,w]*/+"["+entity.mesh.quaternion.x+","+entity.mesh.quaternion.y+","+entity.mesh.quaternion.z+","+entity.mesh.quaternion.w+"],'"
			           +entity.physics+"','"
				       +entity.behaviour+"','"
				       +encodeURIComponent(escape(entity.text))+"','"
				       +entity.link+"','"
				       +entity.image+"','"
				       +entity.sound+"','"
				       +entity.subspace+"',"
				       +entity.key+",'"
                        +entity.extra+"','"
				       +entity.spiralData+"',"
                        +entity.radius+"]";

				       console.log(jsonRecord);
		//make request to input.php

		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState==4 && request.status==200){
                    if(!update){
                           if(request.responseText=="-1") {

                            } else {
                               // entity = unidentifiedObjects[0]
                                //unidentifiedObjects.splice(0,1);
                                //entity.id=request.responseText;
                            }
                        }
    		}
		}
		if(update) {
			console.log("update");
			var transactionType = "update";
		} else {
			var transactionType = "create";
           // newEntity = entity;
		}
        if(entity.text!="" || entity.link!="" || entity.image!="" || entity.fileName!=""){
            var contentFlag = "contentFlag=1&";
        } else {
            var contentFlag = "contentFlag=0&";
        }
        if(entity.subspace!=""){
            var worldFlag = "worldFlag=1&";
            var subworldData = 'subWorldData={"subspace":"'+entity.subspace+'","mesh":{"position":{"x":'+entity.mesh.position.x+',"y":'+entity.mesh.position.y+',"z":'+entity.mesh.position.z+'}},"color":['+entity.color[0]+','+entity.color[1]+','+entity.color[2]+'],"material":"'+entity.material+'","fileName":"'+entity.image+'"}&';
            var subWorld = "subWorld="+entity.subspace+"&";
        } else {
            var worldFlag = "worldFlag=0&";
            var subworldData = "";
            var subWorld="";
        }
		console.log(entity.id);
		/*request.open("GET","input.php?world="+world+"&cc="+entity.cc+"&entityTransaction="+transactionType+"&entityJSON=\""+jsonRecord+"\"&entityId="+entity.id+"&",true);
		request.send();*/
        request.open("POST","input.php",true);
        request.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        request.send(contentFlag+worldFlag+subworldData+subWorld+"world="+world+"&entityTransaction="+transactionType+"&entityJSON=\""+jsonRecord+"\"&entityId="+entity.id+"&");
	}


	function uploadFile () {
		var fileInput = document.getElementById('fileUpload');
 		var file = fileInput.files[0];

 		var xhr = new XMLHttpRequest();
 		xhr.upload.addEventListener('progress', onprogressHandler, false);
 		xhr.open('POST', '/overworld/app/fileUpload.php', true);
       // xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
 		xhr.setRequestHeader("X-FILENAME", file.name);
 		xhr.setRequestHeader("X-WORLD",world);
 		xhr.send(file); // Simple!

 		function onprogressHandler(evt) {
     		//var percent = evt.loaded/evt.total*100;
     		//console.log('Upload progress: ' + percent + '%');
     		if (evt.loaded==evt.total) {
                console.log(evt.responseText);
     		}
		}
	}




 	observer = {
	name: "observer",
    userId: Date.now(),
    hp: 100,
    sendUpdatePacket: true,
	scale: 1.0,
	keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        r: false,
        f: false,
        q: false,
        e: false,
        i: false,
        j: false,
        k: false,
        l: false,
        leftShift: false,
        spaceArrow: false,
        escapeHeld: false,
        c: false,
        v: false
    },
	position: new THREE.Vector3(0,0,0),
	oldPosition: new THREE.Vector3(0,0,0),
	velocity: new THREE.Vector3(0,0,0),
	node: observerNode,
    camera: camera,
	weaponReady: true,
	mouseDown: false,
    coolDownProgress: 0,
    contentCoolDown: 0,
    locallyScannedSpiralData: "",
	selectedEntity: null,
	pointedAtEntity: null,
	previouslySelectedEntity: null,
	currentTool: 1,
	update: function update (deltaTime) {
			// check if any special collision detection has to be done
            this.node.position = this.camera.position;
            if (worldSettings.boundaryOptions.boundaryType != "none") {
                if (worldSettings.boundaryOptions.boundaryType == "asymptote") {
                    this.scale = this.node.position.length() / 10000;
                    if (this.scale < 0.00018) {
                        this.scale = 0.00018;
                    }
                } else if(worldSettings.boundaryOptions.boundaryType == "plane") {
                    if (worldSettings.boundaryOptions.deformSurface){
                      if (this.camera.position.y < 700) {
                         this.position.y = 700;
                          if(this.velocity.y < 0 ) {
                            this.velocity.y *= -0.9;
                          }
                       }
                    } else {
                      if (this.camera.position.y < 600) {
                         this.position.y = 600;
                          if (this.velocity.y < 0 ) {
                            this.velocity.y *= -0.9;
                          }
                       }
                    }
                    if (this.camera.position.y > 12000) {
                        observer.transcend();
                    }
                } else if (worldSettings.boundaryOptions.boundaryType == "planetoid"){
                    if (this.camera.position.length() < 30500.0){
                        this.node.position.normalize().multiplyScalar(30500);
                        this.velocity.multiplyScalar(0.9);
                    }
                }
            }
            // update the camera controls
            //controls.update( deltaTime );
            UserInput.update(deltaTime);
            this.sendUpdatePacket = !this.sendUpdatePacket;
            if (this.sendUpdatePacket){
            socket.emit('user update','{"world":"'+worldSettings.subspace+'","userId":'+this.userId+',"position": {"x":'+this.node.position.x+',"y":'+this.node.position.y+',"z":'+this.node.position.z+'},'
            +'"quaternion":{"x":'+this.camera.quaternion.x+',"y":'+this.camera.quaternion.y+',"z":'+this.camera.quaternion.z+',"w":'+this.camera.quaternion.w+'}}');
            }

            if(firedProjectiles.length != 0) { //Bullet hanlding...
				var bulletIndex = firedProjectiles.length -1;
                while (bulletIndex > -1) {
                    var b = firedProjectiles[bulletIndex];
					if (b.timeToLive > 0) {
						b.speed *= 1.02; //bullets start off slow for interest, but get faster for long range
                        if(worldSettings.boundaryOptions.boundaryType == "asymptote") {
                            var bScale = b.mesh.position.length() / 10000;
                            b.mesh.scale.set(bScale, bScale, bScale);
                            b.mesh.translateZ(-b.speed * bScale);
                        } else {
                            b.mesh.translateZ(-b.speed);
                        }
						//b.mesh.position.addSelf(b.velocity.multiplyScalar(deltaTime/2200.0));
						b.mesh.updateMatrix();
						b.timeToLive -= 0.001*deltaTime;
						var proximityEntity = getClosestEntity(b.mesh.position, 250 * this.scale, true);
						if (proximityEntity.entity && !proximityEntity.entity.contentFlag && proximityEntity.entity.extra=="") {
                            var explodeSound = document.createElement('audio');
                            explodeSound.setAttribute('style','display:none;');
                            explodeSound.setAttribute('src',sounds.impact);
                            explodeSound.setAttribute('controls',false);
                            explodeSound.play();
							if (proximityEntity.entity.extra == "") {
                                b.timeToLive = 0;
                                blowUp(proximityEntity.entity);
                            } else {
                                b.timeToLive = 0;
                                //blowUp({mesh:b.mesh,explosionProgress:0.0},true);
                            }
						}
                        if(b.userId != this.userId && Math.sqrt(Math.pow(b.mesh.position.x - this.node.position.x,2) +
                                                                Math.pow(b.mesh.position.y - this.node.position.y,2) +
                                                                Math.pow(b.mesh.position.z - this.node.position.z,2)) < 250) {
                            var damageSound = document.createElement('audio');
                            damageSound.setAttribute('style','display:none;');
                            damageSound.setAttribute('src',sounds.impactDamage);
                            damageSound.setAttribute('controls',false);
                            damageSound.play();
                            this.hp -= 10;
                            b.timeToLive = 0;
                        }
                    } else { //remove bullet from scene // console.log("remove bullet...");
				        three.scene.remove(b.mesh);
                        firedProjectiles.splice(bulletIndex,1); //remove the bullet from the projectiles
					}
                    bulletIndex --;
				}
			}
		},transcend: function transcend() {
            // corrisponds to var worldDepth; and worldPath = []; contains {name:"world",offset:[1000,1000,1000],material:"solid",color:[1,0.5,0.2] }
				if(worldDepth > 0) {
		           // planetoid.mesh.parent.remove(planetoid.mesh);// remove planetoid
					clearTimeout(entityBufferTimeout);// stop loading entities for a moment
		            physicsWorker.postMessage('{"command":"clearScene","data":{}}');

					var offset = worldPath[worldDepth].offset;
		            observer.node.position.set(offset.x,offset.y,offset.z);
		            observer.node.position.multiplyScalar(1.6);
		            camera.lookAt(new THREE.Vector3(offset.x,offset.y,offset.z));

		            worldPath.splice(worldDepth,1); // remove the previous reality from the path
					worldDepth--;
		            three.scene.remove(entitiesNode);

		            entitiesNode = new THREE.Object3D();
		            three.scene.add(entitiesNode);
		            entitiesNode.position.set(0,0,0);
		            entitiesNode.autoUpdateMatrix=false;
		            entitiesNode.updateMatrix();
		            entitiesNode.updateId=1;

		            observerNode.remove(observerNode.children[0]); //remove old sky
					if (worldDepth == 0) { // if returning to the top level, put the sky back to normal
                        history.pushState("Exploring Overworld","Explore | Overworld", "/overworld/app/?g="+postProcessingLevel);
                        document.title = "Explore | Overworld";
                        if (typeof three.lensFlare == "object") { three.lensFlare.position.set(0,0,0); }
                        if (typeof boundaries != 'undefined'){ three.scene.remove(boundaries); }
		                sky = new THREE.Mesh(new THREE.OctahedronGeometry(240000,4),materials.skyMaterial);
						observerNode.add(sky);
						observer.velocity.multiplyScalar(0.1);
                        observer.scale = 1.0;
						world = "Overworld";

                         worldSettings = {
                            name: "Overworld",
                            subspace: "Overworld",
                            color:[0.15,0.15,0.15],
                            boundaryOptions: {
                                boundaryType: "asymptote",
                            },
                            generator: {
                                type: "none",
                                seed: 0
                            },
                            options:{
                                general:{
                                    "rangedSelectObject":true,"submitContent":true,"attachFilesToObject":true,
                                    "embedHTMLInObject":true,"embedLinkInObject":true
                                },constructive:{
                                    "createNewStructure":true,"buildOnToObject":true,"cubeSnappingBrush":true,"continuousObjectBrush":true
                                },destructive:{
                                    "deleteObject":true,"cutHoleInObject":true,"combatOptions":{
                                        "attackStructures":false,"attackOtherUsers":false,"availableWeapons":["standard"]}}}
                        };
//                      if (postProcessingLevel < 2) {
//                          boundaries = new THREE.Mesh(new THREE.OctahedronGeometry(3000,4),
//                                                new THREE.MeshBasicMaterial({ transparent: true,
//                                                                              map: textures.glowTexture }));
//                          three.scene.add(boundaries);
//                          boundaries.autoUpdateMatrix = false;
//                      }
						document.querySelector("#worldPortal").setAttribute("disabled","disabled");
				        document.querySelector("#worldPortal").value = "Select World";

					} else {
						world = worldPath[worldDepth].name;
		                var xhr = new XMLHttpRequest();
			            xhr.onreadystatechange = function() {
			                if (xhr.readyState==4 && xhr.status==200) {
			                    eval("worldSettings = "+xhr.responseText+";");
			                    worldDepth --;
			                    observer.enterWorld(worldSettings);
			                }
			            };
			            xhr.open("POST","/overworld/app/world.php",true);
			            xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			            xhr.send("world="+world+"&");
					}
					loadEntities();  // start loading things again
				} else {
		            window.location.href = '../';
		        }
			},
		enterWorld: function enterWorld (entity) {
                observer.scale = 1.0;
			var settings = {};
                if (typeof boundaries != 'undefined') {
                    three.scene.remove(boundaries);
                }
                if (worldSettings.boundaryOptions.boundaryType == "planetoid" || worldSettings.boundaryOptions.boundaryType == "asymptote") {
                    camera.position.set(Math.random(),Math.random(),Math.random());
                    camera.position.normalize().multiplyScalar(35000);
                    camera.lookAt(new THREE.Vector3(0,0,0));
                } else if(worldSettings.boundaryOptions.boundaryType == "plane") {
                	camera.position.set(0,3000,0);
                } else {
                    camera.position.set(0,0,0);
                }

                if (worldSettings.boundaryOptions.boundaryType == "planetoid" || worldSettings.boundaryOptions.boundaryType == "plane") {
                    three.light.position.set(0,50000,0);
                    if (typeof three.lensFlare == "object") { three.lensFlare.position.set(0,50000,0); }
                } else {
                    three.light.position.set(0,0,0);
                    if (typeof three.lensFlare == "object") { three.lensFlare.position.set(0,0,0); }
                }
                three.light.updateMatrix();

				worldDepth ++;// make note of the level of reality  // 0 == the overworld , higher numbers represent nested planes of existence
				worldPath.push({name:entity.subspace,offset:entity.mesh.position,material:entity.material,color:entity.color}); // record the name and offset of this new reality
		        history.pushState("Exploring "+entity.subspace,entity.subspace+" | Overworld", "/overworld/app/?g="+postProcessingLevel+"&w="+entity.subspace);
                document.title = entity.subspace+" | Overworld";

                three.scene.remove(entitiesNode);
		        physicsWorker.postMessage('{"command":"clearScene","data":{}}');
		        world = entity.subspace;
		        if (world != "Overworld") {
					document.querySelector("#worldPortal").removeAttribute("disabled");
				}
		        console.log(world);
		        clearTimeout(entityBufferTimeout);

		        entitiesNode = new THREE.Object3D();
		        three.scene.add(entitiesNode);
		        entitiesNode.position.set(0,0,0);
		        entitiesNode.autoUpdateMatrix = false;
		        entitiesNode.updateMatrix();
		        entitiesNode.updateId = 0;
		      // three.scene.fog.color.setRGB(worldSettings.color[0],worldSettings.color[1],worldSettings.color[2]);
		        observerNode.remove(observerNode.children[0]); //remove old sky
				//change the sky to look like the object
				//three.scene.remove(observerNode.children[0]);
				if (/\.(?:jpe?g|gif|png)$/i.test(entity.fileName)) {
		            // new image here...
		           var  newSkyTexture = customTextures[entity.fileName] = THREE.ImageUtils.loadTexture(entity.fileName,THREE.UVMapping,function(){
			           var subspaceSkyMaterial = descriptionToMaterial("customImage", [1,1,1], true, entity.fileName);
			           subspaceSkyMaterial.side = 1;
			           subspaceSkyMaterial.fog = false;
			           subspaceSkyMaterial.transparent = false;
			           var subspaceSky = new THREE.Mesh(new THREE.SphereGeometry(240000,20,20), subspaceSkyMaterial);
			           observerNode.add(subspaceSky);
			                //three.scene.add(subSpaceSky)
		            });
		            newSkyTexture.needsUpdate = true;
		        } else {
		           var subspaceSkyMaterial = descriptionToMaterial(entity.material, entity.color,true);
		            subspaceSkyMaterial.side = 1;
		            subspaceSkyMaterial.fog = false;
		            subspaceSkyMaterial.transparent = false;
		            if (entity.material=="wireFrame") {
						var subspaceSky = new THREE.Mesh(new THREE.OctahedronGeometry(240000,4),subspaceSkyMaterial);
					} else {
						var subspaceSky = new THREE.Mesh(new THREE.SphereGeometry(240000,20,20),subspaceSkyMaterial);
					}
		            observerNode.add(subspaceSky);
		        }

		        var upOneWorld = worldPath[worldDepth-1].name;
		        var boundaryGeom = null, backingBoundGeometry = null, backingBoundaries = null;
                if(worldSettings.boundaryOptions.boundaryType != "none" && worldSettings.boundaryOptions.boundaryType != "asymptote") {
                    var terrainMap = null;
                     if (worldSettings.boundaryOptions.terrainTexture.length > 0) {
                        terrainMap = THREE.ImageUtils.loadTexture("../"+worldSettings.boundaryOptions.terrainTexture);
                     } else {
                     	console.log(worldSettings.boundaryOptions.premadeTerrainTexture);
                        switch (worldSettings.boundaryOptions.premadeTerrainTexture) {
                            case "hyperPanel":
                                terrainMap = THREE.ImageUtils.loadTexture("graphics/hyperPanel.png");
                                	settings ={
                                        map:terrainMap,
                                        fog:true
                                };
                            break;
                            case "rock2":
                                terrainMap = THREE.ImageUtils.loadTexture("graphics/rocks_contrast.jpg");
                                if (postProcessingLevel >1 ){
                                    var terrainBump = THREE.ImageUtils.loadTexture("graphics/rocks_contrast.jpg");
                                    settings = {
                                        map:terrainMap,
                                        fog:true,
                                        specular: new THREE.Color(worldSettings.boundaryOptions.color[0],
                                                                  worldSettings.boundaryOptions.color[1],
                                                                  worldSettings.boundaryOptions.color[2]),
                                        shininess: 10,
                                        bumpMap:textures.rockBumpTexture,
                                        bumpScale: 30,
                                        metal: true
                                    };
                                } else {
                                    settings = {
                                        map:terrainMap,
                                        fog:true
                                    }
                                }
                            break;
                            case "colorCircuit":
                                terrainMap = THREE.ImageUtils.loadTexture("graphics/colorCircuit2.png");
                                if ( postProcessingLevel <= 1) {
                                    settings ={
                                        map:terrainMap,
                                        fog:true
                                    };
                                } else {
                                    settings ={
                                        map:terrainMap,
                                        fog:true,
                                        specular: 0xffffff,
                                        shininess: 10,
                                        //bumpMap: colorCircuitSpecular,
                                        bumpMap: terrainMap,
                                        envMap:textures.skyCubeMap,
                                        bumpScale: 20,
                                        metal: false
                                    };
                                }
                            break;
                            case "colorFlow":
                                terrainMap =  THREE.ImageUtils.loadTexture("graphics/noise_1.png"); //
                                 settings = {
                                        map:terrainMap,
                                        fog:true
                                 };
                            break;
                            case "wireFrame":
                                settings = {
                                       wireframe:true,
                                       fog:true
                                };
                            break;
                        }
                     }
                    if (worldSettings.boundaryOptions.premadeTerrainTexture != "wireFrame" && worldSettings.boundaryOptions.premadeTerrainTexture != "plastic"){
                     	terrainMap.wrapS = terrainMap.wrapT = THREE.RepeatWrapping;
						terrainMap.needsUpdate = true;
                    }

                    if (postProcessingLevel > 1){
                        var boundaryMaterial = new THREE.MeshPhongMaterial(settings);
                    } else {
                        var boundaryMaterial = new THREE.MeshLambertMaterial(settings);
                    }

                    boundaryMaterial.color.setRGB(worldSettings.boundaryOptions.color[0],
                                                  worldSettings.boundaryOptions.color[1],
                                                  worldSettings.boundaryOptions.color[2]);
                   // if(typeof(boundaries)!='undefined'){ three.scene.remove(boundaries); }
                    switch (worldSettings.boundaryOptions.boundaryType) {
                     case "plane":
                        boundaryGeom = new THREE.PlaneGeometry(64000,64000,48,48);
                        backingBoundGeometry = new THREE.PlaneGeometry(270000,270000,16,16);
                        if (worldSettings.boundaryOptions.deformSurface) {
                            var vertices = boundaryGeom.vertices, vertex = vertices.length-1;
                            while (vertex > -1) {
                                vertices[vertex].z = Math.random()*900.0;
                                vertex --;
                            }
                            vertices = backingBoundGeometry.vertices;
                            vertex = vertices.length-1;
                            while (vertex > -1) {
                                vertices[vertex].z = Math.random()*900.0;
                                vertex --;
                            }
                        }
                        if(terrainMap){ terrainMap.repeat.set(24,24); }
                     break;
                     case "planetoid":
                        boundaryGeom = new THREE.OctahedronGeometry(30000,5);
                        if (worldSettings.boundaryOptions.deformSurface) {
                            var vertices = boundaryGeom.vertices, vertex = vertices.length-1;
                            while (vertex > -1) {
                                vertices[vertex].z *= 1.0 + Math.random() / 5.0;
                                vertices[vertex].y *= 1.0 + Math.random() / 5.0;
                                vertices[vertex].x *= 1.0 + Math.random() / 5.0;
                                vertex --;
                            }
                        }
                        if (terrainMap) { terrainMap.repeat.set(16,8); }
                     break;
                     default: break;
                    }

                    boundaries = new THREE.Mesh(boundaryGeom,boundaryMaterial);

                    if (worldSettings.boundaryOptions.boundaryType == "plane") {
                        boundaries.rotation.set(-Math.PI/2.0,0,0);    //THREE.GeometryUtils.merge(backingBoundary, boundaries);
                        backingBoundaries = new THREE.Mesh(backingBoundGeometry, boundaryMaterial);
                        backingBoundaries.autoUpdateMatrix = false;
                        backingBoundaries.position.set(0,0,-3200);
                        boundaries.add(backingBoundaries);
                        backingBoundaries.updateMatrix();
                    }

                    if (worldSettings.boundaryOptions.deformSurface) {
                        boundaryGeom.verticesNeedUpdate = true;
                        boundaryGeom.computeFaceNormals();
                        boundaryGeom.computeVertexNormals();    // requires correct face normals
                        if(backingBoundaries != null) {
                            backingBoundGeometry.verticesNeedUpdate = true;
                            backingBoundGeometry.computeFaceNormals();
                            backingBoundGeometry.computeVertexNormals();
                        }
                    }
                    console.log("adding boundaries");
                    three.scene.add(boundaries);
                } if (worldSettings.boundaryOptions.boundaryType == "asymptote") {
                    if (postProcessingLevel < 2) {
                        boundaries = new THREE.Mesh(new THREE.OctahedronGeometry(2000,4),
                                                    new THREE.MeshBasicMaterial({ transparent: true,
                                                                                  map: textures.glowTexture, opacity: 0.85 }));
                        three.scene.add(boundaries);
                        boundaries.autoUpdateMatrix = false;
                    }
                }
		        loadEntities(); // start loading things again
                if (worldSettings.generator.type == "gallery") {
                    function generateGallery() {
                        if (typeof worldSettings.generator.counter == 'undefined') { worldSettings.generator.counter = 0; }
                        var fileName = worldSettings.generator.content[worldSettings.generator.counter];
                        if (worldSettings.generator.counter < worldSettings.generator.content.length) {
                            console.log(worldSettings.generator.counter);
                                customTextures[fileName] = THREE.ImageUtils.loadTexture(fileName, THREE.UVMapping, function() {
                                    var shape = "box",
                                        material = "customImage",
                                        counter = worldSettings.generator.counter,
                                        name = fileName = worldSettings.generator.content[counter],
                                        color = [1,1,1],
                                        theta = (Math.PI*(counter / worldSettings.generator.content.length)),
                                        position = [Math.sin(theta)*8000,
                                                    6000,
                                                    Math.cos(theta)*8000],
                                        quaternion = [0,0,0,Math.PI*2*(counter/24.0)],
                                        size = [2000, 2000, 2000];
                                var newEntity = addEntityFromDescription(name,counter,world,shape,material,color,size,position,fileName,quaternion,"solid","standard","","",fileName,"","",false,"","",800);
                                fadeIn(newEntity);
                                });

                                worldSettings.generator.counter++;
                                setTimeout(function () { generateGallery(); } , 333);
                        }
                    }
                    generateGallery();
                }
        },
	fireWeapon: function fireWeapon(times) {
                    var projectile = null;
                    var timeToLive = 4;
                    var type = "default";
                    var velocity = new THREE.Vector3(this.velocity.x,this.velocity.y,this.velocity.z);
                    console.log("velocity",velocity);
                    observer.weaponReady = false;
                    projectile = new FiredProjectile(type,this.userId,this.camera.position,this.camera.quaternion,timeToLive,velocity);
                    projectile.mesh.translateZ(600);
                    firedProjectiles.push(projectile); //Register the bullet with firedProjectiles;
                    socket.emit('fire projectile','{"world":"'+worldSettings.subspace+'","userId":'+this.userId+',"type":"'+type+'","position":{"x":'+this.camera.position.x+',"y":'+this.camera.position.y+',"z":'+this.camera.position.z
                                +'},"quaternion":{"x":'+this.camera.quaternion.x+',"y":'+this.camera.quaternion.y+',"z":'+this.camera.quaternion.z+',"w":'+this.camera.quaternion.w
                                +'},"timeToLive":'+timeToLive+',"velocity":{"x":'+projectile.velocity.x+',"y":'+projectile.velocity.y+',"z":'+projectile.velocity.z+'} }');
                    if(times > 1){
                        times --;
                        setTimeout("observer.fireWeapon("+times+")",100);
                    } else {
                        observer.weaponReady = true;
                    }
			},
        placeObject: function placeObject () {
            var name = document.getElementById('objectNameTextbox').value;
            var shape = document.getElementById('objectShapeSelect').value;
            var material = document.getElementById('objectMaterialSelect').value;
            var color = [document.getElementById('RedSliderControl').value,
                         document.getElementById('GreenSliderControl').value,
					     document.getElementById('BlueSliderControl').value];
            var size = [parseFloat(document.getElementById('XSliderControl').value * this.scale),
					  parseFloat(document.getElementById('YSliderControl').value * this.scale),
					  parseFloat(document.getElementById('ZSliderControl').value * this.scale)];
            if (shape != "sphere" ) {
            var radius = (size[0]+size[1]+size[2])/3.0;
              } else {
                var radius = (size[0]+size[1]+size[2])*0.90;
              }
            var image = "";
            var spiralData="";
            var fileName = document.querySelector("#fileUpload").value;
            if (fileName.length > 0) {
                uploadFile();
                observer.contentCoolDown = 100;
                setTimeout(function () { observer.contentCoolDown = 0; }, 2000);
                fileName = fileName.replace("C:","").split(/[\\/]/).pop();
                fileName = "uploads/"+world+"/"+fileName;
                if (/\.(?:jpe?g|gif|png)$/i.test(fileName)) {
                    var maxSide = Math.max(size[0], size[1], size[2]);
                    size[0] = size[1] = size[2] = maxSide;
                    image = fileName;
                    material = "spiralmap";
                    spiralData = observer.locallyScannedSpiralData;
                    //customTextures[image] = THREE.ImageUtils.loadTexture(image,THREE.UVMapping);
                }
                radius *= 1.1;
            }
				document.getElementById('fileUpload').value = "";
				three.camera.updateMatrixWorld();
				var marker = new THREE.Vector3();
                forward.translateZ((size[1]+size[0]+size[2])*this.scale/2);

				marker = marker.setFromMatrixPosition(forward.matrixWorld);
				var position = [marker.x,
								marker.y,
								marker.z]
				var quaternion = [camera.quaternion.x,
							  camera.quaternion.y,
							  camera.quaternion.z,
							  camera.quaternion.w];

				if (shape == "cylinder") {
					tmpQuaternion = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
					rotateQuaternion = new THREE.Quaternion();
					vector = new THREE.Vector3(1,0,0);
					rotateQuaternion.setFromAxisAngle( vector, Math.PI/2 );
					tmpQuaternion.multiplySelf( rotateQuaternion );
					tmpQuaternion.normalize();
					quaternion = [tmpQuaternion.x,tmpQuaternion.y,tmpQuaternion.z,tmpQuaternion.w];
				}

				var physics = "Solid";//document.getElementById('objectPhysicsSelect').value;
				var text = document.getElementById('objectTextTextbox').value;
				if(text.length>0){ radius*=1.15; }
				var behaviour = "";
				var link = document.getElementById('objectLinkTextbox').value;
                document.getElementById('objectLinkTextbox').value = "";
				if (/\.(?:jpe?g|gif|png)$/i.test(link)) {
					image = link;
                    console.log("image "+image);
				}
				link = link.replace(":","<colon>");
				sound="Not_Implemented";
				extra="";
				var subspace = document.getElementById('worldPortal').value;
                if (subspace == "Select World") {
                    subspace = "";
                }
                if (subspace.length > 0) {
                    shape = "sphere";
                    radius *= 1.15;
                    var portalData = null, wCtr = worldSettings.worlds.length-1;
                    while (wCtr >= 0) {
                        console.log(wCtr,worldSettings.worlds[wCtr]);
                        portalData = worldSettings.worlds[wCtr];
                        if (portalData.subspace == subspace) {
                            color = portalData.color;
                            if(portalData.material !="customImage" && portalData.material !="spiralmap") {
                                material = portalData.material;
                            }
                        }
                        wCtr --;
                    }
                }
                document.getElementById('worldPortal').value = "Select World";
				key = document.getElementById('objectKeyTextbox').value;
				keyFlag=false;
				if (key != "") {
					text = encrypt(text,key);
					keyFlag = true;
				}
				// check for object close to this one to append to
				var proximityEntity = null; proximityEntity = rayCast();
				var pointedAtEntity = proximityEntity.entity;
				appendMode = false;
				if (pointedAtEntity != null  && observer.coolDownProgress < 1) {
				//console.log((proximityEntity.e.size[0]+proximityEntity.e.size[1]+proximityEntity.e.size[2])/3);
				console.log("proximityEntity.entity!=null");/*((size[2]+600))*/  // if its close and your pointing at it
					if(proximityEntity.distance<(3000+pointedAtEntity.radius) && pointedAtEntity.geometry!="sphere" && pointedAtEntity.subspace.length<1) {
						appendMode = true;
						console.log("trying to append object");
						firstMesh = proximityEntity.entity.mesh;
                        firstEntity = firstMesh.entity;
                        if(firstEntity.extra==""){
                            console.log("no extra parts yet");
                            firstEntity.extra = "<ExtraPart>"+firstEntity.geometry+",add,"+"0,0,0,"+
                                                                                firstEntity.size[0]+","+
                                                                                firstEntity.size[1]+","+
                                                                                firstEntity.size[2]+","+
                                                                                firstMesh.quaternion.x+","+
                                                                                firstMesh.quaternion.y+","+
                                                                                firstMesh.quaternion.z+","+
                                                                                firstMesh.quaternion.w+","+
                                                                                firstEntity.material+","+
                                                                                firstEntity.color[0]+","+firstEntity.color[1]+","+firstEntity.color[2];
                                                                                console.log(firstEntity.extra);
                        }
						var mode = "add";
						var position = [position[0]-firstMesh.position.x,position[1]-firstMesh.position.y,position[2]-firstMesh.position.z];
						proximityEntity.entity.extra += "<ExtraPart>"+shape+","+mode+","+position[0]+","+position[1]+","+position[2]
										+","+size[0]+","+size[1]+","+size[2]+","+quaternion[0]+","+quaternion[1]+","+quaternion[2]+","
										+quaternion[3]+","+material+","+color[0]+","+color[1]+","+color[2];;


                        entitiesNode.remove(proximityEntity.entity.mesh);

                        var farthestPart = proximityEntity.entity.radius;
                        var parsedExtra = proximityEntity.entity.extra.split("<ExtraPart>");
                        for (var pe = 0; pe < parsedExtra.length; pe++) {
                            var part = parsedExtra[pe];
                            part = part.split(",");
                            partDistance = Math.sqrt(Math.pow(part[2],2)+Math.pow(part[3],2)+Math.pow(part[4],2));
                            if (partDistance > farthestPart) {
                                farthestPart = partDistance * 1.5;
                            }
                        }
               proximityEntity.entity.radius = farthestPart;

                             newEntity = addEntityFromDescription(proximityEntity.entity.name,
					    		proximityEntity.entity.id,
					    		proximityEntity.entity.containingWorldKey,
					 		   proximityEntity.entity.geometry,
					  		  proximityEntity.entity.material,
					  		  proximityEntity.entity.color,
				          		  proximityEntity.entity.size,
					  		 [proximityEntity.entity.mesh.position.x,proximityEntity.entity.mesh.position.y,proximityEntity.entity.mesh.position.z,proximityEntity.entity.mesh.position.w],
					  		  proximityEntity.entity.fileName,
					  		 [ proximityEntity.entity.mesh.quaternion.x,proximityEntity.entity.mesh.quaternion.y,proximityEntity.entity.mesh.quaternion.z,proximityEntity.entity.mesh.quaternion.w],
					  		  proximityEntity.entity.physics,proximityEntity.entity.behaviour,proximityEntity.entity.text,proximityEntity.entity.link,proximityEntity.entity.image,
					  		  proximityEntity.entity.sound,proximityEntity.entity.subspace,proximityEntity.entity.keyFlag,proximityEntity.entity.extra,proximityEntity.entity.spiralData,proximityEntity.entity.radius);
                            console.log(newEntity);
					/* Update radius of entity accounting for all extra parts */
					saveEntity(proximityEntity.entity,true); // DO  update
                    //deleteEntity(proximityEntity.entity);
					}
				}
				if (!appendMode && observer.coolDownProgress < 1) {
					if (false && spiralData=="" && image!="" && spiralTextures[image] == undefined) { // disabled for now
                        var xhr = new XMLHttpRequest();
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState == 4 && xhr.status == 200) {
                                if(observer.keys.leftShift == true) {
                                    if(pointedAtEntity != null) {
                                        proximityEntity = pointedAtEntity;
                                        console.log(pointedAtEntity);
                                        // snap angle
                                        var quaternion = [pointedAtEntity.mesh.quaternion.x,pointedAtEntity.mesh.quaternion.y,pointedAtEntity.mesh.quaternion.z,pointedAtEntity.mesh.quaternion.w];
                                    }
                                }
                                var maxSide = Math.max(size[0], size[1], size[2]);
                                size[0] = size[1] = size[2] = maxSide;
                                newEntity = addEntityFromDescription(name,-1,world,shape,"plastic",color,size,
                                      position, fileName, quaternion,
                                      physics,behaviour,text,link,image,sound,subspace,keyFlag,extra, xhr.responseText, radius);

                                saveEntity(newEntity);
                                console.log(newEntity);
                                fadeIn(newEntity);
                                image = "";
                            }
                        }
                        xhr.open("GET","spiralMap2.php?quality=1024&image="+image+"&", true);
                        xhr.send();
                    } else {
                       if (observer.keys.leftShift == true) {
						  if (pointedAtEntity != null) {
							proximityEntity = pointedAtEntity;
							console.log(pointedAtEntity);

                                quaternion = [pointedAtEntity.mesh.quaternion.x,pointedAtEntity.mesh.quaternion.y,pointedAtEntity.mesh.quaternion.z,pointedAtEntity.mesh.quaternion.w];
                          }
					   }
                        if (spiralTextures[image] != undefined) {
                            console.log("detecting existing texture and propagating backup spiraldata")
                            var spiralData = spiralTextures[image].spiralData;
                        }

                        var newEntity = addEntityFromDescription(name, -1, world, shape,
					  		  material, color, size, position, fileName, quaternion,
					  		  physics, behaviour, text, link, image, sound, subspace,
                                keyFlag, extra, observer.locallyScannedSpiralData, radius);
					   saveEntity(newEntity);
					   console.log(newEntity);
					   fadeIn(newEntity);
//                        var synthesisSound = document.createElement("audio");
//                        synthesisSound.setAttribute("src",sounds.energy);
//                        synthesisSound.setAttribute("style","display:none;");
//                        synthesisSound.setAttribute('controls',false);
//                        synthesisSound.play();
                    }


				}
			},
	selectObject: function selectObject (otherEntity) {
				var e = null;
                if (otherEntity) {
                    e = otherEntity;
                } else {
                   /*if(postProcessingLevel>2)
                    {
                        observer.selectedEntity = observer.pointedAtEntity;
                        e = observer.selectedEntity;
                    } else {*/
                    if (worldSettings.options.general.rangedSelectObject) {
                        var pointedAtEntity = rayCast();
                        e = pointedAtEntity.entity;
                    }
                }
				if (e == null) {
                    selectedIndicator.visible = false;
				} else {
                    console.log(e);
					observer.previouslySelectedEntity = observer.selectedEntity;
					observer.selectedEntity = e;
					if(selectedIndicator == null) { // if selectedIndicator doesn't exist...
						//create selectedIndicator
						var indicatorMaterial = descriptionToMaterial("selectedIndicator");
						indicatorMaterial.wireframe = true;
						indicatorMaterial.wireframeLinewidth =  2;
						selectedIndicator = new THREE.Mesh(new THREE.BoxGeometry(800,800,800),indicatorMaterial);
						//selectedIndicator = new THREE.Mesh(new THREE.SphereGeometry(600,8,8),descriptionToMaterial("selectedIndicator"));
						three.scene.add(selectedIndicator);
					}
                   selectedIndicator.visible = true;
                    var indicatorScale = (0.25+observer.selectedEntity.radius/500.0);
                    //console.log(indicatorScale);
                    selectedIndicator.scale.set(indicatorScale,indicatorScale,indicatorScale);
					//move selectedIndicator
					selectedIndicator.position.set(e.mesh.position.x,e.mesh.position.y,e.mesh.position.z);

					document.getElementById('objectNameTextbox').setAttribute('value',e.name);
					if(e.subspace.length<1 && e.geometry!=""){ document.getElementById('objectShapeSelect').value=e.geometry; }
					var materialAllowed = false;
                    [].forEach.call(document.querySelector("#objectMaterialSelect").options,function(o){
                       if(o.getAttribute("value") == e.material){
                           materialAllowed = true;
                           //console.log("material allowed");
                           //console.log([o.getAttribute("value") , e.material]);
                           return;
                       }
                    });
                    if(materialAllowed){
                         document.getElementById('objectMaterialSelect').value=e.material;
                    }

                    document.getElementById('RedSliderControl').value=e.color[0];
					document.getElementById('GreenSliderControl').value=e.color[1];
					document.getElementById('BlueSliderControl').value=e.color[2];

					document.getElementById('XSliderControl').setAttribute('value',e.size[0]);
					document.getElementById('YSliderControl').setAttribute('value',e.size[1]);
					document.getElementById('ZSliderControl').setAttribute('value',e.size[2]);
					///sliders!
					actionPanel.updateSliderColor();

					//document.getElementById('objectPhysicsSelect').value=e.physics;
					if (e.text!="") {
						decodedText=e.text;
						//decodedText = unescape(decodedText);   // test<script>test()</script>test
						//decodedText = decodedText.replace("<colon>",":");
						if (e.key) {
							key = prompt("Enter the encryption key for this object's text: ");
							decodedText = encrypt(decodedText,key,true);
						}
						var hasScript = decodedText.search("<script>");
						var set=decodedText;
						if (hasScript!=-1) {
							set = set.split("<script>");
							set = set[0]+set[1].split("</script>")[1];
						}
                        ///[].forEach.call(document.scripts,function(s){eval(s.innerHTML);});
						lightBoxViewer.lightBox("<h2'>This object contains information:</h2>",set);
						if (hasScript!=-1) {
							decodedText = decodedText.split("<script>");
							set = decodedText[1].split("</script>");
							scriptElement = document.createElement("script");
							scriptElement.innerHTML=set[0];
							document.getElementById("lightBoxContent").appendChild(scriptElement);
						}
					}
					if(e.subspace != "" && typeof(e.subspace) != 'undefined' ) { //&& worldDepth==0 )// no sub - sub worlds for now
						//fly through the portal.
						if(e.subspace != "_UP_ONE_LEVEL_") { // if its a portal that goes deeper
							var xhr = new XMLHttpRequest();
			                xhr.onreadystatechange = function() {
			                    if (xhr.readyState == 4 && xhr.status == 200) {
			                        eval("worldSettings = "+xhr.responseText+";");
			                        observer.enterWorld(worldSettings);
			                    }
			                }
			                xhr.open("POST","/overworld/app/world.php",true);
			                xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			                xhr.send("world="+e.subspace+"&");
						} else { // go up a level
							observer.transcend();
						}
					} else {
						if(e.link != "") {
							sanitizedLink = e.link.replace("<colon>",":");
							if(sanitizedLink.search("http://") == -1) {
								if(sanitizedLink.search("https://")==-1) {
									sanitizedLink = "http://"+sanitizedLink;
								}
							}
lightBoxViewer.lightBox("This object has a hyperlink:","<iframe sandbox='allow-forms allow-same-origin allow-scripts'  style='width:100%;height:100%;' src="+sanitizedLink+"></iframe>");
						}
					}
					if(e.fileName!="" && !(/\.(?:jpe?g|gif|png)$/i.test(e.fileName) && e.subspace!="") ) {
                        lightBoxViewer.lightBox("This object has a file attached:","<a target='_blank' href='"+e.fileName+
                        	"'><h2 style='margin-top:2%;text-align:center;width:100%;'>Right Click and Save Link to Download</h2>"+
                        	"<img style='width:66%;display:block;margin:auto;margin-top:10px;' src='"+e.fileName+"' alt='"+e.fileName+"'/></a>");
					}
					//document.getElementById('modifyButton').setAttribute('style','visibility:true');
				}
		},
        modifyObject: function modifyObject () {
                entity = observer.selectedEntity;
				if (entity) {
                    var id = entity.id;
                    //get it's quaternion and position to keep things simple for now
                    var position = [entity.mesh.position.x,entity.mesh.position.y,entity.mesh.position.z];
                    var quaternion = [entity.mesh.quaternion.x,entity.mesh.quaternion.y,entity.mesh.quaternion.z,entity.mesh.quaternion.w];
                    //text=entity.text;
                    var link=entity.link;
                    var subspace=entity.subspace;
                    //cc =  "X"+Math.round(entity.mesh.position.x/50000)+"Y"+Math.round(entity.mesh.position.y/50000)+"Z"+Math.round(entity.mesh.position.z/50000);
                    //thing to find for modify
                    //make a new one with the new specifications
                    var name = document.getElementById('objectNameTextbox').value;
                    var shape = document.getElementById('objectShapeSelect').value;
                    var material = document.getElementById('objectMaterialSelect').value;
                    var color = [document.getElementById('RedSliderControl').value,
                         document.getElementById('GreenSliderControl').value,
                         document.getElementById('BlueSliderControl').value];
                    var size = [document.getElementById('XSliderControl').value,
                        document.getElementById('YSliderControl').value,
                        document.getElementById('ZSliderControl').value];
                    var physics = "Not_Implemented"; //document.getElementById('objectPhysicsSelect').value;
                    var fileName = "";
                    var behaviour = "";
                    var text = document.getElementById('objectTextTextbox').value;
                    text = escape(text);
                    var key = document.getElementById('objectKeyTextbox').value;
                    var keyFlag = false;
                    if (key != "") {
                        text = encrypt(text, key);
                        keyFlag = true;
                    } else {
                        keyFlag = false;
                    }
                    var image="";
                    var sound="";
                    var link = document.getElementById('objectLinkTextbox').value;
                    var extra = entity.extra;
                    var newEntity = addEntityFromDescription(name,
                            id,
                            entity.containingWorldKey,
                            shape,
                            material,
                            color,
                                size,
                            position,
                            fileName,
                            quaternion,
                            physics,behaviour,text,link,image,sound,subspace,keyFlag,extra,spiralData,radius);
                    saveEntity(newEntity);
                    //remove old entity
                    entitiesNode.remove(entity.mesh);
				}
			},
	deleteObject: function deleteObject () {
				var selectedEntity = observer.selectedEntity,
				    cc = selectedEntity.cc;
                if (!worldSettings.options.destructive.deleteObject) {
                    return;
                }
				if (selectedEntity) {
					//may be a problem
					deleteEntity(selectedEntity);
				    physicsWorker.postMessage('{"command":"removeObject","data":{"id":'+selectedEntity.id+',"worldKey":"'+world+'"}}');
                    socket.emit('remove entity','{"id":'+selectedEntity.id+',"userId":'+this.userId+',"world":"'+worldSettings.subspace+'"}');
					//entities[cc].splice(entities[cc].indexOf(selectedEntity),1); //remove the entity from memory
					//just set the name textbox to '' and dont reset everything else, because that's annoying
					document.getElementById('objectNameTextbox').setAttribute('value','');
                    this.selectedEntity = false;
				} else if (false) {
                    var entity = selectedEntity;
                    console.log(entity);
					//alert('proximity');
					var shape = document.getElementById('objectShapeSelect').value;
					var size = [parseFloat(document.getElementById('XSliderControl').value),
						parseFloat(document.getElementById('YSliderControl').value),
						parseFloat(document.getElementById('ZSliderControl').value)];

					mesh = null;
                    entitiesNode.remove(entity.mesh);
                    entitiesNode.add(mesh);
                    entity.mesh = mesh;

					//just set the name textbox to '' and dont reset everything else, because that's annoying
					document.getElementById('objectNameTextbox').setAttribute('value','');
				}
			},
	switchTool: function switchTool (direction, absolute) {
				observer.currentTool += direction;
				if(observer.currentTool == tools.length) {
					observer.currentTool = 0;
				} else if(observer.currentTool < 0) {
					observer.currentTool = tools.length-1;
				}
                if (typeof absolute != 'undefined') {
                    observer.currentTool = direction;
                }
				if(observer.currentTool == 0 || observer.currentTool == 1) {//weapon or place object
					forward.visible = true; //show crosshair
				} else {
					forward.visible = false;
				}
				document.getElementById('toolSettingsTitle').innerHTML=tools[observer.currentTool];
				document.getElementById('selectedActionName').innerHTML=tools[observer.currentTool];
			},
	updateForward: function updateForward(forwardScale) {
                var color = [0,0,0];
				var shape;
				var size=[];
				var	shape=document.getElementById('objectShapeSelect').value;
				var	size = [parseFloat(document.getElementById('XSliderControl').value * this.scale),
						parseFloat(document.getElementById('YSliderControl').value * this.scale),
						parseFloat(document.getElementById('ZSliderControl').value * this.scale)];
				var zTranslate;
				var mat = new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,wireframeLinewidth: 1,fog:false});
				var mesh;
				var fileName;
				switch(shape) {
				case "block":
					mesh = new THREE.Mesh(blockGeometry,mat);
					mesh.scale.set(size[0],size[1],size[2]);
					zTranslate = 0;
				 break;
				case "box":
					mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mat);
					zTranslate = 0;
				break;
				case "sphere":
					mesh = new THREE.Mesh(new THREE.OctahedronGeometry((size[0]+size[1]+size[2])/3,3),mat);
				    zTranslate = 0;
				break;
				case "plane":
					mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),mat);
					mat.side = 2;
					zTranslate = 0;
				break;
				case "cylinder":
					mesh = new THREE.Mesh(THREE.CylinderGeometry(size[0],size[0],(size[1]+size[2])/40, 16, 1, false),mat);
					zTranslate = 0;
				break;
				case "arrow":
					mesh = new THREE.Mesh(arrowGeometry,mat);
					zTranslate = 0;
				break;
				}
                 mesh.material = mat;
                if (forwardScale){
                   forwardScale *= observer.scale;
                    mesh.scale.set(1/forwardScale,1/forwardScale,1/forwardScale);
                    forward.scale.set(forwardScale,forwardScale,forwardScale);
                    forward.position.set(0,0,(-(size[2]/2)-600)*forwardScale);
                } else {
                    mesh.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);
                    forward.scale.set(this.scale,this.scale,this.scale);
                    forward.position.set(0,0,(-(size[2]/2)-600)*this.scale);
                }
				forward.updateMatrix();
				forward.remove(forward.children[0]);
				forward.add(mesh);
				mesh.rotation.set(0,0,-Math.PI/4);
				mesh.position.set(0,0,zTranslate);
				mesh.updateMatrix();
			},
        coolDown: function coolDown() {
            observer.coolDownProgress *= 0.95;
            observer.updateForward(observer.coolDownProgress);
            if(observer.coolDownProgress > 1) {
                setTimeout(observer.coolDown,16);
            } else {
                //forward.visible = false;
                forward.remove(forward.children[0]);
            }
        }
	};


    // scan local image
    // 1v4522bc887632ffee77223388xffffff000000...
    function scanLocalImage (evt) {
        var files = evt.target.files;
        var reader = new FileReader();
        reader.onload = function (frEvent) {
            if (files[0].type.match("image.*")) {
                var tmpImage = document.createElement("img");
                tmpImage.setAttribute("src", frEvent.target.result);
                if (!spiralTextures[files[0].fileName]) {
                    var cvs = document.createElement("canvas"),
                        ctx = cvs.getContext("2d"),
                        frame, frameData, spiralData = "1v",
                        color = "",
                        halfHeight = tmpImage.height / 2,
                        halfWidth = tmpImage.width / 2,
                        radius = Math.min(halfWidth, halfHeight) / 2,
                        numRings = 48,
                        numCircles = 0,
                        ring = 0, circle = 0,
                        theta = 0, xCoord = 0, yCoord = 0,
                        index = 0,
                        pixelRatio = window.devicePixelRatio;
                    imageAspect = halfWidth / halfHeight;
                    function getHexColor(idx, data) {
                        var s = -1,
                            out = "",
                            color = "";
                        while (s++ < 2) {
                            console.log(s);
                            color = data[index + s].toString(16);
                            out += (color.length < 2 ? "0" + color : color);
                        }
                        return out;
                    }
                    cvs.setAttribute("width", tmpImage.width);
                    cvs.setAttribute("height", tmpImage.height);
                    ctx.drawImage(tmpImage, 0, 0);
                    frame = ctx.getImageData(0, 0, cvs.width, cvs.height)
                    frameData = frame.data;
                    spiralData += getHexColor(0, frameData);
                    spiralData += getHexColor((cvs.width) * 4, frameData);
                    spiralData += getHexColor((cvs.width * (cvs.height - 1) + 1) * 4, frameData);
                    spiralData += getHexColor(((cvs.width * (cvs.height)) * 4) -1, frameData);
                    spiralData += "x";
                    for (ring = 0; ring < numRings; ring++) {
                        numCircles = numRings - ring;
                        for (circle = 0; circle < numCircles; circle++) {
                            theta = 0.1 * (numRings - ring) + circle / numCircles * Math.PI * 2;
                            xCoord = Math.round(halfWidth + (Math.sin(theta) * radius * (ring / numRings)));
                            yCoord = Math.round(halfHeight + (Math.cos(theta) * radius * (ring / numRings)));
                            index = (xCoord + (yCoord * cvs.width)) * 4;
                            color = frameData[index].toString(16);
                            spiralData += (color.length < 2 ? "0" + color : color);
                            color = frameData[index + 1].toString(16);
                            spiralData += (color.length < 2 ? "0" + color : color);
                            color = frameData[index + 2].toString(16);
                            spiralData += (color.length < 2 ? "0" + color : color);
                        }
                    }
                    observer.locallyScannedSpiralData = spiralData;
                }
            }
        }
        reader.readAsDataURL(files[0]);
    }

	window.onresize = function () {
		if( params['s']=='1') {
			three.renderer.setSize(window.innerWidth,window.innerHeight);

		} else {
//			if(!tabletMode || navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
//			{
//				renderer.setSize( window.innerWidth, window.innerHeight );
//			} else {
//				renderer.setSize( window.innerWidth/upScalinlog(spiralg, window.innerHeight/upScaling ); //dont use high dpi so tablets can get a decent frame rate
//			}
            renderer.setSize( window.innerWidth, window.innerHeight );
                //three.renderer.setSize(window.innerWidth,window.innerHeight);
//			if(postProcessingLevel > 2){
//                three.composer.reset();
//                postprocessing.camera.aspect = window.innerWidth / window.innerHeight;
//			    postprocessing.camera.updateProjectionMatrix();
//            }
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		}
	};

	if (typeof(params['p']) != 'undefined'){
		position = params['p'].split(",");
		observer.node.position.set(parseFloat(position[0]),parseFloat(position[1]),parseFloat(position[2]));
	}

    actionPanel.initSliders();

	colorSliders[0].value = Math.random();
    colorSliders[1].value = Math.random();
    colorSliders[2].value = Math.random();
    colorSliders[0].onchange();

	gui.visible = false;

    leftPanel.style.display = "none";
    actionPanel.style.display = "none";
      // create wrapper object that contains three.js objects
    three.renderer = renderer;
    three.camera = camera;
     //FirstLoadModels
    modelsToLoad = 2;
    ModelLoader.load( "graphics/3d/blockGeometry.js", function( geometry ) {
        blockGeometry = geometry;
         blockGeometry.buffersNeedUpdate = true;
         blockGeometry.uvsNeedUpdate = true;
         //blockGeometry.computeVertexNormals();
         //blockGeometry.computeFaceNormals();
		modelsToLoad--;
    } );

	//Load models!!
    ModelLoader.load( "graphics/3d/arrowGeometry.js", function( geometry ) {
        arrowGeometry = geometry;
		modelsToLoad--;
    } );

    three.clock = new THREE.Clock();

	function startAnimation() {
		console.log("starting animation");
  		if(params['s'] == '1') {
        	animate = sbs3dAnimate; // for smart tv
        } else {
			if (postProcessingLevel == 3) {
                animate = dofAnimate;
            } else {
                animate = singleRenderAnimate;  //dofAnimate; // not using depth of field effect at the moment
            }
		  }
        console.log([mobile, observer, gui, !mobile ? plasmaUniforms : null]);
        //init lens flares
       // if (postProcessingLevel > 1) {
            (function() {
                var flareColor = new THREE.Color( 0xffffff );
                var lensFlare = new THREE.LensFlare( textures.glowTexture, 256, 0.02, THREE.AdditiveBlending, flareColor );
                three.lensFlare = lensFlare;
                lensFlare.add( textures.glowTexture , 128, 0.01, THREE.AdditiveBlending );
                //lensFlare.add( textures.glowTexture, 240, 0.1, THREE.AdditiveBlending );
                lensFlare.add( textures.glowTexture, 32, 0.01, THREE.AdditiveBlending );
                lensFlare.add( textures.glowTexture, 64, 0.01, THREE.AdditiveBlending );
                lensFlare.add( textures.glowTexture, 256, 0.02, THREE.AdditiveBlending );
//              lensFlare.add( textures.glowTexture, 32, 0.1, THREE.AdditiveBlending );
//              lensFlare.add( textures.glowTexture, 16, 0.1, THREE.AdditiveBlending );
                lensFlare.customUpdateCallback =
                function lensFlareUpdateCallback( object ) {
                    var f, fl = object.lensFlares.length;
                    var flare;
                    var vecX = -object.positionScreen.x * 6;
                    var vecY = -object.positionScreen.y * 6;
                    for ( f = 0; f < fl; f++ ) {
                        flare = object.lensFlares[ f ];
                        flare.x = object.positionScreen.x + vecX * flare.distance;
                        flare.y = object.positionScreen.y + vecY * flare.distance;
                        flare.rotation = 0;
                    }
                    object.lensFlares[ 2 ].y += 0.025;
//                    object.lensFlares[ 2 ].x += 0.125;
                    object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad( 45 );
                };
                lensFlare.position.copy( three.light.position );
                three.scene.add( lensFlare );
            })();
        //}
		animate(mobile, observer, gui,  !mobile ? plasmaUniforms : null);
	}

	function checkModelsAreLoaded() {
		if(modelsToLoad <= 0) {
			console.log("all models loaded");
            if(!params['w']) {
                loadEntities();
                if(!params['p'])
                {
                   camera.position.set(-6000+Math.random()*12000,-6000+Math.random()*12000,-6000+Math.random()*12000);
                   camera.lookAt(new THREE.Vector3(0,0,0));
                } else {
                    var position = params['p'].split(",");
                    camera.position.set(parseFloat(position[0]),parseFloat(position[1]),parseFloat(position[2]));
                }

//                addEntityFromDescription("Test",1,[0,0,0],"box","sky",[1,1,1],[1600,900,400],[0,0,-335],"",[0,0,0,0],"","","","","","","",false,"","",100);
//                normalMouse = true;
//                controls.update = function(){};
//                camera.position.set(0,0,0);
//                camera.lookAt(new THREE.Vector3(0,0,-335));

			     startAnimation();
            } else {
                xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function()
                {
                    if (xhr.readyState==4 && xhr.status==200)
                    {
                        eval("worldSettings = "+xhr.responseText+";");
                        observer.enterWorld(worldSettings);
                        startAnimation();
                    }
                }
                xhr.open("POST","/overworld/app/world.php",true);
                xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
                xhr.send("world="+params['w']+"&");
            }
		} else {
			console.log("waiting for models to load");
			setTimeout(function(){checkModelsAreLoaded();},200);
		}
	}

	checkModelsAreLoaded();
  	//set count down to hide hud
  	setTimeout(function(){fade(document.querySelectorAll(".menuPrompt, .selectedAction"),0);},6000);

    //GO

   physicsWorker = new Worker('js/physics.js');
    physicsWorker.onmessage = function(event) {
        data = JSON.parse(event.data);
        if(data.command == "update"){
             physicsWorker.postMessage('{"command":"update","data":{"position":['+observer.node.position.x+
                                                                ','+observer.node.position.y+
                                                                ','+observer.node.position.z+
                                                    '],"velocity":['+observer.velocity.x+
                                                                ','+observer.velocity.y+
                                                                ','+observer.velocity.z+'],"scale":'+observer.scale+'}}');
        } else if(data.command == "collision") {
            //console.log("collision");
            //console.log(data.data);
            if(data.data.contentFlag==1){
                entitiesNode.children.forEach(function(worldMesh) {
                    worldEntity = worldMesh.entity;
                   if(data.data.id == worldEntity.id && worldEntity != observer.selectedEntity){
                       if (observer.contentCoolDown <= 0) {
                            observer.selectObject(worldEntity);
                       }
                       //return;
                   }
                });
            }
            observer.velocity.set(data.data.newVelocity[0],data.data.newVelocity[1],data.data.newVelocity[2]);
        } else {
            console.log(data);
        }

    };

    physicsWorker.postMessage('{"command":"start","data":""}');

	function desktopHandleMouseUp (event) {
				observer.mouseDown=false;
				if('which' in event) {
					if(event.which==1) {
						observer.mouseDown=false;
						if (Settings.fullscreen) { //if(!normalMouse) {
							switch(observer.currentTool) {
								case 1:
                                    if(observer.allowAdd){
                                        observer.placeObject();
                                    }
                                    if(observer.coolDownProgress < 1){
                                        observer.coolDownProgress = 6.0;
                                        observer.coolDown();
                                    }
									forward.visible = false;
								break;
								case 2:
									forward.remove(forward.children[0]);
									forward.visible=false;
								break;
							}
						}
					} else if(event.which==3) {
						forward.visible = false;
					}
				}
   			};

   function desktopHandleMouseDown (event) {
       			if ('which' in event) {
					if (event.which==1) {
						observer.mouseDown = true;
						if (!normalMouse) {
							if (mobile) {
								if (event.x<100 && event.y<100){
									gui.toggleMenu();
								}
							}
                            if (Settings.fullscreen) {
                                switch (observer.currentTool) {
                                    case 0:
                                    if (observer.weaponReady) {
                                        observer.fireWeapon(3);
                                    }
                                    break;
                                    case 1:
                                        forward.visible = true;
                                        observer.allowAdd = observer.coolDownProgress < 1.0;
                                        observer.updateForward();
                                    break;
                                    case 2:
                                        forward.visible=true;
                                        observer.updateForward();
                                        observer.deleteObject();
                                    break;
                                }
                            }
						}
					} else if (event.which == 3){
						forward.visible = true;
						observer.selectObject();
						event.preventDefault();
  						event.stopPropagation();
  						return false;
					}
				}
      		}

    UserInput = {
        camera: null,
        device: null,
        focus: false,
        autoSlowDown: mobile,
        noSpecialAction: true,
        rotationVector: {
            x: 0,
            y: 0,
            z: 0
        },
        tmpQuaternion: null,
        moveVector: null,
        keys: {
            w: false, a: false, s: false, d: false, r: false, f: false, shift: false, space: false
        },
        lastTouch: [[0,0], [0,0]],
        init: function (camera, device) {
            this.connect(camera, device);
            var canvas = document.querySelector("#viewportCanvas");
            canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
            canvas.onclick = function (event) {
                var elem = event.target;
                if (!Settings.fullscreen) {
                    Settings.toggleFullscreen();
                }
                elem.requestPointerLock();
            };
            if ("onpointerlockchange" in document) {
                document.addEventListener('pointerlockchange', lockChangeAlert, false);
            } else if ("onmozpointerlockchange" in document) {
                document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
            } else if ("onwebkitpointerlockchange" in document) {
                document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
            }
            function lockChangeAlert() {
                UserInput.focus =(document.pointerLockElement===canvas||document.mozPointerLockElement===canvas||document.webkitPointerLockElement===canvas);
                Settings.fullscreen = UserInput.focus;
            }
            document.addEventListener("mousemove", function (e) {
                if (UserInput.focus) {
                  UserInput.rotationVector.y = -(e.movementX || e.mozMovementX || e.webkitMovementX || 0) / 300.0;
                  UserInput.rotationVector.x = -(e.movementY || e.mozMovementY || e.webkitMovementY || 0) / 300.0;
                }
            }, false);
            document.addEventListener("keydown", function (event) {
                var keys = observer.keys;
                switch (event.keyCode) {
                    case 87: keys.w = true; break;
                    case 65: keys.a = true; break;
                    case 83: keys.s = true; break;
                    case 68: keys.d = true; break;
                    case 82: keys.r = true; break;
                    case 70: keys.f = true; break;
                    case 81: keys.q = true; break;
                    case 69: keys.e = true; break;
                    case 16: keys.leftShift = true; break;
                    case 32: keys.spaceArrow = true; break;
                }
            }, false);
            document.addEventListener("keyup", function (event) {
                var keys = observer.keys;
                switch (event.keyCode) {
                    case 87: keys.w = false; break;
                    case 65: keys.a = false; break;
                    case 83: keys.s = false; break;
                    case 68: keys.d = false; break;
                    case 82: keys.r = false; break;
                    case 70: keys.f = false; break;
                    case 81: keys.q = false; break;
                    case 69: keys.e = false; break;
                    case 16: keys.leftShift = false; break;
                    case 32: keys.spaceArrow = false; break;
                }
            }, false);
            document.body.addEventListener("touchmove", function (event) {
                if (normalMouse) {
                    return;
                }
                var data = event.touches,
                    touch = data.length,
                    input = UserInput;
                event.preventDefault();
                if (touch < 2) {
                    input.rotationVector.y = (data[0].pageX - input.lastTouch[0][0]) / 10000.0;
                    input.rotationVector.x = (data[0].pageY - input.lastTouch[0][1]) / 10000.0;
                    input.lastTouch = [ [data[touch].pageX, data[touch].pageY], [data[touch].pageX, data[touch].pageY]];
                } else {
                    while (touch-- > 0) {
                        input.moveVector.x -= (data[touch].pageX - input.lastTouch[touch][0]);
                        input.moveVector.z -= (data[touch].pageY - input.lastTouch[touch][1]);
                        input.lastTouch[touch] = [data[touch].pageX, data[touch].pageY];
                    }
                }
                input.autoSlowDown=false;
                clearTimeout(input.autoSlowDownTimeout);
                input.autoSlowDownTimeout = setTimeout(function() {
                    input.autoSlowDown = true;
                    forward.remove(forward.children[0]);
                }, 600);
            }, false);
            document.body.addEventListener("touchstart", function (event) {
                if (normalMouse) {
                    return;
                }
                var data = event.touches,
                    touch = data.length,
                    input = UserInput;
                input.lastTouch = [[0,0],[0,0]];
                input.noSpecialAction = false;
                event.preventDefault();
                while (touch-- > 0) {
                    input.lastTouch[touch] = [data[touch].pageX, data[touch].pageY];
                }
                 if(event.touches[0].pageX<100 && event.touches[0].pageY<100) {
                    exitFullscreen();
                    gui.toggleMenu();
                   // context.removeTouchEvents();
                } else if ((window.innerWidth-event.touches[0].pageX)<100 && event.touches[0].pageY<100) {
                    observer.selectObject();
                    event.preventDefault();
                } else if (event.touches[0].pageX<100 && (window.innerHeight-event.touches[0].pageY<100)) {
                    observer.switchTool(-1);
                    event.preventDefault();
                } else if ((window.innerWidth-event.touches[0].pageX)<100 &&  (window.innerHeight-event.touches[0].pageY<100)) {
                    observer.switchTool(1);
                    event.preventDefault();
                }  else {
                    input.noSpecialAction = true;
                }
                if (input.noSpecialAction) {
                    switch (observer.currentTool) {
                        case 0:
                            if (observer.weaponReady) {
                                observer.fireWeapon(3);
                            }
                        break;
                        case 1:
                            forward.visible=true;
                            observer.allowAdd = observer.coolDownProgress < 1.0;
                            observer.updateForward();
                        break;
                        case 2:
                            forward.visible=true;
                            observer.updateForward();
                            observer.deleteObject();
                        break;
                    }
                }
            }, false);
            document.body.addEventListener("touchend", function (event) {
                if (normalMouse) {
                    return;
                }
                var input = UserInput;
                input.moveVector.x = 0;
                input.moveVector.z = 0;
                forward.remove(forward.children[0]);
                if (input.noSpecialAction) {
                    observer.mouseDown = false;
                    if (UserInput.autoSlowDown && Math.abs(input.lastTouch[0][0]-event.changedTouches[0].pageX)<15 && Math.abs(input.lastTouch[0][1]-event.changedTouches[0].pageY)<15){
                        switch (observer.currentTool) {
                            case 1:
                                if (observer.allowAdd) {
                                    observer.placeObject();
                                }
                                if (observer.coolDownProgress < 1) {
                                    observer.coolDownProgress = 10.0;
                                    observer.coolDown();
                                }
                                forward.visible = false;
                            break;
                            case 2:
                                forward.visible=false;
                            break;
                        }
                        forward.remove(forward.children[0]);
                    }
                }
            }, false);
            this.tmpQuaternion = new THREE.Quaternion();
            this.moveVector = new THREE.Vector3(0, 0, 0);
        },
        connect: function (camera, device) {
            this.camera = camera;
            this.device = device;
            device.userInput = this;
        },
        update: function (delta) {
            var deltaObserverScale = delta*observer.scale*0.04;
            this.tmpQuaternion.set( this.rotationVector.x, this.rotationVector.y, this.rotationVector.z, 1 ).normalize();
            this.rotationVector = { x: 0, y: 0, z: 0};
            this.camera.quaternion.multiply( this.tmpQuaternion );
            this.handleKeys();
            if (this.autoSlowDown) {
                this.device.velocity.multiplyScalar(0.95);
            }
            this.device.velocity.add(this.moveVector.applyQuaternion(this.camera.quaternion));
            this.moveVector.set(0, 0, 0);
            this.camera.matrix.setPosition(this.camera.position.add(new THREE.Vector3(this.device.velocity.x * deltaObserverScale,
                                                                                     this.device.velocity.y * deltaObserverScale,
                                                                                     this.device.velocity.z * deltaObserverScale)) );
            this.camera.matrix.makeRotationFromQuaternion( this.camera.quaternion );
            this.camera.matrixWorldNeedsUpdate = true;
        },
        handleKeys: function () {
            var keys = observer.keys;
            if (keys.a) {  // maybe insert more options here...
                this.moveVector.x = -1.5;
            } else if (keys.d) {
                this.moveVector.x = 1.5;
            }
            if (keys.w) {
                this.moveVector.z = -1.5;
            } else if (keys.s) {
                this.moveVector.z = 1.5;
            }
            if (keys.r) {
                this.moveVector.y = 1.5;
            } else if (keys.f) {
                this.moveVector.y = -1.5;
            }
            if (keys.q) {
                this.rotationVector.z = 0.033;
            } else if (keys.e) {
                this.rotationVector.z = -0.033;
            }
            if (keys.leftShift) {
                this.device.velocity.multiplyScalar(0.9);
                this.rotationVector.z *= 0.9;
            }
        }
    };

    UserInput.init(camera, observer);

	if (!mobile) {
    		document.onkeypress = function keyPressHandler(e) {
                var key = e.which;  //console.log(key);
                if (!normalMouse) {
                    if (key == 99 || key == 67) {
                        gui.temporaryHUD();
                        observer.switchTool(-1);
                    }
                    if (key == 118 || key == 86) {
                        gui.temporaryHUD();
                        observer.switchTool(1);
                    }
                    if (key == 32) { //spacebar
                        gui.temporaryHUD();
                        observer.selectObject();
                    }
                    if ( key == 116 || key == 84) {
                        if(!gui.chatVisible){
                            gui.toggleChat();
                            document.querySelector("#chat-input").focus();
                            e.preventDefault();
                        }
                    }
                }
            }
		document.onkeydown = function keyDownHandler (e){
				var key = e.which;
				switch (key) {
					case 16:
						observer.keys.leftShift = true;
					break;
					case 32:
						forward.visible = true;
						observer.keys.spaceArrow = true;
					break;
					case 27:
						if (!observer.keys.escapeHeld) {
							gui.toggleMenu();
                            observer.keys.escapeHeld = true; //lastly, set escapeHeld to simulate keypress event for firefox
						}
					break;
                    case 49: // 1
                        observer.switchTool(1, true);
                        gui.temporaryHUD();
                    break;
                    case 50: // 2
                        observer.switchTool(2, true);
                        gui.temporaryHUD();
                    break;
                    case 51: // 3
                        observer.switchTool(0, true);
                        gui.temporaryHUD();
                    break;
				}
			}
		document.onkeyup = function keyUpHandler (e) {
				var key = e.which;
				switch(key) {
					case 16:
						observer.keys.leftShift=false;
					break;
					case 32:
						forward.visible = false;
						observer.keys.spaceArrow=false;
					break;
					case 27:
						observer.keys.escapeHeld=false;
					break;
				}
			}

        console.log(localStorage.getItem('firstTimeVersion0.93'));

        if (localStorage.getItem('firstTimeVersion0.93')==null) {
            localStorage.clear();
            localStorage.setItem('firstTimeVersion0.93','no');

            gui.showHelp();
        }

        document.onmouseup = desktopHandleMouseUp;
        document.onmousedown = desktopHandleMouseDown;
	}
};  // end of onload

     window.requestAnimFrame = (function(callback){
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback){
            window.setTimeout(callback, 15);
        };
    })();

/*  window.onContextMenu = function (event) {
        event.preventDefault();
    } */
    function singleRenderAnimate (m,o,g,u) {  //mobile, observer, gui, shader uniforms
        // request new frame
        requestAnimFrame(function () {
            animate(m,o,g,u);
        });
        if (!normalMouse) {
            // sky shader
            if (!m) {
                if(world == "Overworld"){
                    u.time.value += 0.5;
                }
            }
            o.update(three.clock.getDelta()*1000); // update
            if (g.visible) {
                g.update();
            }
            three.renderer.render(three.scene, three.camera); // render
        }

    }



    function compositeAnimate (m,o,g,u) { // mobile, observer, gui, shader uniforms
        requestAnimFrame(function () { // request new frame
            animate(m,o,g,u);
        });
	 	// update
		o.update(three.clock.getDelta()*1000);
    	if (g.visible) {
    		g.update();
    	}
 		// render
		three.composer.render();
    }


    function sbs3dAnimate (m,o,g,u) {
        requestAnimFrame(function () { // request new frame
            animate(m,o,g,u);
        });
        if (!normalMouse) {
            //shader sky
            if (!m) {
                if(world == "Overworld"){
                    u.time.value += 0.5;
                }
            }
            o.update(three.clock.getDelta()*1000);  // update
            if (g.visible) {
                g.update();
            }
            var width = Math.round(window.innerWidth / 2);
            var height = window.innerHeight;
            // Render the scene
            three.renderer.autoClear=true;

            three.renderer.setViewport( 0, 0 , width, height);
            three.renderer.setScissor( 	0 , 0, width, height);
            three.renderer.enableScissorTest ( true );
            three.cameraLeft.aspect = (width *2) / height;
            three.cameraLeft.updateProjectionMatrix();
            three.renderer.render( three.scene, three.cameraLeft);

            three.renderer.setViewport( width, 0, width, height);
            three.renderer.setScissor( 	width , 0, width, height);
            three.renderer.enableScissorTest ( true );
            three.cameraRight.aspect = (width * 2) / height;
            three.cameraRight.updateProjectionMatrix();
            three.renderer.render( three.scene, three.cameraRight);
        }
    }


        function dofAnimate (m, o, g, u) { // mobile, observer, gui, shader uniforms
            requestAnimFrame(function () { //request new frame
                animate(m, o, g, u);
            });
            if (!normalMouse) {
                if (!m) {
                    if (world == "Overworld") {
                        u.time.value += 0.5;
                    }
                }
                o.update(three.clock.getDelta() * 1000); // update
                if (g.visible) {
                    g.update();
                }
                var pointedAtEntity = rayCast();
                o.pointedAtEntity = pointedAtEntity.entity;
                if (!o.pointedAtEntity) {
                    var newFocus = postprocessing.bokeh_uniforms[ "focus" ].value;
                    if (newFocus > 0.03) {
                        postprocessing.bokeh_uniforms[ "aperture" ].value *= 0.95;
                        newFocus  *= 0.87;
                    } else {
                        postprocessing.depthOfField = false;
                    }
                    postprocessing.bokeh_uniforms[ "focus" ].value = newFocus;
                } else {
                   postprocessing.depthOfField = true;   // newFocus = 1 / (Math.sqrt(pointedAtEntity.distance)/100);//0.1+ 0.8 / (pointedAtEntity.distance/1500.0);
                    newFocus = pointedAtEntity.distance; //1 / (pointedAtEntity.distance/13000);
                    if (newFocus > 1) {
                         newFocus = 1;
                    }
                    postprocessing.bokeh_uniforms[ "focus" ].value = (newFocus+postprocessing.bokeh_uniforms[ "focus" ].value)/2.0;
                    postprocessing.bokeh_uniforms[ "aperture" ].value = 0.015;
                }
                three.scene.overrideMaterial = null;
                if (postprocessing.depthOfField) {
                    three.renderer.render( three.scene, three.camera, postprocessing.rtTextureColor, true ); // Render scene into texture
                    three.scene.overrideMaterial = materials.material_depth;
                    three.renderer.render( three.scene, three.camera, postprocessing.rtTextureDepth, true ); // Render depth into texture
                    three.renderer.render( postprocessing.scene, postprocessing.camera ); // Render bokeh composite
                } else {
                    three.renderer.render(three.scene,three.camera);
                }
             }
        }


//Phong Galaxy by Jeremy Evans: Openspacehexagon@gmail.com

//working on loadEntitiesFromLocalStorage();..... !!!!!!!!!!!!!!!!!!!!


var scene;
var renderer;
var three = {camera:null,renderer:null,composer:null,scene:null};
var postprocessing = {enabled: true};
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var height = window.innerHeight - 300;
var material_depth = new THREE.MeshDepthMaterial();
var viewDistance = 60000;
var originalAspectRatio;
var showHelp;
var entities = [];
var loadedCells = [];   // push objects like { key:"X0Y0Z0", index:[-1,0,1]}
var entityUpdateInterval = 4;
var entityUpdateState = 0;
var entityCollisionInterval = 1;
var entityCollisionState=0;
var entitiesNode=[];
var otherPlayers = [];
var entityFiredProjectiles = [];
var bulletUpdateInterval = 0;
var bulletUpdateState = 0;
var gui;
var player;
var playerNode = new THREE.Object3D();
var normalMouse=false;
var tools = ["Fire Bullet(s)","Place Object","Delete Object"];
var forward;
var projectiles;
var skyMaterial;
var bulletMaterial;
var rainbowCircuitMaterial;
var hyperOrganicMaterial;
var colorCircuitTexture;
var distortedCircuitTexture;
var fractalTexture;
var rockTexture;
var hyperPanelTexture;
var pointLight;
var selectedIndicator =null;
var lightBoxViewer;
var nullInput;

//probably want to load the current cell ( plus all cells touching it... they should all be half the view distance... possibly a third would work)
// saved entities will need to have xyz added to their string key as well as a highestId for each locale

function descriptionToMaterial(material,color) //string, array [0,0.5,1]
{
	mat = null;
	var colorEnabled=false;
	switch(material)
	{

		case "bullet":
			mat=bulletMaterial;
		break;
		case "sky":
			mat=skyMaterial;
		break;
		case "solid":
			mat=new THREE.MeshPhongMaterial({color:0xFF0000});
			colorEnabled=true;
		break;
		case "rainbowCircuit":
			mat=rainbowCircuitMaterial;
		break;
		case "colorCircuit":
			mat=new THREE.MeshLambertMaterial({
           		 map:colorCircuitTexture,
			 fog:true
        		});
			colorEnabled=true;
		break;
		case "colorFractal":
			mat=new THREE.MeshLambertMaterial({
           		 map:fractalTexture,
			 fog:true
        		});
			colorEnabled=true;
		break;
		case "wireFrame":
			mat=new THREE.MeshBasicMaterial({
			color:0x8888ff,
			wireframe:true
			});
			colorEnabled=true;
		break;
		case "distortedCircuit":
			mat=new THREE.MeshLambertMaterial({
           		 map:distortedCircuitTexture,
           		 transparent:true,
			 fog:false
        		});
			colorEnabled=true;
		break;
		case "hyperOrganic":
			mat=hyperOrganicMaterial;
		break;
		case "rock":
			mat=new THREE.MeshPhongMaterial({
			  map:rockTexture,
			  fog:true
			});
		break;
		case "selectedIndicator":
			mat=new THREE.MeshBasicMaterial({
			  map:selectedIndicatorTexture,
			  fog:false,
			  transparent:true,
			  side:2
			});
		break;
		case "hyperPanel":
			mat=new THREE.MeshPhongMaterial({
			  map:hyperPanelTexture,
			  fog:true
			});
			colorEnabled=true;
		break;
		case "colorFlow":
			mat=new THREE.MeshPhongMaterial({
			  map:colorFlowTexture,
			  fog:true
			});
			colorEnabled=true;
		break;
		case "colorFlowAlpha":
			mat=new THREE.MeshPhongMaterial({
			  map:colorFlowAlphaTexture,
			  fog:false,
			  transparent:true
			});
			colorEnabled=true;
		break;
		case "baspingo":
			mat=new THREE.MeshPhongMaterial({
			  map:baspingoTexture,
			  fog:true
			});
		break;
		case "rock2":
			mat=new THREE.MeshPhongMaterial({
			  map:rockTexture2,
			  fog:true
			});
		break;

	}
	if(color!=""&&colorEnabled)
	{
			red=parseFloat(color[0]);
			green=parseFloat(color[1]);
			blue=parseFloat(color[2]);
			mat.color.setRGB(red,green,blue);
	}
	return mat;
}

lightBoxViewer = {
		init:function() // call onload
		{
			lightBoxViewer.Container = document.getElementById("lightBoxContainer");
			lightBoxViewer.element = document.getElementById("lightBox");
			lightBoxViewer.content = document.getElementById("lightBoxContent");
		},
		lightBox:function (title,html)
		{
			lightBoxViewer.Container.style.display="block";
			lightBoxViewer.Container.style.height=window.innerHeight+"px";
			lightBoxViewer.content.innerHTML=html;
			showGUI();
		},
		closeLightBox: function ()
		{
			lightBoxViewer.content.innerHTML="";
			lightBoxViewer.Container.style.display="none";
			lightBoxViewer.Container.style.height="0px";
			hideGUI();
		}
	};
function textEdit()
{
	lightBoxViewer.lightBox("Text Edit","<textarea id='textEdit' style='width:100%;height:100%;background:rgba(0,0,0,0.3);color:#fff;'></textarea> ");
	returnButton = document.getElementById('returnButton');
	objectTextTextbox = document.getElementById('objectTextTextbox');
	returnButton.setAttribute('value','Save and close');
	textEditArea = document.getElementById('textEdit');
	saveAndClose = function(){
		objectTextTextbox.value=textEditArea.value;
		//lightBoxViewer.closeLightBox();
		lightBoxViewer.content.innerHTML="";
		lightBoxViewer.Container.style.display="none";
		lightBoxViewer.Container.style.height="0px";

		returnButton.setAttribute('onclick','lightBoxViewer.closeLightBox()');
		returnButton.setAttribute('value','Return');
	};
	returnButton.setAttribute('onclick','saveAndClose()');
	textEditArea.value = objectTextTextbox.value;
	textEditArea.focus();
}

var clock = new THREE.Clock();
var projector = new THREE.Projector();
Entity = function
Entity(name,id,geometry,material,color,mesh,size,physics,behaviour,text,link,image,sound,innerSpace,key,extra,translation)
{
	//xmlhttprequested data will create these in one step
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
	this.innerSpace=innerSpace;
	this.key=key;
	this.extra=extra;
	this.translation=translation;
	this.fadeInProgress=0.0;
	this.explosionProgress=0.0;

	//alert(this.mesh);
	mesh.id=id;
	mesh.entity=this;
	//when an entity is added beside another, it should merge with all the other entities but not here
	this.cc =  "X"+Math.round(mesh.position.x/20000)+"Y"+Math.round(mesh.position.y/20000)+"Z"+Math.round(mesh.position.z/20000);
	if(typeof(entitiesNode[this.cc])=='undefined')
	{
		entitiesNode[this.cc] = new THREE.Object3D();
	}
	entitiesNode[this.cc].add(this.mesh);
}

//addEntityFromDescription("something","something","cube","solid","0,1,0","100,100,100","300,300,300","0,0,0,0");
addEntityFromDescription = function addEntityFromDescription(name,
				 id,
		  /*string cube*/geometry,
		  /*string rock*/material,
		  /*array [r,g,b]*/color,
		  /*array [x,y,z]*/size,
		  /*array [x,y,z]*/position,
		  /*array [x,y,z]*/translation,
		  /*array [x,y,z,w]*/quaternion,physics,behaviour,text,link,image,sound,innerSpace,key,extra)
{
	coords=size;
	//alert(coords[0]);
	xsize=parseFloat(coords[0]);
	ysize=parseFloat(coords[1]);
	zsize=parseFloat(coords[2]);

	mesh = null;




	/*if(text!="")
	{
		duplicate = document.getElementById(text);
		if(!duplicate)
		{
			//text = text.replace("<colon>",":");
			textCanvas = document.createElement("canvas");
			textCanvas.setAttribute("id",text);
			document.body.appendChild(textCanvas);
			textCanvas.setAttribute("style","display:none;");
    			var textCanvasContext = textCanvas.getContext("2d");
   			//console.log(textCanvasContext);
    			textCanvas.width = 512;
    			textCanvas.height = 512;
    			textCanvasContext.fillStyle = "#000000";
    			textCanvasContext.fillRect(0,0,512,512);
    			textCanvasContext.font = "24pt arial";
    			textCanvasContext.textBaseline = "top";
    			textCanvasContext.fillStyle = "rgb("+Math.floor(color[0]*255)+","+Math.floor(color[1]*255)+","+Math.floor(color[2]*255)+")";
    			//console.log(color[0]+" "+color[1]+" "+color[2]);
    			//  margin 35 characters?
    			lines = Math.ceil(text.length/29);
    			//console.log("lines "+lines);
    			if(lines>0)
    			{
    				for(line=0;line<lines;line++)
    				{
    					textLine=text.substr(line*29,29);
    					textCanvasContext.fillText(textLine, 10, line*30);
    				}
    			}
    			else
    			{
    				textCanvasContext.fillText(text, 10, 0);
    			}
		}
		else
		{
			textCanvas = duplicate;
		}

    	       textTexture = new THREE.Texture(textCanvas);
 		//console.log(textTexture);
 		textTexture.needsUpdate=true;
   		textMaterial = new THREE.MeshBasicMaterial({
     		map: textTexture,
     		side:1
    		});
   	       //console.log(textMaterial);
   		//textMaterial.map.needsUpdate = true;
		mat =  textMaterial;
	}*/
	//else
	//{
		mat=descriptionToMaterial(material,color);
	//}

	switch(geometry)
	{
		case "box":
		mesh = new THREE.Mesh(new THREE.CubeGeometry(xsize,ysize,zsize),mat);
		//alert();
		break;
		case "sphere":
		//mesh = new THREE.Mesh(new THREE.SphereGeometry(xsize/2,12,12),mat);
		mesh = new THREE.Mesh(new THREE.OctahedronGeometry((xsize+ysize+zsize)/3,3),mat);
		break;
		case "plane":
			mesh = new THREE.Mesh(new THREE.PlaneGeometry(xsize,ysize),mat);
			mat.side=2;
		break;
		case "cylinder":
			mesh = new THREE.Mesh(new THREE.CylinderGeometry(size[0],size[0],(size[1]+size[2])/40, 16, 1, false),mat);
		break;
	}

	mesh.useQuaternion=true;
	mesh.quaternion= new THREE.Quaternion(parseFloat(quaternion[0]),parseFloat(quaternion[1]),parseFloat(quaternion[2]),parseFloat(quaternion[3]));
	mesh.position.set(parseFloat(position[0]),parseFloat(position[1]),parseFloat(position[2]));



	//add extra parts
	//
	if(extra!="")
	{
		dummyGeometry = new THREE.Geometry();//THREE.Mesh(geometry,mat);
		THREE.GeometryUtils.merge(dummyGeometry,mesh.geometry);
		extra = extra.split('<ExtraPart>');
		for(ep=0;ep<extra.length;ep++)
		{
			extra[ep] = extra[ep].split(",");
			geometry = null;
			switch(extra[ep][0])
			{
				case "box": geometry = new THREE.CubeGeometry(extra[ep][8],extra[ep][9],extra[ep][10]);break;
				case "sphere": geometry = new THREE.OctahedronGeometry((extra[ep][8]+extra[ep][9]+extra[ep][10])/3,3); break;
				case "plane": geometry = new THREE.PlaneGeometry(extra[ep][8],extra[ep][9]); break;
			case "cylinder": geometry = new THREE.CylinderGeometry(extra[ep][8],extra[ep][8],(extra[ep][9]+extra[ep][10])/40, 16, 1, false); break;
			}
			newMesh = new THREE.Mesh(geometry);
			newMesh.position.set(extra[ep][2],extra[ep][3],extra[ep][4]);
			newMesh.updateMatrix();
			newMesh.quaternion.set(extra[ep][11],extra[ep][12],extra[ep][13],extra[ep][14]);
			newMesh.translateX(extra[ep][5]);
			newMesh.translateY(extra[ep][6]);
			newMesh.translateZ(extra[ep][7]);
			newMesh.updateMatrix();
			THREE.GeometryUtils.merge(dummyGeometry, newMesh);
		}
		dummyMesh = new THREE.Mesh(dummyGeometry,mat);
		dummyMesh.position.set(mesh.position.x,
		      		       mesh.position.y,
				       mesh.position.z);
		dummyMesh.quaternion.set(mesh.quaternion.x,
					 mesh.quaternion.y,
					 mesh.quaternion.z,
			    	         mesh.quaternion.w);
		//dummyMesh.updateMatrix();
		mesh = dummyMesh;
	}

	quat = mesh.quaternion;
	pos = mesh.position;

	mesh.matrixAutoUpdate = false;

	mesh.updateMatrix();


	//alert(translation[2]);
	mesh.translateX(parseFloat(translation[0]));
	mesh.translateY(parseFloat(translation[1]));
	mesh.translateZ(parseFloat(translation[2]));

	//mesh.castShadow = true;
      	//mesh.receiveShadow = true;

	mesh.updateMatrix();
	entity = new Entity(name,id,geometry,material,color,mesh,size,physics,behaviour,text,link,image,sound,innerSpace,key,extra,translation);
	if(typeof(entities[entity.cc])=='undefined')
	{
		entities[entity.cc]=[];
	}
	entities[entity.cc].push(entity);
	return entity;
}

blowUp = function (entity)
{
		if(entity)
		{
			if(entity.explosionProgress<2.0)
			{
			entity.explosionProgress+=0.2;
			entity.mesh.material.transparent=true;
			entity.mesh.material.opacity=Math.cos((entity.explosionProgress/2)*Math.PI);
			entity.mesh.scale.set(entity.mesh.scale.x*(1+entity.explosionProgress),
							       entity.mesh.scale.y*(1+entity.explosionProgress),
							       entity.mesh.scale.z*(1+entity.explosionProgress));
			entity.mesh.updateMatrix();

			//setTimeout("blowUp("+e+")",50);
			setTimeout(function(){blowUp(entity)},50);
			}
			else
			{
			//alert('die');
			cc = player.getCurrentContentCellXYZ();
			entitiesNode[cc].remove(entity.mesh);
			localStorage.removeItem(cc+'Entity'+entity.id); //remove the entity from local storage to keep it gone
			entities[cc].splice(entities[cc].indexOf(entity),1);
			numberOfEntities = localStorage[cc+'numberOfEntities']-1; //subtracting one to lower total entity count
			localStorage.setItem(cc+'numberOfEntities',numberOfEntities);

			}
		}
}


function fadeIn(entity)
	{
		if(entity)
		{
			if(entity.fadeInProgress<1)
			{
				entity.fadeInProgress+=0.1;
				entity.mesh.material.transparent=true;
				entity.mesh.material.opacity=entity.fadeInProgress;
				//setTimeout("fadeIn("+e+")",50);

				//could be a problem
				setTimeout(function(){fadeIn(entity)},50);
			}
			else
			{
				if(!entity.material=="distortedCircuit")
				{
					entity.mesh.material.transparent=false;
				}
				entity.mesh.material.opacity=1.0;
			}
		}
	}

function getClosestEntity(from,selectRange)
			{

				small=selectRange;
				id=-1;
				entity=null;
				cc=player.getCurrentContentCellXYZ();
				for(i=0;i<entities[cc].length;i++)
				{
					if(entities[cc][i]!=null)
					{
						e = entities[cc][i];
						distance = Math.sqrt(Math.pow(e.mesh.position.x-from.x,2)+
                                          				 		Math.pow(e.mesh.position.y-from.y,2)+
                                           						Math.pow(e.mesh.position.z-from.z,2)
                                           					      );
                                   	  //  console.log("Distance: "+distance);
						if(distance<small)
						{
							id = i;
							small=distance;
							entity=e;
						}
					}
				}
				proximityEntity=
						{
						e:entity,
						distance:small
						};
			return proximityEntity;

			}

requestUpdate = function requestUpdate()
{
	//ajax code goes here to post player position and actions as well as an integer current upate number
	//which the server will check against it's own count in a file and if the player's number is low,
	//the server will send all world transactions or Entities with id's 1+ the player's and greater
	//the player's data will be sent to a file named after the player or perhaps a time code
	//when the server has to update the position of all players, it will read each of the active player's
	//files backward one line at a time searching until it hits a time code that's older than the server's time code (time between packets)
        // then reads forward the the player updates and echoes them to the player all together
}

FiredProjectile = function FiredProjectile(mesh,timeToLive,speed,direction)
{
	this.mesh=mesh;
	this.timeToLive=timeToLive;
	this.speed=speed;
	this.direction=direction;
}

window.onload = function()
{
	//remove inactivity banner that shouldn't be there
	document.body.removeChild(document.getElementById("facebox"));
	document.body.removeChild(document.getElementById("facebox_overlay"));


	nullInput=document.getElementById("nullInput");
        var lastTime = 0;
      	lightBoxViewer.init();
        hrefParams = location.href.split('?')[1].split('&');
	var params = {};
	for (x in hrefParams)
 	{
		params[hrefParams[x].split('=')[0]] = hrefParams[x].split('=')[1];
 	}


        //renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 0.1, antialias: false } );
        renderer = new THREE.WebGLRenderer();
        three.renderer=renderer;
        //renderer = new THREE.AnaglyphWebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.autoClear = false;

	if(params['ThreeDeeMode']=='Anaglyph')
        {
        	width = window.innerWidth || 2;
	 	height = window.innerHeight || 2;
	 	console.log("anaglyph");
		anaglyphEffect = new THREE.AnaglyphEffect( renderer );
		anaglyphEffect.setSize( width, height );
        }

	//probably want to disable: (!!!!!!)
	//renderer.shadowMapEnabled = true;


        document.body.appendChild(renderer.domElement);
	renderer.setSize(window.innerWidth,window.innerHeight);
	renderer.domElement.setAttribute('style','width:100%;height:100%;');
	// scene
        scene = new THREE.Scene();
        three.scene = scene;
  	scene.fog = new THREE.FogExp2( 0x000016, 0.00005 );

  	//entitiesNode[getCurrentContentCellXYZ()]=new THREE.Object3D();
	//scene.add(entitiesNode[getCurrentContentCellXYZ()]);

    // camera
	originalAspectRatio = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(75, originalAspectRatio, 1, viewDistance);
       // camera.rotation.set(Math.PI,0,0);
	camera.oldPosition = new THREE.Vector3(0,0,0);

	////////////////////
	//// Could be dangerous
	////////////////////
	//camera.rotationAutoUpdate=false;

	scene.add(camera);
	three.camera = camera;

	controls = new THREE.FlyControls( camera,document.body );
        controls.movementSpeed = 1.5;
	//controls.domElement = renderer.domElement;
	controls.domElement = document.body;
	camera.position.y = 0;
        camera.position.z = 0;
	camera.position.x = 0;



	//controls.domElement = document.body;

	controls.rollSpeed = 0.0015;
	controls.autoForward = false;
	controls.dragToLook = false;

	//forward object for forward vector
	forward = new THREE.Mesh(new THREE.CubeGeometry(4.5,4.5,4.5),new THREE.MeshBasicMaterial({color:0x0088ff,wireframe:true}));
	//forward = new THREE.Mesh(new THREE.Object3D());


	camera.add(forward);
	forward.position.set(0,0,-285);
	forward.rotation.set(0,0,Math.PI/4);
	//lights
	light = new THREE.PointLight( 0xffffff, 1, 100000 );//new THREE.SpotLight(0xFFFFFF);
	//light.castShadow = true;
	camera.add(light);
	// effects
	var composer = null;
	var postProcessingLevel=1;
 	postProcessingLevel = params['postProcessing'];
	if(postProcessingLevel==1)
       	{
		var renderModel = new THREE.RenderPass( scene, camera );
		var effectBloom = new THREE.BloomPass( 1.15);
		var effectScreen = new THREE.ShaderPass( THREE.ShaderExtras[ "screen" ] );
		effectScreen.renderToScreen = true;
		composer = new THREE.EffectComposer( renderer );
		three.composer = composer;
		composer.addPass( renderModel );
	}
	if(postProcessingLevel>1)
	{
		//var effectFXAA = new THREE.ShaderPass( THREE.ShaderExtras[ "fxaa" ] );
		//effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	        //composer.addPass( effectFXAA );
	        postprocessing.scene = new THREE.Scene();

		postprocessing.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2,  window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000 );
			postprocessing.camera.position.z = 100;

			postprocessing.scene.add( postprocessing.camera );


                	var	 pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
				postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget( window.innerWidth, height, pars );
				postprocessing.rtTextureColor = new THREE.WebGLRenderTarget( window.innerWidth, height, pars );

				var bokeh_shader = THREE.BokehShader;

				postprocessing.bokeh_uniforms = THREE.UniformsUtils.clone( bokeh_shader.uniforms );

				postprocessing.bokeh_uniforms[ "tColor" ].value = postprocessing.rtTextureColor;
				postprocessing.bokeh_uniforms[ "tDepth" ].value = postprocessing.rtTextureDepth;
				postprocessing.bokeh_uniforms[ "focus" ].value = 0.9;
				postprocessing.bokeh_uniforms[ "aspect" ].value = window.innerWidth / height;
				postprocessing.bokeh_uniforms[ "aperture" ].value =0.033;
				postprocessing.bokeh_uniforms[ "maxblur" ].value = 1.0;

				postprocessing.materialBokeh = new THREE.ShaderMaterial( {

					uniforms: postprocessing.bokeh_uniforms,
					vertexShader: bokeh_shader.vertexShader,
					fragmentShader: bokeh_shader.fragmentShader

				} );

				postprocessing.quad = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight ), postprocessing.materialBokeh );
				postprocessing.quad.position.z = - 500;
				postprocessing.scene.add( postprocessing.quad );
	}
	if(postProcessingLevel==1)
	{

		composer.addPass( effectBloom );
		composer.addPass( effectScreen );
	}
	else
	{
		//camera.quaternion.setFromEuler(new THREE.Vector3(0,0,1),Math.PI);
		controls.update=controls.upsideDownUpdate;
	}

        //sky
	var skyTexture = THREE.ImageUtils.loadTexture("graphics/stars9.jpg");
	skyTexture.wrapS = skyTexture.wrapT =1;
	skyTexture.repeat.set( 1.0, 1.0 );
	skyTexture.needsUpdate = true;
	skyMaterial = new THREE.MeshBasicMaterial({
            map:skyTexture,
	    fog:false,
	    overdraw:true,
	    side:1
        });
	skyMaterial.fog=false;
//        var sky = new THREE.Mesh(new THREE.SphereGeometry(59000, 14, 14),skyMaterial );
sky = new THREE.Mesh(new THREE.OctahedronGeometry(59000,4),skyMaterial);
        //var sky = new THREE.Mesh(new THREE.IcosahedronGeometry(2900,30),skyMaterial);
	sky.overdraw=true;
	//sky.flipSided=true;
	sky.matrixAutoUpdate = false;
	//scene.add(sky);
	scene.add(playerNode);
	playerNode.add(sky);



	//rainbow circuit material
	var rainbowCircuitTexture = THREE.ImageUtils.loadTexture("graphics/alphaRainbowCircuit.png"); //alphaRainbowCircuit
	//rainbowCircuitTexture.wrapS = skyTexture.wrapT =2;
	rainbowCircuitTexture.repeat.set( 1, 1 );
	rainbowCircuitTexture.needsUpdate = true;
	rainbowCircuitMaterial = new THREE.MeshLambertMaterial({
            map:rainbowCircuitTexture,
	    transparent:true,
	    fog:false
        });

	//color circuit texture
	colorCircuitTexture = THREE.ImageUtils.loadTexture("graphics/colorCircuit2.png");
	colorCircuitTexture.repeat.set( 1.0, 1.0 );
    	colorCircuitTexture.wrapS = colorCircuitTexture.wrapT = THREE.RepeatWrapping;
	colorCircuitTexture.needsUpdate = true;

	//selected Indicator texture
	selectedIndicatorTexture = THREE.ImageUtils.loadTexture("graphics/selected.png");
	selectedIndicatorTexture.repeat.set( 1.0, 1.0 );
    	selectedIndicatorTexture.wrapS = selectedIndicatorTexture.wrapT = THREE.RepeatWrapping;
	selectedIndicatorTexture.needsUpdate = true;

	//color flow texture
	colorFlowTexture = THREE.ImageUtils.loadTexture("graphics/colorFlow.png");
	colorFlowTexture.repeat.set( 1.0, 1.0 );
    	colorFlowTexture.wrapS = colorFlowTexture.wrapT = THREE.RepeatWrapping;
	colorFlowTexture.needsUpdate = true;

	//baspingo texture
	baspingoTexture = THREE.ImageUtils.loadTexture("graphics/Baspingo.png");
	baspingoTexture.repeat.set( 1.0, 1.0 );
    	baspingoTexture.wrapS = baspingoTexture.wrapT = THREE.RepeatWrapping;
	baspingoTexture.needsUpdate = true;

	//color flow with alpha texture
	colorFlowAlphaTexture = THREE.ImageUtils.loadTexture("graphics/colorFlowAlpha.png");
	colorFlowAlphaTexture.repeat.set( 1.0, 1.0 );
    	colorFlowAlphaTexture.wrapS = colorFlowAlphaTexture.wrapT = THREE.RepeatWrapping;
	colorFlowAlphaTexture.needsUpdate = true;

	//rock texture
	rockTexture = THREE.ImageUtils.loadTexture("graphics/rock.png");
	rockTexture.repeat.set( 1.0, 1.0 );
    	rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
	rockTexture.needsUpdate = true;

	//rock texture
	rockTexture2 = THREE.ImageUtils.loadTexture("graphics/rocks_contrast.jpg");
	rockTexture2.repeat.set( 1.0, 1.0 );
    	rockTexture2.wrapS = rockTexture2.wrapT = THREE.RepeatWrapping;
	rockTexture2.needsUpdate = true;

	//distorted circuit texture
	distortedCircuitTexture = THREE.ImageUtils.loadTexture("graphics/distortedCircuit.png");
	distortedCircuitTexture.repeat.set( 1.0, 1.0 );
    	distortedCircuitTexture.wrapS = distortedCircuitTexture.wrapT = THREE.RepeatWrapping;
	distortedCircuitTexture.needsUpdate = true;

	//hyper organic material
	var hyperOrganicTexture = THREE.ImageUtils.loadTexture("graphics/hyperOrganic.png");
	hyperOrganicTexture.repeat.set( 1, 1 );
	hyperOrganicTexture.needsUpdate = true;
	hyperOrganicMaterial = new THREE.MeshBasicMaterial({
            map:hyperOrganicTexture,
	    transparent:true,
	    fog:false
        });

	fractalTexture = THREE.ImageUtils.loadTexture("graphics/fractal2.png");
	fractalTexture.repeat.set( 1.0, 1.0 );
    	fractalTexture.wrapS = fractalTexture.wrapT = THREE.RepeatWrapping;
	fractalTexture.needsUpdate = true;

	hyperPanelTexture = THREE.ImageUtils.loadTexture("graphics/hyperPanel.png");
	hyperPanelTexture.repeat.set( 2.0, 2.0 );
    	hyperPanelTexture.wrapS = hyperPanelTexture.wrapT = THREE.RepeatWrapping;
	hyperPanelTexture.needsUpdate = true;

	//bullet
	var bulletTexture = THREE.ImageUtils.loadTexture("graphics/bullet.png");
	bulletTexture.wrapS = bulletTexture.wrapT =3;
	bulletTexture.repeat.set( 1, 1 );
	bulletTexture.needsUpdate = true;


	bulletMaterial = new THREE.MeshBasicMaterial({
            				map:bulletTexture,
					color:0xAAAAFF,
	    				fog:false,
	   				transparent:true
       				 });


	var bulletGeometry = new THREE.SphereGeometry(40, 12, 12);


	projectiles = {
		bullet : {
		geometry: bulletGeometry,
		material: bulletMaterial
		}
	};


	// create gui
	selectedActionPanel = document.getElementById("selectedActionPanel");

	 menuPromptPanel = document.getElementById("menuPromptPanel");

	//leftPanel = document.createElement("div");
	leftPanel = document.getElementById("leftPanel");
	leftPanel.setAttribute("class","leftPanelActive");

	//document.body.appendChild(leftPanel);
	//renderer.domElement.appendChild(leftPanel);


	//kineticPanel = document.createElement("div");
	kineticPanel  = document.getElementById("kineticPanel");
	kineticPanel.updateInterval=7;
	kineticPanel.updateState=0;
	kineticPanel.on=true;
	kineticPanel.setAttribute("style","text-align:center;");
	kineticPanel.close = function close()
	{
		kineticPanel.on=false;
		kineticPanel.setAttribute('style','display:none;');
		/*for(x=0;x<kineticPanel.children.length;x++)
		{
			kineticPanel.children[x].setAttribute('style','visible:false;');
			for(y=0;y<kineticPanel.children[y].children.length;y++)
			{
				kineticPanel.children[x].children[y].setAttribute('style','visible:false;');
			}
		}*/
	}

	kineticPanel.update = function update()
	{

		if(kineticPanel.updateState==kineticPanel.updateInterval)
		{
			document.getElementById('positionx').innerHTML = Math.floor(player.node.position.x);
			document.getElementById('positiony').innerHTML = Math.floor(player.node.position.y);
			document.getElementById('positionz').innerHTML = Math.floor(player.node.position.z);
			document.getElementById('velocityx').innerHTML = Math.floor(player.velocity.x*100)/100;
			document.getElementById('velocityy').innerHTML = Math.floor(player.velocity.y*100)/100;
			document.getElementById('velocityz').innerHTML = Math.floor(player.velocity.z*100)/100;
			kineticPanel.updateState=0;
		}
		kineticPanel.updateState ++;
	}

     	//leftPanel.appendChild(kineticPanel);

	//infoPanel = document.createElement("div");
	infoPanel =  document.getElementById("infoPanel");
	infoPanel.open=true;

	//infoPanel.setAttribute("style","text-align:center;");

	//helpButton = document.createElement("input");
	//helpButton.setAttribute("type","button");
	//helpButton.setAttribute("value","help");
	//helpButton.setAttribute("style","float:left;");
	helpButton  = document.getElementById("helpButton");
	showHelp = function showHelp()
	{
		alert('Use WASD to accelerate forward, left, back right. \nUse R and F to accelerate vertically.\nUse mouse pointing to turn and Q and E to roll.\nHold left shift to move more precisely with velocity stabilization.\nPress Escape to use your control panel and see all options\nYou can press C and V to cycle through your tools at any time. \nLeft click to use the current Tool.\nPress Space while pointing at an object to select it.\nWhen placing objects, hold left click to preview your object before you place it.\nLet go of left click to place your object.\n To delete an object, first select it (space),\n then switch to the delete tool and left click');
	}
	helpButton.onclick = showHelp;
	//infoPanel.appendChild(helpButton);
	//resetButton = document.createElement("input");
	resetButton =   document.getElementById("resetButton");
	//resetButton.setAttribute("type","button");
	//resetButton.setAttribute("value","reset scene");
	//resetButton.setAttribute("style","float:left;");
	resetButton.onclick = function resetScene()
	{
		if(confirm("Are you sure you want to delete this scene from your harddrive?"))
		{
			localStorage.clear();
		}
	}
	//infoPanel.appendChild(resetButton);
	//leftPanel.appendChild(infoPanel);

	//actionPanel = document.createElement("div");
	actionPanel =  document.getElementById("actionPanel");
	actionPanel.updateInterval=6;
	actionPanel.updateState=0;
	actionPanel.setAttribute("class","actionPanelActive");

	actionPanel.updateSliders = function ()
	{
		sliders = ['RedSliderControl','GreenSliderControl','BlueSliderControl','XSliderControl','YSliderControl','ZSliderControl'];
		for(x=0;x<sliders.length;x++)
		{
			slider = document.getElementById(sliders[x]);
			sliderBar = document.getElementById(slider.getAttribute('id')+"Bar");
			//console.log(sliderBar);
			if(x<3) //color sliders values
			{
				sliderBar.style['width'] = (50.0*slider.getAttribute('value'))+"%";
			}
			else //size slider values
			{
				sliderBar.style['width'] = (slider.getAttribute('value')/12.0)+"%";
			}
		}

	}


	function colorSliderDragged(e)
	{
		control = e.target.parentNode;
		//alert(control.getAttribute('value'));
		x = 50-((window.innerWidth-(e.pageX))-111)      /// WILL HAVE TO CHANGE 111 IF LAYOUT CHANGES!!!!!
		//console.log("x" + x);
		control.setAttribute('value',x/50.0);
		sliderBar = document.getElementById(control.getAttribute('id')+"Bar");
		//console.log(control.getAttribute('id')+"Bar");
		sliderBar.style['width'] = (x*2)+"%";
		//console.log("width "+ (x*2)+"%");
	}

	function sizeSliderDragged(e)
	{
		control = e.target.parentNode;
		//alert(control.getAttribute('value'));
		x = 50-((window.innerWidth-(e.pageX))-13); /// WILL HAVE TO CHANGE 13 IF LAYOUT CHANGES!!!!!
		//console.log("x" + x);
		control.setAttribute('value',x*12.0);
		sliderBar = document.getElementById(control.getAttribute('id')+"Bar");
		//console.log(control.getAttribute('id')+"Bar");
		sliderBar.style['width'] = (x*2)+"%";
		//console.log("width "+ (x*2)+"%");
	}

	actionPanel.initSliders = function ()
	{
		redSlider = SliderControl("Red",colorSliderDragged);
		redSlider.setAttribute('value',0.7);
		//redSlider.onclick = colorSliderClicked;
		document.getElementById("redSlider").appendChild(redSlider);

		greenSlider = SliderControl("Green",colorSliderDragged);
		greenSlider.setAttribute('value',0.1);
		//greenSlider.onclick = colorSliderClicked;
		document.getElementById("greenSlider").appendChild(greenSlider);

		blueSlider = SliderControl("Blue",colorSliderDragged);
		blueSlider.setAttribute('value',1.0);
		//blueSlider.onclick = colorSliderClicked;
		document.getElementById("blueSlider").appendChild(blueSlider);

		xSlider = SliderControl("X",sizeSliderDragged);
		xSlider.setAttribute('value',500.0);
		//xSlider.onclick = sizeSliderClicked;
		document.getElementById("xSlider").appendChild(xSlider);

		ySlider = SliderControl("Y",sizeSliderDragged);
		ySlider.setAttribute('value',125.0);
		//ySlider.onclick = sizeSliderClicked;
		document.getElementById("ySlider").appendChild(ySlider);

		zSlider = SliderControl("Z",sizeSliderDragged);
		zSlider.setAttribute('value',250.0);
		//zSlider.onclick = sizeSliderClicked;
		document.getElementById("zSlider").appendChild(zSlider);
	}

	actionPanel.clear = function clear()
	{
		document.getElementById('objectNameTextbox').setAttribute('value','');
		document.getElementById('objectShapeSelect').setAttribute('value','box');
		document.getElementById('objectMaterialSelect').setAttribute('value','solid');
		document.getElementById('RedSliderControl').setAttribute('value','0.4');
		document.getElementById('GreenSliderControl').setAttribute('value','0.1');
		document.getElementById('BlueSliderControl').setAttribute('value','1.1');
		document.getElementById('XSliderControl').setAttribute('value','450');
		document.getElementById('YSliderControl').setAttribute('value','32');
		document.getElementById('ZSliderControl').setAttribute('value','450');
		//update the sliders to visually show that their values have changed
		actionPanel.updateSliders();
	}


	actionPanel.update = function update()
	{
		if(actionPanel.updateState==actionPanel.updateInterval)
		{
			//switch (player.currentTool)
			//{
			//	case 0:
			//	//
			//	break;
			//}
			actionPanel.updateState=0;
		}
		actionPanel.updateState ++;
	}

	//actionPanel.appendChild(table);
	//document.body.appendChild(actionPanel);

	gui =
	{
		kineticPanel:kineticPanel,
		actionPanel:actionPanel,
		update: function update()
		{
			kineticPanel.update();
		},
		visible:false
	}


	showGUI = function()
	{
		//show gui
		gui.visible=true;
		leftPanel.style.visibility="visible";
		actionPanel.style.visibility="visible";
		//prevent selectedActionName from being shown since the action panel shows that information anyway
		selectedActionPanel.style.visibility="hidden";
		menuPromptPanel.innerHTML="Press Esc To<br / >Return To Mouse-Look";
		menuPromptPanel.setAttribute("class","exitMenuPrompt");

		//change mouse behaviour to allow for clicking on gui
		controls.domElement=null;
		nullInput.focus();
		normalMouse=true;
		controls.normalMouse=true;
	}

	hideGUI = function ()
	{
		//hide gui
		gui.visible=false;
		leftPanel.style.visibility="hidden";
		actionPanel.style.visibility="hidden";
		//allow selectedActionName to be shown
		selectedActionPanel.style.visibility="visible";
		menuPromptPanel.innerHTML="Press Esc to Show Controls";
		menuPromptPanel.setAttribute("class","menuPrompt");
		//change mouse behaviour to allow for Mouse Look navigation
		nullInput.focus();
		controls.domElement = document.body;
		normalMouse=false;
		controls.normalMouse=false;
	}

	// temporary scene / intitial scene
	initialScene = function initialScene(ctr)
	{
		id=-1;
		shape="box";
		material="colorCircuit";
		size=[500,500,500];
		translation=[0,0,0];
		if(ctr<24)
		{
		name="initialBox"+ctr;
		color=[(Math.sin(Math.PI*2*ctr/24.0)/2.0)+0.5,(Math.cos(Math.PI*2*ctr/24.0)/2.0)+0.5,1];
		position=[Math.sin(Math.PI*2*(ctr/12.0))*500*ctr,ctr*500,Math.cos(Math.PI*2*(ctr/12.0))*500*ctr];
		quaternion=[0,0,0,Math.PI*2*(ctr/24.0)];
		locallySaveEntity(name,
						id, // auto increment
		  /*string cube*/shape,
		  /*string rock*/material,
		  /*array [r,g,b]*/color,
		  /*array [x,y,z]*/size,
		  /*array [x,y,z]*/position,
		  /*array [x,y,z]*/translation,
		  /*array [x,y,z,w]*/quaternion,"solid","standard","","","","","",false,"");

		newEntity = addEntityFromDescription(name,
					  id,
					  shape,
					  material,
					  color,
				          size,
					  position,
					  translation,
					  quaternion,
					  "solid","standard","","","","","",false,"");
					  fadeIn(newEntity);
		ctr++;
		setTimeout(function(){initialScene(ctr);},500);
		}
	}

		//remember player.currentContentCellXYZ <string>
		// also           player.lastContentCellXYZ <string>
		// also getCurrentContentCellXYZ() <string>
	function loadEntitiesFromLocalStorage(x)
	{
		//console.log("loading entities from local storage; x="+x);
		//console.log("checking to see if its needed to load more content");
		ccc= [Math.round(three.camera.position.x/20000),Math.round(three.camera.position.z/20000),Math.round(three.camera.position.y/20000)];
		cc = "X"+ccc[0]+"Y"+ccc[1]+"Z"+ccc[2];
		//console.log(cc);

		if(cc!=player.currentContentCellXYZ) // if x = 2 then there is no more third of the update
		{
			x=0;
			player.currentContentCellXYZ=cc;
		}
		if(x<2)
		{
		//console.log("current cell is not cell checked last time...");


		// CHECK CURRENTLY LOADED CELLS TO SEE IF THEY ARE ALLOWED TO EXIST NOW
		//cells = loadedCells.length;
		//for(cell=0;cell<(cells/3)*(1+x);cell++) //only check a third of the loaded cells for out of bounds... wait for callback to get 2/3 and 3/3

//for(cell=0;cell<(loadedCells.length/3)*(1+x);cell++)
		for(cell=0;cell<loadedCells.length;cell++)
		{
			//console.log("checking cell for being too far away");
			if(Math.abs(loadedCells[cell].index[0]-ccc[0])>1 ||
			   Math.abs(loadedCells[cell].index[1]-ccc[1])>1 ||
			   Math.abs(loadedCells[cell].index[2]-ccc[2])>1
			 )
			{
				//unload cell
				//console.log("trying to delete a cell");

				//delete entitiesNode[loadedCells[cell].key];
				//entitiesNode[loadedCells[cell].key] = [];
				//for(e=0;e<entitiesNode[loadedCells[cell].key].children.length;e++)
				//{
				//	entitiesNode[loadedCells[cell].key].remove(entitiesNode[loadedCells[cell].key].children[e]);
				//}
				//delete entities[loadedCells[cell].key];
				entities[loadedCells[cell].key] = [];

				// possibly problematic:
				three.scene.remove(entitiesNode[loadedCells[cell].key]);
				entitiesNode[loadedCells[cell].key]=undefined;

				loadedCells.splice(cell,1);
			}
		}



		/// NEW PART....   load 27 cells around the user
		//console.log("loading cells 3 x 3 x 3 around the tested one");
		//for(x=-1;x<2;x++)
		//{
			//console.log("x"+x);
			for(y=-1;y<2;y++)
			{
			//console.log("y"+y);
				for(z=-1;z<2;z++)
				{
				//console.log("z"+z);
					cc = "X"+(ccc[0]+x)+"Y"+(ccc[1]+y)+"Z"+(ccc[2]+z);
					//console.log(cc);

						if(typeof(entitiesNode[cc])=='undefined')
						{
							entitiesNode[cc]=new THREE.Object3D();
							three.scene.add(entitiesNode[cc]);
							entities[cc]=[];
							// add cell data to loadedCells array for future unloading
							loadedCells.push({ key:cc, index:[ccc[0]+x,ccc[1]+y,ccc[2]+z]});
						}

						if(localStorage.getItem(cc+'highestId')!=null)
						{
						highestId=parseInt(localStorage[cc+'highestId']);
							if(highestId>0)
							{
								for(i=0;i<=highestId;i++)
								{
									if(localStorage.getItem(cc+'Entity'+i)!=null)
									{
										entity = localStorage.getItem(cc+'Entity'+i).split(';');
										name = entity[0];
										id = entity[1];
										shape = entity[2];
										material = entity[3];
										color = entity[4];
										color = color.split(',');
										size = entity[5];
										size = size.split(',');
										position = entity[6];
										position = position.split(',');
										translation = entity[7];
										translation = translation.split(',');
										quaternion = entity[8];
										quaternion = quaternion.split(',');
										physics = entity[9];
										behaviour = entity[10];
										text = entity[11];
										link = entity[12];
										image = entity[13];
										sound = entity[14];
										sound = ['sound:not_implemented'];
										innerSpace = entity[15];
										key = entity[16];
										key = key == "false" ? false : true;
										extra = entity[17];
										addEntityFromDescription(name,
									  	  id,
									  	  shape,
									  	  material,
									       	color,
					  			           	size,
									  	  position,
									   	 translation,
									  	  quaternion,
									          physics,behaviour,text,link,image,sound,innerSpace,key,extra);
									}
								}
							}
						}
						else
						{
							localStorage.setItem(cc+'numberOfEntities',0);
							localStorage.setItem(cc+'highestId',-1);
						}
					}
				}


		}

		//if(x==-1){x=0;}
		//if(x==1){x=-2;}
		//if(x==0){x=1;}
		if(x==-1){x=2;}
		if(x==1){x=-2;}
		x++;
		setTimeout(function(){loadEntitiesFromLocalStorage(x);},2000);
	}

	//function locallyUpdateEntity(id)
	//{
	//
	//}
	function locallySaveEntity(name,
		/*number */ id,
		  /*string cube*/geometry,
		  /*string rock*/material,
		  /*array [r,g,b]*/color,
		  /*array [x,y,z]*/size,
		  /*array [x,y,z]*/position,
		  /*array [x,y,z]*/translation,
		  /*array [x,y,z,w]*/quaternion,physics,behaviour,text,link,image,sound,innerSpace,key,extra)
	{

		cc = "X"+Math.round(position[0]/20000)+"Y"+Math.round(position[1]/20000)+"Z"+Math.round(position[2]/20000);
		highestId=0;
		if(localStorage.getItem(cc+'highestId')!=null)
		{
			if(id==-1)
			{
				highestId=parseInt(localStorage.getItem(cc+'highestId'))+1;
				localStorage.setItem(cc+'highestId',highestId);
			}
			else
			{
				highestId = id;
			}

			localStorage.setItem(cc+'Entity'+highestId,
					     cc+'Entity'+highestId+';'+
					     highestId+';'+
					     geometry+';'+
					     material+';'+
					     color[0]+','+color[1]+','+color[2]+';'+
					     size[0]+','+size[1]+','+size[2]+';'+
					     position[0]+','+position[1]+','+position[2]+';'+
					     translation[0]+','+translation[1]+','+translation[2]+';'+
					     quaternion[0]+','+quaternion[1]+','+quaternion[2]+','+quaternion[3]+';'+
					     physics+';'+
					     behaviour+';'+
					     text+';'+
					     link+';'+
					     image+';'+
					     sound+';'+
					     innerSpace+';'+
					     key+';'+
					     extra+';');

			//alert(numberOfEntities);
			numberOfEntities=parseInt(localStorage.getItem(cc+'numberOfEntities'))+1;
			localStorage.setItem(cc+'numberOfEntities',numberOfEntities);



		}
		else
		{
			localStorage.setItem(cc+'numberOfEntities',0);
			localStorage.setItem(cc+'highestId',-1);

		}
		return highestId;
	}


	function loadInnerSpaceEntities(entity)
	{
		//unload entities
		for(cell=0;cell<loadedCells.length;cell++) //only check a third of the loaded cells for out of bounds... wait for callback to get 2/3 and 3/3
		{
			entities[loadedCells[cell].key] = [];
			three.scene.remove(entitiesNode[loadedCells[cell].key]);
			entitiesNode[loadedCells[cell].key]=undefined;
			//loadedCells.splice(cell,1);
		}
		loadedCells = [];

		//need to prevent loadEntitiesFromLocalStorage from firing.... clearTimeout or something and start upon leaving

		//sky.material = descriptionToMaterial(e.material,e.color);
		playerNode.children[0].material = descriptionToMaterial(e.material,e.color);


		//load new entities with innerSpaceEntities...
	}

 	player = {
	name:"player",
	keys:{
				w:false,
				a:false,
				s:false,
				d:false,
				i:false,
				j:false,
				k:false,
				l:false,
				leftShift:false,
				spaceArrow:false,
				escapeHeld:false,
				c:false,
				v:false
			},
	position: new THREE.Vector3(0,0,0),
	oldPosition: new THREE.Vector3(0,0,0),
	velocity: new THREE.Vector3(0,0,0),
	node: playerNode,
	currentContentCellXYZ:"",
	currentInnerSpace:"",
	getCurrentContentCellXYZ: function getCurrentContentCellXYZ()
	{
		x=Math.round(three.camera.position.x/20000); //10 thousand across?
		y=Math.round(three.camera.position.y/20000);
		z=Math.round(three.camera.position.z/20000);
		return "X"+x+"Y"+y+"Z"+z;
	},
	motionChange:0,
	firedProjectiles: [],
	weaponReady:true,
	mouseDown:false,
	selectedEntity:null,
	pointedAtEntity:null,
	previouslySelectedEntity:null,
	currentTool:1,
	update: function update(deltaTime)
		{
			with(player.keys)
			{
				if(leftShift)
				{
					player.velocity.multiplyScalar(0.98);
				}
			}
			//camera.position.addSelf(player.velocity);
			camera.oldPosition.set(camera.position.x,camera.position.y,camera.position.z);
			if(!normalMouse)
			{
				controls.update( deltaTime );
			}

			player.velocity.set(player.velocity.x+0.022*(camera.position.x-camera.oldPosition.x),
					    player.velocity.y+0.022*(camera.position.y-camera.oldPosition.y),
				            player.velocity.z+0.022*(camera.position.z-camera.oldPosition.z));

			//player.velocity.set(1,1,1);
			//console.warn(player.velocity.x+" "+camera.position.x-player.oldPosition.x);
			player.node.position.set(player.node.position.x+player.velocity.x*deltaTime/100,
					    player.node.position.y+player.velocity.y*deltaTime/100,
					    player.node.position.z+player.velocity.z*deltaTime/100);
			camera.position.set(player.node.position.x,player.node.position.y,player.node.position.z);

			//Bullet hanlding...
			if(bulletUpdateState==bulletUpdateInterval)
			{
				index=0;
				for(bullet in player.firedProjectiles)
				{
					b = player.firedProjectiles[bullet];
					if(b.timeToLive>0)
					{
						b.speed*=1.02; //bullets start off slow for interest, but get faster for long range
						b.mesh.translateZ(-b.speed);
						//b.mesh.size.z+=20;
						//b.mesh.updateMatrix();
						b.timeToLive -= 0.001*deltaTime;
						proximityEntity = getClosestEntity(b.mesh.position,200);
						e=proximityEntity.e;
						distance = proximityEntity.distance;
						if(e)
						{
						//collisions
						//document.getElementById('2cylableExplosion').play();
						e.explodeSound = document.createElement('audio');
						e.explodeSound.setAttribute('style','width:0px;height:0px;');
						e.explodeSound.setAttribute('src','sounds/explode0.ogg');
						e.explodeSound.setAttribute('controls',false);
						e.explodeSound.play();
						//entitiesNode.remove(entities[e].mesh);
						//entities.splice(e,1);
						blowUp(e);
						}
					}
					else
					{
						//remove bullet from scene
						scene.remove(b.mesh);
						//remove the bullet from the projectiles
						player.firedProjectiles.splice(index,1);
					}
					index++;
				}
				bulletUpdateState=0;
			}
			else
			{
				bulletUpdateState++;
			}

		},
	fireWeapon: function fireWeapon(times)
			{

				player.weaponReady=false;
				bullet = new THREE.Mesh(bulletGeometry,bulletMaterial);
				bullet.overdraw=true;
				bullet.useQuaternion=true;
				bullet.position = new THREE.Vector3(player.node.position.x,player.node.position.y,player.node.position.z);
				bullet.size = new THREE.Vector3(100,100,1000);
				bullet.quaternion = new THREE.Quaternion(camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w);

				//Register the bullet with firedProjectiles;
				timeToLive=3;
				speed=85;
				direction=camera.quaternion;
				player.firedProjectiles.push(new FiredProjectile(bullet,timeToLive,speed,direction));
				scene.add(bullet);


				if(times>1)
				{
					times--;
					setTimeout("player.fireWeapon("+times+")",120);
				}
				else
				{
					player.weaponReady=true;
				}

			},
	  placeObject: function placeObject()
			{

				name=document.getElementById('objectNameTextbox').value;
				shape=document.getElementById('objectShapeSelect').value;
				material=document.getElementById('objectMaterialSelect').value;
				color = [document.getElementById('RedSliderControl').getAttribute('value'),
					 document.getElementById('GreenSliderControl').getAttribute('value'),
					 document.getElementById('BlueSliderControl').getAttribute('value')];
				size = [document.getElementById('XSliderControl').getAttribute('value'),
					document.getElementById('YSliderControl').getAttribute('value'),
					document.getElementById('ZSliderControl').getAttribute('value')];
				position = [player.node.position.x,
					player.node.position.y,
					player.node.position.z];
				quaternion = [camera.quaternion.x,
					camera.quaternion.y,
					camera.quaternion.z,
					camera.quaternion.w];
				translation = 0;
				if(shape=="sphere")
				{
					translation = [0,0,-285-(size[0]/2)];
				}
				else
				{
					translation = [0,0,-285-(size[2]/2)];
				}

				if(shape=="cylinder")
				{
					tmpQuaternion = new THREE.Quaternion(quaternion[0],quaternion[1],quaternion[2],quaternion[3]);
					rotateQuaternion = new THREE.Quaternion();
					vector = new THREE.Vector3(1,0,0);
					rotateQuaternion.setFromAxisAngle( vector, Math.PI/2 );
					tmpQuaternion.multiplySelf( rotateQuaternion );
					tmpQuaternion.normalize();
					quaternion=[tmpQuaternion.x,tmpQuaternion.y,tmpQuaternion.z,tmpQuaternion.w];
					//translation = [0,0,-285-(size[1]+size[2])];
				}

				physics = "Not_Implemented";//document.getElementById('objectPhysicsSelect').value;
				text = document.getElementById('objectTextTextbox').value;
				/*quote = text.search(String.fromCharCode(34));
				while(quote>-1)
				{
					text = text.replace(String.fromCharCode(34),"&#34");
					quote = text.search(String.fromCharCode(34));
				}	*/
				escape(text);
				//text = text.replace(":","<colon>");
				behaviour = "";
				link = document.getElementById('objectLinkTextbox').value;
				//link = link.replace(":","<colon>");
				image="";
				sound="Not_Implemented";
				extra="";
				innerSpace = document.getElementById('objectInnerSpaceTextbox').value;
				key = document.getElementById('objectKeyTextbox').value;
				keyFlag=false;
				if(key!="")
				{
					//alert("encrypting for some reason");
					text = encrypt(text,key);
					keyFlag=true;
				}
				// check for object close to this one to append to

		proximityEntity = entitiesNode[player.getCurrentContentCellXYZ()] != undefined ? getClosestEntity(player.node.position,20000) : null;

		appendMode=false;
				if(proximityEntity.e!=null)
				{
				//console.log((proximityEntity.e.size[0]+proximityEntity.e.size[1]+proximityEntity.e.size[2])/3);
				//if(proximityEntity.distance<((proximityEntity.e.size[0]+proximityEntity.e.size[1]+proximityEntity.e.size[2])/3))

					if(false)
					{
						appendMode=true;
						console.log("trying to append object");
						//append extra information
						mode = "add";
						proximityEntity.e.extra += "<ExtraPart>"+shape+","+mode+","+position[0]+","+position[1]+","+position[2]
										+","+translation[0]+","+translation[1]+","+translation[2]
										+","+size[0]+","+size[1]+","+size[2]
										+","+quaternion[0]+","+quaternion[1]+","+quaternion[2]+","+quaternion[3];
					//combine meshes from extra data
						console.log(proximityEntity.e.extra);
					mat=descriptionToMaterial(proximityEntity.e.material,proximityEntity.e.color);
					//mergedGeometry = proximityEntity.mesh.geometry;
						geometry = null;
						switch(shape)
						{
							case "box": geometry = new THREE.CubeGeometry(size[0],size[1],size[2]);break;
							case "sphere": geometry = new THREE.OctahedronGeometry((size[0]+size[1]+size[2])/3,3); break;
							case "plane": geometry = new THREE.PlaneGeometry(size[0],size[1]); break;
						case "cylinder": geometry = new THREE.CylinderGeometry(size[0],size[0],(size[1]+size[2])/40, 16, 1, false); break;
						}

						dummyGeometry = new THREE.Geometry();//THREE.Mesh(geometry,mat);
						THREE.GeometryUtils.merge(dummyGeometry, proximityEntity.e.mesh.geometry);
						newMesh = new THREE.Mesh(geometry);
						newMesh.position.set(position[0],position[1],position[2]);
						newMesh.quaternion.set(quaternion[0],quaternion[1],quaternion[2]);
						newMesh.translateX(translation[0]);
						newMesh.translateY(translation[1]);
						newMesh.translateZ(translation[2]);
						THREE.GeometryUtils.merge(dummyGeometry, newMesh);
						dummyMesh = new THREE.Mesh(dummyGeometry,mat);
						dummyMesh.position.set(proximityEntity.e.mesh.position.x,
									proximityEntity.e.mesh.position.y,
									proximityEntity.e.mesh.position.z);
						dummyMesh.quaternion.set(proximityEntity.e.mesh.quaternion.x,
									proximityEntity.e.mesh.quaternion.y,
									proximityEntity.e.mesh.quaternion.z,
									proximityEntity.e.mesh.quaternion.w);
						dummyMesh.updateMatrix();
						scene.remove(proximityEntity.e.mesh);
						entitiesNode["X"+Math.round(mesh.position.x/20000)+
							     "Y"+Math.round(mesh.position.y/20000)+
							     "Z"+Math.round(mesh.position.z/20000)].add(dummyMesh);
						proximityEntity.e.mesh = dummyMesh;
						//alert("testing"+dummyMesh);
						//dummyMesh.position.set(position[0],position[1],position[2]);
						//dummyMesh.translateX(translation[0]);
						//dummyMesh.translateY(translation[1]);
						//dummyMesh.translateZ(translation[2]);
						//proximityEntity.e.mesh.updateMatrix();
						//mesh = dummyMesh;
						//rewrite the existing object record

					locallySaveEntity(proximityEntity.e.name,
							proximityEntity.e.id, // keep old id
		  		      /*string cube*/proximityEntity.e.shape,
		  			/*string rock*/proximityEntity.material,
					/*array [r,g,b]*/proximityEntity.e.color,
		  			/*array [x,y,z]*/proximityEntity.e.size,
		  			/*array [x,y,z]*/proximityEntity.e.mesh.position,
		 			 /*array [x,y,z]*/proximityEntity.e.translation,
					/*array [x,y,z,w]*/proximityEntity.e.mesh.quaternion,
							proximityEntity.e.physics,
							proximityEntity.e.behaviour,
							proximityEntity.e.text,
							proximityEntity.e.link,
							proximityEntity.e.image,
							proximityEntity.e.sound,
							proximityEntity.e.innerSpace,
							proximityEntity.e.keyFlag,
							proximityEntity.e.extra);
					}
				}
				if(!appendMode)
				{
					newId= locallySaveEntity(name,
							-1, // auto increment
		  		      /*string cube*/shape,
		  			/*string rock*/material,
		  				/*array [r,g,b]*/color,
		  				/*array [x,y,z]*/size,
		  				/*array [x,y,z]*/position,
		 				 /*array [x,y,z]*/translation,
						  /*array [x,y,z,w]*/quaternion,physics,behaviour,text,link,image,sound,innerSpace,keyFlag,extra);
		  				//alert(newId);

					newEntity=	addEntityFromDescription(name,
					    		newId,
					 		   shape,
					  		  material,
					  		  color,
				          		  size,
					  		  position,
					  		  translation,
					  		  quaternion,
					  		  physics,behaviour,text,link,image,sound,innerSpace,keyFlag,extra);
				//Save this object/entity to the hard drive... a server will be up in a while
					fadeIn(newEntity);
				}
			},
	selectObject: function selectObject()
			{
				e = "No Entity Yet";
				if(postProcessingLevel<2)
				{
					raycaster = new THREE.Raycaster(camera.position,camera.quaternion.multiplyVector3( new THREE.Vector3(0,0,-1) ) );
					intersects = raycaster.intersectObjects(entitiesNode[player.getCurrentContentCellXYZ()].children);
					if(intersects.length>0)
					{
						e=intersects[0].object.entity;
						//console.log(e);
					}
				}
				else
				{
					e = player.pointedAtEntity;
				}
				//console.log(e);
				if(e==null)
				{
					//need to check positions of all entities and see which one is closest
					proximityEntity=getClosestEntity(player.node.position,2000);
					e=proximityEntity.e;
					if(e==null)
					{
						player.previouslySelectedEntity=player.selectedEntity;
						player.selectedEntity = null;
						actionPanel.clear();
						document.getElementById('modifyButton').setAttribute('style','visibility:false');
					}
				}
				else
				{
				//console.log("entity selected");
					player.previouslySelectedEntity=player.selectedEntity;
					player.selectedEntity = e;
					if(selectedIndicator==null) // if selectedIndicator doesn't exist...
					{
						//create selectedIndicator
						indicatorMaterial = descriptionToMaterial("selectedIndicator");
						indicatorMaterial.wireframe=true;
						selectedIndicator = new THREE.Mesh(new THREE.CubeGeometry(600,600,600),indicatorMaterial);
						//selectedIndicator = new THREE.Mesh(new THREE.SphereGeometry(600,8,8),descriptionToMaterial("selectedIndicator"));
						three.scene.add(selectedIndicator);
					}
					//move selectedIndicator
					selectedIndicator.position.set(e.mesh.position.x,e.mesh.position.y,e.mesh.position.z);
					//console.log(e.mesh.scale);
					//selectedIndicator.scale.set(e.mesh.scale.x*1.1,e.mesh.scale.y*1.1,e.mesh.scale.z*1.1);
					//selectedIndicator.updateMatrix();
					//selectedIndicator.updateMatrix();
					//console.log([e.mesh.position.x,e.mesh.position.y,e.mesh.position.z]);
					document.getElementById('objectNameTextbox').setAttribute('value',e.name);
					document.getElementById('objectShapeSelect').value=e.geometry;
					document.getElementById('objectMaterialSelect').value=e.material;
					document.getElementById('RedSliderControl').setAttribute('value',e.color[0]);
					document.getElementById('GreenSliderControl').setAttribute('value',e.color[1]);
					document.getElementById('BlueSliderControl').setAttribute('value',e.color[2]);
					document.getElementById('XSliderControl').setAttribute('value',e.size[0]);
					document.getElementById('YSliderControl').setAttribute('value',e.size[1]);
					document.getElementById('ZSliderControl').setAttribute('value',e.size[2]);

					///sliders!
					actionPanel.updateSliders();

					//document.getElementById('objectPhysicsSelect').value=e.physics;
					if(e.text!="")
					{
						decodedText=e.text;
						if(e.key)
						{

							key = prompt("Enter the encryption key for this object's text: ");
							decodedText = encrypt(e.text,key,true);
						}
						/*quote = decodedText.search("&#34");
						while(quote>-1)
						{
							decodedText = decodedText.replace("&#34",String.fromCharCode(34));
							quote = decodedText.search("&#34");
						}	*/
						unescape(decodedText);
						lightBoxViewer.lightBox("This object contains information:",decodedText);


					}

					if(e.innerSpace!=""&&typeof(e.innerSpace)!='undefined')
					{
						// prompt inner space to load or not
						if(confirm("The object you have selected has an inner space.\nWould you like to enter '"+e.innerSpace+"' ?"))
							{
								// unload entities
								loadInnerSpaceEntities(e); // pass the entity for information about material and such
								//load inner space
							}
					}
					else
					{
						if(e.link!="")
						{
lightBoxViewer.lightBox("This object has a hyperlink:","<iframe sandbox='allow-forms allow-same-origin allow-scripts'  style='width:100%;height:100%;' src="+e.link+"></iframe>");
						}
					}
					document.getElementById('modifyButton').setAttribute('style','visibility:true');


				}


		},
        modifyObject: function modifyObject()
			{
				entity = player.selectedEntity;
				if(entity)
				{
				id = entity.id;
				//get it's quaternion and position to keep things simple for now
				position = [entity.mesh.position.x,entity.mesh.position.y,entity.mesh.position.z];
				quaternion = [entity.mesh.quaternion.x,entity.mesh.quaternion.y,entity.mesh.quaternion.z,entity.mesh.quaternion.w];

				//text=entity.text;
				link=entity.link;
				innerSpace=entity.innerSpace;
				cc =  "X"+Math.round(entity.mesh.position.x/20000)+"Y"+Math.round(entity.mesh.position.y/20000)+"Z"+Math.round(entity.mesh.position.z/20000);


				//thing to find for modify
				//make a new one with the new specifications

				name=document.getElementById('objectNameTextbox').value;
				shape=document.getElementById('objectShapeSelect').value;
				material=document.getElementById('objectMaterialSelect').value;
				color = [document.getElementById('RedSliderControl').value,
					 document.getElementById('GreenSliderControl').value,
					 document.getElementById('BlueSliderControl').value];
				size = [document.getElementById('XSliderControl').value,
					document.getElementById('YSliderControl').value,
					document.getElementById('ZSliderControl').value];
				physics = "Not_Implemented"; //document.getElementById('objectPhysicsSelect').value;
				translation = [0,0,0];
				behaviour = "";
				text = document.getElementById('objectTextTextbox').value;
				escape(text);
				key = document.getElementById('objectKeyTextbox').value;
				keyFlag = false;
				if(key!="")
				{
					text = encrypt(text,key);
					keyFlag=true;
				}
				else
				{
					keyFlag=false;
				}
				image="";
				sound="";
				link = document.getElementById('objectLinkTextbox').value;
				extra = entity.extra;

				newId= locallySaveEntity(name,
					   id,
		  /*string cube*/shape,
		  /*string rock*/material,
		  /*array [r,g,b]*/color,
		  /*array [x,y,z]*/size,
		  /*array [x,y,z]*/position,
		  /*array [x,y,z]*/translation,
		  /*array [x,y,z,w]*/quaternion,physics,behaviour,text,link,image,sound,innerSpace,keyFlag,extra);

				addEntityFromDescription(name,
					    newId,
					    shape,
					    material,
					    color,
				            size,
					    position,
					    translation,
					    quaternion,
					    physics,behaviour,text,link,image,sound,innerSpace,keyFlag,extra);
				//remove old entity
				entitiesNode[player.getCurrentContentCellXYZ()].remove(entity.mesh);
				localStorage.removeItem(cc+'Entity'+entity.id);
				entities[cc].splice(entities[cc].indexOf(entity),1);

				}
			},
	deleteObject: function deleteObject()
			{
				//if entity selected,

				//alert(player.node.position.x);
				proximityEntity = getClosestEntity(player.node.position,600);
				entity=proximityEntity.e;

				selectedEntity=player.selectedEntity;

				cc = player.getCurrentContentCellXYZ();

				//alert(entity);
				//console.log(entity);
				if(selectedEntity)
				{
					//may be a problem

					entitiesNode[cc].remove(selectedEntity.mesh); //remove the actual 3d mesh from the scene
					localStorage.removeItem(cc+'Entity'+selectedEntity.id); //remove the entity from local storage to keep it gone
					entities[cc].splice(entities[cc].indexOf(selectedEntity),1); //remove the entity from memory
					//just set the name textbox to '' and dont reset everything else, because that's annoying
					document.getElementById('objectNameTextbox').setAttribute('value','');

					numberOfEntities = localStorage[cc+'numberOfEntities']-1; //subtracting one to lower total entity count
					localStorage.setItem(cc+'numberOfEntities',numberOfEntities);
				}
				else if(entity!=null)
				{


					//alert('proximity');

					shape=document.getElementById('objectShapeSelect').value;
					size = [parseFloat(document.getElementById('XSliderControl').value),
						parseFloat(document.getElementById('YSliderControl').value),
						parseFloat(document.getElementById('ZSliderControl').value)];

					var firstObject = THREE.CSG.toCSG(entity.mesh.geometry);
					var newObject;
					if(shape=="sphere")
					{
						newObject = THREE.CSG.toCSG(new THREE.SphereGeometry(size[0], 16, 16));
					}
					else if(shape=="box")
					{
						newObject = THREE.CSG.toCSG(new THREE.CubeGeometry(size[0],size[1],size[2]));
					}
					//firstObject.setPosition(entities[proximityEntity.e].mesh.position.x,entities[proximityEntity.e].mesh.position.y,entities[proximityEntity.e].mesh.position.z);
					var geometry = THREE.CSG.fromCSG( firstObject.subtract(newObject) );
					var mesh = new THREE.Mesh(geometry,descriptionToMaterial(entities[proximityEntity.e].material,entities[proximityEntity.e].color));
					entitiesNode[cc].add(mesh);
					//entities[proximityEntity.e].mesh=mesh;
					//entitiesNode.add(entities[proximityEntity.e].mesh);





					//may be a problem

					entitiesNode[cc].remove(entity.mesh);
					//entities[proximityEntity.e]=null;

					//just set the name textbox to '' and dont reset everything else, because that's annoying
					document.getElementById('objectNameTextbox').setAttribute('value','');
					//actionPanel.clear();

					//localStorage.removeItem(cc+'Entity'+entity.id); //remove the entity from local storage to keep it gone
					//entities[cc].remove(entity);
					//entities[cc].splice(entities[cc].indexOf(entity),1);
					//numberOfEntities = localStorage[entities[cc]+'numberOfEntities']-1; //subtracting one to lower total entity count
					//localStorage.setItem([cc]+'numberOfEntities',numberOfEntities);
				}
			},
	switchTool: function switchTool(direction)
			{
				player.currentTool+=direction;
				if(player.currentTool==tools.length)
				{
					player.currentTool=0;
				}
				if(player.currentTool<0)
				{
					player.currentTool=tools.length-1;
				}
				document.getElementById('toolSettingsTitle').innerHTML=tools[player.currentTool];
				document.getElementById('selectedActionName').innerHTML=tools[player.currentTool];
			},
	updateForward: function updateForward()
			{
				color = [document.getElementById('RedSliderControl').getAttribute('value'),
					 document.getElementById('GreenSliderControl').getAttribute('value'),
					 document.getElementById('BlueSliderControl').getAttribute('value')];
				var shape;
				var size=[];
				//if(player.currentTool==3)
				//{
				//	shape="sphere";
				//	size=[500,100,100];
				//}
				//else
				//{
					shape=document.getElementById('objectShapeSelect').value;
					size = [parseFloat(document.getElementById('XSliderControl').getAttribute('value')),
						parseFloat(document.getElementById('YSliderControl').getAttribute('value')),
						parseFloat(document.getElementById('ZSliderControl').getAttribute('value'))];
				//}
				var zTranslate;
				mat=new THREE.MeshBasicMaterial({
				color:0x000000,
				wireframe:true,
				fog:false
				});
				red=parseInt(color[0]);
				green=parseInt(color[1]);
				blue=parseInt(color[2]);
				mat.color.setRGB(red,green,blue);
				var mesh;
				var translation;
				switch(shape)
				{
				case "box":
					mesh = new THREE.Mesh(new THREE.CubeGeometry(size[0],size[1],size[2]),mat);
					zTranslate=-(size[2]/2);
				break;
				case "sphere":
					//mesh = new THREE.Mesh(new THREE.SphereGeometry(size[0]/2,12,12),mat);
					mesh = new THREE.Mesh(new THREE.OctahedronGeometry((size[0]+size[1]+size[2])/3,3),mat);
					if(player.currentTool==3)
					{
						zTranslate=285-(size[0]/2);
					}
					else
					{
						zTranslate=-(size[0]/2);
					}
				break;
				case "plane":
					mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0],size[1]),mat);
					//mesh.doubleSided=true;
					mat.side=2;
					zTranslate=-(size[2]/2);
				break;
				case "cylinder":
					mesh = new THREE.Mesh(THREE.CylinderGeometry(size[0],size[0],(size[1]+size[2])/40, 16, 1, false),mat);
					zTranslate=-((size[1]+size[2])/40);
				break;
				}

				mesh.material=mat;

				three.camera.children[0].remove(three.camera.children[0].children[0]);
				three.camera.children[0].add(mesh);
				mesh.rotation.set(0,0,-Math.PI/4);

				//mesh.translate(translation[0],translation[1],translation[2]);
				mesh.position.set(0,0,zTranslate);
				//three.camera.remove(three.camera.children[2]);
				//three.camera.add(mesh);
				//alert(translation[2]);



				//three.camera.add(forward);

			}
	};

	window.onresize = function ()
	{
		three.renderer.setSize(window.innerWidth,window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		//controls.container = controls.getContainerDimensions();
		controls.updateContainer();
	}

	//three.renderer.domElement.focus();
	//eventually there'll be a server for this, but for now it's local storage
	//nullInput.focus();
	//controls.domElement = document.body;



	if(typeof(params['position'])!='undefined')
	{
		//alert("Position Test");
		position = params['position'].split(",");
		player.node.position.set(parseFloat(position[0]),parseFloat(position[1]),parseFloat(position[2]));
	}


	if(localStorage.getItem('firstTimeVersion0.4')==null)
	{
		localStorage.clear();
		localStorage.setItem('firstTimeVersion0.4','no');
		window.location=window.location; //refresh
	}
	else if(localStorage.getItem("initialScene")==null)
	{
		showHelp();
		setTimeout(function(){initialScene(0);},500);
		localStorage.setItem("initialScene","setup");
	}

	loadEntitiesFromLocalStorage(0);





	actionPanel.initSliders();
	actionPanel.updateSliders();

	//eventually there will be an animation here... buts for now...
	gui.visible=false;
	leftPanel.style.visibility="hidden";
	actionPanel.style.visibility="hidden";

	  // create wrapper object that contains three.js objects
        three = {
            renderer: renderer,
	  composer:composer,
            scene: scene,
	    camera: camera
        };

       if(params['ThreeDeeMode']=='Anaglyph')
        {
        	anaglyphAnimate();
        }
	else
	{
		if(postProcessingLevel==1)
       	        {
        		compositeAnimate();
                }
                else
		{
			//rotateQuaternion = new THREE.Quaternion();
			//vector = new THREE.Vector3(0,0,1);
			//rotateQuaternion.setFromAxisAngle( vector, Math.PI );
			//camera.quaternion.multiplySelf( rotateQuaternion );
			//camera.quaternion.normalize();

			if(postProcessingLevel==2)
                	{
                		dofAnimate();
                	}
                	else
        		{
        			animate();
        		}
		}
	}
};

     window.requestAnimFrame = (function(callback){
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback){
            window.setTimeout(callback, 42); //safest at 24 fps for now... = 42 milliseconds
        };
    })();

        document.onkeypress=function keyPressHandler(e)
	{
		var key= e.which;
		if(!normalMouse)
		{
			if(key==99||key==67)
			{
				player.switchTool(-1);
			}
			if(key==118||key==86)
			{
				player.switchTool(1);
			}
			if(key==32) //spacebar
			{
				player.selectObject();
			}
		}
	}

	document.onkeydown= function keyDownHandler(e){
				var key= e.which;
				switch(key)
				{
					case 16:
						player.keys.leftShift=true;
					//controls.movementSpeed = 0.5;
					break;
					case 32:
						player.keys.spaceArrow=true;
					break;
					case 27:
						if(!player.keys.escapeHeld)
						{
							if(gui.visible)
							{
								hideGUI();
							}
							else
							{
								showGUI();
							}
							//lastly, set escapeHeld to simulate keypress event for firefox
							player.keys.escapeHeld=true;
						}
						// gui is invisible....escape is pressed down and escapeDown is false
							// show gui,
							// set escape down =true
					break;

				}
			}
	document.onkeyup= function keyUpHandler(e){
				var key= e.which;
				switch(key)
				{
					case 16:
						player.keys.leftShift=false;
					break;
					case 32:
						player.keys.spaceArrow=false;
					break;
					case 27:
						player.keys.escapeHeld=false;
					break;
				}
			}
	document.onmouseup = function handleMouseUp(event)
	{
		player.mouseDown=false;
		if('which' in event)
		{
			if(event.which==1)
			{
				player.mouseDown=false;
				if(!normalMouse)
				{
					switch(player.currentTool)
					{
						case 1:
							player.placeObject();
							//also consider getting rid of the ghost here
							three.camera.children[0].remove(three.camera.children[0].children[0]);
						break;
						case 2:
							three.camera.children[0].remove(three.camera.children[0].children[0]);
						break;
					}
				}
			}
		}
	}


	document.onmousedown= function handleClick(event)
	{
		if ('which' in event)
		{
			if(event.which==1)
			{
			player.mouseDown=true;
				if(!normalMouse)
				{
					switch(player.currentTool)
					{
					case 0:
					if(player.weaponReady)
					{
						player.fireWeapon(3);
					}
					break;
					case 1:
						player.updateForward();
					break;
					//case 2:
					//	player.selectObject();   //right click now
					//break;
					case 2:
						player.updateForward();
						player.deleteObject();
					break;
					}
				}
			}
                	/*else if(event.which==3)
			{
				event.stopPropagation();
				event.preventDefault();
				if(!normalMouse)
				{
					player.selectObject();
				}
				return false;
				//do something if there's a right click.... or not...
            		}*/

		}


	}
	window.onContextMenu = function (event)
	{
		event.preventDefault();
	}


    function animate()
    {
	 // update
      //  var delta = clock.getDelta()*1000;
	player.update(clock.getDelta()*1000);
    	if(gui.visible)
    	{
    		gui.update();
    	}
 	// render
       three.renderer.render(three.scene, three.camera);
        // request new frame
        requestAnimFrame(function(){
            animate();
        });
    }

     function anaglyphAnimate()
    {
        var delta = clock.getDelta()*1000;
	player.update(delta);
    	if(gui.visible)
    	{
    		gui.update();
    	}
       anaglyphEffect.render(three.scene, three.camera);
        requestAnimFrame(function(){
            anaglyphAnimate();
        });
    }

      function compositeAnimate()
    {
	 // update
       // var delta = clock.getDelta()*1000;
	player.update(clock.getDelta()*1000);
    	if(gui.visible)
    	{
    		gui.update();
    	}
 	// render
	three.composer.render();
        // request new frame
        requestAnimFrame(function(){
            compositeAnimate();
        });
    }





        function dofAnimate()
        {
		 // update
        	//var delta = clock.getDelta()*1000;
		player.update(clock.getDelta()*1000);
    		if(gui.visible)
    		{
    			gui.update();
    		}

		raycaster = new THREE.Raycaster(camera.position,camera.quaternion.multiplyVector3( new THREE.Vector3(0,0,-1) ) );
		intersects = raycaster.intersectObjects(entitiesNode[player.getCurrentContentCellXYZ()].children);
		if(intersects.length>0)
		{
			player.pointedAtEntity = intersects[0].object.entity;  //used to be 1 - ()
			postprocessing.bokeh_uniforms[ "focus" ].value = 1-(intersects[0].distance/20000);
			//console.log(e);
		}
		else
		{
			player.pointedAtEntity=null;
			postprocessing.bokeh_uniforms[ "focus" ].value = 0.1;
		}



		//

    		three.renderer.clear();

					// Render scene into texture
		three.scene.overrideMaterial = null;
		three.renderer.render( three.scene, three.camera, postprocessing.rtTextureColor, true );
		// Render depth into texture
			three.scene.overrideMaterial = material_depth;
		three.renderer.render( three.scene, three.camera, postprocessing.rtTextureDepth, true );

		// Render bokeh composite
		three.renderer.render( postprocessing.scene, postprocessing.camera );

    		// render
		//three.composer.render();
		//three.composer.render(postprocessing.scene, postprocessing.camera );
       		 // request new frame
        	requestAnimFrame(function(){
        	    dofAnimate();
        	});
        }


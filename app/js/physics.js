// Overworld / js / physics.js
// Jeremy Evans Openspacehexagon@gmail.com
self.observer = {
  "position":[0,0,0],
    "velocity":[0,0,0]
};

self.scale = 1;

self.CollisionObject = function CollisionObject (id,physics,radius,extra,size,position,worldKey,contentFlag,shape) {

    var extraData = extra.split("<ExtraPart>");
    extraData.splice(0,1);
    var extraParts = [];
        extraData.forEach(function (part) {
            part = part.split(",");
            if(part[0]=="sphere"){
                var partRadius = (parseFloat(part[5])+parseFloat(part[6])+parseFloat(part[7]))/1.5;
            } else {
                var partRadius = (parseFloat(part[5])+parseFloat(part[6])+parseFloat(part[7]))/3.3;
            }
            part.push(partRadius);
//             self.postMessage('{"command":"log","data":'+partRadius+'}');
//             self.postMessage('{"command":"log","data":'+JSON.stringify(part)+'}');
            extraParts.push(part);
        });

    return {
        "position":position,
        "shape":shape,
        "extra":extraParts,
        "radius":radius,
        "size":size,
        "physics":physics,
        "id":id,
        "worldKey":worldKey,
        "contentFlag":contentFlag
    };
}

self.objects = [];

self.update = function () {
    var objectCollision = false,
        distance = 0,
        highest = 0,
        o = 0, // object counter
		co = null, // collision object
        speed = 0,
        newVelocity = [0,0,0];
    //observerScale = Math.sqrt((self.observer.position[0]*self.observer.position[0])+(self.observer.position[1]*self.observer.position[1])+(self.observer.position[2]*self.observer.position[2]))/8000;
    for (o = 0; o < self.objects.length; o++) {
        // check stuff  //  self.postMessage(JSON.stringify(self.objects[o]));
        co = self.objects[o];
        if (co.id == -2){
             //self.postMessage('{"command":"log","data":'+JSON.stringify(co)+'}');
            continue;
        }
        distance = Math.sqrt(Math.pow(self.observer.position[0]-co.position[0],2)+
                             Math.pow(self.observer.position[1]-co.position[1],2)+
                             Math.pow(self.observer.position[2]-co.position[2],2));
       //self.postMessage('{"command":"log","data":'+distance+'}');
                  speed = Math.sqrt(Math.sqrt((self.observer.velocity[0]*self.observer.velocity[0])+(self.observer.velocity[1]*self.observer.velocity[1])+(self.observer.velocity[2]*self.observer.velocity[2])));
         if(distance < co.radius) {
            if(co.extra.length == 0) {
                newVelocity = [self.observer.position[0]-co.position[0],
                               self.observer.position[1]-co.position[1],
                               self.observer.position[2]-co.position[2]];
                highest = Math.max(newVelocity[0],newVelocity[1],newVelocity[2]);
                newVelocity = [self.observer.velocity[0]*0.5+(newVelocity[0]/highest)*speed,
                               self.observer.velocity[1]*0.5+(newVelocity[1]/highest)*speed,
                               self.observer.velocity[2]*0.5+(newVelocity[2]/highest)*speed];
                self.postMessage('{"command":"collision","data":{"id":'+co.id+',"contentFlag":'+co.contentFlag+', "worldKey":"'+co.worldKey+'","newVelocity":['+newVelocity[0]+','+newVelocity[1]+','+newVelocity[2]+']}}');
            } else {
                //  self.postMessage('{"command":"log","data":{"distance":'+distance+',"radius":'+co.radius+'}}');
                co.extra.forEach(function (extraPart) {
                    var partPosition = [co.position[0]+parseInt(extraPart[2]),
                                co.position[1]+parseInt(extraPart[3]),
                                co.position[2]+parseInt(extraPart[4])];
                    var distance = Math.sqrt(Math.pow(self.observer.position[0]-partPosition[0],2)+
                                   Math.pow(self.observer.position[1]-partPosition[1],2)+
                                   Math.pow(self.observer.position[2]-partPosition[2],2));
                              //self.postMessage('{"command":"log"}')
                    //self.postMessage('{"command":"log","data":"'+extraPart[8]+'"}');
                    if (distance<((extraPart[16])+(100*self.scale))){
                        // self.postMessage('{"command":"log","data":"true"}');
                        if (co.contentFlag == 1) {
                            newVelocity = [0,0,0];
                        }  else {
                            newVelocity = [self.observer.position[0]-partPosition[0],self.observer.position[1]-partPosition[1],self.observer.position[2]-partPosition[2]];
                            highest = Math.max(newVelocity[0],newVelocity[1],newVelocity[2]);
                            newVelocity = [self.observer.velocity[0]*0.5+(newVelocity[0]/highest)*speed,
                                           self.observer.velocity[1]*0.5+(newVelocity[1]/highest)*speed,
                                           self.observer.velocity[2]*0.5+(newVelocity[2]/highest)*speed];
                        }

                        self.postMessage('{"command":"collision","data":{"id":'+co.id+',"contentFlag":'+co.contentFlag+', "worldKey":"'+co.worldKey+'","newVelocity":['+newVelocity[0]+','+newVelocity[1]+','+newVelocity[2]+']}}');
                                    objectCollision = true;
                                    return;
                    }
                });
            }
        }
    }
    self.postMessage('{"command":"update"}')
    self.updateLoop = setTimeout(function(){self.update();},33);
}

self.onmessage = function (event) {
  // Do some work.
    var data = JSON.parse(event.data);
    if (data.command == "update") {
        self.observer.position = data.data.position;
        self.observer.velocity = data.data.velocity;
        self.scale = data.data.scale;
        //self.postMessage(JSON.stringify(self.observer));
    } else if (data.command=="addObject"){
        var cObject = new self.CollisionObject(data.data.id,data.data.physics,data.data.radius,data.data.extra,data.data.size,data.data.position,data.data.worldKey,data.data.contentFlag,data.data.shape);
       self.objects.push(cObject);
        if (cObject.id == -1){
            self.unidentifiedObjects.push(cObject);
        }
        //console.log(JSON.stringify(self.objects[testC]));
    //  self.objects.push(data.data);
        //testC++;
    } else if (data.command == "updateObject"){
        // implement
        self.unidentifiedObjects[0].id = data.data.id;
        self.unidentifiedObjects.splice(0,1);
    } else if (data.command=="removeObject"){
        for(var o=0;o<self.objects.length;o++){
            var co = self.objects[o];
            if(co.id==data.data.id && co.worldKey == data.data.worldKey){
                self.objects.splice(o,1);
            }
        }
    } else if (data.command=="clearScene"){
        self.objects=[];
    } else if(data.command=="start"){
        self.update();
    } else if(data.command=="stop"){
        self.stop();
    } else if (data.command=="log"){
        self.postMessage('{"command":"log","data":['+self.observer.position[0]+','+self.observer.position[1]+','+self.observer.position[2]+']}');
         for(var o=0;o<self.objects.length;o++){
        // check stuff
        self.postMessage('{"command":"log","data":'+JSON.stringify(self.objects[o])+'}');
    }

    }
};

self.stop = function () {
    clearTimeout(self.updateLoop);
}

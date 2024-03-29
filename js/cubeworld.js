/**
 * @author Philipp Wahle
 * @description
 *
 * Computergrafik Beleg im SS/WS 1015/16
 *
 *
 * Controls:
 * m -> Toggle Map view
 * w/a/s/d -> move Player
 * mouse -> look around
 *
 * 1 ->  toggle point Light Helper
 * 2 -> toggle spot light helper
 * 0 -> toggle Mouse Lock
 * 9 -> toggle sounds
 */

if (!Detector.webgl) {

    Detector.addGetWebGLMessage();
    document.getElementById('container').innerHTML = "";
}


var container,
    stats;

var camera,
    controls,
    scene,
    renderer;

var mesh,
    mat;

var boxWidth = 10,
    boxDepth = 10,
    minHeight = 10,
    cellWidth = 10;

var worldWidth = 16,
    worldDepth = 50,
    totalWorldWidth = worldWidth * boxWidth,
    totalWorldDepth = worldDepth * boxDepth,
    worldHalfWidth = worldWidth / 2,
    worldHalfDepth = worldDepth / 2,
    data = generateHeight(worldWidth, worldDepth);

var SHADOW_MAP_WIDTH = 2048,
    SHADOW_MAP_HEIGHT = 1024;

var pointLightsCount = 40,
    spotLightsCount = 12,// 12,
    directionalLight;

var clock = new THREE.Clock();

var stateMode = 0;

var prevTime = performance.now();

var player = null;

var mousePos = new THREE.Vector2();

var collidableMeshList = [],
    pointLights = [],
    spotLights = [],
    blocks = [];


var videoElement,
    video,
    videotexture,
    videoMesh;


var randomEvents = {
    movePointLight: false,
    moveSpotLight: false,
    spawnParticles: false,
    playAudioVideo: false
};

var particleSystem,
    maxParticles = 500;

var particleOptions = {
    position: new THREE.Vector3(),
    positionRandomness: .3,
    velocity: new THREE.Vector3(),
    velocityRandomness: .5,
    color: 0xaa88ff,
    colorRandomness: .5, // .2
    turbulence: 2, // .5
    lifetime: 4, // 2
    size: 10, // 5
    sizeRandomness: 5 //1
};

var spawnerOptions = {
    spawnRate: 1000,
    horizontalSpeed: 1.75, // 1.5
    verticalSpeed: 1.5, // 1.33
    timeScale: 4000
};


init();
animate();

function init() {


    var width = window.innerWidth,
        height = window.innerHeight;

    container = document.getElementById('container');


    // x -> worldWidth;
    // z -> worldDepth

    // camera
    //camera = new THREE.PerspectiveCamera(50, width / height, 1, 20000);
    //camera.position.set(100, 14.6, 50);
    //camera.rotation.y = 0;
    //camera.rotation.z = -Math.PI;
    camera = new THREE.TargetCamera(50, width / height, 1, 20000);


    // scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xefd1b5, 0.0025);

    // player
    createPlayer();

    // random events
    addRandomEvents();

    // controls
    controls = new THREE.FirstPersonControls(player);

    controls.movementSpeed = 100;
    controls.lookSpeed = 0.125;
    controls.lookVertical = false;
    controls.activeLook = true;
    controls.verticalMin = 1.1;
    controls.verticalMax = 2.2;

    //controls = new ObjectControls( {
    //    mousePos: mousePos,
    //    targetObject: player
    //});

    // lights

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xcccccc, 2);
    directionalLight.position.set(1, 1, 0.5).normalize();
    //scene.add(directionalLight);

    // add lights to scene
    addLightSources();

    // terrain
    generateCitySkyline();
    addBuildingsToScene();

    // keyevent
    registerKeyEvents();

    // particle effects
    addParticles();


    addVideo();


    // renderer

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = "";

    container.appendChild(renderer.domElement);


    // stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    //stats.setMode(1);
    container.appendChild(stats.domElement);

    window.addEventListener('resize', onWindowResize, false);

}


/**
 *  resize event
 */
function onWindowResize() {

    var width = window.innerWidth,
        height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width / height);

    controls.handleResize();

}


function addVideo() {

    // create Video Element
    videoElement = document.createElement('video');
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.src = 'res/media/FX02.ogv';
    videoElement.play();

    // add Video Plane
    videotexture = new THREE.Texture(videoElement);
    videotexture.minFilter = THREE.LinearFilter;
    videotexture.magFilter = THREE.LinearFilter;
    videotexture.format = THREE.RGBAFormat;
    videotexture.generateMipmaps = false;

    // video material
    var material = new THREE.ShaderMaterial( {
        uniforms : {
            texture: {type: "t", value : videotexture}
        },
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent
    });

    var geometry = new THREE.PlaneGeometry(400, 400, 4, 4);

    videoMesh= new THREE.Mesh(geometry, material);

    videoMesh.position.set(100, 0, 380);
    videoMesh.rotation.x = -Math.PI  * .5 ;
    //scene.add(mesh);
}


/**
 *  animation function
 */

var time = 0;
var delta = 0;
function animate() {

    requestAnimationFrame(animate);

    //var time = Date.now() * 0.005;
    time = clock.getElapsedTime() * 0.05;
    delta = clock.getDelta();


    // var time = performance.now();
    //var delta = ( time - prevTime ) / 1000;

    animateCamera();


    checkCollision();


// random events that can occur

    eventMovePointLights(time);
    eventMoveSpotLights(time);

    //  console.log('delta', delta, clock.getDelta());
    eventSpawnParticles(delta);

    render();

}


/**
 * particle sytems
 */
function addParticles() {
    particleSystem = new THREE.GPUParticleSystem({
        maxParticles: maxParticles
    });

    particleSystem.position.set(100, 0, 250);

}

/**
 * toggle particle systems
 * @param add bool
 */
function toggleParticles(add) {
    if(add)
    {
        scene.add(particleSystem);
    }
    else {
        scene.remove(particleSystem);
    }
}


/**
 * toggle video
 * @param add bool
 */
function toggleVideo(add) {
    if(add)
    {
        scene.add(videoMesh);
        videoElement.play = true;

    }
    else {
        scene.remove(videoMesh);
        videoElement.play = false;
    }
}

/**
 * check for collision
 */
function checkCollision() {
    var originPoint = player.position.clone();

    for (var vertexIndex = 0; vertexIndex < player.geometry.vertices.length; vertexIndex++) {

        var localVertex = player.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(player.matrix);
        var directionalVector = globalVertex.sub(player.position);

        var ray = new THREE.Raycaster(originPoint, directionalVector.clone().normalize());
        var collisionResults = ray.intersectObjects(collidableMeshList);

        // console.log(collisionResults, directionalVector.length);

        if (collisionResults.length > 0 && collisionResults[0].distance < directionalVector.length()) {

            triggerRandomEvent(collisionResults[0].object.name);
        }
        else {
            setCollisionTarget(null);
        }
    }
}


var currentCollision = null,
    oldCollision = null;
/**
 *  trigger random event on collision
 * @param name
 */
function triggerRandomEvent(name) {

    // check if is intersecting
    if (isIntersecting(name)) return;

    // trigger Event
    // console.log('hit', name, currentCollision);

    switch (name) {
        case 'randomEvent-0' :
            eventStartMoveingPointLights();
            break;
        case 'randomEvent-1' :
            eventStopMoveingPointLights();
            break;

        case 'randomEvent-2' :
            eventStartParticles();
            //eventStartMoveingSpotLights();
            break;

        case 'randomEvent-3' :
            eventStopParticles();
            //  eventStopMoveingSpotLights();
            break;

        case 'randomEvent-4' :
            eventPlayVideo();
            break;

        case 'randomEvent-5' :
            eventStopVideo();
            break;

        case 'randomEvent-6' :
            eventJiggleBuildings();
            break;

        case 'randomEvent-7' :
            eventChangeBuildings();
            break;
    }

    // set current intersetion
    setCollisionTarget(name);

}

/**
 * start to move Point Lights around the scene
 */
function eventStartMoveingPointLights() {
    randomEvents.movePointLight = true;
}

/**
 * stop to move Point Lights around the scene
 */
function eventStopMoveingPointLights() {
    randomEvents.movePointLight = false;
}

/**
 * start to jiggle spots Lights
 * unsuported
 */
function eventStartMoveingSpotLights() {
    randomEvents.moveSpotLight = true;
}

/**
 * stop to jiggle spots Lights
 * unsuported
 */
function eventStopMoveingSpotLights() {
    randomEvents.moveSpotLight = false;
}

/**
 * start and spawn particles
 */
function eventStartParticles() {
    randomEvents.spawnParticles = true;
    toggleParticles(true);
}

/**
* stop and despawn particles
*/
function eventStopParticles() {
    randomEvents.spawnParticles = false;

    toggleParticles(false);
}

/**
 * play the video clip
 */
function eventPlayVideo() {
    randomEvents.playAudioVideo = true;
    toggleVideo(true);
}

/**
 * stop the video clip
 */
function eventStopVideo() {
    randomEvents.playAudioVideo = false;
    toggleVideo(false);
}

/**
 * change the building size on event
 */
function eventChangeBuildings() {

    for (var i = 0; i < blocks.length; i++) {

        var factor = Math.random();
        blocks[i].geometry.scale.y = factor + .5; //* 2 - 1
        blocks[i].geometry.position.y = (blocks[i].size.y * factor) / 2;

    }

}


/**
 * jiggle the building position on event
 */
function eventJiggleBuildings() {
    for (var i = 0; i < blocks.length; i++) {

        blocks[i].geometry.position.x = jiggle(blocks[i].jiggle.value.x, blocks[i].jiggle.amount.x);
        blocks[i].geometry.position.z = jiggle(blocks[i].jiggle.value.z, blocks[i].jiggle.amount.z);

        var factor = randomRange(.7,.8);
        blocks[i].geometry.scale.x = factor;
        blocks[i].geometry.scale.z = factor;

    }
}


/**
 * set current intersection
 * @param name
 */
function setCollisionTarget(name) {
    if (currentCollision != name) {
        oldCollision = currentCollision;
        currentCollision = name;
        // console.log('col', oldCollision, currentCollision);
    }

}

/**
 * check if is interesecting with curren object
 * @param name
 * @returns {boolean}
 */
function isIntersecting(name) {
    return name === currentCollision;
}

/**
 *  create the height of the buildingsd
 * @param width
 * @param height
 * @returns {Array}
 */
function generateHeight(width, height) {

    var data = [],
        perlin = new ImprovedNoise(),
        size = width * height,
        quality = 2,
        z = Math.random() * 100;

    for (var j = 0; j < 4; j++) {

        if (j == 0) {

            for (var i = 0; i < size; i++) {
                data[i] = 0;
            }
        }

        for (var i = 0; i < size; i++) {

            var x = i * Math.random() * 2 - 1;//  i % width,
            y = ( i / width ) | 0;
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality) + minHeight;
        }

        quality *= 6

    }

    return data;

}

/**
 *  generate the streets
 */
function generateCitySkyline() {

    for (var z = 0; z < worldDepth; z++) {

        setY(worldHalfWidth, z, 0);
        setY(worldHalfWidth + 1, z, 0);
        setY(worldHalfWidth - 1, z, 0);

        if (z % cellWidth == 0) {
            for (var x = 0; x < worldWidth; x++) {

                setY(x, z + 1, 0);
                setY(x, z, 0);
                setY(x, z - 1, 0);

            }
        }
    }


}

/**
 *
 * create the skyscraper look
 */
function addBuildingsToScene() {


    var boxSpacingWidth = boxWidth / 3;
    var boxSpacingDepth = boxDepth / 3;

    for (var z = 0; z < worldDepth; z++) {

        for (var x = 0; x < worldWidth; x++) {

            var h = getY(x, z);

            if (h === 0) continue;

            var boxGeometry = new THREE.BoxGeometry(
                boxWidth,//+ Math.random() * boxWidth/2 - boxWidth/4,
                h,
                boxDepth,// + Math.random() * boxDepth/2 - boxDepth/4);
                3,
                3,
                3
            );

            var boxMaterial = new THREE.MeshPhongMaterial({
                color: 0xcccccc,
                specular: 0x444444,
                shininess: 30,
                shading: THREE.FlatShading
            });

            //boxMaterial.castShadow = true;
            //boxMaterial.receiveShadow = true;

            var box = new THREE.Mesh(boxGeometry, boxMaterial);
            var boxX = x * (boxWidth + boxWidth / 4);
            var boxZ = z * (boxDepth + boxDepth / 4);

            var jiggleX = boxSpacingWidth / 1.2546;
            var jiggleZ = boxSpacingDepth / 1.2546;

            box.position.set(jiggle(boxX, jiggleX), h / 2, jiggle(boxZ, jiggleZ));

            var blockSettings = {
                geometry: box,
                size: {
                    x: boxWidth,
                    y: h,
                    z: boxDepth
                },
                jiggle: {
                    value: {
                        x: boxX,
                        z: boxZ
                    },
                    amount: {
                        x: jiggleX,
                        z: jiggleZ
                    }


                }
            };

            blocks.push(blockSettings);

            scene.add(box);

        }

    }
}

/**
 *
 * @param value
 * @param amout
 * @returns {number}
 */
function jiggle(value, amout) {
    var a2 = amout * 2;
    var ran = Math.random() * a2 - amout;

    return value + ran;

}

/**
 *
 * add random point light to scene
 */
function addLightSources() {

    //var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
    //  scene.add( light );

    for (var i = 0; i < pointLightsCount; i++) {

        var light = new THREE.PointLight(Math.random() * 0xffffff, 1, Math.random() + 50);

        // light.position.set(Math.random() * worldWidth, Math.random() * 100, Math.random() * worldDepth);


        var sphereSize = 1;
        var pointLightHelper = new THREE.PointLightHelper(light, sphereSize);


        var pointLightSetting = {
            light: light,
            helper: pointLightHelper,
            position: {
                x: Math.random() * totalWorldWidth,
                y: randomRange(0, 100),
                z: Math.random() * totalWorldDepth
            },
            moveValue: {
                x: randomRange(20, 150), // -10, 210
                y: randomRange(-10, 100), // -25 100
                z: randomRange(20, 150) // -10 610
            },
            speed: {
                x: randomRange(.1, 10),
                y: randomRange(.1, 10),
                z: randomRange(.1, 10)
            }

        };

        light.position.x = pointLightSetting.position.x;
        light.position.y = pointLightSetting.position.y;
        light.position.z = pointLightSetting.position.z;

        pointLights.push(pointLightSetting);


        // scene.add(pointLightHelper);

        //light.castShadow = true;
        //
        //light.shadowCameraNear = 1200;
        //light.shadowCameraFar = 2500;
        //light.shadowCameraFov = 50;
        //
        ////light.shadowCameraVisible = true;
        //
        //light.shadowBias = 0.0001;
        //
        //light.shadowMapWidth = SHADOW_MAP_WIDTH;
        //light.shadowMapHeight = SHADOW_MAP_HEIGHT;


        scene.add(light);
    }

    var step = 612 / spotLightsCount;
    for (var i = 0; i < spotLightsCount; i++) {
        var spotLight = new THREE.SpotLight(Math.random() * 0xffffff, Math.random(), Math.random() * 25 + 75); // Math.random() * 20

        var spotLightHelper = new THREE.SpotLightHelper(spotLight);

        var spotLightSetting = {
            light: spotLight,
            helper: spotLightHelper,
            moveValue: {
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100,
                z: Math.random() * 200 - 100
            },
            speed: {
                x: Math.random() * 0.0005 - 0.00025,
                y: Math.random() * 0.0005 - 0.00025,
                z: Math.random() * 0.0005 - 0.00025
            }

        };

        spotLight.rotation.z = randomRange(Math.PI * 0.25, Math.PI * 1.5);

        spotLights.push(spotLightSetting);

        spotLight.position.set(100, 5, step * (i + 1));

        scene.add(spotLight);
        //scene.add(spotLightHelper);


    }


}


function randomRange(min, max) {
    return min + (Math.random() * ((max - min) + 1));
}


/**
 * add player to scene
 */
function createPlayer() {


    // create Player

    // 100, 14.6, 50
    var geometry = new THREE.SphereGeometry(10 / 3, 32, 32);
    var material = new THREE.MeshPhongMaterial({
        color: 0xcc0000,
        specular: 0x444444,
        shininess: -100, // 30
        diffuse: 100, // none
        shading: THREE.FlatShading
    });

    player = new THREE.Mesh(geometry, material);
    player.position.set(100, 16, 50);
    scene.add(player);

    // set camera perspective

    camera.addTarget({
        name: 'map',
        targetObject: player,
        cameraPosition: new THREE.Vector3(0, 200, 20),
        stiffness: 0.3,
        fixed: false
    });

    camera.addTarget({
        name: 'first',
        targetObject: player,
        cameraPosition: new THREE.Vector3(0, 0, 32),
        stiffness: 0.5,
        fixed: false
    });

    camera.setTarget('first');
}


/**
 * placement of random events
 */
function addRandomEvents() {

    // events

    var zPos = 125;
    for (var i = 0; i < 8; i++) {
        var geometry = new THREE.SphereGeometry(10, 20, 20);
        var material = new THREE.MeshPhongMaterial({
            color: Math.random() * 0xcccccc,
            specular: 0xc0c0c0,
            shininess: 30, // 30
            shading: THREE.FlatShading
        });

        var randomEvent = new THREE.Mesh(geometry, material);

        var xPos = i % 2 == 0 ? 30 : 160;

        randomEvent.position.set(xPos, 16, zPos);
        zPos += (xPos === 160 ? 125 : 0);


        console.log(randomEvent.position);
        randomEvent.name = 'randomEvent-' + i;
        collidableMeshList.push(randomEvent);
        scene.add(randomEvent);
    }

}

var showPointLightHelper = false;

/**
 *
 */
function togglePointLightHelper() {
    if (showPointLightHelper) {
        showPointLightHelper = false;

        for (var i = 0; i < pointLightsCount; i++) {
            scene.remove(pointLights[i].helper)
        }

    } else {
        showPointLightHelper = true;

        for (var i = 0; i < pointLightsCount; i++) {
            scene.add(pointLights[i].helper)
        }
    }
}

/**
 *
 */
function toggleMouseMove() {
    controls.activeLook = !controls.activeLook;
}

/**
 * toggle sounds
 */
function toggleSounds() {
    videoElement.muted = !videoElement.muted;
}


var showSpotLightHelper = false;

/**
 * toggle Spot light helper
 */
function toggleSpotLightHelper() {

    if (showSpotLightHelper) {
        showSpotLightHelper = false;

        for (var i = 0; i < spotLightsCount; i++) {
            scene.remove(spotLights[i].helper)
        }

    } else {
        showSpotLightHelper = true;

        for (var i = 0; i < spotLightsCount; i++) {
            scene.add(spotLights[i].helper)
        }
    }
}

/**
 *
 */
function registerKeyEvents() {
    var onKeyDown = function (event) {

        console.log(event, event.keyCode);

        switch (event.keyCode) {

            case 48: // 0
                toggleMouseMove();
                break;

            case 49: // 1
                togglePointLightHelper();
                break;

            case 50: // 2
                toggleSpotLightHelper();
                break;

            case 57: // 9
                toggleSounds();
                break;

            case 80: // p
                console.log(player.position);
                break;

            case  72: // h
                toggleHelpWindow();
                break;

            case 77: // m


                if (camera.currentTargetName === 'first') {

                    // change camera
                    camera.setTarget('map');
                    //  mousePos.set(0, 0);


                }
                else {
                    camera.setTarget('first');

                }

                break;

        }

    };

    var onKeyUp = function (event) {

        switch (event.keyCode) {

        }

    };

    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('mousemove', onMouseMove, false);

}


var isModalOpen = true;
/**
 * toggle help window
 */
function toggleHelpWindow() {

    var modal = document.getElementById('modal');
  if(isModalOpen) {

      isModalOpen = false;
      modal.className = 'hide';

  }
    else {
      isModalOpen = true;
      modal.className = '';
  }
}

/**
 *
 * @param x
 * @param z
 * @returns {number}
 */
function getY(x, z) {

    return ( data[x + z * worldWidth] * 0.5 ) | 0;

}

/**
 *
 * @param x
 * @param z
 * @param v
 */
function setY(x, z, v) {

    data[x + z * worldWidth] = v;
}


/**
 * render function
 */
function render() {

    stats.update();
    controls.update(clock.getDelta());
    renderer.render(scene, camera);

    camera.update();

    // update video Texture
    videotexture.needsUpdate = true;

}


/**
 * event
 * move light around the scene
 */
function eventMovePointLights(time) {

    if (!randomEvents.movePointLight)  return;

    for (var i = 0; i < pointLightsCount; i++) {
        pointLights[i].light.position.x = Math.sin(time * pointLights[i].speed.x) * pointLights[i].moveValue.x + pointLights[i].position.x;
        pointLights[i].light.position.y = Math.sin(time * pointLights[i].speed.y) * pointLights[i].moveValue.y + pointLights[i].position.y;
        pointLights[i].light.position.z = Math.cos(time * pointLights[i].speed.z) * pointLights[i].moveValue.z + pointLights[i].position.z;

    }
    //console.log( time ,pointLights[0].speed.x, time * pointLights[0].speed.x);
}

/**
 * event
 * move light around the scene
 */
function eventMoveSpotLights(time) {

    if (!randomEvents.moveSpotLight)  return;

    for (var i = 0; i < spotLightsCount; i++) {
        //spotLights[i].light.rotation.x = Math.sin(time * spotLights[i].speed.x) * spotLights[i].moveValue.x;
        // spotLights[i].light.rotation.y = Math.cos(time * spotLights[i].speed.y) * spotLights[i].moveValue.y;
        spotLights[i].light.rotation.z = Math.cos(time * spotLights[i].speed.z) * spotLights[i].moveValue.z;
    }
}

var tick = 0;
function eventSpawnParticles(delta) {

    if(!randomEvents.spawnParticles) return;

    var d = delta * spawnerOptions.timeScale;

    tick += d;

    if (tick < 0) {
        tick = 0;
    }

    if (d > 0) {
        particleOptions.position.x = Math.sin(tick * spawnerOptions.horizontalSpeed) * 20;
        particleOptions.position.y = Math.sin(tick * spawnerOptions.verticalSpeed) * 40;
        particleOptions.position.z = Math.sin(tick * spawnerOptions.horizontalSpeed + spawnerOptions.verticalSpeed) * 5;

        for (var i = 0; i < spawnerOptions.spawnRate * d; i++) {
            particleSystem.spawnParticle(particleOptions);
        }
    }

    // console.log('particle', d, tick);

    particleSystem.update(tick);
}

/**
 *
 * @param event
 */
function onMouseMove(event) {

    var x = event.pageX - (window.innerWidth / 2),
        y = event.pageY - (window.innerHeight / 2),
        threshold = 15;

    if ((x > 0 && x < threshold) || (x < 0 && x > -threshold)) {
        x = 0;
    }

    if ((y > 0 && y < threshold) || (y < 0 && y > -threshold)) {
        y = 0;
    }

    mousePos.set(x, y);
}
/**
 *
 * @param delta
 */
function animateCamera(delta) {

    camera.lookAt(player.position);

}

/**
 *
 * @param id
 * @param light
 * @returns {THREE.ShaderMaterial}
 */
function createShaderMaterial(id, light) {

    var shader = THREE.ShaderTypes[id];

    var u = THREE.UniformsUtils.clone(shader.uniforms);

    var vs = shader.vertexShader;
    var fs = shader.fragmentShader;

    var material = new THREE.ShaderMaterial({uniforms: u, vertexShader: vs, fragmentShader: fs});

    material.uniforms.uDirLightPos.value = light.position;
    material.uniforms.uDirLightColor.value = light.color;

    return material;
}

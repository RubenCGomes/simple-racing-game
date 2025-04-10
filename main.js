import * as THREE from 'three';
import {OrbitControls} from "https://cdn.jsdelivr.net/npm/three@0.174/examples/jsm/controls/OrbitControls.js";
import {RGBELoader} from 'https://threejs.org/examples/jsm/loaders/RGBELoader.js';


// local imports
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Stats from 'three/addons/libs/stats.module.js';
import {TrackModel} from "./models/trackModel.js";
import CarModel from "./models/carModel.js";
import {Vector3} from "three";

/* --- GLOBAL VARIABLES --- */
let scene, cameraList = [];
let track, car;         // objects

// lighting
let hemiLight, dirLight;

// keep track of the keyboard - WASD
let keyD = false, keyA = false, keyS = false, keyW = false;

// start stats
const container = document.getElementById('container');
const stats = new Stats();
container.appendChild(stats.dom);


// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);


// Scene setup
function startScene() {
    // start scene and camera setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x333333 );
    scene.environment = new RGBELoader().load('./textures/equirectangular/spruit_sunrise_1k.hdr');
    scene.castShadow = true;
    // scene.environment.mapping = THREE.EquirectangularReflectionMapping;
    // scene.fog = new THREE.Fog(0x333333, 100, 1000);
}

startScene();

const gltfLoader = new GLTFLoader();
track = await new TrackModel(scene, gltfLoader);
car = await new CarModel(scene, gltfLoader);

await gltfLoader.loadAsync('./track.gltf', (gltf) => {});
await gltfLoader.loadAsync('./car.glb', (gltf) => {});

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, -5);

const cameraOffset = new THREE.Vector3(0, 3, -5);

// controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting
function lighting(){
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 0.75, 0.5);
    hemiLight.groundColor.setHSL(0.095, 0.5, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(-50, 50, 50);
    scene.add(dirLight);
    dirLight.castShadow = true;
    dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;
    // dirLight.shadowCameraVisible = true;

    const d = 1000;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;


    // fix for shadow artifacts on blender models
    dirLight.shadow.bias -=0.002;

    // values for shadow quality
    dirLight.shadow.mapSize.x = 4096;
    dirLight.shadow.mapSize.y = 4096;
    return hemiLight, dirLight;
}

hemiLight,dirLight = lighting();

// const helper = new THREE.CameraHelper(dirLight.shadow.camera);
// scene.add(helper);

const carObjects = car.carObjects;
const values = Object.values(carObjects);
let turnLeft = false, turnRight = false, turnFlag = false;

animate();

// Animation loop
function animate() {
    setTimeout( function() {
        requestAnimationFrame(animate);
    }, 1000 / 60);
    controls.update();
    renderer.render(scene, camera);

    // animate light
    // dirLight.position.x = Math.sin(Date.now() * 0.001) * 50;

    stats.update();


    if (keyD) {
        if (!turnFlag || turnLeft) {
            car.wheels["WHEEL_LF"].rotation.z += (Math.PI / 32);
            car.wheels["WHEEL_RF"].rotation.z += (Math.PI / 32);
            turnRight = turnFlag = true;
            turnLeft = false;
        }
    } else if (keyA) {
        if (!turnFlag || turnRight) {
            car.wheels["WHEEL_LF"].rotation.z -= (Math.PI / 32);
            car.wheels["WHEEL_RF"].rotation.z -= (Math.PI / 32);
            turnLeft = turnFlag = true;
            turnRight = false;
        }
    } else {
        // reset wheels based on turn
        if (turnLeft) {
            car.wheels["WHEEL_LF"].rotation.z += (Math.PI / 32);
            car.wheels["WHEEL_RF"].rotation.z += (Math.PI / 32);
        } else if (turnRight) {
            car.wheels["WHEEL_LF"].rotation.z -= (Math.PI / 32);
            car.wheels["WHEEL_RF"].rotation.z -= (Math.PI / 32);
        }
        turnFlag = turnRight = turnLeft = false;
    }

    if (keyW) {
        if (car.carSpeed > 0){
            car.accelerate();
        } else if (car.carSpeed === 0){
            car.engage_forward();
        } else {
            car.brake();
        }
    } else if (keyS) {
        if (car.carSpeed > 0){
            car.brake();
        } else if (car.carSpeed === 0) {
            car.engage_backward();
        } else {
            car.reverse();
        }
    } else {
        car.deccelerate();
    }

    if (turnLeft){
        values.forEach(function(value){
            if (car.carSpeed !== 0) value.rotation.z -= (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
        })
        camera.rotation.z -= (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
    } else if (turnRight){
        values.forEach(function(value){
            if (car.carSpeed !== 0) value.rotation.z += (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
        })
        camera.rotation.z += (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
    } else {
        values.forEach(function(value){
            // if (car.carSpeed != 0) value.rotation.z = 0;
        })
    }

    camera.lookAt(car.carObjects["polymsh"].position);
    // camera.position.set(car.carObjects["polymsh"].position.x,
    //                     car.carObjects["polymsh"].position.y,
    //                     car.carObjects["polymsh"].position.z).add(cameraOffset);

    values.forEach(part => {
        if (part.name === "FRONT_LIGHTS") part.translateY(-car.carSpeed)
        else part.translateY(car.carSpeed);
    })
    console.log(car.carSpeed);
}

// Resize handling
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
// Event Listeners

document.addEventListener('keydown', onDocumentKeyDown, false);
document.addEventListener('keyup', onDocumentKeyUp, false);


function onDocumentKeyDown(event) {
    switch (event.keyCode) {
        case 68: //d
            keyD = true;
            break;
        case 83: //s
            keyS = true;
            break;
        case 65: //a
            keyA = true;
            break;
        case 87: //w
            keyW = true;
            break;
    }
}

function onDocumentKeyUp(event) {
    switch (event.keyCode) {
        case 68: //d
            keyD = false;
            break;
        case 83: //s
            keyS = false;
            break;
        case 65: //a
            keyA = false;
            break;
        case 87: //w
            keyW = false;
            break;
    }
}

function rotateAboutPoint(obj, point, axis, theta, pointIsWorld = false){

    if(pointIsWorld){
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if(pointIsWorld){
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}
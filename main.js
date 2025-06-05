import * as THREE from 'three';
import {RGBELoader} from 'https://threejs.org/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// local imports
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Stats from 'three/addons/libs/stats.module.js';
import {TrackModel} from "./models/trackModel.js";
import CarModel from "./models/carModel.js";
import {SpotlightModel} from "./models/spotlightModel.js";

/* --- GLOBAL VARIABLES --- */
let scene;
let track, car, tracklight;         // objects

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
tracklight = await new SpotlightModel(scene, gltfLoader, 10, 10);


await gltfLoader.loadAsync('./track.glb', (gltf) => {});
await gltfLoader.loadAsync('./car.glb', (gltf) => {});
await gltfLoader.loadAsync('./spotlight.glb', (gltf) => {});

// --- Camera System ---
let cameraMode = 0; // 0 = chase, 1 = hood

// Main chase camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, -5);


let hoodCamera = null;
if (car && car.carCameras && car.carCameras.length > 1) {
    hoodCamera = car.carCameras[1];
}
// change the camera's field of view
hoodCamera.fov = 75; // Adjust as needed

// Hood camera offset relative to carBase (tweak as needed)
const hoodCameraOffset = new THREE.Vector3(0.6, 0.7, -1);
// where the hood camera should look at
let hoodCameraLookAtOffset = new THREE.Vector3(0, 100, 0);

// define camera offset
const cameraOffset = new THREE.Vector3(0, 2, -4);

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // Initial target (will be updated to follow the car)
controls.enableDamping = true; // Smooth camera movement
controls.dampingFactor = 0.05;
controls.enablePan = false; // Disable panning
controls.minDistance = 5; // Minimum zoom distance
controls.maxDistance = 50; // Maximum zoom distance
controls.update();

// Lighting
function lighting(){
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 0.75, 0.5);
    hemiLight.groundColor.setHSL(0.095, 0.5, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    return hemiLight;
}

hemiLight = lighting();

// const helper = new THREE.CameraHelper(dirLight.shadow.camera);
// scene.add(helper);

const carObjects = car.carObjects;
let turnLeft = false, turnRight = false, turnFlag = false;

// Default camera rotation angle
let cameraRotationAngle = -Math.PI / 2;

// --- Lapping System ---
let lapCount = 0;
let lastProgress = 0;
let lapStartTime = null;
let lastLapTime = null;
let bestLapTime = null;
let collectedCheckpoints = new Set();
const lapDisplay = document.createElement('div');
lapDisplay.style.position = 'absolute';
lapDisplay.style.top = '10px';
lapDisplay.style.left = '';
lapDisplay.style.right = '10px';
lapDisplay.style.padding = '10px';
lapDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
lapDisplay.style.color = 'white';
lapDisplay.style.fontFamily = 'Arial, sans-serif';
lapDisplay.style.fontSize = '18px';
lapDisplay.style.borderRadius = '5px';
lapDisplay.innerText = 'Lap: 0\nLast: --\nBest: --';
document.body.appendChild(lapDisplay);

// Add a reset indicator
const resetIndicator = document.createElement('div');
resetIndicator.style.position = 'absolute';
resetIndicator.style.top = '10px';
resetIndicator.style.right = '10px';
resetIndicator.style.padding = '10px';
resetIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
resetIndicator.style.color = 'white';
resetIndicator.style.fontFamily = 'Arial, sans-serif';
resetIndicator.style.fontSize = '14px';
resetIndicator.style.borderRadius = '5px';
resetIndicator.style.display = 'none'; // Initially hidden
resetIndicator.innerText = 'Car Reset!';
document.body.appendChild(resetIndicator);

// Add a reset tooltip
const resetTooltip = document.createElement('div');
resetTooltip.style.position = 'absolute';
resetTooltip.style.bottom = '10px';
resetTooltip.style.left = '10px';
resetTooltip.style.padding = '10px';
resetTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
resetTooltip.style.color = 'white';
resetTooltip.style.fontFamily = 'Arial, sans-serif';
resetTooltip.style.fontSize = '14px';
resetTooltip.style.borderRadius = '5px';
resetTooltip.innerText = 'Press "R" to reset the car';
document.body.appendChild(resetTooltip);

// --- Speed Indicator ---
const speedDisplay = document.createElement('div');
speedDisplay.style.position = 'absolute';
speedDisplay.style.bottom = '10px';
speedDisplay.style.right = '10px';
speedDisplay.style.padding = '10px';
speedDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
speedDisplay.style.color = 'white';
speedDisplay.style.fontFamily = 'Arial, sans-serif';
speedDisplay.style.fontSize = '18px';
speedDisplay.style.borderRadius = '5px';
speedDisplay.innerText = 'Speed: 0.00';
document.body.appendChild(speedDisplay);


// Function to reset the car's position
function resetCar() {
    car.carBase.position.set(0, 0.1, 0); // Reset to initial position
    car.carBase.rotation.set(Math.PI / 2, 0, 0); // Reset rotation
    car.carSpeed = 0; // Reset speed
    lapCount = 0;
    lastProgress = 0;
    lapStartTime = performance.now();
    lastLapTime = null;
    bestLapTime = null;
    lapDisplay.innerText = 'Lap: 0\nLast: --\nBest: --';

    collectedCheckpoints = new Set();
    if (track && track.checkpoints) {
        track.checkpoints.forEach(cp => cp.visible = true);
    }

    // Show the reset indicator briefly
    resetIndicator.style.display = 'block';
    setTimeout(() => {
        resetIndicator.style.display = 'none';
    }, 1000);

    // also reset the camera rotation
    cameraRotationAngle = -Math.PI / 2;
}

animate();

// Animation loop
function animate() {
    setTimeout(function () {
        requestAnimationFrame(animate);
    }, 1000 / 60);

    // Camera update logic
    if (cameraMode === 0) {
        // --- Chase camera logic (existing) ---
        const carPosition = car.carBase.position;
        const swappedCarPosition = new THREE.Vector3(carPosition.x, carPosition.y, carPosition.z);
        if (car.carSpeed !== 0) {
            const cameraTurnStep = Math.PI / 256; // smaller step for smoother, less rotation
            if (turnRight) {
                cameraRotationAngle += cameraTurnStep;
            } else if (turnLeft) {
                cameraRotationAngle -= cameraTurnStep;
            }
        }
        const radius = 5;
        const offsetX = radius * Math.cos(cameraRotationAngle);
        const offsetZ = radius * Math.sin(cameraRotationAngle);
        const targetCameraPosition = new THREE.Vector3(
            swappedCarPosition.x + offsetX,
            swappedCarPosition.y + cameraOffset.y,
            swappedCarPosition.z + offsetZ
        );
        camera.position.lerp(targetCameraPosition, 0.3);
        camera.lookAt(swappedCarPosition);
        controls.target.copy(swappedCarPosition);
        controls.update();
        renderer.render(scene, camera);
    } else {
        // --- Hood camera logic ---
        // Manually update hoodCamera position/rotation to follow car
        if (hoodCamera && car && car.carBase) {
            // Get carBase world position and quaternion
            car.carBase.updateMatrixWorld();
            const carWorldPos = new THREE.Vector3();
            car.carBase.getWorldPosition(carWorldPos);
            const carWorldQuat = new THREE.Quaternion();
            car.carBase.getWorldQuaternion(carWorldQuat);
            // Calculate hood camera world position
            const hoodWorldPos = hoodCameraOffset.clone().applyQuaternion(carWorldQuat).add(carWorldPos);
            hoodCamera.position.copy(hoodWorldPos);
            // Calculate look-at offset in the direction the car is heading
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(carWorldQuat).normalize();
            const lookAtWorld = hoodCameraLookAtOffset.clone().applyQuaternion(carWorldQuat).add(carWorldPos);
            hoodCamera.lookAt(lookAtWorld);
            renderer.render(scene, hoodCamera);

            if (car.carSpeed !== 0) {
                const cameraTurnStep = Math.PI / 256; // smaller step for smoother, less rotation
                if (turnRight) {
                    cameraRotationAngle += cameraTurnStep;
                } else if (turnLeft) {
                    cameraRotationAngle -= cameraTurnStep;
                }
            }
        }
    }

    stats.update();

    // Rotate each wheel according to the speed
    Object.values(car.wheels).forEach(
        wheel => {
            wheel.rotation.x += car.carSpeed * 1.5;
        }
    )

    if (keyD) {
        if (!turnFlag || turnLeft) {
            car.wheels["WHEEL_LF"].rotation.z += (Math.PI / 8);
            car.wheels["WHEEL_RF"].rotation.z += (Math.PI / 8);
            turnRight = turnFlag = true;
            turnLeft = false;
        }
    } else if (keyA) {
        if (!turnFlag || turnRight) {
            car.wheels["WHEEL_LF"].rotation.z -= (Math.PI / 8);
            car.wheels["WHEEL_RF"].rotation.z -= (Math.PI / 8);
            turnLeft = turnFlag = true;
            turnRight = false;
        }
    } else {
        // reset wheels based on turn
        if (turnLeft) {
            car.wheels["WHEEL_LF"].rotation.z += (Math.PI / 8);
            car.wheels["WHEEL_RF"].rotation.z += (Math.PI / 8);
        } else if (turnRight) {
            car.wheels["WHEEL_LF"].rotation.z -= (Math.PI / 8);
            car.wheels["WHEEL_RF"].rotation.z -= (Math.PI / 8);
        }
        turnFlag = turnRight = turnLeft = false;
    }

    if (keyS) {
        if (car.carSpeed > 0){
            car.brake();
        } else if (car.carSpeed === 0) {
            car.engage_backward();
        } else {
            car.reverse();
        }
    } else if (keyW) {
        if (car.carSpeed > 0){
            car.accelerate();
        } else if (car.carSpeed === 0){
            car.engage_forward();
        } else {
            car.brake();
        }
    } else {
        car.deccelerate();
    }

    if (turnLeft){
        if (car.carSpeed !== 0)
            car.carBase.rotation.z -= (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
            // car.carCameras[0].rotation.z += (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2)
    } else if (turnRight){
        if (car.carSpeed !== 0) car.carBase.rotation.z += (Math.PI / 256) * (0.2 * (car.carSpeed - 2)^2 + 0.2);
    }

    // --- Prevent car from going out of bounds (distance from track centerline) ---
    let carOutOfTrack = false;
    let trackWidth = 10; // Should match segmentWidth
    if (track && track.curve && car && car.carBase) {
        const carPos = car.carBase.position;
        // Find the closest point on the curve (approximate by sampling)
        let minDist = Infinity;
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pt = track.curve.getPointAt(t);
            const dist = carPos.distanceTo(pt);
            if (dist < minDist) {
                minDist = dist;
            }
        }
        // If car is farther than half the track width from the centerline, it's out of bounds
        carOutOfTrack = minDist > (trackWidth / 2);
    }

    // --- Slow down car if out of track ---
    if (carOutOfTrack && car && typeof car.carSpeed === 'number') {
        car.carSpeed *= 0.98; // Gradually slow down
    }

    // Update camera position to rotate around the car
    const carPosition = car.carBase.position;

    // Swap Y and Z axes for the car position
    const swappedCarPosition = new THREE.Vector3(carPosition.x, carPosition.y, carPosition.z);

    // Increment camera rotation angle only when the car is turning and moving
    if (car.carSpeed !== 0) {
        const cameraTurnStep = Math.PI / 256; // smaller step for smoother, less rotation
        if (turnRight) {
            cameraRotationAngle += cameraTurnStep;
        } else if (turnLeft) {
            cameraRotationAngle -= cameraTurnStep;
        }
    }

    const radius = 5; // Distance from the car
    const offsetX = radius * Math.cos(cameraRotationAngle);
    const offsetZ = radius * Math.sin(cameraRotationAngle);
    const targetCameraPosition = new THREE.Vector3(
        swappedCarPosition.x + offsetX,
        swappedCarPosition.y + cameraOffset.y,
        swappedCarPosition.z + offsetZ
    );

    // Smoothly interpolate the camera's position
    camera.position.lerp(targetCameraPosition, 0.3);

    // Make the camera look at the car
    camera.lookAt(swappedCarPosition);


    // Update camera target to follow the car
    controls.target.copy(swappedCarPosition);
    controls.update();

    car.carBase.translateY(car.carSpeed);

    // --- Speed Indicator ---
    if (car && typeof car.carSpeed === 'number') {
        const speedKmh = car.carSpeed * 240;
        speedDisplay.innerText = `Speed: ${speedKmh.toFixed(2)} km/h`;
    }

    // --- Checkpoint Collection ---
    if (track && track.checkpoints && car && car.carBase) {
        track.checkpoints.forEach((cp, idx) => {
            if (cp.visible && car.carBase.position.distanceTo(cp.position) < 8) {
                cp.visible = false;
                collectedCheckpoints.add(idx);
            }
        });
    }

    // --- Lapping System ---
    if (track && track.curve && car && car.carBase) {
        if (lapStartTime === null) lapStartTime = performance.now();
        // Project car position onto curve
        const carPos = car.carBase.position;
        // Find the closest point on the curve (approximate by sampling)
        let closestT = 0;
        let minDist = Infinity;
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pt = track.curve.getPointAt(t);
            const dist = carPos.distanceTo(pt);
            if (dist < minDist) {
                minDist = dist;
                closestT = t;
            }
        }
        // Lap detection: if progress wraps from near 1 to near 0, increment lap
        if (lastProgress > 0.8 && closestT < 0.2 && car.carSpeed > 0.1) {
            // Only count lap if all checkpoints were collected
            if (track && track.checkpoints && collectedCheckpoints.size === track.checkpoints.length) {
                const now = performance.now();
                if (lapStartTime) {
                    const lapTime = (now - lapStartTime) / 1000;
                    lastLapTime = lapTime;
                    if (!bestLapTime || lapTime < bestLapTime) bestLapTime = lapTime;
                }
                lapCount++;
                lapStartTime = now;
                lapDisplay.innerText = `Lap: ${lapCount}\nLast: ${lastLapTime ? lastLapTime.toFixed(2) + 's' : '--'}\nBest: ${bestLapTime ? bestLapTime.toFixed(2) + 's' : '--'}`;
                // Reset checkpoints
                collectedCheckpoints = new Set();
                if (track && track.checkpoints) {
                    track.checkpoints.forEach(cp => cp.visible = true);
                }
            }
        } else {
            // Update timer display for current lap
            if (lapStartTime && lapCount > 0) {
                const now = performance.now();
                const currentLap = ((now - lapStartTime) / 1000).toFixed(2);
                lapDisplay.innerText = `Lap: ${lapCount}\nLast: ${lastLapTime ? lastLapTime.toFixed(2) + 's' : '--'}\nBest: ${bestLapTime ? bestLapTime.toFixed(2) + 's' : '--'}\nCurrent: ${currentLap}s`;
            }
        }
        lastProgress = closestT;
    }
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
        case 82: // r
            resetCar();
            break;
        case 80: // p
            cameraMode = (cameraMode + 1) % 2;
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


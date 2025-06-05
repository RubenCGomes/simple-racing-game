import * as THREE from "three";
import { CatmullRomCurve3 } from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import ProjectTextures from "../textures/textures.js";

export class TrackModel {
    scene; gltfLoader;
    curve;
    checkpoints = [];
    checkpointGroup;
    groundPlane; // reference to ground plane mesh
    envGroup;     // reference to environment group
    envPlane;     // plane under buildings
    textures;     // store loaded textures

    constructor(scene, gltfLoader) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.loadTrack();
    }

    async loadTrack() {
        // Create a green plane (ground)
        const textures = new ProjectTextures();
        this.textures = textures;
        // init with dummy small plane; will resize after env spawn
        const planeGeometry = new THREE.PlaneGeometry(1, 1);
        const planeMaterial = textures.grass;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
        this.groundPlane = plane;

        // Generate random track
        this.generateRandomTrack();
    }

    generateRandomTrack() {
        const trackGroup = new THREE.Group();
        const segmentWidth = 10;
        const numCurvePoints = 10000;
        const turns = 18;

        const curvePoints = []; // Points for the Catmull-Rom curve
        let currentPosition = new THREE.Vector3(0, 0.1, 0); // Start position
        let currentDirection = new THREE.Vector3(0, 0, 1); // Start direction (forward)
        const initialDirection = currentDirection.clone(); // Save the initial direction

        for (let i = 0; i < turns; i++) {
            curvePoints.push(currentPosition.clone());

            if (i > 1) {
                const randomTurn = Math.random();
                const randomAngle = Math.random() * Math.PI / 4; // Random angle up to 45 degrees
                if (randomTurn < 0.33) {
                    currentDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
                } else if (randomTurn < 0.66) {
                    currentDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -randomAngle);
                }
            }

            const segmentLength = 50; // Fixed segment length
            currentPosition.add(currentDirection.clone().multiplyScalar(segmentLength));
        }

        // Force the last point to be directly behind the first point
        const firstPoint = curvePoints[0];
        const lastDirection = initialDirection.clone().negate(); // Opposite of the initial direction
        const lastPoint = firstPoint.clone().add(lastDirection.multiplyScalar(50)); // Place it behind the first point
        curvePoints.push(lastPoint);

        // Close the loop
        curvePoints.push(firstPoint.clone());

        // Create a Catmull-Rom curve from the points
        const curve = new CatmullRomCurve3(curvePoints, true);
        this.curve = curve; // Store the curve for lap tracking

        // Generate evenly spaced points along the curve
        const points = [];
        const curveLength = curve.getLength();
        const spacing = curveLength / numCurvePoints;

        for (let i = 0; i <= numCurvePoints; i++) {
            points.push(curve.getPointAt(i / numCurvePoints));
        }

        // Merge all track segments into a single geometry for performance
        const geometries = [];
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            const segmentGeometry = new THREE.BoxGeometry(segmentWidth, 0.2, start.distanceTo(end));
            // Move geometry to correct position and orientation
            const matrix = new THREE.Matrix4();
            const mid = start.clone().add(end).multiplyScalar(0.5);
            const lookAt = new THREE.Matrix4();
            lookAt.lookAt(mid, end, new THREE.Vector3(0, 1, 0));
            matrix.makeTranslation(mid.x, mid.y, mid.z);
            // Apply rotation
            const forward = end.clone().sub(start).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(up, forward).normalize();
            const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
            matrix.multiply(rotMatrix);
            segmentGeometry.applyMatrix4(matrix);
            geometries.push(segmentGeometry);
        }
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        const segmentMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            side: THREE.DoubleSide,
        });
        const mergedTrack = new THREE.Mesh(mergedGeometry, segmentMaterial);
        mergedTrack.castShadow = true;
        mergedTrack.receiveShadow = true;
        trackGroup.add(mergedTrack);

        // --- Add a plane that covers the generated track specifically ---
        // Compute the bounding box of the track points
        const boundingBox = new THREE.Box3();
        points.forEach(pt => boundingBox.expandByPoint(pt));
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        // Make the plane slightly larger than the bounding box
        const margin = 10;
        const trackPlaneGeometry = new THREE.PlaneGeometry(size.x + margin, size.z + margin);
        const trackPlaneMaterial = new THREE.MeshPhongMaterial({ color: 0x008800, side: THREE.DoubleSide });
        const trackPlane = new THREE.Mesh(trackPlaneGeometry, trackPlaneMaterial);
        trackPlane.position.set(center.x, 0.09, center.z); // Slightly below the track
        trackPlane.rotation.x = Math.PI / 2;
        trackPlane.receiveShadow = true;
        this.scene.add(trackPlane);

        // Place checkpoints evenly across the whole track
        this.checkpoints = [];
        const checkpointGroup = new THREE.Group();
        const numCheckpoints = turns; // Keep the number of checkpoints same as turns, but spread them evenly
        for (let i = 0; i < numCheckpoints; i++) {
            const t = i / numCheckpoints;
            const checkpointPos = curve.getPointAt(t);
            // Get direction of the track at this point
            const tangent = curve.getTangentAt(t);
            // Place a checkpoint
            const checkpointGeometry = new THREE.BoxGeometry(segmentWidth * 0.8, 6, 0.5);
            const checkpointMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true });
            const checkpoint = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpoint.position.copy(checkpointPos);
            // Orient the checkpoint perpendicular to the track direction
            const perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            checkpoint.lookAt(checkpointPos.clone().add(perp));
            checkpoint.rotateY(Math.PI / 2); // Rotate 90 degrees on X axis
            checkpoint.visible = true;
            checkpoint.userData.index = i;
            checkpointGroup.add(checkpoint);
            this.checkpoints.push(checkpoint);
        }
        this.scene.add(checkpointGroup);
        this.checkpointGroup = checkpointGroup;

        this.scene.add(trackGroup);

        // Add point lights alongside the track edges
        const lightGroup = new THREE.Group();
        const numTrackLights = 10;
        for (let i = 0; i < numTrackLights; i++) {
            const t = i / numTrackLights;
            const pos = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t);
            const perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const offsetDist = 10;
            // place light on both sides
            [1, -1].forEach(side => {
                const light = new THREE.PointLight(0xffffff, 30, 5);
                light.castShadow = false;
                light.shadow.mapSize.width = 128;
                light.shadow.mapSize.height = 128;
                light.position.copy(pos.clone().add(perp.clone().multiplyScalar(offsetDist * side)).setY(2));
                lightGroup.add(light);

                // add simple lamp-post pole
                const poleHeight = 3;
                const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, poleHeight);
                const poleMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const pole = new THREE.Mesh(poleGeom, poleMat);
                pole.position.copy(pos.clone().add(perp.clone().multiplyScalar(offsetDist * side)));
                pole.position.y = poleHeight / 2;
                pole.castShadow = true;
                pole.receiveShadow = true;
                lightGroup.add(pole);
            });
        }
        this.scene.add(lightGroup);

        const exclusionZone = boundingBox.clone().expandByScalar(margin);
        // spawn env and store group
        this.envGroup = this.addEnvironment(exclusionZone, 60, 100);
        // adjust ground plane to fit env
        this.adjustGroundPlane();
        this.createEnvironmentPlane();
    }

    // Spawn buildings and trees randomly outside the track exclusion zone
    addEnvironment(exclusionZone, numBuildings = 60, numTrees = 100) {
        const envGroup = new THREE.Group();
        // Prepare arrays for merged geometries
        const buildingGeoms = [];
        const trunkGeoms = [];
        const foliageGeoms = [];
        // Buildings: equal numbers on each side
        const half = Math.floor(numBuildings / 2);
        ['+', '-'].forEach((dir, idx) => {
            const side = idx === 0 ? 1 : -1;
            const count = idx === 0 ? half : (numBuildings - half);
            for (let i = 0; i < count; i++) {
                let x, z, attempts = 0;
                do {
                    const t = Math.random();
                    const basePos = this.curve.getPointAt(t);
                    const tangent = this.curve.getTangentAt(t);
                    const perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
                    const offsetDist = THREE.MathUtils.randFloat(15, 40) * side;
                    x = basePos.x + perp.x * offsetDist;
                    z = basePos.z + perp.z * offsetDist;
                    attempts++;
                } while (exclusionZone.containsPoint(new THREE.Vector3(x, 0, z)) && attempts < 20);
                // collect building geometry transformed in world
                const width = THREE.MathUtils.randFloat(5, 20);
                const depth = THREE.MathUtils.randFloat(5, 20);
                const height = THREE.MathUtils.randFloat(10, 50);
                const geom = new THREE.BoxGeometry(width, height, depth);
                // apply world transform
                geom.applyMatrix4(new THREE.Matrix4().makeTranslation(x, height / 2, z));
                buildingGeoms.push(geom);
            }
        });
        // Merge and add building mesh
        if (buildingGeoms.length) {
            const mergedB = BufferGeometryUtils.mergeGeometries(buildingGeoms);
            const matB = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const meshB = new THREE.Mesh(mergedB, matB);
            meshB.castShadow = meshB.receiveShadow = true;
            envGroup.add(meshB);
        }
        // Trees: spawn near the track with random offset to both sides
        for (let i = 0; i < numTrees; i++) {
            let x, z, attempts = 0;
            do {
                const t = Math.random();
                const basePos = this.curve.getPointAt(t);
                const tangent = this.curve.getTangentAt(t);
                const perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
                const side = Math.random() < 0.5 ? 1 : -1;
                const offsetDist = THREE.MathUtils.randFloat(12, 50) * side;
                x = basePos.x + perp.x * offsetDist;
                z = basePos.z + perp.z * offsetDist;
                attempts++;
            } while (exclusionZone.containsPoint(new THREE.Vector3(x, 0, z)) && attempts < 50);
            const trunkHeight = THREE.MathUtils.randFloat(2, 5);
            // collect trunk geom
            const tGeom = new THREE.CylinderGeometry(0.2, 0.2, trunkHeight);
            tGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(x, trunkHeight / 2, z));
            trunkGeoms.push(tGeom);
            const foliageHeight = THREE.MathUtils.randFloat(3, 8);
            const fGeom = new THREE.ConeGeometry(1.5, foliageHeight, 8);
            fGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(x, trunkHeight + foliageHeight / 2, z));
            foliageGeoms.push(fGeom);
        }
        // Merge and add trunk mesh
        if (trunkGeoms.length) {
            const mergedT = BufferGeometryUtils.mergeGeometries(trunkGeoms);
            const matT = new THREE.MeshPhongMaterial({ color: 0x553322 });
            const meshT = new THREE.Mesh(mergedT, matT);
            meshT.castShadow = meshT.receiveShadow = true;
            envGroup.add(meshT);
        }
        // Merge and add foliage mesh
        if (foliageGeoms.length) {
            const mergedF = BufferGeometryUtils.mergeGeometries(foliageGeoms);
            const matF = new THREE.MeshPhongMaterial({ color: 0x228822 });
            const meshF = new THREE.Mesh(mergedF, matF);
            meshF.castShadow = meshF.receiveShadow = true;
            envGroup.add(meshF);
        }
        this.scene.add(envGroup);
        return envGroup;
    }

    // Resize and position groundPlane to encompass all env objects
    adjustGroundPlane(margin = 20) {
        if (!this.groundPlane || !this.envGroup) return;
        const box = new THREE.Box3().setFromObject(this.envGroup);
        const size = new THREE.Vector3(); box.getSize(size);
        const center = new THREE.Vector3(); box.getCenter(center);
        // update geometry
        this.groundPlane.geometry.dispose();
        this.groundPlane.geometry = new THREE.PlaneGeometry(size.x + margin, size.z + margin);
        // reposition and keep rotation
        this.groundPlane.position.set(center.x, 0, center.z);
    }

    // Create a darker plane under all buildings/trees at y = -1
    createEnvironmentPlane(margin = 10) {
        if (!this.envGroup) return;
        const box = new THREE.Box3().setFromObject(this.envGroup);
        const size = new THREE.Vector3(); box.getSize(size);
        const center = new THREE.Vector3(); box.getCenter(center);
        // dispose old if exists
        if (this.envPlane) {
            this.envPlane.geometry.dispose();
            this.scene.remove(this.envPlane);
        }
        const geom = new THREE.PlaneGeometry(size.x + margin, size.z + margin);
        const mat = new THREE.MeshPhongMaterial({ color: 0x555555, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(geom, mat);
        plane.rotation.x = Math.PI / 2;
        plane.position.set(center.x, -1, center.z);
        plane.receiveShadow = true;
        this.scene.add(plane);
        this.envPlane = plane;
    }
}

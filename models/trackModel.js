import * as THREE from "three";
import { CatmullRomCurve3 } from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import ProjectTextures from "../textures/textures.js";
import {SpotlightModel} from "./spotlightModel.js";

export class TrackModel {
    trackObjects = {};
    scene; gltfLoader;
    curve;
    checkpoints = [];
    checkpointGroup;

    constructor(scene, gltfLoader) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.loadTrack();
    }

    async loadTrack() {
        // Create a green plane (ground)
        const textures = new ProjectTextures();
        const planeGeometry = new THREE.PlaneGeometry(800, 800);
        const planeMaterial = textures.grass;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);

        // Generate random track
        this.generateRandomTrack();
    }

    generateRandomTrack() {
        const trackGroup = new THREE.Group();
        const segmentWidth = 10;
        const numCurvePoints = 1600;
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
    }
}

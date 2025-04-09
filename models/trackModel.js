import * as THREE from "three";
import ProjectTextures from "../textures/textures.js";

const textures = new ProjectTextures();

export class TrackModel {

    trackObjects = {};
    scene; gltfLoader;

    constructor(scene, gltfLoader) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.loadTrack();
    }

    async loadTrack() {
        // Load track
        this.gltfLoader.load('./track.gltf', (gltf) => {
            console.log(gltf);
            gltf.scene.position.set(0, -5, 0);

            gltf.scene.traverse((child) => {
                // if (child.isMesh) {
                //     // Convert MeshStandardMaterial to MeshPhongMaterial
                //     if (child.material.name === "Asphalt") {
                //         child.material = textures.asphalt
                //     } else if (child.material.name === "Material.001") {
                //         child.material = textures.pitTexture;
                //     } else {
                //         child.material = new THREE.MeshPhongMaterial({
                //             color: child.material.color,
                //             specular: new THREE.Color(0x111111), // Adjust specular reflection
                //             shininess: 50 // Adjust glossiness
                //         });
                //     }
                // }
            });

            this.scene.add(gltf.scene);
            console.log(gltf.scene.children);
            gltf.scene.children.forEach(child => {
                this.trackObjects[child.name] = child;
            });
        });

        // Await for track to load
        await this.gltfLoader.loadAsync('./track.gltf', (gltf) => {});
        console.log(this.trackObjects)


        // trackObjects[1].material = new THREE.MeshPhongMaterial({color: 0x00ff00, side: THREE.DoubleSide});

        const values = Object.values(this.trackObjects);
        values.forEach(trackObject => {
            trackObject.castShadow = true;
            trackObject.receiveShadow = true;
        });

        this.trackObjects["Railing"].children.forEach(trackObject => {
            trackObject.castShadow = true;
            trackObject.receiveShadow = true;
        })

        this.trackObjects["Tree-1"].children.forEach(trackObject => {
            trackObject.castShadow = true;
            trackObject.receiveShadow = true;
        })
    }
}
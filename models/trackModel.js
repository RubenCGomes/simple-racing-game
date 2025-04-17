import * as THREE from "three";
import ProjectTextures from "../textures/textures.js";

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
        this.gltfLoader.load('./track.glb', (gltf) => {
            console.log(gltf);

            this.scene.add(gltf.scene);
            console.log(gltf.scene.children);
            gltf.scene.children.forEach(child => {
                this.trackObjects[child.name] = child;
            });
        });

        // Await for track to load
        await this.gltfLoader.loadAsync('./track.glb', (gltf) => {});
        console.log(this.trackObjects)


        // TODO: make this traversable
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
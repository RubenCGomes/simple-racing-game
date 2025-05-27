
export class SpotlightModel {
    spotlightObjects = {};
    spotlightBase;
    scene; gltfLoader;


    constructor(scene, gltfLoader, x, z, rotation=0) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.loadSpotlight().then(r => {
            this.spotlightBase.position.x = x;
            this.spotlightBase.position.z = z;
            this.spotlightBase.rotation.y = rotation;
        });
    }

    async loadSpotlight() {
        // Load spotlight
        this.gltfLoader.load('./spotlight.glb', (gltf) => {
            this.scene.add(gltf.scene);
            this.spotlightBase = gltf.scene.children[0];
            gltf.scene.children.forEach(child => {
                this.spotlightObjects[child.name] = child;

                child.traverse(object => {
                    if (object.type !== 'Group'){
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                    if (object.type === 'SpotLight'){
                        this.spotlightObjects[object.name] = object;
                        // object.shadow.bias -=0.002;
                        object.intensity = 300;
                        object.shadow.mapSize.width = 1024;
                        object.shadow.mapSize.height = 1024;
                    }
                })
            });
        });


        // Await for spotlight to load
        await this.gltfLoader.loadAsync('./spotlight.glb', (gltf) => {
        });
        console.log(this.spotlightObjects)
    }
}

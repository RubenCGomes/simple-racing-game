import * as THREE from "three";

export default class CarModel {
    carSpeed = 0;
    carObjects = {};
    carLights = {
        headlights: [
            new THREE.SpotLight(0xffffff, 2, 20),
            new THREE.SpotLight(0xffffff, 2, 20),
        ]
    };
    helpers = [
        new THREE.CameraHelper(this.carLights.headlights[0].shadow.camera),
        new THREE.CameraHelper(this.carLights.headlights[1].shadow.camera),
    ]
    scene; gltfLoader;
    maxFspeed = 2; maxBspeed = -0.4;


    constructor(scene, gltfLoader) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.createCar();
    }

    async createCar() {
        // Load car
        this.gltfLoader.load('./car.glb', (gltf) => {
            console.log(gltf);
            this.scene.add(gltf.scene);
            gltf.scene.children.forEach(child => {
                child.position.y -= 1;
                this.carObjects[child.name] = child;
            })
        });

        // Await for car to load
        await this.gltfLoader.loadAsync('./car.glb', () => {});

        this.carLights.headlights[0].position.set(this.carObjects["FRONT_LIGHTS"].children[0].position.x,
            -this.carObjects["FRONT_LIGHTS"].children[0].position.z - 1,
            -this.carObjects["FRONT_LIGHTS"].children[0].position.y)

        this.carLights.headlights[1].position.set(this.carObjects["FRONT_LIGHTS"].children[1].position.x,
            -this.carObjects["FRONT_LIGHTS"].children[1].position.z - 1,
            -this.carObjects["FRONT_LIGHTS"].children[1].position.y)

        this.carLights.headlights.forEach(light => {
            light.castShadow = true;
            // light.target = (0, 0, 0)
            light.rotateZ(Math.PI);
            this.scene.add(light);
        });
        this.helpers.forEach(helper => {this.scene.add(helper)});

        console.log(this.carObjects);
    }

    accelerate() {
        this.carSpeed = this.carSpeed + 0.001 < this.maxFspeed ? this.carSpeed + 0.001 : this.carSpeed;
    }

    reverse() {
        this.carSpeed = this.carSpeed - 0.001 >= this.maxBspeed ? this.carSpeed - 0.001 : this.carSpeed;
    }

    deccelerate() {
        this.carSpeed = this.carSpeed !== 0 ? this.carSpeed * 0.99 : this.carSpeed;
        this.round_speed();
    }

    brake() {
        this.carSpeed = this.carSpeed !== 0 ? (this.carSpeed > 0 ? this.carSpeed - 0.004 : this.carSpeed + 0.004) : this.carSpeed;
        this.round_speed();
    }

    engage_forward() {
        this.carSpeed = 0.01;
    }

    engage_backward() {
        this.carSpeed = -0.01;
    }

    round_speed(){
        this.carSpeed = this.carSpeed < 1 ? Math.round(this.carSpeed * 10000) / 10000 : this.carSpeed;
        if (this.carSpeed < 0.01 && this.carSpeed > -0.01) this.carSpeed = 0;
    }
}
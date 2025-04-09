import * as THREE from "three";

export default class CarModel {
    carSpeed = 0;
    carObjects = {}; carBase;
    wheels = {};

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
            this.carBase = gltf.scene.children[0];
            gltf.scene.children[0].children.forEach(child => {
                child.position.y -= 1;
                this.carObjects[child.name] = child;
                // keep wheels separated
                if (child.name === "WHEELS"){
                    child.children.forEach(c => {
                        this.wheels[c.name] = c;
                    })
                }
            })
        });

        // Await for car to load
        await this.gltfLoader.loadAsync('./car.glb', () => {});
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
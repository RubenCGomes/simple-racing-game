import * as THREE from "three";

export default class CarModel {
    carSpeed = 0;
    carCameras = [];
    carObjects = {}; carBase;
    wheels = {};

    // indices: L_LIGHT | R_LIGHT | L_BRAKE | R_BRAKE | REV_LIGHT
    carLights = {};

    scene; gltfLoader;
    maxFspeed = 2; maxBspeed = -0.4;


    constructor(scene, gltfLoader) {
        this.scene = scene;
        this.gltfLoader = gltfLoader;
        this.createCar();
    }

    async createCar() {
        this.gltfLoader.load('./car.glb', (gltf) => {
            console.log(gltf);
            this.scene.add(gltf.scene);
            this.carBase = gltf.scene.children[1];
            gltf.scene.children[1].children.forEach(child => {
                child.position.y -= 1;
                this.carObjects[child.name] = child;
                child.receiveShadow = true;
                // keep wheels separated
                if (child.name === "WHEELS") {
                    child.children.forEach(c => {
                        this.wheels[c.name] = c;
                    })
                }
                child.traverse(object => {
                    if (object.type !== 'Group'){
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                    if (object.type === 'SpotLight'){
                        this.carLights[object.name] = object;
                        object.shadow.bias -=0.002;
                        object.intensity = 300;
                    }
                    if (object.type === 'PointLight'){
                        this.carLights[object.name] = object;
                        object.shadow.bias -=0.002;
                        object.intensity = 0;
                    }
                })
            })

            this.carCameras = gltf.cameras;

        });
        // Load car

        // Await for car to load
        await this.gltfLoader.loadAsync('./car.glb', () => {});
        console.log(this.carObjects);
        console.log(this.carLights);
    }

    accelerate() {
        this.carSpeed = this.carSpeed + 0.001 < this.maxFspeed ? this.carSpeed + 0.001 : this.carSpeed;
        this.carLights["L_BRAKE"].intensity = 0;
        this.carLights["R_BRAKE"].intensity = 0;
    }

    reverse() {
        this.carSpeed = this.carSpeed - 0.001 >= this.maxBspeed ? this.carSpeed - 0.001 : this.carSpeed;
        this.carLights["L_BRAKE"].intensity = 0;
        this.carLights["R_BRAKE"].intensity = 0;
    }

    deccelerate() {
        this.carSpeed = this.carSpeed !== 0 ? this.carSpeed * 0.99 : this.carSpeed;
        this.round_speed();
        this.carLights["L_BRAKE"].intensity = 0;
        this.carLights["R_BRAKE"].intensity = 0;
    }

    brake() {
        this.carSpeed = this.carSpeed !== 0 ? (this.carSpeed > 0 ? this.carSpeed - 0.004 : this.carSpeed + 0.004) : this.carSpeed;
        this.round_speed();
        this.carLights["L_BRAKE"].intensity = 5;
        this.carLights["R_BRAKE"].intensity = 5;
    }

    engage_forward() {
        this.carSpeed = 0.01;
        this.carLights["REV_LIGHT"].intensity = 0;
    }

    engage_backward() {
        this.carSpeed = -0.01;
        this.carLights["REV_LIGHT"].intensity = 5;
    }

    round_speed(){
        this.carSpeed = this.carSpeed < 1 ? Math.round(this.carSpeed * 10000) / 10000 : this.carSpeed;
        if (this.carSpeed < 0.01 && this.carSpeed > -0.01) this.carSpeed = 0;
    }
}
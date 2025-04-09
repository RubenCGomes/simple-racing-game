import * as THREE from 'three';


export default class ProjectTextures {
    asphalt; pitTexture;

    constructor() {
        this.loadTextures();
    }

    loadTextures() {
        const loader = new THREE.TextureLoader();
        loader.load('./textures/terrain/asphalt.png', texture => {
            this.asphalt = new THREE.MeshPhongMaterial({
                map: texture,
                specular: new THREE.Color(0x111111), // Adjust specular reflection
                shininess: 50 // Adjust glossiness
            });
        });

        loader.load('./textures/terrain/pit-texture.jpg', texture => {
            this.pitTexture = new THREE.MeshPhongMaterial({
                map: texture,
                specular: new THREE.Color(0x111111), // Adjust specular reflection
                shininess: 50 // Adjust glossiness
            });
        });
    }
}


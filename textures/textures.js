import * as THREE from 'three';


export default class ProjectTextures {
    asphalt; pitTexture; grass;

    constructor() {
        this.loadTextures();
    }

    async loadTextures() {
        const loader = new THREE.TextureLoader();
        loader.load('./textures/terrain/asphalt.png', texture => {
            this.asphalt = new THREE.MeshPhongMaterial({
                map: texture,
                specular: new THREE.Color(0x111111),
                shininess: 50
            });
        });

        loader.load('./textures/terrain/pit-texture.jpg', texture => {
            this.pitTexture = new THREE.MeshPhongMaterial({
                map: texture,
                specular: new THREE.Color(0x111111),
                shininess: 50
            });
        });

        loader.load('./textures/terrain/grass.jpg', texture => {
            this.grass = new THREE.MeshPhongMaterial({
                map: texture,
                specular: new THREE.Color(0x111111),
                shininess: 50
            });
        })

        await loader.loadAsync('./textures/terrain/grass.jpg', () => {});
    }
}


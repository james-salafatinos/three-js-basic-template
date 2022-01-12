//External Libraries
import * as THREE from '/modules/three.module.js';
import { PointerLockControls } from "/modules/PointerLockControls.js";
import { GUI } from "/modules/dat.gui.module.js";
import { GLTFLoader } from '/modules/GLTFLoader.js';
import { EffectComposer } from '/modules/EffectComposer.js';
import { RenderPass } from '/modules/RenderPass.js';
import { UnrealBloomPass } from '/modules/UnrealBloomPass.js';
import Stats from '/modules/stats.module.js';
import { NoClipControls } from '/utils/NoClipControls.js'
// import addSkyGradient from '/utils/BackgroundGradient.js'

//Internal Libraries

//THREE JS
let camera, scene, renderer, composer, controls
let stats;
//Required for NOCLIPCONTROLS
let prevTime = performance.now();


init();
animate();

function init() {


    scene = new THREE.Scene();
    var loader = new THREE.TextureLoader(),
    texture = loader.load("/static/sky.jpg");
    scene.background = texture
    scene.fog = new THREE.Fog(0xffffff, 100, 750);

    //Create three.js stats
    stats = new Stats();
    container.appendChild(stats.dom);

    //Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // LIGHTS
    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    //Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);


    //NO CLIP CONTROLS
    controls = new NoClipControls(window, camera, document);


    let createCube = function (_x, _y, _z) {
        let mat = new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: false,
            depthTest: false,
            side: THREE.DoubleSide,
            color: new THREE.Color(0xffffff)
        });
        let geo = new THREE.BoxGeometry(2, 2, 2)
        let mesh = new THREE.Mesh(geo, mat)
        mesh.position.x = _x
        mesh.position.y = _y
        mesh.position.z = _z
        return mesh
    }

    let cube = createCube(10, -10, 10)
    scene.add(cube)

    let createStars = function () {
        let M = 28
        let N = 28
        let scaler = 10;
        let vertices = [];
        let spacing_scale = 50
        for (let x = -M; x <= M; x += 1) {
            for (let z = -N; z <= N; z += 1) {
                // vertices.push(x / scaler, 0 / scaler, z / scaler)
                vertices.push(
                    THREE.MathUtils.randFloatSpread(2000),
                    THREE.MathUtils.randFloatSpread(2000),
                    THREE.MathUtils.randFloatSpread(2000))
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        let material = new THREE.PointsMaterial({ size: .7, sizeAttenuation: true, alphaTest: 0.2, transparent: true });
        material.color.setHSL(.6, 0.8, 0.9);
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
    }
    createStars()


}

function animate() {
    //Frame Start up
    requestAnimationFrame(animate);

    //Required for NOCLIPCONTROLS
    const time = performance.now();

    controls.update(time, prevTime)

    renderer.render(scene, camera);
    stats.update()


    //Frame Shut Down
    prevTime = time;
}
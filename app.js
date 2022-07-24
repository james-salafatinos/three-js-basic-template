//External Libraries
import * as THREE from "/modules/three.module.js";
import Stats from "/modules/stats.module.js";
//Internal Libraries
import { NoClipControls } from "/utils/NoClipControls.js";
import { TerrainGenerator } from "/utils/TerrainGenerator.js";
import { BoidsGenerator } from "/utils/BoidsGenerator.js";
import { TerrainGeometryGenerator } from "/utils/TerrainGeometryGenerator.js";
//CDN
// import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
// import { io } from "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.1/socket.io.esm.min.js";
import { io } from "/modules/socket.io.esm.min.js";
import { MultiplayerSubsystemClient } from "../utils/MultiplayerSubsystemClient.js";
import { MultiplayerGameInterface } from "../utils/MultiplayerGameInterface.js";

import { Octree } from "/modules/Octree.js";
import { OctreeHelper } from "/modules/OctreeHelper.js";
import { Capsule } from "/modules/Capsule.js";
import { MkWFC } from "../utils/MkWFC.js";
import { SpriteFlipbook } from "../utils/SpriteFlipbook.js";
//THREE JS
let camera, scene, renderer, controls;
let stats;
//Required for NOCLIPCONTROLS
let prevTime = performance.now();
let frameIndex = 0;
// let iFrame
let cameraLookDir;
let updatePositionForCamera;

let MultiplayerSubsystemClientHandler;
let MultiplayerGameInterfaceHandler;

let makeOtherProjectileShoot;

let sendmouse;
let container;
container = document.getElementById("container");

let Boids;

const octreeObjects = new THREE.Group();

let updateSpheres;
let worldOctree;
let playerCollider;
let spheresCollisions;
const clock = new THREE.Clock();
const keyStates = {};
const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();
const GRAVITY = 9.8 ** 2;

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 2;
const STEPS_PER_FRAME = 5;
let playerOnFloor = false;
let mouseTime = 0;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color().setHSL(0.6, 0.9, 0.9);
  scene.fog = new THREE.Fog(0xffffff, 1, 5000);

  //Create three.js stats
  stats = new Stats();
  container.appendChild(stats.dom);

  //Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  container.appendChild(renderer.domElement);

  //   LIGHTS;
  let dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(0, 500, 0);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;
  dirLight.shadow.camera.top = 512;
  dirLight.shadow.camera.left = -512;
  dirLight.shadow.camera.right = 512;
  dirLight.shadow.camera.bottom = -512;
  dirLight.shadow.camera.near = 0.5; // default
  dirLight.shadow.camera.far = 10000; // default

  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
  scene.add(dirLightHelper);
  scene.add(dirLight);

  //Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 60;
  camera.position.z = 120;
  camera.position.x = 0;

  cameraLookDir = function (camera) {
    var vector = new THREE.Vector3(0, 0, -1);
    vector.applyEuler(camera.rotation, camera.rotation.order);
    return vector;
  };

  //NO CLIP CONTROLS
  controls = new NoClipControls(scene, window, camera, document);

  MultiplayerSubsystemClientHandler = new MultiplayerSubsystemClient(io);
  MultiplayerGameInterfaceHandler = new MultiplayerGameInterface(
    scene,
    camera,
    MultiplayerSubsystemClientHandler
  );

  worldOctree = new Octree();
  playerCollider = new Capsule(
    new THREE.Vector3(0, 0.35, 0),
    new THREE.Vector3(0, 1, 0),
    0.35
  );

  const playerVelocity = new THREE.Vector3();
  const playerDirection = new THREE.Vector3();

  const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
  const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbb44 });

  const spheres = [];
  let sphereIdx = 0;

  for (let i = 0; i < NUM_SPHERES; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);

    spheres.push({
      mesh: sphere,
      collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
      velocity: new THREE.Vector3(),
    });
  }

  function mouseDragged() {
    //Crosshair
    cameraLookDir = function (camera) {
      var vector = new THREE.Vector3(0, 0, -1);
      vector.applyEuler(camera.rotation, camera.rotation.order);
      return vector;
    };
    let __x = camera.position.x + 2 * cameraLookDir(camera).x;
    let __y = camera.position.y + 2 * cameraLookDir(camera).y;
    let __z = camera.position.z + 2 * cameraLookDir(camera).z;

    sendmouse(__x, __y, __z);
  }

  // Function for sending to the socket
  sendmouse = function (xpos, ypos, zpos) {
    // We are sending!
    // console.log("sendmouse()FromClient: " + xpos + " " + ypos + " " + zpos);

    // Make a little object with  and y
    var data = {
      x: xpos,
      y: ypos,
      z: zpos,
    };

    // Send that object to the socket
    // socket.emit("MouseFromClient", data);
    MultiplayerSubsystemClientHandler.emit("MouseFromClient", data);
  };

  let createStars = function () {
    let M = 48;
    let N = 48;
    let vertices = [];
    for (let x = -M; x <= M; x += 1) {
      for (let z = -N; z <= N; z += 1) {
        // vertices.push(x / scaler, 0 / scaler, z / scaler)

        let rx = THREE.MathUtils.randFloatSpread(2000);
        let ry = THREE.MathUtils.randFloatSpread(2000) + 1100;
        let rz = THREE.MathUtils.randFloatSpread(2000);
        vertices.push(rx, ry, rz);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    let material = new THREE.PointsMaterial({
      size: 0.7,
      sizeAttenuation: true,
      alphaTest: 0.2,
      transparent: true,
    });
    material.color.setHSL(0.6, 0.8, 0.9);
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
  };
  createStars();

  window.addEventListener("mousemove", () => {
    mouseDragged(3, 2, 5);
    // sendmouse();
  });

  window.addEventListener("KeyT", () => {
    mouseDragged(3, 2, 5);
    // sendmouse();
  });

  makeOtherProjectileShoot = function (cameraPosition, cameraLookVec) {
    console.log("Heard a shot and firing!", cameraPosition, cameraLookVec);
    let cameraPositionV3 = new THREE.Vector3(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z
    );
    let cameraLookVecV3 = new THREE.Vector3(
      cameraLookVec.x,
      cameraLookVec.y,
      cameraLookVec.z
    );
    const sphere = spheres[sphereIdx];

    camera.getWorldDirection(cameraLookVecV3);

    sphere.collider.center
      .copy(cameraPositionV3)
      .addScaledVector(cameraLookVecV3, playerCollider.radius * 1.5);

    // throw the ball with more force if we hold the button longer, and if we move forward

    const impulse =
      15 + 250 * (1 - Math.exp((mouseTime - performance.now()) * 0.01));

    sphere.velocity.copy(cameraLookVecV3).multiplyScalar(impulse);
    sphere.velocity.addScaledVector(playerVelocity, 2);

    sphereIdx = (sphereIdx + 1) % spheres.length;
  };

  window.addEventListener("click", () => {
    console.log("App.js window.addEventListener ('click')");

    MultiplayerGameInterfaceHandler.createProjectile();
    MultiplayerGameInterfaceHandler.updatePlayerProjectileState();
    MultiplayerSubsystemClientHandler.emit(
      "ProjectileState",
      MultiplayerGameInterfaceHandler.playerProjectileState
    );

    console.log("Clicking!");
    const sphere = spheres[sphereIdx];

    camera.getWorldDirection(cameraLookDir(camera));

    sphere.collider.center
      .copy(camera.position)
      .addScaledVector(cameraLookDir(camera), playerCollider.radius * 1.5);

    // throw the ball with more force if we hold the button longer, and if we move forward

    const impulse =
      15 + 250 * (1 - Math.exp((mouseTime - performance.now()) * 0.01));

    sphere.velocity.copy(cameraLookDir(camera)).multiplyScalar(impulse);
    sphere.velocity.addScaledVector(playerVelocity, 2);

    sphereIdx = (sphereIdx + 1) % spheres.length;
  });

  spheresCollisions = function () {
    for (let i = 0, length = spheres.length; i < length; i++) {
      const s1 = spheres[i];

      for (let j = i + 1; j < length; j++) {
        const s2 = spheres[j];

        const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
        const r = s1.collider.radius + s2.collider.radius;
        const r2 = r * r;

        if (d2 < r2) {
          const normal = vector1
            .subVectors(s1.collider.center, s2.collider.center)
            .normalize();
          const v1 = vector2
            .copy(normal)
            .multiplyScalar(normal.dot(s1.velocity));
          const v2 = vector3
            .copy(normal)
            .multiplyScalar(normal.dot(s2.velocity));

          s1.velocity.add(v2).sub(v1);
          s2.velocity.add(v1).sub(v2);

          const d = (r - Math.sqrt(d2)) / 2;

          s1.collider.center.addScaledVector(normal, d);
          s2.collider.center.addScaledVector(normal, -d);
        }
      }
    }
  };

  updateSpheres = function (deltaTime) {
    spheres.forEach((sphere) => {
      sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

      const result = worldOctree.sphereIntersect(sphere.collider);

      if (result) {
        sphere.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(sphere.velocity) * 1.5
        );
        sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
      } else {
        sphere.velocity.y -= GRAVITY * deltaTime;
      }

      const damping = Math.exp(-0.01 * deltaTime) - 1;
      sphere.velocity.addScaledVector(sphere.velocity, damping);

      // playerSphereCollision(sphere);
    });

    spheresCollisions();

    for (const sphere of spheres) {
      sphere.mesh.position.copy(sphere.collider.center);
    }
  };
  //   loadImage("texture1.png", 0, 60, 0, 50);

  // let terrain = new TerrainGenerator(scene);
  // terrain.create();
  // console.log(terrain);
  // octreeObjects.add(terrain.octree_mesh);

  let terrainGeo = new TerrainGeometryGenerator(scene, document);
  console.log(terrainGeo);
  octreeObjects.add(terrainGeo.octree_mesh);

  // let wfc = new MkWFC(scene);
  // wfc.run();
  // wfc._loadImg("heightmap1.png");
  // wfc._splitTextureIntoTiles(wfc.texture);

  // let sf = new SpriteFlipbook("/static/sprite_sheet.png", scene);
  // console.log(sf);

  // Boids = new BoidsGenerator(scene);
  // Boids.create();
  // console.log(Boids);

  updatePositionForCamera = function (camera, myObject3D) {
    // fixed distance from camera to the object
    var dist = 100;
    var cwd = new THREE.Vector3();

    camera.getWorldDirection(cwd);

    cwd.multiplyScalar(dist);
    cwd.add(camera.position);

    myObject3D.position.set(cwd.x, cwd.y, cwd.z);
    myObject3D.setRotationFromQuaternion(camera.quaternion);
  };

  let _createSphere = function (posx, posy, posz) {
    let mat = new THREE.MeshPhongMaterial({
      wireframe: false,
      transparent: false,
      depthTest: true,
      side: THREE.DoubleSide,
      color: new THREE.Color(0, 0, 0),
    });
    let geo = new THREE.IcosahedronGeometry(5, 5);
    let mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.x = posx;
    mesh.position.y = posy;
    mesh.position.z = posz;
    // octreeObjects.add(mesh);
    return mesh;
  };
  scene.add(_createSphere(0, 10, 0));

  worldOctree.fromGraphNode(octreeObjects);
}

function animate() {
  //Frame Start up
  requestAnimationFrame(animate);

  const time = performance.now();
  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    updateSpheres(deltaTime);
  }

  if (frameIndex % 3 == 0) {
    MultiplayerGameInterfaceHandler.updatePlayerState();
    // Boids.update();
    MultiplayerSubsystemClientHandler.emit(
      "PlayerState",
      MultiplayerGameInterfaceHandler.playerState
    );

    MultiplayerGameInterfaceHandler.CheckForNewPlayersAndAddThemOrUpdatePositions();

    console.log("About to check for projectiles");
    if (
      MultiplayerGameInterfaceHandler.CheckForNewProjectilesAndAddThem() != null
    ) {
      console.log("projectiles not null!");
      // console.log(
      //   "OUTPUT OF CHECK FOR NEW",
      //   MultiplayerGameInterfaceHandler.CheckForNewProjectilesAndAddThem()
      // );

      let res =
        MultiplayerGameInterfaceHandler.CheckForNewProjectilesAndAddThem();
      makeOtherProjectileShoot(res.p, res.c);
    }
  }

  controls.update(time, prevTime);
  renderer.render(scene, camera);
  stats.update();

  //Frame Shut Down
  prevTime = time;
  frameIndex++;
}

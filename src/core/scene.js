// Core: Three.js scene, camera, renderer, and base lighting.
// LIMINAL Build 0.7 — static, classic-script gameplay engine.
const THREE = window.THREE;
const $ = id => document.getElementById(id),
  R = Math.random;
const CONFIG = window.LIMINAL_CONFIG;
const CELL = CONFIG.world.cell,
  GRID = CONFIG.world.grid,
  HALF = CELL / 2,
  WH = CONFIG.world.roomHeight,
  N = GRID * CELL;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02080c);
scene.fog = new THREE.FogExp2(0x061216, .034);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, .08, 110);
camera.rotation.order = "YXZ";
scene.add(camera);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .75;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const hemi = new THREE.HemisphereLight(0x29474d, 0x030608, .07);
scene.add(hemi);
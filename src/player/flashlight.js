// Player state and flashlight setup.
// ---------- player, flashlight ----------
const P = {
  x: 0,
  z: 5,
  yaw: 0,
  pitch: 0,
  bat: 100,
  on: true,
  alive: true,
  sta: 100,
  tired: false,
  bob: 0,
  noise: 3,
  vx: 0,
  vz: 0,
  rec: 0
};
const fl = new THREE.SpotLight(0xdcffff, 42, 20, Math.PI / 9, .5, 1.6);
fl.castShadow = true;
fl.shadow.mapSize.set(1024, 1024);
fl.shadow.bias = -.0004;
fl.shadow.normalBias = .04;
fl.shadow.camera.near = .3;
fl.shadow.camera.far = 20;
scene.add(fl, fl.target);
const fdir = new THREE.Vector3(0, 0, -1),
  cdir = new THREE.Vector3();
const V = {
  adapt: .5,
  flash: 0,
  after: 0,
  sat: 1,
  phAt: 12,
  phT: 0,
  dk: 0,
  hAt: 8
};
const setLight = on => {
  const was = P.on;
  P.on = on && P.bat > 1;

  if (P.on && !was) {
    V.flash = Math.min(1, .2 + V.adapt * .9);
    V.after = 0;
    switchClick();
  }
  if (!P.on && was) {
    V.adapt = Math.min(V.adapt, .15);
    V.after = 1;
    switchClick();
  }

  $("ls").textContent = "LIGHT · " + (P.on ? "ON" : "OFF");
};
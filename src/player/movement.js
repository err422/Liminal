// Input, pointer lock, player movement, stamina, and battery drain.
const keys = {};
addEventListener("keydown", e => {
  keys[e.code] = true;
  if (!e.repeat && P.alive) {
    if (e.code === "KeyF") setLight(!P.on);
    if (e.code === "KeyR") reload()
  }
});
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("blur", () => {
  for (const k in keys) keys[k] = false
});
addEventListener("contextmenu", e => e.preventDefault());
addEventListener("mousedown", e => {
  if (e.button === 0) fire(1);
  else if (e.button === 2) fire(2)
});
addEventListener("mousemove", e => {
  if (document.pointerLockElement !== canvas || !P.alive) return;
  P.yaw -= e.movementX * .0021;
  P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch - e.movementY * .0021));
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    ov.style.opacity = 0;
    setTimeout(() => {
      if (document.pointerLockElement === canvas) ov.style.display = "none"
    }, 320)
  } else if (!over) {
    ov.style.display = "grid";
    ov.style.opacity = 1;
    $("intro").innerHTML = "The dark waits. Your run is paused.";
    $("start").textContent = "RESUME"
  }
});
$("start").onclick = () => {
  initAudio();
  over ? location.reload() : canvas.requestPointerLock()
};

function updatePlayer(dt) {
  const f = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)),
    r = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)),
    d = new THREE.Vector3();
  if (keys.KeyW) d.add(f);
  if (keys.KeyS) d.sub(f);
  if (keys.KeyD) d.add(r);
  if (keys.KeyA) d.sub(r);
  const mv = d.lengthSq() > 0;
  if (mv) d.normalize();
  if (P.sta <= 0) P.tired = true;
  if (P.sta > 30) P.tired = false;
  const wet = inFlood(P.x, P.z),
    run = (keys.ShiftLeft || keys.ShiftRight) && mv && !P.tired,
    spd = (run ? 6.2 : 3.5) * (wet ? .8 : 1);
  P.sta = run ? Math.max(0, P.sta - 25 * dt) : Math.min(100, P.sta + (mv ? 12 : 20) * dt);
  P.noise = (mv ? (run ? 18 : 9) : 3) * (wet ? 1.5 : 1);
  P.vx = d.x * spd;
  P.vz = d.z * spd;
  const nx = P.x + d.x * spd * dt,
    nz = P.z + d.z * spd * dt;
  if (!hitWall(nx, P.z, .38) && !inPool(nx, P.z, .2)) P.x = nx;
  if (!hitWall(P.x, nz, .38) && !inPool(P.x, nz, .2)) P.z = nz;
  if (mv) {
    P.bob += spd * dt * 2.2;
    const s2 = Math.sin(P.bob);
    if (P.ls * s2 < 0)(wet ? tone(300, 100, .14, .09) : tone(run ? 190 : 150, 80, .07, run ? .07 : .04, "triangle"));
    P.ls = s2
  }
  camera.position.set(P.x, 1.68 + (mv ? Math.sin(P.bob) * .035 : 0), P.z);
  camera.rotation.set(P.pitch + P.rec, P.yaw, P.roll || 0, "YXZ");
  $("sta").style.width = P.sta + "%";
}

function updateBattery(dt) {
  if (P.on) {
    P.bat = Math.max(0, P.bat - 3.2 * dt);
    if (P.bat <= 0) {
      setLight(false);
      msg("BATTERY DEAD — WAIT IN THE DARK")
    }
  } else if (P.bat < 40) P.bat = Math.min(40, P.bat + 1.6 * dt); // passive recharge tops out at 40%; cells do the rest
  $("bat").style.width = P.bat + "%";
  $("bat").style.background = P.bat < 20 ? "#d88c78" : "#a7e4d9";
  $("bt").textContent = "BATTERY " + Math.ceil(P.bat) + "%";
}
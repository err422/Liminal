// Main update/render loop and resize handling.
// ---------- main loop ----------
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .04);
  last = now;
  if (P.alive && document.pointerLockElement === canvas) {
    survT += dt;
    score += 2 * dt;
    diff = survT / 70 + kills * .12;
    updatePlayer(dt);
    updateBattery(dt);
    updateMonsters(dt, now);
    updateItems(now);
    updateGun(dt);
    updateVision(dt);
    updatePhantom(dt);
    updateHallu(dt);
    hud();
    if (R() < .004) drip();
  }
  camera.getWorldDirection(cdir);
  fdir.lerp(cdir, 1 - Math.exp(-dt * 16)).normalize();
  const flick = P.bat < 15 ? (Math.random() < .12 ? .2 : 1) : 1;
  fl.intensity = P.on ? 42 * flick : 0;
  fl.position.copy(camera.position);
  fl.target.position.copy(camera.position).addScaledVector(fdir, 10);
  lamps.forEach((l, i) => {
    const near = mons.some(m => !m.dead && Math.hypot(l.position.x - m.x, l.position.z - m.z) < 13);
    l.intensity = l.userData.b * (near && Math.sin(now * .03 * (1 + i * .3)) > .5 ? .1 : 1) * (.93 + .07 * Math.sin(now * .002 + i))
  });
  const u = waterMat.uniforms;
  u.uT.value = now * .001;
  u.uC.value.copy(camera.position);
  u.uD.value.copy(fdir);
  u.uOn.value = P.on ? (.2 + .8 * flick) : 0;
  renderer.render(scene, camera);
}
camera.position.set(P.x, 1.68, P.z);
requestAnimationFrame(frame);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight)
});
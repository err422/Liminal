// Collectible battery cells and ammunition.
// ---------- pickups (cells + shells keep spawning) ----------
const items = [],
  addM = (c, o) => new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: o,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

function spawnItem(kind) {
  const [x, z] = randFree(12, P), c = kind === "cell" ? 0x7fffc0 : 0xff6a4a, g = new THREE.Group();
  const core = new THREE.Mesh(kind === "cell" ? new THREE.BoxGeometry(.2, .32, .2) : new THREE.CylinderGeometry(.07, .07, .28, 8), new THREE.MeshBasicMaterial({
    color: c
  }));
  core.position.y = .6;
  g.add(core);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 2, 12, 1, true), addM(c, .1));
  beam.position.y = 1;
  g.add(beam);
  g.position.set(x, 0, z);
  scene.add(g);
  items.push({
    kind,
    x,
    z,
    g,
    core,
    beam,
    gone: false
  });
}
for (let i = 0; i < 3; i++) spawnItem("cell");
for (let i = 0; i < 4; i++) spawnItem("shell");

function updateItems(now) {
  for (const it of items) {
    if (it.gone) continue;
    it.core.rotation.y = now * .002;
    it.core.position.y = .6 + Math.sin(now * .003) * .08;
    if (Math.hypot(P.x - it.x, P.z - it.z) < 1.3) {
      it.gone = true;
      drop(it.g);
      it.core.material.dispose();
      it.beam.material.dispose();
      tone(500, 900, .2, .15);
      if (it.kind === "cell") {
        P.bat = Math.min(100, P.bat + 25);
        msg("BATTERY CELL +25%")
      } else {
        gun.res += 4;
        msg("+4 SHELLS")
      }
    }
  }
  for (let i = items.length - 1; i >= 0; i--)
    if (items[i].gone) items.splice(i, 1);
  if (survT > itemAt) {
    itemAt = survT + 18;
    if (items.filter(i => !i.gone).length < 7) spawnItem(R() < .5 ? "cell" : "shell")
  }
}
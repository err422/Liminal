// Enemy construction and individual enemy behavior.
// ---------- monsters (stats scale with difficulty) ----------
const dark = new THREE.MeshStandardMaterial({
  color: 0x050809,
  roughness: 1
});
const drop = g => {
  scene.remove(g);
  g.traverse(o => {
    o.geometry?.dispose()
  })
};
const mons = [];
let kills = 0,
  score = 0,
  survT = 0,
  diff = 0,
  spawnAt = 2.5,
  nextBeat = 0,
  itemAt = 0,
  best = 0;
try {
  best = +localStorage.getItem("liminalBest") || 0
} catch (e) {}

function makeMonster() {
  const eyeM = new THREE.MeshBasicMaterial({
      color: 0x9de8df
    }),
    bm = dark.clone(),
    g = new THREE.Group();
  bm.emissive.setRGB(.06, .16, .18);
  bm.emissiveIntensity = 0;
  const limb = (r, l, x, y) => {
    const p = new THREE.Group(),
      m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 3, 6), bm);
    m.position.y = -l / 2;
    m.castShadow = true;
    p.add(m);
    p.position.set(x, y, 0);
    g.add(p);
    return p
  };
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.28, 1.3, 4, 8), bm);
  torso.position.y = 1.65;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8), bm);
  head.scale.y = 1.4;
  head.position.set(0, 2.65, .05);
  g.add(head);
  for (const x of [-.09, .09]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 8), eyeM);
    e.position.set(x, 2.68, .24);
    g.add(e)
  }
  const arms = [limb(.07, 1.7, -.4, 2.2), limb(.07, 1.7, .4, 2.2)],
    legs = [limb(.1, 1.2, -.16, 1.1), limb(.1, 1.2, .16, 1.1)];
  const v = R() < Math.min(.5, diff * .15) ? 1.25 : 1;
  g.scale.setScalar(v > 1 ? .9 : 1);
  scene.add(g);
  const [x, z] = randFree(34, P);
  const m = {
    g,
    eyeM,
    bm,
    torso,
    arms,
    legs,
    x,
    z,
    v,
    hp: 12 + diff * 4,
    state: "patrol",
    path: [],
    wait: 0,
    expo: 0,
    fleeT: 0,
    lost: 0,
    last: [x, z],
    atk: 0,
    rep: 0,
    ph: 0,
    stun: 0,
    dead: 0
  };
  mons.push(m);
  return m;
}
const goTo = (m, x, z) => {
  m.path = findPath(m.x, m.z, x, z)
};

function alertAll(x, z, r, except) {
  for (const m of mons)
    if (m !== except && !m.dead && m.state !== "hunt" && m.state !== "flee" && Math.hypot(m.x - x, m.z - z) < r) {
      m.state = "investigate";
      m.last = [x, z];
      m.wait = 0;
      goTo(m, x, z)
    }
}

function updateMonster(m, dt, now) {
  if (m.dead) {
    m.dead += dt;
    m.g.rotation.x = -Math.min(1.5, m.dead * 3);
    if (m.dead > 2.5) {
      drop(m.g);
      m.eyeM.dispose();
      m.bm.dispose()
    }
    return 99
  }
  const dx = P.x - m.x,
    dz = P.z - m.z,
    dist = Math.hypot(dx, dz),
    vis = los(m.x, m.z, P.x, P.z),
    s = Math.min(1, diff / 3),
    dm = Math.min(diff, 5);
  cdir.set(m.x - camera.position.x, 1.6 - camera.position.y, m.z - camera.position.z).normalize();
  const ang = Math.acos(Math.min(1, cdir.dot(fdir))),
    pf = (!P.on && dist < 16 && ang > .3 && ang < 1.2 && vis) ? V.adapt : 0;
  m.bm.emissiveIntensity += (pf - m.bm.emissiveIntensity) * Math.min(1, dt * 6);
  const lit = P.on && vis && dist < 20 && cdir.dot(fdir) > Math.cos(.33);
  if (lit) m.expo += dt * (.8 + (20 - dist) / 20) / (1 + .4 * dm);
  else m.expo = Math.max(0, m.expo - dt * .8);
  if (m.expo >= 1 && m.state !== "flee") {
    m.state = "flee";
    m.fleeT = (4 + R() * 2) / (1 + .2 * dm);
    m.expo = 0;
    const f = randFree(20, P);
    goTo(m, f[0], f[1])
  }
  const hear = dist < P.noise * (1 + .1 * dm) * (vis ? 1 : .55),
    see = vis && ((P.on && dist < 24) || dist < 4.5 + dm * .5);
  let spd = 1.5 + .2 * dm;
  if (m.stun > 0) {
    m.stun -= dt;
    spd = 0
  } else if (m.state === "flee") {
    spd = 4.4 + .3 * dm;
    m.fleeT -= dt;
    if (m.fleeT <= 0 || !m.path.length) {
      m.state = "investigate";
      m.last = [P.x, P.z];
      goTo(m, P.x, P.z)
    }
  } else if (see) {
    if (m.state !== "hunt") {
      growl([m.x, m.z]);
      if (diff > 1.5) alertAll(P.x, P.z, 35, m)
    }
    m.state = "hunt";
    m.lost = 0;
    m.last = [P.x + P.vx * s * 1.2, P.z + P.vz * s * 1.2]
  } else if (hear && m.state === "patrol") {
    m.state = "investigate";
    m.last = [P.x, P.z];
    goTo(m, P.x, P.z)
  }
  if (m.stun <= 0) {
    if (m.state === "hunt") {
      spd = 3.7 * m.v * (1 + .12 * dm);
      m.rep -= dt;
      if (m.rep <= 0) {
        m.rep = .35;
        goTo(m, m.last[0], m.last[1])
      }
      if (!see) {
        m.lost += dt;
        if (m.lost > 7 + dm) m.state = "patrol"
      }
    } else if (m.state === "investigate") {
      spd = 2.3 + .2 * dm;
      if (!m.path.length) {
        m.wait += dt;
        if (m.wait > 3) {
          m.wait = 0;
          m.state = "patrol"
        }
      }
    } else if (m.state === "patrol" && !m.path.length) {
      m.wait -= dt;
      if (m.wait <= 0) {
        const t = randFree(12, m);
        goTo(m, t[0], t[1]);
        m.wait = 1 + R() * 2
      }
    }
  }
  let mx = 0,
    mz = 0;
  while (m.path.length && Math.hypot(m.path[0][0] - m.x, m.path[0][1] - m.z) < .5) m.path.shift();
  if (spd > 0 && m.path.length) {
    const [tx, tz] = m.path[0], d = Math.hypot(tx - m.x, tz - m.z);
    mx = (tx - m.x) / d;
    mz = (tz - m.z) / d;
    m.x += mx * spd * dt;
    m.z += mz * spd * dt
  }
  m.g.position.set(m.x, 0, m.z);
  if (mx || mz || m.state === "hunt") {
    const ta = (mx || mz) ? Math.atan2(mx, mz) : Math.atan2(dx, dz);
    let da = ta - m.g.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    m.g.rotation.y += da * Math.min(1, dt * 9)
  }
  m.ph += dt * spd * 2.2;
  const st = Math.sin(m.ph),
    sw = st * (mx || mz ? .7 : 0);
  if (m.ls * st < 0 && spd > 0 && dist < 25) tone(120, 55, .14, .14, "triangle", null, [m.x, m.z]);
  m.ls = st;
  m.arms[0].rotation.x = sw;
  m.arms[1].rotation.x = -sw;
  m.legs[0].rotation.x = -sw;
  m.legs[1].rotation.x = sw;
  m.eyeM.color.setHex(m.stun > 0 || m.state === "flee" ? 0xffffff : m.state === "hunt" ? 0xff3a2a : 0x9de8df);
  if (m.state === "hunt" && m.stun <= 0 && dist < 1.6 && vis) {
    if (m.atk <= 0) {
      tone(1900, 500, .35, .22, "sawtooth", null, [m.x, m.z]);
      P.rec += .04
    }
    m.atk += dt;
    if (m.atk > .4) die()
  } else m.atk = Math.max(0, m.atk - dt * 2);
  return dist;
}

// Create the first threat once the world and navigation grid exist.
makeMonster();
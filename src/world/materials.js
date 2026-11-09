// World rendering: procedural tile materials and shared geometry helpers.
// ---------- procedural tile materials (2m sheet, n x n tiles, with bump) ----------
function sheet(base, grout, n, rough, bs = 1.2) {
  const S = 512,
    t = S / n,
    mk = () => {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      return c
    };
  const a = mk(),
    g = a.getContext("2d"),
    b = mk(),
    h = b.getContext("2d");
  g.fillStyle = grout;
  g.fillRect(0, 0, S, S);
  h.fillStyle = "#222";
  h.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = (R() - .5) * 20;
      g.fillStyle = `rgb(${base[0]+v},${base[1]+v},${base[2]+v})`;
      g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      const k = 170 + R() * 40;
      h.fillStyle = `rgb(${k},${k},${k})`;
      h.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
    }
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(0,10,10,${R()*.09})`;
    g.fillRect(R() * S, R() * S, R() * 26, R() * 3 + 1);
  } // grime streaks
  const T = c => {
    const x = new THREE.CanvasTexture(c);
    x.wrapS = x.wrapT = THREE.RepeatWrapping;
    x.anisotropy = 8;
    return x
  };
  const m = T(a);
  m.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: m,
    bumpMap: T(b),
    bumpScale: bs,
    roughness: rough
  });
}
const M = {
  wall: sheet([150, 182, 180], "#4a6c6e", 4, .55),
  floor: sheet([112, 138, 138], "#3e5a5c", 4, .4),
  ceil: sheet([88, 102, 104], "#2b3c3e", 2, .9),
  pool: sheet([84, 160, 172], "#2f6065", 6, .25),
  trim: new THREE.MeshStandardMaterial({
    color: 0xb6c8c4,
    roughness: .5
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0x9aa8a8,
    roughness: .25,
    metalness: .9
  }),
  lamp: new THREE.MeshBasicMaterial({
    color: 0xbfeeea
  }),
  dead: new THREE.MeshStandardMaterial({
    color: 0x1a2426
  }),
  glow: new THREE.MeshBasicMaterial({
    color: 0x5ff0e6
  })
};
const colliders = [],
  pools = [],
  lamps = [];

function box(x, y, z, w, h, d, m, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d),
    u = g.attributes.uv,
    s = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h]
    ];
  for (let i = 0; i < 24; i++) {
    const f = s[i >> 2];
    u.setXY(i, u.getX(i) * f[0] / 2, u.getY(i) * f[1] / 2);
  } // world-scale UVs
  const e = new THREE.Mesh(g, m);
  e.position.set(x, y, z);
  e.castShadow = !!o.s;
  e.receiveShadow = true;
  scene.add(e);
  if (o.c) colliders.push({
    x,
    z,
    w,
    d
  });
  return e;
}
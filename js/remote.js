import * as THREE from 'three';
import { CFG } from './config.js';
const wrap = (a, b, t) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
export class RemotePlayers {
  constructor(scene) { this.scene = scene; this.map = new Map(); }
  add(id, name) {
    if (this.map.has(id)) return;
    const g = new THREE.Group(), head = new THREE.Group(); head.position.y = 1.55;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x3b4552, roughness: 1 }));
    body.position.y = 0.8; const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8c7b6b, roughness: 1 }));
    head.add(skull);
    const spot = new THREE.SpotLight(0xfff1cc, 0, 18, 0.45, 0.5, 2); spot.position.set(0, 0, -0.15); head.add(spot);
    const tgt = new THREE.Object3D(); tgt.position.set(0, 0, -1); head.add(tgt); spot.target = tgt;
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const cx = cv.getContext('2d');
    cx.font = '600 34px system-ui, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#e6efd8'; cx.fillText(name, 128, 44);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0 }));
    label.scale.set(1.2, 0.3, 1); label.position.y = 2.05;
    g.add(body, head, label); g.visible = false; this.scene.add(g);
    this.map.set(id, { g, head, spot, label, buf: [], dead: false });
  }
  remove(id) { const r = this.map.get(id); if (r) { this.scene.remove(r.g); this.map.delete(id); } }
  push(id, s) { const r = this.map.get(id); if (!r) return; r.buf.push({ t: performance.now(), p: s.p, yaw: s.yaw, pitch: s.pitch });
    if (r.buf.length > 30) r.buf.shift(); r.fl = s.fl; r.dead = s.dead; }
  update(camPos) {
    const rt = performance.now() - CFG.INTERP_MS;
    for (const r of this.map.values()) {
      const b = r.buf; if (!b.length) continue;
      let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;       // interpolate between snapshots ~110ms in the past
      const a = b[Math.max(0, i - 1)], c = b[i], k = c.t > a.t ? Math.min(1, Math.max(0, (rt - a.t) / (c.t - a.t))) : 1;
      r.g.position.set(a.p[0] + (c.p[0] - a.p[0]) * k, 0, a.p[2] + (c.p[2] - a.p[2]) * k);
      r.g.rotation.y = wrap(a.yaw, c.yaw, k); r.head.rotation.x = a.pitch + (c.pitch - a.pitch) * k;
      r.g.visible = !r.dead; r.spot.intensity = r.fl ? 40 : 0;
      r.label.material.opacity = Math.max(0, 1 - (r.g.position.distanceTo(camPos) - 3) / 5);
    }
  }
}

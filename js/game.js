import * as THREE from 'three';
import { CFG } from './config.js';
import { generateMaze } from './maze.js';
import { Vision } from './vision.js';
import { RemotePlayers } from './remote.js';

const $ = id => document.getElementById(id);
function tex(base, rep, vary) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { const v = Math.random() * vary; x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${v / 255})`; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Game {
  constructor({ canvas, net, seed, picked = [] }) {
    this.net = net; this.me = net ? net.myId : 0; this.picked = new Set(picked);
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false }); this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x000000);
    this.cam = new THREE.PerspectiveCamera(75, 1, 0.05, 80); this.cam.rotation.order = 'YXZ'; this.scene.add(this.cam);
    this.vision = new Vision(this.r, this.scene, this.cam);
    this.maze = generateMaze(seed, CFG.MAZE_W, CFG.MAZE_H, CFG.CELL, CFG.WALL_T);
    this.buildWorld();
    this.remote = new RemotePlayers(this.scene);
    if (net) for (const p of net.players.values()) if (p.id !== this.me) this.remote.add(p.id, p.name);
    // player state
    const s = this.maze.start, off = [[0, 0], [1, 0], [0, 1], [1, 1]][this.me % 4];
    this.pos = new THREE.Vector3(s.x + (off[0] - .5) * 1.2, 0, s.z + (off[1] - .5) * 1.2);
    this.yaw = -Math.PI / 4; this.pitch = 0; this.keys = {}; this.bobT = 0;
    this.hp = 100; this.ins = 0; this.stamina = 100; this.battery = 100; this.flashOn = false; this.dead = false; this.won = false;
    this.buildFlashlight(); this.bindInput(); this.resize(); addEventListener('resize', () => this.resize());
    this.last = performance.now(); this.netT = 0; this.flickerT = 0;
    this.status();
    requestAnimationFrame(t => this.loop(t));
  }
  buildWorld() {
    const m = this.maze, W = m.W * m.C, H = m.H * m.C, sc = this.scene;
    sc.add(new THREE.HemisphereLight(0x8899aa, 0x222222, 0.05));
    const wallMat = new THREE.MeshStandardMaterial({ map: tex('#6b6a5e', 1, 60), roughness: 0.95 });
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, CFG.WALL_H, 1), wallMat, m.boxes.length);
    const d = new THREE.Object3D();
    m.boxes.forEach((b, i) => { d.position.set(b.cx, CFG.WALL_H / 2, b.cz); d.scale.set(b.sx, 1, b.sz); d.updateMatrix(); walls.setMatrixAt(i, d.matrix); });
    walls.castShadow = walls.receiveShadow = true; sc.add(walls);
    const floorT = tex('#3a3a30', m.W * 2, 50), ceilT = tex('#55554a', m.W, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: floorT, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, H / 2); floor.receiveShadow = true; sc.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: ceilT, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(W / 2, CFG.WALL_H, H / 2); sc.add(ceil);
    this.lamps = m.lights.map(l => {
      const pl = new THREE.PointLight(0xdfe8cf, 10, 14, 2); pl.position.set(l.x, CFG.WALL_H - 0.3, l.z); sc.add(pl);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xeaf2dc }));
      panel.rotation.x = Math.PI / 2; panel.position.set(l.x, CFG.WALL_H - 0.02, l.z); sc.add(panel);
      return { pl, x: l.x, z: l.z, base: 10 };
    });
    // exit: glowing green sign + light
    const e = m.exit, ec = document.createElement('canvas'); ec.width = 256; ec.height = 96; const ex = ec.getContext('2d');
    ex.fillStyle = '#0a3'; ex.fillRect(0, 0, 256, 96); ex.fillStyle = '#eaffea'; ex.font = '700 64px system-ui'; ex.textAlign = 'center'; ex.fillText('EXIT', 128, 70);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ec) }));
    sign.position.set(e.x, 2.3, e.z); sc.add(sign); this.exitSign = sign;
    const gl = new THREE.PointLight(0x33ff88, 6, 9, 2); gl.position.set(e.x, 1.5, e.z); sc.add(gl);
    // battery packs
    this.items = new Map(); const ig = new THREE.BoxGeometry(0.16, 0.3, 0.16), im = new THREE.MeshStandardMaterial({ color: 0xb8a24a, emissive: 0x332a05, roughness: 0.6 });
    for (const it of m.items) { if (this.picked.has(it.id)) continue; const mesh = new THREE.Mesh(ig, im); mesh.position.set(it.x, 0.5, it.z); this.scene.add(mesh); this.items.set(it.id, { ...it, mesh }); }
  }
  buildFlashlight() {
    const s = new THREE.SpotLight(0xfff1cc, 0, 24, 0.42, 0.55, 2); s.position.set(0.15, -0.1, 0); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005;
    const t = new THREE.Object3D(); t.position.set(0, 0, -1); this.cam.add(s, t); s.target = t; this.spot = s;
  }
  bindInput() {
    const cv = this.r.domElement;
    cv.addEventListener('click', () => { if (!this.dead && !this.won) cv.requestPointerLock(); });
    addEventListener('mousemove', e => { if (document.pointerLockElement !== cv) return;
      this.yaw -= e.movementX * 0.0022; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * 0.0022)); });
    addEventListener('keydown', e => { this.keys[e.code] = true;
      if (e.code === 'KeyF' && !e.repeat && this.battery > 2) this.flashOn = !this.flashOn;
      if (e.code === 'KeyE' && !e.repeat) this.interact();
      if (e.code === 'BracketRight') this.ins = Math.min(100, this.ins + 10);   // dev keys
      if (e.code === 'BracketLeft') this.ins = Math.max(0, this.ins - 10);
      if (e.code === 'Minus') this.damage(10); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, 1.5);
    this.r.setPixelRatio(dpr); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.vision.resize(w, h, dpr);
  }
  // ---- gameplay
  effectiveMax() { return 100 - Math.min(this.ins, CFG.MAX_INSANITY); }
  damage(d) { if (this.dead) return; this.hp = Math.min(this.hp, this.effectiveMax()) - d; if (this.hp <= 0) this.die(); }
  die() { this.dead = true; this.hp = 0; this.flashOn = false; document.exitPointerLock(); this.banner('You died', 'Permadeath: this run is over for you. Your teammates can keep going.'); }
  interact() {
    if (this.dead || this.won) return;
    for (const it of this.items.values()) if (Math.hypot(it.x - this.pos.x, it.z - this.pos.z) < 1.8) {
      if (!this.net) this.applyPicked(it.id, this.me);
      else if (this.net.isHost) this.hostPick(it.id, this.me); else this.net.send({ t: 'pick', id: it.id });
      return;
    }
  }
  hostPick(id, by) { if (this.picked.has(id)) return; this.net.broadcast({ t: 'picked', id, by }); this.applyPicked(id, by); }
  applyPicked(id, by) {
    this.picked.add(id); const it = this.items.get(id); if (it) { this.scene.remove(it.mesh); this.items.delete(id); }
    if (by === this.me) { this.battery = Math.min(100, this.battery + 45); this.prompt('Battery +45%'); setTimeout(() => this.prompt(''), 1500); }
  }
  onMessage(m, from) {
    if (m.t === 's') this.remote.push(m.id, m);
    else if (m.t === 'pick' && this.net.isHost) this.hostPick(m.id, from);
    else if (m.t === 'picked') this.applyPicked(m.id, m.by);
  }
  peerJoin(id, name) { this.remote.add(id, name); this.status(); }
  peerLeave(id) { this.remote.remove(id); this.status(); }
  status() { $('net').textContent = this.net ? `Room ${this.net.code} · ${this.net.players.size} player${this.net.players.size > 1 ? 's' : ''}` : 'Solo'; }
  banner(a, b) { $('banner').hidden = false; $('banner-title').textContent = a; $('banner-sub').textContent = b; }
  prompt(t) { $('prompt').textContent = t; }
  lightLevel() {
    let s = 0; for (const l of this.lamps) { const d = Math.hypot(l.x - this.pos.x, l.z - this.pos.z); s += Math.pow(Math.max(0, 1 - d / 9), 1.5); }
    return Math.min(1, s);
  }
  collide() {
    const R = CFG.RADIUS;
    for (let k = 0; k < 2; k++) for (const b of this.maze.boxes) {
      if (this.pos.x < b.minX - 1 || this.pos.x > b.maxX + 1 || this.pos.z < b.minZ - 1 || this.pos.z > b.maxZ + 1) continue;
      const px = Math.max(b.minX, Math.min(this.pos.x, b.maxX)), pz = Math.max(b.minZ, Math.min(this.pos.z, b.maxZ));
      const dx = this.pos.x - px, dz = this.pos.z - pz, d2 = dx * dx + dz * dz;
      if (d2 < R * R) { if (d2 > 1e-8) { const d = Math.sqrt(d2), p = (R - d) / d; this.pos.x += dx * p; this.pos.z += dz * p; }
        else { this.pos.x += R; } }
    }
  }
  update(dt, now) {
    const k = this.keys, active = !this.dead && !this.won && document.pointerLockElement === this.r.domElement;
    let mx = 0, mz = 0; if (active) { mx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0); mz = (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0); }
    const moving = mx || mz, sprint = active && k.ShiftLeft && moving && this.stamina > 0;
    const sp = (sprint ? CFG.SPRINT : CFG.WALK) * dt, len = Math.hypot(mx, mz) || 1, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    this.pos.x += (mx * c + mz * s) / len * sp * (moving ? 1 : 0); this.pos.z += (-mx * s + mz * c) / len * sp * (moving ? 1 : 0);
    this.collide();
    this.stamina = Math.max(0, Math.min(100, this.stamina + (sprint ? -CFG.STAMINA_DRAIN : CFG.STAMINA_REGEN) * dt));
    this.bobT += moving ? dt * (sprint ? 11 : 7) : 0;
    this.cam.position.set(this.pos.x, CFG.EYE + (moving ? Math.sin(this.bobT) * 0.035 : 0), this.pos.z);
    this.cam.rotation.set(this.pitch, this.yaw, 0);
    // flashlight + battery (drains when on, recovers when off, flickers when low)
    this.battery = Math.max(0, Math.min(100, this.battery + (this.flashOn ? -CFG.BATTERY_DRAIN : CFG.BATTERY_REGEN) * dt));
    if (this.flashOn && this.battery <= 0) this.flashOn = false;
    let fl = this.flashOn ? 1 : 0; if (this.flashOn && this.battery < 15 && Math.random() < 0.08) fl = 0.15;
    this.spot.intensity = 70 * fl;
    // fluorescent flicker
    for (const l of this.lamps) l.pl.intensity = l.base * (Math.random() < 0.004 ? 0.2 : 1);
    // insanity: grows in the dark and alone; eases near friends in light
    const light = this.lightLevel(), lit = light > 0.3 || this.flashOn; let near = false;
    for (const r of this.remote.map.values()) if (!r.dead && r.g.visible && r.g.position.distanceTo(this.pos) < 6) near = true;
    if (!this.dead) { this.ins = Math.max(0, Math.min(100, this.ins + dt * (0.03 + (lit ? 0 : 0.22) + (this.remote.map.size && !near ? 0.05 : 0) - (near && lit ? 0.25 : 0))));
      this.hp = Math.min(this.hp, this.effectiveMax()); }
    // pickups / exit
    let near_it = null; for (const it of this.items.values()) { it.mesh.rotation.y += dt; if (Math.hypot(it.x - this.pos.x, it.z - this.pos.z) < 1.8) near_it = it; }
    if (!this.won && !this.dead) this.prompt(near_it ? 'E: take battery' : $('prompt').textContent === 'Battery +45%' ? 'Battery +45%' : '');
    const e = this.maze.exit; if (!this.won && !this.dead && Math.hypot(e.x - this.pos.x, e.z - this.pos.z) < 1.2) {
      this.won = true; document.exitPointerLock(); this.banner('You escaped', 'You found the way out.'); }
    this.vision.update(dt, light, this.flashOn, this.ins / 100);
    this.remote.update(this.cam.position);
    // network tick
    this.netT += dt; if (this.net && this.netT > 1 / CFG.NET_HZ) { this.netT = 0;
      this.net.sendState({ t: 's', id: this.me, p: [+this.pos.x.toFixed(2), 0, +this.pos.z.toFixed(2)], yaw: +this.yaw.toFixed(3), pitch: +this.pitch.toFixed(3), fl: this.flashOn, dead: this.dead }); }
    this.hud();
  }
  hud() {
    const insW = Math.min(this.ins, CFG.MAX_INSANITY), hpW = Math.min(this.hp, 100 - insW);
    $('bar-hp').style.width = hpW + '%'; $('bar-ins').style.width = insW + '%';
    $('battery-fill').style.width = this.battery + '%'; $('stamina-fill').style.width = this.stamina + '%';
  }
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.update(dt, now); this.vision.render(); requestAnimationFrame(t => this.loop(t));
  }
}

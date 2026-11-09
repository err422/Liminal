// Audio engine and positional sound helpers.
// ---------- audio ----------
let AC, lp;

function initAudio() {
  if (AC) return AC.resume();
  AC = new(window.AudioContext || window.webkitAudioContext)();
  lp = AC.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 240;
  lp.connect(AC.destination);
  for (const [f, t] of [
      [48, "sawtooth"],
      [48.7, "sawtooth"],
      [71, "sine"]
    ]) {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.value = .035;
    o.connect(g);
    g.connect(lp);
    o.start()
  }
}

function tone(f0, f1, len, vol, type = "sine", filt, at) {
  if (!AC) return;
  const o = AC.createOscillator(),
    g = AC.createGain(),
    t = AC.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + len);
  let out = filt || AC.destination;
  if (at) {
    const dx = at[0] - P.x,
      dz = at[1] - P.z,
      d = Math.hypot(dx, dz) || 1,
      p = AC.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, (dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw)) / d));
    vol /= 1 + d * .12;
    let o2 = out;
    if (!los(P.x, P.z, at[0], at[1])) {
      const f = AC.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      f.connect(o2);
      o2 = f;
      vol *= .7
    }
    p.connect(o2);
    out = p
  }
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + len);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + len);
}
const switchClick = () => tone(1100, 420, .035, .025, "square");
const thump = () => {
    tone(60, 35, .18, .5);
    setTimeout(() => tone(55, 32, .2, .35), 170)
  },
  drip = () => tone(1400 + R() * 900, 700, .12, .05, "sine", null, [P.x + (R() - .5) * 30, P.z + (R() - .5) * 30]),
  growl = at => tone(110, 40, 1, .25, "sawtooth", lp, at);
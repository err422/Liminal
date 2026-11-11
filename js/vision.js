import * as THREE from 'three';
import { CFG } from './config.js';
// One coordinated pipeline: scene -> HDR target -> eye model (exposure, Purkinje, rod noise, periphery) -> screen.
const VERT = `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy,0.,1.); }`;
const FRAG = `
precision highp float; varying vec2 vUv;
uniform sampler2D tScene; uniform float uExposure, uTime, uFlash, uInsanity, uAdapt; uniform vec2 uRes;
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb * uExposure;
  float l = dot(c, vec3(.2126,.7152,.0722));
  float scot = 1. - smoothstep(.015, .22, l);                  // how "night" this pixel is
  vec3 rod = vec3(l) * vec3(.80,.93,1.15);                      // Purkinje: bluish grey
  vec3 cc = c; cc.r *= mix(1., .35, scot);                      // reds die first
  c = mix(cc, rod, scot*.9);
  float r = length(vUv-.5)*1.4142;
  c *= 1. + scot*smoothstep(.25,.95,r)*.16*uAdapt;              // rods live off-centre (subtle)
  c *= 1. - scot*(1.-smoothstep(0.,.18,r))*.07*uAdapt;          // fovea is blind in the dark (subtle)
  float n = hash(vUv*uRes + fract(uTime)*91.7) - .5;
  c += n * (1.-smoothstep(0.,.30,l)) * .11;                     // grain only where light is scarce
  c = mix(c, vec3(1.), uFlash*.55);                             // dazzle after dark -> bright
  c *= 1. - uInsanity*smoothstep(.35,1.,r)*.6;                  // insanity tunnels the view
  c = (c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);                    // ACES
  gl_FragColor = vec4(pow(clamp(c,0.,1.), vec3(1./2.2)), 1.);
}`;
export class Vision {
  constructor(renderer, scene, camera) {
    this.r = renderer; this.scene = scene; this.cam = camera;
    this.adapt = 0.4; this.flash = 0; this.wasLit = false;
    this.rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3));
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, uExposure: { value: 1 }, uTime: { value: 0 }, uFlash: { value: 0 },
        uInsanity: { value: 0 }, uAdapt: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } } });
    this.quad = new THREE.Mesh(g, this.mat); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  resize(w, h, dpr) { this.rt.setSize(w * dpr, h * dpr); this.mat.uniforms.uRes.value.set(w * dpr, h * dpr); }
  // lightLevel 0..1 = fluorescents nearby; flashOn adds light. Returns eye "brightness" 0..1.
  update(dt, lightLevel, flashOn, insanity01) {
    const lit = Math.min(1, lightLevel + (flashOn ? 0.9 : 0)) > 0.45;
    if (lit && !this.wasLit) this.flash = Math.max(this.flash, this.adapt);   // dazzle scales with how adapted you were
    this.wasLit = lit;
    const rate = lit ? 2.2 : CFG.ADAPT_RATE;                                  // lose adaptation fast, regain it slowly
    this.adapt += ((lit ? 0 : 1) - this.adapt) * Math.min(1, rate * dt);      // exponential: quick start, long tail
    this.flash = Math.max(0, this.flash - dt * 1.6);
    const u = this.mat.uniforms;
    u.uExposure.value = Math.pow(CFG.EXPOSURE_MAX, this.adapt);
    u.uAdapt.value = this.adapt; u.uFlash.value = this.flash; u.uInsanity.value = insanity01; u.uTime.value += dt;
  }
  render() {
    this.r.setRenderTarget(this.rt); this.r.render(this.scene, this.cam);
    this.r.setRenderTarget(null); this.r.render(this.qs, this.qc);
  }
}

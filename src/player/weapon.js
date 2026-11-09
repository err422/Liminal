// First-person weapon model, firing, damage, and reload.
// ---------- 12 gauge double barrel ----------
const gun={ammo:2,res:6,rl:0,cd:0,kick:0},gm=new THREE.Group();
const steel=new THREE.MeshStandardMaterial({color:0x2a2c2e,metalness:.8,roughness:.4}),wood=new THREE.MeshStandardMaterial({color:0x4a2c1a,roughness:.7});
for(const x of[-.035,.035]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.75,10),steel);b.rotation.x=Math.PI/2;b.position.set(x,0,-.25);gm.add(b)}
const stock=new THREE.Mesh(new THREE.BoxGeometry(.1,.13,.4),wood);stock.position.set(0,-.05,.22);gm.add(stock);
const fore=new THREE.Mesh(new THREE.BoxGeometry(.11,.07,.3),wood);fore.position.set(0,-.045,-.35);gm.add(fore);
gm.position.set(.25,-.24,-.5);camera.add(gm);
const mz=new THREE.PointLight(0xffb060,0,14,2);mz.position.set(0,0,-1);camera.add(mz);
function bang(n){if(!AC)return;const len=AC.sampleRate*.5,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<len;i++)d[i]=(R()*2-1)*Math.pow(1-i/len,3);
 const s=AC.createBufferSource(),g=AC.createGain();s.buffer=b;g.gain.value=.6*n;s.connect(g);g.connect(AC.destination);s.start();tone(90,30,.3,.5*n)}
const _d=new THREE.Vector3(),_t=new THREE.Vector3(),_p=new THREE.Vector3(),_q=new THREE.Vector3(),_r=new THREE.Vector3();
function kill(m){m.dead=.001;kills++;const p=100+Math.round(diff*50);score+=p;msg(`+${p}  KILL`)}
function fire(n){
 if(!P.alive||gun.rl>0||gun.cd>0||document.pointerLockElement!==canvas)return;
 if(gun.ammo<=0){tone(900,600,.05,.1,"square");return}
 n=Math.min(n,gun.ammo);gun.ammo-=n;gun.cd=.4;gun.kick=1;V.flash=Math.max(V.flash,.35);V.adapt=Math.min(V.adapt,.25);P.rec+=.05*n;mz.intensity=70*n;bang(n);
 camera.getWorldDirection(_d);const o=camera.position;
 for(const m of mons){if(m.dead)continue;
  _t.set(m.x-o.x,1.5-o.y,m.z-o.z);const d=_t.length();if(d>16||!los(P.x,P.z,m.x,m.z))continue;
  let h=0;for(let i=0;i<9*n;i++){_p.set(_d.x+(R()-.5)*.13,_d.y+(R()-.5)*.13,_d.z+(R()-.5)*.13).normalize();for(const y of[.8,1.6,2.5]){_t.set(m.x-o.x,y-o.y,m.z-o.z);const t=_t.dot(_p);if(t>0&&_t.distanceToSquared(_q.copy(_p).multiplyScalar(t))<.26){h++;break}}}
  if(h){m.hp-=h*(d<7?1:.55);m.stun=.2+h*.05;m.state="hunt";m.last=[P.x,P.z];m.lost=0;m.expo=0;if(m.hp<=0)kill(m)}}
 alertAll(P.x,P.z,45); // the blast is loud
}
function reload(){if(gun.rl<=0&&gun.ammo<2&&gun.res>0){gun.rl=1.7;tone(300,200,.1,.2,"square");setTimeout(()=>tone(420,260,.1,.2,"square"),900)}}
function updateGun(dt){
 gun.cd-=dt;mz.intensity*=Math.exp(-dt*30);gun.kick*=Math.exp(-dt*8);P.rec*=Math.exp(-dt*7);
 if(gun.rl>0){gun.rl-=dt;if(gun.rl<=0){const t=Math.min(2-gun.ammo,gun.res);gun.ammo+=t;gun.res-=t}}
 gm.position.z=-.5+gun.kick*.13;gm.rotation.x=gun.kick*.25+(gun.rl>0?.7:0);
}

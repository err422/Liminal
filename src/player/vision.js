// Dark adaptation, flash afterimage, phantoms, and hallucinations.
// ---------- vision: dark adaptation, noise, color loss, phantoms ----------
const nz=$("noise"),nctx=nz.getContext("2d"),nimg=nctx.createImageData(96,96);let nf=0,lastSat=1;
function drawNoise(){const d=nimg.data;for(let i=0;i<d.length;i+=4){const v=R()*255;d[i]=v*.7;d[i+1]=v;d[i+2]=v;d[i+3]=255}nctx.putImageData(nimg,0,0)}
const ph=new THREE.Mesh(new THREE.CapsuleGeometry(.3,1.5,3,6),new THREE.MeshBasicMaterial({color:0x1a3a40,transparent:true,opacity:0,fog:false}));ph.position.y=1.5;ph.visible=false;scene.add(ph);
const grayH=new THREE.Color(0x303536),grayF=new THREE.Color(0x0b0e0f),_hc=new THREE.Color(0x29474d),_fc=new THREE.Color(0x061216);
function updateVision(dt){
 const lampN=lamps.some(l=>l.intensity>2&&Math.hypot(l.position.x-P.x,l.position.z-P.z)<9);
 V.adapt=P.on?Math.max(0,V.adapt-.6*dt):lampN?Math.max(0,V.adapt-.2*dt):Math.min(1,V.adapt+.045*dt);
 V.flash=Math.max(0,V.flash-dt*1.1);V.after=Math.max(0,V.after-dt*.22);V.sat+=((P.on?1:.28)-V.sat)*Math.min(1,dt*2.5);
 hemi.intensity=.03+.2*V.adapt*(P.on?.4:1);hemi.color.copy(_hc).lerp(grayH,1-V.sat);scene.fog.color.copy(_fc).lerp(grayF,1-V.sat);
 renderer.toneMappingExposure=.72+.25*V.adapt+.5*V.flash;
 camera.fov=74+24*V.flash;camera.updateProjectionMatrix();P.roll=Math.sin(performance.now()*.011)*.06*V.flash;
 $("flash").style.opacity=Math.min(.95,V.flash*1.1);$("after").style.opacity=V.after*.9;
 nz.style.opacity=P.on?.03:.07+.07*V.adapt;
 if(nf++%2===0)drawNoise();
}
function updatePhantom(dt){
 _q.copy(fdir).setY(0).normalize();
 if(ph.visible){V.phT-=dt;cdir.set(ph.position.x-camera.position.x,0,ph.position.z-camera.position.z).normalize();
  if(cdir.dot(_q)>.93||V.phT<=0)ph.visible=false;else ph.material.opacity=Math.min(.5,V.phT*.6)}
 else if(!P.on&&V.adapt>.5&&survT>V.phAt){
  V.phAt=survT+9+R()*14;const a=P.yaw+(R()<.5?-1:1)*(.7+R()*.4),x=P.x-Math.sin(a)*11,z=P.z-Math.cos(a)*11;
  if(!hitWall(x,z,.5)&&!inPool(x,z,.5)&&los(P.x,P.z,x,z)){ph.position.set(x,1.5,z);ph.visible=true;V.phT=1.4;tone(60,45,.6,.06,"sine",null,[x,z])}}
}
// ---------- hallucinations: the longer you sit in the dark, the worse it gets ----------
const eyeG=new THREE.SphereGeometry(.035,8,8),eyes=[];
for(let i=0;i<3;i++){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0x9de8df,transparent:true});for(const x of[-.09,.09]){const e=new THREE.Mesh(eyeG,m);e.position.x=x;g.add(e)}g.visible=false;scene.add(g);eyes.push({g,m,t:0,bl:0})}
function steps(){ // footsteps that creep up behind you, then stop
 const a=P.yaw+(R()-.5)*1.2;let d=11,i=0;const n=5+(R()*5|0),t=setInterval(()=>{
  if(P.on||!P.alive||document.pointerLockElement!==canvas||i++>=n){clearInterval(t);return}
  d-=1+R()*.6;tone(125,55,.14,.15,"triangle",null,[P.x+Math.sin(a)*d,P.z+Math.cos(a)*d])},R()<.4?280:430)}
function whisper(at){if(!AC)return;const len=AC.sampleRate,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<len;i++)d[i]=(R()*2-1)*Math.sin(Math.PI*i/len)**2*(.5+.5*Math.sin(i*.0035));
 const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),p=AC.createStereoPanner();
 f.type="bandpass";f.frequency.value=1500+R()*1200;f.Q.value=3;g.gain.value=.7;
 const dx=at[0]-P.x,dz=at[1]-P.z;p.pan.value=Math.max(-1,Math.min(1,(dx*Math.cos(P.yaw)-dz*Math.sin(P.yaw))/(Math.hypot(dx,dz)||1)));
 s.buffer=b;s.connect(f);f.connect(g);g.connect(p);p.connect(AC.destination);s.start()}
function updateHallu(dt){
 V.dk=P.on?0:V.dk+dt;
 for(const e of eyes){if(!e.g.visible)continue;e.t-=dt;e.bl-=dt;
  _q.set(e.g.position.x-camera.position.x,0,e.g.position.z-camera.position.z).normalize();
  if(P.on||e.t<=0||_q.dot(_r.copy(fdir).setY(0).normalize())>.97)e.g.visible=false;
  else{e.m.opacity=e.bl>0?0:1;if(e.bl<-.4-R()*2.5)e.bl=.12}}
 if(V.dk>3&&survT>V.hAt){
  V.hAt=survT+Math.max(2.5,10-V.dk*.25)*(.6+R()*.8);
  const k=R(),a=R()*6.283,d=5+R()*8,x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d;
  if(k<.55){const e=eyes.find(e=>!e.g.visible);
   if(e&&!hitWall(x,z,.5)&&!inPool(x,z,0)&&los(P.x,P.z,x,z)){e.g.position.set(x,.3+R()*2.5,z);e.g.lookAt(camera.position);e.m.color.setHex(R()<.2?0xff3a2a:0x9de8df);e.t=1+R()*3;e.bl=-1;e.g.visible=true}}
  else if(k<.85){if(V.dk>6)steps()}
  else if(V.dk>10)whisper([x,z])}
}

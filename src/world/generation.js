// World generation: room graph, room layouts, pools, floods, and walls.
// ---------- level ----------
const id=(x,z)=>z*GRID+x,links=Array.from({length:GRID*GRID},()=>new Set());
{const seen=new Set([0]),st=[0],ln=(a,b)=>{links[a].add(b);links[b].add(a)};
 while(st.length){const a=st[st.length-1],x=a%GRID,z=a/GRID|0;
  const o=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([i,j])=>i>=0&&j>=0&&i<GRID&&j<GRID&&!seen.has(id(i,j)));
  if(!o.length){st.pop();continue}const[i,j]=o[R()*o.length|0];ln(a,id(i,j));seen.add(id(i,j));st.push(id(i,j));}
 for(let z=0;z<GRID;z++)for(let x=0;x<GRID;x++){if(x<GRID-1&&R()<.28)ln(id(x,z),id(x+1,z));if(z<GRID-1&&R()<.28)ln(id(x,z),id(x,z+1));}}

function makePool(cx,cz,v){
 const w=v?7.2:9.4,d=v?10.5:8.2,sw=(CELL-w)/2,sd=(CELL-d)/2,D=2;
 box(cx,-.1,cz-d/2-sd/2,CELL,.2,sd,M.floor);box(cx,-.1,cz+d/2+sd/2,CELL,.2,sd,M.floor);
 box(cx-w/2-sw/2,-.1,cz,sw,.2,d,M.floor);box(cx+w/2+sw/2,-.1,cz,sw,.2,d,M.floor);
 box(cx,-D-.1,cz,w,.2,d,M.pool);
 for(const s of[-1,1]){ // tiled basin walls, coping, underwater lights
  box(cx,-D/2,cz+s*(d/2-.15),w,D,.3,M.pool);box(cx+s*(w/2-.15),-D/2,cz,.3,D,d-.6,M.pool);
  box(cx,.08,cz+s*(d/2+.12),w+.74,.16,.5,M.trim,{s:1});box(cx+s*(w/2+.12),.08,cz,.5,.16,d+.74,M.trim,{s:1});
  box(cx,-1.2,cz+s*(d/2-.32),w*.5,.12,.04,M.glow);}
 const lx=cx+w/2+.5; // ladder
 for(const dz of[-.3,.3]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,2.6,8),M.metal);r.position.set(lx-.35,-.3,cz+dz);scene.add(r);}
 for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.6,6),M.metal);r.rotation.x=Math.PI/2;r.position.set(lx-.35,-1.3+i*.45,cz);scene.add(r);}
 const wm=new THREE.Mesh(new THREE.PlaneGeometry(w,d),waterMat);wm.rotation.x=-Math.PI/2;wm.position.set(cx,-.35,cz);scene.add(wm);
 pools.push({x:cx,z:cz,hw:w/2+.6,hd:d/2+.6});
}
const floods=[];
function flood(cx,cz){const m=new THREE.Mesh(new THREE.PlaneGeometry(CELL-1.3,CELL-1.3),waterMat);for(const k of[-1,1]){box(cx,.06,cz+k*(HALF-.55),CELL-1,.12,.3,M.trim);box(cx+k*(HALF-.55),.06,cz,.3,.12,CELL-1,M.trim)}m.rotation.x=-Math.PI/2;m.position.set(cx,.1,cz);scene.add(m);floods.push({x:cx,z:cz})}
const inFlood=(x,z)=>floods.some(f=>Math.abs(x-f.x)<HALF&&Math.abs(z-f.z)<HALF);
function stalls(cx,cz){for(const s of[-1,1])for(const dx of[-8.5,-6,-3.5,3.5,6,8.5])box(cx+dx,1.2,cz+s*7,.15,2.4,4.5,M.pool,{c:1,s:1})}
function maze(cx,cz){const o={c:1,s:1};box(cx-3.1,1.7,cz-5,12.3,3.4,.3,M.wall,o);box(cx+3.1,1.7,cz+5,12.3,3.4,.3,M.wall,o);box(cx+5,1.7,cz,.3,3.4,4,M.wall,o)}
function makeRoom(x,z){
 const cx=x*CELL,cz=z*CELL,r=id(x,z);
 box(cx,WH+.1,cz,CELL,.2,CELL,M.ceil);
 const k=r?R():.99;
 if(k<.3)makePool(cx,cz,R()<.5);else box(cx,-.1,cz,CELL,.2,CELL,M.floor);
 if(k>=.3&&k<.45)flood(cx,cz);else if(k>=.45&&k<.6)stalls(cx,cz);else if(k>=.6&&k<.78)maze(cx,cz);
 const lx=cx+(R()-.5)*8,lz=cz+(R()-.5)*8,lit=r===0||R()<.28;
 box(lx,WH-.05,lz,2.2,.1,.5,lit?M.lamp:M.dead);
 if(lit){const l=new THREE.PointLight(0x86c7c4,6,13,2);l.position.set(lx,WH-.5,lz);l.userData.b=6;scene.add(l);lamps.push(l);}
 if(r&&k>=.78)for(const[dx,dz]of[[-7,-7],[7,-7],[-7,7],[7,7]])box(cx+dx,WH/2,cz+dz,.75,WH,.75,M.wall,{c:1,s:1});
}
const seg=(CELL-4.5)/2,sc=2.25+seg/2,W={c:1,s:1};
function wallX(x,z,open){ // wall at fixed x, runs along z
 if(!open)return box(x,WH/2,z,.5,WH,CELL,M.wall,W);
 for(const s of[-1,1])box(x,WH/2,z+s*sc,.5,WH,seg,M.wall,W);box(x,WH-.55,z,.5,1.1,4.5,M.wall,{s:1});}
function wallZ(x,z,open){
 if(!open)return box(x,WH/2,z,CELL,WH,.5,M.wall,W);
 for(const s of[-1,1])box(x+s*sc,WH/2,z,seg,WH,.5,M.wall,W);box(x,WH-.55,z,4.5,1.1,.5,M.wall,{s:1});}
for(let z=0;z<GRID;z++)for(let x=0;x<GRID;x++){
 makeRoom(x,z);const cx=x*CELL,cz=z*CELL,a=id(x,z);
 if(x===0||!links[a].has(id(x-1,z)))wallX(cx-HALF,cz);
 if(z===0||!links[a].has(id(x,z-1)))wallZ(cx,cz-HALF);
 x===GRID-1?wallX(cx+HALF,cz):wallX(cx+HALF,cz,links[a].has(id(x+1,z)));
 z===GRID-1?wallZ(cx,cz+HALF):wallZ(cx,cz+HALF,links[a].has(id(x,z+1)));
}

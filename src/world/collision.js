// World collision and navigation: wall tests, line of sight, and A* paths.
// ---------- collision, navigation ----------
function hitWall(x,z,r){for(const c of colliders){if(Math.abs(x-c.x)>c.w/2+r||Math.abs(z-c.z)>c.d/2+r)continue;const px=Math.max(c.x-c.w/2,Math.min(x,c.x+c.w/2)),pz=Math.max(c.z-c.d/2,Math.min(z,c.z+c.d/2));if((x-px)**2+(z-pz)**2<r*r)return true}return false}
const inPool=(x,z,m=0)=>pools.some(p=>Math.abs(x-p.x)<p.hw+m&&Math.abs(z-p.z)<p.hd+m);
function los(ax,az,bx,bz){const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.12);for(let i=1;i<n;i++){const t=i/n;if(hitWall(ax+(bx-ax)*t,az+(bz-az)*t,.05))return false}return true}
const nav=new Uint8Array(N*N);
for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=i-HALF+.5,z=j-HALF+.5;nav[j*N+i]=hitWall(x,z,.75)||inPool(x,z,.35)?1:0}
const cellOf=(x,z)=>{const i=Math.floor(x+HALF),j=Math.floor(z+HALF);return i<0||j<0||i>=N||j>=N?-1:j*N+i};
const cellPos=c=>[c%N-HALF+.5,(c/N|0)-HALF+.5];
function randFree(minD,from){let fallback=null,best=-1;for(let k=0;k<700;k++){const c=R()*N*N|0;if(nav[c])continue;const p=cellPos(c),d=Math.hypot(p[0]-from.x,p[1]-from.z);if(d>best){best=d;fallback=p}if(d>=minD)return p}return fallback||[0,0]}
function freeIn(rx,rz){for(let k=0;k<200;k++){const x=rx*CELL+(R()-.5)*15,z=rz*CELL+(R()-.5)*15,c=cellOf(x,z);if(c>=0&&!nav[c])return[x,z]}return[rx*CELL,rz*CELL]}
const D8=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
const _gc=new Float32Array(N*N),_F=new Float32Array(N*N),_par=new Int32Array(N*N),_done=new Uint8Array(N*N);
function findPath(sx,sz,gx,gz){
 const s=cellOf(sx,sz);let g=cellOf(gx,gz);if(s<0||g<0)return[];
 if(nav[g]){let best=-1,bd=1e9;const i0=g%N,j0=g/N|0;
  for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){const ni=i0+a,nj=j0+b;if(ni<0||nj<0||ni>=N||nj>=N)continue;const n=nj*N+ni;if(!nav[n]&&a*a+b*b<bd){bd=a*a+b*b;best=n}}
  if(best<0)return[];g=best;}
 const gc=_gc.fill(1e9),F=_F,par=_par.fill(-1),done=_done.fill(0);
 const gi=g%N,gj=g/N|0,h=c=>Math.hypot(c%N-gi,(c/N|0)-gj),open=[s];gc[s]=0;F[s]=h(s);
 while(open.length){
  let bi=0;for(let k=1;k<open.length;k++)if(F[open[k]]<F[open[bi]])bi=k;
  const c=open[bi];open[bi]=open[open.length-1];open.pop();
  if(c===g)break;if(done[c])continue;done[c]=1;const ci=c%N,cj=c/N|0;
  for(const[dx,dz,w]of D8){const ni=ci+dx,nj=cj+dz;if(ni<0||nj<0||ni>=N||nj>=N)continue;const n=nj*N+ni;
   if(nav[n]||done[n]||(dx&&dz&&(nav[cj*N+ni]||nav[nj*N+ci])))continue;
   const ng=gc[c]+w;if(ng<gc[n]){gc[n]=ng;par[n]=c;F[n]=ng+h(n);open.push(n)}}
 }
 if(par[g]<0)return[];const out=[];for(let c=g;c!==-1&&c!==s;c=par[c])out.push(cellPos(c));return out.reverse();
}

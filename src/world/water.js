// World rendering: animated water shader material.
// ---------- water shader ----------
const waterMat=new THREE.ShaderMaterial({transparent:true,
 uniforms:{uT:{value:0},uC:{value:new THREE.Vector3()},uD:{value:new THREE.Vector3(0,0,-1)},uOn:{value:1},uF:{value:scene.fog.color},uFd:{value:scene.fog.density}},
 vertexShader:`varying vec3 vW;varying float vZ;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 m=viewMatrix*w;vZ=-m.z;gl_Position=projectionMatrix*m;}`,
 fragmentShader:`uniform float uT,uOn,uFd;uniform vec3 uC,uD,uF;varying vec3 vW;varying float vZ;
float h(vec2 p){return sin(p.x*1.3+uT*.9)*.5+sin(p.y*1.7-uT*.7)*.5+sin((p.x+p.y)*2.9+uT*1.6)*.25+sin((p.x-p.y)*5.1-uT*2.3)*.12;}
void main(){
 vec2 p=vW.xz;float e=.06,a=h(p);
 vec3 N=normalize(vec3(-(h(p+vec2(e,0.))-a)/e*.12,1.,-(h(p+vec2(0.,e))-a)/e*.12));
 vec3 V=normalize(uC-vW);float fr=pow(1.-max(dot(N,V),0.),3.);
 vec3 col=mix(vec3(.01,.12,.15),vec3(.03,.34,.37),.5+.3*a)*.7;
 col=mix(col,vec3(.08,.16,.18),fr*.6);
 vec3 L=vW-uC;float dl=length(L);L/=dl;
 float sp=smoothstep(.82,.93,dot(L,uD))*uOn/(1.+.02*dl*dl);
 float gs=pow(max(dot(N,V),0.),60.),ca=pow(.5+.5*sin(h(p*2.)*6.+p.x*3.),6.);
 col+=vec3(.5,.95,.95)*sp*(.25+gs*2.+ca*.5);
 col=mix(col,uF,1.-exp(-uFd*uFd*vZ*vZ));
 gl_FragColor=vec4(col,.88);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});

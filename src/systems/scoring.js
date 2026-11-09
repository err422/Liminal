// Run state, score persistence, death flow, and shared HUD messages.
// Shared short-lived HUD messages.
let msgT;
const msg=t=>{const m=$("msg");m.textContent=t;m.style.opacity=1;clearTimeout(msgT);msgT=setTimeout(()=>m.style.opacity=0,2200)};

// ---------- game flow / input ----------
const ov=$("overlay"),canvas=renderer.domElement;let over=false;
const fmt=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
function end(title,text,btn){
 if(over)return;over=true;P.alive=false;$("dmg").style.opacity=.35;
 setTimeout(()=>{document.exitPointerLock?.();$("intro").innerHTML=`<b>${title}</b><br><br>${text}`;$("start").textContent=btn;ov.style.display="grid";ov.style.opacity=1},200);
}
function die(){
 const sc=Math.floor(score);let nb="";if(sc>best){best=sc;nb=" — NEW BEST";try{localStorage.setItem("liminalBest",sc)}catch(e){}}
 end("YOU DIED.",`SCORE <b>${sc}</b>${nb}<br>SURVIVED ${fmt(survT)} · KILLS ${kills}<br>BEST ${best}<br><br>Permadeath. The complex will be different next time.`,"NEW RUN");
}

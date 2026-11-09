// Enemy population management and threat HUD state.
function updateMonsters(dt,now){
 let md=99,hunt=0,flee=0,atk=0;
 for(const m of mons){const d=updateMonster(m,dt,now);if(!m.dead){md=Math.min(md,d);hunt|=m.state==="hunt";flee|=m.state==="flee";atk=Math.max(atk,m.atk)}}
 for(let i=mons.length-1;i>=0;i--)if(mons[i].dead>2.5)mons.splice(i,1);
 $("dmg").style.opacity=Math.min(.5,atk*1.6);
 $("warn").textContent=hunt?"IT HAS FOUND YOU — RUN":md<9?"SOMETHING IS CLOSE":flee?"IT'S RETREATING":"";
 if(AC&&md<20&&survT>nextBeat){thump();nextBeat=survT+.38+md*.04}
 const target=Math.min(6,1+Math.floor(survT/45));
 if(mons.filter(m=>!m.dead).length<target&&survT>spawnAt){makeMonster();spawnAt=survT+Math.max(5,14-diff*2.5)}
}

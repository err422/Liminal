// HUD text updates.
function hud() {
  $("obj").textContent = `SCORE ${Math.floor(score)} · ${fmt(survT)}`;
  $("thr").textContent = `THREAT ${(1+diff).toFixed(1)} · KILLS ${kills}`;
  $("ammo").textContent = (gun.rl > 0 ? "RELOADING" : "●".repeat(gun.ammo) + "○".repeat(2 - gun.ammo)) + "  ·  SHELLS " + gun.res;
}
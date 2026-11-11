import { Net } from './net.js';
import { Game } from './game.js';
const $ = id => document.getElementById(id), show = id => { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; };
let net = null, game = null;
const name = () => ($('name').value.trim() || 'Player').slice(0, 14);
const err = t => { $('err').textContent = t; };
function renderLobby() {
  $('code').textContent = net.code; $('plist').innerHTML = '';
  for (const p of net.players.values()) { const li = document.createElement('li'); li.textContent = p.name + (p.id === 0 ? ' (host)' : p.id === net.myId ? ' (you)' : ''); $('plist').append(li); }
  $('start').hidden = !net.isHost; $('wait').hidden = net.isHost;
}
function launch(seed, picked) {
  show('none'); $('hud').hidden = false;
  game = new Game({ canvas: $('view'), net, seed, picked });
  if (net) net.setHandlers({ message: (m, f) => game.onMessage(m, f), peerJoin: (i, n) => game.peerJoin(i, n), peerLeave: i => game.peerLeave(i),
    welcomeExtra: () => ({ picked: [...game.picked] }), hostLost: hostLost, error: () => {} });
}
function hostLost() { game && game.banner('Host disconnected', 'The run has ended. Reload to start or join another room.'); document.exitPointerLock(); }
function lobbyHandlers() { net.setHandlers({ lobby: renderLobby, start: s => launch(s, []), hostLost: () => { show('menu'); err('The host left the lobby.'); } }); }
$('host').onclick = async () => { err(''); $('host').disabled = true;
  try { net = new Net(); lobbyHandlers(); await net.host(name()); show('lobby'); renderLobby(); } catch (e) { err('Could not create a room: ' + (e.type || e.message)); }
  $('host').disabled = false; };
$('join').onclick = async () => { err(''); const c = $('joincode').value; if (c.trim().length < 5) return err('Enter the 5-character room code.'); $('join').disabled = true;
  try { net = new Net(); lobbyHandlers(); const w = await net.join(c, name());
    if (w.started) launch(w.seed, w.picked || []); else { show('lobby'); renderLobby(); } } catch (e) { err(e.message || 'Could not join.'); net = null; }
  $('join').disabled = false; };
$('solo').onclick = () => { net = null; launch((Math.random() * 2 ** 31) | 0, []); };
$('start').onclick = () => launch(net.startGame(), []);
$('again').onclick = () => location.reload();
show('menu');

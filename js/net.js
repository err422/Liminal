import { CFG } from './config.js';
// Star topology over WebRTC (PeerJS): clients talk to the host, host relays. Peer = global from peerjs script tag.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', PREFIX = 'liminal-v1-';
const makeCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
export class Net {
  constructor() { this.isHost = false; this.myId = 0; this.players = new Map(); this.conns = new Map(); this.h = {};
    this.hostConn = null; this.nextId = 1; this.started = false; this.seed = 0; this.code = ''; }
  setHandlers(h) { this.h = h; }
  emit(n, ...a) { this.h[n] && this.h[n](...a); }
  host(name) {
    return new Promise((res, rej) => {
      const open = (attempt) => {
        const code = makeCode(), peer = new Peer(PREFIX + code); let ready = false;
        peer.on('open', () => { ready = true; this.peer = peer; this.isHost = true; this.code = code; this.myId = 0;
          this.players.set(0, { id: 0, name }); peer.on('connection', c => this._onConn(c)); res(code); });
        peer.on('error', e => { if (ready) return this.emit('error', e);
          if (e.type === 'unavailable-id' && attempt < 5) { peer.destroy(); open(attempt + 1); } else rej(e); });
      }; open(0);
    });
  }
  join(code, name) {
    return new Promise((res, rej) => {
      const peer = new Peer(); this.peer = peer; let done = false;
      const fail = e => { if (!done) { done = true; rej(e instanceof Error ? e : new Error(e.type || 'Connection failed')); } };
      peer.on('error', e => done ? this.emit('error', e) : fail(e));
      peer.on('open', () => {
        const c = peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true }); this.hostConn = c;
        const to = setTimeout(() => fail(new Error('No answer from that room code.')), 12000);
        c.on('open', () => c.send({ t: 'hello', name }));
        c.on('close', () => this.emit('hostLost'));
        c.on('data', m => {
          if (m.t === 'full') { clearTimeout(to); fail(new Error('That lobby is full.')); }
          else if (m.t === 'welcome') { clearTimeout(to); done = true; this.myId = m.you; this.code = code.toUpperCase();
            this.players = new Map(m.players.map(p => [p.id, p])); this.started = m.started; this.seed = m.seed; res(m); }
          else this._clientData(m);
        });
      });
    });
  }
  _clientData(m) {
    if (m.t === 'join') { this.players.set(m.id, { id: m.id, name: m.name }); this.emit('peerJoin', m.id, m.name); this.emit('lobby'); }
    else if (m.t === 'leave') { this.players.delete(m.id); this.emit('peerLeave', m.id); this.emit('lobby'); }
    else if (m.t === 'start') { this.started = true; this.seed = m.seed; this.emit('start', m.seed); }
    else this.emit('message', m, m.id);
  }
  _onConn(c) {
    c.on('data', m => this._hostData(c, m));
    c.on('close', () => this._drop(c)); c.on('error', () => this._drop(c));
  }
  _hostData(c, m) {
    if (m.t === 'hello' && c._pid === undefined) {
      if (this.players.size >= CFG.MAX_PLAYERS) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; }
      const id = this.nextId++; c._pid = id; this.conns.set(id, c); this.players.set(id, { id, name: m.name });
      c.send({ t: 'welcome', you: id, players: [...this.players.values()], started: this.started, seed: this.seed,
        ...(this.h.welcomeExtra ? this.h.welcomeExtra() : {}) });
      this._bcast({ t: 'join', id, name: m.name }, id); this.emit('peerJoin', id, m.name); this.emit('lobby');
    } else if (c._pid !== undefined) {
      if (m.t === 's') { m.id = c._pid; this._bcast(m, c._pid); }   // host relays movement to the other clients
      this.emit('message', m, c._pid);
    }
  }
  _drop(c) {
    const id = c._pid; if (id === undefined) return; c._pid = undefined;
    this.conns.delete(id); this.players.delete(id); this._bcast({ t: 'leave', id }); this.emit('peerLeave', id); this.emit('lobby');
  }
  _bcast(m, except) { for (const [id, c] of this.conns) if (id !== except && c.open) c.send(m); }
  broadcast(m) { this._bcast(m); }                       // host -> everyone
  send(m) { if (this.hostConn && this.hostConn.open) this.hostConn.send(m); }   // client -> host
  sendState(m) { this.isHost ? this._bcast(m) : this.send(m); }
  startGame() { this.started = true; this.seed = (Math.random() * 2 ** 31) | 0; this._bcast({ t: 'start', seed: this.seed }); return this.seed; }
}

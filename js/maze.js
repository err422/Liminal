// Pure, deterministic maze generator: same seed -> same maze on every client.
export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function generateMaze(seed, W, H, C, T) {
  const rnd = mulberry32(seed);
  const wN = Array.from({ length: H }, () => Array(W).fill(true));
  const wW = Array.from({ length: H }, () => Array(W).fill(true));
  const seen = Array.from({ length: H }, () => Array(W).fill(false));
  const carve = (x, y, nx, ny) => {
    if (nx > x) wW[y][nx] = false; else if (nx < x) wW[y][x] = false;
    else if (ny > y) wN[ny][x] = false; else wN[y][x] = false;
  };
  const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b]) => a>=0&&b>=0&&a<W&&b<H&&!seen[b][a]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[Math.floor(rnd() * nb.length)];
    carve(x, y, nx, ny); seen[ny][nx] = true; stack.push([nx, ny]);
  }
  for (let i = 0, n = Math.floor(W * H * 0.12); i < n; i++) { // loops so it isn't a perfect tree
    const x = 1 + Math.floor(rnd() * (W - 1)), y = 1 + Math.floor(rnd() * (H - 1));
    if (rnd() < 0.5) wW[y][x] = false; else wN[y][x] = false;
  }
  const links = (x, y) => { const r = [];
    if (x < W-1 && !wW[y][x+1]) r.push([x+1,y]); if (x > 0 && !wW[y][x]) r.push([x-1,y]);
    if (y < H-1 && !wN[y+1][x]) r.push([x,y+1]); if (y > 0 && !wN[y][x]) r.push([x,y-1]); return r; };
  // BFS from start; exit = farthest cell (guaranteed reachable)
  const dist = Array.from({ length: H }, () => Array(W).fill(-1)); dist[0][0] = 0;
  const q = [[0, 0]]; let far = [0, 0];
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i];
    for (const [a, b] of links(x, y)) if (dist[b][a] < 0) { dist[b][a] = dist[y][x] + 1; q.push([a, b]); if (dist[b][a] > dist[far[1]][far[0]]) far = [a, b]; } }
  const boxes = [], t = T / 2;
  const add = (cx, cz, sx, sz) => boxes.push({ cx, cz, sx, sz, minX: cx-sx/2, maxX: cx+sx/2, minZ: cz-sz/2, maxZ: cz+sz/2 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (wN[y][x]) add(x*C + C/2, y*C, C + T, T);
    if (wW[y][x]) add(x*C, y*C + C/2, T, C + T);
  }
  for (let x = 0; x < W; x++) add(x*C + C/2, H*C, C + T, T);
  for (let y = 0; y < H; y++) add(W*C, y*C + C/2, T, C + T);
  const lights = [], items = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const isEnd = (x === 0 && y === 0) || (x === far[0] && y === far[1]);
    if ((isEnd || rnd() < 0.09) && lights.length < 8) lights.push({ x: (x+.5)*C, z: (y+.5)*C });
    if (links(x, y).length === 1 && !isEnd && rnd() < 0.55 && items.length < 8)
      items.push({ id: items.length, x: (x+.5)*C, z: (y+.5)*C });
  }
  return { W, H, C, boxes, lights, items, start: { x: 0.5*C, z: 0.5*C }, exit: { x: (far[0]+.5)*C, z: (far[1]+.5)*C } };
}

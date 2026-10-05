/* Haddonfield Weather — pixel scene engine, weather FX, and the one-actor "director" */
const Scene = (() => {
  const W = 192, H = 176;
  let cv, g, fl, fg;
  const E = { t: 0, tod: 'night', fx: 'clear', windy: false, cold: false, heat: false, wind: 5, gust: 8, flash: 0, shake: 0, lamp: 1, moon: .5, temp: 50, sway: 0, red: 0, corridorLights: 1 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const F = (x, y, w, h, c) => { fg.fillStyle = c; fg.fillRect(x, y, w, h); };

  const RAINY = ['drizzle', 'rain', 'heavyrain', 'thunder', 'hail', 'sleet', 'tornado'];
  const GREY = ['cloudy', 'fog', 'drizzle', 'rain', 'heavyrain', 'thunder', 'hail', 'sleet', 'snow', 'heavysnow'];
  const isRain = () => RAINY.includes(E.fx);
  const isSnow = () => E.fx === 'snow' || E.fx === 'heavysnow' || E.fx === 'sleet';

  /* ================= particles ================= */
  let drops = [], flakes = [], pellets = [], leaves = [], embers = [], debris = [], bats = [], streaks = [], splashes = [], clouds = [], fogBands = [], frost = [];
  let bolt = null, nextBolt = 3, crow = null;
  function rebuild() {
    const fx = E.fx;
    const nDrops = { drizzle: 70, rain: 170, heavyrain: 320, thunder: 260, hail: 120, sleet: 110, tornado: 220 }[fx] || 0;
    drops = Array.from({ length: nDrops }, () => ({ x: rnd(-40, W + 20), y: rnd(-H, H), v: rnd(170, 240) * (fx === 'drizzle' ? .7 : 1), l: fx === 'drizzle' ? 2 : rnd(3, 6) }));
    const nFl = { snow: 130, heavysnow: 300, sleet: 40 }[fx] || 0;
    flakes = Array.from({ length: nFl }, () => ({ x: rnd(0, W), y: rnd(-H, H), v: rnd(12, 30), s: Math.random() < .25 ? 2 : 1, p: rnd(0, 6) }));
    const nP = { hail: 50, sleet: 50 }[fx] || 0;
    pellets = Array.from({ length: nP }, () => ({ x: rnd(0, W), y: rnd(-H, 0), vy: rnd(140, 200), vx: 0, b: 0, gy: rnd(140, 174) }));
    const nLeaves = 10 + (E.windy ? 30 : 0) + (fx === 'tornado' ? 30 : 0);
    leaves = Array.from({ length: nLeaves }, () => newLeaf(true));
    embers = fx === 'fire' ? Array.from({ length: 70 }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(15, 45), p: rnd(0, 6) })) : [];
    debris = fx === 'tornado' ? Array.from({ length: 16 }, (_, i) => ({ a: rnd(0, 6.28), r: rnd(8, 30), h: rnd(0, 70), k: i % 5, sp: rnd(2, 4) })) : [];
    streaks = E.windy || fx === 'tornado' ? Array.from({ length: 18 }, () => ({ x: rnd(0, W), y: rnd(0, 150), l: rnd(8, 22), v: rnd(120, 220) })) : [];
    bats = Array.from({ length: 3 }, () => ({ x: rnd(-60, W), y: rnd(15, 60), v: rnd(14, 26), p: rnd(0, 6) }));
    const nCl = { clear: 1, partly: 4, cloudy: 8, fog: 5, wind: 4, heat: 0, cold: 2 }[fx] ?? 7;
    clouds = Array.from({ length: nCl }, (_, i) => ({ x: rnd(-40, W), y: rnd(6, 44), s: rnd(.7, 1.4), v: rnd(2, 6) * (E.windy ? 3 : 1) }));
    fogBands = Array.from({ length: fx === 'fog' ? 7 : (E.fx === 'cold' ? 2 : 2) }, (_, i) => ({ x: rnd(-100, W), y: 90 + i * 12 + rnd(-6, 6), w: rnd(90, 180), v: rnd(3, 9) * (Math.random() < .5 ? -1 : 1) }));
    frost = [];
    for (let c = 0; c < 4; c++) { // frost crystals in corners
      const cx = c % 2 ? W : 0, cy = c > 1 ? H : 0;
      for (let i = 0; i < 70; i++) { const a = rnd(0, 1.57), d = Math.pow(Math.random(), 2) * 34; frost.push([Math.round(cx + (c % 2 ? -1 : 1) * Math.cos(a) * d), Math.round(cy + (c > 1 ? -1 : 1) * Math.sin(a) * d), Math.random()]); }
    }
    nextBolt = rnd(2, 6);
  }
  function newLeaf(anyY) { return { x: rnd(-20, W), y: anyY ? rnd(-H, H) : rnd(-30, -4), v: rnd(10, 22), p: rnd(0, 6), c: pick(['#d8641a', '#b8361a', '#e8a82a', '#8a4a1a']) }; }

  /* ================= sky / celestial / clouds ================= */
  function skyCols() {
    const fx = E.fx, tod = E.tod;
    if (fx === 'tornado') return ['#16200f', '#6f8040'];
    if (fx === 'fire') return tod === 'night' ? ['#1a0402', '#a03010'] : ['#3a0806', '#e0581a'];
    if (fx === 'heat' && tod !== 'night') return ['#d88a2a', '#ffe0a0'];
    if (GREY.includes(fx)) {
      if (fx === 'snow' || fx === 'heavysnow') return tod === 'night' ? ['#0c0f18', '#2c3040'] : tod === 'dusk' ? ['#3a3448', '#9a8a90'] : ['#8a94a4', '#d4d9e0'];
      return tod === 'night' ? ['#06070c', '#1c1d28'] : tod === 'dusk' ? ['#221e2a', '#6e4a4a'] : ['#4e5864', '#959ca6'];
    }
    if (fx === 'cold') return tod === 'night' ? ['#040818', '#1a2648'] : ['#6a9ad8', '#d6e6f4'];
    return tod === 'night' ? ['#04061a', '#24183c'] : tod === 'dusk' ? ['#1e1238', '#e2602e'] : ['#4a7cc6', '#efb878'];
  }
  function darkness() {
    let d = E.tod === 'night' ? .56 : E.tod === 'dusk' ? .3 : 0;
    if (GREY.includes(E.fx) && E.tod !== 'night') d += .14;
    if (E.fx === 'tornado') d += .12;
    if (E.fx === 'fire') d = Math.max(0, d - .15);
    return Math.max(0, Math.min(.75, d - E.flash * .5));
  }
  function drawSky(t) {
    const [a, b] = skyCols();
    const gr = g.createLinearGradient(0, 0, 0, 130); gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.fillRect(0, 0, W, 130);
    // stars
    if (E.tod === 'night' && !GREY.includes(E.fx) && E.fx !== 'fire') {
      for (let i = 0; i < 40; i++) { const x = (i * 73) % W, y = (i * 41) % 70; if ((Math.sin(t * 2 + i) + 1) > .4) R(x, y, 1, 1, i % 7 ? '#c8c8e0' : '#ffffff'); }
    }
    // moon or sun
    if (E.tod === 'night' && !['heavyrain', 'thunder', 'tornado', 'fire'].includes(E.fx)) {
      const mx = 150, my = 26, r = 12;
      const gl = g.createRadialGradient(mx, my, 4, mx, my, 34); gl.addColorStop(0, 'rgba(255,240,200,.35)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = gl; g.fillRect(mx - 34, my - 34, 68, 68);
      g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill();
      R(mx - 5, my - 4, 3, 2, '#d8cfae'); R(mx + 2, my + 3, 4, 3, '#d8cfae'); R(mx - 2, my + 6, 2, 2, '#d8cfae');
      // phase shadow
      const ph = E.moon; // 0 new, .5 full
      if (Math.abs(ph - .5) > .02) {
        const off = ph < .5 ? -(ph / .5) * 2 * r : ((1 - ph) / .5) * 2 * r;
        g.save(); g.beginPath(); g.arc(mx, my, r + .5, 0, 7); g.clip();
        g.fillStyle = 'rgba(10,12,30,.88)'; g.beginPath(); g.arc(mx + (ph < .5 ? off + 0 : off) * 1, my, r + 1, 0, 7);
        g.fill(); g.restore();
      }
    } else if (E.tod !== 'night' && !['heavyrain', 'thunder', 'tornado', 'rain', 'snow', 'heavysnow', 'fog', 'hail', 'sleet', 'cloudy'].includes(E.fx)) {
      const sx = 40, sy = E.tod === 'dusk' ? 96 : 30, r = E.fx === 'heat' ? 18 : 11;
      const gl = g.createRadialGradient(sx, sy, 4, sx, sy, r * 3); gl.addColorStop(0, 'rgba(255,230,150,.6)'); gl.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = gl; g.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
      g.fillStyle = E.tod === 'dusk' ? '#ff8a3a' : '#ffe27a'; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
      if (E.fx === 'heat') for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + t * .3, d = r + 4 + Math.sin(t * 4 + i) * 2; R(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), 2, 2, '#fff2b0'); }
      if (E.fx === 'heat') { R(sx - 6, sy - 3, 3, 3, '#a84a10'); R(sx + 3, sy - 3, 3, 3, '#a84a10'); R(sx - 5, sy + 4, 10, 2, '#a84a10'); R(sx - 3, sy + 4, 1, 1, '#ffe27a'); R(sx + 1, sy + 4, 1, 1, '#ffe27a'); }
    }
  }
  function cloudShape(x, y, s, col, shadow) {
    const parts = [[0, 6, 10], [12, 0, 13], [26, 4, 11], [36, 8, 8], [-9, 10, 7]];
    g.fillStyle = shadow; parts.forEach(p => { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s + 3, p[2] * s, 0, 7); g.fill(); });
    g.fillStyle = col; parts.forEach(p => { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, 7); g.fill(); });
    g.fillRect(x - 9 * s, y + 8 * s, 46 * s, 6 * s);
  }
  function drawClouds(t, dt) {
    const stormy = ['rain', 'heavyrain', 'thunder', 'hail', 'sleet', 'tornado', 'drizzle'].includes(E.fx);
    const night = E.tod === 'night';
    if (E.fx === 'fire') { clouds.forEach(c => { c.x += c.v * dt; if (c.x > W + 50) c.x = -70; cloudShape(c.x, c.y, c.s, night ? '#2a0e08' : '#4a1a10', '#1a0604'); }); return; }
    const col = stormy ? (night ? '#1a1b24' : '#4a4e5a') : GREY.includes(E.fx) ? (night ? '#2a2c38' : '#a8aeb8') : (night ? '#3a3850' : '#f2ece4');
    const sh = stormy ? (night ? '#0e0f16' : '#30343e') : (night ? '#1c1a2c' : '#c8bcc0');
    clouds.forEach(c => { c.x += c.v * dt; if (c.x > W + 50) c.x = -70; cloudShape(c.x, c.y, c.s, col, sh); });
    if (stormy || E.fx === 'cloudy') {
      // overcast deck
      g.fillStyle = col; g.fillRect(0, 0, W, 8);
      for (let x = 0; x < W; x += 8) { g.beginPath(); g.arc(x + 4, 8, 7 + Math.sin(x + t * .5) * 2, 0, 7); g.fill(); }
    }
    if (stormy) drawScaryCloud(t, col, sh);
  }
  function drawScaryCloud(t, col, sh) {
    const x = 70 + Math.sin(t * .25) * 18, y = 18 + Math.sin(t * .7) * 2;
    cloudShape(x, y, 1.35, col, sh);
    cloudShape(x - 16, y + 8, 1.0, col, sh);
    // face
    const glow = E.flash > .2 ? '#ffffff' : (E.fx === 'tornado' ? '#c8ff6a' : '#ffcf3a');
    const ex = Math.round(x + 10), ey = Math.round(y + 6);
    R(ex - 1, ey - 2, 7, 2, sh); R(ex + 13, ey - 2, 7, 2, sh); // angry brows
    R(ex, ey - 1, 2, 1, sh); R(ex + 17, ey - 1, 2, 1, sh);
    const blink = (t % 5) < .12;
    if (!blink) { R(ex + 1, ey, 4, 3, glow); R(ex + 14, ey, 4, 3, glow); R(ex + 3, ey + 1, 1, 1, '#200'); R(ex + 15, ey + 1, 1, 1, '#200'); }
    const open = E.flash > .2 ? 5 : 2 + Math.round(Math.abs(Math.sin(t * 1.3)));
    R(ex + 3, ey + 7, 13, open, '#0a0606');
    for (let i = 0; i < 6; i++) R(ex + 3 + i * 2 + (i % 2), ey + 7, 1, 2, '#e8e0d0');
    // glow
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25; R(ex - 1, ey - 1, 8, 5, glow); R(ex + 12, ey - 1, 8, 5, glow); g.restore();
  }

  /* ================= helpers for backdrops ================= */
  function tree(x, gy, h, sway, cols) {
    R(x - 2, gy - h, 4, h, '#3a2618'); R(x - 1, gy - h, 1, h, '#4e3420');
    R(x - 6 + sway * .4, gy - h + 6, 5, 1, '#3a2618'); R(x + 2 + sway * .4, gy - h + 10, 6, 1, '#3a2618');
    const c = cols || ['#a8401a', '#d0701e', '#e8a030'];
    [[0, -h - 4, 13], [-9, -h + 3, 10], [9, -h + 2, 10], [-4, -h - 12, 9], [6, -h - 9, 9]].forEach((p, i) => { g.fillStyle = c[i % 3]; g.beginPath(); g.arc(x + p[0] + sway * (1 + i * .2), gy + p[1], p[2], 0, 7); g.fill(); });
  }
  function bareTree(x, gy, h, sway) {
    R(x - 2, gy - h, 4, h, '#1e1612');
    const br = [[-1, .5, -14, -12], [1, .35, 12, -14], [-1, .2, -10, -18], [1, .65, 10, -8]];
    br.forEach(([d, k, dx, dy]) => { const sx = x, sy = gy - h * k; for (let i = 0; i < 12; i++) R(Math.round(sx + dx * i / 12 + sway * i / 24), Math.round(sy + dy * i / 12), 2, 1, '#1e1612'); });
  }
  function pumpkin(x, y, lit, t) {
    R(x - 4, y - 5, 9, 5, '#d8661a'); R(x - 3, y - 6, 7, 1, '#d8661a'); R(x - 1, y - 5, 1, 5, '#b8500e'); R(x + 1, y - 5, 1, 5, '#b8500e'); R(x, y - 8, 1, 2, '#3a6a2a');
    const f = lit ? (Math.sin(t * 13 + x) > -.2 ? '#ffd23a' : '#ff9a1a') : '#3a1a06';
    R(x - 3, y - 4, 2, 1, f); R(x + 2, y - 4, 2, 1, f); R(x - 2, y - 2, 5, 1, f);
  }
  function glow(x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function street() {
    R(0, 150, W, 9, '#8e8a82'); for (let x = 6; x < W; x += 16) R(x, 150, 1, 9, '#76726a');
    R(0, 159, W, 2, '#6a665e'); R(0, 161, W, 15, '#2a2a30'); for (let x = 0; x < W; x += 28) R(x + 6, 170, 10, 1, '#3a3a40');
  }
  function lawn(y, col) { R(0, y, W, 150 - y, col || '#55602a'); for (let i = 0; i < 60; i++) R((i * 37) % W, y + (i * 13) % (150 - y), 2, 1, i % 3 ? '#4a5424' : '#8a5a20'); }
  function farTrees(y, col) { g.fillStyle = col; for (let x = -10; x < W + 10; x += 14) { g.beginPath(); g.arc(x, y - (x * 7 % 9), 11, 0, 7); g.fill(); } R(0, y, W, 12, col); }
  function picket(y, x0, x1) { R(x0, y + 3, x1 - x0, 1, '#d8d4c8'); R(x0, y + 7, x1 - x0, 1, '#d8d4c8'); for (let x = x0; x < x1; x += 4) { R(x, y, 2, 11, '#ecE8dc'); R(x, y - 1, 1, 1, '#ecE8dc'); } }
  function win(x, y, w, h, lit, t, seed = 0, tv = false) {
    R(x - 1, y - 1, w + 2, h + 2, '#e8e2d2'); R(x, y, w, h, '#14141e');
    R(x + Math.floor(w / 2), y, 1, h, '#e8e2d2'); R(x, y + Math.floor(h / 2), w, 1, '#e8e2d2');
  }

  /* ================= locations ================= */
  const LOC = {};
  LOC.lampkin = {
    name: 'LAMPKIN LANE — THE MYERS HOUSE', roofs: [[50, 74, 82], [50, 98, 82]],
    draw(t) {
      farTrees(112, '#1e2a1c'); lawn(120);
      // Myers house
      g.fillStyle = '#4a4650'; g.beginPath(); g.moveTo(48, 75); g.lineTo(90, 48); g.lineTo(132, 75); g.fill();
      R(110, 52, 6, 14, '#5a3a30');
      R(54, 74, 72, 56, '#d4cdb8'); for (let y = 76; y < 130; y += 3) R(54, y, 72, 1, '#bdb6a0');
      R(54, 74, 2, 56, '#a8a290'); R(124, 74, 2, 56, '#a8a290');
      win(64, 80, 10, 12); win(86, 80, 10, 12); win(108, 80, 10, 12);
      R(108, 80, 10, 12, '#14141e'); R(107, 85, 12, 2, '#6a4a30'); R(110, 79, 2, 14, '#6a4a30'); // boarded
      R(50, 98, 80, 4, '#7a746a'); R(50, 97, 80, 1, '#9a948a');
      [54, 72, 106, 124].forEach(x => R(x, 102, 2, 26, '#e0dacb'));
      R(85, 106, 12, 22, '#2e2018'); R(86, 107, 10, 20, '#3a2a20'); R(94, 117, 1, 1, '#c8a040');
      win(62, 108, 12, 12); win(108, 108, 12, 12);
      R(80, 128, 22, 3, '#9a948a'); R(82, 131, 18, 2, '#8a847a');
      R(40, 130, 100, 1, '#3a4420');
      picket(136, 0, 138);
      // streetlamp
      R(21, 86, 2, 64, '#24242a'); R(16, 82, 12, 4, '#30303a'); R(18, 86, 8, 2, E.lamp > .5 && E.tod !== 'day' ? '#fff2b0' : '#8a8a80');
      street();
    },
    glow(t) {
      pumpkin(80, 128, true, t); pumpkin(102, 128, true, t);
      if (E.tod !== 'day') { glow(80, 125, 9, 'rgba(255,170,40,A)', .5); glow(102, 125, 9, 'rgba(255,170,40,A)', .5); }
      if (E.tod !== 'day' && E.lamp > .5) { glow(22, 90, 46, 'rgba(255,230,150,A)', .42 * E.lamp); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,230,150,${.1 * E.lamp})`; g.beginPath(); g.moveTo(18, 88); g.lineTo(26, 88); g.lineTo(48, 160); g.lineTo(-4, 160); g.fill(); g.restore(); }
    },
    front(t) { // the hedge
      const sw = E.sway * .5;
      fg.fillStyle = '#22361a';
      for (let x = 136; x < W + 6; x += 6) { fg.beginPath(); fg.arc(x + sw, 122 + Math.sin(x * .7) * 2, 7, 0, 7); fg.fill(); }
      F(130, 122, W - 130, 30, '#22361a');
      for (let i = 0; i < 80; i++) F(132 + (i * 29) % 60, 118 + (i * 17) % 32, 2, 1, i % 2 ? '#2e4a22' : '#1a2a14');
      F(130, 150, W - 130, 1, '#16220f');
    },
  };
  LOC.doyle = {
    name: 'THE DOYLE HOUSE', roofs: [[26, 70, 98]],
    draw(t) {
      farTrees(110, '#1a2418'); lawn(118);
      g.fillStyle = '#3a3640'; g.beginPath(); g.moveTo(24, 71); g.lineTo(76, 44); g.lineTo(128, 71); g.fill();
      R(30, 70, 92, 60, '#6a7686'); for (let y = 72; y < 130; y += 3) R(30, y, 92, 1, '#5e6a78');
      R(66, 103, 16, 27, '#4a4038'); R(68, 105, 12, 25, '#120c08');
      R(26, 99, 100, 3, '#5a5248');
      win(40, 78, 12, 12); win(98, 78, 12, 12); win(40, 108, 14, 12); win(96, 108, 14, 12);
      R(62, 130, 24, 3, '#8a847a');
      picket(138, 0, 60); picket(138, 90, 140);
      street();
      // tree (backdrop foliage, trunk is front)
      tree(154, 150, 76, E.sway, ['#9a3818', '#c86a1a', '#e09a28']);
    },
    glow(t) {
      const night = E.tod !== 'day';
      const warm = '#ffd890';
      if (night) {
        R(41, 79, 10, 10, warm); R(41, 79 + 5, 10, 1, '#c8a060');
        const tv = .6 + Math.sin(t * 9) * .2 + Math.sin(t * 23) * .1;
        g.fillStyle = `rgba(120,170,255,${tv})`; g.fillRect(97, 109, 12, 10);
        R(41, 109, 12, 10, warm);
        glow(46, 84, 18, 'rgba(255,210,120,A)', .35); glow(103, 114, 20, 'rgba(120,170,255,A)', .3 * tv);
        R(69, 106, 10, 23, 'rgba(255,200,120,.35)');
      }
      pumpkin(64, 130, true, t); pumpkin(86, 130, true, t);
      if (night) { glow(64, 127, 9, 'rgba(255,170,40,A)', .5); glow(86, 127, 9, 'rgba(255,170,40,A)', .5); }
    },
    front(t) { F(147, 70, 15, 82, '#3e2a1a'); F(149, 70, 3, 82, '#4e3826'); F(146, 146, 17, 4, '#3e2a1a'); for (let y = 76; y < 146; y += 9) F(153 + (y % 3), y, 2, 1, '#2a1c10'); },
  };
  LOC.backyard = {
    name: 'A BACKYARD ON ORANGE GROVE AVE', roofs: [[4, 92, 30]],
    draw(t) {
      farTrees(98, '#1c2618');
      R(0, 96, W, 34, '#6a4a30'); for (let x = 0; x < W; x += 6) { R(x, 96, 1, 34, '#4e3622'); R(x + 2, 94, 2, 2, '#6a4a30'); }
      lawn(128, '#4e5a28');
      R(4, 92, 30, 38, '#5a4a3a'); R(2, 90, 34, 3, '#3a2a20'); R(14, 108, 9, 22, '#2a1e14');
      R(36, 78, 2, 72, '#3a2a20'); R(172, 78, 2, 72, '#3a2a20'); R(32, 78, 10, 2, '#3a2a20'); R(168, 78, 10, 2, '#3a2a20');
      // clothesline sag
      for (let x = 38; x < 172; x++) R(x, 80 + Math.round(Math.sin((x - 38) / 134 * Math.PI) * 4), 1, 1, '#c8c8c8');
      R(150, 132, 16, 10, '#7a4a2a'); R(148, 130, 20, 2, '#5a3220'); R(155, 136, 6, 6, '#1a0e08'); // doghouse
      R(0, 150, W, 26, '#465024'); for (let i = 0; i < 40; i++) R((i * 41) % W, 150 + (i * 7) % 26, 2, 1, '#3a4420');
    },
    glow(t) { if (E.tod !== 'day') { glow(18, 100, 14, 'rgba(255,200,120,A)', .2); } pumpkin(26, 150, true, t); if (E.tod !== 'day') glow(26, 147, 9, 'rgba(255,170,40,A)', .5); },
    front(t) {
      const w = (E.windy ? 4 : 1.5);
      [[48, 30], [86, 30], [130, 30]].forEach(([x0, wd], i) => {
        for (let r = 0; r < 34; r++) {
          const sag = Math.round(Math.sin((x0 - 38 + wd / 2) / 134 * Math.PI) * 4);
          const off = Math.round(Math.sin(t * 2.2 + i * 1.7 + r * .12) * w * (r / 34) + (E.sheetGust || 0) * (r / 34) * 10);
          F(x0 + off, 82 + sag + r, wd, 1, r % 9 === 4 ? '#d8d8d0' : '#f0eee6');
        }
        F(x0 + 4, 81, 2, 3, '#a0a0a0'); F(x0 + wd - 6, 81, 2, 3, '#a0a0a0');
      });
    },
  };
  LOC.hospital = {
    name: 'HADDONFIELD MEMORIAL HOSPITAL', roofs: [[8, 52, 176]],
    draw(t) {
      farTrees(100, '#161e16');
      R(8, 52, 176, 78, '#7e4e3e'); R(8, 50, 176, 3, '#5a5a62');
      for (let y = 54; y < 130; y += 3) R(8, y, 176, 1, '#6e4234');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) { const x = 14 + c * 17, y = 58 + r * 14; if (r === 2 && c > 3 && c < 6) continue; R(x, y, 10, 8, '#1a2228'); R(x, y + 8, 10, 1, '#5a3a30'); }
      R(80, 104, 32, 26, '#5a5a62'); R(84, 106, 24, 24, '#1e2a30'); R(95, 106, 1, 24, '#5a5a62');
      R(76, 96, 40, 7, '#2a1010');
      R(0, 130, W, 46, '#34343a'); for (let x = 10; x < W; x += 30) R(x, 140, 1, 30, '#c8c8a0'); R(0, 130, W, 2, '#8a8a82');
      // ambulance
      R(132, 116, 46, 22, '#eeeeee'); R(132, 116, 46, 2, '#d8d8d8'); R(132, 126, 46, 3, '#c82020'); R(170, 120, 8, 6, '#2a3a48'); R(150, 120, 4, 6, '#c82020'); R(148, 122, 8, 2, '#c82020');
      R(138, 136, 7, 4, '#111'); R(166, 136, 7, 4, '#111'); R(152, 113, 8, 3, '#666');
      R(20, 96, 2, 34, '#2a2a30'); R(16, 94, 10, 3, '#3a3a40');
    },
    glow(t) {
      const night = E.tod !== 'day';
      if (night) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) { if ((r * 7 + c * 3) % 4 === 0) continue; if (r === 2 && c > 3 && c < 6) continue; const fl = ((c + r) % 5 === 0 && Math.sin(t * 17 + c) > .6) ? .2 : 1; g.fillStyle = `rgba(210,240,220,${.8 * fl})`; g.fillRect(15 + c * 17, 59 + r * 14, 8, 6); }
        glow(21, 98, 30, 'rgba(230,240,200,A)', .3);
        R(84, 106, 24, 24, 'rgba(200,240,230,.5)');
      }
      // EMERGENCY sign
      const on = Math.sin(t * 7) > -.85;
      g.fillStyle = on ? '#ff2a2a' : '#5a1010'; g.fillRect(78, 97, 36, 5);
      g.fillStyle = on ? '#ffd0d0' : '#5a1010'; for (let i = 0; i < 9; i++) g.fillRect(80 + i * 4, 98, 2, 3);
      if (on) glow(96, 99, 24, 'rgba(255,40,40,A)', night ? .45 : .2);
      // ambulance light bar
      const a = Math.sin(t * 10) > 0; R(152, 113, 4, 3, a ? '#ff2020' : '#4a0a0a'); R(156, 113, 4, 3, a ? '#3a0a0a' : '#2060ff');
      if (night) glow(a ? 154 : 158, 114, 22, a ? 'rgba(255,30,30,A)' : 'rgba(40,90,255,A)', .5);
    },
    front() { },
  };
  LOC.corridor = {
    name: 'HADDONFIELD MEMORIAL — EAST WING', interior: true, roofs: [],
    draw(t) {
      const vx = 96, vy = 80;
      R(0, 0, W, H, '#7e8a78');
      g.fillStyle = '#c8ccbe'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(118, 62); g.lineTo(74, 62); g.fill();
      g.fillStyle = '#6a7064'; g.beginPath(); g.moveTo(0, H); g.lineTo(W, H); g.lineTo(118, 98); g.lineTo(74, 98); g.fill();
      g.fillStyle = '#93a08a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(74, 62); g.lineTo(74, 98); g.lineTo(0, H); g.fill();
      g.fillStyle = '#88957f'; g.beginPath(); g.moveTo(W, 0); g.lineTo(118, 62); g.lineTo(118, 98); g.lineTo(W, H); g.fill();
      // floor tiles
      g.strokeStyle = '#5c6258'; g.lineWidth = 1;
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(74 + i * 44 / 8, 98); g.lineTo(i * W / 8, H); g.stroke(); }
      for (let k = 1; k < 7; k++) { const y = 98 + Math.pow(k / 7, 2) * 78; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // doors on walls
      [[.25, 1], [.55, 1], [.25, -1], [.55, -1]].forEach(([k, side]) => {
        const x = side < 0 ? lerp(0, 74, k) : lerp(W, 118, k), w = lerp(18, 4, k) * side, top = lerp(20, 66, k), bot = lerp(150, 96, k);
        g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, top + 4 * Math.abs(w) / 18); g.lineTo(x + w, bot - 4 * Math.abs(w) / 18); g.lineTo(x, bot); g.fill();
      });
      // end window
      R(80, 64, 32, 30, '#20262a'); R(78, 62, 36, 2, '#4a4a48'); R(95, 64, 2, 30, '#4a4a48');
      g.save(); g.beginPath(); g.rect(80, 64, 32, 30); g.clip();
      const [a, b] = skyCols(); const gr = g.createLinearGradient(0, 64, 0, 94); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(80, 64, 32, 30);
      if (isRain()) for (let i = 0; i < 26; i++) R(80 + (i * 13 + t * 40) % 32, 64 + (i * 7 + t * 90) % 30, 1, 3, 'rgba(180,200,240,.8)');
      if (isSnow()) for (let i = 0; i < 20; i++) R(80 + (i * 13 + Math.sin(t + i) * 3) % 32, 64 + (i * 7 + t * 12) % 30, 1, 1, '#fff');
      if (E.fx === 'fog') R(80, 64, 32, 30, 'rgba(190,195,205,.6)');
      if (E.fx === 'fire') R(80, 84, 32, 10, '#ff7a1a');
      if (E.tod === 'night' && !isRain()) R(102, 68, 4, 4, '#f4ecd0');
      g.restore();
      R(0, 96, W, 0, '#000');
    },
    glow(t) {
      // fluorescent lights
      for (let k = 0; k < 4; k++) {
        const d = [.1, .35, .6, .8][k]; const y = lerp(4, 58, d), w = lerp(60, 12, d);
        const on = E.corridorLights > .5 && !(k === 1 && Math.sin(t * 31) > .3 && Math.sin(t * 3) > 0);
        R(96 - w / 2, y, w, Math.max(1, lerp(4, 1, d)), on ? '#f4fff0' : '#5a5e58');
        if (on) glow(96, y + 4, lerp(60, 16, d), 'rgba(220,255,230,A)', .28);
      }
      // exit sign
      R(88, 54, 16, 5, '#2a0a0a'); R(89, 55, 14, 3, Math.sin(t * 2) > -.9 ? '#ff3030' : '#601010'); glow(96, 56, 14, 'rgba(255,40,40,A)', .35);
    },
    front() { },
  };
  LOC.smithsgrove = {
    name: "SMITH'S GROVE SANITARIUM — WARREN COUNTY", roofs: [[36, 66, 16], [140, 66, 16]],
    draw(t) {
      // hill + sanitarium far away
      g.fillStyle = '#1e2a1a'; g.beginPath(); g.ellipse(96, 104, 120, 22, 0, Math.PI, 0); g.fill();
      R(64, 70, 64, 22, '#4a4448'); R(84, 62, 24, 10, '#4a4448'); g.fillStyle = '#3a3438'; g.beginPath(); g.moveTo(82, 62); g.lineTo(96, 54); g.lineTo(110, 62); g.fill();
      for (let i = 0; i < 8; i++) R(68 + i * 7, 76, 3, 4, '#141418'); for (let i = 0; i < 8; i++) R(68 + i * 7, 84, 3, 4, '#141418');
      lawn(104, '#3e4a24'); R(0, 150, W, 26, '#34401e');
      // road
      g.fillStyle = '#4a4238'; g.beginPath(); g.moveTo(88, 104); g.lineTo(104, 104); g.lineTo(150, 176); g.lineTo(42, 176); g.fill();
      for (let y = 112; y < 176; y += 10) R(95, y, 2, 4, '#6a6050');
      // fence + pillars
      for (let x = 0; x < W; x += 4) if (x < 40 || x > 150) { R(x, 96, 1, 34, '#1a1a1e'); R(x, 95, 1, 1, '#2a2a30'); }
      R(0, 100, 40, 1, '#1a1a1e'); R(152, 100, 40, 1, '#1a1a1e'); R(0, 124, 40, 1, '#1a1a1e'); R(152, 124, 40, 1, '#1a1a1e');
      [36, 140].forEach(x => { R(x, 68, 16, 64, '#6e3a2a'); for (let y = 70; y < 132; y += 4) R(x, y, 16, 1, '#5a2e22'); R(x - 2, 64, 20, 4, '#8a8478'); R(x + 4, 58, 8, 6, '#8a8478'); });
      R(37, 84, 14, 10, '#c8c0a0'); R(39, 86, 10, 1, '#3a3a3a'); R(39, 89, 8, 1, '#3a3a3a');
      // open gate
      for (let i = 0; i < 6; i++) { R(52 + i * 3, 74 + i, 1, 56 - i, '#1a1a1e'); R(139 - i * 3, 74 + i, 1, 56 - i, '#1a1a1e'); }
      R(52, 80, 16, 1, '#1a1a1e'); R(124, 80, 16, 1, '#1a1a1e');
      // station wagon
      R(116, 138, 42, 12, '#6a7a5a'); R(122, 131, 30, 8, '#5a6a4a'); R(124, 132, 12, 6, '#1a2228'); R(138, 132, 12, 6, '#1a2228'); R(116, 142, 42, 1, '#8a6a3a');
      R(120, 148, 7, 5, '#111'); R(147, 148, 7, 5, '#111');
    },
    glow(t) {
      const night = E.tod !== 'day';
      if (night) { for (let i = 0; i < 8; i++) if ((i * 5) % 3) R(68 + i * 7, 76, 3, 4, '#e8e0a0'); glow(96, 80, 30, 'rgba(230,220,150,A)', .15); }
      R(155, 140, 3, 3, '#ffe8a0'); if (night) glow(160, 141, 26, 'rgba(255,240,180,A)', .5);
    },
    front() { },
  };
  LOC.cemetery = {
    name: 'HADDONFIELD CEMETERY — JUDITH MYERS', roofs: [],
    draw(t) {
      farTrees(104, '#141c14');
      g.fillStyle = '#3a4426'; g.beginPath(); g.ellipse(96, 150, 160, 50, 0, Math.PI, 0); g.fill(); R(0, 150, W, 26, '#323c22');
      for (let i = 0; i < 50; i++) R((i * 31) % W, 110 + (i * 11) % 60, 2, 1, i % 2 ? '#2a341c' : '#6a4a1a');
      bareTree(28, 150, 80, E.sway);
      [[60, 120, 6, 9], [130, 118, 6, 10], [160, 124, 8, 10], [76, 124, 7, 8], [112, 122, 5, 8], [176, 116, 5, 8]].forEach(([x, y, w, h]) => { R(x, y - h, w, h, '#7a7a80'); R(x, y - h, w, 1, '#9a9aa0'); R(x + 1, y - h - 1, w - 2, 1, '#7a7a80'); });
      // Judith's empty grave (stone missing)
      R(88, 140, 16, 4, '#3a2412'); R(90, 136, 12, 4, '#4a2e16');
      R(0, 132, W, 1, '#1a1a1a'); for (let x = 0; x < W; x += 5) R(x, 128, 1, 8, '#1a1a1a');
    },
    glow(t) { if (E.tod !== 'day') glow(96, 140, 30, 'rgba(120,160,255,A)', .08); },
    front(t) {
      [[100, 162, 12, 18], [150, 166, 10, 16], [20, 168, 14, 20], [62, 158, 9, 12]].forEach(([x, y, w, h]) => {
        F(x, y - h, w, h, '#8a8a90'); F(x + 1, y - h - 2, w - 2, 2, '#8a8a90'); F(x + 2, y - h - 3, w - 4, 1, '#8a8a90'); F(x, y - h, 1, h, '#6a6a70');
        F(x + 3, y - h + 4, w - 6, 1, '#5a5a60'); F(x + 3, y - h + 7, w - 6, 1, '#5a5a60');
      });
    },
  };

  /* ================= weather front layers ================= */
  function updWeather(dt, t) {
    E.sway = Math.sin(t * 1.3) * (E.windy ? 3 : 1) + (E.fx === 'tornado' ? Math.sin(t * 5) * 3 : 0);
    const slant = Math.min(1.2, (E.wind || 0) / 25);
    drops.forEach(d => { d.y += d.v * dt; d.x += d.v * slant * .35 * dt; if (d.y > H) { if (Math.random() < .35) splashes.push({ x: d.x, y: rnd(150, 176), a: .25 }); d.y = rnd(-20, 0); d.x = rnd(-40, W); } });
    flakes.forEach(f => { f.y += f.v * dt; f.x += Math.sin(t + f.p) * 8 * dt + slant * 15 * dt; if (f.y > H) { f.y = -4; f.x = rnd(-10, W); } if (f.x > W) f.x = 0; });
    pellets.forEach(p => { p.vy += 300 * dt; p.y += p.vy * dt; p.x += p.vx * dt; if (p.y > p.gy && p.vy > 0) { if (p.b < 2) { p.vy *= -.35; p.vx = rnd(-20, 20); p.b++; p.y = p.gy; } else { p.y = rnd(-40, 0); p.x = rnd(0, W); p.vy = rnd(140, 200); p.vx = 0; p.b = 0; } } });
    splashes.forEach(s => s.a -= dt); splashes = splashes.filter(s => s.a > 0);
    leaves.forEach((l, i) => { l.y += l.v * dt * (E.fx === 'tornado' ? .3 : 1); l.x += (Math.sin(t * 2 + l.p) * 12 + (E.windy ? 70 : 6) + (E.fx === 'tornado' ? 120 : 0)) * dt; if (l.y > H || l.x > W + 10) leaves[i] = newLeaf(false); });
    embers.forEach(e => { e.y -= e.v * dt; e.x += Math.sin(t * 3 + e.p) * 10 * dt; if (e.y < -4) { e.y = H + 2; e.x = rnd(0, W); } });
    streaks.forEach(s => { s.x += s.v * dt; if (s.x > W + 30) { s.x = -30; s.y = rnd(0, 150); } });
    bats.forEach(b => { b.x += b.v * dt; b.y += Math.sin(t * 3 + b.p) * 6 * dt; if (b.x > W + 20) { b.x = rnd(-140, -20); b.y = rnd(15, 60); } });
    fogBands.forEach(f => { f.x += f.v * dt; if (f.x > W + 20) f.x = -f.w; if (f.x < -f.w - 20) f.x = W; });
    debris.forEach(d => d.a += d.sp * dt);
    // lightning
    if (['thunder', 'tornado'].includes(E.fx) || (E.fx === 'heavyrain' && Math.random() < .002)) {
      nextBolt -= dt;
      if (nextBolt <= 0) { strike(); nextBolt = E.fx === 'thunder' ? rnd(4, 11) : rnd(8, 18); }
    }
    if (bolt) { bolt.a -= dt * 3; if (bolt.a <= 0) bolt = null; }
    E.flash = Math.max(0, E.flash - dt * 2.2);
    E.shake = Math.max(0, E.shake - dt * 6);
    E.red = Math.max(0, E.red - dt * 1.5);
    if (crow) { crow.x += 40 * dt; crow.y -= 6 * dt; if (crow.x > W + 20) crow = null; }
  }
  function strike() {
    const x0 = rnd(30, W - 30); const pts = [[x0, 10]]; let x = x0, y = 10;
    while (y < 130) { y += rnd(6, 14); x += rnd(-10, 10); pts.push([x, y]); }
    bolt = { pts, a: 1, br: Math.floor(rnd(2, pts.length - 2)) };
    E.flash = 1; E.shake = 3;
    SFX.thunder(rnd(.2, 1.1));
  }
  function drawBolt() {
    if (!bolt) return;
    g.save(); g.globalAlpha = Math.max(0, bolt.a);
    const line = (pts, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };
    line(bolt.pts, 'rgba(180,200,255,.5)', 4); line(bolt.pts, '#ffffff', 1.5);
    const b = bolt.pts[bolt.br]; line([b, [b[0] + 14, b[1] + 12], [b[0] + 20, b[1] + 26]], '#e0e8ff', 1);
    g.restore();
  }
  function drawTornado(t) {
    const tx = 96 + Math.sin(t * .23) * 50;
    // wall cloud
    g.fillStyle = '#1a2214'; g.fillRect(0, 0, W, 22); for (let x = 0; x < W; x += 10) { g.beginPath(); g.arc(x, 22 + Math.sin(x * .3 + t) * 3, 9, 0, 7); g.fill(); }
    for (let y = 24; y < 140; y++) {
      const k = (y - 24) / 116; const w = lerp(34, 4, Math.pow(k, .7)); const off = Math.sin(y * .09 + t * 3) * 5 * k + Math.sin(t * 1.3) * 6 * k;
      const band = Math.sin(y * .5 - t * 14) > 0;
      g.fillStyle = band ? 'rgba(70,72,60,.92)' : 'rgba(110,108,90,.9)';
      g.fillRect(tx - w / 2 + off, y, w, 1);
    }
    // dust at base
    for (let i = 0; i < 18; i++) { const a = t * 3 + i; g.fillStyle = 'rgba(120,100,70,.5)'; g.beginPath(); g.arc(tx + Math.cos(a) * (14 + i % 5 * 3), 138 + Math.sin(a) * 3, 3 + i % 3, 0, 7); g.fill(); }
    // debris
    debris.forEach(d => {
      const x = tx + Math.cos(d.a) * d.r, y = 135 - d.h - Math.sin(d.a * 2) * 6;
      if (d.k === 0) pumpkin(Math.round(x), Math.round(y), false, t);
      else if (d.k === 1) R(x, y, 8, 2, '#8a6a4a');
      else if (d.k === 2) R(x, y, 3, 3, '#e8e4d8');
      else if (d.k === 3) R(x, y, 4, 2, '#5a3a2a');
      else R(x, y, 2, 2, '#c8601a');
    });
    E.tornadoX = tx;
  }
  function drawFire(t) {
    // burning horizon + ground flames
    for (let x = 0; x < W; x += 3) {
      const h = 10 + Math.abs(Math.sin(x * .3 + t * 6)) * 14 + Math.sin(x * 1.7 + t * 11) * 4;
      g.fillStyle = '#a8200a'; g.fillRect(x, 120 - h, 3, h);
      g.fillStyle = '#ff6a1a'; g.fillRect(x, 120 - h * .7, 3, h * .7);
      g.fillStyle = '#ffd040'; g.fillRect(x + 1, 120 - h * .35, 1, h * .35);
    }
    g.fillStyle = 'rgba(30,10,8,.6)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i * 47 + t * 8) % (W + 60) - 30, 70 - i * 6, 22, 0, 7); g.fill(); }
  }
  function drawFireFront(t) {
    for (let x = 0; x < W; x += 2) {
      const h = 6 + Math.abs(Math.sin(x * .41 + t * 7)) * 10 + Math.sin(x * 2.3 + t * 13) * 3;
      g.fillStyle = 'rgba(255,90,20,.85)'; g.fillRect(x, H - h, 2, h);
      g.fillStyle = 'rgba(255,220,80,.9)'; g.fillRect(x, H - h * .45, 2, h * .45);
    }
    embers.forEach(e => R(Math.round(e.x), Math.round(e.y), 1, 1, Math.sin(e.p + E.t * 8) > 0 ? '#ffd040' : '#ff5a1a'));
    g.fillStyle = `rgba(255,60,0,${.08 + Math.sin(t * 9) * .04})`; g.fillRect(0, 0, W, H);
  }
  function drawWeatherFront(t, loc) {
    if (loc.interior) return;
    const nightRain = E.tod === 'night' ? 'rgba(150,170,210,.55)' : 'rgba(200,215,240,.7)';
    g.fillStyle = nightRain;
    const slant = Math.min(1.2, (E.wind || 0) / 25) * .35;
    drops.forEach(d => { for (let i = 0; i < d.l; i++) g.fillRect(Math.round(d.x - slant * i * 2), Math.round(d.y - i), 1, 1); });
    splashes.forEach(s => { g.fillStyle = `rgba(200,215,240,${s.a * 2})`; g.fillRect(s.x - 1, s.y, 1, 1); g.fillRect(s.x + 1, s.y, 1, 1); g.fillRect(s.x, s.y - 1, 1, 1); });
    flakes.forEach(f => R(Math.round(f.x), Math.round(f.y), f.s, f.s, '#f6f8ff'));
    pellets.forEach(p => R(Math.round(p.x), Math.round(p.y), 2, 2, E.fx === 'hail' ? '#f0f4ff' : '#d0dcf0'));
    leaves.forEach(l => { const fl = Math.sin(E.t * 5 + l.p) > 0; R(Math.round(l.x), Math.round(l.y), fl ? 2 : 1, fl ? 1 : 2, l.c); });
    g.fillStyle = 'rgba(255,255,255,.35)'; streaks.forEach(s => g.fillRect(Math.round(s.x), Math.round(s.y), s.l, 1));
    if (E.fx === 'fog' || E.fx === 'cold' || GREY.includes(E.fx)) {
      const col = E.tod === 'night' ? '120,125,140' : '205,208,214';
      const amt = E.fx === 'fog' ? .38 : .12;
      fogBands.forEach(f => { const gr = g.createLinearGradient(f.x, 0, f.x + f.w, 0); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.5, `rgba(${col},${amt})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(f.x, f.y - 8, f.w, 22); });
      if (E.fx === 'fog') { g.fillStyle = `rgba(${col},.28)`; g.fillRect(0, 0, W, H); }
    }
    if (E.fx === 'fire') drawFireFront(t);
  }
  function drawSnowCaps(loc) {
    if (!(isSnow() || E.cold)) return;
    loc.roofs.forEach(([x, y, w]) => {
      if (isSnow()) R(x, y - 1, w, 2, '#f2f6ff');
      if (E.cold) for (let i = 2; i < w; i += 5) { const h = 2 + ((i * 7) % 5); R(x + i, y + 1, 1, h, 'rgba(210,235,255,.95)'); if (Math.sin(E.t * 2 + i) > .97) R(x + i, y + 1 + h + 2, 1, 1, '#cfe8ff'); }
    });
    if (isSnow() && !loc.interior) { g.fillStyle = 'rgba(236,242,255,.65)'; g.fillRect(0, 128, W, 22); g.fillStyle = 'rgba(236,242,255,.4)'; g.fillRect(0, 150, W, 26); }
  }
  function drawFrost() {
    if (!E.cold && !isSnow()) return;
    frost.forEach(([x, y, k]) => { g.fillStyle = `rgba(215,235,255,${.35 + k * .5})`; g.fillRect(x, y, 1, 1); });
    g.fillStyle = 'rgba(140,180,255,.07)'; g.fillRect(0, 0, W, H);
  }
  function heatShimmer(t) {
    if (!(E.heat || E.fx === 'heat' || E.fx === 'fire')) return;
    for (let y = 96; y < H; y += 2) { const o = Math.round(Math.sin(y * .35 + t * 6) * 1.2); if (o) g.drawImage(cv, 0, y, W, 2, o, y, W, 2); }
    if (E.fx === 'heat') { g.fillStyle = 'rgba(255,140,40,.08)'; g.fillRect(0, 0, W, H); }
  }

  /* ================= actor rendering ================= */
  let A = null, lastBox = null, lastStepIdx = 0;
  function drawActor(a) {
    if (!a) { lastBox = null; return; }
    const night = darkness();
    const s = a.s || 1;
    const spr = SPR.draw(a.id, { ...a, t: E.t, dark: a.lit ? 0 : Math.max(0, night * .7 - (a.light || 0)) + (a.dark || 0) });
    g.save();
    if (a.clip) { g.beginPath(); g.rect(...a.clip); g.clip(); }
    g.globalAlpha = a.alpha ?? 1;
    if (a.rot) { g.translate(a.x, a.y); g.rotate(a.rot); g.drawImage(spr, -32 * s, -60 * s, 64 * s, 64 * s); }
    else g.drawImage(spr, Math.round(a.x - 32 * s), Math.round(a.y - 60 * s), Math.round(64 * s), Math.round(64 * s));
    g.restore();
    const hgt = (CAST[a.id].kid ? 24 : 32) * s;
    lastBox = a.rot ? { x: a.x - hgt, y: a.y - 8 * s, w: hgt + 8, h: 14 * s, id: a.id } : { x: a.x - 8 * s, y: a.y - hgt, w: 16 * s, h: hgt, id: a.id };
    // breath in the cold
    if (E.cold && !a.rot && (E.t % 2.4) < 1.2 && (a.alpha ?? 1) > .5) {
      const k = (E.t % 2.4) / 1.2, hx = a.x + (a.front ? 0 : (a.facing || 1) * 5 * s), hy = a.y - (CAST[a.id].kid ? 20 : 26) * s;
      g.fillStyle = `rgba(230,240,255,${.5 * (1 - k)})`; g.beginPath(); g.arc(hx + (a.front ? 0 : (a.facing || 1)) * k * 8, hy - k * 4, 2 + k * 4, 0, 7); g.fill();
    }
    // footsteps
    if (a.walk) { const idx = Math.floor((a.phase || 0) / Math.PI); if (idx !== lastStepIdx) { lastStepIdx = idx; if (s >= 1.2) SFX.step(); } }
  }

  /* ================= DIRECTOR (exactly one character on screen) ================= */
  let queue = [], shot = null, st = 0, cut = 0, summonNext = null, seqCount = 0;
  const HOMES = {
    laurie: ['lampkin', 'doyle', 'backyard'], laurie2: ['hospital', 'corridor'], loomis: ['lampkin', 'cemetery', 'smithsgrove', 'hospital'],
    annie: ['doyle', 'backyard', 'lampkin'], lynda: ['lampkin', 'backyard'], bob: ['backyard', 'lampkin'], brackett: ['lampkin', 'cemetery', 'doyle'],
    tommy: ['doyle', 'lampkin'], lindsey: ['doyle', 'backyard'], marion: ['smithsgrove'], jimmy: ['hospital', 'corridor'], budd: ['hospital'],
    garrett: ['hospital', 'corridor'], alves: ['corridor', 'hospital'], karen: ['corridor', 'hospital'], ben: ['lampkin', 'doyle'],
  };
  const OUTDOOR = ['lampkin', 'doyle', 'backyard', 'hospital', 'smithsgrove', 'cemetery'];
  let bag = [];
  function nextCast() { if (!bag.length) bag = Object.keys(HOMES).sort(() => Math.random() - .5); return bag.pop(); }
  const say = (id, text, name) => Scene.onSay && Scene.onSay(id, text, name);
  const dur = s => 1.4 + (s || '').length * 0.034;

  function S(loc, d, act, ev = [], extra = {}) { return { loc, d, act, ev, ...extra }; }

  function seqReport(id, locArg) {
    const loc = locArg || pick(HOMES[id]); const c = CAST[id];
    const q = HWT.quote(id), r = HWT.report(id);
    const dir = Math.random() < .5 ? 1 : -1, s = 2, fy = loc === 'corridor' ? 174 : 172;
    const x0 = dir > 0 ? -24 : W + 24, xm = 96 + rnd(-14, 14), x1 = dir > 0 ? W + 26 : -26;
    let prop; if (isRain() && !c.kid && id !== 'loomis' && loc !== 'corridor') prop = 'umbrella';
    const tq = 2.8, tr = tq + dur(q), tend = tr + dur(r) + .6, D = tend + 2.6;
    return [S(loc, D, t => {
      if (t < 2.8) return { id, x: lerp(x0, xm, t / 2.8), y: fy, s, facing: dir, walk: 1, phase: t * 8, prop };
      if (t < tend) return { id, x: xm, y: fy, s, front: true, blink: (t % 3.3) < .13, talk: Scene.talking && Scene.talking() && Math.floor(t * 9) % 2, prop };
      return { id, x: lerp(xm, x1, (t - tend) / 2.6), y: fy, s, facing: dir, walk: 1, phase: t * 8, prop };
    }, [[tq, () => say(id, q)], [tr, () => say(id, r)]])];
  }

  /* ---------- Michael solo scenes ---------- */
  const M = {};
  M.hedge = (short) => [S('lampkin', short ? 5 : 10, t => {
    const rise = ease((t - 1.2) / 2.2), sink = ease((t - (short ? 4.2 : 8.4)) / 1.2);
    const y = lerp(164, 141, rise) + (sink * 23);
    return { id: 'michael', x: 166, y, s: 1.1, front: true, back: true, tilt: t > 5 && t < 8 ? ease((t - 5) / 1) * .6 : 0, clip: [0, 0, W, 150], prop: 'knife' };
  }, [[1.4, () => SFX.breath()], [short ? 0 : 1.6, () => say('michael', HWT.narr('hedge'))], [5, () => SFX.breath()]])];
  M.tree = () => [S('doyle', 10, t => {
    const out = ease((t - 1.5) / 1.5) - ease((t - 5) / 1) + ease((t - 7) / 1) * 0;
    const x = 154 + out * 9;
    return { id: 'michael', x, y: 148, s: 1, front: true, back: true, tilt: out > .9 ? .3 : 0 };
  }, [[1.5, () => SFX.breath()], [2, () => say('michael', HWT.narr('tree'))], [6.5, () => SFX.creak()]])];
  M.lamp = () => {
    const flick = t => (t < 1.5 ? (Math.sin(t * 40) > 0 ? 1 : 0) : t < 6 ? 1 : t < 7 ? (Math.sin(t * 50) > .2 ? 1 : 0) : 1);
    return [S('lampkin', 9, t => {
      E.lamp = E.tod === 'day' ? 1 : flick(t);
      const vis = t < 7 && (E.lamp > .5 || E.tod === 'day');
      if (!vis) return null;
      return { id: 'michael', x: 40, y: 170, s: 2, front: true, tilt: t > 3.2 ? ease((t - 3.2) / 1.6) * .7 : 0, light: E.tod === 'day' ? 0 : .4, prop: 'knife', glint: t > 5 && t < 5.4 };
    }, [[.2, () => SFX.stat()], [2, () => SFX.breath()], [2.2, () => say('michael', HWT.narr('lamp'))], [5, () => SFX.shing()], [7, () => { E.lamp = 1; }]], { onEnd: () => E.lamp = 1 })];
  };
  M.approach = () => {
    const loc = E.fx === 'fog' ? pick(['lampkin', 'smithsgrove', 'cemetery']) : pick(OUTDOOR);
    return [S(loc, 9.4, t => {
      const k = Math.pow(t / 9.2, 1.6);
      return { id: 'michael', x: 96, y: lerp(132, 290, k), s: lerp(.6, 5.2, k), front: true, walk: 1, phase: t * 3.2, prop: 'knife', light: k * .4, glint: (t % 3) < .2 };
    }, [[.5, () => say('michael', HWT.narr('approach'))], [1, () => SFX.breath()], [4, () => SFX.breath()], [7, () => SFX.heartbeat()], [7.8, () => SFX.heartbeat()], [8.6, () => { SFX.stinger(); E.red = 1; E.shake = 4; }]])];
  };
  M.window = () => [S('lampkin', 8, t => {
    if (t < 1 || t > 6.4) return null;
    return { id: 'michael', x: 91, y: 106, s: .55, front: true, back: true, clip: [86, 80, 10, 12], light: .2, alpha: Math.min(1, (t - 1)) };
  }, [[1, () => SFX.creak()], [1.5, () => say('michael', HWT.narr('window'))], [3, () => SFX.breath()]])];
  M.sheet = () => [S('doyle', 10, t => {
    const k = ease((t - 1) / 4);
    return { id: 'michael', sheet: true, x: lerp(74, 104, k), y: lerp(129, 170, k), s: lerp(1, 2, k), front: true, phase: t * 2, tilt: t > 6 ? ease((t - 6) / 1.5) * .5 : 0, back: k < .1 };
  }, [[.6, () => SFX.creak()], [2, () => say('lynda', HWT.sheetLine(), 'LYNDA (O.S.)')], [6.5, () => SFX.breath()], [8.6, () => SFX.stinger()]])];
  M.clothes = () => [S('backyard', 10, t => {
    E.sheetGust = t > 6 && t < 7.5 ? Math.sin((t - 6) / 1.5 * Math.PI) * 1.6 : 0;
    if (t < 2 || t > 6.8) return null;
    return { id: 'michael', x: 122, y: 140, s: 1.15, front: true, back: true };
  }, [[2, () => SFX.whoosh()], [2.4, () => say('michael', HWT.narr('sheets'))], [3, () => SFX.breath()]], { onEnd: () => E.sheetGust = 0 })];
  M.gone = () => [
    S('lampkin', 5, t => ({ id: 'michael', x: 120, y: 142, s: 1.3, rot: -Math.PI / 2, front: true }), [[.4, () => say('loomis', HWT.goneLine(1), 'DR. LOOMIS (O.S.)')]]),
    S('lampkin', 5.5, t => ({ id: 'michael', x: 120, y: 142, s: 1.3, rot: -Math.PI / 2, front: true, silhouette: 1, alpha: .25 }), [[.2, () => SFX.stinger()], [.6, () => say('loomis', HWT.goneLine(2), 'DR. LOOMIS (O.S.)')]], { ghost: true }),
  ];
  M.situp = () => [S(pick(['lampkin', 'doyle', 'corridor']), 8, t => {
    const k = ease((t - 3.4) / .9);
    const loc = shot && shot.loc; const y = loc === 'corridor' ? 150 : 146;
    return { id: 'michael', x: 112, y, s: 1.4, rot: lerp(-Math.PI / 2, 0, k), front: true, prop: 'knife', tilt: k > .9 ? .2 : 0 };
  }, [[.5, () => say('michael', HWT.narr('situp'))], [3.4, () => { SFX.stinger(); E.shake = 3; }]])];
  M.corridor = (blind) => [S('corridor', 10, t => {
    const k = t / 10; E.corridorLights = (Math.sin(t * 5) > .85 || (t > 6 && t < 6.5)) ? 0 : 1;
    if (E.corridorLights < .5) return null;
    return { id: 'michael', x: 96, y: lerp(98, 196, k), s: lerp(.5, 2.8, k), front: true, walk: 1, phase: t * 3, prop: 'knife', blind, pose: blind && Math.sin(t * 2) > .6 ? 'raise' : null, light: .3 };
  }, [[.4, () => say('michael', HWT.narr(blind ? 'blind' : 'corridor'))], [2, () => SFX.breath()], [6, () => SFX.stat()], [8, () => SFX.heartbeat()]], { onEnd: () => E.corridorLights = 1 })];
  M.cemetery = () => [S('cemetery', 9, t => {
    if (t > 7.5) return null;
    return { id: 'michael', x: 132, y: 128, s: .9, front: true, back: true, prop: 'headstone', alpha: Math.min(1, t) };
  }, [[.6, () => { SFX.caw(); crow = { x: 30, y: 72 }; }], [1, () => say('michael', HWT.narr('cemetery'))], [4, () => SFX.breath()]])];
  M.glint = () => [S(pick(['lampkin', 'doyle', 'backyard']), 7.5, t => ({ id: 'michael', x: 70, y: 168, s: 1.8, front: true, prop: 'knife', dark: E.flash > .3 ? 0 : .55, glint: Math.sin(t * 3) > .7, light: 0 }),
    [[.3, () => say('michael', HWT.narr('glint'))], [2, () => SFX.shing()], [5, () => { E.flash = 1; SFX.thunder(.2); }]])];
  M.burn = () => [S(E.fx === 'fire' ? pick(OUTDOOR) : 'hospital', 10, t => ({ id: 'michael', x: lerp(-20, 210, t / 10), y: 170, s: 2, facing: 1, walk: 1, phase: t * 3.5, burning: true, prop: 'knife', light: .5 }),
    [[.4, () => say('michael', HWT.narr('burn'))], [1, () => SFX.setAmbient({ fire: 1 })], [9.5, () => Scene.refreshAmbient && Scene.refreshAmbient()]])];
  M.tilt = () => [S(pick(['backyard', 'doyle', 'lampkin']), 8, t => ({ id: 'michael', x: 96, y: 170, s: 2, front: true, tilt: Math.min(.8, ease((t - 2) / 2.5) * .8), prop: 'knife' }),
    [[.5, () => say('michael', HWT.narr('tilt'))], [2, () => SFX.breath()], [6.5, () => SFX.heartbeat()]])];

  /* ---------- multi-shot chases (cuts keep one character per shot) ---------- */
  const SEQ = {};
  SEQ.stalk = () => {
    const lr = HWT.report('laurie');
    return [
      S('lampkin', 2 + dur(lr) + 1.4, t => ({ id: 'laurie', x: lerp(W + 24, -24, t / (2 + dur(lr) + 1.4)), y: 172, s: 2, facing: -1, walk: 1, phase: t * 8 }), [[.4, () => say('laurie', lr)]]),
      ...M.hedge(true),
      S('lampkin', 3.6, t => ({ id: 'laurie', x: 92, y: 172, s: 2, front: true, blink: (t % 2) < .1, talk: Scene.talking() && Math.floor(t * 9) % 2 }), [[.3, () => say('laurie', HWT.line('laurie_hedge'))]]),
      S('lampkin', 3, t => null, [[.3, () => { SFX.whoosh(); say('michael', HWT.narr('nobody')); }]], { ghost: true }),
    ];
  };
  SEQ.doorChase = () => [
    S('doyle', 2.6, t => ({ id: 'laurie', x: lerp(-24, W + 24, t / 2.6), y: 172, s: 2, facing: 1, walk: 2, phase: t * 14 }), [[.2, () => { SFX.scream(); say('laurie', HWT.line('laurie_help')); }]]),
    S('lampkin', 4, t => ({ id: 'michael', x: lerp(-24, 130, t / 4), y: 172, s: 2, facing: 1, walk: 1, phase: t * 3.3, prop: 'knife' }), [[.3, () => SFX.breath()]]),
    S('doyle', 3.8, t => ({ id: 'laurie', x: 63, y: 130, s: 1, facing: 1, pose: 'pound', phase: t * 6, back: true }), [[.2, () => { SFX.knock(); say('laurie', HWT.line('laurie_door')); }], [1.6, () => SFX.knock()]]),
    S('doyle', 3.4, t => ({ id: 'michael', x: lerp(190, 112, t / 3.4), y: lerp(160, 140, t / 3.4), s: lerp(1.6, 1.2, t / 3.4), facing: -1, walk: 1, phase: t * 3.3, prop: 'knife' }), [[.5, () => SFX.heartbeat()], [1.4, () => SFX.heartbeat()], [3, () => SFX.stinger()]]),
    S('doyle', 3, t => null, [[.2, () => { SFX.creak(); say('michael', HWT.narr('inside')); }]], { ghost: true }),
  ];
  SEQ.hospitalChase = () => [
    S('corridor', 4.2, t => ({ id: 'laurie2', x: 96, y: lerp(104, 200, t / 4.2), s: lerp(.6, 2.8, t / 4.2), front: true, walk: 1, phase: t * 7 }), [[.3, () => say('laurie2', HWT.line('laurie2_run'))]]),
    ...M.corridor(Math.random() < .3).map(s => ({ ...s, d: 4.5 })),
    S('hospital', 3.6, t => ({ id: 'laurie2', x: lerp(10, 150, t / 3.6), y: 168, s: 2, facing: 1, walk: 2, phase: t * 11 }), [[.3, () => say('laurie2', HWT.line('laurie2_lot'))]]),
    S('hospital', 4, t => ({ id: 'michael', x: 96, y: lerp(130, 160, t / 4), s: lerp(1, 1.6, t / 4), front: true, walk: 1, phase: t * 3, prop: 'knife' }), [[.1, () => SFX.glass()], [1.2, () => SFX.breath()]]),
    S('hospital', 3.4, t => null, [[.3, () => { say('jimmy', HWT.line('horn'), 'NARRATOR'); hornLoop(); }]], { ghost: true }),
  ];
  function hornLoop() { let n = 0; const iv = setInterval(() => { if (++n > 5) return clearInterval(iv); SFX_horn(); }, 450); }
  function SFX_horn() { SFX.horn(); }
  SEQ.smithsGrove = () => {
    const mr = HWT.report('marion');
    return [
      S('smithsgrove', 2.6 + dur(mr) + 1, t => ({ id: 'marion', x: lerp(-24, 80, Math.min(1, t / 2.6)), y: 172, s: 2, facing: 1, walk: t < 2.6 ? 1 : 0, phase: t * 7, front: t >= 2.6, prop: 'umbrella', talk: t > 2.6 && Scene.talking() && Math.floor(t * 9) % 2 }), [[2.6, () => say('marion', mr)]]),
      S('smithsgrove', 4.6, t => ({ id: 'michael', x: 140, y: 150, s: 1.3, front: t > 2, facing: -1, phase: 0, tilt: t > 3 ? .3 : 0 }), [[.4, () => SFX.breath()], [.6, () => say('michael', HWT.narr('smiths'))]]),
      S('smithsgrove', 4.6, t => ({ id: 'loomis', x: 96, y: 172, s: 2, front: true, talk: Scene.talking() && Math.floor(t * 9) % 2, blink: (t % 3) < .1 }), [[.2, () => say('loomis', HWT.line('loomis_gone'))]]),
    ];
  };
  SEQ.loomisHunt = () => {
    const lr = HWT.report('loomis');
    return [
      S('lampkin', 2.6 + dur(lr) + .8, t => ({ id: 'loomis', x: lerp(-24, 70, Math.min(1, t / 2.6)), y: 172, s: 2, facing: 1, walk: t < 2.6 ? 1 : 0, phase: t * 7, prop: 'revolver', talk: t > 2.6 && Scene.talking() && Math.floor(t * 9) % 2 }), [[2.6, () => say('loomis', lr)]]),
      ...M.window(),
      S('lampkin', 4, t => ({ id: 'loomis', x: 96, y: 172, s: 2, front: true, prop: 'revolver', pose: 'hold', talk: Scene.talking() && Math.floor(t * 9) % 2 }), [[.2, () => say('loomis', HWT.line('loomis_evil'))]]),
    ];
  };
  SEQ.nurses = () => [...seqReport('alves', 'corridor'), ...M.corridor(false).map(s => ({ ...s, d: 6 })), ...seqReport(pick(['karen', 'budd', 'jimmy', 'garrett']), 'hospital')];

  function michaelPick() {
    const opts = ['hedge', 'tree', 'lamp', 'approach', 'window', 'sheet', 'clothes', 'gone', 'situp', 'corridor', 'cemetery', 'glint', 'tilt', 'burn'];
    let w = opts.map(o => 1);
    if (E.fx === 'fog') w[opts.indexOf('approach')] = 4;
    if (E.fx === 'fire') w[opts.indexOf('burn')] = 5; else w[opts.indexOf('burn')] = .35;
    if (['thunder', 'tornado', 'heavyrain'].includes(E.fx)) w[opts.indexOf('glint')] = 3;
    if (E.tod === 'day') w[opts.indexOf('lamp')] = .3;
    const sum = w.reduce((a, b) => a + b); let r = Math.random() * sum;
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i]; }
    return 'hedge';
  }
  let lastM = '';
  function buildNext() {
    seqCount++;
    if (summonNext) { const id = summonNext; summonNext = null; return id === 'michael' ? M[pick(['hedge', 'approach', 'tilt', 'lamp'])]() : seqReport(id); }
    const pattern = ['report', 'michael', 'report', 'event', 'report', 'michael', 'report', 'event'];
    const k = pattern[seqCount % pattern.length];
    if (k === 'report') return seqReport(nextCast());
    if (k === 'michael') { let m; do { m = michaelPick(); } while (m === lastM); lastM = m; return M[m](); }
    const ev = pick(['stalk', 'doorChase', 'hospitalChase', 'smithsGrove', 'loomisHunt', 'nurses']);
    return SEQ[ev]();
  }
  function startShot(s) {
    if (shot && shot.onEnd) shot.onEnd();
    shot = s; st = 0; shot.ev = (shot.ev || []).map(e => [...e]); cut = .28; SFX.stat();
    Scene.onLoc && Scene.onLoc(LOC[s.loc].name);
  }
  function stepDirector(dt) {
    if (!shot || st >= shot.d) { if (!queue.length) queue = buildNext(); startShot(queue.shift()); }
    st += dt;
    shot.ev.forEach(e => { if (!e[2] && st >= e[0]) { e[2] = 1; try { e[1](); } catch (err) { console.warn(err); } } });
    A = shot.act(st);
  }

  /* ================= main render ================= */
  let last = 0, running = false;
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; E.t += dt;
    const t = E.t;
    updWeather(dt, t);
    stepDirector(dt);
    const loc = LOC[shot.loc];
    g.save();
    if (E.shake > .1) g.translate(Math.round(rnd(-E.shake, E.shake)), Math.round(rnd(-E.shake, E.shake)));
    if (loc.interior) { loc.draw(t); }
    else {
      drawSky(t);
      if (E.tod === 'night' && !isRain() && E.fx !== 'fire') bats.forEach(b => { const up = Math.sin(t * 14 + b.p) > 0; R(Math.round(b.x) - 3, Math.round(b.y) + (up ? -1 : 1), 2, 1, '#0a0a0a'); R(Math.round(b.x) + 2, Math.round(b.y) + (up ? -1 : 1), 2, 1, '#0a0a0a'); R(Math.round(b.x) - 1, Math.round(b.y), 3, 2, '#0a0a0a'); });
      if (crow) { R(crow.x, crow.y, 4, 2, '#0a0a0a'); R(crow.x - 2 + (Math.sin(t * 16) > 0 ? 0 : 1), crow.y - 1, 2, 1, '#0a0a0a'); R(crow.x + 4, crow.y, 1, 1, '#c8a020'); }
      drawClouds(t, dt);
      if (E.fx === 'fire') drawFire(t);
      drawBolt();
      loc.draw(t);
      if (E.fx === 'tornado') drawTornado(t);
    }
    drawSnowCaps(loc);
    // front layer (foreground scenery)
    fg.clearRect(0, 0, W, H); loc.front(t);
    const d = darkness();
    if (d > 0) { fg.globalCompositeOperation = 'source-atop'; fg.fillStyle = `rgba(6,8,26,${d})`; fg.fillRect(0, 0, W, H); fg.globalCompositeOperation = 'source-over'; }
    // darkness over backdrop
    if (d > 0) { g.fillStyle = `rgba(6,8,26,${d})`; g.fillRect(0, 0, W, H); }
    loc.glow(t);
    if (A && A.back) { drawActor(A); g.drawImage(fl, 0, 0); }
    else { g.drawImage(fl, 0, 0); drawActor(A); }
    drawWeatherFront(t, loc);
    heatShimmer(t);
    drawFrost();
    if (E.flash > 0) { g.fillStyle = `rgba(235,240,255,${E.flash * .55})`; g.fillRect(0, 0, W, H); }
    if (E.red > 0) { g.fillStyle = `rgba(200,0,0,${E.red * .35})`; g.fillRect(0, 0, W, H); }
    if (cut > 0) { cut -= dt; for (let i = 0; i < 500; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 2, 1); } g.fillStyle = `rgba(0,0,0,${cut * 1.2})`; g.fillRect(0, 0, W, H); const ty = (t * 300) % H; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, ty, W, 3); }
    g.restore();
    requestAnimationFrame(frame);
  }

  const Scene = {
    E, LOC,
    init(canvas) {
      cv = canvas; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      fl = document.createElement('canvas'); fl.width = W; fl.height = H; fg = fl.getContext('2d');
      rebuild();
    },
    start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); },
    stop() { running = false; },
    setWeather(w) {
      const changed = w.fx !== E.fx || w.windy !== E.windy || w.cold !== E.cold || w.tod !== E.tod;
      Object.assign(E, w);
      if (changed) { rebuild(); }
      return changed;
    },
    summon(id) { summonNext = id; queue = []; if (shot) st = shot.d; },
    skip() { queue = []; if (shot) st = shot.d; },
    hit(x, y) { if (!lastBox) return null; const b = lastBox; return (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) ? b.id : null; },
    vanish() { // tap Michael -> he's gone
      if (!A || A.id !== 'michael') return false;
      const L = shot.loc; queue = [S(L, 2.5, t => null, [[.2, () => say('michael', HWT.narr('vanish'))]], { ghost: true }), ...queue]; st = shot.d; E.flash = .6; return true;
    },
    strike, W, H,
    play(name) { const f = M[name] || SEQ[name]; if (f) { queue = f(); if (shot) st = shot.d; } else if (CAST[name]) { queue = seqReport(name); if (shot) st = shot.d; } },
    play(name) { const f = M[name] || SEQ[name]; if (f) { queue = f(); if (shot) st = shot.d; } else if (CAST[name]) { queue = seqReport(name); if (shot) st = shot.d; } },
    play(name) { const f = M[name] || SEQ[name]; if (f) { queue = f(); if (shot) st = shot.d; } else if (CAST[name]) { queue = seqReport(name); if (shot) st = shot.d; } },
    play(name) { const f = M[name] || SEQ[name]; if (f) { queue = f(); if (shot) st = shot.d; } else if (CAST[name]) { queue = seqReport(name); if (shot) st = shot.d; } },
    talking: () => false,
    onSay: null, onLoc: null,
    current: () => A && A.id,
  };
  return Scene;
})();

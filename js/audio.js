/* Haddonfield Weather — synthesized audio (no audio files, works offline) */
const SFX = (() => {
  let ctx = null, master, sfx, amb, music, noiseBuf;
  let sfxOn = true, musicOn = true;
  const loops = {};
  let musicTimer = null, nextNote = 0, step = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = sfxOn ? 1 : 0; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = sfxOn ? 0.55 : 0; amb.connect(master);
    music = ctx.createGain(); music.gain.value = musicOn ? 0.16 : 0; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    buildLoops(); startMusic();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });
  }
  const now = () => ctx.currentTime;

  function tone(f, dur, type = 'square', vol = .1, when = 0, slide = null, dest = sfx) {
    if (!ctx) return; const t = now() + when;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, ftype = 'lowpass', freq = 1000, q = 1, vol = .2, when = 0, attack = .01, dest = sfx, fslide = null) {
    if (!ctx) return; const t = now() + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (fslide) f.frequency.exponentialRampToValueAtTime(fslide, t + dur);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + attack); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(dest); s.start(t, Math.random()); s.stop(t + dur + .05);
  }

  function buildLoops() {
    const mk = (type, freq, q) => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const gn = ctx.createGain(); gn.gain.value = 0; s.connect(f); f.connect(gn); gn.connect(amb); s.start();
      return { s, f, gn };
    };
    loops.rain = mk('bandpass', 2600, .6);
    loops.wind = mk('bandpass', 420, 1.4);
    loops.fire = mk('highpass', 1800, .5);
    loops.hum = (() => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; const gn = ctx.createGain(); gn.gain.value = 0; o.connect(f); f.connect(gn); gn.connect(amb); o.start(); return { o, gn }; })();
    // wind howl modulation
    const lfo = ctx.createOscillator(); lfo.frequency.value = .13; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(loops.wind.f.frequency); lfo.start();
  }
  let crackleT = null;
  function setAmbient(a) {
    if (!ctx) return; const t = now();
    loops.rain.gn.gain.setTargetAtTime((a.rain || 0) * .5, t, .8);
    loops.wind.gn.gain.setTargetAtTime((a.wind || 0) * .45, t, .8);
    loops.fire.gn.gain.setTargetAtTime((a.fire || 0) * .12, t, .8);
    loops.hum.gn.gain.setTargetAtTime((a.hum || 0) * .05, t, .8);
    clearInterval(crackleT);
    if (a.fire) crackleT = setInterval(() => { if (Math.random() < .6) noise(.04 + Math.random() * .05, 'highpass', 2500, 1, .12 * a.fire); }, 120);
  }

  /* ---- original creepy music (NOT the film's theme): music-box in 7/8 over a drone ---- */
  const MOT = [69, 64, 69, 64, 69, 65, 64, 69, 64, 69, 64, 70, 65, 64, 69, 64, 69, 64, 72, 71, 70, 69, 64, 69, 64, 69, 65, 64];
  const BASS = [45, 45, 46, 45];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function startMusic() {
    nextNote = now() + .3; step = 0; clearInterval(musicTimer);
    musicTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      while (nextNote < now() + .25) {
        const n = MOT[step % MOT.length];
        const dur = .19;
        pluck(mtof(n + 12), nextNote, .07);
        if (step % 7 === 0) { const b = BASS[Math.floor(step / 28) % 4]; pad(mtof(b), nextNote, 7 * dur); }
        nextNote += dur; step++;
      }
    }, 80);
  }
  function pluck(f, t, v) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), gn = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.01;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + .005); gn.gain.exponentialRampToValueAtTime(0.0001, t + .6);
    o.connect(gn); o2.connect(gn); gn.connect(music); o.start(t); o2.start(t); o.stop(t + .65); o2.stop(t + .65);
  }
  function pad(f, t, d) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.006;
    fl.type = 'lowpass'; fl.frequency.value = 380;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(.18, t + .4); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(fl); o2.connect(fl); fl.connect(gn); gn.connect(music); o.start(t); o2.start(t); o.stop(t + d + .1); o2.stop(t + d + .1);
  }

  const S = {
    init,
    setAmbient,
    setSfx(on) { sfxOn = on; if (ctx) { sfx.gain.value = on ? 1 : 0; amb.gain.value = on ? .55 : 0; } },
    setMusic(on) { musicOn = on; if (ctx) music.gain.setTargetAtTime(on ? .16 : 0, now(), .3); },
    duck(on) { if (ctx && musicOn) music.gain.setTargetAtTime(on ? .03 : .16, now(), .1); },
    blip() { tone(880, .05, 'square', .04); },
    type() { tone(1400 + Math.random() * 300, .02, 'square', .012); },
    tap() { tone(520, .06, 'square', .05); tone(780, .06, 'square', .04, .05); },
    toggle(on) { tone(on ? 660 : 330, .08, 'square', .05); tone(on ? 990 : 220, .08, 'square', .04, .07); },
    refresh() { tone(392, .12, 'triangle', .08); tone(523, .12, 'triangle', .07, .1); tone(784, .2, 'triangle', .06, .2); },
    step() { noise(.07, 'lowpass', 300, 1, .12); },
    stinger() { // dissonant strings stab
      if (!ctx) return; S.duck(true); setTimeout(() => S.duck(false), 1500);
      [880, 932, 1046, 1108, 1244].forEach((f, i) => tone(f, 1.1, 'sawtooth', .05, i * .004));
      noise(.5, 'highpass', 3000, 1, .25); tone(70, .9, 'sine', .4, 0, 40);
    },
    scream() { tone(1300, .7, 'sawtooth', .07, 0, 1900); tone(1350, .7, 'square', .03, .02, 1700); noise(.7, 'bandpass', 2400, 3, .12); },
    thunder(delay = 0) { noise(.15, 'highpass', 1500, 1, .35, delay); noise(3.2, 'lowpass', 600, 1, .7, delay + .05, .05, sfx, 60); tone(45, 2.5, 'sine', .25, delay + .1, 30); },
    breath() { noise(1.0, 'bandpass', 900, 2.2, .18, 0, .5); noise(1.3, 'bandpass', 700, 2.2, .22, 1.15, .3); },
    heartbeat() { tone(58, .14, 'sine', .45); tone(52, .16, 'sine', .38, .22); },
    shing() { noise(.5, 'bandpass', 6500, 4, .2, 0, .005, sfx, 9000); tone(2400, .4, 'sine', .05, 0, 3600); },
    stat() { noise(.28, 'highpass', 1800, .7, .13); tone(60, .2, 'square', .03); },
    siren() { for (let i = 0; i < 3; i++) { tone(520, 1.0, 'sawtooth', .04, i * 1.2, 880); tone(880, .2, 'sawtooth', .03, i * 1.2 + 1.0, 520); } },
    caw() { [0, .35].forEach(w => { tone(900, .18, 'sawtooth', .05, w, 500); noise(.18, 'bandpass', 1500, 3, .1, w); }); },
    creak() { tone(180, .8, 'sawtooth', .025, 0, 260); tone(190, .8, 'square', .015, .05, 140); },
    glass() { for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 3000, .25, 'triangle', .04, i * .03); noise(.4, 'highpass', 4000, 1, .2); },
    knock() { [0, .25, .5, .75].forEach(w => noise(.08, 'lowpass', 220, 2, .5, w)); },
    whoosh() { noise(.5, 'bandpass', 500, .8, .2, 0, .15, sfx, 2500); },
    horn() { tone(349, .35, 'square', .05); tone(440, .35, 'square', .04); },
    ding() { tone(1568, .5, 'sine', .06); tone(2093, .6, 'sine', .04, .12); },
  };
  return S;
})();

/* Haddonfield Weather — app controller: location, live weather, report UI, refresh, scares */
(() => {
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const set = Object.assign({ units: 'F', auto: 1, sfx: 1, music: 1, scares: 1, crt: 1, loc: null, lab: null }, LS.get('hw_settings', {}));
  const save = () => LS.set('hw_settings', set);
  let data = LS.get('hw_data', null), offline = false, place = LS.get('hw_place', ''), alerts = [], aqi = null;
  let countdown = 60, loading = false;

  /* ---------------- weather code tables ---------------- */
  const WMO = {
    0: ['Clear', 'clear'], 1: ['Mostly Clear', 'clear'], 2: ['Partly Cloudy', 'partly'], 3: ['Overcast', 'cloudy'],
    45: ['Fog', 'fog'], 48: ['Freezing Fog', 'fog'], 51: ['Light Drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy Drizzle', 'drizzle'],
    56: ['Freezing Drizzle', 'sleet'], 57: ['Freezing Drizzle', 'sleet'], 61: ['Light Rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy Rain', 'heavyrain'],
    66: ['Freezing Rain', 'sleet'], 67: ['Freezing Rain', 'sleet'], 71: ['Light Snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy Snow', 'heavysnow'], 77: ['Snow Grains', 'snow'],
    80: ['Rain Showers', 'rain'], 81: ['Rain Showers', 'rain'], 82: ['Violent Showers', 'heavyrain'], 85: ['Snow Showers', 'snow'], 86: ['Heavy Snow Showers', 'heavysnow'],
    95: ['Thunderstorm', 'thunder'], 96: ['Storm + Hail', 'hail'], 99: ['Severe Storm + Hail', 'hail'],
  };
  const SPOOKY = {
    clear: 'Perfect night for trick-or-treat.', partly: 'Clouds drift over Lampkin Lane.', cloudy: 'A grey sheet over Haddonfield.', fog: "You can't see him. He can see you.",
    drizzle: 'A cold drizzle on the jack-o-lanterns.', rain: 'Rain at Smith\'s Grove. The patients are out.', heavyrain: 'Pouring. The wipers can\'t keep up.',
    thunder: 'Lightning shows you who\'s in the yard.', hail: 'Ice falling from an angry sky.', sleet: 'Freezing rain glazes the sidewalks.',
    snow: 'Footprints in the snow. Not yours.', heavysnow: 'Whiteout. Stay inside.', heat: 'Too hot for a mask. He wears it anyway.', cold: 'Your breath fogs. So does his.',
    fire: 'Haddonfield is burning.', tornado: 'TORNADO! Take cover now!', wind: 'The wind is pushing the leaves... and the hedge.',
  };
  const LABS = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'heavyrain', 'thunder', 'hail', 'sleet', 'snow', 'heavysnow', 'wind', 'heat', 'cold', 'fire', 'tornado'];
  const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dirName = d => DIRS[Math.round(((d % 360) / 22.5)) % 16];
  const T = f => f == null || isNaN(f) ? '--' : (set.units === 'C' ? Math.round((f - 32) * 5 / 9) : Math.round(f)) + '°';
  const Tn = f => set.units === 'C' ? (f - 32) * 5 / 9 : f;
  const hm = s => { if (!s) return '--'; const [h, m] = s.slice(11, 16).split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const hr = s => { const h = +s.slice(11, 13); return `${(h % 12) || 12}${h < 12 ? 'a' : 'p'}`; };
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  /* ---------------- moon ---------------- */
  function moonPhase() { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); let a = ((Date.now() - ref) / 86400000) % syn; if (a < 0) a += syn; return a / syn; }
  function moonName(p) { return p < .03 || p > .97 ? 'New Moon' : p < .22 ? 'Waxing Crescent' : p < .28 ? 'First Quarter' : p < .47 ? 'Waxing Gibbous' : p < .53 ? 'Full Moon' : p < .72 ? 'Waning Gibbous' : p < .78 ? 'Last Quarter' : 'Waning Crescent'; }

  /* ---------------- pixel icons ---------------- */
  function icon(cv, kind, night) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, 16, 16); const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const cloud = (y, col, sh) => { r(3, y + 2, 11, 4, sh); r(2, y + 1, 12, 4, col); r(4, y - 1, 5, 3, col); r(8, y - 2, 4, 3, col); };
    const sun = () => { r(4, 4, 8, 8, '#ff9a1a'); r(5, 3, 6, 10, '#ff9a1a'); r(3, 5, 10, 6, '#ff9a1a'); r(7, 1, 2, 2, '#3a7a2a'); r(5, 6, 2, 2, '#2a0a00'); r(9, 6, 2, 2, '#2a0a00'); r(5, 9, 6, 1, '#2a0a00'); r(6, 10, 1, 1, '#2a0a00'); r(9, 10, 1, 1, '#2a0a00'); };
    const moon = () => { r(5, 2, 7, 11, '#f4ecd0'); r(4, 4, 9, 7, '#f4ecd0'); r(8, 2, 5, 9, 'rgba(0,0,0,0)'); c.clearRect(8, 3, 5, 8); r(1, 12, 3, 1, '#222'); r(3, 11, 2, 2, '#222'); r(5, 12, 3, 1, '#222'); };
    const k = kind;
    if (k === 'clear' || k === 'heat') { night ? moon() : sun(); if (k === 'heat') { r(0, 0, 16, 1, '#ff4a1a'); r(0, 15, 16, 1, '#ff4a1a'); } return; }
    if (k === 'partly' || k === 'wind') { night ? moon() : sun(); cloud(9, '#d8d8e0', '#8a8a98'); if (k === 'wind') { r(0, 5, 7, 1, '#fff'); r(2, 7, 6, 1, '#fff'); } return; }
    if (k === 'cold') { r(7, 1, 2, 14, '#bfe4ff'); r(1, 7, 14, 2, '#bfe4ff'); r(3, 3, 2, 2, '#bfe4ff'); r(11, 3, 2, 2, '#bfe4ff'); r(3, 11, 2, 2, '#bfe4ff'); r(11, 11, 2, 2, '#bfe4ff'); return; }
    if (k === 'fire') { r(5, 3, 6, 12, '#ff5a1a'); r(3, 7, 10, 8, '#ff5a1a'); r(6, 8, 4, 7, '#ffd040'); r(7, 1, 2, 3, '#ff8a2a'); return; }
    if (k === 'tornado') { for (let i = 0; i < 7; i++) r(2 + i, 2 + i * 2, 12 - i * 2, 2, i % 2 ? '#6a6a5a' : '#8a8a72'); return; }
    if (k === 'fog') { cloud(4, '#9a9aa4', '#6a6a78'); r(1, 10, 14, 1, '#c8c8d0'); r(3, 12, 12, 1, '#c8c8d0'); r(1, 14, 10, 1, '#c8c8d0'); return; }
    const storm = ['rain', 'heavyrain', 'thunder', 'hail', 'sleet', 'drizzle'].includes(k);
    cloud(4, storm ? '#5a5e6a' : '#c8ccd4', storm ? '#30343e' : '#8a8e98');
    if (storm) { r(5, 5, 2, 1, '#ffcf3a'); r(9, 5, 2, 1, '#ffcf3a'); }
    if (k === 'cloudy') return;
    const drop = '#6aa8ff';
    if (k === 'drizzle') { r(5, 11, 1, 1, drop); r(9, 13, 1, 1, drop); r(12, 11, 1, 1, drop); }
    if (k === 'rain' || k === 'heavyrain') { [[4, 10], [8, 12], [12, 10], [6, 14]].forEach(([x, y]) => r(x, y, 1, 2, drop)); if (k === 'heavyrain') [[10, 13], [2, 13], [14, 13]].forEach(([x, y]) => r(x, y, 1, 2, drop)); }
    if (k === 'thunder' || k === 'hail') { r(8, 9, 2, 2, '#ffe040'); r(7, 11, 2, 2, '#ffe040'); r(8, 13, 2, 2, '#ffe040'); }
    if (k === 'hail' || k === 'sleet') { r(3, 12, 2, 2, '#f0f4ff'); r(12, 12, 2, 2, '#f0f4ff'); }
    if (k === 'sleet') { r(6, 11, 1, 2, drop); r(10, 13, 1, 2, drop); }
    if (k === 'snow' || k === 'heavysnow') { [[4, 11], [8, 13], [12, 11], [6, 14], [10, 10]].forEach(([x, y]) => { r(x, y, 1, 1, '#fff'); r(x - 1, y, 3, 1, 'rgba(255,255,255,.6)'); }); }
  }
  const mkIcon = (kind, night, cls) => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; if (cls) cv.className = cls; icon(cv, kind, night); return cv; };

  /* ---------------- captions ---------------- */
  let typing = false, typeTimer = null;
  function say(id, text, nameOverride) {
    const c = CAST[id] || {}; const nm = nameOverride || (c.name + (c.tag && id !== 'michael' ? ' · ' + c.tag : '')) || 'HADDONFIELD';
    $('capName').textContent = id === 'michael' && !nameOverride ? '▲ THE SHAPE' : nm; $('capName').style.color = id === 'michael' ? '#ff4a4a' : (c.col || '#ff7a1a');
    const el = $('capText'); el.textContent = ''; clearInterval(typeTimer); typing = true; let i = 0;
    typeTimer = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i % 2 === 0 && text[i] !== ' ') SFX.type(); if (i >= text.length) { clearInterval(typeTimer); typing = false; } }, 31);
  }
  Scene.onSay = say;
  Scene.talking = () => typing;
  Scene.onLoc = name => { const el = $('locTag'); el.textContent = '📼 ' + name; };

  /* ---------------- location ---------------- */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
  function gps() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('no geo'));
      navigator.geolocation.getCurrentPosition(p => res({ lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) }), rej, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  }
  async function reverse(lat, lon) {
    try {
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const j = await r.json(); const city = j.city || j.locality || j.principalSubdivision || 'Your Town';
      const st = (j.principalSubdivisionCode || '').split('-')[1] || j.countryCode || '';
      return `${city}${st ? ', ' + st : ''}`;
    } catch (e) { return `${lat.toFixed(2)}, ${lon.toFixed(2)}`; }
  }
  async function useGps(first) {
    try {
      $('place').textContent = 'Asking for your location…';
      const p = await gps(); set.loc = { ...p, name: null }; save();
      await refresh(true);
    } catch (e) {
      if (set.loc) { refresh(true); return; }
      say('brackett', "I can't find you. Open ⚙ Settings and search for your town.", 'SHERIFF BRACKETT');
      $('place').textContent = 'Location blocked — search a city in ⚙';
      if (first) openSettings();
    }
  }
  async function citySearch() {
    const q = $('cityIn').value.trim(); if (!q) return;
    const box = $('cityRes'); box.textContent = 'Searching…';
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
      const j = await r.json(); box.innerHTML = '';
      (j.results || []).forEach(c => { const b = document.createElement('button'); b.textContent = `${c.name}${c.admin1 ? ', ' + c.admin1 : ''}${c.country_code ? ' · ' + c.country_code : ''}`; b.onclick = () => { set.loc = { lat: c.latitude, lon: c.longitude, name: `${c.name}${c.admin1 ? ', ' + c.admin1 : ''}` }; save(); box.innerHTML = ''; closeSettings(); SFX.tap(); refresh(true); }; box.appendChild(b); });
      if (!j.results || !j.results.length) box.textContent = 'No town by that name. Not even Haddonfield.';
    } catch (e) { box.textContent = 'Offline — can\'t search right now.'; }
  }

  /* ---------------- fetch ---------------- */
  async function refresh(manual) {
    if (!set.loc) return useGps(true);
    if (loading) return; loading = true; $('btnRef').innerHTML = '<span class="spin">⟳</span>';
    const { lat, lon } = set.loc;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility,uv_index` +
      `&minutely_15=precipitation,temperature_2m,weather_code` +
      `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,cape,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=10&forecast_minutely_15=12`;
    try {
      const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json(); j._fetched = Date.now(); data = j; LS.set('hw_data', data); offline = false;
      if (!set.loc.name) { set.loc.name = await reverse(lat, lon); save(); }
      place = set.loc.name; LS.set('hw_place', place);
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`).then(r => r.json()).then(j => { aqi = j.current && j.current.us_aqi; renderDetails(); }).catch(() => { });
      fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, { headers: { Accept: 'application/geo+json' } }).then(r => r.ok ? r.json() : null).then(j => { alerts = j && j.features ? j.features.map(f => f.properties) : []; renderAlerts(); applyScene(); }).catch(() => { alerts = []; });
      if (manual) { SFX.refresh(); toast('🎃 Haddonfield updated'); }
    } catch (e) {
      offline = true; if (manual) toast('📡 Offline — showing last forecast');
    }
    loading = false; $('btnRef').textContent = '⟳'; countdown = 60;
    render();
  }

  /* ---------------- derived snapshot ---------------- */
  function localNow() { const off = (data && data.utc_offset_seconds) || 0; return new Date(Date.now() + off * 1000).toISOString().slice(0, 16); }
  function hourIdx() { if (!data) return 0; const k = localNow().slice(0, 13) + ':00'; const i = data.hourly.time.indexOf(k); return i < 0 ? 0 : i; }
  function nextHour() {
    const m = data && data.minutely_15; if (!m) return { sum: 'No minute-by-minute data here.', slots: [] };
    const now = localNow(); let i = m.time.findIndex(t => t > now); i = Math.max(0, i - 1);
    const slots = m.time.slice(i, i + 4).map((t, k) => ({ t, p: m.precipitation[i + k] || 0, code: m.weather_code[i + k] }));
    const wet = slots.map(s => s.p > 0.002); const snow = slots.some(s => [71, 73, 75, 77, 85, 86].includes(s.code));
    const what = snow ? 'Snow' : 'Rain';
    let sum;
    if (wet.every(Boolean)) sum = `${what} continuing for the next hour.`;
    else if (wet[0] && !wet.every(Boolean)) sum = `${what} ending within ${(wet.indexOf(false)) * 15 || 15} minutes.`;
    else if (wet.some(Boolean)) sum = `${what} starting in about ${wet.indexOf(true) * 15} minutes.`;
    else sum = 'No precipitation in the next hour. The streets are dry… and quiet.';
    return { sum, slots };
  }
  function cond() { const c = data.current; return (WMO[c.weather_code] || ['Unknown', 'cloudy']); }
  function sceneState() {
    const c = data.current, d = data.daily, h = data.hourly, hi = hourIdx();
    let fx = cond()[1];
    const alertTxt = alerts.map(a => a.event || '').join(' ');
    const gust = c.wind_gusts_10m || 0, wind = c.wind_speed_10m || 0, feels = c.apparent_temperature, hum = c.relative_humidity_2m;
    const cape = h.cape ? h.cape[hi] || 0 : 0;
    if (/Tornado Warning/i.test(alertTxt) || (c.weather_code >= 95 && gust >= 58 && cape >= 2000)) fx = 'tornado';
    else if (/Red Flag|Fire Weather|Extreme Fire/i.test(alertTxt) || c.temperature_2m >= 105 || (c.temperature_2m >= 92 && hum < 15 && wind >= 20)) fx = 'fire';
    else if (feels >= 90 && ['clear', 'partly'].includes(fx)) fx = 'heat';
    else if (feels <= 32 && ['clear', 'partly', 'cloudy'].includes(fx)) fx = 'cold';
    const windy = wind >= 22 || gust >= 35;
    if (windy && ['clear', 'partly', 'cloudy'].includes(fx)) fx = fx === 'cloudy' ? 'cloudy' : 'wind';
    // time of day
    const now = localNow(); const sr = d.sunrise[0], ss = d.sunset[0];
    const mins = s => +s.slice(11, 13) * 60 + +s.slice(14, 16); const nm = mins(now);
    let tod = c.is_day ? 'day' : 'night';
    if (Math.abs(nm - mins(ss)) < 40 || Math.abs(nm - mins(sr)) < 30) tod = 'dusk';
    return { fx, tod, windy, cold: feels <= 32, heat: feels >= 90, wind, gust, temp: c.temperature_2m, moon: moonPhase() };
  }
  function applyScene() {
    if (!data) return;
    let st = sceneState();
    if (set.lab) { st = { ...st, fx: set.lab, windy: set.lab === 'wind' || set.lab === 'tornado', cold: ['cold', 'snow', 'heavysnow', 'sleet'].includes(set.lab), heat: set.lab === 'heat' }; if (set.lab === 'wind') st.fx = 'wind'; }
    const changed = Scene.setWeather(st);
    refreshAmbient();
    return changed ? st.fx : null;
  }
  function refreshAmbient() {
    const fx = Scene.E.fx;
    SFX.setAmbient({ rain: { drizzle: .3, rain: .7, heavyrain: 1, thunder: .9, hail: .8, sleet: .6, tornado: 1 }[fx] || 0, wind: (Scene.E.windy ? .8 : .15) + (fx === 'tornado' ? .6 : 0) + (fx === 'heavysnow' ? .5 : 0), fire: fx === 'fire' ? 1 : 0 });
  }
  Scene.refreshAmbient = refreshAmbient;

  window.HW = {
    snapshot() {
      if (!data) return null;
      const c = data.current, d = data.daily, h = data.hourly, hi = hourIdx();
      const next12 = h.temperature_2m.slice(hi, hi + 12);
      return {
        u: T, temp: c.temperature_2m, feels: c.apparent_temperature, hi: d.temperature_2m_max[0], lo: d.temperature_2m_min[0], cond: cond()[0],
        dir: dirName(c.wind_direction_10m || 0), wind: Math.round(c.wind_speed_10m), gust: Math.round(c.wind_gusts_10m), pop: d.precipitation_probability_max[0] ?? 0,
        nextHour: nextHour().sum, hum: c.relative_humidity_2m, dew: c.dew_point_2m, uv: Math.round(c.uv_index ?? d.uv_index_max[0] ?? 0), tonight: Math.min(...next12),
        tmrCond: (WMO[d.weather_code[1]] || ['?'])[0].toLowerCase(), tmrHi: d.temperature_2m_max[1], tmrLo: d.temperature_2m_min[1], tmrPop: d.precipitation_probability_max[1] ?? 0,
        sunset: hm(d.sunset[0]), moon: moonName(moonPhase()), pressure: (c.pressure_msl * 0.02953).toFixed(2), vis: c.visibility != null ? Math.round(c.visibility / 1609) : '--',
        alert: alerts[0] && alerts[0].event,
      };
    },
  };

  /* ---------------- render ---------------- */
  function render() {
    if (!data) return;
    const c = data.current, d = data.daily; const [cn, fxBase] = cond();
    const changed = applyScene();
    const fx = Scene.E.fx;
    $('hTemp').textContent = T(c.temperature_2m); $('hCond').textContent = cn;
    $('nTemp').textContent = T(c.temperature_2m); $('nCond').textContent = cn; $('nSpooky').textContent = SPOOKY[fx] || '';
    $('nFeels').textContent = T(c.apparent_temperature); $('nHi').textContent = T(d.temperature_2m_max[0]); $('nLo').textContent = T(d.temperature_2m_min[0]);
    icon($('nIcon'), fxBase === 'clear' && fx === 'heat' ? 'heat' : fx, Scene.E.tod === 'night');
    $('place').textContent = '📍 ' + (place || 'Somewhere near Haddonfield');
    const ago = Math.round((Date.now() - (data._fetched || Date.now())) / 60000);
    $('updated').textContent = offline ? `saved ${ago}m ago` : `updated ${new Date(data._fetched).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    $('offTag').hidden = !offline;
    renderNextHour(); renderHours(); renderDays(); renderDetails(); renderAlerts();
    if (changed && started) { SFX.whoosh(); toast('🌩 Haddonfield weather changed: ' + changed.toUpperCase()); }
  }
  function renderAlerts() {
    const box = $('alerts'); box.innerHTML = '';
    alerts.slice(0, 3).forEach(a => { const el = document.createElement('div'); el.className = 'al'; el.innerHTML = `<b>⚠ ${esc(a.event || 'ALERT')}</b>${esc(a.headline || '')}`; box.appendChild(el); });
  }
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function renderNextHour() {
    const nh = nextHour(); $('nhSum').textContent = nh.sum;
    const box = $('nhBars'); box.innerHTML = '';
    const mx = Math.max(.05, ...nh.slots.map(s => s.p));
    nh.slots.forEach((s, i) => { const el = document.createElement('div'); el.className = 'bar'; el.innerHTML = `<b>${s.p > 0 ? s.p.toFixed(2) + '"' : '0'}</b><i style="height:${Math.max(3, s.p / mx * 52)}px"></i>${i === 0 ? 'NOW' : '+' + i * 15 + 'm'}`; box.appendChild(el); });
  }
  function renderHours() {
    const h = data.hourly, i0 = hourIdx(), box = $('hours'); box.innerHTML = '';
    const idx = Array.from({ length: 24 }, (_, k) => i0 + k).filter(i => i < h.time.length);
    idx.forEach((i, k) => {
      const el = document.createElement('div'); el.className = 'hr' + (k === 0 ? ' now' : '');
      const kind = (WMO[h.weather_code[i]] || ['', 'cloudy'])[1];
      el.innerHTML = `<div>${k === 0 ? 'NOW' : hr(h.time[i])}</div>`; el.appendChild(mkIcon(kind, !h.is_day[i]));
      el.insertAdjacentHTML('beforeend', `<div class="tt">${T(h.temperature_2m[i])}</div><div class="pp">${h.precipitation_probability[i] ?? 0}%</div><div>${Math.round(h.wind_speed_10m[i])}mph</div>`);
      box.appendChild(el);
    });
    drawGraph(idx);
  }
  function drawGraph(idx) {
    const cv = $('graph'), c = cv.getContext('2d'), Wd = cv.width, Ht = cv.height, h = data.hourly;
    c.clearRect(0, 0, Wd, Ht); c.fillStyle = '#0c0608'; c.fillRect(0, 0, Wd, Ht);
    const temps = idx.map(i => Tn(h.temperature_2m[i])), pops = idx.map(i => h.precipitation_probability[i] ?? 0);
    let mn = Math.min(...temps), mx = Math.max(...temps); if (mx - mn < 4) { mx += 2; mn -= 2; }
    const L = 20, Rr = 20, top = 34, bot = Ht - 34, w = (Wd - L - Rr) / (temps.length - 1);
    const Y = t => top + (mx - t) / (mx - mn) * (bot - top); // higher temperature => higher on the graph
    c.strokeStyle = '#2a1418'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { const y = top + k * (bot - top) / 3; c.beginPath(); c.moveTo(L, y); c.lineTo(Wd - Rr, y); c.stroke(); }
    pops.forEach((p, k) => { const bh = p / 100 * (bot - top); c.fillStyle = 'rgba(80,140,255,.45)'; c.fillRect(L + k * w - 8, bot - bh, 16, bh); });
    c.lineWidth = 6; c.strokeStyle = '#ff7a1a'; c.lineJoin = 'round'; c.beginPath(); temps.forEach((t, k) => k ? c.lineTo(L + k * w, Y(t)) : c.moveTo(L, Y(t))); c.stroke();
    c.font = '24px VT323, monospace'; c.textAlign = 'center';
    temps.forEach((t, k) => {
      c.fillStyle = '#ffb347'; c.fillRect(L + k * w - 5, Y(t) - 5, 10, 10);
      if (k % 3 === 0) { c.fillStyle = '#fff'; c.fillText(Math.round(t) + '°', L + k * w, Y(t) - 12); c.fillStyle = '#a8988a'; c.fillText(k === 0 ? 'NOW' : hr(h.time[idx[k]]), L + k * w, Ht - 8); }
    });
  }
  function renderDays() {
    const d = data.daily, box = $('days'); box.innerHTML = '';
    const lo = Math.min(...d.temperature_2m_min), hiA = Math.max(...d.temperature_2m_max);
    d.time.forEach((t, i) => {
      const el = document.createElement('div'); el.className = 'day';
      const dt = new Date(t + 'T12:00:00'); const kind = (WMO[d.weather_code[i]] || ['', 'cloudy'])[1];
      const isHalloween = t.slice(5) === '10-31';
      el.innerHTML = `<div class="dn">${i === 0 ? 'TODAY' : DOW[dt.getDay()]}${isHalloween ? '🎃' : ''}</div><div class="ic"></div><div class="dp">${d.precipitation_probability_max[i] ?? 0}%</div>
        <div class="rng"><span>${T(d.temperature_2m_min[i])}</span><span class="track"><span class="fill" style="left:${(d.temperature_2m_min[i] - lo) / (hiA - lo || 1) * 100}%;right:${100 - (d.temperature_2m_max[i] - lo) / (hiA - lo || 1) * 100}%"></span></span><span>${T(d.temperature_2m_max[i])}</span></div>
        <div class="dayX">${(WMO[d.weather_code[i]] || ['?'])[0]} · Feels ${T(d.apparent_temperature_min[i])}–${T(d.apparent_temperature_max[i])} · Wind ${Math.round(d.wind_speed_10m_max[i])} mph ${dirName(d.wind_direction_10m_dominant[i] || 0)}, gusts ${Math.round(d.wind_gusts_10m_max[i])} · Precip ${(d.precipitation_sum[i] || 0).toFixed(2)}" · UV ${Math.round(d.uv_index_max[i] || 0)} · ☀ ${hm(d.sunrise[i])} / 🌙 ${hm(d.sunset[i])}${isHalloween ? ' · 🎃 HALLOWEEN NIGHT' : ''}</div>`;
      el.querySelector('.ic').appendChild(mkIcon(kind, false));
      el.onclick = () => { el.classList.toggle('open'); SFX.blip(); };
      box.appendChild(el);
    });
  }
  function tile(k, v, s, extra) { return `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}${extra || ''}</div>`; }
  function renderDetails() {
    if (!data) return;
    const c = data.current, d = data.daily;
    const uv = Math.round(c.uv_index ?? 0), mp = moonPhase();
    const aqiTxt = aqi == null ? '--' : aqi, aqiLbl = aqi == null ? '' : aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy (sensitive)' : aqi <= 200 ? 'Unhealthy' : 'Very unhealthy';
    // fun indices
    const fx = Scene.E.fx; let shape = 20 + (Scene.E.tod === 'night' ? 35 : Scene.E.tod === 'dusk' ? 20 : 0) + (fx === 'fog' ? 25 : 0) + (['thunder', 'rain', 'heavyrain'].includes(fx) ? 15 : 0) + (Math.abs(mp - .5) < .06 ? 10 : 0);
    const md = localNow().slice(5, 10); if (md === '10-31') shape = 100; shape = Math.min(100, shape);
    const tt = c.apparent_temperature, pop = d.precipitation_probability_max[0] ?? 0;
    let trick = 100 - Math.abs(tt - 58) * 2 - pop * .6 - Math.max(0, c.wind_speed_10m - 12) * 2; trick = Math.max(0, Math.min(100, Math.round(trick)));
    const vis = c.visibility != null ? (c.visibility / 1609).toFixed(1) : '--';
    $('details').innerHTML = [
      tile('FEELS LIKE', T(c.apparent_temperature), c.apparent_temperature < c.temperature_2m - 3 ? 'Wind chill bites' : c.apparent_temperature > c.temperature_2m + 3 ? 'Humid & sticky' : 'Close to actual'),
      tile('HUMIDITY', c.relative_humidity_2m + '%', 'Dew point ' + T(c.dew_point_2m), `<div class="meter"><i style="width:${c.relative_humidity_2m}%"></i></div>`),
      tile('WIND', Math.round(c.wind_speed_10m) + ' mph', 'From the ' + dirName(c.wind_direction_10m || 0), '<canvas id="compass" width="36" height="36"></canvas>'),
      tile('GUSTS', Math.round(c.wind_gusts_10m) + ' mph', c.wind_gusts_10m >= 35 ? 'Hold onto your pumpkins' : 'Leaves skittering'),
      tile('PRESSURE', (c.pressure_msl * 0.02953).toFixed(2) + '"', Math.round(c.pressure_msl) + ' hPa'),
      tile('VISIBILITY', vis + ' mi', +vis < 1 ? "Can't see the hedge" : 'Clear sightlines'),
      tile('UV INDEX', uv, uv >= 8 ? 'Very high' : uv >= 6 ? 'High' : uv >= 3 ? 'Moderate' : 'Low', `<div class="meter"><i style="width:${Math.min(100, uv / 11 * 100)}%"></i></div>`),
      tile('CLOUD COVER', c.cloud_cover + '%', c.cloud_cover > 80 ? 'Moon hidden' : 'Moon peeking'),
      tile('PRECIP TODAY', (d.precipitation_sum[0] || 0).toFixed(2) + '"', 'Now: ' + (c.precipitation || 0).toFixed(2) + '"/hr'),
      tile('AIR QUALITY', aqiTxt, aqiLbl ? 'US AQI · ' + aqiLbl : 'US AQI'),
      tile('SUNRISE', hm(d.sunrise[0]), 'The Shape rests'),
      tile('SUNSET', hm(d.sunset[0]), 'The Shape wakes'),
      tile('MOON', moonName(mp), Math.round((1 - Math.cos(mp * 2 * Math.PI)) / 2 * 100) + '% lit', '<canvas id="moonCv" width="36" height="36"></canvas>'),
      tile('SHAPE ACTIVITY', shape + '%', shape >= 80 ? 'He is VERY close' : shape >= 50 ? 'Lock the doors' : 'Probably fine', `<div class="meter"><i style="width:${shape}%"></i></div>`),
      tile('TRICK-OR-TREAT', trick + '/100', trick >= 70 ? 'Great candy weather' : trick >= 40 ? 'Bring a jacket' : 'Stay in, watch a movie', `<div class="meter"><i style="width:${trick}%"></i></div>`),
      tile('HALLOWEEN IN', daysToHalloween(), 'Haddonfield countdown'),
    ].join('');
    const cc = $('compass').getContext('2d'); cc.clearRect(0, 0, 36, 36); cc.strokeStyle = '#5a2a2a'; cc.lineWidth = 2; cc.beginPath(); cc.arc(18, 18, 15, 0, 7); cc.stroke();
    const a = ((c.wind_direction_10m || 0) + 180) * Math.PI / 180; cc.strokeStyle = '#ff7a1a'; cc.lineWidth = 3; cc.beginPath(); cc.moveTo(18 - Math.sin(a) * 11, 18 + Math.cos(a) * 11); cc.lineTo(18 + Math.sin(a) * 11, 18 - Math.cos(a) * 11); cc.stroke(); cc.fillStyle = '#fff'; cc.fillRect(17 + Math.sin(a) * 11 - 1, 17 - Math.cos(a) * 11 - 1, 4, 4);
    const mc = $('moonCv').getContext('2d'); mc.fillStyle = '#f4ecd0'; mc.beginPath(); mc.arc(18, 18, 14, 0, 7); mc.fill();
    if (Math.abs(mp - .5) > .02) { const off = mp < .5 ? -(mp / .5) * 28 : ((1 - mp) / .5) * 28; mc.save(); mc.beginPath(); mc.arc(18, 18, 14.5, 0, 7); mc.clip(); mc.fillStyle = '#0c0608'; mc.beginPath(); mc.arc(18 + off, 18, 15, 0, 7); mc.fill(); mc.restore(); }
  }
  function daysToHalloween() {
    const n = localNow(); const y = +n.slice(0, 4); const today = new Date(n.slice(0, 10) + 'T00:00:00Z');
    let h = new Date(Date.UTC(y, 9, 31)); if (today > h) h = new Date(Date.UTC(y + 1, 9, 31));
    const dd = Math.round((h - today) / 86400000); return dd === 0 ? 'TONIGHT' : dd + (dd === 1 ? ' day' : ' days');
  }

  /* ---------------- cast gallery ---------------- */
  const SHORT = { michael: 'MICHAEL', laurie: 'LAURIE', laurie2: "LAURIE '81", loomis: 'LOOMIS', annie: 'ANNIE', lynda: 'LYNDA', bob: 'BOB', brackett: 'SHERIFF', tommy: 'TOMMY', lindsey: 'LINDSEY', marion: 'MARION', jimmy: 'JIMMY', budd: 'BUDD', garrett: 'GARRETT', alves: 'MRS. ALVES', karen: 'KAREN', ben: 'BEN' };
  function renderCast() {
    const box = $('cast'); box.innerHTML = '';
    Object.keys(CAST).forEach(id => {
      const b = document.createElement('button'); b.className = 'castBtn' + (id === 'michael' ? ' m' : '');
      const cv = document.createElement('canvas'); cv.width = 32; cv.height = 40; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
      c.drawImage(SPR.draw(id, { front: true }), 16, 22, 32, 40, 0, 0, 32, 40);
      b.appendChild(cv); b.insertAdjacentHTML('beforeend', SHORT[id] || id.toUpperCase());
      b.onclick = () => { SFX.tap(); Scene.summon(id); $('hero').scrollIntoView({ behavior: 'smooth' }); };
      box.appendChild(b);
    });
  }

  /* ---------------- settings ---------------- */
  function syncSeg() {
    document.querySelectorAll('.seg').forEach(sg => { const k = sg.dataset.k; sg.querySelectorAll('button').forEach(b => b.classList.toggle('sel', String(set[k]) === b.dataset.v)); });
    $('btnAuto').classList.toggle('on', !!set.auto); $('autoTxt').textContent = set.auto ? `AUTO ${countdown}` : 'AUTO OFF';
    document.body.classList.toggle('nocrt', !set.crt);
    document.querySelectorAll('#lab button').forEach(b => b.classList.toggle('sel', (set.lab || 'live') === b.dataset.v));
  }
  function openSettings() { $('sheet').hidden = false; syncSeg(); }
  function closeSettings() { $('sheet').hidden = true; }
  function buildSettings() {
    document.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = sg.dataset.k; const v = b.dataset.v; set[k] = k === 'units' ? v : +v; save(); SFX.toggle(true);
      if (k === 'sfx') SFX.setSfx(!!set.sfx); if (k === 'music') SFX.setMusic(!!set.music); if (k === 'units') render(); if (k === 'auto') countdown = 60; if (k === 'scares') planScare();
      syncSeg();
    }));
    const lab = $('lab'); ['live', ...LABS].forEach(k => { const b = document.createElement('button'); b.dataset.v = k; b.textContent = k === 'live' ? '● LIVE' : k.toUpperCase(); b.onclick = () => { set.lab = k === 'live' ? null : k; save(); SFX.whoosh(); applyScene(); render(); syncSeg(); }; lab.appendChild(b); });
    $('closeSet').onclick = () => { SFX.blip(); closeSettings(); };
    $('sheet').onclick = e => { if (e.target.id === 'sheet') closeSettings(); };
    $('useGps').onclick = () => { SFX.tap(); closeSettings(); set.loc = null; useGps(false); };
    $('citySearch').onclick = citySearch; $('cityIn').onkeydown = e => { if (e.key === 'Enter') citySearch(); };
    $('testScare').onclick = () => { closeSettings(); setTimeout(() => jumpScare(true), 400); };
  }

  /* ---------------- jump scares ---------------- */
  let scareAt = 0;
  function planScare() { scareAt = set.scares ? Date.now() + (set.scares === 2 ? rnd(90, 200) : rnd(240, 480)) * 1000 : 0; }
  function jumpScare(force) {
    if (!force && (document.hidden || !$('sheet').hidden)) return planScare();
    if (!force && set.scares === 1) { Scene.summon('michael'); planScare(); return; }
    const box = $('scare'), cv = $('scareCv'), c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    box.hidden = false; SFX.stinger(); SFX.scream();
    const t0 = performance.now();
    (function an(ts) { const t = (ts - t0) / 1000; SPR.drawScareFace(c, cv.width, cv.height, t); if (Math.random() < .3) { c.fillStyle = 'rgba(200,0,0,.35)'; c.fillRect(0, 0, cv.width, cv.height); } if (t < .85) requestAnimationFrame(an); else { box.hidden = true; } })(t0);
    planScare();
  }

  /* ---------------- timers ---------------- */
  setInterval(() => {
    if (!started) return;
    if (set.auto) { countdown--; if (countdown <= 0) { countdown = 60; refresh(false); } }
    $('autoTxt').textContent = set.auto ? `AUTO ${countdown}` : 'AUTO OFF';
    if (scareAt && Date.now() > scareAt) jumpScare(false);
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && started && data && Date.now() - (data._fetched || 0) > 60000) refresh(false); });

  /* ---------------- title screen ---------------- */
  function titleArt() {
    const cv = document.createElement('canvas'); cv.width = 24; cv.height = 20; const c = cv.getContext('2d'); const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    r(4, 5, 16, 13, '#e8761a'); r(2, 7, 20, 9, '#e8761a'); r(6, 4, 12, 15, '#e8761a'); r(8, 5, 1, 13, '#c85a10'); r(15, 5, 1, 13, '#c85a10'); r(11, 1, 2, 4, '#3a7a2a'); r(13, 1, 3, 1, '#3a7a2a');
    r(6, 8, 4, 3, '#ffe040'); r(14, 8, 4, 3, '#ffe040'); r(7, 7, 2, 1, '#ffe040'); r(15, 7, 2, 1, '#ffe040'); r(11, 11, 2, 2, '#ffe040');
    r(5, 14, 14, 2, '#ffe040'); r(7, 13, 2, 1, '#ffe040'); r(11, 13, 2, 1, '#ffe040'); r(15, 13, 2, 1, '#ffe040'); r(9, 16, 2, 1, '#ffe040'); r(13, 16, 2, 1, '#ffe040');
    document.querySelector('.t-pumpkin').style.backgroundImage = `url(${cv.toDataURL()})`;
    const tc = $('titleFx'), g = tc.getContext('2d'); const leaves = Array.from({ length: 26 }, () => ({ x: rnd(0, 96), y: rnd(0, 160), v: rnd(6, 16), p: rnd(0, 6), c: ['#d8641a', '#b8361a', '#e8a82a'][Math.random() * 3 | 0] }));
    let last = performance.now();
    (function an(ts) {
      if (started) return; const dt = Math.min(.05, (ts - last) / 1000); last = ts;
      g.fillStyle = '#000'; g.fillRect(0, 0, 96, 160);
      g.fillStyle = '#0e0a14'; g.fillRect(0, 110, 96, 50);
      g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(72, 22, 9, 0, 7); g.fill();
      g.fillStyle = '#16121c'; g.beginPath(); g.moveTo(14, 112); g.lineTo(36, 92); g.lineTo(58, 112); g.fill(); g.fillRect(18, 110, 36, 30); g.fillStyle = Math.sin(ts / 300) > .7 ? '#ffd890' : '#2a2018'; g.fillRect(32, 116, 5, 6);
      leaves.forEach(l => { l.y += l.v * dt; l.x += Math.sin(ts / 700 + l.p) * 8 * dt + 4 * dt; if (l.y > 160) { l.y = -2; l.x = rnd(0, 96); } g.fillStyle = l.c; g.fillRect(l.x | 0, l.y | 0, 2, 1); });
      requestAnimationFrame(an);
    })(last);
  }

  /* ---------------- boot ---------------- */
  let started = false;
  function grain() { const c = $('grain').getContext('2d'); const id = c.createImageData(96, 88); setInterval(() => { if (!set.crt) return; for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }, 90); }
  function start() {
    if (started) return; started = true;
    SFX.init(); SFX.setSfx(!!set.sfx); SFX.setMusic(!!set.music); SFX.stinger();
    $('title').hidden = true; $('title').style.display = 'none'; $('app').hidden = false;
    Scene.init($('scene')); Scene.start(); grain(); renderCast(); buildSettings(); syncSeg();
    if (data) { place = set.loc && set.loc.name || place; render(); }
    say('brackett', "Haddonfield Sheriff's Department. Checking the weather for you…", 'WHAD RADIO');
    if (set.loc) refresh(false); else useGps(true);
    planScare(); if (set.scares === 2) scareAt = Date.now() + rnd(60, 120) * 1000;
  }
  $('enter').onclick = start;
  $('btnRef').onclick = () => { SFX.tap(); countdown = 60; refresh(true); };
  $('btnAuto').onclick = () => { set.auto = set.auto ? 0 : 1; countdown = 60; save(); SFX.toggle(!!set.auto); toast(set.auto ? '⏱ Auto refresh ON (every 60s)' : '⏸ Auto refresh OFF'); syncSeg(); };
  $('btnSet').onclick = () => { SFX.blip(); openSettings(); };
  $('btnSkip').onclick = () => { SFX.blip(); Scene.skip(); };
  $('scene').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * Scene.W, y = (e.clientY - r.top) / r.height * Scene.H;
    const hit = Scene.hit(x, y);
    if (hit === 'michael') { if (Scene.vanish()) { SFX.stat(); SFX.breath(); } }
    else if (hit) { SFX.blip(); say(hit, HWT.quote(hit)); }
    else if (['thunder', 'tornado', 'heavyrain', 'rain'].includes(Scene.E.fx)) Scene.strike();
    else { SFX.caw(); }
  });
  titleArt();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();

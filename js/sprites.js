/* Haddonfield Weather — pixel character sprites (procedural, no image files) */
const CAST = {
  michael:  {name:'MICHAEL MYERS', tag:'THE SHAPE', col:'#e9e5d8', skin:'#e9e5d8', hair:'#5e4128', style:'mask', shirt:'#28324c', pants:'#28324c', shoes:'#121212', prop:'knife', zip:true},
  laurie:   {name:'LAURIE STRODE', col:'#f2b27a', skin:'#f0c8a0', hair:'#9a5a32', style:'feather', shirt:'#d9c6a0', pants:'#7a4a2a', skirt:'long', shoes:'#4a2a1a', prop:'books'},
  laurie2:  {name:'LAURIE STRODE', tag:'HADDONFIELD MEMORIAL', col:'#9fc6e0', skin:'#ecc29c', hair:'#9a5a32', style:'feather', shirt:'#bcd3e0', pants:'#bcd3e0', skirt:'short', shoes:'#e8e8e8', prop:null, limp:true, sling:true},
  loomis:   {name:'DR. SAM LOOMIS', col:'#d6b77a', skin:'#e8bfa0', hair:'#c9c9c9', style:'balding', shirt:'#4a4a52', pants:'#3a3a40', coat:'#b59a6a', shoes:'#2a1a10', prop:'revolver'},
  annie:    {name:'ANNIE BRACKETT', col:'#c98fe0', skin:'#f0c8a0', hair:'#5a3420', style:'long', shirt:'#6a3f8a', pants:'#3a4a7a', shoes:'#2a2a2a', prop:'keys'},
  lynda:    {name:'LYNDA VAN DER KLOK', col:'#ffd76a', skin:'#f2cca6', hair:'#f0d070', style:'long', shirt:'#d14a3a', pants:'#3b4f8a', shoes:'#e0e0e0', prop:null},
  bob:      {name:'BOB SIMMS', col:'#e05a5a', skin:'#eec29a', hair:'#3a2a1a', style:'short', shirt:'#8a1f2a', sleeve:'#e8e8e8', pants:'#4a5a8a', shoes:'#2a2a2a', prop:'beer'},
  brackett: {name:'SHERIFF LEIGH BRACKETT', col:'#e0c070', skin:'#dcae88', hair:'#8a8a8a', style:'short', hat:'sheriff', shirt:'#c9b48a', pants:'#5a4a30', shoes:'#1a1208', prop:'flashlight', badge:true},
  tommy:    {name:'TOMMY DOYLE', col:'#7ad07a', kid:true, skin:'#f2cca6', hair:'#6a4a2a', style:'short', shirt:'#3a7a3a', stripe:'#e8d84a', pants:'#3a4a7a', shoes:'#2a2a2a', prop:'pumpkin'},
  lindsey:  {name:'LINDSEY WALLACE', col:'#f08ab4', kid:true, skin:'#f4d0ac', hair:'#f2d880', style:'long', shirt:'#c84a7a', pants:'#c84a7a', skirt:'short', shoes:'#e8e8e8', prop:null},
  marion:   {name:'MARION CHAMBERS', col:'#8fb0e0', skin:'#ecc4a0', hair:'#3a2418', style:'bob', shirt:'#2a3a5a', pants:'#2a2a38', coat:'#3a3a48', skirt:'short', shoes:'#111', prop:'umbrella'},
  jimmy:    {name:'JIMMY LLOYD', tag:'PARAMEDIC', col:'#f0f0f0', skin:'#f0c8a0', hair:'#c8a050', style:'short', shirt:'#eeeeee', pants:'#e2e2e2', shoes:'#222', prop:'medkit'},
  budd:     {name:'BUDD', tag:'PARAMEDIC', col:'#d0d0ff', skin:'#e2b48c', hair:'#5a3a1a', style:'short', beard:'#5a3a1a', shirt:'#e8e8e8', pants:'#2a2a2a', shoes:'#111', prop:null},
  garrett:  {name:'MR. GARRETT', tag:'HOSPITAL SECURITY', col:'#9fb4d8', skin:'#dcae88', hair:'#9a9a9a', style:'short', hat:'cap', shirt:'#8aa0c0', pants:'#2a3040', shoes:'#111', prop:'flashlight', badge:true},
  alves:    {name:'MRS. ALVES', tag:'HEAD NURSE', col:'#ffffff', skin:'#eac2a0', hair:'#b0b0b0', style:'bun', hat:'nurse', shirt:'#f2f2f2', pants:'#f2f2f2', skirt:'long', shoes:'#f2f2f2', prop:'clipboard'},
  karen:    {name:'NURSE KAREN', col:'#ff9a7a', skin:'#f2cca6', hair:'#b8502a', style:'long', hat:'nurse', shirt:'#f2f2f2', pants:'#f2f2f2', skirt:'short', shoes:'#f2f2f2', prop:null},
  ben:      {name:'BEN TRAMER', col:'#ff9a2a', skin:'#eec29a', hair:'#3a2a1a', style:'pumpkin', shirt:'#6a4a2a', pants:'#3a3a4a', shoes:'#1a1a1a', prop:null},
};

const SPR = (() => {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const CX = 32, FOOT = 60;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function shade(hex, f) {
    let n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r * f)) | 0; gg = Math.max(0, Math.min(255, gg * f)) | 0; b = Math.max(0, Math.min(255, b * f)) | 0;
    return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
  }

  // o: {phase, walk(0 stand/1 walk/2 run), front, facing, pose:'raise'|'hold'|'pound'|'look', tilt, prop, sheet, burning, blind, dark, silhouette, blink}
  function draw(id, o = {}) {
    const c = CAST[id];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 64, 64);
    if (o.facing === -1 && !o.front) { g.setTransform(-1, 0, 0, 1, 64, 0); }
    if (o.sheet) { drawSheet(o); return finish(o); }
    const kid = !!c.kid;
    const lh = kid ? 7 : 12, th = kid ? 7 : 10, hh = 6;
    const legTop = FOOT - lh, torsoTop = legTop - th, headTop = torsoTop - hh - 1;
    const tw = kid ? 6 : 8, tx = CX - tw / 2;
    const amp = o.walk === 2 ? 3 : o.walk === 1 ? 2 : 0;
    let s = Math.round(Math.sin(o.phase || 0) * amp);
    if (c.limp && o.walk) s = Math.round(Math.max(-1, Math.sin(o.phase || 0) * 2));
    const prop = o.prop !== undefined ? o.prop : c.prop;
    const shirtD = shade(c.shirt, .78), pantsD = shade(c.pants, .75), skinD = shade(c.skin, .82);
    const legCol = c.skirt === 'short' ? (c.shoes === '#f2f2f2' ? '#f2f2f2' : c.skin) : c.pants;
    const bob = o.walk ? (Math.abs(Math.sin(o.phase || 0)) > .7 ? -1 : 0) : 0;
    g.translate(0, bob);

    if (o.front) {
      // ---------- FRONT VIEW ----------
      const lw = kid ? 2 : 3;
      R(CX - lw - 0, legTop, lw, lh, legCol); R(CX + 0, legTop, lw, lh, shade(legCol, .9));
      R(CX - lw, legTop, 1, lh, shade(legCol, .8));
      R(CX - lw - 1, FOOT - 2, lw + 1, 2, c.shoes); R(CX, FOOT - 2, lw + 1, 2, c.shoes);
      if (c.skirt) { const sl = c.skirt === 'long' ? lh - 2 : (kid ? 3 : 5); for (let r = 0; r < sl; r++) R(tx - Math.floor(r / 3), legTop + r, tw + Math.floor(r / 3) * 2, 1, r % 4 === 3 ? shade(c.pants, .85) : c.pants); }
      if (c.coat) { R(tx - 1, torsoTop, tw + 2, th + Math.round(lh * .6), c.coat); R(CX - 1, torsoTop + 2, 2, th + Math.round(lh * .6) - 2, shade(c.coat, .8)); R(tx - 1, legTop - 1, tw + 2, 1, shade(c.coat, .7)); }
      // torso
      R(tx, torsoTop, tw, th, c.shirt); R(tx, torsoTop, 1, th, shirtD); R(tx + tw - 1, torsoTop, 1, th, shirtD);
      if (c.coat) { R(tx, torsoTop, 2, th, c.coat); R(tx + tw - 2, torsoTop, 2, th, c.coat); }
      if (c.stripe) for (let r = 1; r < th; r += 2) R(tx, torsoTop + r, tw, 1, c.stripe);
      if (c.zip) R(CX - 1, torsoTop + 1, 1, th - 1, shade(c.shirt, .65));
      if (c.badge) R(CX + 1, torsoTop + 2, 1, 1, '#ffd84a');
      if (c.sling) R(tx + 1, torsoTop + 3, tw - 2, 1, '#ffffff');
      // arms
      const ac = c.sleeve || c.coat || c.shirt, al = kid ? 6 : 9;
      const swing = o.walk ? Math.round(Math.sin(o.phase || 0)) : 0;
      R(tx - 2, torsoTop + 1, 2, al, ac); R(tx - 2, torsoTop + 1 + al, 2, 2, c.skin);
      let hx = tx + tw, hy = torsoTop + 1 + al;
      if (o.pose === 'raise') { R(tx + tw, torsoTop - 7, 2, 9, ac); R(tx + tw, torsoTop - 9, 2, 2, c.skin); hy = torsoTop - 9; }
      else if (o.pose === 'hold') { R(tx + tw, torsoTop + 1, 2, 4, ac); R(tx + tw - 3, torsoTop + 5, 5, 2, ac); R(tx + tw - 4, torsoTop + 5, 2, 2, c.skin); hx = tx + tw - 4; hy = torsoTop + 5; }
      else { R(tx + tw, torsoTop + 1 + swing, 2, al, ac); R(tx + tw, torsoTop + 1 + al + swing, 2, 2, c.skin); hy += swing; }
      // head
      const tilt = o.tilt || 0;
      R(CX - 1, torsoTop - 1, 2, 1, skinD);
      drawHeadFront(c, headTop, tilt, o);
      drawProp(prop, hx, hy, true, o, torsoTop, headTop, c);
    } else {
      // ---------- SIDE VIEW (facing right) ----------
      const lw = kid ? 2 : 3;
      const legX = CX - lw + 1;
      for (let r = 0; r < lh; r++) {
        const off = Math.round(s * r / lh);
        R(legX - off, legTop + r, lw, 1, shade(legCol, .8));
      }
      R(legX - s - 1 + 1, FOOT - 1, lw + 1, 1, c.shoes); R(legX - s, FOOT - 2, lw, 1, c.shoes);
      for (let r = 0; r < lh; r++) {
        const off = Math.round(s * r / lh);
        R(legX + off, legTop + r, lw, 1, legCol);
      }
      R(legX + s, FOOT - 2, lw + 1, 2, c.shoes);
      if (c.skirt) { const sl = c.skirt === 'long' ? lh - 2 : (kid ? 3 : 5); for (let r = 0; r < sl; r++) R(tx - Math.floor(r / 3), legTop + r, tw + Math.floor(r / 3) * 2 - 1, 1, r % 4 === 3 ? shade(c.pants, .85) : c.pants); }
      const ac = c.sleeve || c.coat || c.shirt, al = kid ? 6 : 9;
      // back arm
      const as = o.walk ? Math.round(Math.sin(o.phase || 0) * (o.walk === 2 ? 3 : 2)) : 0;
      for (let r = 0; r < al; r++) R(CX - 1 + Math.round(as * r / al), torsoTop + 1 + r, 2, 1, shade(ac, .7));
      R(CX - 1 + as, torsoTop + 1 + al, 2, 2, skinD);
      if (c.coat) { R(tx - 1, torsoTop, tw + 1, th + Math.round(lh * .6), c.coat); R(tx - 1, legTop - 1, tw + 1, 1, shade(c.coat, .7)); }
      R(tx, torsoTop, tw - 1, th, c.shirt); R(tx, torsoTop, 1, th, shirtD);
      if (c.coat) { R(tx, torsoTop, 2, th, c.coat); R(tx + tw - 3, torsoTop, 2, th, c.coat); }
      if (c.stripe) for (let r = 1; r < th; r += 2) R(tx, torsoTop + r, tw - 1, 1, c.stripe);
      if (c.zip) R(CX + 2, torsoTop + 1, 1, th - 1, shade(c.shirt, .65));
      if (c.badge) R(CX + 2, torsoTop + 2, 1, 1, '#ffd84a');
      // head
      R(CX - 1, torsoTop - 1, 2, 1, skinD);
      drawHeadSide(c, headTop, o);
      // front arm
      let hx, hy;
      if (o.pose === 'raise') { R(CX, torsoTop - 7, 2, 9, ac); R(CX, torsoTop - 9, 2, 2, c.skin); hx = CX; hy = torsoTop - 9; }
      else if (o.pose === 'hold' || prop === 'books' || prop === 'flashlight' || prop === 'revolver' || prop === 'clipboard') { R(CX - 1, torsoTop + 1, 2, 4, ac); R(CX - 1, torsoTop + 5, 5, 2, ac); R(CX + 4, torsoTop + 5, 2, 2, c.skin); hx = CX + 4; hy = torsoTop + 5; }
      else if (o.pose === 'pound') { const k = Math.sin((o.phase || 0) * 3) > 0 ? 0 : 2; R(CX, torsoTop + 1, 2, 3, ac); R(CX + 1, torsoTop + k, 4, 2, ac); R(CX + 5, torsoTop + k - 1, 2, 2, c.skin); hx = CX + 5; hy = torsoTop + k; }
      else { for (let r = 0; r < al; r++) R(CX - 1 - Math.round(as * r / al), torsoTop + 1 + r, 2, 1, ac); hx = CX - 1 - as; hy = torsoTop + 1 + al; R(hx, hy, 2, 2, c.skin); }
      drawProp(prop, hx, hy, false, o, torsoTop, headTop, c);
    }
    return finish(o);
  }

  function hairTop(c, headTop, x0, w) { R(x0, headTop - 1, w, 1, c.hair); }

  function drawHeadFront(c, headTop, tilt, o) {
    const hx = CX - 3;
    g.save();
    if (c.style === 'pumpkin') {
      R(hx - 1, headTop, 8, 6, '#e8761a'); R(hx, headTop - 1, 6, 1, '#e8761a'); R(hx, headTop + 6, 6, 1, '#c85a10');
      R(hx + 1, headTop, 1, 6, '#c85a10'); R(hx + 4, headTop, 1, 6, '#c85a10'); R(CX - 1, headTop - 3, 2, 2, '#3a7a2a');
      R(hx + 1, headTop + 2, 1, 1, '#111'); R(hx + 4, headTop + 2, 1, 1, '#111'); R(hx + 1, headTop + 4, 4, 1, '#111');
      g.restore(); return;
    }
    // back hair
    if (c.style === 'long' || c.style === 'feather') R(hx - 1, headTop, 8, c.style === 'long' ? 10 : 8, shade(c.hair, .85));
    if (c.style === 'bob') R(hx - 1, headTop, 8, 6, shade(c.hair, .85));
    R(hx, headTop, 6, 6, c.skin);
    R(hx, headTop + 5, 6, 1, shade(c.skin, .88));
    // hair top
    if (c.style === 'balding') { R(hx - 1, headTop + 1, 1, 4, c.hair); R(hx + 6, headTop + 1, 1, 4, c.hair); R(hx, headTop, 1, 2, c.hair); R(hx + 5, headTop, 1, 2, c.hair); }
    else if (c.style === 'mask') { R(hx - 1, headTop - 1, 8, 2, c.hair); R(hx - 1, headTop, 1, 4, c.hair); R(hx + 6, headTop, 1, 4, c.hair); R(hx + 1, headTop + 1, 2, 1, shade(c.hair, 1.2)); }
    else { R(hx - 1, headTop - 1, 8, 2, c.hair); R(hx - 1, headTop, 1, 3, c.hair); R(hx + 6, headTop, 1, 3, c.hair); if (c.style === 'feather') { R(hx, headTop + 1, 2, 1, c.hair); R(hx + 4, headTop + 1, 2, 1, c.hair); } }
    if (c.style === 'bun') R(CX - 1, headTop - 3, 3, 2, c.hair);
    // face
    const blink = o.blink;
    if (c.style === 'mask') {
      R(hx + 1, headTop + 2, 1, 2, '#0a0a0a'); R(hx + 4, headTop + 2, 1, 2, '#0a0a0a');
      R(hx + 2, headTop + 3, 2, 1, shade(c.skin, .85)); R(hx + 2, headTop + 5, 2, 1, '#8a8478');
      if (o.blind) { R(hx + 1, headTop + 4, 1, 3, '#b00010'); R(hx + 4, headTop + 4, 1, 3, '#b00010'); }
      if (o.glint) { R(hx + 1, headTop + 2, 1, 1, '#ff2a2a'); R(hx + 4, headTop + 2, 1, 1, '#ff2a2a'); }
    } else {
      if (!blink) { R(hx + 1, headTop + 2, 1, 1, '#1a1010'); R(hx + 4, headTop + 2, 1, 1, '#1a1010'); }
      else { R(hx + 1, headTop + 3, 1, 1, shade(c.skin, .7)); R(hx + 4, headTop + 3, 1, 1, shade(c.skin, .7)); }
      R(hx + 2, headTop + 4, 2, 1, o.talk ? '#5a1a1a' : shade(c.skin, .72));
      if (o.talk) R(hx + 2, headTop + 5, 2, 1, '#3a0a0a');
      if (c.beard) { R(hx, headTop + 4, 1, 2, c.beard); R(hx + 5, headTop + 4, 1, 2, c.beard); R(hx + 1, headTop + 5, 4, 1, c.beard); }
    }
    drawHat(c, headTop, true);
    g.restore();
    if (tilt) { // pixel-perfect head tilt: shear the head rows sideways
      const y0 = headTop - 4, y1 = headTop + 6;
      for (let y = y0; y < y1; y++) {
        const sh = Math.round(tilt * 3.2 * (y1 - y) / (y1 - y0));
        if (!sh) continue;
        const row = g.getImageData(0, y, 64, 1); g.clearRect(0, y, 64, 1); g.putImageData(row, sh, y);
      }
    }
  }

  function drawHeadSide(c, headTop, o) {
    const hx = CX - 3;
    if (c.style === 'pumpkin') {
      R(hx - 1, headTop, 8, 6, '#e8761a'); R(hx, headTop - 1, 6, 1, '#e8761a'); R(hx + 2, headTop, 1, 6, '#c85a10');
      R(CX - 1, headTop - 3, 2, 2, '#3a7a2a'); R(hx + 5, headTop + 2, 1, 1, '#111'); R(hx + 4, headTop + 4, 3, 1, '#111'); return;
    }
    if (c.style === 'long' || c.style === 'feather') R(hx - 1, headTop, 4, c.style === 'long' ? 10 : 8, shade(c.hair, .85));
    if (c.style === 'bob') R(hx - 1, headTop, 4, 6, shade(c.hair, .85));
    R(hx, headTop, 6, 6, c.skin); R(hx + 6, headTop + 3, 1, 1, c.skin);
    if (c.style === 'balding') { R(hx, headTop + 1, 2, 4, c.hair); }
    else if (c.style === 'mask') { R(hx - 1, headTop - 1, 7, 2, c.hair); R(hx - 1, headTop, 3, 5, c.hair); }
    else { R(hx - 1, headTop - 1, 7, 2, c.hair); R(hx - 1, headTop, 3, 4, c.hair); if (c.style === 'feather') R(hx + 4, headTop + 1, 2, 1, c.hair); }
    if (c.style === 'bun') R(hx - 3, headTop + 1, 2, 3, c.hair);
    R(hx + 2, headTop + 3, 1, 1, shade(c.skin, .8));
    if (c.style === 'mask') { R(hx + 4, headTop + 2, 1, 2, '#0a0a0a'); R(hx + 5, headTop + 5, 1, 1, '#8a8478'); if (o.blind) R(hx + 4, headTop + 4, 1, 3, '#b00010'); }
    else { if (!o.blink) R(hx + 4, headTop + 2, 1, 1, '#1a1010'); R(hx + 4, headTop + 4, 2, 1, o.talk ? '#5a1a1a' : shade(c.skin, .72)); if (c.beard) R(hx + 1, headTop + 4, 4, 2, c.beard); }
    drawHat(c, headTop, false);
  }

  function drawHat(c, headTop, front) {
    const hx = CX - 3;
    if (c.hat === 'sheriff') { R(hx - 2, headTop - 1, 10, 1, '#6e5028'); R(hx, headTop - 3, 6, 2, '#8a6a3a'); R(hx + 2, headTop - 3, 2, 1, '#6e5028'); }
    if (c.hat === 'cap') { R(hx, headTop - 2, 6, 2, '#1e2a48'); if (front) R(hx, headTop, 6, 1, '#141c30'); else R(hx + 5, headTop, 3, 1, '#141c30'); R(hx + 2, headTop - 2, 1, 1, '#ffd84a'); }
    if (c.hat === 'nurse') { R(hx + 1, headTop - 2, 4, 2, '#ffffff'); R(hx + 2, headTop - 2, 2, 1, '#d02a2a'); }
  }

  function drawProp(p, hx, hy, front, o, torsoTop, headTop, c) {
    if (!p) return;
    if (p === 'knife') {
      if (o.pose === 'raise') { R(hx, hy - 6, 1, 6, '#dfe4ec'); R(hx + 1, hy - 5, 1, 4, '#9aa2ae'); R(hx, hy - 1, 2, 1, '#4a2a14'); if (o.glint) R(hx - 1, hy - 7, 3, 1, '#ffffff'); }
      else { R(hx, hy + 1, 2, 1, '#4a2a14'); R(hx, hy + 2, 1, 6, '#dfe4ec'); R(hx + 1, hy + 2, 1, 5, '#9aa2ae'); if (o.glint) { R(hx - 1, hy + 4, 3, 1, '#ffffff'); R(hx, hy + 3, 1, 3, '#ffffff'); } }
    } else if (p === 'books') { const bx = front ? CX - 3 : CX + 2; R(bx, torsoTop + 3, 5, 2, '#b8322a'); R(bx, torsoTop + 5, 5, 2, '#2a5ab0'); R(bx + 1, torsoTop + 7, 4, 1, '#e8d07a'); }
    else if (p === 'pumpkin') { const px = front ? CX - 4 : CX + 2, py = torsoTop + 3; R(px, py, 7, 5, '#ee7a1a'); R(px + 1, py - 1, 5, 1, '#ee7a1a'); R(px + 2, py, 1, 5, '#c8600e'); R(px + 3, py - 2, 1, 1, '#3a7a2a'); R(px + 1, py + 1, 1, 1, '#2a1004'); R(px + 5, py + 1, 1, 1, '#2a1004'); R(px + 1, py + 3, 5, 1, '#2a1004'); }
    else if (p === 'flashlight') {
      R(hx, hy, 4, 2, '#5a5a62'); R(hx + 4, hy - 1, 1, 4, '#d0d0d8');
      if (!front) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,160,0.22)'; g.beginPath(); g.moveTo(hx + 5, hy); g.lineTo(64, hy - 9); g.lineTo(64, hy + 12); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; }
    }
    else if (p === 'revolver') { R(hx + 1, hy, 4, 1, '#2a2a30'); R(hx + 1, hy + 1, 2, 2, '#3a2a20'); }
    else if (p === 'beer') { R(hx, hy - 1, 2, 3, '#c8c8d0'); R(hx, hy, 2, 1, '#c03030'); }
    else if (p === 'keys') { R(hx + 1, hy + 2, 1, 2, '#e8d070'); R(hx, hy + 3, 1, 1, '#c0c0c0'); }
    else if (p === 'medkit') { R(hx - 1, hy + 1, 5, 4, '#f4f4f4'); R(hx + 1, hy + 2, 1, 2, '#d02020'); R(hx, hy + 3, 3, 0.9, '#d02020'); R(hx, hy, 3, 1, '#888'); }
    else if (p === 'clipboard') { const bx = front ? CX - 2 : CX + 2; R(bx, torsoTop + 2, 4, 5, '#8a5a2a'); R(bx + 1, torsoTop + 3, 2, 3, '#ffffff'); }
    else if (p === 'headstone') { const bx = front ? CX - 4 : CX + 1; R(bx, torsoTop + 1, 8, 9, '#8a8a90'); R(bx + 1, torsoTop, 6, 1, '#8a8a90'); R(bx + 2, torsoTop + 3, 4, 1, '#4a4a50'); R(bx + 2, torsoTop + 5, 4, 1, '#4a4a50'); R(bx, torsoTop + 1, 1, 9, '#6a6a70'); }
    else if (p === 'umbrella') {
      const ux = front ? CX + 4 : CX + 1;
      R(ux, headTop - 5, 1, (hy - headTop) + 6, '#222');
      R(ux - 7, headTop - 6, 15, 1, '#1a1a22'); R(ux - 6, headTop - 7, 13, 1, '#24242e'); R(ux - 4, headTop - 8, 9, 1, '#2a2a36'); R(ux - 1, headTop - 9, 3, 1, '#2a2a36');
      for (let i = -7; i <= 7; i += 4) R(ux + i, headTop - 5, 1, 1, '#1a1a22');
    }
  }

  function drawSheet(o) {
    const top = 30;
    for (let r = 0; r < 30; r++) {
      const w = r < 6 ? 6 + Math.min(r, 2) * 1 : 8 + Math.floor((r - 6) / 4);
      const sway = Math.round(Math.sin((o.phase || 0) + r * .2) * (r > 20 ? 1 : 0));
      R(CX - Math.floor(w / 2) + sway, top + r, w, 1, r % 7 === 3 ? '#dcdcdc' : '#f4f4f0');
    }
    for (let i = 0; i < 7; i++) if (i % 2) R(CX - 7 + i * 2, FOOT - 1, 2, 1, '#f4f4f0');
    // eye holes + Bob's glasses
    R(CX - 3, top + 3, 2, 2, '#0a0a0a'); R(CX + 1, top + 3, 2, 2, '#0a0a0a');
    g.fillStyle = '#1a1a1a'; R(CX - 4, top + 2, 4, 1, '#1a1a1a'); R(CX, top + 2, 4, 1, '#1a1a1a'); R(CX - 4, top + 5, 4, 1, '#1a1a1a'); R(CX, top + 5, 4, 1, '#1a1a1a');
    R(CX - 4, top + 2, 1, 4, '#1a1a1a'); R(CX + 3, top + 2, 1, 4, '#1a1a1a'); R(CX - 1, top + 3, 2, 1, '#1a1a1a');
    R(CX - 3, top + 2, 1, 1, 'rgba(255,255,255,.6)');
  }

  function finish(o) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (o.burning) {
      for (let i = 0; i < 14; i++) {
        const x = CX - 6 + ((i * 37 + (o.t * 20 | 0)) % 13), y = 26 + ((i * 53 + (o.t * 30 | 0)) % 32);
        const hgt = 2 + ((i + (o.t * 8 | 0)) % 4);
        g.globalCompositeOperation = 'source-atop'; R(x, y, 2, hgt, i % 3 ? '#ff7a1a' : '#ffd040'); g.globalCompositeOperation = 'source-over';
        R(x, y - hgt - 2 - ((o.t * 12 + i) % 4 | 0), 1, 2, i % 2 ? '#ff5a10' : '#ffe070');
      }
    }
    if (o.dark > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(6,8,22,${Math.min(.85, o.dark)})`; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'source-over'; }
    if (o.silhouette) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${o.silhouette})`; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'source-over'; }
    if (o.maskGlow && o.dark > 0) { // keep mask faintly visible in darkness
      // handled by caller via glint
    }
    return cv;
  }

  // Big jump-scare mask (draws into given ctx at scale)
  function drawScareFace(ctx, W, H, t) {
    const P = Math.floor(Math.min(W / 30, H / 40));
    const ox = Math.floor((W - 30 * P) / 2), oy = Math.floor((H - 40 * P) / 2) + Math.round(Math.sin(t * 40) * P * .5);
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x * P, oy + y * P, w * P, h * P); };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // hair
    r(3, 2, 24, 8, '#3e2a18'); r(1, 6, 4, 18, '#3e2a18'); r(25, 6, 4, 18, '#3e2a18'); r(6, 1, 18, 2, '#4e3620');
    for (let i = 0; i < 10; i++) r(3 + i * 2 + (i % 2), 9, 2, 3, '#4e3620');
    // mask
    r(5, 8, 20, 24, '#e6e1d2'); r(6, 32, 18, 4, '#d8d2c0'); r(8, 36, 14, 2, '#c8c2b0');
    r(5, 8, 2, 24, '#cfc9b8'); r(23, 8, 2, 24, '#cfc9b8');
    // brow ridge
    r(7, 14, 7, 1, '#bdb6a2'); r(16, 14, 7, 1, '#bdb6a2');
    // eye holes
    r(8, 16, 5, 4, '#050505'); r(17, 16, 5, 4, '#050505'); r(9, 15, 3, 1, '#050505'); r(18, 15, 3, 1, '#050505');
    if (Math.sin(t * 25) > 0) { r(10, 17, 1, 1, '#ff1a1a'); r(19, 17, 1, 1, '#ff1a1a'); }
    // nose
    r(14, 18, 2, 7, '#d2ccba'); r(13, 24, 4, 1, '#aaa392'); r(13, 25, 1, 1, '#2a2622'); r(16, 25, 1, 1, '#2a2622');
    // mouth
    r(11, 29, 8, 1, '#6e685c'); r(12, 30, 6, 1, '#3a3630');
    // cheek shadows
    r(7, 21, 3, 6, '#d6d0be'); r(20, 21, 3, 6, '#d6d0be');
    // coverall collar
    r(4, 37, 22, 3, '#232c44'); r(14, 37, 2, 3, '#151a28');
  }

  return { draw, drawScareFace, shade };
})();

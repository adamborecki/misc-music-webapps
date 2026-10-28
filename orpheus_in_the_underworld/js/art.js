/* Orpheus in the Underworld — all artwork is generated SVG.
   Style: spindly, big-eyed paper puppets (gothic stop-motion feel) on
   cabaret sets (red velvet, gold, marquee bulbs). */
window.OU = window.OU || {};

OU.art = (() => {
  const INK = "#1d1322";
  let counter = 0;
  const uid = () => "o" + (++counter).toString(36);

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const P = (d, fill, sw = 2.4, extra = "") =>
    `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const L = (d, color, w = 2, extra = "") =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const tube = (d, color, w) => L(d, INK, w + 4.5) + L(d, color, w);

  // ---------------------------------------------------------------------------
  // Puppet parts
  // ---------------------------------------------------------------------------
  const HEADS = {
    egg: "M100,44 C143,44 145,104 124,128 Q100,147 76,128 C55,104 57,44 100,44 Z",
    round: "M100,46 C142,46 144,90 139,108 C133,134 117,143 100,143 C83,143 67,134 61,108 C56,90 58,46 100,46 Z",
    long: "M100,40 C135,40 136,94 126,124 Q113,154 100,154 Q87,154 74,124 C64,94 65,40 100,40 Z",
    baby: "M100,52 C140,52 146,92 138,112 C130,134 116,140 100,140 C84,140 70,134 62,112 C54,92 60,52 100,52 Z",
  };

  const PUPIL = {
    neutral: [0, 0], happy: [0, -1], sad: [0, 3], angry: [0, 1], surprised: [0, 0], smug: [4, 0],
    bored: [0, 3], sleep: [0, 0], love: [0, 0], sly: [-4, 1], worried: [-2, 2],
  };

  function face(f, mood, u, skin) {
    const eyeY = f.eyeY || 88, dx = f.dx || 15, rx = f.rx || 12, ry0 = f.ry || 14;
    const ry = mood === "surprised" ? ry0 * 1.12 : ry0;
    const iris = f.iris || "#4f6a8a";
    const ring = f.ring || "#4a3a5c";
    let defs = "", s = "";
    const [px, py] = PUPIL[mood] || [0, 0];
    [-1, 1].forEach((side, i) => {
      const x = 100 + side * dx;
      const cid = `${u}e${i}`;
      defs += `<clipPath id="${cid}"><ellipse cx="${x}" cy="${eyeY}" rx="${rx}" ry="${ry}"/></clipPath>`;
      s += `<ellipse cx="${x}" cy="${eyeY + 1}" rx="${rx + 4.5}" ry="${ry + 4.5}" fill="${ring}" opacity=".3"/>`;
      s += `<ellipse cx="${x}" cy="${eyeY}" rx="${rx}" ry="${ry}" fill="#fbf7ef"/>`;
      if (mood !== "sleep") {
        const ix = x + px, iy = eyeY + py;
        if (mood === "love") {
          s += `<path d="M${ix},${iy + 5} C${ix - 9},${iy - 2} ${ix - 4},${iy - 9} ${ix},${iy - 3} C${ix + 4},${iy - 9} ${ix + 9},${iy - 2} ${ix},${iy + 5} Z" fill="#d1193c"/>`;
        } else {
          s += `<circle cx="${ix}" cy="${iy}" r="${rx * 0.55}" fill="${iris}"/>`;
          s += `<circle cx="${ix}" cy="${iy}" r="${mood === "surprised" ? 2 : 3.2}" fill="${INK}"/>`;
          s += `<circle cx="${ix + 2.2}" cy="${iy - 2.4}" r="1.7" fill="#fff"/>`;
        }
      }
      // lids by mood (clipped to the eye)
      let lid = "";
      const top = eyeY - ry - 2, bot = eyeY + ry + 2, l = x - rx - 2, r = x + rx + 2;
      const inner = side === -1 ? r : l, outer = side === -1 ? l : r;
      if (mood === "bored") lid = `<rect x="${l}" y="${top}" width="${rx * 2 + 4}" height="${ry + 2}" fill="${skin}"/>` + L(`M${l},${eyeY} L${r},${eyeY}`, INK, 2.2);
      else if (mood === "smug" || mood === "sly") lid = `<rect x="${l}" y="${top}" width="${rx * 2 + 4}" height="${ry * 0.7}" fill="${skin}"/>` + L(`M${l},${top + ry * 0.7} L${r},${top + ry * 0.7}`, INK, 2.2);
      else if (mood === "sleep") lid = `<rect x="${l}" y="${top}" width="${rx * 2 + 4}" height="${ry * 2 + 4}" fill="${skin}"/>` + L(`M${x - rx},${eyeY + 2} Q${x},${eyeY + 8} ${x + rx},${eyeY + 2}`, INK, 2.2);
      else if (mood === "angry") lid = `<polygon points="${outer},${top} ${inner},${top} ${inner},${eyeY - ry * 0.1} ${outer},${eyeY - ry * 0.75}" fill="${skin}"/>` + L(`M${outer},${eyeY - ry * 0.75} L${inner},${eyeY - ry * 0.1}`, INK, 2.2);
      else if (mood === "sad" || mood === "worried") lid = `<polygon points="${outer},${top} ${inner},${top} ${inner},${eyeY - ry * 0.95} ${outer},${eyeY - ry * 0.3}" fill="${skin}"/>` + L(`M${outer},${eyeY - ry * 0.3} L${inner},${eyeY - ry * 0.95}`, INK, 2.2);
      else if (mood === "happy") lid = `<ellipse cx="${x}" cy="${bot + ry * 0.35}" rx="${rx + 6}" ry="${ry * 0.95}" fill="${skin}"/>`;
      s += `<g clip-path="url(#${cid})">${lid}<rect class="blink" opacity="0" x="${l}" y="${top}" width="${rx * 2 + 4}" height="${ry * 2 + 4}" fill="${skin}"/></g>`;
      s += `<ellipse cx="${x}" cy="${eyeY}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
      if (f.lashes) {
        const ox = x + side * rx * 0.75, oy = eyeY - ry * 0.65;
        s += L(`M${ox},${oy} l${side * 6},-5 M${ox - side * 3},${oy - 3} l${side * 4},-7 M${x + side * rx * 0.95},${eyeY - ry * 0.25} l${side * 7},-2`, INK, 2);
      }
      if (f.bags) s += L(`M${x - rx * 0.7},${eyeY + ry + 4} Q${x},${eyeY + ry + 9} ${x + rx * 0.7},${eyeY + ry + 4}`, f.bags, 1.8);
      // brows
      const base = eyeY - ry - 7;
      let iy = base, oy2 = base - 2;
      if (mood === "angry") { iy = base + 7; oy2 = base - 3; }
      else if (mood === "sad" || mood === "worried") { iy = base - 6; oy2 = base + 3; }
      else if (mood === "surprised") { iy = base - 7; oy2 = base - 7; }
      else if (mood === "bored") { iy = base + 3; oy2 = base + 3; }
      else if (mood === "happy" || mood === "love") { iy = base - 2; oy2 = base - 4; }
      else if ((mood === "smug" || mood === "sly") && side === 1) { iy = base - 6; oy2 = base - 8; }
      const ix2 = x - side * rx * 0.85, ox2 = x + side * rx * 0.95;
      if (!f.noBrows) s += L(`M${ox2},${oy2} Q${x},${Math.min(iy, oy2) - 5} ${ix2},${iy}`, f.brow || INK, f.browW || 3.2);
    });
    // nose
    const ny = eyeY;
    if (f.nose === "long") s += P(`M98,${ny + 6} Q105,${ny + 22} 112,${ny + 31} Q104,${ny + 33} 97,${ny + 29}`, skin, 2);
    else if (f.nose === "bulb") s += `<ellipse cx="100" cy="${ny + 24}" rx="7" ry="6" fill="${f.noseColor || skin}" stroke="${INK}" stroke-width="2"/>`;
    else if (f.nose !== "none") s += L(`M99,${ny + 17} q5,7 -1,9`, INK, 2);
    if (f.cheeks) [-1, 1].forEach((sd) => (s += `<ellipse cx="${100 + sd * (dx + 7)}" cy="${eyeY + ry + 9}" rx="7" ry="4.5" fill="${f.cheeks}" opacity=".45"/>`));
    if (f.mole) s += `<circle cx="${100 + f.mole[0]}" cy="${f.mole[1]}" r="1.8" fill="${INK}"/>`;
    // mouth
    const y = f.mouthY || 121;
    const lip = f.lip || INK;
    let m;
    switch (mood) {
      case "happy": case "love":
        m = `<path d="M88,${y - 2} Q100,${y + 14} 112,${y - 2} Q100,${y + 3} 88,${y - 2} Z" fill="#4a1426" stroke="${INK}" stroke-width="2"/><path d="M95,${y + 6} Q100,${y + 3} 105,${y + 6} Q100,${y + 9} 95,${y + 6}Z" fill="#d76a7a"/>`;
        break;
      case "sad": m = L(`M91,${y + 4} Q100,${y - 3} 109,${y + 4}`, lip, 2.6); break;
      case "worried": m = L(`M90,${y + 2} Q95,${y - 1} 100,${y + 2} Q105,${y + 5} 110,${y + 1}`, lip, 2.4); break;
      case "angry": m = `<path d="M89,${y + 3} Q100,${y - 4} 111,${y + 3} Q100,${y + 1} 89,${y + 3}Z" fill="#4a1426" stroke="${INK}" stroke-width="2.2"/>`; break;
      case "surprised": m = `<ellipse cx="100" cy="${y + 2}" rx="4.5" ry="6.5" fill="#4a1426" stroke="${INK}" stroke-width="2"/>`; break;
      case "smug": case "sly": m = L(`M89,${y + 1} Q101,${y + 6} 112,${y - 4}`, lip, 2.6); break;
      case "bored": m = L(`M92,${y + 1} L108,${y}`, lip, 2.6); break;
      case "sleep": m = `<ellipse cx="100" cy="${y + 2}" rx="2.6" ry="3.2" fill="#4a1426"/>`; break;
      default: m = L(`M91,${y} Q100,${y + 5} 109,${y}`, lip, 2.6);
    }
    s += `<g class="mouth">${m}</g><ellipse class="talkmouth" opacity="0" cx="100" cy="${y + 2}" rx="5.5" ry="5" fill="#4a1426" stroke="${INK}" stroke-width="2"/>`;
    if (mood === "sleep") s += `<text class="zzz" x="128" y="54" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="#6b5d8a">z<tspan font-size="13" dy="-8">z</tspan></text>`;
    return { defs, svg: s };
  }

  const SHOULDER = 24;
  function arm(side, pose, color, skin, opts = {}) {
    const sx = 100 + side * (opts.sh || SHOULDER), sy = opts.sy || 168;
    const poses = {
      down: [[100 + side * 38, 218], [100 + side * 37, 262]],
      hold: [[100 + side * 40, 214], [100 + side * 17, 234]],
      hip: [[100 + side * 54, 196], [100 + side * 22, 214]],
      up: [[100 + side * 50, 136], [100 + side * 50, 96]],
      out: [[100 + side * 50, 196], [100 + side * 66, 216]],
      raise: [[100 + side * 52, 168], [100 + side * 64, 132]],
      eye: [[100 + side * 50, 160], [100 + side * 40, 118]],
      chest: [[100 + side * 30, 214], [100 - side * 4, 196]],
    };
    const [[vx, vy], [hx, hy]] = poses[pose] || poses.down;
    const d = `M${sx},${sy} Q${vx},${vy} ${hx},${hy}`;
    const w = opts.w || 10;
    const hand = `<circle cx="${hx}" cy="${hy}" r="${opts.hr || 6.2}" fill="${skin}" stroke="${INK}" stroke-width="2.2"/>`;
    return { svg: tube(d, color, w) + (opts.cuff ? `<circle cx="${hx}" cy="${hy - 6}" r="5" fill="${opts.cuff}" stroke="${INK}" stroke-width="1.6"/>` : "") + hand, hand: [hx, hy] };
  }

  function stripes(id, c1, c2, vertical) {
    return vertical
      ? `<pattern id="${id}" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="${c1}"/><rect width="3.5" height="10" fill="${c2}"/></pattern>`
      : `<pattern id="${id}" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="9" fill="${c1}"/><rect width="12" height="4.5" fill="${c2}"/></pattern>`;
  }

  function shoes(color) {
    return P("M86,373 L95,373 L95,388 L72,388 Q61,387 61,377 Q68,383 80,381 Z", color, 2.2) +
      P("M114,373 L105,373 L105,388 L128,388 Q139,387 139,377 Q132,383 120,381 Z", color, 2.2);
  }

  function legs(u, o) {
    const id = u + "lg";
    const defs = stripes(id, o.c1, o.c2, o.trousers);
    let s;
    if (o.trousers) {
      const t = o.top || 222;
      s = P(`M83,${t} L100,${t} L97,377 L86,377 Z`, `url(#${id})`, 2.2) + P(`M100,${t} L117,${t} L114,377 L103,377 Z`, `url(#${id})`, 2.2);
    } else {
      const t = o.top || 296;
      s = P(`M86,${t} L94,${t} L94,377 L86,377 Z`, `url(#${id})`, 2) + P(`M106,${t} L114,${t} L114,377 L106,377 Z`, `url(#${id})`, 2);
    }
    return { defs, svg: s + shoes(o.shoe || INK) };
  }

  function dress(o) {
    const top = o.top || 160, waist = o.waist || 212, hem = o.hem || 312, fl = o.flare || 52, sh = o.sh || 26;
    const hl = 100 - fl, hr = 100 + fl;
    let hemPath = "";
    if (o.ragged) {
      const r = rng(o.seed || 7);
      const n = 9;
      for (let i = 1; i <= n; i++) {
        const x = hr - ((hr - hl) * i) / n;
        const y = i % 2 ? hem - 10 - r() * 10 : hem + r() * 4;
        hemPath += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
    } else {
      const n = 5;
      for (let i = 1; i <= n; i++) {
        const x = hr - ((hr - hl) * i) / n;
        const mx = x + (hr - hl) / n / 2;
        hemPath += ` Q${mx.toFixed(1)},${hem + 8} ${x.toFixed(1)},${hem}`;
      }
    }
    const d = `M${100 - sh},${top + 4} Q100,${top - 6} ${100 + sh},${top + 4} L114,${waist} Q${hr - 16},${(waist + hem) / 2} ${hr},${hem}${hemPath} Q${hl + 16},${(waist + hem) / 2} 86,${waist} Z`;
    let s = P(d, o.color);
    s += L(`M100,${waist + 6} L100,${hem - 8} M92,${waist + 4} L${hl + 22},${hem - 10} M108,${waist + 4} L${hr - 22},${hem - 10}`, o.shade, 2.2, 'opacity=".7"');
    if (o.sash) s += P(`M85,${waist - 6} L115,${waist - 6} L114,${waist + 5} L86,${waist + 5} Z`, o.sash, 2);
    if (o.collar) s += P(`M86,${top + 1} Q100,${top + 16} 114,${top + 1} Q100,${top + 6} 86,${top + 1}Z`, o.collar, 2);
    return s;
  }

  function tailcoat(o) {
    const sh = o.sh || 28;
    const tails = P("M82,214 L66,322 L88,306 L100,250 L112,306 L134,322 L118,214 Z", o.shade || o.color);
    const front =
      P(`M${100 - sh},164 Q100,154 ${100 + sh},164 L120,226 L109,236 L100,214 L91,236 L80,226 Z`, o.color) +
      P("M91,162 L100,214 L109,162 Q100,158 91,162 Z", o.shirt || "#efe9dc", 2) +
      (o.vest ? P("M93,176 L100,214 L107,176 Z", o.vest, 1.8) : "") +
      P("M91,161 L98,196 L84,176 Z", o.lapel || o.shade || o.color, 1.8) +
      P("M109,161 L102,196 L116,176 Z", o.lapel || o.shade || o.color, 1.8) +
      (o.cravat ? P("M100,168 L90,162 L90,174 Z M100,168 L110,162 L110,174 Z", o.cravat, 1.8) + `<circle cx="100" cy="168" r="3" fill="${o.cravat}" stroke="${INK}" stroke-width="1.5"/>` : "") +
      (o.buttons ? [194, 206].map((y) => `<circle cx="${y === 194 ? 95 : 105}" cy="${y}" r="2.4" fill="${o.buttons}"/>`).join("") : "");
    return { tails, front };
  }

  function neck(skin, w = 10, top = 122, bottom = 170) {
    return P(`M${100 - w / 2},${top} L${100 - w / 2},${bottom} L${100 + w / 2},${bottom} L${100 + w / 2},${top} Z`, skin, 2);
  }

  // Assemble a puppet. Layers are strings; arms are generated.
  function puppet(o, mood) {
    const u = uid();
    const f = face(o.face || {}, mood, u, o.skin);
    let defs = f.defs + (o.defs || "");
    let body = "";
    let lg = { defs: "", svg: "" };
    if (o.legs) {
      lg = legs(u, o.legs);
      defs += lg.defs;
    }
    const arms = (o.arms || []).map(([side, pose, color, aopts]) => arm(side, pose, color, o.skin, aopts || {}));
    const hands = arms.map((a) => a.hand);
    const get = (v) => (typeof v === "function" ? v(hands, u) : v || "");
    body += get(o.back);
    body += get(o.hairBack);
    body += get(o.behindLegs);
    body += lg.svg;
    body += get(o.body);
    body += neck(o.skin, o.neckW, o.neckTop, o.neckBottom);
    body += get(o.overNeck);
    body += P(o.head || HEADS.egg, o.skin);
    if (o.shade) body += `<path d="${o.head || HEADS.egg}" fill="${o.shade}" opacity=".35" transform="translate(6 4) scale(.94)" style="transform-origin:100px 95px" clip-path="url(#${u}hc)"/>`;
    defs += `<clipPath id="${u}hc"><path d="${o.head || HEADS.egg}"/></clipPath>`;
    body += get(o.underFace);
    body += f.svg;
    body += get(o.hair);
    body += get(o.hat);
    body += arms.map((a) => a.svg).join("");
    body += get(o.front);
    let inner = `<g class="figure">${body}</g>`;
    if (o.scale) inner = `<g transform="translate(100 392) scale(${o.scale}) translate(-100 -392)">${inner}</g>`;
    return `<svg class="puppet" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;
  }

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  const props = {
    bouquet([x, y]) {
      let s = L(`M${x},${y} L${x - 4},${y - 26} M${x},${y} L${x + 6},${y - 24} M${x},${y} L${x},${y - 30}`, "#4d6b4a", 2.4);
      [[x - 5, y - 30, "#e9e2f2"], [x + 7, y - 27, "#d98fa6"], [x, y - 35, "#f0d36b"], [x - 9, y - 22, "#b9a5d6"], [x + 10, y - 18, "#f2efe6"]].forEach(([cx, cy, c]) => {
        s += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${c}" stroke="${INK}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="1.8" fill="#c58b2c"/>`;
      });
      return s;
    },
    wilted([x, y]) {
      return L(`M${x},${y} Q${x - 2},${y - 20} ${x - 12},${y - 22} M${x},${y} Q${x + 6},${y - 18} ${x + 14},${y - 14}`, "#5e5a4a", 2.2) +
        `<circle cx="${x - 13}" cy="${y - 20}" r="4.5" fill="#8e86a3" stroke="${INK}" stroke-width="1.5"/><circle cx="${x + 15}" cy="${y - 12}" r="4.5" fill="#a39aa6" stroke="${INK}" stroke-width="1.5"/>`;
    },
    violin([x, y], rot = -30) {
      return `<g transform="translate(${x} ${y}) rotate(${rot})">` +
        P("M-10,-6 C-22,-6 -22,12 -12,14 C-16,20 -18,32 -6,34 L6,34 C18,32 16,20 12,14 C22,12 22,-6 10,-6 C6,-12 -6,-12 -10,-6 Z", "#8b3f22", 2) +
        L("M-3,4 l-3,8 M3,4 l3,8", INK, 1.6) + P("M-3,-10 L3,-10 L2,-44 L-2,-44 Z", "#2a1a14", 1.6) +
        `<circle cx="0" cy="-47" r="4" fill="#2a1a14" stroke="${INK}" stroke-width="1.5"/>` + L("M-1,-40 L-1,30 M1,-40 L1,30", "#e8dcc0", 0.8) + `</g>`;
    },
    bow([x, y]) {
      return L(`M${x - 4},${y + 2} L${x + 46},${y - 44}`, "#6b4a2a", 2.6) + L(`M${x - 2},${y + 4} L${x + 48},${y - 41}`, "#efe6cf", 1.2);
    },
    crook([x, y]) {
      return tube(`M${x},${y + 110} L${x},${y - 70} Q${x},${y - 96} ${x + 18},${y - 92} Q${x + 30},${y - 86} ${x + 22},${y - 72}`, "#8a6a3e", 5);
    },
    honey([x, y]) {
      return P(`M${x - 12},${y - 4} Q${x - 16},${y + 20} ${x},${y + 22} Q${x + 16},${y + 20} ${x + 12},${y - 4} Z`, "#d79a2a", 2) +
        P(`M${x - 14},${y - 8} L${x + 14},${y - 8} L${x + 12},${y - 2} L${x - 12},${y - 2} Z`, "#8b5a2b", 1.8) +
        `<path d="M${x - 8},${y} q2,8 0,12" stroke="#f5c95a" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        `<text x="${x}" y="${y + 13}" font-size="6.5" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="${INK}">MIEL</text>`;
    },
    cane([x, y]) {
      return tube(`M${x},${y - 6} L${x - 6},${y + 118}`, "#1a1018", 4) +
        `<circle cx="${x + 1}" cy="${y - 14}" r="9" fill="#efe6d4" stroke="${INK}" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 16}" r="2.4" fill="${INK}"/><circle cx="${x + 4}" cy="${y - 16}" r="2.4" fill="${INK}"/>` +
        L(`M${x - 3},${y - 9} l2,2 l2,-2 l2,2`, INK, 1.2);
    },
    bolt([x, y]) {
      return P(`M${x + 2},${y - 50} L${x - 14},${y - 12} L${x - 2},${y - 12} L${x - 12},${y + 22} L${x + 16},${y - 24} L${x + 3},${y - 24} L${x + 14},${y - 50} Z`, "#f2c53d", 2.2) +
        `<path d="M${x + 2},${y - 50} L${x - 14},${y - 12}" stroke="#fff6c8" stroke-width="2" fill="none"/>`;
    },
    lorgnette([x, y]) {
      return tube(`M${x},${y + 4} L${x + 10},${y - 22}`, "#c9a24a", 2.5) +
        `<circle cx="${x + 2}" cy="${y - 30}" r="8" fill="#dfe8ee" fill-opacity=".5" stroke="#c9a24a" stroke-width="3"/><circle cx="${x + 20}" cy="${y - 30}" r="8" fill="#dfe8ee" fill-opacity=".5" stroke="#c9a24a" stroke-width="3"/>` +
        L(`M${x + 10},${y - 30} L${x + 12},${y - 30}`, "#c9a24a", 3);
    },
    mirror([x, y]) {
      return tube(`M${x},${y + 4} L${x - 4},${y - 16}`, "#d9a94a", 4) +
        `<ellipse cx="${x - 6}" cy="${y - 30}" rx="11" ry="14" fill="#cfe6ef" stroke="#d9a94a" stroke-width="4"/>` + L(`M${x - 11},${y - 36} l6,-4`, "#fff", 2);
    },
    sword([x, y]) {
      return P(`M${x - 3},${y - 6} L${x + 3},${y - 6} L${x + 2},${y - 86} L${x},${y - 96} L${x - 2},${y - 86} Z`, "#cfd3da", 2) +
        P(`M${x - 13},${y - 8} L${x + 13},${y - 8} L${x + 13},${y - 3} L${x - 13},${y - 3} Z`, "#b88a2e", 1.8);
    },
    caduceus([x, y]) {
      return tube(`M${x},${y + 96} L${x},${y - 60}`, "#d6b14a", 3) +
        L(`M${x - 8},${y - 50} Q${x + 10},${y - 40} ${x - 8},${y - 28} Q${x + 10},${y - 16} ${x - 6},${y - 2}`, "#5f8a4f", 2.6) +
        L(`M${x + 8},${y - 50} Q${x - 10},${y - 40} ${x + 8},${y - 28} Q${x - 10},${y - 16} ${x + 6},${y - 2}`, "#5f8a4f", 2.6) +
        P(`M${x},${y - 62} Q${x - 18},${y - 76} ${x - 22},${y - 58} Q${x - 10},${y - 64} ${x},${y - 60} Q${x + 10},${y - 64} ${x + 22},${y - 58} Q${x + 18},${y - 76} ${x},${y - 62} Z`, "#f2efe6", 1.6) +
        `<circle cx="${x}" cy="${y - 64}" r="4" fill="#d6b14a" stroke="${INK}" stroke-width="1.5"/>`;
    },
    duster([x, y]) {
      return tube(`M${x},${y} L${x + 8},${y - 34}`, "#6b4a2a", 3) +
        `<g transform="translate(${x + 10} ${y - 44})">${[...Array(7)].map((_, i) => `<ellipse cx="0" cy="-6" rx="4" ry="13" fill="${i % 2 ? "#9a8f82" : "#c9bfb0"}" stroke="${INK}" stroke-width="1.2" transform="rotate(${-60 + i * 20})"/>`).join("")}</g>`;
    },
    baton([x, y]) {
      return L(`M${x},${y} L${x + 30},${y - 30}`, INK, 3.4) + L(`M${x},${y} L${x + 30},${y - 30}`, "#f3ead6", 2);
    },
    heartArrow([x, y]) {
      return L(`M${x - 22},${y + 18} L${x + 26},${y - 30}`, "#8b5a2b", 2.4) +
        `<path d="M${x + 30},${y - 34} c-3,-6 -11,-3 -8,3 l5,8 l8,-5 c6,-3 3,-11 -5,-6 z" fill="#e0234e" stroke="${INK}" stroke-width="1.4"/>` +
        L(`M${x - 22},${y + 18} l-6,2 M${x - 22},${y + 18} l-2,6`, "#f2efe6", 2);
    },
    thyrsus([x, y]) {
      return tube(`M${x},${y + 100} L${x},${y - 66}`, "#8a6a3e", 3.5) +
        L(`M${x},${y - 50} q12,10 0,20 q-12,10 0,20`, "#3f7a3a", 2.4) +
        P(`M${x - 8},${y - 70} Q${x},${y - 96} ${x + 8},${y - 70} Q${x},${y - 62} ${x - 8},${y - 70} Z`, "#8a5a2a", 1.8) +
        L(`M${x - 6},${y - 76} l12,0 M${x - 5},${y - 82} l10,0`, "#5a3a1a", 1.4) +
        L(`M${x},${y - 64} q-14,14 -10,30 M${x},${y - 64} q14,10 12,28`, "#c4123b", 2.2);
    },
    lyre([x, y]) {
      return P(`M${x - 14},${y + 6} Q${x - 24},${y - 30} ${x - 10},${y - 38} L${x - 8},${y - 30} Q${x - 14},${y - 10} ${x - 6},${y + 6} Z M${x + 14},${y + 6} Q${x + 24},${y - 30} ${x + 10},${y - 38} L${x + 8},${y - 30} Q${x + 14},${y - 10} ${x + 6},${y + 6} Z`, "#d4a23a", 1.8) +
        P(`M${x - 16},${y + 4} L${x + 16},${y + 4} L${x + 16},${y + 10} L${x - 16},${y + 10} Z`, "#b0802a", 1.6) +
        L(`M${x - 6},${y + 4} L${x - 6},${y - 26} M${x},${y + 4} L${x},${y - 28} M${x + 6},${y + 4} L${x + 6},${y - 26} M${x - 12},${y - 28} L${x + 12},${y - 28}`, "#f6ecd0", 1.2);
    },
    trident([x, y]) {
      return tube(`M${x},${y + 100} L${x},${y - 56}`, "#4f7a8a", 3) +
        L(`M${x - 12},${y - 72} L${x - 12},${y - 52} Q${x},${y - 44} ${x + 12},${y - 52} L${x + 12},${y - 72} M${x},${y - 80} L${x},${y - 52}`, "#4f7a8a", 3.4);
    },
  };

  // flower crown helper
  function flowerCrown(colors, y = 52) {
    const pts = [[64, y + 18], [74, y + 6], [87, y - 2], [100, y - 5], [113, y - 2], [126, y + 6], [136, y + 18]];
    return pts.map(([x, yy], i) => `<circle cx="${x}" cy="${yy}" r="6.5" fill="${colors[i % colors.length]}" stroke="${INK}" stroke-width="1.6"/><circle cx="${x}" cy="${yy}" r="2" fill="#c58b2c"/>`).join("");
  }
  function leafCrown(color, y = 50, berries) {
    let s = "";
    const pts = [[62, y + 22], [70, y + 10], [80, y + 2], [92, y - 3], [108, y - 3], [120, y + 2], [130, y + 10], [138, y + 22]];
    pts.forEach(([x, yy], i) => {
      const a = -70 + i * 20;
      s += `<ellipse cx="${x}" cy="${yy}" rx="4.5" ry="9" fill="${color}" stroke="${INK}" stroke-width="1.5" transform="rotate(${a} ${x} ${yy})"/>`;
    });
    if (berries) [[76, y + 10], [90, y + 4], [110, y + 4], [124, y + 10]].forEach(([x, yy]) => {
      s += [[0, 0], [5, 3], [-4, 4], [1, 7]].map(([a, b]) => `<circle cx="${x + a}" cy="${yy + b}" r="3.2" fill="${berries}" stroke="${INK}" stroke-width="1"/>`).join("");
    });
    return s;
  }

  function curls(points, color, r = 9) {
    return points.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr || r}" fill="${color}" stroke="${INK}" stroke-width="2"/>`).join("");
  }

  // ---------------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------------
  const C = {};

  C.eur = (mood, o = {}) => {
    const v = o.variant || "alive";
    const ghost = v !== "alive";
    const skin = ghost ? "#bfd8e9" : "#f2e4d8";
    const hairC = ghost ? "#2c2a4c" : "#6e2433";
    const costume = o.costume || (v === "bacchante" ? { head: "ivy", garment: "fawn", hand: "thyrsus" } : {});
    const dressC = v === "alive" ? "#8ea6bd" : v === "bacchante" ? "#6a2a5e" : "#dcd6ec";
    const handProp = v === "alive" ? "bouquet" : costume.hand || (v === "ghost" ? "wilted" : null);
    const crown = () => {
      if (v === "alive") return flowerCrown(["#efe9f5", "#d98fa6", "#f0d36b"]);
      if (costume.head === "ivy") return leafCrown("#3f7a3a", 48, "#5b1f6a");
      if (costume.head === "laurel") return leafCrown("#b89b3a", 48);
      if (costume.head === "helmet") return P("M60,74 Q60,30 100,28 Q140,30 140,74 L132,74 Q128,46 100,44 Q72,46 68,74 Z", "#9a7a3a") + P("M96,28 Q100,6 128,10 Q110,16 104,28 Z", "#b3122e", 2);
      return flowerCrown(["#9d95b8", "#7c7499", "#b9b0cc"]);
    };
    const garment = () => {
      if (costume.garment === "fawn") {
        return P("M76,164 Q96,170 124,214 L132,290 Q104,300 86,276 Q90,230 76,164 Z", "#c49a5e", 2.2) +
          [[100, 200], [112, 230], [98, 250], [118, 262], [106, 280], [92, 226]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="#6b4520"/>`).join("");
      }
      if (costume.garment === "toga") return P("M74,164 Q100,180 128,166 L120,300 L80,300 Z", "#f1ece0", 2.2) + L("M80,180 Q100,220 122,190 M84,230 Q100,250 118,232", "#cfc6b4", 2);
      if (costume.garment === "gown") return P("M78,166 Q100,176 122,166 L148,316 L52,316 Z", "#d46a8c", 2.2) + L("M60,300 Q100,286 140,300", "#f4c1d0", 3);
      return "";
    };
    return puppet({
      skin,
      shade: ghost ? "#8fb2cc" : "#d9c2b4",
      head: HEADS.egg,
      face: { iris: ghost ? "#6c5fa8" : "#4e7a6a", lashes: true, cheeks: ghost ? null : "#e48a96", ring: ghost ? "#3f3a72" : "#6a4a5c" },
      hairBack: P("M62,78 C50,140 60,196 48,252 Q60,242 70,254 Q78,240 88,254 L100,170 L112,254 Q122,240 130,254 Q140,242 152,252 C140,196 150,140 138,78 Z", hairC),
      hair: P("M60,92 C54,48 92,28 124,40 C142,50 146,72 140,92 Q130,66 106,62 Q96,80 74,78 Q66,84 60,92 Z", hairC) + crown(),
      legs: { c1: ghost ? "#e9e6f4" : "#cfc9da", c2: ghost ? "#4a4470" : "#2e2838" },
      body: dress({ color: dressC, shade: ghost ? "#a99ec8" : "#5f7790", ragged: ghost, sash: v === "alive" ? "#5a6d86" : v === "bacchante" ? "#c4123b" : null, seed: 3 }) + garment(),
      arms: [[-1, o.pose || (v === "bacchante" ? "raise" : "down"), dressC], [1, handProp ? "hold" : "hip", dressC]],
      front: (h) => (handProp && props[handProp] ? props[handProp](h[1]) : ""),
    }, mood);
  };

  C.orp = (mood) => {
    const coat = tailcoat({ color: "#4e6079", shade: "#37455a", cravat: "#8c2338", buttons: "#c9a24a" });
    return puppet({
      skin: "#efdfcf",
      shade: "#d4bfae",
      head: HEADS.long,
      face: { iris: "#6a5a3a", eyeY: 90, mouthY: 128, bags: "#b9a3a8", ring: "#5a4a60" },
      hair: curls([[66, 74, 10], [72, 58], [84, 48, 11], [100, 44, 12], [116, 48, 11], [128, 58], [134, 74, 10], [80, 62, 8], [120, 62, 8]], "#211a22") + leafCrown("#8e9a5c", 46),
      behindLegs: coat.tails,
      legs: { trousers: true, c1: "#3b3644", c2: "#5d5868", top: 222 },
      body: coat.front,
      arms: [[-1, "hold", "#4e6079", { sh: 27 }], [1, "down", "#4e6079", { sh: 27 }]],
      front: (h) => props.violin([h[0][0] + 4, h[0][1] - 8], -24) + L(`M${h[1][0]},${h[1][1]} L${h[1][0] + 6},${h[1][1] - 70}`, "#d8c8a4", 2),
    }, mood);
  };

  C.ari = (mood) =>
    puppet({
      skin: "#f3dcc8",
      shade: "#dcbfa8",
      head: HEADS.round,
      face: { iris: "#c0142f", cheeks: "#ee7b86", ring: "#7a4a4a" },
      back: L("M128,282 Q160,270 150,240 Q146,226 156,220", "#b3122e", 4) + P("M150,214 L162,218 L154,228 Z", "#b3122e", 1.6),
      hair: curls([[64, 82], [70, 66], [82, 56], [100, 52, 10], [118, 56], [130, 66], [136, 82]], "#dca447"),
      hat: P("M40,64 Q100,36 160,64 Q100,74 40,64 Z", "#d8c27a") + P("M70,58 Q72,22 100,22 Q128,22 130,58 Q100,64 70,58 Z", "#e2cf8c") + P("M71,50 Q100,58 129,50 L130,58 Q100,64 70,58 Z", "#e88aa8", 1.8) + L("M128,54 Q146,64 140,82 M128,56 Q154,58 156,74", "#e88aa8", 3),
      legs: { c1: "#e9e2c6", c2: "#7d9a5c", top: 280 },
      body: dress({ color: "#a9bf8e", shade: "#7d9468", hem: 290, flare: 40, sash: "#8a6a3e", collar: "#f2ecd8" }),
      arms: [[-1, "hold", "#a9bf8e"], [1, "out", "#a9bf8e"]],
      front: (h) => props.honey([h[0][0] + 2, h[0][1] + 6]) + props.crook(h[1]),
    }, mood);

  C.plu = (mood) => {
    const coat = tailcoat({ color: "#a3122a", shade: "#6e0a1c", vest: "#1b1018", cravat: "#1b1018", buttons: "#e8b84a", lapel: "#1b1018" });
    return puppet({
      skin: "#cdbfdb",
      shade: "#a796bd",
      head: HEADS.long,
      face: { iris: "#e8a12a", eyeY: 90, mouthY: 126, ring: "#3a1a3a", brow: "#120a14", browW: 4 },
      back: P("M72,160 Q30,260 40,384 Q100,372 160,384 Q170,260 128,160 Z", "#1b1018") + P("M78,170 Q46,260 54,376 Q100,366 146,376 Q154,260 122,170 Z", "#7e0b22", 0),
      hair: P("M62,92 C58,52 82,38 100,40 C118,38 142,52 138,92 Q132,64 118,58 Q108,70 100,78 Q92,70 82,58 Q68,64 62,92 Z", "#120a14") +
        P("M74,52 Q66,30 64,18 Q80,30 84,46 Z M126,52 Q134,30 136,18 Q120,30 116,46 Z", "#7e0b22", 2) +
        P("M92,140 Q100,168 108,140 Q100,146 92,140 Z", "#120a14", 1.6),
      hat: `<g transform="rotate(-8 100 40)">` + P("M66,44 Q100,34 134,44 Q100,52 66,44 Z", "#120a14") + P("M76,42 L80,-6 Q100,-12 120,-6 L124,42 Q100,48 76,42 Z", "#1b1018") + P("M77,32 Q100,38 123,32 L124,42 Q100,48 76,42 Z", "#b3122e", 1.8) + `</g>`,
      behindLegs: coat.tails,
      legs: { trousers: true, c1: "#1b1018", c2: "#5e0a1a", top: 222 },
      body: coat.front,
      arms: [[-1, "hip", "#a3122a", { sh: 28 }], [1, "hold", "#a3122a", { sh: 28 }]],
      front: (h) => props.cane([h[1][0] + 8, h[1][1] - 2]),
    }, mood);
  };

  C.op = (mood) =>
    puppet({
      skin: "#dcdfcd",
      shade: "#b9bea6",
      head: HEADS.long,
      face: { iris: "#5a5a6a", eyeY: 90, mouthY: 130, nose: "long", ring: "#4a4a5a", lip: "#5a2a3a", browW: 3.6 },
      hairBack: P("M58,96 C52,40 80,26 100,26 C120,26 148,40 142,96 Q132,60 100,58 Q68,60 58,96 Z", "#8d8a96"),
      hair: P("M66,70 Q64,30 100,26 Q136,30 134,70 Q118,52 100,50 Q82,52 66,70 Z", "#8d8a96") + P("M72,30 Q70,-14 100,-18 Q130,-14 128,30 Q100,22 72,30 Z", "#9b98a4") + L("M84,0 Q100,6 116,0 M80,14 Q100,20 120,14", "#6f6c7a", 2) +
        P("M100,-18 Q116,-40 142,-34 Q122,-30 112,-14 Z", "#4a3a52", 1.8),
      body: P("M76,160 Q100,150 124,160 L128,212 Q156,300 156,384 L44,384 Q44,300 72,212 Z", "#5e4a63") +
        P("M88,150 Q100,146 112,150 L114,170 Q100,176 86,170 Z", "#5e4a63", 2) +
        L("M100,176 L100,380", "#3e2e44", 2) + [190, 214, 238, 262, 286].map((y) => `<circle cx="100" cy="${y}" r="3" fill="#c9a24a" stroke="${INK}" stroke-width="1"/>`).join("") +
        L("M64,300 Q100,316 136,300 M54,340 Q100,358 146,340", "#3e2e44", 2) + shoes(INK),
      neckTop: 128, neckBottom: 150, neckW: 12,
      arms: [[-1, "hip", "#5e4a63", { sh: 25, cuff: "#efe9dc" }], [1, "eye", "#5e4a63", { sh: 25, cuff: "#efe9dc" }]],
      front: (h) => props.lorgnette([h[1][0] - 4, h[1][1] + 14]),
    }, mood);

  C.jup = (mood) =>
    puppet({
      skin: "#f0cdb0",
      shade: "#dcae8c",
      head: HEADS.round,
      face: { iris: "#3a6aa8", eyeY: 84, mouthY: 118, nose: "bulb", noseColor: "#e9a98e", ring: "#7a5a5a", brow: "#f4f1ea", browW: 5 },
      back: P("M60,168 Q34,250 40,384 L160,384 Q166,250 140,168 Z", "#4a2270"),
      hair: curls([[60, 86, 11], [64, 66, 11], [76, 52, 11], [92, 44, 11], [108, 44, 11], [124, 52, 11], [136, 66, 11], [140, 86, 11]], "#f4f1ea") +
        leafCrown("#e2b23a", 42),
      underFace: curls([[66, 110, 10], [70, 126, 11], [80, 140, 12], [94, 148, 12], [106, 148, 12], [120, 140, 12], [130, 126, 11], [134, 110, 10], [100, 160, 11], [86, 158, 10], [114, 158, 10]], "#f4f1ea") +
        `<ellipse cx="100" cy="128" rx="22" ry="14" fill="#f0cdb0"/>`,
      body: P("M64,168 Q100,156 136,168 Q150,260 150,380 L50,380 Q50,260 64,168 Z", "#5b2a86") +
        P("M66,170 Q110,200 136,300 L132,380 L112,380 Q104,280 66,190 Z", "#efe9dc", 2.2) + L("M60,378 L140,378", "#e2b23a", 5) +
        P("M78,380 L92,380 L92,388 L70,388 Z M108,380 L122,380 L130,388 L108,388 Z", "#8a6a3e", 2),
      neckTop: 130, neckBottom: 170, neckW: 14,
      arms: [[-1, "hip", "#5b2a86", { sh: 32, w: 13 }], [1, "raise", "#5b2a86", { sh: 32, w: 13 }]],
      front: (h) => props.bolt(h[1]) + L("M76,168 Q100,176 124,168", "#e2b23a", 4),
    }, mood);

  C.juno = (mood) =>
    puppet({
      skin: "#f1dfd6",
      shade: "#d7bdb2",
      head: HEADS.egg,
      face: { iris: "#2a7a7a", lashes: true, ring: "#2a4a5a", lip: "#7a1a2a", mole: [16, 112] },
      back: [...Array(9)].map((_, i) => {
        const a = -80 + i * 20, rad = (a * Math.PI) / 180;
        const x = 100 + Math.sin(rad) * 70, y = 70 - Math.cos(rad) * 62;
        return L(`M100,80 L${x.toFixed(1)},${y.toFixed(1)}`, "#2f6f4a", 2) + `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="13" fill="#1f8a7a" stroke="${INK}" stroke-width="1.6" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#1c3f9a"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#e8c24a"/>`;
      }).join(""),
      hair: P("M60,94 C54,46 82,28 100,30 C118,28 146,46 140,94 Q132,62 100,60 Q68,62 60,94 Z", "#5a1e22") + P("M74,40 Q72,8 100,6 Q128,8 126,40 Q100,30 74,40 Z", "#5a1e22") +
        P("M70,46 L78,26 L88,40 L100,20 L112,40 L122,26 L130,46 Q100,38 70,46 Z", "#e2b23a", 2),
      body: P("M74,164 Q100,154 126,164 L118,216 Q148,300 150,384 L50,384 Q52,300 82,216 Z", "#1f5a62") + L("M82,214 L118,214", "#e2b23a", 6) + L("M100,222 L100,380", "#163f45", 2) + shoes("#1f5a62"),
      arms: [[-1, "hip", "#1f5a62"], [1, "hip", "#1f5a62"]],
    }, mood);

  C.dia = (mood) =>
    puppet({
      skin: "#efe3dc",
      shade: "#d4c1b8",
      head: HEADS.egg,
      face: { iris: "#3f6a4a", lashes: true, ring: "#4a5a5a" },
      back: P("M120,170 L140,160 L150,262 L132,268 Z", "#6b4a2a", 2) + L("M138,162 l4,-14 M144,160 l6,-12 M132,164 l0,-14", "#cfc6b4", 3),
      hairBack: P("M110,40 Q160,30 156,90 Q152,140 166,190 Q142,170 136,120 Q130,80 110,60 Z", "#e1d9c0"),
      hair: P("M60,92 C54,46 88,30 112,36 C140,44 146,70 140,92 Q130,64 104,60 Q84,72 60,92 Z", "#e1d9c0") + P("M82,40 Q100,14 120,30 Q104,26 96,40 Q90,34 82,40 Z", "#f4f1e6", 2),
      legs: { c1: "#2a3a2e", c2: "#7d9a7c", top: 272 },
      body: dress({ color: "#4f7a5a", shade: "#355a40", hem: 278, flare: 36, sash: "#8a6a3e", ragged: true, seed: 11 }) + P("M124,220 Q138,226 136,240 Q126,244 120,232 Z", "#d6b14a", 1.8),
      arms: [[-1, "out", "#4f7a5a"], [1, "chest", "#4f7a5a"]],
      front: (h) => P(`M${h[0][0] + 6},${h[0][1] - 60} Q${h[0][0] - 24},${h[0][1]} ${h[0][0] + 6},${h[0][1] + 60}`, "none", 3.4) + L(`M${h[0][0] + 6},${h[0][1] - 60} L${h[0][0] + 6},${h[0][1] + 60}`, "#efe6cf", 1.2),
    }, mood);

  C.ven = (mood) =>
    puppet({
      skin: "#f6dcd6",
      shade: "#dfbcb4",
      head: HEADS.egg,
      face: { iris: "#a8487a", lashes: true, cheeks: "#ef7f9a", lip: "#b3122e", mole: [-18, 116], ring: "#7a3a5a" },
      hairBack: curls([[58, 110, 12], [56, 132, 11], [142, 110, 12], [144, 132, 11]], "#e8b56a"),
      hair: curls([[60, 88, 11], [64, 68, 12], [78, 52, 12], [94, 42, 12], [110, 42, 12], [124, 52, 12], [136, 68, 12], [140, 88, 11], [88, 26, 11], [108, 24, 12], [98, 12, 10]], "#e8b56a") +
        P("M112,40 L130,26 Q138,40 126,50 Z", "#f5e1d2", 1.8) + L("M114,40 L128,30 M116,44 L132,38", "#d9b4a2", 1.2),
      legs: { c1: "#f4d6de", c2: "#b03a62" },
      body: dress({ color: "#d4688c", shade: "#a8486c", flare: 54, sash: "#f4d6de", ragged: false }) + L("M60,296 Q80,288 100,298 Q120,288 140,296", "#f8c2d2", 4) +
        [...Array(9)].map((_, i) => `<circle cx="${84 + i * 4}" cy="${166 + Math.sin((i / 8) * Math.PI) * 9}" r="2.4" fill="#fbf6ee" stroke="${INK}" stroke-width=".8"/>`).join(""),
      arms: [[-1, "hip", "#d4688c"], [1, "hold", "#d4688c"]],
      front: (h) => props.mirror([h[1][0] + 6, h[1][1]]),
    }, mood);

  C.cup = (mood) =>
    puppet({
      skin: "#f7dac6",
      shade: "#e3b9a2",
      head: HEADS.baby,
      scale: 0.66,
      face: { iris: "#3a7ab8", cheeks: "#f27a8a", eyeY: 94, mouthY: 122, ring: "#8a6a6a" },
      back: P("M80,190 Q30,150 34,200 Q40,230 80,214 Z", "#f6eef2") + P("M120,190 Q170,150 166,200 Q160,230 120,214 Z", "#f6eef2") + L("M50,190 Q60,200 76,204 M150,190 Q140,200 124,204", "#e7b8c8", 2),
      hair: curls([[66, 86, 9], [70, 70, 10], [84, 58, 10], [100, 54, 10], [116, 58, 10], [130, 70, 10], [134, 86, 9]], "#f2cf6a"),
      legs: { c1: "#f7dac6", c2: "#f7dac6", top: 272 },
      body: P("M78,168 Q100,156 122,168 Q134,220 128,276 L72,276 Q66,220 78,168 Z", "#f7dac6") + P("M70,236 Q100,226 130,236 L134,280 Q100,294 66,280 Z", "#f2efe6"),
      neckTop: 132, neckBottom: 170, neckW: 14,
      arms: [[-1, "out", "#f7dac6", { w: 12 }], [1, "hold", "#f7dac6", { w: 12 }]],
      front: (h) => props.heartArrow([h[1][0] + 4, h[1][1]]) + P(`M${h[0][0] + 4},${h[0][1] - 40} Q${h[0][0] - 20},${h[0][1]} ${h[0][0] + 4},${h[0][1] + 40}`, "none", 3),
    }, mood);

  C.mar = (mood) =>
    puppet({
      skin: "#e5c4a8",
      shade: "#c9a286",
      head: HEADS.round,
      face: { iris: "#5a3a2a", ring: "#5a3a3a", browW: 5 },
      back: P("M72,164 Q40,260 52,330 L148,330 Q160,260 128,164 Z", "#a3122a"),
      underFace: P("M76,118 Q88,108 100,114 Q112,108 124,118 Q118,128 100,120 Q82,128 76,118 Z", "#2a1a14", 2),
      hat: P("M58,94 Q56,30 100,26 Q144,30 142,94 L132,96 L130,70 L70,70 L68,96 Z", "#b0803a") + P("M70,66 L130,66 L130,74 L70,74 Z", "#8a5a1a", 1.8) +
        P("M74,30 Q100,-12 132,8 Q150,22 140,40 Q120,20 74,30 Z", "#c4123b") + L("M86,20 Q100,8 120,10 M84,26 Q104,14 128,18", "#8a0a20", 2),
      legs: { c1: "#e5c4a8", c2: "#7a4a2a", top: 270 },
      body: P("M70,162 Q100,150 130,162 L126,240 Q100,250 74,240 Z", "#b88a3a") + L("M100,170 L100,236 M84,190 Q100,200 116,190", "#8a5a1a", 2.4) +
        [...Array(7)].map((_, i) => P(`M${72 + i * 8},240 L${80 + i * 8},240 L${80 + i * 8},282 L${72 + i * 8},282 Z`, "#a3122a", 1.6)).join(""),
      neckW: 14,
      arms: [[-1, "hip", "#e5c4a8", { sh: 32, w: 12 }], [1, "raise", "#e5c4a8", { sh: 32, w: 12 }]],
      front: (h) => props.sword([h[1][0], h[1][1] + 4]),
    }, mood);

  C.mer = (mood) =>
    puppet({
      skin: "#f0dcc8",
      shade: "#d6bea8",
      head: HEADS.egg,
      face: { iris: "#2a8a5a", cheeks: "#e8907a" },
      hair: curls([[62, 92, 8], [64, 76, 9], [136, 76, 9], [138, 92, 8]], "#d8682a"),
      hat: P("M60,72 Q60,30 100,28 Q140,30 140,72 Q100,62 60,72 Z", "#c9ccd4") + P("M48,74 Q100,60 152,74 Q100,82 48,74 Z", "#aeb2bc") +
        P("M60,56 Q30,36 22,50 Q34,48 30,58 Q40,54 40,64 Q50,58 60,64 Z", "#fbf8f0", 1.8) + P("M140,56 Q170,36 178,50 Q166,48 170,58 Q160,54 160,64 Q150,58 140,64 Z", "#fbf8f0", 1.8),
      legs: { c1: "#f0dcc8", c2: "#f0dcc8", top: 270 },
      body: dress({ color: "#d99a2b", shade: "#a8701a", hem: 270, flare: 34, sash: "#6b4a2a", ragged: true, seed: 5 }) +
        P("M64,382 Q54,370 58,362 Q66,372 76,374 Z M136,382 Q146,370 142,362 Q134,372 124,374 Z", "#fbf8f0", 1.6),
      arms: [[-1, "raise", "#f0dcc8"], [1, "hold", "#f0dcc8"]],
      front: (h) => props.caduceus([h[1][0] + 6, h[1][1]]),
    }, mood);

  C.sty = (mood) =>
    puppet({
      skin: "#b9cad0",
      shade: "#93a8b0",
      head: HEADS.long,
      face: { iris: "#6a7a5a", eyeY: 92, mouthY: 132, nose: "long", bags: "#6a6a8a", ring: "#3a3a5a" },
      hair: L("M66,90 Q58,60 74,52 M134,90 Q142,60 126,52 M70,100 q-10,20 -6,34 M130,100 q10,20 6,34", "#d8dad6", 3),
      hat: `<g transform="rotate(14 100 40)">` + P("M70,52 L72,24 L84,38 L94,18 L104,36 L116,20 L122,40 L130,26 L130,52 Q100,46 70,52 Z", "#a39b6a") + L("M84,46 l3,-4 M110,44 l4,3", INK, 1.4) + `</g>`,
      legs: { trousers: true, c1: "#4a5040", c2: "#5d6b4f", top: 234 },
      body: P("M78,164 Q100,156 122,164 L126,252 L74,252 Z", "#5d6b4f") + P("M94,164 L100,206 L106,164 Z", "#d8d0bc", 1.6) +
        P("M104,218 L116,218 L116,232 L104,232 Z", "#7a6a4a", 1.6) + L("M106,220 l8,10 M114,220 l-8,10", "#3a3a2a", 1) +
        [178, 196, 214, 232].map((y) => `<circle cx="88" cy="${y}" r="2.4" fill="#a39b6a"/>`).join(""),
      neckTop: 130, neckW: 8,
      arms: [[-1, "down", "#5d6b4f", { sh: 21 }], [1, "hold", "#5d6b4f", { sh: 21 }]],
      front: (h) => props.duster(h[1]),
    }, mood);

  C.off = (mood) =>
    puppet({
      skin: "#ecd9c0",
      shade: "#d4bc9c",
      head: HEADS.long,
      face: { iris: "#4a3a2a", eyeY: 88, mouthY: 130, nose: "long", ring: "#5a4a3a", brow: "#4a3a2a" },
      hair: curls([[64, 70, 10], [70, 54, 11], [84, 44, 11], [100, 40, 11], [116, 44, 11], [130, 54, 11], [136, 70, 10]], "#4a3a2e") +
        P("M64,84 Q56,120 70,150 Q80,156 84,140 Q74,118 74,94 Z M136,84 Q144,120 130,150 Q120,156 116,140 Q126,118 126,94 Z", "#6a5440", 2) +
        `<circle cx="85" cy="88" r="10" fill="#e8f0f4" fill-opacity=".25" stroke="#b8952e" stroke-width="2"/><circle cx="115" cy="88" r="10" fill="#e8f0f4" fill-opacity=".25" stroke="#b8952e" stroke-width="2"/>` + L("M95,87 Q100,84 105,87 M125,90 Q140,110 136,160", "#b8952e", 1.4),
      behindLegs: P("M80,214 L70,322 L100,312 L130,322 L120,214 Z", "#4a3428"),
      legs: { trousers: true, c1: "#2a2228", c2: "#4a4048", top: 222 },
      body: P("M72,164 Q100,154 128,164 L124,232 L76,232 Z", "#5a4030") + P("M90,162 L100,212 L110,162 Z", "#efe9dc", 1.8) +
        P("M70,160 Q100,178 130,160 Q138,178 128,196 Q100,186 72,196 Q62,178 70,160 Z", "#9b7c5c", 2) + L("M76,170 l4,6 M88,176 l2,6 M112,176 l-2,6 M124,170 l-4,6", "#6e5440", 1.5) +
        P("M100,170 L92,164 L92,176 Z M100,170 L108,164 L108,176 Z", INK, 1.2),
      arms: [[-1, "down", "#5a4030", { sh: 27 }], [1, "raise", "#5a4030", { sh: 27 }]],
      front: (h) => props.baton([h[1][0] - 2, h[1][1] + 2]),
    }, mood);

  C.fly = (mood) => {
    const happy = mood === "happy" || mood === "love";
    return `<svg class="puppet fly" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg"><g class="figure"><g transform="translate(100 210)">
      <ellipse class="wing" cx="-34" cy="-30" rx="34" ry="16" fill="#dff0ff" fill-opacity=".7" stroke="${INK}" stroke-width="2" transform="rotate(-30 -34 -30)"/>
      <ellipse class="wing" cx="34" cy="-30" rx="34" ry="16" fill="#dff0ff" fill-opacity=".7" stroke="${INK}" stroke-width="2" transform="rotate(30 34 -30)"/>
      <ellipse cx="0" cy="22" rx="24" ry="30" fill="#2a2a2a" stroke="${INK}" stroke-width="2.4"/>
      <path d="M-22,14 Q0,24 22,14 M-22,30 Q0,40 22,30" stroke="#e2b23a" stroke-width="4" fill="none"/>
      <circle cx="0" cy="-12" r="22" fill="#3a3030" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="-12" cy="-16" r="11" fill="#c0142f" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="-16" r="11" fill="#c0142f" stroke="${INK}" stroke-width="2"/>
      <circle cx="-9" cy="-19" r="3" fill="#fff"/><circle cx="15" cy="-19" r="3" fill="#fff"/>
      ${curls([[-16, 4, 7], [-6, 10, 7], [6, 10, 7], [16, 4, 7], [0, 16, 6]], "#f4f1ea")}
      <path d="${happy ? "M-6,0 Q0,7 6,0" : "M-5,2 L5,2"}" stroke="${INK}" stroke-width="2.2" fill="none"/>
      <path d="M-14,-34 L-10,-46 L-4,-36 L0,-48 L4,-36 L10,-46 L14,-34 Z" fill="#e2b23a" stroke="${INK}" stroke-width="1.6"/>
      <path d="M-18,40 l-14,18 M18,40 l14,18 M-20,24 l-18,8 M20,24 l18,8" stroke="${INK}" stroke-width="2.4" fill="none"/>
    </g></g></svg>`;
  };

  // Character metadata (name tags / colors)
  const META = {
    eur: { name: "Eurydice", color: "#8ea6bd" },
    orp: { name: "Orpheus", color: "#6c86a6" },
    ari: { name: "Aristaeus", color: "#a9bf8e" },
    plu: { name: "Pluto", color: "#c4123b" },
    op: { name: "Public Opinion", color: "#8f7896" },
    jup: { name: "Jupiter", color: "#8a5ac0" },
    juno: { name: "Juno", color: "#2a8a8a" },
    dia: { name: "Diana", color: "#5f9a6a" },
    ven: { name: "Venus", color: "#e07a9c" },
    cup: { name: "Cupid", color: "#f2a0b8" },
    mar: { name: "Mars", color: "#c4123b" },
    mer: { name: "Mercury", color: "#e0a83a" },
    sty: { name: "John Styx", color: "#8aa0a8" },
    off: { name: "Jacques Offenbach", color: "#c9a24a" },
    fly: { name: "A Golden Fly", color: "#e2b23a" },
  };

  function character(id, mood = "neutral", opts = {}) {
    const fn = C[id];
    return fn ? fn(mood, opts) : "";
  }

  // ---------------------------------------------------------------------------
  // Backdrops (viewBox 400x700, characters stand at ~y 470)
  // ---------------------------------------------------------------------------
  const svgBg = (inner, defs = "") =>
    `<svg class="bg-svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;

  function spiralHill(x, y, w, h, color) {
    return `<path d="M${x - w},${y} Q${x - w * 0.6},${y - h} ${x},${y - h} Q${x + w * 0.35},${y - h} ${x + w * 0.3},${y - h * 0.75} Q${x + w * 0.25},${y - h * 0.55} ${x + w * 0.1},${y - h * 0.62} Q${x + w * 0.5},${y - h * 0.4} ${x + w},${y} Z" fill="${color}"/>`;
  }

  function curlyTree(x, y, s, color) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-linecap="round">
      <path d="M0,0 C-6,-60 10,-110 -4,-170" stroke-width="16"/>
      <path d="M-2,-120 C-40,-130 -50,-170 -30,-180 C-18,-186 -14,-170 -24,-166" stroke-width="7"/>
      <path d="M-4,-150 C30,-170 60,-160 56,-200 C54,-214 40,-210 44,-200" stroke-width="7"/>
      <path d="M-4,-170 C-10,-200 10,-220 0,-236 C-6,-246 -16,-236 -8,-230" stroke-width="5"/>
      <path d="M2,-90 C30,-96 40,-120 30,-130" stroke-width="5"/></g>`;
  }

  function wheat(x0, x1, y, color, seed, h = 50) {
    const r = rng(seed);
    let s = "";
    for (let x = x0; x < x1; x += 7) {
      const hh = h * (0.7 + r() * 0.5), lean = (r() - 0.5) * 14;
      s += `<path d="M${x},${y} Q${x + lean * 0.4},${y - hh * 0.6} ${x + lean},${y - hh}" stroke="${color}" stroke-width="2" fill="none"/>`;
      s += `<ellipse cx="${x + lean}" cy="${y - hh - 6}" rx="3" ry="8" fill="${color}" transform="rotate(${lean * 2} ${x + lean} ${y - hh - 6})"/>`;
    }
    return s;
  }

  function stars(n, seed, h = 300, color = "#fff") {
    const r = rng(seed);
    let s = "";
    for (let i = 0; i < n; i++) s += `<circle class="twinkle" style="animation-delay:${(r() * 4).toFixed(2)}s" cx="${(r() * 400).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(0.6 + r() * 1.4).toFixed(1)}" fill="${color}"/>`;
    return s;
  }

  function bulbs(points, color = "#ffd77a") {
    return points.map(([x, y], i) => `<circle class="bulb${i % 2 ? " alt" : ""}" cx="${x}" cy="${y}" r="3.4" fill="${color}"/>`).join("");
  }

  function windmill(x, y, s) {
    const sails = [0, 90, 180, 270].map((a) => `<g transform="rotate(${a})"><path d="M-6,0 L-10,-110 L10,-110 L6,0 Z" fill="#2a0a14" stroke="#ff4a6a" stroke-width="2"/>${[...Array(5)].map((_, i) => `<path d="M-9,${-24 - i * 18} L9,${-24 - i * 18}" stroke="#ff4a6a" stroke-width="1.2"/>`).join("")}</g>`).join("");
    const bulbRow = [...Array(9)].map((_, i) => [x - 34 + i * 8.5, y - 40]);
    return `<g transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})">
      <path d="M${x - 40},${y + 120} L${x - 28},${y - 30} L${x + 28},${y - 30} L${x + 40},${y + 120} Z" fill="#7d0a1e" stroke="#ff4a6a" stroke-width="2"/>
      <path d="M${x - 36},${y - 28} L${x},${y - 66} L${x + 36},${y - 28} Z" fill="#4a0612" stroke="#ff4a6a" stroke-width="2"/>
      <rect x="${x - 10}" y="${y + 30}" width="20" height="30" rx="10" fill="#ffcf6a" opacity=".8"/>
      ${bulbs(bulbRow)}
      <g class="sails" style="transform-origin:${x}px ${y - 40}px"><g transform="translate(${x} ${y - 40})">${sails}<circle r="9" fill="#ffcf6a" stroke="#2a0a14" stroke-width="2"/></g></g>
    </g>`;
  }

  function column(x, y, h, color, shade) {
    return `<rect x="${x - 16}" y="${y - h}" width="32" height="${h}" fill="${color}"/>` +
      [...Array(4)].map((_, i) => `<line x1="${x - 10 + i * 7}" y1="${y - h + 6}" x2="${x - 10 + i * 7}" y2="${y - 4}" stroke="${shade}" stroke-width="2"/>`).join("") +
      `<rect x="${x - 22}" y="${y - h - 10}" width="44" height="12" rx="3" fill="${color}" stroke="${shade}" stroke-width="2"/><rect x="${x - 22}" y="${y - 6}" width="44" height="10" fill="${color}" stroke="${shade}" stroke-width="2"/>`;
  }

  function cloud(x, y, s, color, op = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op}" fill="${color}"><ellipse cx="0" cy="0" rx="50" ry="20"/><circle cx="-24" cy="-10" r="20"/><circle cx="6" cy="-20" r="24"/><circle cx="32" cy="-8" r="18"/></g>`;
  }

  const BG = {
    stage() {
      const curtainL = `<path d="M0,0 L120,0 Q90,200 110,470 L0,470 Z" fill="url(#vel)"/>` + [20, 50, 80].map((x) => `<path d="M${x},0 Q${x - 10},240 ${x + 6},470" stroke="#4a0410" stroke-width="5" fill="none" opacity=".6"/>`).join("");
      const curtainR = `<g transform="translate(400 0) scale(-1 1)">${curtainL}</g>`;
      const arch = [...Array(19)].map((_, i) => [20 + i * 20, 22]);
      return svgBg(
        `<rect width="400" height="700" fill="#170a12"/>
        <path d="M120,0 L280,0 L340,470 L60,470 Z" fill="url(#beam)"/>
        <rect x="0" y="470" width="400" height="230" fill="url(#boards)"/>
        ${[...Array(9)].map((_, i) => `<line x1="${i * 50}" y1="470" x2="${i * 50 - 40}" y2="700" stroke="#2a1208" stroke-width="2"/>`).join("")}
        <ellipse cx="200" cy="476" rx="150" ry="20" fill="#ffe2a0" opacity=".18"/>
        ${curtainL}${curtainR}
        <path d="M0,0 L400,0 L400,46 Q200,80 0,46 Z" fill="url(#vel)"/>
        <path d="M0,46 Q200,80 400,46" stroke="#e8b04a" stroke-width="4" fill="none"/>
        ${bulbs(arch)}
        ${[...Array(9)].map((_, i) => `<ellipse cx="${30 + i * 43}" cy="478" rx="9" ry="5" fill="#ffd77a" class="bulb${i % 2 ? " alt" : ""}"/>`).join("")}`,
        `<linearGradient id="vel" x1="0" x2="1"><stop offset="0" stop-color="#5a0614"/><stop offset=".5" stop-color="#a8122e"/><stop offset="1" stop-color="#6a0818"/></linearGradient>
         <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c8" stop-opacity=".35"/><stop offset="1" stop-color="#fff2c8" stop-opacity=".05"/></linearGradient>
         <linearGradient id="boards" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3a1e"/><stop offset="1" stop-color="#2a1208"/></linearGradient>`
      );
    },
    thebes(field) {
      return svgBg(
        `<rect width="400" height="700" fill="url(#sky)"/>
        <circle cx="300" cy="120" r="54" fill="#e9e4d6" opacity=".9"/>
        <path d="M300,120 m-30,0 a30,30 0 1,1 30,30 a20,20 0 1,1 -20,-20 a10,10 0 1,1 10,10" fill="none" stroke="#cfc8b6" stroke-width="3"/>
        ${cloud(90, 110, 0.9, "#a8b1ba", 0.7)}${cloud(250, 200, 0.6, "#a8b1ba", 0.5)}
        ${spiralHill(80, 420, 140, 150, "#6f7b86")}${spiralHill(330, 420, 160, 120, "#5f6b77")}
        ${spiralHill(200, 440, 220, 90, "#56606a")}
        ${field
          ? `<g transform="translate(250 300)"><path d="M0,140 L0,60 L80,60 L80,140 Z" fill="#8a8374" stroke="${INK}" stroke-width="2"/><path d="M-14,66 Q40,-10 94,66 Z" fill="#b8a26a" stroke="${INK}" stroke-width="2"/><rect x="30" y="94" width="22" height="46" fill="#3d3a45"/>${[0, 1, 2].map((i) => `<g transform="translate(${-70 + i * 30} 112)"><path d="M0,28 Q-2,0 12,-2 Q26,0 24,28 Z" fill="#c9a24a" stroke="${INK}" stroke-width="1.6"/>${[6, 13, 20].map((y) => `<path d="M0,${y} Q12,${y + 3} 24,${y}" stroke="#8a6a2a" fill="none"/>`).join("")}</g>`).join("")}</g>`
          : `<g transform="translate(262 270) rotate(3)"><path d="M0,190 L6,70 L110,64 L118,190 Z" fill="#8c8478" stroke="${INK}" stroke-width="2.4"/><path d="M-16,76 L58,0 L134,70 Z" fill="#3d3a45" stroke="${INK}" stroke-width="2.4"/><circle cx="58" cy="60" r="14" fill="#e8c87a" stroke="${INK}" stroke-width="2"/><rect x="18" y="110" width="30" height="80" fill="#4a3a32" stroke="${INK}" stroke-width="2"/><rect x="64" y="104" width="34" height="30" fill="#e8c87a" stroke="${INK}" stroke-width="2"/><g transform="translate(-58 96) rotate(-6)"><line x1="40" y1="-30" x2="40" y2="0" stroke="${INK}" stroke-width="2"/><rect x="-6" y="0" width="92" height="30" fill="#cbbf9e" stroke="${INK}" stroke-width="2"/><text x="40" y="13" font-size="9" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="${INK}">VIOLIN</text><text x="40" y="24" font-size="9" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" fill="${INK}">LESSONS</text></g></g>`}
        ${curlyTree(48, 470, 1, "#2f3540")}
        <g transform="translate(150 470)"><rect x="-10" y="-60" width="20" height="60" fill="#c9c2b2"/><path d="M-10,-60 L10,-60 L4,-72 L-6,-66 Z" fill="#c9c2b2"/>${[...Array(3)].map((_, i) => `<line x1="${-6 + i * 6}" y1="-56" x2="${-6 + i * 6}" y2="-4" stroke="#a8a090" stroke-width="1.5"/>`).join("")}</g>
        <rect x="0" y="440" width="400" height="260" fill="#6d6a58"/>
        ${wheat(0, 400, 470, "#b9a97c", 4, field ? 64 : 40)}
        <rect x="0" y="468" width="400" height="232" fill="#5e5a4a"/>
        <path class="petals" d="" />`,
        `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f7c8b"/><stop offset=".6" stop-color="#aab3b9"/><stop offset="1" stop-color="#c8c6bc"/></linearGradient>`
      );
    },
    field() { return BG.thebes(true); },
    sky() {
      return svgBg(
        `<rect width="400" height="700" fill="url(#sk)"/>${stars(40, 9, 400)}
        ${cloud(80, 160, 1.2, "#efe6f6", 0.8)}${cloud(320, 280, 1, "#e6dcf0", 0.7)}${cloud(160, 400, 1.5, "#f4eefa", 0.9)}${cloud(330, 470, 1.6, "#fbf8fd")}${cloud(60, 480, 1.4, "#fbf8fd")}
        <rect x="0" y="480" width="400" height="220" fill="#f4eefa"/>`,
        `<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a5a"/><stop offset=".6" stop-color="#9a8ac0"/><stop offset="1" stop-color="#f0d8c8"/></linearGradient>`
      );
    },
    olympus() {
      return svgBg(
        `<rect width="400" height="700" fill="url(#ol)"/>
        <circle cx="200" cy="150" r="120" fill="#fff6d8" opacity=".5"/>
        <path d="M20,90 L200,20 L380,90 Z" fill="#efe6d6" stroke="#c9b48a" stroke-width="3"/>
        <rect x="20" y="88" width="360" height="18" fill="#e6dcc8" stroke="#c9b48a" stroke-width="2"/>
        ${[50, 130, 270, 350].map((x) => column(x, 440, 330, "#efe8dc", "#cdbf9e")).join("")}
        <path d="M80,106 Q120,170 160,106 M240,106 Q280,170 320,106" stroke="#d9a6b0" stroke-width="10" fill="none" opacity=".7"/>
        <g transform="translate(200 410)"><rect x="-90" y="0" width="180" height="12" fill="#c9a24a" stroke="${INK}" stroke-width="2"/><rect x="-80" y="12" width="8" height="40" fill="#a8822a"/><rect x="72" y="12" width="8" height="40" fill="#a8822a"/>
          ${[-60, -20, 20, 60].map((x) => `<path d="M${x - 8},-22 L${x + 8},-22 L${x + 4},-2 L${x - 4},-2 Z M${x - 2},-2 L${x + 2},-2 L${x + 2},0 L${x - 2},0Z" fill="#e2b23a" stroke="${INK}" stroke-width="1.5"/>`).join("")}
          <ellipse cx="0" cy="-8" rx="22" ry="10" fill="#d9a6b0" stroke="${INK}" stroke-width="1.5"/></g>
        ${cloud(40, 470, 1.6, "#f6f0fa")}${cloud(200, 480, 2, "#fbf8fd")}${cloud(360, 470, 1.6, "#f6f0fa")}
        <rect x="0" y="476" width="400" height="224" fill="#efe8f4"/>
        ${cloud(100, 520, 1.6, "#e2d8ec", 0.7)}${cloud(300, 560, 1.8, "#e2d8ec", 0.7)}`,
        `<linearGradient id="ol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9aed0"/><stop offset=".55" stop-color="#e9dcc8"/><stop offset="1" stop-color="#f6efe0"/></linearGradient>`
      );
    },
    descent() {
      return svgBg(
        `<rect width="400" height="700" fill="url(#ds)"/>
        ${[...Array(7)].map((_, i) => `<ellipse cx="200" cy="${300 + i * 20}" rx="${260 - i * 34}" ry="${120 - i * 14}" fill="none" stroke="#ff5a2a" stroke-opacity="${0.1 + i * 0.08}" stroke-width="10"/>`).join("")}
        <path d="M0,470 Q100,430 200,470 Q300,430 400,470 L400,700 L0,700 Z" fill="#2a0610"/>`,
        `<radialGradient id="ds" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#ffb04a"/><stop offset=".35" stop-color="#c4123b"/><stop offset="1" stop-color="#1a0410"/></radialGradient>`
      );
    },
    boudoir() {
      const damask = `<pattern id="dm" width="40" height="50" patternUnits="userSpaceOnUse"><rect width="40" height="50" fill="#5a0c1c"/><path d="M20,6 Q30,16 20,26 Q10,16 20,6 Z M20,26 Q34,34 20,46 Q6,34 20,26 Z" fill="#7a1a2c"/><circle cx="0" cy="25" r="3" fill="#7a1a2c"/><circle cx="40" cy="25" r="3" fill="#7a1a2c"/></pattern>`;
      return svgBg(
        `<rect width="400" height="700" fill="url(#dm)"/>
        <rect x="0" y="380" width="400" height="90" fill="#3a0610"/><line x1="0" y1="380" x2="400" y2="380" stroke="#e2b23a" stroke-width="5"/>
        <g transform="translate(110 200)"><path d="M0,40 C-70,-20 -40,-90 0,-50 C40,-90 70,-20 0,40 Z" fill="#cfe2ea" stroke="#e2b23a" stroke-width="9"/><path d="M-24,-40 q8,-10 18,-8" stroke="#fff" stroke-width="4" fill="none"/></g>
        <g transform="translate(320 240)"><rect x="-56" y="-150" width="112" height="230" rx="56" fill="#2a0408" stroke="#e2b23a" stroke-width="5"/><rect x="-46" y="-140" width="92" height="210" rx="46" fill="#4a0a14"/>
          <circle cx="0" cy="-10" r="22" fill="#e2b23a" stroke="${INK}" stroke-width="2"/><circle cx="0" cy="-14" r="8" fill="#0a0204"/><path d="M-6,-10 L6,-10 L10,16 L-10,16 Z" fill="#0a0204"/></g>
        ${[40, 210].map((x) => `<g transform="translate(${x} 330)"><rect x="-3" y="0" width="6" height="50" fill="#e2b23a"/><path d="M-26,0 L26,0" stroke="#e2b23a" stroke-width="4"/>${[-24, 0, 24].map((dx) => `<rect x="${dx - 4}" y="-22" width="8" height="22" fill="#f2ecd8"/><path class="flame" d="M${dx},-24 q-7,-10 0,-22 q7,12 0,22 z" fill="#ffb02a"/>`).join("")}</g>`).join("")}
        <g transform="translate(200 400)"><path d="M-110,70 Q-110,0 -60,4 L60,4 Q110,0 110,70 Z" fill="#a3122a" stroke="${INK}" stroke-width="2.4"/><path d="M-100,30 Q0,50 100,30" stroke="#e2b23a" stroke-width="3" fill="none"/><ellipse cx="-70" cy="20" rx="22" ry="12" fill="#f2c8d4" stroke="${INK}" stroke-width="2"/></g>
        <rect x="0" y="470" width="400" height="230" fill="url(#chk)"/>`,
        damask + `<pattern id="chk" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#1a0408"/><rect width="20" height="20" fill="#e9e0d0"/><rect x="20" y="20" width="20" height="20" fill="#e9e0d0"/></pattern>`
      );
    },
    party() {
      const swag = (y, n) => [...Array(n)].map((_, i) => {
        const x = (i + 0.5) * (400 / n);
        return [x, y + Math.sin((i / (n - 1)) * Math.PI) * 30];
      });
      return svgBg(
        `<rect width="400" height="700" fill="url(#pt)"/>${stars(50, 21, 260, "#ffd7f0")}
        ${windmill(200, 220, 1.05)}
        <g transform="translate(200 360)"><rect x="-118" y="-22" width="236" height="40" rx="8" fill="#1a0614" stroke="#ff4a6a" stroke-width="3"/>
          <text x="0" y="8" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="24" fill="#ffd77a" class="neon">BAL DES ENFERS</text></g>
        <path d="M0,60 Q100,110 200,70 Q300,110 400,60" stroke="#3a1028" stroke-width="2" fill="none"/>
        ${bulbs(swag(64, 12), "#ffd77a")}${bulbs(swag(120, 10).map(([x, y]) => [x, y + 10]), "#ff7aa0")}
        <rect x="0" y="392" width="400" height="40" fill="url(#styx)"/>
        <path class="ripple" d="M0,410 Q50,402 100,410 T200,410 T300,410 T400,410" stroke="#a6ffcf" stroke-width="2" fill="none" opacity=".6"/>
        ${[-1, 1].map((sd) => `<g transform="translate(${200 + sd * 168} 300)"><rect x="-6" y="0" width="12" height="170" fill="#1a0614"/><path d="M-30,0 Q0,-40 30,0 Z" fill="#a3122a" stroke="#ffd77a" stroke-width="2"/><circle cy="-8" r="6" fill="#ffd77a" class="bulb"/></g>`).join("")}
        <rect x="0" y="432" width="400" height="268" fill="url(#flr)"/>
        ${[...Array(9)].map((_, i) => `<ellipse cx="${22 + i * 45}" cy="472" rx="10" ry="5" fill="#ffd77a" class="bulb${i % 2 ? " alt" : ""}"/>`).join("")}`,
        `<linearGradient id="pt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12061e"/><stop offset=".6" stop-color="#4a0f3a"/><stop offset="1" stop-color="#7a1a3a"/></linearGradient>
         <linearGradient id="styx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6a4a"/><stop offset="1" stop-color="#0a2a1e"/></linearGradient>
         <linearGradient id="flr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a1424"/><stop offset="1" stop-color="#1a0408"/></linearGradient>`
      );
    },
    styx() {
      return svgBg(
        `<rect width="400" height="700" fill="url(#sx)"/>
        <ellipse cx="330" cy="140" rx="40" ry="60" fill="#e8ffe0" opacity=".25"/><ellipse cx="330" cy="150" rx="18" ry="34" fill="#f4fff0" opacity=".6"/>
        <path d="M0,300 Q120,250 200,290 Q300,330 400,270 L400,700 L0,700 Z" fill="#0f2a24"/>
        ${curlyTree(60, 360, 0.9, "#0a1a16")}${curlyTree(370, 330, 0.7, "#0a1a16")}
        <rect x="0" y="360" width="400" height="70" fill="url(#rv)"/>
        ${[372, 392, 412].map((y, i) => `<path class="ripple" style="animation-delay:${i * 0.6}s" d="M0,${y} Q50,${y - 6} 100,${y} T200,${y} T300,${y} T400,${y}" stroke="#7affc0" stroke-width="1.6" fill="none" opacity=".5"/>`).join("")}
        <path d="M330,200 Q300,300 230,360" stroke="#3a5a4a" stroke-width="10" fill="none" stroke-dasharray="4 10"/>
        <rect x="0" y="430" width="400" height="270" fill="#14231e"/>
        <rect class="fog" x="-100" y="420" width="600" height="60" fill="#bfe8d8" opacity=".12"/>`,
        `<linearGradient id="sx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1416"/><stop offset="1" stop-color="#1e4a3e"/></linearGradient>
         <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f7a5a"/><stop offset="1" stop-color="#08261c"/></linearGradient>`
      );
    },
  };

  function background(name) {
    return (BG[name] || BG.stage)();
  }

  // ---------------------------------------------------------------------------
  // Icons (for matching / memory / dress-up)
  // ---------------------------------------------------------------------------
  const ICONS = {
    bolt: `<path d="M54,6 L26,52 L46,52 L34,94 L76,40 L54,40 L68,6 Z" fill="#f2c53d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    peacock: `<path d="M50,96 Q48,60 50,30" stroke="#2f6f4a" stroke-width="3" fill="none"/><ellipse cx="50" cy="34" rx="20" ry="28" fill="#1f8a7a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="50" cy="36" rx="11" ry="15" fill="#1c3f9a"/><ellipse cx="50" cy="38" rx="5" ry="7" fill="#e8c24a"/>`,
    moonbow: `<path d="M64,14 A38,38 0 1,0 64,86 A30,30 0 1,1 64,14 Z" fill="#e8e4d0" stroke="${INK}" stroke-width="2.5"/><path d="M30,90 Q90,50 30,10" stroke="#6b4a2a" stroke-width="4" fill="none"/><path d="M30,10 L30,90" stroke="#efe6cf" stroke-width="1.5"/>`,
    shell: `<path d="M50,88 L12,40 Q50,0 88,40 Z" fill="#f5d6d2" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>${[24, 36, 50, 64, 76].map((x) => `<path d="M50,86 L${x},${Math.abs(x - 50) * 0.6 + 14}" stroke="#d99a96" stroke-width="2"/>`).join("")}<path d="M40,88 L60,88 L56,96 L44,96 Z" fill="#f5d6d2" stroke="${INK}" stroke-width="2"/>`,
    heart: `<path d="M50,84 C10,56 18,18 42,24 C48,26 50,32 50,34 C50,32 52,26 58,24 C82,18 90,56 50,84 Z" fill="#e0234e" stroke="${INK}" stroke-width="2.5"/><path d="M10,90 L90,10" stroke="#8b5a2b" stroke-width="3"/><path d="M90,10 l-12,2 l10,10 Z" fill="#c9a24a"/>`,
    helmet: `<path d="M18,84 Q14,24 50,20 Q86,24 82,84 L68,84 L66,50 L34,50 L32,84 Z" fill="#b0803a" stroke="${INK}" stroke-width="2.5"/><path d="M28,24 Q50,-8 80,12 Q70,18 28,24 Z" fill="#c4123b" stroke="${INK}" stroke-width="2"/>`,
    wingcap: `<path d="M24,66 Q24,26 50,24 Q76,26 76,66 Q50,58 24,66 Z" fill="#c9ccd4" stroke="${INK}" stroke-width="2.5"/><path d="M14,68 Q50,56 86,68 Q50,76 14,68 Z" fill="#aeb2bc" stroke="${INK}" stroke-width="2"/><path d="M26,46 Q2,26 -2,40 Q8,40 6,48 Q14,44 14,54 Q20,48 26,54 Z" fill="#fbf8f0" stroke="${INK}" stroke-width="2" transform="translate(4 0)"/><path d="M74,46 Q98,26 102,40 Q92,40 94,48 Q86,44 86,54 Q80,48 74,54 Z" fill="#fbf8f0" stroke="${INK}" stroke-width="2" transform="translate(-4 0)"/>`,
    crown: `<path d="M14,74 L18,30 L36,50 L50,18 L64,50 L82,30 L86,74 Z" fill="#a39b6a" stroke="${INK}" stroke-width="2.5" transform="rotate(10 50 50)"/>`,
    bull: `<path d="M20,30 Q4,16 10,6 Q18,22 32,26 M80,30 Q96,16 90,6 Q82,22 68,26" stroke="#efe6d4" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M28,28 Q50,16 72,28 Q80,60 64,84 Q50,94 36,84 Q20,60 28,28 Z" fill="#7a4a2a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="50" cy="78" rx="16" ry="10" fill="#c99a8a" stroke="${INK}" stroke-width="2"/><circle cx="44" cy="78" r="2.5" fill="${INK}"/><circle cx="56" cy="78" r="2.5" fill="${INK}"/><circle cx="38" cy="46" r="4" fill="#fff"/><circle cx="62" cy="46" r="4" fill="#fff"/><circle cx="38" cy="46" r="2" fill="${INK}"/><circle cx="62" cy="46" r="2" fill="${INK}"/><circle cx="50" cy="90" r="5" fill="none" stroke="#e2b23a" stroke-width="2.5"/>`,
    swan: `<path d="M30,88 Q8,70 26,58 Q46,50 62,64 Q70,40 58,30 Q50,22 56,12 Q66,8 72,16 Q66,18 64,24 Q84,44 74,72 Q66,92 30,88 Z" fill="#fbf8f0" stroke="${INK}" stroke-width="2.5"/><path d="M72,16 L82,20 L72,22 Z" fill="#e8892a" stroke="${INK}" stroke-width="1.5"/><circle cx="64" cy="16" r="2" fill="${INK}"/><path d="M30,70 Q44,64 56,74" stroke="#cfc6b4" stroke-width="2" fill="none"/>`,
    goldrain: [...Array(12)].map((_, i) => `<path d="M${14 + (i % 4) * 24},${8 + Math.floor(i / 4) * 30} q-6,10 0,14 q6,-4 0,-14 z" fill="#f2c53d" stroke="#a8822a" stroke-width="1.5"/>`).join("") + `<path d="M10,94 L90,94" stroke="#c9a24a" stroke-width="3"/>`,
    husband: `<circle cx="50" cy="44" r="28" fill="#efd8c0" stroke="${INK}" stroke-width="2.5"/><path d="M28,58 Q50,48 72,58 Q66,66 50,60 Q34,66 28,58 Z" fill="#3a2a1a"/><circle cx="40" cy="40" r="3" fill="${INK}"/><circle cx="60" cy="40" r="3" fill="${INK}"/><path d="M22,30 Q50,0 78,30 L74,22 Q50,8 26,22 Z" fill="#9a7a3a" stroke="${INK}" stroke-width="2"/><path d="M18,96 Q50,72 82,96" fill="#7a1a2a" stroke="${INK}" stroke-width="2.5"/><text x="80" y="22" font-size="22" font-family="Georgia,serif" fill="${INK}">?</text>`,

    fawn: `<path d="M20,20 Q50,4 80,20 L84,86 Q50,96 16,86 Z" fill="#c49a5e" stroke="${INK}" stroke-width="2.5"/>${[[34, 34], [60, 30], [44, 54], [70, 56], [30, 72], [56, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="#6b4520"/>`).join("")}`,
    toga: `<path d="M24,14 Q50,30 76,14 L80,90 L20,90 Z" fill="#f1ece0" stroke="${INK}" stroke-width="2.5"/><path d="M24,30 Q50,60 78,36 M24,56 Q50,74 78,60" stroke="#cfc6b4" stroke-width="2" fill="none"/>`,
    gown: `<path d="M38,10 L62,10 L64,34 L92,92 L8,92 L36,34 Z" fill="#d46a8c" stroke="${INK}" stroke-width="2.5"/><path d="M14,80 Q50,70 86,80" stroke="#f4c1d0" stroke-width="4" fill="none"/>`,
  };
  // icons built from crown/prop helpers, re-centred into a 100x100 box
  ICONS.ivy = `<g transform="translate(0 6) scale(1)">${leafCrown("#3f7a3a", 34, "#5b1f6a").replace(/\b(cx|x)="(-?[\d.]+)"/g, (m, a, v) => `${a}="${(Number(v) - 50).toFixed(1)}"`).replace(/rotate\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)/g, (m, a, x, y) => `rotate(${a} ${(Number(x) - 50).toFixed(1)} ${y})`)}</g>`;
  ICONS.laurel = ICONS.ivy.replace(/#3f7a3a/g, "#b89b3a").replace(/<circle[^>]*#5b1f6a[^>]*\/>/g, "");
  ICONS.helmetW = ICONS.helmet;
  ICONS.thyrsus = `<g transform="translate(50 49) scale(.48)">${props.thyrsus([0, 0])}</g>`;
  ICONS.lyre = `<g transform="translate(50 52) scale(1.5) translate(0 14)">${props.lyre([0, 0])}</g>`;
  ICONS.trident = `<g transform="translate(50 45) scale(.5)">${props.trident([0, 0])}</g>`;

  function icon(name) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="icon">${ICONS[name] || ""}</svg>`;
  }

  // ---------------------------------------------------------------------------
  // Journey map
  // ---------------------------------------------------------------------------
  const MAP_NODES = [
    [92, 880], [220, 820], [318, 730], [176, 660], [292, 545], [120, 410], [282, 300], [140, 180],
    [330, 980], [214, 1060], [88, 1140], [206, 1230], [324, 1310], [170, 1400], [262, 1490],
  ];

  function catmull(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  function journeyMap(chapters, state) {
    const pathPts = MAP_NODES.slice();
    pathPts.splice(8, 0, [372, 120], [384, 600]);
    const d = catmull(pathPts);
    let nodes = "";
    chapters.forEach((ch, i) => {
      const [x, y] = MAP_NODES[i];
      const done = state.done[ch.id];
      const open = state.unlocked(i);
      const cls = done ? "done" : open ? "open" : "locked";
      const labelW = Math.max(110, ch.short.length * 8.4 + 24);
      const lx = Math.min(400 - labelW / 2 - 6, Math.max(labelW / 2 + 6, x));
      nodes += `<g class="map-node ${cls}" data-ch="${i}" tabindex="${open ? 0 : -1}" role="button" aria-label="Scene ${i}: ${ch.title}${open ? "" : " (locked)"}">
        ${cls === "open" ? `<circle class="pulse" cx="${x}" cy="${y}" r="34" fill="none" stroke="#ffd77a" stroke-width="4"/>` : ""}
        <circle cx="${x}" cy="${y}" r="28" fill="${done ? "#a8122e" : open ? "#2a0a1a" : "#3a3440"}" stroke="#e8b04a" stroke-width="4"/>
        <circle cx="${x}" cy="${y}" r="22" fill="none" stroke="${done ? "#ffcf6a" : "#6a5a6a"}" stroke-width="1.5" stroke-dasharray="3 3"/>
        <text x="${x}" y="${y + 8}" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="22" fill="${open ? "#ffe6a8" : "#8a8090"}">${done ? "✓" : open ? (i === 0 ? "★" : i) : "🔒"}</text>
        <rect x="${lx - labelW / 2}" y="${y + 34}" width="${labelW}" height="24" rx="12" fill="#1a0a14" fill-opacity=".85" stroke="#e8b04a" stroke-width="1.5"/>
        <text x="${lx}" y="${y + 51}" text-anchor="middle" font-family="Alegreya, Georgia, serif" font-size="14" font-weight="700" fill="${open ? "#ffe6a8" : "#9a90a0"}">${ch.short}</text>
      </g>`;
    });
    const labels = [
      [200, 60, "MOUNT OLYMPUS", "#4a3a6a"],
      [200, 624, "THEBES · LAND OF THE LIVING", "#e8ecf0"],
      [150, 958, "THE UNDERWORLD", "#ffd77a"],
    ];
    return `<svg class="map-svg" viewBox="0 0 400 1560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mapg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d9cfe8"/><stop offset=".25" stop-color="#f3e9d2"/>
          <stop offset=".3" stop-color="#9aa6b2"/><stop offset=".55" stop-color="#5e6a74"/>
          <stop offset=".6" stop-color="#3a0a1a"/><stop offset=".8" stop-color="#5a0a24"/><stop offset="1" stop-color="#14040c"/>
        </linearGradient>
      </defs>
      <rect width="400" height="1560" fill="url(#mapg)"/>
      ${cloud(60, 250, 1.4, "#fbf8fd", 0.8)}${cloud(330, 420, 1.6, "#fbf8fd", 0.8)}${cloud(200, 470, 2.2, "#f6f0fa", 0.9)}
      <g opacity=".85"><path d="M110,140 L200,96 L290,140 Z" fill="#efe6d6" stroke="#c9b48a" stroke-width="2"/>${[130, 170, 230, 270].map((x) => `<rect x="${x - 7}" y="140" width="14" height="70" fill="#efe8dc" stroke="#cdbf9e" stroke-width="1.5"/>`).join("")}</g>
      ${spiralHill(80, 760, 160, 160, "#56606a")}${spiralHill(330, 780, 170, 130, "#4a545e")}
      <rect x="0" y="760" width="400" height="160" fill="#4a4a40"/>
      ${wheat(0, 400, 920, "#8a8060", 3, 44)}
      ${curlyTree(30, 900, 0.6, "#232830")}
      <path d="M0,920 Q200,960 400,920 L400,960 L0,960 Z" fill="#2a0a14"/>
      ${windmill(90, 1290, 0.7)}
      <rect x="0" y="1340" width="400" height="30" fill="#1f6a4a" opacity=".7"/>
      ${stars(40, 31, 300, "#ffd7f0").replace(/cy="(\d+)"/g, (m, v) => `cy="${Number(v) + 1000}"`)}
      ${labels.map(([x, y, t, c]) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Limelight, Georgia, serif" font-size="17" letter-spacing="2" fill="${c}">${t}</text>`).join("")}
      <path d="${d}" fill="none" stroke="#1a0a14" stroke-width="9" stroke-linecap="round" opacity=".5"/>
      <path d="${d}" fill="none" stroke="#e8b04a" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>
      ${nodes}
    </svg>`;
  }

  return { character, background, icon, journeyMap, META, MAP_NODES, props, INK };
})();

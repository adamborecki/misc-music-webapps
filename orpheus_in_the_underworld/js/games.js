/* Orpheus in the Underworld — mini-games.
   Each game resolves to { score: 0..1, note?: string }. The engine wraps them
   with an instruction card and a results card. */
window.OU = window.OU || {};

OU.games = (() => {
  const A = () => OU.audio;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------------------------------------------------------------------------
  // SVG → canvas images
  // ---------------------------------------------------------------------------
  const cache = new Map();
  function svgImg(key, svg, w, h) {
    if (cache.has(key)) return cache.get(key);
    const s = svg.replace("<svg ", `<svg width="${w}" height="${h}" `);
    const im = new Image();
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
    cache.set(key, im);
    return im;
  }
  const charImg = (id, mood = "neutral", opts = {}) => svgImg(`c|${id}|${mood}|${JSON.stringify(opts)}`, OU.art.character(id, mood, opts), 200, 400);
  const bgImg = (name) => svgImg(`b|${name}`, OU.art.background(name), 400, 700);
  const iconImg = (name) => svgImg(`i|${name}`, OU.art.icon(name), 100, 100);
  const ready = (im) => im && im.complete && im.naturalWidth > 0;

  function drawCover(g, im, W, H) {
    if (!ready(im)) return;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    g.drawImage(im, (W - w) / 2, H - h, w, h);
  }
  // draw a 200x400 puppet with its feet at (x, footY) and the given height
  function drawChar(g, im, x, footY, h, opts = {}) {
    if (!ready(im)) return;
    const w = h / 2;
    g.save();
    g.translate(x, footY);
    if (opts.rot) g.rotate(opts.rot);
    if (opts.flip) g.scale(-1, 1);
    if (opts.alpha != null) g.globalAlpha = opts.alpha;
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Kit: per-game helpers + cleanup
  // ---------------------------------------------------------------------------
  class Kit {
    constructor(root) {
      this.root = root;
      this.alive = true;
      this.raf = 0;
      this.timeouts = [];
      this.listeners = [];
    }
    on(t, ev, fn, o) {
      t.addEventListener(ev, fn, o);
      this.listeners.push([t, ev, fn, o]);
    }
    after(ms, fn) {
      const id = setTimeout(() => this.alive && fn(), ms);
      this.timeouts.push(id);
      return id;
    }
    wait(ms) {
      return new Promise((r) => this.after(ms, r));
    }
    loop(fn) {
      let last = performance.now();
      const tick = (now) => {
        if (!this.alive) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        fn(dt, now / 1000);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    destroy() {
      this.alive = false;
      cancelAnimationFrame(this.raf);
      this.timeouts.forEach(clearTimeout);
      this.listeners.forEach(([t, e, f, o]) => t.removeEventListener(e, f, o));
    }
    el(tag, cls, html, parent) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      (parent || this.root).appendChild(e);
      return e;
    }
    hud(title, pills = {}) {
      const h = this.el("div", "ghud");
      this.el("div", "gtitle", title, h);
      const map = {};
      Object.entries(pills).forEach(([k, v]) => (map[k] = this.el("div", "pill", v, h)));
      return (k, v) => map[k] && (map[k].innerHTML = v);
    }
    bar() {
      const b = this.el("div", "timer-bar");
      const i = this.el("i", "", null, b);
      return (f) => (i.style.transform = `scaleX(${clamp(f)})`);
    }
    msg(text, ms = 800) {
      const m = this.el("div", "gmsg", text);
      this.after(ms, () => m.remove());
    }
    canvas() {
      const cv = this.el("canvas");
      const g = cv.getContext("2d");
      const s = { cv, g, W: 0, H: 0 };
      const resize = () => {
        const r = this.root.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        s.W = r.width;
        s.H = r.height;
        cv.width = Math.round(r.width * dpr);
        cv.height = Math.round(r.height * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      this.on(window, "resize", resize);
      return s;
    }
    pt(e) {
      const r = this.root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
  }

  // particles shared by canvas games
  function particles() {
    const list = [];
    return {
      burst(x, y, colors, n = 12, speed = 160) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
          list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.8 + Math.random() * 0.4, t: 0, c: pick(colors), r: 3 + Math.random() * 4 });
        }
      },
      add(p) { list.push({ t: 0, ...p }); },
      update(g, dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.t += dt;
          if (p.t > p.life) { list.splice(i, 1); continue; }
          p.vy += (p.grav == null ? 260 : p.grav) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          g.globalAlpha = 1 - p.t / p.life;
          g.fillStyle = p.c;
          if (p.text) {
            g.font = `${p.size || 22}px Georgia, serif`;
            g.textAlign = "center";
            g.fillText(p.text, p.x, p.y);
          } else {
            g.beginPath();
            g.ellipse(p.x, p.y, p.r, p.r * 0.6, p.t * 6, 0, Math.PI * 2);
            g.fill();
          }
        }
        g.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Shared canvas drawing bits
  // ---------------------------------------------------------------------------
  const D = {
    note(g, x, y, s, t, angry = true) {
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(t * 6) * 0.25);
      g.scale(s, s);
      g.fillStyle = "#1d1322";
      g.beginPath();
      g.ellipse(0, 0, 13, 9.5, -0.4, 0, Math.PI * 2);
      g.fill();
      g.fillRect(9, -42, 4, 40);
      g.beginPath();
      g.moveTo(13, -42);
      g.quadraticCurveTo(30, -30, 22, -14);
      g.quadraticCurveTo(24, -28, 13, -30);
      g.fill();
      if (angry) {
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(-5, -1, 3.2, 0, 7); g.arc(4, -3, 3.2, 0, 7); g.fill();
        g.fillStyle = "#c4123b";
        g.beginPath(); g.arc(-5, -0.5, 1.5, 0, 7); g.arc(4, -2.5, 1.5, 0, 7); g.fill();
        g.strokeStyle = "#fff"; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-9, -6); g.lineTo(-2, -4); g.moveTo(1, -7); g.lineTo(8, -8); g.stroke();
      }
      g.restore();
    },
    flower(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.rotate(t); g.scale(s, s);
      g.fillStyle = "#f2e8f4"; g.strokeStyle = "#1d1322"; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.ellipse(Math.cos((i * 2 * Math.PI) / 5) * 10, Math.sin((i * 2 * Math.PI) / 5) * 10, 8, 8, 0, 0, 7); g.fill(); g.stroke();
      }
      g.fillStyle = "#f0c84a"; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.stroke();
      g.restore();
    },
    rose(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3) * 0.2); g.scale(s, s);
      g.strokeStyle = "#2f6a3a"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 6); g.lineTo(-2, 26); g.stroke();
      g.fillStyle = "#3f8a4a"; g.beginPath(); g.ellipse(5, 16, 6, 3, -0.5, 0, 7); g.fill();
      g.fillStyle = "#c4123b"; g.strokeStyle = "#1d1322"; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = "#7a0a1e"; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 7, 0.5, 5); g.stroke(); g.beginPath(); g.arc(1, -1, 3, 2, 7); g.stroke();
      g.restore();
    },
    snake(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.strokeStyle = "#1d1322"; g.lineWidth = 12; g.lineCap = "round";
      const path = () => { g.beginPath(); for (let i = 0; i <= 20; i++) { const px = -30 + i * 3, py = Math.sin(i * 0.6 + t * 8) * 7; i ? g.lineTo(px, py) : g.moveTo(px, py); } };
      path(); g.stroke();
      g.strokeStyle = "#6a9a3a"; g.lineWidth = 8; path(); g.stroke();
      const hy = Math.sin(20 * 0.6 + t * 8) * 7;
      g.fillStyle = "#6a9a3a"; g.strokeStyle = "#1d1322"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(34, hy, 10, 8, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(36, hy - 3, 3, 0, 7); g.fill();
      g.fillStyle = "#c4123b"; g.beginPath(); g.arc(37, hy - 3, 1.5, 0, 7); g.fill();
      if (Math.sin(t * 10) > 0) { g.strokeStyle = "#e0234e"; g.lineWidth = 2; g.beginPath(); g.moveTo(44, hy); g.lineTo(52, hy); g.lineTo(55, hy - 3); g.moveTo(52, hy); g.lineTo(55, hy + 3); g.stroke(); }
      g.restore();
    },
    cloud(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = "#4a4660"; g.strokeStyle = "#1d1322"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(-18, 0, 15, 0, 7); g.arc(0, -10, 19, 0, 7); g.arc(20, 0, 14, 0, 7); g.rect(-20, 0, 40, 14); g.fill();
      g.fillStyle = "#f2c53d"; g.beginPath(); g.moveTo(2, 8); g.lineTo(-8, 26); g.lineTo(0, 26); g.lineTo(-6, 42); g.lineTo(10, 20); g.lineTo(2, 20); g.lineTo(8, 8); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-8, -4, 3, 0, 7); g.arc(8, -4, 3, 0, 7); g.fill();
      g.fillStyle = "#1d1322"; g.beginPath(); g.arc(-8, -3, 1.5, 0, 7); g.arc(8, -3, 1.5, 0, 7); g.fill();
      g.restore();
    },
    bat(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.scale(s, s);
      const f = Math.sin(t * 18) * 10;
      g.fillStyle = "#1a0a14";
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -6 - f); g.lineTo(-22, 4); g.lineTo(-14, 0); g.lineTo(-8, 8); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(30, -6 - f); g.lineTo(22, 4); g.lineTo(14, 0); g.lineTo(8, 8); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(0, 2, 8, 10, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-6, -6); g.lineTo(-4, -14); g.lineTo(-1, -7); g.moveTo(6, -6); g.lineTo(4, -14); g.lineTo(1, -7); g.fill();
      g.fillStyle = "#ff3a3a"; g.beginPath(); g.arc(-3, 0, 2, 0, 7); g.arc(3, 0, 2, 0, 7); g.fill();
      g.restore();
    },
    flame(g, x, y, s, t) {
      g.save(); g.translate(x, y); g.scale(s, s * (1 + Math.sin(t * 14) * 0.08));
      g.fillStyle = "#ff6a1a"; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(20, -4, 12, 10); g.quadraticCurveTo(0, 20, -12, 10); g.quadraticCurveTo(-20, -4, 0, -30); g.fill();
      g.fillStyle = "#ffd23a"; g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(10, 0, 6, 8); g.quadraticCurveTo(0, 13, -6, 8); g.quadraticCurveTo(-10, 0, 0, -14); g.fill();
      g.restore();
    },
    heart(n) { return "❤️".repeat(Math.max(0, n)) + "🖤".repeat(Math.max(0, 3 - n)); },
  };

  // ===========================================================================
  // 1. The Concerto Duel
  // ===========================================================================
  function concerto(kit) {
    return new Promise((resolve) => {
      const c = kit.canvas(), g = c.g;
      const bg = bgImg("thebes");
      const orp = charImg("orp", "smug");
      const eurFace = { calm: charImg("eur", "angry"), hurt: charImg("eur", "worried"), win: charImg("eur", "happy") };
      const set = kit.hud("The Concerto Duel", { pop: "🎵 0", pat: "Patience 100%" });
      const bar = kit.bar();
      const P = particles();
      const T = 30;
      let t = 0, spawnT = 0.8, popped = 0, spawned = 0, patience = 100, hurt = 0, done = false;
      const notes = [];
      const finish = () => {
        if (done) return;
        done = true;
        const score = 0.6 * (spawned ? popped / spawned : 1) + 0.4 * (patience / 100);
        kit.msg(patience > 0 ? "Bravo!" : "Ugh!", 1200);
        kit.after(1200, () => resolve({ score, note: `You silenced ${popped} sour notes. Eurydice's patience: ${Math.round(patience)}%.` }));
      };
      kit.on(kit.root, "pointerdown", (e) => {
        if (done) return;
        const { x, y } = kit.pt(e);
        let best = null, bd = 1e9;
        notes.forEach((n) => {
          const d = Math.hypot(n.x - x, n.y - y);
          if (!n.dead && d < bd) { bd = d; best = n; }
        });
        if (best && bd < Math.max(46, c.W * 0.1)) {
          best.dead = true;
          popped++;
          A().sfx("pop");
          P.burst(best.x, best.y, ["#f2e8f4", "#f0c84a", "#d98fa6"], 14);
          set("pop", `🎵 ${popped}`);
        }
      });
      kit.loop((dt) => {
        const { W, H } = c;
        t += dt;
        bar(1 - t / T);
        if (!done) {
          spawnT -= dt;
          if (spawnT <= 0 && t < T - 1.2) {
            spawnT = lerp(1.0, 0.42, t / T) * rand(0.8, 1.2);
            spawned++;
            const ox = W / 2 + rand(-W * 0.18, W * 0.18);
            notes.push({ x0: ox, y0: H * 0.34, x: ox, y: H * 0.34, p: 0, travel: lerp(3.4, 2.1, t / T), wob: rand(14, 34), wf: rand(2, 4), tx: W / 2 + rand(-24, 24), ty: H * 0.72, t: 0 });
            if (Math.random() < 0.55) A().sfx("squeak");
          }
          if (t >= T || patience <= 0) finish();
        }
        hurt = Math.max(0, hurt - dt);
        // draw
        g.save();
        if (hurt > 0) g.translate(rand(-4, 4), rand(-3, 3));
        drawCover(g, bg, W, H);
        g.fillStyle = "rgba(20,10,30,.25)";
        g.fillRect(0, 0, W, H);
        // a little concert podium for the maestro
        g.fillStyle = "#4a2a1a"; g.strokeStyle = "#1d1322"; g.lineWidth = 3;
        g.fillRect(W / 2 - W * 0.16, H * 0.395, W * 0.32, H * 0.035); g.strokeRect(W / 2 - W * 0.16, H * 0.395, W * 0.32, H * 0.035);
        g.fillStyle = "#e8b04a"; g.fillRect(W / 2 - W * 0.16, H * 0.395, W * 0.32, 4);
        drawChar(g, orp, W / 2, H * 0.4, H * 0.3, { rot: Math.sin(t * 5) * 0.05 });
        // music staff waves
        g.strokeStyle = "rgba(255,240,210,.18)";
        g.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          for (let x = 0; x <= W; x += 10) g.lineTo(x, H * 0.47 + i * 9 + Math.sin(x / 40 + t * 2) * 8);
          g.stroke();
        }
        const ef = done && patience > 0 ? eurFace.win : hurt > 0 ? eurFace.hurt : eurFace.calm;
        drawChar(g, ef, W / 2, H * 1.02, H * 0.36);
        notes.forEach((n) => {
          if (n.dead) return;
          n.t += dt;
          n.p += dt / n.travel;
          n.x = lerp(n.x0, n.tx, n.p) + Math.sin(n.t * n.wf) * n.wob * (1 - n.p);
          n.y = lerp(n.y0, n.ty, n.p);
          D.note(g, n.x, n.y, Math.min(c.W, 480) / 330, n.t);
          if (n.p >= 1) {
            n.dead = true;
            patience = Math.max(0, patience - 11);
            hurt = 0.45;
            A().sfx("squeak");
            set("pat", `Patience ${Math.round(patience)}%`);
          }
        });
        for (let i = notes.length - 1; i >= 0; i--) if (notes[i].dead) notes.splice(i, 1);
        P.update(g, dt);
        g.restore();
      });
    });
  }

  // ===========================================================================
  // 2. Lane runner (wheat field / sky / descent)
  // ===========================================================================
  const RUN = {
    field: { title: "Through the Wheat Field", player: ["eur", "worried"], good: ["flower"], bad: ["snake"], dir: 1, goodLabel: "🌼", hint: "Collect flowers for Aristaeus, dodge Orpheus's snakes!" },
    sky: { title: "Stairway to Olympus", player: ["orp", "worried"], good: ["lyre"], bad: ["cloud"], dir: 1, goodLabel: "🎵", hint: "Collect golden lyres, dodge the thunderclouds!" },
    descent: { title: "The Great Descent", player: ["jup", "surprised"], good: ["rose"], bad: ["bat", "flame"], dir: -1, goodLabel: "🌹", hint: "Collect roses, dodge bats and flames!" },
  };

  function runner(kit, opts) {
    const th = RUN[opts.theme] || RUN.field;
    return new Promise((resolve) => {
      const c = kit.canvas(), g = c.g;
      const pImg = charImg(th.player[0], th.player[1], th.player[0] === "eur" ? { variant: "alive", pose: "out" } : {});
      const lyre = iconImg("lyre");
      const set = kit.hud(th.title, { got: `${th.goodLabel} 0`, hp: D.heart(3) });
      const bar = kit.bar();
      const P = particles();
      const T = 32;
      let t = 0, lane = 1, px = null, hearts = 3, inv = 0, got = 0, goodSpawned = 0, rowT = 1, scroll = 0, done = false;
      const items = [];
      const ctl = kit.el("div", "gctl");
      const bl = kit.el("button", "gbtn", "◀", ctl);
      const br = kit.el("button", "gbtn", "▶", ctl);
      const move = (d) => { if (!done) { lane = clamp(lane + d, 0, 2); A().sfx("tap"); } };
      kit.on(bl, "pointerdown", (e) => { e.stopPropagation(); move(-1); });
      kit.on(br, "pointerdown", (e) => { e.stopPropagation(); move(1); });
      kit.on(kit.root, "pointerdown", (e) => { const { x } = kit.pt(e); move(x < c.W / 2 ? -1 : 1); });
      kit.on(window, "keydown", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a") move(-1);
        if (e.key === "ArrowRight" || e.key === "d") move(1);
      });
      const laneX = (i) => c.W * (0.5 + (i - 1) * 0.29);
      const finish = (msg) => {
        if (done) return;
        done = true;
        kit.msg(msg, 1200);
        const score = 0.55 * clamp(got / Math.max(1, goodSpawned * 0.8)) + 0.45 * (hearts / 3);
        kit.after(1300, () => resolve({ score, note: `Collected ${got} ${th.goodLabel} with ${hearts} ${hearts === 1 ? "heart" : "hearts"} left.` }));
      };
      const drawItem = (it) => {
        const s = Math.min(c.W, 480) / 290;
        if (it.type === "flower") D.flower(g, it.x, it.y, s * 1.2, t);
        else if (it.type === "snake") D.snake(g, it.x - 6 * s, it.y, s * 0.95, t + it.seed);
        else if (it.type === "lyre") { if (ready(lyre)) g.drawImage(lyre, it.x - 28 * s, it.y - 30 * s, 56 * s, 56 * s); }
        else if (it.type === "cloud") D.cloud(g, it.x, it.y, s * 1.2, t);
        else if (it.type === "rose") D.rose(g, it.x, it.y, s * 1.2, t + it.seed);
        else if (it.type === "bat") D.bat(g, it.x, it.y, s * 1.2, t + it.seed);
        else if (it.type === "flame") D.flame(g, it.x, it.y, s * 1.3, t + it.seed);
      };
      const drawBg = (W, H) => {
        if (opts.theme === "field") {
          g.fillStyle = "#8a8162"; g.fillRect(0, 0, W, H);
          g.strokeStyle = "#a8996c"; g.lineWidth = 2;
          for (let y = (scroll % 26) - 26; y < H + 26; y += 26) {
            for (let x = 8; x < W; x += 16) {
              const xx = x + ((y / 26) % 2) * 8;
              g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + 3, y - 14); g.stroke();
            }
          }
          g.fillStyle = "rgba(60,56,70,.25)"; g.fillRect(0, 0, W, H);
        } else if (opts.theme === "sky") {
          const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2a2a5a"); gr.addColorStop(1, "#c9b8e0");
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
          g.fillStyle = "rgba(255,255,255,.35)";
          for (let i = 0; i < 6; i++) {
            const y = ((((scroll * 0.6 + i * 180) % (H + 200)) + H + 200) % (H + 200)) - 100, x = (i * 97) % W;
            g.beginPath(); g.ellipse(x, y, 70, 22, 0, 0, 7); g.ellipse(x + 30, y - 12, 40, 20, 0, 0, 7); g.fill();
          }
        } else {
          const gr = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * 0.7); gr.addColorStop(0, "#ffb04a"); gr.addColorStop(0.35, "#c4123b"); gr.addColorStop(1, "#1a0410");
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
          g.strokeStyle = "rgba(255,120,60,.3)"; g.lineWidth = 6;
          for (let i = 0; i < 7; i++) {
            const k = (((scroll / H + i / 7) % 1) + 1) % 1;
            g.beginPath(); g.ellipse(W / 2, H / 2, W * k * 0.9 + 10, H * k * 0.6 + 6, 0, 0, 7); g.stroke();
          }
        }
        g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; g.setLineDash([10, 14]);
        [0.355, 0.645].forEach((f) => { g.beginPath(); g.moveTo(W * f, 0); g.lineTo(W * f, H); g.stroke(); });
        g.setLineDash([]);
      };
      kit.loop((dt) => {
        const { W, H } = c;
        t += dt;
        bar(1 - t / T);
        const speed = H * lerp(0.36, 0.62, t / T);
        const dir = th.dir;
        const py = dir > 0 ? H * 0.8 : H * 0.3;
        scroll += speed * dt * dir;
        if (!done) {
          rowT -= dt;
          if (rowT <= 0 && t < T - 1.5) {
            rowT = lerp(0.85, 0.5, t / T);
            const lanes = shuffle([0, 1, 2]);
            const nBad = t > 8 && Math.random() < 0.3 ? 2 : 1;
            const y0 = dir > 0 ? -50 : H + 50;
            for (let i = 0; i < nBad; i++) items.push({ lane: lanes[i], y: y0, kind: "bad", type: pick(th.bad), seed: Math.random() * 9 });
            if (Math.random() < 0.7) {
              goodSpawned++;
              items.push({ lane: lanes[nBad], y: y0, kind: "good", type: pick(th.good), seed: Math.random() * 9 });
            }
          }
          if (t >= T) finish(hearts ? "Made it!" : "Phew!");
        }
        inv = Math.max(0, inv - dt);
        const tx = laneX(lane);
        px = px == null ? tx : px + (tx - px) * Math.min(1, dt * 14);
        drawBg(W, H);
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += speed * dt * dir;
          it.x = laneX(it.lane);
          if (!done && !it.hit && it.lane === lane && Math.abs(it.y - py) < H * 0.055) {
            it.hit = true;
            if (it.kind === "good") {
              got++;
              A().sfx("rose");
              P.burst(it.x, it.y, ["#ffe7a6", "#ff8aa8", "#fff"], 10);
              set("got", `${th.goodLabel} ${got}`);
            } else if (inv <= 0) {
              hearts--;
              inv = 1.2;
              A().sfx(it.type === "snake" ? "hiss" : "bump");
              set("hp", D.heart(hearts));
              kit.msg(it.type === "snake" ? "Hsss!" : "Ouch!", 600);
              if (hearts <= 0) finish("Oof!");
            }
          }
          if (it.hit && it.kind === "good") { items.splice(i, 1); continue; }
          if (it.y < -80 || it.y > H + 80) { items.splice(i, 1); continue; }
          drawItem(it);
        }
        const ph = H * 0.2;
        const bob = Math.sin(t * 12) * 3;
        if (!(inv > 0 && Math.floor(t * 12) % 2)) drawChar(g, pImg, px, py + ph * 0.45 + bob, ph, { rot: (tx - px) * 0.002 });
        P.update(g, dt);
      });
    });
  }

  // ===========================================================================
  // 3. The Farewell Note (fill in the blanks)
  // ===========================================================================
  function note(kit) {
    return new Promise((resolve) => {
      kit.hud("Eurydice's Farewell Note", {});
      const root = kit.el("div", "dgame");
      kit.el("p", "prompt", "Help Eurydice write her famous goodbye note to Orpheus. Tap the right word for each blank!", root);
      const paper = kit.el("div", "parchment-note", null, root);
      const choices = kit.el("div", "grid2", null, root);
      const blanks = [
        { a: "dead", o: ["dead", "bored", "hungry"] },
        { a: "Aristaeus", o: ["Orpheus", "Aristaeus", "Jupiter"] },
        { a: "Pluto", o: ["a shepherd", "Mercury", "Pluto"] },
        { a: "devil", o: ["wind", "devil", "snake"] },
      ];
      const text = ["My dear husband — I'm leaving the house because I am ", ". ", " is ", ", and the ", " is carrying me off!"];
      let i = 0, mistakes = 0;
      const render = () => {
        let h = "";
        text.forEach((s, k) => {
          h += s;
          if (k < blanks.length) h += `<span class="blank ${k === i ? "cur" : ""}">${k < i ? blanks[k].a : "?"}</span>`;
        });
        paper.innerHTML = h;
        choices.innerHTML = "";
        if (i >= blanks.length) return;
        shuffle(blanks[i].o).forEach((w) => {
          const b = kit.el("button", "tile", w, choices);
          kit.on(b, "click", () => {
            if (w === blanks[i].a) {
              A().sfx("right");
              i++;
              render();
              if (i >= blanks.length) finished();
            } else {
              mistakes++;
              A().sfx("wrong");
              b.classList.add("bad");
              b.disabled = true;
            }
          });
        });
      };
      const finished = () => {
        kit.el("p", "prompt", "<b>In Offenbach's French, the note rhymes:</b><br><em>« …je suis <b>morte</b>… Aristée est Pluton, et le diable m'<b>emporte</b>! »</em>", root);
        const b = kit.el("button", "btn gold", "Sign it ✒️", root);
        b.style.alignSelf = "center";
        kit.on(b, "click", () => resolve({ score: 1 - mistakes * 0.15, note: mistakes ? `${mistakes} smudged ${mistakes === 1 ? "word" : "words"} — but the note is delivered!` : "A flawless farewell!" }));
      };
      render();
    });
  }

  // ===========================================================================
  // 4. Gods & their symbols
  // ===========================================================================
  function portrait(id, mood = "neutral") {
    return OU.art.character(id, mood).replace('viewBox="0 0 200 400"', 'viewBox="30 -14 140 170"');
  }

  function match(kit) {
    return new Promise((resolve) => {
      const set = kit.hud("Who's Who on Olympus", { left: "6 to match" });
      const root = kit.el("div", "dgame");
      kit.el("p", "prompt", "Tap a god, then tap their symbol.", root);
      const pairs = [
        ["jup", "bolt", "Jupiter, king of the gods, hurls <b>thunderbolts</b>."],
        ["juno", "peacock", "Juno, queen of the gods — the <b>peacock</b> is her sacred bird."],
        ["dia", "moonbow", "Diana, goddess of the <b>hunt</b> and the <b>moon</b>."],
        ["ven", "shell", "Venus, goddess of love, was born from the sea — and rode ashore on a <b>scallop shell</b>."],
        ["mar", "helmet", "Mars, god of <b>war</b>."],
        ["mer", "wingcap", "Mercury, the speedy messenger, with his <b>winged hat</b> and sandals."],
      ];
      const grid = kit.el("div", "grid2", null, root);
      const colG = kit.el("div", "", null, grid);
      const colS = kit.el("div", "", null, grid);
      [colG, colS].forEach((c) => (c.style.cssText = "display:flex;flex-direction:column;gap:8px"));
      const fact = kit.el("p", "prompt", "&nbsp;", root);
      let selG = null, selS = null, left = pairs.length, mistakes = 0;
      const tiles = {};
      const tryMatch = () => {
        if (!selG || !selS) return;
        const [g, s] = [selG, selS];
        selG = selS = null;
        const p = pairs.find((x) => x[0] === g.dataset.id);
        if (p[1] === s.dataset.id) {
          A().sfx("right");
          g.classList.remove("sel"); s.classList.remove("sel");
          g.classList.add("ok"); s.classList.add("ok");
          fact.innerHTML = p[2];
          left--;
          set("left", left ? `${left} to match` : "All matched!");
          if (!left) kit.after(1400, () => resolve({ score: 1 - mistakes * 0.08, note: mistakes ? `All matched, with ${mistakes} mix-up${mistakes > 1 ? "s" : ""}.` : "Perfect — the gods are impressed!" }));
        } else {
          mistakes++;
          A().sfx("wrong");
          [g, s].forEach((x) => { x.classList.remove("sel"); x.classList.add("bad"); setTimeout(() => x.classList.remove("bad"), 450); });
        }
      };
      pairs.forEach(([id]) => {
        const b = kit.el("button", "tile portrait", `<div class="pt">${portrait(id)}</div>${OU.art.META[id].name}`, colG);
        b.dataset.id = id;
        tiles[id] = b;
        kit.on(b, "click", () => { A().sfx("tap"); if (selG) selG.classList.remove("sel"); selG = b; b.classList.add("sel"); tryMatch(); });
      });
      shuffle(pairs).forEach(([, ic]) => {
        const b = kit.el("button", "tile portrait", OU.art.icon(ic), colS);
        b.dataset.id = ic;
        kit.on(b, "click", () => { A().sfx("tap"); if (selS) selS.classList.remove("sel"); selS = b; b.classList.add("sel"); tryMatch(); });
      });
    });
  }

  // ===========================================================================
  // 5. Rondo of the Metamorphoses — memory
  // ===========================================================================
  function memory(kit) {
    return new Promise((resolve) => {
      const set = kit.hud("Rondo of the Metamorphoses", { turns: "Turns: 0" });
      const root = kit.el("div", "dgame");
      kit.el("p", "prompt", "Match each of Jupiter's <b>disguises</b> with the <b>woman</b> he was wooing.", root);
      const pairs = [
        ["bull", "A Bull", "Europa"],
        ["swan", "A Swan", "Leda"],
        ["goldrain", "Golden Rain", "Danaë"],
        ["husband", "Her Husband", "Alcmene"],
      ];
      const cards = shuffle(pairs.flatMap(([ic, label, who]) => [
        { pair: ic, html: `${OU.art.icon(ic)}<span>${label}</span>` },
        { pair: ic, html: `<span style="font-family:var(--display);font-size:1.15rem;color:#6a0a1e">${who}</span><span style="font-weight:400;font-size:.8rem">wooed by Jupiter</span>` },
      ]));
      const grid = kit.el("div", "grid4", null, root);
      grid.style.gridTemplateColumns = "repeat(4, 1fr)";
      const info = kit.el("p", "prompt", "&nbsp;", root);
      let open = [], turns = 0, matched = 0, lock = false;
      cards.forEach((cd) => {
        const b = kit.el("button", "memcard", `<div class="in"><div class="b">?</div><div class="f">${cd.html}</div></div>`, grid);
        kit.on(b, "click", () => {
          if (lock || b.classList.contains("flip")) return;
          A().sfx("tap");
          b.classList.add("flip");
          open.push([b, cd]);
          if (open.length === 2) {
            turns++;
            set("turns", `Turns: ${turns}`);
            const [[b1, c1], [b2, c2]] = open;
            open = [];
            if (c1.pair === c2.pair) {
              matched++;
              A().sfx("right");
              b1.classList.add("matched"); b2.classList.add("matched");
              const p = pairs.find((x) => x[0] === c1.pair);
              info.innerHTML = `Jupiter became <b>${p[1].toLowerCase()}</b> to woo <b>${p[2]}</b>.`;
              if (matched === pairs.length) kit.after(1300, () => resolve({ score: clamp(1 - (turns - 4) * 0.07, 0.35, 1), note: `All four disguises matched in ${turns} turns.` }));
            } else {
              lock = true;
              kit.after(900, () => { b1.classList.remove("flip"); b2.classList.remove("flip"); lock = false; });
            }
          }
        });
      });
    });
  }

  // ===========================================================================
  // 6. Keep up appearances (red light / green light)
  // ===========================================================================
  function appearances(kit) {
    return new Promise((resolve) => {
      const c = kit.canvas(), g = c.g;
      const bg = bgImg("olympus");
      const oHappy = charImg("orp", "happy"), oSad = charImg("orp", "sad");
      const opWatch = charImg("op", "angry"), opRead = charImg("op", "bored");
      const set = kit.hud("Keep Up Appearances", { joy: "Joy 0%", x: "Caught: 0/3" });
      const bar = kit.bar();
      const P = particles();
      const ctl = kit.el("div", "gctl");
      const btn = kit.el("button", "gbtn", "HOLD to celebrate 💃", ctl);
      btn.style.maxWidth = "320px";
      let holding = false;
      const down = (e) => { e.preventDefault(); e.stopPropagation(); holding = true; btn.classList.add("pressed"); };
      const up = () => { holding = false; btn.classList.remove("pressed"); };
      kit.on(btn, "pointerdown", down);
      kit.on(window, "pointerup", up);
      kit.on(window, "pointercancel", up);
      kit.on(window, "keydown", (e) => { if (e.code === "Space") { holding = true; btn.classList.add("pressed"); } });
      kit.on(window, "keyup", (e) => { if (e.code === "Space") up(); });
      const T = 45;
      let t = 0, joy = 0, strikes = 0, state = "read", st = 2.5, caughtThis = false, done = false, yell = 0, noteT = 0;
      const finish = () => {
        if (done) return;
        done = true;
        holding = false;
        kit.msg(joy >= 100 ? "Pure joy!" : "Time's up!", 1200);
        kit.after(1300, () => resolve({ score: 0.6 * (joy / 100) + 0.4 * (1 - strikes / 3), note: `Secret joy: ${Math.round(joy)}%. Caught ${strikes} time${strikes === 1 ? "" : "s"}.` }));
      };
      kit.loop((dt) => {
        const { W, H } = c;
        t += dt;
        bar(1 - t / T);
        if (!done) {
          st -= dt;
          if (st <= 0) {
            if (state === "read") { state = "warn"; st = rand(0.6, 0.9); A().sfx("whoosh"); }
            else if (state === "warn") { state = "watch"; st = rand(1.3, 2.3); caughtThis = false; }
            else { state = "read"; st = rand(1.6, 3.4); }
          }
          if (holding) {
            if (state === "watch") {
              if (!caughtThis) {
                caughtThis = true;
                strikes++;
                joy = Math.max(0, joy - 12);
                yell = 1.1;
                A().sfx("wrong");
                kit.msg("CAUGHT!", 900);
                set("x", `Caught: ${strikes}/3`);
              }
            } else {
              joy = Math.min(100, joy + dt * 9);
              noteT -= dt;
              if (noteT <= 0) { noteT = 0.25; P.add({ x: W * 0.38 + rand(-30, 30), y: H * 0.5, vx: rand(-30, 30), vy: -120, grav: 0, life: 1.2, c: "#ffe7a6", text: pick(["♪", "♫", "♬"]), size: 26 }); }
            }
          }
          set("joy", `Joy ${Math.round(joy)}%`);
          if (joy >= 100 || t >= T || strikes >= 3) finish();
        }
        yell = Math.max(0, yell - dt);
        drawCover(g, bg, W, H);
        // joy meter
        const my = H * 0.13;
        g.fillStyle = "rgba(20,6,13,.75)"; g.fillRect(14, my - 4, W - 28, 30);
        g.fillStyle = "#ffe7a6"; g.font = "bold 14px Georgia, serif"; g.textAlign = "left"; g.fillText("SECRET JOY", 22, my + 16);
        g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(118, my + 4, W - 146, 14);
        g.fillStyle = "#e8b04a"; g.fillRect(118, my + 4, (W - 146) * joy / 100, 14);
        const celebrating = holding && !done;
        const ox = W * 0.36, oy = H * 0.86, oh = H * 0.42;
        if (celebrating) drawChar(g, oHappy, ox, oy - Math.abs(Math.sin(t * 9)) * 18, oh, { rot: Math.sin(t * 9) * 0.12 });
        else {
          drawChar(g, oSad, ox, oy, oh);
          if (Math.floor(t * 3) % 2 === 0) { g.fillStyle = "#9ad8ff"; g.beginPath(); g.ellipse(ox - oh * 0.07, oy - oh * 0.66 + (t * 40) % 20, 3, 5, 0, 0, 7); g.fill(); }
        }
        // Public Opinion with her newspaper
        const px = W * 0.76, py = H * 0.86, ph = H * 0.44;
        drawChar(g, state === "watch" ? opWatch : opRead, px, py, ph);
        const paperUp = state !== "watch";
        const shake = state === "warn" ? Math.sin(t * 50) * 4 : 0;
        const pw = ph * 0.42, phh = ph * 0.3;
        const pyTop = paperUp ? py - ph * 0.98 : py - ph * 0.5;
        g.save();
        g.translate(px + shake, pyTop + phh / 2);
        g.rotate(paperUp ? -0.06 : 0.1);
        g.fillStyle = "#efe8d6"; g.strokeStyle = "#1d1322"; g.lineWidth = 2.5;
        g.fillRect(-pw / 2, -phh / 2, pw, phh); g.strokeRect(-pw / 2, -phh / 2, pw, phh);
        g.fillStyle = "#1d1322"; g.font = `bold ${Math.round(pw / 8)}px Georgia, serif`; g.textAlign = "center";
        g.fillText("THE DAILY", 0, -phh * 0.28);
        g.fillText("OPINION", 0, -phh * 0.28 + pw / 7.5);
        g.fillStyle = "#8a8070";
        for (let i = 0; i < 4; i++) g.fillRect(-pw * 0.4, phh * 0.05 + i * phh * 0.1, pw * 0.8, 2);
        g.restore();
        if (state === "warn") { g.fillStyle = "#ffe7a6"; g.font = `bold ${Math.round(W / 11)}px Georgia, serif`; g.textAlign = "center"; g.fillText("?!", px + pw * 0.6, pyTop - 6); }
        if (yell > 0) {
          g.fillStyle = "#fff"; g.strokeStyle = "#1d1322"; g.lineWidth = 3;
          const bx = W * 0.5, by = H * 0.24;
          g.beginPath(); g.ellipse(bx, by, W * 0.3, H * 0.05, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = "#a8122e"; g.font = `bold ${Math.round(W / 14)}px Georgia, serif`; g.textAlign = "center"; g.fillText("ORPHEUS!!", bx, by + 8);
        }
        P.update(g, dt);
      });
    });
  }

  // ===========================================================================
  // 7. The Fly Duet — buzz memory (Simon)
  // ===========================================================================
  function buzz(kit) {
    return new Promise((resolve) => {
      const set = kit.hud("The Fly Duet", { r: "Round 1/4" });
      const root = kit.el("div", "dgame buzz-game");
      const say = kit.el("p", "prompt", "Watch the fly…", root);
      const field = kit.el("div", "buzz-field", null, root);
      const pads = [
        { f: 330, c: "#c4123b", label: "Bzz" },
        { f: 392, c: "#e8b04a", label: "Zzz" },
        { f: 494, c: "#7a4ac0", label: "Bzzz" },
        { f: 587, c: "#2a9a7a", label: "Zzzz" },
      ].map((p, i) => {
        const b = kit.el("button", "buzz-pad", `<span>${p.label}</span>`, field);
        b.style.setProperty("--pc", p.c);
        b.dataset.i = i;
        return { ...p, el: b };
      });
      const fly = kit.el("div", "buzz-fly", OU.art.character("fly", "happy"), field);
      const eur = kit.el("div", "buzz-eur", OU.art.character("eur", "love", { variant: "ghost" }).replace('viewBox="0 0 200 400"', 'viewBox="30 -14 140 170"'), root);
      const seq = Array.from({ length: 6 }, () => Math.floor(Math.random() * 4));
      const lens = [3, 4, 5, 6];
      let round = 0, pos = 0, listening = false, roundMistakes = 0, credit = 0;
      const flyTo = (i) => {
        const r = pads[i].el.getBoundingClientRect(), fr = field.getBoundingClientRect();
        fly.style.left = `${r.left - fr.left + r.width / 2}px`;
        fly.style.top = `${r.top - fr.top + r.height / 2 - 30}px`;
      };
      const light = (i, dur = 0.38) => {
        const p = pads[i];
        p.el.classList.add("lit");
        A().sfx("buzz", { freq: p.f, dur });
        kit.after(dur * 1000, () => p.el.classList.remove("lit"));
      };
      const playRound = async () => {
        listening = false;
        say.innerHTML = "🪰 Watch and listen to the fly…";
        set("r", `Round ${round + 1}/4`);
        await kit.wait(700);
        const gap = round < 2 ? 640 : 520;
        for (let k = 0; k < lens[round]; k++) {
          flyTo(seq[k]);
          await kit.wait(200);
          light(seq[k]);
          await kit.wait(gap);
        }
        fly.style.left = "50%";
        fly.style.top = "-10px";
        pos = 0;
        listening = true;
        say.innerHTML = "💙 Your turn, Eurydice — buzz it back!";
      };
      pads.forEach((p, i) => kit.on(p.el, "pointerdown", (e) => {
        e.preventDefault();
        if (!listening) return;
        light(i, 0.3);
        if (i === seq[pos]) {
          pos++;
          if (pos >= lens[round]) {
            listening = false;
            credit += roundMistakes === 0 ? 1 : 0.6;
            kit.msg(pick(["Bzz-ravo!", "Zzz-uperb!", "Magnifique!"]), 900);
            A().sfx("right");
            next(true);
          }
        } else {
          listening = false;
          roundMistakes++;
          A().sfx("wrong");
          kit.msg("Wrong buzz!", 800);
          if (roundMistakes >= 2) next(false);
          else kit.after(900, playRound);
        }
      }));
      const next = (ok) => {
        round++;
        roundMistakes = 0;
        if (round >= lens.length) {
          say.innerHTML = "♥ What a duet!";
          kit.after(1200, () => resolve({ score: credit / lens.length, note: `You matched ${Math.round(credit * 10) / 10} of 4 buzz-phrases.` }));
        } else kit.after(ok ? 1000 : 1100, playRound);
      };
      kit.after(300, playRound);
    });
  }

  // ===========================================================================
  // 8. Dress the Bacchante
  // ===========================================================================
  function dress(kit) {
    return new Promise((resolve) => {
      kit.hud("Disguise Eurydice", {});
      const root = kit.el("div", "dgame");
      kit.el("p", "prompt", "Dress Eurydice as a <b>Bacchante</b>, a wild follower of Bacchus. Pick one item from each row!", root);
      const stage = kit.el("div", "dress-stage", null, root);
      const model = kit.el("div", "model", null, stage);
      const slots = kit.el("div", "slots", null, stage);
      const rows = [
        { key: "head", label: "Head", items: [["ivy", "Ivy & grapes"], ["laurel", "Laurel wreath"], ["helmet", "War helmet"]], right: "ivy",
          why: { laurel: "A laurel wreath belongs to Apollo — and to victorious athletes.", helmet: "A war helmet? That's for Mars or Minerva!" } },
        { key: "garment", label: "Wear", items: [["fawn", "Fawn skin"], ["toga", "Toga"], ["gown", "Ball gown"]], right: "fawn",
          why: { toga: "A toga is what a Roman citizen wears to the Senate — not to a wild party.", gown: "Very glamorous — but that's Venus's style." } },
        { key: "hand", label: "Carry", items: [["thyrsus", "Thyrsus"], ["lyre", "Lyre"], ["trident", "Trident"]], right: "thyrsus",
          why: { lyre: "The lyre belongs to Apollo — and to Orpheus! The last thing she wants.", trident: "The trident is Neptune's, god of the sea." } },
      ];
      const sel = {};
      const fb = kit.el("p", "prompt", "&nbsp;", root);
      let wrongTries = 0;
      const draw = () => {
        model.innerHTML = OU.art.character("eur", "happy", { variant: "ghost", costume: { head: sel.head, garment: sel.garment, hand: sel.hand } });
      };
      rows.forEach((r) => {
        kit.el("div", "slot-label", r.label, slots);
        const row = kit.el("div", "slot-row", null, slots);
        r.btns = r.items.map(([id, name]) => {
          const b = kit.el("button", "tile", `${OU.art.icon(id === "helmet" ? "helmetW" : id)}<span>${name}</span>`, row);
          kit.on(b, "click", () => {
            A().sfx("tap");
            sel[r.key] = id;
            r.btns.forEach((x) => x.classList.remove("sel", "bad"));
            b.classList.add("sel");
            draw();
          });
          return b;
        });
      });
      draw();
      const go = kit.el("button", "btn gold", "Évohé! Done ✨", root);
      go.style.alignSelf = "center";
      kit.on(go, "click", () => {
        const missing = rows.filter((r) => !sel[r.key]);
        if (missing.length) { fb.innerHTML = `Choose something for <b>${missing.map((r) => r.label).join(", ")}</b> first!`; A().sfx("wrong"); return; }
        const wrong = rows.filter((r) => sel[r.key] !== r.right);
        if (!wrong.length) {
          A().sfx("magic");
          fb.innerHTML = "Perfect! Ivy crown, fawn skin and a <b>thyrsus</b> — the classic Bacchante look. Pluto will never recognise her!";
          go.disabled = true;
          kit.after(1800, () => resolve({ score: 1 - wrongTries * 0.15, note: wrongTries ? `Disguise complete after ${wrongTries + 1} tries.` : "A perfect disguise on the first try!" }));
        } else {
          wrongTries++;
          A().sfx("wrong");
          fb.innerHTML = wrong.map((r) => r.why[sel[r.key]]).join(" ");
          wrong.forEach((r) => r.btns.forEach((b) => b.classList.contains("sel") && b.classList.add("bad")));
        }
      });
    });
  }

  // ===========================================================================
  // 9. Galop infernal — rhythm game synced to the synthesized can-can
  // ===========================================================================
  function galop(kit) {
    return new Promise((resolve) => {
      const c = kit.canvas(), g = c.g;
      const bg = bgImg("party");
      const set = kit.hud("Galop Infernal", { s: "Score 0", k: "Combo 0" });
      const bar = kit.bar();
      const P = particles();
      const au = OU.audio;
      const ctx = au.ctx;
      const clock = () => (ctx ? ctx.currentTime : performance.now() / 1000);
      const lat = ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0;
      au.stop();

      // build the timeline: 4 passes of the tune, each faster
      const tempos = [126, 140, 154, 170];
      const mel = au.parse(au.GALOP_MELODY);
      const bass = au.parse(galopBass());
      const start = clock() + 2.6;
      const bus = au.musicOn ? undefined : au.sfxBus;
      const audioEv = [];
      const notes = [];
      let tt = start;
      tempos.forEach((bpm, pass) => {
        const s16 = 60 / bpm / 4;
        mel.events.forEach((e) => {
          audioEv.push({ t: tt + e.at * s16, inst: "lead", m: e.m, len: e.len * s16, v: 1 });
          if (pass >= 2) audioEv.push({ t: tt + e.at * s16, inst: "brass", m: e.m - 12, len: e.len * s16, v: 0.35 });
        });
        bass.events.forEach((e) => audioEv.push({ t: tt + e.at * s16, inst: e.m >= 60 ? "chord" : "bass", m: e.m, len: e.len * s16, v: 1 }));
        for (let k = 0; k < mel.length; k += 2) audioEv.push({ t: tt + k * s16, inst: k % 4 === 2 ? "snare" : "hat", m: 60, len: 0.1, v: k % 4 === 2 ? 0.6 : 1 });
        // tap notes: on beats where the melody starts a note
        const step = pass === 0 ? 8 : 4;
        mel.events.forEach((e) => {
          if (e.at % step !== 0) return;
          if (pass === 3 && e.at % 4 !== 0) return;
          const lane = e.m <= 74 ? 0 : e.m <= 79 ? 1 : 2; // ≤D5 left, E5–G5 middle, A5+ right
          notes.push({ t: tt + e.at * s16, lane, hit: false, missed: false });
        });
        tt += mel.length * s16;
      });
      const end = tt;
      // count-in clicks
      [0, 1, 2, 3].forEach((i) => audioEv.push({ t: start - (4 - i) * (60 / tempos[0]), inst: "bell", m: i === 3 ? 84 : 79, len: 0.1, v: 0.7 }));
      audioEv.sort((a, b) => a.t - b.t);
      let ai = 0;

      let score = 0, combo = 0, best = 0, perfect = 0, good = 0, miss = 0, done = false;
      const kicks = [0, 0, 0, 0, 0];
      const laneFlash = [0, 0, 0];
      const FALL = 1.5;
      const ctl = kit.el("div", "gctl");
      ["◀ KICK", "TWIRL", "KICK ▶"].forEach((t2, i) => {
        const b = kit.el("button", `gbtn ${["red", "", "violet"][i]}`, t2, ctl);
        kit.on(b, "pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); hitLane(i); b.classList.add("pressed"); kit.after(100, () => b.classList.remove("pressed")); });
      });
      kit.on(kit.root, "pointerdown", (e) => { const { x, y } = kit.pt(e); if (y > c.H * 0.3) hitLane(Math.min(2, Math.floor((x / c.W) * 3))); });
      kit.on(window, "keydown", (e) => {
        const k = { ArrowLeft: 0, a: 0, j: 0, ArrowDown: 1, ArrowUp: 1, s: 1, k: 1, " ": 1, ArrowRight: 2, d: 2, l: 2 }[e.key];
        if (k != null) { e.preventDefault(); hitLane(k); }
      });
      const judge = (txt, col) => P.add({ x: c.W / 2, y: c.H * 0.36, vx: 0, vy: -40, grav: 0, life: 0.7, c: col, text: txt, size: Math.round(c.W / 11) });
      function hitLane(lane) {
        if (done) return;
        laneFlash[lane] = 0.15;
        const now = clock() - lat;
        let bestN = null, bd = 9;
        notes.forEach((n) => {
          if (n.hit || n.missed || n.lane !== lane) return;
          const d = Math.abs(n.t - now);
          if (d < bd) { bd = d; bestN = n; }
        });
        if (bestN && bd <= 0.16) {
          bestN.hit = true;
          const pf = bd <= 0.075;
          pf ? perfect++ : good++;
          combo++;
          best = Math.max(best, combo);
          score += (pf ? 100 : 60) + Math.min(combo, 30) * 2;
          judge(pf ? "Magnifique!" : "Bravo!", pf ? "#ffe7a6" : "#ffb8c8");
          au.sfx("kick");
          const ds = lane === 0 ? [0, 1] : lane === 1 ? [2] : [3, 4];
          ds.forEach((d) => (kicks[d] = 1));
          const x = c.W * (0.5 + (lane - 1) * 0.3);
          P.burst(x, hitY(), ["#ffe7a6", "#ff4a6a", "#fff", "#8fe3a2"], 10, 200);
        } else {
          combo = 0;
        }
        set("s", `Score ${score}`);
        set("k", `Combo ${combo}`);
      }
      const hitY = () => c.H * 0.74;
      kit.root.__auto = { notes, clock, lat, hitLane }; // used by automated tests

      function drawDancer(x, footY, h, k, t2, col) {
        // k: kick amount 0..1
        g.save();
        g.translate(x, footY - Math.abs(Math.sin(t2 * Math.PI * 2)) * h * 0.03);
        const s = h / 100;
        g.lineCap = "round";
        // standing leg
        g.strokeStyle = "#1d1322"; g.lineWidth = 6 * s;
        g.beginPath(); g.moveTo(-4 * s, -40 * s); g.lineTo(-6 * s, 0); g.stroke();
        // kicking leg
        const ang = -0.2 - k * 2.4;
        g.beginPath(); g.moveTo(4 * s, -40 * s); g.lineTo(4 * s + Math.sin(-ang) * 40 * s, -40 * s + Math.cos(ang) * 40 * s); g.stroke();
        // skirt (flips up with the kick)
        const flip = k * 26 * s;
        g.fillStyle = "#fbf3e2"; g.strokeStyle = "#1d1322"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-14 * s, -58 * s); g.quadraticCurveTo(-34 * s, -38 * s - flip * 0.2, -26 * s, -34 * s - flip * 0.3);
        for (let i = 0; i <= 6; i++) g.quadraticCurveTo((-22 + i * 8) * s, (-28 - (i % 2) * 6) * s - flip * (i / 6), (-18 + i * 8) * s, (-34 * s) - flip * (i / 6));
        g.quadraticCurveTo(34 * s, -40 * s - flip, 14 * s, -58 * s); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = col;
        g.beginPath(); g.moveTo(-12 * s, -58 * s); g.quadraticCurveTo(-26 * s, -44 * s, -20 * s, -40 * s - flip * 0.2); g.lineTo(20 * s, -40 * s - flip * 0.8); g.quadraticCurveTo(26 * s, -46 * s, 12 * s, -58 * s); g.closePath(); g.fill(); g.stroke();
        // bodice
        g.fillStyle = "#1d1322"; g.beginPath(); g.moveTo(-10 * s, -58 * s); g.lineTo(-12 * s, -80 * s); g.lineTo(12 * s, -80 * s); g.lineTo(10 * s, -58 * s); g.closePath(); g.fill();
        // arms
        g.strokeStyle = "#f2e4d8"; g.lineWidth = 4 * s;
        g.beginPath(); g.moveTo(-11 * s, -78 * s); g.lineTo(-22 * s, -64 * s + k * -18 * s); g.moveTo(11 * s, -78 * s); g.lineTo(24 * s, -92 * s); g.stroke();
        // head
        g.fillStyle = "#f2e4d8"; g.strokeStyle = "#1d1322"; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, -90 * s, 9 * s, 11 * s, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = "#1d1322"; g.beginPath(); g.arc(-3 * s, -91 * s, 1.6 * s, 0, 7); g.arc(3 * s, -91 * s, 1.6 * s, 0, 7); g.fill();
        g.fillStyle = "#2a1a2a"; g.beginPath(); g.ellipse(0, -98 * s, 10 * s, 5 * s, 0, 0, 7); g.fill();
        // feather
        g.strokeStyle = col; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(4 * s, -100 * s); g.quadraticCurveTo(16 * s, -118 * s, 6 * s, -126 * s); g.stroke();
        g.restore();
      }

      kit.loop((dt) => {
        const { W, H } = c;
        const now = clock();
        // schedule audio ahead
        while (ai < audioEv.length && audioEv[ai].t < now + 0.25) {
          const e = audioEv[ai++];
          if (e.t >= now - 0.02) au.playNote(e.inst, e.m, Math.max(e.t, now), e.len, e.v, bus);
        }
        const vt = now - lat;
        bar(1 - clamp((vt - start) / (end - start)));
        drawCover(g, bg, W, H);
        g.fillStyle = "rgba(10,0,10,.45)"; g.fillRect(0, 0, W, H);
        // dancers
        const beatPhase = ((vt - start) * 2.3) % 1;
        const cols = ["#c4123b", "#e8b04a", "#7a4ac0", "#2a9a7a", "#c4123b"];
        for (let i = 0; i < 5; i++) {
          kicks[i] = Math.max(0, kicks[i] - dt * 3.2);
          drawDancer(W * (0.12 + i * 0.19), H * 0.56, H * 0.24, kicks[i], beatPhase + i * 0.1, cols[i]);
        }
        // lanes
        const hy = hitY();
        for (let l = 0; l < 3; l++) {
          const x = W * (0.5 + (l - 1) * 0.3);
          laneFlash[l] = Math.max(0, laneFlash[l] - dt);
          g.strokeStyle = "rgba(255,226,160,.18)"; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x, H * 0.2); g.lineTo(x, hy); g.stroke();
          g.fillStyle = laneFlash[l] > 0 ? "rgba(255,226,160,.55)" : "rgba(255,226,160,.12)";
          g.strokeStyle = ["#ff6a8a", "#ffe7a6", "#c9a6ff"][l]; g.lineWidth = 4;
          g.beginPath(); g.arc(x, hy, Math.min(W * 0.11, 44), 0, 7); g.fill(); g.stroke();
        }
        // notes
        notes.forEach((n) => {
          if (n.hit) return;
          const dtn = n.t - vt;
          if (!n.missed && dtn < -0.18) {
            n.missed = true; miss++; combo = 0; set("k", "Combo 0");
            judge("Oups!", "#9a90a0");
          }
          if (dtn > FALL || dtn < -0.3) return;
          const y = hy - (dtn / FALL) * (hy - H * 0.2);
          const x = W * (0.5 + (n.lane - 1) * 0.3);
          const r = Math.min(W * 0.085, 34);
          g.globalAlpha = n.missed ? 0.3 : 1;
          g.fillStyle = ["#c4123b", "#e8b04a", "#7a4ac0"][n.lane];
          g.strokeStyle = "#fff6e0"; g.lineWidth = 3;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = "#fff6e0"; g.font = `${Math.round(r)}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText(["◀", "✦", "▶"][n.lane], x, y + 1);
          g.textBaseline = "alphabetic";
          g.globalAlpha = 1;
        });
        if (vt < start) {
          const k = Math.ceil(start - vt);
          g.fillStyle = "#ffe7a6"; g.font = `${Math.round(W / 5)}px Limelight, Georgia, serif`; g.textAlign = "center";
          g.fillText(k > 4 ? "" : k, W / 2, H * 0.45);
        }
        P.update(g, dt);
        if (!done && vt > end + 0.4) {
          done = true;
          const total = notes.length;
          const acc = (perfect + good * 0.6) / total;
          au.sfx("applause");
          kit.msg("BRAVO!", 1500);
          kit.after(1700, () => resolve({ score: clamp(acc * 1.08), note: `${perfect} magnifique, ${good} bravo, ${miss} missed · best combo ${best}.` }));
        }
      });
    });
  }
  function galopBass() {
    const ch = OU.audio.CHORDS;
    return OU.audio.GALOP_CHORDS.map((c) => `${ch[c][0]}/2 ${ch[c][1]}/2 ${ch[c][0]}/2 ${ch[c][1]}/2`).join(" ");
  }

  // ===========================================================================
  // 10. Don't Look Back
  // ===========================================================================
  function walk(kit) {
    return new Promise((resolve) => {
      const c = kit.canvas(), g = c.g;
      const orp = [charImg("orp", "worried"), charImg("orp", "sad")];
      const eur = charImg("eur", "sly", { variant: "ghost" });
      const op = charImg("op", "angry");
      const set = kit.hud("Don't Look Back!", { r: "Resisted 0" });
      const P = particles();
      const ctl = kit.el("div", "gctl");
      const bL = kit.el("button", "gbtn teal", "👣 Left", ctl);
      const bR = kit.el("button", "gbtn teal", "Right 👣", ctl);
      const look = kit.el("button", "gbtn red look-btn", "👀 Look back?", kit.root);
      look.style.display = "none";
      let progress = 0, nextFoot = 0, step = 0, stumbles = 0, resisted = 0, tempted = 0, lookedBack = 0, t = 0, done = false;
      let bubble = null, bubbleT = 0, tempT = 3, scold = 0;
      const lines = [
        "Orpheus, darling… your cravat is crooked!",
        "Ow! I think I stubbed my toe…",
        "Is that a NEW violin? Let me see!",
        "Psst! Turn around! Quickly!",
        "Look — a three-headed dog behind us!",
        "Pluto is SO much more handsome than you…",
        "Did you hear that? Something's following us!",
      ];
      const order = shuffle(lines);
      const stepFoot = (f) => {
        if (done) return;
        if (f !== nextFoot) { stumbles++; progress = Math.max(0, progress - 0.004); A().sfx("bump"); kit.msg("Stumble!", 500); return; }
        nextFoot = 1 - nextFoot;
        step++;
        progress = Math.min(0.92, progress + 0.0125);
        A().sfx("step");
        if (progress >= 0.92) finish();
      };
      kit.on(bL, "pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); stepFoot(0); });
      kit.on(bR, "pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); stepFoot(1); });
      kit.on(window, "keydown", (e) => { if (e.key === "ArrowLeft") stepFoot(0); if (e.key === "ArrowRight") stepFoot(1); });
      kit.on(look, "pointerdown", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (done) return;
        lookedBack++;
        look.style.display = "none";
        bubbleT = 0;
        scold = 1.4;
        progress = Math.max(0, progress - 0.06);
        A().sfx("wrong");
        kit.msg("EYES FRONT!", 900);
      });
      const finish = () => {
        if (done) return;
        done = true;
        if (bubbleT > 0 && look.style.display !== "none") resisted++;
        bubbleT = 0;
        look.style.display = "none";
        kit.msg("Almost out…!", 1400);
        const s = 0.6 * (tempted ? resisted / tempted : 1) + 0.4 * clamp(1 - stumbles * 0.05);
        kit.after(1500, () => resolve({ score: s, note: `Resisted ${resisted} of ${tempted} temptations${lookedBack ? `, peeked ${lookedBack} time${lookedBack > 1 ? "s" : ""}` : ""}.` }));
      };
      kit.loop((dt) => {
        const { W, H } = c;
        t += dt;
        if (!done) {
          tempT -= dt;
          if (tempT <= 0 && bubbleT <= 0) {
            tempted++;
            bubble = order[(tempted - 1) % order.length];
            bubbleT = 2.8;
            tempT = rand(3.2, 4.6);
            look.style.display = "";
            A().sfx(pick(["hiss", "whoosh", "squeak"]));
          }
          if (bubbleT > 0) {
            bubbleT -= dt;
            if (bubbleT <= 0) {
              if (look.style.display !== "none") { resisted++; set("r", `Resisted ${resisted}`); kit.msg("Resisted!", 600); A().sfx("rose"); }
              look.style.display = "none";
            }
          }
        }
        scold = Math.max(0, scold - dt);
        // background: parallax river bank
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0a1416"); gr.addColorStop(1, "#1e4a3e");
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const ex = W * (1.25 - progress * 0.4);
        const glow = g.createRadialGradient(ex, H * 0.3, 5, ex, H * 0.3, W * 0.5);
        glow.addColorStop(0, `rgba(240,255,230,${0.3 + progress * 0.6})`); glow.addColorStop(1, "rgba(240,255,230,0)");
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        const off = step * 14;
        g.fillStyle = "#0a1a16";
        for (let i = -1; i < 6; i++) {
          const x = ((i * 140 - off * 0.4) % (W + 280) + W + 280) % (W + 280) - 140;
          g.beginPath(); g.moveTo(x, H * 0.62); g.quadraticCurveTo(x - 10, H * 0.4, x + 6, H * 0.3); g.lineTo(x + 14, H * 0.3); g.quadraticCurveTo(x + 4, H * 0.42, x + 18, H * 0.62); g.fill();
          g.strokeStyle = "#0a1a16"; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 8, H * 0.36); g.quadraticCurveTo(x + 40, H * 0.3, x + 50, H * 0.36); g.stroke();
        }
        g.fillStyle = "#1f6a4a"; g.fillRect(0, H * 0.62, W, H * 0.07);
        g.strokeStyle = "rgba(122,255,192,.5)"; g.lineWidth = 2;
        for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.645 + k * 14 + Math.sin(x / 30 + t * 2 + k) * 3); g.stroke(); }
        g.fillStyle = "#14231e"; g.fillRect(0, H * 0.69, W, H * 0.31);
        // characters: Eurydice behind (left), Orpheus walking right, Public Opinion behind her
        const fy = H * 0.84, ch = H * 0.33;
        drawChar(g, op, W * 0.12, fy + 4, ch * 0.96, { alpha: 0.85 });
        drawChar(g, eur, W * 0.33, fy - 8 + Math.sin(t * 3) * 6, ch * 0.95, { alpha: 0.8 });
        const walkBob = Math.abs(Math.sin(step * Math.PI / 2 + t * 0.001)) * 6;
        drawChar(g, orp[scold > 0 ? 1 : 0], W * 0.68, fy - walkBob, ch, { rot: Math.sin(step * Math.PI) * 0.05 });
        // progress bar to the exit
        g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(16, H * 0.14, W - 32, 12);
        g.fillStyle = "#8fe3a2"; g.fillRect(16, H * 0.14, (W - 32) * (progress / 0.92), 12);
        g.fillStyle = "#e6fff0"; g.font = "bold 13px Georgia, serif"; g.textAlign = "right"; g.fillText("EXIT ☀", W - 18, H * 0.14 - 4);
        if (bubbleT > 0 && bubble) {
          const bx = W * 0.36, by = H * 0.33, bw = W * 0.62;
          g.fillStyle = "#f4f0ff"; g.strokeStyle = "#1d1322"; g.lineWidth = 2.5;
          g.beginPath(); g.roundRect ? g.roundRect(bx - bw / 2, by - 34, bw, 60, 14) : g.rect(bx - bw / 2, by - 34, bw, 60); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(bx - 10, by + 26); g.lineTo(bx - 20, by + 44); g.lineTo(bx + 6, by + 26); g.fill();
          g.fillStyle = "#2a1a4a"; g.font = `italic ${Math.round(Math.min(17, W / 24))}px Georgia, serif`; g.textAlign = "center";
          wrap(g, bubble, bx, by - 10, bw - 20, 19);
        }
        if (scold > 0) { g.fillStyle = "#ffe7a6"; g.font = `bold ${Math.round(W / 16)}px Georgia, serif`; g.textAlign = "center"; g.fillText("Public Opinion: “EYES FRONT!”", W / 2, H * 0.22); }
        P.update(g, dt);
      });
    });
  }
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "", yy = y;
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    });
    g.fillText(line, x, yy);
  }

  // ===========================================================================
  // 11. Curtain call
  // ===========================================================================
  function curtaincall(kit) {
    return new Promise((resolve) => {
      const set = kit.hud("Curtain Call", { n: "Roses thrown: 0/9" });
      const root = kit.el("div", "dgame curtain-call");
      kit.el("p", "prompt", "Tap each cast member to throw them a rose 🌹", root);
      const cast = [
        ["orp", "happy", {}, "Free at last — back to his violin pupils."],
        ["eur", "happy", { variant: "bacchante" }, "A Bacchante forever. Évohé!"],
        ["plu", "sad", {}, "Lost his guest… but kept his party."],
        ["jup", "smug", {}, "Got away with it. Again."],
        ["op", "angry", {}, "Still outraged. Always will be."],
        ["juno", "sly", {}, "Keeping a very close eye on Jupiter."],
        ["sty", "sad", {}, "Still not King of Boeotia."],
        ["mer", "happy", {}, "Already zipping off to the next party."],
        ["ven", "happy", {}, "Finally — a holiday from nectar!"],
      ];
      const row = kit.el("div", "cc-row", null, root);
      const cap = kit.el("p", "prompt", "&nbsp;", root);
      let n = 0;
      cast.forEach(([id, mood, o, line]) => {
        const b = kit.el("button", "cc-actor", OU.art.character(id, mood, o), row);
        let thrown = false;
        kit.on(b, "click", () => {
          if (thrown) return;
          thrown = true;
          n++;
          b.classList.add("bow");
          A().sfx("rose");
          A().sfx("applause");
          cap.innerHTML = `<b>${OU.art.META[id].name}:</b> ${line}`;
          kit.el("div", "cc-rose", "🌹", b);
          set("n", `Roses thrown: ${n}/${cast.length}`);
          if (n === cast.length) kit.after(1600, () => resolve({ score: 1, note: "The whole cast takes a bow!" }));
        });
      });
    });
  }

  // ===========================================================================
  // 12. Final review quiz
  // ===========================================================================
  function quiz(kit) {
    return new Promise((resolve) => {
      const qs = shuffle(OU.story.quiz).slice(0, 8);
      const set = kit.hud("The Critics' Review", { n: "1/8", s: "✔ 0" });
      const root = kit.el("div", "dgame");
      let i = 0, right = 0;
      const show = () => {
        root.innerHTML = "";
        set("n", `${i + 1}/${qs.length}`);
        const q = qs[i];
        kit.el("p", "prompt", `<span style="font-family:var(--display);color:var(--absinthe);letter-spacing:.12em;font-size:.85rem">QUESTION ${i + 1}</span><br>${q.q}`, root);
        const list = kit.el("div", "", null, root);
        list.style.cssText = "display:flex;flex-direction:column;gap:10px";
        const fb = kit.el("p", "prompt", "&nbsp;", root);
        const btns = [];
        shuffle(q.o.map((_, k) => k)).forEach((k, pos) => {
          const opt = q.o[k];
          const b = kit.el("button", "choice", `<span class="letter">${"ABC"[pos]}</span>${opt}`, list);
          btns[k] = b;
          kit.on(b, "click", () => {
            [...list.children].forEach((x) => (x.disabled = true));
            if (k === q.a) { right++; b.classList.add("right"); A().sfx("right"); fb.innerHTML = "✔ Correct!"; }
            else { b.classList.add("wrong"); btns[q.a].classList.add("right"); A().sfx("wrong"); fb.innerHTML = `✘ The answer: <b>${q.o[q.a]}</b>`; }
            set("s", `✔ ${right}`);
            kit.after(1300, () => { i++; if (i < qs.length) show(); else resolve({ score: right / qs.length, note: `${right} of ${qs.length} correct.`, right, total: qs.length }); });
          });
        });
      };
      show();
    });
  }

  // ---------------------------------------------------------------------------
  const INFO = {
    concerto: { title: "The Concerto Duel", kicker: "Mini-game", art: ["eur", "angry"], how: ["Orpheus is 'serenading' Eurydice with his dreadful new concerto.", "<b>Tap the sour notes</b> before they reach her ears!", "Each note that gets through costs some of her patience."], max: 10 },
    runner: { kicker: "Mini-game", max: 10 },
    note: { title: "The Farewell Note", kicker: "Word puzzle", art: ["eur", "neutral", { variant: "ghost" }], how: ["Eurydice leaves Orpheus one of the most famous notes in operetta.", "<b>Fill in the blanks</b> to complete it."], max: 8 },
    match: { title: "Who's Who on Olympus", kicker: "Matching game", art: ["mer", "happy"], how: ["The gods are groggy after their nap.", "<b>Match each god to their symbol.</b> Wrong guesses cost a few roses."], max: 10 },
    memory: { title: "Rondo of the Metamorphoses", kicker: "Memory game", art: ["juno", "sly"], how: ["The gods are mocking Jupiter's famous disguises.", "<b>Flip two cards at a time</b> to pair each disguise with the woman he was wooing.", "Fewer turns = more roses."], max: 10 },
    appearances: { title: "Keep Up Appearances", kicker: "Mini-game", art: ["orp", "sad"], how: ["Orpheus is secretly thrilled to be single — but he must LOOK heartbroken.", "<b>Hold the button</b> to celebrate while Public Opinion reads her newspaper.", "When the paper rustles (<b>?!</b>), <b>let go</b> — she's about to look!", "Fill the joy meter without getting caught 3 times."], max: 10 },
    buzz: { title: "The Fly Duet", kicker: "Musical memory", art: ["fly", "happy"], how: ["Jupiter-the-fly buzzes a little tune.", "<b>Watch and listen</b>, then <b>tap the flowers in the same order</b> to buzz it back.", "The tunes get longer each round!"], max: 10 },
    dress: { title: "Disguise Eurydice", kicker: "Dress-up", art: ["eur", "happy", { variant: "ghost" }], how: ["Jupiter's plan: sneak Eurydice out disguised as a Bacchante.", "<b>Pick one item per row</b>, then press Done."], max: 8 },
    galop: { title: "The Galop Infernal", kicker: "Rhythm game", art: ["eur", "happy", { variant: "bacchante" }], how: ["The can-can is about to begin!", "When a circle reaches the target, <b>tap that lane</b> (or its button) to make the dancers kick.", "Keyboard: ← ↓ → or A S D.", "The tune plays four times — <b>faster every time!</b>"], max: 15 },
    walk: { title: "Don't Look Back!", kicker: "Mini-game", art: ["orp", "worried"], how: ["Lead Eurydice out of the Underworld.", "<b>Tap Left, Right, Left, Right</b> to walk.", "Eurydice will try to make you turn around. <b>DON'T tap “Look back?”</b> — just keep walking!"], max: 10 },
    curtaincall: { title: "Curtain Call", kicker: "Finale", art: ["off", "happy"], how: ["The whole cast returns for a bow.", "<b>Tap each performer</b> to throw them a rose."], max: 6, noSkip: true },
    quiz: { title: "The Critics' Review", kicker: "Final quiz", art: ["op", "smug"], how: ["Eight questions about the whole opera.", "Each right answer earns <b>2 roses</b>."], max: 16 },
  };

  function info(name, opts = {}) {
    const base = { ...INFO[name] };
    if (name === "runner") {
      const th = RUN[opts.theme] || RUN.field;
      base.title = th.title;
      base.art = [th.player[0], th.player[1]];
      base.how = [th.hint, "<b>Tap the left or right side</b> of the screen (or the ◀ ▶ buttons) to change lanes.", "You have 3 hearts."];
    }
    return base;
  }

  const IMPL = { concerto, runner, note, match, memory, appearances, buzz, dress, galop, walk, curtaincall, quiz };

  function run(name, root, opts) {
    const kit = new Kit(root);
    const p = IMPL[name](kit, opts || {});
    return { kit, promise: p };
  }

  return { run, info, portrait };
})();

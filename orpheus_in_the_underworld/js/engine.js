/* Orpheus in the Underworld — game engine: screens, stage, dialogue, saving. */
(() => {
  const $ = (s) => document.querySelector(s);
  const story = OU.story, art = OU.art, audio = OU.audio, games = OU.games;
  const chapters = story.chapters;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const KEY = "ou-orpheus-underworld-v1";
  const DEFAULTS = { name: "", best: {}, done: {}, unlockAll: false, music: true, sfx: true, fast: false };
  const state = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object") return { ...DEFAULTS, ...s };
    } catch (e) { /* storage unavailable */ }
    return { ...DEFAULTS, best: {}, done: {} };
  })();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  };
  if (new URLSearchParams(location.search).has("teacher")) state.unlockAll = true;
  const unlocked = (i) => state.unlockAll || i === 0 || !!state.done[chapters[i - 1].id];
  const firstOpen = () => {
    const i = chapters.findIndex((c) => !state.done[c.id]);
    return i < 0 ? 0 : i;
  };

  let run = null; // the chapter being played
  const totalRoses = () =>
    chapters.reduce((sum, c, i) => sum + (run && run.i === i ? Math.max(state.best[c.id] || 0, run.roses) : state.best[c.id] || 0), 0);
  const maxRoses = (() => {
    let m = 0;
    const walk = (steps) => steps.forEach((s) => {
      if (s.t === "ask") m += 3;
      if (s.t === "game") m += games.info(s.name, s.opts).max || 0;
      if (s.t === "choice") s.options.forEach((o) => walk(o.reply || []));
    });
    chapters.forEach((c) => walk(c.steps));
    return m;
  })();
  function updateRoses(bump) {
    document.querySelectorAll(".roses").forEach((el) => (el.textContent = totalRoses()));
    if (bump) document.querySelectorAll(".rose-count").forEach((el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = (html) => html.replace(/\{name\}/g, esc(state.name || "friend"));
  const parseWho = (w) => {
    const [id, variant] = String(w).split(":");
    return { id, variant: variant || null };
  };
  const show = (id) => document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
  function headSvg(id, mood = "neutral", variant) {
    const vb = id === "fly" ? "40 120 120 130" : id === "cup" ? "62 150 76 76" : "44 26 112 112";
    return art.character(id, mood, variant ? { variant } : {}).replace('viewBox="0 0 200 400"', `viewBox="${vb}"`);
  }

  // Abort support: any pending wait resolves when the player leaves a chapter.
  const waiters = new Set();
  function abortable(p) {
    return new Promise((resolve) => {
      const w = () => resolve("__abort");
      waiters.add(w);
      p.then((v) => { waiters.delete(w); resolve(v); });
    });
  }
  function abortChapter() {
    if (run) run.aborted = true;
    waiters.forEach((w) => w());
    waiters.clear();
  }

  // ---------------------------------------------------------------------------
  // Curtain & modal
  // ---------------------------------------------------------------------------
  const curtainEl = $("#curtain");
  async function curtain(close) {
    if (close) audio.sfx("whoosh");
    curtainEl.classList.toggle("closed", close);
    await sleep(780);
  }
  const modal = $("#modal");
  function openModal(html) {
    modal.innerHTML = `<div class="scrim"></div>${html}`;
    modal.classList.add("on");
    return modal;
  }
  function closeModal() {
    modal.classList.remove("on");
    modal.innerHTML = "";
  }
  function cardChoice(html, buttons, cls = "") {
    return new Promise((resolve) => {
      openModal(`<div class="card ${cls}">${html}<div class="row">${buttons.map((b, i) => `<button class="btn ${b.cls || "gold"}" data-i="${i}">${b.label}</button>`).join("")}</div></div>`);
      modal.querySelectorAll(".card .row .btn").forEach((b) => b.addEventListener("click", () => {
        audio.sfx("tap");
        resolve(buttons[Number(b.dataset.i)].value);
      }));
      modal.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => resolve(b.dataset.v)));
    });
  }

  // ---------------------------------------------------------------------------
  // Stage: background, ambient particles, actors
  // ---------------------------------------------------------------------------
  const stageEl = $("#stage"), bgEl = $("#bg"), actorsEl = $("#actors"), flashEl = $("#flash");
  let currentBg = null;
  function setBg(name) {
    currentBg = name;
    bgEl.innerHTML = art.background(name);
    ambient.set(name);
  }

  const ambient = (() => {
    const cv = $("#fx"), g = cv.getContext("2d");
    let kind = null, parts = [], raf = 0, W = 0, H = 0, last = 0;
    const CFG = {
      stage: { n: 26, colors: ["#ffe2a0", "#fff2c8"], vy: [-14, -4], vx: [-6, 6], r: [1, 2.4], shape: "dot" },
      thebes: { n: 22, colors: ["#d8d2c8", "#b9b2c4", "#e8e2d8"], vy: [14, 30], vx: [12, 30], r: [2, 4], shape: "petal" },
      field: { n: 22, colors: ["#d8d2c8", "#e8d7a0", "#e8e2d8"], vy: [14, 30], vx: [12, 30], r: [2, 4], shape: "petal" },
      sky: { n: 26, colors: ["#fff6d8", "#ffffff"], vy: [-10, 10], vx: [-6, 6], r: [1, 2.2], shape: "dot" },
      olympus: { n: 28, colors: ["#ffe7a6", "#fff6d8"], vy: [-8, 4], vx: [-5, 5], r: [1, 2.4], shape: "dot" },
      descent: { n: 34, colors: ["#ffb04a", "#ff6a2a", "#ffe08a"], vy: [-60, -30], vx: [-10, 10], r: [1.2, 3], shape: "dot" },
      boudoir: { n: 14, colors: ["#ffb04a", "#ffd77a"], vy: [-20, -8], vx: [-6, 6], r: [1, 2.2], shape: "dot" },
      party: { n: 40, colors: ["#ff4a6a", "#ffd77a", "#8fe3a2", "#c9a6ff", "#ffffff"], vy: [30, 70], vx: [-20, 20], r: [2.5, 4.5], shape: "confetti" },
      styx: { n: 18, colors: ["#8fffc8", "#c8ffe8"], vy: [-8, 2], vx: [6, 18], r: [1.5, 3.5], shape: "dot" },
    };
    const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
    function spawn(c, anywhere) {
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : c.vy[1] > 0 ? -10 : H + 10, vx: rnd(c.vx), vy: rnd(c.vy), r: rnd(c.r), c: c.colors[Math.floor(Math.random() * c.colors.length)], a: Math.random() * 6, s: (Math.random() - 0.5) * 4 };
    }
    function resize() {
      const r = stageEl.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (!$("#scene").classList.contains("on") || document.hidden) return;
      g.clearRect(0, 0, W, H);
      const c = CFG[kind];
      if (!c) return;
      parts.forEach((p, i) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.s * dt;
        if (p.y > H + 20 || p.y < -20 || p.x > W + 20 || p.x < -20) parts[i] = spawn(c, false);
        g.fillStyle = p.c;
        g.globalAlpha = c.shape === "dot" ? 0.55 + 0.45 * Math.sin(p.a * 2) : 0.85;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        if (c.shape === "petal") { g.beginPath(); g.ellipse(0, 0, p.r * 1.6, p.r * 0.8, 0, 0, 7); g.fill(); }
        else if (c.shape === "confetti") g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        else { g.beginPath(); g.arc(0, 0, p.r, 0, 7); g.fill(); }
        g.restore();
      });
      g.globalAlpha = 1;
    }
    window.addEventListener("resize", resize);
    return {
      set(name) {
        resize();
        kind = name;
        const c = CFG[name];
        parts = c ? Array.from({ length: c.n }, () => spawn(c, true)) : [];
        if (!raf) raf = requestAnimationFrame(frame);
      },
      burst(colors, n = 40) {
        const c = { colors, vy: [40, 120], vx: [-40, 40], r: [3, 5] };
        for (let i = 0; i < n; i++) parts.push({ ...spawn(c, false), y: -10 - Math.random() * 100 });
      },
    };
  })();

  let actors = [];
  const SLOTS = { 1: [50], 2: [31, 69], 3: [19, 50, 81], 4: [13, 37.5, 62.5, 87], 5: [11, 30.5, 50, 69.5, 89] };
  function layout() {
    const W = stageEl.clientWidth, H = stageEl.clientHeight;
    const n = Math.max(1, actors.length);
    const slots = SLOTS[Math.min(5, n)];
    const dlgH = Math.min(236, Math.max(164, H * 0.28));
    const avail = H - dlgH - 54;
    const spacing = n > 1 ? (slots[1] - slots[0]) / 100 : 1;
    const h = Math.min(avail * 0.95, n > 1 ? 2.6 * W * spacing : W * 1.15, 520);
    actors.forEach((a, i) => {
      a.el.style.left = `${slots[Math.min(i, slots.length - 1)]}%`;
      a.el.style.height = `${h}px`;
    });
  }
  window.addEventListener("resize", layout);

  function renderActor(a) {
    const opts = a.variant ? { variant: a.variant } : {};
    a.el.querySelector(".actor-inner").innerHTML = art.character(a.id, a.mood, opts);
    a.el.classList.toggle("ghostly", (a.id === "eur" && a.variant === "ghost") || a.id === "sty");
    a.el.classList.toggle("fly", a.id === "fly");
    a.el.dataset.id = a.id;
  }
  function makeActor(id, variant, mood, fromLeft) {
    const el = document.createElement("div");
    el.className = `actor ${fromLeft ? "enter-l" : "enter-r"}`;
    el.innerHTML = `<div class="actor-inner"></div>`;
    el.addEventListener("animationend", (e) => { if (e.target === el) el.classList.remove("enter-l", "enter-r"); });
    const a = { id, variant, mood: mood || "neutral", el };
    renderActor(a);
    actorsEl.appendChild(el);
    return a;
  }
  async function setCast(list, mood) {
    const want = list.map(parseWho);
    const keep = [];
    actors.forEach((a) => {
      if (!want.some((w) => w.id === a.id)) {
        a.el.classList.add("leaving");
        setTimeout(() => a.el.remove(), 520);
      } else keep.push(a);
    });
    const next = want.map((w, i) => {
      let a = keep.find((k) => k.id === w.id);
      if (a) {
        let dirty = false;
        if (w.variant && w.variant !== a.variant) { a.variant = w.variant; dirty = true; }
        if (mood && a.mood !== mood) { a.mood = mood; dirty = true; }
        if (dirty) renderActor(a);
      } else {
        a = makeActor(w.id, w.variant, mood, i < want.length / 2);
      }
      return a;
    });
    actors = next;
    actors.forEach((a, i) => (a.el.style.zIndex = 1 + i));
    layout();
    if (want.length) await sleep(220);
  }
  function findActor(who) {
    const w = parseWho(who);
    return actors.find((a) => a.id === w.id);
  }
  function highlight(id) {
    actors.forEach((a) => {
      a.el.classList.toggle("speaking", a.id === id);
      a.el.classList.toggle("all-lit", id === "*");
      a.el.classList.remove("talk");
    });
  }

  // ---------------------------------------------------------------------------
  // Dialogue box
  // ---------------------------------------------------------------------------
  const dlg = $("#dialog"), dlgText = $("#dlgText"), dlgChoices = $("#dlgChoices"), dlgNext = $("#dlgNext");
  const npEl = $("#nameplate"), npName = $("#npName"), npPortrait = $("#npPortrait");
  let tapResolver = null, typing = null;

  function setSpeaker(who, opts = {}) {
    dlg.classList.remove("narr", "host", "hidden");
    if (who === "narr") {
      dlg.classList.add("narr");
      npEl.classList.add("none");
      highlight("*");
      return;
    }
    npEl.classList.remove("none");
    if (who === "host") {
      dlg.classList.add("host");
      npName.textContent = "Offenbach's Program Note";
      npPortrait.innerHTML = headSvg("off", "happy");
      npEl.style.setProperty("--np", "#3a1a0c");
      highlight("*");
      return;
    }
    if (who === "chorus") {
      npName.textContent = opts.name || "Chorus";
      npPortrait.innerHTML = "";
      npEl.style.setProperty("--np", "#6a1a5a");
      highlight("*");
      return;
    }
    const w = parseWho(who);
    const meta = art.META[w.id] || { name: who, color: "#a8122e" };
    npName.textContent = opts.name || meta.name;
    const a = findActor(who);
    npPortrait.innerHTML = headSvg(w.id, opts.mood || (a && a.mood) || "neutral", w.variant || (a && a.variant));
    npEl.style.setProperty("--np", meta.color);
    highlight(w.id);
  }

  function tokens(html) {
    const out = [];
    const re = /(<[^>]+>|&[a-z#0-9]+;|[\s\S])/gi;
    let m;
    while ((m = re.exec(html))) out.push(m[0]);
    return out;
  }
  function typeText(html, speakerId) {
    const toks = tokens(html);
    const speaker = speakerId ? actors.find((a) => a.id === speakerId) : null;
    dlgNext.classList.remove("on");
    dlgChoices.innerHTML = "";
    return new Promise((resolve) => {
      let k = 0;
      const per = state.fast ? 9 : 22;
      if (speaker) speaker.el.classList.add("talk");
      const finish = () => {
        clearInterval(timer);
        dlgText.innerHTML = html;
        typing = null;
        if (speaker) speaker.el.classList.remove("talk");
        resolve();
      };
      const timer = setInterval(() => {
        let shown = 0;
        while (k < toks.length && shown < 1) {
          if (toks[k][0] !== "<") shown++;
          k++;
        }
        dlgText.innerHTML = toks.slice(0, k).join("");
        if (k % 3 === 0) audio.sfx("type");
        if (k >= toks.length) finish();
      }, per);
      typing = finish;
    });
  }
  function waitTap() {
    dlgNext.classList.add("on");
    return abortable(new Promise((r) => (tapResolver = r)));
  }
  function advance() {
    if (modal.classList.contains("on")) return;
    if (typing) { typing(); return; }
    if (tapResolver) {
      const r = tapResolver;
      tapResolver = null;
      dlgNext.classList.remove("on");
      audio.sfx("tap");
      r();
    }
  }
  $("#scene").addEventListener("click", (e) => {
    if (e.target.closest("button, input, #hud")) return;
    advance();
  });
  window.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && $("#scene").classList.contains("on") && !modal.classList.contains("on") && !e.target.closest("input")) {
      e.preventDefault();
      advance();
    }
  });

  async function line(who, text, opts = {}) {
    setSpeaker(who, opts);
    const a = who !== "narr" && who !== "host" && who !== "chorus" ? findActor(who) : null;
    if (a) {
      const w = parseWho(who);
      let dirty = false;
      if (opts.mood && a.mood !== opts.mood) { a.mood = opts.mood; dirty = true; }
      if (w.variant && w.variant !== a.variant) { a.variant = w.variant; dirty = true; }
      if (dirty) renderActor(a);
      a.el.classList.add("speaking");
    }
    await typeText(fill(text), a ? a.id : null);
    return waitTap();
  }

  // Rose rewards fly from the dialogue box to the counter
  function flyRoses(n) {
    if (!run) return;
    run.roses += n;
    const game = $("#game").getBoundingClientRect();
    const target = document.querySelector("#hud .rose-count").getBoundingClientRect();
    const from = dlg.getBoundingClientRect();
    for (let i = 0; i < Math.min(n, 8); i++) {
      const r = document.createElement("div");
      r.className = "fly-rose";
      r.textContent = "🌹";
      $("#game").appendChild(r);
      const x0 = from.left - game.left + from.width * (0.3 + Math.random() * 0.4), y0 = from.top - game.top + 20;
      const x1 = target.left - game.left + 10, y1 = target.top - game.top + 4;
      const anim = r.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
        { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 60}px) scale(1.4)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x1}px, ${y1}px) scale(.8)`, opacity: 1 },
      ], { duration: 900 + i * 90, easing: "ease-in-out", fill: "forwards" });
      anim.onfinish = () => r.remove();
    }
    setTimeout(() => { audio.sfx("rose"); updateRoses(true); }, 900);
  }

  // ---------------------------------------------------------------------------
  // Step implementations
  // ---------------------------------------------------------------------------
  async function ask(step) {
    const who = step.who;
    const onStage = findActor(who);
    setSpeaker(who, { mood: step.mood });
    if (onStage && step.mood) { onStage.mood = step.mood; renderActor(onStage); onStage.el.classList.add("speaking"); }
    await typeText(`<span class="q-kicker">❓ QUESTION</span>${fill(step.q)}`, onStage ? onStage.id : null);
    let tries = 0;
    const order = step.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    const res = await abortable(new Promise((resolve) => {
      order.forEach((i, pos) => {
        const opt = step.options[i];
        const b = document.createElement("button");
        b.className = "choice";
        b.innerHTML = `<span class="letter">${"ABCD"[pos]}</span>${opt}`;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          tries++;
          if (i === step.answer) {
            b.classList.add("right");
            audio.sfx("right");
            dlgChoices.querySelectorAll("button").forEach((x) => (x.disabled = true));
            flyRoses(tries === 1 ? 3 : 1);
            setTimeout(resolve, 650);
          } else {
            b.classList.add("wrong");
            audio.sfx("wrong");
          }
        });
        dlgChoices.appendChild(b);
      });
    }));
    if (res === "__abort") return;
    dlgChoices.innerHTML = "";
    await line(who, `${tries === 1 ? "✔ " : ""}${step.explain}`, { mood: tries === 1 ? "happy" : step.mood });
  }

  async function choice(step) {
    setSpeaker("narr");
    await typeText(`<span class="q-kicker">🎭 YOUR CHOICE</span>${fill(step.prompt)}`, null);
    const picked = await abortable(new Promise((resolve) => {
      step.options.forEach((opt, i) => {
        const b = document.createElement("button");
        b.className = "choice";
        b.innerHTML = `<span class="letter">${"ABCD"[i]}</span>${opt.text}`;
        b.addEventListener("click", (e) => { e.stopPropagation(); audio.sfx("tap"); resolve(opt); });
        dlgChoices.appendChild(b);
      });
    }));
    if (picked === "__abort") return;
    dlgChoices.innerHTML = "";
    await line(step.who, picked.text.replace(/^"|"$/g, ""), { mood: step.mood });
    for (const s of picked.reply || []) {
      if (!run || run.aborted) return;
      await exec(s);
    }
  }

  async function askName() {
    setSpeaker("op", { mood: "sly" });
    await typeText("Type your name for the playbill:", "op");
    const res = await abortable(new Promise((resolve) => {
      dlgChoices.innerHTML = `<input class="name-input" id="nameInput" maxlength="24" autocomplete="off" placeholder="Your name" /><button class="btn gold" id="nameOk">That's me!</button>`;
      const inp = $("#nameInput");
      inp.value = state.name || "";
      setTimeout(() => inp.focus(), 50);
      const done = (e) => {
        if (e) e.stopPropagation();
        state.name = inp.value.trim().slice(0, 24) || "Mystery Guest";
        save();
        audio.sfx("right");
        resolve();
      };
      $("#nameOk").addEventListener("click", done);
      inp.addEventListener("click", (e) => e.stopPropagation());
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(e); });
    }));
    if (res === "__abort") return;
    dlgChoices.innerHTML = "";
  }

  async function fx(name) {
    switch (name) {
      case "applause": audio.sfx("applause"); ambient.burst(["#c4123b", "#ff4a6a", "#ffd77a"], 30); await sleep(500); break;
      case "hiss": {
        audio.sfx("hiss");
        const s = document.createElement("div");
        s.className = "slither";
        s.innerHTML = `<svg viewBox="0 0 120 40"><path d="M5,20 Q20,5 35,20 T65,20 T95,20" stroke="#1d1322" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M5,20 Q20,5 35,20 T65,20 T95,20" stroke="#6a9a3a" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="104" cy="20" rx="12" ry="9" fill="#6a9a3a" stroke="#1d1322" stroke-width="2"/><circle cx="107" cy="16" r="3" fill="#fff"/><circle cx="108" cy="16" r="1.5" fill="#c4123b"/></svg>`;
        stageEl.appendChild(s);
        setTimeout(() => s.remove(), 1700);
        await sleep(1200);
        break;
      }
      case "dark": audio.sfx("dark"); flashEl.style.background = "#a8122e"; flash(); await sleep(400); break;
      case "magic": audio.sfx("magic"); flashEl.style.background = "#ffe7a6"; flash(); ambient.burst(["#ffe7a6", "#fff", "#ffd77a"], 30); await sleep(450); break;
      case "thunder": audio.sfx("thunder"); flashEl.style.background = "#ffffff"; flash(); shake(); await sleep(1100); break;
      case "poof":
        audio.sfx("whoosh");
        flashEl.style.background = "#a8122e";
        flash();
        actors.forEach((a) => a.el.classList.add("poof"));
        await sleep(550);
        actors.forEach((a) => a.el.remove());
        actors = [];
        break;
      default: audio.sfx(name); await sleep(300);
    }
  }
  function flash() { flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on"); }
  function shake() { stageEl.classList.remove("shake"); void stageEl.offsetWidth; stageEl.classList.add("shake"); }

  async function swap(from, to) {
    const a = findActor(from);
    const t = parseWho(to);
    if (!a) { await setCast([...actors.map((x) => (x.variant ? `${x.id}:${x.variant}` : x.id)), to]); return; }
    flashEl.style.background = "#ffffff";
    flash();
    a.el.classList.add("poof");
    await sleep(260);
    a.el.classList.remove("poof");
    a.id = t.id;
    a.variant = t.variant;
    a.mood = "surprised";
    renderActor(a);
    layout();
    await sleep(200);
  }

  async function playGame(name, opts) {
    const inf = games.info(name, opts);
    let best = null;
    for (;;) {
      const artSvg = inf.art ? art.character(inf.art[0], inf.art[1], inf.art[2] || {}) : "";
      const go = await abortable(cardChoice(
        `<div class="card-art tall">${artSvg}</div><div class="kicker">${inf.kicker}</div><h2>${inf.title}</h2><ul class="how">${inf.how.map((h) => `<li>${h}</li>`).join("")}</ul>${inf.noSkip ? "" : `<button class="skip" data-v="skip">Skip this game (no roses)</button>`}`,
        [{ label: best ? "Play again ▶" : "Play ▶", value: "play" }]
      ));
      if (go === "__abort") { closeModal(); return; }
      if (go === "skip") { closeModal(); break; }
      audio.init();
      openModal(`<div class="game-root" id="gameRoot"></div>`);
      const root = $("#gameRoot");
      const { kit, promise } = games.run(name, root, opts);
      const res = await abortable(promise);
      kit.destroy();
      if (res === "__abort") { closeModal(); return; }
      const score = Math.max(0, Math.min(1, res.score || 0));
      const roses = Math.round(score * inf.max);
      const stars = score >= 0.85 ? 3 : score >= 0.55 ? 2 : 1;
      const first = best == null;
      const gain = Math.max(0, roses - (best || 0));
      best = Math.max(best || 0, roses);
      if (gain) setTimeout(() => flyRoses(gain), 50);
      const again = await abortable(cardChoice(
        `<div class="kicker">${inf.title}</div><h2>${["Not bad!", "Bravo!", "Magnifique!"][stars - 1]}</h2>
         <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? "" : "off"}">⭐</span>`).join("")}</div>
         <div class="bigrose">+${roses} 🌹</div>
         <p>${res.note || ""}</p>${!first && !gain ? "<p><em>(Your best score is kept.)</em></p>" : ""}`,
        [{ label: "Try again", value: "again", cls: "ghost" }, { label: "Continue ▶", value: "go" }]
      ));
      closeModal();
      if (again !== "again") break;
    }
  }

  async function certificate() {
    const total = totalRoses();
    const pct = total / maxRoses;
    const v = pct >= 0.85 ? [5, "“A triumph! All of Paris is talking about you.”"]
      : pct >= 0.65 ? [4, "“A dazzling debut — the critics adore you.”"]
      : pct >= 0.45 ? [3, "“Charming! A few stumbles, but the audience cheered.”"]
      : [2, "“A brave performance. Public Opinion demands an encore!”"];
    const verdict = [`<span class="stars">${[1, 2, 3, 4, 5].map((s) => `<span class="${s <= v[0] ? "" : "off"}">⭐</span>`).join("")}</span>`, v[1]];
    audio.sfx("applause");
    const go = await abortable(cardChoice(
      `<div class="kicker">Certificate of Completion</div>
       <h2>Bravo, ${esc(state.name || "friend")}!</h2>
       <p>You journeyed from <b>Thebes</b> to <b>Mount Olympus</b> and down to the <b>Underworld</b>, survived a violin concerto, buzzed a duet with a god, and danced the <b>Galop infernal</b>.</p>
       <div class="bigrose">${total} 🌹</div>
       <p><b>Critics' verdict</b><br>${verdict[0]}<br><em>${verdict[1]}</em></p>
       <p style="font-size:.9rem">Jacques Offenbach · <em>Orphée aux enfers</em> · Théâtre des Bouffes-Parisiens, 21 October 1858</p>`,
      [{ label: "🗺 Back to the map", value: "map" }],
      "parchment"
    ));
    if (go !== "__abort") closeModal();
  }

  async function exec(step) {
    if (!run || run.aborted) return;
    switch (step.t) {
      case "cast": await setCast(step.list, step.mood); break;
      case "say": await line(step.who, step.text, { mood: step.mood, name: step.name }); break;
      case "narr": await line("narr", step.text); break;
      case "host": await line("host", step.text); break;
      case "ask": await ask(step); break;
      case "choice": await choice(step); break;
      case "game": await playGame(step.name, step.opts); break;
      case "fx": await fx(step.name); break;
      case "sfx": audio.sfx(step.name); break;
      case "bg": setBg(step.name); break;
      case "music": audio.play(step.name); break;
      case "swap": await swap(step.from, step.to); break;
      case "wait": await sleep(step.ms); break;
      case "name": await askName(); break;
      case "certificate": await certificate(); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Chapters
  // ---------------------------------------------------------------------------
  async function playChapter(i) {
    abortChapter();
    const ch = chapters[i];
    audio.init();
    await curtain(true);
    closeModal();
    show("scene");
    actorsEl.innerHTML = "";
    actors = [];
    dlgText.innerHTML = "";
    dlgChoices.innerHTML = "";
    npEl.classList.add("none");
    dlg.classList.add("hidden");
    setBg(ch.bg);
    $("#hudTitle").textContent = ch.title;
    run = { i, roses: 0, aborted: false };
    const me = run;
    updateRoses();
    audio.play(ch.music || null);
    if (!ch.music) audio.stop();
    await curtain(false);
    const go = await abortable(cardChoice(
      `<div class="kicker">${ch.act}</div><h2>${ch.title}</h2><p>${ch.blurb}</p>${state.best[ch.id] ? `<p>Your best: <b>${state.best[ch.id]} 🌹</b></p>` : ""}`,
      [{ label: "Begin ▶", value: "go" }]
    ));
    closeModal();
    if (go === "__abort" || me.aborted) return;
    dlg.classList.remove("hidden");
    for (const step of ch.steps) {
      if (me.aborted) return;
      await exec(step);
      if (step.t === "game" && (step.name === "galop" || step.name === "buzz") && !me.aborted) audio.play("underworld");
    }
    if (me.aborted) return;
    // chapter complete
    const earned = me.roses;
    state.best[ch.id] = Math.max(state.best[ch.id] || 0, earned);
    state.done[ch.id] = true;
    save();
    updateRoses();
    run = null;
    if (i === chapters.length - 1) { await goMap(); return; }
    audio.sfx("fanfare");
    const next = chapters[i + 1];
    const v = await cardChoice(
      `<div class="kicker">Scene complete</div><h2>${ch.title}</h2><div class="bigrose">+${earned} 🌹</div><p>Total: <b>${totalRoses()}</b> roses</p><p>Next: <b>${next.title}</b></p>`,
      [{ label: "🗺 Map", value: "map", cls: "ghost" }, { label: "Next scene ▶", value: "next" }]
    );
    if (v === "next") playChapter(i + 1);
    else goMap();
  }

  // ---------------------------------------------------------------------------
  // Map
  // ---------------------------------------------------------------------------
  function renderMap() {
    const scroll = $("#mapScroll");
    scroll.innerHTML = art.journeyMap(chapters, { done: state.done, unlocked });
    scroll.querySelectorAll(".map-node").forEach((n) => {
      const open = async () => {
        const i = Number(n.dataset.ch);
        if (!unlocked(i)) { audio.sfx("wrong"); return; }
        audio.sfx("tap");
        const ch = chapters[i];
        const v = await cardChoice(
          `<div class="kicker">${i === 0 ? "Prologue" : `Scene ${i} of ${chapters.length - 1}`} · ${ch.act}</div><h2>${ch.title}</h2><p>${ch.blurb}</p>${state.best[ch.id] != null ? `<p>Your best: <b>${state.best[ch.id]} 🌹</b> ${state.done[ch.id] ? "✓" : ""}</p>` : ""}`,
          [{ label: "Close", value: "x", cls: "ghost" }, { label: state.done[ch.id] ? "Replay ▶" : "Play ▶", value: "go" }]
        );
        closeModal();
        if (v === "go") playChapter(i);
      };
      n.addEventListener("click", open);
      n.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $("#mapName").textContent = state.name ? `${state.name}'s Journey` : "Orpheus in the Underworld";
    updateRoses();
  }
  async function goMap() {
    abortChapter();
    run = null;
    await curtain(true);
    closeModal();
    renderMap();
    show("map");
    audio.play("map");
    const i = firstOpen();
    const [, y] = art.MAP_NODES[i];
    const scroll = $("#mapScroll");
    requestAnimationFrame(() => {
      const scale = scroll.scrollWidth / 400;
      scroll.scrollTop = Math.max(0, y * scale - scroll.clientHeight / 2);
    });
    await curtain(false);
  }

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------
  async function menu() {
    audio.init();
    const inScene = $("#scene").classList.contains("on");
    for (;;) {
      const v = await cardChoice(
        `<div class="kicker">Menu</div><h2>Intermission</h2>
         <div class="menu-list">
           <div class="toggle-row">🎵 Music <button class="btn small ${state.music ? "gold" : "ghost"}" data-v="music">${state.music ? "On" : "Off"}</button></div>
           <div class="toggle-row">🔊 Sound effects <button class="btn small ${state.sfx ? "gold" : "ghost"}" data-v="sfx">${state.sfx ? "On" : "Off"}</button></div>
           <div class="toggle-row">💬 Text speed <button class="btn small gold" data-v="fast">${state.fast ? "Fast" : "Normal"}</button></div>
           <div class="toggle-row">🍎 Teacher mode (unlock all) <button class="btn small ${state.unlockAll ? "gold" : "ghost"}" data-v="unlock">${state.unlockAll ? "On" : "Off"}</button></div>
           ${inScene ? `<button class="btn red" data-v="map">🗺 Leave scene · Journey map</button>` : ""}
           <button class="btn ghost" data-v="title">🎭 Title screen</button>
           <button class="btn ghost small" data-v="reset">Reset all progress</button>
         </div>`,
        [{ label: "Close", value: "close" }]
      );
      if (v === "music") { state.music = !state.music; audio.setMusic(state.music); save(); continue; }
      if (v === "sfx") { state.sfx = !state.sfx; audio.setSfx(state.sfx); save(); continue; }
      if (v === "fast") { state.fast = !state.fast; save(); continue; }
      if (v === "unlock") { state.unlockAll = !state.unlockAll; save(); if (!inScene && $("#map").classList.contains("on")) renderMap(); continue; }
      if (v === "reset") {
        const sure = await cardChoice(`<h2>Reset everything?</h2><p>This erases your name, roses and progress on this device.</p>`, [{ label: "Cancel", value: "no", cls: "ghost" }, { label: "Reset", value: "yes", cls: "red" }]);
        if (sure === "yes") {
          Object.assign(state, { ...DEFAULTS, best: {}, done: {} });
          save();
          closeModal();
          abortChapter();
          titleScreen();
          return;
        }
        continue;
      }
      closeModal();
      if (v === "map") goMap();
      if (v === "title") { abortChapter(); titleScreen(); }
      return;
    }
  }
  $("#hudMenu").addEventListener("click", (e) => { e.stopPropagation(); menu(); });
  $("#mapMenu").addEventListener("click", menu);

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------
  function titleScreen() {
    run = null;
    show("title");
    $("#titleBg").innerHTML = art.background("party");
    $("#titleCast").innerHTML = [["orp", "worried", {}], ["eur", "happy", { variant: "bacchante" }], ["plu", "smug", {}]]
      .map(([id, mood, o]) => `<div class="tc">${art.character(id, mood, o)}</div>`).join("");
    const m = $("#marquee");
    m.querySelectorAll(".mbulb").forEach((b) => b.remove());
    requestAnimationFrame(() => {
      const w = m.offsetWidth, h = m.offsetHeight, gap = 26;
      const pts = [];
      for (let x = 14; x <= w - 14; x += gap) { pts.push([x, 4]); pts.push([x, h - 13]); }
      for (let y = 4 + gap; y <= h - 13 - gap / 2; y += gap) { pts.push([4, y]); pts.push([w - 13, y]); }
      pts.forEach(([x, y], i) => {
        const b = document.createElement("i");
        b.className = `mbulb${i % 2 ? " alt" : ""}`;
        b.style.left = `${x}px`;
        b.style.top = `${y}px`;
        m.appendChild(b);
      });
    });
    const started = Object.keys(state.done).length > 0;
    $("#btnContinue").style.display = started ? "" : "none";
    $("#btnStart").textContent = started ? "Start from the Overture" : "Raise the Curtain";
    curtainEl.classList.remove("closed");
    audio.play("title");
  }
  $("#btnStart").addEventListener("click", () => {
    audio.init();
    audio.setMusic(state.music);
    audio.setSfx(state.sfx);
    audio.sfx("fanfare");
    playChapter(0);
  });
  $("#btnContinue").addEventListener("click", () => {
    audio.init();
    audio.setMusic(state.music);
    audio.setSfx(state.sfx);
    goMap();
  });
  // first interaction anywhere unlocks audio on iOS
  window.addEventListener("pointerdown", () => {
    audio.init();
    audio.setMusic(state.music);
    audio.setSfx(state.sfx);
  }, { once: true });

  // debug/test hook
  window.OU.debug = { state, playChapter, goMap, advance, chapters, game: (n, o) => { show("scene"); setBg("party"); return playGame(n, o); } };

  titleScreen();
})();

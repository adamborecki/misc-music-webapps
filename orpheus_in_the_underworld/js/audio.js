/* Orpheus in the Underworld — synthesized music & sound effects (Web Audio, no files). */
window.OU = window.OU || {};

OU.audio = (() => {
  let ctx = null;
  let master, musicBus, sfxBus, noiseBuf;
  let musicOn = true;
  let sfxOn = true;
  let current = null; // running theme
  let timer = null;

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return null;
    return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.8;
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.5 : 0;
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 0.75 : 0;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (pendingTheme) play(pendingTheme);
  }

  const now = () => (ctx ? ctx.currentTime : performance.now() / 1000);

  function env(g, t, a, peak, d, sus, dur, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + Math.max(a + d, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
    return t + Math.max(a + d, dur) + r + 0.05;
  }

  function osc(type, f, t, end, dest, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(end);
    return o;
  }

  function vibrato(o, t, end, rate = 5.5, depth = 6) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = rate;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(depth, t + 0.25);
    l.connect(lg);
    lg.connect(o.detune);
    l.start(t);
    l.stop(end);
  }

  function noise(t, dur, dest) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.connect(dest);
    s.start(t, Math.random() * 1.5, dur + 0.1);
    return s;
  }

  // ---- instruments --------------------------------------------------------
  const INST = {
    lead(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 2400;
      g.connect(f);
      f.connect(out);
      const end = env(g, t, 0.01, 0.16 * v, 0.08, 0.6, dur * 0.9, 0.08);
      const o = osc("square", hz(m), t, end, g);
      vibrato(o, t, end, 5.5, 5);
    },
    flute(m, t, dur, v, out) {
      const g = ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.04, 0.26 * v, 0.1, 0.75, dur * 0.95, 0.12);
      const o = osc("triangle", hz(m), t, end, g);
      vibrato(o, t, end, 5, 9);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      g2.connect(g);
      osc("sine", hz(m) * 2, t, end, g2);
    },
    pluck(m, t, dur, v, out) {
      const g = ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.004, 0.22 * v, 0.25, 0.05, 0.05, 0.2);
      osc("triangle", hz(m), t, end, g);
    },
    bell(m, t, dur, v, out) {
      const g = ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.003, 0.2 * v, 0.6, 0.01, 0.01, 0.4);
      osc("sine", hz(m), t, end, g);
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      g2.connect(g);
      osc("sine", hz(m) * 2.76, t, end, g2);
    },
    brass(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.Q.value = 2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.linearRampToValueAtTime(1800, t + 0.06);
      f.frequency.linearRampToValueAtTime(1100, t + dur);
      g.connect(f);
      f.connect(out);
      const end = env(g, t, 0.03, 0.2 * v, 0.1, 0.7, dur * 0.9, 0.08);
      const o = osc("sawtooth", hz(m), t, end, g);
      vibrato(o, t, end, 5, 4);
    },
    accordion(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1400;
      f.Q.value = 0.7;
      g.connect(f);
      f.connect(out);
      const end = env(g, t, 0.02, 0.2 * v, 0.05, 0.8, dur * 0.92, 0.06);
      osc("sawtooth", hz(m), t, end, g, -7);
      osc("sawtooth", hz(m), t, end, g, 7);
      const g2 = ctx.createGain();
      g2.gain.value = 0.5;
      g2.connect(g);
      osc("square", hz(m) / 2, t, end, g2);
    },
    bass(m, t, dur, v, out) {
      const g = ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.005, 0.4 * v, 0.12, 0.35, dur * 0.7, 0.06);
      osc("triangle", hz(m), t, end, g);
      osc("sine", hz(m), t, end, g);
    },
    chord(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1600;
      g.connect(f);
      f.connect(out);
      const end = env(g, t, 0.005, 0.06 * v, 0.08, 0.3, dur * 0.5, 0.05);
      osc("square", hz(m), t, end, g);
    },
    kick(m, t, dur, v, out) {
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.7 * v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.3);
    },
    snare(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 1500;
      g.connect(f);
      f.connect(out);
      g.gain.setValueAtTime(0.25 * v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise(t, 0.16, g);
    },
    hat(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 7000;
      g.connect(f);
      f.connect(out);
      g.gain.setValueAtTime(0.12 * v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise(t, 0.06, g);
    },
    tamb(m, t, dur, v, out) {
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 9000;
      g.connect(f);
      f.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16 * v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      noise(t, 0.2, g);
    },
  };

  function playNote(inst, m, t, dur, v = 1, bus) {
    if (!ctx || m == null) return;
    INST[inst](m, t, dur, v, bus || musicBus);
  }

  // ---- score notation -------------------------------------------------------
  // "C5/4 D5/2 r/2 C4+E4+G4/4"  — lengths in 16th notes, '+' for chords.
  function parse(str, shift = 0) {
    const events = [];
    let pos = 0;
    str.trim().split(/\s+/).forEach((tok) => {
      const [notes, len] = tok.split("/");
      const L = Number(len);
      if (notes !== "r") {
        notes.split("+").forEach((n) => events.push({ at: pos, len: L, m: midi(n) + shift }));
      }
      pos += L;
    });
    return { events, length: pos };
  }

  // oom-pah helper: chords like "Am", "G7"; pattern of bass/chord hits per bar
  const CHORDS = {
    C: ["C3", "E4+G4+C5"], Dm: ["D3", "F4+A4+D5"], Em: ["E3", "G4+B4+E5"], F: ["F3", "F4+A4+C5"],
    G: ["G2", "G4+B4+D5"], G7: ["G2", "F4+B4+D5"], Am: ["A2", "A4+C5+E5"], E: ["E3", "G#4+B4+E5"],
    E7: ["E3", "G#4+B4+D5"], A: ["A2", "A4+C#5+E5"], A7: ["A2", "G4+C#5+E5"], Gm: ["G2", "G4+Bb4+D5"],
    C7: ["C3", "E4+Bb4+C5"], Bb: ["Bb2", "F4+Bb4+D5"], D: ["D3", "F#4+A4+D5"], B7: ["B2", "A4+D#5+F#5"],
  };
  function oompah(chords, pattern) {
    // pattern: array of [isBass, len16] e.g. waltz [[1,4],[0,4],[0,4]]
    return chords
      .map((c) => pattern.map(([b, l]) => `${b ? CHORDS[c][0] : CHORDS[c][1]}/${l}`).join(" "))
      .join(" ");
  }
  function arp(chords, len, shapes) {
    return chords.map((c) => shapes[c].map((n) => `${n}/${len}`).join(" ")).join(" ");
  }

  // ---- the galop (Offenbach, 1858 — public domain) --------------------------
  const GALOP_MELODY =
    "C5/4 C5/2 D5/2 F5/2 E5/2 D5/4 G5/4 G5/4 G5/2 A5/2 E5/2 F5/2 D5/4 D5/4 D5/2 F5/2 E5/2 D5/2 " +
    "C5/2 C6/2 B5/2 A5/2 G5/2 F5/2 E5/2 D5/2 " +
    "C5/4 C5/2 D5/2 F5/2 E5/2 D5/4 G5/4 G5/4 G5/2 A5/2 E5/2 F5/2 D5/4 D5/4 D5/2 F5/2 E5/2 D5/2 " +
    "C5/2 G4/2 D5/2 E5/2 C5/4 r/4";
  const GALOP_CHORDS = ["C", "G7", "G7", "C", "G7", "G7", "C", "G7", "C", "G7", "G7", "C", "G7", "G7", "C", "C"];
  const GALOP_BASS = oompah(GALOP_CHORDS, [[1, 2], [0, 2], [1, 2], [0, 2]]);

  // ---- themes -----------------------------------------------------------------
  const THEMES = {
    title: {
      bpm: 150,
      tracks: [
        ["accordion",
          "A4/4 C5/4 E5/4 D#5/8 E5/4 F5/4 E5/4 D5/4 C5/8 B4/4 A4/4 C5/4 E5/4 A5/8 G5/4 F5/4 E5/4 D#5/4 E5/12 " +
          "F5/4 E5/4 D5/4 C5/8 A4/4 B4/4 C5/4 D5/4 E5/8 G#4/4 A4/4 B4/4 C5/4 D5/4 C5/4 B4/4 A4/12 r/12", 0.9],
        ["bass", null, 1, oompah(["Am", "Am", "Dm", "E", "Am", "F", "Dm", "E", "Dm", "Am", "G", "E", "Am", "E", "Am", "Am"], [[1, 4], [0, 4], [0, 4]])],
      ],
    },
    map: {
      bpm: 116,
      tracks: [
        ["bell",
          "A5/4 C6/4 E6/4 D#6/8 E6/4 F6/4 E6/4 D6/4 C6/8 B5/4 A5/4 C6/4 E6/4 A6/8 G6/4 F6/4 E6/4 D#6/4 E6/12 " +
          "F6/4 E6/4 D6/4 C6/8 A5/4 B5/4 C6/4 D6/4 E6/8 G#5/4 A5/4 B5/4 C6/4 D6/4 C6/4 B5/4 A5/12 r/12", 0.8],
        ["pluck", null, 0.8, oompah(["Am", "Am", "Dm", "E", "Am", "F", "Dm", "E", "Dm", "Am", "G", "E", "Am", "E", "Am", "Am"], [[1, 4], [0, 4], [0, 4]])],
      ],
    },
    thebes: {
      bpm: 80,
      tracks: [
        ["flute",
          "D5/6 E5/2 F5/4 E5/4 D5/2 C5/6 D5/4 F5/2 A5/4 G5/2 A5/12 " +
          "Bb5/4 A5/2 G5/4 F5/2 G5/4 F5/2 E5/6 F5/4 E5/2 D5/4 C#5/2 D5/12", 0.8],
        ["pluck", null, 0.9, arp(["Dm", "C", "Dm", "F", "Gm", "C", "A", "Dm"], 2, {
          Dm: ["D3", "A3", "D4", "F4", "A3", "D4"], C: ["C3", "G3", "C4", "E4", "G3", "C4"],
          F: ["F3", "C4", "F4", "A4", "C4", "F4"], Gm: ["G2", "D3", "G3", "Bb3", "D3", "G3"],
          A: ["A2", "E3", "A3", "C#4", "E3", "A3"],
        })],
      ],
    },
    olympus: {
      bpm: 92,
      tracks: [
        ["brass",
          "C5/6 G4/2 C5/4 E5/4 G5/8 E5/8 F5/4 E5/4 D5/4 C5/4 D5/12 G4/4 " +
          "C5/6 G4/2 C5/4 E5/4 G5/8 C6/8 B5/4 A5/4 G5/4 F5/4 E5/4 D5/4 C5/8", 0.8],
        ["bass", null, 1, oompah(["C", "C", "F", "G", "C", "C", "G7", "C"], [[1, 4], [0, 4], [1, 4], [0, 4]])],
        ["snare", null, 0.5, "N/4 r/4 N/4 r/2 N/2 ".repeat(8)],
      ],
    },
    underworld: {
      bpm: 116,
      tracks: [
        ["accordion",
          "A4/2 D5/2 F5/2 A5/2 G#5/4 A5/4 F5/2 E5/2 D5/2 C#5/2 D5/6 r/2 " +
          "Bb4/2 D5/2 G5/2 Bb5/2 A5/4 G5/4 F5/2 E5/2 F5/2 G5/2 A5/6 r/2 " +
          "D6/2 C6/2 Bb5/2 A5/2 G5/2 F5/2 E5/2 D5/2 C#5/2 E5/2 A5/2 G5/2 F5/4 E5/4 " +
          "D5/2 F5/2 A5/2 D6/2 C#6/4 A5/4 E5/2 G5/2 F5/2 E5/2 D5/6 r/2", 0.85],
        ["bass", null, 1, oompah(["Dm", "Dm", "A7", "Dm", "Gm", "Gm", "C7", "F", "Bb", "Gm", "A7", "Dm", "Dm", "A7", "A7", "Dm"], [[1, 2], [0, 2], [1, 2], [0, 2]])],
        ["tamb", null, 0.7, "r/2 N/2 r/2 N/2 ".repeat(16)],
      ],
    },
    galop: {
      bpm: 150,
      tracks: [
        ["lead", GALOP_MELODY, 1],
        ["bass", null, 1, GALOP_BASS],
        ["snare", null, 0.6, "r/2 N/2 r/2 N/2 ".repeat(16)],
      ],
    },
    finale: {
      bpm: 168,
      tracks: [
        ["lead", GALOP_MELODY, 1],
        ["brass", GALOP_MELODY, 0.35, null, -12],
        ["bass", null, 1, GALOP_BASS],
        ["snare", null, 0.6, "r/2 N/2 r/2 N/2 ".repeat(16)],
        ["kick", null, 0.7, "N/4 N/4 ".repeat(16)],
      ],
    },
    tension: {
      bpm: 66,
      tracks: [
        ["bell", "B4/8 C5/8 B4/8 G4/8 A4/8 F#4/8 E4/16 r/16", 0.6],
        ["kick", null, 0.9, "N/3 N/13 ".repeat(4)],
        ["bass", null, 0.7, "E2/16 C2/16 B1/16 E2/16"],
      ],
    },
  };

  // compile once
  const compiled = {};
  function compile(name) {
    if (compiled[name]) return compiled[name];
    const th = THEMES[name];
    const tracks = th.tracks.map(([inst, mel, vol, alt, shift]) => {
      const src = (mel || alt).replace(/N\//g, "C4/");
      const p = parse(src, shift || 0);
      return { inst, vol: vol == null ? 1 : vol, ...p };
    });
    const length = Math.max(...tracks.map((t) => t.length));
    const byStep = new Map();
    tracks.forEach((tr) => {
      tr.events.forEach((e) => {
        if (!byStep.has(e.at)) byStep.set(e.at, []);
        byStep.get(e.at).push({ inst: tr.inst, vol: tr.vol, len: e.len, m: e.m });
      });
    });
    return (compiled[name] = { bpm: th.bpm, length, byStep });
  }

  let pendingTheme = null;
  function play(name) {
    pendingTheme = name;
    if (!ctx) return;
    if (current && current.name === name) return;
    stop();
    if (!name || !THEMES[name]) return;
    const c = compile(name);
    current = { name, c, step: 0, next: ctx.currentTime + 0.12, gain: ctx.createGain() };
    current.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    current.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
    current.gain.connect(musicBus);
    const run = current;
    timer = setInterval(() => {
      if (current !== run) return;
      const s16 = 60 / run.c.bpm / 4;
      while (run.next < ctx.currentTime + 0.2) {
        const evs = run.c.byStep.get(run.step);
        if (evs) evs.forEach((e) => playNote(e.inst, e.m, run.next, e.len * s16, e.vol, run.gain));
        run.next += s16;
        run.step = (run.step + 1) % run.c.length;
      }
    }, 40);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (current && ctx) {
      const g = current.gain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      setTimeout(() => g.disconnect(), 600);
    }
    current = null;
  }

  // ---- sound effects -----------------------------------------------------------
  function sfx(name, opt = {}) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + 0.01;
    const out = sfxBus;
    const P = (inst, n, dt, dur, v = 1) => playNote(inst, typeof n === "string" ? midi(n) : n, t + dt, dur, v, out);
    switch (name) {
      case "tap": P("pluck", "E6", 0, 0.05, 0.6); break;
      case "type": P("pluck", 84 + Math.floor(Math.random() * 3), 0, 0.02, 0.18); break;
      case "right": P("bell", "C6", 0, 0.1); P("bell", "E6", 0.08, 0.1); P("bell", "G6", 0.16, 0.1); P("bell", "C7", 0.24, 0.3); break;
      case "wrong": {
        const g = ctx.createGain(); g.connect(out);
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; g.connect(f); f.connect(out);
        [[0, 233, 0.22], [0.25, 220, 0.22], [0.5, 207, 0.6]].forEach(([dt, fr, d]) => {
          const gg = ctx.createGain(); gg.connect(f);
          const end = env(gg, t + dt, 0.02, 0.18, 0.1, 0.7, d, 0.1);
          const o = osc("sawtooth", fr, t + dt, end, gg);
          if (d > 0.3) { o.frequency.linearRampToValueAtTime(fr * 0.94, t + dt + d); vibrato(o, t + dt, end, 6, 30); }
        });
        break;
      }
      case "rose": P("bell", "G6", 0, 0.1, 0.7); P("bell", "D7", 0.06, 0.2, 0.5); break;
      case "pop": {
        const g = ctx.createGain(); g.connect(out);
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        const o = osc("sine", 900, t, t + 0.15, g); o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
        break;
      }
      case "squeak": {
        const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 3;
        g.connect(f); f.connect(out);
        const end = env(g, t, 0.02, 0.12, 0.1, 0.8, 0.35, 0.1);
        const base = 700 + Math.random() * 500;
        const o = osc("sawtooth", base, t, end, g);
        o.frequency.linearRampToValueAtTime(base * (Math.random() < 0.5 ? 1.06 : 0.93), t + 0.4);
        vibrato(o, t, end, 9, 40);
        break;
      }
      case "thunder": {
        const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "lowpass";
        f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.8);
        g.connect(f); f.connect(out);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
        noise(t, 2.4, g);
        P("kick", 0, 0, 0.3, 1.2);
        break;
      }
      case "hiss": {
        const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
        g.connect(f); f.connect(out);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        noise(t, 0.8, g);
        break;
      }
      case "whoosh": {
        const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
        f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2500, t + 0.5);
        g.connect(f); f.connect(out);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        noise(t, 0.6, g);
        break;
      }
      case "magic": ["C6", "E6", "G6", "B6", "D7", "G7"].forEach((n, i) => P("bell", n, i * 0.05, 0.15, 0.6)); break;
      case "dark": ["A3", "C4", "D#4", "F#4"].forEach((n, i) => P("brass", n, i * 0.12, 0.5, 0.6)); break;
      case "horn": P("brass", "C5", 0, 0.25, 0.9); P("brass", "G5", 0.28, 0.6, 0.9); break;
      case "bump": P("kick", 0, 0, 0.2, 0.8); P("snare", 0, 0, 0.1, 0.4); break;
      case "step": P("kick", 0, 0, 0.1, 0.35); break;
      case "fanfare": ["C5", "E5", "G5", "C6"].forEach((n, i) => P("brass", n, i * 0.1, i === 3 ? 0.6 : 0.1, 0.8)); break;
      case "buzz": {
        const f0 = opt.freq || 300, d = opt.dur || 0.45;
        const g = ctx.createGain(); const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 2200;
        g.connect(fl); fl.connect(out);
        const end = env(g, t, 0.02, 0.2, 0.05, 0.85, d, 0.06);
        const o = osc("sawtooth", f0, t, end, g);
        vibrato(o, t, end, 28, 60);
        const o2 = osc("square", f0 * 1.01, t, end, g); vibrato(o2, t, end, 31, 40);
        break;
      }
      case "kick": P("bell", "A5", 0, 0.05, 0.5); P("tamb", 0, 0, 0.1, 0.8); break;
      case "miss": P("pluck", "C3", 0, 0.1, 0.8); break;
      case "applause": {
        for (let i = 0; i < 90; i++) {
          const dt = Math.random() * 2.2;
          const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500 + Math.random() * 2500;
          g.connect(f); f.connect(out);
          const v = 0.25 * (1 - dt / 2.6);
          g.gain.setValueAtTime(v, t + dt); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.04);
          noise(t + dt, 0.05, g);
        }
        break;
      }
      default: break;
    }
  }

  return {
    init,
    play,
    stop,
    sfx,
    playNote,
    midi,
    now,
    get ctx() { return ctx; },
    get musicBus() { return musicBus; },
    get sfxBus() { return sfxBus; },
    GALOP_MELODY,
    GALOP_CHORDS,
    CHORDS,
    parse,
    setMusic(on) {
      musicOn = on;
      if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
    },
    setSfx(on) {
      sfxOn = on;
      if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.75 : 0, ctx.currentTime, 0.05);
    },
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; },
  };
})();

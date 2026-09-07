/* Iron Fist Legends - procedural audio: rock music engine, SFX, voices */
'use strict';

const AudioSys = {
  ctx: null, master: null, musicBus: null, sfxBus: null, voiceBus: null, guitarBus: null, leadBus: null,
  noiseBuf: null, opts: { music: 0.7, sfx: 0.8, voices: true },
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(ctx.destination);
    this.master = comp;
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.opts.music * 0.55; this.musicBus.connect(comp);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.opts.sfx; this.sfxBus.connect(comp);
    this.voiceBus = ctx.createGain(); this.voiceBus.gain.value = this.opts.sfx * 0.9; this.voiceBus.connect(comp);
    // guitar chain: distortion -> tone filters
    const ws = ctx.createWaveShaper(); ws.curve = this.distCurve(90); ws.oversample = '2x';
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.8;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1400; pk.gain.value = 4; pk.Q.value = 1;
    const gg = ctx.createGain(); gg.gain.value = 0.35;
    ws.connect(hp); hp.connect(lp); lp.connect(pk); pk.connect(gg); gg.connect(this.musicBus);
    this.guitarBus = ws;
    // lead chain: light distortion + delay
    const lws = ctx.createWaveShaper(); lws.curve = this.distCurve(30);
    const llp = ctx.createBiquadFilter(); llp.type = 'lowpass'; llp.frequency.value = 2800;
    const lg = ctx.createGain(); lg.gain.value = 0.28;
    const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    lws.connect(llp); llp.connect(lg); lg.connect(this.musicBus); lg.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.musicBus);
    this.leadBus = lws; this.leadDelay = dl;
    // noise buffer
    const len = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.loadOpts();
  },
  loadOpts() {
    try { const o = JSON.parse(localStorage.getItem('ifl_audio') || 'null'); if (o) Object.assign(this.opts, o); } catch (e) {}
    this.applyOpts();
  },
  applyOpts() {
    if (!this.ctx) return;
    this.musicBus.gain.value = this.opts.music * 0.55;
    this.sfxBus.gain.value = this.opts.sfx;
    this.voiceBus.gain.value = this.opts.sfx * 0.9;
    try { localStorage.setItem('ifl_audio', JSON.stringify(this.opts)); } catch (e) {}
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  distCurve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  },
  midi(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  noise(t, dur, filterType, freq, q, gain, dest, sweepTo) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxBus); src.start(t); src.stop(t + dur + 0.05);
  },
  tone(t, dur, type, f0, f1, gain, dest, attack) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
    return o;
  },

  // ---------- SFX ----------
  sfx(name) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    switch (name) {
      case 'whoosh': this.noise(t, 0.14, 'bandpass', 900, 1.5, 0.25, null, 300); break;
      case 'hit': this.noise(t, 0.1, 'lowpass', 1400, 1, 0.7); this.tone(t, 0.09, 'sine', 130, 60, 0.6); break;
      case 'hitheavy': this.noise(t, 0.22, 'lowpass', 900, 1, 0.9); this.tone(t, 0.25, 'sine', 100, 35, 0.9); this.tone(t, 0.05, 'square', 300, 100, 0.2); break;
      case 'block': this.tone(t, 0.05, 'square', 900, 500, 0.25); this.noise(t, 0.06, 'highpass', 3000, 1, 0.35); break;
      case 'ko': this.noise(t, 0.6, 'lowpass', 1200, 1, 1.0, null, 100); this.tone(t, 0.7, 'sine', 90, 25, 1.0); this.tone(t + 0.05, 0.4, 'sawtooth', 200, 40, 0.3); break;
      case 'proj': this.tone(t, 0.25, 'sawtooth', 300, 900, 0.25); this.noise(t, 0.2, 'bandpass', 1500, 2, 0.3, null, 4000); break;
      case 'projhit': this.noise(t, 0.25, 'bandpass', 2000, 1, 0.6, null, 300); this.tone(t, 0.2, 'sine', 200, 50, 0.5); break;
      case 'jump': this.noise(t, 0.08, 'lowpass', 800, 1, 0.2); break;
      case 'land': this.noise(t, 0.1, 'lowpass', 500, 1, 0.35); this.tone(t, 0.08, 'sine', 90, 40, 0.3); break;
      case 'move': this.tone(t, 0.05, 'square', 700, 700, 0.15); break;
      case 'confirm': this.tone(t, 0.06, 'square', 500, 500, 0.15); this.tone(t + 0.07, 0.12, 'square', 800, 800, 0.15); break;
      case 'back': this.tone(t, 0.1, 'square', 400, 200, 0.15); break;
      case 'super': this.tone(t, 0.5, 'sawtooth', 100, 1200, 0.5); this.noise(t + 0.3, 0.6, 'lowpass', 3000, 1, 0.9, null, 200); this.tone(t + 0.3, 0.6, 'sine', 80, 30, 0.9); break;
      case 'tele': this.noise(t, 0.3, 'bandpass', 3000, 3, 0.4, null, 300); this.tone(t, 0.3, 'sine', 1200, 200, 0.2); break;
      case 'counter': this.tone(t, 0.15, 'triangle', 1500, 2500, 0.3); this.noise(t, 0.1, 'highpass', 4000, 1, 0.3); break;
      case 'grab': this.noise(t, 0.12, 'lowpass', 700, 1, 0.4); break;
      case 'round': this.tone(t, 0.4, 'sawtooth', 220, 220, 0.2); this.tone(t + 0.2, 0.6, 'sawtooth', 330, 330, 0.2); break;
      case 'timeout': this.tone(t, 0.3, 'square', 440, 440, 0.2); this.tone(t + 0.35, 0.5, 'square', 330, 330, 0.2); break;
    }
  },

  // ---------- Voices ----------
  grunt(v, kind) {
    if (!this.ctx || !this.opts.voices) return;
    const ctx = this.ctx, t = ctx.currentTime;
    let dur = 0.16, f0 = v.base * 1.25, f1 = v.base * 0.9, gain = 0.5, breath = 0.25;
    if (kind === 'heavy') { dur = 0.3; f0 = v.base * 1.4; f1 = v.base * 0.85; gain = 0.65; breath = 0.35; }
    else if (kind === 'special') { dur = 0.42; f0 = v.base * 1.1; f1 = v.base * 1.5; gain = 0.7; breath = 0.3; }
    else if (kind === 'hurt') { dur = 0.22; f0 = v.base * 0.95; f1 = v.base * 0.6; gain = 0.55; breath = 0.5; }
    else if (kind === 'ko') { dur = 0.7; f0 = v.base * 1.1; f1 = v.base * 0.4; gain = 0.7; breath = 0.6; }
    else if (kind === 'win') { dur = 0.5; f0 = v.base * 1.0; f1 = v.base * 1.3; gain = 0.6; breath = 0.2; }
    const o = ctx.createOscillator(); o.type = v.type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = 7; const vg = ctx.createGain(); vg.gain.value = v.base * 0.04; vib.connect(vg); vg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(v.formant, t); f.frequency.exponentialRampToValueAtTime(v.formant * 0.7, t + dur); f.Q.value = 1.6;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = v.formant * 2.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.03); g.gain.setValueAtTime(gain, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(f2); f2.connect(g); g.connect(this.voiceBus);
    o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
    this.noise(t, 0.08, 'bandpass', v.formant * 1.5, 1, breath * gain, this.voiceBus);
  },
  say(text, sp, rate, vol) {
    if (!this.opts.voices || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text); u.pitch = Math.max(0, Math.min(2, sp)); u.rate = rate || 1; u.volume = vol == null ? 1 : vol; u.lang = 'en-US';
      const voices = speechSynthesis.getVoices(); const en = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
      if (en) u.voice = en;
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  announce(text) { this.say(text, 0.55, 0.9, 1); },

  // ---------- Music engine ----------
  music: { track: null, id: null, step: 0, nextT: 0, timer: null, tokens: null, lead: null },
  parseRiff(tr) {
    const bars = tr.riff.map(b => b.trim().split(/\s+/));
    const lead = tr.lead ? tr.lead.trim().split(/\s+/) : null;
    return { bars, lead };
  },
  playMusic(id) {
    if (!this.ctx) return;
    if (this.music.id === id && this.music.timer) return;
    this.stopMusic();
    const tr = TRACKS[id]; if (!tr) return;
    const m = this.music; m.track = tr; m.id = id; m.step = 0; m.tokens = this.parseRiff(tr); m.nextT = this.ctx.currentTime + 0.1;
    if (this.leadDelay) this.leadDelay.delayTime.value = (60 / tr.bpm) * 0.75;
    m.timer = setInterval(() => this.schedule(), 30);
  },
  stopMusic() { const m = this.music; if (m.timer) clearInterval(m.timer); m.timer = null; m.id = null; },
  schedule() {
    const m = this.music, ctx = this.ctx, tr = m.track; if (!tr) return;
    const stepDur = 60 / tr.bpm / 4;
    while (m.nextT < ctx.currentTime + 0.15) {
      const total = tr.riff.length * 16;
      if (tr.once && m.step >= total) { this.stopMusic(); return; }
      const s = m.step % total, bar = Math.floor(s / 16), i = s % 16, t = m.nextT;
      const chordRoot = tr.root + tr.chords[bar % tr.chords.length];
      // guitar / bass
      const tok = m.tokens.bars[bar][i];
      if (tok !== '.' && tok !== '-') {
        let len = 1; for (let j = i + 1; j < 16 && m.tokens.bars[bar][j] === '-'; j++) len++;
        const note = chordRoot + parseInt(tok, 10);
        this.powerChord(note, t, len * stepDur, tr.tone);
        this.bass(note - 12, t, len * stepDur);
      }
      // drums
      const d = tr.drums;
      if (d.k && d.k[i] !== '.') this.kick(t, d.k[i] === 'o' ? 1.2 : 1);
      if (d.s && d.s[i] !== '.') this.snare(t, d.s[i] === 'o' ? 1.2 : 1);
      if (d.h && d.h[i] !== '.') this.hat(t, i % 4 === 0 ? 0.6 : 0.35);
      if (d.t && d.t[i] !== '.') this.tom(t);
      if (d.c && d.c[i] !== '.' && (bar === 0 || tr.once)) this.crash(t);
      // lead
      if (m.tokens.lead) {
        const L = m.tokens.lead, li = (m.step) % L.length, lt = L[li];
        if (lt !== '.' && lt !== '-') {
          let len = 1; for (let j = li + 1; j < L.length && L[j] === '-'; j++) len++;
          this.lead(tr.root + 24 + parseInt(lt, 10), t, len * stepDur, tr.leadType || 'sawtooth');
        }
      }
      m.step++; m.nextT += stepDur;
    }
  },
  powerChord(midiNote, t, dur, tone) {
    const ctx = this.ctx, f = this.midi(midiNote), d = Math.max(0.06, dur - 0.02);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.006); g.gain.setValueAtTime(0.5, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    g.connect(this.guitarBus);
    const ivs = tone === 'synth' ? [0, 12] : [0, 7, 12];
    for (const iv of ivs) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = tone === 'synth' ? 'square' : 'sawtooth'; o.frequency.value = f * Math.pow(2, iv / 12); o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + d + 0.02);
    }
  },
  bass(midiNote, t, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.midi(midiNote);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = ctx.createGain(); const d = Math.max(0.08, dur - 0.01);
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01); g.gain.setValueAtTime(0.5, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(f); f.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + d + 0.02);
  },
  lead(midiNote, t, dur, type) {
    const ctx = this.ctx, f = this.midi(midiNote), d = Math.max(0.08, dur - 0.015);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.6, t + 0.01); g.gain.setValueAtTime(0.6, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    g.connect(this.leadBus);
    for (const det of [-8, 8]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(g); o.start(t); o.stop(t + d + 0.02); }
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = 0; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + 0.25);
    vib.connect(vg); vib.start(t); vib.stop(t + d + 0.02);
  },
  kick(t, v) { this.tone(t, 0.28, 'sine', 160, 42, 0.9 * v, this.musicBus); this.noise(t, 0.03, 'lowpass', 2000, 1, 0.3 * v, this.musicBus); },
  snare(t, v) { this.noise(t, 0.18, 'bandpass', 1900, 0.8, 0.55 * v, this.musicBus); this.tone(t, 0.12, 'triangle', 220, 150, 0.45 * v, this.musicBus); },
  hat(t, v) { this.noise(t, 0.045, 'highpass', 8500, 1, v * 0.35, this.musicBus); },
  tom(t) { this.tone(t, 0.25, 'sine', 180, 90, 0.6, this.musicBus); this.noise(t, 0.05, 'lowpass', 1500, 1, 0.2, this.musicBus); },
  crash(t) { this.noise(t, 1.2, 'bandpass', 6500, 0.5, 0.3, this.musicBus); this.noise(t, 0.8, 'highpass', 9000, 1, 0.2, this.musicBus); },
};

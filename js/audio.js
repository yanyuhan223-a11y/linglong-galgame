/* ============================================================
   audio.js —— 《笼中异色》音频系统
   · BGM：Web Audio 实时合成的分层氛围音乐（pad / bass / arp / perc / wind），
          按场景切 preset，跨场景交叉淡入淡出。不引第三方音乐，零版权零体积。
   · SFX：全部程序化合成（点击、打字、白光、电流、震动、脚步……）
   · VOICE：assets/voice/*.mp3（macOS TTS 生成的中文旁白），播放时自动压低 BGM
   对外只暴露 window.Snd（不能叫 Audio，会和浏览器构造器撞名）
   ============================================================ */
(function () {
  'use strict';

  var LS = 'chroma_snd_v1';

  var ctx = null, master = null, gBgm = null, gSfx = null, comp = null;
  var noiseBuf = null, pinkBuf = null, delayNode = null, delayFb = null;
  var windSrc = null, windGain = null, windFilt = null, windLfo = null;
  var conv = null, revBgm = null, revSfx = null, drive = null, sfxTone = null;
  var groanTimer = 0;

  var started = false;                 // AudioContext 是否已解锁
  var muted = false, vol = 0.75;       // 用户设置
  var curName = 'none', preset = null; // 当前 BGM
  var schedTimer = 0, nextT = 0, step = 0;
  var duckCount = 0, voiceEl = null;

  /* ---------------- 乐理小工具 ---------------- */
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /* 每个 preset：bpm / 根音 / 和弦走向（半音偏移）/ 各层音量 / 滤波 / 琶音音型 */
  var PRESETS = {
    /* 标题：低沉、克制，远处有金属回响 */
    title: {
      bpm: 60, root: 45, cut: 760, pad: 0.26, bass: 0.20, arp: 0.085, perc: 0,
      wind: 0.055, windCut: 620, arpOct: 24,
      chords: [[0, 7, 12, 15], [0, 7, 12, 15], [-4, 3, 8, 15], [-5, 2, 7, 14]],
      arpPat: [0, 12, 7, 15, 12, 7, 19, 12]
    },
    /* 第一视角探索：几乎没有旋律，只有空间感和心跳般的低频 */
    explore: {
      bpm: 52, root: 40, cut: 520, pad: 0.24, bass: 0.22, arp: 0.05, perc: 0.14,
      wind: 0.085, windCut: 480, arpOct: 24, sparse: true,
      chords: [[0, 7, 14], [0, 7, 14], [-2, 5, 12], [0, 7, 14]],
      arpPat: [0, -1, 12, -1, 7, -1, -1, -1]
    },
    /* 正片对话（灯塔内）：稍有起伏的弦乐感 pad */
    story: {
      bpm: 66, root: 43, cut: 840, pad: 0.27, bass: 0.19, arp: 0.075, perc: 0.05,
      wind: 0.05, windCut: 700, arpOct: 24,
      chords: [[0, 3, 7, 14], [-2, 3, 7, 12], [-4, 3, 8, 15], [-5, 3, 7, 12]],
      arpPat: [0, 7, 12, 7, 14, 7, 12, 7]
    },
    /* 盘问 / 危险：不协和音 + 心跳鼓 */
    tension: {
      bpm: 76, root: 41, cut: 660, pad: 0.25, bass: 0.24, arp: 0.06, perc: 0.2,
      wind: 0.07, windCut: 560, arpOct: 12, heart: true,
      chords: [[0, 1, 7, 13], [0, 1, 7, 13], [-1, 0, 6, 12], [0, 1, 7, 13]],
      arpPat: [0, -1, 1, -1, 7, -1, 6, -1]
    },
    /* 高潮 / 电光：快速琶音 + 鼓 */
    battle: {
      bpm: 96, root: 45, cut: 1250, pad: 0.22, bass: 0.26, arp: 0.13, perc: 0.26,
      wind: 0.05, windCut: 900, arpOct: 12,
      chords: [[0, 3, 7, 10], [-3, 0, 5, 8], [-5, 0, 3, 7], [-2, 1, 5, 8]],
      arpPat: [0, 7, 3, 10, 7, 3, 12, 7]
    },
    /* 地面废墟 / 玛娜生态：开阔一点，带高音铃 */
    ruins: {
      bpm: 58, root: 41, cut: 900, pad: 0.28, bass: 0.18, arp: 0.09, perc: 0.06,
      wind: 0.075, windCut: 820, arpOct: 24, bell: true,
      chords: [[0, 5, 12, 17], [-3, 4, 9, 16], [-5, 2, 7, 14], [-3, 4, 9, 16]],
      arpPat: [0, 12, 17, 12, 5, 12, 17, 24]
    },
    /* 片尾讲述：只留 pad + 稀疏铃，给旁白让路 */
    ending: {
      bpm: 50, root: 40, cut: 700, pad: 0.3, bass: 0.16, arp: 0.06, perc: 0,
      wind: 0.06, windCut: 640, arpOct: 24, bell: true, sparse: true,
      chords: [[0, 7, 12, 16], [-5, 2, 7, 14], [-3, 4, 9, 16], [0, 7, 12, 19]],
      arpPat: [0, -1, -1, 12, -1, -1, 16, -1]
    }
  };

  /* ---------------- 音色工具 ---------------- */
  function softClip(k) {
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = i * 2 / n - 1;
      c[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return c;
  }

  /* 粉噪：Voss-McCartney 的简化版，比白噪柔和，更像空气 */
  function makePink(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return buf;
  }

  /* 混响脉冲：噪声衰减 + 轻微金属早反射 */
  function makeIR(sec, decay) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
      // 几处早反射，做出金属廊道的形状
      [0.011, 0.023, 0.037, 0.061].forEach(function (ms, k) {
        var idx = Math.floor(ms * ctx.sampleRate);
        if (idx < len) d[idx] += (k % 2 ? -1 : 1) * 0.34;
      });
    }
    return buf;
  }

  /* ---------------- 初始化 ---------------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(LS));
      if (d) { muted = !!d.muted; if (typeof d.vol === 'number') vol = d.vol; }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify({ muted: muted, vol: vol })); } catch (e) {}
  }

  function build() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24;
    comp.ratio.value = 3.2; comp.attack.value = 0.006; comp.release.value = 0.22;

    master = ctx.createGain();
    master.gain.value = muted ? 0 : vol;

    gBgm = ctx.createGain(); gBgm.gain.value = 0;
    // UI 音效整体压低一档，并切掉 8.5k 以上的尖头，免得比音乐还抢
    gSfx = ctx.createGain(); gSfx.gain.value = 0.52;
    sfxTone = ctx.createBiquadFilter();
    sfxTone.type = 'lowpass'; sfxTone.frequency.value = 8500; sfxTone.Q.value = 0.4;

    // 低音轻微软削波：给贝斯一点颗粒和"脏"，末世质感
    drive = ctx.createWaveShaper();
    drive.curve = softClip(2.4);
    drive.oversample = '2x';
    drive.connect(gBgm);

    // 琶音用的短延时，做出空间深度
    delayNode = ctx.createDelay(1.0); delayNode.delayTime.value = 0.31;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.32;
    var dFilt = ctx.createBiquadFilter(); dFilt.type = 'lowpass'; dFilt.frequency.value = 2200;
    delayNode.connect(dFilt); dFilt.connect(delayFb); delayFb.connect(delayNode);
    delayNode.connect(gBgm);

    gBgm.connect(comp); gSfx.connect(sfxTone); sfxTone.connect(comp);
    comp.connect(master); master.connect(ctx.destination);

    // 白噪 buffer（风声 / 打击乐 / 电流都从它派生）
    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var ch = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    // 粉噪 buffer：风声用它比白噪更像空气，不刺耳
    pinkBuf = makePink(6);

    // 程序生成的工业空间混响，把音乐和音效粘在同一个空间里
    conv = ctx.createConvolver();
    conv.buffer = makeIR(2.8, 3.4);
    conv.connect(comp);
    revBgm = ctx.createGain(); revBgm.gain.value = 0.26; gBgm.connect(revBgm); revBgm.connect(conv);
    revSfx = ctx.createGain(); revSfx.gain.value = 0.22; gSfx.connect(revSfx); revSfx.connect(conv);

    // 常驻风声层（粉噪 + 极慢 LFO 呼吸，避免死循环感）
    windSrc = ctx.createBufferSource(); windSrc.buffer = pinkBuf; windSrc.loop = true;
    windFilt = ctx.createBiquadFilter(); windFilt.type = 'lowpass'; windFilt.frequency.value = 600;
    windFilt.Q.value = 0.8;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    windSrc.connect(windFilt); windFilt.connect(windGain); windGain.connect(gBgm);
    try { windSrc.start(); } catch (e) {}

    windLfo = ctx.createOscillator(); windLfo.type = 'sine'; windLfo.frequency.value = 0.043;
    var lg = ctx.createGain(); lg.gain.value = 170;      // 滤波在 ±170Hz 之间缓慢漂
    windLfo.connect(lg); lg.connect(windFilt.frequency);
    try { windLfo.start(); } catch (e) {}

    return true;
  }

  function unlock() {
    if (!build()) return;
    if (ctx.state === 'suspended') ctx.resume();
    started = true;
  }

  /* ---------------- 合成基元 ---------------- */
  function env(g, t, a, d, peak) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function padChord(t, semis, root, dur, amp, cut) {
    for (var i = 0; i < semis.length; i++) {
      for (var k = 0; k < 2; k++) {
        var o = ctx.createOscillator();
        o.type = k ? 'triangle' : 'sawtooth';
        o.frequency.value = hz(root + semis[i]);
        o.detune.value = (k ? 7 : -7) + (Math.random() * 6 - 3);
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 0.6;
        f.frequency.setValueAtTime(cut * 0.7, t);
        f.frequency.linearRampToValueAtTime(cut, t + dur * 0.45);
        var g = ctx.createGain();
        env(g, t, dur * 0.35, dur * 0.75, amp / semis.length * (k ? 0.5 : 1));
        o.connect(f); f.connect(g); g.connect(gBgm);
        o.start(t); o.stop(t + dur * 1.2);
      }
    }
  }

  function bassNote(t, semi, root, dur, amp) {
    var o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = hz(root + semi - 12);
    var o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = hz(root + semi - 12); o2.detune.value = 5;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    var g = ctx.createGain();
    env(g, t, 0.08, dur * 0.9, amp);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(drive || gBgm);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
  }

  function arpNote(t, semi, root, amp, bell) {
    var o = ctx.createOscillator();
    o.type = bell ? 'sine' : 'triangle';
    o.frequency.value = hz(root + semi);
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = hz(root + semi) * (bell ? 2.4 : 1.6); f.Q.value = bell ? 6 : 2;
    var g = ctx.createGain();
    env(g, t, 0.008, bell ? 1.6 : 0.42, amp);
    o.connect(f); f.connect(g); g.connect(gBgm); g.connect(delayNode);
    o.start(t); o.stop(t + (bell ? 1.8 : 0.6));
  }

  function kick(t, amp) {
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    var g = ctx.createGain(); env(g, t, 0.004, 0.22, amp);
    o.connect(g); g.connect(gBgm); o.start(t); o.stop(t + 0.3);
  }

  function hat(t, amp) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = 1.6;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6200;
    var g = ctx.createGain(); env(g, t, 0.002, 0.055, amp);
    s.connect(f); f.connect(g); g.connect(gBgm);
    s.start(t); s.stop(t + 0.1);
  }

  /* ---------------- BGM 调度 ---------------- */
  function schedStep(n, t) {
    var p = preset; if (!p) return;
    var beat = n % 8;
    var bar = Math.floor(n / 8);
    var chord = p.chords[bar % p.chords.length];
    var spb = 60 / p.bpm;

    if (beat === 0) {
      var cutJit = p.cut * (0.86 + Math.random() * 0.3);      // 每圈都不完全一样
      padChord(t, chord, p.root, spb * 4.2, p.pad * (0.9 + Math.random() * 0.2), cutJit);
      bassNote(t, chord[0], p.root, spb * 3.6, p.bass);
      if (p.perc) kick(t, p.perc);
      if (p.heart) kick(t + spb * 0.42, p.perc * 0.7);
    }
    if (p.perc && !p.heart && beat === 4) kick(t, p.perc * 0.8);
    if (p.perc > 0.15 && beat % 2 === 1) hat(t, p.perc * 0.22);

    if (p.arp) {
      var v = p.arpPat[n % p.arpPat.length];
      if (v >= 0) {
        var skip = p.sparse && (bar % 2 === 1);
        if (!skip) arpNote(t, chord[0] + v, p.root + (p.arpOct || 12), p.arp, !!p.bell);
      }
    }
  }

  /* 远处金属呻吟 / 结构受力声：随机稀疏出现，掩盖短循环 */
  function groan() {
    if (!ctx || !preset || !preset.wind) return;
    var t = ctx.currentTime + 0.05;
    var dur = 3.2 + Math.random() * 3.4;
    var s1 = ctx.createBufferSource(); s1.buffer = pinkBuf; s1.loop = true;
    s1.playbackRate.value = 0.7 + Math.random() * 0.4;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass';
    var base = 90 + Math.random() * 130;
    f.frequency.setValueAtTime(base, t);
    f.frequency.linearRampToValueAtTime(base * (0.6 + Math.random() * 0.9), t + dur);
    f.Q.value = 5 + Math.random() * 6;
    var g = ctx.createGain();
    var amp = 0.055 * (preset.wind / 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s1.connect(f); f.connect(g); g.connect(gBgm);
    s1.start(t); s1.stop(t + dur + 0.1);
  }

  function scheduleGroan() {
    if (groanTimer) clearTimeout(groanTimer);
    groanTimer = setTimeout(function () {
      groan();
      scheduleGroan();
    }, 16000 + Math.random() * 26000);
  }

  function tick() {
    if (!ctx || !preset) return;
    var spb = 60 / preset.bpm, ahead = 0.5;
    while (nextT < ctx.currentTime + ahead) {
      schedStep(step, nextT);
      nextT += spb / 2;
      step++;
    }
  }

  function fadeBgm(to, sec) {
    if (!gBgm) return;
    var t = ctx.currentTime;
    gBgm.gain.cancelScheduledValues(t);
    gBgm.gain.setValueAtTime(Math.max(gBgm.gain.value, 0.0001), t);
    gBgm.gain.linearRampToValueAtTime(to, t + sec);
  }

  function bgmTarget() { return duckCount > 0 ? 0.26 : 1; }

  function bgm(name, opt) {
    if (!build()) return;
    if (name === curName && preset) return;
    curName = name;
    var next = PRESETS[name] || null;
    var fadeOut = (opt && opt.fast) ? 0.35 : 1.1;

    fadeBgm(0.0001, fadeOut);
    if (windGain) {
      windGain.gain.cancelScheduledValues(ctx.currentTime);
      windGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fadeOut);
    }

    setTimeout(function () {
      if (curName !== name) return;             // 期间又切了别的
      preset = next;
      if (schedTimer) { clearInterval(schedTimer); schedTimer = 0; }
      if (groanTimer) { clearTimeout(groanTimer); groanTimer = 0; }
      if (!preset) return;
      step = 0; nextT = ctx.currentTime + 0.06;
      schedTimer = setInterval(tick, 90);
      tick();
      scheduleGroan();
      fadeBgm(bgmTarget(), 1.6);
      if (windGain) {
        windFilt.frequency.setTargetAtTime(preset.windCut || 600, ctx.currentTime, 0.6);
        windGain.gain.linearRampToValueAtTime(preset.wind || 0.05, ctx.currentTime + 1.6);
      }
    }, fadeOut * 1000 + 40);
  }

  function duck(on) {
    duckCount = Math.max(0, duckCount + (on ? 1 : -1));
    if (!ctx || !preset) return;
    fadeBgm(bgmTarget(), on ? 0.35 : 0.9);
  }

  /* ---------------- 音效 ---------------- */
  function blip(freq, type, dur, amp, slideTo) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    var g = ctx.createGain(); env(g, t, 0.004, dur, amp);
    o.connect(g); g.connect(gSfx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, amp, type, freq, q, slideTo, rate) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = q || 1;
    var g = ctx.createGain(); env(g, t, 0.006, dur, amp);
    s.connect(f); f.connect(g); g.connect(gSfx);
    s.start(t); s.stop(t + dur + 0.08);
  }

  var lastType = 0;
  var SFX = {
    hover: function () { blip(1180, 'triangle', 0.05, 0.06); },
    click: function () { blip(760, 'square', 0.06, 0.14, 1240); noise(0.05, 0.05, 'highpass', 2600, 1); },
    back:  function () { blip(560, 'square', 0.09, 0.11, 260); },
    type:  function () {
      var now = performance.now();
      if (now - lastType < 34) return;          // 节流，别糊成一片
      lastType = now;
      noise(0.018, 0.035, 'bandpass', 1700 + Math.random() * 900, 6);
    },
    advance: function () { blip(940, 'triangle', 0.05, 0.07, 1420); },
    choiceIn: function () { blip(620, 'triangle', 0.1, 0.08, 930); },
    choiceOk: function () { blip(680, 'square', 0.07, 0.13, 1360); blip(1360, 'triangle', 0.16, 0.08); },
    chapter: function () {          // 阅读中途插入，压掉约 2dB 免得吓人
      noise(0.5, 0.125, 'bandpass', 2400, 8, 700);
      blip(180, 'sawtooth', 0.5, 0.094, 60);
      blip(96, 'sine', 0.9, 0.125, 48);
    },
    toast: function () { blip(1480, 'sine', 0.07, 0.07); },
    /* 白光穿越：上升 sweep + 爆裂 */
    whiteout: function () {
      if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(2400, t + 1.5);
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4200, t + 1.5);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 1.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      o.connect(f); f.connect(g); g.connect(gSfx);
      o.start(t); o.stop(t + 2.2);
      noise(1.6, 0.13, 'highpass', 400, 0.7, 5200);
      setTimeout(function () { noise(0.5, 0.2, 'lowpass', 2600, 0.8, 200); }, 1350);
    },
    charge: function () {
      blip(70, 'sawtooth', 1.4, 0.13, 440);
      noise(1.4, 0.09, 'bandpass', 900, 3, 3600);
    },
    zap: function () {
      noise(0.32, 0.24, 'bandpass', 3600, 1.4, 500, 1.8);
      blip(1500, 'square', 0.22, 0.12, 140);
    },
    impact: function () {
      blip(140, 'sine', 0.32, 0.24, 42);
      noise(0.3, 0.14, 'lowpass', 1400, 0.8, 220);
    },
    danger: function () { blip(58, 'sine', 1.1, 0.16, 44); },
    step:   function () { noise(0.11, 0.075, 'lowpass', 520, 0.9, 180, 0.85); },
    near:   function () { blip(46, 'sine', 1.6, 0.15); noise(1.2, 0.05, 'bandpass', 260, 2); },
    glitch: function () { noise(0.28, 0.13, 'bandpass', 1800, 0.9, 5200, 2.2); blip(320, 'square', 0.1, 0.07, 90); }
  };

  function sfx(name) {
    if (!started || muted || !ctx || !SFX[name]) return;
    try { SFX[name](); } catch (e) {}
  }

  /* ---------------- TTS 旁白 ---------------- */
  function stopVoice() {
    if (voiceEl) {
      try { voiceEl.pause(); } catch (e) {}
      var was = voiceEl; voiceEl = null;
      if (was._ducked) { was._ducked = false; duck(false); }
      if (was._resolve) was._resolve();
    }
  }

  function voice(id) {
    stopVoice();
    return new Promise(function (res) {
      var a = new window.Audio('assets/voice/' + id + '.mp3');
      a.preload = 'auto';
      a.volume = muted ? 0 : Math.min(1, vol + 0.2);
      // 能接进 AudioContext 就接：旁白吃同一套混响，和音乐在同一个空间里，
      // 静音开关也能中途生效。接不上（ctx 没解锁）就退回原生播放。
      if (ctx && ctx.state === 'running' && comp) {
        try {
          var src = ctx.createMediaElementSource(a);
          var vg = ctx.createGain(); vg.gain.value = Math.min(1, vol + 0.25);
          src.connect(vg); vg.connect(comp);
          if (conv) { var vr = ctx.createGain(); vr.gain.value = 0.16; vg.connect(vr); vr.connect(conv); }
          a.volume = 1;                 // 音量交给 master，静音时整条链一起哑
        } catch (e) { /* 已经被接过或不支持 */ }
      }
      a._resolve = res;
      voiceEl = a;
      duck(true); a._ducked = true;
      var done = function () {
        if (voiceEl === a) voiceEl = null;
        if (a._ducked) { a._ducked = false; duck(false); }
        if (a._resolve) { var r = a._resolve; a._resolve = null; r(); }
      };
      a.addEventListener('ended', done);
      a.addEventListener('error', done);
      var p = a.play();
      if (p && p.catch) p.catch(done);
    });
  }

  /* ---------------- 音量 / 静音 ---------------- */
  function applyVol() {
    if (master) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.linearRampToValueAtTime(muted ? 0.0001 : vol, t + 0.18);
    }
    if (voiceEl) voiceEl.volume = muted ? 0 : Math.min(1, vol + 0.2);
    var btn = document.getElementById('sndBtn');
    if (btn) btn.classList.toggle('off', muted);
  }

  function setMuted(m) { muted = !!m; build(); applyVol(); save(); }
  function toggle() { setMuted(!muted); if (!muted) unlock(); return muted; }

  /* 右上角有别的 UI 时，给声音按钮让位 */
  function watchOn(id, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    var sync = function () { document.body.classList.toggle(cls, el.classList.contains('on')); };
    if (window.MutationObserver) new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    load();
    // 正片里右上角有 SYNC/BPM 生命体征，声音按钮要往下让开
    watchOn('hud', 'ingame');        // 正片：SYNC/BPM + 控制条
    watchOn('explore', 'exploring'); // 探索：右上角有「返回标题」
    var btn = document.getElementById('sndBtn');
    if (btn) {
      btn.classList.toggle('off', muted);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var m = toggle();
        sfx('click');
        var tip = document.getElementById('toast');
        if (tip) { tip.textContent = m ? '声音 关' : '声音 开'; tip.classList.add('on'); setTimeout(function () { tip.classList.remove('on'); }, 1100); }
      });
    }
    // 首次交互解锁 AudioContext（移动端必须）
    var once = function () {
      unlock();
      if (ctx && ctx.state === 'running') {
        document.removeEventListener('pointerdown', once);
        document.removeEventListener('keydown', once);
        if (curName === 'none') bgm('title');
      }
    };
    document.addEventListener('pointerdown', once);
    document.addEventListener('keydown', once);
  }

  window.Snd = {
    init: init, unlock: unlock, bgm: bgm, sfx: sfx, voice: voice, stopVoice: stopVoice,
    duck: duck, toggle: toggle, setMuted: setMuted,
    get muted() { return muted; },
    get _ctx() { return ctx; },        // 调试用：录制 / 分析输出
    get _out() { return master; },
    get ready() { return started; },
    get scene() { return curName; }
  };

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
})();

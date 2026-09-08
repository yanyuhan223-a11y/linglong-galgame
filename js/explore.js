/* ============================================================
   explore.js —— 灯塔长廊 · 第一视角沉浸探索
   流程：warp 穿越闪光 →（一闪而过）
        fpv  第一视角抬手，惊讶自白
        walk 第一视角持续向前推进（画面里没有 OC 自己）
             └ 手电筒可开，照亮墙面刻痕
             └ 走廊尽头马克全身逆光浮现，由小变大（伪 Live2D）
        talk 上前对话 → 接回正片剧情
   调试深链：?explore / ?explore&phase=fpv / ?explore&phase=walk / ?explore&phase=mark
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 参数 ---------- */
  var SPEED = 340;        // 每秒前进的"距离单位"
  var MAXD = 1400;        // 走到马克面前的总距离
  var APPEAR = 950;       // 纵深物件的可见距离
  var CYCLE_ZOOM = 0.48;  // 全程长廊放大量（单调放大，无重影）

  var GLYPH_D = 720;      // 墙面刻痕所在纵深

  /* ---------- 台词 ---------- */
  var MONO = [
    { s: '', t: '……手。是我的手。' },
    { s: 'SALT', t: '我怎么到这里来了？' },
    { s: 'SALT', t: '这是哪里……刚才那道光是什么东西？' },
    { s: '', t: '金属的味道。远处有低频的嗡鸣，像某种巨大的机器还在运转。' }
  ];

  var GLYPH_LINE = [
    { s: '', t: '光束扫过墙面，一排被刻掉又重新写上的编号在锈迹里浮出来。' },
    { s: 'SALT', t: '"生态区·三号回廊"……字是新的，划痕是旧的。有人在这儿改过东西。' }
  ];

  var MARK_SEE = [
    { s: '', t: '走廊尽头站着一个人。战术装甲，肩上的橙色指示灯一明一暗——他早就看见我了。' }
  ];

  var MARK_TALK = [
    { s: '马克', t: '站住。手举起来，慢一点。' },
    { s: '马克', t: '猎荒者行动区，这里不该有闲人。你哪个生态区的？编号报一下。' },
    { s: 'SALT', t: '……我没有编号。' },
    { s: '马克', t: '什么？' },
    { s: '', t: '他抬手在腕上的终端扫了一下，屏幕在他脸侧亮起来，那道旧疤被照得很清楚。' },
    { s: '马克', t: '扫不到你。基因档案、生命源质记录……一条都没有。' },
    { s: '马克', t: '你不在灯塔的系统里。' },
    { s: 'SALT', t: '我知道听起来很离谱，但我真的不是这里的人。' },
    { s: '马克', t: '……行。跟我走一趟。' },
    { s: '马克', t: '在我搞清楚你是什么之前，别离开我三米。' }
  ];

  /* ---------- 状态 ---------- */
  var els = {};
  var phase = 'idle';
  var dist = 0;
  var moving = false;
  var arrived = false;
  var torchOn = false;
  var glyphDone = false;
  var markSeen = false;
  var markTalked = false;
  var bob = 0;
  var last = 0;
  var raf = null;
  var moteT = 0;
  var timers = [];

  var cap = { list: [], i: 0, done: null, open: false };
  var lastPress = 0;   // 按钮刚被按过：吞掉紧随其后的画面点击，避免跳掉一句台词

  function T(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function cache() {
    els.root = $('explore');
    els.warp = $('exWarp');
    els.warpFlash = $('exWarpFlash');
    els.fpv = $('exFpv');
    els.cam = $('exCam');
    els.cor = $('exCor');
    els.hands = $('exHands');
    els.glyph = $('exGlyph');
    els.mark = $('exMark');
    els.mkHead = $('exMkHead');
    els.cap = $('exCaption');
    els.capWho = $('exCapWho');
    els.capTxt = $('exCapTxt');
    els.prompt = $('exPrompt');
    els.ctrl = $('exCtrl');
    els.runBtn = $('exRunBtn');
    els.runLab = $('exRunLab');
    els.runSub = $('exRunSub');
    els.torchBtn = $('exTorchBtn');
    els.hint = $('exHint');
    els.exit = $('exExit');
  }

  /* ---------- 字幕 ---------- */
  function openCap(list, done) {
    cap.list = list; cap.i = 0; cap.done = done || null; cap.open = true;
    renderCap();
    els.cap.classList.add('on');
  }
  function renderCap() {
    var l = cap.list[cap.i];
    els.capWho.textContent = l.s || '';
    els.capTxt.innerHTML = l.t.replace(/没有编号/g, '<span class="rd">没有编号</span>')
      .replace(/不在灯塔的系统里/g, '<span class="rd">不在灯塔的系统里</span>');
    if (l.s === '马克' && els.mkHead) {
      els.mkHead.classList.remove('nod');
      void els.mkHead.offsetWidth;
      els.mkHead.classList.add('nod');
      T(function () { els.mkHead.classList.remove('nod'); }, 600);
    }
  }
  function nextCap() {
    if (!cap.open) return;
    cap.i++;
    if (cap.i >= cap.list.length) {
      cap.open = false;
      els.cap.classList.remove('on');
      var d = cap.done; cap.done = null;
      if (d) T(d, 260);
    } else renderCap();
  }

  /* ---------- 阶段切换 ---------- */
  function setPhase(p) {
    phase = p;
    els.warp.classList.toggle('on', p === 'warp');
    els.fpv.classList.toggle('on', p === 'fpv' || p === 'walk');
    els.ctrl.classList.toggle('on', p === 'walk');
    els.root.classList.toggle('walking', p === 'walk');
  }

  /* ---------- 0. 穿越闪光（一闪而过） ---------- */
  function toWarp() {
    setPhase('warp');
    els.warpFlash.classList.remove('go');
    void els.warpFlash.offsetWidth;
    T(function () { els.warpFlash.classList.add('go'); }, 900);
    T(toFpv, 1750);
  }

  /* ---------- 1. 第一视角抬手 ---------- */
  function toFpv() {
    setPhase('fpv');
    dist = 0; bob = 0;
    applyCorridor();
    els.hands.classList.remove('down', 'sway');
    els.hands.classList.add('raise');
    T(function () { els.hands.classList.add('sway'); }, 1400);
    els.warpFlash.classList.remove('go');
    T(function () { openCap(MONO, toWalk); }, 1200);
  }

  /* ---------- 2. 第一视角往前走 ---------- */
  function toWalk() {
    setPhase('walk');
    els.hands.classList.remove('raise', 'sway');
    els.hands.classList.add('down');
    dist = 0; arrived = false; markSeen = false; markTalked = false; glyphDone = false;
    setRunBtn('前进', '按住向前走');
    els.runBtn.classList.add('pulse');
    els.hint.classList.remove('hide');
    els.hint.innerHTML = '按住 <b>前进</b> 往深处走 · <b>手电</b> 照亮墙面';
    T(function () { els.hint.classList.add('hide'); }, 7000);
    applyCorridor();
  }

  function setRunBtn(lab, sub) {
    els.runLab.textContent = lab;
    els.runSub.textContent = sub;
  }

  /* ---------- 渲染：长廊 + 纵深物件 ---------- */
  function applyCorridor() {
    var k = clamp(dist / MAXD, 0, 1);
    els.cor.style.transform = 'scale(' + (1 + k * CYCLE_ZOOM).toFixed(4) + ')';
    // 墙面刻痕：贴在左侧墙上，位置偏高
    layoutDep(els.glyph, GLYPH_D, torchOn ? 1 : 0,
      { lFar: 47, lNear: 8, bFar: 50, bNear: 44, hFar: 4, hNear: 34 });
    // 马克：站在回廊正中的地面上
    layoutDep(els.mark, MAXD, 1,
      { lFar: 48, lNear: 48, bFar: 45, bNear: 13, hFar: 7, hNear: 76 });
  }

  // 纵深摆放：remaining 越小 → 越大、越低、越亮
  function layoutDep(el, objD, vis, o) {
    if (!el) return;
    var rem = objD - dist;
    if (rem > APPEAR || rem < -80 || vis <= 0) { el.style.opacity = '0'; return; }
    var t = clamp(1 - rem / APPEAR, 0, 1);
    var e = Math.pow(t, 1.9);                      // 透视加速
    var h = o.hFar + e * (o.hNear - o.hFar);
    var b = o.bFar + e * (o.bNear - o.bFar);
    var l = o.lFar + e * (o.lNear - o.lFar);
    var op = clamp(t * 3.2, 0, 1) * vis;
    el.style.height = h.toFixed(2) + 'vh';
    el.style.bottom = b.toFixed(2) + '%';
    el.style.left = l.toFixed(2) + '%';
    el.style.fontSize = (h * 0.86).toFixed(2) + 'vh';
    el.style.opacity = op.toFixed(3);
    el.style.filter = 'blur(' + ((1 - e) * 2.2).toFixed(2) + 'px) brightness(' +
      (0.26 + e * 0.66).toFixed(2) + ') saturate(' + (0.8 + e * 0.2).toFixed(2) + ')';
  }

  /* ---------- 浮尘（迎面而来） ---------- */
  function spawnMote() {
    if (!els.cam) return;
    var m = document.createElement('i');
    m.className = 'mote';
    els.cam.appendChild(m);
    var ang = Math.random() * Math.PI * 2;
    var r = 30 + Math.random() * 70;
    var dx = Math.cos(ang) * r, dy = Math.sin(ang) * r * 0.62;
    var sc = 2.5 + Math.random() * 4;
    var dur = 780 + Math.random() * 520;
    try {
      m.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
        { opacity: .75, offset: .25 },
        { transform: 'translate(calc(-50% + ' + dx + 'vw),calc(-50% + ' + dy + 'vh)) scale(' + sc + ')', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.3,.05,.9,.6)' }).onfinish = function () { m.remove(); };
    } catch (e) { T(function () { m.remove(); }, dur); }
  }

  /* ---------- 主循环 ---------- */
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    if (phase !== 'fpv' && phase !== 'walk') return;

    var walking = phase === 'walk' && moving && !arrived && !cap.open;

    if (walking) {
      dist += SPEED * dt;
      bob += dt * 7.6;
      moteT += dt;
      if (moteT > 0.1) { moteT = 0; spawnMote(); }

      // 走近刻痕（需要开手电才看得清）
      if (torchOn && !glyphDone && dist > GLYPH_D - 90) {
        glyphDone = true;
        els.glyph.classList.add('lit');
        moving = false;
        openCap(GLYPH_LINE, null);
      }
      // 看见马克
      if (!markSeen && dist > MAXD - APPEAR + 120) {
        markSeen = true;
        moving = false;
        els.hint.classList.add('hide');
        openCap(MARK_SEE, null);
      }
      // 走到跟前
      if (dist >= MAXD) {
        dist = MAXD;
        arrived = true;
        moving = false;
        onArrive();
      }
    } else {
      bob += dt * 1.5; // 站立时的轻微呼吸
    }

    var amp = walking ? 1 : 0.22;
    var y = Math.abs(Math.sin(bob)) * 7 * amp;
    var rz = Math.sin(bob * 0.5) * 0.42 * amp;
    var xs = Math.sin(bob * 0.5) * 6 * amp;
    els.cam.style.transform = 'scale(1.05) translate(' + xs.toFixed(2) + 'px,' +
      (-y).toFixed(2) + 'px) rotate(' + rz.toFixed(3) + 'deg)';

    applyCorridor();
  }

  function onArrive() {
    els.hint.classList.add('hide');
    els.runBtn.classList.add('pulse');
    setRunBtn('上前对话', '他在等你说话');
    els.prompt.innerHTML = '<b>马克</b> 正挡在回廊尽头';
    els.prompt.classList.add('on');
    T(function () { els.prompt.classList.remove('on'); }, 2600);
  }

  /* ---------- 对话 → 接回正片 ---------- */
  function talkMark() {
    els.runBtn.classList.remove('pulse');
    els.ctrl.classList.remove('on');
    openCap(MARK_TALK, function () {
      markTalked = true;
      els.ctrl.classList.add('on');
      els.runBtn.classList.add('pulse');
      setRunBtn('跟他走', '进入正片剧情');
    });
  }

  function goStory() {
    stop(true);
    // 探索模式已经演完"坠入 + 第一视角遇见马克"，正片从接入点续上，
    // 避免把序章那几句重新念一遍
    if (window.__startStoryAt) window.__startStoryAt('explore_join');
    else if (window.__startStory) window.__startStory();
  }

  /* ---------- 交互 ---------- */
  function bind() {
    // 前进 / 对话 / 进入剧情
    var press = function (e) {
      e.preventDefault();
      lastPress = Date.now();
      if (cap.open) { nextCap(); return; }
      if (markTalked) { goStory(); return; }
      if (arrived) { talkMark(); return; }
      moving = true;
      els.runBtn.classList.remove('pulse');
      els.hint.classList.add('hide');
    };
    var release = function () { moving = false; };
    els.runBtn.addEventListener('pointerdown', press);
    els.runBtn.addEventListener('pointerup', release);
    els.runBtn.addEventListener('pointercancel', release);
    els.runBtn.addEventListener('pointerleave', release);
    els.runBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // 手电筒
    els.torchBtn.addEventListener('click', function () {
      torchOn = !torchOn;
      els.torchBtn.classList.toggle('on', torchOn);
      els.fpv.classList.toggle('torch-on', torchOn);
      applyCorridor();
    });

    // 字幕推进：点画面任意处（字幕本身也会冒泡到这里，不再单独绑定，避免一次点跳两句）
    els.root.addEventListener('click', function (e) {
      if (!cap.open) return;
      if (Date.now() - lastPress < 450) return;
      if (e.target.closest('.ex-ctrl') || e.target.closest('.ex-exit')) return;
      nextCap();
    });
    document.addEventListener('keydown', function (e) {
      if (phase === 'idle') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (cap.open) nextCap();
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { moving = true; }
      if (e.code === 'Escape') stop();
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') moving = false;
    });

    els.exit.addEventListener('click', function (e) { e.stopPropagation(); stop(); });
  }

  /* ---------- 生命周期 ---------- */
  function start() {
    cache();
    if (!els.root) return;
    if (!els.root.dataset.bound) { bind(); els.root.dataset.bound = '1'; }
    if (window.__hideTitle) window.__hideTitle();
    els.root.classList.add('on', 'enter');
    T(function () { els.root.classList.remove('enter'); }, 600);
    torchOn = false;
    els.torchBtn.classList.remove('on');
    els.fpv.classList.remove('torch-on');
    els.glyph.classList.remove('lit');
    els.cap.classList.remove('on');
    cap.open = false;
    dist = 0; moving = false; arrived = false;
    markSeen = false; markTalked = false; glyphDone = false;
    last = 0;
    if (!raf) raf = requestAnimationFrame(loop);
    toWarp();
  }

  function stop(toStory) {
    clearTimers();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    phase = 'idle';
    moving = false;
    if (els.root) els.root.classList.remove('on');
    if (els.warp) els.warp.classList.remove('on');
    if (els.fpv) els.fpv.classList.remove('on');
    if (els.ctrl) els.ctrl.classList.remove('on');
    if (!toStory && window.__showTitle) window.__showTitle();
  }

  window.Explore = { start: start, stop: stop };

  /* ---------- 调试深链 ---------- */
  window.addEventListener('load', function () {
    var q = location.search;
    if (q.indexOf('explore') < 0) return;
    setTimeout(function () {
      cache();
      if (!els.root) return;
      if (!els.root.dataset.bound) { bind(); els.root.dataset.bound = '1'; }
      if (window.__hideTitle) window.__hideTitle();
      els.root.classList.add('on');
      last = 0;
      if (!raf) raf = requestAnimationFrame(loop);
      if (q.indexOf('phase=fpv') >= 0) {
        setPhase('fpv'); dist = 0; applyCorridor();
        els.hands.classList.add('raise', 'sway');
        openCap(MONO, toWalk);
      } else if (q.indexOf('phase=walk') >= 0) {
        toWalk();
      } else if (q.indexOf('phase=far') >= 0) {
        toWalk(); dist = MAXD - 420; applyCorridor();
      } else if (q.indexOf('phase=mark') >= 0) {
        toWalk(); dist = MAXD; markSeen = true; arrived = true;
        applyCorridor(); onArrive();
      } else {
        toWarp();
      }
    }, 400);
  });
})();

/* ============================================================
   explore.js —— 灯塔回廊 · 第一视角探索段（正片剧情中的一段）
   由 script.js 的 { t:'explore' } 节点触发，engine.js await 它跑完再继续正片。

   节奏（刻意放慢，不让马克"冲过来"）：
     recover  睁眼：视线从刺眼白光里对焦回来
     fpv      抬手看自己的手 → 惊讶自白 → 手上有淡光
     walk     推左下摇杆，一步一步往回廊深处走
              ├ 灯塔广播（第一次停下）
              ├ 远处尽头出现一个不动的人影（第二次停下）
              ├ 手电照亮墙面刻痕（可选）
              └ 他察觉到你，肩灯转过来（第三次停下）
     talk     走到跟前，自动进入对话 → 淡出交回正片
   调试深链：?explore / ?explore&phase=fpv / ?explore&phase=walk / ?explore&phase=far / ?explore&phase=mark
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 节奏参数 ---------- */
  var SPEED = 168;        // 摇杆推满时每秒前进的"距离单位"（慢走，不是跑）
  var MAXD = 1560;        // 走到马克面前的总距离（≈ 满推 9 秒 + 中途几次停顿）
  var APPEAR = 1180;      // 纵深物件的可见距离：马克在 dist≈380 就已在尽头浮现
  var CYCLE_ZOOM = 0.52;  // 全程长廊放大量（单调放大，无重影）
  var GLYPH_D = 780;      // 墙面刻痕所在纵深
  var DEAD = 0.16;        // 摇杆死区

  /* ---------- 台词 ---------- */
  var MONO = [
    { s: '', t: '……冷。金属的冷，顺着后背一节一节爬上来。' },
    { s: '', t: '手。是我的手。指节、虎口上那块旧茧，都还在。' },
    { s: 'SALT', t: '我怎么到这里来了？' },
    { s: 'SALT', t: '这是哪里……刚才那道光是什么东西？' },
    { s: '', t: '指缝里浮着一层很淡的光，随着呼吸一亮一暗。', fx: 'glow' },
    { s: 'SALT', t: '而且——为什么我的手<em>在发光</em>？' },
    { s: '', t: '远处有低频的嗡鸣，像某种极大的机器还在运转。脚下的格栅在轻轻发抖。' }
  ];

  var RADIO = [
    { s: '灯塔广播', t: '全体尘民注意。A-7 区已封锁，基因编码核验中。无编码者将被视作污染源处理。' },
    { s: 'SALT', t: '尘民？基因编码……污染源？' },
    { s: '', t: '声音是从头顶的喇叭里下来的，语调平得像在报天气。' }
  ];

  var MARK_SEE = [
    { s: '', t: '回廊很长，尽头黑着。黑里有个东西，比黑更实——一个人的轮廓。' },
    { s: '', t: '他没有动。肩上一点橙色的光，一明一暗，像在呼吸。' },
    { s: 'SALT', t: '……是人。总比不是人好。' }
  ];

  var GLYPH_LINE = [
    { s: '', t: '光束扫过墙面，一排被刻掉又重新写上的编号在锈迹里浮出来。' },
    { s: 'SALT', t: '"生态区·三号回廊"……字是新的，划痕是旧的。有人在这儿改过东西。' }
  ];

  var MARK_NOTICE = [
    { s: '', t: '你又往前走了几步。' },
    { s: '', t: '橙色的光突然转了过来，正对着你的脸。' },
    { s: '', t: '他早就听见你了——只是一直在等你走到这个距离。' }
  ];

  var MARK_TALK = [
    { s: '马克', t: '站住。手举起来，慢一点。' },
    { s: '马克', t: '猎荒者行动区，这里不该有闲人。你哪个生态区的？编号报一下。' },
    { s: 'SALT', t: '……我没有编号。' },
    { s: '马克', t: '什么？' },
    { s: '', t: '他抬手在腕上的终端扫了一下，屏幕在他脸侧亮起来，那道旧疤被照得很清楚。' },
    { s: '马克', t: '扫不到你。基因档案、生命源质记录……一条都没有。' },
    { s: '马克', t: '你不在灯塔的系统里。' },
    { s: '马克', t: '灯塔上有三千一百二十七个活人，每一个的编号我都背得出来。你不是其中之一。' }
  ];

  /* ---------- 沿途节拍：走到就停下，演一段，再让玩家继续推 ---------- */
  var BEATS = [
    { d: 210, fx: '', lines: RADIO, hint: '推摇杆继续往深处走' },
    { d: 640, fx: 'see', lines: MARK_SEE, hint: '慢一点靠近他 · <b>手电</b>可以照墙' },
    { d: 1140, fx: 'alert', lines: MARK_NOTICE, hint: '走到他跟前' }
  ];

  /* ---------- 状态 ---------- */
  var els = {};
  var phase = 'idle';
  var inStory = false;
  var storyResolve = null;

  var dist = 0;
  var fwd = 0;            // 摇杆前进量 0~1（已去死区）
  var panX = 0;           // 摇杆横向 → 视线左右微摆
  var arrived = false;
  var torchOn = false;
  var glyphDone = false;
  var beatI = 0;
  var bob = 0;
  var last = 0;
  var raf = null;
  var moteT = 0;
  var timers = [];

  var cap = { list: [], i: 0, done: null, open: false };
  var stick = { active: false, id: null, cx: 0, cy: 0, r: 46, nx: 0, ny: 0 };

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
    els.mkRig = els.mark ? els.mark.querySelector('.mk-rig') : null;
    els.mkHead = $('exMkHead');
    els.cap = $('exCaption');
    els.capWho = $('exCapWho');
    els.capTxt = $('exCapTxt');
    els.prompt = $('exPrompt');
    els.ctrl = $('exCtrl');
    els.stick = $('exStick');
    els.knob = $('exKnob');
    els.ring = $('exRing');
    els.torchBtn = $('exTorchBtn');
    els.hint = $('exHint');
    els.exit = $('exExit');
    els.chipSub = $('exChipSub');
  }

  /* ---------- 字幕 ---------- */
  var HL = [
    [/没有编号/g, 'rd'], [/不在灯塔的系统里/g, 'rd'],
    [/无编码者/g, 'rd'], [/污染源/g, 'rd'], [/你不是其中之一/g, 'rd']
  ];

  function openCap(list, done) {
    cap.list = list; cap.i = 0; cap.done = done || null; cap.open = true;
    releaseStick();
    els.ctrl.classList.add('locked');
    renderCap();
    els.cap.classList.add('on');
  }

  function renderCap() {
    var l = cap.list[cap.i];
    els.capWho.textContent = l.s || '';
    var html = l.t.replace(/<em>/g, '<span class="rd">').replace(/<\/em>/g, '</span>');
    HL.forEach(function (h) { html = html.replace(h[0], function (m) { return '<span class="' + h[1] + '">' + m + '</span>'; }); });
    els.capTxt.innerHTML = html;
    if (l.fx === 'glow' && els.hands) els.hands.classList.add('glow');
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
      els.ctrl.classList.remove('locked');
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

  function showHint(html, ms) {
    els.hint.innerHTML = html;
    els.hint.classList.remove('hide');
    T(function () { els.hint.classList.add('hide'); }, ms || 5200);
  }

  /* ---------- 0. 穿越闪光（只在独立调试入口用；正片里开场视频已经演过了） ---------- */
  function toWarp() {
    setPhase('warp');
    els.warpFlash.classList.remove('go');
    void els.warpFlash.offsetWidth;
    T(function () { els.warpFlash.classList.add('go'); }, 900);
    T(toFpv, 1750);
  }

  /* ---------- 1. 睁眼 + 抬手 ---------- */
  function toFpv(recover) {
    setPhase('fpv');
    dist = 0; bob = 0; panX = 0;
    applyCorridor();
    els.fpv.classList.remove('recover');
    if (recover) { void els.fpv.offsetWidth; els.fpv.classList.add('recover'); }
    els.hands.classList.remove('down', 'sway', 'glow');
    els.hands.classList.add('raise');
    T(function () { els.hands.classList.add('sway'); }, 1400);
    els.warpFlash.classList.remove('go');
    T(function () { openCap(MONO, toWalk); }, recover ? 1900 : 1200);
  }

  /* ---------- 2. 摇杆往前走 ---------- */
  function toWalk() {
    setPhase('walk');
    els.hands.classList.remove('raise', 'sway');
    els.hands.classList.add('down');
    dist = 0; arrived = false; glyphDone = false; beatI = 0;
    els.stick.classList.add('idle');
    showHint('把左下角的<b>摇杆</b>往上推，慢慢往回廊深处走', 6500);
    applyCorridor();
  }

  /* ---------- 渲染：长廊 + 纵深物件 ---------- */
  function applyCorridor() {
    var k = clamp(dist / MAXD, 0, 1);
    els.cor.style.transform = 'scale(' + (1 + k * CYCLE_ZOOM).toFixed(4) + ')';
    // 墙面刻痕：贴在左侧墙上，位置偏高，走过去很快（透视指数大）
    layoutDep(els.glyph, GLYPH_D, torchOn ? 1 : 0,
      { lFar: 47, lNear: 8, bFar: 50, bNear: 44, hFar: 4, hNear: 34, ez: 1.9 });
    // 马克：站在回廊正中的地面上，用平缓的透视指数——远远就看得见，一路慢慢变大，
    // 不做最后一下暴涨（那会像扑上来）
    layoutDep(els.mark, MAXD, 1,
      { lFar: 48.5, lNear: 48, bFar: 45.5, bNear: 13, hFar: 6, hNear: 72, ez: 1.32 });
  }

  // 纵深摆放：remaining 越小 → 越大、越低、越亮
  function layoutDep(el, objD, vis, o) {
    if (!el) return;
    var rem = objD - dist;
    if (rem > APPEAR || rem < -80 || vis <= 0) { el.style.opacity = '0'; return; }
    var t = clamp(1 - rem / APPEAR, 0, 1);
    var e = Math.pow(t, o.ez || 1.9);
    var h = o.hFar + e * (o.hNear - o.hFar);
    var b = o.bFar + e * (o.bNear - o.bFar);
    var l = o.lFar + e * (o.lNear - o.lFar);
    var op = clamp(t * 4.5, 0, 1) * vis;
    el.style.height = h.toFixed(2) + 'vh';
    el.style.bottom = b.toFixed(2) + '%';
    el.style.left = l.toFixed(2) + '%';
    el.style.fontSize = (h * 0.86).toFixed(2) + 'vh';
    el.style.opacity = op.toFixed(3);
    el.style.filter = 'blur(' + ((1 - e) * 2.6).toFixed(2) + 'px) brightness(' +
      (0.22 + e * 0.9).toFixed(2) + ') saturate(' + (0.72 + e * 0.32).toFixed(2) + ')';
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
    var dur = 1000 + Math.random() * 700;
    try {
      m.animate([
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
        { opacity: .7, offset: .25 },
        { transform: 'translate(calc(-50% + ' + dx + 'vw),calc(-50% + ' + dy + 'vh)) scale(' + sc + ')', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.3,.05,.9,.6)' }).onfinish = function () { m.remove(); };
    } catch (e) { T(function () { m.remove(); }, dur); }
  }

  /* ---------- 沿途节拍 ---------- */
  function runBeat(b) {
    fwd = 0;
    releaseStick();
    if (b.fx === 'alert' && els.mkRig) {
      els.mkRig.classList.remove('alert');
      void els.mkRig.offsetWidth;
      els.mkRig.classList.add('alert');
    }
    openCap(b.lines, function () {
      if (b.hint) showHint(b.hint, 4200);
      els.stick.classList.add('idle');
    });
  }

  /* ---------- 主循环 ---------- */
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    if (phase !== 'fpv' && phase !== 'walk') return;

    var power = (phase === 'walk' && !arrived && !cap.open) ? fwd : 0;
    var walking = power > 0.001;

    if (els.ring) els.ring.style.setProperty('--pw', power.toFixed(3));

    if (walking) {
      dist += SPEED * power * dt;
      bob += dt * (5.4 + power * 2.6);
      moteT += dt;
      if (moteT > 0.16) { moteT = 0; spawnMote(); }

      // 走近刻痕（需要开手电才看得清）
      if (torchOn && !glyphDone && dist > GLYPH_D - 90) {
        glyphDone = true;
        els.glyph.classList.add('lit');
        runBeat({ lines: GLYPH_LINE, hint: '继续往前' });
      }
      // 沿途节拍
      if (beatI < BEATS.length && dist >= BEATS[beatI].d) {
        var b = BEATS[beatI]; beatI++;
        runBeat(b);
      }
      // 走到跟前
      if (dist >= MAXD) {
        dist = MAXD;
        arrived = true;
        fwd = 0;
        releaseStick();
        onArrive();
      }
    } else {
      bob += dt * 1.4; // 站着的时候只有呼吸
    }

    // 摄影机：走路上下起伏 + 摇杆横推带来的视线左右摆
    var amp = walking ? (0.55 + power * 0.65) : 0.22;
    var y = Math.abs(Math.sin(bob)) * 7 * amp;
    var rz = Math.sin(bob * 0.5) * 0.42 * amp;
    var xs = Math.sin(bob * 0.5) * 5 * amp - panX * 26;
    els.cam.style.transform = 'scale(1.05) translate(' + xs.toFixed(2) + 'px,' +
      (-y).toFixed(2) + 'px) rotate(' + (rz + panX * 0.5).toFixed(3) + 'deg)';

    applyCorridor();
  }

  /* ---------- 抵达：不需要按钮，走到就自动搭话 ---------- */
  function onArrive() {
    els.hint.classList.add('hide');
    els.ctrl.classList.add('locked');
    els.prompt.innerHTML = '<b>马克</b> 挡住了回廊尽头';
    els.prompt.classList.add('on');
    T(function () { els.prompt.classList.remove('on'); }, 2200);
    T(talkMark, 1100);
  }

  function talkMark() {
    els.ctrl.classList.remove('on');
    openCap(MARK_TALK, function () {
      els.prompt.innerHTML = '▸ 跟着他走';
      els.prompt.classList.add('on');
      T(goStory, 1100);
    });
  }

  /* ---------- 收尾 ---------- */
  function goStory() {
    els.prompt.classList.remove('on');
    els.root.classList.add('ex-out');
    T(function () {
      els.root.classList.remove('ex-out');
      if (inStory) {
        var r = storyResolve; storyResolve = null;
        stop(true);
        if (r) r();
      } else {
        stop(true);
        if (window.__startStoryAt) window.__startStoryAt('explore_join');
        else if (window.__startStory) window.__startStory();
      }
    }, 800);
  }

  /* ---------- 摇杆 ---------- */
  function stickRect() {
    var r = els.stick.getBoundingClientRect();
    stick.cx = r.left + r.width / 2;
    stick.cy = r.top + r.height / 2;
    stick.r = r.width * 0.36;   // 摇杆帽最大偏移半径
  }

  function stickTo(x, y) {
    var dx = x - stick.cx, dy = y - stick.cy;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var k = Math.min(1, len / stick.r);
    stick.nx = dx / len * k;
    stick.ny = dy / len * k;
    els.knob.style.transform = 'translate(calc(-50% + ' + (stick.nx * stick.r).toFixed(1) +
      'px),calc(-50% + ' + (stick.ny * stick.r).toFixed(1) + 'px))';
    // 往上推 = 前进（屏幕坐标 y 向下为正）
    var up = clamp(-stick.ny, 0, 1);
    fwd = up <= DEAD ? 0 : (up - DEAD) / (1 - DEAD);
    panX = clamp(stick.nx, -1, 1) * 0.55;
    if (fwd > 0) { els.hint.classList.add('hide'); els.stick.classList.remove('idle'); }
  }

  function releaseStick() {
    stick.active = false; stick.id = null; stick.nx = 0; stick.ny = 0;
    fwd = 0; panX = 0;
    if (els.knob) els.knob.style.transform = 'translate(-50%,-50%)';
    if (els.stick) els.stick.classList.remove('act');
    if (els.ring) els.ring.style.setProperty('--pw', '0');
  }

  function bindStick() {
    els.stick.addEventListener('pointerdown', function (e) {
      if (cap.open || arrived) return;
      e.preventDefault();
      stickRect();
      stick.active = true; stick.id = e.pointerId;
      els.stick.classList.add('act');
      els.stick.classList.remove('idle');
      try { els.stick.setPointerCapture(e.pointerId); } catch (err) { }
      stickTo(e.clientX, e.clientY);
    });
    els.stick.addEventListener('pointermove', function (e) {
      if (!stick.active || e.pointerId !== stick.id) return;
      e.preventDefault();
      stickTo(e.clientX, e.clientY);
    });
    var end = function (e) {
      if (!stick.active || (e && e.pointerId !== stick.id)) return;
      releaseStick();
      els.stick.classList.add('idle');
    };
    els.stick.addEventListener('pointerup', end);
    els.stick.addEventListener('pointercancel', end);
    els.stick.addEventListener('lostpointercapture', end);
    els.stick.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ---------- 交互 ---------- */
  function bind() {
    bindStick();

    // 手电筒
    els.torchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      torchOn = !torchOn;
      els.torchBtn.classList.toggle('on', torchOn);
      els.fpv.classList.toggle('torch-on', torchOn);
      applyCorridor();
    });

    // 台词推进：点画面任意处（此时摇杆是 pointer-events:none，不会吞掉点击）
    els.root.addEventListener('click', function (e) {
      if (!cap.open) return;
      if (e.target.closest('.ex-exit')) return;
      nextCap();
    });

    document.addEventListener('keydown', function (e) {
      if (phase === 'idle') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (cap.open) nextCap();
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { fwd = 1; els.stick.classList.remove('idle'); }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') panX = -0.55;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') panX = 0.55;
      if (e.code === 'Escape' && !inStory) stop();
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') fwd = 0;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') panX = 0;
    });

    els.exit.addEventListener('click', function (e) { e.stopPropagation(); if (!inStory) stop(); });
  }

  /* ---------- 生命周期 ---------- */
  function reset() {
    torchOn = false;
    els.torchBtn.classList.remove('on');
    els.fpv.classList.remove('torch-on', 'recover');
    els.glyph.classList.remove('lit');
    els.cap.classList.remove('on');
    els.prompt.classList.remove('on');
    els.ctrl.classList.remove('locked');
    els.root.classList.remove('ex-out');
    if (els.mkRig) els.mkRig.classList.remove('alert');
    if (els.hands) els.hands.classList.remove('glow');
    cap.open = false; cap.done = null;
    dist = 0; arrived = false; glyphDone = false; beatI = 0;
    releaseStick();
    last = 0;
  }

  function boot(story) {
    cache();
    if (!els.root) return false;
    if (!els.root.dataset.bound) { bind(); els.root.dataset.bound = '1'; }
    inStory = !!story;
    els.root.classList.toggle('instory', inStory);
    if (!inStory && window.__hideTitle) window.__hideTitle();
    els.root.classList.add('on', 'enter');
    T(function () { els.root.classList.remove('enter'); }, 600);
    reset();
    if (!raf) raf = requestAnimationFrame(loop);
    return true;
  }

  // 独立入口（调试深链）：先放穿越炫光
  function start() {
    if (!boot(false)) return;
    toWarp();
  }

  // 正片里的一段：开场视频已经演过穿越了，这里直接"睁眼对焦"
  function playInStory() {
    return new Promise(function (res) {
      if (!boot(true)) { res(); return; }
      storyResolve = res;
      if (els.chipSub) els.chipSub.textContent = '生态区 · 三号回廊';
      toFpv(true);
    });
  }

  function stop(toStory) {
    clearTimers();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    phase = 'idle';
    releaseStick();
    if (els.root) els.root.classList.remove('on', 'walking', 'instory');
    if (els.warp) els.warp.classList.remove('on');
    if (els.fpv) els.fpv.classList.remove('on');
    if (els.ctrl) els.ctrl.classList.remove('on', 'locked');
    if (els.cap) els.cap.classList.remove('on');
    cap.open = false;
    if (!toStory && !inStory && window.__showTitle) window.__showTitle();
  }

  window.Explore = { start: start, playInStory: playInStory, stop: stop };

  /* ---------- 调试深链 ---------- */
  window.addEventListener('load', function () {
    var q = location.search;
    if (q.indexOf('explore') < 0) return;
    setTimeout(function () {
      if (!boot(false)) return;
      if (q.indexOf('phase=fpv') >= 0) {
        toFpv(true);
      } else if (q.indexOf('phase=walk') >= 0) {
        toWalk();
      } else if (q.indexOf('phase=far') >= 0) {
        toWalk(); dist = 640; beatI = 1; applyCorridor();
      } else if (q.indexOf('phase=mid') >= 0) {
        toWalk(); dist = 1140; beatI = 2; applyCorridor();
      } else if (q.indexOf('phase=mark') >= 0) {
        toWalk(); dist = MAXD; beatI = BEATS.length; arrived = true;
        applyCorridor(); els.ctrl.classList.remove('on'); openCap(MARK_TALK, null);
      } else {
        toWarp();
      }
    }, 400);
  });
})();

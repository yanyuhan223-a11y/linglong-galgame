/* ============================================================
   explore.js —— 画中世界 · 沉浸探索（移动端优先）
   状态机：warp 穿越 → fpv 第一视角看手 → build 伪3D建模 → run 跑动遇马克
   对外接口：window.Explore.start() / .exit()
   依赖 engine：window.__hideTitle / __showTitle / __startStory
   ============================================================ */
(function (global) {
  'use strict';
  const $ = (id) => document.getElementById(id);

  /* ---------- 台词 ---------- */
  const MONO = [
    ['', '（他缓缓抬起手，怔怔地盯着自己的掌心。）'],
    ['SALT', '我怎么……到这里来了？'],
    ['SALT', '这是哪里？这不是我画的那张纸……']
  ];
  const GLYPH_LINE = ['SALT', '（手电扫过墙面——有人在这里刻下一道光。和我笔下的那道，一模一样。）'];
  const MARK = [
    ['马克 MARK', '站住。你不在任何名册上。'],
    ['马克 MARK', '灯塔上三千一百二十七个活人，编号我都背得出。<span class="rd">你不是其中之一。</span>'],
    ['马克 MARK', '……你是谁？'],
    ['SALT', '（他能看见我。那么——这个世界，是真的。）']
  ];

  /* ---------- 运行参数 ---------- */
  const SPEED = 380;          // 跑动速度 px/s（世界滚动）
  const MAXD = 1500;          // 跑到马克面前的总距离
  let GLYPHD = 720;           // 墙上符号出现的距离

  let els = {};
  let phase = '';
  let built = false, active = false;
  let raf = 0, last = 0;

  // 跑动状态
  let dist = 0, runHold = false, moving = false, bob = 0, dust = 0;
  let markLeft = 2000, glyphLeft = 1200, atMark = false, markTalked = false;
  let glyphSeen = false, torchOn = false, torchPos = '35% 55%';
  let runMode = 'move';       // move | talk | story

  // 字幕
  let cap = { lines: [], i: 0, done: null, open: false };

  /* ---------- 阶段切换 ---------- */
  function setPhase(name) {
    phase = name;
    ['warp', 'fpv', 'build', 'run'].forEach((p) => {
      els['ph_' + p].classList.toggle('on', p === name);
    });
    els.ctrl.classList.toggle('on', name === 'run');
    if (name !== 'run') els.hint.classList.add('hide');
  }

  /* ---------- 构建 ---------- */
  function build() {
    if (built) return;
    els = {
      root: $('explore'), view: $('exView'),
      ph_warp: $('exWarp'), warpFlash: $('exWarpFlash'),
      ph_fpv: $('exFpv'), hands: $('exHands'),
      ph_build: $('exBuild'), buildChar: $('exBuildChar'),
      ph_run: $('exRun'), far: $('exRunFar'), mid: $('exRunMid'),
      world: $('exRunWorld'), torch: $('exTorch'),
      salt: $('exSalt'),
      cap: $('exCaption'), capName: $('exCapName'), capTxt: $('exCapTxt'), capNext: $('exCapNext'),
      prompt: $('exPrompt'), ctrl: $('exCtrl'),
      torchBtn: $('exTorchBtn'), runBtn: $('exRunBtn'),
      runIcon: $('exRunIcon'), runLabel: $('exRunLabel'),
      hint: $('exHint'), exit: $('exExit'), chipSub: $('exChipSub')
    };
    els.saltIn = els.salt.querySelector('.ex-salt-in');
    els.shadow = els.salt.querySelector('.ex-shadow');

    // 马克贴图
    const mk = document.createElement('div');
    mk.className = 'ex-mark'; mk.id = 'exMark';
    mk.innerHTML = '<img src="assets/char/mark.png" alt="马克"><div class="mk-ring"></div>';
    els.world.appendChild(mk);
    els.mark = mk;

    // 墙上符号（手电照亮）
    const gl = document.createElement('div');
    gl.className = 'ex-glyph'; gl.id = 'exGlyph'; gl.textContent = '✷';
    els.world.appendChild(gl);
    els.glyph = gl;

    bindUI();
    built = true;
  }

  /* ---------- 输入绑定 ---------- */
  function bindUI() {
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);

    els.exit.addEventListener('click', () => exit());

    // 轻触画面推进对白（fpv / build / 对话）
    els.view.addEventListener('click', onViewTap);
    // 直接点字幕框也能推进
    els.cap.addEventListener('click', () => { if (cap.open) advanceCap(); });

    // 跑动按钮：按住前进 / 点击对话 / 点击进正片
    const press = (e) => {
      e.preventDefault();
      if (runMode === 'move') runHold = true;
      else if (runMode === 'talk') openMark();
      else if (runMode === 'story') goStory();
    };
    const release = () => { runHold = false; };
    els.runBtn.addEventListener('pointerdown', press);
    els.runBtn.addEventListener('pointerup', release);
    els.runBtn.addEventListener('pointerleave', release);
    els.runBtn.addEventListener('pointercancel', release);

    // 手电筒开关
    els.torchBtn.addEventListener('click', () => {
      torchOn = !torchOn;
      els.ph_run.classList.toggle('torch-on', torchOn);
      els.torchBtn.classList.toggle('on', torchOn);
    });
    // 手电光锥跟随
    els.view.addEventListener('pointermove', (e) => {
      if (!torchOn || phase !== 'run') return;
      const r = els.view.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
      const y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      torchPos = x + '% ' + y + '%';
      els.torch.style.backgroundPosition = torchPos;
    });
  }

  function onKey(e) {
    if (!active) return;
    const k = e.key;
    if (phase === 'run' && runMode === 'move' &&
        (k === 'ArrowRight' || k === 'd' || k === 'D' || k === ' ')) {
      runHold = true; e.preventDefault(); e.stopPropagation();
    } else if (k === 'Enter' || k === 'e' || k === 'E') {
      onViewTap(); e.preventDefault(); e.stopPropagation();
    } else if (k === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (cap.open) advanceCap(); else exit();
    }
  }
  function onKeyUp(e) {
    if (!active) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === ' ') runHold = false;
  }

  function onViewTap() {
    if (cap.open) { advanceCap(); return; }
    if (phase === 'build') { toRun(); return; }
    if (phase === 'run' && atMark && !markTalked) { openMark(); }
  }

  /* ---------- 字幕 ---------- */
  function openCap(lines, done) {
    cap.lines = lines; cap.i = 0; cap.done = done || null; cap.open = true;
    renderCap(); els.cap.classList.add('on');
  }
  function renderCap() {
    const ln = cap.lines[cap.i];
    els.capName.textContent = ln[0];
    els.capTxt.innerHTML = ln[1];
    els.capNext.textContent = (cap.i < cap.lines.length - 1) ? '▸ 轻触继续' : '▸ 轻触';
  }
  function advanceCap() {
    cap.i++;
    if (cap.i >= cap.lines.length) { const d = cap.done; closeCap(); if (d) d(); }
    else renderCap();
  }
  function closeCap() { cap.open = false; els.cap.classList.remove('on'); }

  /* ---------- 阶段 0：穿越 ---------- */
  function toWarp() {
    setPhase('warp');
    els.warpFlash.classList.remove('go');
    setTimeout(() => {
      if (!active) return;
      els.warpFlash.classList.add('go');           // 一阵刺眼白光
    }, 1500);
    setTimeout(() => { if (active) toFpv(); }, 2650);
  }

  /* ---------- 阶段 1：第一视角看手 ---------- */
  function toFpv() {
    setPhase('fpv');
    els.chipSub.textContent = '第一视角 · 我在哪';
    els.hands.classList.remove('raise', 'sway');
    void els.hands.offsetWidth;
    els.hands.classList.add('raise');
    setTimeout(() => els.hands.classList.add('sway'), 1400);
    // 抬手后开始自语
    setTimeout(() => { if (active && phase === 'fpv') openCap(MONO, toBuild); }, 900);
  }

  /* ---------- 阶段 2：伪3D建模 ---------- */
  function toBuild() {
    setPhase('build');
    els.chipSub.textContent = '同步 · 立体投影';
    els.buildChar.classList.remove('assemble', 'spin');
    void els.buildChar.offsetWidth;
    els.buildChar.classList.add('assemble');
    setTimeout(() => els.buildChar.classList.add('spin'), 1700);
    setTimeout(() => {
      if (active && phase === 'build')
        openCap([['SYSTEM', '构建立体投影……'], ['SYSTEM', '同步完成。轻触，踏入这个世界。']], toRun);
    }, 700);
  }

  /* ---------- 阶段 3：跑动 ---------- */
  function toRun() {
    if (phase === 'run') return;
    closeCap();
    setPhase('run');
    els.chipSub.textContent = '第三视角 · 步入灯塔';
    const vw = els.view.clientWidth || 800;
    markLeft = MAXD + vw * 0.56;
    glyphLeft = GLYPHD + vw * 0.5;
    els.mark.style.left = markLeft + 'px';
    els.glyph.style.left = glyphLeft + 'px';
    dist = 0; runHold = false; moving = false; atMark = false; markTalked = false;
    glyphSeen = false; runMode = 'move';
    els.runIcon.textContent = '▶▶'; els.runLabel.textContent = '按住前进';
    els.runBtn.classList.add('pulse');
    els.mark.classList.remove('near'); els.prompt.classList.remove('on');
    els.hint.classList.remove('hide');
    els.hint.innerHTML = '按住 <b>▶▶</b> 往前跑　·　<b>🔦</b> 手电照墙探索　·　跑到马克面前对话';
    setTimeout(() => { if (phase === 'run') els.hint.classList.add('hide'); }, 6500);
    last = performance.now();
  }

  function openMark() {
    if (markTalked) return;
    els.runBtn.classList.remove('pulse');
    els.prompt.classList.remove('on');
    openCap(MARK, () => {
      markTalked = true;
      runMode = 'story';
      els.runIcon.textContent = '▸'; els.runLabel.textContent = '进入剧情';
      els.runBtn.classList.add('pulse');
      els.chipSub.textContent = '任务 · 进入正片';
    });
  }

  function goStory() {
    if (global.__startStory) { exit(true); global.__startStory(); }
  }

  /* ---------- 尘土 ---------- */
  function spawnDust() {
    const d = document.createElement('div');
    d.className = 'ex-dust';
    const r = els.salt.getBoundingClientRect();
    const vr = els.view.getBoundingClientRect();
    d.style.left = (r.left - vr.left + r.width * 0.4) + 'px';
    els.view.appendChild(d);
    d.animate([
      { transform: 'translate(0,0) scale(1)', opacity: .7 },
      { transform: 'translate(' + (26 + Math.random() * 16) + 'px,-14px) scale(1.9)', opacity: 0 }
    ], { duration: 600, easing: 'ease-out' }).onfinish = () => d.remove();
  }

  /* ---------- 主循环 ---------- */
  function loop(ts) {
    if (!active) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;

    if (phase === 'run') {
      moving = runHold && !cap.open && !atMark && dist < MAXD;
      if (moving) {
        dist += SPEED * dt;
        if (dist >= MAXD) { dist = MAXD; }
      }

      // 视差滚动
      els.far.style.backgroundPositionX = (-dist * 0.16) + 'px';
      els.mid.style.backgroundPositionX = (-dist * 0.5) + 'px';
      els.world.style.transform = 'translateX(' + (-dist) + 'px)';

      // Salt 跑动 / 待机
      if (moving) {
        bob += dt * 12;
        const up = Math.abs(Math.sin(bob)) * 12;
        const lean = 4 + Math.sin(bob) * 1.5;      // 前倾跑姿
        const sq = 1 - Math.abs(Math.sin(bob)) * 0.05;
        els.saltIn.style.transform = 'translateY(' + (-up) + 'px) rotate(' + lean + 'deg) scaleY(' + sq + ')';
        els.shadow.style.transform = 'translateX(-50%) scaleX(' + (0.78 + up / 40) + ')';
        els.shadow.style.opacity = String(0.58 - up / 45);
        dust += dt;
        if (up < 1.4 && dust > 0.22) { dust = 0; spawnDust(); }
      } else {
        bob += dt * 1.6;
        const br = Math.sin(bob) * 0.012;
        els.saltIn.style.transform = 'translateY(0) rotate(0deg) scaleY(' + (1 + br) + ')';
        els.shadow.style.transform = 'translateX(-50%) scaleX(1)';
        els.shadow.style.opacity = '0.58';
      }

      // 手电照亮墙上符号
      const glyphScreen = glyphLeft - dist;
      const vw = els.view.clientWidth;
      const glyphNear = glyphScreen > vw * 0.15 && glyphScreen < vw * 0.85;
      const lit = torchOn && glyphNear;
      els.glyph.classList.toggle('lit', lit);
      if (lit && !glyphSeen && !cap.open && !atMark) {
        glyphSeen = true;
        openCap([GLYPH_LINE], null);
      }

      // 到达马克
      if (!atMark && dist >= MAXD) {
        atMark = true; runHold = false;
        els.mark.classList.add('near');
        if (!markTalked) {
          runMode = 'talk';
          els.runIcon.textContent = '💬'; els.runLabel.textContent = '上前对话';
          els.runBtn.classList.add('pulse');
          els.prompt.innerHTML = '上前 <b>·</b> 对话';
          els.prompt.classList.add('on');
        }
      }
    }

    raf = requestAnimationFrame(loop);
  }

  /* ---------- 生命周期 ---------- */
  function start() {
    build();
    if (global.__hideTitle) global.__hideTitle();
    active = true;
    torchOn = false; els.ph_run.classList.remove('torch-on'); els.torchBtn.classList.remove('on');
    els.torch.style.backgroundPosition = '35% 55%';
    closeCap();
    els.root.classList.add('on');
    void els.root.offsetWidth;
    els.root.classList.add('enter');
    setTimeout(() => els.root.classList.remove('enter'), 520);
    toWarp();
    raf = requestAnimationFrame(loop);
  }

  function exit(silent) {
    active = false;
    cancelAnimationFrame(raf);
    runHold = false; moving = false;
    closeCap();
    els.root.classList.remove('on');
    setPhase('');
    if (!silent && global.__showTitle) global.__showTitle();
  }

  // 调试用：直接跳到某阶段截图（?explore&phase=fpv|build|run）
  function startAt(p) {
    build();
    if (global.__hideTitle) global.__hideTitle();
    active = true;
    torchOn = false; els.ph_run.classList.remove('torch-on'); els.torchBtn.classList.remove('on');
    closeCap();
    els.root.classList.add('on');
    last = performance.now();
    raf = requestAnimationFrame(loop);
    if (p === 'warp') toWarp();
    else if (p === 'build') toBuild();
    else if (p === 'run') toRun();
    else toFpv();
  }

  global.Explore = { start, exit, startAt };

  // 调试引导
  try {
    if (/[?&]explore\b/.test(location.search)) {
      const boot = () => {
        const m = location.search.match(/phase=(\w+)/);
        startAt(m ? m[1] : 'warp');
      };
      if (document.readyState === 'complete' || document.readyState === 'interactive')
        setTimeout(boot, 60);
      else document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 60));
    }
  } catch (e) {}
})(window);

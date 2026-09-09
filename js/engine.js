/* ============================================================
   engine.js —— 剧本驱动的轻量 VN 引擎
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'chroma_cage_save_v1';

  const S = {
    i: 0, flags: {}, running: false, typing: false,
    auto: false, skip: false, holdSkip: false,
    curBg: '', curChar: null, tmr: [], typeTimer: 0
  };

  const els = {};
  function cache() {
    ['dialogue', 'dtext', 'dNext', 'namePlate', 'speakerCn', 'speakerEn',
     'choices', 'bgA', 'bgB', 'charLayer', 'charImg', 'hud', 'chapNum',
     'chapEn', 'chapCn', 'vSync', 'vBpm', 'tickerTxt', 'ctrl', 'cutscene',
     'cutVideo', 'cutSub', 'cutSkip', 'title', 'about', 'toast', 'stage']
      .forEach((k) => { els[k] = $(k); });
  }

  /* ---------------- 工具 ---------------- */
  function sleep(ms) { return new Promise((r) => { const t = setTimeout(r, ms); S.tmr.push(t); }); }
  function clearTimers() { S.tmr.forEach(clearTimeout); S.tmr = []; }
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    setTimeout(() => els.toast.classList.remove('on'), 1700);
  }
  function findLabel(name) {
    return window.SCRIPT.findIndex((n) => n.t === 'label' && n.v === name);
  }

  /* ---------------- 白光衔接 ----------------
     开场视频结尾那道白光是全屏最上层（#whiteout z-index:95）。
     谁先在白光底下把画面铺好，白光就淡成谁 —— 绝不能在中间露出别的东西。 */
  function veilStage(on) { if (els.stage) els.stage.classList.toggle('veil', !!on); }

  function releaseWhiteout(delay) {
    const wo = $('whiteout');
    if (!wo || !wo.classList.contains('hold')) return false;
    setTimeout(() => {
      wo.classList.remove('hold');
      wo.classList.add('fade');
      setTimeout(() => wo.classList.remove('fade'), 1900);
    }, delay || 0);
    return true;
  }

  // 白光散尽后的"第一幕"是不是第一视角探索段？
  // 只跨过 chap / flag / fx / hud / wait / label 这类不出画面的节点。
  function firstExploreIdx(from) {
    const pass = { chap: 1, flag: 1, fx: 1, hud: 1, wait: 1, label: 1 };
    for (let k = from; k < window.SCRIPT.length; k++) {
      const n = window.SCRIPT[k];
      if (!n) break;
      if (n.t === 'explore') return k;
      if (!pass[n.t]) return -1;
    }
    return -1;
  }

  /* ---------------- 背景切换（双层交叉溶解） ---------------- */
  let bgFlip = false;
  function setBg(name) {
    if (S.curBg === name) return;
    S.curBg = name;
    const show = bgFlip ? els.bgA : els.bgB;
    const hide = bgFlip ? els.bgB : els.bgA;
    bgFlip = !bgFlip;
    show.style.backgroundImage = `url(assets/bg/${name}.jpg)`;
    show.classList.add('on');
    hide.classList.remove('on');
  }

  /* ---------------- 立绘 ---------------- */
  function setChar(name, dim) {
    if (!name) {
      els.charImg.classList.remove('on');
      S.curChar = null;
      return;
    }
    if (S.curChar !== name) {
      els.charImg.src = `assets/char/${name}.png`;
      S.curChar = name;
    }
    els.charImg.classList.add('on');
    els.charImg.classList.toggle('dim', !!dim);
  }

  /* ---------------- HUD ---------------- */
  function animNum(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) return;
    const d = 520, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / d);
      const e = 1 - Math.pow(1 - k, 3);
      el.firstChild ? null : null;
      const v = Math.round(from + (to - from) * e);
      if (el.querySelector('em')) el.innerHTML = v + '<em>%</em>';
      else el.textContent = v;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setHud(n) {
    if (n.on) els.hud.classList.add('on');
    if (n.sync != null) animNum(els.vSync, n.sync);
    if (n.bpm != null) animNum(els.vBpm, n.bpm);
    if (n.ticker) els.tickerTxt.textContent = window.TICKERS[n.ticker] || n.ticker;
  }
  function setChapter(n) {
    els.chapNum.textContent = n.num;
    els.chapEn.textContent = n.en;
    els.chapCn.textContent = n.cn;
    els.hud.classList.add('on');
  }

  /* ---------------- 打字机 ---------------- */
  function typeText(html, speed) {
    return new Promise((resolve) => {
      S.typing = true;
      els.dNext.classList.remove('on');
      // 把 HTML 拆成 [标签|字符] 序列，逐字吐出但保留标签
      const tokens = [];
      let buf = '', inTag = false;
      for (const ch of html) {
        if (ch === '<') { if (buf) { tokens.push(...buf); buf = ''; } inTag = true; buf += ch; continue; }
        if (inTag) { buf += ch; if (ch === '>') { tokens.push(buf); buf = ''; inTag = false; } continue; }
        buf += ch;
        if (buf.length) { tokens.push(...buf); buf = ''; }
      }
      if (buf) tokens.push(...buf);

      let i = 0, out = '';
      const step = () => {
        if (!S.typing) return;                       // 被打断
        if (i >= tokens.length) { finish(); return; }
        // 一次吐一个 token；标签瞬时通过
        do {
          out += tokens[i]; i++;
        } while (i < tokens.length && tokens[i][0] === '<' && tokens[i].length > 1);
        els.dtext.innerHTML = out;
        if (window.Rig && Math.random() < 0.14) window.Rig.talk();
        S.typeTimer = setTimeout(step, S.skip || S.holdSkip ? 0 : speed);
      };
      const finish = () => {
        clearTimeout(S.typeTimer);
        els.dtext.innerHTML = html;
        S.typing = false;
        els.dNext.classList.add('on');
        resolve();
      };
      els.dtext._finish = finish;
      step();
    });
  }
  function flushType() {
    if (S.typing && els.dtext._finish) els.dtext._finish();
  }

  /* ---------------- 等待玩家点击 ---------------- */
  let waiter = null;
  function waitClick() {
    return new Promise((resolve) => {
      if (S.skip || S.holdSkip) { setTimeout(resolve, 30); return; }
      if (S.auto) { const t = setTimeout(resolve, 1200); S.tmr.push(t); waiter = () => { clearTimeout(t); resolve(); }; return; }
      waiter = resolve;
    });
  }
  function advance() {
    if (els.choices.classList.contains('on')) return;
    if (S.typing) { flushType(); return; }
    if (waiter) { const w = waiter; waiter = null; w(); }
  }

  /* ---------------- 选项 ---------------- */
  function showChoices(opts) {
    return new Promise((resolve) => {
      els.choices.innerHTML = '';
      els.dNext.classList.remove('on');
      opts.forEach((o, k) => {
        const b = document.createElement('div');
        b.className = 'choice';
        b.style.animationDelay = (k * 90) + 'ms';
        b.innerHTML = `<div class="c-idx">${String(k + 1).padStart(2, '0')}</div>
                       <div class="c-txt"><b>${o.cn}</b><span>${o.en}</span></div>`;
        b.addEventListener('click', () => {
          els.choices.classList.remove('on');
          els.choices.innerHTML = '';
          if (window.FX) window.FX.speed(true);
          if (o.flag) Object.assign(S.flags, o.flag);
          resolve(o);
        });
        els.choices.appendChild(b);
      });
      els.choices.classList.add('on');
    });
  }

  /* ---------------- 视频过场 ---------------- */
  function playCut(node) {
    return new Promise((resolve) => {
      const v = els.cutVideo;
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        clearInterval(subTimer);
        v.pause();
        els.cutscene.classList.remove('on');
        els.cutSub.classList.remove('on');
        els.cutSkip.onclick = null;
        resolve();
      };
      v.src = node.src;
      els.cutscene.classList.add('on');
      els.cutSkip.onclick = finish;
      v.currentTime = 0;
      const p = v.play();
      if (p && p.catch) p.catch(() => { /* 自动播放被拦时等待点击 */ });

      const subs = node.subs || [];
      let cur = -1;
      const subTimer = setInterval(() => {
        const t = v.currentTime;
        let idx = -1;
        for (let i = 0; i < subs.length; i++) if (t >= subs[i][0] && t <= subs[i][1]) { idx = i; break; }
        if (idx !== cur) {
          cur = idx;
          if (idx < 0) els.cutSub.classList.remove('on');
          else { els.cutSub.innerHTML = subs[idx][2]; els.cutSub.classList.add('on'); }
        }
      }, 80);
      v.onended = finish;
      v.onerror = finish;
    });
  }

  /* ---------------- 节点执行 ---------------- */
  async function exec(n) {
    switch (n.t) {
      case 'bg': setBg(n.v); await sleep(S.skip ? 0 : 260); break;

      case 'chap': setChapter(n); break;

      case 'card':
        if (!S.skip) await window.FX.chapterCard(n.num, n.en, n.cn);
        break;

      case 'char': setChar(n.v, n.dim); await sleep(S.skip ? 0 : 180); break;

      case 'hud': setHud(n); break;

      case 'flag': S.flags[n.k] = n.v; break;

      case 'wait': if (!S.skip && !S.holdSkip) await sleep(n.ms); break;

      case 'label': break;

      // 第一视角探索段：交给 explore.js 接管画面，跑完再回来继续正片
      case 'explore': {
        clearTimers();
        S.typing = false; waiter = null;
        els.dialogue.classList.remove('on');
        els.choices.classList.remove('on');
        els.ctrl.classList.remove('on');
        els.hud.classList.remove('on');
        veilStage(true);                       // 正片舞台先藏好，白光散尽时不会露出正片第一幕
        const ex = window.Explore ? window.Explore.playInStory() : Promise.resolve();
        // 第一视角画面已经在白光底下铺好了 —— 现在才放白光走，白光直接淡成回廊
        releaseWhiteout(220);
        await ex;
        veilStage(false);
        els.ctrl.classList.add('on');
        break;
      }

      case 'goto': { const j = findLabel(n.v); if (j >= 0) S.i = j; break; }

      case 'fx': {
        const F = window.FX, R = window.Rig;
        if (n.do === 'particles') F.particles(n.arg);
        else if (n.do === 'flash') F.flash(n.arg);
        else if (n.do === 'shake') F.shake(n.arg);
        else if (n.do === 'glitch') { F.glitch(n.arg); if (!S.skip) await sleep(Math.min(n.arg || 900, 900)); }
        else if (n.do === 'speed') F.speed(n.arg);
        else if (n.do === 'torch') F.torch(n.arg);
        else if (n.do === 'danger') F.danger(n.arg);
        else if (n.do === 'charge') R.charge(n.arg);
        break;
      }

      case 'say': {
        const c = window.CAST[n.who] || window.CAST.narr;
        els.namePlate.className = 'name-plate' + (c.cls ? ' ' + c.cls : '');
        els.speakerCn.textContent = c.cn;
        els.speakerEn.textContent = c.en;
        els.dialogue.classList.add('on');
        if (n.who === 'salt') {
          window.Rig.named(true);
          if (n.emo) window.Rig.emo(n.emo);
        }
        if (n.react) window.Rig.react(n.react);
        els.charImg.classList.toggle('dim', n.who !== 'mark' && S.curChar ? els.charImg.classList.contains('dim') : els.charImg.classList.contains('dim'));
        const speed = n.who === 'narr' ? 26 : 32;
        await typeText(n.text, speed);
        await waitClick();
        break;
      }

      case 'choice': {
        const o = await showChoices(n.opts);
        const j = findLabel(o.goto);
        if (j >= 0) S.i = j;
        break;
      }

      case 'video': {
        els.dialogue.classList.remove('on');
        await playCut(n);
        break;
      }

      case 'end':
        await endScreen();
        break;
    }
  }

  async function endScreen() {
    els.dialogue.classList.remove('on');
    els.ctrl.classList.remove('on');
    await window.FX.chapterCard('END', 'TO BE CONTINUED', '第 三 幕 · 异色　完');
    S.running = false;
    localStorage.removeItem(SAVE_KEY);
    showTitle();
  }

  /* ---------------- 主循环 ---------------- */
  async function run() {
    S.running = true;
    while (S.running && S.i < window.SCRIPT.length) {
      const n = window.SCRIPT[S.i];
      const before = S.i;
      await exec(n);
      if (S.i === before) S.i++;          // 未被 goto 改写就自然前进
      if (S.i % 3 === 0) autoSave();
    }
  }

  /* ---------------- 存档 ---------------- */
  function autoSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        i: S.i, flags: S.flags, bg: S.curBg, char: S.curChar,
        chap: { num: els.chapNum.textContent, en: els.chapEn.textContent, cn: els.chapCn.textContent },
        sync: els.vSync.textContent, bpm: els.vBpm.textContent, ts: Date.now()
      }));
    } catch (e) { /* 无痕模式 */ }
  }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return null;
      return d;
    } catch (e) { return null; }
  }

  /* ---------------- 标题 ---------------- */
  function showTitle() {
    clearTimers();
    S.running = false; S.typing = false; waiter = null;
    veilStage(false);
    els.title.classList.remove('off');
    els.dialogue.classList.remove('on');
    els.choices.classList.remove('on');
    els.hud.classList.remove('on');
    els.ctrl.classList.remove('on');
    window.FX.danger(false); window.FX.torch(false); window.Rig.charge(false);
    document.querySelector('.t-menu li[data-menu="continue"]').classList.toggle('dis', !hasSave());
  }

  function hideTitle() {
    els.title.classList.add('off');
    els.ctrl.classList.add('on');
  }

  // 静默铺好某个接入点之前的舞台状态（背景 / 立绘 / 章节 / HUD / flag），
  // 只做"状态"节点，不播台词与特效 —— 用于探索模式结束后无缝接回正片。
  function primeUpTo(idx) {
    for (let k = 0; k < idx; k++) {
      const n = window.SCRIPT[k];
      if (!n) continue;
      if (n.t === 'bg') setBg(n.v);
      else if (n.t === 'char') setChar(n.v, n.dim);
      else if (n.t === 'chap') setChapter(n);
      else if (n.t === 'hud') setHud(n);
      else if (n.t === 'flag') S.flags[n.k] = n.v;
    }
    els.hud.classList.add('on');
    window.Rig.named(true);
  }

  async function startNew(skipIntro, joinLabel) {
    // 开场动画：OC 穿越
    if (!skipIntro && window.Intro) {
      els.title.classList.add('off');
      await window.Intro.play();
    }
    hideTitle();
    S.i = 0; S.flags = {}; S.curBg = ''; S.curChar = null;
    els.bgA.classList.remove('on'); els.bgB.classList.remove('on');
    setChar(null);
    window.Rig.emo('idle'); window.Rig.named(false);
    els.vSync.innerHTML = '34<em>%</em>'; els.vBpm.textContent = '72';
    if (joinLabel) {
      const j = findLabel(joinLabel);
      if (j >= 0) { primeUpTo(j); S.i = j; }
    }
    const wo = document.getElementById('whiteout');
    const holding = !!(wo && wo.classList.contains('hold'));

    /* 白光之后的第一幕就是第一视角探索段：
       舞台整层藏起来（否则会闪一下正片的空画面 + Salt 立绘 —— 就是"一开始那幕快速闪过"），
       静默把 chap / 粒子这类不出画面的节点铺好，直接跳到 explore 节点。
       白光由 exec('explore') 在第一视角画面铺好之后才放走。 */
    const exIdx = joinLabel ? -1 : firstExploreIdx(S.i);
    if (exIdx >= 0) {
      veilStage(true);
      for (let k = S.i; k < exIdx; k++) {
        const n = window.SCRIPT[k];
        if (!n) continue;
        if (n.t === 'chap') setChapter(n);
        else if (n.t === 'flag') S.flags[n.k] = n.v;
        else if (n.t === 'fx' && n.do === 'particles') window.FX.particles(n.arg);
      }
      els.hud.classList.remove('on');
      S.i = exIdx;
      await sleep(holding ? 90 : 0);
      run();
      return;
    }

    // 正片场景已铺好，白光多停留一会，再带眩晕感淡出：游戏从刺眼白光里晃着浮现
    if (holding) {
      setTimeout(() => {
        if (els.stage) {
          els.stage.classList.remove('dizzy');
          void els.stage.offsetWidth;
          els.stage.classList.add('dizzy');
        }
        wo.classList.remove('hold');
        wo.classList.add('fade');
      }, 620);                                    // 白光驻留
      setTimeout(() => {
        wo.classList.remove('fade');
        if (els.stage) els.stage.classList.remove('dizzy');
      }, 620 + 2200);                             // 淡出 + 眩晕结束后清理
      await sleep(1150);                          // 文字随“回过神”渐显
    } else {
      await sleep(560);
    }
    run();
  }

  async function startContinue() {
    const d = loadSave();
    if (!d) { toast('没有可用的存档'); return; }
    hideTitle();
    veilStage(false);
    S.i = d.i; S.flags = d.flags || {};
    S.curBg = ''; setBg(d.bg || 'tower');
    setChar(d.char);
    setChapter(d.chap || { num: '00', en: 'PROLOGUE', cn: '序章' });
    els.vSync.innerHTML = (parseInt(d.sync, 10) || 34) + '<em>%</em>';
    els.vBpm.textContent = parseInt(d.bpm, 10) || 72;
    els.hud.classList.add('on');
    window.Rig.named(true);
    await sleep(560);
    toast('已读取存档');
    run();
  }

  /* ---------------- 输入 ---------------- */
  function bind() {
    els.stage.addEventListener('click', (e) => {
      if (e.target.closest('#ctrl') || e.target.closest('.choice')) return;
      if (els.cutscene.classList.contains('on')) return;
      if (window.Intro && window.Intro.playing) return;
      advance();
    });

    /* 标题页键盘导航 */
    function menuItems() {
      return Array.from(document.querySelectorAll('.t-menu li')).filter((l) => !l.classList.contains('dis'));
    }
    function moveSel(d) {
      const items = menuItems(); if (!items.length) return;
      let idx = items.findIndex((l) => l.classList.contains('sel'));
      idx = (idx < 0 ? (d > 0 ? -1 : 0) : idx) + d;
      if (idx < 0) idx = items.length - 1;
      if (idx >= items.length) idx = 0;
      items.forEach((l) => l.classList.remove('sel'));
      items[idx].classList.add('sel');
    }
    function fireMenu(li) {
      if (!li) return;
      const m = li.dataset.menu;
      if (m === 'start') startNew();
      if (m === 'continue') startContinue();
      if (m === 'about') els.about.classList.add('on');
    }

    document.addEventListener('keydown', (e) => {
      if (window.Intro && window.Intro.playing) return;   // 开场动画自行处理按键
      const onTitle = !els.title.classList.contains('off');

      if (onTitle && !els.about.classList.contains('on')) {
        if (e.code === 'ArrowDown') { e.preventDefault(); moveSel(1); return; }
        if (e.code === 'ArrowUp') { e.preventDefault(); moveSel(-1); return; }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          fireMenu(document.querySelector('.t-menu li.sel') || menuItems()[0]);
          return;
        }
      }

      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); }
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') { S.holdSkip = true; flushType(); }
      if (e.code === 'Escape') {
        if (els.about.classList.contains('on')) els.about.classList.remove('on');
        else if (onTitle) return;
        else showTitle();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') S.holdSkip = false;
    });

    els.ctrl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'auto') { S.auto = !S.auto; b.classList.toggle('active', S.auto); toast(S.auto ? '自动播放 开' : '自动播放 关'); if (S.auto) advance(); }
      if (a === 'skip') { S.skip = !S.skip; b.classList.toggle('active', S.skip); toast(S.skip ? '快进中…' : '快进 关'); if (S.skip) { flushType(); advance(); } }
      if (a === 'save') { autoSave(); toast('已存档'); }
      if (a === 'load') { const d = loadSave(); if (d) { clearTimers(); S.running = false; setTimeout(startContinue, 60); } else toast('没有可用的存档'); }
      if (a === 'title') showTitle();
    });

    document.querySelectorAll('.t-menu li').forEach((li) => {
      li.addEventListener('click', () => {
        const m = li.dataset.menu;
        if (m === 'start') startNew();
        if (m === 'continue') startContinue();
          if (m === 'about') els.about.classList.add('on');
      });
    });
    document.querySelector('.ab-close').addEventListener('click', () => els.about.classList.remove('on'));
  }

  /* ---------------- 启动 ---------------- */
  function preload() {
    ['assets/bg/tower.jpg', 'assets/bg/ruins.jpg', 'assets/char/mark.png'].forEach((s) => { const i = new Image(); i.src = s; });
  }

  window.addEventListener('DOMContentLoaded', () => {
    cache();
    window.FX.init();
    window.Rig.init();
    bind();
    preload();
    els.tickerTxt.textContent = window.TICKERS.calm;
    document.querySelector('.t-menu li[data-menu="continue"]').classList.toggle('dis', !hasSave());
    // 供探索模式调用的钩子
    window.__showTitle = showTitle;
    window.__hideTitle = hideTitle;
    window.__startStory = () => startNew(true);   // 从探索直接进正片（跳过开场视频）
    // 从探索模式的"第一视角遇见马克"接回正片：跳过序章里与探索重复的段落
    window.__startStoryAt = (label) => startNew(true, label);
  });
})();

/* ============================================================
   dossier.js —— 进场：马克 · 互动角色档案页
   · 立绘视差 + 点一下换一句台词（用游戏内战术贴图，不重绘）
   · 灯塔历 / 时段 / 孢子浓度 / 灯塔广播：把世界观读数跑起来
   · 角色属性面板：认识他 / 战术评估 / 装备图鉴 / 世界观 / 关系（读档）/ 第一幕
   · 侧栏与底部 tab 复用 engine.js 已有的 .t-menu 逻辑，不改引擎
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const title = $('title');
  if (!title) return;

  const MAXV = 7;   // trust / expose 在第一章的理论上限
  function snd(n) { try { if (window.Snd) window.Snd.sfx(n); } catch (e) { /* noop */ } }

  /* ---------------- 马克的台词池 ---------------- */
  const LINES = [
    '名册上没你。但你这条命，我记下了。',
    '报上来历。给你一次机会。',
    '你身上没有编号，没有配给卡，连灰都不对。<span class="rd">你是从哪儿掉下来的？</span>',
    '别往那边看。那不是风吹的。',
    '灯塔的规矩我背得比谁都熟。<span class="rd">背得熟，不代表我信。</span>',
    '第七小队，下去八个人。名册上现在只剩五行没被划掉。',
    '孢子过 0.6 就把面罩扣上。这条我不重复第二遍。',
    '你要是真没档案——那你现在最好别让任何人给你建一个。',
    '走在我后面半步。别问为什么，照做。',
    '我不管你叫什么。我只管带下去的人能不能带回来。',
    '这枚胸章不是我的。别问。',
    '下降的时候不许跑，不许喊。它们不看眼睛，闻味道。',
    '上面要一份报告，我只会写六个字：目标存在，撤离完成。'
  ];
  let li = 0;
  const lineEl = $('dzLine');
  function nextLine() {
    li = (li + 1) % LINES.length;
    if (!lineEl) return;
    lineEl.style.opacity = '0';
    lineEl.style.transform = 'translateY(5px)';
    setTimeout(() => {
      lineEl.innerHTML = LINES[li];
      lineEl.style.opacity = '1';
      lineEl.style.transform = 'none';
    }, 150);
    snd('hover');
  }
  const talk = $('dzTalk');
  const charBox = $('dzChar');
  if (talk) talk.addEventListener('click', nextLine);
  if (charBox) charBox.addEventListener('click', nextLine);

  /* ---------------- 立绘轻微视差 ---------------- */
  let px = 0, py = 0, cx = 0, cy = 0, raf = 0;
  function loop() {
    cx += (px - cx) * .08; cy += (py - cy) * .08;
    if (charBox) charBox.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
    raf = (Math.abs(px - cx) > .1 || Math.abs(py - cy) > .1) ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  title.addEventListener('mousemove', (e) => {
    if (title.classList.contains('off')) return;
    const r = title.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - .5) * -14;
    py = ((e.clientY - r.top) / r.height - .5) * -7;
    kick();
  });
  title.addEventListener('mouseleave', () => { px = 0; py = 0; kick(); });
  window.addEventListener('deviceorientation', (e) => {
    if (title.classList.contains('off') || e.gamma == null) return;
    px = Math.max(-12, Math.min(12, e.gamma / 3)) * -1;
    py = Math.max(-6, Math.min(6, ((e.beta || 45) - 45) / 6)) * -1;
    kick();
  }, true);

  /* ---------------- 世界读数：灯塔历 / 时段 / 孢子 ---------------- */
  const PHASE = [
    [0, '深夜'], [5, '破晓'], [8, '上行'], [11, '正午'],
    [14, '下行'], [17, '黄昏'], [20, '闭塔']
  ];
  function phaseOf(h) {
    let p = '深夜';
    PHASE.forEach((x) => { if (h >= x[0]) p = x[1]; });
    return p;
  }
  function tickClock() {
    const d = new Date();
    const day = $('dzDay');
    if (day) {
      // 灯塔历 = 一个不动声色的长纪年，随真实日期缓慢推进
      const base = Date.UTC(2026, 8, 10);   // 让「第 4,081 日」和剧本里的灯塔广播对上
      const n = 4081 + Math.floor((d.getTime() - base) / 86400000);
      day.textContent = n.toLocaleString('en-US');
    }
    const c = $('dzClock');
    if (c) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      c.textContent = phaseOf(d.getHours()) + ' ' + hh + ':' + mm;
    }
  }
  tickClock();
  setInterval(tickClock, 20000);

  const spore = $('dzSpore');
  const quint = $('dzQuint');
  setInterval(() => {
    if (title.classList.contains('off')) return;
    if (spore) spore.textContent = (0.30 + Math.random() * 0.2).toFixed(2);
    if (quint) quint.textContent = 112 + Math.floor(Math.random() * 16);
  }, 3400);

  /* 灯塔广播：直接用剧本里那条 */
  const radio = $('dzRadio');
  if (radio) {
    const t = (window.TICKERS && window.TICKERS.calm) ||
      '灯塔广播 · A-7 区例行净化完成 · 全体注意：不得私藏地面物品 · 不得有感情';
    radio.textContent = t + '　　·　　' + t;
  }

  /* ---------------- 属性面板 ---------------- */
  const panel = $('mprofile');

  function readSave() {
    try {
      const d = JSON.parse(localStorage.getItem('chroma_cage_save_v1'));
      return (d && d.flags) || {};
    } catch (e) { return {}; }
  }
  function readEnds() {
    try { return JSON.parse(localStorage.getItem('chroma_cage_endings_v1')) || {}; } catch (e) { return {}; }
  }
  function n(v) { return typeof v === 'number' ? v : (parseFloat(v) || 0); }

  function refresh() {
    // 伪元素宽度只能靠注入样式，统一拼一份
    let css = '';
    document.querySelectorAll('.mp-bars u').forEach((u, i) => {
      u.dataset.i = i;
      css += '.mp-bars u[data-i="' + i + '"]::after{width:' + (+u.dataset.v || 0) + '%}';
    });

    const f = readSave();
    const tv = n(f.trust), xv = n(f.expose);
    const t = Math.max(0, Math.min(MAXV, tv));
    const x = Math.max(0, Math.min(MAXV, xv));
    css += '#mpTrust::after{width:' + (t / MAXV * 100).toFixed(1) + '%}';
    css += '#mpExpose::after{width:' + (x / MAXV * 100).toFixed(1) + '%}';

    let tag = $('dzBarCSS');
    if (!tag) { tag = document.createElement('style'); tag.id = 'dzBarCSS'; document.head.appendChild(tag); }
    tag.textContent = css;

    if ($('mpTrustV')) $('mpTrustV').textContent = tv;
    if ($('mpExposeV')) $('mpExposeV').textContent = xv;
    if ($('dzExpose')) $('dzExpose').textContent = xv;

    // 身份卡：战备度 Lv.5 起步，随信任往上走；头像外圈的进度环同步
    const lvl = 5 + (tv >= 6 ? 4 : tv >= 4 ? 3 : tv >= 2 ? 2 : tv >= 1 ? 1 : 0);
    if ($('dzTrustLv')) $('dzTrustLv').textContent = 'Lv.' + lvl;
    const ring = $('dzRing');
    if (ring) {
      const C = 2 * Math.PI * 20;
      const ratio = 0.4 + (t / MAXV) * 0.6;      // 起手就有一段底，看得出是「战备度」
      ring.style.strokeDasharray = C.toFixed(1);
      ring.style.strokeDashoffset = (C * (1 - ratio)).toFixed(1);
    }

    const ends = readEnds();
    const all = window.ENDINGS ? Object.keys(window.ENDINGS) : ['roster', 'specimen', 'unnamed'];
    const got = all.filter((k) => ends[k]).length;
    if ($('mpEnd')) $('mpEnd').textContent = got + ' / ' + all.length;
    if ($('endCount')) $('endCount').textContent = got + ' / ' + all.length;
    if ($('mpEndTxt')) {
      $('mpEndTxt').textContent = got === 0 ? '还没有人走到过第一章的尽头。'
        : got >= all.length ? '三条路你都走完了。他每一次都记得你。'
          : '还有 ' + (all.length - got) + ' 种结局没有被记录。';
    }
  }

  const ANCHOR = { attr: 'mpAttrAnchor', gear: 'mpGearAnchor', world: 'mpWorldAnchor', story: 'mpStoryAnchor' };
  function openPanel(key) {
    if (!panel) return;
    refresh();
    panel.classList.add('on');
    const inner = panel.querySelector('.mp-inner');
    if (inner) inner.scrollTop = 0;
    const id = ANCHOR[key];
    if (id && inner) {
      const a = $(id);
      if (a) setTimeout(() => { inner.scrollTo({ top: Math.max(0, a.offsetTop - 14), behavior: 'smooth' }); }, 60);
    }
    snd('click');
  }
  function closePanel() {
    if (!panel) return;
    panel.classList.remove('on');
    snd('back');
  }

  const attrBtn = $('dzAttrBtn');
  if (attrBtn) attrBtn.addEventListener('click', () => openPanel('attr'));
  const book = $('dzBook');
  if (book) book.addEventListener('click', () => openPanel('attr'));
  const close = panel && panel.querySelector('.mp-close');
  if (close) close.addEventListener('click', closePanel);
  if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });

  /* 侧栏 / 底部 tab：档案类自己处理，菜单类代理点原来的 .t-menu 项 */
  function proxyMenu(m) {
    const el = document.querySelector('.t-menu li[data-menu="' + m + '"]');
    if (el && !el.classList.contains('dis')) el.click();
  }
  function bindDz(el) {
    el.addEventListener('click', () => {
      const k = el.dataset.dz;
      if (!k) return;
      if (k === 'about') proxyMenu('about');
      else if (k === 'archive') proxyMenu('archive');
      else openPanel(k);          // attr / story / gear / world
    });
  }
  document.querySelectorAll('.dz-side li[data-dz]').forEach(bindDz);

  const go = panel && panel.querySelector('.mp-go');
  if (go) go.addEventListener('click', () => { closePanel(); setTimeout(() => proxyMenu('start'), 130); });

  /* Esc / 方向键：面板打开时优先归面板处理 */
  document.addEventListener('keydown', (e) => {
    if (!panel || !panel.classList.contains('on')) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closePanel(); return; }
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Space'].indexOf(e.code) >= 0) e.stopPropagation();
  }, true);

  /* 回到标题页时刷新数值 */
  const mo = new MutationObserver(() => { if (!title.classList.contains('off')) refresh(); });
  mo.observe(title, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('DOMContentLoaded', refresh);
  refresh();
})();

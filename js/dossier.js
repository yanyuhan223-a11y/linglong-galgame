/* ============================================================
   dossier.js —— 进场：马克 · 互动档案页
   · 立绘视差 + 点一下换一句台词（用已有贴图，不重绘）
   · 角色属性面板：战术评估 / 他眼里的你（读存档）/ 第一幕梗概
   · 侧栏功能钮复用 engine.js 已有的 .t-menu 逻辑，不改引擎
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const title = $('title');
  if (!title) return;

  const MAXV = 7;   // trust / expose 的第一章理论上限

  /* ---------------- 马克的台词池 ---------------- */
  const LINES = [
    '报上来历。给你一次机会。',
    '你身上没有编号，没有配给卡，连灰都不对。<span class="rd">你是从哪儿掉下来的？</span>',
    '别往那边看。那不是风吹的。',
    '灯塔的规矩我背得比谁都熟。<span class="rd">背得熟，不代表我信。</span>',
    '第七小队，下去八个人。名册上现在只剩五行没被划掉。',
    '手举高一点。不是我想为难你，是上面在看。',
    '你要是真没档案——那你现在最好别让任何人给你建一个。',
    '走在我后面半步。别问为什么，照做。',
    '我不管你叫什么。我只管带下去的人能不能带回来。',
    '这枚胸章不是我的。别问。'
  ];
  let li = 0;
  const lineEl = $('dzLine');
  function nextLine() {
    li = (li + 1) % LINES.length;
    if (!lineEl) return;
    lineEl.style.opacity = '0';
    lineEl.style.transform = 'translateY(4px)';
    setTimeout(() => {
      lineEl.innerHTML = LINES[li];
      lineEl.style.transition = 'opacity .26s ease, transform .26s ease';
      lineEl.style.opacity = '1';
      lineEl.style.transform = 'none';
    }, 130);
    if (window.Snd) { try { window.Snd.fx('hover'); } catch (e) { /* noop */ } }
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
    px = ((e.clientX - r.left) / r.width - .5) * -16;
    py = ((e.clientY - r.top) / r.height - .5) * -8;
    kick();
  });
  title.addEventListener('mouseleave', () => { px = 0; py = 0; kick(); });
  window.addEventListener('deviceorientation', (e) => {
    if (title.classList.contains('off') || e.gamma == null) return;
    px = Math.max(-14, Math.min(14, e.gamma / 3)) * -1;
    py = Math.max(-6, Math.min(6, ((e.beta || 45) - 45) / 6)) * -1;
    kick();
  }, true);

  /* ---------------- 顶栏读数（随机小抖动，像个活着的终端） ---------------- */
  const spore = $('dzSpore');
  const dzDate = $('dzDate');
  if (dzDate) {
    const d = new Date();
    dzDate.textContent = String(4081 + d.getDate()).slice(-4);
  }
  setInterval(() => {
    if (!spore || title.classList.contains('off')) return;
    spore.textContent = (0.30 + Math.random() * 0.18).toFixed(2);
  }, 3200);

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

  function fillBars() {
    // 伪元素宽度只能靠注入样式，统一在这里拼一份
    let css = '';
    document.querySelectorAll('.mp-bars u').forEach((u, i) => {
      u.dataset.i = i;
      css += '.mp-bars u[data-i="' + i + '"]::after{width:' + (+u.dataset.v || 0) + '%}';
    });

    const f = readSave();
    const t = Math.max(0, Math.min(MAXV, n(f.trust)));
    const x = Math.max(0, Math.min(MAXV, n(f.expose)));
    css += '#mpTrust::after{width:' + (t / MAXV * 100).toFixed(1) + '%}';
    css += '#mpExpose::after{width:' + (x / MAXV * 100).toFixed(1) + '%}';

    let tag = document.getElementById('dzBarCSS');
    if (!tag) { tag = document.createElement('style'); tag.id = 'dzBarCSS'; document.head.appendChild(tag); }
    tag.textContent = css;

    if ($('mpTrustV')) $('mpTrustV').textContent = n(f.trust);
    if ($('mpExposeV')) $('mpExposeV').textContent = n(f.expose);

    const lv = $('dzTrustLv');
    if (lv) {
      const L = n(f.trust) >= 5 ? '并肩' : n(f.trust) >= 3 ? '有点信你' : n(f.trust) >= 1 ? '还在看' : '陌生人';
      lv.textContent = '熟识度 ' + L;
    }

    const ends = readEnds();
    const all = window.ENDINGS ? Object.keys(window.ENDINGS) : ['roster', 'specimen', 'unnamed'];
    const got = all.filter((k) => ends[k]).length;
    if ($('mpEnd')) $('mpEnd').textContent = got + ' / ' + all.length;
    if ($('mpEndTxt')) {
      $('mpEndTxt').textContent = got === 0 ? '还没有人走到过第一章的尽头。'
        : got >= all.length ? '三条路你都走完了。他每一次都记得你。'
          : '还有 ' + (all.length - got) + ' 种结局没有被记录。';
    }
  }

  function openPanel(anchor) {
    if (!panel) return;
    fillBars();
    panel.classList.add('on');
    const inner = panel.querySelector('.mp-inner');
    if (inner) inner.scrollTop = 0;
    if (anchor) {
      const a = $(anchor);
      if (a && inner) setTimeout(() => { inner.scrollTop = a.offsetTop - 12; }, 40);
    }
    if (window.Snd) { try { window.Snd.fx('click'); } catch (e) { /* noop */ } }
  }
  function closePanel() {
    if (!panel) return;
    panel.classList.remove('on');
    if (window.Snd) { try { window.Snd.fx('back'); } catch (e) { /* noop */ } }
  }

  const attrBtn = $('dzAttrBtn');
  if (attrBtn) attrBtn.addEventListener('click', () => openPanel());
  const close = panel && panel.querySelector('.mp-close');
  if (close) close.addEventListener('click', closePanel);
  if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });

  /* 侧栏：复用引擎已经绑好的 .t-menu 项，点它就等于点菜单 */
  function proxyMenu(m) {
    const li2 = document.querySelector('.t-menu li[data-menu="' + m + '"]');
    if (li2 && !li2.classList.contains('dis')) li2.click();
  }
  document.querySelectorAll('.dz-side li').forEach((el) => {
    el.addEventListener('click', () => {
      const k = el.dataset.dz;
      if (k === 'attr') openPanel();
      else if (k === 'story') openPanel('mpStoryAnchor');
      else if (k === 'archive') proxyMenu('archive');
      else if (k === 'about') proxyMenu('about');
    });
  });
  const go = panel && panel.querySelector('.mp-go');
  if (go) go.addEventListener('click', () => { closePanel(); setTimeout(() => proxyMenu('start'), 120); });

  /* Esc / 方向键：面板打开时优先归面板处理 */
  document.addEventListener('keydown', (e) => {
    if (!panel || !panel.classList.contains('on')) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closePanel(); return; }
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Space'].indexOf(e.code) >= 0) e.stopPropagation();
  }, true);

  /* 回到标题页时刷新数值 */
  const mo = new MutationObserver(() => { if (!title.classList.contains('off')) fillBars(); });
  mo.observe(title, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('DOMContentLoaded', fillBars);
  fillBars();
})();

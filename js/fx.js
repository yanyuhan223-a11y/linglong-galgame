/* ============================================================
   fx.js —— 环境演出层（粒子 / 闪光 / 震动 / Glitch / 手电筒）
   ============================================================ */
(function (global) {
  'use strict';

  const stage = () => document.getElementById('stage');
  const $ = (id) => document.getElementById(id);

  /* ---------------- 粒子系统 ---------------- */
  const PRESETS = {
    dust:  { n: 70,  color: [200, 214, 255], size: [0.6, 2.0], speed: [0.05, 0.22],
             drift: 0.14, alpha: [0.10, 0.42], glow: 0, rise: -0.03 },
    spore: { n: 130, color: [180, 255, 226], size: [1.0, 3.4], speed: [0.08, 0.34],
             drift: 0.30, alpha: [0.18, 0.66], glow: 7, rise: -0.16 },
    ash:   { n: 150, color: [255, 132, 148], size: [0.8, 3.0], speed: [0.18, 0.62],
             drift: 0.44, alpha: [0.16, 0.60], glow: 9, rise: 0.10 },
    volt:  { n: 90,  color: [206, 158, 255], size: [1.0, 3.2], speed: [0.14, 0.52],
             drift: 0.38, alpha: [0.24, 0.80], glow: 12, rise: -0.22 }
  };

  let cv, ctx, W, H, dpr = 1, parts = [], preset = PRESETS.dust, raf = 0, running = false;
  let density = 1;

  function resize() {
    if (!cv) return;
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawn(p, first) {
    p.x = rnd(-40, W + 40);
    p.y = first ? rnd(0, H) : (preset.rise < 0 ? H + rnd(4, 60) : -rnd(4, 60));
    p.r = rnd(preset.size[0], preset.size[1]);
    p.vy = (preset.rise < 0 ? -1 : 1) * rnd(preset.speed[0], preset.speed[1]);
    p.vx = rnd(-preset.drift, preset.drift);
    p.a = rnd(preset.alpha[0], preset.alpha[1]);
    p.ph = Math.random() * Math.PI * 2;
    p.sp = rnd(0.006, 0.024);
    return p;
  }

  function build() {
    const n = Math.round(preset.n * density);
    parts = [];
    for (let i = 0; i < n; i++) parts.push(spawn({}, true));
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    const [cr, cg, cb] = preset.color;
    if (preset.glow) { ctx.shadowBlur = preset.glow; ctx.shadowColor = `rgba(${cr},${cg},${cb},.85)`; }
    else ctx.shadowBlur = 0;
    for (const p of parts) {
      p.ph += p.sp;
      p.x += p.vx + Math.sin(p.ph) * 0.34;
      p.y += p.vy;
      const tw = 0.62 + 0.38 * Math.sin(p.ph * 1.7);
      ctx.globalAlpha = p.a * tw;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
      if (p.y < -80 || p.y > H + 80 || p.x < -80 || p.x > W + 80) spawn(p, false);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    raf = requestAnimationFrame(tick);
  }

  /* ---------------- 公开 API ---------------- */
  const FX = {
    init() {
      cv = $('fxCanvas'); if (!cv) return;
      ctx = cv.getContext('2d', { alpha: true });
      resize(); build();
      running = true; tick();
      global.addEventListener('resize', () => { resize(); build(); });
      // 手电筒跟随
      global.addEventListener('pointermove', (e) => {
        const fl = $('flashlight');
        if (fl && fl.classList.contains('on')) fl.style.setProperty('--fx', e.clientX + 'px');
      }, { passive: true });
      // 低性能设备降密度
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) { density = 0.6; build(); }
    },

    particles(kind) {
      preset = PRESETS[kind] || PRESETS.dust;
      build();
    },

    pause(v) { running = !v; if (running) tick(); else cancelAnimationFrame(raf); },

    /** 闪屏 white | vio | red */
    flash(kind) {
      const f = $('flash'); if (!f) return;
      f.className = ''; void f.offsetWidth;
      f.className = 'go' + (kind && kind !== 'white' ? ' ' + kind : '');
      setTimeout(() => { f.className = ''; }, 620);
    },

    /** 震动 s | m | l */
    shake(level) {
      const s = stage(); if (!s) return;
      const cls = 'shake-' + (level || 'm');
      s.classList.remove('shake-s', 'shake-m', 'shake-l');
      void s.offsetWidth;
      s.classList.add(cls);
      setTimeout(() => s.classList.remove(cls), 900);
    },

    /** 故障 */
    glitch(ms) {
      const g = $('glitch'), s = stage();
      g.classList.add('on'); s.classList.add('glitching');
      setTimeout(() => { g.classList.remove('on'); s.classList.remove('glitching'); }, ms || 900);
    },

    /** 速度线 */
    speed(violet) {
      const el = $('speedlines'); if (!el) return;
      el.classList.remove('on'); el.classList.toggle('vio', !!violet);
      void el.offsetWidth; el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 700);
    },

    torch(on) {
      const fl = $('flashlight'); if (!fl) return;
      if (on && !fl.style.getPropertyValue('--fx')) fl.style.setProperty('--fx', '50%');
      fl.classList.toggle('on', !!on);
    },

    danger(on) {
      $('dangerPulse').classList.toggle('on', !!on);
      stage().classList.toggle('tense', !!on);
      document.getElementById('bgTint').classList.toggle('danger', !!on);
      document.querySelector('.v-alt').classList.toggle('hot', !!on);
    },

    /** 章节转场大字卡，返回 Promise */
    chapterCard(num, en, cn) {
      return new Promise((res) => {
        let cc = $('chapCard');
        if (!cc) {
          cc = document.createElement('div'); cc.id = 'chapCard';
          document.getElementById('stage').appendChild(cc);
        }
        cc.innerHTML =
          '<div class="cc-wipe"></div><div class="cc-wipe2"></div>' +
          '<div class="cc-txt"><div class="cc-num">' + num + '</div>' +
          '<div class="cc-en">' + en + '</div><div class="cc-cn">' + cn + '</div></div>';
        cc.classList.add('on');
        setTimeout(() => { cc.classList.remove('on'); cc.innerHTML = ''; res(); }, 1900);
      });
    }
  };

  global.FX = FX;
})(window);

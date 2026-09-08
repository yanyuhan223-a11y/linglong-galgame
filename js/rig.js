/* ============================================================
   rig.js —— OC 伪 Live2D 装置
   呼吸 / 摇摆 / 视差 / 随机眨眼 / 情绪状态机 / 受击反馈
   ============================================================ */
(function (global) {
  'use strict';

  const EMOS = ['idle', 'blink', 'surprise', 'fear', 'resolve', 'hurt'];

  /* 每种情绪的动态参数：呼吸幅度、频率、摇摆、附加倾斜 */
  const PROFILE = {
    idle:     { breath: 0.0085, bRate: 0.00110, sway: 0.42, swayRate: 0.00045, tilt: 0,    lift: 0,   blink: [2600, 6200] },
    surprise: { breath: 0.0042, bRate: 0.00230, sway: 0.16, swayRate: 0.00090, tilt: -0.7, lift: -8,  blink: [4200, 9000] },
    fear:     { breath: 0.0140, bRate: 0.00260, sway: 0.30, swayRate: 0.00120, tilt: 1.4,  lift: 10,  blink: [1500, 3400] },
    resolve:  { breath: 0.0070, bRate: 0.00095, sway: 0.22, swayRate: 0.00040, tilt: -0.5, lift: -5,  blink: [3400, 7600] },
    hurt:     { breath: 0.0175, bRate: 0.00330, sway: 0.55, swayRate: 0.00135, tilt: 2.6,  lift: 16,  blink: [1200, 2800] }
  };

  let rig, inner, heads = {}, cur = 'idle', target = PROFILE.idle, live = PROFILE.idle;
  let t0 = performance.now(), raf = 0;
  let px = 0, py = 0, tpx = 0, tpy = 0;      // 视差
  let blinkTimer = 0, blinking = false, enabled = true;

  function lerp(a, b, k) { return a + (b - a) * k; }

  function frame(now) {
    const t = now - t0;

    // 情绪参数平滑过渡
    live = {
      breath:   lerp(live.breath,   target.breath,   0.045),
      bRate:    lerp(live.bRate,    target.bRate,    0.045),
      sway:     lerp(live.sway,     target.sway,     0.045),
      swayRate: lerp(live.swayRate, target.swayRate, 0.045),
      tilt:     lerp(live.tilt,     target.tilt,     0.045),
      lift:     lerp(live.lift,     target.lift,     0.045)
    };

    // 呼吸：从底部锚点做纵向缩放，胸腔起伏
    const b = Math.sin(t * live.bRate);
    const b2 = Math.sin(t * live.bRate * 2 + 0.7) * 0.28;      // 二次谐波，避免机械感
    const sy = 1 + live.breath * (b + b2);
    const sx = 1 - live.breath * 0.42 * (b + b2);

    // 缓慢摇摆
    const s = Math.sin(t * live.swayRate);
    const s2 = Math.cos(t * live.swayRate * 0.63 + 1.2);
    const rot = live.sway * s * 0.6 + live.tilt;
    const shiftX = live.sway * s2 * 3.4;
    const shiftY = live.lift + live.sway * b * 1.6;

    // 视差跟随
    px = lerp(px, tpx, 0.055);
    py = lerp(py, tpy, 0.055);

    inner.style.transform =
      'translate3d(' + (shiftX + px).toFixed(2) + 'px,' + (shiftY + py).toFixed(2) + 'px,0)' +
      ' rotate(' + rot.toFixed(3) + 'deg)' +
      ' scale(' + sx.toFixed(5) + ',' + sy.toFixed(5) + ')';

    // 眨眼
    if (enabled && now > blinkTimer && !blinking && cur !== 'hurt') doBlink(now);

    raf = requestAnimationFrame(frame);
  }

  function show(emo) {
    for (const k in heads) heads[k].classList.toggle('on', k === emo);
  }

  function scheduleBlink(now) {
    const r = (PROFILE[cur] || PROFILE.idle).blink;
    blinkTimer = now + r[0] + Math.random() * (r[1] - r[0]);
  }

  function doBlink(now) {
    blinking = true;
    show('blink');
    const double = Math.random() < 0.22;
    setTimeout(() => {
      show(cur);
      if (double) {
        setTimeout(() => {
          show('blink');
          setTimeout(() => { show(cur); blinking = false; scheduleBlink(performance.now()); }, 78);
        }, 96);
      } else {
        blinking = false;
        scheduleBlink(performance.now());
      }
    }, 92);
  }

  const Rig = {
    init() {
      rig = document.getElementById('ocRig');
      if (!rig) return;
      inner = rig.querySelector('.rig-inner');
      rig.querySelectorAll('.oc-head img').forEach((im) => { heads[im.dataset.emo] = im; });
      show('idle');
      scheduleBlink(performance.now());
      raf = requestAnimationFrame(frame);

      global.addEventListener('pointermove', (e) => {
        const cx = e.clientX / global.innerWidth - 0.5;
        const cy = e.clientY / global.innerHeight - 0.5;
        tpx = cx * 15;
        tpy = cy * 8;
      }, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else { t0 = performance.now() - 1; raf = requestAnimationFrame(frame); }
      });
    },

    /** 切换情绪 */
    emo(name) {
      if (!EMOS.includes(name) || name === 'blink') return;
      cur = name;
      target = PROFILE[name] || PROFILE.idle;
      if (!blinking) show(name);
      scheduleBlink(performance.now());
    },

    get current() { return cur; },

    /** 能力充能（紫色气场 + 辉光加速） */
    charge(on) { rig.classList.toggle('charge', !!on); },

    /** 显示名牌 */
    named(on) { rig.classList.toggle('named', !!on); },

    /** 一次性反馈 recoil | shiver */
    react(kind, ms) {
      if (kind === 'shiver') {
        inner.classList.add('shiver');
        setTimeout(() => inner.classList.remove('shiver'), ms || 900);
      } else {
        inner.classList.remove('recoil'); void inner.offsetWidth;
        inner.classList.add('recoil');
        setTimeout(() => inner.classList.remove('recoil'), 560);
      }
    },

    /** 说话时的轻微点头 */
    talk() {
      if (blinking) return;
      tpy += 2.2;
      setTimeout(() => { tpy -= 2.2; }, 130);
    },

    enable(v) { enabled = v; }
  };

  global.Rig = Rig;
})(window);

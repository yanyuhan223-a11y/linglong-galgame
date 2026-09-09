/* ============================================================
   intro.js —— OC 穿越开场（视频版）
   播放 assets/video/intro.mp4 → 结尾一道刺眼白光 → 进入游戏
   保持 window.Intro.play() 的 Promise 接口不变
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  let playing = false;
  let finished = false;
  let video = null;

  /* 结尾刺眼白光：铺满全屏、快速拉到纯白并短暂驻留 */
  function blindFlash() {
    const f = $('introFlash');
    if (!f) return;
    f.classList.remove('go');
    f.classList.add('blind');
    void f.offsetWidth;
    f.classList.add('go');
    if (window.Snd) window.Snd.sfx('whiteout');   // 白光的耳鸣/冲击声
  }

  /* 声音衔接：把视频音量平滑降到 0，避免硬切 */
  function audioFadeOut(v, ms) {
    if (!v) return;
    const start = (typeof v.volume === 'number') ? v.volume : 1;
    const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    const now = () => (window.performance && performance.now) ? performance.now() : Date.now();
    const step = () => {
      const k = Math.min(1, (now() - t0) / ms);
      try { v.volume = Math.max(0, start * (1 - k)); } catch (e) {}
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function play() {
    if (playing) return Promise.resolve();
    playing = true;
    finished = false;

    const root = $('intro');
    video = $('introVideo');
    root.classList.add('on');
    root.classList.remove('fading');

    return new Promise((resolve) => {
      let flashed = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        cleanup();
        // 白光驻留期间切场景：先把全局白光层拉满，再撤开场层，游戏从白光里淡出（见 engine.startNew）
        const w = $('whiteout');
        if (w) { w.classList.remove('fade'); w.classList.add('hold'); }
        root.classList.add('fading');
        setTimeout(() => {
          try { video.pause(); } catch (e) {}
          root.classList.remove('on', 'fading');
          const f = $('introFlash');
          if (f) f.classList.remove('go', 'blind');
          playing = false;
          resolve();
        }, 300);
      };

      // 临近结尾提前触发：白光缓升 + 声音淡出同步收束，再驻留片刻
      const onTime = () => {
        if (flashed || !video.duration) return;
        if (video.currentTime >= video.duration - 1.3) {
          flashed = true;
          blindFlash();
          audioFadeOut(video, 1300);   // 音频与白光一起收束，避免硬切
          // 白光升满并多停留一会，再进入正片
          setTimeout(finish, 1250);
        }
      };
      const onEnded = () => {
        if (!flashed) { flashed = true; blindFlash(); audioFadeOut(video, 500); }
        setTimeout(finish, 700);
      };

      function cleanup() {
        video.removeEventListener('timeupdate', onTime);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onEnded);
      }

      video.addEventListener('timeupdate', onTime);
      video.addEventListener('ended', onEnded);
      video.addEventListener('error', onEnded);

      // 播放（用户点击 NEW GAME 触发，允许带声自动播放）
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && p.catch) {
          p.catch(() => {   // 若带声被拦，静音重试
            video.muted = true;
            video.play().catch(() => onEnded());
          });
        }
      } catch (e) { onEnded(); }

      // 兜底：视频异常卡住，最长 20s 强制进入
      setTimeout(() => { if (!finished) onEnded(); }, 20000);

      window.__introSkip = () => {
        if (finished) return;
        if (!flashed) {
          flashed = true;
          blindFlash();
          audioFadeOut(video, 600);
          setTimeout(finish, 700);
        } else finish();
      };
    });
  }

  function skip() { if (window.__introSkip) window.__introSkip(); }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('introSkip');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); skip(); });
    document.addEventListener('keydown', (e) => {
      if (!playing) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    });
  });

  window.Intro = { play, skip, get playing() { return playing; } };
})();

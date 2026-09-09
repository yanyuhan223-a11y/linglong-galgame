/* ============================================================
   vfill.js —— 竖屏（移动端）横版视频的「上下补底」
   开场动画与过场视频素材都是 16:9。竖屏下正片画面用 contain 整帧显示，
   不做裁切；空出来的上下两条用同一支视频的模糊放大版填满
   （抖音/Shorts 的竖屏补底做法），比黑边或硬裁都自然。
   逻辑很轻：只镜像主视频的 play / pause / seek，容错则退回静帧底图。
   ============================================================ */
(function () {
  'use strict';

  function bind(mainId, bgId) {
    var m = document.getElementById(mainId);
    var b = document.getElementById(bgId);
    if (!m || !b) return;

    b.muted = true;
    b.defaultMuted = true;
    b.loop = false;
    var lastSrc = '';

    function align() {
      var d = Math.abs((b.currentTime || 0) - (m.currentTime || 0));
      if (d > 0.3) { try { b.currentTime = m.currentTime; } catch (e) {} }
    }

    function follow() {
      var src = m.getAttribute('src') || m.currentSrc || '';
      if (src && src !== lastSrc) { lastSrc = src; b.src = src; }
      align();
      var p = b.play();
      if (p && p.catch) p.catch(function () { /* 播不了就露静帧底图 */ });
    }

    m.addEventListener('play', follow);
    m.addEventListener('playing', align);
    m.addEventListener('seeked', align);
    m.addEventListener('timeupdate', align);
    m.addEventListener('pause', function () { try { b.pause(); } catch (e) {} });
    m.addEventListener('ended', function () { try { b.pause(); } catch (e) {} });
    m.addEventListener('emptied', function () { try { b.pause(); } catch (e) {} });
  }

  function init() {
    bind('introVideo', 'introVideoBg');
    bind('cutVideo', 'cutVideoBg');
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else init();
})();

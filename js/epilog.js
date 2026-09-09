/* ============================================================
   epilog.js —— 片尾讲述（EPILOGUE）
   黑场 + 逐行字幕 + TTS 旁白（assets/voice/ep_*.mp3）
   语音播完自动进下一句；点 SKIP 直接收尾。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* voice: 音频 id；text: 屏幕上的字；at: 该行在这段语音里的出现时间（秒）
     ep_05 有 11 秒，拆成两行显示，共用同一段语音 */
  var LINES = [
    { voice: 'ep_01', text: '灯塔把每个人都写进名册，用一个编号确认你还活着。' },
    { voice: 'ep_02', text: '而你没有编号。<span class="hl">你是这套秩序里的一个错误。</span>' },
    { voice: 'ep_03', text: '第一幕里，这是他们指认你的罪证。' },
    { voice: 'ep_04', text: '到了第三幕，<span class="hl">这成了你唯一握得住的武器。</span>' },
    { voice: 'ep_05', text: '地面之下，玛娜之花还在往上长。',
      more: [{ at: 5.4, text: '灯塔之上，有人已经开始查一个查不到的名字。' }] },
    { voice: 'ep_06', text: '而你留在这个世界里的第一道痕迹，<span class="hl">是一道紫色的电。</span>' },
    { voice: 'ep_07', text: '笼中异色 · 第一章　完', cls: 'last', tail: 900 }
  ];

  var running = false, skipped = false, timers = [];

  function T(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearT() { timers.forEach(clearTimeout); timers = []; }

  function addLine(html, cls) {
    var box = $('epLines');
    var p = document.createElement('p');
    p.className = 'ep-line' + (cls ? ' ' + cls : '');
    p.innerHTML = html;
    box.appendChild(p);
    // 触发进场动画
    requestAnimationFrame(function () { p.classList.add('in'); });
    // 只保留最近 4 行，更早的淡出上移
    var all = box.querySelectorAll('.ep-line');
    for (var i = 0; i < all.length - 4; i++) all[i].classList.add('gone');
    return p;
  }

  function sleep(ms) { return new Promise(function (r) { T(r, ms); }); }

  /* 每句的最短停留：优先用 manifest 里的真实语音时长，其次按字数估 */
  var DUR = null;
  function loadDur() {
    if (DUR) return Promise.resolve(DUR);
    return fetch('assets/voice/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { DUR = j || {}; return DUR; })
      .catch(function () { DUR = {}; return DUR; });
  }
  function minMs(item) {
    var d = DUR && DUR[item.voice] && DUR[item.voice].dur;
    if (d) return d * 1000 + (item.tail || 420);
    return 2200 + item.text.replace(/<[^>]+>/g, '').length * 260;
  }

  function playLine(item) {
    return new Promise(function (resolve) {
      addLine(item.text, item.cls);
      if (item.more) {
        item.more.forEach(function (m) { T(function () { if (!skipped) addLine(m.text, item.cls); }, m.at * 1000); });
      }
      var done = false;
      var t0 = Date.now();
      var floor = minMs(item);
      var finish = function () {
        if (done) return; done = true;
        // 语音被浏览器拦掉时会立刻 resolve —— 至少让字幕待够该待的时间
        var rest = Math.max(0, floor - (Date.now() - t0));
        if (rest > 60) T(resolve, rest); else resolve();
      };
      if (window.Snd && window.Snd.voice) {
        window.Snd.voice(item.voice).then(function () { T(finish, item.tail || 420); });
        T(finish, floor + 6000);          // 事件全丢的兜底
      } else {
        T(finish, 0);
      }
    });
  }

  function play() {
    if (running) return Promise.resolve();
    running = true; skipped = false;
    var root = $('epilog');
    $('epLines').innerHTML = '';
    root.classList.add('on');
    $('epWave').classList.add('on');

    return new Promise(function (resolve) {
      var finished = false;
      var end = function () {
        if (finished) return; finished = true;
        clearT();
        if (window.Snd) window.Snd.stopVoice();
        $('epWave').classList.remove('on');
        root.classList.add('out');
        setTimeout(function () {
          root.classList.remove('on', 'out');
          $('epLines').innerHTML = '';
          running = false;
          resolve();
        }, 900);
      };

      $('epSkip').onclick = function (e) {
        e.stopPropagation();
        skipped = true;
        if (window.Snd) { window.Snd.sfx('click'); window.Snd.stopVoice(); }
        end();
      };

      (async function () {
        await loadDur();
        await sleep(900);
        for (var i = 0; i < LINES.length; i++) {
          if (skipped) break;
          await playLine(LINES[i]);
          if (skipped) break;
          await sleep(260);
        }
        if (!skipped) await sleep(1100);
        end();
      })();
    });
  }

  window.Epilog = { play: play, get playing() { return running; } };
})();

/* ============================================================
   script.js —— 剧本数据（引擎只负责渲染，加剧情不用改引擎）
   节点类型：
     bg / chap / card / say / char / fx / hud / wait
     choice / label / goto / flag / video / end
   ============================================================ */
window.CAST = {
  salt: { cn: 'Salt',   en: 'NO RECORD',  cls: '' },
  mark: { cn: '马克',   en: 'MARK',      cls: 'other' },
  narr: { cn: '旁白',   en: 'NARRATION', cls: 'narr' },
  sys:  { cn: '灯塔系统', en: 'SYSTEM',  cls: 'other' }
};

window.TICKERS = {
  calm: '灯塔广播 · 第 4,081 日 · A-7 区例行净化完成 · 尘民配给下调 3% · 全体注意：不得私藏地面物品 · 不得有感情 · 不得质疑三大法则 · 违者远行',
  alarm: '⚠ 紧急 · A-7 区外壁破损 · 检测到大规模生命源质流失 · 猎荒者小队即刻下降 · 非战斗人员就地隐蔽 · 重复：噬极兽群体信号已确认'
};

window.SCRIPT = [

  /* ================= 序章 ================= */
  { t: 'chap', num: 'I', en: 'ACT I · FALL', cn: '第一幕 · 坠入' },
  { t: 'fx', do: 'particles', arg: 'dust' },

  /* ---- 开场动画的白光还没散尽，就直接切进第一视角：
         在灯塔回廊里睁眼 → 推摇杆慢慢往前走 → 在尽头遇见马克 ---- */
  { t: 'explore' },

  /* ---- 探索结束：舞台切回正片，马克已经站在你面前 ---- */
  { t: 'bg', v: 'tower' },
  { t: 'hud', on: true, sync: 34, bpm: 72, ticker: 'calm' },
  { t: 'char', v: 'mark' },
  { t: 'wait', ms: 500 },
  { t: 'label', v: 'explore_join' },

  { t: 'say', who: 'salt', emo: 'fear', text: '（三千一百二十七个……他连这个都记得。那我算什么？）' },
  { t: 'say', who: 'narr', text: '他没有拔刀。但他站的位置，正好堵死了你身后唯一的岔路。' },
  { t: 'say', who: 'mark', text: '报上来历。给你一次机会。' },

  /* ---- 抉择 1 ---- */
  { t: 'choice', opts: [
      { cn: '说实话——「我不属于这个世界」', en: 'TELL THE TRUTH', goto: 'c1_truth' },
      { cn: '什么也不说，把发光的手摊开给他看', en: 'SHOW THE HAND', goto: 'c1_hand' }
  ]},

  { t: 'label', v: 'c1_truth' },
  { t: 'flag', k: 'truth', v: 1 },
  { t: 'say', who: 'salt', emo: 'resolve', text: '我不属于这里。我不知道自己是怎么来的——昨天这个时候，我还在画画。' },
  { t: 'say', who: 'mark', text: '……画画。' },
  { t: 'say', who: 'mark', text: '上一个跟我说这种话的人，被送上了<span class="rd">火刑台</span>。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '火刑台？！' },
  { t: 'say', who: 'mark', text: '灯塔的规矩：不能有感情，不能有例外，不能有解释不清的东西。你三条全占了。' },
  { t: 'goto', v: 'c1_merge' },

  { t: 'label', v: 'c1_hand' },
  { t: 'flag', k: 'truth', v: 0 },
  { t: 'say', who: 'narr', text: '你什么也没说，只是把手摊开。' },
  { t: 'fx', do: 'charge', arg: true },
  { t: 'say', who: 'narr', text: '紫色的电弧在掌心缓慢游走，像一条不肯睡的蛇。' },
  { t: 'say', who: 'mark', text: '……' },
  { t: 'say', who: 'mark', text: '这不是灯塔的技术。' },
  { t: 'say', who: 'mark', text: '也不是玛娜的。' },
  { t: 'fx', do: 'charge', arg: false },
  { t: 'say', who: 'salt', emo: 'fear', text: '（我自己也不知道这是什么……）' },
  { t: 'goto', v: 'c1_merge' },

  { t: 'label', v: 'c1_merge' },
  { t: 'say', who: 'mark', text: '不过现在没时间管你是什么。' },

  /* ---- 警报 ---- */
  { t: 'fx', do: 'flash', arg: 'red' },
  { t: 'fx', do: 'shake', arg: 'm' },
  { t: 'hud', sync: 41, bpm: 96, ticker: 'alarm' },
  { t: 'say', who: 'sys', text: '<span class="rd">警报。</span>A-7 区外壁破损，检测到大规模生命源质流失。猎荒者小队即刻下降至地面。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '下降？下到……哪里去？' },
  { t: 'say', who: 'mark', text: '你跟我走。' },
  { t: 'say', who: 'salt', emo: 'fear', text: '我？！' },
  { t: 'say', who: 'mark', text: '名册上没有你。意思是——你死了，也不用填表。' },
  { t: 'say', who: 'mark', text: '走。' },
  { t: 'char', v: null },
  { t: 'wait', ms: 500 },

  /* ================= 第二幕 ================= */
  { t: 'card', num: 'II', en: 'ACT II · DESCENT', cn: '第 二 幕 · 下 降' },
  { t: 'chap', num: 'II', en: 'ACT II · DESCENT', cn: '第二幕 · 下降' },
  { t: 'bg', v: 'ruins' },
  { t: 'fx', do: 'particles', arg: 'ash' },
  { t: 'hud', sync: 47, bpm: 104 },

  { t: 'say', who: 'narr', text: '舱门打开的那一瞬间，你才明白灯塔为什么一定要浮在天上。' },
  { t: 'say', who: 'narr', text: '地面不是废墟。废墟是死的——而这里的一切，都在<span class="hl">呼吸</span>。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '那些……是花？' },
  { t: 'char', v: 'mark' },
  { t: 'say', who: 'mark', text: '玛娜之花。别靠近，更别让它碰到你的血。' },
  { t: 'fx', do: 'particles', arg: 'spore' },
  { t: 'say', who: 'mark', text: '它会把碰过的基因记下来，然后长出一个更适合杀你的东西。' },
  { t: 'say', who: 'salt', emo: 'fear', text: '……' },
  { t: 'char', v: null },

  /* ---- 手电筒探索 ---- */
  { t: 'fx', do: 'torch', arg: true },
  { t: 'say', who: 'sys', text: '（<span class="cyn">移动鼠标</span>可以挪动手电光柱）' },
  { t: 'say', who: 'narr', text: '队伍散开了，你被留在最后。手电的光柱扫过藤蔓，扫过锈死的路牌，扫过——' },
  { t: 'say', who: 'salt', emo: 'fear', text: '……一副骨头。好大。' },
  { t: 'say', who: 'narr', text: '肋骨像倒塌的拱门，中间卡着一枚变形的猎荒者胸章。' },
  { t: 'say', who: 'mark', text: '那是三年前的第七小队。别看了。' },
  { t: 'fx', do: 'torch', arg: false },

  /* ---- 噬极兽 ---- */
  { t: 'fx', do: 'glitch', arg: 700 },
  { t: 'fx', do: 'danger', arg: true },
  { t: 'hud', sync: 58, bpm: 148 },
  { t: 'say', who: 'sys', text: '<span class="rd">警告：检测到噬极兽群体信号。距离 210 米，接近中。</span>' },
  { t: 'say', who: 'narr', text: '雾里亮起一排眼睛。不是两只——是一排。' },
  { t: 'say', who: 'salt', emo: 'fear', react: 'shiver', text: '（跑……得跑……可是腿不听话……）' },
  { t: 'char', v: 'mark' },
  { t: 'say', who: 'mark', text: '都退到墙后！' },

  { t: 'fx', do: 'shake', arg: 'l' },
  { t: 'fx', do: 'flash', arg: 'red' },
  { t: 'hud', sync: 63, bpm: 171 },
  { t: 'say', who: 'narr', text: '一只从侧面撞开了混凝土，把马克整个掀翻在地。' },
  { t: 'char', v: 'mark', dim: true },
  { t: 'say', who: 'mark', text: '咳……别过来！' },
  { t: 'say', who: 'salt', emo: 'hurt', react: 'recoil', text: '马克！' },

  { t: 'say', who: 'narr', text: '它转过头。你屏住呼吸，指甲掐进掌心。' },
  { t: 'wait', ms: 600 },
  { t: 'say', who: 'narr', text: '……但它没有看你。' },
  { t: 'say', who: 'narr', text: '它的目光从你身上滑了过去，像你根本<span class="hl">不在那里</span>。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '它……看不见我？' },
  { t: 'say', who: 'narr', text: '因为你不属于这个世界的编码。你没有生命源质，你不是它的食物——你什么都不是。' },
  { t: 'say', who: 'narr', text: '而这一刻，「什么都不是」，成了你唯一的武器。' },

  /* ================= 第三幕 ================= */
  { t: 'card', num: 'III', en: 'ACT III · CHROMA', cn: '第 三 幕 · 异 色' },
  { t: 'chap', num: 'III', en: 'ACT III · CHROMA', cn: '第三幕 · 异色' },

  /* ---- 抉择 2 ---- */
  { t: 'choice', opts: [
      { cn: '冲过去，挡在马克身前', en: 'SHIELD HIM', goto: 'c2_shield' },
      { cn: '松开手，让紫电流过指尖', en: 'LET IT BURN', goto: 'c2_burn' }
  ]},

  { t: 'label', v: 'c2_shield' },
  { t: 'flag', k: 'shield', v: 1 },
  { t: 'say', who: 'salt', emo: 'resolve', text: '——！' },
  { t: 'say', who: 'narr', text: '你不知道自己在想什么。你只是跑了过去，张开手臂，站在了他和那排眼睛之间。' },
  { t: 'say', who: 'mark', text: '你疯了吗！' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '它看不见我。所以——只能是我。' },
  { t: 'goto', v: 'c2_merge' },

  { t: 'label', v: 'c2_burn' },
  { t: 'flag', k: 'shield', v: 0 },
  { t: 'say', who: 'salt', emo: 'resolve', text: '……好吧。' },
  { t: 'say', who: 'narr', text: '你摊开手。掌心那条不肯睡的蛇，终于抬起了头。' },
  { t: 'say', who: 'narr', text: '你没有学过怎么用它。但它好像，一直在等你松手。' },
  { t: 'goto', v: 'c2_merge' },

  { t: 'label', v: 'c2_merge' },
  { t: 'fx', do: 'charge', arg: true },
  { t: 'fx', do: 'particles', arg: 'volt' },
  { t: 'say', who: 'narr', text: '空气开始发麻。孢子在你周围被电离，一颗一颗炸成细小的紫色火星。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '离他远一点。' },
  { t: 'fx', do: 'speed', arg: true },
  { t: 'fx', do: 'shake', arg: 'l' },
  { t: 'fx', do: 'flash', arg: 'vio' },
  { t: 'wait', ms: 300 },

  /* ---- 情景视频过场 ---- */
  { t: 'video', src: 'assets/video/cut01.mp4', subs: [
      [0.7, 3.3, '一排眼睛在雾里亮起来的时候，没有人看向你。'],
      [3.9, 6.3, '「站到我后面。」<b>——马克</b>'],
      [6.9, 8.9, '可你已经听见了。掌心里那条蛇，醒了。'],
      [9.7, 13.0, '紫色的光，把整片废墟掀了起来。']
  ]},

  /* ---- 尾声 ---- */
  { t: 'fx', do: 'charge', arg: false },
  { t: 'fx', do: 'danger', arg: false },
  { t: 'fx', do: 'particles', arg: 'volt' },
  { t: 'hud', sync: 76, bpm: 88 },
  { t: 'bg', v: 'ruins' },
  { t: 'say', who: 'narr', v: 'nr_01', text: '光散去的时候，雾里空了。' },
  { t: 'say', who: 'narr', v: 'nr_02', text: '藤蔓退回地缝，玛娜之花合上了花瓣。连风都绕着你走。' },
  { t: 'char', v: 'mark' },
  { t: 'say', who: 'mark', text: '……咳。' },
  { t: 'say', who: 'mark', text: '你到底是什么东西。' },
  { t: 'say', who: 'salt', emo: 'idle', text: '我也很想知道。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '不过在弄清楚之前——先带我回去吧，指挥官。' },
  { t: 'say', who: 'narr', v: 'nr_03', text: '灯塔的名册上没有你。' },
  { t: 'say', who: 'narr', v: 'nr_04', text: '但从这一刻起，<span class="hl">这个世界记住了你</span>。' },

  { t: 'end' }
];

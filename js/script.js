/* ============================================================
   script.js —— 剧本数据（引擎只负责渲染，加剧情不用改引擎）
   节点类型：
     bg / chap / card / say / char / fx / hud / wait
     choice / label / goto / flag / var / if / video / end
   变量：
     trust  马克对你的信任   expose 灯塔对「异色」的关注度
   任何节点都能挂 cond:{k,op,v}，条件不满足就整条跳过。
   ============================================================ */
window.CAST = {
  salt: { cn: 'Salt',   en: 'NO RECORD',  cls: '' },
  mark: { cn: '马克',   en: 'MARK',      cls: 'other' },
  narr: { cn: '旁白',   en: 'NARRATION', cls: 'narr' },
  sys:  { cn: '灯塔系统', en: 'SYSTEM',  cls: 'other' }
};

/* 抉择后飘在右上角的关系变化提示 */
window.VARMETA = {
  trust:  { cn: '马克 · 信任' },
  expose: { cn: '灯塔 · 关注度' }
};

/* 三个结局：档案面板和片尾讲述都读这里 */
window.ENDINGS = {
  roster: {
    code: 'A', en: 'THE ROSTER', cn: '名册',
    hint: '马克替你担保，灯塔给了你一个编外编号。你终于被写下来了——代价是从此有人管得着你。'
  },
  specimen: {
    code: 'B', en: 'THE SPECIMEN', cn: '样本',
    hint: '关注度太高，信任太薄。没人替你说话，于是你没被写进名册，被写进了研究序列。'
  },
  unnamed: {
    code: 'C', en: 'THE UNNAMED', cn: '无名',
    hint: '你留在了地面。名册上永远没有你——所以谁也没办法把你划掉。'
  }
};

window.TICKERS = {
  calm: '灯塔广播 · 第 4,081 日 · A-7 区例行净化完成 · 尘民配给下调 3% · 全体注意：不得私藏地面物品 · 不得有感情 · 不得质疑三大法则 · 违者远行',
  alarm: '⚠ 紧急 · A-7 区外壁破损 · 检测到大规模生命源质流失 · 猎荒者小队即刻下降 · 非战斗人员就地隐蔽 · 重复：噬极兽群体信号已确认'
};

window.SCRIPT = [

  /* ================= 序章 ================= */
  { t: 'chap', num: 'I', en: 'ACT I · FALL', cn: '第一幕 · 坠入' },
  { t: 'fx', do: 'particles', arg: 'dust' },

  /* 初始化两个变量，读档也能对上 */
  { t: 'var', k: 'trust', op: '=', v: 0 },
  { t: 'var', k: 'expose', op: '=', v: 0 },

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

  /* ---- 抉择 1 · 你怎么解释自己 ---- */
  { t: 'choice', opts: [
      { cn: '说实话——「我不属于这个世界」', en: 'TELL THE TRUTH', goto: 'c1_truth',
        flag: { truth: 1 }, set: { trust: 2, expose: 1 } },
      { cn: '什么也不说，把发光的手摊开给他看', en: 'SHOW THE HAND', goto: 'c1_hand',
        flag: { truth: 0 }, set: { expose: 3 } }
  ]},

  { t: 'label', v: 'c1_truth' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '我不属于这里。我不知道自己是怎么来的——昨天这个时候，我还在画画。' },
  { t: 'say', who: 'mark', text: '……画画。' },
  { t: 'say', who: 'mark', text: '上一个跟我说这种话的人，被送上了<span class="rd">火刑台</span>。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '火刑台？！' },
  { t: 'say', who: 'mark', text: '灯塔的规矩：不能有感情，不能有例外，不能有解释不清的东西。你三条全占了。' },
  { t: 'say', who: 'mark', text: '……但你没有编谎。编谎的人眼睛会往左上看，你没有。' },
  { t: 'goto', v: 'c1_merge' },

  { t: 'label', v: 'c1_hand' },
  { t: 'say', who: 'narr', text: '你什么也没说，只是把手摊开。' },
  { t: 'fx', do: 'charge', arg: true },
  { t: 'say', who: 'narr', text: '紫色的电弧在掌心缓慢游走，像一条不肯睡的蛇。' },
  { t: 'say', who: 'mark', text: '……' },
  { t: 'say', who: 'mark', text: '这不是灯塔的技术。' },
  { t: 'say', who: 'mark', text: '也不是玛娜的。' },
  { t: 'fx', do: 'charge', arg: false },
  { t: 'say', who: 'salt', emo: 'fear', text: '（我自己也不知道这是什么……）' },
  { t: 'say', who: 'sys', text: '<span class="rd">检测：回廊 C-3 出现未登记能量峰值。已记入日志。</span>' },
  { t: 'say', who: 'mark', text: '你最好知道，这条走廊有七个监控点。' },
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

  /* ---- 抉择 2 · 要不要顶着别人的编号 ---- */
  { t: 'say', who: 'narr', text: '闸口的扫描门亮着红灯。它认编号，不认人。' },
  { t: 'say', who: 'narr', text: '马克从战术带里摸出一枚旧胸章，抛过来。' },
  { t: 'say', who: 'mark', text: '第七小队的备用牌。戴上，扫描门就当你是替补。' },
  { t: 'say', who: 'narr', text: '铜片上刻着一串编号，和一个被磨平的名字。' },

  { t: 'choice', opts: [
      { cn: '戴上它，跟着他走', en: 'WEAR THE TAG', goto: 'c2_badge',
        flag: { badge: 1 }, set: { trust: 1, expose: -1 } },
      { cn: '攥在手里，不戴', en: 'REFUSE THE NUMBER', goto: 'c2_bare',
        flag: { badge: 0 }, set: { trust: -1, expose: 1 } }
  ]},

  { t: 'label', v: 'c2_badge' },
  { t: 'say', who: 'salt', emo: 'idle', text: '……好。' },
  { t: 'say', who: 'narr', text: '金属贴上锁骨的时候是凉的。你忽然有了一个编号——虽然它属于一个已经死掉的人。' },
  { t: 'say', who: 'narr', text: '扫描门读到编号，绿灯，放行。它没有看你一眼。' },
  { t: 'say', who: 'mark', text: '别弄丢。那不是给你的，是借你的。' },
  { t: 'goto', v: 'c2_merge' },

  { t: 'label', v: 'c2_bare' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '我不想顶着别人的编号活着。' },
  { t: 'say', who: 'mark', text: '那你打算顶着什么走过去。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '顶着我自己。' },
  { t: 'fx', do: 'glitch', arg: 420 },
  { t: 'say', who: 'narr', text: '扫描门在你走过时红了一下，又灭了。它没找到你——也没拦你。' },
  { t: 'say', who: 'sys', text: '<span class="rd">记录：A-7 闸口，一次未识别通行。已上报中枢。</span>' },
  { t: 'say', who: 'mark', text: '……随你。' },
  { t: 'goto', v: 'c2_merge' },

  { t: 'label', v: 'c2_merge' },
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

  /* ---- 抉择 3 · 死者的胸章 ---- */
  { t: 'say', who: 'narr', cond: { k: 'badge', op: '==', v: 1 },
    text: '你认得那个形状。它和你锁骨上挂着的那枚，是一对。' },
  { t: 'say', who: 'narr', cond: { k: 'badge', op: '==', v: 0 },
    text: '你认得那个形状。刚才马克抛给你的那枚，和它是一对。' },

  { t: 'choice', opts: [
      { cn: '把胸章取下来，走过去还给他', en: 'GIVE IT BACK', goto: 'c3_relic',
        flag: { relic: 1 }, set: { trust: 2 } },
      { cn: '把光挪开，跟上队伍', en: 'LOOK AWAY', goto: 'c3_cold',
        flag: { relic: 0 } }
  ]},

  { t: 'label', v: 'c3_relic' },
  { t: 'say', who: 'narr', text: '你蹲下去，指尖碰到骨头。它比你想象的轻。' },
  { t: 'char', v: 'mark' },
  { t: 'say', who: 'salt', emo: 'idle', text: '……这个，应该给你。' },
  { t: 'say', who: 'narr', text: '他很久没有说话。' },
  { t: 'say', who: 'mark', text: '他叫周然。名册第 0819 号。' },
  { t: 'say', who: 'mark', text: '上个月被划掉了。系统说，为节省算力，超过两年的失踪记录自动清除。' },
  { t: 'say', who: 'mark', text: '现在只剩我记得。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '那现在有两个人记得了。' },
  { t: 'say', who: 'narr', text: '他把胸章收进内袋的动作很轻，像在收一根还会疼的骨头。' },
  { t: 'char', v: null },
  { t: 'goto', v: 'c3_merge' },

  { t: 'label', v: 'c3_cold' },
  { t: 'say', who: 'salt', emo: 'fear', text: '（不该碰。碰了就得记住，记住了就带不走。）' },
  { t: 'say', who: 'narr', text: '你把光挪开，跟上了队伍。' },
  { t: 'say', who: 'narr', text: '身后那枚胸章重新沉回黑暗里，像它这三年一直做的那样。' },
  { t: 'say', who: 'mark', text: '……走快点。' },
  { t: 'goto', v: 'c3_merge' },

  { t: 'label', v: 'c3_merge' },
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

  /* ---- 抉择 4 · 怎么救他 ---- */
  { t: 'choice', opts: [
      { cn: '冲过去，挡在马克身前', en: 'SHIELD HIM', goto: 'c4_shield',
        flag: { shield: 1 }, set: { trust: 2 } },
      { cn: '松开手，让紫电流过指尖', en: 'LET IT BURN', goto: 'c4_burn',
        flag: { shield: 0 }, set: { expose: 3 } }
  ]},

  { t: 'label', v: 'c4_shield' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '——！' },
  { t: 'say', who: 'narr', text: '你不知道自己在想什么。你只是跑了过去，张开手臂，站在了他和那排眼睛之间。' },
  { t: 'say', who: 'mark', text: '你疯了吗！' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '它看不见我。所以——只能是我。' },
  { t: 'goto', v: 'c4_merge' },

  { t: 'label', v: 'c4_burn' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '……好吧。' },
  { t: 'say', who: 'narr', text: '你摊开手。掌心那条不肯睡的蛇，终于抬起了头。' },
  { t: 'say', who: 'narr', text: '你没有学过怎么用它。但它好像，一直在等你松手。' },
  { t: 'say', who: 'sys', text: '<span class="rd">中枢记录：A-7 地表，异常能量峰值。等级：不可归类。</span>' },
  { t: 'goto', v: 'c4_merge' },

  { t: 'label', v: 'c4_merge' },
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

  /* ---- 尾声：三条线在这里分岔 ---- */
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

  /* 这三句只在对应状态下出现：让玩家看见自己一路攒下来的东西 */
  { t: 'say', who: 'mark', cond: { k: 'trust', op: '>=', v: 5 },
    text: '……不管你是什么。刚才那下，你是站在我前面的。这个我记着。' },
  { t: 'say', who: 'mark', cond: { k: 'trust', op: '<=', v: 1 },
    text: '别靠太近。我还没想好要不要把你写进报告里。' },
  { t: 'say', who: 'sys', cond: { k: 'expose', op: '>=', v: 5 },
    text: '<span class="rd">中枢通告：A-7 区未登记生命体，异常记录已累计多次。建议就地识别。</span>' },

  { t: 'say', who: 'narr', text: '远处，升降舱的探照灯亮了起来。他在等你的回答。' },

  /* ---- 抉择 5 · 你要一个什么样的位置 ---- */
  { t: 'choice', opts: [
      { cn: '「带我回灯塔。给我一个编号。」', en: 'GIVE ME A NUMBER', goto: 'e_roster', flag: { final: 'roster' } },
      { cn: '「别写我的名字。我不想被记下来。」', en: 'DO NOT WRITE ME DOWN', goto: 'e_unnamed', flag: { final: 'unnamed' } },
      { cn: '「我不知道。但我不想再有人替我死。」', en: 'NO ONE ELSE DIES', goto: 'e_together', flag: { final: 'together' } }
  ]},

  /* ---- 结算：最终选择 × 信任 × 关注度 ---- */
  { t: 'label', v: 'e_roster' },
  { t: 'if', k: 'trust', op: '>=', v: 4, goto: 'end_roster', else: 'end_specimen' },

  { t: 'label', v: 'e_unnamed' },
  { t: 'if', all: [{ k: 'expose', op: '>=', v: 5 }, { k: 'trust', op: '<=', v: 2 }],
    goto: 'end_specimen', else: 'end_unnamed' },

  { t: 'label', v: 'e_together' },
  { t: 'if', k: 'trust', op: '>=', v: 4, goto: 'end_roster' },
  { t: 'if', all: [{ k: 'expose', op: '>=', v: 5 }, { k: 'trust', op: '<=', v: 2 }],
    goto: 'end_specimen', else: 'end_unnamed' },

  /* ================= 结局 A · 名册 ================= */
  { t: 'label', v: 'end_roster' },
  { t: 'fx', do: 'particles', arg: 'dust' },
  { t: 'say', who: 'mark', text: '……行。' },
  { t: 'say', who: 'mark', text: '我给你担保。出了事，算我的。' },
  { t: 'say', who: 'salt', emo: 'surprise', text: '你不怕我就是灯塔要烧掉的那种「例外」？' },
  { t: 'say', who: 'mark', text: '怕。' },
  { t: 'say', who: 'mark', text: '但我更怕再有人从名册上被划掉，而没人记得他叫什么。' },
  { t: 'bg', v: 'tower' },
  { t: 'hud', sync: 81, bpm: 74, ticker: 'calm' },
  { t: 'say', who: 'sys', text: '录入中……生物特征：无匹配。基因档案：无记录。' },
  { t: 'say', who: 'sys', text: '编外序列已生成：<span class="hl">R-0000</span>。担保人：猎荒者 马克。' },
  { t: 'say', who: 'narr', v: 'na_01', text: '那天起，灯塔的名册上多了一行字。' },
  { t: 'say', who: 'narr', v: 'na_02', text: '没有姓名，只有编号。可你第一次觉得，自己是被写下来的那种存在。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: 'R-0000。……听起来像个开始。' },
  { t: 'end', v: 'roster' },

  /* ================= 结局 B · 样本 ================= */
  { t: 'label', v: 'end_specimen' },
  { t: 'fx', do: 'danger', arg: true },
  { t: 'fx', do: 'glitch', arg: 620 },
  { t: 'say', who: 'sys', text: '<span class="rd">通告：A-7 区检测到不可归类生命体。执行「回收」协议。</span>' },
  { t: 'say', who: 'salt', emo: 'fear', text: '回收……是什么意思？' },
  { t: 'say', who: 'mark', text: '……别动。' },
  { t: 'say', who: 'narr', text: '他挡在你前面。可这一次拦住他的不是噬极兽，是一份盖了章的调令。' },
  { t: 'say', who: 'mark', text: '她是我带下去的人。' },
  { t: 'say', who: 'sys', text: '记录显示：该个体无编号、无担保、无法归类。已列入研究序列。' },
  { t: 'say', who: 'narr', text: '马克的手停在半空，最后什么也没说。' },
  { t: 'say', who: 'narr', text: '他到底不是灯塔的例外——他只是一个还在名册上的人。' },
  { t: 'fx', do: 'flash', arg: 'red' },
  { t: 'say', who: 'narr', v: 'nb_01', text: '名册上依然没有你。' },
  { t: 'say', who: 'narr', v: 'nb_02', text: '但另一份档案上有：编号 S-11，样本，来源不明，暂缓销毁。' },
  { t: 'say', who: 'salt', emo: 'hurt', text: '（原来比「什么都不是」更糟的，是什么都不是，却被看见了。）' },
  { t: 'end', v: 'specimen' },

  /* ================= 结局 C · 无名 ================= */
  { t: 'label', v: 'end_unnamed' },
  { t: 'say', who: 'mark', text: '……你想清楚了。' },
  { t: 'say', who: 'salt', emo: 'resolve', text: '名册是用来管人的。我不想一来就先学会被管。' },
  { t: 'say', who: 'mark', text: '地面会吃了你。' },
  { t: 'say', who: 'salt', emo: 'idle', text: '它今天试过了。它看不见我。' },
  { t: 'say', who: 'narr', text: '他看了你很久，最后把战术带上的手电解下来，塞进你手里。' },
  { t: 'say', who: 'mark', text: '两周后，同一个坐标，我会再下来一次。' },
  { t: 'say', who: 'mark', text: '——你要是还在，我就当没见过你。' },
  { t: 'char', v: null },
  { t: 'say', who: 'narr', text: '升降舱升上去的时候，光柱在雾里越缩越小，最后只剩一个针尖。' },
  { t: 'say', who: 'narr', v: 'nr_03', text: '灯塔的名册上没有你。' },
  { t: 'say', who: 'narr', v: 'nr_04', text: '但从这一刻起，<span class="hl">这个世界记住了你</span>。' },
  { t: 'end', v: 'unnamed' }
];

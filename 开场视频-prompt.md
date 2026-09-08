# 《笼中异色》开场穿越 · 视频生成 Prompt

> 用途：生成开场过场视频，替换现有 CSS 版开场动画，直接嵌入 `linglong-vn/assets/video/`。
> 关键：**投喂时把 Salt 立绘（角色1.png）作为角色参考图一起上传**，锁定人物形象最稳。

---

## 一、角色 & 风格锁定（放在 prompt 最前，务必保留）

**主角 Salt（唯一人物，形象绝对不能变）**：
一位银灰色蓬松短发的少年（男性、青少年，不是女生、不是长发），额前有碎刘海、头顶一根翘起的呆毛；淡紫罗兰色眼瞳，中性清秀的少年脸；身穿黑色高领打底 + 黑色机能长风衣，风衣领口、门襟、下摆有发光的紫色雷电纹路，衣身有多个口袋、扣带与银色金属卡扣；戴黑色露指手套，手上缠绕蓝紫色电弧；黑色紧身裤配黑色长靴。

**画风**：日式赛璐璐动画质感（anime cel-shading），锋利有力的线条 + 硬边阴影色块，类似高质量番剧 OP / Persona 过场动画；电影级运镜与光影。

**配色**：强限定——饱和电光紫罗兰为主色，纯黑、亮白高光，少量腥红作为爆点；银灰短发在强光下偏亮白，瞳孔与雷电辉光是发光的洋红紫。

**世界观**：末世科幻，参考《灵笼》——悬浮在废土上空的巨型灯塔（Mana 生态、噬极兽横行的地面世界）。少年是从现实世界坠入这个世界的"无档案者"。

---

## 二、分镜脚本（总时长约 16–18 秒，16:9 横屏）

**镜头 1 · 画室 · 0:00–0:04**
现实世界深夜的画室，暖黄台灯，空气里浮着细小尘埃。少年 Salt 背对/侧对镜头，手持画笔给一幅巨大油画收最后一笔。镜头缓缓推近画布——画里是一座他从没去过的巨型灯塔矗立在废墟之上。运镜：缓慢 dolly-in，浅景深，暖色调，安静。

**镜头 2 · 裂隙 · 0:04–0:07**
画布正中央毫无预兆地裂开一道发光的紫色裂缝，裂缝迸出白紫色强光，油画表面像玻璃一样龟裂、碎片向外飞散并悬浮。少年惊愕后仰、抬手遮挡。运镜：轻微手持晃动 + 快速推进，紫光爆闪，暖色瞬间被紫色吞没。

**镜头 3 · 坠落 · 0:07–0:12**
画面切入一条紫色漩涡虫洞。少年 Salt 完整身形（头到脚）在失重中向下坠落、风衣与短发被气流掀起，身体缓慢翻转，四周环绕旋转的紫色能量光环与游丝般的白色速度线，偶有蓝紫电弧闪过。运镜：环绕 + 下坠跟拍，强烈纵深感，紫黑主调、边缘发光。

**镜头 4 · 灯塔降临 · 0:12–0:18**
少年穿出漩涡，坠向《灵笼》世界：镜头拉开，露出悬浮在末世废土上空的巨型灯塔剪影，紫色雾气与腥红余晖弥漫，远处有玛娜生态的诡异植物废墟。少年在半空稳住身形、缓缓睁眼，掌心迸发一缕紫色电弧，眼神从茫然转为坚定。运镜：大幅度 pull-back 展开全景 → 定格在少年剪影与灯塔同框的英雄镜头，画面渐暗收尾（留出可衔接标题的黑场）。

---

## 三、技术规格（生成时按这个设置）

- **画幅**：16:9 横屏（1920×1080 或更高）
- **时长**：15–18 秒
- **收尾**：最后 0.5 秒渐暗到黑场，方便游戏里衔接标题
- **不要烧录任何文字 / 字幕 / logo / 水印**（字幕由游戏叠加）
- **音频**：可有可无（游戏端可静音播放）；如带声，用低频轰鸣 + 电流声 + 一声心跳即可
- 导出 **mp4 (H.264)**，我这边直接放进 `assets/video/` 挂到开场节点

---

## 四、可整体复制版（中文，一段式）

```
日式赛璐璐动画质感、电影级运镜的末世科幻过场短片，16:9 横屏，约16秒，无任何文字字幕。
主角 Salt：银灰色蓬松短发的少年（男性青少年，短发，头顶有呆毛），淡紫罗兰色眼瞳，黑色高领打底加黑色机能长风衣，风衣领口门襟下摆有发光的紫色雷电纹路和银色金属卡扣，戴黑色露指手套、手上缠绕蓝紫色电弧，黑紧身裤黑长靴。强限定配色：饱和电光紫罗兰为主，纯黑与亮白高光，少量腥红点缀。
剧情连贯：①深夜暖黄台灯的画室里，少年给一幅画着巨型灯塔的油画收最后一笔，镜头缓缓推近；②画布正中裂开发光的紫色裂缝、白紫强光爆闪、油画碎片飞散悬浮，少年惊愕后仰抬手遮挡；③少年完整身形坠入紫色漩涡虫洞，失重翻转下坠，风衣短发被气流掀起，四周旋转的紫色能量光环与白色速度线、蓝紫电弧；④少年穿出漩涡坠向末世世界，镜头拉开露出悬浮在废土上空的巨型灯塔剪影、紫雾与腥红余晖，少年在半空稳住身形缓缓睁眼、掌心迸发紫色电弧、眼神转为坚定，画面渐暗收尾。
运镜依次为：缓慢推近 → 手持晃动快速推进配紫光爆闪 → 环绕下坠跟拍 → 大幅度拉开全景定格英雄镜头。
```

## 五、English one-shot 版（多数视频模型对英文更友好）

```
Cinematic anime cel-shaded post-apocalyptic sci-fi intro, 16:9, ~16s, NO text or subtitles or logo.
Character "Salt" (keep identity consistent): a teenage BOY with fluffy silver-grey SHORT hair (with a small ahoge cowlick), light violet eyes, wearing a black high-collar top under a black techwear long trench coat with glowing purple lightning trim and silver metal buckles, black fingerless gloves crackling with blue-violet electric arcs, black pants and boots. Strict palette: saturated electric violet as the dominant color, pure black, bright white highlights, small crimson accents.
Continuous story: (1) In a quiet late-night art studio lit by a warm desk lamp, the boy adds the final brushstroke to a large oil painting of a giant tower; slow dolly-in. (2) A glowing purple rift tears open across the canvas, blinding white-violet light bursts out, the painting shatters into floating fragments, the boy recoils and shields his face. (3) The boy's full body falls into a swirling purple wormhole, weightless and tumbling, coat and hair blown by the wind, surrounded by rotating violet energy rings, white speed lines and electric arcs. (4) He bursts out of the vortex toward a post-apocalyptic world; camera pulls back to reveal a colossal tower floating above wasteland ruins amid purple fog and crimson haze; the boy stabilizes in mid-air, slowly opens his eyes, purple electricity sparks from his palm, his gaze turning determined; fade to black.
Camera: slow push-in → handheld fast push with purple flash → orbiting falling tracking shot → wide pull-back to a hero freeze frame.
```

---

发我视频后，我会把它接到 NEW GAME 的开场节点（保留"跳过"按钮），并在关键处叠上原有的中文字幕。

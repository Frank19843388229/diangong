# 电工安全作业虚拟实训平台（纯前端版）

低压电工作业**实操考试全真模拟**训练平台。对标 2026 年版低压电工作业实操考试题库，覆盖安全用具使用、作业现场安全隐患排除、安全操作技术、作业现场应急处置四大科目，共 **13 个关卡**（12 个可用 + 1 个待定）。

技术栈：**Vue 3 + Vite + Pinia + Vue Router + Capacitor**。
纯前端应用：**无后端、无接口请求**，所有数据保存在浏览器本地（Web 端 localStorage / App 端 Capacitor Preferences），打开即用、即开即练。

---

## 目录

- [功能特性](#功能特性)
- [关卡体系](#关卡体系)
- [快速开始](#快速开始)
- [项目脚本](#项目脚本)
- [目录结构](#目录结构)
- [页面与路由](#页面与路由)
- [本地数据](#本地数据)
- [移动端适配](#移动端适配)
- [拖拽与投放判定](#拖拽与投放判定)
- [App（Capacitor）适配](#appcapacitor适配)
- [开发约定](#开发约定)

---

## 功能特性

- **启动落地页**：加载完成先进首页（品牌 + 通关进度 + 「开始训练」），点按钮才进选关，不直接冲进关卡列表。
- **全真评分体系**：每关满分 100 分，80 分合格；存在「安全不合格项」的关卡实行**一票否决**（`fatal: true`）。
- **考核计时**：按真实考试时长设限（10~50 分钟/关），交卷即出成绩，计时中断不归零。
- **四大科目覆盖**：从安全工器具、仪表使用，到配电箱/电能表/电动机控制电路接线、配电柜维护、临时用电搭设，再到应急处置。
- **零门槛**：无登录、无注册、无鉴权守卫；进度与成绩持久化在本机。
- **多端运行**：PC 浏览器直接开练；移动端横屏全屏适配、登杆无键盘操作；可打包为 Android App。
- **原生体验**：开屏 Frank 品牌动画、首次启动隐私授权、沉浸式全屏（隐藏状态栏/导航栏）、Android 物理返回键接管、重大失误倒计时弹窗。

---

## 关卡体系

关卡元数据定义在 [`src/data/levels.js`](src/data/levels.js)，与低压电工作业实操考试题库（2026 年版）对应。

| 科目 | 内容 | 关卡 |
| --- | --- | --- |
| 科目一 | 安全用具使用 | K11-01 ~ K11-04（安全工器具与仪器仪表的使用） |
| 科目二 | 作业现场安全隐患排除 | K21-01（作业现场风险隐患辨识） |
| 科目三 | 安全操作技术 | K31-01 ~ K31-05（配电箱 / 电能表 / 电动机单向·点动·正反转 / 电流互感器电路接线）、K32-01（配电柜运行维护）、K33-01（临时用电搭设） |
| 科目四 | 作业现场应急处置 | K41-01（题库未提供具体试题，`pending` 占位） |

**评分口径**：每关 `time`（时长·分钟）、`score`（总分 100）、`pass`（合格分 80）、`fatal`（是否一票否决）。

> 科目四（K41-01）当前为占位关卡，`pending: true`，不计入有效关卡总数。

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 80，自动打开浏览器）
npm run dev

# 生产构建（输出到 dist/，可部署到任意静态服务器或 file:// 直接分发）
npm run build

# 本地预览生产产物
npm run preview

# 持久化链路自检
npm run check
```

> **为什么用 hash 路由**：`#/`、`#/dashboard`、`#/game/6`、`#/privacy` 不依赖服务端「未知路径回退 index.html」，`file://` 直接分发、Capacitor WebView 冷启动深链、任意静态服务器都能打开。

---

## 项目脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（Vite，端口 80） |
| `npm run build` | 生产构建，产物输出到 `dist/` |
| `npm run preview` | 预览生产产物 |
| `npm run check` | Pinia 持久化链路自检（localStorage 写入、刷新水合、场次清理） |

---

## 目录结构

```
src/
├── components/
│   ├── gane/                    # 关卡组件
│   │   ├── Level1.vue ~ Level4.vue          # 登杆主线（科目三接线类）
│   │   ├── K2101.vue                        # 科目二：风险隐患辨识
│   │   ├── K3101.vue ~ K3105.vue            # 科目三：各类接线
│   │   ├── LowVoltageCabinetMaintenance.vue # 科目三：低压配电柜运行维护
│   │   └── TemporaryPowerConstruction.vue   # 科目三：施工现场临时用电搭设
│   ├── Home.vue                 # 落地页（启动首屏，「开始训练」进选关）
│   ├── dashboard.vue            # 选关 / 进度页
│   ├── GameWrapper.vue          # 关卡容器（开局、计时、HUD、交卷）
│   ├── FatalExitDialog.vue      # 重大失误弹窗（倒计时返回选关）
│   ├── ExitConfirmDialog.vue    # 退出确认（落地页按返回键时弹出）
│   ├── PrivacyPolicy.vue        # 隐私政策页（#/privacy）
│   ├── PrivacyConsentDialog.vue # 首次启动隐私同意弹窗（不同意不可用）
│   └── SplashScreen.vue         # 开屏加载页（Frank logo，约 2.2s 淡出）
├── composables/
│   ├── levelAttempt.js          # 本机场次：开考、交卷、本地判定记进度
│   ├── fatalExit.js             # 重大失误退出：全局弹窗状态 + 触发/复位
│   ├── privacyConsent.js        # 隐私同意状态：初始化检查 / 同意记录
│   ├── exitConfirm.js           # 退出确认状态
│   ├── stageFit.js              # 舞台缩放与全屏几何（--s / --panel-* / --vp-* …）
│   └── gameFs.js                # 全屏铺满状态机 + 拖拽让位（initDragVeil）
├── lib/
│   ├── appStorage.js            # 统一持久化：App 走 Preferences，Web 走 localStorage
│   ├── backButton.js            # Android 物理返回键接管（仅原生端）
│   └── dropTarget.js            # 拖拽投放判定（容差 + 最近优先）
├── stores/                      # Pinia：attempt（场次）/ progress（进度）
├── data/
│   └── levels.js                # 关卡元数据（分值、合格线、一票否决）
├── router/
│   └── index.js                 # hash 路由（/、/dashboard、/game/:level、/privacy）
├── styles/
│   └── mobile.css               # 全局移动端覆盖样式（含全屏纯净模式）
├── App.vue
└── main.js                      # 应用入口（Pinia→Router→返回键→持久化预热→mount→适配初始化）
```

---

## 页面与路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | `Home.vue` | 落地页：品牌 + 已通关进度 + 「开始训练」→ `/dashboard` + 隐私入口 |
| `/dashboard` | `dashboard.vue` | 选关：4 个科目 13 张关卡卡片 + 通电进度线 |
| `/game/:level` | `GameWrapper.vue` | 关卡：按编号挂载对应组件，内含「开始训练 / 玩法 / 结算」三态 |
| `/privacy` | `PrivacyPolicy.vue` | 隐私政策（合规入口，可滚动长文档） |
| `*` | → `/` | 未知路径兜底回落地页 |

每个关卡组件内部用 `screen = 'title' | 'play' | 'results'` 切换三个阶段，开始界面是关卡内的 `.overlay > .panel-box` 遮罩，不是独立路由。

---

## 本地数据

统一持久化封装在 [`src/lib/appStorage.js`](src/lib/appStorage.js)：**App 端走 Capacitor Preferences（SharedPreferences，进程被杀不丢），Web 端回落 localStorage**。

| Key | 位置 | 内容 |
| --- | --- | --- |
| `progress` | localStorage / Preferences | 通关记录 `{ passed: { 关卡号: 最好成绩 } }`，交卷时按 `levels.js` 的 `pass` 合格线判定 |
| `attempt` | localStorage / Preferences | 当前考试场次 `{ attemptId, level }`，本机生成场次号；刷新/进程恢复不重开、计时不归零。**不能用 sessionStorage**：Android WebView 进程被系统回收时会清空 |
| `privacy` | localStorage / Preferences | 隐私政策同意记录（`'1'` = 已同意）；未同意时首次启动弹窗，不同意不可使用，清除数据后重新询问 |

持久化预热（`preloadStorage`）必须在 `app.mount` 之前完成：store 创建即同步读 storage，读不到会用初始值（可能覆盖旧成绩）。

---

## 移动端适配

### 舞台缩放（`src/composables/stageFit.js`）

- 舞台固定 **960×640**，等比缩放：根元素写入 `--s`（≤1），`mobile.css` 用 `transform: scale(var(--s))`。
- 全屏关卡页改为**宽高双向 contain**（`fsFit`）并居中，画布尽量铺满整屏。
- 所有派生值（`--s-inv`、`--panel-*`、`--vp-*`、`--dvh`、`--panel-fold-top`）都在 JS 里算好写成带 `px` 的自定义属性：**老 Android WebView 不支持 `calc(var(--s) * Npx)` 这类表达式**，CSS 只读现成值。

### 视口值的可靠性

- `viewportSize()` 用 `documentElement` 的可见尺寸**夹住** `visualViewport` 的上报值：部分 WebView/模拟器会按物理像素上报，导致 `--dvh` 偏大，任务面板会被按"更高的屏幕"居中、底部切掉且滚不动。
- `schedule()` 每次变更都算三轮（立即 + 下一帧 + 120ms），并监听 `resize` / `orientationchange` / `fullscreenchange` / `visualViewport` / `visibilitychange` / `pageshow`，外加 `ResizeObserver(documentElement)` 兜底。

### 全屏纯净模式（`src/composables/gameFs.js` + `mobile.css`）

进入关卡自动全屏 + 锁横屏（best-effort），并切到 `html.game-fs`：

- 隐藏画布外所有文字（任务面板 / 横幅 / 消息 / HUD），只留画布；左上角圆形 `‹` 返回、右下角 `☰` 呼出任务面板浮层。
- 任务面板浮层用视口居中卡片（`--panel-w/h/left/top`），并带暗纱。
- **拖拽时让位**：按住拖拽物 → 浮层与暗纱一起消失，画布上的投放区完全露出，松手自动恢复（`initDragVeil`）。例外：任务12「安全标识」的托盘与分类区同在一个面板内，该面板标 `.sheet-inline` 不隐藏，否则 `getBoundingClientRect()` 归零、永远投不中。
- **「收起」折叠**：浮层收成贴底 48px 横条（`--panel-fold-top`，主动让开右下角 ☰），展开恢复整卡。
- 选关页与落地页同样是横屏全屏，但加 `html.dashboard-fs`（**保留全部文字**），与关卡页的纯净模式互斥。

### 反向缩放的几何约定

小屏下面板/弹窗/结算卡用 `scale(var(--s-inv))` 把字号还原成 1:1（组合缩放 = 1）。此时有两种定位方式，**原点必须与定位方式配对**：

| 定位方式 | 必须的 `transform-origin` |
| --- | --- |
| 靠 JS 预算好的 `top` / `left` 精确定位（如 `.sheet`） | `top left` |
| 靠 flex 居中（如 `.overlay .panel-box`、`.modal-mask .modal`） | **`center center`** |

若居中卡片用了 `top center`，`s < 1` 时会"以顶边为原点向下长"，矮屏上底部被切且内容不溢出、滚不动（按钮点不到）。

---

## 拖拽与投放判定

- **拖拽**（各关卡的 `startDrag`）：按下时把元素临时挂到 `document.body` 并 `position: fixed`，按视口坐标跟随手指，避免被面板 `overflow` 裁剪、也不受舞台缩放影响；松手后按缩放比换算放回原容器。
- **投放判定**（[`src/lib/dropTarget.js`](src/lib/dropTarget.js)）：可视目标之外放宽 **34 视觉像素**的容差，手机上不必精确压在框内。多目标相邻时按「离中心最近」选择，避免放宽后互相抢判定。

| 目标类型 | 判定方式 |
| --- | --- |
| 作业区 / 标示位置 / 测试区（Level1~4） | `hitElId`：元素矩形容差 |
| 安全标识分类区 | `nearestElId`：小容差（10px）+ 最近格 |
| 元件安装槽位（K31 系） | `nearestBox`：容差按缩放比换算成画布单位 + 最近槽 |
| 隐患点铭牌（K21-01） | `nearestPoint`：半径 + 容差 + 最近点 |

---

## App（Capacitor）适配

Capacitor 配置见 [`capacitor.config.json`](capacitor.config.json)：`appId` `com.example.diangong`，`appName` `电工培训`，`webDir` `dist`。

- **hash 路由**：不依赖服务端「未知路径回退」，`file://` 直接分发；Capacitor WebView 冷启动深链、任意静态服务器都能打开。
- **横屏**：`AndroidManifest.xml` 的 `android:screenOrientation="landscape"`。
- **沉浸式全屏**（`MainActivity.java`）：`setDecorFitsSystemWindows(false)` + 隐藏 `systemBars` + 上滑可临时唤出，并在 `onWindowFocusChanged` 重新进入。**Web 层的 `requestFullscreen()` 在 Android WebView 里对普通元素无效**，真机全屏必须在原生侧做。
- **SystemBars 配置**：`plugins.SystemBars.insetsHandling = "disable"`。Capacitor 默认会把 `systemBars | displayCutout` 的 inset 当成 WebView 的 padding，横屏时左侧挖孔会留出约 64px 空白（露出浅色窗口底）；沉浸式由原生接管后必须关掉它。
- **物理返回键**（`src/lib/backButton.js`，仅原生端接管）：层级为 **关卡 → 选关 → 落地页 → 退出确认**；重大失误弹窗 / 关卡内 → 回选关页。
- **重大失误弹窗**（`FatalExitDialog.vue`）：切后台暂停倒计时、回前台续跑；跳转失败时兜底改 `location.hash`；带安全区 `env(safe-area-inset-*)` 与小屏字号 / 触控目标适配。
- **存储**：App 端走 Capacitor Preferences（进程被杀不丢），Web 端回落 localStorage。
- **首次启动隐私弹窗**（`PrivacyConsentDialog.vue` + `privacyConsent.js`）：未同意前全局覆盖所有页面；同意记录持久化（`privacy` 键）；原生端「不同意」直接退出 App。
- **开屏加载页**（`SplashScreen.vue`）：启动时全屏展示 Frank 品牌 logo（SVG 内嵌呼吸/下划线生长动画），约 2.2s 后淡出；首次启动先于隐私弹窗。

**打包（Windows）**：

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`（debug 签名，安装需允许「未知来源」）。

> 也可用 Android Studio 打开 `android/` 构建。正式分发需自行配置 release 签名后执行 `assembleRelease`。

---

## 开发约定

- 依赖：`vue`、`vue-router`、`pinia`、`pinia-plugin-persistedstate`、`@capacitor/*`。
- 入口顺序（`main.js`）：先装 Pinia（路由 redirect/守卫可能用 store）→ 再装 Router → `setupBackButton` → `preloadStorage` 预热 → `app.mount` → `initStageFit` / `initDragVeil`。
- **新增关卡**：在 `src/data/levels.js` 登记元数据，在 `src/components/gane/` 下新增组件，并在 `GameWrapper.vue` 的 `LEVEL_COMPONENTS` 里按编号注册。
- **新增拖拽投放**：复用 `src/lib/dropTarget.js` 的 `hitElId` / `nearestElId` / `nearestBox` / `nearestPoint`，不要写裸的矩形包含判断——否则手机上又会变回"差一点投不中"。
- **新增居中浮层/卡片**：若用 `scale(var(--s-inv))` 且靠 flex 居中，`transform-origin` 必须是 `center`；靠 `top/left` 精确定位的才用 `top left`。
- 所有 CSS 派生尺寸走 JS 预计算的自定义属性，避免在老 Android WebView 上使用 `calc()` 混合运算。

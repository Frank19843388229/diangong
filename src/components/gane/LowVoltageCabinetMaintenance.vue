<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K32-01 · 低压配电柜的运行维护</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>状态 <b>{{ stateText }}</b></span>
      <span>失误 <b>{{ mistakes }}</b></span>
      <span>违规 <b>{{ violations.length }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas
          ref="canvasRef" width="960" height="640"
          :style="{ cursor: canvasCursor }"
          @click="onCanvasClick" @pointermove="onCanvasMove" @pointerleave="onCanvasLeave"
        ></canvas>

        <div class="banner" v-if="screen === 'play'">
          <b>任务 {{ phase + 1 }}/6 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⚠ 检测到严重安全风险 —— 任务暂停，请重新执行安全操作</div>

        <!-- 任务面板 -->
        <div class="panel">
          <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 2 || phase === 4, folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

            <div v-show="sheetOpen" class="fold-area">
              <!-- 任务1：运行巡视 -->
              <div v-if="phase === 0" class="sheet-body">
                <h3>任务 1：低压配电柜运行巡视（20分）</h3>
                <p class="tip">按 <b>① 外观 → ② 仪表 → ③ 环境</b> 顺序巡视：点击场景中 <b>1~12 号检查点</b>，<b>或直接点击下方清单项</b>完成记录；全部完成后记录异常点（点击场景红色标记或「记录异常点」按钮），再提交巡视记录。</p>
                <div class="grid3">
                  <div class="grp">
                    <div class="glabel">① 外观检查（{{ groupDone('look') }}/4）</div>
                    <div v-for="it in lookItems" :key="it.no" class="chk" :class="{ sel: it.done }" @click="clickInsp(it)">
                      {{ it.done ? '√' : '□' }} {{ it.no }}. {{ it.name }}
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">② 仪表检查（{{ groupDone('meter') }}/4）</div>
                    <div v-for="it in meterItems" :key="it.no" class="chk" :class="{ sel: it.done, hot: it.hot && it.done }" @click="clickInsp(it)">
                      {{ it.done ? '√' : '□' }} {{ it.no }}. {{ it.name }}
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">③ 环境检查（{{ groupDone('env') }}/4）</div>
                    <div v-for="it in envItems" :key="it.no" class="chk" :class="{ sel: it.done }" @click="clickInsp(it)">
                      {{ it.done ? '√' : '□' }} {{ it.no }}. {{ it.name }}
                    </div>
                  </div>
                </div>
                <div class="row">
                  <button class="btn" :disabled="!inspAll || anomaly.done" @click="recordAnomaly">
                    {{ anomaly.done ? '已记录异常点' : '记录异常点（补偿柜温度异常）' }}
                  </button>
                  <button class="btn primary" :disabled="!anomaly.done" @click="submitInspection">提交巡视记录</button>
                  <span class="hint">进度 {{ inspDone }}/12 · 异常 {{ anomaly.done ? '已记录' : '未记录' }}</span>
                </div>
                <p class="status">系统反馈：巡视完成 → 发现异常点 <b>无功补偿柜温度异常</b>（{{ anomaly.done ? '已记录 +4分' : '待记录' }}），请进入任务 2 用红外测温仪定位故障点。</p>
              </div>

              <!-- 任务2：红外测温 -->
              <div v-if="phase === 1" class="sheet-body">
                <h3>任务 2：红外测温查找故障点（20分）</h3>
                <p class="tip">启动红外线测温仪 → 选择 <b>热点搜索模式</b> → <b>移动鼠标</b>扫描补偿柜 <b>4 处重点区域</b>（电容器接线端子 / 接触器触点 / 熔断器连接处 / 母排连接处）→ 点击<b>异常热点</b>并提交测温记录。</p>
                <div class="row">
                  <button class="btn" :disabled="thermal.on" @click="powerThermal">启动测温仪</button>
                  <span class="cname">测量模式：</span>
                  <button v-for="m in TMODES" :key="m" class="opt" :class="{ sel: thermal.mode === m }" @click="setMode(m)">{{ m }}</button>
                  <span class="mtr" :class="{ on: thermal.on && thermal.mode === '热点搜索模式' }">
                    <span class="mtr-mode">{{ thermal.on ? (thermal.mode || '未设模式') : '电源关闭' }}</span>
                    <span class="mtr-read">{{ cursorT === null ? '---- ℃' : cursorT + ' ℃' }}</span>
                  </span>
                </div>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">重点扫描区域（{{ scanDone }}/4）</div>
                    <div v-for="f in FOCUS" :key="f.id" class="chk" :class="{ sel: f.done }" @click="clickScan(f)">
                      {{ f.done ? '√' : '□' }} {{ f.name }}<span class="sc-t">{{ f.done ? f.temp : '--' }}</span>
                    </div>
                    <p class="probe-tip">移动鼠标扫描到区域时自动记录，<b>也可直接点击清单项</b>；未启动测温仪或未设模式时无法扫描。</p>
                  </div>
                  <div class="grp">
                    <div class="glabel">测温记录</div>
                    <div class="rec">
                      <p>故障位置：<b :class="{ 'ok-c': thermal.rec }">{{ thermal.rec ? FAULT.name : '__________' }}</b></p>
                      <p>温度：<b :class="{ 'ok-c': thermal.rec }">{{ thermal.rec ? thermal.temp + ' ℃' : '__________' }}</b></p>
                      <p>判定：<b :class="{ 'ok-c': thermal.rec }">{{ thermal.rec ? '接触不良导致发热' : '待确认' }}</b></p>
                    </div>
                    <button class="btn primary" :disabled="!thermal.rec" @click="submitThermal">提交测温记录</button>
                  </div>
                </div>
              </div>

              <!-- 任务3：停电并排除故障 -->
              <div v-if="phase === 2" class="sheet-body">
                <h3>任务 3：停电操作并排除故障（30分 = 停电15 + 故障处理15）</h3>
                <p class="tip">必须按 <b>确认维修对象 → 断开负荷开关 → 断开电源开关 → 验电确认 → 挂牌警示</b> 顺序停电，<b>确认无电并挂牌</b>后方可打开补偿柜柜门检修（也可直接点击场景中的补偿柜开门）。</p>
                <div class="steps">
                  <button
                    v-for="(s, i) in SHUTDOWN_STEPS" :key="s.k" class="step"
                    :class="{ done: sd.step > i, next: sd.step === i }"
                    @click="doShutdown(i)"
                  >{{ sd.step > i ? '√' : i + 1 }}. {{ s.label }}<template v-if="s.pts">（{{ s.pts }}分）</template></button>
                </div>
                <p class="status">
                  运行状态：<i :class="{ off: power }">{{ power ? '带电' : '已断电' }}</i>
                  　验电：<i :class="{ off: !verified }">{{ verified ? '确认无电 √' : '未验电' }}</i>
                  　挂牌：<i :class="{ off: !tagged }">{{ tagged ? '已挂牌 √' : '未挂牌' }}</i>
                  　柜门：<i :class="{ off: !doorOpen }">{{ doorOpen ? '已打开' : '已关闭' }}</i>
                  　故障：<i :class="{ off: !repaired }">{{ repaired ? '已处理 √' : '接触不良发热（待处理）' }}</i>
                  　进度 {{ sd.step }}/{{ SHUTDOWN_STEPS.length }}
                </p>
                <p class="probe-tip"><b>× 未停电直接维修　× 未确认无电状态　× 跳过安全确认</b> —— 系统将判定「安全风险 · 禁止维修」并记为重大违规。</p>
              </div>

              <!-- 任务4：清洁除尘 -->
              <div v-if="phase === 3" class="sheet-body">
                <h3>任务 4：清洁除尘（10分）</h3>
                <p class="tip">先选择维护工具（<b>软毛刷 3 分 + 吸尘设备 3 分</b>），再点击柜内 <b>4 处清洁区域</b>（各 1 分）。<b>不得使用带水工具、不得损坏元件、不得改变线路</b>。</p>
                <div class="row">
                  <span class="cname">维护工具：</span>
                  <button v-for="t in TOOLS" :key="t.n" class="btn sm toolbtn" :class="{ sel: clean.tools.includes(t.n), bad: t.bad }" @click="pickTool(t)"><img v-if="imgUrl(t.n)" class="optthumb" :src="imgUrl(t.n)" alt="">{{ t.n }}</button>
                  <span class="hint">已选 {{ clean.tools.length }} 件</span>
                </div>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">清洁区域（{{ cleanDone }}/4）</div>
                    <div v-for="a in CLEAN_AREAS" :key="a.id" class="chk" :class="{ sel: a.done }" @click="clickClean(a)">
                      {{ a.done ? '√' : '□' }} {{ a.name }}
                    </div>
                    <p class="probe-tip">点击柜内对应位置清洁（柜门已在任务 3 打开），<b>也可直接点击清单项</b>。</p>
                  </div>
                  <div class="grp">
                    <div class="glabel">清洁记录</div>
                    <p class="probe-tip">工具：{{ clean.tools.length ? clean.tools.join('、') : '未选择' }}</p>
                    <p class="probe-tip">要求：干式清洁 · 避免振动损坏电容器 · 清洁后恢复柜内整齐。</p>
                    <p class="status status-inline">得分 {{ cats['清洁维护'].got }}/10</p>
                  </div>
                </div>
              </div>

              <!-- 任务5：送电 -->
              <div v-if="phase === 4" class="sheet-body">
                <h3>任务 5：送电操作（15分 = 送电前检查5 + 送电流程10）</h3>
                <p class="tip">先完成 <b>5 项送电前检查</b>，再按 <b>解除维修措施 → 合上电源开关 → 观察运行状态 → 确认设备正常</b> 顺序送电。<b>错误送电、未撤离工具强行送电、跳过安全保护步骤</b>均判定为重大违规。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">送电前检查（{{ preDone }}/5）</div>
                    <div v-for="it in PRECHECK" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkPre(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">送电流程（{{ pOn.step }}/{{ POWERON_STEPS.length }}）</div>
                    <button
                      v-for="(s, i) in POWERON_STEPS" :key="s.k" class="step"
                      :class="{ done: pOn.step > i, next: pOn.step === i }"
                      @click="powerStep(i)"
                    >{{ pOn.step > i ? '√' : i + 1 }}. {{ s.label }}<template v-if="s.pts">（{{ s.pts }}分）</template></button>
                  </div>
                </div>
                <p class="status">
                  电源：<i :class="{ off: !power }">{{ power ? '已送电' : '断电' }}</i>
                  　电流：<b>{{ power ? (repaired ? '58.4 A 正常' : '63.7 A') : '0.0 A' }}</b>
                  　温升：<b>{{ power ? (repaired ? '正常 38.2℃' : '异常 86.5℃') : '—' }}</b>
                  　功率因数：<b>{{ power ? (repaired ? '0.96 已恢复' : '0.82') : '—' }}</b>
                </p>
              </div>

              <!-- 任务6：整理场地 -->
              <div v-if="phase === 5" class="sheet-body">
                <h3>任务 6：整理场地（5分）</h3>
                <p class="tip">完成测温仪归位、工具归位、警示牌整理与工作区域清洁（5S），逐项确认后提交考核。</p>
                <div class="grid3">
                  <div v-for="it in TIDY" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkTidy(it)">
                    {{ it.done ? '√' : '□' }} {{ it.k }}
                  </div>
                </div>
                <div class="row">
                  <button class="btn primary" :disabled="tidyDone < TIDY.length" @click="finishLevel">完成整理，提交考核</button>
                  <span class="hint">已完成 {{ tidyDone }}/{{ TIDY.length }}（提交 +1 分）</span>
                </div>
                <p class="status">测温记录：{{ thermal.rec ? FAULT.name + ' · ' + thermal.temp + '℃' : '无' }}
                  　重大违规：{{ violations.length }} 次　操作失误：{{ mistakes }} 次</p>
              </div>
            </div>
          </div>
        </div>

        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">{{ Q.code }}</div>
            <h2>{{ Q.title }}</h2>
            <p class="sub">低压电工考证 · 运行维护实训 · 难度 ★★★★☆ · 6 项任务 · 满分 100 分</p>
            <div class="objs">
              <p>训练目标：对低压配电柜进行日常巡视，用<b>红外测温仪</b>发现补偿柜异常发热故障点，并按安全流程完成<b>停电 → 故障处理 → 清洁维护 → 送电</b>恢复。</p>
              <ul>
                <li>低压配电柜运行巡视（20）</li>
                <li>红外测温查找故障点（20）</li>
                <li>停电操作并排除故障（30）</li>
                <li>清洁除尘（10）</li>
                <li>送电操作（15）</li>
                <li>整理场地（5）</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 重大违规判定（立即停止任务）：带电打开柜体维修 · 未验电进行操作 · 错误送电 · 未撤离工具强行送电 · 跳过安全保护步骤。</p>
            <p class="ct-note">⚡ 停送电状态机：运行 → 停电申请 → 断电 → 验电 → 维修 → 检查 → 送电 → 运行，错误顺序将触发扣分或违规。</p>
            <p class="record-note">本关为 <b>K32 运行维护系列第一关</b>：从「会安装设备」进入「会管理运行设备」。</p>
            <div class="row center">
              <button class="btn primary big" @click="startGame">开始训练</button>
            </div>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">{{ Q.code }}</div>
            <h2>{{ Q.title }}</h2>
            <table class="score-table">
              <tr v-for="(c, k) in cats" :key="k">
                <td>{{ k }}</td>
                <td>{{ c.got }}/{{ c.max }}</td>
              </tr>
              <tr class="total"><td>最终成绩</td><td>{{ total }}/100</td></tr>
            </table>
            <div class="lv-stars">{{ '★'.repeat(stars) }}{{ '☆'.repeat(5 - stars) }}</div>
            <p class="verdict">{{ verdict }}</p>
            <div class="record-sec">
              <h4>测温记录</h4>
              <p v-if="thermal.rec">故障位置：{{ FAULT.name }}</p>
              <p v-if="thermal.rec">温度：{{ thermal.temp }} ℃（正常点约 40℃，判定：接触不良导致发热）</p>
              <p v-if="!thermal.rec">未记录故障点</p>
              <p>重点区域扫描：{{ scanDone }}/4</p>
            </div>
            <div class="record-sec">
              <h4>安全记录</h4>
              <p>重大违规：{{ violations.length }} 次</p>
              <p v-if="violations.length">· {{ violations.join('；') }}</p>
              <p>操作失误：{{ mistakes }} 次</p>
              <p>停送电流程：停电 {{ Math.min(sd.step, 5) }}/5 → 故障处理 {{ Math.max(0, Math.min(sd.step - 5, 5)) }}/5 → 送电 {{ pOn.step }}/4</p>
            </div>
            <div class="row center">
              <button class="btn primary" @click="restartRun">重新训练</button>
              <router-link to="/dashboard" class="btn">返回选关</router-link>
              <TrainingReport />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLevelAttempt } from '@/composables/levelAttempt'
import { useTrainingReport, resetTrainingReport } from '@/composables/trainingReport'
import { triggerFatalExit } from '@/composables/fatalExit'
import { imgUrl } from '@/assets/imgmap'
// 公共逻辑：音效、计时器、画布工具
import { useAudio } from '@/composables/game/audio.js'
import { useTimer } from '@/composables/game/timer.js'
import { line as canvasLine } from '@/utils/game/canvas.js'

// ================= 常量 =================
const W = 960, H = 640

// ================= 题库配置 =================
const Q = {
  code: '030101-K32-01',
  title: '低压配电柜的运行维护',
  supply: 'AC380V 50Hz',
  room: '低压配电室',
  target: { code: 'GGJ-1', name: '无功补偿柜', fault: '接线端子接触不良导致发热' },
}

const PHASES = [
  { name: '低压配电柜运行巡视', obj: '外观4 · 仪表4 · 环境4 · 记录异常点' },
  { name: '红外测温查找故障点', obj: '启动 → 模式 → 扫描4处重点区域 → 记录热点' },
  { name: '停电操作并排除故障', obj: '停电5步 → 验电挂牌 → 开门 → 故障处理4步' },
  { name: '清洁除尘', obj: '软毛刷 + 吸尘设备 · 4处清洁区域' },
  { name: '送电操作', obj: '送电前检查5项 → 送电流程4步' },
  { name: '整理场地', obj: '仪表工具归位 · 警示牌 · 区域清洁' },
]

const cats = reactive({
  '配电柜巡视': { got: 0, max: 20 },
  '故障定位': { got: 0, max: 20 },
  '停电维修': { got: 0, max: 30 },
  '清洁维护': { got: 0, max: 10 },
  '送电恢复': { got: 0, max: 15 },
  '现场整理': { got: 0, max: 5 },
})

// ================= 场景布局 =================
const CABS = [
  { id: 'in', name: '进线柜', code: 'GGD-1', x: 30, y: 70, w: 175, h: 300 },
  { id: 'out', name: '出线柜', code: 'GGD-2', x: 222, y: 70, w: 175, h: 300 },
  { id: 'cap', name: '无功补偿柜', code: 'GGJ-1', x: 412, y: 60, w: 243, h: 310 },
  { id: 'tool', name: '工具柜', code: 'GJ-01', x: 672, y: 68, w: 130, h: 140 },
]
const MEASURE = { x: 672, y: 230, w: 265, h: 140 }
const CAP = CABS[2]
// 柜内（柜门打开后）区域
const INT = { x: 416, y: 66, w: 235, h: 298 }

// ================= 任务1：巡视点 =================
// 巡视点：坐标需落在底部任务面板（y<334）上方的可视区域，避免被面板遮挡
const INS = reactive([
  { no: 1, g: 'look', name: '柜体是否完整', x: 118, y: 250, done: false },
  { no: 2, g: 'look', name: '柜门是否关闭', x: 308, y: 300, done: false },
  { no: 3, g: 'look', name: '标识是否清晰', x: 532, y: 80, done: false },
  { no: 4, g: 'look', name: '是否存在异常声音', x: 638, y: 286, done: false },
  { no: 5, g: 'meter', name: '电压表（400V）', x: 85, y: 130, done: false },
  { no: 6, g: 'meter', name: '电流表（63.7A）', x: 277, y: 130, done: false },
  { no: 7, g: 'meter', name: '功率因数表（0.82）', x: 468, y: 130, done: false, hot: true },
  { no: 8, g: 'meter', name: '指示灯状态', x: 172, y: 196, done: false },
  { no: 9, g: 'env', name: '柜周无遮挡', x: 213, y: 250, done: false },
  { no: 10, g: 'env', name: '无杂物堆放', x: 404, y: 250, done: false },
  { no: 11, g: 'env', name: '通风正常', x: 880, y: 140, done: false },
  { no: 12, g: 'env', name: '无明显异味', x: 455, y: 316, done: false },
])
const ANOM = { x: 556, y: 196, r: 30 }
const anomaly = reactive({ done: false })

// ================= 任务2：红外测温 =================
const TMODES = ['表面温度模式', '热点搜索模式']
const FOCUS = reactive([
  { id: 'bus', name: '母排连接处', x: 600, y: 92, r: 28, done: false, temp: 0 },
  { id: 'fuse', name: '熔断器连接处', x: 535, y: 135, r: 28, done: false, temp: 0 },
  { id: 'cont', name: '接触器触点', x: 470, y: 196, r: 28, done: false, temp: 0 },
  { id: 'cap', name: '电容器接线端子', x: 586, y: 168, r: 28, done: false, temp: 0 },
])
const FAULT = { name: '无功补偿柜 C2 电容器上接线端子', x: 586, y: 168, r: 30, t: 86.5 }
const thermal = reactive({ on: false, mode: '', modeDone: false, rec: false, temp: 0 })

// 温度场（℃）：正常点约 40~48，故障点约 87
const BLOBS = [
  { x: 600, y: 92, a: 12, s: 30 },
  { x: 535, y: 135, a: 16, s: 26 },
  { x: 470, y: 196, a: 14, s: 30 },
  { x: 586, y: 168, a: 56, s: 22 },
  { x: 542, y: 168, a: 7, s: 18 },
  { x: 630, y: 168, a: 7, s: 18 },
  { x: 586, y: 215, a: 6, s: 42 },
]
function tempAt(x, y) {
  let t = 30 + 1.8 * Math.sin(x / 37) * Math.cos(y / 41)
  for (const b of BLOBS) {
    const d2 = (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y)
    t += b.a * Math.exp(-d2 / (2 * b.s * b.s))
  }
  return t
}

// ================= 任务3：停电与故障处理 =================
const SHUTDOWN_STEPS = [
  { k: 'confirm', label: '确认维修对象', pts: 3 },
  { k: 'load', label: '断开负荷开关', pts: 3 },
  { k: 'source', label: '断开电源开关', pts: 3 },
  { k: 'test', label: '验电确认', pts: 3 },
  { k: 'tag', label: '挂牌警示', pts: 3 },
  { k: 'door', label: '打开补偿柜柜门', pts: 0 },
  { k: 'term', label: '检查连接端子', pts: 4 },
  { k: 'tight', label: '紧固松动连接', pts: 5 },
  { k: 'part', label: '检查元件状态', pts: 3 },
  { k: 'prot', label: '恢复保护装置', pts: 3 },
]
const sd = reactive({ step: 0 })

// ================= 任务4：清洁 =================
const TOOLS = [
  { n: '软毛刷', req: true },
  { n: '吸尘设备', req: true },
  { n: '干净棉布' },
  { n: '带水湿布', bad: true },
  { n: '钢丝刷', bad: true },
]
const CLEAN_AREAS = reactive([
  { id: 'dust', name: '柜内灰尘', x: 470, y: 254, r: 28, done: false },
  { id: 'part', name: '元件表面', x: 568, y: 210, r: 28, done: false },
  { id: 'vent', name: '通风区域', x: 600, y: 347, r: 24, done: false },
  { id: 'misc', name: '柜体内部杂物', x: 455, y: 347, r: 24, done: false },
])
const clean = reactive({ tools: [] })

// ================= 任务5：送电 =================
const PRECHECK = reactive([
  { k: '故障已排除', done: false },
  { k: '工具已撤离', done: false },
  { k: '柜门关闭', done: false },
  { k: '人员撤离', done: false },
  { k: '标识确认', done: false },
])
const POWERON_STEPS = [
  { k: 'untag', label: '解除维修措施', pts: 3 },
  { k: 'close', label: '合上电源开关', pts: 3 },
  { k: 'watch', label: '观察运行状态', pts: 2 },
  { k: 'ok', label: '确认设备正常', pts: 2 },
]
const pOn = reactive({ step: 0 })

// ================= 任务6：整理 =================
const TIDY = reactive([
  { k: '测温仪归位', done: false },
  { k: '工具归位', done: false },
  { k: '警示牌整理', done: false },
  { k: '工作区域清洁', done: false },
])

// ================= 模板引用 =================
const stageRef = ref(null)
const canvasRef = ref(null)
const ctx = ref(null)

// ================= 流程状态 =================
const screen = ref('title')
const phase = ref(-1)
const lock = ref(false)
const paused = ref(false)
const sheetOpen = ref(true)
const mistakes = ref(0)
const violations = ref([])
const power = ref(true)        // 电源状态
const verified = ref(false)    // 验电确认
const tagged = ref(false)      // 挂牌警示
const doorOpen = ref(false)    // 补偿柜柜门
const repaired = ref(false)    // 故障已处理
const toolsIn = ref(false)     // 柜内是否遗留工具
const cursor = reactive({ x: -99, y: -99, on: false })
const cursorT = ref(null)

const total = computed(() => Object.values(cats).reduce((a, c) => a + c.got, 0))

// 结算时向服务端交卷：由服务端校验考试时长与合格分，通过后才解锁下一关
const { reportResult } = useLevelAttempt()
const { noteIssue, attachReason } = useTrainingReport({
  step: () => phase.value + 1,
  stepName: () => PHASES[phase.value]?.name || '',
})
watch(screen, v => {
  if (v === 'play') resetTrainingReport()
  if (v === 'results') reportResult(total.value, { cats, mistakes: mistakes.value, violations: violations.value })
})
const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
const verdict = computed(() => {
  if (violations.value.length) return `存在重大安全违规 ${violations.value.length} 次，任务判定不合格，须重新训练`
  const t = total.value
  if (t >= 90) return '具备低压配电设备巡视维护与故障处理能力'
  if (t >= 80) return '基本具备配电柜运行维护能力，注意停送电顺序与验电确认'
  if (t >= 70) return '能够完成巡视与维护流程，但安全步骤存在漏项'
  return '低压配电柜运行维护能力不足，建议重新训练'
})
const stateText = computed(() => {
  if (screen.value !== 'play') return '—'
  if (power.value && doorOpen.value) return '停电检修'
  if (!power.value) return tagged.value ? '检修挂牌' : '已断电'
  return repaired.value ? '运行正常' : '带电运行'
})
const canvasCursor = computed(() => {
  if (phase.value === 1 && thermal.on) return 'crosshair'
  if (screen.value === 'play' && (phase.value === 0 || phase.value === 2 || phase.value === 3)) return 'pointer'
  return 'default'
})

// 派生进度
const lookItems = computed(() => INS.filter(i => i.g === 'look'))
const meterItems = computed(() => INS.filter(i => i.g === 'meter'))
const envItems = computed(() => INS.filter(i => i.g === 'env'))
const inspDone = computed(() => INS.filter(i => i.done).length)
const inspAll = computed(() => inspDone.value === INS.length)
const scanDone = computed(() => FOCUS.filter(f => f.done).length)
const cleanDone = computed(() => CLEAN_AREAS.filter(a => a.done).length)
const preDone = computed(() => PRECHECK.filter(i => i.done).length)
const preAll = computed(() => preDone.value === PRECHECK.length)
const tidyDone = computed(() => TIDY.filter(i => i.done).length)
function groupDone(g) { return INS.filter(i => i.g === g && i.done).length }

// ================= 音效（公共库） / 消息 / 计时 =================
const { beep } = useAudio()

const msgText = ref('')
const msgType = ref('')
let msgTimer = null
function showMsg(text, type = 'info') {
  attachReason(text)
  msgText.value = text
  msgType.value = type
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msgType.value = '' }, 3600)
}

// ================= 计时器（公共库） =================
const { later, setInterval: setInterval_, clearAll: clearTimers, reset: resetTimer } = useTimer()

// ================= 计分 =================
function addScore(cat, n) { cats[cat].got = Math.min(cats[cat].max, +(cats[cat].got + n).toFixed(1)) }
function penalize(cat, n) {
  cats[cat].got = Math.max(0, +(cats[cat].got - n).toFixed(1))
  mistakes.value++
  noteIssue(cat, n)
}
function majorViolation(reason, cat, penalty) {
  if (paused.value) return
  triggerFatalExit(reason)
  penalize(cat, penalty)
  violations.value.push(reason)
  showMsg(`检测到严重安全风险：${reason}（-${penalty} 分）`, 'bad')
  beep(120, .45, 'sawtooth')
  paused.value = true
  later(() => { paused.value = false; showMsg('请重新执行安全操作', 'info') }, 2600)
}
function enterPhase(i) {
  phase.value = i
  paused.value = false
  sheetOpen.value = true
  if (i >= 0 && i < PHASES.length) showMsg(`任务 ${i + 1}：${PHASES[i].name}`, 'info')
  if (i === 3) toolsIn.value = true
  if (i >= PHASES.length) screen.value = 'results'
}
function completePhase() {
  if (lock.value) return
  lock.value = true
  beep(880, .12)
  later(() => { lock.value = false; enterPhase(phase.value + 1) }, 1200)
}

// ================= 任务1：运行巡视 =================
function doInsp(it) {
  if (paused.value || lock.value || !it) return
  if (it.done) { showMsg(`第 ${it.no} 项已巡视：${it.name}`, 'info'); return }
  it.done = true
  addScore('配电柜巡视', 1)
  beep(700, .05)
  if (it.hot) showMsg(`✔ ${it.name} → 补偿柜功率因数偏低、温度显示 86.5℃，需重点检查　+1 分`, 'warn')
  else showMsg(`✔ 巡视：${it.name}　+1 分`, 'good')
}
// 面板清单项点击（与场景点击等效，避免检查点被任务面板遮挡）
function clickInsp(it) { doInsp(it) }
function hitInsp(p) {
  let best = null, bd = 26
  for (const it of INS) {
    const d = Math.hypot(p.x - it.x, p.y - it.y)
    if (d < bd) { bd = d; best = it }
  }
  if (best) { doInsp(best); return }
  // 异常标记
  if (inspAll.value && Math.hypot(p.x - ANOM.x, p.y - ANOM.y) <= ANOM.r) {
    recordAnomaly()
    return
  }
  showMsg('请点击场景中的 1~12 号检查点，或点击面板清单项完成巡视', 'info')
}
function recordAnomaly() {
  if (paused.value || lock.value || anomaly.done) return
  if (!inspAll.value) { showMsg(`请先完成全部 12 项巡视（已完成 ${inspDone.value}/12）`, 'warn'); return }
  anomaly.done = true
  addScore('配电柜巡视', 4)
  beep(520, .14)
  showMsg('巡视完成 —— 发现异常点：无功补偿柜温度异常（+4 分）', 'warn')
}
function submitInspection() {
  if (paused.value || lock.value) return
  if (!inspAll.value) { showMsg(`请先完成全部巡视项目（${inspDone.value}/12）`, 'warn'); return }
  if (!anomaly.done) { showMsg('请先记录异常点：补偿柜温度异常', 'warn'); return }
  addScore('配电柜巡视', 4)
  showMsg('✔ 巡视记录已提交，进入红外测温定位故障点', 'good')
  completePhase()
}

// ================= 任务2：红外测温 =================
function powerThermal() {
  if (paused.value || lock.value || thermal.on) return
  thermal.on = true
  buildThermal()
  addScore('故障定位', 2)
  beep(760, .08)
  showMsg('✔ 红外线测温仪已启动，移动鼠标对补偿柜进行扫描', 'good')
}
function setMode(m) {
  if (paused.value || lock.value) return
  thermal.mode = m
  if (m === '热点搜索模式') {
    if (!thermal.modeDone) {
      thermal.modeDone = true
      addScore('故障定位', 2)
    }
    beep(760, .08)
    showMsg('✔ 已选择热点搜索模式，可定位异常高温点', 'good')
  } else {
    beep(200, .12, 'sawtooth')
    showMsg('当前为表面温度模式，不利于查找异常热点，建议切换「热点搜索模式」', 'warn')
  }
}
function doScan(f) {
  if (paused.value || lock.value || !f) return
  if (!thermal.on) { showMsg('请先启动红外线测温仪', 'warn'); return }
  if (!thermal.mode) { showMsg('请先设置测量模式（推荐热点搜索模式）', 'warn'); return }
  if (f.done) { showMsg(`「${f.name}」已扫描：${f.temp}℃`, 'info'); return }
  f.done = true
  f.temp = +tempAt(f.x, f.y).toFixed(1)
  addScore('故障定位', 2)
  beep(880, .06)
  showMsg(`✔ 已扫描「${f.name}」：${f.temp}℃　+2 分`, 'good')
}
// 面板清单项点击扫描（与鼠标扫描等效）
function clickScan(f) { doScan(f) }
function scanAt(x, y) {
  if (!thermal.on || !thermal.mode) return
  if (x < INT.x || x > INT.x + INT.w || y < INT.y || y > INT.y + INT.h) return
  for (const f of FOCUS) {
    if (!f.done && Math.hypot(x - f.x, y - f.y) <= f.r) doScan(f)
  }
}
function hitThermal(p) {
  if (!thermal.on) { showMsg('请先启动红外线测温仪', 'warn'); return }
  if (!thermal.mode) { showMsg('请先设置测量模式（推荐热点搜索模式）', 'warn'); return }
  if (Math.hypot(p.x - FAULT.x, p.y - FAULT.y) <= FAULT.r) {
    if (thermal.rec) { showMsg('异常热点已记录', 'info'); return }
    thermal.rec = true
    thermal.temp = +tempAt(FAULT.x, FAULT.y).toFixed(1)
    beep(520, .18, 'square')
    showMsg(`⚠ 发现异常热点 ${thermal.temp}℃：${FAULT.name}（接触不良导致发热）`, 'warn')
    return
  }
  if (p.x >= INT.x && p.x <= INT.x + INT.w && p.y >= INT.y && p.y <= INT.y + INT.h) {
    showMsg(`${+tempAt(p.x, p.y).toFixed(1)}℃ · 温度正常，未发现异常热点`, 'info')
  }
}
function submitThermal() {
  if (paused.value || lock.value) return
  if (!thermal.rec) { showMsg('请先点击异常热点并记录位置与温度', 'warn'); return }
  if (scanDone.value < FOCUS.length) {
    penalize('故障定位', 1)
    showMsg(`请完成 4 处重点区域扫描后再提交（已完成 ${scanDone.value}/4，-1 分）`, 'warn')
    return
  }
  addScore('故障定位', 8)
  showMsg(`✔ 测温记录：${FAULT.name} ${thermal.temp}℃ → 判定接触不良发热`, 'good')
  completePhase()
}

// ================= 任务3：停电与故障处理 =================
function openCabinet() {
  if (doorOpen.value) { showMsg('补偿柜柜门已打开', 'info'); return }
  if (power.value) {
    majorViolation('带电打开柜体维修：补偿柜仍处于带电运行状态', '停电维修', 6)
    return
  }
  if (!verified.value) {
    majorViolation('未验电进行操作：未确认无电状态即打开柜门', '停电维修', 6)
    return
  }
  if (!tagged.value) {
    majorViolation('跳过安全保护步骤：未挂警示牌即进入检修', '停电维修', 5)
    return
  }
  doorOpen.value = true
  sd.step = Math.max(sd.step, 6)
  beep(620, .1)
  showMsg('✔ 柜门已打开，补偿柜内部确认无电，可进行故障处理', 'good')
}
function doShutdown(i) {
  if (paused.value || lock.value) return
  const s = SHUTDOWN_STEPS[i]
  if (i < sd.step) { showMsg('该步骤已完成', 'info'); return }
  if (i > sd.step) {
    if (i >= 5) { openCabinet(); return }
    penalize('停电维修', 1)
    beep(200, .12, 'sawtooth')
    showMsg(`请按顺序操作：下一步「${SHUTDOWN_STEPS[sd.step].label}」（-1 分）`, 'warn')
    return
  }
  switch (s.k) {
    case 'confirm':
      addScore('停电维修', s.pts)
      sd.step++
      showMsg(`✔ 已确认维修对象：${Q.target.name} ${Q.target.code}（电容补偿回路）　+3 分`, 'good')
      break
    case 'load':
      if (!power.value) { showMsg('电源已断开，无需重复操作', 'info'); return }
      addScore('停电维修', s.pts)
      sd.step++
      beep(500, .1)
      showMsg('✔ 已断开负荷开关（补偿柜退出运行）　+3 分', 'good')
      break
    case 'source':
      if (sd.step < 2) return
      addScore('停电维修', s.pts)
      power.value = false
      sd.step++
      beep(420, .14)
      showMsg('✔ 已断开电源开关，柜内失电（电压表指示为 0）　+3 分', 'good')
      break
    case 'test':
      if (power.value) {
        penalize('停电维修', 1)
        beep(200, .14, 'sawtooth')
        showMsg('验电结果：带电！请先断开电源开关（-1 分）', 'warn')
        return
      }
      verified.value = true
      addScore('停电维修', s.pts)
      sd.step++
      beep(760, .1)
      showMsg('✔ 验电确认：三相均无电，可进行检修　+3 分', 'good')
      break
    case 'tag':
      if (!verified.value) {
        majorViolation('跳过安全保护步骤：未验电即挂牌/检修准备', '停电维修', 4)
        return
      }
      tagged.value = true
      addScore('停电维修', s.pts)
      sd.step++
      beep(700, .1)
      showMsg('✔ 已挂「禁止合闸 · 有人工作」警示牌　+3 分', 'good')
      break
    case 'door':
      openCabinet()
      break
    default:
      repairStep(i)
  }
}
function repairStep(i) {
  if (!verified.value) {
    majorViolation('未验电进行操作：未确认无电状态即检修', '停电维修', 6)
    return
  }
  if (!tagged.value) {
    majorViolation('跳过安全保护步骤：未挂警示牌即进行检修', '停电维修', 5)
    return
  }
  if (!doorOpen.value) { showMsg('请先打开补偿柜柜门（点击场景中的补偿柜）', 'warn'); return }
  const s = SHUTDOWN_STEPS[i]
  addScore('停电维修', s.pts)
  sd.step++
  beep(700, .07)
  const tips = {
    6: '✔ 检查发现：C2 电容器上接线端子松动、氧化发热（红外异常点）　+4 分',
    7: '✔ 已紧固松动连接并清除氧化层，端子接触电阻恢复正常　+5 分',
    8: '✔ 元件检查：电容器无鼓肚漏液、接触器触点良好、熔断器完好　+3 分',
    9: '✔ 已恢复保护装置（熔断器、过热保护整定值核对无误）　+3 分',
  }
  showMsg(tips[i] || '✔ 故障处理完成', 'good')
  if (i === SHUTDOWN_STEPS.length - 1) {
    repaired.value = true
    later(() => {
      showMsg('系统检测：故障点已处理 √ · 连接状态正常 √', 'good')
      completePhase()
    }, 500)
  }
}

// ================= 任务4：清洁除尘 =================
function pickTool(t) {
  if (paused.value || lock.value) return
  const idx = clean.tools.indexOf(t.n)
  if (t.bad) {
    if (idx >= 0) { clean.tools.splice(idx, 1); return }
    penalize('清洁维护', 2)
    beep(200, .14, 'sawtooth')
    showMsg(`× 不得使用「${t.n}」清洁（带水易造成短路 / 钢丝刷损坏元件），已禁止使用（-2 分）`, 'warn')
    return
  }
  if (idx >= 0) { clean.tools.splice(idx, 1); return }
  clean.tools.push(t.n)
  addScore('清洁维护', 3)
  beep(700, .05)
  showMsg(`✔ 已选取工具：${t.n}　+3 分`, 'good')
}
function hasCleanTools() { return clean.tools.includes('软毛刷') && clean.tools.includes('吸尘设备') }
function doClean(a) {
  if (paused.value || lock.value || !a) return
  if (!hasCleanTools()) { showMsg('请先选择「软毛刷」与「吸尘设备」', 'warn'); return }
  if (!doorOpen.value) { showMsg('请先打开补偿柜柜门', 'warn'); return }
  if (a.done) { showMsg(`${a.name}已清洁`, 'info'); return }
  a.done = true
  addScore('清洁维护', 1)
  beep(720, .05)
  showMsg(`✔ 已清洁：${a.name}　+1 分`, 'good')
  if (cleanDone.value === CLEAN_AREAS.length) {
    later(() => {
      showMsg('✔ 清洁除尘完成，柜内无灰尘与杂物（10 分）', 'good')
      completePhase()
    }, 500)
  }
}
// 面板清单项点击清洁（与点击柜内区域等效）
function clickClean(a) { doClean(a) }
function hitClean(p) {
  for (const a of CLEAN_AREAS) {
    if (Math.hypot(p.x - a.x, p.y - a.y) <= a.r) { doClean(a); return }
  }
  showMsg('请点击柜内对应的清洁区域，或点击面板清单项', 'info')
}

// ================= 任务5：送电 =================
function checkPre(it) {
  if (paused.value || lock.value) return
  if (it.done) return
  if (pOn.step > 0) { showMsg('送电流程已开始，请勿再修改送电前检查', 'warn'); return }
  it.done = true
  addScore('送电恢复', 1)
  beep(700, .05)
  if (it.k === '工具已撤离') {
    toolsIn.value = false
    showMsg('✔ 工具已撤离柜体并清点无误　+1 分', 'good')
  } else if (it.k === '柜门关闭') {
    doorOpen.value = false
    showMsg('✔ 补偿柜柜门已关闭　+1 分', 'good')
  } else {
    showMsg(`✔ 送电前检查：${it.k}　+1 分`, 'good')
  }
}
function powerStep(i) {
  if (paused.value || lock.value) return
  const s = POWERON_STEPS[i]
  if (i < pOn.step) { showMsg('该步骤已完成', 'info'); return }
  if (i > pOn.step) {
    if (i === 1) {
      if (tagged.value) {
        majorViolation('错误送电：未解除维修挂牌即合闸送电', '送电恢复', 5)
      } else {
        majorViolation('跳过安全保护步骤：送电流程顺序错误', '送电恢复', 4)
      }
      return
    }
    penalize('送电恢复', 1)
    beep(200, .12, 'sawtooth')
    showMsg(`请按顺序操作：下一步「${POWERON_STEPS[pOn.step].label}」（-1 分）`, 'warn')
    return
  }
  if (i === 1) {
    if (toolsIn.value) {
      majorViolation('未撤离工具强行送电：柜内仍遗留工具', '送电恢复', 5)
      return
    }
    if (!preAll.value) {
      majorViolation('跳过安全保护步骤：送电前检查未完成即合闸', '送电恢复', 4)
      return
    }
    if (tagged.value) {
      majorViolation('错误送电：警示牌未摘除即合闸', '送电恢复', 5)
      return
    }
  }
  if (i === 0 && tagged.value === false) {
    showMsg('警示牌已摘除', 'info')
  }
  addScore('送电恢复', s.pts)
  pOn.step++
  if (s.k === 'untag') {
    tagged.value = false
    showMsg('✔ 已解除维修措施，摘除警示牌　+3 分', 'good')
  } else if (s.k === 'close') {
    power.value = true
    beep(640, .14)
    showMsg('✔ 已合上电源开关，补偿柜得电　+3 分', 'good')
  } else if (s.k === 'watch') {
    beep(760, .08)
    showMsg('✔ 观察：电流 58.4A 正常 · 温升正常 · 功率因数 0.96　+2 分', 'good')
  } else {
    showMsg('✔ 设备运行正常，功率因数恢复，送电完成', 'good')
    later(() => completePhase(), 500)
  }
}

// ================= 任务6：整理场地 =================
function checkTidy(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('现场整理', 1)
  beep(700, .06)
  showMsg(`✔ ${it.k}　+1 分`, 'good')
}
function finishLevel() {
  if (lock.value) return
  addScore('现场整理', 1)
  showMsg('✔ 现场整理完成，考核结束', 'good')
  completePhase()
}

// ================= 游戏流程 =================
function resetState() {
  Object.values(cats).forEach(c => { c.got = 0 })
  mistakes.value = 0
  violations.value = []
  paused.value = false
  lock.value = false
  sheetOpen.value = true
  power.value = true
  verified.value = false
  tagged.value = false
  doorOpen.value = false
  repaired.value = false
  toolsIn.value = false
  INS.forEach(i => { i.done = false })
  anomaly.done = false
  thermal.on = false; thermal.mode = ''; thermal.modeDone = false; thermal.rec = false; thermal.temp = 0
  FOCUS.forEach(f => { f.done = false; f.temp = 0 })
  sd.step = 0
  clean.tools = []
  CLEAN_AREAS.forEach(a => { a.done = false })
  PRECHECK.forEach(i => { i.done = false })
  pOn.step = 0
  TIDY.forEach(i => { i.done = false })
  cursorT.value = null
  thermalCv = null
}
function startGame() {
  resetTimer()
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}
function restartRun() { startGame() }

// ================= 坐标换算 =================
function toCanvas(e) {
  const r = canvasRef.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h }

// ================= 画布交互 =================
function onCanvasMove(e) {
  if (screen.value !== 'play') return
  const p = toCanvas(e)
  cursor.x = p.x; cursor.y = p.y; cursor.on = true
  if (phase.value === 1 && thermal.on && thermal.mode) {
    cursorT.value = +tempAt(p.x, p.y).toFixed(1)
    scanAt(p.x, p.y)
  } else {
    cursorT.value = null
  }
}
function onCanvasLeave() {
  cursor.on = false
  cursorT.value = null
}
function onCanvasClick(e) {
  if (screen.value !== 'play' || paused.value || lock.value) return
  const p = toCanvas(e)
  if (phase.value === 0) hitInsp(p)
  else if (phase.value === 1) hitThermal(p)
  else if (phase.value === 2) {
    if (inRect(p.x, p.y, CAP)) openCabinet()
    else showMsg('请按停电流程操作，或点击无功补偿柜打开柜门', 'info')
  } else if (phase.value === 3) hitClean(p)
}

// ================= 画布绘制：基础 =================
// line 已从公共库导入为 canvasLine（签名一致），此处直接使用
function rect(c, x, y, w, h, fill, stroke, lw = 2) {
  if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h) }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.strokeRect(x, y, w, h) }
}
function circle(c, x, y, r, fill, stroke, lw = 2) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2)
  if (fill) { c.fillStyle = fill; c.fill() }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke() }
}
function txt(c, s, x, y, color = '#37474f', font = '12px sans-serif', align = 'center') {
  c.fillStyle = color; c.font = font; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'center'
}

// ================= 画布绘制：场景 =================
function drawRoom(c) {
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#e2e9ef'); g.addColorStop(.58, '#ccd7e1')
  g.addColorStop(.58, '#c2b193'); g.addColorStop(1, '#a5946f')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgba(120,100,70,.3)'; c.lineWidth = 1
  for (let x = -100; x < W + 100; x += 90) canvasLine(c, x, 370, x - 46, 640, 'rgba(120,100,70,.3)', 1)
  for (let y = 404; y < 640; y += 40) canvasLine(c, 0, y, W, y, 'rgba(120,100,70,.3)', 1)
  rect(c, 0, 364, W, 6, '#8b7b60')
  txt(c, '低压配电室 · 配电运行维护实训区', 24, 34, 'rgba(30,45,60,.85)', 'bold 17px sans-serif', 'left')
  txt(c, `${Q.supply} · 低压配电系统`, 24, 54, 'rgba(60,80,100,.7)', '12px sans-serif', 'left')
}

function drawWallVent(c) {
  rect(c, 830, 100, 100, 80, '#c8d2dc', '#8fa0b0')
  for (let i = 0; i < 6; i++) canvasLine(c, 836, 112 + i * 12, 924, 112 + i * 12, '#93a4b4', 5)
  txt(c, '通风百叶', 880, 196, '#5d6b78', '11px sans-serif')
}

function drawCabinet(c, cab) {
  const { x, y, w, h } = cab
  const g = c.createLinearGradient(x, y, x + w, y)
  g.addColorStop(0, '#5a6976'); g.addColorStop(.45, '#48555f'); g.addColorStop(1, '#3a4550')
  c.fillStyle = g; c.fillRect(x, y, w, h)
  rect(c, x, y, w, h, null, '#232a32', 3)
  c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(x + 3, y + 3, w - 6, 6)
  // 双开门缝与把手
  canvasLine(c, x + w / 2, y + 34, x + w / 2, y + h - 8, 'rgba(0,0,0,.4)', 2)
  rect(c, x + w / 2 - 20, y + h / 2, 6, 48, '#c9ccd1', '#1d242b', 1)
  rect(c, x + w / 2 + 14, y + h / 2, 6, 48, '#c9ccd1', '#1d242b', 1)
  // 铭牌
  rect(c, x + 8, y + 6, w - 16, 22, '#e9ecef', '#2b333b')
  txt(c, `${cab.name} ${cab.code}`, x + w / 2, y + 22, '#13283a', 'bold 13px sans-serif')
  // 下部百叶
  for (let i = 0; i < 4; i++) canvasLine(c, x + 12, y + h - 46 + i * 9, x + w - 12, y + h - 46 + i * 9, 'rgba(0,0,0,.34)', 4)
}

function drawMeter(c, x, y, w, h, label, val, col) {
  rect(c, x, y, w, h, '#171d23', '#0b0f13')
  rect(c, x + 3, y + 3, w - 6, h - 14, '#0e141a', '#2b3742', 1)
  txt(c, val, x + w / 2, y + h * .52, col, 'bold 15px Consolas, monospace')
  txt(c, label, x + w / 2, y + h - 5, '#93a1ad', '10px sans-serif')
}
function drawLights(c, x, y, lights) {
  lights.forEach((l, i) => {
    const ly = y + i * 24
    if (l.on) {
      c.save(); c.shadowColor = l.c; c.shadowBlur = 10
      circle(c, x, ly, 6, l.c, '#12171c', 1.5)
      c.restore()
    } else {
      circle(c, x, ly, 6, '#3d4750', '#12171c', 1.5)
    }
    txt(c, l.n, x + 12, ly + 4, l.on ? '#dfe7ee' : '#8d97a1', '10px sans-serif', 'left')
  })
}

function drawInstruments(c) {
  const on = power.value
  // 进线柜
  drawMeter(c, 48, 106, 74, 46, '电压表 V', on ? '400V' : '  0V', on ? '#8bc34a' : '#5f6a73')
  drawLights(c, 156, 116, [
    { n: '电源', c: '#43a047', on },
    { n: '运行', c: '#1e88e5', on: on && !doorOpen.value },
    { n: '告警', c: '#e53935', on: on && !repaired.value },
  ])
  // 出线柜
  drawMeter(c, 240, 106, 74, 46, '电流表 A', on ? (repaired ? '58.4A' : '63.7A') : ' 0.0A', on ? '#8bc34a' : '#5f6a73')
  drawLights(c, 348, 116, [
    { n: '电源', c: '#43a047', on },
    { n: '运行', c: '#1e88e5', on },
    { n: '告警', c: '#e53935', on: false },
  ])
  // 补偿柜（柜门关闭时才显示面板仪表）
  if (!doorOpen.value) {
    drawMeter(c, 430, 106, 76, 46, '功率因数 cosφ', on ? (repaired ? '0.96' : '0.82') : ' --', on ? (repaired ? '#8bc34a' : '#ffb300') : '#5f6a73')
    drawMeter(c, 520, 106, 76, 46, '柜内温度 ℃', on ? (repaired ? '38.2' : '86.5') : ' 26.4', on && !repaired ? '#ef5350' : '#8bc34a')
    drawLights(c, 424, 176, [
      { n: '补偿', c: '#43a047', on: on && repaired.value },
      { n: '过热', c: '#e53935', on: on && !repaired.value },
    ])
    // 投切指示
    for (let i = 0; i < 4; i++) {
      const lx = 500 + i * 36
      rect(c, lx, 170, 26, 16, '#20262c', '#0d1116')
      const lit = on && (repaired.value || i < 2)
      rect(c, lx + 3, 173, 20, 10, lit ? '#66bb6a' : '#37474f')
      txt(c, 'C' + (i + 1), lx + 13, 200, '#93a1ad', '9px sans-serif')
    }
  }
}

function drawToolCabinet(c) {
  const t = CABS[3]
  drawCabinet(c, t)
  // 内部隔板与器材
  rect(c, t.x + 8, t.y + 34, t.w - 16, t.h - 74, 'rgba(0,0,0,.25)', '#2a323a', 1)
  canvasLine(c, t.x + 8, t.y + 90, t.x + t.w - 8, t.y + 90, '#2a323a', 2)
  // 软毛刷
  rect(c, t.x + 16, t.y + 44, 44, 10, '#c8a06a', '#7a5a34', 1)
  rect(c, t.x + 58, t.y + 42, 12, 14, '#8d6e63', '#5d4037', 1)
  txt(c, '软毛刷', t.x + 40, t.y + 70, '#e8eef4', '10px sans-serif')
  // 吸尘设备
  rect(c, t.x + 76, t.y + 42, 42, 34, '#5c6bc0', '#2c3564', 1)
  circle(c, t.x + 97, t.y + 59, 9, '#3949ab', '#1a237e', 1.5)
  txt(c, '吸尘器', t.x + 97, t.y + 88, '#e8eef4', '10px sans-serif')
  // 下层
  rect(c, t.x + 16, t.y + 100, 46, 28, '#78909c', '#37474f', 1)
  txt(c, '工具', t.x + 39, t.y + 140, '#cfd8dc', '10px sans-serif')
  rect(c, t.x + 74, t.y + 100, 44, 28, '#90a4ae', '#37474f', 1)
  txt(c, '备件', t.x + 96, t.y + 140, '#cfd8dc', '10px sans-serif')
}

function drawMeasureArea(c, t) {
  rect(c, MEASURE.x, MEASURE.y, MEASURE.w, MEASURE.h, 'rgba(255,255,255,.35)', '#8d9aa8')
  rect(c, MEASURE.x, MEASURE.y, MEASURE.w, 14, '#9aa7b4', '#6f7d8b')
  txt(c, '测量区域', MEASURE.x + 40, MEASURE.y + 11, '#1b2a38', 'bold 12px sans-serif', 'left')

  // 红外测温仪
  const hot = phase.value === 1
  if (hot) {
    const pulse = 1 + .12 * Math.sin(t / 240)
    c.strokeStyle = thermal.on ? '#2e7d32' : '#ff8f00'
    c.lineWidth = 3
    c.beginPath(); c.arc(744, 296, 52 * pulse, 0, Math.PI * 2); c.stroke()
  }
  rect(c, 704, 268, 82, 46, thermal.on ? '#2e7d32' : '#37474f', '#1c242b')
  rect(c, 710, 274, 46, 26, thermal.on ? '#a5d6a7' : '#1d242b', '#0d1116')
  txt(c, thermal.on ? 'READY' : 'OFF', 733, 291, thermal.on ? '#1b5e20' : '#78909c', 'bold 11px Consolas, monospace')
  circle(c, 774, 282, 9, '#111820', '#455a64', 2)
  circle(c, 774, 282, 4, '#263238')
  rect(c, 726, 314, 22, 22, '#455a64', '#1c242b')
  txt(c, '红外线测温仪', 744, 352, '#233242', '11px sans-serif')

  // 万用表
  rect(c, 812, 268, 68, 50, '#c9a227', '#6d5510')
  rect(c, 818, 274, 56, 20, '#10161c', '#000')
  txt(c, '400.0', 846, 289, '#8bc34a', 'bold 12px Consolas, monospace')
  circle(c, 846, 306, 9, '#37474f', '#1c242b', 2)
  txt(c, '万用表', 846, 352, '#233242', '11px sans-serif')

  // 验电笔 + 警示牌
  rect(c, 896, 268, 14, 50, '#f4511e', '#7a2c0a')
  rect(c, 898, 272, 10, 16, '#ffcc80')
  txt(c, '验电笔', 903, 352, '#233242', '11px sans-serif')

  rect(c, 812, 330, 116, 30, tagged.value ? '#b71c1c' : '#eceff1', '#4b5560')
  txt(c, tagged.value ? '禁止合闸 · 有人工作' : '警示牌（备用）', 870, 350, tagged.value ? '#fff' : '#54606c', 'bold 11px sans-serif')
}

// 柜内结构
function drawInterior(c) {
  rect(c, INT.x, INT.y, INT.w, INT.h, '#1b2229', '#0a0e12', 2)
  // 母排
  const busY = [78, 88, 98]
  const busC = ['#f9a825', '#43a047', '#e53935']
  busY.forEach((y, i) => rect(c, 426, y, 216, 7, busC[i], '#12181d', 1))
  txt(c, 'L1   L2   L3 母排', 534, 74, '#cfd8dc', '10px sans-serif')
  // 熔断器
  const fuseX = [428, 502, 576]
  fuseX.forEach((x, i) => {
    rect(c, x, 118, 66, 34, '#e0e0e0', '#39434d')
    rect(c, x + 8, 126, 50, 18, '#c62828', '#7a1616')
    txt(c, `FU${i + 1}`, x + 33, 166, '#b0bec5', '10px sans-serif')
  })
  // 接触器
  rect(c, 428, 166, 84, 60, '#37474f', '#12181d')
  rect(c, 436, 174, 68, 24, '#263238', '#0d1116')
  txt(c, 'KM', 470, 191, '#8bc34a', 'bold 13px sans-serif')
  txt(c, '投切接触器', 470, 216, '#b0bec5', '10px sans-serif')
  // 电容器
  const capX = [524, 568, 612]
  capX.forEach((x, i) => {
    rect(c, x + 8, 162, 20, 6, '#b0bec5', '#546e75', 1)   // 端子
    const g = c.createLinearGradient(x, 0, x + 36, 0)
    g.addColorStop(0, '#5c6bc0'); g.addColorStop(.4, '#7986cb'); g.addColorStop(1, '#3949ab')
    rect(c, x, 168, 36, 86, g, '#1a237e', 1.5)
    rect(c, x + 4, 180, 28, 14, '#e8eaf6', '#3949ab')
    txt(c, `C${i + 1}`, x + 18, 191, '#1a237e', 'bold 11px sans-serif')
    txt(c, 'kvar', x + 18, 240, '#c5cae9', '9px sans-serif')
  })
  txt(c, '电容器组', 586, 266, '#b0bec5', '10px sans-serif')
  // 端子排
  rect(c, 428, 240, 84, 26, '#eceff1', '#39434d')
  for (let i = 0; i < 6; i++) circle(c, 436 + i * 13, 253, 4, '#cfd8dc', '#546e75', 1)
  txt(c, 'XT 端子排', 470, 280, '#90a4ae', '10px sans-serif')
  // 保护装置
  rect(c, 428, 288, 214, 44, '#2f3b45', '#12181d')
  rect(c, 436, 296, 76, 28, '#0e141a', '#000')
  txt(c, '保护正常', 474, 315, repaired.value ? '#8bc34a' : '#ef5350', 'bold 12px sans-serif')
  txt(c, '无功补偿自动控制器', 574, 316, '#b0bec5', '11px sans-serif')
  // 底部通风
  for (let i = 0; i < 4; i++) canvasLine(c, 432, 340 + i * 7, 636, 340 + i * 7, 'rgba(255,255,255,.10)', 4)
  // 敞开的柜门（右侧）
  rect(c, 657, INT.y + 8, 14, INT.h - 16, '#4a5560', '#232a31')
  circle(c, 664, INT.y + 40, 4, '#c9ccd1', '#232a31', 1.5)
  circle(c, 664, INT.y + INT.h - 40, 4, '#c9ccd1', '#232a31', 1.5)
  txt(c, '柜门已打开', CAP.x + CAP.w / 2, CAP.y - 6, '#2e7d32', 'bold 12px sans-serif')
}

function drawCleanTargets(c, t) {
  const pulse = 1 + .12 * Math.sin(t / 250)
  for (const a of CLEAN_AREAS) {
    if (a.done) {
      circle(c, a.x, a.y, a.r - 6, 'rgba(46,125,50,.22)', '#2e7d32', 2)
      txt(c, '√', a.x, a.y + 5, '#a5d6a7', 'bold 16px sans-serif')
    } else {
      c.save()
      c.setLineDash([6, 5])
      c.strokeStyle = '#ffd54f'; c.lineWidth = 2.5
      c.beginPath(); c.arc(a.x, a.y, a.r * pulse, 0, Math.PI * 2); c.stroke()
      c.restore()
      txt(c, a.name, a.x, a.y + a.r + 14, '#fff3e0', 'bold 11px sans-serif')
    }
  }
}

// ================= 热成像 =================
const TSTOPS = [
  [24, [8, 6, 60]], [32, [24, 92, 190]], [40, [24, 180, 170]], [48, [100, 210, 80]],
  [56, [240, 210, 50]], [66, [245, 140, 30]], [76, [230, 60, 40]], [92, [255, 255, 255]],
]
function tcolor(t) {
  if (t <= TSTOPS[0][0]) { const c = TSTOPS[0][1]; return `rgb(${c[0]},${c[1]},${c[2]})` }
  for (let i = 1; i < TSTOPS.length; i++) {
    if (t <= TSTOPS[i][0]) {
      const [t0, c0] = TSTOPS[i - 1], [t1, c1] = TSTOPS[i]
      const u = (t - t0) / (t1 - t0)
      return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * u)},${Math.round(c0[1] + (c1[1] - c0[1]) * u)},${Math.round(c0[2] + (c1[2] - c0[2]) * u)})`
    }
  }
  return '#ffffff'
}
let thermalCv = null
function buildThermal() {
  const cell = 5
  const cv = document.createElement('canvas')
  cv.width = INT.w; cv.height = INT.h
  const cc = cv.getContext('2d')
  for (let y = 0; y < INT.h; y += cell) {
    for (let x = 0; x < INT.w; x += cell) {
      cc.fillStyle = tcolor(tempAt(INT.x + x, INT.y + y))
      cc.fillRect(x, y, cell, cell)
    }
  }
  thermalCv = cv
}
function drawThermal(c, t) {
  if (!thermal.on) {
    // 未启动：提示扫描范围
    c.save(); c.setLineDash([8, 6]); c.strokeStyle = '#ff8f00'; c.lineWidth = 2.5
    c.strokeRect(INT.x, INT.y, INT.w, INT.h); c.restore()
    txt(c, '启动测温仪后在此区域扫描', INT.x + INT.w / 2, INT.y + INT.h / 2, '#ff8f00', 'bold 13px sans-serif')
    return
  }
  if (!thermalCv) buildThermal()
  c.drawImage(thermalCv, INT.x, INT.y)
  // 叠加元件轮廓
  c.strokeStyle = 'rgba(10,14,18,.55)'; c.lineWidth = 1.5
  c.strokeRect(426, 76, 216, 30)
  ;[428, 502, 576].forEach(x => c.strokeRect(x, 118, 66, 34))
  c.strokeRect(428, 166, 84, 60)
  ;[524, 568, 612].forEach(x => c.strokeRect(x, 168, 36, 86))
  c.strokeRect(428, 240, 84, 26)
  c.strokeRect(428, 288, 214, 44)
  // 重点区域
  for (const f of FOCUS) {
    c.save(); c.setLineDash([5, 4])
    c.strokeStyle = f.done ? '#a5d6a7' : 'rgba(255,255,255,.75)'
    c.lineWidth = 2
    c.beginPath(); c.arc(f.x, f.y, f.r, 0, Math.PI * 2); c.stroke()
    c.restore()
    txt(c, f.name, f.x, f.y - f.r - 6, f.done ? '#d1fae5' : '#fff', 'bold 11px sans-serif')
  }
  // 异常热点
  const ft = tempAt(FAULT.x, FAULT.y)
  const pulse = 1 + .18 * Math.sin(t / 160)
  c.save(); c.shadowColor = '#fff'; c.shadowBlur = 14
  circle(c, FAULT.x, FAULT.y, FAULT.r * pulse, null, '#ffffff', 3)
  c.restore()
  txt(c, `${ft.toFixed(1)}℃ ⚠`, FAULT.x, FAULT.y + FAULT.r + 16, '#ffffff', 'bold 13px sans-serif')
  // 色标
  for (let i = 0; i < 46; i++) {
    const tv = 24 + (92 - 24) * (i / 45)
    c.fillStyle = tcolor(tv)
    c.fillRect(INT.x + 6 + i * 5, INT.y + INT.h - 16, 5, 10)
  }
  txt(c, '24℃', INT.x + 6, INT.y + INT.h - 20, '#e3f2fd', '10px sans-serif', 'left')
  txt(c, '92℃', INT.x + INT.w - 6, INT.y + INT.h - 20, '#e3f2fd', '10px sans-serif', 'right')
  // 十字光标与读数
  if (cursor.on && cursor.x >= INT.x && cursor.x <= INT.x + INT.w && cursor.y >= INT.y && cursor.y <= INT.y + INT.h) {
    const cx = cursor.x, cy = cursor.y
    canvasLine(c, INT.x, cy, INT.x + INT.w, cy, 'rgba(255,255,255,.65)', 1)
    canvasLine(c, cx, INT.y, cx, INT.y + INT.h, 'rgba(255,255,255,.65)', 1)
    circle(c, cx, cy, 12, null, '#fff', 2)
    const bt = tempAt(cx, cy)
    const bx = Math.min(INT.x + INT.w - 96, Math.max(INT.x + 4, cx + 16))
    const by = Math.max(INT.y + 4, cy - 46)
    rect(c, bx, by, 92, 38, 'rgba(8,12,18,.9)', '#fff')
    rect(c, bx + 6, by + 8, 14, 22, tcolor(bt), '#000')
    txt(c, `${bt.toFixed(1)}℃`, bx + 62, by + 18, bt > 60 ? '#ff8a80' : '#e0f7fa', 'bold 14px Consolas, monospace')
    txt(c, bt > 60 ? '异常高温' : '温度正常', bx + 62, by + 33, bt > 60 ? '#ff5252' : '#80cbc4', '10px sans-serif')
  }
}

// ================= 巡视标记 =================
function drawInspMarkers(c, t) {
  for (const it of INS) {
    const pulse = 1 + .14 * Math.sin(t / 260 + it.no)
    if (it.done) {
      circle(c, it.x, it.y, 10, '#2e7d32', '#1b5e20', 2)
      txt(c, '√', it.x, it.y + 4, '#fff', 'bold 11px sans-serif')
    } else {
      c.save(); c.shadowColor = '#1a3fc4'; c.shadowBlur = 8
      circle(c, it.x, it.y, 11 * pulse, '#fff', '#1a3fc4', 3)
      c.restore()
      txt(c, it.no, it.x, it.y + 4, '#1a3fc4', 'bold 12px sans-serif')
    }
  }
  if (inspAll.value && !anomaly.done) {
    const pulse = 1 + .2 * Math.sin(t / 150)
    c.save(); c.shadowColor = '#f44336'; c.shadowBlur = 16
    circle(c, ANOM.x, ANOM.y, 18 * pulse, 'rgba(244,67,54,.35)', '#f44336', 3)
    c.restore()
    txt(c, '!', ANOM.x, ANOM.y + 7, '#fff', 'bold 20px sans-serif')
    txt(c, '异常点 · 点击记录', ANOM.x, ANOM.y + 38, '#c62828', 'bold 12px sans-serif')
  } else if (!anomaly.done) {
    txt(c, '完成 12 项巡视后可记录异常点', 770, 258, 'rgba(35,50,66,.85)', '11px sans-serif')
  }
}

// 挂牌 / 检修提示
function drawTags(c) {
  if (tagged.value) {
    const x = CAP.x + CAP.w - 96, y = CAP.y + 118
    rect(c, x, y, 88, 34, '#c62828', '#7a1616')
    txt(c, '禁止合闸', x + 44, y + 15, '#fff', 'bold 12px sans-serif')
    txt(c, '有人工作', x + 44, y + 29, '#ffcdd2', '11px sans-serif')
    canvasLine(c, x + 44, CAP.y + 34, x + 44, y, '#c62828', 2)
  }
  if (toolsIn.value && doorOpen.value) {
    rect(c, INT.x + 8, INT.y + INT.h - 62, 60, 24, '#f9a825', '#7a5a00')
    txt(c, '工具在柜内', INT.x + 38, INT.y + INT.h - 46, '#3e2c00', 'bold 10px sans-serif')
  }
  if (power.value && !verified.value && phase.value === 2) {
    txt(c, '带电！按顺序停电后再检修', CAP.x + CAP.w / 2, CAP.y - 6, '#c62828', 'bold 12px sans-serif')
  }
  if (phase.value === 2 && doorOpen.value && !repaired.value) {
    txt(c, '柜内已无电，执行故障处理 4 步', CAP.x + CAP.w / 2, CAP.y - 6, '#2e7d32', 'bold 12px sans-serif')
  }
}

function drawStatusStrip(c) {
  const label = stateText.value
  const col = power.value && !doorOpen.value ? '#43a047' : '#ef6c00'
  rect(c, 690, 12, 254, 28, 'rgba(20,32,44,.88)', '#2f4156')
  circle(c, 708, 26, 6, col, '#0f1b25', 1.5)
  txt(c, `运行状态：${label}`, 722, 31, '#e3eef7', '12px sans-serif', 'left')
  txt(c, doorOpen.value ? '检修中' : (power.value ? '运行中' : '停电'), 936, 31, col, 'bold 12px sans-serif', 'right')
}

function drawScene(t) {
  const c = ctx.value
  drawRoom(c)
  drawWallVent(c)
  for (const cab of CABS) {
    if (cab.id === 'tool') continue
    drawCabinet(c, cab)
  }
  drawToolCabinet(c)
  drawInstruments(c)
  drawMeasureArea(c, t)

  if (doorOpen.value && phase.value >= 2) drawInterior(c)
  if (phase.value === 3 && doorOpen.value) drawCleanTargets(c, t)
  if (phase.value === 0) drawInspMarkers(c, t)
  if (phase.value === 1) drawThermal(c, t)
  if (phase.value >= 2) drawTags(c)

  // 补偿柜为维修对象时的高亮
  if (phase.value === 2 && !doorOpen.value) {
    const pulse = 1 + .06 * Math.sin(t / 220)
    c.save(); c.setLineDash([10, 6])
    c.strokeStyle = power.value ? '#c62828' : '#2e7d32'
    c.lineWidth = 3.5
    c.strokeRect(CAP.x - 4, CAP.y - 4, (CAP.w + 8) * pulse, CAP.h + 8)
    c.restore()
  }

  drawStatusStrip(c)
}

// ================= 主循环 =================
let raf = null
function loop(t) {
  if (ctx.value) drawScene(t)
  raf = requestAnimationFrame(loop)
}
onMounted(() => {
  ctx.value = canvasRef.value.getContext('2d')
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearTimers()
  clearTimeout(msgTimer)
})
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: #16202b;
  padding: 16px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
  color: #1c1e24;
}

/* ---------- HUD ---------- */
.hud {
  max-width: 960px;
  margin: 0 auto 10px;
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  color: #dfe7ee;
  background: #22303e;
  border: 1px solid #2f4156;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
}
.htitle { font-weight: 600; }
.cats { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; }
.cats i { font-style: normal; color: #9fb4c6; font-variant-numeric: tabular-nums; }
.hud b { color: #ffd54f; font-variant-numeric: tabular-nums; }
.exit { margin-left: auto; color: #9fb4c6; text-decoration: none; }
.exit:hover { color: #fff; }

/* ---------- 舞台 ---------- */
.stage-wrap { max-width: 960px; margin: 0 auto; overflow-x: auto; }
.stage {
  position: relative;
  width: 960px;
  height: 640px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, .5);
  background: #dfe7ee;
}
canvas { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: block; }

.banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 32, 44, .88);
  color: #fff;
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: baseline;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
}
.banner span { color: #a9c3d8; font-size: 12px; }

.pause-badge {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(198, 40, 40, .95);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 700;
  z-index: 45;
  pointer-events: none;
  animation: pulse 1s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }

/* ---------- 任务面板 ---------- */
.panel { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 10; }
.panel .sheet { pointer-events: auto; }
.sheet {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  width: 880px;
  max-height: 232px;
  overflow-y: auto;
  background: rgba(255, 255, 255, .97);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
  padding: 12px 18px;
  box-sizing: border-box;
}
.sheet.sheet-tall { max-height: 300px; }
.sheet.folded { max-height: 40px; overflow: hidden; padding: 6px 18px; }
.fold {
  position: absolute;
  right: 10px;
  top: 8px;
  border: 1px solid #c9d2dd;
  background: #f0f4fa;
  border-radius: 5px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  color: #4a5568;
}
.fold:hover { background: #e3ebf7; }
.sheet h3 { margin: 0 0 4px; font-size: 16px; color: #122d94; padding-right: 76px; }
.tip { margin: 2px 0 8px; font-size: 13px; color: #4a5568; }
.tip b { color: #1c1e24; }
.status {
  margin: 6px 0 0;
  font-size: 13px;
  color: #2b6cb0;
  background: #ebf3fc;
  border-radius: 6px;
  padding: 6px 10px;
}
.status.inline { display: inline-block; margin: 0; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.status i.off { color: #c62828; }
.status b { color: #122d94; }
.row { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
.row.center { justify-content: center; }
.hint { font-size: 12px; color: #78909c; }
.cname { font-size: 13px; font-weight: 600; color: #37474f; }
.probe-tip { margin: 4px 0; font-size: 12px; color: #4a5568; }
.probe-tip b { color: #c62828; }

/* ---------- 按钮 ---------- */
.btn {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 6px;
  padding: 6px 14px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  color: #1c1e24;
  transition: background .15s, border-color .15s, color .15s;
}
.btn:hover:not(:disabled) { background: #f0f4fa; border-color: #9fb4c6; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.primary { background: #1a3fc4; border-color: #1a3fc4; color: #fff; }
.btn.primary:hover:not(:disabled) { background: #122d94; border-color: #122d94; }
.btn.big { font-size: 17px; padding: 12px 42px; }
.btn.sm { padding: 4px 10px; font-size: 12px; }
.btn.sm.toolbtn { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.btn.sm.toolbtn .optthumb { display: block; width: 42px; height: 32px; object-fit: contain; background: #fff; border-radius: 3px; }
.btn.sel { background: #e8f0fe; border-color: #1a3fc4; color: #122d94; font-weight: 700; }
.btn.bad { border-color: #ef9a9a; color: #c62828; }
.btn.bad:hover:not(:disabled) { background: #fdecea; }

/* ---------- 选项 / 清单 ---------- */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 4px; }
.grp { border: 1px solid #dfe3ea; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 5px; }
.glabel { font-weight: 700; font-size: 14px; color: #122d94; text-align: center; }
.chk {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.chk:hover { background: #f0f4fa; }
.chk.sel { background: #e8f0fe; border-color: #1a3fc4; color: #122d94; font-weight: 600; }
.chk.hot.sel { background: #fff3e0; border-color: #ef6c00; color: #e65100; }
.sc-t { margin-left: auto; color: #2e7d32; font-variant-numeric: tabular-nums; font-weight: 700; }
.opt {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}
.opt:hover { background: #f0f4fa; }
.opt.sel { background: #1a3fc4; border-color: #1a3fc4; color: #fff; font-weight: 600; }

/* ---------- 步骤条 ---------- */
.steps { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0; }
.step {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.step:hover { background: #f0f4fa; }
.step.next { border-color: #1a3fc4; color: #122d94; font-weight: 700; box-shadow: 0 0 0 2px rgba(26, 63, 196, .18); }
.step.done { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; }

/* ---------- 测温仪显示 ---------- */
.mtr {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #263238;
  border-radius: 6px;
  padding: 4px 10px;
}
.mtr-mode { color: #b0bec5; font-size: 12px; }
.mtr-read {
  background: #1b2630;
  color: #78909c;
  border-radius: 4px;
  padding: 3px 10px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  min-width: 78px;
  text-align: right;
}
.mtr.on .mtr-read { color: #8bc34a; font-weight: 700; }

.rec {
  background: #f6f8fa;
  border: 1px dashed #c9d2dd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}
.rec p { margin: 3px 0; }
.rec b { color: #90a4ae; }
.rec b.ok-c { color: #c62828; }
.ok-c { color: #2e7d32; }

/* ---------- 消息 ---------- */
.msg {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: rgba(20, 32, 44, .92);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  opacity: 0;
  transition: opacity .2s, transform .2s;
  pointer-events: none;
  z-index: 40;
  max-width: 84%;
  text-align: center;
}
.msg.info, .msg.good, .msg.warn, .msg.bad { opacity: 1; transform: translateX(-50%) translateY(0); }
.msg.good { background: rgba(46, 125, 50, .94); }
.msg.warn { background: rgba(240, 150, 30, .94); }
.msg.bad { background: rgba(198, 40, 40, .94); }

/* ---------- 覆盖层 ---------- */
.overlay {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .82);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  pointer-events: auto;
}
.panel-box {
  width: 620px;
  max-height: 92%;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 24px 32px;
  text-align: center;
  box-shadow: 0 16px 60px rgba(0, 0, 0, .45);
}
.panel-box h2 { margin: 6px 0; color: #122d94; font-size: 24px; }
.lv-code {
  display: inline-block;
  background: #1a3fc4; color: #fff;
  font-size: 13px; letter-spacing: .08em;
  padding: 3px 14px; border-radius: 14px;
}
.sub { color: #5d6370; font-size: 14px; margin: 4px 0; }
.objs { text-align: left; background: #f6f8fa; border-radius: 8px; padding: 12px 18px; margin: 12px 0; font-size: 14px; }
.objs ul { margin: 8px 0 0; padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
.fatal-note {
  color: #c62828; font-size: 13px; font-weight: 600;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.ct-note {
  color: #1b5e20; font-size: 13px;
  background: #e8f5e9; border: 1px solid #c8e6c9;
  border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.record-note {
  font-size: 13px; color: #2b6cb0;
  background: #ebf3fc; border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.lv-stars { font-size: 34px; color: #f0b429; letter-spacing: .1em; margin: 10px 0 2px; }
.verdict { color: #2b6cb0; font-size: 15px; margin: 6px 0 12px; }
.score-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
.score-table td { padding: 6px 12px; border-bottom: 1px solid #eef1f5; text-align: left; }
.score-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.score-table tr.total td { border-top: 2px solid #122d94; border-bottom: none; font-size: 17px; color: #122d94; }
.record-sec {
  text-align: left;
  background: #f6f8fa;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px 0;
  font-size: 14px;
}
.record-sec h4 { margin: 0 0 6px; color: #122d94; font-size: 14px; }
.record-sec p { margin: 4px 0; }

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>

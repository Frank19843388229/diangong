<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K33-01 · 施工现场临时用电搭设</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>仿真电源 <b>{{ power ? '已送电' : '断电' }}</b></span>
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
          <b>任务 {{ phase + 1 }}/7 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⚠ 检测到严重安全风险 —— 系统安全锁定，请重新执行安全操作</div>

        <!-- 任务面板 -->
        <div class="panel">
          <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 2, folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

            <div v-show="sheetOpen" class="fold-area">
              <!-- 任务1：三级配电两级保护搭设 -->
              <div v-if="phase === 0" class="sheet-body">
                <h3>任务 1：搭设三级配电、两级保护系统（20分 = 箱体10 + 漏电保护8 + 支路标识2）</h3>
                <p class="tip">按 <b>总配电箱 → 分配电箱 → 开关箱</b> 三级顺序布置箱体（点击场景虚线位置或下方步骤按钮），再为<b>总配电箱</b>与<b>开关箱</b>配置两级漏电保护整定值，并确认动力 / 照明支路标识。</p>
                <div class="steps">
                  <button
                    v-for="(b, i) in BOXES" :key="b.id" class="step"
                    :class="{ done: b.placed, next: !b.placed && i === nextBox }"
                    @click="placeBox(b)"
                  >{{ b.placed ? '√' : '①②③④⑤'[i] }}. 布置{{ b.name }}（{{ b.pts }}分）</button>
                </div>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">两级漏电保护整定（{{ leakOk }}/2）</div>
                    <div class="cname">总配电箱漏电保护器：</div>
                    <div class="row">
                      <button v-for="o in LEAK_MAIN" :key="o" class="opt" :class="{ sel: leak.main === o }" @click="setLeak('main', o)">{{ o }}</button>
                    </div>
                    <div class="cname">开关箱漏电保护器：</div>
                    <div class="row">
                      <button v-for="o in LEAK_SW" :key="o" class="opt" :class="{ sel: leak.sw === o }" @click="setLeak('sw', o)">{{ o }}</button>
                    </div>
                    <p class="probe-tip">总箱：动作电流 &gt;30mA、动作时间 &gt;0.1s 且乘积 ≤30mA·s；开关箱：≤30mA、≤0.1s。</p>
                  </div>
                  <div class="grp">
                    <div class="glabel">支路标识确认（{{ branchDone }}/2）</div>
                    <div v-for="it in BRANCHES" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkBranch(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}
                    </div>
                    <p class="status status-inline">箱体 {{ placedCount }}/5 · 漏电保护 {{ leakOk }}/2 · 支路 {{ branchDone }}/2</p>
                    <button class="btn primary" :disabled="!task1Ok" @click="submitPhase">提交系统搭设</button>
                  </div>
                </div>
              </div>

              <!-- 任务2：电缆线路连接 -->
              <div v-if="phase === 1" class="sheet-body">
                <h3>任务 2：连接配电箱之间的电缆线路（20分 = 电缆16 + 敷设检查4）</h3>
                <p class="tip">按电路图连接 <b>4 条电缆</b>：先点击<b>起点箱体</b>再点击<b>终点箱体</b>，或直接点击下方清单项完成连接；连接错误的跨接会被拒绝并记为操作失误。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">箱间电缆（{{ cableDone }}/4）</div>
                    <div v-for="cb in CABLES" :key="cb.id" class="chk" :class="{ sel: cb.done, hot: cb.done }" @click="connectCable(cb)">
                      {{ cb.done ? '√' : '□' }} {{ cb.name }}<span class="sc-t">{{ cb.done ? '已连接' : '待连接' }}</span>
                    </div>
                    <p class="probe-tip">起点已选：<b>{{ pickFrom ? pickFrom.name : '（点击场景箱体）' }}</b>，点击终点箱体完成连接。</p>
                  </div>
                  <div class="grp">
                    <div class="glabel">电缆敷设检查（{{ layDone }}/2）</div>
                    <div v-for="it in LAYING" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkLaying(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}
                    </div>
                    <p class="status status-inline">得分 {{ cats['线路连接'].got }}/20</p>
                    <button class="btn primary" :disabled="!task2Ok" @click="submitPhase">提交线路连接</button>
                  </div>
                </div>
              </div>

              <!-- 任务3：用电设备接入 -->
              <div v-if="phase === 2" class="sheet-body">
                <h3>任务 3：连接用电设备（15分 = 设备接入12 + 保护接地3）</h3>
                <p class="tip">判断设备属于 <b>动力支路</b> 还是 <b>照明支路</b>，将其接入对应开关箱（点击场景设备再点开关箱，或用下方按钮选择），并确认 <b>PE 保护接地</b> 要求。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">设备接入（{{ devDone }}/4）</div>
                    <div v-for="d in DEVICES" :key="d.id" class="dev-row" :class="{ sel: d.route }">
                      <span class="dev-name">{{ d.name }}<i>{{ d.kind }}</i></span>
                      <button class="opt" :class="{ sel: d.route === 'SA' }" @click="routeDev(d, 'SA')">动力开关箱</button>
                      <button class="opt" :class="{ sel: d.route === 'SB' }" @click="routeDev(d, 'SB')">照明开关箱</button>
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">保护接地确认（{{ gndDone }}/3）</div>
                    <div v-for="it in GROUND" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkGnd(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}
                    </div>
                    <p class="status status-inline">得分 {{ cats['设备接入'].got }}/15</p>
                    <button class="btn primary" :disabled="!task3Ok" @click="submitPhase">提交设备接入</button>
                  </div>
                </div>
              </div>

              <!-- 任务4：保护线检查与修复 -->
              <div v-if="phase === 3" class="sheet-body">
                <h3>任务 4：检查并修复箱体保护线（15分 = PE检查8 + 定位3 + 修复2 + 复检2）</h3>
                <p class="tip">系统处于<b>断电检修模式</b>：逐个检查 <b>4 处箱体 / 箱门保护线</b>连续性（点击场景绿色 PE 测试点或清单项），找到<b>不规范接点</b>后定位、修复，再复检合格。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">保护线连续性检查（{{ peDone }}/4）</div>
                    <div v-for="p in PE_POINTS" :key="p.id" class="chk" :class="{ sel: p.checked, hot: p.checked && p.fault }" @click="checkPE(p)">
                      {{ p.checked ? '√' : '□' }} {{ p.name }}<span class="sc-t">{{ p.checked ? (p.fault ? (p.fixed ? '已修复' : '连续性不合格') : '合格') : '待检' }}</span>
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">故障处理</div>
                    <p class="probe-tip">断电状态：<b>{{ power ? '带电 —— 禁止作业' : '已断电 · 检修模式' }}</b></p>
                    <div class="row">
                      <button class="btn sm" :disabled="pe.found" @click="locateFault">定位故障点</button>
                      <button class="btn sm" :disabled="!pe.found || pe.fixed" @click="repairFault">修复不规范接点</button>
                      <button class="btn sm" :disabled="!pe.fixed || pe.rechecked" @click="recheckPE">复检</button>
                    </div>
                    <p class="status status-inline">故障：{{ pe.found ? '照明开关箱箱门保护线虚接' : peDone < 4 ? '待排查' : '请定位' }} · {{ pe.rechecked ? '复检合格 √' : pe.fixed ? '已修复待复检' : '' }}</p>
                    <button class="btn primary" :disabled="!task4Ok" @click="submitPhase">提交检查结果</button>
                    <p class="probe-tip"><b>× 带电修复保护线</b> —— 判定重大违规。</p>
                  </div>
                </div>
              </div>

              <!-- 任务5：检测与虚拟调试 -->
              <div v-if="phase === 4" class="sheet-body">
                <h3>任务 5：线路检测与虚拟调试（15分 = 检测10 + 送电5）</h3>
                <p class="tip">先完成 <b>5 项安全检测</b>，全部合格后方可启动仿真送电。<b>未完成检查即尝试送电将触发安全锁定并记为重大违规。</b></p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">必检项目（{{ testDone }}/5）</div>
                    <div v-for="t in TESTS" :key="t.k" class="chk" :class="{ sel: t.done }" @click="runTest(t)">
                      {{ t.done ? '√' : '□' }} {{ t.k }}<span class="sc-t">{{ t.done ? t.res : '待检' }}</span>
                    </div>
                  </div>
                  <div class="grp">
                    <div class="glabel">虚拟送电</div>
                    <p class="probe-tip">检测未全部合格前，送电按钮将被安全锁定。</p>
                    <button class="btn" :disabled="!power" @click="powerOff">断开仿真电源</button>
                    <button class="btn primary" :disabled="power" @click="powerOn">启动模拟送电</button>
                    <p class="status status-inline">仿真电源：<i :class="{ off: !power }">{{ power ? '运行中' : '断电' }}</i> · 检测 {{ testDone }}/5</p>
                    <button class="btn primary" :disabled="!power" @click="submitPhase">确认运行正常，进入拆除</button>
                  </div>
                </div>
              </div>

              <!-- 任务6：拆除线路 -->
              <div v-if="phase === 5" class="sheet-body">
                <h3>任务 6：拆除安装的线路（10分 = 断电2 + 拆缆4 + 分类2 + 清点2）</h3>
                <p class="tip">先 <b>确认仿真电源已断开</b>，再按 <b>开关箱 → 分配电箱 → 总配电箱</b> 的顺序从末端逐级解除电缆，最后分类整理电缆并清点元件设备。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">电缆解除（{{ removeDone }}/4）</div>
                    <div v-for="cb in CABLES" :key="'r' + cb.id" class="chk" :class="{ sel: cb.removed }" @click="removeCable(cb)">
                      {{ cb.removed ? '√' : '□' }} 解除：{{ cb.name }}
                    </div>
                    <p class="probe-tip">拆除顺序：末端开关箱侧先行；<b>带电拆除线路判定重大违规</b>。</p>
                  </div>
                  <div class="grp">
                    <div class="glabel">断电与整理清点</div>
                    <button class="btn sm" :disabled="!power" @click="powerOff">{{ power ? '断开仿真电源（拆除前必做）' : '√ 仿真电源已断开' }}</button>
                    <button class="btn sm" :disabled="offDone" @click="confirmOff">{{ offDone ? '√ 已确认断电' : '确认仿真电源已断开（2分）' }}</button>
                    <div v-for="it in CLEANUP" :key="it.k" class="chk" :class="{ sel: it.done }" @click="doCleanup(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}<span class="sc-t">{{ it.pts }}分</span>
                    </div>
                    <button class="btn primary" :disabled="!task6Ok" @click="submitPhase">提交拆除结果</button>
                  </div>
                </div>
              </div>

              <!-- 任务7：整理场地 -->
              <div v-if="phase === 6" class="sheet-body">
                <h3>任务 7：整理场地（5分）</h3>
                <p class="tip">完成工具归位、电缆盘回收、配电箱周围清理、元件清点与场地安全检查（5S），逐项确认后提交考核。</p>
                <div class="grid3">
                  <div v-for="it in TIDY" :key="it.k" class="chk" :class="{ sel: it.done }" @click="checkTidy(it)">
                    {{ it.done ? '√' : '□' }} {{ it.k }}
                  </div>
                </div>
                <div class="row">
                  <button class="btn primary" :disabled="tidyDone < TIDY.length" @click="finishLevel">完成整理，提交考核</button>
                  <span class="hint">已完成 {{ tidyDone }}/{{ TIDY.length }}（提交 +1 分）</span>
                </div>
                <p class="status">检测记录：合格 {{ testDone }}/5 · 保护线故障：{{ pe.rechecked ? '已修复并通过复检' : '未处理' }}
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
            <p class="sub">低压电工考证 · 施工现场临时用电 · 难度 ★★★★★ · 7 项任务 · 满分 100 分</p>
            <div class="objs">
              <p>训练目标：依据电路图在虚拟施工现场搭设 <b>三级配电、两级保护</b> 临时用电系统，完成箱间电缆连接、动力与照明设备接入、<b>保护接地检查与故障修复</b>、线路检测调试与拆除整理。</p>
              <ul>
                <li>三级配电、两级保护系统搭设（20）</li>
                <li>配电箱之间电缆线路连接（20）</li>
                <li>用电设备连接（15）</li>
                <li>箱体 / 箱门保护线检查与修复（15）</li>
                <li>线路检测与虚拟调试（15）</li>
                <li>线路拆除（10）</li>
                <li>场地整理（5）</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 重大违规判定（系统安全锁定）：未完成安全检查即尝试送电 · 带电修复保护线 · 未确认断电即拆除线路 · 未配置两级漏电保护即送电。</p>
            <p class="ct-note">⚡ 三级配电 = 总配电箱 → 分配电箱 → 开关箱；两级保护 = 总配电箱一级 + 开关箱一级漏电保护。</p>
            <p class="record-note">本关为 <b>K33 施工现场系列第一关</b>：从「单个电路安装」升级到「整个临时用电系统搭设」。本关采用虚拟检测与模拟送电训练。</p>
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
              <h4>系统检测记录</h4>
              <p>三级配电：总箱 → 分配电箱A/B → 动力/照明开关箱（{{ placedCount }}/5）</p>
              <p>两级漏电保护：总箱 {{ leak.main || '未整定' }} · 开关箱 {{ leak.sw || '未整定' }}</p>
              <p>必检项目合格：{{ testDone }}/5　仿真送电：{{ power ? '已送电运行' : '已断电' }}</p>
              <p>保护线故障：{{ pe.rechecked ? '照明开关箱箱门保护线虚接 —— 已修复并复检合格' : '未处理' }}</p>
            </div>
            <div class="record-sec">
              <h4>安全记录</h4>
              <p>重大违规：{{ violations.length }} 次</p>
              <p v-if="violations.length">· {{ violations.join('；') }}</p>
              <p>操作失误：{{ mistakes }} 次</p>
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
// 公共逻辑：音效、计时器、画布工具
import { useAudio } from '@/composables/game/audio.js'
import { useTimer } from '@/composables/game/timer.js'
import { line as canvasLine } from '@/utils/game/canvas.js'

// ================= 常量 =================
const W = 960, H = 640

// ================= 题库配置 =================
const Q = {
  code: '030101-K33-01',
  title: '施工现场临时用电搭设',
  supply: 'AC380V 50Hz 三相四线+PE',
}

const PHASES = [
  { name: '三级配电两级保护搭设', obj: '按电路图布置 5 个配电箱并整定两级漏电保护' },
  { name: '箱间电缆线路连接', obj: '完成总箱—分箱—开关箱 4 条电缆连接' },
  { name: '用电设备接入', obj: '动力、照明设备接入对应开关箱并确认保护接地' },
  { name: '保护线检查与修复', obj: '检查 4 处箱体/箱门保护线，修复不规范接点' },
  { name: '线路检测与虚拟调试', obj: '5 项必检全部合格后方可模拟送电' },
  { name: '线路拆除', obj: '确认断电后从末端逐级拆除电缆并清点' },
  { name: '整理场地', obj: '工具归位、电缆回收、元件清点、场地检查' },
]

const cats = reactive({
  '系统搭设': { got: 0, max: 20 },
  '线路连接': { got: 0, max: 20 },
  '设备接入': { got: 0, max: 15 },
  '保护线检查': { got: 0, max: 15 },
  '检测调试': { got: 0, max: 15 },
  '线路拆除': { got: 0, max: 10 },
  '场地整理': { got: 0, max: 5 },
})

// ================= 三级配电布局 =================
const BOXES = reactive([
  { id: 'TB', name: '总配电箱', x: 60, y: 105, w: 120, h: 92, pts: 2, placed: false },
  { id: 'FA', name: '分配电箱A（动力）', x: 272, y: 95, w: 112, h: 80, pts: 2, placed: false },
  { id: 'FB', name: '分配电箱B（照明）', x: 272, y: 250, w: 112, h: 80, pts: 2, placed: false },
  { id: 'SA', name: '动力开关箱', x: 482, y: 95, w: 104, h: 78, pts: 2, placed: false },
  { id: 'SB', name: '照明开关箱', x: 482, y: 250, w: 104, h: 78, pts: 2, placed: false },
])
const box = id => BOXES.find(b => b.id === id)

const LEAK_MAIN = ['15mA · 0.1s', '50mA · 0.2s', '100mA · 0.5s']
const LEAK_SW = ['30mA · 0.1s', '50mA · 0.3s', '15mA · 0.3s']
const leak = reactive({ main: '', sw: '', mainOk: false, swOk: false })

const BRANCHES = reactive([
  { k: '动力支路 → 分配电箱A → 动力开关箱', done: false },
  { k: '照明支路 → 分配电箱B → 照明开关箱', done: false },
])

// ================= 电缆 =================
const CABLES = reactive([
  { id: 'C1', from: 'TB', to: 'FA', name: '总箱→分配电箱A（动力干线）', pts: 4, done: false, removed: false },
  { id: 'C2', from: 'TB', to: 'FB', name: '总箱→分配电箱B（照明干线）', pts: 4, done: false, removed: false },
  { id: 'C3', from: 'FA', to: 'SA', name: '分配电箱A→动力开关箱', pts: 4, done: false, removed: false },
  { id: 'C4', from: 'FB', to: 'SB', name: '分配电箱B→照明开关箱', pts: 4, done: false, removed: false },
])
const LAYING = reactive([
  { k: '电缆标识齐全（起止点、型号规格）', done: false },
  { k: '架空 / 埋地敷设，防机械损伤与介质腐蚀', done: false },
])

// ================= 用电设备 =================
const DEVICES = reactive([
  { id: 'D1', name: '塔式起重机', kind: '动力', need: 'SA', x: 680, y: 66, w: 122, h: 78, route: '' },
  { id: 'D2', name: '混凝土搅拌机', kind: '动力', need: 'SA', x: 822, y: 66, w: 122, h: 78, route: '' },
  { id: 'D3', name: '照明灯塔', kind: '照明', need: 'SB', x: 680, y: 250, w: 122, h: 78, route: '' },
  { id: 'D4', name: '移动插座箱', kind: '照明', need: 'SB', x: 822, y: 250, w: 122, h: 78, route: '' },
])
const GROUND = reactive([
  { k: '设备金属外壳与 PE 线可靠连接', done: false },
  { k: 'PE 线不经过开关 / 熔断器', done: false },
  { k: '开关箱箱体做重复接地', done: false },
])

// ================= 保护线检查 =================
const PE_POINTS = reactive([
  { id: 'P1', name: '总配电箱箱体 PE', x: 72, y: 200, checked: false, fault: false, fixed: false },
  { id: 'P2', name: '分配电箱A 箱体 PE', x: 284, y: 178, checked: false, fault: false, fixed: false },
  { id: 'P3', name: '动力开关箱箱门 PE', x: 494, y: 176, checked: false, fault: false, fixed: false },
  { id: 'P4', name: '照明开关箱箱门 PE', x: 494, y: 331, checked: false, fault: true, fixed: false },
])
const pe = reactive({ found: false, rechecked: false })

// ================= 检测与送电 =================
const TESTS = reactive([
  { k: '线路连接关系核对', res: '', done: false },
  { k: '保护接地连续性检查', res: '', done: false },
  { k: '绝缘电阻检测', res: '', done: false },
  { k: '漏电保护动作特性试验', res: '', done: false },
  { k: '动力、照明支路核对', res: '', done: false },
])
const power = ref(false)

// ================= 拆除与整理 =================
const CLEANUP = reactive([
  { k: '电缆分类整理、盘装回收', pts: 2, done: false },
  { k: '元件设备检查清点、无损坏遗漏', pts: 2, done: false },
])
const offDone = ref(false)
const TIDY = reactive([
  { k: '工具归位' }, { k: '电缆盘回收' }, { k: '配电箱周围清理' }, { k: '元件清点' }, { k: '场地安全检查' },
])

// ================= 通用状态 =================
const stageRef = ref(null)
const canvasRef = ref(null)
const ctx = ref(null)
const screen = ref('title')
const phase = ref(-1)
const lock = ref(false)
const paused = ref(false)
const sheetOpen = ref(true)
const mistakes = ref(0)
const violations = ref([])
const cursor = reactive({ x: 0, y: 0, on: false })
const pickFrom = ref(null)
const devPick = ref(null)

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
const stars = computed(() => (total.value >= 95 ? 5 : total.value >= 88 ? 4 : total.value >= 80 ? 3 : total.value >= 60 ? 2 : 1))
const verdict = computed(() =>
  violations.value.length
    ? '任务判定：存在重大安全违规，实操不合格，请重新学习规范后再次考核。'
    : total.value >= 80 ? '任务判定合格：临时用电系统搭设符合三级配电、两级保护要求。'
      : '任务判定不合格：得分未达到合格线 80 分，请重新完成本关。')

const placedCount = computed(() => BOXES.filter(b => b.placed).length)
const nextBox = computed(() => { const i = BOXES.findIndex(b => !b.placed); return i < 0 ? -1 : i })
const leakOk = computed(() => (leak.mainOk ? 1 : 0) + (leak.swOk ? 1 : 0))
const branchDone = computed(() => BRANCHES.filter(i => i.done).length)
const task1Ok = computed(() => placedCount.value === 5 && leakOk.value === 2 && branchDone.value === 2)
const cableDone = computed(() => CABLES.filter(c => c.done).length)
const layDone = computed(() => LAYING.filter(i => i.done).length)
const task2Ok = computed(() => cableDone.value === 4 && layDone.value === 2)
const devDone = computed(() => DEVICES.filter(d => d.route).length)
const gndDone = computed(() => GROUND.filter(i => i.done).length)
const task3Ok = computed(() => devDone.value === 4 && gndDone.value === 3)
const peDone = computed(() => PE_POINTS.filter(p => p.checked).length)
const task4Ok = computed(() => peDone.value === 4 && pe.found && pe.fixed && pe.rechecked)
const testDone = computed(() => TESTS.filter(t => t.done).length)
const removeDone = computed(() => CABLES.filter(c => c.removed).length)
const cleanDone = computed(() => CLEANUP.filter(i => i.done).length)
const task6Ok = computed(() => offDone.value && removeDone.value === 4 && cleanDone.value === 2)
const tidyDone = computed(() => TIDY.filter(i => i.done).length)

const canvasCursor = computed(() => (phase.value >= 0 && phase.value <= 3 ? 'pointer' : 'default'))

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
  pickFrom.value = null
  devPick.value = null
  if (i >= 0 && i < PHASES.length) showMsg(`任务 ${i + 1}：${PHASES[i].name}`, 'info')
  if (i >= PHASES.length) screen.value = 'results'
}
function completePhase() {
  if (lock.value) return
  lock.value = true
  beep(880, .12)
  later(() => { lock.value = false; enterPhase(phase.value + 1) }, 1200)
}
// 二次校验：按钮 disabled 是第一道闸，这里兜底（防止事件时序/状态未刷新时跳过校验过关）
const phaseOk = [task1Ok, task2Ok, task3Ok, task4Ok, power, task6Ok]
function submitPhase() {
  const ok = phaseOk[phase.value]
  if (ok && !ok.value) {
    showMsg('请先完成本阶段全部要求再提交', 'warn')
    return
  }
  completePhase()
}

// ================= 任务1：三级配电、两级保护 =================
function placeBox(b) {
  if (paused.value || lock.value) return
  if (b.placed) { showMsg(`${b.name} 已就位`, 'info'); return }
  const nx = nextBox.value
  if (BOXES.indexOf(b) !== nx) {
    penalize('系统搭设', 1)
    showMsg(`请按三级配电顺序布置：下一步「${BOXES[nx].name}」（-1 分）`, 'warn')
    return
  }
  b.placed = true
  addScore('系统搭设', b.pts)
  beep(700, .05)
  showMsg(`✔ ${b.name} 就位（${placedCount.value}/5）　+${b.pts} 分`, 'good')
  if (placedCount.value === 5) showMsg('✔ 三级配电箱体布置完成，请整定两级漏电保护', 'good')
}
function setLeak(k, v) {
  if (paused.value || lock.value) return
  leak[k] = v
  if (k === 'main') {
    if (placedCount.value < 5) { showMsg('请先完成 5 个箱体布置', 'warn'); return }
    if (leak.mainOk) return
    if (v === LEAK_MAIN[1]) {
      leak.mainOk = true
      addScore('系统搭设', 4)
      beep(760, .08)
      showMsg('✔ 总配电箱漏电保护整定正确：50mA · 0.2s（动作电流>30mA、时间>0.1s、乘积10mA·s≤30）　+4 分', 'good')
    } else {
      penalize('系统搭设', 1)
      showMsg('× 总箱整定不符：要求动作电流 >30mA 且时间 >0.1s、二者乘积 ≤30mA·s（-1 分）', 'warn')
    }
  } else {
    if (placedCount.value < 5) { showMsg('请先完成 5 个箱体布置', 'warn'); return }
    if (leak.swOk) return
    if (v === LEAK_SW[0]) {
      leak.swOk = true
      addScore('系统搭设', 4)
      beep(760, .08)
      showMsg('✔ 开关箱漏电保护整定正确：30mA · 0.1s（第二级保护）　+4 分', 'good')
    } else {
      penalize('系统搭设', 1)
      showMsg('× 开关箱整定不符：要求 ≤30mA、≤0.1s（-1 分）', 'warn')
    }
  }
}
function checkBranch(it) {
  if (paused.value || lock.value || it.done) return
  it.done = true
  addScore('系统搭设', 1)
  beep(700, .05)
  showMsg(`✔ 已确认支路标识：${it.k}　+1 分`, 'good')
}

// ================= 任务2：箱间电缆连接 =================
function connectCable(cb) {
  if (paused.value || lock.value) return
  if (cb.done) { showMsg(`${cb.name} 已连接`, 'info'); return }
  if (!box(cb.from).placed || !box(cb.to).placed) { showMsg('相关箱体尚未就位', 'warn'); return }
  cb.done = true
  addScore('线路连接', cb.pts)
  beep(720, .06)
  showMsg(`✔ 已连接：${cb.name}　+${cb.pts} 分`, 'good')
  if (cableDone.value === 4) showMsg('✔ 4 条箱间电缆连接完成，请进行敷设检查', 'good')
}
function checkLaying(it) {
  if (paused.value || lock.value || it.done) return
  it.done = true
  addScore('线路连接', 2)
  beep(700, .05)
  showMsg(`✔ 敷设检查合格：${it.k}　+2 分`, 'good')
}

// ================= 任务3：设备接入 =================
function routeDev(d, target) {
  if (paused.value || lock.value) return
  if (d.route) { showMsg(`${d.name} 已接入 ${d.route === 'SA' ? '动力开关箱' : '照明开关箱'}`, 'info'); return }
  if (target !== d.need) {
    penalize('设备接入', 2)
    showMsg(`× 支路对应关系错误：${d.name} 属${d.kind}设备，应接入${d.need === 'SA' ? '动力开关箱' : '照明开关箱'}（-2 分）`, 'warn')
    return
  }
  d.route = target
  addScore('设备接入', 3)
  beep(720, .06)
  showMsg(`✔ ${d.name}（${d.kind}）已接入${target === 'SA' ? '动力开关箱' : '照明开关箱'}　+3 分`, 'good')
}
function checkGnd(it) {
  if (paused.value || lock.value || it.done) return
  it.done = true
  addScore('设备接入', 1)
  beep(700, .05)
  showMsg(`✔ ${it.k}　+1 分`, 'good')
}

// ================= 任务4：保护线检查与修复 =================
function checkPE(p) {
  if (paused.value || lock.value) return
  if (p.checked) { showMsg(`${p.name} 已检查`, 'info'); return }
  p.checked = true
  addScore('保护线检查', 2)
  beep(700, .05)
  if (p.fault) {
    beep(160, .35, 'sawtooth')
    showMsg(`⚠ ${p.name} 连续性不合格：箱门跨接保护线虚接，请定位并修复　+2 分`, 'warn')
  } else {
    showMsg(`✔ ${p.name} 连续性合格　+2 分`, 'good')
  }
}
function locateFault() {
  if (paused.value || lock.value || pe.found) return
  if (peDone.value < 4) { showMsg(`请先完成 4 处保护线检查（已完成 ${peDone.value}/4）`, 'warn'); return }
  pe.found = true
  addScore('保护线检查', 3)
  beep(520, .14)
  showMsg('✔ 已定位故障点：照明开关箱箱门保护线跨接线虚接（接触电阻超标）　+3 分', 'warn')
}
function repairFault() {
  if (paused.value || lock.value || pe.fixed) return
  if (power.value) {
    majorViolation('带电修复保护线：系统仍处于送电状态', '保护线检查', 5)
    return
  }
  if (!pe.found) { showMsg('请先定位故障点', 'warn'); return }
  pe.fixed = true
  PE_POINTS[3].fixed = true
  addScore('保护线检查', 2)
  beep(700, .08)
  showMsg('✔ 已断电修复：重新压接箱门跨接保护线，连接可靠　+2 分', 'good')
}
function recheckPE() {
  if (paused.value || lock.value || pe.rechecked) return
  if (!pe.fixed) { showMsg('请先完成修复', 'warn'); return }
  pe.rechecked = true
  addScore('保护线检查', 2)
  beep(880, .12)
  showMsg('✔ 复检合格：保护导体连续性 0.02Ω，全线 PE 连接可靠　+2 分', 'good')
}

// ================= 任务5：检测与虚拟调试 =================
function runTest(t) {
  if (paused.value || lock.value) return
  if (t.done) { showMsg(`${t.k}：${t.res}`, 'info'); return }
  switch (t.k) {
    case '线路连接关系核对':
      if (cableDone.value < 4) { showMsg('线路检查失败：仍有电缆未连接，请返回任务 2 补接', 'warn'); return }
      t.res = '与图纸一致'; break
    case '保护接地连续性检查':
      if (!pe.rechecked) { showMsg('保护连续性检查失败：箱门保护线故障未修复，请返回任务 4', 'warn'); return }
      t.res = '0.02Ω 合格'; break
    case '绝缘电阻检测':
      t.res = '0.8MΩ ≥0.5MΩ'; break
    case '漏电保护动作特性试验':
      if (!leak.mainOk || !leak.swOk) { showMsg('保护配置检查失败：两级漏电保护整定不符，请返回任务 1', 'warn'); return }
      t.res = '两级动作正常'; break
    case '动力、照明支路核对':
      if (devDone.value < 4) { showMsg('支路核对失败：仍有设备未接入，请返回任务 3', 'warn'); return }
      t.res = '支路对应正确'; break
  }
  t.done = true
  addScore('检测调试', 2)
  beep(760, .06)
  showMsg(`✔ ${t.k}：${t.res}　+2 分`, 'good')
}
function powerOn() {
  if (paused.value || lock.value || power.value) return
  if (testDone.value < 5) {
    majorViolation('未完成安全检查即尝试送电：系统安全锁定', '检测调试', 5)
    return
  }
  if (!leak.mainOk || !leak.swOk) {
    majorViolation('未配置合格的两级漏电保护即送电', '检测调试', 5)
    return
  }
  power.value = true
  addScore('检测调试', 5)
  beep(880, .14)
  showMsg('✔ 模拟送电成功：三级配电带电运行，动力 / 照明支路工作正常　+5 分', 'good')
}
function powerOff() {
  if (!power.value) { showMsg('仿真电源已断开', 'info'); return }
  power.value = false
  showMsg('✔ 仿真电源已断开，进入断电拆除模式', 'good')
}

// ================= 任务6：拆除 =================
function confirmOff() {
  if (paused.value || lock.value || offDone.value) return
  if (power.value) {
    showMsg('仿真电源仍在运行：请先点击上方「断开仿真电源」', 'warn')
    return
  }
  offDone.value = true
  addScore('线路拆除', 2)
  beep(700, .06)
  showMsg('✔ 已确认仿真电源断开、验电无电，可开始拆除作业　+2 分', 'good')
}
function removeCable(cb) {
  if (paused.value || lock.value) return
  if (!cb.done) { showMsg(`${cb.name} 未连接，无需解除`, 'info'); return }
  if (cb.removed) { showMsg(`${cb.name} 已解除`, 'info'); return }
  if (!offDone.value) {
    if (power.value) {
      majorViolation('未确认断电即拆除线路：系统带电作业', '线路拆除', 4)
    } else {
      showMsg('请先确认仿真电源已断开（点击「确认断电」）', 'warn')
    }
    return
  }
  const order = ['C4', 'C3', 'C2', 'C1']
  if (order.indexOf(cb.id) !== removeDone.value) {
    penalize('线路拆除', 1)
    showMsg(`× 拆除顺序错误：下一步应解除「${order[removeDone.value]}」末端开关箱侧电缆（-1 分）`, 'warn')
    return
  }
  cb.removed = true
  addScore('线路拆除', 1)
  beep(700, .05)
  showMsg(`✔ 已解除：${cb.name}　+1 分`, 'good')
}
function doCleanup(it) {
  if (paused.value || lock.value || it.done) return
  if (removeDone.value < 4) { showMsg('请先完成 4 条电缆的解除', 'warn'); return }
  it.done = true
  addScore('线路拆除', it.pts)
  beep(700, .05)
  showMsg(`✔ ${it.k}　+${it.pts} 分`, 'good')
}

// ================= 任务7：整理场地 =================
function checkTidy(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('场地整理', 1)
  beep(700, .06)
  showMsg(`✔ ${it.k}　+1 分`, 'good')
}
function finishLevel() {
  if (lock.value) return
  addScore('场地整理', 1)
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
  power.value = false
  offDone.value = false
  BOXES.forEach(b => { b.placed = false })
  leak.main = ''; leak.sw = ''; leak.mainOk = false; leak.swOk = false
  BRANCHES.forEach(i => { i.done = false })
  CABLES.forEach(c => { c.done = false; c.removed = false })
  LAYING.forEach(i => { i.done = false })
  DEVICES.forEach(d => { d.route = '' })
  GROUND.forEach(i => { i.done = false })
  PE_POINTS.forEach((p, i) => {
    p.checked = false; p.fixed = false
    p.fault = i === PE_POINTS.length - 1
  })
  pe.found = false; pe.rechecked = false
  TESTS.forEach(t => { t.done = false; t.res = '' })
  CLEANUP.forEach(i => { i.done = false })
  TIDY.forEach(i => { i.done = false })
  pickFrom.value = null
  devPick.value = null
  cursor.on = false
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
}
function onCanvasLeave() { cursor.on = false }
function onCanvasClick(e) {
  if (screen.value !== 'play' || paused.value || lock.value) return
  const p = toCanvas(e)
  if (phase.value === 0) {
    const b = BOXES.find(b => inRect(p.x, p.y, b))
    if (b) placeBox(b)
    else showMsg('请点击配电箱虚线布置位置，或使用面板步骤按钮', 'info')
    return
  }
  if (phase.value === 1) {
    const b = BOXES.find(b => inRect(p.x, p.y, b))
    if (!b) { showMsg('请点击配电箱', 'info'); return }
    if (!pickFrom.value) { pickFrom.value = b; showMsg(`起点：${b.name}，请点击终点箱体`, 'info'); return }
    const cb = CABLES.find(c => c.from === pickFrom.value.id && c.to === b.id)
      || CABLES.find(c => c.to === pickFrom.value.id && c.from === b.id)
    if (cb) connectCable(cb)
    else { penalize('线路连接', 2); showMsg('× 错误跨接：该连接与电路图不符，已拒绝（-2 分）', 'warn') }
    pickFrom.value = null
    return
  }
  if (phase.value === 2) {
    const d = DEVICES.find(d => inRect(p.x, p.y, d))
    if (d) { devPick.value = d; showMsg(`已选择设备：${d.name}（${d.kind}），请点击目标开关箱`, 'info'); return }
    const b = BOXES.find(b => inRect(p.x, p.y, b) && (b.id === 'SA' || b.id === 'SB'))
    if (b && devPick.value) { routeDev(devPick.value, b.id); devPick.value = null; return }
    showMsg('请先点击用电设备，再点击动力 / 照明开关箱', 'info')
    return
  }
  if (phase.value === 3) {
    const pnt = PE_POINTS.find(pp => Math.hypot(p.x - pp.x, p.y - pp.y) <= 22)
    if (pnt) { checkPE(pnt); return }
    showMsg('请点击箱体下方的绿色 PE 测试点进行连续性检查', 'info')
  }
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
function txt(c, s, x, y, col = '#000', font = '12px sans-serif', align = 'center') {
  c.fillStyle = col; c.font = font; c.textAlign = align; c.textBaseline = 'middle'
  c.fillText(s, x, y)
}

// ================= 场景绘制 =================
function drawSite(c) {
  // 天空
  const sky = c.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, '#8fb8d8'); sky.addColorStop(1, '#d9e6ef')
  rect(c, 0, 0, W, 420, sky)
  // 远景楼群
  ;[[40, 250, 70], [130, 210, 60], [210, 270, 90], [330, 230, 70], [430, 260, 100], [560, 220, 80], [670, 255, 120], [820, 235, 90]].forEach(([x, y, w], i) => {
    rect(c, x, y, w, 420 - y, i % 2 ? '#b9c7d2' : '#a9b9c6', '#93a3b0', 1)
    for (let r = 0; r < 4; r++) for (let q = 0; q < Math.floor(w / 22); q++) {
      rect(c, x + 8 + q * 22, y + 12 + r * 26, 12, 14, 'rgba(255,255,255,.35)', null)
    }
  })
  // 塔吊
  canvasLine(c, 900, 300, 900, 90, '#5d6d7b', 5)
  canvasLine(c, 900, 100, 760, 118, '#5d6d7b', 4)
  canvasLine(c, 900, 100, 946, 128, '#5d6d7b', 3)
  canvasLine(c, 786, 118, 786, 168, '#8a97a3', 2)
  rect(c, 774, 168, 24, 18, '#7c8894', '#5d6d7b', 1)
  txt(c, '在建工程', 900, 316, 'rgba(40,55,70,.6)', '11px sans-serif')
  // 地面
  const gnd = c.createLinearGradient(0, 380, 0, H)
  gnd.addColorStop(0, '#c9b28b'); gnd.addColorStop(1, '#a8916b')
  rect(c, 0, 380, W, H - 380, gnd)
  canvasLine(c, 0, 380, W, 380, '#8d7a58', 2)
  // 施工围挡
  for (let x = 0; x < W; x += 60) {
    rect(c, x, 402, 56, 22, '#2f6fb5', '#1f4c80', 1)
    rect(c, x + 26, 396, 4, 34, '#4d5c68', null)
  }
  txt(c, '施工临时用电作业区 · 三级配电两级保护', 480, 442, 'rgba(60,45,25,.55)', 'bold 13px sans-serif')
}

function drawPowerIn(c) {
  const on = power.value
  const x = 20, y = 140
  canvasLine(c, x, y, box('TB').x - 4, y, on ? '#f9a825' : '#9aa7b4', on ? 4 : 3)
  circle(c, x + 6, y - 14, 8, on ? '#f9a825' : '#c5ccd3', '#5d6d7b', 1.5)
  txt(c, on ? '380V 带电' : '电源', x + 6, y - 30, on ? '#c62828' : '#5d6d7b', 'bold 11px sans-serif')
  txt(c, 'TN-S', x + 6, y + 16, '#5d6d7b', '10px sans-serif')
}

function drawBoxUnit(c, b, t) {
  if (!b.placed) {
    // 待布置虚线位
    const idx = BOXES.indexOf(b)
    const active = phase.value === 0 && idx === nextBox.value
    const pulse = active ? 1 + .05 * Math.sin(t / 220) : 1
    c.save(); c.setLineDash([9, 6])
    c.strokeStyle = active ? '#1a3fc4' : 'rgba(60,80,100,.5)'
    c.lineWidth = active ? 3 : 2
    c.strokeRect(b.x - 4, b.y - 4, (b.w + 8) * pulse, b.h + 8)
    c.restore()
    txt(c, `①②③④⑤`[idx], b.x + b.w / 2, b.y + b.h / 2 - 8, active ? '#1a3fc4' : 'rgba(60,80,100,.7)', 'bold 20px sans-serif')
    txt(c, active ? `布置${b.name}` : b.name, b.x + b.w / 2, b.y + b.h / 2 + 16, active ? '#122d94' : 'rgba(60,80,100,.7)', 'bold 12px sans-serif')
    return
  }
  // 箱体
  rect(c, b.x, b.y, b.w, b.h, '#e8edf2', '#3f4d5a', 2)
  rect(c, b.x, b.y, b.w, 16, '#3f6d9c', '#2b4a6d')
  txt(c, b.name, b.x + b.w / 2, b.y + 9, '#fff', 'bold 11px sans-serif')
  // 箱门与把手
  canvasLine(c, b.x + b.w / 2, b.y + 16, b.x + b.w / 2, b.y + b.h, '#c3ccd5', 1.5)
  rect(c, b.x + 8, b.y + 24, b.w / 2 - 16, b.h - 32, '#f7f9fb', '#c3ccd5', 1)
  rect(c, b.x + b.w / 2 + 8, b.y + 24, b.w / 2 - 16, b.h - 32, '#f7f9fb', '#c3ccd5', 1)
  circle(c, b.x + b.w / 2 - 5, b.y + 46, 3, '#8b98a4')
  circle(c, b.x + b.w / 2 + 5, b.y + 46, 3, '#8b98a4')
  // 内部示意
  if (b.w > 100) {
    rect(c, b.x + 14, b.y + 30, b.w - 28, 12, '#dfe5ea', '#b6c0ca', 1)
    rect(c, b.x + 14, b.y + 48, (b.w - 28) / 2 - 3, 18, '#eceff1', '#b6c0ca', 1)
    rect(c, b.x + b.w / 2 - 1, b.y + 48, (b.w - 28) / 2 - 3, 18, '#eceff1', '#b6c0ca', 1)
  }
  // 漏电保护器标识
  const isMain = b.id === 'TB'
  const isSw = b.id === 'SA' || b.id === 'SB'
  if (isMain || isSw) {
    const ok = isMain ? leak.mainOk : leak.swOk
    const val = isMain ? leak.main : leak.sw
    rect(c, b.x + b.w - 40, b.y + b.h - 22, 36, 18, ok ? '#2e7d32' : '#eceff1', ok ? '#1b5e20' : '#b6c0ca', 1)
    txt(c, ok ? 'RCD √' : 'RCD', b.x + b.w - 22, b.y + b.h - 13, ok ? '#fff' : '#78909c', 'bold 10px sans-serif')
    if (ok) txt(c, val, b.x + b.w / 2, b.y + b.h + 12, '#2e7d32', '11px sans-serif')
  }
  // 带电运行指示
  if (power.value && phase.value >= 4) {
    circle(c, b.x + 12, b.y + 9, 4, '#ff5252', '#7f1d1d', 1)
  }
}

function cablePath(c, b1, b2, col, lw, dash) {
  const x1 = b1.x + b1.w, y1 = b1.y + b1.h / 2
  const x2 = b2.x, y2 = b2.y + b2.h / 2
  c.save()
  if (dash) c.setLineDash(dash)
  c.strokeStyle = col; c.lineWidth = lw
  c.beginPath(); c.moveTo(x1, y1)
  const mx = (x1 + x2) / 2
  c.bezierCurveTo(mx, y1, mx, y2, x2, y2)
  c.stroke()
  c.restore()
}

function drawCables(c, t) {
  for (const cb of CABLES) {
    const b1 = box(cb.from), b2 = box(cb.to)
    if (!b1.placed || !b2.placed) continue
    if (cb.done && !cb.removed) {
      const live = power.value && phase.value >= 4
      cablePath(c, b1, b2, live ? '#37474f' : '#455a64', 6)
      cablePath(c, b1, b2, live ? '#f9a825' : '#78909c', 2.5)
      if (live) {
        const off = (t / 22) % 40
        c.save(); c.setLineDash([8, 32]); c.lineDashOffset = -off
        cablePath(c, b1, b2, 'rgba(255,235,59,.95)', 3)
        c.restore()
      }
      txt(c, cb.id, (b1.x + b1.w + b2.x) / 2, (b1.y + b1.h / 2 + b2.y + b2.h / 2) / 2 - 10, 'rgba(20,30,40,.7)', 'bold 10px sans-serif')
    } else {
      cablePath(c, b1, b2, 'rgba(80,100,120,.45)', 2, [8, 6])
      txt(c, '待连接', (b1.x + b1.w + b2.x) / 2, (b1.y + b1.h / 2 + b2.y + b2.h / 2) / 2 - 10, 'rgba(60,80,100,.7)', '10px sans-serif')
    }
  }
}

function drawDevices(c, t) {
  for (const d of DEVICES) {
    const isPow = d.kind === '动力'
    const connected = !!d.route
    rect(c, d.x, d.y, d.w, d.h, connected ? '#eef3f7' : '#f4f6f8', connected ? '#2e7d32' : '#9aa7b4', connected ? 2.5 : 1.5)
    if (isPow) {
      // 电动类设备
      circle(c, d.x + 26, d.y + 34, 16, '#78909c', '#37474f', 2)
      circle(c, d.x + 26, d.y + 34, 5, '#cfd8dc')
      rect(c, d.x + 50, d.y + 22, 40, 24, '#90a4ae', '#37474f', 1)
      txt(c, '380V', d.x + 70, d.y + 34, '#fff', '10px sans-serif')
    } else {
      // 照明设备
      canvasLine(c, d.x + 26, d.y + 18, d.x + 26, d.y + 40, '#78909c', 2)
      circle(c, d.x + 26, d.y + 46, 11, connected ? '#ffe082' : '#e0e0e0', '#8d6e63', 2)
      rect(c, d.x + 50, d.y + 24, 40, 22, '#b0bec5', '#546e75', 1)
      txt(c, '220V', d.x + 70, d.y + 35, '#263238', '10px sans-serif')
    }
    txt(c, d.name, d.x + d.w / 2, d.y + 62, '#263238', 'bold 11px sans-serif')
    txt(c, d.kind, d.x + 8, d.y + 12, isPow ? '#c62828' : '#ef6c00', 'bold 10px sans-serif')
    if (connected) {
      const b = box(d.route)
      const x1 = d.x, y1 = d.y + d.h / 2, x2 = b.x + b.w, y2 = b.y + b.h / 2
      const live = power.value && phase.value >= 4
      canvasLine(c, x2, y2, x1, y1, live ? '#f9a825' : '#546e75', 3)
      txt(c, '√', (x1 + x2) / 2, (y1 + y2) / 2, '#2e7d32', 'bold 13px sans-serif')
    } else if (phase.value === 2) {
      const pulse = 1 + .14 * Math.sin(t / 240)
      c.save(); c.setLineDash([6, 4]); c.strokeStyle = '#1a3fc4'; c.lineWidth = 2.5
      c.strokeRect(d.x - 4, d.y - 4, (d.w + 8) * pulse, d.h + 8)
      c.restore()
    }
  }
}

function drawPE(c, t) {
  for (const p of PE_POINTS) {
    const ok = p.checked && !p.fault
    const bad = p.checked && p.fault && !p.fixed
    const fixed = p.fault && p.fixed
    const col = bad ? '#f44336' : (ok || fixed ? '#2e7d32' : '#43a047')
    if (!p.checked && phase.value === 3) {
      const pulse = 1 + .16 * Math.sin(t / 240)
      circle(c, p.x, p.y, 9 * pulse, 'rgba(67,160,71,.25)', col, 2.5)
    } else {
      circle(c, p.x, p.y, 9, bad ? 'rgba(244,67,54,.25)' : 'rgba(67,160,71,.25)', col, 2.5)
    }
    txt(c, '⏚', p.x, p.y + 1, bad ? '#c62828' : '#1b5e20', 'bold 11px sans-serif')
    if (bad) {
      canvasLine(c, p.x - 6, p.y - 6, p.x + 6, p.y + 6, '#c62828', 2.5)
      canvasLine(c, p.x - 6, p.y + 6, p.x + 6, p.y - 6, '#c62828', 2.5)
      const pulse = 1 + .2 * Math.sin(t / 150)
      c.save(); c.shadowColor = '#f44336'; c.shadowBlur = 16
      circle(c, p.x, p.y, 16 * pulse, null, '#f44336', 3)
      c.restore()
      txt(c, '虚接 · 点击检查', p.x + 66, p.y, '#c62828', 'bold 11px sans-serif')
    }
  }
  if (phase.value === 3 && peDone.value < 4) {
    txt(c, '逐个点击绿色 ⏚ 测试点检查保护线连续性', 720, 400, 'rgba(30,50,70,.75)', 'bold 12px sans-serif')
  }
}

function drawPhaseHints(c, t) {
  if (phase.value === 0 && placedCount.value < 5 && screen.value === 'play') {
    txt(c, '按 ①~⑤ 顺序点击虚线框布置箱体', 720, 400, 'rgba(30,50,70,.75)', 'bold 12px sans-serif')
  }
  if (phase.value === 1 && cableDone.value < 4) {
    txt(c, '点击起点箱体 → 终点箱体，或点击面板清单项', 720, 400, 'rgba(30,50,70,.75)', 'bold 12px sans-serif')
  }
  if (phase.value === 4) {
    rect(c, 700, 356, 240, 44, 'rgba(20,32,44,.88)', '#2f4156')
    circle(c, 718, 378, 7, power.value ? '#43a047' : '#ef6c00', '#0f1b25', 1.5)
    txt(c, `仿真电源：${power.value ? '运行中' : '断电'}`, 734, 378, '#e3eef7', '12px sans-serif', 'left')
    txt(c, `必检 ${testDone.value}/5`, 928, 378, testDone.value === 5 ? '#8bc34a' : '#ffd54f', 'bold 12px sans-serif', 'right')
  }
  if (phase.value === 5) {
    rect(c, 700, 356, 240, 44, 'rgba(20,32,44,.88)', '#2f4156')
    circle(c, 718, 378, 7, offDone.value ? '#43a047' : '#ef6c00', '#0f1b25', 1.5)
    txt(c, `断电确认：${offDone.value ? '√ 已断电' : '未确认'}`, 734, 378, '#e3eef7', '12px sans-serif', 'left')
    txt(c, `拆缆 ${removeDone.value}/4`, 928, 378, '#ffd54f', 'bold 12px sans-serif', 'right')
  }
}

function drawScene(t) {
  const c = ctx.value
  drawSite(c)
  drawPowerIn(c)
  drawCables(c, t)
  for (const b of BOXES) drawBoxUnit(c, b, t)
  if (phase.value >= 2) drawDevices(c, t)
  else {
    for (const d of DEVICES) rect(c, d.x, d.y, d.w, d.h, 'rgba(240,244,248,.6)', 'rgba(150,165,180,.5)', 1.5)
  }
  if (phase.value === 3) drawPE(c, t)
  else for (const p of PE_POINTS) circle(c, p.x, p.y, 6, 'rgba(67,160,71,.18)', 'rgba(67,160,71,.45)', 1.5)
  drawPhaseHints(c, t)

  if (cursor.on) {
    circle(c, cursor.x, cursor.y, 12, null, 'rgba(26,63,196,.45)', 1.5)
  }
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
.status-inline { display: inline-block; margin: 4px 0; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.status i.off { color: #c62828; }
.status b { color: #122d94; }
.row { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
.row.center { justify-content: center; }
.hint { font-size: 12px; color: #78909c; }
.cname { font-size: 13px; font-weight: 600; color: #37474f; margin-top: 4px; }
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
.sc-t { margin-left: auto; color: #2e7d32; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 12px; }
.opt {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.opt:hover { background: #f0f4fa; }
.opt.sel { background: #1a3fc4; border-color: #1a3fc4; color: #fff; font-weight: 600; }

.dev-row {
  display: flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #c9d2dd;
  border-radius: 5px;
  padding: 4px 6px;
  background: #fff;
}
.dev-row.sel { background: #e8f5e9; border-color: #66bb6a; }
.dev-name { font-size: 13px; font-weight: 600; color: #37474f; flex: 1; }
.dev-name i { font-style: normal; font-size: 11px; color: #ef6c00; margin-left: 4px; }

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

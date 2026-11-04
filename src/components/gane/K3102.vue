<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K31-02 · 单相电能表带照明设备接线</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>调试 <b>{{ DebugController.count }}/2</b></span>
      <span>违规 <b>{{ violations.length }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <div class="banner" v-if="screen === 'play'">
          <b>任务 {{ phase + 1 }}/7 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⚠ 存在严重安全风险 —— 任务暂停，请重新执行安全步骤</div>

        <!-- 任务2/3 元器件拖拽托盘 -->
        <div class="tray" v-if="screen === 'play' && phase === 2">
          <div class="tray-title">元器件存放区</div>
          <div
            v-for="c in compChips" :key="c.key + '-' + chipVer" v-show="!placed[c.key]"
            class="chip chip-comp"
            @pointerdown="e => startDrag(e, (x, y, r) => compDrop(c, x, y, r))"
          >{{ c.code }}<br>{{ c.label }}</div>
          <p class="tray-tip">按电路图拖到操作台对应安装位</p>
        </div>

        <!-- 任务面板 -->
        <div class="panel">
          <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 1, 'sheet-xl': phase === 4, folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

            <div v-show="sheetOpen" class="fold-area">

            <!-- 任务1：选择工具仪表 -->
            <div v-if="phase === 0" class="sheet-body">
              <h3>任务 1：选择电工工具和仪器仪表（10分）</h3>
              <p class="tip">进入器材摆放架，勾选本任务<b>安装接线与锡焊</b>所需的工具与仪表。无关工具扣分，<b>明显不合格的工具属严重违规</b>。</p>
              <div class="grid2">
                <div class="grp">
                  <div class="glabel">电工工具</div>
                  <label v-for="o in toolList" :key="o.n" class="chk" :class="{ sel: tools.sel.includes(o.n), bad: o.bad }">
                    <input type="checkbox" :value="o.n" v-model="tools.sel" @change="onToolToggle(o)">
                    <img v-if="imgUrl(o.n)" class="thumb" :src="imgUrl(o.n)" alt="">{{ o.n }}
                  </label>
                </div>
                <div class="grp">
                  <div class="glabel">仪器仪表</div>
                  <label v-for="o in meterList" :key="o.n" class="chk" :class="{ sel: tools.sel.includes(o.n) }">
                    <input type="checkbox" :value="o.n" v-model="tools.sel">
                    <img v-if="imgUrl(o.n)" class="thumb" :src="imgUrl(o.n)" alt="">{{ o.n }}
                  </label>
                </div>
              </div>
              <div class="row">
                <button class="btn primary" @click="confirmTools">确认选择</button>
                <span class="hint">提示：接线紧固、剥线压接、焊点焊接与通断检测各需要对应器具</span>
              </div>
            </div>

            <!-- 任务2：选择缺失元器件与导线 -->
            <div v-if="phase === 1" class="sheet-body">
              <h3>任务 2：选择缺失元器件与导线（15分）</h3>
              <p class="tip">对照电路图（电源 → 单相电能表 → 开关 → 端子排 → 镇流器 → 日光灯），找出<b>缺失元器件</b>并确定 L / N 导线颜色。</p>
              <div class="grid2">
                <div class="grp">
                  <div class="glabel">缺失元器件</div>
                  <label v-for="o in compList" :key="o" class="chk" :class="{ sel: parts.sel.includes(o) }">
                    <input type="checkbox" :value="o" v-model="parts.sel">
                    <img v-if="imgUrl(o)" class="thumb" :src="imgUrl(o)" alt="">{{ o }}
                  </label>
                </div>
                <div class="grp">
                  <div class="glabel">导线选择（线色）</div>
                  <div v-for="k in ['L', 'N']" :key="k" class="crow">
                    <span class="cname">{{ k }}线（{{ k === 'L' ? '火线' : '零线' }}）</span>
                    <button
                      v-for="c in COLORS" :key="c" class="opt"
                      :class="{ sel: colors[k] === c, ['sw-' + swatch(c)]: true }"
                      @click="colors[k] = c; beep(520, .04)"
                    >{{ c }}</button>
                  </div>
                  <p class="probe-tip">照明回路导线规格：BV 1.5mm²，<b>火线红色、零线蓝色</b>，不得混用。</p>
                </div>
              </div>
              <div class="row">
                <button class="btn primary" @click="confirmParts">确认选择</button>
                <span class="hint">规范：L=红色 · N=蓝色</span>
              </div>
            </div>

            <!-- 任务3：安装元器件并规范接线 -->
            <div v-if="phase === 2" class="sheet-body">
              <h3>任务 3：安装元器件并规范接线（25分）</h3>
              <p class="tip">先将左侧<b>元器件</b>拖到操作台对应安装位；再选择<b>导线线种</b>，依次点击<b>两个接线端子</b>完成接线。注意：<b>镇流器必须经端子排接入电路</b>。</p>
              <div class="row">
                <span class="cname">手持导线：</span>
                <button v-for="k in ['L', 'N']" :key="k" class="btn wire-btn" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">
                  {{ k }}线（{{ wireColorName(k) }}色）
                </button>
                <button class="btn" :disabled="!selWireId" @click="deleteSelWire">拆除选中导线</button>
                <button class="btn primary" @click="submitWiring">提交接线检查</button>
              </div>
              <p class="status">元件 <b>{{ placedCount }}/4</b>　正确接线 <b>{{ rightWireCount }}/8</b>
                <template v-if="pendId">　已选端子：<b>{{ TMAP[pendId].name }}</b></template>
                <template v-if="selWireId">　已选中导线（可拆除）</template>
                　得分 {{ cats['安装接线'].got }}/25</p>
            </div>

            <!-- 任务4：指定位置导线锡焊 -->
            <div v-if="phase === 3" class="sheet-body">
              <h3>任务 4：指定位置导线锡焊（10分）</h3>
              <p class="tip">焊接必须在<b>断电状态</b>下进行。先选择操作，再点击电路图上<b>指定焊点</b>，严格按 <b>预热 → 送锡 → 冷却检查</b> 顺序完成 3 个焊点，顺序错误该焊点作废重焊。</p>
              <div class="row">
                <span class="cname">当前操作：</span>
                <button v-for="op in SOLDER_OPS" :key="op" class="btn solder-btn" :class="{ sel: solderOp === op }" @click="solderOp = op; beep(520, .04)">{{ op }}</button>
              </div>
              <div class="row">
                <span v-for="p in solder.pts" :key="p.id" class="status inline" :class="{ 'done-pt': p.step >= 3 }">{{ p.name }} {{ p.step >= 3 ? '√' : p.step + '/3' }}　</span>
              </div>
              <div class="row">
                <button class="btn primary" :disabled="!solderDone" @click="finishSolder">完成锡焊，进入检查调试</button>
                <span class="hint">已完成 {{ solderDoneN }}/3 个焊点 · 工艺失误 {{ solder.mistakes }} 次 · 得分 {{ cats['锡焊'].got }}/10</span>
              </div>
            </div>

            <!-- 任务5：检查并通电调试 -->
            <div v-if="phase === 4" class="sheet-body">
              <h3>任务 5：检查并通电调试（25分 = 通电前检查15 + 调试结果10）</h3>
              <p class="tip">先完成<b>外观与安全确认</b>，再用万用表<b>通断测试档</b>测量 3 项；全部合格后申请通电调试。<b>通电调试最多 2 次</b>，次数用尽锁定调试入口。</p>
              <div class="grid2">
                <div class="grp">
                  <div class="glabel">通电前检查（{{ checkDone }}/8）</div>
                  <label v-for="it in look.items" :key="it.k" class="chk" :class="{ sel: it.done }" @click.prevent="checkLook(it)">
                    {{ it.done ? '√' : '□' }} {{ it.k }}（{{ it.pts }}分）
                  </label>
                  <label class="chk" :class="{ sel: safe.done }" @click.prevent="checkSafe">
                    {{ safe.done ? '√' : '□' }} 通电前安全确认·警示呼叫（1分）
                  </label>
                  <div class="row tight">
                    <span class="cname">检修导线：</span>
                    <button v-for="k in ['L', 'N']" :key="k" class="btn wire-btn sm" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">
                      {{ k }}线
                    </button>
                    <button class="btn sm" :disabled="!selWireId" @click="deleteSelWire">拆除选中</button>
                  </div>
                  <p class="probe-tip">调试失败后可直接在操作台<b>点击端子补接</b>或<b>点击导线拆除</b>，接线变更后须重新检查。</p>
                </div>
                <div class="grp">
                  <div class="glabel">万用表检测</div>
                  <div class="row tight">
                    <button v-for="m in MODES" :key="m" class="opt" :class="{ sel: meter.mode === m }" @click="chooseMode(m)">{{ m }}</button>
                  </div>
                  <div class="mtr" :class="{ on: meter.mode === '通断测试' }">
                    <span class="mtr-mode">{{ meter.mode || '未选择档位' }}</span>
                    <span class="mtr-read">{{ meter.readout || '---' }}</span>
                  </div>
                  <p class="probe-tip">点击操作台上两个接线端子测量（探针：<b>{{ probeA ? TMAP[probeA].name : '未选择' }}</b>）</p>
                  <ul class="test-list">
                    <li v-for="t in meter.tests" :key="t.id" :class="{ done: t.done && t.ok, fault: t.done && !t.ok }">
                      {{ t.done ? (t.ok ? '√' : '✗') : '○' }} {{ t.desc }}（应{{ t.expect }}）{{ t.done && !t.ok ? '　← 实测异常' : '' }}
                    </li>
                  </ul>
                </div>
              </div>

              <div class="console" :class="debugStatus.kind">
                <div class="console-head">
                  <b>⚡ 通电调试控制台</b>
                  <span>调试次数 {{ DebugController.count }}/2</span>
                </div>
                <div class="console-state">{{ debugStatus.text }}</div>
                <div class="row">
                  <button class="btn primary" :disabled="!canApply" @click="applyDebug">模拟调试（申请通电）</button>
                  <span class="hint">{{ canApply ? '检查合格，允许启动调试' : debugStatus.kind === 'lock' ? '调试入口已锁定' : '存在未排除故障或检查未完成，系统禁止启动调试' }}</span>
                </div>
                <div v-if="debugLocked" class="fault-log">
                  <b>⛔ 调试次数已达上限，禁止再次通电。故障记录：</b>
                  <p v-for="(l, i) in DebugController.logs" :key="i">第{{ l.n }}次：{{ l.detail }}</p>
                  <button class="btn" @click="restartRun">重新训练（重置调试记录）</button>
                </div>
                <div v-else-if="DebugController.logs.length" class="fault-log">
                  <b>调试记录：</b>
                  <p v-for="(l, i) in DebugController.logs" :key="i">第{{ l.n }}次：{{ l.detail }}</p>
                </div>
              </div>
            </div>

            <!-- 任务6：拆除电路 -->
            <div v-if="phase === 5" class="sheet-body">
              <h3>任务 6：拆除电路（10分）</h3>
              <p class="tip">严格按顺序操作：<b>断电确认 → 拆除导线 → 拆除元器件 → 分类存放</b>。<b>禁止带电拆线、强行拉扯导线与强行拆卸设备。</b>断电确认后可直接<b>点击画布上的导线</b>动手拆除。</p>
              <div class="steps">
                <button
                  v-for="(s, i) in DEMO_STEPS" :key="s.k" class="step"
                  :class="{ done: demo.step > i, next: demo.step === i }"
                  @click="demoStep(i)"
                >{{ demo.step > i ? '√' : i + 1 }}. {{ s.label }}（{{ s.pts }}分）</button>
              </div>
              <p class="status">实训台电源：<i :class="{ off: power }">{{ power ? '带电（红色指示灯亮）' : '已断电' }}</i>　进度 {{ demo.step }}/4　得分 {{ cats['拆除电路'].got }}/10</p>
            </div>

            <!-- 任务7：整理场地 -->
            <div v-if="phase === 6" class="sheet-body">
              <h3>任务 7：整理场地（5分）</h3>
              <p class="tip">完成现场 5S 整理，逐项确认后提交考核。</p>
              <div class="grid3">
                <label v-for="it in tidyItems" :key="it.k" class="chk" :class="{ sel: it.done }" @click.prevent="checkTidy(it)">
                  {{ it.done ? '√' : '□' }} {{ it.k }}
                </label>
              </div>
              <div class="row">
                <button class="btn primary" :disabled="tidyDone < 5" @click="finishLevel">完成整理，提交考核</button>
                <span class="hint">已完成 {{ tidyDone }}/5</span>
              </div>
            </div>
            </div>

          </div>
        </div>

        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K31-02</div>
            <h2>单相电能表带照明设备接线</h2>
            <p class="sub">低压电工考证 · 安装接线实训 · 7项任务 · 满分100分 · 建议难度 ★★★★☆</p>
            <div class="objs">
              <p>训练目标：根据给定电路图，补齐单相电能表带照明设备电路中缺失的元器件，完成<b>镇流器经端子排接入</b>、指定位置导线<b>锡焊</b>、通电调试及拆除整理。</p>
              <ul>
                <li>选择电工工具和仪器仪表（10）</li>
                <li>选择缺失元器件与导线（15）</li>
                <li>安装元器件并规范接线（25）</li>
                <li>指定位置导线锡焊（10）</li>
                <li>电路检查与通电调试（25）</li>
                <li>拆除电路（10）</li>
                <li>整理场地（5）</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 本关特殊规则：通电调试最多 2 次，每次启动均计数；第二次失败后锁定调试入口，需查看故障记录并重新训练。存在未排除的短路、接线错误或其他危险状态时，系统禁止启动调试。</p>
            <p v-if="DebugController.count > 0" class="record-note" :class="{ warn: debugLocked }">
              调试记录：已启动 {{ DebugController.count }}/2 次<template v-if="debugLocked">（已达上限，调试入口锁定）</template>
            </p>
            <div class="row center">
              <button class="btn primary big" @click="startGame">开始训练</button>
              <button v-if="debugLocked" class="btn" @click="restartRun">重置调试记录，重新训练</button>
            </div>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K31-02</div>
            <h2>单相电能表带照明设备接线</h2>
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
              <h4>通电调试记录（上限 2 次）</h4>
              <p>累计启动调试：{{ DebugController.count }}/2 次</p>
              <p v-if="!DebugController.logs.length">无调试记录</p>
              <p v-for="(l, i) in DebugController.logs" :key="i">第{{ l.n }}次：{{ l.result === 'pass' ? '✔ 通过' : '✘ 失败' }} —— {{ l.detail }}</p>
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
import { drawImgFit, imgUrl } from '@/assets/imgmap'
import { DROP_PAD, nearestBox, padToCanvas } from '@/lib/dropTarget.js'

// ================= 常量 =================
const W = 960, H = 640
const BX = 250, BY = 55, BW = 694, BH = 365 // 实训操作台

const PHASES = [
  { name: '选择电工工具和仪器仪表', obj: '正确选择 5 项所需工具仪表' },
  { name: '选择缺失元器件与导线', obj: '按电路图选择 4 件元器件与 L/N 线色' },
  { name: '安装元器件并规范接线', obj: '4 个元件就位 · 8 条导线正确连接（镇流器经端子排）' },
  { name: '指定位置导线锡焊', obj: '3 个焊点按「预热→送锡→冷却」断电完成' },
  { name: '检查并通电调试', obj: '通电前检查 8 项 + 调试 ≤2 次' },
  { name: '拆除电路', obj: '断电确认 → 拆线 → 拆件 → 分类存放' },
  { name: '整理场地', obj: '工具仪表归位 · 废线回收 · 清洁台面' },
]

const cats = reactive({
  '工具仪表': { got: 0, max: 10 },
  '元件导线': { got: 0, max: 15 },
  '安装接线': { got: 0, max: 25 },
  '锡焊': { got: 0, max: 10 },
  '通电前检查': { got: 0, max: 15 },
  '调试结果': { got: 0, max: 10 },
  '拆除电路': { got: 0, max: 10 },
  '现场整理': { got: 0, max: 5 },
})

// ================= 任务1 数据 =================
const toolList = [
  { n: '螺丝刀' }, { n: '剥线钳' }, { n: '压线钳' }, { n: '电烙铁' }, { n: '电工刀' },
  { n: '活动扳手' }, { n: '绝缘破损的剥线钳（不合格）', bad: true },
]
const meterList = [{ n: '数字万用表' }, { n: '验电笔' }, { n: '兆欧表' }, { n: '钳形电流表' }]
const REQ_TOOLS = ['螺丝刀', '剥线钳', '压线钳', '电烙铁', '数字万用表']

// ================= 任务2 数据 =================
const compList = ['单相电能表', '日光灯灯具', '镇流器', '接线端子排', '交流接触器', '热继电器', '三相电能表']
const REQ_COMPS = ['单相电能表', '日光灯灯具', '镇流器', '接线端子排']
const COLORS = ['红色', '蓝色', '绿色', '黄绿双色', '黄色', '黑色']
const REQ_COLORS = { L: '红色', N: '蓝色' }

// ================= 操作台布局 =================
const SLOTS = [
  { id: 'meter', name: '单相电能表', x: 270, y: 130, w: 120, h: 150 },
  { id: 'xt', name: '端子排', x: 510, y: 150, w: 165, h: 52 },
  { id: 'ballast', name: '镇流器', x: 510, y: 255, w: 165, h: 70 },
  { id: 'lamp', name: '日光灯灯具', x: 700, y: 150, w: 230, h: 85 },
]

const TERMS = [
  { id: 'srcL', x: 305, y: 95, type: 'L', name: '电源火线进线' },
  { id: 'srcN', x: 375, y: 95, type: 'N', name: '电源零线进线' },
  { id: 'm1', x: 295, y: 150, type: 'L', name: '电表1#(L进)', owner: 'meter' },
  { id: 'm3', x: 365, y: 150, type: 'N', name: '电表3#(N进)', owner: 'meter' },
  { id: 'm2', x: 295, y: 262, type: 'L', name: '电表2#(L出)', owner: 'meter' },
  { id: 'm4', x: 365, y: 262, type: 'N', name: '电表4#(N出)', owner: 'meter' },
  { id: 's_in', x: 447, y: 165, type: 'L', name: '开关进线' },
  { id: 's_out', x: 447, y: 255, type: 'L', name: '开关出线' },
  { id: 'xt_l1', x: 535, y: 202, type: 'L', name: '端子排L压接1', owner: 'xt' },
  { id: 'xt_l2', x: 580, y: 202, type: 'L', name: '端子排L压接2(接镇流器)', owner: 'xt' },
  { id: 'xt_n1', x: 630, y: 202, type: 'N', name: '端子排N压接1', owner: 'xt' },
  { id: 'xt_n2', x: 672, y: 202, type: 'N', name: '端子排N压接2', owner: 'xt' },
  { id: 'b1', x: 545, y: 255, type: 'L', name: '镇流器入线', owner: 'ballast' },
  { id: 'b2', x: 640, y: 255, type: 'L', name: '镇流器出线', owner: 'ballast' },
  { id: 'lamp_l', x: 725, y: 235, type: 'L', name: '灯具L端(灯丝)', owner: 'lamp' },
  { id: 'lamp_n', x: 905, y: 235, type: 'N', name: '灯具N端(灯丝)', owner: 'lamp' },
]
const TMAP = Object.fromEntries(TERMS.map(t => [t.id, t]))

// 标准接线关系（8 条）
const REQ_WIRES = [
  { a: 'srcL', b: 'm1', type: 'L' },
  { a: 'srcN', b: 'm3', type: 'N' },
  { a: 'm2', b: 's_in', type: 'L' },
  { a: 's_out', b: 'xt_l1', type: 'L' },
  { a: 'xt_l2', b: 'b1', type: 'L' },
  { a: 'b2', b: 'lamp_l', type: 'L' },
  { a: 'm4', b: 'xt_n1', type: 'N' },
  { a: 'xt_n2', b: 'lamp_n', type: 'N' },
]

// 元器件内部导通关系（开关常装）
const INTERNAL = [
  { a: 'm1', b: 'm2', need: 'meter' },
  { a: 'm3', b: 'm4', need: 'meter' },
  { a: 's_in', b: 's_out', need: null },
  { a: 'xt_l1', b: 'xt_l2', need: 'xt' },
  { a: 'xt_n1', b: 'xt_n2', need: 'xt' },
  { a: 'b1', b: 'b2', need: 'ballast' },
]

// ================= 任务4：焊点 =================
const SOLDER_OPS = ['预热（烙铁接触）', '送焊锡丝', '冷却检查']
const SOLDER_PTS = [
  { id: 'sp1', name: '焊点① 火线接头', x: 378, y: 224, type: 'L' },
  { id: 'sp2', name: '焊点② 零线接头', x: 500, y: 250, type: 'N' },
  { id: 'sp3', name: '焊点③ 灯具零线接头', x: 785, y: 245, type: 'N' },
]

// ================= 任务5/6 数据 =================
const MODES = ['通断测试', '电压档', '电阻档', '二极管档']
const DEMO_STEPS = [
  { k: 'off', label: '断电确认', pts: 2 },
  { k: 'wire', label: '拆除导线', pts: 4 },
  { k: 'comp', label: '拆除元器件', pts: 3 },
  { k: 'store', label: '分类存放', pts: 1 },
]

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
const power = ref(false)

const total = computed(() => Object.values(cats).reduce((a, c) => a + c.got, 0))

// 结算时向服务端交卷：由服务端校验考试时长与合格分，通过后才解锁下一关
const { reportResult } = useLevelAttempt()
const { noteIssue, noteMistake, attachReason } = useTrainingReport({
  step: () => phase.value + 1,
  stepName: () => PHASES[phase.value]?.name || '',
  category: () => PHASES[phase.value]?.cat || '',
})
watch(screen, v => {
  if (v === 'play') resetTrainingReport()
  if (v === 'results') reportResult(total.value, { cats, mistakes: mistakes.value, violations: violations.value })
})
const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
const verdict = computed(() => {
  const t = total.value
  if (t >= 90) return '具备单相电能表带照明设备的安装接线与调试能力'
  if (t >= 80) return '基本具备安装接线能力，注意镇流器接入与调试规范'
  if (t >= 70) return '能够完成安装接线，但存在漏项或安全隐患'
  return '安装接线能力不足，建议重新训练'
})

// ================= 音效 / 消息 / 计时 =================
let AC = null
function beep(f = 600, d = .08, type = 'sine') {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)()
    const o = AC.createOscillator(), g = AC.createGain()
    o.type = type; o.frequency.value = f
    g.gain.setValueAtTime(.12, AC.currentTime)
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d)
    o.connect(g); g.connect(AC.destination)
    o.start(); o.stop(AC.currentTime + d)
  } catch (e) { /* 无音频环境时静默 */ }
}

const msgText = ref('')
const msgType = ref('')
let msgTimer = null
function showMsg(text, type = 'info') {
  attachReason(text)
  msgText.value = text
  msgType.value = type
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msgType.value = '' }, 3000)
}

const timers = []
let runId = 0
function later(fn, ms) {
  const id = runId
  const t = setTimeout(() => { if (id === runId) fn() }, ms)
  timers.push(t)
}

// ================= 计分 =================
function addScore(cat, n) { cats[cat].got = Math.min(cats[cat].max, +(cats[cat].got + n).toFixed(1)) }
function setScore(cat, n) { cats[cat].got = Math.max(0, Math.min(cats[cat].max, +n.toFixed(1))) }
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
  showMsg(`严重安全风险：${reason}（-${penalty} 分）`, 'bad')
  beep(120, .45, 'sawtooth')
  paused.value = true
  if (phase.value === 4) resetChecks('安全违规，通电前检查结果作废，请重新检查')
  later(() => { paused.value = false; showMsg('任务已恢复，请重新执行安全步骤', 'info') }, 2600)
}
function enterPhase(i) {
  phase.value = i
  paused.value = false
  sheetOpen.value = true
  pendId.value = ''
  selWireId.value = ''
  if (i >= PHASES.length) screen.value = 'results'
}
function completePhase() {
  if (lock.value) return
  lock.value = true
  beep(880, .12)
  later(() => { lock.value = false; enterPhase(phase.value + 1) }, 1200)
}

// ================= DebugController：独立调试次数记录 =================
// 每次启动调试均 +1 并写入 localStorage；切换场景 / 刷新界面不重置，
// 仅在明确「重新训练」时清零。达到 2 次后锁定调试入口。
const DEBUG_KEY = 'k3102-debug-record'
function loadDebugRecord() {
  try {
    const raw = localStorage.getItem(DEBUG_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      return {
        count: Math.max(0, Math.min(2, Number(d.count) || 0)),
        logs: Array.isArray(d.logs) ? d.logs.slice(-6) : [],
      }
    }
  } catch (e) { /* 记录损坏时按空记录处理 */ }
  return { count: 0, logs: [] }
}
const DebugController = reactive({
  count: 0,
  logs: [],
  init() {
    const d = loadDebugRecord()
    this.count = d.count
    this.logs = d.logs
  },
  save() {
    try {
      localStorage.setItem(DEBUG_KEY, JSON.stringify({ count: this.count, logs: this.logs }))
    } catch (e) { /* 存储不可用时忽略 */ }
  },
  start() {
    if (this.count >= 2) return false
    this.count++
    this.save()
    return true
  },
  record(result, detail) {
    this.logs.push({ n: this.count, result, detail })
    if (this.logs.length > 6) this.logs.shift()
    this.save()
  },
  reset() {
    this.count = 0
    this.logs = []
    this.save()
  },
})
DebugController.init()

// ================= 任务1：工具仪表 =================
const tools = reactive({ sel: [], penalty: 0 })
function onToolToggle(o) {
  if (o.bad && tools.sel.includes(o.n)) {
    tools.sel = tools.sel.filter(x => x !== o.n)
    majorViolation(`使用明显不合格工具：${o.n}`, '工具仪表', 3)
  }
}
function confirmTools() {
  if (paused.value || lock.value) return
  const sel = new Set(tools.sel)
  let p = 0; const miss = [], extra = []
  for (const r of REQ_TOOLS) if (!sel.has(r)) { p += 2; miss.push(r) }
  for (const n of sel) if (!REQ_TOOLS.includes(n)) { p += 2; extra.push(n) }
  if (!p) {
    setScore('工具仪表', Math.max(0, 10 - tools.penalty))
    showMsg('✔ 工具仪表选择符合接线与焊接要求', 'good')
    completePhase()
  } else {
    tools.penalty += p
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    const parts = []
    if (miss.length) parts.push('缺少 ' + miss.join('、'))
    if (extra.length) parts.push('多选 ' + extra.join('、'))
    showMsg(`工具选择不符合要求：${parts.join('；')}（-${p} 分，请重新选择）`, 'warn')
  }
}

// ================= 任务2：元器件与导线 =================
const parts = reactive({ sel: [], penalty: 0 })
const colors = reactive({ L: '', N: '' })
function swatch(c) {
  return { '红色': 'red', '蓝色': 'blue', '绿色': 'green', '黄绿双色': 'pe', '黄色': 'yellow', '黑色': 'black' }[c] || ''
}
function wireColorName(k) { return { L: '红', N: '蓝' }[k] }
function confirmParts() {
  if (paused.value || lock.value) return
  const sel = new Set(parts.sel)
  let p = 0; const miss = [], extra = []
  for (const r of REQ_COMPS) if (!sel.has(r)) { p += 3; miss.push(r) }
  for (const n of sel) if (!REQ_COMPS.includes(n)) { p += 3; extra.push(n) }
  for (const k of ['L', 'N']) if (colors[k] !== REQ_COLORS[k]) p += 1.5
  if (!p) {
    setScore('元件导线', Math.max(0, 15 - parts.penalty))
    showMsg('✔ 器件型号正确 · 规格匹配 · 线色规范', 'good')
    completePhase()
  } else {
    parts.penalty += p
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    setScore('元件导线', Math.max(0, 15 - parts.penalty))
    const parts2 = []
    if (miss.length) parts2.push('缺少 ' + miss.join('、'))
    if (extra.length) parts2.push('多选 ' + extra.join('、'))
    if (colors.L !== REQ_COLORS.L || colors.N !== REQ_COLORS.N) parts2.push('线色不规范（L红/N蓝）')
    showMsg(`选择不符合电路图：${parts2.join('；')}（-${p} 分）`, 'warn')
  }
}

// ================= 任务3：安装与接线 =================
const compChips = reactive([
  { key: 'meter', code: 'kWh', label: '单相电能表' },
  { key: 'xt', code: 'XT', label: '接线端子排' },
  { key: 'ballast', code: 'B', label: '镇流器' },
  { key: 'lamp', code: 'HL', label: '日光灯灯具' },
])
const placed = reactive({ meter: false, xt: false, ballast: false, lamp: false })
const wires = ref([])
const wireType = ref('L')
const pendId = ref('')
const selWireId = ref('')
const chipVer = ref(0)
let wid = 0
const placedCount = computed(() => Object.values(placed).filter(Boolean).length)
const rightWireCount = computed(() => REQ_WIRES.filter(r => findWire(r)).length)

function findWire(r) {
  return wires.value.find(w =>
    (w.a === r.a && w.b === r.b) || (w.a === r.b && w.b === r.a))
}
function termActive(t) {
  if (t.owner && !placed[t.owner]) return false
  return true
}
function compDrop(chip, x, y, restore) {
  if (paused.value || lock.value) return restore()
  const p = toCanvas({ clientX: x, clientY: y })
  // 带容差 + 最近优先：手机上舞台缩小后槽位只有几十像素，很难精确命中
  const pad = padToCanvas(DROP_PAD, canvasRef.value.getBoundingClientRect(), W)
  const slot = nearestBox(p, SLOTS, pad)
  if (!slot) { restore(); return }
  if (slot.id !== chip.key) {
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`安装位置不合理：「${chip.label}」应安装在「${SLOTS.find(s => s.id === chip.key).name}」位置`, 'warn')
    restore()
    return
  }
  placed[chip.key] = true
  beep(760, .08)
  showMsg(`✔ ${chip.label} 安装牢固、排列整齐`, 'good')
}
function tryConnect(a, b) {
  if (a.type !== b.type) {
    majorViolation(`L/N 严重接错：${a.name}（${a.type}）与 ${b.name}（${b.type}）直接相连，存在短路风险`, '安装接线', 4)
    return
  }
  if (a.type !== wireType.value) {
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`导线颜色/线种错误：${a.name} → ${b.name} 属 ${a.type} 回路，应使用${wireColorName(a.type)}色导线`, 'warn')
    return
  }
  if (wires.value.some(w => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id))) {
    showMsg('该线路已连接，请勿重复', 'info')
    return
  }
  const req = REQ_WIRES.find(r => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))
  if (!req) {
    wires.value.push({ id: ++wid, a: a.id, b: b.id, type: a.type, wrong: true })
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`接线关系错误：${a.name} → ${b.name} 不符合电路图（橙色导线，请选中后拆除）`, 'warn')
    afterWiringChange()
    return
  }
  wires.value.push({ id: ++wid, a: a.id, b: b.id, type: a.type, wrong: false })
  beep(760, .07)
  showMsg(`✔ 接线正确：${a.name} → ${b.name}（${wireColorName(a.type)}线）`, 'good')
  afterWiringChange()
}
function afterWiringChange() {
  if (phase.value === 4) resetChecks('接线已变更，请重新进行通电前检查')
}
function deleteSelWire() {
  const w = wires.value.find(x => x.id === selWireId.value)
  if (!w) return
  wires.value = wires.value.filter(x => x.id !== selWireId.value)
  selWireId.value = ''
  beep(320, .08)
  showMsg('已拆除选中导线', 'info')
  afterWiringChange()
}
function submitWiring() {
  if (paused.value || lock.value) return
  const missComp = SLOTS.filter(s => !placed[s.id])
  if (missComp.length) {
    showMsg(`请先将「${missComp.map(s => s.name).join('、')}」安装到操作台上`, 'warn')
    return
  }
  const right = rightWireCount.value
  const wrongN = wires.value.filter(w => w.wrong).length
  const craft = (right === REQ_WIRES.length && wrongN === 0) ? 13 : 0
  setScore('安装接线', placedCount.value + right + craft)
  if (right === REQ_WIRES.length && wrongN === 0) {
    showMsg('✔ 接线正确 · 镇流器经端子排接入 · 导线固定可靠', 'good')
    completePhase()
    return
  }
  const missing = REQ_WIRES.filter(r => !findWire(r)).map(r => `${TMAP[r.a].name}→${TMAP[r.b].name}`)
  const msgs = []
  if (missing.length) msgs.push(`未完成接线：${missing.join('、')}`)
  if (wrongN) msgs.push(`存在 ${wrongN} 条错误接线（橙色），点击导线后可拆除`)
  showMsg(msgs.join('；'), 'warn')
  beep(220, .12, 'sawtooth')
}

// ================= 任务4：锡焊 =================
const solderOp = ref(SOLDER_OPS[0])
const solder = reactive({
  pts: SOLDER_PTS.map(p => ({ ...p, step: 0 })),
  mistakes: 0,
})
const solderDoneN = computed(() => solder.pts.filter(p => p.step >= 3).length)
const solderDone = computed(() => solderDoneN.value === solder.pts.length)
function solderClick(pt) {
  if (paused.value || lock.value) return
  if (power.value) {
    majorViolation('带电焊接：必须确认断电后才能进行锡焊作业', '锡焊', 3)
    return
  }
  if (pt.step >= 3) { showMsg(`${pt.name} 已完成焊接`, 'info'); return }
  const need = SOLDER_OPS[pt.step]
  if (solderOp.value !== need) {
    solder.mistakes++
    cats['锡焊'].got = Math.max(0, +(cats['锡焊'].got - 1).toFixed(1))
    mistakes.value++
    noteMistake(1)
    pt.step = 0
    beep(150, .3, 'sawtooth')
    showMsg(`焊点不合格：当前应「${need}」，实际「${solderOp.value}」，该焊点虚焊需从头重焊（-1 分）`, 'bad')
    return
  }
  pt.step++
  beep(760, .07)
  if (pt.step >= 3) {
    addScore('锡焊', 3)
    showMsg(`✔ ${pt.name} 焊接完成，焊点饱满光亮　+3 分`, 'good')
  } else {
    showMsg(`✔ 「${need}」完成，下一步：${SOLDER_OPS[pt.step]}`, 'good')
  }
}
function finishSolder() {
  if (paused.value || lock.value || !solderDone.value) return
  if (solder.mistakes === 0) addScore('锡焊', 1)
  showMsg('✔ 焊点检查合格，焊接工艺完好，断电状态确认', 'good')
  completePhase()
}

// ================= 任务5：通电前检查与调试 =================
const look = reactive({
  items: [
    { k: '元器件安装固定牢固', pts: 2, done: false },
    { k: '接线端子压接无松动', pts: 2, done: false },
    { k: '导线排列整齐、线色规范', pts: 2, done: false },
    { k: '焊点饱满、绝缘完好无裸露', pts: 2, done: false },
  ],
})
const safe = reactive({ done: false })
const meter = reactive({
  mode: '',
  readout: '',
  tests: [
    { id: 't1', pair: ['srcL', 'srcN'], expect: '不通', desc: 'L-N 之间无短路', done: false, ok: false, reading: '' },
    { id: 't2', pair: ['srcL', 'xt_l2'], expect: '通', desc: '火线回路（电源→电表→开关→端子排）', done: false, ok: false, reading: '' },
    { id: 't3', pair: ['srcN', 'lamp_n'], expect: '通', desc: '零线回路（电源→电表→端子排→灯具）', done: false, ok: false, reading: '' },
  ],
})
const probeA = ref('')

const checkDone = computed(() =>
  look.items.filter(i => i.done).length + (safe.done ? 1 : 0) + meter.tests.filter(t => t.done).length)
const checksDone = computed(() => checkDone.value === 8)

function checkLook(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('通电前检查', it.pts)
  beep(700, .06)
  showMsg(`✔ 外观检查：${it.k} 合格　+${it.pts} 分`, 'good')
}
function checkSafe() {
  if (safe.done || paused.value || lock.value) return
  safe.done = true
  addScore('通电前检查', 1)
  beep(700, .06)
  showMsg('✔ 通电前安全确认：已警示呼叫，确认无人接触被试设备　+1 分', 'good')
}
function resetChecks(reason) {
  look.items.forEach(i => { i.done = false })
  safe.done = false
  meter.tests.forEach(t => { t.done = false; t.ok = false; t.reading = '' })
  meter.mode = ''
  meter.readout = ''
  probeA.value = ''
  if (reason) showMsg(reason, 'warn')
}
function chooseMode(m) {
  if (m !== '通断测试') {
    penalize('通电前检查', 1)
    beep(200, .12, 'sawtooth')
    showMsg('检测方法不正确：通断检查应使用万用表「通断测试」档（-1 分）', 'warn')
    return
  }
  meter.mode = m
  beep(700, .06)
  showMsg('✔ 已选择通断测试档（蜂鸣档），点击两个接线端子测量', 'good')
}

// 电路导通分析（导线 + 元器件内部导通）
function buildGraph() {
  const g = {}
  const add = (a, b) => { (g[a] = g[a] || []).push(b); (g[b] = g[b] || []).push(a) }
  wires.value.forEach(w => add(w.a, w.b))
  INTERNAL.forEach(e => { if (!e.need || placed[e.need]) add(e.a, e.b) })
  return g
}
function connected(a, b) {
  const g = buildGraph()
  const seen = new Set([a]); const q = [a]
  while (q.length) {
    const n = q.shift()
    if (n === b) return true
    for (const m of (g[n] || [])) if (!seen.has(m)) { seen.add(m); q.push(m) }
  }
  return false
}
function probe(t) {
  if (meter.mode !== '通断测试') { showMsg('请先选择万用表「通断测试」档', 'warn'); return }
  if (!probeA.value) { probeA.value = t.id; beep(600, .05); return }
  if (probeA.value === t.id) { probeA.value = ''; return }
  const pair = [probeA.value, t.id].sort().join('|')
  probeA.value = ''
  const test = meter.tests.find(x => !x.done && x.pair.slice().sort().join('|') === pair)
  if (!test) {
    meter.readout = 'OL ── 无匹配检测项'
    showMsg('该测点组合不属于本关检测项目', 'warn')
    return
  }
  const actual = connected(test.pair[0], test.pair[1])
  const ok = actual === (test.expect === '通')
  test.done = true
  test.ok = ok
  test.reading = actual ? '0.4 Ω ── 通路（蜂鸣）' : 'OL ── 不通'
  meter.readout = test.reading
  if (ok) {
    addScore('通电前检查', 2)
    beep(880, .15)
    showMsg(`✔ ${test.desc}：实测${test.expect}　+2 分`, 'good')
  } else {
    mistakes.value++
    noteMistake()
    beep(150, .4, 'sawtooth')
    showMsg(`检测异常：${test.desc} 应${test.expect}，实测${actual ? '通路' : '不通'} —— 存在未排除故障，请检查接线`, 'bad')
  }
}

// 未排除故障（阻断调试的原因）
const blockers = computed(() => {
  const list = []
  const wrongN = wires.value.filter(w => w.wrong).length
  if (wrongN) list.push(`存在 ${wrongN} 条错误接线（橙色），必须先拆除`)
  const un = SLOTS.filter(s => !placed[s.id])
  if (un.length) list.push(`元器件未安装到位：${un.map(s => s.name).join('、')}`)
  if (!solderDone.value) list.push(`指定焊点未完成焊接（${solderDoneN.value}/${solder.pts.length}）`)
  const badT = meter.tests.filter(t => t.done && !t.ok)
  if (badT.length) list.push(`通断检测异常：${badT.map(t => t.desc).join('、')}`)
  return list
})
const debugLocked = computed(() => DebugController.count >= 2)
const debugStatus = computed(() => {
  if (debugLocked.value) {
    return {
      kind: 'lock',
      text: `调试次数已达上限（${DebugController.count}/2），调试入口已锁定 —— 请查看故障记录并重新训练`,
    }
  }
  if (!checksDone.value) return { kind: 'wait', text: '尚未完成检查' }
  if (blockers.value.length) return { kind: 'bad', text: '发现接线错误或其他故障：' + blockers.value[0] }
  return { kind: 'ok', text: '已完成检查，确认无未排除故障' }
})
const canApply = computed(() =>
  phase.value === 4 && !debugLocked.value && checksDone.value &&
  blockers.value.length === 0 && !power.value && !paused.value)

function applyDebug() {
  if (paused.value || lock.value) return
  if (!canApply.value) {
    showMsg(`系统禁止启动调试：${debugStatus.value.text}`, 'bad')
    beep(150, .3, 'sawtooth')
    return
  }
  if (!DebugController.start()) return
  const n = DebugController.count
  const missing = REQ_WIRES.filter(r => !findWire(r))
  if (!missing.length) {
    DebugController.record('pass', `第${n}次调试通过：电能表正常计量，日光灯正常点亮`)
    setScore('调试结果', n === 1 ? 10 : 6)
    power.value = true
    beep(880, .2)
    showMsg(`✔ 模拟调试通过（第 ${n}/2 次）：电能表计数、日光灯点亮　调试得分 ${n === 1 ? 10 : 6}/10`, 'good')
    completePhase()
    return
  }
  const detail = missing.map(r => `${TMAP[r.a].name}→${TMAP[r.b].name}`).join('、')
  DebugController.record('fail', `第${n}次调试失败：合闸后日光灯不亮，检测为 ${detail} 未接通`)
  mistakes.value++
  noteMistake()
  beep(120, .45, 'sawtooth')
  showMsg(`模拟调试失败（第 ${n}/2 次）：日光灯不亮 —— ${detail} 未接通，请查看故障记录`, 'bad')
  resetChecks('接线故障已记录，请排除故障后重新进行通电前检查')
}
function restartRun() {
  DebugController.reset()
  startGame()
}

// ================= 任务6：拆除电路 =================
const demo = reactive({ step: 0 })
function demoStep(i) {
  if (paused.value || lock.value) return
  if (i < demo.step) { showMsg('该步骤已完成', 'info'); return }
  const s = DEMO_STEPS[i]
  if (i === 0) {
    if (demo.step === 0) {
      power.value = false
      demo.step = 1
      addScore('拆除电路', s.pts)
      beep(700, .06)
      showMsg('✔ 断电确认完成，实训台电源已断开　+2 分', 'good')
    } else showMsg('已确认断电', 'info')
    return
  }
  if (i === 1) {
    if (power.value) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 4); return }
    if (demo.step === 0) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 4); return }
    if (demo.step > 1) { showMsg('导线已全部拆除', 'info'); return }
    wires.value = []
    probeA.value = ''
    demo.step = 2
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 导线全部拆除并按线色分类盘绕　+4 分', 'good')
    return
  }
  if (i === 2) {
    if (power.value) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 4); return }
    if (demo.step === 0) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 4); return }
    if (demo.step === 1) { majorViolation('强行拆卸设备：导线未拆除即拆卸元器件', '拆除电路', 3); return }
    if (demo.step > 2) { showMsg('元器件已全部拆除', 'info'); return }
    placed.meter = placed.xt = placed.ballast = placed.lamp = false
    demo.step = 3
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 元器件拆除完成，未强行拉扯导线　+3 分', 'good')
    return
  }
  if (i === 3) {
    if (demo.step < 3) { showMsg('请先按顺序完成断电确认与拆除作业', 'warn'); return }
    demo.step = 4
    addScore('拆除电路', s.pts)
    showMsg('✔ 元器件分类存放完成　+1 分', 'good')
    completePhase()
  }
}

// ================= 任务7：整理场地 =================
const tidyItems = reactive([
  { k: '工具归位', done: false }, { k: '仪表归位', done: false }, { k: '元器件分类', done: false },
  { k: '废线回收', done: false }, { k: '工作台清洁', done: false },
])
const tidyDone = computed(() => tidyItems.filter(i => i.done).length)
function checkTidy(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('现场整理', 1)
  beep(700, .06)
}
function finishLevel() {
  if (lock.value) return
  showMsg('✔ 现场整理完成，考核结束', 'good')
  completePhase()
}

// ================= 拖拽 =================
// 拖动期间把元素临时挂到 body、按视口坐标跟随手指：
// 1) 不受舞台等比缩放影响（移动端舞台按屏宽缩放，家坐标要按显示比例换算）；
// 2) 不被任务面板的 overflow 裁剪（手机上面板在舞台外，拖拽要跨出面板）。
function startDrag(e, onDrop) {
  e.preventDefault()
  const el = e.currentTarget
  const home = { parent: el.parentNode, next: el.nextSibling }
  const parent = el.offsetParent || stageRef.value
  const pr = parent.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  // 容器实际显示比例（屏幕像素 / 本地像素），用于把家坐标换算回本地像素
  const k = parent.offsetWidth && pr.width ? parent.offsetWidth / pr.width : 1
  const homeL = (r.left - pr.left) * k
  const homeT = (r.top - pr.top) * k
  const ox = e.clientX - r.left
  const oy = e.clientY - r.top
  document.body.appendChild(el)
  el.style.position = 'fixed'
  el.style.left = r.left + 'px'
  el.style.top = r.top + 'px'
  el.style.margin = '0'
  el.style.zIndex = 60
  el.classList.add('dragging')
  const rehome = () => {
    if (home.parent.contains(el)) return // 已由 restore() 放回
    home.parent.insertBefore(el, home.next)
    el.style.position = 'absolute'
    el.style.left = homeL + 'px'
    el.style.top = homeT + 'px'
  }
  const restore = () => {
    rehome()
    el.classList.remove('dragging')
    el.style.zIndex = ''
  }
  const move = ev => {
    el.style.left = (ev.clientX - ox) + 'px'
    el.style.top = (ev.clientY - oy) + 'px'
  }
  const up = ev => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    el.classList.remove('dragging')
    onDrop(ev.clientX, ev.clientY, restore)
    rehome() // 放置成功时元素会被 v-if/v-show 隐藏，这里放回托盘（幂等）
    el.style.zIndex = ''
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ================= 游戏流程 =================
function resetState() {
  Object.values(cats).forEach(c => { c.got = 0 })
  mistakes.value = 0
  violations.value = []
  paused.value = false
  lock.value = false
  power.value = false
  tools.sel = []; tools.penalty = 0
  parts.sel = []; parts.penalty = 0; colors.L = ''; colors.N = ''
  compChips.forEach(c => { c.placed = false })
  chipVer.value++
  placed.meter = placed.xt = placed.ballast = placed.lamp = false
  wires.value = []
  wireType.value = 'L'
  pendId.value = ''
  selWireId.value = ''
  solderOp.value = SOLDER_OPS[0]
  solder.mistakes = 0
  solder.pts.forEach(p => { p.step = 0 })
  resetChecks('')
  demo.step = 0
  tidyItems.forEach(i => { i.done = false })
}
function startGame() {
  runId++
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}

// ================= 坐标换算与命中 =================
function toCanvas(e) {
  const r = canvasRef.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
}
function hitTerminal(x, y) {
  let best = null, bd = 18
  for (const t of TERMS) {
    if (!termActive(t)) continue
    const d = Math.hypot(x - t.x, y - t.y)
    if (d < bd) { bd = d; best = t }
  }
  return best
}
function hitSolderPt(x, y) {
  for (const p of solder.pts) if (Math.hypot(x - p.x, y - p.y) < 16) return p
  return null
}
function wirePoints(w) {
  const a = TMAP[w.a], b = TMAP[w.b]
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const off = Math.min(34, len * .14)
  const cx = mx - dy / len * off, cy = my + dx / len * off
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const s = i / 24, u = 1 - s
    pts.push({ x: u * u * a.x + 2 * u * s * cx + s * s * b.x, y: u * u * a.y + 2 * u * s * cy + s * s * b.y })
  }
  return pts
}
function hitWire(x, y) {
  let best = null, bd = 9
  for (const w of wires.value) {
    for (const p of wirePoints(w)) {
      const d = Math.hypot(x - p.x, y - p.y)
      if (d < bd) { bd = d; best = w }
    }
  }
  return best
}

// ================= 画布交互 =================
function onCanvasClick(e) {
  if (screen.value !== 'play' || paused.value || lock.value) return
  const p = toCanvas(e)

  if (phase.value === 3) {
    const pt = hitSolderPt(p.x, p.y)
    if (pt) solderClick(pt)
    return
  }

  if (phase.value === 2 || phase.value === 4) {
    // 端子优先判定：已接好的导线端点正好落在端子上，若先判导线会导致
    // 同一端子的后续接线与通断测试测点（srcL/srcN/xt_l2/lamp_n 均有导线端接）无法点击
    const t = hitTerminal(p.x, p.y)
    if (t) {
      if (phase.value === 4 && meter.mode === '通断测试') { probe(t); return }
      selWireId.value = ''
      if (!pendId.value) { pendId.value = t.id; beep(600, .05); return }
      if (pendId.value === t.id) { pendId.value = ''; return }
      const a = TMAP[pendId.value]
      pendId.value = ''
      tryConnect(a, t)
      return
    }
    const w = hitWire(p.x, p.y)
    if (w) {
      selWireId.value = w.id
      beep(500, .05)
      showMsg('已选中导线，点击「拆除选中导线」可移除', 'info')
      return
    }
    selWireId.value = ''
    pendId.value = ''
  }

  if (phase.value === 5) {
    // 拆除任务：点导线 = 动手拆线，安全校验（断电/顺序）与面板按钮一致
    if (hitWire(p.x, p.y)) demoStep(1)
  }
}

// ================= 画布绘制 =================
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke() }
function rect(c, x, y, w, h, fill, stroke) {
  if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h) }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.strokeRect(x, y, w, h) }
}
function circle(c, x, y, r, fill, stroke, lw = 2) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2)
  if (fill) { c.fillStyle = fill; c.fill() }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke() }
}
function txt(c, s, x, y, color = '#37474f', font = '12px sans-serif', align = 'center') {
  c.fillStyle = color; c.font = font; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'center'
}
function termColor(t) { return t.type === 'L' ? '#e53935' : '#1e88e5' }
function wireColor(type) { return type === 'L' ? '#e53935' : '#1e88e5' }

function drawShelf(c) {
  rect(c, 16, 50, 215, 140, '#b08968', '#7d5a3c')
  line(c, 16, 122, 231, 122)
  txt(c, '器材摆放架', 123, 44, '#37474f', 'bold 13px sans-serif')
  rect(c, 34, 68, 10, 34, '#e53935'); rect(c, 37, 102, 4, 16, '#90a4ae')
  c.strokeStyle = '#546e7a'; c.lineWidth = 4
  line(c, 70, 70, 84, 104); line(c, 88, 70, 74, 104)
  rect(c, 104, 74, 40, 12, '#37474f'); rect(c, 138, 86, 6, 26, '#546e7a')
  rect(c, 158, 88, 42, 8, '#8d6e63'); rect(c, 196, 86, 10, 12, '#6d4c41')
  // 电烙铁（本关焊接）
  rect(c, 40, 134, 62, 42, '#263238', '#111')
  rect(c, 48, 142, 46, 10, '#8d6e63')
  circle(c, 92, 158, 7, '#ff8f00', null)
  txt(c, '烙铁 350℃', 71, 172, '#ffcc80', '10px sans-serif')
  // 万用表
  rect(c, 150, 134, 62, 42, '#263238', '#111')
  rect(c, 156, 140, 50, 14, '#8bc34a')
  circle(c, 181, 166, 8, '#b0bec5', '#37474f')
  txt(c, '万用表', 181, 151, '#1b2630', '9px sans-serif')
}
function drawPartsArea(c) {
  rect(c, 16, 210, 215, 210, '#a8825f', '#7d5a3c')
  txt(c, phase.value === 3 ? '锡焊工位' : phase.value === 4 ? '检测工作台' : '元器件区',
    123, 204, '#37474f', 'bold 13px sans-serif')
  if (phase.value === 3) { drawSolderStation(c); return }
  if (phase.value === 4) { drawBenchMeter(c); return }
  const boxes = [
    ['单相电能表', 28, 224], ['日光灯灯具', 132, 224],
    ['镇流器', 28, 288], ['接线端子排', 132, 288],
    ['交流接触器', 28, 352], ['热继电器', 132, 352],
  ]
  for (const [name, x, y] of boxes) {
    rect(c, x, y, 86, 52, '#d7ccc8', '#5d4037')
    if (!drawImgFit(c, name, x + 3, y + 2, 80, 34, { card: true, r: 3 })) {
      txt(c, name, x + 43, y + 22, '#4e342e', 'bold 11px sans-serif')
    }
    txt(c, name, x + 43, y + 48, '#4e342e', 'bold 10px sans-serif')
  }
}
function drawSolderStation(c) {
  // 烙铁架
  rect(c, 34, 300, 74, 14, '#455a64', '#263238')
  rect(c, 66, 250, 6, 52, '#78909c')
  c.strokeStyle = '#90a4ae'; c.lineWidth = 3
  line(c, 72, 258, 118, 226)
  c.strokeStyle = '#8d6e63'; c.lineWidth = 7
  line(c, 96, 242, 118, 226)
  c.strokeStyle = solderOp.value === SOLDER_OPS[0] ? '#ff8f00' : '#b0bec5'; c.lineWidth = 4
  line(c, 118, 226, 130, 218)
  txt(c, '电烙铁', 106, 330, '#37474f', 'bold 12px sans-serif')
  // 焊锡丝
  circle(c, 176, 268, 24, '#cfd8dc', '#90a4ae', 3)
  circle(c, 176, 268, 9, '#a8825f', null)
  txt(c, '焊锡丝', 176, 330, '#37474f', 'bold 12px sans-serif')
  txt(c, '断电作业 · 三步成焊', 123, 400, '#4e342e', 'bold 11px sans-serif')
  if (solderOp.value === SOLDER_OPS[0]) {
    const bl = .55 + .35 * Math.sin(Date.now() / 240)
    circle(c, 130, 218, 8 + 3 * bl, null, `rgba(255,143,0,${bl})`, 2)
  }
}
function drawBenchMeter(c) {
  const on = meter.mode === '通断测试'
  rect(c, 30, 232, 188, 122, '#263238', '#111')
  rect(c, 42, 244, 164, 40, on ? '#8bc34a' : '#37474f')
  txt(c, on ? (meter.readout || 'OL') : '未选择档位', 124, 270, on ? '#1b2630' : '#90a4ae', 'bold 12px Consolas, monospace')
  c.fillStyle = '#b0bec5'; circle(c, 72, 320, 19, '#b0bec5', null)
  c.strokeStyle = '#37474f'; c.lineWidth = 4
  line(c, 72, 320, 72, 306)
  txt(c, on ? '通断' : '档位', 72, 349, on ? '#8bc34a' : '#90a4ae', '10px sans-serif')
  circle(c, 148, 312, 7, '#e53935', null)
  circle(c, 176, 312, 7, '#212121', null)
  txt(c, 'V/Ω', 148, 336, '#90a4ae', '10px sans-serif')
  txt(c, 'COM', 176, 336, '#90a4ae', '10px sans-serif')
  c.strokeStyle = on ? '#e53935' : '#546e7a'; c.lineWidth = 2.5
  line(c, 148, 305, 140, 232)
  c.strokeStyle = on ? '#212121' : '#546e7a'
  line(c, 176, 305, 190, 232)
  txt(c, '数字万用表', 124, 224, '#37474f', 'bold 12px sans-serif')
  txt(c, '选通断档后点击两端子测量', 124, 372, '#7d5a3c', '11px sans-serif')
}

function drawBench(t) {
  const c = ctx.value
  rect(c, 250, 420, 694, 18, '#8b5a2b')
  rect(c, 262, 438, 14, 30, '#6f4520'); rect(c, 918, 438, 14, 30, '#6f4030')
  rect(c, BX, BY, BW, BH, '#78909c')
  rect(c, BX + 10, BY + 10, BW - 20, BH - 20, '#eceff1')
  c.strokeStyle = '#37474f'; c.lineWidth = 3; c.strokeRect(BX, BY, BW, BH)
  txt(c, '单相电能表带照明设备实训台', BX + BW / 2, BY - 8, '#37474f', 'bold 14px sans-serif')

  // 电源指示
  circle(c, 916, 82, 7, power.value ? '#e53935' : '#90a4ae', '#37474f', 2)
  if (power.value) {
    c.strokeStyle = `rgba(229,57,53,${.35 + .3 * Math.sin(t / 200)})`
    c.lineWidth = 2
    c.beginPath(); c.arc(916, 82, 13 + 3 * Math.sin(t / 200), 0, Math.PI * 2); c.stroke()
  }
  txt(c, power.value ? '送电' : '断电', 916, 106, power.value ? '#c62828' : '#78909c', 'bold 11px sans-serif')

  // 电源进线
  c.strokeStyle = '#e53935'; c.lineWidth = 4
  line(c, 305, BY, 305, 95)
  c.strokeStyle = '#1e88e5'
  line(c, 375, BY, 375, 95)
  txt(c, 'L', 305, 82, '#e53935', 'bold 14px sans-serif')
  txt(c, 'N', 375, 82, '#1e88e5', 'bold 14px sans-serif')
  txt(c, '电源进线 AC220V', 340, 68, '#546e7a', '11px sans-serif')

  // 开关（预装）
  drawSwitch(c)

  if (phase.value === 2) drawSlotHints(c, t)
  if (placed.meter) drawMeterBody(c, SLOTS[0])
  if (placed.xt) drawXTBody(c, SLOTS[1])
  if (placed.ballast) drawBallastBody(c, SLOTS[2])
  if (placed.lamp) drawLampBody(c, SLOTS[3])

  for (const w of wires.value) drawWire(c, w)
  drawSolderPoints(c, t)
  drawTerminals(c, t)
}
function drawSwitch(c) {
  rect(c, 415, 165, 64, 90, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(415, 165, 64, 90)
  txt(c, 'S', 447, 182, '#37474f', 'bold 13px sans-serif')
  rect(c, 433, 192, 28, 36, '#263238')
  rect(c, 437, 196, 20, 14, power.value ? '#66bb6a' : '#e53935')
  txt(c, '开关', 447, 245, '#546e7a', '11px sans-serif')
}
function drawSlotHints(c, t) {
  const blink = .55 + .35 * Math.sin(t / 240)
  for (const s of SLOTS) {
    if (placed[s.id]) continue
    c.save()
    c.fillStyle = `rgba(26,63,196,${.07 + .05 * blink})`
    c.fillRect(s.x, s.y, s.w, s.h)
    c.setLineDash([7, 6])
    c.strokeStyle = `rgba(26,63,196,${blink})`
    c.lineWidth = 2.5
    c.strokeRect(s.x, s.y, s.w, s.h)
    c.restore()
    txt(c, s.name, s.x + s.w / 2, s.y + s.h / 2 - 2, '#1a3fc4', 'bold 12px sans-serif')
    txt(c, '▼ 拖到此处', s.x + s.w / 2, s.y + s.h + 16, '#1a3fc4', 'bold 11px sans-serif')
  }
}
function drawMeterBody(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#fafafa')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, '单相电能表', s.x + s.w / 2, s.y + 20, '#37474f', 'bold 13px sans-serif')
  rect(c, s.x + 14, s.y + 30, s.w - 28, 30, '#c8e6c9', '#81c784')
  txt(c, power.value ? '00001.6 kWh' : '00000.0 kWh', s.x + s.w / 2, s.y + 50, '#1b5e20', 'bold 13px Consolas, monospace')
  rect(c, s.x + 14, s.y + 68, s.w - 28, 14, '#263238')
  if (power.value) {
    c.save()
    c.beginPath(); c.rect(s.x + 14, s.y + 68, s.w - 28, 14); c.clip()
    const off = (Date.now() / 12) % 24
    for (let x = s.x + 14 - 24; x < s.x + s.w - 14; x += 24) rect(c, x + off, s.y + 68, 10, 14, '#fdd835')
    c.restore()
  }
  txt(c, '1', 295, 172, '#e53935', 'bold 11px sans-serif')
  txt(c, '3', 365, 172, '#1e88e5', 'bold 11px sans-serif')
  txt(c, '2', 295, 248, '#e53935', 'bold 11px sans-serif')
  txt(c, '4', 365, 248, '#1e88e5', 'bold 11px sans-serif')
  txt(c, '220V 10(40)A 50Hz', s.x + s.w / 2, s.y + s.h - 10, '#78909c', '10px sans-serif')
}
function drawXTBody(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#78909c'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  rect(c, 518, 158, 74, 40, '#fdecea', '#e53935')
  rect(c, 612, 158, 58, 40, '#e8f1fd', '#1e88e5')
  txt(c, 'L', 527, 174, '#e53935', 'bold 12px sans-serif', 'left')
  txt(c, 'N', 621, 174, '#1e88e5', 'bold 12px sans-serif', 'left')
  circle(c, 535, 192, 6, '#b0bec5', '#546e7a', 2)
  circle(c, 580, 192, 6, '#b0bec5', '#546e7a', 2)
  circle(c, 630, 192, 6, '#b0bec5', '#546e7a', 2)
  circle(c, 672, 192, 6, '#b0bec5', '#546e7a', 2)
  txt(c, '接线端子排 XT', 592, 145, '#37474f', 'bold 12px sans-serif')
}
function drawBallastBody(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#455a64')
  c.strokeStyle = '#263238'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  for (let x = s.x + 10; x < s.x + s.w - 6; x += 12) line(c, x, s.y + 8, x, s.y + s.h - 8)
  rect(c, s.x + 34, s.y + 22, 96, 26, '#37474f')
  txt(c, '镇流器 B', s.x + 82, s.y + 40, '#eceff1', 'bold 13px sans-serif')
  txt(c, '40W', s.x + 148, s.y + 40, '#b0bec5', '11px sans-serif')
}
function drawLampBody(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, '日光灯 40W', s.x + 44, s.y + 18, '#37474f', 'bold 12px sans-serif')
  // 灯座
  rect(c, 712, 178, 24, 40, '#90a4ae', '#546e7a')
  rect(c, 894, 178, 24, 40, '#90a4ae', '#546e7a')
  const lit = power.value
  if (lit) {
    c.save()
    c.shadowColor = '#fff59d'; c.shadowBlur = 26
    rect(c, 736, 184, 158, 28, '#fff59d', '#fbc02d', 2)
    c.restore()
    c.strokeStyle = 'rgba(255,235,59,.55)'; c.lineWidth = 3
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + t_phase()
      line(c, 815 + Math.cos(a) * 92, 198 + Math.sin(a) * 40, 815 + Math.cos(a) * 112, 198 + Math.sin(a) * 52)
    }
    txt(c, '灯管已点亮', 815, 226, '#f57f17', 'bold 11px sans-serif')
  } else {
    rect(c, 736, 184, 158, 28, '#cfd8dc', '#90a4ae', 2)
    txt(c, '灯管未亮', 815, 226, '#90a4ae', '11px sans-serif')
  }
  txt(c, 'HL 照明灯具', s.x + s.w - 50, s.y + 18, '#546e7a', '11px sans-serif')
}
function t_phase() { return Date.now() / 900 }

function drawSolderPoints(c, t) {
  const blink = .55 + .35 * Math.sin(t / 240)
  for (const p of solder.pts) {
    const done = p.step >= 3
    c.strokeStyle = wireColor(p.type); c.lineWidth = 4
    line(c, p.x - 20, p.y + 8, p.x - 5, p.y)
    line(c, p.x + 5, p.y, p.x + 20, p.y - 8)
    circle(c, p.x, p.y, 7, done ? '#ffb300' : '#fff', '#5d4037', 2)
    if (done) txt(c, '√', p.x + 15, p.y - 9, '#2e7d32', 'bold 13px sans-serif')
    if (phase.value === 3) {
      if (!done) {
        c.save()
        c.setLineDash([5, 4])
        c.strokeStyle = `rgba(26,63,196,${blink})`
        c.lineWidth = 2.5
        c.beginPath(); c.arc(p.x, p.y, 15, 0, Math.PI * 2); c.stroke()
        c.restore()
        txt(c, '▼ 点击焊接', p.x, p.y + 30, '#1a3fc4', 'bold 11px sans-serif')
      }
      txt(c, p.name.slice(0, 3), p.x, p.y - 20, done ? '#2e7d32' : '#1a3fc4', 'bold 11px sans-serif')
    }
  }
}
function drawWire(c, w) {
  const pts = wirePoints(w)
  c.save()
  c.lineCap = 'round'
  if (w.wrong) { c.setLineDash([7, 5]); c.strokeStyle = '#ef6c00' } else { c.strokeStyle = wireColor(w.type) }
  c.lineWidth = 5
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y)
  for (const p of pts) c.lineTo(p.x, p.y)
  c.stroke()
  if (selWireId.value === w.id) {
    c.setLineDash([]); c.strokeStyle = '#ff8f00'; c.lineWidth = 9; c.globalAlpha = .45; c.stroke()
  }
  c.restore()
}
function drawTerminals(c, t) {
  const pulse = 1 + .12 * Math.sin(t / 200)
  for (const tt of TERMS) {
    if (!termActive(tt)) continue
    circle(c, tt.x, tt.y, 7, '#fff', termColor(tt), 3)
    if (pendId.value === tt.id || probeA.value === tt.id) {
      c.strokeStyle = pendId.value === tt.id ? '#ff8f00' : '#c62828'
      c.lineWidth = 2.5
      c.beginPath(); c.arc(tt.x, tt.y, 13 * pulse, 0, Math.PI * 2); c.stroke()
      txt(c, pendId.value === tt.id ? '起点' : '探针A', tt.x, tt.y - 18, '#c62828', 'bold 10px sans-serif')
    } else if ((phase.value === 2 || phase.value === 4) && pendId.value && TMAP[pendId.value].type === tt.type) {
      c.strokeStyle = 'rgba(46,125,50,.7)'; c.lineWidth = 2
      c.beginPath(); c.arc(tt.x, tt.y, 12 * pulse, 0, Math.PI * 2); c.stroke()
    }
  }
}
function drawScene(t) {
  const c = ctx.value
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#dfe7ee'); g.addColorStop(1, '#b9c6d2')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = '#cbb689'; c.fillRect(0, 470, W, H - 470)
  c.fillStyle = '#ab976f'; c.fillRect(0, 470, W, 8)
  txt(c, '照明线路安装接线实训区', W / 2, 30, 'rgba(30,45,60,.75)', 'bold 18px sans-serif')
  drawShelf(c)
  drawPartsArea(c)
  drawBench(t)
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
  timers.forEach(id => clearTimeout(id))
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

/* ---------- 左侧托盘 ---------- */
.tray {
  position: absolute;
  left: 16px;
  top: 210px;
  width: 215px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, .92);
  border: 2px dashed #8d6e63;
  border-radius: 10px;
}
.tray-title { font-weight: 700; font-size: 13px; color: #4e342e; text-align: center; }
.tray-tip { font-size: 11px; color: #7d5a3c; text-align: center; margin: 0; }
.chip {
  background: #fff8e1;
  border: 2px solid #f0b429;
  border-radius: 8px;
  padding: 10px 6px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  line-height: 1.3;
}
.chip-comp { font-size: 13px; padding: 8px 6px; }
.chip.dragging { opacity: .88; cursor: grabbing; box-shadow: 0 8px 18px rgba(0, 0, 0, .25); }

/* ---------- 交互面板 ---------- */
.panel { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 10; }
.panel .sheet { pointer-events: auto; }
.sheet {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  width: 880px;
  max-height: 220px;
  overflow-y: auto;
  background: rgba(255, 255, 255, .97);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
  padding: 12px 18px;
  box-sizing: border-box;
}
.sheet.sheet-tall { max-height: 330px; }
.sheet.sheet-xl { max-height: 352px; }
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
  z-index: 2;
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
.status.done-pt { background: #e8f5e9; color: #2e7d32; font-weight: 700; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.status i.off { color: #c62828; }
.status b { color: #122d94; }
.row { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
.row.tight { gap: 6px; margin: 4px 0; }
.row.center { justify-content: center; }
.hint { font-size: 12px; color: #78909c; }
.cname { font-size: 13px; font-weight: 600; color: #37474f; }

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
.btn.wire-btn { border-width: 3px; }
.btn.wire-btn.sel { box-shadow: 0 0 0 3px rgba(26, 63, 196, .2); font-weight: 700; }
.tw-L { border-color: #e53935; }
.tw-L.sel { background: #fdecea; }
.tw-N { border-color: #1e88e5; }
.tw-N.sel { background: #e8f1fd; }
.btn.solder-btn.sel { background: #ff8f00; border-color: #ff8f00; color: #fff; font-weight: 700; }

/* ---------- 选项 ---------- */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 4px; }
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
.chk .thumb { width: 34px; height: 26px; object-fit: contain; background: #fff; border: 1px solid #e3e8ef; border-radius: 4px; flex: 0 0 auto; }
.chk.sel { background: #e8f0fe; border-color: #1a3fc4; color: #122d94; font-weight: 600; }
.chk.bad.sel { background: #fdecea; border-color: #c62828; color: #c62828; }
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
.sw-red { box-shadow: inset 4px 0 0 #e53935; }
.sw-blue { box-shadow: inset 4px 0 0 #1e88e5; }
.sw-green { box-shadow: inset 4px 0 0 #43a047; }
.sw-pe { box-shadow: inset 4px 0 0 #fdd835; }
.sw-yellow { box-shadow: inset 4px 0 0 #f9a825; }
.sw-black { box-shadow: inset 4px 0 0 #263238; }
.crow { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }

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

/* ---------- 万用表 ---------- */
.mtr {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #263238;
  border-radius: 8px;
  padding: 6px 12px;
}
.mtr-mode { color: #b0bec5; font-size: 12px; }
.mtr-read {
  flex: 1;
  background: #1b2630;
  color: #78909c;
  border-radius: 4px;
  padding: 4px 10px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  text-align: right;
  min-height: 20px;
}
.mtr.on .mtr-read { color: #8bc34a; }
.probe-tip { margin: 4px 0; font-size: 12px; color: #4a5568; }
.probe-tip b { color: #c62828; }
.test-list { margin: 2px 0 0; padding-left: 18px; font-size: 12px; color: #4a5568; }
.test-list li.done { color: #2e7d32; font-weight: 600; }
.test-list li.fault { color: #c62828; font-weight: 700; }

/* ---------- 调试控制台 ---------- */
.console {
  border: 2px solid #c9d2dd;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f6f8fa;
  margin-top: 6px;
}
.console.ok { border-color: #66bb6a; background: #e8f5e9; }
.console.bad { border-color: #ef6c00; background: #fff3e0; }
.console.lock { border-color: #c62828; background: #fdecea; }
.console-head {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: #122d94;
  font-size: 14px;
}
.console-state {
  font-size: 13px;
  margin: 5px 0;
  padding: 5px 8px;
  border-radius: 5px;
  background: #fff;
  border: 1px solid #eef1f5;
  color: #4a5568;
}
.console.ok .console-state { color: #2e7d32; font-weight: 700; }
.console.bad .console-state { color: #e65100; font-weight: 700; }
.console.lock .console-state { color: #c62828; font-weight: 700; }
.fault-log { font-size: 12px; color: #8d2b0b; max-height: 76px; overflow-y: auto; }
.fault-log b { color: #b71c1c; }
.fault-log p { margin: 3px 0; }
.fault-log .btn { margin-top: 4px; font-size: 12px; padding: 4px 10px; }

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
.record-note {
  font-size: 13px; color: #2b6cb0;
  background: #ebf3fc; border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.record-note.warn { color: #c62828; background: #fdecea; font-weight: 700; }
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

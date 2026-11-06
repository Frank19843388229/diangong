<template>
  <GameLayout
    title="关卡 030101-K31-03 · 三相异步电动机单向连续运转电路接线（带点动控制）"
    :phases="PHASES"
    :cats="cats"
    :total="total"
    :violations="violations"
    :phase="phase"
    :screen="screen"
    :paused="paused"
    :sheet-open="sheetOpen"
    :mistakes="mistakes"
    :msg-text="msgText"
    :msg-type="msgType"
    :set-stage-ref="setStageRef"
    :set-canvas-ref="setCanvasRef"
    @canvas-click="onCanvasClick"
    @toggle-sheet="sheetOpen = !sheetOpen"
  >
    <template #hud-extra>
      <span>调试 <b>{{ DebugController.count }}/2</b></span>
    </template>

    <template #tray>
      <!-- 任务3 元器件拖拽托盘 -->
      <div class="tray" v-if="screen === 'play' && phase === 2">
        <div class="tray-title">元器件存放区</div>
        <div
          v-for="c in compChips" :key="c.key + '-' + chipVer" v-show="!placed[c.key]"
          class="chip chip-comp"
          @pointerdown="e => startDrag(e, (x, y, r) => compDrop(c, x, y, r))"
        >{{ c.code }}<br>{{ c.label }}</div>
        <p class="tray-tip">按电路图拖到操作台对应安装位</p>
      </div>
    </template>

    <template #panel>
      <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 1, 'sheet-xl': phase === 4, folded: !sheetOpen }">
        <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

        <div v-show="sheetOpen" class="fold-area">
              <!-- 任务1：选择电工工具和仪器仪表 -->
              <div v-if="phase === 0" class="sheet-body">
                <h3>任务 1：选择电工工具和仪器仪表（10分）</h3>
                <p class="tip">进入器材摆放架，勾选本关<b>安装、接线与检测</b>所需的工具与仪表。无关工具扣分，<b>明显不合格的工具属严重违规</b>。</p>
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
                  <span class="hint">提示：剥线压接、紧固接线与通断/绝缘检测各需要对应器具</span>
                </div>
              </div>

              <!-- 任务2：选择元器件和导线 -->
              <div v-if="phase === 1" class="sheet-body">
                <h3>任务 2：选择元器件和导线（15分）</h3>
                <p class="tip">对照电路图（断路器 → 接触器 → 热继电器 → 电动机 + 按钮控制回路），勾选<b>8 件元器件</b>并确定各回路<b>导线线色</b>。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">元器件（{{ REQ_COMPS.length }} 项）</div>
                    <label v-for="o in compList" :key="o" class="chk" :class="{ sel: parts.sel.includes(o) }">
                      <input type="checkbox" :value="o" v-model="parts.sel">
                      <img v-if="imgUrl(o)" class="thumb" :src="imgUrl(o)" alt="">{{ o }}
                    </label>
                  </div>
                  <div class="grp">
                    <div class="glabel">导线线色</div>
                    <div v-for="row in WIRE_ROWS" :key="row.k" class="crow">
                      <span class="cname cname-w">{{ row.label }}</span>
                      <button
                        v-for="c in COLORS" :key="c" class="opt"
                        :class="{ sel: wsel[row.k] === c, ['sw-' + swatch(c)]: true }"
                        @click="wsel[row.k] = c; beep(520, .04)"
                      >{{ c }}</button>
                    </div>
                    <p class="probe-tip">规范：L1 黄 · L2 绿 · L3 红 · <b>PE 黄绿双色</b> · 控制线黑，不得混用。</p>
                  </div>
                </div>
                <div class="row">
                  <button class="btn primary" @click="confirmParts">确认选择</button>
                  <span class="hint">选错会累计扣分，可重新选择</span>
                </div>
              </div>

              <!-- 任务3：安装元器件并规范接线 -->
              <div v-if="phase === 2" class="sheet-body">
                <h3>任务 3：安装元器件并规范接线（50分 = 安装10 + 主回路15 + 控制回路15 + 端子排10）</h3>
                <p class="tip">先将左侧<b>元器件</b>拖到操作台对应安装位；再选择<b>导线线种</b>，依次点击<b>两个接线端子</b>完成接线。按钮控制线必须<b>经端子排转接</b>。</p>
                <div class="row">
                  <span class="cname">手持导线：</span>
                  <button v-for="(v, k) in WT" :key="k" class="btn wire-btn sm" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">
                    {{ v.cn }}（{{ v.name }}色）
                  </button>
                  <button class="btn" :disabled="!selWireId" @click="deleteSelWire">拆除选中导线</button>
                  <button class="btn primary" @click="submitWiring">提交接线检查</button>
                </div>
                <p class="status">元件 <b>{{ placedCount }}/5</b>
                 　主回路 <b>{{ rightN('main') }}/14</b>
                 　控制回路 <b>{{ rightN('ctl') }}/8</b>
                 　端子排 <b>{{ rightN('xt') }}/4</b>
                 　错误导线 <b class="bad-t">{{ wrongN }}</b>
                 　得分 {{ cats['元件安装'].got + cats['主回路'].got + cats['控制回路'].got + cats['端子排'].got }}/50
                  <template v-if="pendId">　已选端子：<b>{{ TMAP[pendId].n }}</b></template>
                </p>
              </div>

              <!-- 任务4：导线一字型绞合连接 -->
              <div v-if="phase === 3" class="sheet-body">
                <h3>任务 4：导线一字型（平接）绞合连接（10分）</h3>
                <p class="tip">在<b>断电状态</b>下，先选择操作，再点击左侧<b>指定接头</b>，严格按 <b>剥除绝缘层 → 导线交叉 → 一字型绞合 → 整理接头</b> 顺序完成 2 个接头，顺序错误该接头作废重做。</p>
                <div class="row">
                  <span class="cname">当前操作：</span>
                  <button v-for="op in SPLICE_OPS" :key="op" class="btn splice-btn" :class="{ sel: spliceOp === op }" @click="spliceOp = op; beep(520, .04)">{{ op }}</button>
                </div>
                <div class="row">
                  <span v-for="p in splice.pts" :key="p.id" class="status inline" :class="{ 'done-pt': p.step >= 4 }">{{ p.n }} {{ p.step >= 4 ? '√' : p.step + '/4' }}　</span>
                </div>
                <div class="row">
                  <button class="btn primary" :disabled="!spliceDone" @click="finishSplice">完成绞合，进入检查调试</button>
                  <span class="hint">已完成 {{ spliceDoneN }}/2 个接头 · 工艺失误 {{ splice.mistakes }} 次 · 得分 {{ cats['绞合连接'].got }}/10</span>
                </div>
              </div>

              <!-- 任务5：检查并通电调试 -->
              <div v-if="phase === 4" class="sheet-body">
                <h3>任务 5：检查并通电调试（10分 = 检查5 + 万用表2 + 调试3）</h3>
                <p class="tip">先完成<b>通电前检查</b>与<b>万用表通断检测</b>，全部合格后申请通电。<b>通电调试最多 2 次</b>，次数用尽锁定调试入口。通电后依次操作 <b>SB1 启动 / SB2 点动 / SB0 停止</b> 完成测试。</p>
                <div class="grid3">
                  <div class="grp">
                    <div class="glabel">通电前检查（{{ lookDone }}/5）</div>
                    <label v-for="it in look.items" :key="it.k" class="chk" :class="{ sel: it.done }" @click.prevent="checkLook(it)">
                      {{ it.done ? '√' : '□' }} {{ it.k }}
                    </label>
                    <div class="row tight">
                      <span class="cname">检修导线：</span>
                      <button v-for="(v, k) in WT" :key="k" class="btn wire-btn sm" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">{{ v.cn }}</button>
                      <button class="btn sm" :disabled="!selWireId" @click="deleteSelWire">拆除选中</button>
                    </div>
                    <p class="probe-tip">可直接在操作台<b>点击端子补接</b>或<b>点击导线拆除</b>，接线变更后须重新检查。</p>
                  </div>

                  <div class="grp">
                    <div class="glabel">万用表检测（{{ meterDone }}/2）</div>
                    <div class="row tight">
                      <button v-for="m in MODES" :key="m" class="opt" :class="{ sel: meter.mode === m }" @click="chooseMode(m)">{{ m }}</button>
                    </div>
                    <div class="mtr" :class="{ on: meter.mode === '通断测试' }">
                      <span class="mtr-mode">{{ meter.mode || '未选择档位' }}</span>
                      <span class="mtr-read">{{ meter.readout || '---' }}</span>
                    </div>
                    <p class="probe-tip">点击两个接线端子测量（探针：<b>{{ probeA ? TMAP[probeA].n : '未选择' }}</b>）</p>
                    <ul class="test-list">
                      <li v-for="t in meter.tests" :key="t.id" :class="{ done: t.done && t.ok, fault: t.done && !t.ok }">
                        {{ t.done ? (t.ok ? '√' : '✗') : '○' }} {{ t.desc }}（应{{ t.expect }}）{{ t.done && !t.ok ? '　← 实测异常' : '' }}
                      </li>
                    </ul>
                  </div>

                  <div class="grp">
                    <div class="glabel">调试控制台（{{ checkDone }}/7）</div>
                    <div class="console" :class="debugStatus.kind">
                      <div class="console-head">
                        <b>⚡ 通电调试</b>
                        <span>次数 {{ DebugController.count }}/2</span>
                      </div>
                      <div class="console-state">{{ debugStatus.text }}</div>
                      <div class="row tight">
                        <button class="btn primary sm" :disabled="dbgOnDisabled" @click="applyDebug">模拟调试（申请通电）</button>
                      </div>
                      <div v-if="debugLocked" class="fault-log">
                        <b>⛔ 调试次数已达上限，禁止再次通电：</b>
                        <p v-for="(l, i) in DebugController.logs" :key="i">第{{ l.n }}次：{{ l.detail }}</p>
                        <button class="btn sm" @click="restartRun">重新训练（重置调试记录）</button>
                      </div>
                      <div v-else-if="DebugController.logs.length" class="fault-log">
                        <b>调试记录：</b>
                        <p v-for="(l, i) in DebugController.logs" :key="i">第{{ l.n }}次：{{ l.result === 'pass' ? '✔ 通过' : '✘ 失败' }} —— {{ l.detail }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 通电后的模拟操作 -->
                <div v-if="dbg.on" class="dbg-run">
                  <div class="run-state">
                    电源：<b class="on-c">送电</b>
                   　接触器 KM：<b :class="dbg.km ? 'on-c' : ''">{{ dbg.km ? '吸合' : '释放' }}</b>
                   　电动机：<b :class="dbg.running ? 'on-c' : ''">{{ motorText }}</b>
                   　自锁：<b :class="dbg.lock ? 'on-c' : ''">{{ dbg.lock ? '已保持' : '未形成' }}</b>
                  </div>
                  <div class="row">
                    <button class="btn sb-btn sb1" @click="pressSB1">按 SB1 启动（连续）</button>
                    <button class="btn sb-btn sb2" @click="pressSB2">按 SB2 点动</button>
                    <button class="btn sb-btn sb0" @click="pressSB0">按 SB0 停止</button>
                    <button class="btn primary" :disabled="!(dbg.tried1 && dbg.tried2 && dbg.tried3)" @click="judgeDebug">结束本次调试并判定</button>
                  </div>
                  <p class="probe-tip">
                    测试进度：启动 {{ dbg.tried1 ? '√' : '○' }}　自锁 {{ dbg.lock ? '√' : '○' }}　点动 {{ dbg.jog ? '√' : '○' }}　停止 {{ dbg.tried3 ? '√' : '○' }}
                    <span class="hint">（三项操作全部完成后方可判定）</span>
                  </p>
                </div>
              </div>

              <!-- 任务6：拆除电路 -->
              <div v-if="phase === 5" class="sheet-body">
                <h3>任务 6：拆除电路（拆除整理分项 4 分）</h3>
                <p class="tip">严格按顺序操作：<b>断电确认 → 拆除控制线 → 拆除主回路 → 拆除元器件</b>。<b>禁止带电拆线、拉扯导线、损坏端子。</b>断电确认后可直接<b>点击画布上的导线</b>（控制线/主回路）动手拆除。</p>
                <div class="steps">
                  <button
                    v-for="(s, i) in DEMO_STEPS" :key="s.k" class="step"
                    :class="{ done: demo.step > i, next: demo.step === i }"
                    @click="demoStep(i)"
                  >{{ demo.step > i ? '√' : i + 1 }}. {{ s.label }}（{{ s.pts }}分）</button>
                </div>
                <p class="status">实训台电源：<i :class="{ off: power }">{{ power ? '带电（红色指示灯亮）' : '已断电' }}</i>　进度 {{ demo.step }}/4　得分 {{ cats['拆除整理'].got }}/5</p>
              </div>

              <!-- 任务7：整理场地 -->
              <div v-if="phase === 6" class="sheet-body">
                <h3>任务 7：整理场地（拆除整理分项 1 分）</h3>
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
    </template>

    <template #overlays>
      <!-- 开始界面 -->
      <GameTitleOverlay
        v-if="screen === 'title'"
        code="030101-K31-03"
        title="三相异步电动机单向连续运转电路接线（带点动控制）"
        subtitle="低压电工考证 · 安装接线实训 · 7项任务 · 满分100分 · 难度 ★★★★★"
        goal="训练目标：根据给定控制电路图，完成三相动力线路、电动机主回路、接触器自锁 + 点动控制回路的安装接线、一字型绞合、通电调试与拆除整理。"
        :tasks="['选择电工工具和仪器仪表（10）','选择元器件和导线（15）','安装元器件并规范接线（50）','一字型绞合连接（10）','检查并通电调试（10）','拆除电路 / 整理场地（5）']"
        fatal-note="⚠ 本关特殊规则：通电调试最多 2 次，次数用尽锁定调试入口；未确认断电接线、PE 未连接、主回路短路、三相线路错接、绕过安全检查调试均判定为重大违规。"
        :extra-note="DebugController.count > 0 ? `调试记录：已启动 ${DebugController.count}/2 次${debugLocked ? '（已达上限，调试入口锁定）' : ''}` : ''"
        @start="startGame"
      >
        <template #extra>
          <button v-if="debugLocked" class="btn" @click="restartRun">重置调试记录，重新训练</button>
        </template>
      </GameTitleOverlay>

      <!-- 结算界面 -->
      <GameResultOverlay
        v-if="screen === 'results'"
        code="030101-K31-03"
        title="三相异步电动机单向连续运转电路接线（带点动控制）"
        :cats="cats"
        :total="total"
        :stars="stars"
        :verdict="verdict"
        @restart="restartRun"
      >
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
      </GameResultOverlay>
    </template>
  </GameLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { drawImgFit, imgUrl } from '@/assets/imgmap'
import { DROP_PAD, nearestBox, padToCanvas } from '@/lib/dropTarget.js'
import { useGame } from '@/composables/game/useGame.js'
import GameLayout from '@/components/game/GameLayout.vue'
import GameTitleOverlay from '@/components/game/GameTitleOverlay.vue'
import GameResultOverlay from '@/components/game/GameResultOverlay.vue'
import { line as canvasLine } from '@/utils/game/canvas.js'

// ================= 常量 =================
const W = 960, H = 640
const BX = 250, BY = 55, BW = 694, BH = 365 // 实训操作台

const PHASES = [
  { name: '选择电工工具和仪器仪表', cat: '工具仪表', obj: '正确选择 4 项所需工具仪表' },
  { name: '选择元器件和导线', cat: '元件导线', obj: '8 件元器件 · 5 种回路线色' },
  { name: '安装元器件并规范接线', cat: '元件安装', obj: '5 个元件就位 · 26 条导线正确连接（按钮线经端子排）' },
  { name: '导线一字型绞合连接', cat: '绞合连接', obj: '2 个接头按「剥线→交叉→绞合→整理」断电完成' },
  { name: '检查并通电调试', cat: '检查调试', obj: '通电前检查 7 项 · 调试 ≤2 次 · SB1/SB2/SB0 测试' },
  { name: '拆除电路', cat: '拆除整理', obj: '断电确认 → 拆控制线 → 拆主回路 → 拆元件' },
  { name: '整理场地', cat: '拆除整理', obj: '工具仪表归位 · 元件分类 · 清洁台面' },
]

const CAT_DEFS = {
  '工具仪表': { max: 10 },
  '元件导线': { max: 15 },
  '元件安装': { max: 10 },
  '主回路': { max: 15 },
  '控制回路': { max: 15 },
  '端子排': { max: 10 },
  '绞合连接': { max: 10 },
  '检查调试': { max: 10 },
  '拆除整理': { max: 5 },
}

// ================= 任务1 数据 =================
const toolList = [
  { n: '螺丝刀' }, { n: '剥线钳' }, { n: '压线钳' }, { n: '尖嘴钳' }, { n: '电工刀' }, { n: '扳手' },
  { n: '绝缘破裂的压线钳（不合格）', bad: true },
]
const meterList = [{ n: '万用表' }, { n: '验电笔' }, { n: '钳形电流表' }, { n: '兆欧表' }]
const REQ_TOOLS = ['螺丝刀', '剥线钳', '压线钳', '万用表']

// ================= 任务2 数据 =================
const compList = [
  '断路器', '交流接触器', '热继电器', '三相异步电动机',
  '启动按钮', '停止按钮', '点动按钮', '接线端子排',
  '熔断器', '中间继电器', '单相异步电动机', '电能表',
]
const REQ_COMPS = [
  '断路器', '交流接触器', '热继电器', '三相异步电动机',
  '启动按钮', '停止按钮', '点动按钮', '接线端子排',
]
const COLORS = ['黄色', '绿色', '红色', '黄绿双色', '黑色', '蓝色']
const WIRE_ROWS = [
  { k: 'L1', label: 'L1 主回路（黄）', req: '黄色' },
  { k: 'L2', label: 'L2 主回路（绿）', req: '绿色' },
  { k: 'L3', label: 'L3 主回路（红）', req: '红色' },
  { k: 'PE', label: 'PE 保护接地', req: '黄绿双色' },
  { k: 'CTL', label: '按钮控制线', req: '黑色' },
]
const WT = {
  L1: { cn: 'L1', name: '黄', color: '#f9a825' },
  L2: { cn: 'L2', name: '绿', color: '#43a047' },
  L3: { cn: 'L3', name: '红', color: '#e53935' },
  PE: { cn: 'PE', name: '黄绿', color: '#c0ca33' },
  CTL: { cn: '控制线', name: '黑', color: '#37474f' },
}
function swatch(c) {
  return { '黄色': 'yellow', '绿色': 'green', '红色': 'red', '黄绿双色': 'pe', '黑色': 'black', '蓝色': 'blue' }[c] || ''
}

// ================= 操作台布局 =================
const SLOTS = [
  { id: 'qf', name: '断路器 QF', x: 278, y: 98, w: 90, h: 80 },
  { id: 'km', name: '接触器 KM', x: 430, y: 98, w: 110, h: 110 },
  { id: 'fr', name: '热继电器 FR', x: 600, y: 98, w: 100, h: 110 },
  { id: 'xt', name: '端子排 XT', x: 270, y: 270, w: 380, h: 52 },
  { id: 'motor', name: '电动机 M', x: 770, y: 92, w: 120, h: 130 },
]

const TERMS = [
  // 电源
  { id: 's1', x: 300, y: 78, a: ['L1'], n: '电源 L1 进线' },
  { id: 's2', x: 340, y: 78, a: ['L2'], n: '电源 L2 进线' },
  { id: 's3', x: 380, y: 78, a: ['L3'], n: '电源 L3 进线' },
  { id: 'spe', x: 425, y: 78, a: ['PE'], n: 'PE 保护接地' },
  // 断路器 QF
  { id: 'qf1i', x: 300, y: 98, a: ['L1'], n: 'QF 1 进线', owner: 'qf' },
  { id: 'qf2i', x: 325, y: 98, a: ['L2'], n: 'QF 2 进线', owner: 'qf' },
  { id: 'qf3i', x: 350, y: 98, a: ['L3'], n: 'QF 3 进线', owner: 'qf' },
  { id: 'qf1o', x: 300, y: 178, a: ['L1', 'CTL'], n: 'QF 1 出线（控制取电）', owner: 'qf' },
  { id: 'qf2o', x: 325, y: 178, a: ['L2'], n: 'QF 2 出线', owner: 'qf' },
  { id: 'qf3o', x: 350, y: 178, a: ['L3', 'CTL'], n: 'QF 3 出线（线圈回线）', owner: 'qf' },
  // 接触器 KM
  { id: 'km1i', x: 455, y: 98, a: ['L1'], n: 'KM 1 进线', owner: 'km' },
  { id: 'km2i', x: 485, y: 98, a: ['L2'], n: 'KM 2 进线', owner: 'km' },
  { id: 'km3i', x: 515, y: 98, a: ['L3'], n: 'KM 3 进线', owner: 'km' },
  { id: 'km1o', x: 455, y: 208, a: ['L1'], n: 'KM 1 出线', owner: 'km' },
  { id: 'km2o', x: 485, y: 208, a: ['L2'], n: 'KM 2 出线', owner: 'km' },
  { id: 'km3o', x: 515, y: 208, a: ['L3'], n: 'KM 3 出线', owner: 'km' },
  { id: 'kmaux1', x: 540, y: 118, a: ['CTL'], n: 'KM 自锁常开触点 1', owner: 'km' },
  { id: 'kmaux2', x: 540, y: 142, a: ['CTL'], n: 'KM 自锁常开触点 2', owner: 'km' },
  { id: 'kma1', x: 430, y: 185, a: ['CTL'], n: 'KM 线圈 A1', owner: 'km' },
  { id: 'kma2', x: 540, y: 170, a: ['CTL'], n: 'KM 线圈 A2', owner: 'km' },
  // 热继电器 FR
  { id: 'fr1i', x: 625, y: 98, a: ['L1'], n: 'FR 1 进线', owner: 'fr' },
  { id: 'fr2i', x: 650, y: 98, a: ['L2'], n: 'FR 2 进线', owner: 'fr' },
  { id: 'fr3i', x: 675, y: 98, a: ['L3'], n: 'FR 3 进线', owner: 'fr' },
  { id: 'fr1o', x: 625, y: 208, a: ['L1'], n: 'FR 1 出线（U）', owner: 'fr' },
  { id: 'fr2o', x: 650, y: 208, a: ['L2'], n: 'FR 2 出线（V）', owner: 'fr' },
  { id: 'fr3o', x: 675, y: 208, a: ['L3'], n: 'FR 3 出线（W）', owner: 'fr' },
  { id: 'frnc1', x: 600, y: 140, a: ['CTL'], n: 'FR 常闭触点 95', owner: 'fr' },
  { id: 'frnc2', x: 600, y: 165, a: ['CTL'], n: 'FR 常闭触点 96', owner: 'fr' },
  // 电动机
  { id: 'mu', x: 800, y: 215, a: ['L1'], n: '电动机 U 端', owner: 'motor' },
  { id: 'mv', x: 835, y: 215, a: ['L2'], n: '电动机 V 端', owner: 'motor' },
  { id: 'mw', x: 870, y: 215, a: ['L3'], n: '电动机 W 端', owner: 'motor' },
  { id: 'mpe', x: 886, y: 178, a: ['PE'], n: '电动机 PE 端', owner: 'motor' },
  // 端子排 XT
  { id: 'xpe1', x: 305, y: 322, a: ['PE'], n: '端子排 PE 1', owner: 'xt' },
  { id: 'xpe2', x: 350, y: 322, a: ['PE'], n: '端子排 PE 2', owner: 'xt' },
  { id: 'xc1', x: 420, y: 322, a: ['CTL'], n: '端子排 XT-1（电源侧）', owner: 'xt' },
  { id: 'xc2', x: 470, y: 322, a: ['CTL'], n: '端子排 XT-2（备用）', owner: 'xt' },
  { id: 'xc3', x: 540, y: 322, a: ['CTL'], n: '端子排 XT-3（按钮侧）', owner: 'xt' },
  { id: 'xc4', x: 595, y: 322, a: ['CTL'], n: '端子排 XT-4（备用）', owner: 'xt' },
  // 按钮组（预装）
  { id: 'sb0a', x: 300, y: 340, a: ['CTL'], n: 'SB0 停止（常闭）进线' },
  { id: 'sb0b', x: 335, y: 340, a: ['CTL'], n: 'SB0 停止（常闭）出线' },
  { id: 'sb1a', x: 415, y: 340, a: ['CTL'], n: 'SB1 启动（常开）进线' },
  { id: 'sb1b', x: 450, y: 340, a: ['CTL'], n: 'SB1 启动（常开）出线' },
  { id: 'sb2na', x: 520, y: 340, a: ['CTL'], n: 'SB2 点动常开 a' },
  { id: 'sb2nb', x: 555, y: 340, a: ['CTL'], n: 'SB2 点动常开 b' },
  { id: 'sb2ca', x: 595, y: 340, a: ['CTL'], n: 'SB2 点动常闭 a' },
  { id: 'sb2cb', x: 630, y: 340, a: ['CTL'], n: 'SB2 点动常闭 b' },
]
const TMAP = Object.fromEntries(TERMS.map(t => [t.id, t]))

// 标准接线关系（26 条）
const REQ_WIRES = [
  // 主回路 + PE（14 条 · 15 分）
  { id: 'm1', a: 's1', b: 'qf1i', type: 'L1', cat: 'main' },
  { id: 'm2', a: 's2', b: 'qf2i', type: 'L2', cat: 'main' },
  { id: 'm3', a: 's3', b: 'qf3i', type: 'L3', cat: 'main' },
  { id: 'm4', a: 'qf1o', b: 'km1i', type: 'L1', cat: 'main' },
  { id: 'm5', a: 'qf2o', b: 'km2i', type: 'L2', cat: 'main' },
  { id: 'm6', a: 'qf3o', b: 'km3i', type: 'L3', cat: 'main' },
  { id: 'm7', a: 'km1o', b: 'fr1i', type: 'L1', cat: 'main' },
  { id: 'm8', a: 'km2o', b: 'fr2i', type: 'L2', cat: 'main' },
  { id: 'm9', a: 'km3o', b: 'fr3i', type: 'L3', cat: 'main' },
  { id: 'm10', a: 'fr1o', b: 'mu', type: 'L1', cat: 'main' },
  { id: 'm11', a: 'fr2o', b: 'mv', type: 'L2', cat: 'main' },
  { id: 'm12', a: 'fr3o', b: 'mw', type: 'L3', cat: 'main' },
  { id: 'm13', a: 'spe', b: 'xpe1', type: 'PE', cat: 'main' },
  { id: 'm14', a: 'xpe2', b: 'mpe', type: 'PE', cat: 'main' },
  // 控制回路（8 条 · 15 分）
  { id: 'c3', a: 'sb0b', b: 'sb1a', type: 'CTL', cat: 'ctl' },
  { id: 'c4', a: 'sb1a', b: 'kmaux1', type: 'CTL', cat: 'ctl' },
  { id: 'c5', a: 'kmaux2', b: 'sb2ca', type: 'CTL', cat: 'ctl' },
  { id: 'c6', a: 'sb2cb', b: 'sb1b', type: 'CTL', cat: 'ctl' },
  { id: 'c7', a: 'sb1a', b: 'sb2na', type: 'CTL', cat: 'ctl' },
  { id: 'c8', a: 'sb2nb', b: 'sb1b', type: 'CTL', cat: 'ctl' },
  { id: 'c11', a: 'kma2', b: 'frnc1', type: 'CTL', cat: 'ctl' },
  { id: 'c12', a: 'frnc2', b: 'qf3o', type: 'CTL', cat: 'ctl' },
  // 端子排转接（4 条 · 10 分）
  { id: 'c1', a: 'qf1o', b: 'xc1', type: 'CTL', cat: 'xt' },
  { id: 'c2', a: 'xc1', b: 'sb0a', type: 'CTL', cat: 'xt' },
  { id: 'c9', a: 'sb1b', b: 'xc3', type: 'CTL', cat: 'xt' },
  { id: 'c10', a: 'xc3', b: 'kma1', type: 'CTL', cat: 'xt' },
]
const RMAP = Object.fromEntries(REQ_WIRES.map(r => [r.id, r]))

// 元器件内部导通关系（断电检测用）
const INTERNAL = [
  { a: 'qf1i', b: 'qf1o', need: 'qf' }, { a: 'qf2i', b: 'qf2o', need: 'qf' }, { a: 'qf3i', b: 'qf3o', need: 'qf' },
  { a: 'km1i', b: 'km1o', need: 'km' }, { a: 'km2i', b: 'km2o', need: 'km' }, { a: 'km3i', b: 'km3o', need: 'km' },
  { a: 'fr1i', b: 'fr1o', need: 'fr' }, { a: 'fr2i', b: 'fr2o', need: 'fr' }, { a: 'fr3i', b: 'fr3o', need: 'fr' },
  { a: 'frnc1', b: 'frnc2', need: 'fr' },
  { a: 'xpe1', b: 'xpe2', need: 'xt' }, { a: 'xc1', b: 'xc2', need: 'xt' }, { a: 'xc3', b: 'xc4', need: 'xt' },
  { a: 'sb0a', b: 'sb0b', need: null },    // 停止按钮常闭
  { a: 'sb2ca', b: 'sb2cb', need: null },  // 点动按钮常闭
]

// 等效接线点：端子排同一节点的并联孔（内部导通），接任意一个都算正确
const EQ_GROUPS = [
  ['xpe1', 'xpe2'],
  ['xc1', 'xc2'],
  ['xc3', 'xc4'],
]
const EQ_OF = EQ_GROUPS.reduce((m, g) => { g.forEach(id => { m[id] = g[0] }); return m }, {})
const eqId = id => EQ_OF[id] || id
function eqPair(ax, ay, bx, by) {
  return (eqId(ax) === eqId(bx) && eqId(ay) === eqId(by)) ||
         (eqId(ax) === eqId(by) && eqId(ay) === eqId(bx))
}

// ================= 任务4 数据 =================
const SPLICE_OPS = ['剥除绝缘层', '导线交叉', '一字型绞合', '整理接头']
const SPLICE_PTS = [
  { id: 'j1', n: '接头① 控制线', x: 74, y: 276, type: 'CTL' },
  { id: 'j2', n: '接头② 主回路', x: 172, y: 356, type: 'L1' },
]

// ================= 任务5/6 数据 =================
const MODES = ['通断测试', '电压档', '电阻档', '二极管档']
const DEMO_STEPS = [
  { k: 'off', label: '断电确认', pts: 1 },
  { k: 'ctl', label: '拆除控制线', pts: 1 },
  { k: 'main', label: '拆除主回路', pts: 1 },
  { k: 'comp', label: '拆除元器件', pts: 1 },
]

// ================= 公共关卡流程 =================
const power = ref(false)

const {
  beep, startDrag, canvasRef, ctx, setStageRef, setCanvasRef, clearAll: clearTimers,
  later, screen, phase, lock, paused, sheetOpen, mistakes, violations,
  cats, total, stars, verdict, msgText, msgType, showMsg, noteMistake,
  addScore, setScore, penalize, majorViolation, completePhase: advancePhase, startGame,
} = useGame(PHASES, CAT_DEFS, {
  onReset: resetState,
  onEnterPhase: () => { pendId.value = ''; selWireId.value = '' },
  violationMessage: (reason, penalty) => `检测到严重电气安全风险：${reason}（-${penalty} 分）`,
  resumeMessage: '请重新执行安全检查',
  onViolation: () => {
    if (phase.value === 4) resetChecks('安全违规，通电前检查结果作废，请重新检查')
  },
  messageDuration: 3600,
  verdict: t => {
    if (t >= 90) return '具备三相电动机控制线路安装与调试能力'
    if (t >= 80) return '基本具备安装接线能力，注意自锁、点动与 PE 接地规范'
    if (t >= 70) return '能够完成安装接线，但存在漏项或安全隐患'
    return '安装接线能力不足，建议重新训练'
  },
})

// 保留旧的 completePhase(cat, pts) 调用签名
function completePhase(cat, pts) {
  if (cat && pts != null) addScore(cat, pts)
  if (pts) showMsg(`✔ 阶段完成　+${pts} 分`, 'good')
  advancePhase()
}

// ================= DebugController：调试次数独立记录 =================
// 每次启动调试 +1 并写入 localStorage，刷新/切场景不重置，
// 仅在「重新训练」时清零；达到 2 次后锁定调试入口。
const DEBUG_KEY = 'k3103-debug-record'
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
  } catch (e) { /* 记录损坏按空记录处理 */ }
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
    showMsg('✔ 工具仪表选择符合安装、接线与检测要求', 'good')
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
const wsel = reactive({ L1: '', L2: '', L3: '', PE: '', CTL: '' })
function confirmParts() {
  if (paused.value || lock.value) return
  const sel = new Set(parts.sel)
  let p = 0; const miss = [], extra = []
  for (const r of REQ_COMPS) if (!sel.has(r)) { p += 1; miss.push(r) }
  for (const n of sel) if (!REQ_COMPS.includes(n)) { p += 1; extra.push(n) }
  let colorErr = 0
  for (const row of WIRE_ROWS) if (wsel[row.k] !== row.req) colorErr++
  p += colorErr
  if (!p) {
    setScore('元件导线', Math.max(0, 15 - parts.penalty))
    showMsg('✔ 元器件齐全 · 线色规范（L1黄 L2绿 L3红 PE黄绿 控制线黑）', 'good')
    completePhase()
  } else {
    parts.penalty += p
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    setScore('元件导线', Math.max(0, 15 - parts.penalty))
    const msgs = []
    if (miss.length) msgs.push('缺少 ' + miss.join('、'))
    if (extra.length) msgs.push('多选 ' + extra.join('、'))
    if (colorErr) msgs.push(`有 ${colorErr} 种导线线色不规范`)
    showMsg(`选择不符合电路图：${msgs.join('；')}（-${p} 分）`, 'warn')
  }
}

// ================= 任务3：安装与接线 =================
const compChips = reactive([
  { key: 'qf', code: 'QF', label: '断路器' },
  { key: 'km', code: 'KM', label: '交流接触器' },
  { key: 'fr', code: 'FR', label: '热继电器' },
  { key: 'xt', code: 'XT', label: '端子排' },
  { key: 'motor', code: 'M', label: '三相电动机' },
])
const placed = reactive({ qf: false, km: false, fr: false, xt: false, motor: false })
const wires = ref([])
const wireType = ref('L1')
const pendId = ref('')
const selWireId = ref('')
const chipVer = ref(0)
let wid = 0

const placedCount = computed(() => Object.values(placed).filter(Boolean).length)
const wrongN = computed(() => wires.value.filter(w => w.wrong).length)
function findWire(r) {
  return wires.value.find(w => eqPair(w.a, w.b, r.a, r.b))
}
function rightN(cat) { return REQ_WIRES.filter(r => r.cat === cat && findWire(r)).length }
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
  scoreWiring()
  showMsg(`✔ ${chip.label} 安装牢固、排列合理、标识清晰`, 'good')
}
function scoreWiring() {
  setScore('元件安装', placedCount.value * 2)
  const cnt = c => REQ_WIRES.filter(r => r.cat === c).length
  const wrongMain = wires.value.filter(w => w.wrong && w.type !== 'CTL').length
  const wrongCtl = wires.value.filter(w => w.wrong && w.type === 'CTL').length
  setScore('主回路', 15 * rightN('main') / cnt('main') - wrongMain * 2)
  setScore('控制回路', 15 * rightN('ctl') / cnt('ctl') - wrongCtl * 2)
  setScore('端子排', 10 * rightN('xt') / cnt('xt'))
}
function tryConnect(a, b) {
  if (power.value) {
    majorViolation('未确认断电进行接线：设备带电状态下禁止接线作业', '主回路', 4)
    return
  }
  const common = a.a.filter(x => b.a.includes(x))
  if (!common.length) {
    majorViolation(
      `三相线路错误接入：${a.n}（${a.a.join('/')}）与 ${b.n}（${b.a.join('/')}）直接相连，存在短路风险`,
      '主回路', 4)
    return
  }
  if (!common.includes(wireType.value)) {
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`线种/线色错误：${a.n} → ${b.n} 属 ${common.join('/')} 回路，请选用对应导线`, 'warn')
    return
  }
  if (wires.value.some(w => eqPair(w.a, w.b, a.id, b.id))) {
    showMsg('该线路已连接，请勿重复', 'info')
    return
  }
  const type = common.includes(wireType.value) ? wireType.value : common[0]
  const req = REQ_WIRES.find(r => eqPair(r.a, r.b, a.id, b.id))
  if (!req) {
    wires.value.push({ id: ++wid, a: a.id, b: b.id, type, wrong: true })
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`接线关系错误：${a.n} → ${b.n} 不符合电路图（橙色虚线，请选中后拆除）`, 'warn')
    afterWiringChange()
    return
  }
  wires.value.push({ id: ++wid, a: a.id, b: b.id, type, wrong: false })
  beep(760, .07)
  showMsg(`✔ 接线正确：${a.n} → ${b.n}（${WT[type].cn}线）`, 'good')
  afterWiringChange()
}
function afterWiringChange() {
  scoreWiring()
  if (phase.value === 4) resetChecks('接线已变更，请重新进行通电前检查')
}
function deleteSelWire() {
  const w = wires.value.find(x => x.id === selWireId.value)
  if (!w) return
  if (power.value) {
    majorViolation('未确认断电进行接线：带电拆线存在电弧与触电风险', '主回路', 4)
    return
  }
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
  scoreWiring()
  const missing = REQ_WIRES.filter(r => !findWire(r))
  const peMiss = ['m13', 'm14'].filter(id => !findWire(RMAP[id]))
  if (!missing.length && !wrongN.value) {
    showMsg('✔ 主回路 U/V/W/PE · 控制回路自锁点动 · 端子排转接全部正确', 'good')
    completePhase()
    return
  }
  const msgs = []
  if (missing.length) {
    const byCat = c => missing.filter(r => r.cat === c).map(r => `${TMAP[r.a].n}→${TMAP[r.b].n}`)
    const g = [['main', '主回路'], ['ctl', '控制回路'], ['xt', '端子排']]
    for (const [c, label] of g) {
      const l = byCat(c)
      if (l.length) msgs.push(`${label}未完成：${l.slice(0, 4).join('、')}${l.length > 4 ? ` 等 ${l.length} 处` : ''}`)
    }
  }
  if (wrongN.value) msgs.push(`存在 ${wrongN.value} 条错误接线（橙色虚线），点击导线后可拆除`)
  if (peMiss.length && missing.length === peMiss.length) msgs.push('⚠ PE 保护接地未连接，属严重安全隐患')
  showMsg(msgs.join('；'), 'warn')
  beep(220, .12, 'sawtooth')
}

// ================= 任务4：一字型绞合 =================
const spliceOp = ref(SPLICE_OPS[0])
const splice = reactive({
  pts: SPLICE_PTS.map(p => ({ ...p, step: 0 })),
  mistakes: 0,
})
const spliceDoneN = computed(() => splice.pts.filter(p => p.step >= 4).length)
const spliceDone = computed(() => spliceDoneN.value === splice.pts.length)
function spliceClick(pt) {
  if (paused.value || lock.value) return
  if (power.value) {
    majorViolation('带电作业：绞合连接必须在确认断电后进行', '绞合连接', 3)
    return
  }
  if (pt.step >= 4) { showMsg(`${pt.n} 已完成绞合`, 'info'); return }
  const need = SPLICE_OPS[pt.step]
  if (spliceOp.value !== need) {
    splice.mistakes++
    penalize('绞合连接', 1)
    pt.step = 0
    beep(150, .3, 'sawtooth')
    showMsg(`接头不合格：当前应「${need}」，实际「${spliceOp.value}」，该接头需从头重做（-1 分）`, 'bad')
    return
  }
  pt.step++
  beep(760, .07)
  if (pt.step >= 4) {
    addScore('绞合连接', 4)
    showMsg(`✔ ${pt.n} 一字型绞合完成：连接牢固、接触可靠　+4 分`, 'good')
  } else {
    showMsg(`✔ 「${need}」完成，下一步：${SPLICE_OPS[pt.step]}`, 'good')
  }
}
function finishSplice() {
  if (paused.value || lock.value || !spliceDone.value) return
  if (splice.mistakes === 0) addScore('绞合连接', 2)
  showMsg('✔ 接头检查合格：连接牢固、接触可靠、外观符合要求，断电状态确认', 'good')
  completePhase()
}

// ================= 任务5：通电前检查与调试 =================
const look = reactive({
  items: [
    { k: '接线完整', done: false },
    { k: '元件固定', done: false },
    { k: '螺钉紧固', done: false },
    { k: 'PE 连接', done: false },
    { k: '无短路风险', done: false },
  ],
})
const meter = reactive({
  mode: '',
  readout: '',
  tests: [
    { id: 't1', pair: ['s1', 's2'], expect: '不通', desc: '主回路相间绝缘（L1-L2）', done: false, ok: false },
    { id: 't2', pair: ['spe', 'mpe'], expect: '通', desc: 'PE 保护接地连续性（电源→端子排→电机）', done: false, ok: false },
  ],
})
const probeA = ref('')

const lookDone = computed(() => look.items.filter(i => i.done).length)
const meterDone = computed(() => meter.tests.filter(t => t.done).length)
const checkDone = computed(() => lookDone.value + meterDone.value)
const checksDone = computed(() => checkDone.value === 7)

function checkLook(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('检查调试', 1)
  beep(700, .06)
  showMsg(`✔ 检查合格：${it.k}　+1 分`, 'good')
}
function resetChecks(reason) {
  look.items.forEach(i => { i.done = false })
  meter.tests.forEach(t => { t.done = false; t.ok = false })
  meter.mode = ''
  meter.readout = ''
  probeA.value = ''
  if (reason) showMsg(reason, 'warn')
}
function chooseMode(m) {
  if (m !== '通断测试') {
    penalize('检查调试', 1)
    beep(200, .12, 'sawtooth')
    showMsg('检测方法不正确：通断/短路检查应使用万用表「通断测试」档（-1 分）', 'warn')
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
  meter.readout = actual ? '0.4 Ω ── 通路（蜂鸣）' : 'OL ── 不通'
  if (ok) {
    addScore('检查调试', 1)
    beep(880, .15)
    showMsg(`✔ ${test.desc}：实测${test.expect}　+1 分`, 'good')
  } else {
    mistakes.value++
    noteMistake()
    beep(150, .4, 'sawtooth')
    showMsg(`检测异常：${test.desc} 应${test.expect}，实测${actual ? '通路' : '不通'} —— 存在未排除故障，请检查接线`, 'bad')
  }
}

// ---- 回路状态判定 ----
function allW(ids) { return ids.every(id => findWire(RMAP[id])) }
const LOOP = {
  src: ['c1'],
  chain: ['c2', 'c3', 'c9', 'c10', 'c11', 'c12'],
  selflock: ['c4', 'c5', 'c6'],
  jog: ['c7', 'c8'],
  ph1: ['m1', 'm4', 'm7', 'm10'],
  ph2: ['m2', 'm5', 'm8', 'm11'],
  ph3: ['m3', 'm6', 'm9', 'm12'],
  pe: ['m13', 'm14'],
}
const coilOK = computed(() => allW(LOOP.src) && allW(LOOP.chain))
const selflockOK = computed(() => coilOK.value && allW(LOOP.selflock))
const jogOK = computed(() => coilOK.value && allW(LOOP.jog))
const phCount = computed(() => [LOOP.ph1, LOOP.ph2, LOOP.ph3].filter(allW).length)
const mainOK = computed(() => phCount.value === 3)

// 未排除故障（阻断调试的原因）
const blockers = computed(() => {
  const list = []
  if (wrongN.value) list.push(`存在 ${wrongN.value} 条错误接线（橙色虚线），必须先拆除`)
  const un = SLOTS.filter(s => !placed[s.id])
  if (un.length) list.push(`元器件未安装到位：${un.map(s => s.name).join('、')}`)
  const badT = meter.tests.filter(t => t.done && !t.ok)
  if (badT.length) list.push(`通断检测异常：${badT.map(t => t.desc).join('、')}`)
  return list
})
const debugLocked = computed(() => DebugController.count >= 2)
const dbgOn = computed(() => dbg.on)
const dbgOnDisabled = computed(() => lock.value || paused.value || power.value || dbg.on || debugLocked.value || phase.value !== 4)
const debugStatus = computed(() => {
  if (debugLocked.value) {
    return {
      kind: 'lock',
      text: `调试次数已达上限（${DebugController.count}/2），调试入口已锁定 —— 请查看故障记录并重新训练`,
    }
  }
  if (dbg.on) return { kind: 'ok', text: `已通电（第 ${DebugController.count}/2 次）：请操作 SB1/SB2/SB0 完成测试` }
  if (!checksDone.value) return { kind: 'wait', text: `通电前检查未完成（${checkDone.value}/7），禁止通电` }
  if (blockers.value.length) return { kind: 'bad', text: '发现接线故障：' + blockers.value[0] }
  return { kind: 'ok', text: '检查合格，确认无未排除故障，允许申请通电调试' }
})

// ---- 通电调试流程 ----
const dbg = reactive({
  on: false, km: false, running: false,
  tried1: false, tried2: false, tried3: false,
  lock: false, jog: false, ran: false,
})
let sbSeq = 0
const motorText = computed(() => dbg.running ? (phCount.value === 3 ? '运转 1440 r/min' : '缺相嗡响') : '停止')

function applyDebug() {
  if (paused.value || lock.value || dbg.on) return
  if (phase.value !== 4 || power.value) return
  if (debugLocked.value) { showMsg(debugStatus.value.text, 'bad'); return }
  if (!checksDone.value) {
    majorViolation('调试时绕过安全检查：通电前检查未完成即申请通电', '检查调试', 4)
    return
  }
  if (blockers.value.length) {
    beep(150, .3, 'sawtooth')
    if (wrongN.value) majorViolation('主回路/控制回路存在错误接线，通电有短路风险，禁止调试', '检查调试', 3)
    else showMsg('系统禁止启动调试：' + blockers.value[0], 'bad')
    return
  }
  if (!allW(LOOP.pe)) {
    majorViolation('PE 未连接：保护接地缺失，禁止通电调试', '主回路', 4)
    return
  }
  if (!DebugController.start()) return
  power.value = true
  dbg.on = true
  dbg.km = false; dbg.running = false
  dbg.tried1 = dbg.tried2 = dbg.tried3 = false
  dbg.lock = false; dbg.jog = false; dbg.ran = false
  beep(880, .2)
  showMsg(`⚡ 已通电（第 ${DebugController.count}/2 次调试）：请依次操作 SB1 启动、SB2 点动、SB0 停止`, 'good')
}

function pressSB1() {
  if (!dbg.on) return
  dbg.tried1 = true
  sbSeq++
  if (!coilOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg('✘ 接触器不吸合：控制回路接线错误', 'bad')
    return
  }
  dbg.km = true
  if (!mainOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg(phCount.value
      ? `接触器已吸合，但电动机缺相（U/V/W 仅接通 ${phCount.value}/3 相）`
      : '接触器已吸合，但电动机不转：主回路未接通', 'bad')
  } else {
    dbg.running = true
    dbg.ran = true
    beep(760, .1)
    showMsg('✔ 接触器吸合，电动机启动运转', 'good')
  }
  const wasRunning = dbg.running
  if (selflockOK.value) {
    dbg.lock = true
    showMsg(wasRunning
      ? '✔ 自锁成功：松开启动按钮，电动机连续运行'
      : '✔ 自锁回路导通（但电动机未转，请检查主回路）', wasRunning ? 'good' : 'warn')
  } else if (wasRunning) {
    dbg.running = false
    dbg.km = false
    beep(150, .35, 'sawtooth')
    showMsg('✘ 连续运行失败：松开启动按钮接触器释放 —— 自锁触点接线错误', 'bad')
  }
}

function pressSB2() {
  if (!dbg.on) return
  dbg.tried2 = true
  sbSeq++
  const my = sbSeq
  if (!coilOK.value || !jogOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg('✘ 点动失效：点动按钮线路错误', 'bad')
    return
  }
  if (!mainOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg(phCount.value ? '点动无效：电动机缺相' : '点动无效：主回路未接通', 'bad')
    return
  }
  dbg.km = true
  dbg.running = true
  dbg.jog = true
  beep(760, .1)
  showMsg('✔ 点动：按下运转，松开即停', 'good')
  later(() => {
    if (my !== sbSeq) return
    dbg.km = false
    dbg.running = false
    showMsg('点动结束：松开按钮电动机停止（无自锁）', 'info')
  }, 1100)
}

function pressSB0() {
  if (!dbg.on) return
  dbg.tried3 = true
  sbSeq++
  dbg.km = false
  dbg.running = false
  beep(520, .1)
  showMsg('✔ 停止：按下 SB0，接触器释放，电动机停止', 'good')
}

function judgeDebug() {
  if (!dbg.on || paused.value || lock.value) return
  if (!(dbg.tried1 && dbg.tried2 && dbg.tried3)) return
  const n = DebugController.count
  let detail = ''
  if (!dbg.ran) {
    if (!coilOK.value) detail = '控制回路错误，电机不转'
    else if (!phCount.value) detail = '主回路未接通，电机不转'
    else detail = `U/V/W 连接错误，电机缺相（${phCount.value}/3 相）`
  } else if (!dbg.lock) detail = '自锁触点错误，连续运行失败'
  else if (!dbg.jog) detail = '按钮线路错误，点动失效'

  if (!detail) {
    DebugController.record('pass', `第${n}次调试通过：连续运行、自锁与点动功能正常`)
    addScore('检查调试', n === 1 ? 3 : 1)
    beep(880, .25)
    showMsg(`✔ 模拟调试通过（第 ${n}/2 次）：电动机连续运转、自锁保持、点动有效　+${n === 1 ? 3 : 1} 分`, 'good')
    completePhase()
    return
  }
  DebugController.record('fail', `第${n}次调试失败：${detail}`)
  mistakes.value++
  noteMistake()
  beep(120, .45, 'sawtooth')
  showMsg(`模拟调试失败（第 ${n}/2 次）：${detail}`, 'bad')
  power.value = false
  dbg.on = false
  resetChecks('故障已记录，请排除故障后重新进行通电前检查')
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
      dbg.on = false
      demo.step = 1
      addScore('拆除整理', s.pts)
      beep(700, .06)
      showMsg('✔ 断电确认完成，实训台电源已断开　+1 分', 'good')
    } else showMsg('已确认断电', 'info')
    return
  }
  if (power.value) {
    majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除整理', 2)
    return
  }
  if (demo.step !== i) {
    showMsg(`请按顺序操作：下一步「${DEMO_STEPS[demo.step].label}」`, 'warn')
    return
  }
  if (i === 1) {
    wires.value = wires.value.filter(w => w.type !== 'CTL')
    probeA.value = ''
    demo.step = 2
    addScore('拆除整理', s.pts)
    beep(700, .06)
    showMsg('✔ 控制线拆除完成并按线色分类盘绕，未拉扯导线　+1 分', 'good')
    return
  }
  if (i === 2) {
    wires.value = []
    probeA.value = ''
    demo.step = 3
    addScore('拆除整理', s.pts)
    beep(700, .06)
    showMsg('✔ 主回路导线拆除完成（U/V/W/PE 分色整理）　+1 分', 'good')
    return
  }
  if (i === 3) {
    placed.qf = false; placed.km = false; placed.fr = false
    placed.xt = false; placed.motor = false
    chipVer.value++
    demo.step = 4
    addScore('拆除整理', s.pts)
    beep(700, .06)
    showMsg('✔ 元器件拆除并分类存放，端子完好无损　+1 分', 'good')
    completePhase()
  }
}

// ================= 任务7：整理场地 =================
const tidyItems = reactive([
  { k: '工具归位', done: false }, { k: '仪表归位', done: false }, { k: '元件分类', done: false },
  { k: '导线整理', done: false }, { k: '工作台清洁', done: false },
])
const tidyDone = computed(() => tidyItems.filter(i => i.done).length)
function checkTidy(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('拆除整理', 0.2)
  beep(700, .06)
}
function finishLevel() {
  if (lock.value) return
  showMsg('✔ 现场整理完成，考核结束', 'good')
  completePhase()
}

// ================= 游戏流程 =================
function resetState() {
  power.value = false
  tools.sel = []; tools.penalty = 0
  parts.sel = []; parts.penalty = 0
  wsel.L1 = ''; wsel.L2 = ''; wsel.L3 = ''; wsel.PE = ''; wsel.CTL = ''
  chipVer.value++
  placed.qf = placed.km = placed.fr = placed.xt = placed.motor = false
  wires.value = []
  wireType.value = 'L1'
  pendId.value = ''
  selWireId.value = ''
  spliceOp.value = SPLICE_OPS[0]
  splice.mistakes = 0
  splice.pts.forEach(p => { p.step = 0 })
  resetChecks('')
  demo.step = 0
  tidyItems.forEach(i => { i.done = false })
  dbg.on = false
  dbg.km = false; dbg.running = false
  dbg.tried1 = dbg.tried2 = dbg.tried3 = false
  dbg.lock = false; dbg.jog = false; dbg.ran = false
  scoreWiring()
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
function hitSplice(x, y) {
  for (const p of splice.pts) if (Math.hypot(x - p.x, y - p.y) < 22) return p
  return null
}
function wirePoints(w) {
  const a = TMAP[w.a], b = TMAP[w.b]
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const off = Math.min(36, len * .14)
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
    const pt = hitSplice(p.x, p.y)
    if (pt) spliceClick(pt)
    return
  }

  if (phase.value === 2 || phase.value === 4) {
    // 端子优先判定：已接好的导线端点正好落在端子上，若先判导线会导致
    // 同一端子的后续接线（如 QF1 出线取电、按钮链）无法点击
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
    // 拆除任务：点控制线拆控制线、点主回路拆主回路，安全校验与面板按钮一致
    const w = hitWire(p.x, p.y)
    if (w) demoStep(w.type === 'CTL' ? 1 : 2)
  }
}

// ================= 画布绘制 =================
// line 已从公共库导入为 canvasLine，此处直接使用
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
function termColor(t) { return WT[t.a[0]].color }
function wireColor(t) { return WT[t].color }

function drawShelf(c) {
  rect(c, 16, 50, 215, 140, '#b08968', '#7d5a3c')
  canvasLine(c, 16, 122, 231, 122)
  txt(c, '器材摆放架', 123, 44, '#37474f', 'bold 13px sans-serif')
  // 螺丝刀
  rect(c, 34, 68, 10, 34, '#e53935'); rect(c, 37, 102, 4, 16, '#90a4ae')
  // 剥线钳 / 压线钳
  c.strokeStyle = '#546e7a'; c.lineWidth = 4
  canvasLine(c, 70, 70, 84, 104); canvasLine(c, 88, 70, 74, 104)
  // 尖嘴钳
  rect(c, 104, 74, 40, 12, '#37474f'); rect(c, 138, 86, 6, 26, '#546e7a')
  // 扳手
  rect(c, 158, 88, 42, 8, '#8d6e63'); rect(c, 196, 86, 10, 12, '#6d4c41')
  txt(c, '工具', 123, 116, '#4e342e', '10px sans-serif')
  // 万用表
  rect(c, 34, 132, 58, 46, '#263238', '#111')
  rect(c, 41, 139, 44, 12, '#8bc34a')
  circle(c, 63, 163, 9, '#b0bec5', '#37474f')
  txt(c, '万用表', 63, 150, '#1b2630', '9px sans-serif')
  // 验电笔
  rect(c, 98, 132, 14, 46, '#ffca28', '#f57f17')
  txt(c, '验电笔', 105, 190, '#5d4037', '9px sans-serif')
  // 钳形电流表
  rect(c, 122, 132, 48, 46, '#263238', '#111')
  circle(c, 146, 145, 10, null, '#8bc34a', 4)
  txt(c, '钳形表', 146, 170, '#90a4ae', '9px sans-serif')
  // 兆欧表
  rect(c, 178, 132, 46, 46, '#263238', '#111')
  rect(c, 184, 139, 34, 12, '#4fc3f7')
  txt(c, '兆欧表', 201, 168, '#90a4ae', '9px sans-serif')
}

function drawPartsArea(c) {
  rect(c, 16, 210, 215, 210, '#a8825f', '#7d5a3c')
  txt(c, phase.value === 3 ? '一字型绞合工位' : phase.value === 4 ? '检测工作台' : '元器件区',
    123, 204, '#37474f', 'bold 13px sans-serif')
  if (phase.value === 3) { drawSpliceStation(c); return }
  if (phase.value === 4) { drawBenchMeter(c); return }
  const boxes = [
    ['断路器 QF', 28, 224, '断路器'], ['交流接触器 KM', 132, 224, '交流接触器'],
    ['热继电器 FR', 28, 288, '热继电器'], ['端子排 XT', 132, 288, '接线端子排'],
    ['三相电动机 M', 28, 352, '三相异步电动机'], ['按钮组 SB（预装）', 132, 352],
  ]
  for (const [name, x, y, img] of boxes) {
    rect(c, x, y, 86, 52, '#d7ccc8', '#5d4037')
    if (img && drawImgFit(c, img, x + 3, y + 2, 80, 33, { card: true, r: 3 })) {
      txt(c, name, x + 43, y + 48, '#4e342e', 'bold 9px sans-serif')
    } else {
      txt(c, name, x + 43, y + 30, '#4e342e', 'bold 10px sans-serif')
    }
  }
}

function drawSpliceStation(c) {
  rect(c, 30, 236, 188, 146, '#cbb689', '#8d6e63')
  txt(c, '断电作业 · 一字型（平接）绞合', 124, 396, '#4e342e', 'bold 11px sans-serif')
  const blink = .55 + .35 * Math.sin(Date.now() / 240)
  for (const p of splice.pts) {
    const col = wireColor(p.type)
    // 左右导线
    c.lineCap = 'round'
    c.strokeStyle = col; c.lineWidth = 7
    canvasLine(c, p.x - 58, p.y, p.x - 16, p.y)
    canvasLine(c, p.x + 16, p.y, p.x + 58, p.y)
    // 剥除绝缘层：露出铜芯
    if (p.step >= 1) {
      c.strokeStyle = '#cd7f32'; c.lineWidth = 4
      canvasLine(c, p.x - 18, p.y, p.x - 4, p.y)
      canvasLine(c, p.x + 4, p.y, p.x + 18, p.y)
    }
    // 导线交叉
    if (p.step >= 2) {
      c.strokeStyle = '#cd7f32'; c.lineWidth = 4
      canvasLine(c, p.x - 10, p.y - 8, p.x + 10, p.y + 8)
      canvasLine(c, p.x - 10, p.y + 8, p.x + 10, p.y - 8)
    }
    // 一字型绞合
    if (p.step >= 3) {
      c.strokeStyle = '#b87333'; c.lineWidth = 3
      for (let i = -2; i <= 2; i++) {
        c.beginPath(); c.arc(p.x + i * 6, p.y, 6, -1.1, 1.1); c.stroke()
      }
    }
    // 整理接头（绝缘胶带）
    if (p.step >= 4) {
      rect(c, p.x - 22, p.y - 9, 44, 18, '#212121', '#000')
      txt(c, '√', p.x + 30, p.y - 12, '#2e7d32', 'bold 14px sans-serif')
    }
    if (phase.value === 3) {
      if (p.step < 4) {
        c.save()
        c.setLineDash([5, 4])
        c.strokeStyle = `rgba(26,63,196,${blink})`
        c.lineWidth = 2.5
        c.beginPath(); c.arc(p.x, p.y, 24, 0, Math.PI * 2); c.stroke()
        c.restore()
        txt(c, '▼ 点击操作', p.x, p.y + 40, '#1a3fc4', 'bold 11px sans-serif')
      }
      txt(c, `${p.n}　${SPLICE_OPS[Math.min(p.step, 3)]}`, p.x, p.y - 32,
        p.step >= 4 ? '#2e7d32' : '#1a3fc4', 'bold 11px sans-serif')
    }
  }
}

function drawBenchMeter(c) {
  const on = meter.mode === '通断测试'
  rect(c, 30, 232, 188, 130, '#263238', '#111')
  rect(c, 42, 244, 164, 34, on ? '#8bc34a' : '#37474f')
  txt(c, on ? (meter.readout || 'OL') : '未选择档位', 124, 266,
    on ? '#1b2630' : '#90a4ae', 'bold 12px Consolas, monospace')
  circle(c, 74, 316, 19, '#b0bec5', null)
  c.strokeStyle = '#37474f'; c.lineWidth = 4
  canvasLine(c, 74, 316, 74, 302)
  txt(c, on ? '通断' : '档位', 74, 346, on ? '#8bc34a' : '#90a4ae', '10px sans-serif')
  circle(c, 150, 308, 7, '#e53935', null)
  circle(c, 178, 308, 7, '#212121', null)
  txt(c, 'V/Ω', 150, 332, '#90a4ae', '10px sans-serif')
  txt(c, 'COM', 178, 332, '#90a4ae', '10px sans-serif')
  c.strokeStyle = on ? '#e53935' : '#546e7a'; c.lineWidth = 2.5
  canvasLine(c, 150, 301, 142, 232)
  c.strokeStyle = on ? '#212121' : '#546e7a'
  canvasLine(c, 178, 301, 192, 232)
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
  txt(c, '三相异步电动机控制线路实训台（带点动控制）', BX + BW / 2, BY - 8, '#37474f', 'bold 14px sans-serif')

  // 电源指示
  circle(c, 916, 82, 7, power.value ? '#e53935' : '#90a4ae', '#37474f', 2)
  if (power.value) {
    c.strokeStyle = `rgba(229,57,53,${.35 + .3 * Math.sin(t / 200)})`
    c.lineWidth = 2
    c.beginPath(); c.arc(916, 82, 13 + 3 * Math.sin(t / 200), 0, Math.PI * 2); c.stroke()
  }
  txt(c, power.value ? '送电' : '断电', 916, 106, power.value ? '#c62828' : '#78909c', 'bold 11px sans-serif')

  // 电源进线（三相 + PE）
  const posts = [['s1', 'L1'], ['s2', 'L2'], ['s3', 'L3'], ['spe', 'PE']]
  for (const [id, k] of posts) {
    const tt = TMAP[id]
    c.strokeStyle = WT[k].color; c.lineWidth = k === 'PE' ? 3.5 : 4
    canvasLine(c, tt.x, BY, tt.x, tt.y)
    txt(c, k, tt.x, 70, WT[k].color, 'bold 12px sans-serif')
  }
  txt(c, '三相电源 AC380V', 470, 72, '#546e7a', '11px sans-serif')

  if (phase.value === 2) drawSlotHints(c, t)
  if (placed.qf) drawQF(c)
  if (placed.km) drawKM(c)
  if (placed.fr) drawFR(c)
  if (placed.xt) drawXT(c)
  if (placed.motor) drawMotor(c, t)
  drawButtons(c, t)

  for (const w of wires.value) drawWire(c, w)
  drawTerminals(c, t)
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

function drawQF(c) {
  const s = SLOTS.find(x => x.id === 'qf')
  rect(c, s.x, s.y, s.w, s.h, '#fafafa')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'QF 断路器', s.x + s.w / 2, s.y + 18, '#37474f', 'bold 12px sans-serif')
  for (let i = 0; i < 3; i++) {
    const x = s.x + 25 + i * 20
    canvasLine(c, x, s.y + 26, x, s.y + 44)
    canvasLine(c, x, s.y + 52, x, s.y + 64)
    circle(c, x, s.y + 48, 3, '#90a4ae', null)
  }
  rect(c, s.x + 24, s.y + 66, 42, 10, '#66bb6a')
  txt(c, '3P · 32A', s.x + s.w / 2, s.y + 78, '#78909c', '9px sans-serif')
}

function drawKM(c) {
  const s = SLOTS.find(x => x.id === 'km')
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'KM 交流接触器', s.x + s.w / 2, s.y + 18, '#37474f', 'bold 12px sans-serif')
  // 线圈
  rect(c, s.x + 14, s.y + 32, 34, 44, '#cfd8dc', '#90a4ae')
  txt(c, 'A1', s.x + 31, s.y + 46, '#455a64', '9px sans-serif')
  txt(c, '线圈', s.x + 31, s.y + 66, '#455a64', '10px sans-serif')
  txt(c, 'A2', s.x + 31, s.y + 74, '#455a64', '9px sans-serif')
  // 主触点
  for (let i = 0; i < 3; i++) {
    const y = s.y + 34 + i * 20
    canvasLine(c, s.x + 58, y, s.x + 76, y)
    canvasLine(c, s.x + 84, y, s.x + 100, y)
    canvasLine(c, s.x + 76, y, s.x + 84, y - 8)
  }
  // 自锁辅助触点
  txt(c, '辅助 NO', s.x + s.w / 2, s.y + 96, '#546e7a', '10px sans-serif')
  const on = dbg.km
  circle(c, s.x + s.w - 16, s.y + 16, 6, on ? '#66bb6a' : '#b0bec5', '#37474f', 2)
  txt(c, on ? '吸合' : '释放', s.x + s.w - 16, s.y + 96, on ? '#2e7d32' : '#78909c', 'bold 10px sans-serif')
}

function drawFR(c) {
  const s = SLOTS.find(x => x.id === 'fr')
  rect(c, s.x, s.y, s.w, s.h, '#fff3e0')
  c.strokeStyle = '#ef6c00'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'FR 热继电器', s.x + s.w / 2, s.y + 18, '#e65100', 'bold 12px sans-serif')
  for (let i = 0; i < 3; i++) {
    const x = s.x + 24 + i * 24
    canvasLine(c, x, s.y + 28, x, s.y + 44)
    c.strokeStyle = '#ef6c00'
    c.beginPath(); c.arc(x, s.y + 52, 7, 0.6, 2.5); c.stroke()
    canvasLine(c, x, s.y + 60, x, s.y + 74)
    c.strokeStyle = '#ef6c00'
  }
  txt(c, '整定 8.8A', s.x + s.w / 2, s.y + 88, '#bf360c', '10px sans-serif')
  txt(c, '常闭 95-96', s.x + s.w / 2, s.y + 102, '#8d6e63', '10px sans-serif')
}

function drawXT(c) {
  const s = SLOTS.find(x => x.id === 'xt')
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#78909c'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  rect(c, 285, 276, 95, 40, '#f7f9e6', '#c0ca33')
  rect(c, 395, 276, 235, 40, '#f5f5f5', '#37474f')
  txt(c, 'PE 接地', 332, 292, '#827717', 'bold 11px sans-serif')
  txt(c, '按钮控制线转接', 512, 292, '#37474f', 'bold 11px sans-serif')
  txt(c, 'XT 端子排', s.x + s.w / 2, s.y - 6, '#37474f', 'bold 12px sans-serif')
}

function drawMotor(c, t) {
  const cx = 830, cy = 150
  circle(c, cx, cy, 52, '#f5f5f5', '#37474f', 3)
  txt(c, 'M', cx - 6, cy + 2, '#37474f', 'bold 34px sans-serif')
  txt(c, '3~', cx + 22, cy + 2, '#37474f', 'bold 16px sans-serif')
  txt(c, '三相异步电动机', cx, cy + 26, '#546e7a', '10px sans-serif')
  const run = dbg.running
  if (run) {
    c.save()
    c.translate(cx, cy + 4)
    c.rotate((Date.now() / 90) % (Math.PI * 2))
    c.strokeStyle = '#90a4ae'; c.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2
      canvasLine(c, 0, 0, Math.cos(a) * 26, Math.sin(a) * 26)
    }
    c.restore()
    txt(c, phCount.value === 3 ? '运转 1440 r/min' : '缺相嗡响', cx, cy + 44,
      phCount.value === 3 ? '#2e7d32' : '#c62828', 'bold 11px sans-serif')
  } else {
    txt(c, '停止', cx, cy + 44, '#90a4ae', '11px sans-serif')
  }
  txt(c, '380V · 1.5kW · 8.8A', cx, 240, '#78909c', '10px sans-serif')
  // 接线盒端子标识
  txt(c, 'U', 800, 232, '#f9a825', 'bold 10px sans-serif')
  txt(c, 'V', 835, 232, '#43a047', 'bold 10px sans-serif')
  txt(c, 'W', 870, 232, '#e53935', 'bold 10px sans-serif')
  txt(c, 'PE', 886, 168, '#827717', 'bold 10px sans-serif')
}

function drawButtons(c, t) {
  rect(c, 270, 340, 380, 65, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(270, 340, 380, 65)
  txt(c, '按钮组 SB', 280, 398, '#90a4ae', '10px sans-serif', 'left')
  const hi = dbg.on ? .5 + .5 * Math.sin(t / 200) : 0
  // SB0 停止（常闭 · 红）
  circle(c, 317, 368, 15, '#ef5350', '#b71c1c', 2)
  txt(c, 'SB0', 317, 372, '#fff', 'bold 11px sans-serif')
  txt(c, '停止·常闭', 317, 396, '#c62828', '10px sans-serif')
  // SB1 启动（常开 · 绿）
  circle(c, 432, 368, 15, '#66bb6a', '#2e7d32', 2)
  txt(c, 'SB1', 432, 372, '#fff', 'bold 11px sans-serif')
  txt(c, '启动·常开', 432, 396, '#2e7d32', '10px sans-serif')
  // SB2 点动（复合：常开 + 常闭）
  rect(c, 505, 352, 140, 30, '#eceff1', '#546e7a')
  circle(c, 530, 367, 13, '#455a64', '#263238', 2)
  txt(c, 'SB2', 530, 371, '#fff', 'bold 10px sans-serif')
  canvasLine(c, 560, 372, 576, 372); canvasLine(c, 578, 372, 594, 372); canvasLine(c, 576, 372, 584, 364)
  txt(c, 'NO', 578, 360, '#37474f', '9px sans-serif')
  canvasLine(c, 604, 372, 620, 372); canvasLine(c, 622, 372, 638, 372)
  canvasLine(c, 612, 366, 620, 378)
  txt(c, 'NC', 628, 360, '#37474f', '9px sans-serif')
  txt(c, '点动·复合按钮', 575, 396, '#37474f', '10px sans-serif')
  if (dbg.on) {
    c.strokeStyle = `rgba(46,125,50,${hi})`
    c.lineWidth = 3
    c.strokeRect(272, 342, 376, 61)
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
      c.beginPath(); c.arc(tt.x, tt.y, 14 * pulse, 0, Math.PI * 2); c.stroke()
      txt(c, pendId.value === tt.id ? '起点' : '探针A', tt.x, tt.y - 19, '#c62828', 'bold 10px sans-serif')
    } else if ((phase.value === 2 || phase.value === 4) && pendId.value) {
      const a = TMAP[pendId.value]
      if (a.id !== tt.id && a.a.some(x => tt.a.includes(x))) {
        c.strokeStyle = 'rgba(46,125,50,.7)'; c.lineWidth = 2
        c.beginPath(); c.arc(tt.x, tt.y, 12 * pulse, 0, Math.PI * 2); c.stroke()
      }
    }
  }
  if (pendId.value) {
    const tt = TMAP[pendId.value]
    const bw = Math.max(130, tt.n.length * 13 + 16)
    const lx = Math.min(W - bw / 2 - 6, Math.max(bw / 2 + 6, tt.x))
    rect(c, lx - bw / 2, tt.y - 46, bw, 22, 'rgba(20,32,44,.9)')
    txt(c, tt.n, lx, tt.y - 31, '#fff', 'bold 12px sans-serif')
  }
}

function drawScene(t) {
  const c = ctx.value
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#dfe7ee'); g.addColorStop(1, '#b9c6d2')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = '#cbb689'; c.fillRect(0, 470, W, H - 470)
  c.fillStyle = '#ab976f'; c.fillRect(0, 470, W, 8)
  txt(c, '三相电动机控制线路安装接线实训区', W / 2, 30, 'rgba(30,45,60,.75)', 'bold 18px sans-serif')
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
  clearTimers()
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
.sheet.sheet-xl { max-height: 360px; }
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
.status.done-pt { background: #e8f5e9; color: #2e7d32; font-weight: 700; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.status i.off { color: #c62828; }
.status b { color: #122d94; }
.status b.bad-t { color: #c62828; }
.row { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
.row.tight { gap: 6px; margin: 4px 0; }
.row.center { justify-content: center; }
.hint { font-size: 12px; color: #78909c; }
.cname { font-size: 13px; font-weight: 600; color: #37474f; }
.cname-w { min-width: 132px; }

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
.tw-L1 { border-color: #f9a825; }
.tw-L1.sel { background: #fff8e1; }
.tw-L2 { border-color: #43a047; }
.tw-L2.sel { background: #e8f5e9; }
.tw-L3 { border-color: #e53935; }
.tw-L3.sel { background: #fdecea; }
.tw-PE { border-color: #c0ca33; }
.tw-PE.sel { background: #f7f9e6; }
.tw-CTL { border-color: #37474f; }
.tw-CTL.sel { background: #eceff1; }
.btn.splice-btn.sel { background: #ff8f00; border-color: #ff8f00; color: #fff; font-weight: 700; }
.btn.sb-btn { font-weight: 700; }
.btn.sb1 { border-color: #2e7d32; color: #2e7d32; }
.btn.sb1:hover:not(:disabled) { background: #e8f5e9; }
.btn.sb2 { border-color: #455a64; color: #37474f; }
.btn.sb2:hover:not(:disabled) { background: #eceff1; }
.btn.sb0 { border-color: #c62828; color: #c62828; }
.btn.sb0:hover:not(:disabled) { background: #fdecea; }

/* ---------- 选项 ---------- */
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
.sw-pe { box-shadow: inset 4px 0 0 #c0ca33; }
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
  font-size: 12px;
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
.fault-log { font-size: 12px; color: #8d2b0b; max-height: 96px; overflow-y: auto; }
.fault-log b { color: #b71c1c; }
.fault-log p { margin: 3px 0; }
.fault-log .btn { margin-top: 4px; font-size: 12px; padding: 4px 10px; }

/* ---------- 通电模拟操作 ---------- */
.dbg-run {
  border: 2px solid #2e7d32;
  background: #e8f5e9;
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 6px;
}
.run-state {
  font-size: 13px;
  color: #37474f;
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
}
.run-state b { color: #90a4ae; }
.run-state b.on-c { color: #2e7d32; }

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
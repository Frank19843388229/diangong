<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K31-05 · 三相异步电动机正反转运行电路接线</span>
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
          <b>任务 {{ phase + 1 }}/6 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⚠ 检测到严重电气安全风险 —— 任务暂停，请重新执行安全检查</div>

        <!-- 任务2 元器件拖拽托盘 -->
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
          <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 1, 'sheet-xl': phase === 3, folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

            <div v-show="sheetOpen" class="fold-area">
              <!-- 任务1：选择工具和仪器仪表 -->
              <div v-if="phase === 0" class="sheet-body">
                <h3>任务 1：选择工具和仪器仪表（10分）</h3>
                <p class="tip">从器材摆放架中选择本关<b>安装、接线与检测</b>所需的工具与仪表（含题目指定的验电与测量器具）。无关器材不得计入，<b>明显不合格的工具属重大违规</b>。</p>
                <div class="grid2">
                  <div class="grp">
                    <div class="glabel">电工工具</div>
                    <label v-for="o in toolList" :key="o.n" class="chk" :class="{ sel: tools.sel.includes(o.n), bad: o.bad }">
                      <input type="checkbox" :value="o.n" v-model="tools.sel" @change="onToolToggle(o)">
                      <img v-if="imgUrl(o.n)" class="thumb" :src="imgUrl(o.n)" alt="">{{ o.n }}
                    </label>
                  </div>
                  <div class="grp">
                    <div class="glabel">仪器仪表与验电</div>
                    <label v-for="o in meterList" :key="o.n" class="chk" :class="{ sel: tools.sel.includes(o.n) }">
                      <input type="checkbox" :value="o.n" v-model="tools.sel">
                      <img v-if="imgUrl(o.n)" class="thumb" :src="imgUrl(o.n)" alt="">{{ o.n }}
                    </label>
                  </div>
                </div>
                <div class="row">
                  <button class="btn primary" @click="confirmTools">确认选择</button>
                  <span class="hint">提示：剥线压接、紧固接线、验电与通断检测各需要对应器具</span>
                </div>
              </div>

              <!-- 任务2：选择元器件和导线 -->
              <div v-if="phase === 1" class="sheet-body">
                <h3>任务 2：选择元器件和导线（15分）</h3>
                <p class="tip">对照正反转电路图（{{ Q.protector.name }} → {{ Q.forward.km }}/{{ Q.reverse.km }} 并联 → 热继电器 → 电动机），勾选 <b>{{ REQ_COMPS.length }} 件元器件</b>并确定各回路<b>导线线色</b>。正反转主回路须<b>调换 L1/L3 两相</b>实现换向。</p>
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
                    <p class="probe-tip">规范：L1 黄 · L2 绿 · L3 红 · PE 黄绿双色 · 控制线黑，不得混用。换相后的出线仍按<b>所接相色</b>标识。</p>
                  </div>
                </div>
                <div class="row">
                  <button class="btn primary" @click="confirmParts">确认选择</button>
                  <span class="hint">选错会累计扣分，可重新选择</span>
                </div>
              </div>
              <!-- 任务3：安装元器件并完成接线 -->
              <div v-if="phase === 2" class="sheet-body">
                <h3>任务 3：安装元器件并完成接线（35分 = 安装6 + 主回路14 + 控制回路15）</h3>
                <p class="tip">先将左侧 <b>{{ compChips.length }} 类元器件</b>拖到操作台对应安装位；再选择<b>导线线种</b>，依次点击<b>两个接线端子</b>完成接线。<b>{{ Q.forward.km }}、{{ Q.reverse.km }} 主触点并联</b>，反转出线须<b>调换 L1/L3 两相</b>；按钮控制线必须<b>经端子排 XT 转接</b>，线圈支路须串入<b>对方接触器常闭触点实现电气互锁</b>。</p>
                <div class="row">
                  <span class="cname">手持导线：</span>
                  <button v-for="(v, k) in WT" :key="k" class="btn wire-btn sm" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">
                    {{ v.cn }}（{{ v.name }}色）
                  </button>
                  <button class="btn" :disabled="!selWireId" @click="deleteSelWire">拆除选中导线</button>
                  <button class="btn primary" @click="submitWiring">提交接线检查</button>
                </div>
                <p class="status">元件 <b>{{ placedCount }}/{{ compChips.length }}</b>
                  　主回路 <b>{{ rightN('main') }}/{{ cntWires('main') }}</b>
                  　控制回路 <b>{{ rightN('ctl') }}/{{ cntWires('ctl') }}</b>
                  　错误导线 <b class="bad-t">{{ wrongN }}</b>
                  　得分 {{ cats['元件安装'].got + cats['主回路'].got + cats['控制回路'].got }}/35
                  <template v-if="pendId">　已选端子：<b>{{ TMAP[pendId].n }}</b></template>
                </p>
              </div>

              <!-- 任务4：检查与虚拟调试 -->
              <div v-if="phase === 3" class="sheet-body">
                <h3>任务 4：检查与虚拟调试（25分 = 检查9 + 万用表4 + 调试12）</h3>
                <p class="tip">先完成<b>通电前检查</b>与<b>万用表通断检测</b>（含互锁支路验证）。全部合格后申请通电，按 <b>正转 → 停止 → 互锁验证 → 反转 → 停止</b> 顺序测试，<b>调试最多 2 次</b>，次数用尽锁定调试入口。</p>
                <div class="grid3">
                  <div class="grp">
                    <div class="glabel">通电前检查（{{ lookDone }}/{{ look.items.length }}）</div>
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
                    <div class="glabel">万用表检测（{{ meterDone }}/{{ meter.tests.length }}）</div>
                    <div class="row tight">
                      <button v-for="m in MODES" :key="m" class="opt" :class="{ sel: meter.mode === m }" @click="chooseMode(m)">{{ m }}</button>
                    </div>
                    <div class="mtr" :class="{ on: meter.mode === '通断测试' }">
                      <span class="mtr-mode">{{ meter.mode || '未选择档位' }}</span>
                      <span class="mtr-read">{{ meter.readout || '----' }}</span>
                    </div>
                    <p class="probe-tip">点击两个接线端子测量（探针：<b>{{ probeA ? TMAP[probeA].n : '未选择' }}</b>）</p>
                    <ul class="test-list">
                      <li v-for="t in meter.tests" :key="t.id" :class="{ done: t.done && t.ok, fault: t.done && !t.ok }">
                        {{ t.done ? (t.ok ? '√' : '✗') : '○' }} {{ t.desc }}（应{{ t.expect }}）{{ t.done && !t.ok ? '　← 实测异常' : '' }}
                      </li>
                    </ul>
                  </div>

                  <div class="grp">
                    <div class="glabel">调试控制台（{{ checkDone }}/13）</div>
                    <div class="console" :class="debugStatus.kind">
                      <div class="console-head">
                        <b>⚡ 虚拟调试</b>
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
                    <ul class="test-list fault-lib">
                      <li>故障模拟：正/反转回路异常 · 自锁错误 · 互锁失效 · U/V/W 错接 · PE 不合格 · 保护元件配置错误</li>
                    </ul>
                  </div>
                </div>

                <!-- 通电后的虚拟操作 -->
                <div v-if="dbg.on" class="dbg-run">
                  <div class="run-state">
                    电源：<b class="on-c">送电</b>
                  　KM1（正转）：<b :class="dbg.km1 ? 'on-c' : ''">{{ dbg.km1 ? '吸合' : '释放' }}</b>
                  　KM2（反转）：<b :class="dbg.km2 ? 'on-c' : ''">{{ dbg.km2 ? '吸合' : '释放' }}</b>
                  　电动机：<b :class="dbg.dir !== 'stop' ? 'on-c' : ''">{{ motorText }}</b>
                  　自锁：<b :class="dbg.lock ? 'on-c' : ''">{{ dbg.lock ? '已保持' : '未形成' }}</b>
                  　互锁：<b class="on-c">{{ interlockOK ? '有效' : '无效' }}</b>
                  </div>
                  <div class="row">
                    <button class="btn sb-btn sb1" @click="pressSB1">SB1 正转启动</button>
                    <button class="btn sb-btn sb0" @click="pressSB0">SB0 停止</button>
                    <button class="btn sb-btn sb2" @click="pressSB2">SB2 反转启动</button>
                    <button class="btn primary" :disabled="!(dbg.ranF && dbg.ranR && dbg.triedStop && dbg.triedLock)" @click="judgeDebug">结束本次调试并判定</button>
                  </div>
                  <p class="probe-tip">
                    测试进度：正转 {{ dbg.ranF ? '√' : '○' }}　停止 {{ dbg.triedStop ? '√' : '○' }}　互锁验证 {{ dbg.triedLock ? '√' : '○' }}　反转 {{ dbg.ranR ? '√' : '○' }}
                    <span class="hint">（正转→停止→互锁验证→反转 全部完成后方可判定）</span>
                  </p>
                  <p class="interlock-note">⚡ 教学规则：正反转接触器不得同时吸合；运行中按下另一方向按钮应被<b>电气互锁拦截</b>，换向必须先按停止按钮。</p>
                </div>
              </div>
              <!-- 任务5：拆除电路 -->
              <div v-if="phase === 4" class="sheet-body">
                <h3>任务 5：拆除电路（10分）</h3>
                <p class="tip">在仿真断电并确认安全后，严格按顺序操作：<b>断电确认 → 拆除控制线 → 拆除主回路 → 拆除元器件并分类回收 → 检查元件、端子与导线</b>。<b>禁止带电拆线、拉扯导线、损坏端子</b>。断电确认后可直接<b>点击画布上的导线</b>（控制线/主回路）动手拆除。</p>
                <div class="steps">
                  <button
                    v-for="(s, i) in DEMO_STEPS" :key="s.k" class="step"
                    :class="{ done: demo.step > i, next: demo.step === i }"
                    @click="demoStep(i)"
                  >{{ demo.step > i ? '√' : i + 1 }}. {{ s.label }}（{{ s.pts }}分）</button>
                </div>
                <p class="status">实训台电源：<i :class="{ off: power }">{{ power ? '带电（红色指示灯亮）' : '已断电' }}</i>　进度 {{ demo.step }}/{{ DEMO_STEPS.length }}　得分 {{ cats['拆除电路'].got }}/10</p>
              </div>

              <!-- 任务6：整理场地 -->
              <div v-if="phase === 5" class="sheet-body">
                <h3>任务 6：整理场地（5分）</h3>
                <p class="tip">完成工具归位、仪表归位、元件分类、导线整理与操作台清理（5S），逐项确认后提交考核。</p>
                <div class="grid3">
                  <label v-for="it in tidyItems" :key="it.k" class="chk" :class="{ sel: it.done }" @click.prevent="checkTidy(it)">
                    {{ it.done ? '√' : '□' }} {{ it.k }}
                  </label>
                </div>
                <div class="row">
                  <button class="btn primary" :disabled="tidyDone < tidyItems.length" @click="finishLevel">完成整理，提交考核</button>
                  <span class="hint">已完成 {{ tidyDone }}/{{ tidyItems.length }}</span>
                </div>
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
            <p class="sub">低压电工考证 · 电动机正反转控制综合实训 · 6项任务 · 满分100分 · 难度 ★★★★★</p>
            <div class="objs">
              <p>训练目标：依据电路图完成三相异步电动机<b>正转、反转运行电路</b>的虚拟安装与调试，掌握<b>主回路换相（L1/L3 对调）</b>、<b>接触器自锁与电气互锁</b>逻辑，以及按钮控制线经<b>端子排转接</b>的工艺要求。</p>
              <ul>
                <li>选择工具和仪器仪表（10）</li>
                <li>选择元器件和导线（15）</li>
                <li>安装元器件并完成接线（35）</li>
                <li>检查与虚拟调试（25）</li>
                <li>拆除电路（10）</li>
                <li>整理场地（5）</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 本关特殊规则：虚拟调试最多 2 次，次数用尽锁定调试入口；<b>未确认断电接线、PE 未连接、主回路短路、三相线路错接、互锁失效、绕过安全检查调试</b>均判定为重大违规。</p>
            <p class="ct-note">⚡ 互锁安全规则：正反转两个方向的接触器<b>不得同时吸合</b>（会造成相间短路）。需要换向时必须先按停止按钮。</p>
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
              <h4>虚拟调试记录（上限 2 次）</h4>
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

// ================= 题库配置 =================
// 保护器件、接触器配置、换相方式、互锁方式、控制回路逻辑均由此下发；
// 后续题库更换电路图时只需替换本对象，不必改动判定代码。
const Q = {
  code: '030101-K31-05',
  title: '三相异步电动机正反转运行电路接线',
  supply: 'AC380V',
  protector: { kind: 'breaker', code: 'QF', name: '断路器', spec: '3P · 32A', altSpec: '熔断器 FU · RT18-32/16A' },
  motor: { code: 'M', name: '三相异步电动机', spec: '380V · 1.5kW · 8.8A', rpm: 1440 },
  fr: { spec: '整定 8.8A', nc: '常闭 95-96' },
  forward: { km: 'KM1', swap: null },          // 正转：U-L1 V-L2 W-L3
  reverse: { km: 'KM2', swap: ['L1', 'L3'] },  // 反转：调换 L1/L3 两相
  interlock: { type: '电气互锁（对方接触器常闭触点串联）', note: '两个方向接触器不得同时吸合，换向须先停止' },
  control: { mode: '正反转自锁 + 电气互锁', viaXT: '按钮控制线经端子排 XT 转接' },
  debugLimit: 2,
}

const PHASES = [
  { name: '选择工具和仪器仪表', obj: '5 项工具仪表 · 无关器材不得计入' },
  { name: '选择元器件和导线', obj: '9 件元器件 · 5 种回路线色' },
  { name: '安装元器件并完成接线', obj: '6 个元件就位 · 主回路 20 条 + 控制回路 15 条' },
  { name: '检查与虚拟调试', obj: '通电前检查 13 项 · 正转→停止→互锁→反转 · 调试 ≤2 次' },
  { name: '拆除电路', obj: '断电 → 控制线 → 主回路 → 元件 → 检查' },
  { name: '整理场地', obj: '工具仪表归位 · 元件分类 · 清理操作台' },
]

const cats = reactive({
  '工具仪表': { got: 0, max: 10 },
  '元件导线': { got: 0, max: 15 },
  '元件安装': { got: 0, max: 6 },
  '主回路': { got: 0, max: 14 },
  '控制回路': { got: 0, max: 15 },
  '检查调试': { got: 0, max: 25 },
  '拆除电路': { got: 0, max: 10 },
  '整理场地': { got: 0, max: 5 },
})

// ================= 任务1 数据 =================
const toolList = [
  { n: '螺丝刀' }, { n: '剥线钳' }, { n: '压线钳' }, { n: '尖嘴钳' }, { n: '电工刀' }, { n: '扳手' },
  { n: '绝缘破裂的压线钳（不合格）', bad: true },
]
const meterList = [{ n: '万用表' }, { n: '验电笔' }, { n: '钳形电流表' }, { n: '兆欧表' }]
const REQ_TOOLS = ['螺丝刀', '剥线钳', '压线钳', '万用表', '验电笔']

// ================= 任务2 数据 =================
const compList = [
  Q.protector.name, '熔断器', '交流接触器 KM1（正转）', '交流接触器 KM2（反转）', '中间继电器',
  '热继电器', '三相异步电动机', '接线端子排', '正转按钮', '反转按钮', '停止按钮',
  '电流互感器', '电流表', '电压互感器', '电能表',
]
const REQ_COMPS = [
  Q.protector.name, '交流接触器 KM1（正转）', '交流接触器 KM2（反转）', '热继电器', '三相异步电动机',
  '接线端子排', '正转按钮', '反转按钮', '停止按钮',
]

const WT = {
  L1: { cn: 'L1', name: '黄', color: '#f9a825' },
  L2: { cn: 'L2', name: '绿', color: '#43a047' },
  L3: { cn: 'L3', name: '红', color: '#e53935' },
  PE: { cn: 'PE', name: '黄绿', color: '#c0ca33' },
  CTL: { cn: '控制线', name: '黑', color: '#37474f' },
}
const COLORS = ['黄色', '绿色', '红色', '黄绿双色', '黑色', '蓝色']
const WIRE_ROWS = [
  { k: 'L1', label: 'L1 主回路（黄）', req: '黄色' },
  { k: 'L2', label: 'L2 主回路（绿）', req: '绿色' },
  { k: 'L3', label: 'L3 主回路（红）', req: '红色' },
  { k: 'PE', label: 'PE 保护接地', req: '黄绿双色' },
  { k: 'CTL', label: '按钮控制线', req: '黑色' },
]
function swatch(c) {
  return { '黄色': 'yellow', '绿色': 'green', '红色': 'red', '黄绿双色': 'pe', '黑色': 'black', '蓝色': 'blue' }[c] || ''
}

// ================= 操作台布局 =================
const SLOTS = [
  { id: 'qf', name: `${Q.protector.code} ${Q.protector.name}`, x: 278, y: 98, w: 90, h: 80 },
  { id: 'km1', name: 'KM1 正转接触器', x: 415, y: 88, w: 100, h: 120 },
  { id: 'km2', name: 'KM2 反转接触器', x: 560, y: 88, w: 100, h: 120 },
  { id: 'fr', name: '热继电器 FR', x: 680, y: 88, w: 86, h: 120 },
  { id: 'motor', name: '电动机 M', x: 780, y: 92, w: 112, h: 130 },
  { id: 'xt', name: '端子排 XT', x: 270, y: 255, w: 340, h: 52 },
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
  // KM1 正转接触器
  { id: 'k11i', x: 430, y: 88, a: ['L1'], n: 'KM1 1 进线', owner: 'km1' },
  { id: 'k12i', x: 455, y: 88, a: ['L2'], n: 'KM1 2 进线', owner: 'km1' },
  { id: 'k13i', x: 480, y: 88, a: ['L3'], n: 'KM1 3 进线', owner: 'km1' },
  { id: 'k11o', x: 430, y: 208, a: ['L1'], n: 'KM1 1 出线', owner: 'km1' },
  { id: 'k12o', x: 455, y: 208, a: ['L2'], n: 'KM1 2 出线', owner: 'km1' },
  { id: 'k13o', x: 480, y: 208, a: ['L3'], n: 'KM1 3 出线', owner: 'km1' },
  { id: 'k1n1', x: 512, y: 105, a: ['CTL'], n: 'KM1 自锁常开触点 1', owner: 'km1' },
  { id: 'k1n2', x: 512, y: 125, a: ['CTL'], n: 'KM1 自锁常开触点 2', owner: 'km1' },
  { id: 'k1nc1', x: 512, y: 150, a: ['CTL'], n: 'KM1 互锁常闭触点 1', owner: 'km1' },
  { id: 'k1nc2', x: 512, y: 172, a: ['CTL'], n: 'KM1 互锁常闭触点 2', owner: 'km1' },
  { id: 'k1c1', x: 412, y: 150, a: ['CTL'], n: 'KM1 线圈 A1', owner: 'km1' },
  { id: 'k1c2', x: 412, y: 175, a: ['CTL'], n: 'KM1 线圈 A2', owner: 'km1' },
  // KM2 反转接触器
  { id: 'k21i', x: 575, y: 88, a: ['L1'], n: 'KM2 1 进线', owner: 'km2' },
  { id: 'k22i', x: 600, y: 88, a: ['L2'], n: 'KM2 2 进线', owner: 'km2' },
  { id: 'k23i', x: 625, y: 88, a: ['L3'], n: 'KM2 3 进线', owner: 'km2' },
  { id: 'k21o', x: 575, y: 208, a: ['L1', 'L3'], n: 'KM2 1 出线（换相至 W）', owner: 'km2' },
  { id: 'k22o', x: 600, y: 208, a: ['L2'], n: 'KM2 2 出线', owner: 'km2' },
  { id: 'k23o', x: 625, y: 208, a: ['L3', 'L1'], n: 'KM2 3 出线（换相至 U）', owner: 'km2' },
  { id: 'k2n1', x: 662, y: 105, a: ['CTL'], n: 'KM2 自锁常开触点 1', owner: 'km2' },
  { id: 'k2n2', x: 662, y: 125, a: ['CTL'], n: 'KM2 自锁常开触点 2', owner: 'km2' },
  { id: 'k2nc1', x: 662, y: 150, a: ['CTL'], n: 'KM2 互锁常闭触点 1', owner: 'km2' },
  { id: 'k2nc2', x: 662, y: 172, a: ['CTL'], n: 'KM2 互锁常闭触点 2', owner: 'km2' },
  { id: 'k2c1', x: 557, y: 150, a: ['CTL'], n: 'KM2 线圈 A1', owner: 'km2' },
  { id: 'k2c2', x: 557, y: 175, a: ['CTL'], n: 'KM2 线圈 A2', owner: 'km2' },
  // 热继电器 FR
  { id: 'f1i', x: 695, y: 88, a: ['L1'], n: 'FR 1 进线', owner: 'fr' },
  { id: 'f2i', x: 720, y: 88, a: ['L2'], n: 'FR 2 进线', owner: 'fr' },
  { id: 'f3i', x: 745, y: 88, a: ['L3'], n: 'FR 3 进线', owner: 'fr' },
  { id: 'f1o', x: 695, y: 208, a: ['L1'], n: 'FR 1 出线（U）', owner: 'fr' },
  { id: 'f2o', x: 720, y: 208, a: ['L2'], n: 'FR 2 出线（V）', owner: 'fr' },
  { id: 'f3o', x: 745, y: 208, a: ['L3'], n: 'FR 3 出线（W）', owner: 'fr' },
  { id: 'fn1', x: 766, y: 150, a: ['CTL'], n: 'FR 常闭触点 95', owner: 'fr' },
  { id: 'fn2', x: 766, y: 175, a: ['CTL'], n: 'FR 常闭触点 96', owner: 'fr' },
  // 电动机
  { id: 'mu', x: 795, y: 215, a: ['L1'], n: '电动机 U 端', owner: 'motor' },
  { id: 'mv', x: 830, y: 215, a: ['L2'], n: '电动机 V 端', owner: 'motor' },
  { id: 'mw', x: 865, y: 215, a: ['L3'], n: '电动机 W 端', owner: 'motor' },
  { id: 'mpe', x: 886, y: 178, a: ['PE'], n: '电动机 PE 端', owner: 'motor' },
  // 端子排 XT
  { id: 'xpe1', x: 295, y: 307, a: ['PE'], n: '端子排 PE 1', owner: 'xt' },
  { id: 'xpe2', x: 335, y: 307, a: ['PE'], n: '端子排 PE 2', owner: 'xt' },
  { id: 'xc1', x: 390, y: 307, a: ['CTL'], n: '端子排 XT-1（电源侧）', owner: 'xt' },
  { id: 'xc2', x: 430, y: 307, a: ['CTL'], n: '端子排 XT-2（备用）', owner: 'xt' },
  { id: 'xc3', x: 490, y: 307, a: ['CTL'], n: '端子排 XT-3（按钮侧）', owner: 'xt' },
  { id: 'xc4', x: 530, y: 307, a: ['CTL'], n: '端子排 XT-4（备用）', owner: 'xt' },
  // 按钮组（预装）
  { id: 'sb0a', x: 310, y: 335, a: ['CTL'], n: 'SB0 停止（常闭）进线' },
  { id: 'sb0b', x: 345, y: 335, a: ['CTL'], n: 'SB0 停止（常闭）出线' },
  { id: 'sb1a', x: 400, y: 335, a: ['CTL'], n: 'SB1 正转（常开）进线' },
  { id: 'sb1b', x: 435, y: 335, a: ['CTL'], n: 'SB1 正转（常开）出线' },
  { id: 'sb2a', x: 490, y: 335, a: ['CTL'], n: 'SB2 反转（常开）进线' },
  { id: 'sb2b', x: 525, y: 335, a: ['CTL'], n: 'SB2 反转（常开）出线' },
]
const TMAP = Object.fromEntries(TERMS.map(t => [t.id, t]))
// 标准接线关系（题库下发：主回路20 + 控制回路15）
const REQ_WIRES = [
  // 主回路（20 条 · 14 分）
  { id: 'm1', a: 's1', b: 'qf1i', type: 'L1', cat: 'main' },
  { id: 'm2', a: 's2', b: 'qf2i', type: 'L2', cat: 'main' },
  { id: 'm3', a: 's3', b: 'qf3i', type: 'L3', cat: 'main' },
  { id: 'm4', a: 'qf1o', b: 'k11i', type: 'L1', cat: 'main' },   // 正转接触器进线
  { id: 'm5', a: 'qf2o', b: 'k12i', type: 'L2', cat: 'main' },
  { id: 'm6', a: 'qf3o', b: 'k13i', type: 'L3', cat: 'main' },
  { id: 'm7', a: 'qf1o', b: 'k21i', type: 'L1', cat: 'main' },   // 反转接触器进线（并联）
  { id: 'm8', a: 'qf2o', b: 'k22i', type: 'L2', cat: 'main' },
  { id: 'm9', a: 'qf3o', b: 'k23i', type: 'L3', cat: 'main' },
  { id: 'm10', a: 'k11o', b: 'f1i', type: 'L1', cat: 'main' },   // 正转出线：相序不变
  { id: 'm11', a: 'k12o', b: 'f2i', type: 'L2', cat: 'main' },
  { id: 'm12', a: 'k13o', b: 'f3i', type: 'L3', cat: 'main' },
  { id: 'm13', a: 'k21o', b: 'f3i', type: 'L3', cat: 'main' },   // 反转出线：L1→W 换相
  { id: 'm14', a: 'k22o', b: 'f2i', type: 'L2', cat: 'main' },
  { id: 'm15', a: 'k23o', b: 'f1i', type: 'L1', cat: 'main' },   // 反转出线：L3→U 换相
  { id: 'm16', a: 'f1o', b: 'mu', type: 'L1', cat: 'main' },
  { id: 'm17', a: 'f2o', b: 'mv', type: 'L2', cat: 'main' },
  { id: 'm18', a: 'f3o', b: 'mw', type: 'L3', cat: 'main' },
  { id: 'm19', a: 'spe', b: 'xpe1', type: 'PE', cat: 'main' },
  { id: 'm20', a: 'xpe2', b: 'mpe', type: 'PE', cat: 'main' },
  // 控制回路（15 条 · 15 分，含端子排转接 + 电气互锁）
  { id: 'c1', a: 'qf1o', b: 'xc1', type: 'CTL', cat: 'ctl' },
  { id: 'c2', a: 'xc1', b: 'sb0a', type: 'CTL', cat: 'ctl' },
  { id: 'c3', a: 'sb0b', b: 'sb1a', type: 'CTL', cat: 'ctl' },   // 正转支路供电
  { id: 'c4', a: 'sb0b', b: 'sb2a', type: 'CTL', cat: 'ctl' },   // 反转支路供电
  { id: 'c5', a: 'sb1b', b: 'k2nc1', type: 'CTL', cat: 'ctl' },  // 正转线圈串 KM2 互锁常闭
  { id: 'c6', a: 'k2nc2', b: 'k1c1', type: 'CTL', cat: 'ctl' },
  { id: 'c7', a: 'sb2b', b: 'k1nc1', type: 'CTL', cat: 'ctl' },  // 反转线圈串 KM1 互锁常闭
  { id: 'c8', a: 'k1nc2', b: 'k2c1', type: 'CTL', cat: 'ctl' },
  { id: 'c9', a: 'k1c2', b: 'fn1', type: 'CTL', cat: 'ctl' },    // KM1 线圈回线经 FR 常闭
  { id: 'c10', a: 'k2c2', b: 'fn1', type: 'CTL', cat: 'ctl' },   // KM2 线圈回线经 FR 常闭
  { id: 'c11', a: 'fn2', b: 'qf3o', type: 'CTL', cat: 'ctl' },
  { id: 'c12', a: 'k1n1', b: 'sb1a', type: 'CTL', cat: 'ctl' },  // KM1 自锁
  { id: 'c13', a: 'k1n2', b: 'sb1b', type: 'CTL', cat: 'ctl' },
  { id: 'c14', a: 'k2n1', b: 'sb2a', type: 'CTL', cat: 'ctl' },  // KM2 自锁
  { id: 'c15', a: 'k2n2', b: 'sb2b', type: 'CTL', cat: 'ctl' },
]
const RMAP = Object.fromEntries(REQ_WIRES.map(r => [r.id, r]))

// 元器件内部导通关系（断电检测用）
const INTERNAL = [
  { a: 'qf1i', b: 'qf1o', need: 'qf' }, { a: 'qf2i', b: 'qf2o', need: 'qf' }, { a: 'qf3i', b: 'qf3o', need: 'qf' },
  { a: 'k11i', b: 'k11o', need: 'km1' }, { a: 'k12i', b: 'k12o', need: 'km1' }, { a: 'k13i', b: 'k13o', need: 'km1' },
  { a: 'k21i', b: 'k21o', need: 'km2' }, { a: 'k22i', b: 'k22o', need: 'km2' }, { a: 'k23i', b: 'k23o', need: 'km2' },
  { a: 'k1nc1', b: 'k1nc2', need: 'km1' },   // KM1 互锁常闭
  { a: 'k2nc1', b: 'k2nc2', need: 'km2' },   // KM2 互锁常闭
  { a: 'f1i', b: 'f1o', need: 'fr' }, { a: 'f2i', b: 'f2o', need: 'fr' }, { a: 'f3i', b: 'f3o', need: 'fr' },
  { a: 'fn1', b: 'fn2', need: 'fr' },
  { a: 'xpe1', b: 'xpe2', need: 'xt' }, { a: 'xc1', b: 'xc2', need: 'xt' }, { a: 'xc3', b: 'xc4', need: 'xt' },
  { a: 'sb0a', b: 'sb0b', need: null },       // 停止按钮常闭
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

// ================= 任务3/4 数据 =================
const MODES = ['通断测试', '电压档', '电阻档', '二极管档']
const DEMO_STEPS = [
  { k: 'off', label: '断电确认', pts: 2 },
  { k: 'ctl', label: '拆除控制线', pts: 2 },
  { k: 'main', label: '拆除主回路', pts: 2 },
  { k: 'comp', label: '拆除元器件并分类回收', pts: 2 },
  { k: 'chk', label: '检查元件、端子与导线', pts: 2 },
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
  if (t >= 90) return '具备正反转控制线路安装、互锁校验与调试能力'
  if (t >= 80) return '基本具备正反转接线能力，注意换相与互锁工艺'
  if (t >= 70) return '能够完成安装接线，但互锁或换相存在漏项'
  return '正反转接线能力不足，建议重新训练'
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
  msgTimer = setTimeout(() => { msgType.value = '' }, 3600)
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
function setScore(cat, n) { cats[cat].got = Math.max(0, Math.min(cats[cat].max, +(+n).toFixed(1))) }
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
  showMsg(`检测到严重电气安全风险：${reason}（-${penalty} 分）`, 'bad')
  beep(120, .45, 'sawtooth')
  paused.value = true
  if (phase.value === 3) resetChecks('安全违规，通电前检查结果作废，请重新检查')
  later(() => { paused.value = false; showMsg('请重新执行安全检查', 'info') }, 2600)
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

// ================= DebugController：调试次数独立记录 =================
const DEBUG_KEY = 'k3105-debug-record'
function loadDebugRecord() {
  try {
    const raw = localStorage.getItem(DEBUG_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      return {
        count: Math.max(0, Math.min(Q.debugLimit, Number(d.count) || 0)),
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
    if (this.count >= Q.debugLimit) return false
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

// ================= 任务1：工具和仪器仪表 =================
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
    showMsg('✔ 工具仪表选择符合安装、接线、验电与检测要求', 'good')
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

// ================= 任务2：元器件和导线 =================
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
    showMsg('✔ 元器件齐全（含正/反转两只接触器）· 线色规范', 'good')
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
  { key: 'qf', code: Q.protector.code, label: Q.protector.name },
  { key: 'km1', code: 'KM1', label: '正转接触器' },
  { key: 'km2', code: 'KM2', label: '反转接触器' },
  { key: 'fr', code: 'FR', label: '热继电器' },
  { key: 'xt', code: 'XT', label: '端子排' },
  { key: 'motor', code: 'M', label: '三相电动机' },
])
const placed = reactive({ qf: false, km1: false, km2: false, fr: false, xt: false, motor: false })
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
function cntWires(cat) { return REQ_WIRES.filter(r => r.cat === cat).length }
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
  setScore('元件安装', placedCount.value)
  const wrongMain = wires.value.filter(w => w.wrong && w.cat === 'main').length
  const wrongCtl = wires.value.filter(w => w.wrong && w.cat === 'ctl').length
  setScore('主回路', 14 * rightN('main') / cntWires('main') - wrongMain * 2)
  setScore('控制回路', 15 * rightN('ctl') / cntWires('ctl') - wrongCtl * 1)
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
  const type = wireType.value
  const req2 = REQ_WIRES.find(r => eqPair(r.a, r.b, a.id, b.id))
  if (!req2) {
    const guessCat = type === 'CTL' ? 'ctl' : 'main'
    wires.value.push({ id: ++wid, a: a.id, b: b.id, type, cat: guessCat, wrong: true })
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`接线关系错误：${a.n} → ${b.n} 不符合电路图（橙色虚线，请选中后拆除）`, 'warn')
    afterWiringChange()
    return
  }
  wires.value.push({ id: ++wid, a: a.id, b: b.id, type, cat: req2.cat, wrong: false })
  beep(760, .07)
  showMsg(`✔ 接线正确：${a.n} → ${b.n}（${WT[type].cn}线）`, 'good')
  afterWiringChange()
}
function afterWiringChange() {
  // 拆除阶段按任务顺序导线，接线分保持任务3完成时的结果
  if (phase.value !== 4) scoreWiring()
  if (phase.value === 3) resetChecks('接线已变更，请重新进行通电前检查')
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
  const peMiss = ['m19', 'm20'].filter(id => !findWire(RMAP[id]))
  if (!missing.length && !wrongN.value) {
    showMsg('✔ 主回路（含 L1/L3 换相）· 控制回路（自锁 + 电气互锁，端子排转接）全部正确', 'good')
    completePhase()
    return
  }
  const msgs = []
  if (missing.length) {
    const byCat = c => missing.filter(r => r.cat === c).map(r => `${TMAP[r.a].n}→${TMAP[r.b].n}`)
    const g = [['main', '主回路'], ['ctl', '控制回路']]
    for (const [c, label] of g) {
      const l = byCat(c)
      if (l.length) msgs.push(`${label}未完成：${l.slice(0, 4).join('、')}${l.length > 4 ? ` 等 ${l.length} 处` : ''}`)
    }
  }
  if (wrongN.value) msgs.push(`存在 ${wrongN.value} 条错误接线（橙色虚线），点击导线后可拆除`)
  if (peMiss.length && missing.length === peMiss.length) msgs.push('⚠ PE 保护接地未连接，属严重安全隐患')
  if (!allW(['c5', 'c6', 'c7', 'c8'])) msgs.push('⚠ 互锁支路未完成：正/反转线圈须串入对方接触器常闭触点')
  showMsg(msgs.join('；'), 'warn')
  beep(220, .12, 'sawtooth')
}

// ================= 任务4：通电前检查与虚拟调试 =================
const look = reactive({
  items: [
    { k: '接线与电路图一致（主回路核对）', done: false },
    { k: '控制回路与端子排核对', done: false },
    { k: 'PE 保护接地符合要求', done: false },
    { k: '元件固定、标识清晰', done: false },
    { k: '螺钉与端子紧固', done: false },
    { k: '正反转接触器无同时吸合风险（互锁核对）', done: false },
    { k: '换相接线核对（L1/L3 对调）', done: false },
    { k: '热继电器与端子连接符合要求', done: false },
    { k: '无短路/错相风险', done: false },
  ],
})
const meter = reactive({
  mode: '',
  readout: '',
  tests: [
    { id: 't1', pair: ['s1', 's2'], expect: '不通', desc: '主回路相间绝缘（L1-L2）', done: false, ok: false },
    { id: 't2', pair: ['spe', 'mpe'], expect: '通', desc: 'PE 保护接地连续性（电源→端子排→电机）', done: false, ok: false },
    { id: 't3', pair: ['sb1b', 'k1c1'], expect: '通', desc: '正转线圈回路（经 KM2 互锁常闭）', done: false, ok: false },
    { id: 't4', pair: ['sb2b', 'k2c1'], expect: '通', desc: '反转线圈回路（经 KM1 互锁常闭）', done: false, ok: false },
  ],
})
const probeA = ref('')

const lookDone = computed(() => look.items.filter(i => i.done).length)
const meterDone = computed(() => meter.tests.filter(t => t.done).length)
const checkDone = computed(() => lookDone.value + meterDone.value)
const checksDone = computed(() => checkDone.value === look.items.length + meter.tests.length)

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
// ---- 回路状态判定（正反转 + 互锁） ----
function allW(ids) { return ids.every(id => findWire(RMAP[id])) }
const LOOP = {
  src: ['c1', 'c2'],
  fwdBtn: ['c3'], revBtn: ['c4'],
  fwdInt: ['c5', 'c6'], revInt: ['c7', 'c8'],
  coilRet: ['c9', 'c10', 'c11'],
  fwdLock: ['c12', 'c13'], revLock: ['c14', 'c15'],
  // 正转主回路（相序不变）
  phFU: ['m1', 'm4', 'm10', 'm16'], phFV: ['m2', 'm5', 'm11', 'm17'], phFW: ['m3', 'm6', 'm12', 'm18'],
  // 反转主回路（L1↔L3 换相）
  phRU: ['m3', 'm9', 'm15', 'm16'], phRV: ['m2', 'm8', 'm14', 'm17'], phRW: ['m1', 'm7', 'm13', 'm18'],
  pe: ['m19', 'm20'],
}
const fwdCoilOK = computed(() => allW(LOOP.src) && allW(LOOP.fwdBtn) && allW(LOOP.fwdInt) && findWire(RMAP.c9) && findWire(RMAP.c11))
const revCoilOK = computed(() => allW(LOOP.src) && allW(LOOP.revBtn) && allW(LOOP.revInt) && findWire(RMAP.c10) && findWire(RMAP.c11))
const fwdLockOK = computed(() => fwdCoilOK.value && allW(LOOP.fwdLock))
const revLockOK = computed(() => revCoilOK.value && allW(LOOP.revLock))
const fwdPhCount = computed(() => [LOOP.phFU, LOOP.phFV, LOOP.phFW].filter(allW).length)
const revPhCount = computed(() => [LOOP.phRU, LOOP.phRV, LOOP.phRW].filter(allW).length)
const peOK = computed(() => allW(LOOP.pe))
const interlockOK = computed(() => allW(LOOP.fwdInt) && allW(LOOP.revInt) && placed.km1 && placed.km2)

// 未排除故障（阻断调试的原因）
const blockers = computed(() => {
  const list = []
  if (wrongN.value) list.push(`存在 ${wrongN.value} 条错误接线（橙色虚线），必须先拆除`)
  const un = SLOTS.filter(s => !placed[s.id])
  if (un.length) list.push(`元器件未安装到位：${un.map(s => s.name).join('、')}`)
  const badT = meter.tests.filter(t => t.done && !t.ok)
  if (badT.length) list.push(`通断检测异常：${badT.map(t => t.desc).join('、')}`)
  if (!interlockOK.value) list.push('互锁失效：KM1/KM2 常闭触点串联支路未接通，安全检查不通过，禁止调试')
  return list
})
const debugLocked = computed(() => DebugController.count >= Q.debugLimit)
const dbgOnDisabled = computed(() => lock.value || paused.value || power.value || dbg.on || debugLocked.value || phase.value !== 3)
const debugStatus = computed(() => {
  if (debugLocked.value) {
    return {
      kind: 'lock',
      text: `调试次数已达上限（${DebugController.count}/${Q.debugLimit}），调试入口已锁定 —— 请查看故障记录并重新训练`,
    }
  }
  if (dbg.on) return { kind: 'ok', text: `已通电（第 ${DebugController.count}/${Q.debugLimit} 次）：请依次测试 正转 → 停止 → 互锁 → 反转 → 停止` }
  if (!checksDone.value) return { kind: 'wait', text: `通电前检查未完成（${checkDone.value}/${look.items.length + meter.tests.length}），禁止通电` }
  if (blockers.value.length) return { kind: 'bad', text: '发现接线故障：' + blockers.value[0] }
  return { kind: 'ok', text: '检查合格，互锁有效，允许申请通电调试' }
})

// ---- 虚拟调试流程 ----
// dir: 'stop' | 'fwd' | 'rev'
const dbg = reactive({
  on: false, km1: false, km2: false, dir: 'stop',
  ranF: false, ranR: false, triedStop: false, triedLock: false,
  lock: false, lockF: false, lockR: false,
})
const motorText = computed(() => {
  if (dbg.dir === 'fwd') return `正转 ${Q.motor.rpm} r/min`
  if (dbg.dir === 'rev') return `反转 ${Q.motor.rpm} r/min`
  return '停止'
})

function applyDebug() {
  if (paused.value || lock.value || dbg.on) return
  if (phase.value !== 3 || power.value) return
  if (debugLocked.value) { showMsg(debugStatus.value.text, 'bad'); return }
  if (!checksDone.value) {
    majorViolation('调试时绕过安全检查：通电前检查未完成即申请通电', '检查调试', 4)
    return
  }
  if (blockers.value.length) {
    beep(150, .3, 'sawtooth')
    if (wrongN.value) majorViolation('主回路/控制回路存在错误接线，通电有短路风险，禁止调试', '检查调试', 3)
    else if (!interlockOK.value) majorViolation('互锁失效：正反转接触器无互锁保护，同时吸合会造成相间短路，禁止通电调试', '检查调试', 5)
    else showMsg('系统禁止启动调试：' + blockers.value[0], 'bad')
    return
  }
  if (!peOK.value) {
    majorViolation('PE 未连接：保护接地缺失，禁止通电调试', '主回路', 4)
    return
  }
  if (!DebugController.start()) return
  power.value = true
  dbg.on = true
  dbg.km1 = dbg.km2 = false
  dbg.dir = 'stop'
  dbg.ranF = dbg.ranR = dbg.triedStop = dbg.triedLock = false
  dbg.lock = dbg.lockF = dbg.lockR = false
  beep(880, .2)
  showMsg(`⚡ 已通电（第 ${DebugController.count}/${Q.debugLimit} 次调试）：请按 正转 → 停止 → 互锁验证 → 反转 → 停止 顺序测试`, 'good')
}

function pressSB1() {
  if (!dbg.on) return
  if (dbg.dir === 'rev') {
    dbg.triedLock = true
    if (interlockOK.value) {
      beep(150, .35, 'sawtooth')
      showMsg('✔ 互锁生效：KM2 正在运行，其常闭触点断开正转支路，KM1 无法吸合 —— 换向须先按 SB0 停止', 'good')
    } else {
      dbg.km1 = true
      majorViolation('互锁失效：反转运行时正转接触器同时吸合（相间短路风险），调试终止', '检查调试', 5)
    }
    return
  }
  if (dbg.dir === 'fwd') { showMsg('电动机已在正转运行中', 'info'); return }
  if (!fwdCoilOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg('✘ 正转启动失败：正转控制回路异常（检查 SB1 支路、KM2 互锁常闭与线圈回线）', 'bad')
    return
  }
  dbg.km1 = true
  if (fwdPhCount.value < 3) {
    beep(150, .35, 'sawtooth')
    showMsg(`正转主回路检查失败：U/V/W 仅接通 ${fwdPhCount.value}/3 相 —— 请核对电路图与端子对应关系`, 'bad')
  } else {
    dbg.dir = 'fwd'
    dbg.ranF = true
    beep(760, .1)
    showMsg('✔ 正转运行：KM1 吸合，电动机正转', 'good')
  }
  // 自锁判定
  if (fwdLockOK.value) {
    dbg.lock = true; dbg.lockF = true
    showMsg('✔ 自锁成功：松开 SB1，KM1 保持吸合，电动机连续运行', 'good')
  } else if (dbg.dir === 'fwd') {
    dbg.dir = 'stop'; dbg.km1 = false
    beep(150, .35, 'sawtooth')
    showMsg('✘ 自锁逻辑错误：松开 SB1 后接触器释放，状态异常 —— KM1 自锁触点接线错误', 'bad')
  }
}

function pressSB2() {
  if (!dbg.on) return
  if (dbg.dir === 'fwd') {
    dbg.triedLock = true
    if (interlockOK.value) {
      beep(150, .35, 'sawtooth')
      showMsg('✔ 互锁生效：KM1 正在运行，其常闭触点断开反转支路，KM2 无法吸合 —— 换向须先按 SB0 停止', 'good')
    } else {
      dbg.km2 = true
      majorViolation('互锁失效：正转运行时反转接触器同时吸合（相间短路风险），调试终止', '检查调试', 5)
    }
    return
  }
  if (dbg.dir === 'rev') { showMsg('电动机已在反转运行中', 'info'); return }
  if (!revCoilOK.value) {
    beep(150, .35, 'sawtooth')
    showMsg('✘ 反转启动失败：反转控制回路异常（检查 SB2 支路、KM1 互锁常闭与线圈回线）', 'bad')
    return
  }
  dbg.km2 = true
  if (revPhCount.value < 3) {
    beep(150, .35, 'sawtooth')
    showMsg(`反转主回路检查失败：U/V/W 仅接通 ${revPhCount.value}/3 相 —— 请核对换相接线（L1/L3 对调）`, 'bad')
  } else {
    dbg.dir = 'rev'
    dbg.ranR = true
    beep(760, .1)
    showMsg('✔ 反转运行：KM2 吸合，L1/L3 换相，电动机反转', 'good')
  }
  if (revLockOK.value) {
    dbg.lock = true; dbg.lockR = true
    showMsg('✔ 自锁成功：松开 SB2，KM2 保持吸合，电动机连续反转', 'good')
  } else if (dbg.dir === 'rev') {
    dbg.dir = 'stop'; dbg.km2 = false
    beep(150, .35, 'sawtooth')
    showMsg('✘ 自锁逻辑错误：松开 SB2 后接触器释放，状态异常 —— KM2 自锁触点接线错误', 'bad')
  }
}

function pressSB0() {
  if (!dbg.on) return
  dbg.triedStop = true
  dbg.km1 = dbg.km2 = false
  dbg.dir = 'stop'
  dbg.lock = false
  beep(520, .1)
  showMsg('✔ 停止：按下 SB0，接触器释放，电动机停止', 'good')
}

function judgeDebug() {
  if (!dbg.on || paused.value || lock.value) return
  if (!(dbg.ranF && dbg.ranR && dbg.triedStop && dbg.triedLock)) return
  const n = DebugController.count
  let detail = ''
  if (!dbg.ranF) {
    if (!fwdCoilOK.value) detail = '正转控制回路异常，正转启动失败'
    else detail = `U、V、W 连接不符合图纸：正转主回路检查失败（${fwdPhCount.value}/3 相）`
  } else if (!dbg.ranR) {
    if (!revCoilOK.value) detail = '反转控制回路异常，反转启动失败'
    else detail = `U、V、W 连接不符合图纸：反转换相接线错误（${revPhCount.value}/3 相）`
  } else if (!dbg.triedLock) detail = '未完成互锁验证：须在运行状态下按另一方向按钮检验互锁'
  else if (!dbg.lockF || !dbg.lockR) detail = '自锁逻辑错误：松开启动按钮后状态异常'

  if (!detail) {
    DebugController.record('pass', `第${n}次调试通过：正转、停止、互锁与反转测试均正常，两接触器无同时吸合`)
    addScore('检查调试', n === 1 ? 12 : 6)
    beep(880, .25)
    showMsg(`✔ 虚拟调试通过（第 ${n}/${Q.debugLimit} 次）：正转/反转/自锁/互锁全部正常　+${n === 1 ? 12 : 6} 分`, 'good')
    completePhase()
    return
  }
  DebugController.record('fail', `第${n}次调试失败：${detail}`)
  mistakes.value++
  noteMistake()
  beep(120, .45, 'sawtooth')
  showMsg(`虚拟调试失败（第 ${n}/${Q.debugLimit} 次）：${detail}`, 'bad')
  power.value = false
  dbg.on = false
  resetChecks('故障已记录，请排除故障后重新进行通电前检查')
}
function restartRun() {
  DebugController.reset()
  startGame()
}

// ================= 任务5：拆除电路 =================
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
      addScore('拆除电路', s.pts)
      beep(700, .06)
      showMsg('✔ 断电确认完成，实训台电源已断开　+2 分', 'good')
    } else showMsg('已确认断电', 'info')
    return
  }
  if (power.value) {
    majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 3)
    return
  }
  if (demo.step !== i) {
    showMsg(`请按顺序操作：下一步「${DEMO_STEPS[demo.step].label}」`, 'warn')
    return
  }
  if (i === 1) {
    wires.value = wires.value.filter(w => w.cat !== 'ctl')
    probeA.value = ''
    demo.step = 2
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 控制线拆除完成并按线色分类盘绕，未拉扯导线　+2 分', 'good')
    afterWiringChange()
    return
  }
  if (i === 2) {
    wires.value = wires.value.filter(w => w.cat === 'ctl')
    probeA.value = ''
    demo.step = 3
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 主回路导线拆除完成（U/V/W/PE 分色整理）　+2 分', 'good')
    afterWiringChange()
    return
  }
  if (i === 3) {
    Object.keys(placed).forEach(k => { placed[k] = false })
    chipVer.value++
    demo.step = 4
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 元器件拆除并分类回收（KM1/KM2 分开存放）　+2 分', 'good')
    return
  }
  if (i === 4) {
    demo.step = 5
    addScore('拆除电路', s.pts)
    beep(700, .06)
    showMsg('✔ 检查完成：元件、端子与导线均无损坏　+2 分', 'good')
    completePhase()
  }
}

// ================= 任务6：整理场地 =================
const tidyItems = reactive([
  { k: '工具归位', done: false }, { k: '仪表归位', done: false }, { k: '元件分类', done: false },
  { k: '导线整理', done: false }, { k: '清理操作台', done: false },
])
const tidyDone = computed(() => tidyItems.filter(i => i.done).length)
function checkTidy(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('整理场地', 1)
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
  sheetOpen.value = true
  power.value = false
  tools.sel = []; tools.penalty = 0
  parts.sel = []; parts.penalty = 0
  WIRE_ROWS.forEach(r => { wsel[r.k] = '' })
  chipVer.value++
  Object.keys(placed).forEach(k => { placed[k] = false })
  wires.value = []
  wireType.value = 'L1'
  pendId.value = ''
  selWireId.value = ''
  resetChecks('')
  demo.step = 0
  tidyItems.forEach(i => { i.done = false })
  dbg.on = false
  dbg.km1 = dbg.km2 = false; dbg.dir = 'stop'
  dbg.ranF = dbg.ranR = dbg.triedStop = dbg.triedLock = false
  dbg.lock = dbg.lockF = dbg.lockR = false
  scoreWiring()
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

  if (phase.value === 2 || phase.value === 3) {
    // 端子优先判定：已接好的导线端点正好落在端子上，若先判导线会导致
    // 同一端子的后续接线（如 QF1 出线取电、线圈回线共点）无法点击
    const t = hitTerminal(p.x, p.y)
    if (t) {
      if (phase.value === 3 && meter.mode === '通断测试') { probe(t); return }
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

  if (phase.value === 4) {
    // 拆除任务：点控制线拆控制线、点主回路拆主回路，安全校验与面板按钮一致
    const w = hitWire(p.x, p.y)
    if (w) demoStep(w.cat === 'ctl' ? 1 : 2)
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
function termColor(t) { return WT[t.a[0]].color }
function wireColor(t) { return WT[t].color }

function drawShelf(c) {
  rect(c, 16, 50, 215, 140, '#b08968', '#7d5a3c')
  line(c, 16, 122, 231, 122)
  txt(c, '器材摆放架', 123, 44, '#37474f', 'bold 13px sans-serif')
  // 螺丝刀
  rect(c, 34, 68, 10, 34, '#e53935'); rect(c, 37, 102, 4, 16, '#90a4ae')
  // 剥线钳 / 压线钳
  c.strokeStyle = '#546e7a'; c.lineWidth = 4
  line(c, 70, 70, 84, 104); line(c, 88, 70, 74, 104)
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
  txt(c, phase.value === 3 ? '检测工作台' : '元器件区', 123, 204, '#37474f', 'bold 13px sans-serif')
  if (phase.value === 3) { drawBenchMeter(c); return }
  const boxes = [
    [`${Q.protector.code} ${Q.protector.name}`, 28, 224, '断路器'], ['KM1 正转接触器', 132, 224, '交流接触器'],
    ['KM2 反转接触器', 28, 288, '交流接触器'], ['热继电器 FR', 132, 288, '热继电器'],
    ['端子排 XT', 28, 352, '接线端子排'], ['正转/反转/停止按钮', 132, 352],
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

function drawBenchMeter(c) {
  const on = meter.mode === '通断测试'
  rect(c, 30, 232, 188, 130, '#263238', '#111')
  rect(c, 42, 244, 164, 34, on ? '#8bc34a' : '#37474f')
  txt(c, on ? (meter.readout || 'OL') : '未选择档位', 124, 266,
    on ? '#1b2630' : '#90a4ae', 'bold 12px Consolas, monospace')
  circle(c, 74, 316, 19, '#b0bec5', null)
  c.strokeStyle = '#37474f'; c.lineWidth = 4
  line(c, 74, 316, 74, 302)
  txt(c, on ? '通断' : '档位', 74, 346, on ? '#8bc34a' : '#90a4ae', '10px sans-serif')
  circle(c, 150, 308, 7, '#e53935', null)
  circle(c, 178, 308, 7, '#212121', null)
  txt(c, 'V/Ω', 150, 332, '#90a4ae', '10px sans-serif')
  txt(c, 'COM', 178, 332, '#90a4ae', '10px sans-serif')
  c.strokeStyle = on ? '#e53935' : '#546e7a'; c.lineWidth = 2.5
  line(c, 150, 301, 142, 232)
  c.strokeStyle = on ? '#212121' : '#546e7a'
  line(c, 178, 301, 192, 232)
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
  txt(c, '三相异步电动机正反转控制线路实训台', BX + BW / 2, BY - 8, '#37474f', 'bold 14px sans-serif')

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
    line(c, tt.x, BY, tt.x, tt.y)
    txt(c, k, tt.x, 70, WT[k].color, 'bold 12px sans-serif')
  }
  txt(c, `三相电源 ${Q.supply}`, 470, 72, '#546e7a', '11px sans-serif')

  if (phase.value === 2) drawSlotHints(c, t)
  if (placed.qf) drawQF(c)
  if (placed.km1) drawKM(c, 'km1')
  if (placed.km2) drawKM(c, 'km2')
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
  const fuse = Q.protector.kind === 'fuse'
  rect(c, s.x, s.y, s.w, s.h, fuse ? '#fff8e1' : '#fafafa')
  c.strokeStyle = fuse ? '#f9a825' : '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, `${Q.protector.code} ${Q.protector.name}`, s.x + s.w / 2, s.y + 16, '#37474f', 'bold 12px sans-serif')
  for (let i = 0; i < 3; i++) {
    const x = s.x + 25 + i * 20
    if (fuse) {
      line(c, x, s.y + 26, x, s.y + 38)
      rect(c, x - 5, s.y + 38, 10, 20, '#fff', '#f57f17')
      line(c, x, s.y + 58, x, s.y + 64)
    } else {
      line(c, x, s.y + 26, x, s.y + 44)
      line(c, x, s.y + 52, x, s.y + 64)
      circle(c, x, s.y + 48, 3, '#90a4ae', null)
    }
  }
  rect(c, s.x + 20, s.y + 66, 50, 10, '#66bb6a')
  txt(c, Q.protector.spec, s.x + s.w / 2, s.y + 78, '#78909c', '9px sans-serif')
}

// 正转/反转接触器（同一绘制逻辑，标签与状态不同）
function drawKM(c, key) {
  const s = SLOTS.find(x => x.id === key)
  const isFwd = key === 'km1'
  const on = isFwd ? dbg.km1 : dbg.km2
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, `${isFwd ? 'KM1 正转' : 'KM2 反转'}接触器`, s.x + s.w / 2, s.y + 16, '#37474f', 'bold 11px sans-serif')
  // 线圈
  rect(c, s.x + 6, s.y + 46, 30, 40, '#cfd8dc', '#90a4ae')
  txt(c, 'A1', s.x + 21, s.y + 58, '#455a64', '8px sans-serif')
  txt(c, '线圈', s.x + 21, s.y + 76, '#455a64', '9px sans-serif')
  txt(c, 'A2', s.x + 21, s.y + 84, '#455a64', '8px sans-serif')
  // 主触点 ×3
  for (let i = 0; i < 3; i++) {
    const y = s.y + 30 + i * 22
    c.strokeStyle = '#37474f'; c.lineWidth = 2
    line(c, s.x + 46, y, s.x + 60, y)
    line(c, s.x + 68, y, s.x + 86, y)
    line(c, s.x + 60, y, s.x + 68, y - 8)
  }
  // 辅助触点标识（自锁 NO + 互锁 NC）
  txt(c, 'NO', s.x + 55, s.y + 104, '#546e7a', '9px sans-serif')
  txt(c, 'NC', s.x + 78, s.y + 104, '#b71c1c', '9px sans-serif')
  // 状态指示
  circle(c, s.x + s.w - 14, s.y + 14, 6, on ? '#66bb6a' : '#b0bec5', '#37474f', 2)
  txt(c, on ? '吸合' : '释放', s.x + s.w - 14, s.y + 104, on ? '#2e7d32' : '#78909c', 'bold 9px sans-serif')
}
function drawFR(c) {
  const s = SLOTS.find(x => x.id === 'fr')
  rect(c, s.x, s.y, s.w, s.h, '#fff3e0')
  c.strokeStyle = '#ef6c00'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'FR 热继电器', s.x + s.w / 2, s.y + 16, '#e65100', 'bold 11px sans-serif')
  for (let i = 0; i < 3; i++) {
    const x = s.x + 20 + i * 22
    c.strokeStyle = '#ef6c00'
    line(c, x, s.y + 28, x, s.y + 42)
    c.beginPath(); c.arc(x, s.y + 50, 6, 0.6, 2.5); c.stroke()
    line(c, x, s.y + 57, x, s.y + 70)
  }
  txt(c, Q.fr.spec, s.x + s.w / 2, s.y + 86, '#bf360c', '9px sans-serif')
  txt(c, Q.fr.nc, s.x + s.w / 2, s.y + 100, '#8d6e63', '9px sans-serif')
}

function drawXT(c) {
  const s = SLOTS.find(x => x.id === 'xt')
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#78909c'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  rect(c, 280, 261, 72, 40, '#f7f9e6', '#c0ca33')
  rect(c, 360, 261, 240, 40, '#f5f5f5', '#37474f')
  txt(c, 'PE 接地', 316, 277, '#827717', 'bold 11px sans-serif')
  txt(c, '按钮控制线转接（SB0/SB1/SB2）', 480, 277, '#37474f', 'bold 10px sans-serif')
  txt(c, 'XT 端子排', s.x + s.w / 2, s.y - 6, '#37474f', 'bold 12px sans-serif')
}

function drawMotor(c, t) {
  const cx = 836, cy = 150
  circle(c, cx, cy, 50, '#f5f5f5', '#37474f', 3)
  txt(c, 'M', cx - 6, cy + 2, '#37474f', 'bold 32px sans-serif')
  txt(c, '3~', cx + 22, cy + 2, '#37474f', 'bold 15px sans-serif')
  txt(c, Q.motor.name, cx, cy + 26, '#546e7a', '10px sans-serif')
  const running = dbg.dir !== 'stop'
  if (running) {
    const dirSign = dbg.dir === 'fwd' ? 1 : -1
    c.save()
    c.translate(cx, cy + 2)
    c.rotate(dirSign * (Date.now() / 90) % (Math.PI * 2))
    c.strokeStyle = '#90a4ae'; c.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2
      line(c, 0, 0, Math.cos(a) * 24, Math.sin(a) * 24)
    }
    c.restore()
    txt(c, motorText.value, cx, cy + 44, '#2e7d32', 'bold 11px sans-serif')
    // 旋转方向箭头
    c.strokeStyle = '#2e7d32'; c.lineWidth = 3
    const a0 = dbg.dir === 'fwd' ? -0.5 : 0.5
    c.beginPath(); c.arc(cx, cy, 58, a0, a0 + dirSign * 1.4); c.stroke()
    const ax = cx + Math.cos(a0 + dirSign * 1.4) * 58
    const ay = cy + Math.sin(a0 + dirSign * 1.4) * 58
    line(c, ax, ay, ax - dirSign * 9, ay - 7)
    line(c, ax, ay, ax - dirSign * 12, ay + 5)
    txt(c, dbg.dir === 'fwd' ? '正转' : '反转', cx, cy - 62, '#2e7d32', 'bold 11px sans-serif')
  } else {
    txt(c, '停止', cx, cy + 44, '#90a4ae', '11px sans-serif')
  }
  txt(c, Q.motor.spec, cx, 246, '#78909c', '10px sans-serif')
  // 接线盒端子标识
  txt(c, 'U', 795, 232, '#f9a825', 'bold 10px sans-serif')
  txt(c, 'V', 830, 232, '#43a047', 'bold 10px sans-serif')
  txt(c, 'W', 865, 232, '#e53935', 'bold 10px sans-serif')
  txt(c, 'PE', 886, 168, '#827717', 'bold 10px sans-serif')
}

function drawButtons(c, t) {
  rect(c, 270, 335, 400, 68, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(270, 335, 400, 68)
  txt(c, '按钮组 SB', 280, 400, '#90a4ae', '10px sans-serif', 'left')
  const hi = dbg.on ? .5 + .5 * Math.sin(t / 200) : 0
  // SB0 停止（常闭 · 红）
  circle(c, 327, 368, 14, '#ef5350', '#b71c1c', 2)
  txt(c, 'SB0', 327, 372, '#fff', 'bold 10px sans-serif')
  txt(c, '停止·常闭', 327, 398, '#c62828', '9px sans-serif')
  // SB1 正转（常开 · 绿）
  circle(c, 417, 368, 14, '#66bb6a', '#2e7d32', 2)
  txt(c, 'SB1', 417, 372, '#fff', 'bold 10px sans-serif')
  txt(c, '正转·常开', 417, 398, '#2e7d32', '9px sans-serif')
  // SB2 反转（常开 · 蓝）
  circle(c, 507, 368, 14, '#1e88e5', '#0d47a1', 2)
  txt(c, 'SB2', 507, 372, '#fff', 'bold 10px sans-serif')
  txt(c, '反转·常开', 507, 398, '#0d47a1', '9px sans-serif')
  // 互锁示意
  rect(c, 560, 345, 100, 46, '#eceff1', '#546e7a')
  txt(c, 'KM1⇄KM2', 610, 360, '#37474f', '9px sans-serif')
  txt(c, '电气互锁', 610, 373, '#b71c1c', 'bold 9px sans-serif')
  txt(c, '常闭互串', 610, 386, '#37474f', '9px sans-serif')
  if (dbg.on) {
    c.strokeStyle = `rgba(46,125,50,${hi})`
    c.lineWidth = 3
    c.strokeRect(272, 337, 396, 64)
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
    } else if ((phase.value === 2 || phase.value === 3) && pendId.value) {
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
  txt(c, '三相异步电动机正反转控制实训区（互锁教学）', W / 2, 30, 'rgba(30,45,60,.75)', 'bold 18px sans-serif')
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

/* ---- K31-05 新增 ---- */
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 14px; margin: 10px 0; }
.grid3 .grp { background: #eef4fa; border: 1.5px dashed #9db6cc; border-radius: 10px; padding: 10px; }
.mtr { display: flex; justify-content: space-between; align-items: center; background: #263238; border-radius: 8px; padding: 7px 10px; margin: 8px 0; font-family: Consolas, monospace; }
.mtr-mode { color: #8bc34a; font-weight: 700; font-size: 12px; }
.mtr-read { color: #8bc34a; font-weight: 700; font-size: 13px; }
.on-c { color: #2e7d32; }
.bad-c { color: #c62828; }
.ct-note { background: #fff3e0; border-left: 4px solid #ef6c00; padding: 7px 11px; font-size: 12px; color: #4e342e; border-radius: 4px; margin: 8px 0; }
.fault-lib li { font-size: 11.5px; color: #78909c; }
.sbm { border-color: #1565c0; }
.sb2 { border-color: #0d47a1; }
.interlock-note { background: #ffebee; border-left: 4px solid #c62828; padding: 7px 11px; font-size: 12px; color: #7f1d1d; border-radius: 4px; margin: 8px 0 0; }
</style>

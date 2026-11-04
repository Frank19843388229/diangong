<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K31-01 · 低压配电箱安装接线</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>违规 <b>{{ violations.length }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <div class="banner" v-if="screen === 'play'">
          <b>任务 {{ phase + 1 }}/8 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⚠ 存在严重安全风险 —— 任务暂停，请重新执行安全步骤</div>

        <!-- 左侧托盘：标识牌（任务4） / 元器件（任务5） -->
        <div class="tray" v-if="screen === 'play' && phase === 3">
          <div class="tray-title">标识牌</div>
          <div
            v-for="c in labelChips" :key="c.id + '-' + chipVer" v-show="!c.placed"
            class="chip" :class="'chip-' + c.id"
            @pointerdown="e => startDrag(e, (x, y, r) => labelDrop(c, x, y, r))"
          >{{ c.id }}</div>
          <p class="tray-tip">拖动标识到对应母线排</p>
        </div>

        <div class="tray" v-if="screen === 'play' && phase === 4">
          <div class="tray-title">元件存放区</div>
          <div
            v-for="c in compChips" :key="c.key + '-' + chipVer" v-show="!placed[c.key]"
            class="chip chip-comp"
            @pointerdown="e => startDrag(e, (x, y, r) => compDrop(c, x, y, r))"
          >{{ c.code }}<br>{{ c.label }}</div>
          <p class="tray-tip">拖到配电箱导轨对应位置</p>
        </div>

        <!-- 任务面板 -->
        <div class="panel">
          <div class="sheet" :class="{ 'sheet-tall': phase === 0 || phase === 1 || phase === 7, folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>

            <div v-show="sheetOpen" class="fold-area">
            <!-- 任务1：选择工具仪表 -->
            <div v-if="phase === 0" class="sheet-body">
              <h3>任务 1：选择电工工具和仪器仪表（10分）</h3>
              <p class="tip">进入器材摆放架，勾选本任务<b>安装接线</b>所需的工具与仪表。无关工具扣分，<b>明显不合格的工具属严重违规</b>。</p>
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
                <span class="hint">正确答案：螺丝刀 · 剥线钳 · 压线钳 · 电工刀 · 数字万用表</span>
              </div>
            </div>

            <!-- 任务2：选择元器件和导线 -->
            <div v-if="phase === 1" class="sheet-body">
              <h3>任务 2：选择元器件和导线（15分）</h3>
              <p class="tip">根据电路图（电源 → 断路器 → 漏电保护器 → 接线端子 → 负载）选择元器件，并确定 L / N / PE 导线颜色。</p>
              <div class="grid2">
                <div class="grp">
                  <div class="glabel">元器件</div>
                  <label v-for="o in compList" :key="o" class="chk" :class="{ sel: parts.sel.includes(o) }">
                    <input type="checkbox" :value="o" v-model="parts.sel">
                    <img v-if="imgUrl(o)" class="thumb" :src="imgUrl(o)" alt="">{{ o }}
                  </label>
                </div>
                <div class="grp">
                  <div class="glabel">导线选择（线色）</div>
                  <div v-for="k in ['L', 'N', 'PE']" :key="k" class="crow">
                    <span class="cname">{{ k }}线（{{ k === 'L' ? '火线' : k === 'N' ? '零线' : '保护地线' }}）</span>
                    <button
                      v-for="c in COLORS" :key="c" class="opt"
                      :class="{ sel: colors[k] === c, ['sw-' + swatch(c)]: true }"
                      @click="colors[k] = c; beep(520, .04)"
                    >{{ c }}</button>
                  </div>
                </div>
              </div>
              <div class="row">
                <button class="btn primary" @click="confirmParts">确认选择</button>
                <span class="hint">规范：L=红色 · N=蓝色 · PE=黄绿双色</span>
              </div>
            </div>

            <!-- 任务3：安装接地母线 -->
            <div v-if="phase === 2" class="sheet-body">
              <h3>任务 3：安装接地母线（15分）</h3>
              <p class="tip">按工艺顺序完成：<b>截取导线 → 制作环形端子（剥线/套端子/压接/检查） → 固定（螺栓/垫片/螺母紧固）</b>。顺序错误不予计分。</p>
              <div class="steps">
                <button
                  v-for="(s, i) in GROUND_STEPS" :key="s.k" class="step"
                  :class="{ done: ground.n > i, next: ground.n === i }"
                  @click="groundStep(i)"
                >{{ ground.n > i ? '√' : i + 1 }}. {{ s.label }}</button>
              </div>
              <p class="status">当前步骤：<b>{{ ground.n < GROUND_STEPS.length ? GROUND_STEPS[ground.n].label : '已完成' }}</b>　进度 {{ ground.n }}/8　得分 {{ cats['接地母线'].got }}/15</p>
            </div>

            <!-- 任务4：零地线标识 -->
            <div v-if="phase === 3" class="sheet-body">
              <h3>任务 4：零线排、地线排标识（10分）</h3>
              <p class="tip">将左侧<b>标识牌</b>拖动到配电箱内对应的母线排上：<b>N</b> 为零线排（蓝色），<b>PE</b> 为地线排（黄绿）。N、PE 混淆将触发安全提示。</p>
              <p class="status">已粘贴：零线排 N <i>{{ labels.N ? '√' : '○' }}</i>　地线排 PE <i>{{ labels.PE ? '√' : '○' }}</i>　得分 {{ cats['零地标识'].got }}/10</p>
            </div>

            <!-- 任务5：安装元器件并规范接线 -->
            <div v-if="phase === 4" class="sheet-body">
              <h3>任务 5：安装元器件并规范接线（25分）</h3>
              <p class="tip">先将左侧元器件拖到导轨对应位置；再选择<b>导线线种</b>，依次点击<b>两个接线端子</b>完成接线（线种必须与回路一致）。</p>
              <div class="row">
                <span class="cname">手持导线：</span>
                <button v-for="k in ['L', 'N', 'PE']" :key="k" class="btn wire-btn" :class="['tw-' + k, { sel: wireType === k }]" @click="wireType = k; pendId = ''; beep(520, .04)">
                  {{ k }}线（{{ wireColorName(k) }}）
                </button>
              </div>
              <div class="row">
                <button class="btn" :disabled="!selWireId" @click="deleteSelWire">拆除选中导线</button>
                <button class="btn primary" @click="submitWiring">提交接线检查</button>
                <span class="status inline">元件 <b>{{ placedCount }}/3</b>　接线 <b>{{ rightWireCount }}/10</b><template v-if="pendId">　已选端子：<b>{{ TMAP[pendId].name }}</b></template><template v-if="selWireId">　已选中导线（可拆除）</template></span>
              </div>
            </div>

            <!-- 任务6：检查电路 -->
            <div v-if="phase === 5" class="sheet-body">
              <h3>任务 6：检查电路（15分）</h3>
              <p class="tip">先完成<b>外观检查</b>（4项），再用万用表<b>通断测试档</b>对检测区域进行 3 项测量。</p>
              <div class="grid2">
                <div class="grp">
                  <div class="glabel">外观检查（{{ lookDone }}/4）</div>
                  <label v-for="it in look.items" :key="it.k" class="chk" :class="{ sel: it.done }" @click.prevent="checkLook(it)">
                    {{ it.done ? '√' : '□' }} {{ it.k }}
                  </label>
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
                  <p class="probe-tip">点击配电箱内两个接线端子进行测量（探针：<b>{{ probeA ? TMAP[probeA].name : '未选择' }}</b>）</p>
                  <ul class="test-list">
                    <li v-for="t in meter.tests" :key="t.id" :class="{ done: t.done }">{{ t.done ? '√' : '○' }} {{ t.desc }}（应{{ t.expect }}）</li>
                  </ul>
                </div>
              </div>
              <div class="row">
                <button class="btn primary" :disabled="!canFinishCheck" @click="finishCheck">完成检查，进入拆除阶段</button>
                <span class="hint">外观 {{ lookDone }}/4 · 测试 {{ testDone }}/3 · 得分 {{ cats['电路检查'].got }}/15</span>
              </div>
            </div>

            <!-- 任务7：拆除电路 -->
            <div v-if="phase === 6" class="sheet-body">
              <h3>任务 7：拆除电路（5分）</h3>
              <p class="tip">严格按顺序操作：<b>断电确认 → 拆除导线 → 拆除元件 → 分类整理</b>。<b>禁止带电拆线、强行拉扯导线与强行拆卸设备。</b>断电确认后可直接<b>点击画布上的导线</b>动手拆除。</p>
              <div class="steps">
                <button
                  v-for="(s, i) in DEMO_STEPS" :key="s" class="step"
                  :class="{ done: demo.step > i, next: demo.step === i }"
                  @click="demoStep(i)"
                >{{ demo.step > i ? '√' : i + 1 }}. {{ s }}</button>
              </div>
              <p class="status">箱内电源：<i :class="{ off: !demo.power }">{{ demo.power ? '带电（红色指示灯亮）' : '已断电' }}</i>　得分 {{ cats['拆除电路'].got }}/5</p>
            </div>

            <!-- 任务8：整理场地 -->
            <div v-if="phase === 7" class="sheet-body">
              <h3>任务 8：整理场地（5分）</h3>
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
            <div class="lv-code">030101-K31-01</div>
            <h2>低压配电箱安装接线</h2>
            <p class="sub">低压电工考证综合实训 · 安装接线类 · 8项任务 · 满分100分 · 难度 ★★★★☆</p>
            <div class="objs">
              <p>训练目标：根据给定电路图，完成低压配电箱的工具选择、元器件与导线选择、接地母线制作安装、零地线标识、元器件安装接线、通电前检查、拆除恢复全过程。</p>
              <ul>
                <li>选择电工工具和仪器仪表（10）</li>
                <li>选择元器件和导线（15）</li>
                <li>安装接地母线（15）</li>
                <li>零线排、地线排标识（10）</li>
                <li>安装元器件并规范接线（25）</li>
                <li>检查电路（15）</li>
                <li>拆除电路（5）</li>
                <li>整理场地（5）</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 重大违规（立即停止并扣分）：带电接线/拆线 · 未安装保护接地 · L/N/PE 严重接错 · 使用明显不合格工具 · 强行拆卸设备</p>
            <button class="btn primary big" @click="startGame">开始训练</button>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K31-01</div>
            <h2>低压配电箱安装接线</h2>
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
              <h4>任务完成记录</h4>
              <table class="mini-table">
                <tr v-for="(p, i) in PHASES" :key="i">
                  <td>任务{{ i + 1 }} {{ p.name }}</td>
                  <td>{{ cats[p.cat].got }}/{{ cats[p.cat].max }}</td>
                </tr>
              </table>
            </div>
            <div class="record-sec">
              <h4>安全记录</h4>
              <p>重大违规：{{ violations.length }} 次</p>
              <p v-if="violations.length">· {{ violations.join('；') }}</p>
              <p>操作失误：{{ mistakes }} 次</p>
            </div>
            <div class="row center">
              <button class="btn primary" @click="startGame">重新训练</button>
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
const BX = 270, BY = 55, BW = 660, BH = 370 // 配电箱

const PHASES = [
  { name: '选择电工工具和仪器仪表', cat: '工具仪表', obj: '正确选择 5 项所需工具仪表' },
  { name: '选择元器件和导线', cat: '元件导线', obj: '按电路图选择元器件与 L/N/PE 线色' },
  { name: '安装接地母线', cat: '接地母线', obj: '按工艺顺序完成 8 个步骤' },
  { name: '零线排、地线排标识', cat: '零地标识', obj: '将 N / PE 标识粘贴到正确母线排' },
  { name: '安装元器件并规范接线', cat: '安装接线', obj: '3 个元件就位 · 10 条导线正确连接' },
  { name: '检查电路', cat: '电路检查', obj: '外观检查 4 项 + 通断测试 3 项' },
  { name: '拆除电路', cat: '拆除电路', obj: '断电确认 → 拆线 → 拆件 → 整理' },
  { name: '整理场地', cat: '现场整理', obj: '工具仪表归位 · 废线清理 · 台面清洁' },
]

const cats = reactive({
  '工具仪表': { got: 0, max: 10 },
  '元件导线': { got: 0, max: 15 },
  '接地母线': { got: 0, max: 15 },
  '零地标识': { got: 0, max: 10 },
  '安装接线': { got: 0, max: 25 },
  '电路检查': { got: 0, max: 15 },
  '拆除电路': { got: 0, max: 5 },
  '现场整理': { got: 0, max: 5 },
})

// ================= 任务1 数据 =================
const toolList = [
  { n: '螺丝刀' }, { n: '剥线钳' }, { n: '压线钳' }, { n: '电工刀' },
  { n: '尖嘴钳' }, { n: '活动扳手' }, { n: '绝缘破损的剥线钳（不合格）', bad: true },
]
const meterList = [{ n: '数字万用表' }, { n: '验电笔' }, { n: '兆欧表' }, { n: '钳形电流表' }]
const REQ_TOOLS = ['螺丝刀', '剥线钳', '压线钳', '电工刀', '数字万用表']

// ================= 任务2 数据 =================
const compList = ['断路器', '漏电保护器', '接线端子', '指示灯', '接触器', '熔断器']
const REQ_COMPS = ['断路器', '漏电保护器', '接线端子']
const COLORS = ['红色', '蓝色', '绿色', '黄绿双色', '黄色', '黑色']
const REQ_COLORS = { L: '红色', N: '蓝色', PE: '黄绿双色' }

// ================= 任务3 数据 =================
const GROUND_STEPS = [
  { k: 'cut', label: '截取接地导线', pts: 3 },
  { k: 'strip', label: '剥线', pts: 2 },
  { k: 'lug', label: '套端子', pts: 2 },
  { k: 'crimp', label: '压接', pts: 2 },
  { k: 'check', label: '检查牢固', pts: 1 },
  { k: 'bolt', label: '放入螺栓', pts: 2 },
  { k: 'washer', label: '加装垫片', pts: 1 },
  { k: 'nut', label: '螺母紧固', pts: 2 },
]

// ================= 配电箱布局：导轨槽位 =================
const SLOTS = [
  { id: 'qf', name: '断路器', x: 320, y: 150, w: 90, h: 120 },
  { id: 'rcd', name: '漏电保护器', x: 445, y: 150, w: 110, h: 120 },
  { id: 'term', name: '接线端子', x: 580, y: 160, w: 130, h: 100 },
]

// ================= 接线端子 =================
const TERMS = [
  { id: 'lin', x: 330, y: 105, type: 'L', name: '电源L进线' },
  { id: 'nin', x: 395, y: 105, type: 'N', name: '电源N进线' },
  { id: 'pein', x: 460, y: 105, type: 'PE', name: '电源PE进线' },
  { id: 'qf_in', x: 365, y: 150, type: 'L', name: '断路器进线', owner: 'qf' },
  { id: 'qf_out', x: 365, y: 270, type: 'L', name: '断路器出线', owner: 'qf' },
  { id: 'rcd_l_in', x: 540, y: 150, type: 'L', name: '漏保L进线', owner: 'rcd' },
  { id: 'rcd_l_out', x: 540, y: 270, type: 'L', name: '漏保L出线', owner: 'rcd' },
  { id: 'rcd_n_in', x: 460, y: 150, type: 'N', name: '漏保N进线', owner: 'rcd' },
  { id: 'rcd_n_out', x: 460, y: 270, type: 'N', name: '漏保N出线', owner: 'rcd' },
  { id: 'term_l_in', x: 615, y: 160, type: 'L', name: '端子排L进', owner: 'term' },
  { id: 'term_n_in', x: 675, y: 160, type: 'N', name: '端子排N进', owner: 'term' },
  { id: 'term_l_out', x: 615, y: 260, type: 'L', name: '端子排L出', owner: 'term' },
  { id: 'term_n_out', x: 675, y: 260, type: 'N', name: '端子排N出', owner: 'term' },
  { id: 'nbus_top', x: 790, y: 165, type: 'N', name: 'N排上端' },
  { id: 'nbus_bot', x: 790, y: 285, type: 'N', name: 'N排下端' },
  { id: 'pebus_top', x: 870, y: 165, type: 'PE', name: 'PE排上端', need: 'pe' },
  { id: 'pebus_bot', x: 870, y: 285, type: 'PE', name: 'PE排下端', need: 'pe' },
  { id: 'box_gnd', x: 900, y: 386, type: 'PE', name: '箱体接地点' },
  { id: 'load_l', x: 345, y: 350, type: 'L', name: '负载L端子' },
  { id: 'load_n', x: 415, y: 350, type: 'N', name: '负载N端子' },
]
const TMAP = Object.fromEntries(TERMS.map(t => [t.id, t]))

// 标准接线关系（10 条）
const REQ_WIRES = [
  { a: 'lin', b: 'qf_in', type: 'L' },
  { a: 'qf_out', b: 'rcd_l_in', type: 'L' },
  { a: 'rcd_l_out', b: 'term_l_in', type: 'L' },
  { a: 'term_l_out', b: 'load_l', type: 'L' },
  { a: 'nin', b: 'nbus_top', type: 'N' },
  { a: 'nbus_bot', b: 'rcd_n_in', type: 'N' },
  { a: 'rcd_n_out', b: 'term_n_in', type: 'N' },
  { a: 'term_n_out', b: 'load_n', type: 'N' },
  { a: 'pein', b: 'pebus_top', type: 'PE' },
  { a: 'pebus_bot', b: 'box_gnd', type: 'PE' },
]

// ================= 任务6/7 数据 =================
const MODES = ['通断测试', '电压档', '电阻档', '兆欧表']
const DEMO_STEPS = ['断电确认', '拆除导线', '拆除元件', '分类整理']

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
  if (t >= 90) return '具备低压配电箱安装与接线能力'
  if (t >= 80) return '基本具备低压配电箱安装与接线能力，注意接线工艺'
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
  msgTimer = setTimeout(() => { msgType.value = '' }, 2800)
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
    showMsg('✔ 工具仪表选择符合安装要求', 'good')
    completePhase()
  } else {
    tools.penalty += p
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    const parts = []
    if (miss.length) parts.push('缺少 ' + miss.join('、'))
    if (extra.length) parts.push('多选 ' + extra.join('、'))
    showMsg(`工具选择不符合安装要求：${parts.join('；')}（-${p} 分，请重新选择）`, 'warn')
  }
}

// ================= 任务2：元器件与导线 =================
const parts = reactive({ sel: [], penalty: 0 })
const colors = reactive({ L: '', N: '', PE: '' })
function swatch(c) {
  return { '红色': 'red', '蓝色': 'blue', '绿色': 'green', '黄绿双色': 'pe', '黄色': 'yellow', '黑色': 'black' }[c] || ''
}
function wireColorName(k) { return { L: '红', N: '蓝', PE: '黄绿' }[k] }
function confirmParts() {
  if (paused.value || lock.value) return
  const sel = new Set(parts.sel)
  let p = 0; const miss = [], extra = []
  for (const r of REQ_COMPS) if (!sel.has(r)) { p += 2; miss.push(r) }
  for (const n of sel) if (!REQ_COMPS.includes(n)) { p += 2; extra.push(n) }
  for (const k of ['L', 'N', 'PE']) if (colors[k] !== REQ_COLORS[k]) { p += 2 }
  if (!p) {
    setScore('元件导线', 15)
    showMsg('✔ 型号正确 · 规格匹配 · 颜色正确', 'good')
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
    if (colors.L !== REQ_COLORS.L || colors.N !== REQ_COLORS.N || colors.PE !== REQ_COLORS.PE) parts2.push('线色不规范（L红/N蓝/PE黄绿双色）')
    showMsg(`选择不符合电路图：${parts2.join('；')}（-${p} 分）`, 'warn')
  }
}

// ================= 任务3：接地母线 =================
const ground = reactive({ n: 0, done: false })
function groundStep(i) {
  if (paused.value || lock.value) return
  if (ground.done) return
  if (i < ground.n) { showMsg('该步骤已完成', 'info'); return }
  if (i !== ground.n) {
    mistakes.value++
    noteMistake()
    beep(200, .12, 'sawtooth')
    showMsg(`操作顺序不规范：当前应进行「${GROUND_STEPS[ground.n].label}」`, 'warn')
    return
  }
  const s = GROUND_STEPS[i]
  addScore('接地母线', s.pts)
  ground.n++
  beep(760, .07)
  if (ground.n === GROUND_STEPS.length) {
    ground.done = true
    showMsg('✔ 环形端子压接牢固，接地母线安装可靠', 'good')
    completePhase()
  } else {
    showMsg(`✔ ${s.label} 完成　+${s.pts} 分`, 'good')
  }
}

// ================= 任务4：零地标识 =================
const labels = reactive({ N: false, PE: false })
const labelChips = reactive([{ id: 'N', placed: false }, { id: 'PE', placed: false }])
const chipVer = ref(0)
function labelDrop(chip, x, y, restore) {
  if (paused.value || lock.value) return restore()
  const p = toCanvas({ clientX: x, clientY: y })
  // 带容差 + 最近优先：两块母线排本来就靠得近，只放宽容差会互相抢判定
  const pad = padToCanvas(DROP_PAD, canvasRef.value.getBoundingClientRect(), W)
  const hit = nearestBox(p, [
    { id: 'N', x: 735, y: 150, w: 110, h: 160 },
    { id: 'PE', x: 815, y: 150, w: 110, h: 160 },
  ], pad)
  const targetOk = !!hit && hit.id === chip.id
  if (targetOk) {
    chip.placed = true
    labels[chip.id] = true
    addScore('零地标识', 5)
    beep(760, .08)
    showMsg(`✔ ${chip.id === 'N' ? '零线排 N' : '地线排 PE'} 标识粘贴正确　+5 分`, 'good')
    if (labels.N && labels.PE) completePhase()
  } else if (hit) {
    penalize('零地标识', 2)
    beep(120, .4, 'sawtooth')
    showMsg('N、PE 标识混淆 —— 触发安全提示，请粘贴到正确母线排（-2 分）', 'bad')
    restore()
  } else {
    restore()
    showMsg('请将标识牌粘贴到配电箱内对应母线排上', 'info')
  }
}

// ================= 任务5：元件安装与接线 =================
const compChips = reactive([
  { key: 'qf', code: 'QF', label: '断路器' },
  { key: 'rcd', code: 'RCD', label: '漏电保护器' },
  { key: 'term', code: 'XT', label: '接线端子' },
])
const placed = reactive({ qf: false, rcd: false, term: false })
const wires = ref([])
const wireType = ref('L')
const pendId = ref('')
const selWireId = ref('')
let wid = 0
const placedCount = computed(() => Object.values(placed).filter(Boolean).length)
const rightWireCount = computed(() => REQ_WIRES.filter(r => findWire(r)).length)

function findWire(r) {
  return wires.value.find(w =>
    (w.a === r.a && w.b === r.b) || (w.a === r.b && w.b === r.a))
}
function termActive(t) {
  if (t.owner && !placed[t.owner]) return false
  if (t.need === 'pe' && !ground.done) return false
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
    showMsg(`元件位置不合理：「${chip.label}」应安装在导轨的「${SLOTS.find(s => s.id === chip.key).name}」位置`, 'warn')
    restore()
    return
  }
  placed[chip.key] = true
  beep(760, .08)
  showMsg(`✔ ${chip.label} 安装牢固、排列整齐`, 'good')
}
function tryConnect(a, b) {
  if (a.type !== b.type) {
    majorViolation(`L/N/PE 严重接错：${a.name}（${a.type}）与 ${b.name}（${b.type}）直接相连，存在短路风险`, '安装接线', 4)
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
    return
  }
  wires.value.push({ id: ++wid, a: a.id, b: b.id, type: a.type, wrong: false })
  beep(760, .07)
  showMsg(`✔ 接线正确：${a.name} → ${b.name}（${wireColorName(a.type)}线）`, 'good')
}
function deleteSelWire() {
  const w = wires.value.find(x => x.id === selWireId.value)
  if (!w) return
  wires.value = wires.value.filter(x => x.id !== selWireId.value)
  selWireId.value = ''
  beep(320, .08)
  showMsg('已拆除选中导线', 'info')
}
function submitWiring() {
  if (paused.value || lock.value) return
  const missComp = SLOTS.filter(s => !placed[s.id])
  if (missComp.length) {
    showMsg(`请先将「${missComp.map(s => s.name).join('、')}」安装到导轨上`, 'warn')
    return
  }
  const peOk = REQ_WIRES.filter(r => r.type === 'PE').every(r => findWire(r))
  if (!peOk) {
    majorViolation('未安装保护接地：PE 保护导体未可靠连接，禁止进入下一工序', '安装接线', 4)
    return
  }
  const right = rightWireCount.value
  const wrongN = wires.value.filter(w => w.wrong).length
  const craft = (right === REQ_WIRES.length && wrongN === 0) ? 6 : 0
  setScore('安装接线', 9 + right + craft)
  if (right === REQ_WIRES.length && wrongN === 0) {
    showMsg('✔ 接线正确 · 端子压接可靠 · 导线编号齐全', 'good')
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

// ================= 任务6：检查电路 =================
const look = reactive({ items: [{ k: '元件固定', pts: 2, done: false }, { k: '接线端子', pts: 2, done: false }, { k: '导线排列', pts: 1, done: false }, { k: '标识', pts: 1, done: false }] })
const lookDone = computed(() => look.items.filter(i => i.done).length)
function checkLook(it) {
  if (it.done || paused.value || lock.value) return
  it.done = true
  addScore('电路检查', it.pts)
  beep(700, .06)
  showMsg(`✔ 外观检查：${it.k} 合格　+${it.pts} 分`, 'good')
}
const meter = reactive({
  mode: '',
  readout: '',
  tests: [
    { id: 't1', pair: ['lin', 'nin'], expect: '不通', desc: 'L-N 之间无短路', done: false },
    { id: 't2', pair: ['lin', 'load_l'], expect: '通', desc: 'L 回路通断', done: false },
    { id: 't3', pair: ['pebus_top', 'box_gnd'], expect: '通', desc: 'PE 接地连续性', done: false },
  ],
})
const testDone = computed(() => meter.tests.filter(t => t.done).length)
const canFinishCheck = computed(() => lookDone.value === 4 && testDone.value === 3)
const probeA = ref('')
function chooseMode(m) {
  if (m !== '通断测试') {
    penalize('电路检查', 1)
    beep(200, .12, 'sawtooth')
    showMsg(`检测方法不正确：通断检查应使用万用表「通断测试」档（-1 分）`, 'warn')
    return
  }
  meter.mode = m
  beep(700, .06)
  showMsg('✔ 已选择通断测试档（蜂鸣档），点击两个接线端子测量', 'good')
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
  test.done = true
  meter.readout = test.expect === '通' ? '0.4 Ω ── 通路（蜂鸣）' : 'OL ── 不通'
  addScore('电路检查', 3)
  beep(880, .15)
  showMsg(`✔ ${test.desc}：实测${test.expect}　+3 分`, 'good')
}
function finishCheck() {
  if (!canFinishCheck.value || lock.value) return
  showMsg('电路检查完成，允许进入拆除阶段', 'good')
  completePhase()
}

// ================= 任务7：拆除电路 =================
const demo = reactive({ step: 0, power: true })
function demoStep(i) {
  if (paused.value || lock.value) return
  if (i < demo.step) { showMsg('该步骤已完成', 'info'); return }
  if (i === 0) {
    if (demo.step === 0) {
      demo.power = false
      demo.step = 1
      addScore('拆除电路', 1)
      beep(700, .06)
      showMsg('✔ 断电确认完成，箱内电源已断开　+1 分', 'good')
    } else showMsg('已确认断电', 'info')
    return
  }
  if (i === 1) {
    if (demo.step === 0) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 2); return }
    if (demo.step > 1) { showMsg('导线已全部拆除', 'info'); return }
    wires.value = []
    probeA.value = ''
    demo.step = 2
    addScore('拆除电路', 2)
    beep(700, .06)
    showMsg('✔ 导线全部拆除并按线色分类盘绕　+2 分', 'good')
    return
  }
  if (i === 2) {
    if (demo.step === 0) { majorViolation('带电拆线：未断电确认即进行拆除作业', '拆除电路', 2); return }
    if (demo.step === 1) { majorViolation('强行拆卸设备：导线未拆除即拆卸元件', '拆除电路', 2); return }
    if (demo.step > 2) { showMsg('元件已全部拆除', 'info'); return }
    placed.qf = placed.rcd = placed.term = false
    demo.step = 3
    addScore('拆除电路', 1)
    beep(700, .06)
    showMsg('✔ 元件拆除完成，未强行拉扯导线　+1 分', 'good')
    return
  }
  if (i === 3) {
    if (demo.step < 3) { showMsg('请先按顺序完成断电确认与拆除作业', 'warn'); return }
    demo.step = 4
    addScore('拆除电路', 1)
    showMsg('✔ 元器件分类整理完成　+1 分', 'good')
    completePhase()
  }
}

// ================= 任务8：整理场地 =================
const tidyItems = reactive([
  { k: '工具归位', done: false }, { k: '仪表归位', done: false }, { k: '元器件分类', done: false },
  { k: '废线清理', done: false }, { k: '工作台清洁', done: false },
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
  if (tidyDone.value < 5) { showMsg('请先完成全部现场整理项目（' + tidyDone.value + '/5）', 'warn'); return }
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
  tools.sel = []; tools.penalty = 0
  parts.sel = []; parts.penalty = 0; colors.L = ''; colors.N = ''; colors.PE = ''
  ground.n = 0; ground.done = false
  labels.N = false; labels.PE = false
  labelChips.forEach(c => { c.placed = false })
  compChips.forEach(c => { c.placed = false })
  chipVer.value++
  placed.qf = placed.rcd = placed.term = false
  wires.value = []
  wireType.value = 'L'
  pendId.value = ''
  selWireId.value = ''
  look.items.forEach(i => { i.done = false })
  meter.mode = ''; meter.readout = ''
  meter.tests.forEach(t => { t.done = false })
  probeA.value = ''
  demo.step = 0; demo.power = true
  tidyItems.forEach(i => { i.done = false })
}
function startGame() {
  runId++
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}
// ================= 坐标换算 =================
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
  if (phase.value === 4) {
    // 端子优先判定：已接好的导线端点正好落在端子上，若先判导线会导致同一端子的后续接线无法点击
    const t = hitTerminal(p.x, p.y)
    if (t) {
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
    return
  }
  if (phase.value === 5) {
    const t = hitTerminal(p.x, p.y)
    if (t) probe(t)
    return
  }
  if (phase.value === 6) {
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
function txt(c, s, x, y, color = '#37474f', font = '12px sans-serif', align = 'center') {
  c.fillStyle = color; c.font = font; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'center'
}
function termColor(t) { return t.type === 'L' ? '#e53935' : t.type === 'N' ? '#1e88e5' : '#9ccc65' }
function wireColor(type) { return type === 'L' ? '#e53935' : type === 'N' ? '#1e88e5' : '#fdd835' }

function drawShelf(c) {
  rect(c, 16, 50, 215, 140, '#b08968', '#7d5a3c')
  line(c, 16, 122, 231, 122)
  txt(c, '器材摆放架', 123, 44, '#37474f', 'bold 13px sans-serif')
  rect(c, 34, 68, 10, 34, '#e53935'); rect(c, 37, 102, 4, 16, '#90a4ae')
  c.strokeStyle = '#546e7a'; c.lineWidth = 4
  line(c, 70, 70, 84, 104); line(c, 88, 70, 74, 104)
  rect(c, 104, 74, 40, 12, '#37474f'); rect(c, 138, 86, 6, 26, '#546e7a')
  rect(c, 158, 88, 42, 8, '#8d6e63'); rect(c, 196, 86, 10, 12, '#6d4c41')
  rect(c, 40, 134, 62, 42, '#263238', '#111')
  rect(c, 48, 140, 46, 16, '#8bc34a')
  c.fillStyle = '#eceff1'; c.beginPath(); c.arc(71, 170, 8, 0, Math.PI * 2); c.fill()
  rect(c, 120, 146, 8, 30, '#fdd835'); rect(c, 122, 176, 4, 8, '#90a4ae')
  rect(c, 150, 150, 44, 24, '#78909c', '#455a64')
}
function drawPartsShelf(c) {
  rect(c, 16, 210, 215, 210, '#a8825f', '#7d5a3c')
  txt(c, phase.value === 5 ? '检测工作台' : '元件存放区', 123, 204, '#37474f', 'bold 13px sans-serif')
  if (phase.value === 4) return
  if (phase.value === 5) { drawBenchMeter(c); return }
  const boxes = [
    ['断路器', 28, 224], ['漏电保护器', 132, 224], ['接线端子', 28, 288],
    ['接触器', 132, 288], ['熔断器', 28, 352], ['指示灯', 132, 352],
  ]
  for (const [name, x, y] of boxes) {
    rect(c, x, y, 86, 52, '#d7ccc8', '#5d4037')
    // 上方放器材图（没加载好就继续用色块兜底），下方留一行小字标注
    if (!drawImgFit(c, name, x + 3, y + 2, 80, 34, { card: true, r: 3 })) {
      txt(c, name, x + 43, y + 22, '#4e342e', 'bold 11px sans-serif')
    }
    txt(c, name, x + 43, y + 48, '#4e342e', 'bold 10px sans-serif')
  }
}
// 任务6：数字万用表（画在左侧检测台上，避免被底部任务面板遮挡）
function drawBenchMeter(c) {
  const on = meter.mode === '通断测试'
  // 表体
  rect(c, 30, 232, 188, 122, '#263238', '#111')
  // LCD
  rect(c, 42, 244, 164, 40, on ? '#8bc34a' : '#37474f')
  txt(c, on ? (meter.readout || 'OL') : '未选择档位', 124, 270, on ? '#1b2630' : '#90a4ae', 'bold 12px Consolas, monospace')
  // 档位旋钮
  c.fillStyle = '#b0bec5'
  c.beginPath(); c.arc(72, 320, 19, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#37474f'; c.lineWidth = 4
  line(c, 72, 320, 72, 306)
  txt(c, on ? '通断' : '档位', 72, 349, on ? '#8bc34a' : '#90a4ae', '10px sans-serif')
  // 表笔插孔
  c.fillStyle = '#e53935'
  c.beginPath(); c.arc(148, 312, 7, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#212121'
  c.beginPath(); c.arc(176, 312, 7, 0, Math.PI * 2); c.fill()
  txt(c, 'V/Ω', 148, 336, '#90a4ae', '10px sans-serif')
  txt(c, 'COM', 176, 336, '#90a4ae', '10px sans-serif')
  // 表笔线
  c.strokeStyle = on ? '#e53935' : '#546e7a'; c.lineWidth = 2.5
  line(c, 148, 305, 140, 232)
  c.strokeStyle = on ? '#212121' : '#546e7a'
  line(c, 176, 305, 190, 232)
  // 标题 + 提示
  txt(c, '数字万用表', 124, 224, '#37474f', 'bold 12px sans-serif')
  txt(c, '选择档位后，点击两个端子测量', 124, 372, '#7d5a3c', '11px sans-serif')
}
function drawBenchAndBox(t) {
  const c = ctx.value
  rect(c, 250, 425, 694, 18, '#8b5a2b')
  rect(c, 262, 443, 14, 27, '#6f4520'); rect(c, 918, 443, 14, 27, '#6f4030')
  rect(c, BX, BY, BW, BH, '#78909c')
  rect(c, BX + 10, BY + 10, BW - 20, BH - 20, '#eceff1')
  c.strokeStyle = '#37474f'; c.lineWidth = 3; c.strokeRect(BX, BY, BW, BH)
  txt(c, '低压配电箱', BX + BW / 2, BY - 8, '#37474f', 'bold 14px sans-serif')
  if (phase.value === 6) {
    const on = demo.power
    c.fillStyle = on ? '#e53935' : '#90a4ae'
    c.beginPath(); c.arc(BX + 26, BY + 26, 8, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#37474f'; c.lineWidth = 2; c.stroke()
    txt(c, on ? '带电' : '断电', BX + 26, BY + 50, on ? '#c62828' : '#78909c', 'bold 11px sans-serif')
    if (on) {
      c.strokeStyle = `rgba(229,57,53,${.35 + .3 * Math.sin(t / 200)})`
      c.lineWidth = 2
      c.beginPath(); c.arc(BX + 26, BY + 26, 14 + 3 * Math.sin(t / 200), 0, Math.PI * 2); c.stroke()
    }
  }
  rect(c, 310, 192, 400, 12, '#b0bec5', '#78909c')
  for (let x = 320; x < 700; x += 30) rect(c, x, 196, 10, 4, '#78909c')
  for (const id of ['lin', 'nin', 'pein']) {
    const tt = TMAP[id]
    txt(c, id === 'lin' ? 'L' : id === 'nin' ? 'N' : 'PE', tt.x, tt.y - 16, termColor(tt), 'bold 13px sans-serif')
  }
  txt(c, '电源进线', 395, 80, '#546e7a', '11px sans-serif')
  rect(c, 775, 150, 30, 150, '#1e88e5')
  txt(c, 'N', 790, 140, '#1e88e5', 'bold 13px sans-serif')
  if (ground.done) {
    rect(c, 855, 150, 30, 150, '#fdd835')
    c.save(); c.strokeStyle = '#43a047'; c.lineWidth = 4; c.setLineDash([5, 9])
    for (let x = 860; x < 885; x += 8) line(c, x, 152, x, 298)
    c.restore()
    txt(c, 'PE', 870, 140, '#7cb342', 'bold 13px sans-serif')
    drawGroundProgress(c)
  } else {
    c.save()
    c.setLineDash([6, 6]); c.strokeStyle = '#b0bec5'; c.lineWidth = 2
    c.strokeRect(855, 150, 30, 150); c.restore()
    txt(c, '待安装', 870, 230, '#90a4ae', '11px sans-serif')
  }
  if (labels.N) { rect(c, 768, 312, 44, 24, '#fff', '#1e88e5'); txt(c, 'N', 790, 329, '#1e88e5', 'bold 14px sans-serif') }
  if (labels.PE) { rect(c, 848, 312, 44, 24, '#fff', '#7cb342'); txt(c, 'PE', 870, 329, '#43a047', 'bold 13px sans-serif') }
  // 任务4：未粘贴标识的落点提示
  if (phase.value === 3) {
    const bl = .55 + .35 * Math.sin(t / 240)
    if (!labels.N) hintPlate(c, 768, 312, 44, 24, 'N', bl)
    if (!labels.PE) hintPlate(c, 848, 312, 44, 24, 'PE', bl)
  }
  c.fillStyle = '#fdd835'; c.beginPath(); c.arc(900, 386, 8, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.stroke()
  txt(c, '箱壳', 900, 371, '#78909c', '10px sans-serif')
  rect(c, 310, 350, 140, 60, '#455a64')
  txt(c, '负载', 380, 386, '#fff', 'bold 14px sans-serif')
  // 任务5：未安装元件的槽位（拖拽目标提示）
  if (phase.value === 4) drawSlotHints(c, t)
  if (placed.qf) drawQF(c, SLOTS[0])
  if (placed.rcd) drawRCD(c, SLOTS[1])
  if (placed.term) drawTermBlock(c, SLOTS[2])
  for (const w of wires.value) drawWire(c, w)
  drawTerminals(c, t)
}
// 任务5：导轨空槽位的拖拽落点提示
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
    txt(c, '▼ 拖到此处', s.x + s.w / 2, s.y + s.h + 18, '#1a3fc4', 'bold 11px sans-serif')
  }
}
// 任务4：标识牌落点提示
function hintPlate(c, x, y, w, h, label, blink) {
  c.save()
  c.fillStyle = `rgba(26,63,196,${.07 + .05 * blink})`
  c.fillRect(x, y, w, h)
  c.setLineDash([6, 5])
  c.strokeStyle = `rgba(26,63,196,${blink})`
  c.lineWidth = 2.5
  c.strokeRect(x, y, w, h)
  c.restore()
  txt(c, label, x + w / 2, y + 17, '#1a3fc4', 'bold 13px sans-serif')
  txt(c, '▼ 标识贴此处', x + w / 2, y + 40, '#1a3fc4', 'bold 11px sans-serif')
}
function drawGroundProgress(c) {
  const n = ground.n
  if (n >= 2) {
    c.strokeStyle = '#c62828'; c.lineWidth = 4
    line(c, 838, 120, 852, 120)
    c.strokeStyle = '#f0b429'; c.lineWidth = 2
    line(c, 852, 120, 862, 120)
  }
  if (n >= 3) {
    c.strokeStyle = '#f0b429'; c.lineWidth = 3
    c.beginPath(); c.arc(868, 120, 7, 0, Math.PI * 2); c.stroke()
  }
  if (n >= 4) { c.fillStyle = '#f0b429'; c.fillRect(858, 114, 10, 12) }
  if (n >= 5) txt(c, '√', 884, 112, '#2e7d32', 'bold 14px sans-serif')
  if (n >= 6) { c.fillStyle = '#78909c'; c.beginPath(); c.arc(870, 306, 6, 0, Math.PI * 2); c.fill() }
  if (n >= 7) { c.fillStyle = '#b0bec5'; c.beginPath(); c.arc(870, 306, 9, 0, Math.PI * 2); c.fill() }
  if (n >= 8) {
    c.fillStyle = '#90a4ae'; c.beginPath(); c.arc(870, 306, 11, 0, Math.PI * 2); c.fill()
    txt(c, '接地母线已固定', 790, 342, '#2e7d32', 'bold 11px sans-serif')
  }
}
function drawQF(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'QF', s.x + s.w / 2, s.y + 22, '#37474f', 'bold 13px sans-serif')
  rect(c, s.x + 22, s.y + 34, s.w - 44, 48, '#263238')
  rect(c, s.x + 26, s.y + 40, s.w - 52, 20, '#e53935')
  txt(c, '断路器', s.x + s.w / 2, s.y + s.h - 12, '#546e7a', '11px sans-serif')
}
function drawRCD(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#f5f5f5')
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, 'RCD', s.x + s.w / 2, s.y + 22, '#37474f', 'bold 13px sans-serif')
  rect(c, s.x + 18, s.y + 34, 30, 22, '#ef6c00')
  txt(c, 'T', s.x + 33, s.y + 50, '#fff', 'bold 11px sans-serif')
  rect(c, s.x + 58, s.y + 34, 34, 22, '#263238')
  txt(c, '漏电保护', s.x + s.w / 2, s.y + s.h - 12, '#546e7a', '11px sans-serif')
}
function drawTermBlock(c, s) {
  rect(c, s.x, s.y, s.w, s.h, '#eceff1')
  c.strokeStyle = '#78909c'; c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h)
  txt(c, '接线端子排', s.x + s.w / 2, s.y + s.h / 2 + 4, '#546e7a', '11px sans-serif')
  for (const id of ['term_l_in', 'term_n_in', 'term_l_out', 'term_n_out']) {
    const t = TMAP[id]
    c.fillStyle = '#b0bec5'
    c.beginPath(); c.arc(t.x, t.y + (t.y === s.y ? 14 : -14), 8, 0, Math.PI * 2); c.fill()
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
  if (w.type === 'PE' && !w.wrong) {
    c.strokeStyle = '#43a047'; c.lineWidth = 5; c.setLineDash([4, 11]); c.stroke()
  }
  if (selWireId.value === w.id) {
    c.setLineDash([]); c.strokeStyle = '#ff8f00'; c.lineWidth = 9; c.globalAlpha = .45; c.stroke()
  }
  c.restore()
}
function drawTerminals(c, t) {
  const pulse = 1 + .12 * Math.sin(t / 200)
  for (const tt of TERMS) {
    if (!termActive(tt)) continue
    c.fillStyle = '#fff'
    c.beginPath(); c.arc(tt.x, tt.y, 7, 0, Math.PI * 2); c.fill()
    c.strokeStyle = termColor(tt); c.lineWidth = 3; c.stroke()
    if (pendId.value === tt.id || probeA.value === tt.id) {
      c.strokeStyle = pendId.value === tt.id ? '#ff8f00' : '#c62828'
      c.lineWidth = 2.5
      c.beginPath(); c.arc(tt.x, tt.y, 13 * pulse, 0, Math.PI * 2); c.stroke()
      txt(c, pendId.value === tt.id ? '起点' : '探针A', tt.x, tt.y - 18, '#c62828', 'bold 10px sans-serif')
    } else if (phase.value === 4 && pendId.value && TMAP[pendId.value].type === tt.type) {
      c.strokeStyle = 'rgba(46,125,50,.7)'; c.lineWidth = 2
      c.beginPath(); c.arc(tt.x, tt.y, 12 * pulse, 0, Math.PI * 2); c.stroke()
    }
  }
}
function drawMeter(c) {
  if (phase.value === 5) return // 任务6使用左侧检测台上的万用表
  rect(c, 596, 447, 130, 42, '#263238', '#111')
  rect(c, 604, 454, 66, 18, phase.value === 5 && meter.mode === '通断测试' ? '#8bc34a' : '#37474f')
  c.fillStyle = '#b0bec5'
  c.beginPath(); c.arc(700, 470, 10, 0, Math.PI * 2); c.fill()
  txt(c, phase.value === 5 && meter.mode === '通断测试' ? (meter.readout || 'OL') : '万用表', 637, 468, '#111', 'bold 10px sans-serif')
  txt(c, '检测区域', 500, 470, '#5d6370', 'bold 12px sans-serif')
}
function drawScene(t) {
  const c = ctx.value
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#dfe7ee'); g.addColorStop(1, '#b9c6d2')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = '#cbb689'; c.fillRect(0, 470, W, H - 470)
  c.fillStyle = '#ab976f'; c.fillRect(0, 470, W, 8)
  txt(c, '低压配电实训区', W / 2, 30, 'rgba(30,45,60,.75)', 'bold 18px sans-serif')
  drawShelf(c)
  drawPartsShelf(c)
  drawBenchAndBox(t)
  drawMeter(c)
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

/* ---------- 任务横幅 ---------- */
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

/* ---------- 违规暂停 ---------- */
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
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  line-height: 1.3;
}
.chip-comp { font-size: 13px; padding: 8px 6px; }
.chip-N { color: #1e88e5; }
.chip-PE { color: #43a047; }
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
.btn.wire-btn { border-width: 3px; }
.btn.wire-btn.sel { box-shadow: 0 0 0 3px rgba(26, 63, 196, .2); font-weight: 700; }
.tw-L { border-color: #e53935; }
.tw-L.sel { background: #fdecea; }
.tw-N { border-color: #1e88e5; }
.tw-N.sel { background: #e8f1fd; }
.tw-PE { border-color: #9ccc65; }
.tw-PE.sel { background: #f1f8e9; }

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
.opt.sel[class*="sw-"] { color: #fff; }
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
.mini-table { border-collapse: collapse; font-size: 13px; width: 100%; }
.mini-table td { border: 1px solid #dfe3ea; padding: 4px 10px; }
.mini-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; }

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>

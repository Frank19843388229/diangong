<template>
  <div class="game-page">
    <!-- 顶部 HUD -->
    <header class="hud">
      <span class="htitle">关卡 030101-K11-01 · 安全用具使用与登杆作业</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>失误 <b>{{ mistakes }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <!-- 阶段横幅 -->
        <div class="banner" v-if="screen === 'play' && phase >= 0">
          <b>阶段 {{ phase + 1 }}/13 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <!-- 交互层 -->
        <div class="panel" ref="panelRef">
          <!-- 任务1：个人防护用品选择 -->
          <div v-if="phase === 0" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 1：个人防护用品选择</h3>
            <p class="tip">从工具柜中选择正确的个人防护用品（每项单选），确认后进入作业区域。</p>
            <div class="grid5">
              <div class="grp" v-for="(g, gi) in ppe.groups" :key="gi">
                <div class="glabel">{{ g.label }}</div>
                <button
                  v-for="o in g.opts"
                  :key="o"
                  class="opt"
                  :class="{ sel: ppe.sel[gi] === o }"
                  @click="ppe.sel[gi] = o; beep(500, .05)"
                ><img v-if="imgUrl(o)" class="optthumb" :src="imgUrl(o)" alt="">{{ o }}</button>
              </div>
            </div>
            <div class="row">
              <button class="btn primary" @click="p1Confirm">确认进入作业区</button>
            </div>
          </div>

          <!-- 任务2：规范穿戴 -->
          <div v-if="phase === 1" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 2：规范穿戴</h3>
            <p class="tip">清单顺序已随机打乱：按正确顺序（安全帽 → 工作服 → 安全带 → 绝缘鞋）依次点击全部 7 项，全部点完后系统结算判定顺序是否正确。</p>
            <ol class="steps">
              <li
                v-for="i in wearOrder"
                :key="i"
                :class="{ done: wearSeq.includes(i) }"
                @click="wearClick(i)"
              >
                <b>{{ wearSeq.includes(i) ? '✔' : '○' }}</b>
                <span>{{ wearSteps[i][0] }}：{{ wearSteps[i][1] }}</span>
                <em v-if="wearSeq.includes(i)">已确认</em>
              </li>
            </ol>
            <p class="status">系统检测：帽带 <i>√</i>　衣扣 <i>√</i>　安全带连接 <i>√</i>　鞋底 <i>√</i>（随操作逐步确认）</p>
          </div>

          <!-- 任务3：现场安全布置 -->
          <div v-if="phase === 2" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 3：现场安全布置</h3>
            <p class="tip">拖动<b>安全围栏</b>到杆塔周围虚线作业区，拖动<b>警告牌</b>到标示位置，并选择监护人。</p>
            <div class="row">
              <div v-if="!S.fence" class="chip" @pointerdown="e => startDrag(e, onFenceDrop)">🧱 安全围栏</div>
              <div v-if="!S.sign" class="chip" @pointerdown="e => startDrag(e, onSignDrop)">⚠ 警告牌</div>
            </div>
            <div class="row">
              监护人：
              <label v-for="g in ['无', '张三', '李四']" :key="g" class="radio">
                <input type="radio" :value="g" v-model="S.guard" @change="p3Check"> {{ g }}
              </label>
            </div>
            <p class="status">
              围栏 {{ S.fence ? '√' : '×' }}　标示牌 {{ S.sign ? '√' : '×' }}　监护人 {{ S.guard && S.guard !== '无' ? '√（' + S.guard + '）' : '×' }}
            </p>
          </div>
          <div v-if="phase === 2" class="zone" id="zone-fence" style="left:250px;top:432px;width:212px;height:102px"><span>作业区</span></div>
          <div v-if="phase === 2" class="zone" id="zone-sign" style="left:443px;top:393px;width:118px;height:118px"><span>标示位置</span></div>

          <!-- 任务4：登杆前检查 -->
          <div v-if="phase === 3" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 4：登杆前检查</h3>
            <p class="tip">点击画面中的<b>电杆</b>，核对线路名称与杆号，并检查杆根、基础、拉线。</p>
            <p class="status">线路名称：<b>10kV XX线路</b>　杆号：<b>0123号杆</b></p>
          </div>
          <div v-if="phase === 3 && p4.modal" class="modal-mask" @click.self="p4.modal = false">
            <div class="modal">
              <h4>登杆前检查</h4>
              <div class="mrow ok"><span>线路名称</span><b>10kV XX线路 ✔</b></div>
              <div class="mrow ok"><span>杆号</span><b>0123号杆 ✔</b></div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('杆根') }">
                <span>杆根</span>
                <label class="radio"><input type="radio" value="松动" v-model="p4.root"> 松动</label>
                <label class="radio"><input type="radio" value="完好" v-model="p4.root"> 完好</label>
              </div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('基础') }">
                <span>基础</span>
                <label class="radio"><input type="radio" value="开裂" v-model="p4.base"> 开裂</label>
                <label class="radio"><input type="radio" value="完好" v-model="p4.base"> 完好</label>
              </div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('拉线') }">
                <span>拉线</span>
                <label class="radio"><input type="radio" value="松弛" v-model="p4.guy"> 松弛</label>
                <label class="radio"><input type="radio" value="牢固" v-model="p4.guy"> 牢固</label>
              </div>
              <div class="row">
                <button class="btn primary" @click="p4Confirm">确认检查结果</button>
              </div>
            </div>
          </div>

          <!-- 任务5：脚扣冲击试验 -->
          <div v-if="phase === 4" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 5：脚扣冲击试验</h3>
            <p class="tip">将<b>脚扣</b>拖动到测试区，进行人体冲击试验（模拟重量 80kg）。</p>
            <div class="row">
              <div v-if="!S.strapOnMat" class="chip" @pointerdown="e => startDrag(e, onStrapDrop)">🦿 脚扣</div>
            </div>
            <div class="row" v-if="S.strapOnMat">
              <button class="btn" :disabled="S.weight !== 0" @click="p5Weight">① 施加 80kg 模拟重量</button>
              <button class="btn" :disabled="S.weight !== 2" @click="p5Release">② 释放</button>
            </div>
            <p class="status" v-if="S.strapOnMat">
              {{ S.weight === 0 ? '脚扣已放置在测试区，等待试验…' : S.weight === 1 ? '加载模拟重量中…' : S.weight === 2 ? '80kg 模拟重量加载完成，请释放' : '释放完成' }}
            </p>
          </div>
          <div v-if="phase === 4" class="zone" id="zone-mat" style="left:458px;top:448px;width:164px;height:86px"><span>测试区</span></div>

          <!-- 任务6：围杆带、安全绳检查 -->
          <div v-if="phase === 5" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 6：围杆带、安全绳检查</h3>
            <p class="tip">为每件工器具选择正确的试验项目：围杆带做<b>拉力试验</b>，安全绳做<b>外观检查</b>。</p>
            <div class="cards2">
              <div class="mini-card">
                <h4>围杆带</h4>
                <button class="btn" :disabled="!!p6.belt" @click="p6Test('belt', '拉力试验')">拉力试验</button>
                <button class="btn" :disabled="!!p6.belt" @click="p6Test('belt', '外观检查')">外观检查</button>
                <p class="res" v-if="p6.belt">围杆带：拉力正常 ✔</p>
              </div>
              <div class="mini-card">
                <h4>安全绳</h4>
                <button class="btn" :disabled="!!p6.rope" @click="p6Test('rope', '拉力试验')">拉力试验</button>
                <button class="btn" :disabled="!!p6.rope" @click="p6Test('rope', '外观检查')">外观检查</button>
                <p class="res" v-if="p6.rope">安全绳：无断股 ✔</p>
              </div>
            </div>
          </div>

          <!-- 任务7：登杆操作 -->
          <div v-if="phase === 6" class="sheet sheet-compact" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 7：登杆操作</h3>
            <p class="tip">点击画面下方虚拟按键：<b>左脚扣 ↑</b>、<b>右脚扣 ↑</b> 交替上移，<b>↓ 下移</b>。必须左右脚<b>交替</b>，禁止快速攀爬；安全带全程保护。</p>
            <p class="tip">目标：登至 <b>4.0m</b> 指定位置，点击杆顶<b>红色固定点</b>执行「高挂低用」。</p>
            <p class="status">
              高度 <b>{{ S.climb.h.toFixed(1) }} m</b> / 4.0 m　脚扣：{{ S.climb.last === 'L' ? '左脚在上' : S.climb.last === 'R' ? '右脚在上' : '—' }}　安全带：已连接
            </p>
          </div>

          <!-- 任务8：低压验电 -->
          <div v-if="phase === 7" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 8：低压验电</h3>
            <p class="tip">从工具箱中选择工具，然后点击配电箱上的<b>插座</b>进行验电。</p>
            <div class="row tools">
              <button
                v-for="t in p8tools"
                :key="t"
                class="btn tool"
                :class="{ sel: S.p8.tool === t }"
                @click="p8Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div v-if="S.p8.tested" class="result-box">
              <p>测试地点：<b>训练插座 A</b>　测量点：<b>L — N</b></p>
              <p>结果：<b class="live">带电 🔴 220V</b></p>
              <button class="btn primary" @click="p8Record">记录</button>
            </div>
            <p class="status" v-else-if="S.p8.tool === '验电笔'">已选择验电笔 —— 请点击配电箱上的插座</p>
            <p class="status" v-else-if="S.p8.tool">请更换为验电笔后再测试</p>
          </div>

          <!-- 任务9：登高板试验 -->
          <div v-if="phase === 8" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 9：登高板试验</h3>
            <p class="tip">选择登高板进入检测：检查板体、检查绳索、模拟承重。</p>
            <div class="row">
              <button class="btn primary" :disabled="boardIdx >= 0" @click="p9Start">选择登高板，开始检测</button>
            </div>
            <ul class="checks">
              <li v-for="(ck, i) in boardChecks" :key="i" :class="{ done: i < boardIdx, cur: i === boardIdx }">
                {{ i < boardIdx ? '✔' : i === boardIdx ? '⏳' : '○' }} {{ ck }}
              </li>
            </ul>
            <p class="status" v-if="boardDone">检查结果：板体完好、绳索无断股、承重合格 —— <b>合格</b></p>
          </div>

          <!-- 任务10：万用表测量 -->
          <div v-if="phase === 9" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 10：万用表测量</h3>
            <p class="tip">选择<b>数字万用表</b>，设置档位 <b>AC V</b>、量程 <b>750V</b>，红表笔接 L、黑表笔接 N，记录电压。</p>
            <div class="row tools">
              <button
                v-for="t in ['数字万用表', '指针万用表', '钳形表']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '数字万用表' && meter.tool }"
                @click="mPick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div class="meter-sim" v-if="meter.tool">
              <div class="mrow">
                <span>档位</span>
                <button class="btn" @click="mCycleRange">{{ meter.range }}</button>
                <span>量程</span>
                <button class="btn" @click="mCycleSpan">{{ meter.span }}</button>
              </div>
              <div class="mrow">
                <button class="btn" :class="{ sel: meter.red }" @click="meter.red = !meter.red; beep(500, .04)">红表笔 → L</button>
                <button class="btn" :class="{ sel: meter.black }" @click="meter.black = !meter.black; beep(500, .04)">黑表笔 → N</button>
              </div>
              <div class="display">{{ meterDisplay }}</div>
              <div class="row">
                <button class="btn primary" @click="mRecord">记录</button>
              </div>
              <div v-if="meter.recorded" class="result-box">
                <p>测试地点：<b>{{ meter.log.place }}</b>　测量点：<b>{{ meter.log.point }}</b></p>
                <p>电压：<b>{{ meter.log.value }}</b>　判定：<b>{{ meter.log.verdict }}</b></p>
              </div>
            </div>
          </div>

          <!-- 任务11：漏电保护检测 -->
          <div v-if="phase === 10" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 11：漏电保护检测</h3>
            <p class="tip">选择<b>漏电保护测试仪</b>，按顺序接线（测试仪 → 漏电保护器 → 负载），按测试键并判定。</p>
            <div class="row tools">
              <button
                v-for="t in ['漏电保护测试仪', '万用表', '验电笔']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '漏电保护测试仪' && leak.tool }"
                @click="lPick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div class="circuit" v-if="leak.tool">
              <span class="dev">测试仪</span>
              <button class="port" :class="{ on: leak.c[0] }" @click="lConnect(0)">①</button>
              <span class="dev">漏电保护器</span>
              <button class="port" :class="{ on: leak.c[1] }" @click="lConnect(1)">②</button>
              <span class="dev">负载</span>
              <button class="port" :class="{ on: leak.c[2] }" @click="lConnect(2)">③</button>
            </div>
            <div class="row">
              <button class="btn primary" :disabled="!leak.c.every(Boolean) || leak.tested" @click="lTest">测试</button>
            </div>
            <div class="readings" v-if="leak.tested">
              <span>动作电流：<b>{{ leak.cur }} mA</b>（标准 ≤30mA）</span>
              <span>动作时间：<b>{{ leak.t }} ms</b>（标准 ≤0.1s）</span>
            </div>
            <div class="row" v-if="leak.tested && !leak.judged">
              <button class="btn primary" @click="lJudge(true)">合格</button>
              <button class="btn" @click="lJudge(false)">不合格</button>
            </div>
            <p class="status" v-if="leak.judged">
              判定：{{ leak.result ? '合格' : '不合格' }} —— 动作电流 {{ leak.cur }}mA ≤ 30mA，动作时间 {{ leak.t }}ms ≤ 100ms
            </p>
          </div>

          <!-- 任务12：安全标识识别 -->
          <div v-if="phase === 11" class="sheet sheet-inline" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 12：安全标识识别</h3>
            <p class="tip">将安全标识拖入对应的分类区。</p>
            <div class="sign-layout">
              <div class="tray">
                <div
                  v-for="s in signDefs"
                  :key="s.id"
                  v-show="!placed[s.id]"
                  class="sign-card"
                  @pointerdown="e => startDrag(e, (x, y, restore) => signDrop(s, x, y, restore))"
                >
                  <div class="sign-ico" v-html="s.svg"></div>
                  <span>{{ s.label }}</span>
                </div>
              </div>
              <div class="zones">
                <div v-for="z in signZones" :key="z" class="sign-zone" :id="'sz-' + z">
                  <em>{{ z }}</em>
                  <div v-for="s in signDefs.filter(d => placed[d.id] === z)" :key="s.id" class="sign-card locked">
                    <div class="sign-ico" v-html="s.svg"></div>
                    <span>{{ s.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 任务13：整理现场 -->
          <div v-if="phase === 12" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 13：整理现场</h3>
            <p class="tip">依次点击完成现场整理。</p>
            <ul class="checks clickable">
              <li
                v-for="item in cleanupItems"
                :key="item.key"
                :class="{ done: cleanupDone[item.key] }"
                @click="doCleanup(item)"
              >
                <b>{{ cleanupDone[item.key] ? '✔' : '□' }}</b> {{ item.label }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 消息提示 -->
        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K11-01</div>
            <h2>安全用具使用与登杆作业</h2>
            <p class="sub">低压电工登杆作业安全防护训练 · 安全操作综合训练</p>
            <p class="stars">难度 ★★★☆☆</p>
            <div class="objs">
              <p>训练目标：完成一次标准低压登杆作业前检查、个人防护、安全测试和现场整理。</p>
              <ul>
                <li>安全用品选择正确</li>
                <li>穿戴规范</li>
                <li>工器具检查通过</li>
                <li>登杆流程无违规</li>
                <li>电气测试数据正确记录</li>
                <li>安全标识识别正确</li>
                <li>场地恢复完成</li>
              </ul>
            </div>
            <button class="btn primary big" @click="startGame">开始训练</button>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <h2>安全登杆训练完成</h2>
            <table class="score-table">
              <tr v-for="(c, k) in cats" :key="k">
                <td>{{ k }}</td>
                <td>{{ c.got }}/{{ c.max }}</td>
              </tr>
              <tr class="total">
                <td>总分</td>
                <td>{{ total }}/100</td>
              </tr>
            </table>
            <div class="lv-stars">{{ '★'.repeat(stars) }}{{ '☆'.repeat(5 - stars) }}</div>
            <p class="verdict">{{ verdict }}</p>
            <div class="row center">
              <button class="btn primary" @click="startGame">重新训练</button>
              <router-link to="/dashboard" class="btn">返回选关</router-link>
              <TrainingReport />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 登杆虚拟按键 -->
    <div class="climb-pad" v-if="screen === 'play' && phase === 6">
      <button class="climb-btn" @click="climbTap('L')">左脚扣 ↑</button>
      <button class="climb-btn" @click="climbTap('R')">右脚扣 ↑</button>
      <button class="climb-btn down" @click="climbDownBtn">↓ 下移</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLevelAttempt } from '@/composables/levelAttempt'
import { useTrainingReport, resetTrainingReport } from '@/composables/trainingReport'
import { triggerFatalExit } from '@/composables/fatalExit'
import { imgUrl } from '@/assets/imgmap'
import { hitElId, nearestElId } from '@/lib/dropTarget.js'

// 导入公共逻辑
import { useGame, LEVEL1_CONFIG } from '@/composables/game/index.js'

// 导入画布绘制工具
import { line, rect, circle, txt, clearCanvas, drawGrid } from '@/utils/game/canvas.js'

// ================= 常量 =================
const config = LEVEL1_CONFIG
const W = config.W, H = config.H, GROUND = config.GROUND, POLE_X = config.POLE_X, PXM = config.PXM
const ANCHOR = config.ANCHOR

const PHASES = config.phases

// ================= 使用公共逻辑 =================
// 训练报告钩子：在 useTrainingReport 创建前先留占位，创建后注入实际实现（见文件末尾）
const reportHooks = { noteIssue: null, attachReason: null }

const {
  beep,
  msgText,
  msgType,
  showMsg,
  startDrag,
  stageRef,
  later,
  setInterval: setInterval_,
  clearAll,
  reset: resetTimer,
  cats,
  mistakes,
  total,
  addScore,
  penalize,
  completePhase,
  stars,
  verdict,
  screen,
  phase,
  sheetOpen,
  lock,
  canvasRef,
  hitEl,
  enterPhase,
  startGame: baseStartGame,
  triggerFatal,
} = useGame(PHASES, config.categories, {
  onPenalize: (cat, n) => reportHooks.noteIssue && reportHooks.noteIssue(cat, n),
  msgHooks: { onShow: text => reportHooks.attachReason && reportHooks.attachReason(text) },
})

// ================= 模板引用 =================
const panelRef = ref(null)

// ================= 流程状态 =================
const ppe = reactive({
  groups: config.ppe,
  sel: {},
})

function p1Confirm() {
  const wrong = []
  ppe.groups.forEach((g, i) => {
    const sel = ppe.sel[i]
    if (sel !== g.correct) wrong.push(sel == null ? `${g.label}未选择` : `${g.label}误选「${sel}」`)
  })
  if (!wrong.length) {
    completePhase('安全防护', 10)
    return
  }
  penalize('安全防护', 10)
  showMsg(`重大违规：防护用品选择错误（${wrong.join('、')}） —— 禁止进入作业区域（-10 分）`, 'bad')
  beep(160, .25, 'sawtooth')
  triggerFatalExit(
    `防护用品选择错误（${wrong.join('、')}）：必须正确选择电工安全帽、电工防护服、双保险安全带、绝缘鞋与合格脚扣，未合格穿戴禁止进入作业区域`
  )
}

// ================= 任务2：穿戴 =================
const wearSteps = config.wearSteps
const wearOrder = ref(wearSteps.map((_, i) => i))
const wearSeq = ref([])

function shuffleWear() {
  const idx = wearSteps.map((_, i) => i)
  for (let k = idx.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    const t = idx[k]; idx[k] = idx[j]; idx[j] = t
  }
  wearOrder.value = idx
  wearSeq.value = []
}

function wearClick(i) {
  if (wearSeq.value.includes(i)) return
  wearSeq.value.push(i)
  beep(620, .06)
  if (wearSeq.value.length < wearSteps.length) return
  if (wearSeq.value.every((v, k) => v === k)) {
    showMsg('穿戴顺序正确，检查通过 ✔', 'good')
    completePhase('安全防护', 10)
  } else {
    showMsg(`顺序错误！正确顺序：安全帽 → 工作服 → 安全带 → 绝缘鞋 —— 已清空，请按顺序重新点击`, 'warn')
    beep(220, .1)
    wearSeq.value = []
  }
}

// ================= 任务3：现场布置 =================
const S = reactive({
  fence: false, sign: false, guard: '',
  strapOnMat: false, weight: 0, wt0: 0, wy: null,
  climb: { h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 },
  p8: { tool: null, tested: false, recorded: false },
  powerOff: false,
})

function onFenceDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-fence')) { S.fence = true; beep(700, .08); p3Check() }
  else { restore(); showMsg('请将安全围栏拖到杆塔周围的作业区（虚线框）', 'warn') }
}

function onSignDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-sign')) { S.sign = true; beep(700, .08); p3Check() }
  else { restore(); showMsg('请将警告牌拖到标示位置', 'warn') }
}

function p3Check() {
  if (S.fence && S.sign && S.guard && S.guard !== '无') completePhase('登杆操作', 5)
}

// ================= 任务4：登杆前检查 =================
const p4 = reactive({ modal: false, root: '', base: '', guy: '', wrong: [] })

function p4Confirm() {
  const ok = p4.root === '完好' && p4.base === '完好' && p4.guy === '牢固'
  if (ok) {
    p4.modal = false
    completePhase('工具检查', 5)
  } else {
    penalize('工具检查', 2)
    p4.wrong = [
      p4.root !== '完好' ? '杆根' : '',
      p4.base !== '完好' ? '基础' : '',
      p4.guy !== '牢固' ? '拉线' : '',
    ].filter(Boolean)
    showMsg('检查结论错误：' + p4.wrong.join('、') + ' 状态不符，请再次核对', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务5：脚扣冲击试验 =================
function onStrapDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-mat')) { S.strapOnMat = true; beep(700, .08); showMsg('脚扣已放置在测试区', 'good') }
  else { restore(); showMsg('请将脚扣拖到测试区', 'warn') }
}

function p5Weight() {
  S.weight = 1
  S.wt0 = performance.now()
  beep(400, .15)
  later(() => { S.weight = 2; beep(520, .08) }, 700)
}

function p5Release() {
  S.weight = 3
  S.wt0 = performance.now()
  beep(500, .1)
  later(() => {
    S.weight = 0
    showMsg('试验结果：脚扣无变形 —— 通过', 'good')
    completePhase('工具检查', 5)
  }, 650)
}

// ================= 任务6：围杆带、安全绳 =================
const p6 = reactive({ belt: null, rope: null })

function p6Test(item, test) {
  if ((item === 'belt' && p6.belt) || (item === 'rope' && p6.rope)) return
  const ok = (item === 'belt' && test === '拉力试验') || (item === 'rope' && test === '外观检查')
  if (ok) {
    p6[item] = test
    beep(760, .08)
    if (p6.belt && p6.rope) completePhase('工具检查', 5)
  } else {
    penalize('工具检查', 2)
    showMsg('试验项目选择错误', 'warn')
    beep(220, .1)
  }
}

// ================= 任务7：登杆操作 =================
function tryStep(foot, now) {
  const c = S.climb
  if (c.done) return
  if (c.h >= 4) { showMsg('已到达指定位置，请点击杆顶红色固定点执行高挂低用', 'warn'); return }
  if (foot === c.last) {
    c.wobbleUntil = now + 500
    penalize('登杆操作', 2)
    showMsg('违规：必须交替使用脚扣，禁止双脚同时离杆（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  if (now - c.lastT < 250) {
    c.wobbleUntil = now + 500
    penalize('登杆操作', 2)
    showMsg('违规：禁止快速攀爬（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  c.h = Math.min(4, c.h + 0.5)
  c.last = foot
  c.lastT = now
  beep(foot === 'L' ? 620 : 560, .05)
  if (c.h >= 4) showMsg('已到达 4.0m 指定位置！点击杆顶红色固定点，执行高挂低用', 'good')
}

function climbTap(foot) {
  const c = S.climb
  if (phase.value !== 6 || c.done) return
  tryStep(foot, performance.now())
}

function climbDownBtn() {
  const c = S.climb
  if (phase.value !== 6 || c.done) return
  c.h = Math.max(0, c.h - 0.5)
  c.last = null
  beep(300, .06)
}

// ================= 任务8：低压验电 =================
const p8tools = ['万用表', '验电笔', '钳形表', '兆欧表']

function p8Pick(t) {
  S.p8.tool = t
  if (t !== '验电笔') {
    penalize('电气测试', 2)
    showMsg('低压验电应选用低压验电笔', 'warn')
    beep(220, .1)
  } else beep(600, .06)
}

function p8Test() {
  if (S.p8.tested) return
  if (S.p8.tool !== '验电笔') {
    penalize('电气测试', 2)
    showMsg('请先选择验电笔', 'warn')
    return
  }
  S.p8.tested = true
  beep(900, .12)
}

function p8Record() {
  S.p8.recorded = true
  completePhase('电气测试', 10)
}

// ================= 任务9：登高板试验 =================
const boardChecks = ['检查板体', '检查绳索', '模拟承重']
const boardIdx = ref(-1)
const boardDone = ref(false)

function p9Start() {
  boardIdx.value = 0
  beep(600, .06)
  const iv = setInterval_(() => {
    boardIdx.value++
    beep(700, .06)
    if (boardIdx.value >= boardChecks.length) {
      clearInterval(iv)
      boardDone.value = true
      later(() => completePhase('工具检查', 5), 1000)
    }
  }, 650)
}

// ================= 任务10：万用表测量 =================
const ranges = ['AC V', 'DC V', 'AC A', 'DC A', 'Ω']
const spans = ['200V', '500V', '750V', '1000V']
const meter = reactive({ tool: false, range: 'AC V', span: '750V', red: false, black: false, recorded: false, log: null })

const meterDisplay = computed(() => {
  const m = meter
  if (!m.tool) return '——'
  if (!m.red || !m.black) return '——'
  if (m.range !== 'AC V') return '0.00'
  if (m.span === '200V') return 'OL'
  return '220.0 V'
})

function mPick(t) {
  if (t === '数字万用表') { meter.tool = true; beep(600, .06) }
  else {
    penalize('电气测试', 2)
    showMsg('电压测量请选用数字万用表', 'warn')
    beep(220, .1)
  }
}

function mCycleRange() {
  meter.range = ranges[(ranges.indexOf(meter.range) + 1) % ranges.length]
  beep(500, .04)
}

function mCycleSpan() {
  meter.span = spans[(spans.indexOf(meter.span) + 1) % spans.length]
  beep(500, .04)
}

function mRecord() {
  if (meterDisplay.value === '220.0 V') {
    meter.recorded = true
    meter.log = { place: '训练插座 A', point: 'L — N', value: '220 V', verdict: '合格（220V ±10%）' }
    completePhase('电气测试', 10)
  } else {
    penalize('电气测试', 2)
    showMsg('测量设置或接线错误：请确认档位 AC V、量程 750V、红表笔接 L、黑表笔接 N', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务11：漏电保护检测 =================
const leak = reactive({ tool: false, c: [false, false, false], tested: false, judged: false, cur: 0, t: 0, result: null })

function lPick(t) {
  if (t === '漏电保护测试仪') { leak.tool = true; beep(600, .06) }
  else {
    penalize('电气测试', 2)
    showMsg('漏电保护检测应选用漏电保护测试仪', 'warn')
    beep(220, .1)
  }
}

function lConnect(i) {
  if (leak.c[i]) return
  const next = leak.c.filter(Boolean).length
  if (i === next) { leak.c[i] = true; beep(650, .06) }
  else { showMsg('请按顺序接线：测试仪 → 漏电保护器 → 负载', 'warn'); beep(220, .1) }
}

function lTest() {
  if (!leak.c.every(Boolean) || leak.tested) return
  leak.tested = true
  later(() => { leak.cur = 25; leak.t = 85; beep(800, .1) }, 900)
}

function lJudge(ok) {
  if (ok && leak.cur <= 30 && leak.t <= 100) {
    leak.judged = true
    leak.result = true
    completePhase('电气测试', 5)
  } else {
    penalize('电气测试', 2)
    showMsg('判断错误：动作电流 ≤30mA、动作时间 ≤0.1s 即为合格，请重新判定', 'warn')
    beep(220, .1)
  }
}

// ================= 任务12：安全标识识别 =================
function signSvg(type) {
  if (type === 'prohibit')
    return `<svg viewBox="0 0 60 60" width="52" height="52"><circle cx="30" cy="30" r="24" fill="#fff" stroke="#d32f2f" stroke-width="6"/><line x1="14" y1="46" x2="46" y2="14" stroke="#d32f2f" stroke-width="6"/></svg>`
  if (type === 'mandatory')
    return `<svg viewBox="0 0 60 60" width="52" height="52"><circle cx="30" cy="30" r="24" fill="#1565c0"/><text x="30" y="40" font-size="26" text-anchor="middle">🪖</text></svg>`
  if (type === 'warning')
    return `<svg viewBox="0 0 60 60" width="52" height="52"><path d="M30 7 L55 51 L5 51 Z" fill="#fdd835" stroke="#222" stroke-width="4" stroke-linejoin="round"/><text x="30" y="45" font-size="24" font-weight="bold" text-anchor="middle" fill="#222">!</text></svg>`
  return `<svg viewBox="0 0 60 60" width="52" height="52"><rect x="6" y="6" width="48" height="48" rx="4" fill="#2e7d32"/><text x="30" y="40" font-size="26" text-anchor="middle">🚪</text></svg>`
}

const signDefs = [
  { id: 's1', label: '禁止合闸', cat: '禁止区', svg: signSvg('prohibit') },
  { id: 's2', label: '戴安全帽', cat: '指令区', svg: signSvg('mandatory') },
  { id: 's3', label: '当心触电', cat: '警告区', svg: signSvg('warning') },
  { id: 's4', label: '安全出口', cat: '提示区', svg: signSvg('hint') },
]

const signZones = ['禁止区', '指令区', '警告区', '提示区']
const placed = reactive({})

function signDrop(def, x, y, restore) {
  const zone = nearestElId(x, y, signZones.map(z => 'sz-' + z))
  if (zone && zone === def.cat) {
    placed[def.id] = zone
    beep(760, .08)
  } else {
    restore()
    if (zone) {
      penalize('现场整理', 2)
      showMsg(`分类错误：「${def.label}」不属于${zone}`, 'warn')
      beep(220, .1)
    }
  }
  if (Object.keys(placed).length === 4) completePhase('现场整理', 5)
}

// ================= 任务13：整理现场 =================
const cleanupItems = [
  { key: 'strap', label: '收回脚扣' },
  { key: 'belt', label: '收回安全带' },
  { key: 'fence', label: '拆除围栏' },
  { key: 'tools', label: '清理工具' },
  { key: 'power', label: '关闭设备' },
]

const cleanupDone = reactive({})

function doCleanup(item) {
  if (cleanupDone[item.key]) return
  cleanupDone[item.key] = true
  beep(680, .06)
  if (item.key === 'fence') S.fence = false
  if (item.key === 'power') S.powerOff = true
  showMsg(`${item.label} ✔`, 'good')
  if (cleanupItems.every(i => cleanupDone[i.key])) {
    later(() => completePhase('现场整理', 5), 900)
  }
}

// ================= 游戏流程 =================
function resetState() {
  S.fence = false; S.sign = false; S.guard = ''
  S.strapOnMat = false; S.weight = 0; S.wy = null
  S.climb = { h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 }
  S.p8 = { tool: null, tested: false, recorded: false }
  S.powerOff = false
  ppe.sel = {}
  shuffleWear()
  p4.modal = false; p4.root = ''; p4.base = ''; p4.guy = ''; p4.wrong = []
  p6.belt = null; p6.rope = null
  boardIdx.value = -1; boardDone.value = false
  meter.tool = false; meter.range = 'AC V'; meter.span = '750V'
  meter.red = false; meter.black = false; meter.recorded = false; meter.log = null
  leak.tool = false; leak.c = [false, false, false]
  leak.tested = false; leak.judged = false; leak.cur = 0; leak.t = 0; leak.result = null
  Object.keys(placed).forEach(k => delete placed[k])
  Object.keys(cleanupDone).forEach(k => delete cleanupDone[k])
  mistakes.value = 0
  Object.values(cats).forEach(c => { c.got = 0 })
}

function startGame() {
  resetTimer()
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}

// ================= 画布交互 =================
function onCanvasClick(e) {
  if (screen.value !== 'play') return
  const r = canvasRef.value.getBoundingClientRect()
  const x = (e.clientX - r.left) * (W / r.width)
  const y = (e.clientY - r.top) * (H / r.height)
  if (phase.value === 3 && Math.abs(x - POLE_X) < 40 && y > 100 && y < GROUND) {
    p4.modal = true
    beep(500, .05)
  }
  if (phase.value === 6) {
    const c = S.climb
    if (c.h >= 4 && !c.attached && Math.hypot(x - ANCHOR.x, y - ANCHOR.y) < 32) {
      c.attached = true
      c.done = true
      beep(880, .15)
      completePhase('登杆操作', 20)
    } else if (c.h < 4 && Math.abs(x - POLE_X) < 40) {
      showMsg('继续交替脚扣登杆至 4.0m', 'warn')
    }
  }
  if (phase.value === 7 && x > 755 && x < 810 && y > 443 && y < 488) p8Test()
}

// ================= 画布绘制 =================
function cloud(c, x, y) {
  c.beginPath()
  c.arc(x, y, 16, 0, Math.PI * 2)
  c.arc(x + 18, y + 3, 12, 0, Math.PI * 2)
  c.arc(x - 18, y + 4, 11, 0, Math.PI * 2)
  c.fillStyle = '#fff'
  c.fill()
  c.strokeStyle = '#ccc'
  c.lineWidth = 1
  c.stroke()
}

function drawScene() {
  const c = canvasRef.value.getContext('2d')
  clearCanvas(c, W, H, '#87ceeb')
  drawGrid(c, W, H, 50, '#ddd')
  
  // 地面
  line(c, 0, GROUND, W, GROUND, '#555', 3)
  
  // 电杆
  line(c, POLE_X, GROUND, POLE_X, 262, '#8B4513', 8)
  line(c, POLE_X - 20, 300, POLE_X + 20, 300, '#8B4513', 4)
  line(c, POLE_X - 20, 350, POLE_X + 20, 350, '#8B4513', 4)
  line(c, POLE_X - 20, 400, POLE_X + 20, 400, '#8B4513', 4)
  
  // 云朵
  cloud(c, 100, 100)
  cloud(c, 300, 80)
  cloud(c, 500, 120)
  
  // 拉线
  line(c, POLE_X, 300, POLE_X - 100, GROUND, '#666', 2)
  line(c, POLE_X, 300, POLE_X + 100, GROUND, '#666', 2)
  
  // 脚扣
  if (S.strapOnMat) {
    rect(c, 458, 448, 164, 86, 'rgba(255,255,255,0.3)', '#333')
    txt(c, '测试区', 540, 490, '#333', '14px sans-serif')
  }
  
  // 安全围栏
  if (S.fence) {
    line(c, 250, 432, 462, 432, '#d32f2f', 2)
    line(c, 462, 432, 462, 534, '#d32f2f', 2)
    line(c, 462, 534, 250, 534, '#d32f2f', 2)
    line(c, 250, 534, 250, 432, '#d32f2f', 2)
  }
  
  // 警告牌
  if (S.sign) {
    rect(c, 443, 393, 118, 118, '#fdd835', '#222')
    txt(c, '警告', 502, 450, '#222', '20px sans-serif')
  }
  
  // 登杆高度指示
  if (phase.value === 6) {
    const h = S.climb.h
    const y = GROUND - h * PXM
    line(c, POLE_X - 40, y, POLE_X + 40, y, '#2196F3', 2)
    txt(c, `${h.toFixed(1)}m`, POLE_X - 60, y + 5, '#2196F3', '14px sans-serif')
    
    if (h >= 4) {
      circle(c, ANCHOR.x, ANCHOR.y, 16, '#d32f2f', '#fff', 2)
      txt(c, '固定点', ANCHOR.x, ANCHOR.y + 30, '#d32f2f', '12px sans-serif')
    }
  }
  
  // 配电箱
  if (phase.value === 7) {
    rect(c, 755, 443, 55, 45, '#455A64', '#37474f')
    rect(c, 760, 448, 45, 35, '#263238')
    txt(c, '插座', 782, 470, '#fff', '12px sans-serif')
  }
}

// ================= 生命周期 =================
onMounted(() => {
  const c = canvasRef.value
  c.width = W
  c.height = H
  drawScene()
})

watch([phase, S], drawScene, { deep: true })

// ================= 结算相关 =================
const { reportResult } = useLevelAttempt()
const { noteIssue, attachReason } = useTrainingReport({
  step: () => phase.value + 1,
  stepName: () => PHASES[phase.value]?.name || '',
})
// 注入训练报告钩子：penalize → noteIssue，showMsg → attachReason
reportHooks.noteIssue = noteIssue
reportHooks.attachReason = attachReason

watch(screen, v => {
  if (v === 'play') resetTrainingReport()
  if (v === 'results') reportResult(total.value, { cats, mistakes: mistakes.value })
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
  gap: 16px;
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
.cats { display: flex; gap: 12px; flex: 1; flex-wrap: wrap; }
.cats i { font-style: normal; color: #9fb4c6; font-variant-numeric: tabular-nums; }
.hud b { color: #ffd54f; font-variant-numeric: tabular-nums; }
.exit { margin-left: auto; color: #9fb4c6; text-decoration: none; }
.exit:hover { color: #fff; }

/* ---------- 登杆虚拟按键（替代键盘 A/D/↑/↓） ---------- */
.climb-pad {
  max-width: 960px;
  margin: 10px auto 0;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.climb-btn {
  min-width: 104px;
  min-height: 46px;
  padding: 10px 18px;
  border: 1px solid #2f4156;
  border-radius: 10px;
  background: #22303e;
  color: #dfe7ee;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
.climb-btn:active { background: #33475c; }
.climb-btn.down {
  background: #3a2f22;
  border-color: #5a4a30;
  color: #ffd54f;
}

/* ---------- 舞台 ---------- */
.stage-wrap { max-width: 960px; margin: 0 auto; overflow-x: auto; }
.stage {
  position: relative;
  width: 960px;
  height: 640px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, .5);
  background: #79b6dd;
}
canvas { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: block; }

/* ---------- 阶段横幅 ---------- */
.banner {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 32, 44, .88);
  color: #fff;
  padding: 6px 18px;
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

/* ---------- 交互层 ---------- */
.panel { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 10; }
.panel .sheet,
.panel .modal-mask { pointer-events: auto; }

.sheet {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  width: 880px;
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255, 255, 255, .96);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
  padding: 14px 20px;
}
.sheet.sheet-top {
  bottom: auto;
  top: 46px;
  max-height: none;
}
.sheet.sheet-compact {
  width: 560px;
  padding: 10px 16px;
}
.sheet.folded { max-height: 40px !important; overflow: hidden !important; padding-top: 8px !important; padding-bottom: 8px !important; }
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
.sheet h3 { margin: 0 0 6px; font-size: 16px; color: #122d94;  padding-right: 76px; }
.tip { margin: 2px 0 8px; font-size: 13px; color: #4a5568; }
.tip b { color: #1c1e24; }
.status { margin: 8px 0 0; font-size: 13px; color: #2b6cb0; background: #ebf3fc; border-radius: 6px; padding: 6px 10px; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.row { display: flex; gap: 10px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
.row.center { justify-content: center; }
.radio { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; }
.radio input { accent-color: #1a3fc4; }

/* ---------- 按钮 ---------- */
.btn {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 6px;
  padding: 7px 16px;
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
.btn.tool.sel { background: #1a3fc4; border-color: #1a3fc4; color: #fff; }
.btn .toolthumb { width: 30px; height: 24px; object-fit: contain; vertical-align: middle; margin-right: 5px; background: #fff; border: 1px solid #e3e8ef; border-radius: 3px; }
.btn.sel { box-shadow: inset 0 0 0 2px #1a3fc4; }
.btn.primary.sel { box-shadow: none; }

/* ---------- 任务1：选项 ---------- */
.grid5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 6px; }
.grp { border: 1px solid #dfe3ea; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.glabel { font-weight: 700; font-size: 14px; color: #122d94; text-align: center; }
.opt { border: 1px solid #c9d2dd; background: #fff; border-radius: 5px; padding: 6px 4px; font-size: 13px; cursor: pointer; }
.opt .optthumb { display: block; width: 46px; height: 34px; object-fit: contain; margin: 0 auto 3px; background: #fff; border-radius: 3px; }
.opt:hover { background: #f0f4fa; }
.opt.sel { background: #1a3fc4; border-color: #1a3fc4; color: #fff; }

/* ---------- 任务2：步骤 ---------- */
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.steps li {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #dfe3ea; border-radius: 6px; padding: 7px 10px;
  font-size: 14px; cursor: pointer; background: #fff;
}
.steps li.cur { border-color: #1a3fc4; box-shadow: inset 0 0 0 1px #1a3fc4; background: #f3f6ff; }
.steps li.done { color: #2e7d32; background: #f1f8f2; border-color: #b9d8be; cursor: default; }
.steps li em { margin-left: auto; font-style: normal; font-size: 12px; color: #2e7d32; }
.steps li b { width: 18px; text-align: center; }

/* ---------- 任务3/5：拖拽 ---------- */
.chip {
  display: inline-block;
  padding: 10px 18px;
  background: #fff8e1;
  border: 2px dashed #f0b429;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.chip.dragging { opacity: .85; cursor: grabbing; box-shadow: 0 8px 18px rgba(0, 0, 0, .25); }
.zone {
  position: absolute;
  border: 2px dashed rgba(26, 63, 196, .55);
  border-radius: 8px;
  background: rgba(26, 63, 196, .06);
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
  z-index: 2;
}
.zone span {
  background: rgba(26, 63, 196, .8);
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

/* ---------- 任务4：弹窗 ---------- */
.modal-mask {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .55);
  display: flex; align-items: center; justify-content: center;
  z-index: 30;
}
.modal {
  width: 420px;
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
}
.modal h4 { margin: 0 0 12px; color: #122d94; }
.mrow {
  display: flex; align-items: center; gap: 14px;
  padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;
  font-size: 14px; border: 1px solid transparent;
}
.mrow > span { width: 64px; color: #4a5568; }
.mrow.ok { background: #f1f8f2; }
.mrow.wrong { background: #fdecea; border-color: #f3c6c6; }

/* ---------- 任务6：卡片 ---------- */
.cards2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mini-card { border: 1px solid #dfe3ea; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.mini-card h4 { margin: 0; font-size: 15px; color: #122d94; }
.mini-card .res { margin: 0; color: #2e7d32; font-size: 13px; }

/* ---------- 任务8：结果框 ---------- */
.result-box {
  margin-top: 10px;
  border: 1px solid #b9d8be;
  background: #f1f8f2;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
}
.result-box .live { color: #c62828; }

/* ---------- 任务9/13：清单 ---------- */
.checks { list-style: none; margin: 8px 0 0; padding: 0; display: flex; gap: 14px; flex-wrap: wrap; }
.checks li {
  border: 1px solid #dfe3ea; border-radius: 6px; padding: 6px 12px;
  font-size: 14px; background: #fff;
}
.checks li.cur { border-color: #f0b429; background: #fff8e1; }
.checks li.done { border-color: #b9d8be; background: #f1f8f2; color: #2e7d32; }
.checks.clickable li { cursor: pointer; }
.checks li:hover { background: #f0f4fa; }

/* ---------- 任务10：万用表 ---------- */
.meter-sim {
  border: 1px solid #dfe3ea; border-radius: 8px;
  padding: 12px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
  background: #f8fafc;
}
.display {
  font-family: 'Courier New', monospace;
  font-size: 34px; font-weight: 700;
  background: #0d1b2a; color: #7CFC9A;
  border-radius: 6px;
  padding: 6px 26px;
  min-width: 220px;
  text-align: center;
  letter-spacing: .05em;
}

/* ---------- 任务11：接线 ---------- */
.circuit {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; margin: 10px 0; flex-wrap: wrap;
}
.dev {
  border: 1px solid #9fb4c6; background: #eef3f9;
  border-radius: 6px; padding: 8px 14px; font-size: 14px; font-weight: 600;
}
.port {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid #9fb4c6; background: #fff;
  font: inherit; font-weight: 700; cursor: pointer;
}
.port.on { border-color: #2e7d32; background: #e6f4ea; color: #2e7d32; box-shadow: 0 0 0 3px rgba(46, 125, 50, .2); }
.readings { display: flex; gap: 26px; justify-content: center; font-size: 15px; margin: 6px 0; }
.readings b { font-variant-numeric: tabular-nums; color: #122d94; }

/* ---------- 任务12：标识分类 ---------- */
.sign-layout { display: flex; gap: 16px; margin-top: 6px; }
.tray { display: flex; gap: 12px; align-items: flex-start; min-height: 120px; }
.zones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 1; }
.sign-zone {
  min-height: 128px;
  border: 2px dashed #c9d2dd; border-radius: 8px;
  background: #f6f8fa;
  padding: 8px;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.sign-zone em { font-style: normal; font-size: 13px; color: #5d6370; font-weight: 700; }
.sign-card {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: #fff; border: 1px solid #dfe3ea; border-radius: 8px;
  padding: 8px 10px; font-size: 13px; cursor: grab;
  touch-action: none; user-select: none;
}
.sign-card.dragging { opacity: .85; cursor: grabbing; box-shadow: 0 8px 18px rgba(0, 0, 0, .25); }
.sign-card.locked { cursor: default; border-color: #b9d8be; background: #f1f8f2; }
.sign-ico { line-height: 0; }

/* ---------- 消息 ---------- */
.msg {
  position: absolute;
  top: 56px;
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
  max-width: 80%;
  text-align: center;
}
.msg.show, .msg.info, .msg.good, .msg.warn, .msg.bad { opacity: 1; transform: translateX(-50%) translateY(0); }
.msg.good { background: rgba(46, 125, 50, .94); }
.msg.warn { background: rgba(240, 150, 30, .94); }
.msg.bad { background: rgba(198, 40, 40, .94); }

/* ---------- 覆盖层（开始/结算） ---------- */
.overlay {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .82);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  pointer-events: auto;
}
.panel-box {
  width: 560px;
  max-height: 92%;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 28px 36px;
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
.stars { color: #f0b429; font-size: 16px; margin: 6px 0; }
.objs { text-align: left; background: #f6f8fa; border-radius: 8px; padding: 12px 18px; margin: 12px 0; font-size: 14px; }
.objs ul { margin: 8px 0 0; padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
.lv-stars { font-size: 34px; color: #f0b429; letter-spacing: .1em; margin: 10px 0 2px; }
.verdict { color: #2b6cb0; font-size: 15px; margin: 6px 0 16px; }

.score-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
.score-table td { padding: 7px 12px; border-bottom: 1px solid #eef1f5; text-align: left; }
.score-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.score-table tr.total td { border-top: 2px solid #122d94; border-bottom: none; font-size: 17px; color: #122d94; }

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>

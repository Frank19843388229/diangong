<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K11-04 · 安全工器具与仪器仪表的使用04</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>失误 <b>{{ mistakes }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <div class="banner" v-if="screen === 'play' && phase >= 0">
          <b>阶段 {{ phase + 1 }}/12 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⏸ 任务暂停中…</div>

        <div class="panel" ref="panelRef">
          <!-- 任务1：选择合格的安全用具 -->
          <div v-if="phase === 0" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 1：选择合格的安全用具</h3>
            <p class="tip">选择安全帽、工作服、安全带（含围杆带、安全绳）、绝缘鞋和脚扣，检查外观、有效标识及各部件状态。<b>不合格用品不得进入后续任务。</b></p>
            <div class="grid7">
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
              <button class="btn primary" @click="p1Confirm">确认，进入穿戴</button>
            </div>
          </div>

          <!-- 任务2：规范穿戴 -->
          <div v-if="phase === 1" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 2：规范穿戴个人防护用品</h3>
            <p class="tip">正确佩戴安全帽，穿好工作服和绝缘鞋，检查安全带及附件的穿戴和连接状态。清单顺序已随机打乱，按正确顺序全部点完后由系统结算判定。</p>
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
            <p class="status">系统检测：帽带 <i>√</i>　衣扣 <i>√</i>　腰带 <i>√</i>　围杆带 <i>√</i>　安全绳 <i>√</i>　鞋底 <i>√</i>（随操作逐步确认）</p>
          </div>

          <!-- 任务3：设置安全围栏与标示牌 -->
          <div v-if="phase === 2" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 3：设置安全围栏与标示牌</h3>
            <p class="tip">拖动<b>安全围栏</b>建立作业区域，选择适用的<b>标示牌</b>，并确认监护人到位。未完成现场安全布置，不得开始登杆。</p>
            <div class="row">
              <div v-if="!S.fence" class="chip" @pointerdown="e => startDrag(e, onFenceDrop)">🧱 安全围栏</div>
            </div>
            <div class="row">
              标示牌：
              <button
                v-for="s in signOptions"
                :key="s"
                class="btn tool"
                :class="{ sel: S.signText === s }"
                :disabled="!!S.signText"
                @click="p3Sign(s)"
              >{{ s }}</button>
            </div>
            <div class="row">
              监护人：
              <label v-for="g in ['无人', '张三', '李四']" :key="g" class="radio">
                <input type="radio" :value="g" v-model="S.guard" @change="p3Check"> {{ g }}
              </label>
            </div>
            <p class="status">
              围栏 {{ S.fence ? '√' : '×' }}　标示牌 {{ S.signText ? '√（' + S.signText + '）' : '×' }}　监护人 {{ S.guard && S.guard !== '无人' ? '√（' + S.guard + '）' : '×' }}
            </p>
          </div>
          <div v-if="phase === 2" class="zone" id="zone-fence" style="left:250px;top:432px;width:212px;height:102px"><span>作业区域</span></div>

          <!-- 任务4：登杆前检查电杆 -->
          <div v-if="phase === 3" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 4：登杆前检查电杆</h3>
            <p class="tip">点击画面中的<b>电杆</b>，核对线路名称与杆号，检查杆根、基础及拉线是否牢固。发现异常时，停止作业并报告。</p>
            <p class="status">线路名称：<b>10kV XX线路</b>　杆号：<b>0123号杆</b>（已核对）</p>
          </div>
          <div v-if="phase === 3 && p4.modal" class="modal-mask" @click.self="p4.modal = false">
            <div class="modal">
              <h4>登杆前检查</h4>
              <div class="mrow ok"><span>线路名称</span><b>10kV XX线路 ✔</b></div>
              <div class="mrow ok"><span>杆号</span><b>0123号杆 ✔</b></div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('杆根') }">
                <span>杆根</span>
                <label class="radio"><input type="radio" value="松动" v-model="p4.root"> 松动</label>
                <label class="radio"><input type="radio" value="腐蚀" v-model="p4.root"> 腐蚀</label>
                <label class="radio"><input type="radio" value="正常" v-model="p4.root"> 正常</label>
              </div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('基础') }">
                <span>基础</span>
                <label class="radio"><input type="radio" value="开裂" v-model="p4.base"> 开裂</label>
                <label class="radio"><input type="radio" value="下沉" v-model="p4.base"> 下沉</label>
                <label class="radio"><input type="radio" value="正常" v-model="p4.base"> 正常</label>
              </div>
              <div class="mrow" :class="{ wrong: p4.wrong.includes('拉线') }">
                <span>拉线</span>
                <label class="radio"><input type="radio" value="松弛" v-model="p4.guy"> 松弛</label>
                <label class="radio"><input type="radio" value="断裂" v-model="p4.guy"> 断裂</label>
                <label class="radio"><input type="radio" value="牢固" v-model="p4.guy"> 牢固</label>
              </div>
              <div class="row">
                <button class="btn primary" @click="p4Confirm">确认检查结果</button>
              </div>
            </div>
          </div>

          <!-- 任务5：检查登杆工器具 -->
          <div v-if="phase === 4" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 5：检查登杆工器具</h3>
            <p class="tip">检查脚扣、围杆带和安全绳，完成人体冲击试验或牵拉试验。任何项目不合格，都必须更换或处理后重新检查。</p>
            <div class="row">
              <div v-if="!t5.strapOnMat" class="chip" @pointerdown="e => startDrag(e, onStrapDrop)">🦿 脚扣</div>
            </div>
            <div class="row" v-if="t5.strapOnMat">
              <button class="btn" :disabled="t5.weight !== 0" @click="t5Weight">① 施加 80kg 模拟重量</button>
              <button class="btn" :disabled="t5.weight !== 2" @click="t5Release">② 释放</button>
              <span v-if="t5.strapDone" class="ok-tag">脚扣合格 ✔</span>
            </div>
            <div class="row">
              <button class="btn" :disabled="t5.beltTest" @click="t5Belt">围杆带：牵拉试验</button>
              <span v-if="t5.beltTest" class="ok-tag">无断裂、连接牢固 ✔</span>
            </div>
            <div class="row">
              安全绳：
              <button
                v-for="(ck, i) in ropeChecks"
                :key="i"
                class="btn"
                :disabled="t5.ropeDone[i]"
                @click="t5RopeCheck(i)"
              >{{ ck }}</button>
              <span v-if="t5.ropeDone.every(Boolean)" class="ok-tag">安全绳合格 ✔</span>
            </div>
          </div>
          <div v-if="phase === 4" class="zone" id="zone-mat" style="left:418px;top:455px;width:152px;height:75px"><span>测试区</span></div>

          <!-- 任务6：登杆、挂设安全带及下杆 -->
          <div v-if="phase === 5" class="sheet sheet-compact" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 6：登杆、挂设安全带及下杆</h3>
            <p class="tip" v-if="!S.climb.started">先点击 <b>开始登杆</b> 确认检查完成，再用画面下方虚拟按键登杆：<b>左脚扣 ↑</b>、<b>右脚扣 ↑</b> 交替上移，<b>↓ 下移</b>；必须左右脚交替，禁止快速攀爬。</p>
            <p class="tip" v-else-if="!S.climb.attached">登至 <b>2.5m</b> 指定位置后，点击<b>红色固定点</b>挂设安全带（高挂低用）。<b>切勿点击灰色低挂点。</b></p>
            <p class="tip" v-else>安全带已挂设 —— 请按 <b>↓</b> <b>规范下杆</b>至地面。</p>
            <p class="status">
              高度 <b>{{ S.climb.h.toFixed(1) }} m</b> / 2.5 m　脚扣：{{ S.climb.last === 'L' ? '左脚在上' : S.climb.last === 'R' ? '右脚在上' : '—' }}　安全带：{{ S.climb.attached ? '已高挂低用' : '未挂设' }}
            </p>
            <div class="row" v-if="!S.climb.started">
              <button class="btn primary" @click="climbStart">开始登杆</button>
            </div>
          </div>

          <!-- 任务7：选择并穿戴防护眼镜 -->
          <div v-if="phase === 6" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 7：选择并穿戴防护眼镜</h3>
            <p class="tip">从工具柜中选择适合任务、状态完好的防护眼镜，检查镜片和镜架，按要求佩戴。<b>普通眼镜不能自动视为合格的作业防护眼镜。</b></p>
            <div class="row tools">
              <button
                v-for="t in glassOptions"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '防护眼镜' && gGlass.tool }"
                @click="gGlassPick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <template v-if="gGlass.tool">
              <div class="row">
                <b>镜片检查：</b>
                <button class="btn" :disabled="gGlass.lens[0]" @click="gGlassLook(0, 'lens')">无裂痕</button>
                <button class="btn" :disabled="gGlass.lens[1]" @click="gGlassLook(1, 'lens')">无划痕</button>
              </div>
              <div class="row">
                <b>镜架检查：</b>
                <button class="btn" :disabled="gGlass.frame[0]" @click="gGlassLook(0, 'frame')">无变形</button>
                <button class="btn" :disabled="gGlass.frame[1]" @click="gGlassLook(1, 'frame')">连接牢固</button>
              </div>
              <div class="row">
                <b>佩戴：</b>
                <button class="btn primary" :disabled="!gGlassReady || gGlass.worn" @click="gGlassWear">按要求佩戴</button>
              </div>
              <p class="status" v-if="gGlass.done">检查结果：镜片完好、镜架牢固、佩戴正确 —— <b>合格</b></p>
            </template>
          </div>

          <!-- 任务8：选择合格的绝缘垫 -->
          <div v-if="phase === 7" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 8：选择合格的绝缘垫</h3>
            <p class="tip">检查绝缘垫的适用等级、标识、外观及使用状态，选择符合任务要求的产品，识别破损、污染或状态不明等不合格情况。</p>
            <div class="row tools">
              <button
                v-for="t in matOptions"
                :key="t"
                class="btn tool"
                :class="{ sel: t === matCorrect && gMat.tool }"
                @click="gMatPick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <template v-if="gMat.tool">
              <p class="fatal-note">注意：绝缘垫是辅助防护措施，不能替代停电、隔离等安全措施。</p>
              <div class="row">
                <b>检查：</b>
                <button
                  v-for="(ck, i) in matChecks"
                  :key="i"
                  class="btn"
                  :disabled="gMat.done[i] || gMat.checkIdx !== i"
                  @click="gMatCheck(i)"
                >{{ ck }}</button>
              </div>
              <p class="status" v-if="gMat.done.every(Boolean)">检查结果：等级标识清晰、外观完好、使用状态正常 —— <b>合格</b></p>
            </template>
          </div>

          <!-- 任务9：指针式万用表测量电压 -->
          <div v-if="phase === 8" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 9：指针式万用表测量电压</h3>
            <p class="tip">测量对象：<b>模拟电路电源电压（交流）</b>。选择指针式万用表，设置电压类型与量程，读取并记录电压。<b>错误使用仪表将被暂停任务。</b></p>
            <div class="row tools">
              <button
                v-for="t in ['数字万用表', '指针式万用表', '钳形电流表']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '指针式万用表' && m9.tool }"
                @click="m9Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div class="meter-sim" v-if="m9.tool">
              <div class="mrow">
                <span>电压类型</span>
                <button class="btn" :class="{ sel: m9.type === 'AC' }" @click="m9SetType('AC')">交流电压 AC</button>
                <button class="btn" :class="{ sel: m9.type === 'DC' }" @click="m9SetType('DC')">直流电压 DC</button>
                <span>量程</span>
                <button
                  v-for="r in m9Ranges"
                  :key="r"
                  class="btn"
                  :class="{ sel: m9.range === r }"
                  @click="m9SetRange(r)"
                >{{ r }}</button>
              </div>
              <svg class="dial" viewBox="0 0 200 120">
                <path d="M20 110 A 90 90 0 0 1 180 110" fill="#fdfdfd" stroke="#333" stroke-width="2"/>
                <g v-for="tk in m9Ticks" :key="tk.label">
                  <line :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" stroke="#333" stroke-width="1.5"/>
                  <text :x="tk.lx" :y="tk.ly" font-size="9" text-anchor="middle" fill="#333">{{ tk.label }}</text>
                </g>
                <text x="100" y="98" font-size="10" text-anchor="middle" fill="#666">V</text>
                <line x1="100" y1="110" x2="100" y2="38" :transform="'rotate(' + m9needle + ' 100 110)'" stroke="#c62828" stroke-width="2" stroke-linecap="round"/>
                <circle cx="100" cy="110" r="5" fill="#333"/>
              </svg>
              <div class="reading">{{ m9ReadingText }}</div>
              <div class="row">
                <button class="btn primary" @click="m9Energize">接通电路</button>
                <button class="btn primary" :disabled="m9.reading == null" @click="m9Submit">提交电压记录</button>
              </div>
              <div v-if="m9.recorded" class="result-box">
                <p>测量对象：模拟电路电源电压　类型：<b>{{ m9.log.type }}</b></p>
                <p>档位：AC V　量程：<b>{{ m9.log.range }}</b>　读数：<b>{{ m9.log.value }}</b>　判定：<b>{{ m9.log.verdict }}</b></p>
              </div>
            </div>
          </div>

          <!-- 任务10：测量保护接地装置的接地电阻 -->
          <div v-if="phase === 9" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 10：测量保护接地装置的接地电阻</h3>
            <p class="tip">选择接地电阻测试仪，对指定的模拟保护接地装置进行测试，记录接地电阻值，并依据<b>题目给定的接地电阻限值</b>判断状态。</p>
            <div class="row tools">
              <button
                v-for="t in ['万用表', '兆欧表', '接地电阻测试仪']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '接地电阻测试仪' && m10.tool }"
                @click="m10Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div class="meter-sim" v-if="m10.tool">
              <div class="row">
                <button class="btn" :class="{ sel: m10.conditions }" @click="m10ConfirmConditions">
                  {{ m10.conditions ? '✔ 已确认：接地装置已断开、测试仪接线正确' : '确认测试条件：接地装置已断开、接线正确' }}
                </button>
              </div>
              <p class="fatal-note" v-if="!m10.conditions">⚠ 未确认测试条件，禁止测试</p>
              <div class="mrow">
                <span>测试对象</span>
                <button
                  v-for="d in m10Devices"
                  :key="d"
                  class="btn"
                  :class="{ sel: m10.current === d }"
                  :disabled="!!m10.devices[d].judged"
                  @click="m10SelectDevice(d)"
                >保护接地装置 {{ d }}</button>
              </div>
              <p class="tip" v-if="m10.current">装置 {{ m10.current }} 的题目规定限值：<b>{{ m10.devices[m10.current].limit }} Ω</b></p>
              <svg class="dial" viewBox="0 0 200 120">
                <path d="M20 110 A 90 90 0 0 1 180 110" fill="#fdfdfd" stroke="#333" stroke-width="2"/>
                <g v-for="tk in m10Ticks" :key="tk.label">
                  <line :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" stroke="#333" stroke-width="1.5"/>
                  <text :x="tk.lx" :y="tk.ly" font-size="9" text-anchor="middle" fill="#333">{{ tk.label }}</text>
                </g>
                <text x="100" y="98" font-size="10" text-anchor="middle" fill="#666">Ω</text>
                <line x1="100" y1="110" x2="100" y2="38" :transform="'rotate(' + m10needle + ' 100 110)'" stroke="#c62828" stroke-width="2" stroke-linecap="round"/>
                <circle cx="100" cy="110" r="5" fill="#333"/>
              </svg>
              <div class="reading">{{ m10ReadingText }}</div>
              <div class="row">
                <button class="btn primary" :disabled="!m10.current || m10.spinning" @click="m10Spin">开始测试</button>
                <template v-if="m10.reading != null && !m10.devices[m10.current].judged">
                  <button class="btn" @click="m10Judge(true)">合格</button>
                  <button class="btn" @click="m10Judge(false)">不合格</button>
                </template>
              </div>
              <div class="row">
                <button class="btn primary" :disabled="!m10AllJudged" @click="m10Submit">提交接地电阻记录</button>
              </div>
              <div v-if="m10.submitted" class="result-box">
                <table class="mini-table">
                  <tr><th>测试对象</th><th>测量值</th><th>限值</th><th>判定</th></tr>
                  <tr v-for="d in m10Devices" :key="d">
                    <td>保护接地装置 {{ d }}</td>
                    <td>{{ m10.devices[d].reading.toFixed(1) }} Ω</td>
                    <td>{{ m10.devices[d].limit }} Ω</td>
                    <td>{{ m10.devices[d].judged }}</td>
                  </tr>
                </table>
                <p>判定：保护接地装置 B 接地电阻超过题目规定限值 —— <b>不合格，需整改后复测</b>。</p>
              </div>
            </div>
          </div>

          <!-- 任务11：识别四类电气安全标志 -->
          <!-- 安全标识识别：.sheet-inline —— 投放区与托盘同在本面板内，拖拽期间不能隐藏 -->
          <div v-if="phase === 10" class="sheet sheet-inline" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 11：识别四类电气安全标志</h3>
            <p class="tip">将安全标志拖放到正确类别。</p>
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

          <!-- 任务12：整理场地 -->
          <div v-if="phase === 11" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 12：整理场地</h3>
            <p class="tip">将工具、仪表和防护用品归位，整理绝缘垫，按考核要求处理围栏和标示牌，确认现场整洁后提交任务。</p>
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

        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K11-04</div>
            <h2>安全工器具与仪器仪表的使用04</h2>
            <p class="sub">低压电工考证综合实训 · 12项任务 · 满分100分</p>
            <div class="objs">
              <p>训练目标：按规定流程完成个人防护、登杆作业、眼部防护、绝缘垫选择、电压测量与接地电阻测试，正确记录仪表读数并完成现场整理。</p>
              <ul>
                <li>安全用具选择与穿戴</li>
                <li>安全围栏、标示牌与监护</li>
                <li>电杆及登杆工器具检查</li>
                <li>登杆、挂设安全带及下杆</li>
                <li>防护眼镜选择与佩戴</li>
                <li>绝缘垫选择与检查</li>
                <li>指针式万用表电压测量</li>
                <li>接地电阻测量与判断</li>
                <li>安全标志识别与场地整理</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 重大违规将暂停当前任务并要求重新操作：防护用品不合格 · 未采取规定的防护措施 · 错误使用仪表 · 未确认测试条件</p>
            <button class="btn primary big" @click="startGame">开始训练</button>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <h2>实训完成</h2>
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
            <div class="record-sec">
              <h4>任务完成状态</h4>
              <ul class="task-list">
                <li v-for="(p, i) in PHASES" :key="i">
                  <b>{{ i < doneCount ? '✔' : '○' }}</b> {{ p.name }}
                </li>
              </ul>
            </div>
            <div v-if="m9.recorded" class="record-sec">
              <h4>万用表测量记录</h4>
              <p>测量对象：模拟电路电源电压　类型：{{ m9.log.type }}　档位：AC V　量程：{{ m9.log.range }}　读数：{{ m9.log.value }}　判定：{{ m9.log.verdict }}</p>
            </div>
            <div v-if="m10.submitted" class="record-sec">
              <h4>接地电阻判定</h4>
              <table class="mini-table">
                <tr><th>测试对象</th><th>测量值</th><th>题目规定限值</th><th>判定</th></tr>
                <tr v-for="d in m10Devices" :key="d">
                  <td>保护接地装置 {{ d }}</td>
                  <td>{{ m10.devices[d].reading.toFixed(1) }} Ω</td>
                  <td>{{ m10.devices[d].limit }} Ω</td>
                  <td>{{ m10.devices[d].judged }}</td>
                </tr>
              </table>
              <p>保护接地装置 B 接地电阻超过题目规定限值，不合格，需整改后复测。</p>
            </div>
            <div class="record-sec">
              <h4>错误记录</h4>
              <p>失误次数：{{ mistakes }} 次（每次重大违规已暂停任务并扣分）</p>
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

    <!-- 登杆虚拟按键：替代原键盘 A/D/↑/↓，触屏可点 -->
    <div class="climb-pad" v-if="screen === 'play' && phase === 5">
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

// ================= 常量 =================
const W = 960, H = 640, GROUND = 520, POLE_X = 380, PXM = 50
const ANCHOR = { x: POLE_X, y: 350 }   // 高挂点
const LOWHOOK = { x: POLE_X, y: 445 }  // 低挂点（陷阱）

const PHASES = [
  { name: '选择合格的安全用具', cat: '安全防护', pts: 10, obj: '选择安全帽、工作服、安全带、围杆带、安全绳、绝缘鞋、脚扣' },
  { name: '规范穿戴防护用品', cat: '安全防护', pts: 5, obj: '按顺序完成穿戴检查' },
  { name: '设置安全围栏与标示牌', cat: '安全识别', pts: 8, obj: '布置围栏、标示牌，确认监护人到位' },
  { name: '登杆前检查电杆', cat: '登杆作业', pts: 5, obj: '核对线路名称、杆号，检查杆根、基础、拉线' },
  { name: '检查登杆工器具', cat: '登杆作业', pts: 10, obj: '脚扣冲击试验、围杆带牵拉试验、安全绳检查' },
  { name: '登杆、挂设安全带及下杆', cat: '登杆作业', pts: 15, obj: '登杆至 2.5m，挂设安全带，规范下杆' },
  { name: '选择并穿戴防护眼镜', cat: '仪器使用', pts: 4, obj: '检查镜片、镜架，按要求佩戴' },
  { name: '选择合格的绝缘垫', cat: '仪器使用', pts: 6, obj: '检查等级、标识、外观及使用状态' },
  { name: '指针式万用表测量电压', cat: '仪表测量', pts: 12, obj: '选类型、量程，记录电压读数' },
  { name: '测量保护接地装置接地电阻', cat: '仪表测量', pts: 15, obj: '确认测试条件后逐项测试并判定' },
  { name: '识别四类电气安全标志', cat: '安全识别', pts: 5, obj: '8 个安全标志分类' },
  { name: '整理场地', cat: '安全识别', pts: 5, obj: '工具仪表归位、整理绝缘垫、处理围栏标示牌' },
]

// ================= 模板引用 =================
const stageRef = ref(null)
const canvasRef = ref(null)
const ctx = ref(null)

// ================= 流程状态 =================
const screen = ref('title')
const phase = ref(-1)
const sheetOpen = ref(true)
const doneCount = ref(0)
const lock = ref(false)
const paused = ref(false)
const mistakes = ref(0)

const cats = reactive({
  '安全防护': { got: 0, max: 15 },
  '登杆作业': { got: 0, max: 30 },
  '仪器使用': { got: 0, max: 10 },
  '仪表测量': { got: 0, max: 27 },
  '安全识别': { got: 0, max: 18 },
})
const total = computed(() => Object.values(cats).reduce((a, c) => a + c.got, 0))

// 结算时向服务端交卷：由服务端校验考试时长与合格分，通过后才解锁下一关
const { reportResult } = useLevelAttempt()
const { noteIssue, attachReason } = useTrainingReport({
  step: () => phase.value + 1,
  stepName: () => PHASES[phase.value]?.name || '',
})
watch(screen, v => {
  if (v === 'play') resetTrainingReport()
  if (v === 'results') reportResult(total.value, { cats, mistakes: mistakes.value })
})
const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
const verdict = computed(() => {
  const t = total.value
  if (t >= 90) return '具备低压电工作业安全操作能力'
  if (t >= 80) return '基本具备低压电工作业安全操作能力，注意细节'
  if (t >= 60) return '掌握基本操作流程，但存在安全隐患'
  return '安全意识不足，建议重新训练'
})

// ================= 场景状态 =================
const S = reactive({
  fence: false, signText: '', guard: '',
  strapOnMat: false,
  climb: { started: false, h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 },
  insulationMat: true,
  groundGlow: null,
})

// ================= 音效 =================
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

// ================= 消息 =================
const msgText = ref('')
const msgType = ref('')
let msgTimer = null
function showMsg(text, type = 'info') {
  attachReason(text)
  msgText.value = text
  msgType.value = type
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msgType.value = '' }, 2600)
}

// ================= 计分 =================
function addScore(cat, n) { cats[cat].got = Math.min(cats[cat].max, cats[cat].got + n) }
function penalize(cat, n) {
  cats[cat].got = Math.max(0, cats[cat].got - n)
  mistakes.value++
  noteIssue(cat, n)
}
function completePhase(cat, pts) {
  if (lock.value) return
  lock.value = true
  addScore(cat, pts)
  showMsg(`✔ 阶段完成　+${pts} 分`, 'good')
  beep(880, .12)
  later(() => { lock.value = false; enterPhase(phase.value + 1) }, 1400)
}

// ================= 重大违规：暂停当前任务并要求重新操作 =================
function majorViolation(reason, cat, penalty) {
  if (paused.value) return
  triggerFatalExit(reason)
  penalize(cat, penalty)
  showMsg(`重大违规：${reason} —— 当前任务已暂停，请重新操作（-${penalty} 分）`, 'bad')
  beep(120, .4, 'sawtooth')
  paused.value = true
  later(() => {
    paused.value = false
    showMsg('任务已恢复，请重新操作', 'info')
  }, 2400)
}

const timers = []
let runId = 0
function later(fn, ms) {
  const id = runId
  const t = setTimeout(() => { if (id === runId) fn() }, ms)
  timers.push(t)
}
function enterPhase(i) {
  phase.value = i
  sheetOpen.value = true
  doneCount.value = i
  paused.value = false
  if (i >= PHASES.length) { screen.value = 'results'; return }
  const c = canvasRef.value
  c.style.cursor = i === 3 ? 'pointer' : i === 5 ? 'crosshair' : 'default'
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

function hitEl(x, y, id) {
  // 带容差：目标可视框之外再放宽一圈，手指不必精确压在框内
  return hitElId(x, y, id)
}

// ================= 任务 1：选择合格的安全用具 =================
const ppe = reactive({
  groups: [
    { label: '安全帽', opts: ['普通帽', '电工安全帽', '施工帽'], correct: '电工安全帽' },
    { label: '工作服', opts: ['普通衣服', '电工作业服', '化纤外套'], correct: '电工作业服' },
    { label: '安全带', opts: ['普通腰带', '单保险安全带', '双保险安全带'], correct: '双保险安全带' },
    { label: '围杆带', opts: ['损坏围杆带', '合格围杆带'], correct: '合格围杆带' },
    { label: '安全绳', opts: ['断股安全绳', '合格安全绳'], correct: '合格安全绳' },
    { label: '绝缘鞋', opts: ['运动鞋', '电工绝缘鞋', '劳保鞋'], correct: '电工绝缘鞋' },
    { label: '脚扣', opts: ['损坏脚扣', '合格脚扣'], correct: '合格脚扣' },
  ],
  sel: {},
})
function p1Confirm() {
  if (paused.value) return
  const ok = ppe.groups.every((g, i) => ppe.sel[i] === g.correct)
  if (ok) completePhase('安全防护', 10)
  else majorViolation('防护用品不合格仍继续作业（必须更换为合格用品）', '安全防护', 5)
}

// ================= 任务 2：规范穿戴 =================
const wearSteps = [
  ['安全帽', '佩戴安全帽'],
  ['安全帽', '调整帽带'],
  ['工作服', '穿工作服'],
  ['安全带', '检查安全带'],
  ['围杆带', '检查围杆带'],
  ['安全绳', '检查安全绳'],
  ['绝缘鞋', '穿绝缘鞋'],
]
// 乱序显示：wearOrder 仅影响展示顺序，wearSteps 始终是权威正确顺序（结算时校验）
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
  if (wearSeq.value.includes(i)) return // 已点击项不重复计数
  wearSeq.value.push(i)
  beep(620, .06)
  if (wearSeq.value.length < wearSteps.length) return
  // 全部点完 → 统一结算判定点击顺序是否正确
  if (wearSeq.value.every((v, k) => v === k)) {
    showMsg('穿戴顺序正确，检查通过 ✔', 'good')
    completePhase('安全防护', 5)
  } else {
    // 结算失败时按点击序列给出对应提示（对应任务说明中的典型错误）
    const p = k => wearSeq.value.indexOf(k)
    if (p(1) > p(2)) showMsg('错误：未系帽带 —— 应先完成「安全帽：调整帽带」', 'bad')
    else if (p(3) > p(4)) showMsg('错误：安全带未扣紧 —— 应先完成「安全带：检查安全带」', 'bad')
    else showMsg('顺序错误！正确顺序：安全帽 → 工作服 → 安全带 → 围杆带 → 安全绳 → 绝缘鞋 —— 已清空，请按顺序重新点击', 'warn')
    beep(220, .1)
    wearSeq.value = []
  }
}

// ================= 任务 3：设置安全围栏与标示牌 =================
const signOptions = ['⚠ 当心触电', '禁止靠近', '正在作业']
function onFenceDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-fence')) { S.fence = true; beep(700, .08); p3Check() }
  else { restore(); showMsg('请将安全围栏拖到杆塔周围的作业区域（虚线框）', 'warn') }
}
function p3Sign(s) {
  if (s === '⚠ 当心触电') { S.signText = s; beep(700, .08); showMsg('标示牌已设置：当心触电', 'good') }
  else {
    penalize('安全识别', 2)
    showMsg('标示牌内容错误：检修作业应设置「当心触电」警示牌（-2 分）', 'warn')
    beep(220, .1)
  }
  p3Check()
}
function p3Check() {
  if (S.fence && S.signText && S.guard && S.guard !== '无人') completePhase('安全识别', 8)
}

// ================= 任务 4：登杆前检查电杆 =================
const p4 = reactive({ modal: false, root: '', base: '', guy: '', wrong: [] })
function p4Confirm() {
  const rootOk = p4.root === '正常'
  const baseOk = p4.base === '正常'
  const guyOk = p4.guy === '牢固'
  if (rootOk && baseOk && guyOk) {
    p4.modal = false
    completePhase('登杆作业', 5)
  } else {
    penalize('登杆作业', 2)
    p4.wrong = [
      !rootOk ? '杆根' : '',
      !baseOk ? '基础' : '',
      !guyOk ? '拉线' : '',
    ].filter(Boolean)
    showMsg('检查结果不符：' + p4.wrong.join('、') + '，发现异常应停止作业并报告，请再次核对', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务 5：检查登杆工器具 =================
const t5 = reactive({
  strapOnMat: false, strapDone: false,
  weight: 0, wt0: 0, wy: null,
  beltTest: false,
  ropeDone: [false, false, false],
})
const ropeChecks = ['绳体', '挂钩', '锁扣']
function onStrapDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-mat')) { t5.strapOnMat = true; S.strapOnMat = true; beep(700, .08); showMsg('脚扣已放置在测试区', 'good') }
  else { restore(); showMsg('请将脚扣拖到测试区', 'warn') }
}
function t5Weight() {
  t5.weight = 1
  t5.wt0 = performance.now()
  beep(400, .15)
  later(() => { t5.weight = 2; beep(520, .08) }, 700)
}
function t5Release() {
  t5.weight = 3
  t5.wt0 = performance.now()
  beep(500, .1)
  later(() => {
    t5.weight = 0
    t5.strapDone = true
    showMsg('脚扣冲击试验：无变形 —— 合格', 'good')
    t5Check()
  }, 650)
}
function t5Belt() {
  if (t5.beltTest) return
  t5.beltTest = true
  beep(760, .08)
  showMsg('围杆带牵拉试验：无断裂、连接牢固 —— 合格', 'good')
  t5Check()
}
function t5RopeCheck(i) {
  const next = t5.ropeDone.filter(Boolean).length
  if (i !== next) { showMsg('请按顺序检查：绳体 → 挂钩 → 锁扣', 'warn'); beep(220, .1); return }
  t5.ropeDone[i] = true
  beep(700, .06)
  if (t5.ropeDone.every(Boolean)) {
    showMsg('安全绳检查：绳体无断股、挂钩完好、锁扣灵活 —— 合格', 'good')
    t5Check()
  }
}
function t5Check() {
  if (t5.strapDone && t5.beltTest && t5.ropeDone.every(Boolean)) completePhase('登杆作业', 10)
}

// ================= 任务 6：登杆、挂设安全带及下杆 =================
function climbStart() {
  if (paused.value) return
  S.climb.started = true
  beep(700, .08)
  showMsg('检查确认完成，开始登杆（左右脚扣交替上移）', 'good')
}
function tryStep(foot, now) {
  const c = S.climb
  if (c.done) return
  if (c.h >= 2.5) { showMsg('已到达 2.5m 指定位置，请点击红色固定点挂设安全带', 'warn'); return }
  if (foot === c.last) {
    c.wobbleUntil = now + 500
    penalize('登杆作业', 2)
    showMsg('违规：必须交替使用脚扣，禁止双脚同时离杆（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  if (now - c.lastT < 250) {
    c.wobbleUntil = now + 500
    penalize('登杆作业', 2)
    showMsg('违规：禁止快速攀爬（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  c.h = Math.min(2.5, c.h + 0.5)
  c.last = foot
  c.lastT = now
  beep(foot === 'L' ? 620 : 560, .05)
  if (c.h >= 2.5) showMsg('已到达 2.5m 指定位置！点击红色固定点挂设安全带', 'good')
}
function climbDown() {
  const c = S.climb
  if (c.done) return
  // 2m 以上必须挂设安全带方可下杆
  if (c.h > 2 && !c.attached) {
    penalize('登杆作业', 2)
    showMsg('违规：2m 以上未挂设安全带，禁止下杆（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  if (c.h <= 0) return
  c.h = Math.max(0, c.h - 0.5)
  c.last = null
  beep(320, .06)
  if (c.h === 0 && c.attached) {
    c.done = true
    showMsg('已规范下杆，作业结束', 'good')
    completePhase('登杆作业', 15)
  }
}
// 触屏虚拟按键：替代原键盘 A/D/↑/↓（登杆必须左右脚交替、禁止快速攀爬）
function climbTap(foot) {
  const c = S.climb
  if (phase.value !== 5 || paused.value || c.done) return
  if (!c.started) { showMsg('请先点击「开始登杆」确认检查完成', 'warn'); return }
  tryStep(foot, performance.now())
}
function climbDownBtn() {
  const c = S.climb
  if (phase.value !== 5 || paused.value || c.done) return
  if (!c.started) { showMsg('请先点击「开始登杆」确认检查完成', 'warn'); return }
  climbDown()
}

// ================= 任务 7：选择并穿戴防护眼镜 =================
const glassOptions = ['普通眼镜', '防护眼镜', '太阳镜']
const gGlass = reactive({ tool: false, lens: [false, false], frame: [false, false], worn: false, done: false })
const gGlassReady = computed(() => gGlass.lens.every(Boolean) && gGlass.frame.every(Boolean))
function gGlassPick(t) {
  if (paused.value) return
  if (t === '防护眼镜') { gGlass.tool = true; beep(600, .06); showMsg('已选用防护眼镜', 'good') }
  else {
    penalize('仪器使用', 2)
    showMsg('普通眼镜/太阳镜不能自动视为合格的作业防护眼镜，请重新选择（-2 分）', 'warn')
    beep(220, .1)
  }
}
function gGlassLook(i, kind) {
  if (paused.value) return
  const arr = gGlass[kind]
  if (arr[i]) return
  arr[i] = true
  beep(680, .05)
  gGlassCheck()
}
function gGlassWear() {
  if (paused.value || !gGlassReady.value || gGlass.worn) return
  gGlass.worn = true
  beep(760, .08)
  gGlassCheck()
}
function gGlassCheck() {
  if (gGlass.lens.every(Boolean) && gGlass.frame.every(Boolean) && gGlass.worn) {
    gGlass.done = true
    completePhase('仪器使用', 4)
  }
}

// ================= 任务 8：选择合格的绝缘垫 =================
const matCorrect = '6kV 绝缘垫（完好）'
const matOptions = [matCorrect, '绝缘垫（有破损）', '绝缘垫（油污污染）', '绝缘垫（标识不清）']
const matChecks = ['等级标识', '外观完好', '使用状态']
const gMat = reactive({ tool: false, done: [false, false, false], checkIdx: 0 })
function gMatPick(t) {
  if (paused.value) return
  if (t === matCorrect) { gMat.tool = true; beep(600, .06); showMsg('已选用 6kV 绝缘垫', 'good') }
  else {
    penalize('仪器使用', 2)
    showMsg('该绝缘垫存在' + (t.includes('破损') ? '破损' : t.includes('油污') ? '油污污染' : '标识不清') + '等不合格情况，请更换（-2 分）', 'warn')
    beep(220, .1)
  }
}
function gMatCheck(i) {
  if (paused.value) return
  if (gMat.done[i] || gMat.checkIdx !== i) return
  gMat.done[i] = true
  gMat.checkIdx++
  beep(700, .06)
  if (gMat.done.every(Boolean)) {
    showMsg('绝缘垫检查：等级标识清晰、外观完好、使用状态正常 —— 合格', 'good')
    completePhase('仪器使用', 6)
  }
}
// ================= 任务 9：指针式万用表测量电压 =================
const m9Ranges = ['10V', '50V', '250V', '500V']
const m9 = reactive({ tool: false, type: '', range: '10V', connected: false, overrange: false, reverse: false, reading: null, recorded: false, log: null })
const m9ReadingText = computed(() => {
  if (m9.reverse) return '指针反偏'
  if (!m9.connected && !m9.overrange) return '——'
  if (m9.overrange) return '超量程'
  return m9.reading.toFixed(1) + ' V'
})
const m9needle = computed(() => {
  if (m9.reverse) return -100
  if (m9.overrange) return 90
  if (m9.connected) return -90 + (m9.reading / parseFloat(m9.range)) * 180
  return -90
})
const m9Ticks = computed(() => {
  const max = parseFloat(m9.range)
  const arr = []
  for (let i = 0; i <= 5; i++) {
    const ang = (-90 + i * 36) * Math.PI / 180
    arr.push({
      x1: 100 + Math.sin(ang) * 72, y1: 110 - Math.cos(ang) * 72,
      x2: 100 + Math.sin(ang) * 82, y2: 110 - Math.cos(ang) * 82,
      label: Math.round(max * i / 5),
      lx: 100 + Math.sin(ang) * 60, ly: 110 - Math.cos(ang) * 60 + 3,
    })
  }
  return arr
})
function m9Pick(t) {
  if (paused.value) return
  if (t === '指针式万用表') { m9.tool = true; beep(600, .06) }
  else {
    penalize('仪表测量', 2)
    showMsg('测量电压请选用指针式万用表', 'warn')
    beep(220, .1)
  }
}
function m9SetType(t) {
  m9.type = t
  m9.connected = false
  m9.overrange = false
  m9.reverse = false
  m9.reading = null
  beep(500, .04)
}
function m9SetRange(r) {
  m9.range = r
  m9.connected = false
  m9.overrange = false
  m9.reverse = false
  m9.reading = null
  beep(500, .04)
}
function m9Energize() {
  if (paused.value) return
  if (m9.type === 'DC') {
    m9.reverse = true
    m9.connected = false
    m9.reading = null
    majorViolation('错误使用仪表：测量交流电压应选择交流电压档（直流档指针反偏）', '仪表测量', 3)
    return
  }
  if (m9.type !== 'AC') {
    showMsg('请先选择电压类型（题目给定：交流）', 'warn')
    beep(220, .1)
    return
  }
  const max = parseFloat(m9.range)
  if (max < 220) {
    m9.overrange = true
    m9.connected = false
    m9.reading = null
    majorViolation('错误使用仪表：量程过小，指针超量程（应选择 250V 及以上量程）', '仪表测量', 3)
    return
  }
  m9.overrange = false
  m9.reverse = false
  m9.connected = true
  m9.reading = 220
  beep(880, .1)
  showMsg('电路已接通，指针指示 220.0 V', 'good')
}
function m9Submit() {
  if (paused.value) return
  if (m9.connected && m9.reading === 220) {
    const rangeVal = parseFloat(m9.range)
    if (rangeVal === 250) {
      m9.recorded = true
      m9.log = { type: '交流电压 AC', range: '250V', value: '220.0 V', verdict: '合格' }
      completePhase('仪表测量', 12)
    } else {
      m9.recorded = true
      m9.log = { type: '交流电压 AC', range: '500V', value: '220.0 V', verdict: '合格（量程偏大）' }
      penalize('仪表测量', 2)
      showMsg('量程选择偏大（应选 250V），记录有效（-2 分）', 'warn')
      completePhase('仪表测量', 10)
    }
  } else {
    penalize('仪表测量', 2)
    showMsg('记录无效：请确认电压类型 AC、量程 250V、读数 220.0V', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务 10：测量保护接地装置的接地电阻 =================
const m10Devices = ['A', 'B', 'C']
const m10 = reactive({
  tool: false, conditions: false, current: null, spinning: false, spinTick: 0,
  reading: null, submitted: false,
  devices: {
    'A': { limit: 4, reading: 2.5, judged: null },
    'B': { limit: 4, reading: 5.8, judged: null },
    'C': { limit: 10, reading: 7.6, judged: null },
  },
})
const m10AllJudged = computed(() => m10Devices.every(d => !!m10.devices[d].judged))
const m10ReadingText = computed(() => {
  if (m10.spinning) return '测试中…'
  if (m10.reading == null) return '——'
  return m10.reading.toFixed(1) + ' Ω'
})
const m10needle = computed(() => {
  if (m10.spinning) return -90 + (Math.sin(m10.spinTick / 2) * 0.5 + 0.5) * 180
  if (m10.reading == null) return -90
  return -90 + (m10.reading / 10) * 180
})
const m10Ticks = computed(() => {
  const vals = [0, 2, 4, 6, 8, 10]
  const arr = []
  for (let i = 0; i < vals.length; i++) {
    const ang = (-90 + i * 36) * Math.PI / 180
    arr.push({
      x1: 100 + Math.sin(ang) * 72, y1: 110 - Math.cos(ang) * 72,
      x2: 100 + Math.sin(ang) * 82, y2: 110 - Math.cos(ang) * 82,
      label: vals[i],
      lx: 100 + Math.sin(ang) * 60, ly: 110 - Math.cos(ang) * 60 + 3,
    })
  }
  return arr
})
function m10Pick(t) {
  if (paused.value) return
  if (t === '接地电阻测试仪') { m10.tool = true; beep(600, .06) }
  else {
    penalize('仪表测量', 2)
    showMsg('接地电阻测量请选用接地电阻测试仪', 'warn')
    beep(220, .1)
  }
}
function m10ConfirmConditions() {
  m10.conditions = true
  beep(700, .08)
  showMsg('已确认测试条件：接地装置已断开、测试仪接线正确', 'good')
}
function m10SelectDevice(d) {
  m10.current = d
  m10.reading = null
  beep(500, .04)
}
function m10Spin() {
  if (paused.value || !m10.current || m10.spinning) return
  if (!m10.conditions) {
    majorViolation('未确认测试条件：测试前必须确认接地装置已断开、测试仪接线正确', '仪表测量', 3)
    return
  }
  m10.spinning = true
  m10.spinTick = 0
  S.groundGlow = m10.current
  const iv = setInterval(() => { m10.spinTick++ }, 60)
  timers.push(iv)
  later(() => {
    clearInterval(iv)
    m10.spinning = false
    S.groundGlow = null
    m10.reading = m10.devices[m10.current].reading
    beep(880, .1)
    showMsg(`保护接地装置 ${m10.current}：接地电阻 ${m10.reading.toFixed(1)} Ω（题目规定限值 ${m10.devices[m10.current].limit} Ω）`, 'good')
  }, 1200)
}
function m10Judge(ok) {
  const d = m10.current
  if (paused.value || !d || m10.reading == null || m10.devices[d].judged) return
  const dev = m10.devices[d]
  const expect = dev.reading <= dev.limit
  if (ok === expect) {
    dev.judged = ok ? '合格' : '不合格'
    beep(760, .08)
    if (!ok) showMsg(`装置 ${d} 接地电阻 ${dev.reading.toFixed(1)}Ω 超过限值 ${dev.limit}Ω —— 判定不合格，需整改`, 'warn')
  } else {
    penalize('仪表测量', 2)
    showMsg(`判定错误：${dev.reading.toFixed(1)}Ω 与限值 ${dev.limit}Ω 比较（-2 分）`, 'warn')
    beep(220, .1)
  }
}
function m10Submit() {
  if (paused.value || !m10AllJudged.value) return
  m10.submitted = true
  completePhase('仪表测量', 15)
}

// ================= 任务 11：识别四类电气安全标志 =================
function signSvg(type) {
  if (type === 'prohibit')
    return `<svg viewBox="0 0 60 60" width="46" height="46"><circle cx="30" cy="30" r="24" fill="#fff" stroke="#d32f2f" stroke-width="6"/><line x1="14" y1="46" x2="46" y2="14" stroke="#d32f2f" stroke-width="6"/></svg>`
  if (type === 'mandatory')
    return `<svg viewBox="0 0 60 60" width="46" height="46"><circle cx="30" cy="30" r="24" fill="#1565c0"/><text x="30" y="40" font-size="24" text-anchor="middle">🪖</text></svg>`
  if (type === 'warning')
    return `<svg viewBox="0 0 60 60" width="46" height="46"><path d="M30 7 L55 51 L5 51 Z" fill="#fdd835" stroke="#222" stroke-width="4" stroke-linejoin="round"/><text x="30" y="45" font-size="24" font-weight="bold" text-anchor="middle" fill="#222">!</text></svg>`
  return `<svg viewBox="0 0 60 60" width="46" height="46"><rect x="6" y="6" width="48" height="48" rx="4" fill="#2e7d32"/><text x="30" y="40" font-size="24" text-anchor="middle">🚪</text></svg>`
}
const signDefs = [
  { id: 's1', label: '禁止合闸', cat: '禁止区', svg: signSvg('prohibit') },
  { id: 's2', label: '禁止烟火', cat: '禁止区', svg: signSvg('prohibit') },
  { id: 's3', label: '必须戴安全帽', cat: '指令区', svg: signSvg('mandatory') },
  { id: 's4', label: '必须穿绝缘鞋', cat: '指令区', svg: signSvg('mandatory') },
  { id: 's5', label: '当心触电', cat: '警告区', svg: signSvg('warning') },
  { id: 's6', label: '高压危险', cat: '警告区', svg: signSvg('warning') },
  { id: 's7', label: '安全出口', cat: '提示区', svg: signSvg('hint') },
  { id: 's8', label: '紧急出口', cat: '提示区', svg: signSvg('hint') },
]
const signZones = ['禁止区', '指令区', '警告区', '提示区']
const placed = reactive({})
function signDrop(def, x, y, restore) {
  // 分类区是相邻网格：小容差 + 取最近的一格，避免放宽后跨格误判
  const zone = nearestElId(x, y, signZones.map(z => 'sz-' + z))
  if (zone && zone === def.cat) {
    placed[def.id] = zone
    beep(760, .08)
  } else {
    restore()
    if (zone) {
      penalize('安全识别', 1)
      showMsg(`分类错误：「${def.label}」不属于${zone}（-1 分）`, 'warn')
      beep(220, .1)
    }
  }
  if (Object.keys(placed).length === 8) completePhase('安全识别', 5)
}

// ================= 任务 12：整理场地 =================
const cleanupItems = [
  { key: 'strap', label: '收回脚扣' },
  { key: 'belt', label: '收回安全带' },
  { key: 'glass', label: '防护眼镜归位' },
  { key: 'mat', label: '整理绝缘垫' },
  { key: 'meter', label: '仪表归位' },
  { key: 'fence', label: '拆除围栏' },
  { key: 'sign', label: '收回标示牌' },
  { key: 'site', label: '清理现场' },
]
const cleanupDone = reactive({})
function doCleanup(item) {
  if (cleanupDone[item.key]) return
  cleanupDone[item.key] = true
  beep(680, .06)
  if (item.key === 'fence') S.fence = false
  if (item.key === 'sign') S.signText = ''
  if (item.key === 'mat') S.insulationMat = false
  showMsg(`${item.label} ✔`, 'good')
  if (cleanupItems.every(i => cleanupDone[i.key])) {
    later(() => completePhase('安全识别', 5), 900)
  }
}

// ================= 游戏流程 =================
function resetState() {
  S.fence = false; S.signText = ''; S.guard = ''
  S.strapOnMat = false
  S.climb = { started: false, h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 }
  S.insulationMat = true
  S.groundGlow = null
  ppe.sel = {}
  shuffleWear()
  p4.modal = false; p4.root = ''; p4.base = ''; p4.guy = ''; p4.wrong = []
  t5.strapOnMat = false; t5.strapDone = false; t5.weight = 0; t5.wy = null
  t5.beltTest = false; t5.ropeDone = [false, false, false]
  gGlass.tool = false; gGlass.lens = [false, false]; gGlass.frame = [false, false]; gGlass.worn = false; gGlass.done = false
  gMat.tool = false; gMat.done = [false, false, false]; gMat.checkIdx = 0
  m9.tool = false; m9.type = ''; m9.range = '10V'
  m9.connected = false; m9.overrange = false; m9.reverse = false; m9.reading = null; m9.recorded = false; m9.log = null
  m10.tool = false; m10.conditions = false; m10.current = null; m10.spinning = false; m10.spinTick = 0
  m10.reading = null; m10.submitted = false
  m10.devices = {
    'A': { limit: 4, reading: 2.5, judged: null },
    'B': { limit: 4, reading: 5.8, judged: null },
    'C': { limit: 10, reading: 7.6, judged: null },
  }
  Object.keys(placed).forEach(k => delete placed[k])
  Object.keys(cleanupDone).forEach(k => delete cleanupDone[k])
  mistakes.value = 0
  paused.value = false
  Object.values(cats).forEach(c => { c.got = 0 })
}
function startGame() {
  runId++
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}

// ================= 画布交互 =================
function onCanvasClick(e) {
  if (screen.value !== 'play' || paused.value) return
  const r = canvasRef.value.getBoundingClientRect()
  const x = (e.clientX - r.left) * (W / r.width)
  const y = (e.clientY - r.top) * (H / r.height)
  // 任务4：点击电杆
  if (phase.value === 3 && Math.abs(x - POLE_X) < 40 && y > 100 && y < GROUND) {
    p4.modal = true
    beep(500, .05)
  }
  // 任务6：挂设安全带 / 低挂点陷阱
  if (phase.value === 5) {
    const c = S.climb
    if (c.started && c.h >= 2.5 && !c.attached) {
      if (Math.hypot(x - ANCHOR.x, y - ANCHOR.y) < 32) {
        c.attached = true
        beep(880, .15)
        showMsg('安全带已挂设（高挂低用），请按 ↓ 规范下杆', 'good')
      } else if (Math.hypot(x - LOWHOOK.x, y - LOWHOOK.y) < 28) {
        majorViolation('未采取规定的防护措施（低挂高用，安全带必须高挂低用）', '登杆作业', 5)
      }
    } else if (c.started && c.h < 2.5 && Math.abs(x - POLE_X) < 40) {
      showMsg('继续交替脚扣登杆至 2.5m 指定位置', 'warn')
    }
  }
}

// ================= 画布绘制 =================
function line(c, x1, y1, x2, y2) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
}
function cloud(c, x, y) {
  c.beginPath()
  c.arc(x, y, 16, 0, Math.PI * 2)
  c.arc(x + 18, y + 3, 12, 0, Math.PI * 2)
  c.arc(x - 18, y + 4, 11, 0, Math.PI * 2)
  c.fill()
}
function drawCabinet() {
  const c = ctx.value
  c.fillStyle = '#8b5a2b'; c.fillRect(40, 400, 130, 120)
  c.strokeStyle = '#5d3a17'; c.lineWidth = 3; c.strokeRect(40, 400, 130, 120)
  line(c, 105, 400, 105, 520)
  c.fillStyle = '#666'; c.fillRect(93, 455, 24, 6)
  c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.textAlign = 'center'
  c.fillText('工具柜', 105, 392)
  c.textAlign = 'left'
}
function drawInsulationMat() {
  const c = ctx.value
  if (!S.insulationMat) {
    c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
    c.fillText('绝缘垫（已整理收起）', 290, 545)
    c.textAlign = 'left'
    return
  }
  c.fillStyle = '#1a237e'; c.fillRect(240, 472, 100, 44)
  c.strokeStyle = '#fdd835'; c.lineWidth = 3; c.strokeRect(240, 472, 100, 44)
  c.strokeStyle = 'rgba(253,216,35,.4)'; c.lineWidth = 1
  line(c, 250, 480, 330, 480); line(c, 250, 506, 330, 506)
  c.fillStyle = '#fdd835'; c.font = '12px sans-serif'; c.textAlign = 'center'
  c.fillText('绝缘垫', 290, 498)
  c.textAlign = 'left'
}
function drawBench() {
  const c = ctx.value
  // 仪表操作台
  c.fillStyle = '#8b5a2b'; c.fillRect(570, 468, 140, 12)
  c.fillStyle = '#6f4520'; c.fillRect(576, 480, 8, 40); c.fillRect(696, 480, 8, 40)
  c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
  c.fillText('仪表操作台', 640, 460)
  // 指针式万用表
  c.fillStyle = '#f5f5f5'; c.beginPath(); c.arc(605, 442, 16, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#333'; c.lineWidth = 2; c.stroke()
  c.strokeStyle = '#c62828'; line(c, 605, 442, 598, 432)
  // 接地电阻测试仪
  c.fillStyle = '#37474f'; c.fillRect(648, 426, 56, 30)
  c.strokeStyle = '#111'; c.lineWidth = 2; c.strokeRect(648, 426, 56, 30)
  c.fillStyle = '#f5f5f5'; c.beginPath(); c.arc(676, 441, 9, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#c62828'; line(c, 676, 441, 671, 435)
  c.textAlign = 'left'
}
function drawGroundDevices() {
  const c = ctx.value
  // 模拟保护接地装置：端子箱 + 三根接地棒
  c.fillStyle = '#37474f'; c.fillRect(745, 405, 150, 20)
  c.strokeStyle = '#111'; c.lineWidth = 2; c.strokeRect(745, 405, 150, 20)
  c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.textAlign = 'center'
  c.fillText('模拟保护接地装置', 820, 419)
  const devices = [
    { x: 770, d: 'A', limit: '4Ω' },
    { x: 820, d: 'B', limit: '4Ω' },
    { x: 870, d: 'C', limit: '10Ω' },
  ]
  devices.forEach(dev => {
    c.strokeStyle = '#d32f2f'; c.lineWidth = 2
    line(c, dev.x, 425, dev.x, 415)
    const glowing = S.groundGlow === dev.d
    if (glowing) {
      c.fillStyle = 'rgba(255,213,79,.35)'
      c.beginPath(); c.arc(dev.x, 470, 22, 0, Math.PI * 2); c.fill()
    }
    c.fillStyle = glowing ? '#fdd835' : '#8d8d8d'
    c.fillRect(dev.x - 3, 425, 6, 95)
    const judged = m10.devices[dev.d].judged
    c.fillStyle = judged === '合格' ? '#2e7d32' : judged === '不合格' ? '#c62828' : '#37474f'
    c.font = 'bold 13px sans-serif'
    c.fillText(dev.d, dev.x, 546)
    c.font = '10px sans-serif'
    c.fillText('限值 ' + dev.limit, dev.x, 560)
  })
  c.textAlign = 'left'
}
function drawReturnRack() {
  const c = ctx.value
  // 工具归还点
  c.fillStyle = '#6d6d6d'; c.fillRect(905, 460, 45, 60)
  c.strokeStyle = '#444'; c.lineWidth = 2; c.strokeRect(905, 460, 45, 60)
  c.strokeStyle = '#444'; c.lineWidth = 1.5
  for (let y = 475; y < 515; y += 14) line(c, 905, y, 950, y)
  c.fillStyle = '#37474f'; c.font = '11px sans-serif'; c.textAlign = 'center'
  c.fillText('工具归还点', 927, 452)
  c.textAlign = 'left'
}
function drawFence() {
  const c = ctx.value
  const x = 250, y = 442, w = 206, h = 92
  c.strokeStyle = '#f1c40f'; c.lineWidth = 6
  c.setLineDash([16, 10])
  c.strokeRect(x, y, w, h)
  c.setLineDash([])
  c.fillStyle = '#8d8d8d'
  ;[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(p => c.fillRect(p[0] - 3, p[1] - 12, 6, 14))
  c.fillStyle = '#333'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
  c.fillText('作业区域', x + w / 2, y + h + 16)
  c.textAlign = 'left'
}
function drawWarnSign() {
  const c = ctx.value
  const x = 502, y = 398
  c.fillStyle = '#fdd835'
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + 34, y + 58); c.lineTo(x - 34, y + 58); c.closePath(); c.fill()
  c.strokeStyle = '#222'; c.lineWidth = 4; c.stroke()
  c.fillStyle = '#222'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'
  c.fillText('!', x, y + 44)
  c.fillStyle = '#fff'; c.fillRect(x - 56, y + 62, 112, 22)
  c.strokeStyle = '#222'; c.lineWidth = 2; c.strokeRect(x - 56, y + 62, 112, 22)
  c.fillStyle = '#c62828'; c.font = 'bold 13px sans-serif'
  c.fillText('当心触电', x, y + 78)
  c.textAlign = 'left'
}
function drawStrap(x, y) {
  const c = ctx.value
  c.strokeStyle = '#90a4ae'; c.lineWidth = 5
  c.beginPath(); c.arc(x - 14, y, 15, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke()
  c.beginPath(); c.arc(x + 14, y, 15, Math.PI * 0.15, Math.PI * 0.85, true); c.stroke()
  c.strokeStyle = '#6d4c41'; c.lineWidth = 4
  line(c, x - 14, y - 12, x - 14, y - 26)
  line(c, x + 14, y - 12, x + 14, y - 26)
}
function drawWeight(y) {
  const c = ctx.value
  c.strokeStyle = '#555'; c.lineWidth = 2
  line(c, 490, y - 4, 490, y)
  c.fillStyle = '#78909c'; c.fillRect(455, y - 44, 70, 40)
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(455, y - 44, 70, 40)
  c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
  c.fillText('80kg', 490, y - 18)
  c.textAlign = 'left'
}
function drawWorker(c, x, y, footL, footR) {
  c.save()
  c.lineCap = 'round'
  const hipY = y - 36, shY = y - 62
  c.strokeStyle = '#2b4a7a'; c.lineWidth = 6
  line(c, x - 6, hipY, x - 9, y + footL)
  line(c, x + 6, hipY, x + 9, y + footR)
  c.strokeStyle = '#e67e22'; c.lineWidth = 7
  line(c, x - 10, hipY + 4, x + 10, hipY + 4)
  c.strokeStyle = '#2b6cb0'; c.lineWidth = 11
  line(c, x, hipY, x, shY)
  c.strokeStyle = '#2b4a7a'; c.lineWidth = 5
  line(c, x, shY + 8, x - 15, shY + 2)
  line(c, x, shY + 8, x + 15, shY - 2)
  c.fillStyle = '#f2c89b'
  c.beginPath(); c.arc(x, shY - 13, 9, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#f5c518'
  c.beginPath(); c.arc(x, shY - 15, 10, Math.PI, 0); c.fill()
  c.fillRect(x - 13, shY - 16, 26, 4)
  c.restore()
}
function drawGlasses(c, x, y) {
  // 人物佩戴防护眼镜的提示（任务7期间画在操作者面部）
  c.strokeStyle = '#37474f'; c.lineWidth = 2.5
  c.beginPath(); c.arc(x, y - 63, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke()
  line(c, x - 8, y - 65, x - 15, y - 63)
  line(c, x + 8, y - 65, x + 15, y - 63)
}
function drawCharacter(t) {
  const c = ctx.value
  const cl = S.climb
  if (phase.value === 5) {
    const y = GROUND - cl.h * PXM
    let footL = 0, footR = 0
    if (cl.last === 'L') footL = -14
    else if (cl.last === 'R') footR = -14
    let x = POLE_X
    if (t < cl.wobbleUntil) x += Math.sin(t / 70) * 5
    if (cl.attached) {
      c.strokeStyle = '#e67e22'; c.lineWidth = 4
      c.beginPath()
      c.moveTo(ANCHOR.x, ANCHOR.y)
      c.quadraticCurveTo(ANCHOR.x + 20, (ANCHOR.y + y - 44) / 2, x, y - 44)
      c.stroke()
    }
    drawWorker(c, x, y, footL, footR)
    c.fillStyle = 'rgba(0,0,0,.75)'; c.font = 'bold 16px sans-serif'; c.textAlign = 'left'
    c.fillText('高度 ' + cl.h.toFixed(1) + ' m', POLE_X + 55, y - 62)
    if (cl.started && cl.h >= 2.5 && !cl.attached) {
      const pulse = 1 + 0.18 * Math.sin(t / 180)
      c.strokeStyle = '#c62828'; c.lineWidth = 3
      c.beginPath(); c.arc(ANCHOR.x, ANCHOR.y, 15 * pulse, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#c62828'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
      c.fillText('高处固定点', ANCHOR.x, ANCHOR.y - 30)
      c.strokeStyle = '#777'; c.lineWidth = 3
      c.beginPath(); c.arc(LOWHOOK.x, LOWHOOK.y, 11, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#777'
      c.fillText('低挂点', LOWHOOK.x, LOWHOOK.y + 28)
      c.textAlign = 'left'
    }
  } else {
    drawWorker(c, POLE_X + 55, GROUND, 0, 0)
    if (phase.value === 6) drawGlasses(c, POLE_X + 55, GROUND)
    if (phase.value === 2) {
      c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
      c.fillText('监护人', POLE_X - 130, GROUND - 70)
      drawWorker(c, POLE_X - 130, GROUND, 0, 0)
      c.textAlign = 'left'
    }
  }
}
function drawScene(t) {
  const c = ctx.value
  // 天空
  const g = c.createLinearGradient(0, 0, 0, GROUND)
  g.addColorStop(0, '#79b6dd'); g.addColorStop(1, '#e6f2fa')
  c.fillStyle = g; c.fillRect(0, 0, W, GROUND)
  c.fillStyle = 'rgba(255,255,255,.85)'
  cloud(c, 120, 90); cloud(c, 480, 70); cloud(c, 700, 100)
  // 地面
  c.fillStyle = '#cbb689'; c.fillRect(0, GROUND, W, H - GROUND)
  c.fillStyle = '#ab976f'; c.fillRect(0, GROUND, W, 8)
  c.strokeStyle = '#7d9b52'; c.lineWidth = 2
  for (let x = 30; x < W; x += 70) {
    line(c, x, GROUND + 20, x - 3, GROUND + 8)
    line(c, x + 5, GROUND + 20, x + 8, GROUND + 8)
  }
  // 电杆
  c.fillStyle = '#8a6a35'
  c.fillRect(POLE_X - 7, 120, 14, GROUND - 120)
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1
  for (let y = 150; y < GROUND - 10; y += 26) line(c, POLE_X - 6, y, POLE_X + 6, y + 5)
  // 横担
  c.fillStyle = '#6f5223'
  c.fillRect(312, 158, 116, 8)
  c.fillRect(324, 198, 92, 8)
  // 绝缘子
  c.fillStyle = '#37474f'
  ;[[316, 158], [416, 158], [328, 198], [406, 198]].forEach(p => c.fillRect(p[0] - 3, p[1] - 9, 6, 9))
  // 线路
  c.strokeStyle = '#4a4a4a'; c.lineWidth = 2
  line(c, 316, 156, 0, 138); line(c, 416, 156, W, 136)
  line(c, 328, 196, 0, 184); line(c, 406, 196, W, 180)
  // 拉线
  c.strokeStyle = '#9a9a9a'; c.lineWidth = 3
  line(c, POLE_X, 362, 168, GROUND)
  c.fillStyle = '#555'; c.fillRect(160, GROUND - 6, 16, 6)
  // 杆根
  c.fillStyle = '#6d6d6d'; c.fillRect(POLE_X - 16, GROUND - 10, 32, 10)
  // 登杆阶段：踩板横档 + 2.5m 标记
  if (phase.value === 5) {
    c.strokeStyle = 'rgba(60,40,15,.4)'; c.lineWidth = 3
    for (let y = GROUND - 25; y > 130; y -= 25) line(c, POLE_X - 10, y, POLE_X + 10, y)
    const my = GROUND - 2.5 * PXM
    c.strokeStyle = '#c62828'; c.lineWidth = 2
    c.setLineDash([6, 5])
    line(c, POLE_X - 26, my, POLE_X + 26, my)
    c.setLineDash([])
    c.fillStyle = '#c62828'; c.font = 'bold 12px sans-serif'; c.textAlign = 'left'
    c.fillText('指定位置 2.5m', POLE_X + 30, my + 4)
  }
  drawCabinet()
  drawInsulationMat()
  drawBench()
  drawGroundDevices()
  drawReturnRack()
  // 测试区（任务5）
  if (phase.value === 4 || t5.strapOnMat) {
    c.fillStyle = '#78909c'; c.fillRect(420, 500, 130, 12)
    c.strokeStyle = '#546e7a'; c.lineWidth = 2; c.strokeRect(420, 500, 130, 12)
    c.fillStyle = '#eceff1'; c.font = '12px sans-serif'; c.textAlign = 'center'
    c.fillText('测试区', 485, 532)
    c.textAlign = 'left'
  }
  if (S.fence) drawFence()
  if (S.signText === '⚠ 当心触电') drawWarnSign()
  if (t5.strapOnMat) drawStrap(485, 498)
  // 冲击试验重量
  if (t5.weight === 1) {
    const p = Math.min(1, (t - t5.wt0) / 650)
    t5.wy = 400 + 96 * p * p
  } else if (t5.weight === 2) t5.wy = 496
  else if (t5.weight === 3) {
    const p = Math.min(1, (t - t5.wt0) / 500)
    t5.wy = 496 - 96 * p
    if (p >= 1) t5.wy = null
  } else t5.wy = null
  if (t5.wy != null) drawWeight(t5.wy)
  drawCharacter(t)
}

// ================= 主循环 =================
let raf = null
function loop(t) {
  drawScene(t)
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  ctx.value = canvasRef.value.getContext('2d')
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  timers.forEach(id => { clearTimeout(id); clearInterval(id) })
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

/* ---------- 暂停提示 ---------- */
.pause-badge {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(198, 40, 40, .94);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 700;
  z-index: 45;
  pointer-events: none;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .55; }
}

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
  max-height: 310px;
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
  width: 600px;
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
.row b { font-size: 14px; }
.radio { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; }
.radio input { accent-color: #1a3fc4; }
.ok-tag { color: #2e7d32; font-size: 13px; font-weight: 600; }

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

/* ---------- 任务1：选项（7组） ---------- */
.grid7 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 6px; }
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

/* ---------- 拖拽 ---------- */
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

/* ---------- 弹窗 ---------- */
.modal-mask {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .55);
  display: flex; align-items: center; justify-content: center;
  z-index: 30;
}
.modal {
  width: 460px;
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
}
.modal h4 { margin: 0 0 12px; color: #122d94; }
.mrow {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;
  font-size: 14px; border: 1px solid transparent;
}
.mrow > span { width: 64px; color: #4a5568; flex: none; }
.mrow.ok { background: #f1f8f2; }
.mrow.wrong { background: #fdecea; border-color: #f3c6c6; }

/* ---------- 任务7/8 ---------- */
.tools { gap: 8px; }

/* ---------- 结果框 ---------- */
.result-box {
  margin-top: 10px;
  border: 1px solid #b9d8be;
  background: #f1f8f2;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
}

/* ---------- 清单 ---------- */
.checks { list-style: none; margin: 8px 0 0; padding: 0; display: flex; gap: 12px; flex-wrap: wrap; }
.checks li {
  border: 1px solid #dfe3ea; border-radius: 6px; padding: 6px 12px;
  font-size: 14px; background: #fff;
}
.checks li.done { border-color: #b9d8be; background: #f1f8f2; color: #2e7d32; }
.checks.clickable li { cursor: pointer; }
.checks li:hover { background: #f0f4fa; }

/* ---------- 仪表模拟 ---------- */
.meter-sim {
  border: 1px solid #dfe3ea; border-radius: 8px;
  padding: 12px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
  background: #f8fafc;
}
.mrow {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 10px; border-radius: 6px; font-size: 14px;
  flex-wrap: wrap; justify-content: center;
}
.mrow > span { color: #4a5568; }
.dial {
  width: 240px;
  height: auto;
  background: #fff;
  border: 1px solid #dfe3ea;
  border-radius: 8px;
}
.reading {
  font-family: 'Courier New', monospace;
  font-size: 26px; font-weight: 700;
  color: #122d94;
  font-variant-numeric: tabular-nums;
}
.fatal-note {
  color: #c62828; font-size: 13px; font-weight: 600;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.mini-table { border-collapse: collapse; font-size: 14px; }
.mini-table td, .mini-table th { border: 1px solid #dfe3ea; padding: 4px 14px; text-align: center; }
.mini-table th { background: #ebf3fc; color: #122d94; }

/* ---------- 安全标志分类 ---------- */
.sign-layout { display: flex; gap: 16px; margin-top: 6px; }
.tray { display: flex; gap: 10px; align-items: flex-start; min-height: 110px; flex-wrap: wrap; max-width: 340px; }
.zones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 1; }
.sign-zone {
  min-height: 118px;
  border: 2px dashed #c9d2dd; border-radius: 8px;
  background: #f6f8fa;
  padding: 8px;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.sign-zone em { font-style: normal; font-size: 13px; color: #5d6370; font-weight: 700; }
.sign-card {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: #fff; border: 1px solid #dfe3ea; border-radius: 8px;
  padding: 8px 10px; font-size: 12px; cursor: grab;
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

/* ---------- 覆盖层 ---------- */
.overlay {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .82);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  pointer-events: auto;
}
.panel-box {
  width: 600px;
  max-height: 92%;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 26px 34px;
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
.fatal-reason {
  color: #c62828; font-weight: 600; font-size: 15px;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 8px; padding: 8px 12px; margin: 8px 0;
}
.lv-stars { font-size: 34px; color: #f0b429; letter-spacing: .1em; margin: 10px 0 2px; }
.verdict { color: #2b6cb0; font-size: 15px; margin: 6px 0 12px; }

.score-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
.score-table td { padding: 7px 12px; border-bottom: 1px solid #eef1f5; text-align: left; }
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
.record-sec .mini-table td { border-color: #dfe3ea; }
.task-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; font-size: 13px; }
.task-list b { color: #2e7d32; }

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>
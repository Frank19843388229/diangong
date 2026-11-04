<template>
  <div class="game-page">
    <!-- 顶部 HUD -->
    <header class="hud">
      <span class="htitle">关卡 030101-K11-02 · 安全工器具与仪器仪表的使用02</span>
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
          <b>阶段 {{ phase + 1 }}/12 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <!-- 交互层 -->
        <div class="panel" ref="panelRef">
          <!-- 任务1：选择安全防护用品 -->
          <div v-if="phase === 0" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 1：选择安全防护用品</h3>
            <p class="tip">进入工具柜，选择正确的个人防护用品（每项单选）。</p>
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
              <button class="btn primary" @click="p1Confirm">确认，领取安全装备</button>
            </div>
          </div>

          <!-- 任务2：个人防护用品穿戴 -->
          <div v-if="phase === 1" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 2：个人防护用品穿戴</h3>
            <p class="tip">清单顺序已随机打乱：按正确顺序（安全帽 → 工作服 → 安全带 → 绝缘鞋）依次点击全部 5 项，全部点完后系统结算判定顺序是否正确。</p>
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
            <p class="status">系统检测：安全帽 <i>√</i>　工作服 <i>√</i>　安全带 <i>√</i>　绝缘鞋 <i>√</i>（随操作逐步确认）</p>
          </div>

          <!-- 任务3：设置作业区域 -->
          <div v-if="phase === 2" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 3：设置作业区域</h3>
            <p class="tip">拖动<b>安全围栏</b>建立作业区域，选择<b>标示牌</b>内容，并确认监护人。</p>
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

          <!-- 任务4：检查电杆 -->
          <div v-if="phase === 3" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 4：检查电杆</h3>
            <p class="tip">点击画面中的<b>电杆</b>，核对线路名称与杆号，并检查杆根、基础、拉线。</p>
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

          <!-- 任务5：安全工器具试验 -->
          <div v-if="phase === 4" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 5：安全工器具试验</h3>
            <p class="tip">① 将<b>脚扣</b>拖到测试区，做人体冲击试验（80kg）；② 对<b>围杆带</b>做牵拉试验；③ 依次检查<b>安全绳</b>的绳体、挂钩、锁扣。</p>
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
          <div v-if="phase === 4" class="zone" id="zone-mat" style="left:433px;top:455px;width:172px;height:75px"><span>测试区</span></div>

          <!-- 任务6：登杆作业 -->
          <div v-if="phase === 5" class="sheet sheet-compact" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 6：登杆作业</h3>
            <p class="tip">点击画面下方虚拟按键：<b>左脚扣 ↑</b>、<b>右脚扣 ↑</b> 交替上移，<b>↓ 下移</b>。必须左右脚<b>交替</b>，禁止快速攀爬；安全带全程保护。</p>
            <p class="tip">目标：登至 <b>3.0m</b> 工作位置（2m 以上），点击<b>红色固定点</b>执行「高挂低用」。</p>
            <p class="status">
              高度 <b>{{ S.climb.h.toFixed(1) }} m</b> / 3.0 m　脚扣：{{ S.climb.last === 'L' ? '左脚在上' : S.climb.last === 'R' ? '右脚在上' : '—' }}　安全带：已连接
            </p>
          </div>

          <!-- 任务7：低压绝缘手套检查 -->
          <div v-if="phase === 6" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 7：低压绝缘手套检查</h3>
            <p class="tip">选择<b>00级低压绝缘手套</b>，完成外观检查与气密性检查。</p>
            <div class="row tools">
              <button
                v-for="t in ['普通棉手套', '00级低压绝缘手套', '皮手套']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '00级低压绝缘手套' && g7.tool }"
                @click="g7Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <template v-if="g7.tool">
              <div class="row">
                <b>外观检查：</b>
                <button class="btn" :disabled="g7.look[0]" @click="g7Look(0)">无破损</button>
                <button class="btn" :disabled="g7.look[1]" @click="g7Look(1)">无裂纹</button>
              </div>
              <div class="row">
                <b>气密性检查：</b>
                <button
                  v-for="(ck, i) in airSteps"
                  :key="i"
                  class="btn"
                  :disabled="g7.air[i] || g7.airIdx !== i"
                  @click="g7Air(i)"
                >{{ ck }}</button>
              </div>
              <p class="status" v-if="g7.done">检查结果：外观合格、气密性合格 —— <b>合格</b></p>
            </template>
          </div>

          <!-- 任务8：选择携带型低压短路接地线 -->
          <div v-if="phase === 7" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 8：选择携带型低压短路接地线</h3>
            <p class="tip">从工具柜中选择正确的接地线（<b>重大违规项</b>：选错接地线一票否决）。</p>
            <div class="row tools">
              <button
                v-for="t in ['普通导线', '携带型低压短路接地线', '测试线']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '携带型低压短路接地线' && g8.tool }"
                @click="g8Pick(t)"
              >{{ t }}</button>
            </div>
            <template v-if="g8.tool">
              <div class="row">
                <b>检查：</b>
                <button class="btn" :disabled="g8.look[0]" @click="g8Look(0)">接地夹</button>
                <button class="btn" :disabled="g8.look[1]" @click="g8Look(1)">导线</button>
                <button class="btn" :disabled="g8.look[2]" @click="g8Look(2)">连接端子</button>
              </div>
              <p class="status" v-if="g8.done">检查结果：接地夹牢固、导线无断股、端子接触良好 —— <b>合格</b></p>
            </template>
          </div>

          <!-- 任务9：数字万用表测量电阻 -->
          <div v-if="phase === 8" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 9：数字万用表测量电阻</h3>
            <p class="tip">选择<b>数字万用表</b>，设置档位 <b>Ω 电阻档</b>、量程 <b>2kΩ</b>，红黑表笔连接被测电阻，记录结果（<b>重大违规项</b>：用错档位记录一票否决）。</p>
            <div class="row tools">
              <button
                v-for="t in ['数字万用表', '指针万用表', '兆欧表']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '数字万用表' && m9.tool }"
                @click="m9Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <div class="meter-sim" v-if="m9.tool">
              <div class="mrow">
                <span>档位</span>
                <button class="btn" @click="m9CycleRange">{{ m9.range }}</button>
                <span>量程</span>
                <button class="btn" @click="m9CycleSpan">{{ m9.span }}</button>
              </div>
              <div class="mrow">
                <button class="btn" :class="{ sel: m9.red }" @click="m9.red = !m9.red; beep(500, .04)">红表笔 → 被测电阻</button>
                <button class="btn" :class="{ sel: m9.black }" @click="m9.black = !m9.black; beep(500, .04)">黑表笔 → 被测电阻</button>
              </div>
              <div class="display">{{ m9Display }}</div>
              <p class="tip">标准电阻：470Ω（允许误差 ±10%）</p>
              <div class="row">
                <button class="btn primary" @click="m9Record">记录</button>
              </div>
              <div v-if="m9.recorded" class="result-box">
                <p>测量结果：<b>{{ m9.log.value }}</b>　标准值：470Ω　判定：<b>{{ m9.log.verdict }}</b></p>
              </div>
            </div>
          </div>

          <!-- 任务10：钳形电流表测量交流电流 -->
          <div v-if="phase === 9" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 10：钳形电流表测量交流电流</h3>
            <p class="tip">选择<b>数字式钳形电流表</b>，设置 <b>交流电流 AC A</b>，按顺序操作：打开钳口 → 夹住<b>单根</b>导线 → 读取数据并记录。</p>
            <div class="row tools">
              <button
                v-for="t in ['数字式钳形电流表', '万用表', '验电笔']"
                :key="t"
                class="btn tool"
                :class="{ sel: t === '数字式钳形电流表' && c10.tool }"
                @click="c10Pick(t)"
              ><img v-if="imgUrl(t)" class="toolthumb" :src="imgUrl(t)" alt="">{{ t }}</button>
            </div>
            <template v-if="c10.tool">
              <div class="row">
                <span>档位</span>
                <button class="btn" @click="c10Cycle">{{ c10.range }}</button>
              </div>
              <div class="row">
                <b>操作：</b>
                <button class="btn" :disabled="c10.opened || c10.done" @click="c10Open">打开钳口</button>
                <button class="btn" :disabled="!c10.opened || c10.done" @click="c10Clamp(1)">夹住单根导线</button>
                <button class="btn" :disabled="!c10.opened || c10.done" @click="c10Clamp(2)">夹住两根导线</button>
              </div>
              <div class="readings" v-if="c10.reading != null">
                <span>交流电流：<b>{{ c10.reading }} A</b></span>
              </div>
              <p class="status" v-if="c10.invalid">测量无效：钳形表只能夹住单根导线，两根导线磁场相互抵消</p>
              <div class="row" v-if="c10.reading != null && !c10.recorded">
                <button class="btn primary" @click="c10Record">记录</button>
              </div>
              <div v-if="c10.recorded" class="result-box">
                <p>交流电流：<b>{{ c10.log.value }}</b>　判定：<b>{{ c10.log.verdict }}</b></p>
              </div>
            </template>
          </div>

          <!-- 任务11：电气安全标志识别 -->
          <!-- 安全标识识别：.sheet-inline —— 投放区与托盘同在本面板内，拖拽期间不能隐藏 -->
          <div v-if="phase === 10" class="sheet sheet-inline" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 11：电气安全标志识别</h3>
            <p class="tip">将 8 个安全标志拖入对应的分类区。</p>
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
            <p class="tip">依次点击完成场地整理。</p>
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
            <div class="lv-code">030101-K11-02</div>
            <h2>安全工器具与仪器仪表的使用02</h2>
            <p class="sub">低压电工考证虚拟实训 · 难度 ★★★★☆</p>
            <div class="objs">
              <p>训练目标：完成低压电工作业中的个人防护、登杆检查、工器具试验、仪表测量与现场整理。</p>
              <ul>
                <li>个人防护用品选择与穿戴</li>
                <li>登杆前安全检查</li>
                <li>登杆操作（高挂低用）</li>
                <li>绝缘手套气密性检查</li>
                <li>携带型低压短路接地线</li>
                <li>万用表电阻测量</li>
                <li>钳形电流表测量</li>
                <li>电气安全标识识别</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 重大违规一票否决：接地线选择错误、错误使用测量仪表</p>
            <button class="btn primary big" @click="startGame">开始训练</button>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <h2>{{ fatal ? '训练不合格' : '实训完成' }}</h2>
            <p v-if="fatal" class="fatal-reason">重大安全违规：{{ fatalReason }}</p>
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
            <div class="lv-stars" :class="{ fail: fatal }">{{ fatal ? '✕' : '★'.repeat(stars) + '☆'.repeat(5 - stars) }}</div>
            <p class="verdict">{{ verdict }}</p>
            <div v-if="m9.recorded" class="record-sec">
              <h4>电阻测量记录</h4>
              <p>标准电阻 470Ω　读数：<b>{{ m9.log.value }}</b>　判定：<b>{{ m9.log.verdict }}</b></p>
            </div>
            <div v-if="c10.recorded" class="record-sec">
              <h4>钳形表电流测量记录</h4>
              <p>交流电流：<b>{{ c10.log.value }}</b>　判定：<b>{{ c10.log.verdict }}</b></p>
            </div>
            <div class="record-sec">
              <h4>错误操作记录</h4>
              <p>失误次数：{{ mistakes }} 次{{ fatal ? '　重大违规 1 次（' + fatalReason + '）' : '' }}</p>
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
const W = 960, H = 640, GROUND = 520, POLE_X = 350, PXM = 50
const ANCHOR = { x: POLE_X, y: 320 }

const PHASES = [
  { name: '选择安全防护用品', cat: '安全防护', pts: 15, obj: '正确选择安全帽、作业服、安全带、绝缘鞋、脚扣' },
  { name: '防护用品穿戴', cat: '安全防护', pts: 10, obj: '按顺序完成穿戴检查' },
  { name: '设置作业区域', cat: '安全识别', pts: 10, obj: '布置围栏、标示牌，确认监护人' },
  { name: '检查电杆', cat: '登杆作业', pts: 10, obj: '核对线路名称、杆号，检查杆根、基础、拉线' },
  { name: '安全工器具试验', cat: '仪器使用', pts: 15, obj: '脚扣冲击试验、围杆带牵拉试验、安全绳检查' },
  { name: '登杆作业', cat: '登杆作业', pts: 15, obj: '交替脚扣登杆至 3.0m，执行高挂低用' },
  { name: '绝缘手套检查', cat: '仪器使用', pts: 5, obj: '00级绝缘手套外观与气密性检查' },
  { name: '选择短路接地线', cat: '仪表测量', pts: 5, obj: '选择携带型低压短路接地线并检查' },
  { name: '万用表测电阻', cat: '仪表测量', pts: 5, obj: 'Ω 档测量 470Ω 电阻并记录' },
  { name: '钳形表测电流', cat: '仪表测量', pts: 5, obj: 'AC A 档夹单根导线测电流并记录' },
  { name: '安全标志识别', cat: '安全识别', pts: 3, obj: '8 个安全标志分类' },
  { name: '整理场地', cat: '安全识别', pts: 2, obj: '收回工器具、拆除围栏、清理现场' },
]

// ================= 模板引用 =================
const stageRef = ref(null)
const canvasRef = ref(null)
const ctx = ref(null)

// ================= 流程状态 =================
const screen = ref('title')   // title | play | results
const phase = ref(-1)
const sheetOpen = ref(true)
const lock = ref(false)
const mistakes = ref(0)
const fatal = ref(false)
const fatalReason = ref('')

const cats = reactive({
  '安全防护': { got: 0, max: 25 },
  '登杆作业': { got: 0, max: 25 },
  '仪器使用': { got: 0, max: 20 },
  '仪表测量': { got: 0, max: 15 },
  '安全识别': { got: 0, max: 15 },
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
  // 重大违规：中止报告已由 FatalExitDialog 固化（含违规原因），且已重开新场次；
  // 这里不能再 reportResult，否则会用本次成绩覆盖中止报告、分数够还会误记为已通关。
  if (v === 'results' && !fatal.value) reportResult(total.value, { cats, mistakes: mistakes.value })
})
const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
const verdict = computed(() => {
  if (fatal.value) return '发生重大安全违规，不具备低压电工作业安全条件，必须重新训练'
  const t = total.value
  if (t >= 90) return '具备低压电工作业安全操作能力'
  if (t >= 80) return '基本具备低压电工作业安全操作能力，注意细节'
  if (t >= 60) return '掌握基本操作流程，但存在安全隐患'
  return '安全意识不足，建议重新训练'
})

// ================= 场景状态 =================
const S = reactive({
  fence: false, signText: '', guard: '',
  strapOnMat: false, weight: 0, wt0: 0, wy: null,
  climb: { h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 },
  powerOff: false,
  // 任务10 钳形表画面状态
  clamp: { single: false, glow: false },
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

const timers = []
let runId = 0
// 延迟执行：若期间重新开始训练，则丢弃过期回调
function later(fn, ms) {
  const id = runId
  const t = setTimeout(() => { if (id === runId) fn() }, ms)
  timers.push(t)
}
function enterPhase(i) {
  phase.value = i
  sheetOpen.value = true
  if (i >= PHASES.length) { screen.value = 'results'; return }
  const c = canvasRef.value
  c.style.cursor = (i === 3) ? 'pointer' : i === 5 ? 'crosshair' : 'default'
}

// ================= 重大违规 =================
function triggerFatal(reason) {
  if (fatal.value) return
  fatal.value = true
  fatalReason.value = reason
  triggerFatalExit(reason)
  showMsg('⚠ 重大违规：' + reason + ' —— 一票否决', 'bad')
  beep(120, .5, 'sawtooth')
  const t = setTimeout(() => { screen.value = 'results' }, 1800)
  timers.push(t)
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

// ================= 任务 1：安全防护用品 =================
const ppe = reactive({
  groups: [
    { label: '安全帽', opts: ['普通帽', '电工安全帽', '施工帽'], correct: '电工安全帽' },
    { label: '工作服', opts: ['普通衣服', '电工作业服', '化纤外套'], correct: '电工作业服' },
    { label: '安全带', opts: ['普通腰带', '单保险安全带', '双保险安全带'], correct: '双保险安全带' },
    { label: '绝缘鞋', opts: ['运动鞋', '电工绝缘鞋', '劳保鞋'], correct: '电工绝缘鞋' },
    { label: '脚扣', opts: ['损坏脚扣', '合格脚扣'], correct: '合格脚扣' },
  ],
  sel: {},
})
function p1Confirm() {
  const ok = ppe.groups.every((g, i) => ppe.sel[i] === g.correct)
  if (ok) completePhase('安全防护', 15)
  else {
    penalize('安全防护', 5)
    showMsg('防护用品选择错误，请检查后重新确认（-5 分）', 'bad')
    beep(160, .25, 'sawtooth')
  }
}

// ================= 任务 2：穿戴 =================
const wearSteps = [
  ['安全帽', '佩戴安全帽'],
  ['安全帽', '调整帽带'],
  ['工作服', '穿工作服'],
  ['安全带', '检查安全带'],
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
    completePhase('安全防护', 10)
  } else {
    // 结算失败时按点击序列给出对应提示（对应任务说明中的典型错误）
    const p = k => wearSeq.value.indexOf(k)
    if (p(1) > p(2)) showMsg('错误：未系帽带 —— 应先完成「安全帽：调整帽带」', 'bad')
    else if (p(3) > p(4)) showMsg('错误：安全带未扣紧 —— 应先完成「安全带：检查安全带」', 'bad')
    else showMsg('顺序错误！正确顺序：安全帽 → 工作服 → 安全带 → 绝缘鞋 —— 已清空，请按顺序重新点击', 'warn')
    beep(220, .1)
    wearSeq.value = []
  }
}

// ================= 任务 3：设置作业区域 =================
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
  if (S.fence && S.signText && S.guard && S.guard !== '无人') completePhase('安全识别', 10)
}

// ================= 任务 4：检查电杆 =================
const p4 = reactive({ modal: false, root: '', base: '', guy: '', wrong: [] })
function p4Confirm() {
  const rootOk = p4.root === '正常'
  const baseOk = p4.base === '正常'
  const guyOk = p4.guy === '牢固'
  if (rootOk && baseOk && guyOk) {
    p4.modal = false
    completePhase('登杆作业', 10)
  } else {
    penalize('登杆作业', 2)
    p4.wrong = [
      !rootOk ? '杆根' : '',
      !baseOk ? '基础' : '',
      !guyOk ? '拉线' : '',
    ].filter(Boolean)
    showMsg('检查结果不符：' + p4.wrong.join('、') + '，请再次核对', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务 5：安全工器具试验 =================
const t5 = reactive({
  strapOnMat: false, strapDone: false,
  weight: 0, wt0: 0, wy: null,
  beltTest: false,
  ropeDone: [false, false, false],
})
const ropeChecks = ['绳体', '挂钩', '锁扣']
function onStrapDrop(x, y, restore) {
  if (hitEl(x, y, 'zone-mat')) { t5.strapOnMat = true; beep(700, .08); showMsg('脚扣已放置在测试区', 'good') }
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
  if (t5.strapDone && t5.beltTest && t5.ropeDone.every(Boolean)) completePhase('仪器使用', 15)
}

// ================= 任务 6：登杆作业 =================
function tryStep(foot, now) {
  const c = S.climb
  if (c.done) return
  if (c.h >= 3) { showMsg('已到达工作位置，请点击红色固定点执行高挂低用', 'warn'); return }
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
  c.h = Math.min(3, c.h + 0.5)
  c.last = foot
  c.lastT = now
  beep(foot === 'L' ? 620 : 560, .05)
  if (c.h >= 3) showMsg('已到达 3.0m 工作位置！点击红色固定点，执行高挂低用', 'good')
}
// 触屏虚拟按键：替代原键盘 A/D/↑/↓（登杆必须左右脚交替、禁止快速攀爬）
function climbTap(foot) {
  const c = S.climb
  if (phase.value !== 5 || c.done) return
  tryStep(foot, performance.now())
}
function climbDownBtn() {
  const c = S.climb
  if (phase.value !== 5 || c.done) return
  c.h = Math.max(0, c.h - 0.5)
  c.last = null
  beep(300, .06)
}

// ================= 任务 7：绝缘手套检查 =================
const airSteps = ['卷起手套口', '压缩空气', '观察是否漏气']
const g7 = reactive({ tool: false, look: [false, false], air: [false, false, false], airIdx: 0, done: false })
function g7Pick(t) {
  if (t === '00级低压绝缘手套') { g7.tool = true; beep(600, .06) }
  else {
    penalize('仪器使用', 1)
    showMsg('低压作业应选用 00级低压绝缘手套', 'warn')
    beep(220, .1)
  }
}
function g7Look(i) {
  g7.look[i] = true
  beep(680, .05)
  g7Check()
}
function g7Air(i) {
  if (g7.air[i] || g7.airIdx !== i) return
  g7.air[i] = true
  g7.airIdx++
  beep(720, .06)
  if (g7.airIdx >= airSteps.length) {
    showMsg('气密性检查：卷口充气后无漏气 —— 合格', 'good')
    g7Check()
  }
}
function g7Check() {
  if (g7.look.every(Boolean) && g7.air.every(Boolean)) {
    g7.done = true
    completePhase('仪器使用', 5)
  }
}

// ================= 任务 8：携带型低压短路接地线（重大违规项） =================
const g8 = reactive({ tool: false, look: [false, false, false], done: false })
function g8Pick(t) {
  if (t === '携带型低压短路接地线') { g8.tool = true; beep(600, .06) }
  else {
    // 重大违规：接地线选择错误
    triggerFatal('接地线选择错误（必须使用携带型低压短路接地线，严禁使用普通导线或测试线代替）')
  }
}
function g8Look(i) {
  const next = g8.look.filter(Boolean).length
  if (i !== next) { showMsg('请按顺序检查：接地夹 → 导线 → 连接端子', 'warn'); beep(220, .1); return }
  g8.look[i] = true
  beep(700, .06)
  if (g8.look.every(Boolean)) {
    g8.done = true
    completePhase('仪表测量', 5)
  }
}

// ================= 任务 9：数字万用表测电阻（重大违规项） =================
const ranges9 = ['AC V', 'DC V', 'AC A', 'Ω']
const spans9 = ['200Ω', '2kΩ', '20kΩ']
const m9 = reactive({ tool: false, range: 'AC V', span: '200Ω', red: false, black: false, recorded: false, log: null })
const m9Display = computed(() => {
  const m = m9
  if (!m.tool) return '——'
  if (!m.red || !m.black) return '——'
  if (m.range !== 'Ω') return '0.00'
  if (m.span === '200Ω') return 'OL'
  return '470 Ω'
})
function m9Pick(t) {
  if (t === '数字万用表') { m9.tool = true; beep(600, .06) }
  else {
    penalize('仪表测量', 1)
    showMsg('电阻测量请选用数字万用表', 'warn')
    beep(220, .1)
  }
}
function m9CycleRange() {
  m9.range = ranges9[(ranges9.indexOf(m9.range) + 1) % ranges9.length]
  beep(500, .04)
}
function m9CycleSpan() {
  m9.span = spans9[(spans9.indexOf(m9.span) + 1) % spans9.length]
  beep(500, .04)
}
function m9Record() {
  // 重大违规：未使用电阻档记录
  if (m9.range !== 'Ω') {
    triggerFatal('错误使用测量仪表（电阻测量必须使用 Ω 电阻档，严禁在电压/电流档测量电阻）')
    return
  }
  if (m9Display.value === '470 Ω') {
    m9.recorded = true
    m9.log = { value: '470 Ω', verdict: '合格（470Ω ±10%）' }
    completePhase('仪表测量', 5)
  } else {
    penalize('仪表测量', 2)
    showMsg('测量值异常：请确认量程 2kΩ、红黑表笔均连接被测电阻', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务 10：钳形电流表测交流电流 =================
const c10Ranges = ['AC A', 'DC A', 'AC V', 'Ω']
const c10 = reactive({ tool: false, range: 'AC A', opened: false, reading: null, invalid: false, recorded: false, log: null })
function c10Pick(t) {
  if (t === '数字式钳形电流表') { c10.tool = true; beep(600, .06) }
  else {
    penalize('仪表测量', 1)
    showMsg('测量交流电流请选用数字式钳形电流表', 'warn')
    beep(220, .1)
  }
}
function c10Cycle() {
  c10.range = c10Ranges[(c10Ranges.indexOf(c10.range) + 1) % c10Ranges.length]
  beep(500, .04)
}
function c10Open() {
  if (c10.opened) return
  c10.opened = true
  beep(500, .08)
  showMsg('钳口已打开，请夹住导线', 'info')
}
function c10Clamp(wires) {
  if (!c10.opened) return
  if (wires === 2) {
    c10.invalid = true
    c10.opened = false
    penalize('仪表测量', 3)
    showMsg('错误：同时夹住两根导线，测量无效 —— 钳形表只能夹住单根导线（-3 分）', 'bad')
    beep(160, .25, 'sawtooth')
    S.clamp.single = false
    return
  }
  c10.opened = false
  S.clamp.single = true
  beep(700, .08)
  showMsg('已夹住单根导线，请读取数据', 'good')
  later(() => { c10.reading = 12.5; S.clamp.glow = true; beep(880, .1) }, 600)
}
function c10Record() {
  if (c10.range !== 'AC A') {
    penalize('仪表测量', 2)
    showMsg('测量设置错误：交流电流测量请使用 AC A 档', 'bad')
    beep(160, .2, 'sawtooth')
    return
  }
  if (c10.reading == null) return
  c10.recorded = true
  c10.log = { value: '12.5 A', verdict: '合格' }
  completePhase('仪表测量', 5)
}

// ================= 任务 11：安全标志识别 =================
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
  if (Object.keys(placed).length === 8) completePhase('安全识别', 3)
}

// ================= 任务 12：整理场地 =================
const cleanupItems = [
  { key: 'strap', label: '收回脚扣' },
  { key: 'belt', label: '收回安全带' },
  { key: 'glove', label: '收回绝缘手套' },
  { key: 'wire', label: '收回接地线' },
  { key: 'meter', label: '仪表归位' },
  { key: 'fence', label: '拆除围栏' },
  { key: 'site', label: '清理现场' },
]
const cleanupDone = reactive({})
function doCleanup(item) {
  if (cleanupDone[item.key]) return
  cleanupDone[item.key] = true
  beep(680, .06)
  if (item.key === 'fence') S.fence = false
  if (item.key === 'site') S.powerOff = true
  showMsg(`${item.label} ✔`, 'good')
  if (cleanupItems.every(i => cleanupDone[i.key])) {
    later(() => completePhase('安全识别', 2), 900)
  }
}

// ================= 游戏流程 =================
function resetState() {
  S.fence = false; S.signText = ''; S.guard = ''
  S.strapOnMat = false; S.weight = 0; S.wy = null
  S.climb = { h: 0, last: null, lastT: 0, attached: false, done: false, wobbleUntil: 0 }
  S.powerOff = false
  S.clamp = { single: false, glow: false }
  ppe.sel = {}
  shuffleWear()
  p4.modal = false; p4.root = ''; p4.base = ''; p4.guy = ''; p4.wrong = []
  t5.strapOnMat = false; t5.strapDone = false; t5.weight = 0; t5.wy = null
  t5.beltTest = false; t5.ropeDone = [false, false, false]
  g7.tool = false; g7.look = [false, false]; g7.air = [false, false, false]; g7.airIdx = 0; g7.done = false
  g8.tool = false; g8.look = [false, false, false]; g8.done = false
  m9.tool = false; m9.range = 'AC V'; m9.span = '200Ω'
  m9.red = false; m9.black = false; m9.recorded = false; m9.log = null
  c10.tool = false; c10.range = 'AC A'; c10.opened = false; c10.reading = null; c10.invalid = false; c10.recorded = false; c10.log = null
  Object.keys(placed).forEach(k => delete placed[k])
  Object.keys(cleanupDone).forEach(k => delete cleanupDone[k])
  mistakes.value = 0
  fatal.value = false
  fatalReason.value = ''
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
  if (screen.value !== 'play') return
  const r = canvasRef.value.getBoundingClientRect()
  const x = (e.clientX - r.left) * (W / r.width)
  const y = (e.clientY - r.top) * (H / r.height)
  // 任务4：点击电杆
  if (phase.value === 3 && Math.abs(x - POLE_X) < 40 && y > 100 && y < GROUND) {
    p4.modal = true
    beep(500, .05)
  }
  // 任务6：点击高处固定点（高挂低用）
  if (phase.value === 5) {
    const c = S.climb
    if (c.h >= 3 && !c.attached && Math.hypot(x - ANCHOR.x, y - ANCHOR.y) < 32) {
      c.attached = true
      c.done = true
      beep(880, .15)
      completePhase('登杆作业', 15)
    } else if (c.h < 3 && Math.abs(x - POLE_X) < 40) {
      showMsg('继续交替脚扣登杆至 3.0m 工作位置', 'warn')
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
  c.fillStyle = '#8b5a2b'; c.fillRect(60, 400, 140, 120)
  c.strokeStyle = '#5d3a17'; c.lineWidth = 3; c.strokeRect(60, 400, 140, 120)
  line(c, 130, 400, 130, 520)
  c.fillStyle = '#666'; c.fillRect(118, 455, 24, 6)
  c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.textAlign = 'center'
  c.fillText('工具柜', 130, 392)
  c.textAlign = 'left'
}
function drawDistBox() {
  const c = ctx.value
  c.fillStyle = S.powerOff ? '#9aa5ab' : '#cfd8dc'
  c.fillRect(730, 430, 120, 90)
  c.strokeStyle = '#78909c'; c.lineWidth = 3; c.strokeRect(730, 430, 120, 90)
  c.fillStyle = '#37474f'; c.font = '13px sans-serif'; c.textAlign = 'center'
  c.fillText('配电箱', 790, 422)
  c.fillStyle = '#fff'; c.fillRect(742, 442, 40, 26)
  c.strokeStyle = '#999'; c.lineWidth = 1; c.strokeRect(742, 442, 40, 26)
  c.fillStyle = '#f5f5f5'; c.fillRect(790, 448, 44, 34)
  c.strokeStyle = '#666'; c.strokeRect(790, 448, 44, 34)
  c.fillStyle = '#222'
  c.fillRect(800, 458, 5, 9); c.fillRect(819, 458, 5, 9)
  c.font = '10px sans-serif'; c.fillText('L', 802, 480); c.fillText('N', 821, 480)
  c.textAlign = 'left'
}
function drawBench() {
  const c = ctx.value
  // 桌面
  c.fillStyle = '#8b5a2b'; c.fillRect(560, 468, 130, 12)
  c.fillStyle = '#6f4520'; c.fillRect(566, 480, 8, 40); c.fillRect(676, 480, 8, 40)
  c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
  c.fillText('仪表台', 625, 460)
  // 万用表
  c.fillStyle = '#37474f'; c.fillRect(566, 444, 42, 24)
  c.fillStyle = '#7CFC9A'; c.fillRect(570, 448, 20, 10)
  c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(566, 444, 42, 24)
  // 钳形表
  c.fillStyle = '#c62828'; c.fillRect(646, 444, 42, 24)
  c.strokeStyle = '#7f1d1d'; c.strokeRect(646, 444, 42, 24)
  c.strokeStyle = '#f5f5f5'; c.lineWidth = 3
  c.beginPath(); c.arc(667, 468, 9, 0, Math.PI); c.stroke()
  // 被测导线（两根）
  c.strokeStyle = '#d32f2f'; c.lineWidth = 3
  line(c, 566, 494, 610, 494)
  c.strokeStyle = '#1565c0'
  line(c, 646, 494, 688, 494)
  // 钳形表夹住单根导线时的高亮
  if (S.clamp.single) {
    c.save()
    c.shadowColor = '#ffee58'; c.shadowBlur = 14
    c.strokeStyle = '#ffee58'; c.lineWidth = 5
    c.beginPath(); c.arc(600, 494, 12, -Math.PI / 2, Math.PI / 2); c.stroke()
    c.restore()
  }
  if (S.clamp.glow) {
    c.save()
    c.shadowColor = '#ffee58'; c.shadowBlur = 12
    c.fillStyle = '#ffee58'; c.fillRect(570, 448, 20, 10)
    c.restore()
  }
  c.textAlign = 'left'
}
function drawFence() {
  const c = ctx.value
  const x = 252, y = 442, w = 206, h = 92
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
  line(c, 505, y - 4, 505, y)
  c.fillStyle = '#78909c'; c.fillRect(470, y - 44, 70, 40)
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(470, y - 44, 70, 40)
  c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
  c.fillText('80kg', 505, y - 18)
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
    if (cl.h >= 3 && !cl.attached) {
      const pulse = 1 + 0.18 * Math.sin(t / 180)
      c.strokeStyle = '#c62828'; c.lineWidth = 3
      c.beginPath(); c.arc(ANCHOR.x, ANCHOR.y, 15 * pulse, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#c62828'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
      c.fillText('高处固定点', ANCHOR.x, ANCHOR.y - 30)
      c.textAlign = 'left'
    }
  } else {
    drawWorker(c, POLE_X + 52, GROUND, 0, 0)
    // 监护人（仅任务3：设置作业区域）
    if (phase.value === 2) {
      c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
      c.fillText('监护人', POLE_X + 118, GROUND - 70)
      drawWorker(c, POLE_X + 118, GROUND, 0, 0)
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
  cloud(c, 120, 90); cloud(c, 620, 70); cloud(c, 850, 130)
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
  c.fillRect(292, 158, 116, 8)
  c.fillRect(304, 198, 92, 8)
  // 绝缘子
  c.fillStyle = '#37474f'
  ;[[296, 158], [396, 158], [308, 198], [392, 198]].forEach(p => c.fillRect(p[0] - 3, p[1] - 9, 6, 9))
  // 线路
  c.strokeStyle = '#4a4a4a'; c.lineWidth = 2
  line(c, 296, 156, 0, 138); line(c, 396, 156, W, 136)
  line(c, 308, 196, 0, 184); line(c, 392, 196, W, 180)
  // 拉线
  c.strokeStyle = '#9a9a9a'; c.lineWidth = 3
  line(c, POLE_X, 362, 168, GROUND)
  c.fillStyle = '#555'; c.fillRect(160, GROUND - 6, 16, 6)
  // 杆根
  c.fillStyle = '#6d6d6d'; c.fillRect(POLE_X - 16, GROUND - 10, 32, 10)
  // 登杆阶段：踩板横档 + 3m 标记
  if (phase.value === 5) {
    c.strokeStyle = 'rgba(60,40,15,.4)'; c.lineWidth = 3
    for (let y = GROUND - 25; y > 130; y -= 25) line(c, POLE_X - 10, y, POLE_X + 10, y)
    const my = GROUND - 3 * PXM
    c.strokeStyle = '#c62828'; c.lineWidth = 2
    c.setLineDash([6, 5])
    line(c, POLE_X - 26, my, POLE_X + 26, my)
    c.setLineDash([])
    c.fillStyle = '#c62828'; c.font = 'bold 12px sans-serif'; c.textAlign = 'left'
    c.fillText('工作位置 3.0m', POLE_X + 30, my + 4)
  }
  drawCabinet()
  drawDistBox()
  drawBench()
  // 测试区（任务5）
  if (phase.value === 4 || t5.strapOnMat) {
    c.fillStyle = '#78909c'; c.fillRect(435, 500, 150, 12)
    c.strokeStyle = '#546e7a'; c.lineWidth = 2; c.strokeRect(435, 500, 150, 12)
    c.fillStyle = '#eceff1'; c.font = '12px sans-serif'; c.textAlign = 'center'
    c.fillText('测试区', 510, 532)
    c.textAlign = 'left'
  }
  if (S.fence) drawFence()
  if (S.signText === '⚠ 当心触电') drawWarnSign()
  if (t5.strapOnMat) drawStrap(510, 498)
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
.row b { font-size: 14px; }
.radio { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; }
.radio input { accent-color: #1a3fc4; }
.ok-tag { color: #2e7d32; font-size: 13px; font-weight: 600; }

/* ---------- 输入框 ---------- */
.txt {
  flex: 1;
  min-width: 160px;
  border: 1px solid #c9d2dd;
  border-radius: 5px;
  padding: 6px 10px;
  font: inherit;
  font-size: 14px;
}
.txt:focus { outline: 2px solid #1a3fc4; outline-offset: 1px; }

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
  width: 440px;
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
.mrow.wrong { background: #fdecea; border-color: #f3c6c6; }

/* ---------- 任务7/8：卡片 ---------- */
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
.checks li.cur { border-color: #f0b429; background: #fff8e1; }
.checks li.done { border-color: #b9d8be; background: #f1f8f2; color: #2e7d32; }
.checks.clickable li { cursor: pointer; }
.checks li:hover { background: #f0f4fa; }

/* ---------- 万用表模拟 ---------- */
.meter-sim {
  border: 1px solid #dfe3ea; border-radius: 8px;
  padding: 12px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
  background: #f8fafc;
}
.mrow {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 10px; border-radius: 6px; font-size: 14px;
}
.mrow > span { color: #4a5568; }
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

/* ---------- 钳形表读数 ---------- */
.readings { display: flex; gap: 26px; justify-content: center; font-size: 15px; margin: 6px 0; }
.readings b { font-variant-numeric: tabular-nums; color: #122d94; }

/* ---------- 安全标志分类 ---------- */
.sign-layout { display: flex; gap: 16px; margin-top: 6px; }
.tray { display: flex; gap: 10px; align-items: flex-start; min-height: 110px; flex-wrap: wrap; max-width: 300px; }
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
  width: 580px;
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
.objs { text-align: left; background: #f6f8fa; border-radius: 8px; padding: 12px 18px; margin: 12px 0; font-size: 14px; }
.objs ul { margin: 8px 0 0; padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
.fatal-note {
  color: #c62828; font-size: 13px; font-weight: 600;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 6px; padding: 6px 10px; margin: 4px 0 12px;
}
.fatal-reason {
  color: #c62828; font-weight: 600; font-size: 15px;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 8px; padding: 8px 12px; margin: 8px 0;
}
.lv-stars { font-size: 34px; color: #f0b429; letter-spacing: .1em; margin: 10px 0 2px; }
.lv-stars.fail { color: #c62828; }
.verdict { color: #2b6cb0; font-size: 15px; margin: 6px 0 16px; }

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

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>

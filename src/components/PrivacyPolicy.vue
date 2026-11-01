<template>
  <div class="policy-page">
    <header class="top">
      <router-link to="/dashboard" class="back">‹ 返回选关</router-link>
      <span class="brand">Frank</span>
    </header>

    <article class="doc">
      <h1>隐私政策</h1>
      <p class="meta">生效日期：2026 年 10 月 28 日 · 版本 v1.0</p>

      <h2>一、概述</h2>
      <p>
        本应用（应用名称：<b>电工培训</b>，下称"本应用"）是面向低压电工作业的离线仿真实训工具。
        我们高度重视您的个人信息保护。本政策以真实、透明的方式说明本应用对信息的处理方式，
        核心一句话：<b>本应用不收集、不上传任何个人信息，所有数据仅保存在您的设备本地。</b>
      </p>

      <h2>二、本应用在您设备上保存的信息</h2>
      <p>本应用不设账号体系，不需要您注册或登录。为实现训练功能，本应用仅在设备本地存储以下数据：</p>
      <ul>
        <li><b>训练进度与成绩</b>：用于在选关页展示"已通关 · 最好成绩"；</li>
        <li><b>当前训练场次</b>：用于刷新页面或切换后台后恢复训练状态；</li>
        <li><b>功能设置</b>：用于记住您的使用偏好。</li>
      </ul>
      <p>
        上述数据通过系统本地存储（网页 localStorage / 应用私有存储）保存，<b>不会通过网络发送给任何人</b>。
        您可以随时在系统"设置 → 应用 → 电工培训 → 存储"中清除数据，清除后上述信息即被删除且无法恢复。
      </p>

      <h2>三、权限说明</h2>
      <ul>
        <li><b>网络访问（INTERNET）</b>：为应用内嵌页面框架所需而由系统组件声明。本应用本身<b>不发起任何网络请求</b>，不向任何服务器发送数据，全部功能可完全离线使用。</li>
      </ul>
      <p>本应用不申请相机、麦克风、位置、通讯录、短信、电话、蓝牙、共享存储等其他敏感权限，也不读取任何传感器数据。</p>

      <h2>四、第三方 SDK 与信息共享</h2>
      <p>
        本应用<b>不集成任何第三方 SDK</b>：无广告组件、无统计分析、无消息推送、无社交分享。
        除法律法规另有规定外，本应用不与任何第三方共享、转让或公开披露信息——因为本应用从未收集这些信息。
      </p>

      <h2>五、您的权利</h2>
      <p>
        由于数据仅存于您的设备且不含个人信息，本应用无需提供查询、更正、注销账号等流程。
        您对本应用数据拥有完全控制权：清除应用数据即可将其全部删除。
      </p>

      <h2>六、未成年人保护</h2>
      <p>
        本应用面向职业技能实训场景。若您为不满 14 周岁的未成年人，请在监护人的指导与同意下使用本应用。
      </p>

      <h2>七、政策的更新</h2>
      <p>
        本政策如有修订，将在应用内该页面发布更新版本并标注生效日期。重大变更将以页面顶部版本号变化提示。
      </p>

      <h2>八、联系我们</h2>
      <p>
        如您对本政策有任何疑问、意见或建议，可通过以下方式联系我：
        QQ：<b>3067625388</b>
        <br>
        邮箱：<b>3067625388@qq.com</b>
        <br>
        微信：<b>liujieyin1</b>
      </p>

      <p class="meta end">本政策的最终解释权归开发者所有。</p>
    </article>
  </div>
</template>

<script setup>
// 隐私政策页：纯静态文案，无任何状态与外部请求。
// 路由 /privacy（hash 模式），Android 物理返回键由 backButton 统一回到选关页。
</script>

<style scoped>
.policy-page {
  min-height: 100vh;
  background: #f4f6fa;
  color: #1c1e24;
  /* 贴边安全区（刘海屏/手势条） */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.top {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px calc(12px - env(safe-area-inset-bottom, 0px));
  background: rgba(244, 246, 250, .94);
  border-bottom: 1px solid #e3e8ef;
  backdrop-filter: blur(6px);
}

.back {
  color: #1a3fc4;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.brand {
  color: #5d6370;
  font-size: 13px;
}

.doc {
  max-width: 760px;
  margin: 0 auto;
  padding: 22px 18px 40px;
  line-height: 1.85;
  font-size: 15px;
}

h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

h2 {
  margin: 26px 0 8px;
  font-size: 17px;
  color: #122d94;
}

p {
  margin: 8px 0;
}

ul {
  margin: 8px 0;
  padding-left: 22px;
}

li {
  margin: 4px 0;
}

.meta {
  color: #8a93a6;
  font-size: 13px;
}

.end {
  margin-top: 30px;
  text-align: center;
}
</style>

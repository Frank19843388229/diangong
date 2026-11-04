import { createRouter, createWebHashHistory } from 'vue-router'

// 纯本地应用：无登录/注册、无鉴权守卫 —— 打开即选关页。
// 用 hash 路由（#/dashboard、#/game/6）：file:// 直接分发、Capacitor WebView 冷启动深链、
// 任意无「未知路径回退 index.html」的静态服务器都能打开，不需要服务端配合。
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      // 启动落地页：加载后先停在这里，点「开始训练」才进选关
      path: '/',
      name: 'Home',
      component: () => import('@/components/Home.vue')
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/components/dashboard.vue')
    },
    {
      path: '/game/:level(\\d+)',
      name: 'GamePlay',
      component: () => import('@/components/GameWrapper.vue')
    },
    {
      // 训练报告（错题本/扣分明细）独立页：上次报告与导出入口
      path: '/report',
      name: 'Report',
      component: () => import('@/components/ReportPage.vue')
    },
    {
      // 隐私政策（应用市场合规 / 应用内可查）
      path: '/privacy',
      name: 'Privacy',
      component: () => import('@/components/PrivacyPolicy.vue')
    },
    {
      // 未知路径兜底回落地页
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router

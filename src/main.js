import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import './styles/global.css'

const app = createApp(App)

// 图标改为按需引入：哪个组件用图标，就在那个组件里单独 import。
// 不要在这里循环注册整个图标库 —— 那会把约 290 个图标全部打进包里。
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
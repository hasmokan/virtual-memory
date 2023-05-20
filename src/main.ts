import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'


const app = createApp(App)
//需要挂载到Vue原型上

app.use(ElementPlus)
app.mount('#app')

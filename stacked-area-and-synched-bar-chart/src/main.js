import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

const app = createApp(App)

// Create a new Pinia instance
const pinia = createPinia()

// Use Pinia as a plugin for the app
app.use(pinia)
app.mount('#app')

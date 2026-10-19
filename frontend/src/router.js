import { createRouter, createWebHistory } from 'vue-router'
import FormView from './views/FormView.vue'
import ObrigadoView from './views/ObrigadoView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'form', component: FormView },
    { path: '/obrigado', name: 'obrigado', component: ObrigadoView },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('./views/AdminView.vue'),
      meta: { wide: true, title: 'Respostas · Diagnóstico GGDP' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

<script setup>
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import logoPrograma from './assets/logo-sead-por-voce.png'
import logoSead from './assets/logo-sead-goias.png'

const route = useRoute()
const tituloPadrao = document.title

watchEffect(() => {
  document.title = route.meta.title ?? tituloPadrao
})
</script>

<template>
  <main class="mx-auto px-4 pt-6 pb-18 sm:px-[18px] md:pt-[34px]"
    :class="route.meta.wide ? 'max-w-[1280px]' : 'max-w-[1040px]'">
    <div class="mb-3 flex flex-wrap items-center gap-2.5 px-1 md:gap-3.5">
      <img :src="logoPrograma" alt="Logo do programa Sead por Você"
        class="block h-auto w-16 max-w-[22%] object-contain opacity-95 drop-shadow-[0_3px_8px_rgba(15,92,77,0.07)] md:w-[76px] md:max-w-[18%]" />
      <img :src="logoSead" alt="Secretaria de Estado da Administração e brasão do Estado de Goiás"
        class="block h-auto w-[215px] max-w-[66%] object-contain opacity-95 md:w-[300px] md:max-w-[58%]" />
    </div>
    <RouterView />
  </main>
</template>

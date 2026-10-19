<script setup>
import { ref } from 'vue'
import { useDiagnostico } from '../composables/useDiagnostico'
import StepHeader from './StepHeader.vue'

const { state, catalogo, toggleTema } = useDiagnostico()
const avisoLimite = ref(false)

function clicar(key) {
  avisoLimite.value = !toggleTema(key)
}
</script>

<template>
  <StepHeader badge="Temas prioritários" title="Quais assuntos mais geram dúvidas ou necessidade de orientação?">
    Selecione até <strong>{{ catalogo.max_temas }} temas</strong>. Na próxima etapa, você poderá detalhar apenas os
    assuntos escolhidos.
  </StepHeader>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
    <button v-for="t in catalogo.temas" :key="t.key" type="button" :aria-pressed="String(state.temas.includes(t.key))"
      class="group min-h-[126px] cursor-pointer rounded-[17px] border border-line bg-white px-4 pt-[17px] pb-4 text-left transition
        hover:-translate-y-px hover:border-[#a8c6bd] hover:shadow-[0_8px_20px_rgba(31,72,61,0.08)]
        aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:shadow-[inset_0_0_0_1px_var(--color-primary)]"
      @click="clicar(t.key)">
      <span aria-hidden="true"
        class="block size-5 rounded-md border-2 border-[#aec1bb] group-aria-pressed:border-primary group-aria-pressed:bg-primary group-aria-pressed:shadow-[inset_0_0_0_4px_var(--color-primary-soft)]" />
      <strong class="mt-3 mb-1.5 block leading-tight">{{ t.title }}</strong>
      <span class="block text-sm leading-snug text-muted">{{ t.desc }}</span>
    </button>
  </div>

  <div class="mt-3 text-sm text-muted">
    Selecionados: <strong class="text-primary">{{ state.temas.length }}</strong> de {{ catalogo.max_temas }}
  </div>
  <div v-if="avisoLimite" class="alert-error" role="status">
    Você pode selecionar no máximo {{ catalogo.max_temas }} temas prioritários. Desmarque um tema para escolher outro.
  </div>
</template>

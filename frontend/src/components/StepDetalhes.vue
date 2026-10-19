<script setup>
import { useDiagnostico } from '../composables/useDiagnostico'
import StepHeader from './StepHeader.vue'

const { state, catalogo, temasPorKey, detalhe } = useDiagnostico()
</script>

<template>
  <StepHeader badge="Aprofundamento" title="Conte onde estão as principais dúvidas.">
    Em cada tema, marque os pontos que mais precisam de orientação. O campo aberto é opcional.
  </StepHeader>

  <details v-for="(key, i) in state.temas" :key="key" open
    class="group mb-3.5 overflow-hidden rounded-[18px] border border-line bg-white">
    <summary
      class="flex cursor-pointer list-none justify-between gap-3 bg-[#fbfcfc] px-[18px] py-4 font-bold [&::-webkit-details-marker]:hidden">
      <span>{{ temasPorKey[key].title }}
        <span class="ml-2 font-medium text-muted">Tema {{ i + 1 }} de {{ state.temas.length }}</span></span>
      <span class="text-xl leading-none text-primary group-open:hidden">+</span>
      <span class="hidden text-xl leading-none text-primary group-open:inline">–</span>
    </summary>
    <div class="px-[18px] pt-1 pb-[18px]">
      <div class="mt-3.5 mb-2 font-bold">Quais pontos geram mais dúvidas ou necessidade de orientação?</div>
      <div class="grid grid-cols-1 gap-[11px] md:grid-cols-2">
        <label v-for="item in [...temasPorKey[key].items, catalogo.outro_ponto]" :key="item" class="choice">
          <input v-model="detalhe(key).subtopicos" type="checkbox" :value="item" />
          <span>{{ item }}</span>
        </label>
      </div>
      <div class="mt-[18px]">
        <label class="legend" :for="`q_${key}`">Se desejar, detalhe uma dúvida ou situação específica.</label>
        <textarea :id="`q_${key}`" v-model="detalhe(key).duvida" class="input min-h-28 resize-y" maxlength="4000"
          placeholder="Você pode escrever a pergunta da forma como ela costuma surgir no dia a dia." />
      </div>
    </div>
  </details>
</template>

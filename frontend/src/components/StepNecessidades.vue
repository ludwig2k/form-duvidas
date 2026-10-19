<script setup>
import { useDiagnostico } from '../composables/useDiagnostico'
import StepHeader from './StepHeader.vue'

const { state, catalogo } = useDiagnostico()
</script>

<template>
  <StepHeader badge="Necessidades de informação" title="Como a informação chega até você?">
    Estas respostas ajudam a identificar não só o conteúdo, mas também a melhor forma de orientar as unidades.
  </StepHeader>

  <div class="my-[18px]">
    <label class="legend" for="dificuldade">
      Quando surge uma dúvida em sua vida funcional, qual costuma ser sua principal dificuldade? *
    </label>
    <select id="dificuldade" v-model="state.dificuldade" class="input">
      <option value="">Selecione</option>
      <option v-for="d in catalogo.dificuldades" :key="d">{{ d }}</option>
    </select>
  </div>

  <fieldset class="my-[18px]">
    <legend class="legend">
      Que tipo de recurso ajudaria você a compreender ou disseminar melhor as informações do dia a dia funcional?
    </legend>
    <span class="hint">Selecione quantos considerar úteis.</span>
    <div class="grid grid-cols-1 gap-[11px] md:grid-cols-2">
      <label v-for="r in catalogo.recursos" :key="r" class="choice">
        <input v-model="state.recursos" type="checkbox" :value="r" />
        <span>{{ r }}</span>
      </label>
    </div>
  </fieldset>

  <div class="my-[18px]">
    <label class="legend" for="situacao">
      Existe alguma situação prática ou recorrente na sua unidade sobre a qual você gostaria de receber mais orientação?
    </label>
    <span class="hint">Descreva brevemente, sem informar nomes ou dados pessoais de servidores.</span>
    <textarea id="situacao" v-model="state.situacao" class="input min-h-28 resize-y" maxlength="4000"
      placeholder="Ex.: temos dúvidas recorrentes quando..." />
  </div>

  <div class="my-[18px]">
    <label class="legend" for="melhoria">Nos conte algo que podemos melhorar como GGDP que pode ajudar na sua gestão! *</label>
    <textarea id="melhoria" v-model="state.melhoria" class="input min-h-28 resize-y" maxlength="4000"
      placeholder="Conte de forma objetiva o que a GGDP pode melhorar para apoiar melhor sua gestão." />
  </div>
</template>

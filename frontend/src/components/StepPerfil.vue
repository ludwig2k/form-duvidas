<script setup>
import { useDiagnostico } from '../composables/useDiagnostico'
import StepHeader from './StepHeader.vue'

const { state, catalogo } = useDiagnostico()
</script>

<template>
  <StepHeader badge="Perfil" title="Para começar, conte um pouco sobre sua atuação.">
    Não solicitamos nome. Queremos apenas entender o contexto em que as dúvidas aparecem.
  </StepHeader>

  <div class="my-[18px]">
    <label class="legend" for="unidade">Qual é a sua unidade de lotação? *</label>
    <input id="unidade" v-model="state.unidade" type="text" class="input" placeholder="Ex.: Gerência de..."
      autocomplete="organization" maxlength="200" />
  </div>

  <div class="my-[18px]">
    <label class="legend" for="atuacao">Qual opção melhor representa sua atuação? *</label>
    <select id="atuacao" v-model="state.perfil" class="input">
      <option value="">Selecione</option>
      <option v-for="p in catalogo.perfis" :key="p">{{ p }}</option>
    </select>
  </div>
</template>

<script setup>
import { useDiagnostico } from '../composables/useDiagnostico'
import StepHeader from './StepHeader.vue'

const { state, temasPorKey, detalhe } = useDiagnostico()
</script>

<template>
  <StepHeader badge="Revisão" title="Confira suas respostas antes de concluir.">
    Você pode voltar às etapas anteriores para fazer qualquer ajuste.
  </StepHeader>

  <div class="space-y-3 [&_h3]:mb-2 [&_h3]:font-bold [&_p]:my-1 [&_p]:leading-snug [&_p]:text-muted [&_strong]:text-ink">
    <section class="rounded-2xl border border-line bg-[#fbfcfc] px-4 py-[15px]">
      <h3>Perfil</h3>
      <p><strong>Unidade:</strong> {{ state.unidade }}</p>
      <p><strong>Atuação:</strong> {{ state.perfil }}</p>
    </section>
    <section class="rounded-2xl border border-line bg-[#fbfcfc] px-4 py-[15px]">
      <h3>Temas prioritários</h3>
      <p>{{ state.temas.map((k) => temasPorKey[k].title).join(' · ') }}</p>
    </section>
    <section v-for="key in state.temas" :key="key" class="rounded-2xl border border-line bg-[#fbfcfc] px-4 py-[15px]">
      <h3>{{ temasPorKey[key].title }}</h3>
      <p><strong>Pontos:</strong> {{ detalhe(key).subtopicos.join(' · ') || '—' }}</p>
      <p class="whitespace-pre-line"><strong>Dúvida específica:</strong> {{ detalhe(key).duvida.trim() || 'Não informada' }}</p>
    </section>
    <section class="rounded-2xl border border-line bg-[#fbfcfc] px-4 py-[15px]">
      <h3>Necessidades de informação</h3>
      <p><strong>Principal dificuldade:</strong> {{ state.dificuldade }}</p>
      <p><strong>Recursos preferidos:</strong> {{ state.recursos.join(' · ') || 'Não informado' }}</p>
      <p class="whitespace-pre-line"><strong>Situação prática:</strong> {{ state.situacao.trim() || 'Não informada' }}</p>
      <p class="whitespace-pre-line"><strong>Melhoria sugerida para a GGDP:</strong> {{ state.melhoria.trim() }}</p>
    </section>
  </div>

  <label class="choice mt-4">
    <input v-model="state.confirmacao" type="checkbox" />
    <span>
      Confirmo que revisei as respostas e não incluí nomes ou dados pessoais de outros servidores nos campos abertos.
    </span>
  </label>
</template>

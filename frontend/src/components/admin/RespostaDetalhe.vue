<script setup>
defineProps({ resposta: { type: Object, required: true }, excluindo: Boolean })
defineEmits(['excluir'])
</script>

<template>
  <div class="grid gap-4 text-sm md:grid-cols-2 [&_dt]:font-semibold [&_dd]:mb-3 [&_dd]:whitespace-pre-line [&_dd]:text-muted">
    <div>
      <h4 class="mb-2 text-xs font-extrabold tracking-wider text-primary-2 uppercase">Temas</h4>
      <div v-for="t in resposta.temas" :key="t.tema_key" class="mb-3 rounded-xl border border-line bg-white p-3">
        <div class="font-semibold">{{ t.tema_titulo }}</div>
        <div v-if="t.subtopicos.length" class="mt-2 flex flex-wrap gap-1.5">
          <span v-for="s in t.subtopicos" :key="s" class="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{{ s }}</span>
        </div>
        <p v-if="t.duvida" class="mt-2 whitespace-pre-line text-muted">“{{ t.duvida }}”</p>
      </div>
    </div>
    <div>
      <h4 class="mb-2 text-xs font-extrabold tracking-wider text-primary-2 uppercase">Necessidades de informação</h4>
      <dl>
        <dt>Principal dificuldade</dt>
        <dd>{{ resposta.principal_dificuldade }}</dd>
        <dt>Recursos preferidos</dt>
        <dd>{{ resposta.recursos_preferidos.join(' · ') || 'Não informado' }}</dd>
        <dt>Situação prática</dt>
        <dd>{{ resposta.situacao_pratica || 'Não informada' }}</dd>
        <dt>Melhoria sugerida para a GGDP</dt>
        <dd>{{ resposta.melhoria_sugerida_ggdp }}</dd>
      </dl>
      <button type="button" :disabled="excluindo"
        class="cursor-pointer rounded-lg border border-[#efc2bf] px-3 py-1.5 text-xs font-semibold text-danger hover:bg-[#fff3f2] disabled:opacity-50"
        @click="$emit('excluir', resposta)">
        {{ excluindo ? 'Excluindo…' : 'Excluir resposta' }}
      </button>
    </div>
  </div>
</template>

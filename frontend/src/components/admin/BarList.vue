<script setup>
import { computed } from 'vue'

// Barras horizontais de uma única série: rótulo, barra e valor na ponta.
const props = defineProps({
  titulo: { type: String, required: true },
  subtitulo: String,
  itens: { type: Array, required: true }, // [{ label, value }]
  total: { type: Number, required: true }, // base do percentual (nº de respostas)
  limite: { type: Number, default: 0 },
})

const linhas = computed(() => {
  const ordenadas = [...props.itens].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
  return props.limite ? ordenadas.slice(0, props.limite) : ordenadas
})
const max = computed(() => Math.max(1, ...props.itens.map((i) => i.value)))
const pct = (v) => (props.total ? Math.round((v / props.total) * 100) : 0)
</script>

<template>
  <section class="rounded-[18px] border border-line bg-white p-5">
    <h3 class="font-bold">{{ titulo }}</h3>
    <p v-if="subtitulo" class="mt-0.5 text-sm text-muted">{{ subtitulo }}</p>

    <p v-if="!linhas.length" class="mt-4 text-sm text-muted">Sem dados para os filtros atuais.</p>
    <ul v-else class="mt-4 space-y-1">
      <li v-for="l in linhas" :key="l.label" tabindex="0"
        class="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-1.5 outline-none hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60 focus-visible:ring-2 focus-visible:ring-primary-2/40">
        <span class="col-start-1 row-start-1 truncate text-sm" :title="l.label">{{ l.label }}</span>
        <span class="col-start-2 row-start-2 self-center text-sm leading-none font-semibold tabular-nums">{{ l.value }}</span>
        <span class="col-start-1 row-start-2 mt-1 block h-2.5 rounded-r-[4px] bg-primary-2 transition-[width] duration-300"
          :style="{ width: `max(${(l.value / max) * 100}%, ${l.value ? '3px' : '0px'})` }" />
        <span role="tooltip"
          class="pointer-events-none absolute -top-9 left-2 z-10 hidden rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block">
          {{ l.value }} {{ l.value === 1 ? 'resposta' : 'respostas' }} · {{ pct(l.value) }}% do total
        </span>
      </li>
    </ul>
  </section>
</template>

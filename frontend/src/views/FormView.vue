<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { enviarResposta } from '../api'
import { useDiagnostico } from '../composables/useDiagnostico'
import StepPerfil from '../components/StepPerfil.vue'
import StepTemas from '../components/StepTemas.vue'
import StepDetalhes from '../components/StepDetalhes.vue'
import StepNecessidades from '../components/StepNecessidades.vue'
import StepRevisao from '../components/StepRevisao.vue'

const ETAPAS = [
  { nome: 'Perfil', comp: StepPerfil, erro: 'Preencha os campos obrigatórios antes de continuar.' },
  { nome: 'Temas prioritários', comp: StepTemas, erro: 'Selecione pelo menos um tema para continuar.' },
  { nome: 'Aprofundamento', comp: StepDetalhes, erro: 'Marque ao menos um ponto em cada tema selecionado ou escreva uma dúvida específica.' },
  { nome: 'Necessidades de informação', comp: StepNecessidades, erro: 'Preencha os campos obrigatórios antes de continuar.' },
  { nome: 'Revisão', comp: StepRevisao, erro: 'Confirme a revisão das respostas antes de concluir.' },
]

const router = useRouter()
const { state, catalogo, erroCatalogo, carregarCatalogo, validarEtapa, payload, limpar } = useDiagnostico()
const card = useTemplateRef('card')

const erro = ref('')
const enviando = ref(false)
const etapa = computed(() => ETAPAS[state.step - 1])
const pct = computed(() => state.step * 20)

onMounted(carregarCatalogo)

async function irPara(n) {
  erro.value = ''
  state.step = Math.max(1, Math.min(ETAPAS.length, n))
  await nextTick()
  card.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function avancar() {
  if (!validarEtapa(state.step)) {
    erro.value = etapa.value.erro
    return
  }
  irPara(state.step + 1)
}

async function concluir() {
  for (let s = 1; s <= ETAPAS.length; s++) {
    if (!validarEtapa(s)) {
      if (s !== state.step) await irPara(s)
      erro.value = ETAPAS[s - 1].erro
      return
    }
  }
  enviando.value = true
  erro.value = ''
  try {
    await enviarResposta(payload())
    limpar()
    router.push({ name: 'obrigado' })
  } catch (e) {
    erro.value = `Não foi possível concluir o envio. ${e.message}`
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="px-0.5 pt-1.5 pb-6">
    <div class="text-xs font-extrabold tracking-[0.13em] text-primary-2 uppercase">Diagnóstico contínuo</div>
    <h1 class="mt-2 mb-4 max-w-[820px] text-[2rem] leading-[1.02] font-bold sm:text-[clamp(2rem,5vw,3.25rem)]">
      Dúvidas e necessidades em Gestão de Pessoas
    </h1>
    <p class="max-w-[800px] text-[1.04rem] leading-relaxed text-muted">
      Queremos compreender quais assuntos mais geram dúvidas, dificuldades ou necessidade de orientação no dia a dia
      funcional. Considere tanto as situações que você vivencia diretamente quanto as dúvidas que observa na rotina da
      sua unidade.
    </p>
    <p class="mt-3.5 text-sm text-muted">
      As respostas contribuirão para aprimorar orientações, comunicações, capacitações e outras ações da GGDP.
    </p>
  </section>

  <section ref="card" class="scroll-mt-4 overflow-clip rounded-[22px] border border-line/90 bg-white shadow-card">
    <div v-if="erroCatalogo" class="p-6">
      <div class="alert-error">{{ erroCatalogo }}</div>
      <button type="button" class="btn-primary" @click="carregarCatalogo">Tentar novamente</button>
    </div>
    <div v-else-if="!catalogo" class="p-6 text-muted">Carregando formulário…</div>

    <template v-else>
      <div class="px-4 pt-[22px] sm:px-6">
        <div class="mb-2.5 flex items-center justify-between gap-3.5 text-sm text-muted">
          <span>Etapa {{ state.step }} de {{ ETAPAS.length }} · {{ etapa.nome }}</span>
          <span>{{ pct }}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-[#e7eeeb]" aria-hidden="true">
          <div class="h-full bg-linear-to-r from-primary to-primary-2 transition-[width] duration-300"
            :style="{ width: pct + '%' }" />
        </div>
      </div>

      <form class="px-4 pt-2 pb-7 sm:px-6" novalidate @submit.prevent="concluir">
        <Transition mode="out-in" enter-from-class="opacity-30 translate-y-1" enter-active-class="transition duration-200">
          <div :key="state.step">
            <component :is="etapa.comp" />
          </div>
        </Transition>

        <div v-if="erro" class="alert-error" role="alert">{{ erro }}</div>

        <div
          class="sticky bottom-0 mt-6 flex justify-between gap-3 border-t border-line bg-white pt-5 pb-1 sm:static sm:pb-0">
          <button v-if="state.step > 1" type="button" class="btn-secondary" @click="irPara(state.step - 1)">Voltar</button>
          <span v-else />
          <button v-if="state.step < ETAPAS.length" type="button" class="btn-primary" @click="avancar">
            {{ state.step === 4 ? 'Revisar respostas' : 'Continuar' }}
          </button>
          <button v-else type="submit" class="btn-primary" :disabled="enviando">
            {{ enviando ? 'Enviando…' : 'Concluir' }}
          </button>
        </div>
      </form>
    </template>
  </section>
  <div class="mt-2.5 text-right text-[0.82rem] text-muted">Rascunho salvo automaticamente neste navegador.</div>
</template>

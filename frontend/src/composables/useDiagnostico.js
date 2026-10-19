import { computed, reactive, ref, watch } from 'vue'
import { getCatalogo } from '../api'

const DRAFT_KEY = 'ggdp_diagnostico_draft'

const catalogo = ref(null)
const erroCatalogo = ref('')

function estadoInicial() {
  return {
    step: 1,
    unidade: '',
    perfil: '',
    temas: [],
    detalhes: {},
    dificuldade: '',
    recursos: [],
    situacao: '',
    melhoria: '',
    confirmacao: false,
  }
}

const state = reactive(estadoInicial())

function carregarRascunho() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) Object.assign(state, estadoInicial(), JSON.parse(raw), { confirmacao: false })
  } catch {
    /* rascunho indisponível */
  }
}

function salvarRascunho() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state))
  } catch {
    /* armazenamento indisponível */
  }
}

function limpar() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
  Object.assign(state, estadoInicial())
}

carregarRascunho()
watch(state, salvarRascunho, { deep: true })

async function carregarCatalogo() {
  if (catalogo.value) return
  try {
    erroCatalogo.value = ''
    catalogo.value = await getCatalogo()
    const validos = new Set(catalogo.value.temas.map((t) => t.key))
    state.temas = state.temas.filter((k) => validos.has(k)).slice(0, catalogo.value.max_temas)
    state.temas.forEach(detalhe)
  } catch (e) {
    erroCatalogo.value = 'Não foi possível carregar o formulário. Tente novamente em instantes.'
  }
}

const temasPorKey = computed(() =>
  Object.fromEntries((catalogo.value?.temas ?? []).map((t) => [t.key, t])),
)

function detalhe(key) {
  if (!state.detalhes[key]) state.detalhes[key] = { subtopicos: [], duvida: '' }
  return state.detalhes[key]
}

function toggleTema(key) {
  const i = state.temas.indexOf(key)
  if (i >= 0) {
    state.temas.splice(i, 1)
    return true
  }
  if (state.temas.length >= catalogo.value.max_temas) return false
  state.temas.push(key)
  detalhe(key)
  return true
}

function validarEtapa(step) {
  switch (step) {
    case 1:
      return !!state.unidade.trim() && !!state.perfil
    case 2:
      return state.temas.length > 0
    case 3:
      return state.temas.every((k) => {
        const d = detalhe(k)
        return d.subtopicos.length > 0 || d.duvida.trim().length > 0
      })
    case 4:
      return !!state.dificuldade && state.melhoria.trim().length > 0
    case 5:
      return state.confirmacao
  }
  return true
}

function payload() {
  return {
    unidade: state.unidade.trim(),
    perfil: state.perfil,
    temas: state.temas.map((key) => ({
      key,
      subtopicos: detalhe(key).subtopicos,
      duvida: detalhe(key).duvida.trim(),
    })),
    principal_dificuldade: state.dificuldade,
    recursos_preferidos: state.recursos,
    situacao_pratica: state.situacao.trim(),
    melhoria_sugerida_ggdp: state.melhoria.trim(),
  }
}

export function useDiagnostico() {
  return {
    state,
    catalogo,
    erroCatalogo,
    temasPorKey,
    carregarCatalogo,
    detalhe,
    toggleTema,
    validarEtapa,
    payload,
    limpar,
  }
}

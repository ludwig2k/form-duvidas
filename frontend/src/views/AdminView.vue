<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { admin, getCatalogo } from '../api'
import BarList from '../components/admin/BarList.vue'
import RespostaDetalhe from '../components/admin/RespostaDetalhe.vue'

const TOKEN_KEY = 'ggdp_admin_token'

function lerToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
function gravarToken(v) {
  try {
    v ? sessionStorage.setItem(TOKEN_KEY, v) : sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* armazenamento indisponível */
  }
}

const token = ref('')
const tokenDigitado = ref('')
const erroLogin = ref('')
const entrando = ref(false)

const catalogo = ref(null)
const respostas = ref([])
const carregando = ref(false)
const erro = ref('')
const aba = ref('resumo')
const aberta = ref(null)
const excluindoId = ref(null)

const filtros = reactive({ busca: '', perfil: '', tema: '', de: '', ate: '' })

const fmtData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const formatar = (iso) => fmtData.format(new Date(iso))

async function entrar() {
  erroLogin.value = ''
  entrando.value = true
  try {
    await admin.validar(tokenDigitado.value.trim())
    token.value = tokenDigitado.value.trim()
    gravarToken(token.value)
    tokenDigitado.value = ''
    await carregar()
  } catch (e) {
    erroLogin.value = e.status === 401 ? 'Token inválido.' : e.message
  } finally {
    entrando.value = false
  }
}

function sair() {
  token.value = ''
  gravarToken('')
  respostas.value = []
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const [cat, lista] = await Promise.all([catalogo.value ?? getCatalogo(), admin.listar(token.value)])
    catalogo.value = cat
    respostas.value = lista.reverse() // mais recentes primeiro
  } catch (e) {
    if (e.status === 401) {
      sair()
      erroLogin.value = 'Sessão expirada. Informe o token novamente.'
    } else erro.value = e.message
  } finally {
    carregando.value = false
  }
}

async function exportar() {
  try {
    const blob = await admin.csv(token.value)
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: 'respostas-diagnostico-ggdp.csv' })
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    erro.value = `Falha ao exportar: ${e.message}`
  }
}

async function excluir(r) {
  if (!confirm(`Excluir a resposta #${r.id} (${r.unidade})? Esta ação não pode ser desfeita.`)) return
  excluindoId.value = r.id
  try {
    await admin.excluir(token.value, r.id)
    respostas.value = respostas.value.filter((x) => x.id !== r.id)
    aberta.value = null
  } catch (e) {
    erro.value = `Falha ao excluir: ${e.message}`
  } finally {
    excluindoId.value = null
  }
}

onMounted(() => {
  token.value = lerToken()
  if (token.value) carregar()
})

// ---- filtros e agregações ----
const filtradas = computed(() => {
  const busca = filtros.busca.trim().toLocaleLowerCase('pt-BR')
  const de = filtros.de ? new Date(`${filtros.de}T00:00:00`) : null
  const ate = filtros.ate ? new Date(`${filtros.ate}T23:59:59.999`) : null
  return respostas.value.filter((r) => {
    if (filtros.perfil && r.perfil !== filtros.perfil) return false
    if (filtros.tema && !r.temas.some((t) => t.tema_key === filtros.tema)) return false
    const d = new Date(r.criado_em)
    if (de && d < de) return false
    if (ate && d > ate) return false
    if (busca) {
      const texto = [r.unidade, r.situacao_pratica, r.melhoria_sugerida_ggdp, ...r.temas.map((t) => t.duvida)]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      if (!texto.includes(busca)) return false
    }
    return true
  })
})

const temFiltro = computed(() => Object.values(filtros).some(Boolean))
function limparFiltros() {
  Object.assign(filtros, { busca: '', perfil: '', tema: '', de: '', ate: '' })
}

function contar(opcoes, valoresPorResposta) {
  const cont = Object.fromEntries(opcoes.map((o) => [o, 0]))
  for (const r of filtradas.value) for (const v of valoresPorResposta(r)) cont[v] = (cont[v] ?? 0) + 1
  return Object.entries(cont).map(([label, value]) => ({ label, value }))
}

const porTema = computed(() =>
  contar(catalogo.value?.temas.map((t) => t.title) ?? [], (r) => r.temas.map((t) => t.tema_titulo)),
)
const porPerfil = computed(() => contar(catalogo.value?.perfis ?? [], (r) => [r.perfil]))
const porDificuldade = computed(() => contar(catalogo.value?.dificuldades ?? [], (r) => [r.principal_dificuldade]))
const porRecurso = computed(() => contar(catalogo.value?.recursos ?? [], (r) => r.recursos_preferidos))

const temaFiltrado = computed(() => catalogo.value?.temas.find((t) => t.key === filtros.tema))
const porSubtopico = computed(() => {
  const t = temaFiltrado.value
  if (!t) return []
  return contar([...t.items, catalogo.value.outro_ponto], (r) =>
    r.temas.find((x) => x.tema_key === t.key)?.subtopicos ?? [],
  )
})
const duvidasDoTema = computed(() =>
  filtradas.value
    .map((r) => ({ r, d: r.temas.find((x) => x.tema_key === filtros.tema)?.duvida }))
    .filter((x) => x.d),
)
const sugestoes = computed(() => filtradas.value.filter((r) => r.melhoria_sugerida_ggdp))

const indicadores = computed(() => {
  const lista = filtradas.value
  const unidades = new Set(lista.map((r) => r.unidade.trim().toLocaleLowerCase('pt-BR')))
  const mediaTemas = lista.length ? lista.reduce((s, r) => s + r.temas.length, 0) / lista.length : 0
  return [
    { label: 'Respostas', valor: lista.length },
    { label: 'Unidades distintas', valor: unidades.size },
    { label: 'Temas por resposta (média)', valor: mediaTemas.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
    { label: 'Última resposta', valor: lista[0] ? formatar(lista[0].criado_em) : '—' },
  ]
})
</script>

<template>
  <!-- Login -->
  <section v-if="!token" class="mx-auto mt-8 max-w-md rounded-[22px] border border-line bg-white p-6 shadow-card">
    <span class="badge">Área administrativa</span>
    <h1 class="mt-3 mb-2 text-2xl font-bold">Respostas do diagnóstico</h1>
    <p class="mb-5 text-sm text-muted">Informe o token de administração para consultar as respostas.</p>
    <form @submit.prevent="entrar">
      <label class="legend" for="token">Token</label>
      <input id="token" v-model="tokenDigitado" type="password" class="input" autocomplete="current-password" required />
      <div v-if="erroLogin" class="alert-error" role="alert">{{ erroLogin }}</div>
      <button type="submit" class="btn-primary mt-4 w-full" :disabled="entrando || !tokenDigitado.trim()">
        {{ entrando ? 'Verificando…' : 'Entrar' }}
      </button>
    </form>
  </section>

  <!-- Painel -->
  <template v-else>
    <header class="flex flex-wrap items-end justify-between gap-4 px-0.5 pt-1.5 pb-5">
      <div>
        <div class="text-xs font-extrabold tracking-[0.13em] text-primary-2 uppercase">Área administrativa</div>
        <h1 class="mt-2 text-3xl font-bold">Respostas do diagnóstico</h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary py-2.5" :disabled="carregando" @click="carregar">
          {{ carregando ? 'Atualizando…' : 'Atualizar' }}
        </button>
        <button type="button" class="btn-primary py-2.5" :disabled="!respostas.length" @click="exportar">Exportar CSV</button>
        <button type="button" class="btn-secondary py-2.5" @click="sair">Sair</button>
      </div>
    </header>

    <div v-if="erro" class="alert-error" role="alert">{{ erro }}</div>

    <!-- Indicadores -->
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="i in indicadores" :key="i.label" class="rounded-[18px] border border-line bg-white px-5 py-4 shadow-card">
        <dt class="text-sm text-muted">{{ i.label }}</dt>
        <dd class="mt-1 text-2xl font-bold tabular-nums">{{ i.valor }}</dd>
      </div>
    </dl>

    <!-- Filtros -->
    <div class="mt-5 grid gap-3 rounded-[18px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto_auto]">
      <input v-model="filtros.busca" type="search" class="input py-2.5" placeholder="Buscar por unidade ou texto…"
        aria-label="Buscar" />
      <select v-model="filtros.perfil" class="input py-2.5" aria-label="Perfil">
        <option value="">Todos os perfis</option>
        <option v-for="p in catalogo?.perfis" :key="p">{{ p }}</option>
      </select>
      <select v-model="filtros.tema" class="input py-2.5" aria-label="Tema">
        <option value="">Todos os temas</option>
        <option v-for="t in catalogo?.temas" :key="t.key" :value="t.key">{{ t.title }}</option>
      </select>
      <input v-model="filtros.de" type="date" class="input py-2.5" aria-label="De" />
      <input v-model="filtros.ate" type="date" class="input py-2.5" aria-label="Até" />
      <button type="button" class="btn-secondary py-2.5" :disabled="!temFiltro" @click="limparFiltros">Limpar</button>
    </div>

    <!-- Abas -->
    <div class="mt-5 flex gap-1 border-b border-line" role="tablist">
      <button v-for="a in [{ k: 'resumo', l: 'Resumo' }, { k: 'lista', l: `Respostas (${filtradas.length})` }]" :key="a.k"
        type="button" role="tab" :aria-selected="String(aba === a.k)"
        class="-mb-px cursor-pointer border-b-2 px-4 py-2.5 font-semibold transition"
        :class="aba === a.k ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'"
        @click="aba = a.k">
        {{ a.l }}
      </button>
    </div>

    <p v-if="carregando && !respostas.length" class="py-10 text-center text-muted">Carregando respostas…</p>
    <p v-else-if="!respostas.length" class="py-10 text-center text-muted">Nenhuma resposta recebida ainda.</p>

    <!-- Resumo -->
    <div v-else-if="aba === 'resumo'" class="mt-5 grid gap-4 lg:grid-cols-2">
      <BarList v-if="temaFiltrado" class="lg:col-span-2" :titulo="`Pontos mais marcados · ${temaFiltrado.title}`"
        subtitulo="Entre as respostas que escolheram este tema" :itens="porSubtopico" :total="filtradas.length" />
      <BarList titulo="Temas mais escolhidos" subtitulo="Cada resposta pode escolher até 5 temas" :itens="porTema"
        :total="filtradas.length" />
      <div class="grid content-start gap-4">
        <BarList titulo="Perfil de atuação" :itens="porPerfil" :total="filtradas.length" />
        <BarList titulo="Principal dificuldade" :itens="porDificuldade" :total="filtradas.length" />
      </div>
      <BarList titulo="Recursos preferidos" subtitulo="Múltipla escolha" :itens="porRecurso" :total="filtradas.length" />

      <section class="flex flex-col rounded-[18px] border border-line bg-white p-5">
        <h3 class="font-bold">{{ temaFiltrado ? `Dúvidas sobre ${temaFiltrado.title}` : 'Sugestões de melhoria para a GGDP' }}</h3>
        <p class="mt-0.5 text-sm text-muted">Mais recentes primeiro</p>
        <ul class="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          <li v-for="item in temaFiltrado ? duvidasDoTema : sugestoes.map((r) => ({ r, d: r.melhoria_sugerida_ggdp }))"
            :key="item.r.id" class="rounded-xl bg-[#fbfcfc] p-3 ring-1 ring-line">
            <p class="text-sm whitespace-pre-line">{{ item.d }}</p>
            <p class="mt-1.5 text-xs text-muted">{{ item.r.unidade }} · {{ item.r.perfil }} · {{ formatar(item.r.criado_em) }}</p>
          </li>
          <li v-if="!(temaFiltrado ? duvidasDoTema : sugestoes).length" class="text-sm text-muted">Nada para os filtros atuais.</li>
        </ul>
      </section>
    </div>

    <!-- Lista -->
    <div v-else class="mt-5 overflow-hidden rounded-[18px] border border-line bg-white">
      <div class="relative overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="bg-[#fbfcfc] text-xs tracking-wider text-muted uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">#</th>
              <th class="px-4 py-3 font-semibold">Data</th>
              <th class="px-4 py-3 font-semibold">Unidade</th>
              <th class="px-4 py-3 font-semibold">Perfil</th>
              <th class="px-4 py-3 font-semibold">Temas</th>
              <th class="px-4 py-3"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in filtradas" :key="r.id">
              <tr class="cursor-pointer border-t border-line align-top hover:bg-primary-soft/40"
                :class="{ 'bg-primary-soft/40': aberta === r.id }" @click="aberta = aberta === r.id ? null : r.id">
                <td class="px-4 py-3 text-muted tabular-nums">{{ r.id }}</td>
                <td class="px-4 py-3 whitespace-nowrap tabular-nums">{{ formatar(r.criado_em) }}</td>
                <td class="px-4 py-3 font-medium">{{ r.unidade }}</td>
                <td class="px-4 py-3">{{ r.perfil }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="t in r.temas" :key="t.tema_key"
                      class="rounded-full bg-primary-soft px-2 py-0.5 text-xs whitespace-nowrap text-primary">{{ t.tema_titulo }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right">
                  <button type="button" class="cursor-pointer text-sm font-semibold text-primary hover:underline"
                    :aria-expanded="String(aberta === r.id)" @click.stop="aberta = aberta === r.id ? null : r.id">
                    {{ aberta === r.id ? 'Fechar' : 'Ver' }}
                  </button>
                </td>
              </tr>
              <tr v-if="aberta === r.id" class="bg-primary-soft/20">
                <td colspan="6" class="px-4 py-4">
                  <RespostaDetalhe :resposta="r" :excluindo="excluindoId === r.id" @excluir="excluir" />
                </td>
              </tr>
            </template>
            <tr v-if="!filtradas.length">
              <td colspan="6" class="px-4 py-8 text-center text-muted">Nenhuma resposta para os filtros atuais.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
</template>

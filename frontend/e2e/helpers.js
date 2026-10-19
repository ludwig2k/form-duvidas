import { expect } from '@playwright/test'

export const TOKEN = process.env.E2E_ADMIN_TOKEN ?? 'token-e2e'
export const ADMIN = { 'X-Admin-Token': TOKEN }

export async function limparBanco(request) {
  const lista = await (await request.get('/api/respostas', { headers: ADMIN })).json()
  for (const r of lista) await request.delete(`/api/respostas/${r.id}`, { headers: ADMIN })
}

export async function criarResposta(request, dados = {}) {
  const resp = await request.post('/api/respostas', {
    data: {
      unidade: 'Gerência de Teste',
      perfil: 'Amigo da GGDP',
      temas: [{ key: 'ferias', subtopicos: ['Prazos'], duvida: '' }],
      principal_dificuldade: 'Outra',
      recursos_preferidos: [],
      situacao_pratica: '',
      melhoria_sugerida_ggdp: 'Sugestão padrão.',
      ...dados,
    },
  })
  expect(resp.status()).toBe(201)
  return resp.json()
}

/** Abre o formulário sem rascunho salvo. */
export async function abrirFormularioLimpo(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('Etapa 1 de 5 · Perfil')).toBeVisible()
}

export const continuar = (page) => page.getByRole('button', { name: /^(Continuar|Revisar respostas)$/ }).click()
export const tema = (page, nome) => page.getByRole('button', { name: new RegExp(`^${nome}`) })
export const erro = (page) => page.getByRole('alert')

export async function preencherPerfil(page, unidade = 'Gerência de Teste', perfil = 'Liderança titular') {
  await page.getByLabel('Qual é a sua unidade de lotação?').fill(unidade)
  await page.getByLabel('Qual opção melhor representa sua atuação?').selectOption(perfil)
}

export async function preencherNecessidades(page) {
  await page.getByLabel(/principal dificuldade/).selectOption('Não sei qual área procurar')
  await page.getByLabel('Fluxogramas').check()
  await page.getByLabel('Vídeos curtos').check()
  await page.getByLabel(/situação prática/).fill('Dúvidas recorrentes no fechamento.')
  await page.getByLabel(/podemos melhorar como GGDP/).fill('Publicar um calendário de prazos.')
}

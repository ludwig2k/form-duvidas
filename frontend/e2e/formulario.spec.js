import { expect, test } from '@playwright/test'
import {
  ADMIN,
  abrirFormularioLimpo,
  continuar,
  erro,
  limparBanco,
  preencherNecessidades,
  preencherPerfil,
  tema,
} from './helpers'

test.beforeEach(async ({ page, request }) => {
  await limparBanco(request)
  await abrirFormularioLimpo(page)
})

test('carrega cabeçalho, logos e os 15 temas do catálogo', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dúvidas e necessidades em Gestão de Pessoas' })).toBeVisible()
  await expect(page.getByAltText(/Sead por Você/)).toBeVisible()
  await expect(page.getByAltText(/Secretaria de Estado da Administração/)).toBeVisible()
  await expect(page.getByText('20%')).toBeVisible()
  await preencherPerfil(page)
  await continuar(page)
  await expect(page.locator('button[aria-pressed]')).toHaveCount(15)
  await expect(page.locator('button[aria-pressed="false"]')).toHaveCount(15)
})

test('fluxo completo: preenche as 5 etapas e grava no banco', async ({ page, request }) => {
  // Etapa 1
  await continuar(page)
  await expect(erro(page)).toHaveText('Preencha os campos obrigatórios antes de continuar.')
  await preencherPerfil(page, '  Gerência de Folha  ', 'Amigo da GGDP')
  await continuar(page)

  // Etapa 2
  await expect(page.getByText('Etapa 2 de 5 · Temas prioritários')).toBeVisible()
  await expect(page.getByText('40%')).toBeVisible()
  await continuar(page)
  await expect(erro(page)).toHaveText('Selecione pelo menos um tema para continuar.')
  await tema(page, 'Férias').click()
  await tema(page, 'Ações e eventos').click()
  await expect(tema(page, 'Férias')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Selecionados: 2 de 5')).toBeVisible()
  await continuar(page)

  // Etapa 3
  await expect(page.getByText('Etapa 3 de 5 · Aprofundamento')).toBeVisible()
  const detalhes = page.locator('details')
  await expect(detalhes).toHaveCount(2)
  await expect(detalhes.nth(0)).toContainText('Tema 1 de 2')
  await continuar(page)
  await expect(erro(page)).toHaveText(/Marque ao menos um ponto em cada tema/)
  await detalhes.nth(0).getByLabel('Prazos').check()
  await detalhes.nth(0).getByLabel('Outro ponto').check()
  await continuar(page)
  await expect(erro(page)).toBeVisible() // segundo tema ainda vazio
  await detalhes.nth(1).getByRole('textbox').fill('Quando abrem as inscrições?')
  await continuar(page)

  // Etapa 4
  await expect(page.getByText('Etapa 4 de 5 · Necessidades de informação')).toBeVisible()
  await continuar(page)
  await expect(erro(page)).toHaveText('Preencha os campos obrigatórios antes de continuar.')
  await preencherNecessidades(page)
  await continuar(page)

  // Etapa 5 — revisão
  await expect(page.getByText('Etapa 5 de 5 · Revisão')).toBeVisible()
  await expect(page.getByText('100%')).toBeVisible()
  const revisao = page.locator('form')
  await expect(revisao).toContainText('Unidade: Gerência de Folha')
  await expect(revisao).toContainText('Atuação: Amigo da GGDP')
  await expect(revisao).toContainText('Férias · Ações e eventos de qualidade de vida e integração')
  await expect(revisao).toContainText('Pontos: Prazos · Outro ponto')
  await expect(revisao).toContainText('Dúvida específica: Quando abrem as inscrições?')
  await expect(revisao).toContainText('Recursos preferidos: Fluxogramas · Vídeos curtos')
  await expect(revisao).toContainText('Melhoria sugerida para a GGDP: Publicar um calendário de prazos.')

  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(erro(page)).toHaveText('Confirme a revisão das respostas antes de concluir.')
  await page.getByLabel(/Confirmo que revisei/).check()
  await page.getByRole('button', { name: 'Concluir' }).click()

  // Obrigado
  await expect(page).toHaveURL(/\/obrigado$/)
  await expect(page.getByRole('heading', { name: 'Respostas concluídas.' })).toBeVisible()
  const rascunho = await page.evaluate(() => JSON.parse(localStorage.getItem('ggdp_diagnostico_draft')))
  expect(rascunho).toMatchObject({ step: 1, unidade: '', temas: [] })

  // Banco
  const [r] = await (await request.get('/api/respostas', { headers: ADMIN })).json()
  expect(r).toMatchObject({
    unidade: 'Gerência de Folha',
    perfil: 'Amigo da GGDP',
    principal_dificuldade: 'Não sei qual área procurar',
    recursos_preferidos: ['Fluxogramas', 'Vídeos curtos'],
    situacao_pratica: 'Dúvidas recorrentes no fechamento.',
    melhoria_sugerida_ggdp: 'Publicar um calendário de prazos.',
  })
  expect(r.temas).toEqual([
    { tema_key: 'ferias', tema_titulo: 'Férias', subtopicos: ['Prazos', 'Outro ponto'], duvida: '' },
    {
      tema_key: 'qvt',
      tema_titulo: 'Ações e eventos de qualidade de vida e integração',
      subtopicos: [],
      duvida: 'Quando abrem as inscrições?',
    },
  ])

  // Responder novamente volta ao início, vazio
  await page.getByRole('link', { name: 'Responder novamente' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByLabel('Qual é a sua unidade de lotação?')).toHaveValue('')
})

test('limita a seleção a 5 temas e permite trocar', async ({ page }) => {
  await preencherPerfil(page)
  await continuar(page)
  for (const nome of ['Férias', 'Licenças', 'Aposentadoria', 'Gratificações', 'Documentação funcional']) {
    await tema(page, nome).click()
  }
  await expect(page.getByText('Selecionados: 5 de 5')).toBeVisible()
  await tema(page, 'Outro assunto').click()
  await expect(page.getByRole('status')).toContainText('no máximo 5 temas')
  await expect(tema(page, 'Outro assunto')).toHaveAttribute('aria-pressed', 'false')

  await tema(page, 'Licenças').click() // desmarca
  await tema(page, 'Outro assunto').click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(tema(page, 'Outro assunto')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Selecionados: 5 de 5')).toBeVisible()
})

test('desmarcar um tema o remove do aprofundamento', async ({ page }) => {
  await preencherPerfil(page)
  await continuar(page)
  await tema(page, 'Férias').click()
  await tema(page, 'Licenças').click()
  await continuar(page)
  await expect(page.locator('details summary')).toHaveText([/Férias/, /Licenças/])
  await page.getByRole('button', { name: 'Voltar' }).click()
  await tema(page, 'Férias').click()
  await continuar(page)
  await expect(page.locator('details summary')).toHaveText([/Licenças/])
  await expect(page.locator('details').getByLabel('Outro ponto')).toBeVisible()
})

test('voltar mantém os dados preenchidos', async ({ page }) => {
  await preencherPerfil(page, 'Gabinete', 'Outro')
  await continuar(page)
  await tema(page, 'Férias').click()
  await continuar(page)
  await page.locator('details').getByLabel('Prazos').check()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await expect(page.getByLabel('Qual é a sua unidade de lotação?')).toHaveValue('Gabinete')
  await expect(page.getByLabel('Qual opção melhor representa sua atuação?')).toHaveValue('Outro')
  await continuar(page)
  await continuar(page)
  await expect(page.locator('details').getByLabel('Prazos')).toBeChecked()
})

test('rascunho sobrevive a recarregar a página', async ({ page }) => {
  await preencherPerfil(page, 'Gerência X', 'Liderança substituta')
  await continuar(page)
  await tema(page, 'Folha de pagamento').click()
  await continuar(page)
  await page.locator('details').getByRole('textbox').fill('Minha dúvida')
  await page.reload()
  await expect(page.getByText('Etapa 3 de 5 · Aprofundamento')).toBeVisible()
  await expect(page.locator('details').getByRole('textbox')).toHaveValue('Minha dúvida')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await expect(tema(page, 'Folha de pagamento')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await expect(page.getByLabel('Qual é a sua unidade de lotação?')).toHaveValue('Gerência X')
})

test('rascunho com tema inválido é saneado', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('ggdp_diagnostico_draft', JSON.stringify({ step: 2, temas: ['ferias', 'nao_existe'] })),
  )
  await page.reload()
  await expect(page.getByText('Selecionados: 1 de 5')).toBeVisible()
  await expect(tema(page, 'Férias')).toHaveAttribute('aria-pressed', 'true')
})

test('mostra erro do servidor e mantém os dados se o envio falhar', async ({ page, request }) => {
  await preencherPerfil(page)
  await continuar(page)
  await tema(page, 'Férias').click()
  await continuar(page)
  await page.locator('details').getByLabel('Prazos').check()
  await continuar(page)
  await preencherNecessidades(page)
  await continuar(page)
  await page.getByLabel(/Confirmo que revisei/).check()

  await page.route('**/api/respostas', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Banco indisponível"}' }),
  )
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(erro(page)).toHaveText('Não foi possível concluir o envio. Banco indisponível')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Concluir' })).toBeEnabled()

  await page.unroute('**/api/respostas')
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(page).toHaveURL(/\/obrigado$/)
  expect(await (await request.get('/api/respostas', { headers: ADMIN })).json()).toHaveLength(1)
})

test('mostra erro e permite tentar de novo se o catálogo não carregar', async ({ page }) => {
  let falhar = true
  await page.route('**/api/catalogo', (route) => (falhar ? route.abort() : route.continue()))
  await page.reload()
  await expect(page.getByText('Não foi possível carregar o formulário')).toBeVisible()
  falhar = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Etapa 1 de 5 · Perfil')).toBeVisible()
})

test('rota desconhecida redireciona para o formulário', async ({ page }) => {
  await page.goto('/qualquer/coisa')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Etapa 1 de 5 · Perfil')).toBeVisible()
})

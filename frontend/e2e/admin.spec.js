import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { TOKEN, criarResposta, erro, limparBanco } from './helpers'

async function login(page, token = TOKEN) {
  await page.goto('/admin')
  await page.getByLabel('Token').fill(token)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const indicador = (page, nome) =>
  page.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${nome.replace(/[()]/g, '\\$&')}$`) }) }).locator('dd')
const barra = (page, grafico, rotulo) =>
  page.locator('section', { has: page.getByRole('heading', { name: grafico, exact: true }) }).locator('li', {
    has: page.getByText(rotulo, { exact: true }),
  })
const linhas = (page) => page.locator('tbody tr:has(td.tabular-nums)')

test.describe('sem respostas', () => {
  test.beforeEach(async ({ request }) => limparBanco(request))

  test('login: token errado é recusado, certo entra; sessão persiste e sair encerra', async ({ page }) => {
    await login(page, 'errado')
    await expect(erro(page)).toHaveText('Token inválido.')
    await expect(page.getByLabel('Token')).toBeVisible()

    await page.getByLabel('Token').fill(TOKEN)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('heading', { name: 'Respostas do diagnóstico' })).toBeVisible()
    await expect(page).toHaveTitle('Respostas · Diagnóstico GGDP')
    await expect(page.getByText('Nenhuma resposta recebida ainda.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByLabel('Token')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Token')).toBeVisible()
  })

  test('token expirado durante a sessão volta para o login', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
    await page.evaluate(() => sessionStorage.setItem('ggdp_admin_token', 'trocado'))
    await page.reload()
    await expect(erro(page)).toHaveText('Sessão expirada. Informe o token novamente.')
  })

  test('Atualizar busca respostas novas', async ({ page, request }) => {
    await login(page)
    await expect(page.getByText('Nenhuma resposta recebida ainda.')).toBeVisible()
    await criarResposta(request, { unidade: 'Chegou agora' })
    await page.getByRole('button', { name: 'Atualizar' }).click()
    await expect(indicador(page, 'Respostas')).toHaveText('1')
    await page.getByRole('tab', { name: /Respostas/ }).click()
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText('Chegou agora')
  })
})

test.describe('com respostas', () => {
  test.beforeEach(async ({ page, request }) => {
    await limparBanco(request)
    await criarResposta(request, {
      unidade: 'Gabinete',
      perfil: 'Liderança titular',
      temas: [
        { key: 'ferias', subtopicos: ['Prazos', 'Regras e critérios'], duvida: 'Posso dividir em 3 períodos?' },
        { key: 'folha', subtopicos: ['Descontos'] },
      ],
      principal_dificuldade: 'Não sei qual área procurar',
      recursos_preferidos: ['Manuais', 'Fluxogramas'],
      melhoria_sugerida_ggdp: 'Publicar fluxogramas.',
    })
    await criarResposta(request, {
      unidade: 'Gerência de Pessoal',
      perfil: 'Amigo da GGDP',
      temas: [{ key: 'ferias', subtopicos: ['Prazos'] }],
      principal_dificuldade: 'Outra',
      recursos_preferidos: ['Manuais'],
      situacao_pratica: 'Acúmulo de férias vencidas.',
      melhoria_sugerida_ggdp: 'Responder mais rápido.',
    })
    await criarResposta(request, {
      unidade: 'gabinete ', // mesma unidade, grafada diferente
      perfil: 'Amigo da GGDP',
      temas: [
        { key: 'licencas', subtopicos: ['Prazos'] },
        { key: 'qvt', subtopicos: [], duvida: 'Quando é o próximo evento?' },
        { key: 'folha', subtopicos: ['Descontos'] },
      ],
      principal_dificuldade: 'Outra',
      melhoria_sugerida_ggdp: 'Mais eventos de integração.',
    })
    await login(page)
    await expect(indicador(page, 'Respostas')).toHaveText('3')
  })

  test('indicadores e gráficos do resumo', async ({ page }) => {
    await expect(indicador(page, 'Unidades distintas')).toHaveText('2')
    await expect(indicador(page, 'Temas por resposta (média)')).toHaveText('2')
    await expect(indicador(page, 'Última resposta')).toHaveText(/\d{2}\/\d{2}\/\d{4}/)

    await expect(barra(page, 'Temas mais escolhidos', 'Férias')).toContainText('2')
    await expect(barra(page, 'Temas mais escolhidos', 'Folha de pagamento e descontos')).toContainText('2')
    await expect(barra(page, 'Temas mais escolhidos', 'Aposentadoria')).toContainText('0')
    await expect(barra(page, 'Perfil de atuação', 'Amigo da GGDP')).toContainText('2')
    await expect(barra(page, 'Principal dificuldade', 'Outra')).toContainText('2')
    await expect(barra(page, 'Recursos preferidos', 'Manuais')).toContainText('2')

    // ordem decrescente
    const temas = page.locator('section', { has: page.getByRole('heading', { name: 'Temas mais escolhidos' }) }).locator('li > span:first-child')
    await expect(temas.nth(2)).toHaveText(/Ações e eventos|Licenças/)

    // tooltip ao passar o mouse
    const manual = barra(page, 'Recursos preferidos', 'Manuais')
    await manual.hover()
    await expect(manual.getByRole('tooltip')).toHaveText('2 respostas · 67% do total')

    // sugestões, mais recentes primeiro
    const sugestoes = page.locator('section', { has: page.getByRole('heading', { name: 'Sugestões de melhoria para a GGDP' }) }).locator('li')
    await expect(sugestoes).toHaveText([/Mais eventos/, /Responder mais rápido/, /Publicar fluxogramas/])
  })

  test('filtro por tema mostra pontos marcados e dúvidas do tema', async ({ page }) => {
    await page.getByLabel('Tema').selectOption({ label: 'Férias' })
    await expect(indicador(page, 'Respostas')).toHaveText('2')
    await expect(barra(page, 'Pontos mais marcados · Férias', 'Prazos')).toContainText('2')
    await expect(barra(page, 'Pontos mais marcados · Férias', 'Regras e critérios')).toContainText('1')
    const duvidas = page.locator('section', { has: page.getByRole('heading', { name: 'Dúvidas sobre Férias' }) }).locator('li')
    await expect(duvidas).toHaveCount(1)
    await expect(duvidas).toContainText('Posso dividir em 3 períodos?')
    await expect(duvidas).toContainText('Gabinete · Liderança titular')
  })

  test('filtros de perfil, busca, período e limpar', async ({ page }) => {
    await page.getByLabel('Perfil').selectOption('Liderança titular')
    await expect(indicador(page, 'Respostas')).toHaveText('1')
    await page.getByLabel('Perfil').selectOption('')

    await page.getByLabel('Buscar').fill('férias vencidas') // texto da situação prática
    await expect(indicador(page, 'Respostas')).toHaveText('1')
    await page.getByLabel('Buscar').fill('PRÓXIMO EVENTO') // dúvida de tema, sem diferenciar maiúsculas
    await expect(indicador(page, 'Respostas')).toHaveText('1')
    await page.getByLabel('Buscar').fill('nada disso')
    await expect(indicador(page, 'Respostas')).toHaveText('0')
    await expect(page.getByText('Nada para os filtros atuais.')).toBeVisible()

    await page.getByRole('button', { name: 'Limpar' }).click()
    await expect(page.getByLabel('Buscar')).toHaveValue('')
    await expect(indicador(page, 'Respostas')).toHaveText('3')
    await expect(page.getByRole('button', { name: 'Limpar' })).toBeDisabled()

    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // AAAA-MM-DD
    await page.getByLabel('De', { exact: true }).fill(hoje)
    await page.getByLabel('Até', { exact: true }).fill(hoje)
    await expect(indicador(page, 'Respostas')).toHaveText('3')
    await page.getByLabel('De', { exact: true }).fill('2099-01-01')
    await page.getByLabel('Até', { exact: true }).fill('2099-12-31')
    await expect(indicador(page, 'Respostas')).toHaveText('0')
  })

  test('tabela: lista, detalhe e filtros aplicados', async ({ page }) => {
    await page.getByRole('tab', { name: 'Respostas (3)' }).click()
    await expect(page.getByRole('tab', { name: 'Respostas (3)' })).toHaveAttribute('aria-selected', 'true')
    await expect(linhas(page)).toHaveCount(3)
    await expect(linhas(page).first()).toContainText('gabinete') // mais recente primeiro

    const primeira = linhas(page).nth(2)
    await primeira.getByRole('button', { name: 'Ver' }).click()
    const detalhe = page.locator('tbody tr').nth(3)
    await expect(detalhe).toContainText('Posso dividir em 3 períodos?')
    await expect(detalhe).toContainText('Manuais · Fluxogramas')
    await expect(detalhe).toContainText('Publicar fluxogramas.')
    await primeira.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByText('Posso dividir em 3 períodos?')).toHaveCount(0)

    await page.getByLabel('Perfil').selectOption('Amigo da GGDP')
    await expect(page.getByRole('tab', { name: 'Respostas (2)' })).toBeVisible()
    await expect(linhas(page)).toHaveCount(2)
  })

  test('excluir: cancelar mantém, confirmar remove do banco', async ({ page, request }) => {
    await page.getByRole('tab', { name: /Respostas/ }).click()
    await linhas(page).first().click()

    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'Excluir resposta' }).click()
    await expect(linhas(page)).toHaveCount(3)

    page.once('dialog', (d) => {
      expect(d.message()).toContain('Esta ação não pode ser desfeita')
      d.accept()
    })
    await page.getByRole('button', { name: 'Excluir resposta' }).click()
    await expect(linhas(page)).toHaveCount(2)
    await expect(indicador(page, 'Respostas')).toHaveText('2')

    const lista = await (await request.get('/api/respostas', { headers: { 'X-Admin-Token': TOKEN } })).json()
    expect(lista.map((r) => r.unidade)).toEqual(['Gabinete', 'Gerência de Pessoal'])
  })

  test('exportar CSV baixa todas as respostas', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('respostas-diagnostico-ggdp.csv')
    const bytes = readFileSync(await download.path())
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // BOM: Excel reconhece UTF-8
    const csv = bytes.subarray(3).toString('utf-8')
    const linhasCsv = csv.trim().split(/\r?\n/)
    expect(linhasCsv).toHaveLength(4)
    expect(linhasCsv[0]).toMatch(/^id;criado_em;unidade;perfil/)
    expect(csv).toContain('Posso dividir em 3 períodos?')
  })
})

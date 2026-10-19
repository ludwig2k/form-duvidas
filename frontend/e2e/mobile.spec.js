import { expect, test } from '@playwright/test'
import { abrirFormularioLimpo, continuar, criarResposta, limparBanco, preencherPerfil, tema, TOKEN } from './helpers'

const semRolagemHorizontal = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('formulário cabe na tela do celular em todas as etapas', async ({ page }) => {
  await abrirFormularioLimpo(page)
  expect(await semRolagemHorizontal(page)).toBe(true)
  await preencherPerfil(page)
  await continuar(page)
  expect(await semRolagemHorizontal(page)).toBe(true)
  await tema(page, 'Ações e eventos').click()
  await continuar(page)
  expect(await semRolagemHorizontal(page)).toBe(true)
  // botões de navegação continuam acessíveis (barra fixa no rodapé)
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeInViewport()
})

test('painel admin cabe na tela do celular', async ({ page, request }) => {
  await limparBanco(request)
  await criarResposta(request)
  await page.goto('/admin')
  await page.getByLabel('Token').fill(TOKEN)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  expect(await semRolagemHorizontal(page)).toBe(true)
  await page.getByRole('tab', { name: /Respostas/ }).click()
  expect(await semRolagemHorizontal(page)).toBe(true) // tabela rola dentro do próprio cartão
})

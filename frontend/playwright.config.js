import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.E2E_PORT ?? '8790'
// E2E_BASE_URL aponta para um servidor já rodando (ex.: ensaio atrás do Nginx); sem ele, sobe um backend temporário.
const BASE_URL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  // Os testes compartilham o mesmo banco, então rodam em sequência.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL ?? `http://127.0.0.1:${PORT}`,
    channel: 'chrome', // usa o Chrome instalado; nenhum navegador é baixado
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, testMatch: /mobile\.spec/ },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: 'npm run build && node e2e/server.mjs',
        url: `http://127.0.0.1:${PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 120_000,
      },
})

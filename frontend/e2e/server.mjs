// Sobe o backend (que serve o build do frontend) com banco temporário para os testes E2E.
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const backend = resolve(import.meta.dirname, '../../backend')
const python = join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const db = join(mkdtempSync(join(tmpdir(), 'ggdp-e2e-')), 'e2e.db').replaceAll('\\', '/')

const proc = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--port', process.env.E2E_PORT ?? '8790'], {
  cwd: backend,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: `sqlite:///${db}`, ADMIN_TOKEN: 'token-e2e' },
})
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => proc.kill())
proc.on('exit', (code) => process.exit(code ?? 0))

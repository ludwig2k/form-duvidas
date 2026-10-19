<#
.SYNOPSIS
  Testa e publica na VPS o commit atual, que precisa já estar no GitHub (git push).
  A VPS busca o código no GitHub, gera o build e reinicia o serviço (rollback se falhar).

.EXAMPLE
  # Primeira vez: clona o repositório na VPS, instala tudo e já emite o HTTPS
  .\deploy\publicar.ps1 -Servidor root@203.0.113.10 -Instalar -Dominio duvidas.exemplo.gov.br -EmailCertbot ti@exemplo.gov.br

.EXAMPLE
  # Atualizações seguintes (depois do git push)
  .\deploy\publicar.ps1 -Servidor root@203.0.113.10

.EXAMPLE
  # Voltar para uma versão específica (commit ou tag)
  .\deploy\publicar.ps1 -Servidor root@203.0.113.10 -Ref v1.0.0 -PularTestes
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Servidor,   # usuario@ip-ou-host
  [int]$PortaSsh = 22,
  [string]$Ref = 'HEAD',
  [switch]$Instalar,
  [string]$Dominio,
  [string]$EmailCertbot,
  [int]$PortaApp = 8010,
  [switch]$PularTestes
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Raiz 'backend'
$Frontend = Join-Path $Raiz 'frontend'
$RepoVps = '/opt/form-duvidas/repo'

function Executar([string]$Titulo, [scriptblock]$Bloco) {
  Write-Host "==> $Titulo" -ForegroundColor Cyan
  & $Bloco
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $Titulo (código $LASTEXITCODE)" }
}

if ($Instalar -and -not $Dominio) { throw 'Use -Dominio junto com -Instalar.' }
foreach ($cmd in 'git', 'ssh', 'npm') {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "Comando '$cmd' não encontrado no PATH." }
}

Push-Location $Raiz
try {
  if ($Ref -eq 'HEAD' -and (git status --porcelain)) {
    throw 'Há alterações não commitadas. Faça commit e git push antes de publicar.'
  }
  Executar 'Buscando o GitHub' { git fetch --quiet --tags origin }
  $Commit = git rev-parse --verify --quiet "$Ref^{commit}"
  if (-not $Commit) { throw "Versão não encontrada: $Ref" }
  if (-not (git branch -r --contains $Commit)) {
    throw "O commit $($Commit.Substring(0, 7)) ainda não está no GitHub. Rode 'git push' antes."
  }
  $Url = (git remote get-url origin) -replace '^git@github\.com:', 'https://github.com/'
  Write-Host "   Versão: $(git log -1 --format='%h %s' $Commit)"
} finally { Pop-Location }

if (-not $PularTestes) {
  Executar 'Testes da API (pytest)' { Push-Location $Backend; try { & .\.venv\Scripts\python -m pytest -q } finally { Pop-Location } }
  Executar 'Testes de ponta a ponta (Playwright)' { Push-Location $Frontend; try { npm run test:e2e } finally { Pop-Location } }
}

if ($Instalar) {
  $envCert = if ($EmailCertbot) { "CERTBOT_EMAIL='$EmailCertbot' " } else { '' }
  $Remoto = @(
    'set -e'
    'command -v git >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq git >/dev/null; }'
    "[ -d $RepoVps/.git ] || { sudo mkdir -p /opt/form-duvidas && sudo git clone --quiet '$Url' $RepoVps; }"
    "sudo git -C $RepoVps fetch --quiet --tags origin"
    "sudo git -C $RepoVps checkout --quiet --force --detach $Commit"
    "sudo ${envCert}bash $RepoVps/deploy/scripts/instalar.sh '$Dominio' $PortaApp"
  ) -join '; '
  Executar 'Instalando no servidor' { ssh -t -p $PortaSsh $Servidor $Remoto }
} else {
  Executar 'Atualizando no servidor' { ssh -t -p $PortaSsh $Servidor "sudo form-duvidas-atualizar $Commit" }
}

Write-Host '==> Publicação concluída.' -ForegroundColor Green

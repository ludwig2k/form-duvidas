<#
.SYNOPSIS
  Testa, gera o build e publica o app na VPS (via scp/ssh).

.EXAMPLE
  # Primeira vez: instala tudo e já emite o HTTPS
  .\deploy\publicar.ps1 -Servidor root@203.0.113.10 -Instalar -Dominio duvidas.exemplo.gov.br -EmailCertbot ti@exemplo.gov.br

.EXAMPLE
  # Só gerar o pacote, sem enviar
  .\deploy\publicar.ps1 -SomentePacote

.EXAMPLE
  # Atualizações seguintes
  .\deploy\publicar.ps1 -Servidor root@203.0.113.10
#>
param(
  [string]$Servidor,   # usuario@ip-ou-host
  [int]$PortaSsh = 22,
  [switch]$Instalar,
  [string]$Dominio,
  [string]$EmailCertbot,
  [int]$PortaApp = 8010,
  [switch]$PularTestes,
  [switch]$SomentePacote   # só gera o .tar.gz (para enviar manualmente)
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Raiz 'backend'
$Frontend = Join-Path $Raiz 'frontend'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Pacote = "form-duvidas-$Stamp.tar.gz"

function Executar([string]$Titulo, [scriptblock]$Bloco) {
  Write-Host "==> $Titulo" -ForegroundColor Cyan
  & $Bloco
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $Titulo (código $LASTEXITCODE)" }
}

if (-not $SomentePacote -and -not $Servidor) { throw 'Informe -Servidor usuario@ip (ou use -SomentePacote).' }
if ($Instalar -and -not $Dominio) { throw 'Use -Dominio junto com -Instalar.' }
$necessarios = if ($SomentePacote) { 'tar', 'npm' } else { 'ssh', 'scp', 'tar', 'npm' }
foreach ($cmd in $necessarios) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "Comando '$cmd' não encontrado no PATH." }
}

if (-not $PularTestes) {
  Executar 'Testes da API (pytest)' { Push-Location $Backend; try { & .\.venv\Scripts\python -m pytest } finally { Pop-Location } }
  Executar 'Testes de ponta a ponta (Playwright)' { Push-Location $Frontend; try { npm run test:e2e } finally { Pop-Location } }
}

Executar 'Build do frontend' { Push-Location $Frontend; try { npm run build } finally { Pop-Location } }

Write-Host '==> Montando o pacote' -ForegroundColor Cyan
$Stage = Join-Path $env:TEMP "form-duvidas-pkg-$Stamp"
New-Item -ItemType Directory -Force (Join-Path $Stage 'backend'), (Join-Path $Stage 'frontend') | Out-Null
Copy-Item (Join-Path $Backend 'app') (Join-Path $Stage 'backend\app') -Recurse
Copy-Item (Join-Path $Backend 'requirements.txt') (Join-Path $Stage 'backend')
Copy-Item (Join-Path $Frontend 'dist') (Join-Path $Stage 'frontend\dist') -Recurse
Copy-Item (Join-Path $Raiz 'deploy') (Join-Path $Stage 'deploy') -Recurse
Get-ChildItem $Stage -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force
Remove-Item (Join-Path $Stage 'deploy\publicar.ps1')
# Scripts shell precisam de fim de linha LF.
Get-ChildItem (Join-Path $Stage 'deploy') -Recurse -Include '*.sh', '*.conf', '*.service', '*.example' | ForEach-Object {
  $txt = [IO.File]::ReadAllText($_.FullName) -replace "`r`n", "`n"
  [IO.File]::WriteAllText($_.FullName, $txt, (New-Object Text.UTF8Encoding $false))
}
$PacoteLocal = Join-Path $env:TEMP $Pacote
Executar 'Compactando' { tar -czf $PacoteLocal -C $Stage . }
Remove-Item $Stage -Recurse -Force
Write-Host ("   {0} ({1:N1} MB)" -f $Pacote, ((Get-Item $PacoteLocal).Length / 1MB))

if ($SomentePacote) {
  Write-Host "==> Pacote pronto: $PacoteLocal" -ForegroundColor Green
  return
}

Executar 'Enviando para o servidor' { scp -P $PortaSsh $PacoteLocal "${Servidor}:/tmp/$Pacote" }

$Dir = "/tmp/form-duvidas-$Stamp"
if ($Instalar) {
  $envCert = if ($EmailCertbot) { "CERTBOT_EMAIL='$EmailCertbot' " } else { '' }
  $Acao = "${envCert}bash $Dir/deploy/scripts/instalar.sh '$Dominio' /tmp/$Pacote $PortaApp"
} else {
  $Acao = "bash $Dir/deploy/scripts/atualizar.sh /tmp/$Pacote"
}
$Remoto = "set -e; mkdir -p $Dir; tar -xzf /tmp/$Pacote -C $Dir; sudo $Acao; rm -rf $Dir"
Executar ($(if ($Instalar) { 'Instalando no servidor' } else { 'Atualizando no servidor' })) { ssh -t -p $PortaSsh $Servidor $Remoto }

Remove-Item $PacoteLocal -Force
Write-Host '==> Publicação concluída.' -ForegroundColor Green

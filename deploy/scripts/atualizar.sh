#!/usr/bin/env bash
# Publica uma nova versão a partir do pacote gerado pelo publicar.ps1.
# Uso (como root): bash atualizar.sh /tmp/form-duvidas-AAAAMMDD-HHMMSS.tar.gz
#
# Cada versão fica em /opt/form-duvidas/releases/<data>; /opt/form-duvidas/app é um
# link para a versão ativa. Se o health check falhar, volta para a versão anterior.
set -euo pipefail

PACOTE="${1:?Informe o caminho do pacote .tar.gz}"
BASE=/opt/form-duvidas
ENV_FILE=/etc/form-duvidas/form-duvidas.env
MANTER=3

[[ $EUID -eq 0 ]] || { echo "Execute como root (sudo)." >&2; exit 1; }
[[ -f "$PACOTE" ]] || { echo "Pacote não encontrado: $PACOTE" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Falta $ENV_FILE — rode o instalar.sh primeiro." >&2; exit 1; }

PORTA=$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2)
PORTA=${PORTA:-8010}
NOVA="$BASE/releases/$(date +%Y%m%d-%H%M%S)"
ANTERIOR=""
[[ -L "$BASE/app" ]] && ANTERIOR=$(readlink -f "$BASE/app")

echo "==> Extraindo em $NOVA"
mkdir -p "$NOVA"
tar -xzf "$PACOTE" -C "$NOVA"
[[ -f "$NOVA/frontend/dist/index.html" && -f "$NOVA/backend/app/main.py" ]] \
  || { echo "Pacote incompleto (falta frontend/dist ou backend/app)." >&2; rm -rf "$NOVA"; exit 1; }
chown -R root:root "$NOVA"
chmod -R a+rX "$NOVA"

echo "==> Instalando dependências Python"
"$BASE/venv/bin/pip" install --quiet --upgrade pip
"$BASE/venv/bin/pip" install --quiet -r "$NOVA/backend/requirements.txt"

if [[ -n "$ANTERIOR" ]]; then
  echo "==> Backup do banco antes de atualizar"
  bash "$NOVA/deploy/scripts/backup.sh" || echo "   (aviso: backup falhou, seguindo)"
fi

echo "==> Preparando o banco (cria tabelas novas, se houver)"
(
  cd "$NOVA/backend"
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
  runuser -u formduvidas -- "$BASE/venv/bin/python" -c 'import app.main'
)

ativar() {
  ln -sfn "$1" "$BASE/app.tmp" && mv -Tf "$BASE/app.tmp" "$BASE/app"
  systemctl restart form-duvidas
}

saudavel() {
  for _ in $(seq 1 20); do
    curl -fsS "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

echo "==> Ativando nova versão"
ativar "$NOVA"

if saudavel; then
  nginx -t -q && systemctl reload nginx
  echo "==> OK: versão $(basename "$NOVA") no ar."
else
  echo "!!! Health check falhou. Últimas linhas do log:" >&2
  journalctl -u form-duvidas -n 30 --no-pager >&2 || true
  if [[ -n "$ANTERIOR" && -d "$ANTERIOR" && "$ANTERIOR" != "$NOVA" ]]; then
    echo "==> Voltando para $(basename "$ANTERIOR")" >&2
    ativar "$ANTERIOR"
    saudavel && echo "==> Versão anterior restaurada." >&2
  fi
  exit 1
fi

echo "==> Limpando versões antigas (mantém $MANTER)"
# Nomes são datas (AAAAMMDD-HHMMSS): ordem alfabética = cronológica.
find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort -r | tail -n +$((MANTER + 1)) | xargs -r rm -rf
rm -f "$PACOTE"

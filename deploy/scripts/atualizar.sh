#!/usr/bin/env bash
# Publica a versão que está em /opt/form-duvidas/repo (HEAD do clone do GitHub).
# Normalmente chamado por: sudo form-duvidas-atualizar [commit|tag|origin/main]
# (que faz o fetch/checkout antes e depois executa este script).
#
# Cada versão fica em /opt/form-duvidas/releases/<data>-<commit>; /opt/form-duvidas/app é
# um link para a versão ativa. Se o health check falhar, volta para a versão anterior.
set -euo pipefail

BASE=/opt/form-duvidas
REPO=$BASE/repo
USUARIO=formduvidas
ENV_FILE=/etc/form-duvidas/form-duvidas.env
MANTER=3

[[ $EUID -eq 0 ]] || { echo "Execute como root (sudo)." >&2; exit 1; }
[[ -d "$REPO/.git" ]] || { echo "Clone não encontrado em $REPO — rode o instalar.sh primeiro." >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "Falta $ENV_FILE — rode o instalar.sh primeiro." >&2; exit 1; }
[[ -x "$BASE/node/bin/node" ]] || { echo "Node não encontrado em $BASE/node — rode o instalar.sh primeiro." >&2; exit 1; }

PORTA=$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2)
PORTA=${PORTA:-8010}
COMMIT=$(git -C "$REPO" rev-parse HEAD)
NOVA="$BASE/releases/$(date +%Y%m%d-%H%M%S)-${COMMIT:0:7}"
ANTERIOR=""
[[ -L "$BASE/app" ]] && ANTERIOR=$(readlink -f "$BASE/app")

echo "==> Versão $(git -C "$REPO" log -1 --format='%h %s (%an, %ad)' --date=short)"
echo "==> Extraindo em $NOVA"
mkdir -p "$NOVA"
git -C "$REPO" archive "$COMMIT" | tar -x -C "$NOVA"
echo "$COMMIT" > "$NOVA/REVISION"

echo "==> Build do frontend"
# Roda como o usuário do serviço (sem root) com cache próprio; node_modules é descartado depois.
mkdir -p "$BASE/cache"
chown "$USUARIO:$USUARIO" "$BASE/cache"
chown -R "$USUARIO:$USUARIO" "$NOVA/frontend"
runuser -u "$USUARIO" -- env -i \
  HOME="$BASE/cache" PATH="$BASE/node/bin:/usr/bin:/bin" \
  npm_config_cache="$BASE/cache/npm" PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  sh -c 'cd "$1" && npm ci --no-audit --no-fund --loglevel=error && npm run build --silent' _ "$NOVA/frontend" \
  || { echo "Build do frontend falhou." >&2; rm -rf "$NOVA"; exit 1; }
rm -rf "$NOVA/frontend/node_modules"
[[ -f "$NOVA/frontend/dist/index.html" && -f "$NOVA/backend/app/main.py" ]] \
  || { echo "Versão incompleta (falta frontend/dist ou backend/app)." >&2; rm -rf "$NOVA"; exit 1; }
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
  runuser -u "$USUARIO" -- "$BASE/venv/bin/python" -c 'import app.main'
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
# Nomes começam pela data (AAAAMMDD-HHMMSS): ordem alfabética = cronológica.
find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort -r | tail -n +$((MANTER + 1)) | xargs -r rm -rf

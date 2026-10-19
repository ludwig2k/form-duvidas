#!/usr/bin/env bash
# Backup consistente do SQLite (funciona com o app rodando). Mantém 30 dias.
# Agendado diariamente por /etc/cron.d/form-duvidas (criado pelo instalar.sh).
set -euo pipefail

ENV_FILE=/etc/form-duvidas/form-duvidas.env
DESTINO=/var/backups/form-duvidas
DIAS=30

DB=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | sed 's#^sqlite:///##')
[[ -f "$DB" ]] || { echo "Banco ainda não existe ($DB); nada a fazer."; exit 0; }

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
ARQ="$DESTINO/respostas-$(date +%Y%m%d-%H%M%S).db"

sqlite3 "$DB" ".backup '$ARQ'"
gzip -f "$ARQ"
# Se o sqlite3 (root) criou arquivos -wal/-shm, devolve ao usuário do serviço.
chown formduvidas:formduvidas "$(dirname "$DB")"/* 2>/dev/null || true
find "$DESTINO" -name 'respostas-*.db.gz' -mtime +$DIAS -delete
echo "Backup: $ARQ.gz"

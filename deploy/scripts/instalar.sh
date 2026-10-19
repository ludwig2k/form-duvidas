#!/usr/bin/env bash
# Instalação inicial na VPS (Ubuntu 22.04/24.04 com Nginx já instalado).
# Uso (como root): bash instalar.sh <dominio> <pacote.tar.gz> [porta-interna]
#   Ex.: bash instalar.sh duvidas.exemplo.gov.br /tmp/form-duvidas-20261014-1200.tar.gz
#
# Opcional: CERTBOT_EMAIL=voce@exemplo.gov.br bash instalar.sh ...  → já emite o HTTPS.
# Pode ser executado de novo sem problemas (não sobrescreve o .env nem o banco).
set -euo pipefail

DOMINIO="${1:?Informe o domínio}"
PACOTE="${2:?Informe o pacote .tar.gz}"
PORTA="${3:-8010}"
BASE=/opt/form-duvidas
USUARIO=formduvidas
ENV_DIR=/etc/form-duvidas
ENV_FILE=$ENV_DIR/form-duvidas.env
DATA_DIR=/var/lib/form-duvidas
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY="$(dirname "$AQUI")"

[[ $EUID -eq 0 ]] || { echo "Execute como root (sudo)." >&2; exit 1; }
[[ -f "$PACOTE" ]] || { echo "Pacote não encontrado: $PACOTE" >&2; exit 1; }
command -v nginx >/dev/null || { echo "Nginx não encontrado. Instale com: apt install nginx" >&2; exit 1; }

if ss -ltn "( sport = :$PORTA )" | grep -q LISTEN && ! systemctl is-active -q form-duvidas; then
  echo "A porta $PORTA já está em uso por outro serviço. Escolha outra: bash instalar.sh $DOMINIO $PACOTE 8011" >&2
  exit 1
fi

echo "==> Pacotes do sistema"
apt-get update -qq
apt-get install -y -qq python3 python3-venv sqlite3 curl >/dev/null
python3 -c 'import sys; assert sys.version_info >= (3, 10), "Python 3.10+ necessário"'

echo "==> Usuário e diretórios"
id -u "$USUARIO" >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --no-create-home --shell /usr/sbin/nologin "$USUARIO"
mkdir -p "$BASE/releases" "$ENV_DIR" "$DATA_DIR" /var/backups/form-duvidas
chown "$USUARIO:$USUARIO" "$DATA_DIR"
chmod 750 "$DATA_DIR"
chmod 700 /var/backups/form-duvidas

echo "==> Ambiente Python"
[[ -x "$BASE/venv/bin/python" ]] || python3 -m venv "$BASE/venv"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Criando $ENV_FILE com token novo"
  TOKEN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
  sed -e "s#^ADMIN_TOKEN=.*#ADMIN_TOKEN=$TOKEN#" -e "s#^APP_PORT=.*#APP_PORT=$PORTA#" \
    "$DEPLOY/form-duvidas.env.example" > "$ENV_FILE"
  NOVO_TOKEN=1
else
  echo "==> $ENV_FILE já existe; mantido"
fi
chown root:"$USUARIO" "$ENV_FILE"
chmod 640 "$ENV_FILE"
PORTA=$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2)

echo "==> Serviço systemd"
install -m 644 "$DEPLOY/systemd/form-duvidas.service" /etc/systemd/system/form-duvidas.service
systemctl daemon-reload
systemctl enable -q form-duvidas

echo "==> Backup diário (03:15)"
cat > /etc/cron.d/form-duvidas <<EOF
15 3 * * * root bash $BASE/app/deploy/scripts/backup.sh >> /var/log/form-duvidas-backup.log 2>&1
EOF

echo "==> Publicando a aplicação"
bash "$AQUI/atualizar.sh" "$PACOTE"

echo "==> Site no Nginx"
if [[ -d /etc/nginx/sites-available ]]; then
  CONF=/etc/nginx/sites-available/form-duvidas.conf
  LINK=/etc/nginx/sites-enabled/form-duvidas.conf
else
  CONF=/etc/nginx/conf.d/form-duvidas.conf
  LINK=""
fi
if [[ -f "$CONF" ]] && grep -q "ssl_certificate" "$CONF"; then
  echo "   $CONF já tem HTTPS configurado pelo Certbot; mantido."
else
  sed -e "s#__DOMINIO__#$DOMINIO#g" -e "s#__PORTA__#$PORTA#g" "$DEPLOY/nginx/form-duvidas.conf" > "$CONF"
  [[ -n "$LINK" ]] && ln -sfn "$CONF" "$LINK"
fi
[[ -f /etc/nginx/proxy_params ]] || cat > /etc/nginx/proxy_params <<'EOF'
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
EOF
nginx -t
systemctl reload nginx

if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  echo "==> HTTPS com Let's Encrypt"
  command -v certbot >/dev/null || apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect
fi

echo
echo "================================================================"
echo " Instalação concluída."
echo " Site:   http://$DOMINIO   (admin em /admin)"
[[ -z "${CERTBOT_EMAIL:-}" ]] && echo " HTTPS:  sudo certbot --nginx -d $DOMINIO --redirect"
if [[ -n "${NOVO_TOKEN:-}" ]]; then
  echo " Token do admin (guarde em local seguro):"
  echo "   $(grep -E '^ADMIN_TOKEN=' "$ENV_FILE" | cut -d= -f2)"
fi
echo " Logs:   journalctl -u form-duvidas -f"
echo "================================================================"

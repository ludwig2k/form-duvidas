# Deploy em produção — VPS Ubuntu (Hostinger)

Este guia assume uma VPS Ubuntu onde você já hospeda outros apps (Nginx já
instalado). O código, incluindo o build do frontend já pronto em
`backend/static/`, vem do repositório
[github.com/ludwig2k/form-duvidas](https://github.com/ludwig2k/form-duvidas)
via `git clone`/`git pull`. **O servidor não precisa ter Node.js instalado**:
o build é feito e commitado na sua máquina antes do `git push`, então um
`git pull` na VPS já traz tudo pronto.

## 1. Preparar a VPS

Pré-requisitos (instale o que faltar):

```bash
sudo apt update
sudo apt install -y python3 python3-venv git nginx certbot python3-certbot-nginx
```

Crie um usuário de sistema dedicado ao app (não rode como root nem com seu
usuário pessoal):

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin formduvidas
sudo mkdir -p /opt/form-duvidas
sudo chown formduvidas:formduvidas /opt/form-duvidas
```

## 2. Clonar o repositório

```bash
sudo -u formduvidas git clone https://github.com/ludwig2k/form-duvidas.git /opt/form-duvidas
```

Isso já cria `/opt/form-duvidas/backend` (com `static/`, o build do frontend,
já dentro) e `/opt/form-duvidas/frontend` com o código-fonte. Só ficam de fora
`data/` (o banco), `.venv/` e `.env`, que são gerados/configurados na própria
VPS (gitignored de propósito).

## 3. Ambiente virtual e dependências

```bash
cd /opt/form-duvidas/backend
sudo -u formduvidas python3 -m venv .venv
sudo -u formduvidas .venv/bin/pip install -r requirements.txt
sudo -u formduvidas mkdir -p data
```

## 4. Configurar o `.env` de produção

```bash
sudo -u formduvidas cp .env.example .env
sudo -u formduvidas nano .env
```

- `ADMIN_TOKEN`: é a senha da página `/admin`. Gere um valor forte e único com
  `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` e guarde-o
  em local seguro. **Não reaproveite o token de teste da sua máquina.**
- `API_DOCS=false` e `CORS_ORIGINS=` (vazio) já vêm certos para produção.

O banco SQLite (`backend/data/respostas.db`) é criado sozinho na primeira
execução.

## 5. Serviço systemd

```bash
sudo cp /opt/form-duvidas/deploy/form-duvidas.service /etc/systemd/system/form-duvidas.service
sudo systemctl daemon-reload
sudo systemctl enable --now form-duvidas
sudo systemctl status form-duvidas
```

Ver logs em tempo real: `sudo journalctl -u form-duvidas -f`

O Uvicorn escuta só em `127.0.0.1:34719` (porta alta e incomum, escolhida para
não colidir com os outros apps já hospedados nesta VPS; confira antes com
`sudo ss -tlnp | grep 34719`. Se já estiver em uso, troque o número em
`deploy/form-duvidas.service` e `deploy/nginx.conf.example` para outra porta
livre). Ela não fica exposta direto à internet: quem recebe tráfego externo é
o Nginx.

## 6. Nginx + HTTPS

Copie `deploy/nginx.conf.example` para `/etc/nginx/sites-available/form-duvidas`,
troque `duvidas.seudominio.com.br` pelo domínio real, habilite e emita o
certificado:

```bash
sudo cp /opt/form-duvidas/deploy/nginx.conf.example /etc/nginx/sites-available/form-duvidas
sudo nano /etc/nginx/sites-available/form-duvidas   # ajustar server_name
sudo ln -s /etc/nginx/sites-available/form-duvidas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d duvidas.seudominio.com.br
```

O Certbot reescreve o arquivo automaticamente adicionando o bloco HTTPS e o
redirecionamento de HTTP para HTTPS, além de configurar a renovação automática.

## 7. Checar

```bash
curl -s https://duvidas.seudominio.com.br/api/health
# {"status":"ok"}
```

Depois teste pelo navegador: o formulário completo e o painel em `/admin`
(entre com o `ADMIN_TOKEN`).

## 8. Backup

O único dado que importa preservar é o banco `backend/data/respostas.db`. Um
cron de backup diário (cópia consistente mesmo com o app rodando; mantém 30
dias):

```bash
sudo -u formduvidas mkdir -p /opt/form-duvidas/backups
sudo crontab -u formduvidas -e
```

```
0 3 * * * /opt/form-duvidas/backend/.venv/bin/python -c "import sqlite3, datetime; sqlite3.connect('/opt/form-duvidas/backend/data/respostas.db').backup(sqlite3.connect(f'/opt/form-duvidas/backups/respostas-{datetime.date.today()}.db'))" && find /opt/form-duvidas/backups -name 'respostas-*.db' -mtime +30 -delete
```

## 9. Atualizando depois de mudanças no código

1. Local: se mudou algo no frontend, rode `cd frontend && npm run build`
   primeiro (isso atualiza `backend/static/`, que é versionado).
2. Local: `git add -A`, `git commit`, `git push`.
3. Na VPS: `cd /opt/form-duvidas && sudo -u formduvidas git pull`
4. Se mudou `requirements.txt`: `sudo -u formduvidas /opt/form-duvidas/backend/.venv/bin/pip install -r /opt/form-duvidas/backend/requirements.txt`
5. `sudo systemctl restart form-duvidas`

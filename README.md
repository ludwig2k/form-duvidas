# Diagnóstico GGDP — Formulário de dúvidas

Formulário em 5 etapas (Perfil → Temas → Aprofundamento → Necessidades → Revisão), baseado no modelo estático em `duvidas/`.

- **Frontend:** Vue 3 + Vite + Tailwind CSS v4 (`frontend/`)
- **Backend:** Python + FastAPI + SQLAlchemy (`backend/`)
- **Banco:** SQLite (`backend/data/respostas.db`, criado automaticamente)

Os temas, perfis, dificuldades e recursos ficam em um único lugar — [`backend/app/temas.py`](backend/app/temas.py) — e o frontend os carrega por `GET /api/catalogo`. Para incluir ou alterar um tema, edite só esse arquivo.

## Desenvolvimento

Backend (porta 8000):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend (porta 5180, com proxy de `/api` para o backend):

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5180.

## Produção (VPS Ubuntu com Nginx)

O código vai para a VPS pelo GitHub: você faz `git push` e a VPS busca o commit, gera o build do frontend e reinicia o serviço. Tudo fica em [`deploy/`](deploy/). Do Windows, o `publicar.ps1` confere se o commit já está no GitHub, roda os testes e manda a VPS publicá-lo por `ssh`:

```powershell
git push

# Primeira vez: clona o repositório na VPS, instala Nginx + systemd + backup e emite o HTTPS
.\deploy\publicar.ps1 -Servidor root@IP -Instalar -Dominio duvidas.exemplo.gov.br -EmailCertbot ti@exemplo.gov.br

# Atualizações seguintes (com rollback automático se o health check falhar)
.\deploy\publicar.ps1 -Servidor root@IP

# Publicar uma versão específica (commit ou tag), ex. para voltar atrás
.\deploy\publicar.ps1 -Servidor root@IP -Ref v1.0.0 -PularTestes
```

Direto na VPS, `sudo form-duvidas-atualizar` publica a `origin/main` (ou `sudo form-duvidas-atualizar <commit|tag>`).

Na VPS:

- Clone do GitHub em `/opt/form-duvidas/repo`. Cada versão é extraída em `/opt/form-duvidas/releases/<data>-<commit>`, com `/opt/form-duvidas/app` apontando para a versão ativa (guarda as 3 últimas; o commit fica em `REVISION`).
- O build do frontend roda na VPS, sem root, com um Node.js 22 próprio em `/opt/form-duvidas/node` (não interfere no sistema).
- Configuração em `/etc/form-duvidas/form-duvidas.env`. O token do admin é gerado na instalação e exibido uma única vez.
- Banco em `/var/lib/form-duvidas/respostas.db`, com backup diário às 03:15 em `/var/backups/form-duvidas` (30 dias).
- O serviço `form-duvidas` (uvicorn em `127.0.0.1:8010`) fica atrás do Nginx, que serve o frontend e aplica CSP, cabeçalhos de segurança e limite de requisições.
- Logs: `journalctl -u form-duvidas -f` e `/var/log/nginx/form-duvidas.*.log`.

Sem Nginx, o FastAPI também serve o build sozinho: `npm run build` e depois `uvicorn app.main:app --host 0.0.0.0 --port 8000` em `backend/`.

## Página de administração

Acesse `/admin` (em desenvolvimento: http://localhost:5180/admin) e informe o `ADMIN_TOKEN`. O token fica salvo só na aba do navegador (sessionStorage).

- **Indicadores:** total de respostas, unidades distintas, média de temas por resposta, última resposta.
- **Filtros:** busca por unidade ou texto livre, perfil, tema e período. Tudo na página respeita os filtros.
- **Resumo:** temas mais escolhidos, perfil, principal dificuldade, recursos preferidos e sugestões de melhoria. Ao filtrar por um tema, aparecem os pontos mais marcados e as dúvidas escritas naquele tema.
- **Respostas:** tabela com o detalhe completo de cada envio e opção de excluir.
- **Exportar CSV** com as respostas.


| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/catalogo` | Temas, perfis e opções do formulário |
| POST | `/api/respostas` | Grava uma resposta (validada no servidor) |
| GET | `/api/respostas` | Lista as respostas em JSON — exige `X-Admin-Token` |
| DELETE | `/api/respostas/{id}` | Exclui uma resposta — exige `X-Admin-Token` |
| GET | `/api/respostas.csv` | Exporta CSV (`;`, UTF-8, abre no Excel) — exige `X-Admin-Token` |

Documentação interativa: http://localhost:8000/api/docs

## Variáveis de ambiente (backend)

Podem ser definidas no ambiente ou no arquivo `backend/.env` (não versionado):

```
ADMIN_TOKEN=um-token-longo-e-secreto
```

| Variável | Padrão | Uso |
|---|---|---|
| `ADMIN_TOKEN` | *(vazio)* | Token para consultar/exportar respostas. Vazio = consulta desabilitada |
| `DATABASE_URL` | `sqlite:///backend/data/respostas.db` | Caminho do banco |
| `CORS_ORIGINS` | `http://localhost:5180` | Origens permitidas, separadas por vírgula |
| `FRONTEND_DIST` | `frontend/dist` | Pasta do build servida pelo backend |

Exemplo de exportação:

```bash
curl -H "X-Admin-Token: SEU_TOKEN" http://localhost:8000/api/respostas.csv -o respostas.csv
```

## Testes

**API (pytest)** — usa um banco temporário, não toca nos dados reais:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

**Ponta a ponta (Playwright)** — gera o build, sobe o backend na porta 8790 com banco temporário e testa formulário, painel admin e layout de celular no Chrome instalado:

```bash
cd frontend
npm run test:e2e          # ou npm run test:e2e:ui para ver no navegador
```

## Banco de dados

- `respostas` — uma linha por envio: unidade, perfil, dificuldade, recursos (JSON), situação prática, melhoria sugerida, data.
- `resposta_temas` — uma linha por tema escolhido em cada envio: chave/título do tema, pontos marcados (JSON) e dúvida específica.

Essa separação facilita contar, por exemplo, quantas vezes cada tema foi escolhido:

```sql
SELECT tema_titulo, COUNT(*) FROM resposta_temas GROUP BY tema_titulo ORDER BY 2 DESC;
```

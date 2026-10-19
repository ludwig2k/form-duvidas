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

Passo a passo em [DEPLOY.md](DEPLOY.md). Resumo: o build do frontend vai versionado em `backend/static/`, a VPS só faz `git clone`/`git pull` (não precisa de Node) e o FastAPI roda pelo systemd em `127.0.0.1:34719`, atrás do Nginx.

Antes de cada `git push` com mudança no frontend, gere o build:

```bash
cd frontend && npm run build      # atualiza backend/static/
```

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

Podem ser definidas no ambiente ou no arquivo `backend/.env` (não versionado; modelo em [`backend/.env.example`](backend/.env.example)):

```
ADMIN_TOKEN=um-token-longo-e-secreto
```

| Variável | Padrão | Uso |
|---|---|---|
| `ADMIN_TOKEN` | *(vazio)* | Token para consultar/exportar respostas. Vazio = consulta desabilitada |
| `DATABASE_URL` | `sqlite:///backend/data/respostas.db` | Caminho do banco |
| `CORS_ORIGINS` | `http://localhost:5180` | Origens permitidas, separadas por vírgula |
| `API_DOCS` | `true` | Documentação interativa em `/api/docs` (`false` em produção) |
| `FRONTEND_DIST` | `backend/static` | Pasta do build servida pelo backend |

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

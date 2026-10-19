import copy
import csv
import io
from datetime import datetime

import pytest

from app.temas import MAX_TEMAS, TEMAS
from tests.conftest import ADMIN


def criar(client, payload):
    r = client.post("/api/respostas", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ---------- públicos ----------

def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_catalogo(client):
    cat = client.get("/api/catalogo").json()
    assert cat["max_temas"] == MAX_TEMAS
    assert [t["key"] for t in cat["temas"]] == list(TEMAS)
    assert "Amigo da GGDP" in cat["perfis"]
    assert cat["outro_ponto"] == "Outro ponto"
    assert all({"key", "title", "desc", "items"} <= t.keys() for t in cat["temas"])


def test_rota_api_inexistente_da_404(client):
    assert client.get("/api/nao-existe").status_code == 404


# ---------- envio de respostas ----------

def test_cria_resposta_e_grava_temas(client, payload):
    criada = criar(client, payload)
    assert criada["id"] == 1
    assert datetime.fromisoformat(criada["criado_em"]).tzinfo is not None

    [r] = client.get("/api/respostas", headers=ADMIN).json()
    assert r["unidade"] == "Gerência de Teste"
    assert r["recursos_preferidos"] == ["Manuais", "Fluxogramas"]
    assert [(t["tema_key"], t["tema_titulo"]) for t in r["temas"]] == [
        ("ferias", "Férias"),
        ("folha", "Folha de pagamento e descontos"),
    ]
    assert r["temas"][0]["subtopicos"] == ["Prazos", "Outro ponto"]
    assert r["temas"][1]["duvida"] == "Como ler o contracheque?"


def test_remove_espacos_e_duplicados(client, payload):
    payload["unidade"] = "   Gabinete  "
    payload["melhoria_sugerida_ggdp"] = "  ok  "
    payload["recursos_preferidos"] = ["Manuais", "Manuais"]
    payload["temas"][0]["subtopicos"] = ["Prazos", "Prazos"]
    criar(client, payload)
    [r] = client.get("/api/respostas", headers=ADMIN).json()
    assert r["unidade"] == "Gabinete"
    assert r["melhoria_sugerida_ggdp"] == "ok"
    assert r["recursos_preferidos"] == ["Manuais"]
    assert r["temas"][0]["subtopicos"] == ["Prazos"]


def test_aceita_cinco_temas(client, payload):
    payload["temas"] = [{"key": k, "subtopicos": [TEMAS[k]["items"][0]]} for k in list(TEMAS)[:MAX_TEMAS]]
    criar(client, payload)


INVALIDOS = {
    "unidade vazia": lambda p: p.update(unidade="   "),
    "perfil inexistente": lambda p: p.update(perfil="Diretor"),
    "dificuldade inexistente": lambda p: p.update(principal_dificuldade="Nenhuma"),
    "recurso inexistente": lambda p: p.update(recursos_preferidos=["Podcast"]),
    "melhoria vazia": lambda p: p.update(melhoria_sugerida_ggdp=" "),
    "sem temas": lambda p: p.update(temas=[]),
    "mais de 5 temas": lambda p: p.update(temas=[{"key": k, "duvida": "x"} for k in list(TEMAS)[:6]]),
    "tema repetido": lambda p: p.update(temas=[{"key": "ferias", "duvida": "a"}, {"key": "ferias", "duvida": "b"}]),
    "tema inexistente": lambda p: p.update(temas=[{"key": "xpto", "duvida": "a"}]),
    "ponto de outro tema": lambda p: p["temas"][0].update(subtopicos=["Banco de horas"]),
    "tema sem ponto nem dúvida": lambda p: p["temas"][0].update(subtopicos=[], duvida="   "),
    "texto longo demais": lambda p: p.update(situacao_pratica="a" * 4001),
    "campo obrigatório ausente": lambda p: p.pop("perfil"),
}


@pytest.mark.parametrize("caso", INVALIDOS.keys())
def test_rejeita_payload_invalido(client, payload, caso):
    p = copy.deepcopy(payload)
    INVALIDOS[caso](p)
    r = client.post("/api/respostas", json=p)
    assert r.status_code == 422, r.text
    assert client.get("/api/respostas", headers=ADMIN).json() == []


# ---------- área administrativa ----------

ROTAS_ADMIN = [
    ("get", "/api/admin/sessao"),
    ("get", "/api/respostas"),
    ("get", "/api/respostas.csv"),
    ("delete", "/api/respostas/1"),
]


@pytest.mark.parametrize("metodo,rota", ROTAS_ADMIN)
@pytest.mark.parametrize("headers", [{}, {"X-Admin-Token": "errado"}], ids=["sem-token", "token-errado"])
def test_admin_exige_token(client, metodo, rota, headers):
    assert getattr(client, metodo)(rota, headers=headers).status_code == 401


def test_admin_desabilitado_sem_token_configurado(client, monkeypatch):
    monkeypatch.setattr("app.main.ADMIN_TOKEN", "")
    r = client.get("/api/respostas", headers=ADMIN)
    assert r.status_code == 503


def test_sessao_valida(client):
    assert client.get("/api/admin/sessao", headers=ADMIN).json() == {"ok": True}


def test_lista_em_ordem_de_criacao(client, payload):
    for nome in ["A", "B", "C"]:
        criar(client, {**payload, "unidade": nome})
    assert [r["unidade"] for r in client.get("/api/respostas", headers=ADMIN).json()] == ["A", "B", "C"]


def test_exclui_resposta_e_seus_temas(client, payload):
    criar(client, payload)
    criar(client, {**payload, "unidade": "Outra"})
    assert client.delete("/api/respostas/1", headers=ADMIN).status_code == 204
    assert client.delete("/api/respostas/1", headers=ADMIN).status_code == 404
    restantes = client.get("/api/respostas", headers=ADMIN).json()
    assert [r["id"] for r in restantes] == [2]

    from sqlalchemy import text

    from app.database import engine

    with engine.connect() as conn:
        orfaos = conn.execute(text("SELECT COUNT(*) FROM resposta_temas WHERE resposta_id = 1")).scalar()
    assert orfaos == 0


def test_exporta_csv(client, payload):
    criar(client, payload)
    r = client.get("/api/respostas.csv", headers=ADMIN)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "respostas-diagnostico-ggdp.csv" in r.headers["content-disposition"]
    assert r.text.startswith("﻿")

    linhas = list(csv.reader(io.StringIO(r.text.lstrip("﻿")), delimiter=";"))
    cab, linha = linhas
    row = dict(zip(cab, linha))
    assert len(linhas) == 2
    assert row["unidade"] == "Gerência de Teste"
    assert row["temas_prioritarios"] == "Férias | Folha de pagamento e descontos"
    assert (row["ferias_selecionado"], row["ferias_pontos"]) == ("Sim", "Prazos | Outro ponto")
    assert (row["folha_selecionado"], row["folha_duvida"]) == ("Sim", "Como ler o contracheque?")
    assert row["qvt_selecionado"] == "Não"
    assert row["recursos_preferidos"] == "Manuais | Fluxogramas"

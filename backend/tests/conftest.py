import os
import tempfile
from pathlib import Path

# Configura o ambiente ANTES de importar o app: banco temporário e token conhecido.
_tmp = Path(tempfile.mkdtemp(prefix="ggdp_tests_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["ADMIN_TOKEN"] = "token-de-teste"
os.environ["FRONTEND_DIST"] = str(_tmp / "sem-dist")  # testes da API não servem o frontend

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

ADMIN = {"X-Admin-Token": "token-de-teste"}


@pytest.fixture(autouse=True)
def banco_limpo():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def payload():
    return {
        "unidade": "Gerência de Teste",
        "perfil": "Amigo da GGDP",
        "temas": [
            {"key": "ferias", "subtopicos": ["Prazos", "Outro ponto"], "duvida": ""},
            {"key": "folha", "subtopicos": [], "duvida": "Como ler o contracheque?"},
        ],
        "principal_dificuldade": "Outra",
        "recursos_preferidos": ["Manuais", "Fluxogramas"],
        "situacao_pratica": "",
        "melhoria_sugerida_ggdp": "Mais comunicação.",
    }

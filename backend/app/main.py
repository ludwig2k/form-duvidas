import csv
import io
import os
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models
from .database import Base, engine, get_db
from .schemas import RespostaCriada, RespostaIn, RespostaOut, como_utc
from .temas import TEMAS, catalogo

Base.metadata.create_all(bind=engine)

DOCS = os.getenv("API_DOCS", "true").lower() == "true"
app = FastAPI(
    title="Diagnóstico GGDP",
    version="1.0.0",
    docs_url="/api/docs" if DOCS else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if DOCS else None,
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5180").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Admin-Token"],
)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")


def exigir_admin(x_admin_token: str = Header(default="")):
    if not ADMIN_TOKEN:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Consulta desabilitada: defina ADMIN_TOKEN.")
    if not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido.")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/catalogo")
def get_catalogo():
    return catalogo()


@app.post("/api/respostas", response_model=RespostaCriada, status_code=status.HTTP_201_CREATED)
def criar_resposta(payload: RespostaIn, db: Session = Depends(get_db)):
    resposta = models.Resposta(
        unidade=payload.unidade,
        perfil=payload.perfil,
        principal_dificuldade=payload.principal_dificuldade,
        recursos_preferidos=payload.recursos_preferidos,
        situacao_pratica=payload.situacao_pratica,
        melhoria_sugerida_ggdp=payload.melhoria_sugerida_ggdp,
        temas=[
            models.RespostaTema(
                ordem=i,
                tema_key=t.key,
                tema_titulo=TEMAS[t.key]["title"],
                subtopicos=t.subtopicos,
                duvida=t.duvida,
            )
            for i, t in enumerate(payload.temas)
        ],
    )
    db.add(resposta)
    db.commit()
    db.refresh(resposta)
    return RespostaCriada(id=resposta.id, criado_em=resposta.criado_em)


def _listar(db: Session):
    stmt = select(models.Resposta).options(selectinload(models.Resposta.temas)).order_by(models.Resposta.id)
    return db.scalars(stmt).all()


@app.get("/api/admin/sessao", dependencies=[Depends(exigir_admin)])
def validar_sessao():
    return {"ok": True}


@app.get("/api/respostas", response_model=list[RespostaOut], dependencies=[Depends(exigir_admin)])
def listar_respostas(db: Session = Depends(get_db)):
    return _listar(db)


@app.delete("/api/respostas/{resposta_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(exigir_admin)])
def excluir_resposta(resposta_id: int, db: Session = Depends(get_db)):
    resposta = db.get(models.Resposta, resposta_id)
    if resposta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resposta não encontrada.")
    db.delete(resposta)
    db.commit()


@app.get("/api/respostas.csv", dependencies=[Depends(exigir_admin)])
def exportar_csv(db: Session = Depends(get_db)):
    """Uma linha por resposta, com colunas por tema (selecionado / pontos / dúvida)."""
    buf = io.StringIO()
    buf.write("﻿")  # BOM para o Excel reconhecer UTF-8
    w = csv.writer(buf, delimiter=";")
    header = ["id", "criado_em", "unidade", "perfil", "temas_prioritarios"]
    for key in TEMAS:
        header += [f"{key}_selecionado", f"{key}_pontos", f"{key}_duvida"]
    header += ["principal_dificuldade", "recursos_preferidos", "situacao_pratica", "melhoria_sugerida_ggdp"]
    w.writerow(header)
    for r in _listar(db):
        por_tema = {t.tema_key: t for t in r.temas}
        row = [r.id, como_utc(r.criado_em).isoformat(), r.unidade, r.perfil, " | ".join(t.tema_titulo for t in r.temas)]
        for key in TEMAS:
            t = por_tema.get(key)
            row += ["Sim", " | ".join(t.subtopicos), t.duvida] if t else ["Não", "", ""]
        row += [r.principal_dificuldade, " | ".join(r.recursos_preferidos), r.situacao_pratica, r.melhoria_sugerida_ggdp]
        w.writerow(row)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="respostas-diagnostico-ggdp.csv"'},
    )


# Em produção, serve o build do frontend (frontend/dist) pelo mesmo servidor.
DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Rota não encontrada.")
        arquivo = (DIST / full_path).resolve()
        if full_path and arquivo.is_file() and DIST.resolve() in arquivo.parents:
            return FileResponse(arquivo)
        return FileResponse(DIST / "index.html")

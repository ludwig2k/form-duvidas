from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Resposta(Base):
    __tablename__ = "respostas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    unidade: Mapped[str] = mapped_column(String(200))
    perfil: Mapped[str] = mapped_column(String(100))
    principal_dificuldade: Mapped[str] = mapped_column(String(200))
    recursos_preferidos: Mapped[list[str]] = mapped_column(JSON, default=list)
    situacao_pratica: Mapped[str] = mapped_column(Text, default="")
    melhoria_sugerida_ggdp: Mapped[str] = mapped_column(Text)

    temas: Mapped[list["RespostaTema"]] = relationship(
        back_populates="resposta", cascade="all, delete-orphan", order_by="RespostaTema.ordem"
    )


class RespostaTema(Base):
    __tablename__ = "resposta_temas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resposta_id: Mapped[int] = mapped_column(ForeignKey("respostas.id", ondelete="CASCADE"), index=True)
    ordem: Mapped[int] = mapped_column(Integer)
    tema_key: Mapped[str] = mapped_column(String(50), index=True)
    tema_titulo: Mapped[str] = mapped_column(String(200))
    subtopicos: Mapped[list[str]] = mapped_column(JSON, default=list)
    duvida: Mapped[str] = mapped_column(Text, default="")

    resposta: Mapped[Resposta] = relationship(back_populates="temas")

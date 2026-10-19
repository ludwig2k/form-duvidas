from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .temas import DIFICULDADES, MAX_TEMAS, OUTRO_PONTO, PERFIS, RECURSOS, TEMAS


def _strip(v: str) -> str:
    return v.strip() if isinstance(v, str) else v


def como_utc(v: datetime) -> datetime:
    # SQLite não guarda fuso; os valores são gravados em UTC.
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


class TemaDetalhe(BaseModel):
    key: str
    subtopicos: list[str] = []
    duvida: str = Field("", max_length=4000)

    _strip_duvida = field_validator("duvida", mode="before")(_strip)

    @model_validator(mode="after")
    def validar(self):
        tema = TEMAS.get(self.key)
        if tema is None:
            raise ValueError(f"Tema desconhecido: {self.key}")
        permitidos = set(tema["items"]) | {OUTRO_PONTO}
        invalidos = [s for s in self.subtopicos if s not in permitidos]
        if invalidos:
            raise ValueError(f"Pontos inválidos para '{tema['title']}': {invalidos}")
        if not self.subtopicos and not self.duvida:
            raise ValueError(f"Marque ao menos um ponto ou descreva uma dúvida em '{tema['title']}'.")
        self.subtopicos = list(dict.fromkeys(self.subtopicos))
        return self


class RespostaIn(BaseModel):
    unidade: str = Field(min_length=1, max_length=200)
    perfil: str
    temas: list[TemaDetalhe] = Field(min_length=1, max_length=MAX_TEMAS)
    principal_dificuldade: str
    recursos_preferidos: list[str] = []
    situacao_pratica: str = Field("", max_length=4000)
    melhoria_sugerida_ggdp: str = Field(min_length=1, max_length=4000)

    _strip_fields = field_validator(
        "unidade", "situacao_pratica", "melhoria_sugerida_ggdp", mode="before"
    )(_strip)

    @field_validator("perfil")
    @classmethod
    def perfil_valido(cls, v):
        if v not in PERFIS:
            raise ValueError("Perfil inválido.")
        return v

    @field_validator("principal_dificuldade")
    @classmethod
    def dificuldade_valida(cls, v):
        if v not in DIFICULDADES:
            raise ValueError("Dificuldade inválida.")
        return v

    @field_validator("recursos_preferidos")
    @classmethod
    def recursos_validos(cls, v):
        invalidos = [r for r in v if r not in RECURSOS]
        if invalidos:
            raise ValueError(f"Recursos inválidos: {invalidos}")
        return list(dict.fromkeys(v))

    @field_validator("temas")
    @classmethod
    def temas_unicos(cls, v):
        keys = [t.key for t in v]
        if len(keys) != len(set(keys)):
            raise ValueError("Temas repetidos.")
        return v


class RespostaCriada(BaseModel):
    id: int
    criado_em: datetime

    _utc_criado_em = field_validator("criado_em")(como_utc)


class TemaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tema_key: str
    tema_titulo: str
    subtopicos: list[str]
    duvida: str


class RespostaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    unidade: str
    perfil: str
    principal_dificuldade: str
    recursos_preferidos: list[str]
    situacao_pratica: str
    melhoria_sugerida_ggdp: str
    temas: list[TemaOut]

    _utc_criado_em = field_validator("criado_em")(como_utc)

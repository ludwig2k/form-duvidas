import json
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "respostas.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB.as_posix()}")

if DATABASE_URL.startswith("sqlite:///"):
    Path(DATABASE_URL.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False),
)


if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        # WAL + espera em lock: vários workers do uvicorn gravando no mesmo arquivo.
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

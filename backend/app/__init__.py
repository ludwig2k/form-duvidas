from pathlib import Path

from dotenv import load_dotenv

# Carrega backend/.env (se existir) antes de qualquer módulo ler variáveis de ambiente.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

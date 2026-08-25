import os
import psycopg2
from fastapi import FastAPI, HTTPException

app = FastAPI()

TABLE_NAME = "scores"
USERNAME_COLUMN = "username"
SCORE_COLUMN = "score"


def get_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        connect_timeout=3,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats")
def get_stats():
    try:
        conn = get_connection()
    except psycopg2.OperationalError:
        raise HTTPException(
            status_code=503,
            detail="stats-api ne parvient pas à joindre la base de données",
        )

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"SELECT COUNT(*), COUNT(DISTINCT {USERNAME_COLUMN}), "
                f"COALESCE(MAX({SCORE_COLUMN}), 0) FROM {TABLE_NAME}"
            )
            parties, joueurs, meilleur_score = cursor.fetchone()
    finally:
        conn.close()

    return {
        "parties_jouees": parties,
        "joueurs": joueurs,
        "meilleur_score": meilleur_score,
    }

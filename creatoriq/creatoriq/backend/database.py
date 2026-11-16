"""SQLite data layer (lite replacement for PostgreSQL + MongoDB)."""
import sqlite3
from contextlib import contextmanager
from .config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator', bio TEXT DEFAULT '', niche TEXT DEFAULT '',
  company TEXT DEFAULT '', settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS accounts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, handle TEXT NOT NULL, last_sync TEXT,
  UNIQUE(user_id, platform));

CREATE TABLE IF NOT EXISTS content(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, hashtags TEXT DEFAULT '',
  published_at TEXT NOT NULL, views INTEGER, likes INTEGER, comments INTEGER,
  shares INTEGER, saves INTEGER, watch_time REAL, reach INTEGER);

CREATE TABLE IF NOT EXISTS audience_daily(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, date TEXT NOT NULL, followers INTEGER, impressions INTEGER, reach INTEGER,
  UNIQUE(user_id, platform, date));

CREATE TABLE IF NOT EXISTS audience_demo(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, label TEXT NOT NULL, value REAL NOT NULL);

CREATE TABLE IF NOT EXISTS revenue(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, platform TEXT DEFAULT '', brand TEXT DEFAULT '',
  amount REAL NOT NULL, date TEXT NOT NULL, status TEXT DEFAULT 'Paid', notes TEXT DEFAULT '');

CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT DEFAULT 'info', title TEXT NOT NULL, message TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS ix_content_user ON content(user_id, published_at);
CREATE INDEX IF NOT EXISTS ix_aud_user ON audience_daily(user_id, date);
CREATE INDEX IF NOT EXISTS ix_rev_user ON revenue(user_id, date);
"""


def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def q(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def q1(conn, sql, params=()):
    r = conn.execute(sql, params).fetchone()
    return dict(r) if r else None


def init_db():
    with db() as c:
        c.executescript(SCHEMA)

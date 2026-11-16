"""Tiny in-memory TTL cache (lite stand-in for Redis)."""
import time
from .config import CACHE_TTL

_store = {}


def get(key):
    hit = _store.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    return None


def put(key, value, ttl=CACHE_TTL):
    _store[key] = (time.time() + ttl, value)
    return value


def clear_user(uid):
    for k in [k for k in _store if k.startswith(f"{uid}:")]:
        _store.pop(k, None)

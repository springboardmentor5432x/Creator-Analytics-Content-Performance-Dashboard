"""
CreatorIQ High-Performance Redis Caching Service (Module 10)
Provides sub-millisecond caching for real-time dashboard metrics,
frequently accessed analytics queries, and API response caching.
Includes transparent in-memory TTL fallback when Redis is offline or not installed.
"""

import json
import logging
import time
from typing import Any, Optional

from .config import settings

logger = logging.getLogger("creatoriq.cache")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False


class _InMemoryTTLCache:
    """Thread-safe in-memory cache with expiration timestamps for local dev and fallback."""
    def __init__(self):
        self._store = {}

    def get(self, key: str) -> Optional[str]:
        item = self._store.get(key)
        if not item:
            return None
        val, expires_at = item
        if expires_at and time.time() > expires_at:
            del self._store[key]
            return None
        return val

    def set(self, key: str, value: str, ex: Optional[int] = None):
        expires_at = (time.time() + ex) if ex else None
        self._store[key] = (value, expires_at)

    def delete(self, key: str):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()


class CacheClient:
    """Unified Cache Client supporting Redis with automatic graceful fallback."""
    def __init__(self):
        self._redis_client = None
        self._fallback_cache = _InMemoryTTLCache()
        self._is_redis_connected = False
        self._init_redis()

    def _init_redis(self):
        if REDIS_AVAILABLE and settings.REDIS_URL:
            try:
                client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5
                )
                client.ping()
                self._redis_client = client
                self._is_redis_connected = True
                logger.info("Connected to Redis cache at %s", settings.REDIS_URL)
            except Exception as e:
                logger.info("Redis not reachable (%s); activating in-memory cache fallback.", e)
                self._redis_client = None
                self._is_redis_connected = False
        else:
            self._is_redis_connected = False

    def is_redis_active(self) -> bool:
        return self._is_redis_connected

    def get(self, key: str) -> Optional[str]:
        if self._is_redis_connected and self._redis_client:
            try:
                return self._redis_client.get(key)
            except Exception as e:
                logger.warning("Redis get error for key '%s': %s; using fallback.", key, e)
        return self._fallback_cache.get(key)

    def get_json(self, key: str) -> Optional[Any]:
        val = self.get(key)
        if val:
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return None
        return None

    def set(self, key: str, value: str, ttl_seconds: int = 300) -> bool:
        if self._is_redis_connected and self._redis_client:
            try:
                self._redis_client.set(key, value, ex=ttl_seconds)
                return True
            except Exception as e:
                logger.warning("Redis set error for key '%s': %s; using fallback.", key, e)
        self._fallback_cache.set(key, value, ex=ttl_seconds)
        return True

    def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        try:
            serialized = json.dumps(value)
            return self.set(key, serialized, ttl_seconds=ttl_seconds)
        except (TypeError, ValueError) as e:
            logger.error("JSON serialization error for cache key '%s': %s", key, e)
            return False

    def delete(self, key: str) -> bool:
        if self._is_redis_connected and self._redis_client:
            try:
                self._redis_client.delete(key)
            except Exception:
                pass
        self._fallback_cache.delete(key)
        return True

    def invalidate_user_cache(self, user_id: int):
        """Invalidates common cached keys for a specific user after mutations."""
        for suffix in ("overview", "content", "audience", "revenue", "trends"):
            self.delete(f"user:{user_id}:{suffix}")


# Global Singleton Cache Instance
cache = CacheClient()

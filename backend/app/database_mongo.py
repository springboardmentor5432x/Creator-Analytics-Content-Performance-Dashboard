"""
CreatorIQ NoSQL MongoDB Secondary Storage (Module 10)
Stores unstructured and semi-structured raw social media payloads,
video metadata dumps, and granular analytics logs.
Includes in-memory fallback when MongoDB is offline or pymongo is not installed.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from .config import settings

logger = logging.getLogger("creatoriq.mongodb")

try:
    import pymongo
    MONGO_AVAILABLE = True
except ImportError:
    pymongo = None
    MONGO_AVAILABLE = False


class _InMemoryDocStore:
    """In-memory collection store for development and testing without MongoDB service."""
    def __init__(self):
        self._collections: Dict[str, List[Dict[str, Any]]] = {
            "raw_social_posts": [],
            "raw_analytics_snapshots": []
        }

    def insert_one(self, collection_name: str, document: Dict[str, Any]):
        doc_copy = dict(document)
        doc_copy["_id"] = len(self._collections[collection_name]) + 1
        self._collections[collection_name].append(doc_copy)
        return doc_copy["_id"]

    def find(self, collection_name: str, filter_dict: Dict[str, Any], limit: int = 50) -> List[Dict[str, Any]]:
        results = []
        for doc in reversed(self._collections.get(collection_name, [])):
            match = True
            for k, v in filter_dict.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(doc)
            if len(results) >= limit:
                break
        return results


class MongoStore:
    """Unified MongoDB Client with automatic graceful in-memory fallback."""
    def __init__(self):
        self._client = None
        self._db = None
        self._fallback = _InMemoryDocStore()
        self._is_connected = False
        self._init_mongo()

    def _init_mongo(self):
        if MONGO_AVAILABLE and settings.MONGODB_URL:
            try:
                client = pymongo.MongoClient(
                    settings.MONGODB_URL,
                    serverSelectionTimeoutMS=1500
                )
                client.admin.command('ping')
                self._client = client
                self._db = client[settings.MONGODB_DB_NAME]
                self._is_connected = True
                logger.info("Connected to MongoDB at %s (database: %s)",
                            settings.MONGODB_URL, settings.MONGODB_DB_NAME)
            except Exception as e:
                logger.info("MongoDB not reachable (%s); activating in-memory fallback.", e)
                self._client = None
                self._db = None
                self._is_connected = False
        else:
            self._is_connected = False

    def is_mongo_active(self) -> bool:
        return self._is_connected

    def archive_raw_post(
        self,
        user_id: int,
        platform: str,
        external_id: str,
        raw_payload: Dict[str, Any]
    ) -> Any:
        doc = {
            "user_id": user_id,
            "platform": platform,
            "external_id": external_id,
            "raw_payload": raw_payload,
            "archived_at": datetime.now(timezone.utc).isoformat()
        }
        if self._is_connected and self._db is not None:
            try:
                res = self._db.raw_social_posts.insert_one(doc)
                return str(res.inserted_id)
            except Exception as e:
                logger.warning("MongoDB insert failed (%s); using in-memory fallback.", e)
        return self._fallback.insert_one("raw_social_posts", doc)

    def archive_analytics_snapshot(
        self,
        user_id: int,
        platform: str,
        snapshot_type: str,
        metrics: Dict[str, Any]
    ) -> Any:
        doc = {
            "user_id": user_id,
            "platform": platform,
            "snapshot_type": snapshot_type,
            "metrics": metrics,
            "captured_at": datetime.now(timezone.utc).isoformat()
        }
        if self._is_connected and self._db is not None:
            try:
                res = self._db.raw_analytics_snapshots.insert_one(doc)
                return str(res.inserted_id)
            except Exception as e:
                logger.warning("MongoDB insert failed (%s); using in-memory fallback.", e)
        return self._fallback.insert_one("raw_analytics_snapshots", doc)

    def get_archived_posts(
        self,
        user_id: int,
        platform: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        filter_dict = {"user_id": user_id}
        if platform:
            filter_dict["platform"] = platform

        if self._is_connected and self._db is not None:
            try:
                cursor = self._db.raw_social_posts.find(filter_dict).sort("archived_at", -1).limit(limit)
                docs = list(cursor)
                for d in docs:
                    d["_id"] = str(d["_id"])
                return docs
            except Exception as e:
                logger.warning("MongoDB query failed (%s); using in-memory fallback.", e)
        return self._fallback.find("raw_social_posts", filter_dict, limit=limit)


# Global Singleton MongoDB Instance
mongo_store = MongoStore()

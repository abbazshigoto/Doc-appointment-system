from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import get_settings

settings = get_settings()

_arq_redis: ArqRedis | None = None


async def get_arq_redis() -> ArqRedis:
    global _arq_redis
    if _arq_redis is None:
        _arq_redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _arq_redis

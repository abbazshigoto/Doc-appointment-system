from arq.connections import RedisSettings

from app.core.config import get_settings
from app.modules.notifications.tasks import notify_doctor_of_booking, notify_doctor_of_cancellation

settings = get_settings()


class WorkerSettings:
    functions = [notify_doctor_of_booking, notify_doctor_of_cancellation]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)

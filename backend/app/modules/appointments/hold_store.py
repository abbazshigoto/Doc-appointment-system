from datetime import datetime

from redis.asyncio import Redis

HOLD_TTL_SECONDS = 120

"""the only place talking to redis is in this file, so we can isolate it here and not have to worry about it elsewhere"""

class AppointmentHoldStore:
    def __init__(self, redis: Redis):
        self.redis = redis

    def _key(self, doctor_id: int, start_time: datetime) -> str:
        return f"appointment_hold:{doctor_id}:{start_time.isoformat()}"

    async def hold(self, doctor_id: int, start_time: datetime, patient_id: int) -> bool:
        acquired = await self.redis.set(
            self._key(doctor_id, start_time),
            str(patient_id),
            nx=True,
            ex=HOLD_TTL_SECONDS,
        )
        return bool(acquired)

    async def get_holder(self, doctor_id: int, start_time: datetime) -> int | None:
        value = await self.redis.get(self._key(doctor_id, start_time))
        return int(value) if value is not None else None

    async def release(self, doctor_id: int, start_time: datetime) -> None:
        await self.redis.delete(self._key(doctor_id, start_time))

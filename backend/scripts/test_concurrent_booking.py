"""Fires simultaneous booking requests at a doctor's schedule and confirms the
double-booking guard holds under real concurrency, not just sequential testing.

Two scenarios:
  1. Identical start_time for both requests -- the "easy" case, which the
     unique constraint alone would already catch even without any locking.
  2. Different-but-overlapping start_times (e.g. 10:00 and 10:15, both 30
     minutes long) -- the case that actually requires the availability-aware
     overlap check plus the doctor-row lock, since the unique constraint on
     (doctor_id, start_time) does not by itself notice two different times
     that still overlap.

Run with the dev server up: .venv/Scripts/python.exe -m scripts.test_concurrent_booking
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

import httpx

BASE_URL = "http://localhost:8000"
DOCTOR_EMAIL = "dr.house@test.com"
DOCTOR_PASSWORD = "password123"
PATIENT_A = ("race.patient.a@test.com", "password123")
PATIENT_B = ("race.patient.b@test.com", "password123")


async def register_if_needed(client: httpx.AsyncClient, email: str, password: str, role: str) -> None:
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": email, "role": role},
    )
    if resp.status_code not in (201, 409):
        raise RuntimeError(f"unexpected register response for {email}: {resp.status_code} {resp.text}")


async def login(client: httpx.AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/auth/login", data={"username": email, "password": password})
    resp.raise_for_status()
    return resp.json()["access_token"]


async def get_doctor_id(client: httpx.AsyncClient, doctor_token: str) -> int:
    resp = await client.get("/doctors/me", headers={"Authorization": f"Bearer {doctor_token}"})
    resp.raise_for_status()
    return resp.json()["id"]


async def ensure_availability(client: httpx.AsyncClient, doctor_token: str, start_time: datetime, end_time: datetime) -> None:
    resp = await client.post(
        "/availability/me",
        json={"start_time": start_time.isoformat(), "end_time": end_time.isoformat()},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    if resp.status_code not in (201, 409):
        raise RuntimeError(f"could not create availability window: {resp.status_code} {resp.text}")


async def book(client: httpx.AsyncClient, token: str, doctor_id: int, start_time: str) -> httpx.Response:
    return await client.post(
        "/appointments",
        json={"doctor_id": doctor_id, "start_time": start_time},
        headers={"Authorization": f"Bearer {token}"},
    )


async def race(
    client: httpx.AsyncClient,
    label: str,
    doctor_id: int,
    token_a: str,
    token_b: str,
    start_a: datetime,
    start_b: datetime,
) -> bool:
    print(f"\n--- {label} ---")
    print(f"Patient A requests {start_a.isoformat()}, Patient B requests {start_b.isoformat()}")

    response_a, response_b = await asyncio.gather(
        book(client, token_a, doctor_id, start_a.isoformat()),
        book(client, token_b, doctor_id, start_b.isoformat()),
    )

    print(f"Patient A: {response_a.status_code} {response_a.json()}")
    print(f"Patient B: {response_b.status_code} {response_b.json()}")

    statuses = sorted([response_a.status_code, response_b.status_code])
    passed = statuses == [201, 409]
    print("PASS" if passed else f"FAIL: expected [201, 409], got {statuses}")
    return passed


async def main() -> None:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        doctor_token = await login(client, DOCTOR_EMAIL, DOCTOR_PASSWORD)
        doctor_id = await get_doctor_id(client, doctor_token)

        await register_if_needed(client, *PATIENT_A, role="patient")
        await register_if_needed(client, *PATIENT_B, role="patient")
        token_a = await login(client, *PATIENT_A)
        token_b = await login(client, *PATIENT_B)

        identical_start = (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 5000))).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        await ensure_availability(client, doctor_token, identical_start, identical_start + timedelta(hours=1))
        result_1 = await race(
            client, "Scenario 1: identical start_time", doctor_id, token_a, token_b, identical_start, identical_start
        )

        overlap_base = (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 5000))).replace(
            hour=9, minute=0, second=0, microsecond=0
        )
        await ensure_availability(client, doctor_token, overlap_base, overlap_base + timedelta(hours=3))
        result_2 = await race(
            client,
            "Scenario 2: overlapping but different start_time",
            doctor_id,
            token_a,
            token_b,
            overlap_base,
            overlap_base + timedelta(minutes=15),
        )

        print(f"\n{'PASS' if result_1 and result_2 else 'FAIL'}: both scenarios {'held' if result_1 and result_2 else 'did NOT both hold'}.")


if __name__ == "__main__":
    asyncio.run(main())

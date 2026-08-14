"""One-off CLI to populate the database with dummy doctors, patients,
availability windows, appointments, and notifications for local testing.

Safe to re-run: existing users (matched by email) are reused rather than
duplicated, so it only fills in what's missing.

Run with: python -m scripts.seed_dummy_data
"""
import asyncio
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.modules.appointments.models import Appointment, AppointmentStatus
from app.modules.auth.repository import AuthRepository
from app.modules.availability.models import AvailabilityWindow
from app.modules.doctors.models import Doctor
from app.modules.doctors.repository import DoctorRepository
from app.modules.notifications.models import Notification
from app.modules.users.models import User, UserRole

SEED_PASSWORD = "password123"

DOCTORS = [
    dict(
        email="dr.patel@clinicdemo.com",
        full_name="Dr. Anjali Patel",
        specialty="Cardiology",
        bio="Specializes in preventive cardiology and heart failure management.",
        years_of_experience=12,
        consultation_fee=Decimal("150.00"),
    ),
    dict(
        email="dr.nguyen@clinicdemo.com",
        full_name="Dr. Minh Nguyen",
        specialty="Dermatology",
        bio="Focuses on medical and cosmetic dermatology for all ages.",
        years_of_experience=8,
        consultation_fee=Decimal("120.00"),
    ),
    dict(
        email="dr.osei@clinicdemo.com",
        full_name="Dr. Kwame Osei",
        specialty="Pediatrics",
        bio="General pediatrics with a focus on early childhood development.",
        years_of_experience=15,
        consultation_fee=Decimal("100.00"),
    ),
    dict(
        email="dr.rossi@clinicdemo.com",
        full_name="Dr. Giulia Rossi",
        specialty="Orthopedics",
        bio="Sports medicine and joint replacement specialist.",
        years_of_experience=10,
        consultation_fee=Decimal("175.00"),
    ),
    dict(
        email="dr.kim@clinicdemo.com",
        full_name="Dr. Soo-ah Kim",
        specialty="General Practice",
        bio="Family medicine physician focused on whole-person primary care.",
        years_of_experience=6,
        consultation_fee=Decimal("80.00"),
    ),
]

PATIENTS = [
    dict(email="patient.jones@maildemo.com", full_name="Alex Jones"),
    dict(email="patient.garcia@maildemo.com", full_name="Maria Garcia"),
    dict(email="patient.smith@maildemo.com", full_name="Jordan Smith"),
    dict(email="patient.lee@maildemo.com", full_name="Casey Lee"),
]

ADMIN = dict(email="admin@clinicdemo.com", full_name="Clinic Admin")


def _next_weekday(base: datetime, weekday_offset: int) -> datetime:
    """Return the date `weekday_offset` business days after `base`, skipping weekends."""
    day = base
    added = 0
    while added < weekday_offset:
        day += timedelta(days=1)
        if day.weekday() < 5:
            added += 1
    return day


async def get_or_create_user(repo: AuthRepository, email: str, full_name: str, role: UserRole) -> User:
    existing = await repo.get_by_email(email)
    if existing is not None:
        return existing
    user = User(email=email, hashed_password=hash_password(SEED_PASSWORD), full_name=full_name, role=role)
    return await repo.create(user)


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        auth_repo = AuthRepository(session)
        doctor_repo = DoctorRepository(session)

        await get_or_create_user(auth_repo, ADMIN["email"], ADMIN["full_name"], UserRole.ADMIN)

        patients: list[User] = []
        for p in PATIENTS:
            patients.append(await get_or_create_user(auth_repo, p["email"], p["full_name"], UserRole.PATIENT))

        doctors: list[Doctor] = []
        for d in DOCTORS:
            user = await get_or_create_user(auth_repo, d["email"], d["full_name"], UserRole.DOCTOR)
            doctor = await doctor_repo.get_by_user_id(user.id)
            if doctor is None:
                doctor = Doctor(
                    user_id=user.id,
                    specialty=d["specialty"],
                    bio=d["bio"],
                    years_of_experience=d["years_of_experience"],
                    consultation_fee=d["consultation_fee"],
                )
                doctor = await doctor_repo.create(doctor)
            doctors.append(doctor)

        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Availability: next 5 business days, 09:00-12:00 and 14:00-17:00 UTC, per doctor.
        windows_created = 0
        for doctor in doctors:
            existing_windows = await session.execute(
                AvailabilityWindow.__table__.select().where(AvailabilityWindow.doctor_id == doctor.id)
            )
            if existing_windows.first() is not None:
                continue  # doctor already has availability seeded
            for offset in range(1, 6):
                day = _next_weekday(today, offset)
                for start_h, end_h in ((9, 12), (14, 17)):
                    session.add(
                        AvailabilityWindow(
                            doctor_id=doctor.id,
                            start_time=day.replace(hour=start_h),
                            end_time=day.replace(hour=end_h),
                        )
                    )
                    windows_created += 1
        await session.commit()

        # Appointments: a handful of confirmed bookings + one cancelled, spread across
        # doctors/patients, each on the first seeded business day within a working window.
        appointments_created = 0
        first_day = _next_weekday(today, 1)
        slot_times = [time(9, 0), time(9, 30), time(10, 0), time(14, 0)]

        for i, doctor in enumerate(doctors[:4]):
            patient = patients[i % len(patients)]
            start_dt = first_day.replace(hour=slot_times[i].hour, minute=slot_times[i].minute)
            existing = await session.execute(
                Appointment.__table__.select().where(
                    Appointment.doctor_id == doctor.id, Appointment.start_time == start_dt
                )
            )
            if existing.first() is not None:
                continue
            status = AppointmentStatus.CANCELLED if i == 3 else AppointmentStatus.CONFIRMED
            appointment = Appointment(
                doctor_id=doctor.id,
                patient_id=patient.id,
                start_time=start_dt,
                end_time=start_dt + timedelta(minutes=30),
                status=status,
            )
            session.add(appointment)
            appointments_created += 1

            verb = "cancelled their appointment at" if status == AppointmentStatus.CANCELLED else "booked an appointment for"
            session.add(
                Notification(
                    user_id=doctor.user_id,
                    message=f"{patient.full_name} {verb} {start_dt.strftime('%B %d, %Y at %I:%M %p UTC')}",
                )
            )
        await session.commit()

        print(f"Doctors: {len(doctors)}, Patients: {len(patients)}, Admin: 1")
        print(f"Availability windows created: {windows_created}")
        print(f"Appointments created: {appointments_created}")
        print(f"All seeded accounts use password: {SEED_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())

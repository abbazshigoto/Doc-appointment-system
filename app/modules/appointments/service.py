from app.modules.appointments.repository import AppointmentRepository


class AppointmentService:
    def __init__(self, repository: AppointmentRepository):
        self.repository = repository

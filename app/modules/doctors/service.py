from app.modules.doctors.repository import DoctorRepository


class DoctorService:
    def __init__(self, repository: DoctorRepository):
        self.repository = repository

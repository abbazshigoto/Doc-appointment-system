from app.modules.availability.repository import AvailabilityRepository


class AvailabilityService:
    def __init__(self, repository: AvailabilityRepository):
        self.repository = repository

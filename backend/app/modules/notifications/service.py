from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository


class NotificationService:
    def __init__(self, repository: NotificationRepository):
        self.repository = repository

    async def create_notification(self, user_id: int, message: str) -> Notification:
        notification = Notification(user_id=user_id, message=message)
        return await self.repository.create(notification)

    async def list_own_notifications(self, user_id: int) -> list[Notification]:
        return await self.repository.get_by_user_id(user_id)

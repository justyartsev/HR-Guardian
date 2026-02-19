"""
Менеджер WebSocket и SSE уведомлений для HR/Admin.
Отправляет real-time уведомления о новых жалобах и регистрациях.
"""
from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import json
from asyncio import Queue


class NotificationManager:
    """Управляет WebSocket и SSE подключениями HR/Admin для уведомлений."""

    def __init__(self):
        # Словарь: user_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Словарь: user_id -> set of SSE Queues
        self.sse_connections: Dict[int, Set[Queue]] = {}
        # Множество user_id HR/Admin пользователей
        self.hr_users: Set[int] = set()

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        """Подключить WebSocket клиента."""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)

        # Запоминаем HR/Admin пользователей
        if role in ('hr', 'admin'):
            self.hr_users.add(user_id)

        print(f"[WS] User {user_id} ({role}) connected. Total HR users: {len(self.hr_users)}", flush=True)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Отключить WebSocket клиента."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Если у пользователя нет активных подключений - удаляем
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.hr_users.discard(user_id)

        print(f"[WS] User {user_id} disconnected. Total HR users: {len(self.hr_users)}", flush=True)

    async def connect_sse(self, queue: Queue, user_id: int, role: str):
        """Подключить SSE клиента."""
        if user_id not in self.sse_connections:
            self.sse_connections[user_id] = set()

        self.sse_connections[user_id].add(queue)

        # Запоминаем HR/Admin пользователей
        if role in ('hr', 'admin'):
            self.hr_users.add(user_id)

        print(f"[SSE] User {user_id} ({role}) connected. Total HR users: {len(self.hr_users)}", flush=True)

    def disconnect_sse(self, queue: Queue, user_id: int):
        """Отключить SSE клиента."""
        if user_id in self.sse_connections:
            self.sse_connections[user_id].discard(queue)

            # Если у пользователя нет активных подключений - удаляем
            if not self.sse_connections[user_id] and user_id not in self.active_connections:
                self.hr_users.discard(user_id)

        print(f"[SSE] User {user_id} disconnected. Total HR users: {len(self.hr_users)}", flush=True)

    async def broadcast_to_hr(self, message: dict):
        """Отправить сообщение всем подключённым HR/Admin (WebSocket + SSE)."""
        if not self.hr_users:
            return

        disconnected_ws = []
        disconnected_sse = []
        message_json = json.dumps(message)

        # Отправка через WebSocket
        for user_id in self.hr_users:
            if user_id in self.active_connections:
                for ws in list(self.active_connections[user_id]):
                    try:
                        await ws.send_text(message_json)
                    except Exception as e:
                        print(f"[WS] Error sending to user {user_id}: {e}", flush=True)
                        disconnected_ws.append((user_id, ws))

            # Отправка через SSE
            if user_id in self.sse_connections:
                for queue in list(self.sse_connections[user_id]):
                    try:
                        await queue.put(message)
                    except Exception as e:
                        print(f"[SSE] Error sending to user {user_id}: {e}", flush=True)
                        disconnected_sse.append((user_id, queue))

        # Очищаем отключённые соединения
        for user_id, ws in disconnected_ws:
            self.disconnect(ws, user_id)

        for user_id, queue in disconnected_sse:
            self.disconnect_sse(queue, user_id)

    async def notify_new_feedback(self, feedback_id: int, user_name: str):
        """Уведомить HR о новой жалобе."""
        await self.broadcast_to_hr({
            "type": "new_feedback",
            "feedback_id": feedback_id,
            "user_name": user_name,
            "message": f"Новая жалоба от {user_name}"
        })

    async def notify_new_registration(self, user_id: int, username: str):
        """Уведомить HR о новой регистрации."""
        await self.broadcast_to_hr({
            "type": "new_registration",
            "user_id": user_id,
            "username": username,
            "message": f"Новая заявка на регистрацию: {username}"
        })

    async def notify_counts_update(self, pending_users: int = None, new_feedbacks: int = None):
        """Уведомить HR об обновлении счётчиков."""
        data = {"type": "counts_update"}
        if pending_users is not None:
            data["pending_users"] = pending_users
        if new_feedbacks is not None:
            data["new_feedbacks"] = new_feedbacks

        await self.broadcast_to_hr(data)

    async def notify_document_activated(self, doc_id: int, doc_title: str, version_id: int):
        """Уведомить HR об автоматической активации новой версии документа (ТЗ Сценарий 1, п.2)."""
        await self.broadcast_to_hr({
            "type": "document_activated",
            "document_id": doc_id,
            "version_id": version_id,
            "title": doc_title,
            "message": f"Документ \"{doc_title}\" активирован"
        })


# Глобальный экземпляр менеджера
notification_manager = NotificationManager()

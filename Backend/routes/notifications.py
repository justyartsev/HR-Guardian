"""
WebSocket и SSE endpoints для real-time уведомлений HR/Admin.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models.user import User as UserModel
from models.feedback import QueryFeedback
from core.notifications import notification_manager
from core.jwt import decode_token
from typing import Optional
from asyncio import Queue
import asyncio
import json

router = APIRouter(prefix="/ws", tags=["WebSocket & SSE"])


@router.websocket("/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket для real-time уведомлений.

    Подключение: ws://host/ws/notifications?token=<jwt_token>

    HR/Admin получают уведомления о:
    - Новых жалобах (new_feedback)
    - Новых регистрациях (new_registration)
    - Обновлении счётчиков (counts_update)
    """
    user_id = None
    user_role = None

    # Проверяем токен
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        user_role = payload.get("role", "employee")
    except Exception as e:
        await websocket.close(code=4002, reason=f"Invalid token: {str(e)}")
        return

    # Подключаем клиента
    try:
        await notification_manager.connect(websocket, user_id, user_role)

        # Держим соединение открытым
        while True:
            try:
                # Ждём сообщения от клиента (ping/pong или команды)
                data = await websocket.receive_text()

                # Можно обрабатывать команды от клиента
                if data == "ping":
                    await websocket.send_text("pong")

            except WebSocketDisconnect:
                break

    except Exception as e:
        print(f"[WS] Error: {e}", flush=True)
    finally:
        if user_id:
            notification_manager.disconnect(websocket, user_id)


@router.get("/notifications/sse")
async def sse_notifications(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    SSE (Server-Sent Events) для real-time уведомлений.

    ПРЕИМУЩЕСТВА перед WebSocket:
    - Автоматическое переподключение (встроено в браузер)
    - Не нужен ping/pong для keep-alive
    - Проще код на клиенте
    - Лучше проходит через корпоративные прокси

    Подключение: GET /ws/notifications/sse?token=<jwt_token>

    HR/Admin получают уведомления о:
    - Новых жалобах (new_feedback)
    - Новых регистрациях (new_registration)
    - Обновлении счётчиков (counts_update)
    - Активации документов (document_activated)
    """
    # Проверяем токен
    if not token:
        return StreamingResponse(
            iter(["event: error\ndata: Token required\n\n"]),
            media_type="text/event-stream"
        )

    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        user_role = payload.get("role", "employee")
    except Exception as e:
        return StreamingResponse(
            iter([f"event: error\ndata: Invalid token: {str(e)}\n\n"]),
            media_type="text/event-stream"
        )

    # Создаём очередь для этого клиента
    queue = Queue()

    async def event_generator():
        try:
            # Регистрируем SSE подключение
            await notification_manager.connect_sse(queue, user_id, user_role)

            # Отправляем первое сообщение для подтверждения подключения
            yield f"event: connected\ndata: {json.dumps({'user_id': user_id, 'role': user_role})}\n\n"

            # Отправляем начальные счетчики для HR/Admin
            if user_role in ['hr', 'admin']:
                try:
                    # Выполняем запросы в thread pool чтобы не блокировать event loop
                    from core.enums import UserStatus
                    import asyncio
                    from functools import partial

                    loop = asyncio.get_event_loop()

                    def get_counts():
                        pending = db.query(UserModel).filter(UserModel.status == UserStatus.pending).count()
                        feedback = db.query(QueryFeedback).filter(QueryFeedback.status == 'new').count()
                        return pending, feedback

                    # Выполняем в executor чтобы не блокировать
                    pending_count, new_feedback_count = await loop.run_in_executor(None, get_counts)

                    counts_data = {
                        'type': 'counts_update',
                        'pending_users': pending_count,
                        'new_feedbacks': new_feedback_count
                    }
                    yield f"event: counts_update\ndata: {json.dumps(counts_data)}\n\n"
                    print(f"[SSE] Sent initial counts to user {user_id} ({user_role}): pending={pending_count}, feedback={new_feedback_count}", flush=True)
                except Exception as e:
                    print(f"[SSE] Error fetching initial counts: {e}", flush=True)

            # Держим соединение открытым и отправляем события
            while True:
                # Проверяем, не закрыто ли соединение клиентом
                if await request.is_disconnected():
                    break

                try:
                    # Ждём сообщение из очереди с таймаутом для периодической проверки
                    message = await asyncio.wait_for(queue.get(), timeout=30)

                    # Формируем SSE событие
                    event_type = message.get("type", "message")
                    yield f"event: {event_type}\ndata: {json.dumps(message)}\n\n"

                except asyncio.TimeoutError:
                    # Отправляем heartbeat каждые 30 секунд
                    yield ": heartbeat\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Отключаем SSE клиента
            notification_manager.disconnect_sse(queue, user_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Для nginx
        }
    )

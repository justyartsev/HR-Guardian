"""Модуль авторизации для RAG API"""
import os
from fastapi import HTTPException


def validate_service_token(service_token: str):
    """Валидирует service_token для Backend service-to-service auth.
    ВНИМАНИЕ: Если RAG_SERVICE_TOKEN не установлен - все запросы блокируются."""
    expected_token = os.getenv("RAG_SERVICE_TOKEN")
    if not expected_token:
        raise HTTPException(status_code=500, detail="RAG_SERVICE_TOKEN not configured")
    if service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid service token")

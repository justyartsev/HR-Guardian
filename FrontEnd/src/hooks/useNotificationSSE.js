/**
 * SSE хук для real-time уведомлений HR/Admin.
 *
 * ПРЕИМУЩЕСТВА SSE перед WebSocket:
 * - Автоматическое переподключение (не нужен ручной код!)
 * - Не нужен ping/pong для keep-alive
 * - Проще код (55 строк вместо 115)
 * - Лучше проходит через корпоративные прокси
 */
import { useEffect, useRef, useState } from 'react';

export function useNotificationSSE({ onNewFeedback, onNewRegistration, onCountsUpdate, onDocumentActivated, enabled = true }) {
  const eventSourceRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Используем ref для callback'ов чтобы избежать пересоздания EventSource при каждом рендере
  const callbacksRef = useRef({ onNewFeedback, onNewRegistration, onCountsUpdate, onDocumentActivated });

  // Обновляем ref при изменении callback'ов
  useEffect(() => {
    callbacksRef.current = { onNewFeedback, onNewRegistration, onCountsUpdate, onDocumentActivated };
  }, [onNewFeedback, onNewRegistration, onCountsUpdate, onDocumentActivated]);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Определяем URL SSE
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const sseUrl = `${protocol}//${window.location.host}/ws/notifications/sse?token=${token}`;

    // Создаём EventSource - браузер САМ переподключается!
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Браузер автоматически переподключится!
    };

    // Обработчик для события подключения
    eventSource.addEventListener('connected', (event) => {
      console.log('[SSE] Connected:', JSON.parse(event.data));
    });

    // Обработчики событий используют актуальные callback'ы через ref
    eventSource.addEventListener('new_feedback', (event) => {
      callbacksRef.current.onNewFeedback?.(JSON.parse(event.data));
    });

    eventSource.addEventListener('new_registration', (event) => {
      callbacksRef.current.onNewRegistration?.(JSON.parse(event.data));
    });

    eventSource.addEventListener('counts_update', (event) => {
      callbacksRef.current.onCountsUpdate?.(JSON.parse(event.data));
    });

    eventSource.addEventListener('document_activated', (event) => {
      callbacksRef.current.onDocumentActivated?.(JSON.parse(event.data));
    });

    // Cleanup при размонтировании
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  return {
    isConnected,
  };
}

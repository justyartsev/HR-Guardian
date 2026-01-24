/**
 * WebSocket/SSE конфигурация
 * Используется для SSE уведомлений HR
 */

// Для SSE уведомлений (WebSocket всё ещё используется для уведомлений)
function getWebSocketUrl(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

export { getWebSocketUrl };

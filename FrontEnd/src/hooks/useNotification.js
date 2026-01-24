import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState(null);

  // Поддерживает оба формата:
  // notify("сообщение", "success", 3000) - отдельные параметры
  // notify({ message: "сообщение", type: "success" }) - объект
  const notify = useCallback((messageOrOptions, type = 'info', duration = 3000) => {
    let finalMessage, finalType, finalDuration;

    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      // Формат с объектом
      finalMessage = messageOrOptions.message || '';
      finalType = messageOrOptions.type || 'info';
      finalDuration = messageOrOptions.duration || 3000;
    } else {
      // Формат с отдельными параметрами
      finalMessage = messageOrOptions;
      finalType = type;
      finalDuration = duration;
    }

    setNotification({ message: finalMessage, type: finalType, id: Date.now() });

    if (finalDuration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, finalDuration);
    }
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    notify,
    closeNotification
  };
}

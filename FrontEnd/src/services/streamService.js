/**
 * Сервис для получения ответов от LLM через SSE (Server-Sent Events)
 */
import { RAG_URL } from '../config/api';

export const streamService = {
  async sendQueryStream(dialogId, messageText, onChunk, onComplete, onError, personalData = {}, chatMessages = [], enableThinking = false) {
    console.log('[STREAM_SERVICE] sendQueryStream started', {
      dialogId,
      messageText,
      personalData,
      chatMessagesCount: chatMessages.length,
      enableThinking
    });

    let reader = null;
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.error('[STREAM_SERVICE] No access token found');
        onError(new Error('Не найден токен доступа'));
        return;
      }

      // Формируем контекст из последних 10 сообщений
      const context = chatMessages
        .slice(-10)
        .map(msg => ({
          role: msg.type === 'input' ? 'user' : 'assistant',
          content: msg.content
        }));

      console.log('[STREAM_SERVICE] Context prepared:', context.length, 'messages');

      // Отправляем POST запрос для SSE потока
      console.log('[STREAM_SERVICE] Sending POST to', `${RAG_URL}/answer/stream`);
      const response = await fetch(`${RAG_URL}/answer/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: messageText,
          context: context,
          personal_data: personalData,
          enable_thinking: enableThinking,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Читаем SSE поток
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          // Парсим тип события
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              console.log('[STREAM_SERVICE] Received data:', { currentEvent, data });

              // Обрабатываем в зависимости от типа события
              if (currentEvent === 'chunk' || data.text !== undefined) {
                console.log('[STREAM_SERVICE] Processing chunk:', data.text);
                onChunk(data.text);
              } else if (currentEvent === 'complete' || data.response !== undefined) {
                console.log('[STREAM_SERVICE] Processing complete:', data.response?.substring(0, 100));
                onComplete({
                  response: data.response,
                  sources: data.sources || [],
                });
              } else if (currentEvent === 'error' || data.error) {
                console.error('[STREAM_SERVICE] Processing error:', data.error);
                onError(new Error(data.error));
                break;
              }

              currentEvent = null; // Сбрасываем после обработки
            } catch (e) {
              console.error('[STREAM_SERVICE] JSON parse error:', e, 'Line:', line);
              // Игнорируем ошибки парсинга неполных данных
            }
          }
        }
      }

    } catch (error) {
      onError(error);
    } finally {
      if (reader) {
        try {
          reader.releaseLock();
        } catch (e) {
          // Reader уже освобожден
        }
      }
    }
  },
};

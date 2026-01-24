import { useState } from 'react';
import { streamService } from '../services/streamService';
import { dialogService } from '../services/dialogService';

/**
 * Преобразует техническую ошибку в понятное пользователю сообщение
 */
const getUserFriendlyError = (error) => {
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('no running event loop')) {
    return 'Сервер временно недоступен. Попробуйте повторить запрос.';
  }
  if (errorMessage.includes('connection') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Ошибка соединения с сервером. Проверьте подключение к интернету.';
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return 'Превышено время ожидания ответа. Попробуйте позже.';
  }
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return 'Сессия истекла. Пожалуйста, войдите заново.';
  }
  if (errorMessage.includes('500') || errorMessage.includes('Internal')) {
    return 'Внутренняя ошибка сервера. Попробуйте позже.';
  }

  return 'Не удалось получить ответ. Попробуйте повторить запрос.';
};

/**
 * Хук для управления потоковой передачей сообщений от LLM
 * Решает проблему с accumulatedText через prevState
 *
 * @param {Object} options
 * @param {number} options.chatId - ID текущего чата
 * @param {Function} options.onUpdateChats - callback для обновления чатов
 * @param {Object} options.currentUser - данные текущего пользователя { firstName, lastName, position, department }
 * @param {boolean} options.enableThinking - режим "размышления" модели
 */
export function useChatStreaming({ chatId: defaultChatId, onUpdateChats, currentUser, enableThinking = false }) {
  const [isStreaming, setIsStreaming] = useState(false);

  // Формируем personalData из currentUser
  const getPersonalData = () => {
    if (!currentUser) return { role: 'employee' };

    const fullName = currentUser.lastName && currentUser.firstName
      ? `${currentUser.lastName} ${currentUser.firstName}`
      : currentUser.lastName || currentUser.firstName || null;

    return {
      full_name: fullName,
      position: currentUser.position || null,
      department: currentUser.department || null,
      role: currentUser.role || 'employee',  // Роль для фильтрации документов в RAG
    };
  };

  // targetChatId можно передать напрямую (для новых чатов)
  // currentMessages - текущие сообщения чата для контекста
  const sendStreamingMessage = async (messageText, targetChatId = null, currentMessages = []) => {
    const chatId = targetChatId || defaultChatId;

    console.log('[STREAMING] sendStreamingMessage called', {
      messageText,
      targetChatId,
      defaultChatId,
      chatId,
      currentMessagesCount: currentMessages.length,
      enableThinking
    });

    if (!messageText.trim() || !chatId) {
      console.error('[STREAMING] Validation failed:', { messageText: messageText.trim(), chatId });
      return Promise.reject(new Error('Message and chatId required'));
    }

    console.log('[STREAMING] Starting stream...');
    setIsStreaming(true);

    // Добавляем временное сообщение "обработка"
    const processingId = `processing_${Date.now()}`;
    onUpdateChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: processingId,
                type: 'output',
                content: '',
                isProcessing: true,
                timestamp: new Date().toISOString(),
                showReportButton: false,
                role: 'assistant'
              }
            ]
          };
        }
        return chat;
      });
    });

    const personalData = getPersonalData();

    console.log('[STREAMING] Calling streamService.sendQueryStream with:', {
      chatId,
      messageText,
      personalData,
      currentMessagesCount: currentMessages.length,
      enableThinking
    });

    return new Promise((resolve, reject) => {
      streamService.sendQueryStream(
        chatId,
        messageText,
        // onChunk
        (chunk) => {
          onUpdateChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id === chatId) {
                const messages = [...chat.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = messages[lastMsgIndex];

                if (lastMsg && (lastMsg.id === processingId || lastMsg.isProcessing)) {
                  messages[lastMsgIndex] = {
                    ...lastMsg,
                    content: lastMsg.content + chunk,
                    isProcessing: true
                  };
                }

                return { ...chat, messages };
              }
              return chat;
            });
          });
        },

        // onComplete - финализация и сохранение в БД
        async (data) => {
          console.log('[STREAMING] onComplete called', { responseLength: data.response?.length, sourcesCount: data.sources?.length });

          const finalText = data.response || '';
          const sources = data.sources || [];
          let aiMessageId = null;
          let saveError = false;

          try {
            console.log('[STREAMING] Saving assistant message to DB...', { chatId, finalTextLength: finalText.length, sourcesCount: sources.length });
            // Сохраняем в БД с источниками
            const aiMessage = await dialogService.sendMessage(
              chatId,
              finalText,
              'assistant',
              sources  // Передаём источники для сохранения
            );
            console.log('[STREAMING] Assistant message saved:', aiMessage);
            aiMessageId = aiMessage.id;
          } catch (error) {
            console.error('[STREAMING] Error saving assistant message:', error);
            saveError = true;
          }

          // Финальное обновление: заменяем временное сообщение на настоящее
          onUpdateChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id === chatId) {
                const messages = [...chat.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = messages[lastMsgIndex];

                if (lastMsg && lastMsg.id === processingId) {
                  messages[lastMsgIndex] = {
                    id: aiMessageId || processingId,
                    type: 'output',
                    content: finalText,
                    showReportButton: !saveError,
                    timestamp: new Date().toISOString(),
                    role: 'assistant',
                    sources: sources,
                    isProcessing: false,
                    isError: saveError // помечаем, если не сохранилось
                  };
                }

                return { ...chat, messages };
              }
              return chat;
            });
          });

          setIsStreaming(false);
          resolve({ success: !saveError, response: finalText, sources });
        },

        // onError - обработка ошибок
        (error) => {
          const friendlyError = getUserFriendlyError(error);

          // Показываем понятную ошибку в UI с возможностью повтора
          onUpdateChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id === chatId) {
                const messages = [...chat.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = messages[lastMsgIndex];

                if (lastMsg && lastMsg.id === processingId) {
                  messages[lastMsgIndex] = {
                    ...lastMsg,
                    content: friendlyError,
                    isProcessing: false,
                    isError: true,
                    canRetry: true,
                    originalQuery: messageText // Сохраняем запрос для повтора
                  };
                }

                return { ...chat, messages };
              }
              return chat;
            });
          });

          setIsStreaming(false);
          reject(error);
        },
        personalData,
        currentMessages,  // Передаём сообщения для контекста
        enableThinking   // Режим "размышления"
      );
    });
  };

  return { sendStreamingMessage, isStreaming };
}

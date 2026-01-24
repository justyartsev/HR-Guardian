/**
 * Утилиты для работы с пользователями
 */

/**
 * Форматирует имя пользователя для отображения
 * @param {Object} user - объект пользователя
 * @param {string} user.firstName - имя
 * @param {string} user.lastName - фамилия
 * @param {string} user.username - логин
 * @param {string} user.email - email
 * @param {string} fallback - текст по умолчанию
 * @returns {string} отформатированное имя
 */
export const formatUserName = (user, fallback = 'Пользователь') => {
  if (!user) return fallback;

  // Фамилия + Имя (если оба есть)
  if (user.firstName && user.lastName) {
    return `${user.lastName} ${user.firstName}`;
  }

  // Только имя или фамилия
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;

  // Username
  if (user.username) return user.username;

  // Email без домена
  if (user.email) {
    return user.email.split('@')[0];
  }

  return fallback;
};

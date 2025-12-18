#!/bin/bash

# Замена в файле /usr/share/nginx/html/main.js
echo "Заменяем VITE_ENV_API_URL в *.js на $API_URL"
# Получаем путь к текущей директории
current_dir=$(dirname "$0")

# Переходим в эту директорию
cd "$current_dir"

sed -i "s|VITE_ENV_API_URL|$API_URL|g" "$current_dir"/assets/*.js

exec nginx -g 'daemon off;'

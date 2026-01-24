#!/bin/bash
set -e

echo "[OLLAMA] Starting Ollama server..."

# Запускаем Ollama в фоне
ollama serve &
OLLAMA_PID=$!

# Ждем пока сервер запустится
echo "[OLLAMA] Waiting for server to start..."
sleep 5

# Проверяем есть ли модель
MODEL_NAME="${LLM_MODEL:-qwen2.5:3b}"
echo "[OLLAMA] Checking if model $MODEL_NAME exists..."

if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "[OLLAMA] Model not found. Pulling $MODEL_NAME..."
    echo "[OLLAMA] This will take 5-10 minutes (~2GB download)..."
    ollama pull "$MODEL_NAME"
    echo "[OLLAMA] ✅ Model $MODEL_NAME ready!"
else
    echo "[OLLAMA] ✅ Model $MODEL_NAME already exists!"
fi

# Держим контейнер активным
echo "[OLLAMA] Server ready on :11434"
wait $OLLAMA_PID

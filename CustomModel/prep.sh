#!/bin/sh

ollama serve &
sleep 10
ollama pull gemma2:2b
kill $(pidof ollama)
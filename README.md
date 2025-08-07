# Comparador de Precios de Aceite de Oliva (Infaoliva)

Este proyecto extrae automáticamente los precios diarios del aceite de oliva desde Infaoliva y los muestra en una página web.

## 📦 Estructura del proyecto

- `scraper.py`: Script que recoge los datos y genera `precio-aceite.json`.
- `precio-aceite.json`: Archivo JSON con los últimos precios extraídos.
- `index.html`: Página web que muestra los precios del JSON.
- `.github/workflows/main.yml`: Automatización para ejecutar el scraper cada día a las 13:00 (hora España).

## ▶️ Cómo usar

1. Clona el repositorio:

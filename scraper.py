
import requests
from bs4 import BeautifulSoup
from datetime import datetime, date
import json
import re

def obtener_precio_desde_aove():
    url = "https://aove.net/precio-aceite-de-oliva-hoy-poolred/"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")
    posibles_precios = soup.find_all("strong")

    precios_encontrados = []

    for item in posibles_precios:
        texto = item.get_text(strip=True)
        print("🔎 Revisando:", texto)
        match = re.search(r"(\d{1,2}[.,]\d{2})\s?€/kg", texto)
        if match:
            precio = float(match.group(1).replace(",", "."))
            precios_encontrados.append(precio)

    if not precios_encontrados:
        print("❌ No se encontró ningún precio válido.")
        exit(1)

    return max(precios_encontrados)

# Ejecutar y guardar JSON
try:
    precio = obtener_precio_desde_aove()
    datos = {
        "precio": precio,
        "fecha": date.today().isoformat(),
        "actualizado": datetime.now().isoformat()
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

    print(f"✅ Precio obtenido: {precio} €/kg")

except Exception as e:
    print(f"❌ Error general: {e}")

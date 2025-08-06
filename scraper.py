from datetime import datetime, date
import json
import re
import requests
from bs4 import BeautifulSoup

def obtener_precio_desde_aove():
    url = "https://aove.net/precio-aceite-de-oliva-hoy-poolred/"
    print("🔎 Solicitando página...")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")

    print("🔎 Primeras líneas del texto visible:")
    print(soup.get_text(strip=True)[:1000])  # Para depuración

    posibles_precios = soup.find_all("strong")
    for item in posibles_precios:
        texto = item.get_text(strip=True)
        print(f"🔎 Revisando: {texto}")
        match = re.search(r"(\d{1,3}[.,]\d{2,3})\s?€?", texto)
        if match:
            precio = match.group(1).replace(",", ".")
            return float(precio)

    print("❌ No se encontró ningún precio válido en el contenido.")
    exit(1)

# Ejecutar el scraper
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

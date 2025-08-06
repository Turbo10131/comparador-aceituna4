import requests
from bs4 import BeautifulSoup
from datetime import date, datetime
import json
import re

def obtener_precio_desde_aove():
    url = "https://aove.net/precio-aceite-de-oliva-hoy-poolred/"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    try:
        print("🔎 Solicitando página...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")
    texto_visible = soup.get_text(separator="\n")

    # Mostrar las 10 primeras líneas para ver qué contenido se carga
    lineas = texto_visible.splitlines()
    print("\n🔎 Primeras líneas del texto visible:")
    for linea in lineas[:20]:
        print(f"   ➤ {linea.strip()}")

    # Buscar patrón de precio en todo el contenido visible
    match = re.search(r"(\d{1,2}[.,]\d{2,3})\s?€/kg", texto_visible)
    if match:
        precio = match.group(1).replace(",", ".")
        return float(precio)

    print("❌ No se encontró ningún precio válido en el contenido.")
    exit(1)

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

    print(f"✅ Precio obtenido y guardado: {precio} €/kg")
except Exception as e:
    print(f"❌ Error general: {e}")
    exit(1)

import requests
from bs4 import BeautifulSoup
from datetime import datetime, date
import json
import re

def obtener_precio_desde_infaoliva():
    url = "https://www.infaoliva.com/esp/precios-aceite.html"
    print("🔎 Solicitando página de Infaoliva...")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página de Infaoliva: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")

    # Buscar la tabla de precios
    tabla = soup.find("table")
    if not tabla:
        print("❌ No se encontró la tabla de precios en la página.")
        exit(1)

    filas = tabla.find_all("tr")
    for fila in filas:
        columnas = fila.find_all("td")
        if len(columnas) >= 3:
            tipo = columnas[0].get_text(strip=True).lower()
            variedad = columnas[1].get_text(strip=True).lower()
            precio_texto = columnas[2].get_text(strip=True)

            if "virgen extra" in tipo and "picual" in variedad:
                match = re.search(r"(\d+[.,]\d+)", precio_texto)
                if match:
                    precio = float(match.group(1).replace(",", "."))
                    return precio

    print("❌ No se encontró un precio válido en la tabla.")
    exit(1)

# Ejecutar el scraper
try:
    precio = obtener_precio_desde_infaoliva()
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
    exit(1)

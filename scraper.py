import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, date

def obtener_precio_desde_infaoliva():
    url = "https://www.infaoliva.com/esp/precios.html"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    print("🔎 Solicitando página de Infaoliva...")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página de Infaoliva: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")

    # Buscamos el precio del Virgen Extra (puedes ajustar esto según el tipo de aceite)
    tablas = soup.find_all("table")
    for tabla in tablas:
        filas = tabla.find_all("tr")
        for fila in filas:
            columnas = fila.find_all("td")
            if len(columnas) >= 3:
                tipo = columnas[0].get_text(strip=True).lower()
                if "virgen extra" in tipo:
                    precio_str = columnas[2].get_text(strip=True).replace("€", "").replace(",", ".")
                    try:
                        precio = float(precio_str)
                        print(f"✅ Precio obtenido: {precio} €/kg")
                        return precio
                    except ValueError:
                        continue

    print("❌ No se encontró un precio válido en la página de Infaoliva.")
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

    print("📁 Archivo 'precio-aceite.json' actualizado correctamente.")
except Exception as e:
    print(f"❌ Error general: {e}")
    exit(1)

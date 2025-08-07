import requests
from bs4 import BeautifulSoup
from datetime import datetime, date
import json
import re

def obtener_precio_desde_infaoliva():
    url = "https://www.infaoliva.com/"
    print("🔎 Solicitando página de Infaoliva...")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página de Infaoliva: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, "html.parser")
    texto = soup.get_text(separator="\n")
    lineas = texto.splitlines()

    # Buscar secuencia: virgen extra -> Picual -> precio
    for i in range(len(lineas) - 2):
        if ("virgen extra" in lineas[i].lower() and
            "picual" in lineas[i + 1].lower()):
            match = re.search(r"(\d{1,2}[.,]\d{3})\s?€", lineas[i + 2])
            if match:
                precio = match.group(1).replace(",", ".")
                return float(precio)

    print("❌ No se encontró un precio válido en la página de Infaoliva.")
    exit(1)

# Ejecutar y guardar resultado
try:
    precio = obtener_precio_desde_infaoliva()
    datos = {
        "precio": precio,
        "fecha": date.today().isoformat(),
        "actualizado": datetime.now().isoformat()
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

    print(f"✅ Precio obtenido desde Infaoliva: {precio} €/kg")
except Exception as e:
    print(f"❌ Error general: {e}")
    exit(1)

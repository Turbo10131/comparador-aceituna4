import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def main():
    print("🔎 Solicitando página de Infaoliva...")
    url = "https://www.infaoliva.com/"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página de Infaoliva: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, 'html.parser')

    # Buscar por encabezado visible para encontrar tabla
    print("🧪 Buscando datos en observatorio de precios...")
    precios = {}
    tablas = soup.find_all("table")

    for tabla in tablas:
        headers = [th.text.strip().lower() for th in tabla.find_all("th")]
        if "tipo de aceite de oliva" in headers and "precio €/kg" in headers:
            rows = tabla.find_all("tr")[1:]  # saltar encabezado
            for row in rows:
                cols = row.find_all("td")
                if len(cols) == 3:
                    tipo = cols[0].text.strip()
                    variedad = cols[1].text.strip()
                    precio_raw = cols[2].text.strip().replace(".", "").replace(",", ".").replace("€", "")
                    try:
                        precio = float(precio_raw)
                        precios[tipo] = {
                            "variedad": variedad,
                            "precio_eur_kg": precio
                        }
                    except ValueError:
                        continue
            break  # solo necesitamos una tabla

    if not precios:
        print("❌ No se encontró un precio válido en el contenido.")
        exit(1)

    datos = {
        "fuente": "Infaoliva",
        "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "precios": precios,
        "ultima_actualizacion": datetime.utcnow().isoformat()
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

    print("✅ Precios actualizados correctamente en 'precio-aceite.json'.")

if __name__ == "__main__":
    main()

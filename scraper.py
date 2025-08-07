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
    
    print("🧪 Buscando tabla de precios...")
    table = soup.find("table")
    if not table:
        print("❌ No se encontró la tabla de precios.")
        exit(1)

    rows = table.find_all("tr")
    precios = {}

    for row in rows[1:]:
        cols = row.find_all("td")
        if len(cols) == 3:
            tipo = cols[0].text.strip()
            variedad = cols[1].text.strip()
            precio_raw = cols[2].text.strip().replace(".", "").replace(",", ".").replace("€", "").strip()
            try:
                precio = float(precio_raw)
                precios[tipo] = {
                    "variedad": variedad,
                    "precio_eur_kg": precio
                }
            except ValueError:
                continue

    if not precios:
        print("❌ No se encontró un precio válido en el contenido.")
        exit(1)

    datos = {
        "fuente": "Infaoliva",
        "fecha": datetime.now().strftime("%Y-%m-%d"),
        "precios": precios,
        "ultima_actualizacion": datetime.utcnow().isoformat()  # ⬅️ Esto fuerza que el JSON siempre cambie
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=4, ensure_ascii=False)

    print("✅ Precios extraídos correctamente y guardados en 'precio-aceite.json'.")

if __name__ == "__main__":
    main()

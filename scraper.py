import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def main():
    print("🔎 Solicitando página de Infaoliva...")
    url = "https://www.infaoliva.com/"
    try:
        response = requests.get(url, timeout=10, headers={"User-Agent":"Mozilla/5.0"})
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la página de Infaoliva: {e}")
        exit(1)

    soup = BeautifulSoup(response.text, 'html.parser')

    precios = {}
    for tabla in soup.find_all("table"):
        headers = [th.get_text(strip=True).lower() for th in tabla.find_all("th")]
        if "tipo de aceite de oliva" in headers and "precio €/kg" in " ".join(headers).lower():
            for row in tabla.find_all("tr")[1:]:
                tds = row.find_all("td")
                if len(tds) >= 3:
                    tipo = tds[0].get_text(strip=True)
                    variedad = tds[1].get_text(strip=True)
                    precio_raw = tds[2].get_text(strip=True)
                    precio = (
                        precio_raw.replace("€","")
                                  .replace(" ", "")
                                  .replace(".", "")
                                  .replace(",", ".")
                    )
                    try:
                        precios[tipo] = {
                            "variedad": variedad,
                            "precio_eur_kg": float(precio)
                        }
                    except ValueError:
                        continue
            break

    if not precios:
        print("❌ No se encontró un precio válido en la página.")
        exit(1)

    datos = {
        "fuente": "Infaoliva",
        "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "precios": precios,
        "ultima_actualizacion": datetime.utcnow().isoformat()
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

    print("✅ JSON actualizado.")

if __name__ == "__main__":
    main()

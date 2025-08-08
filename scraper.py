import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re

def extraer_float_eur(texto):
    """
    Convierte strings como '3.600 €' o '3,600 €' a float con punto decimal.
    - No elimina puntos (en Infaoliva son decimales, no miles).
    - Cambia coma por punto si la hubiera.
    """
    # coge el primer número con decimales tipo 3.600 o 3,600 o 3.6
    m = re.search(r"\d+(?:[.,]\d+)?", texto)
    if not m:
        raise ValueError(f"No se encontró número en: {texto!r}")
    n = m.group(0).replace(",", ".")
    return float(n)

def main():
    print("🔎 Solicitando página de Infaoliva...")
    url = "https://www.infaoliva.com/"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a Infaoliva: {e}")
        raise SystemExit(1)

    soup = BeautifulSoup(resp.text, "html.parser")

    # Buscar la tabla del observatorio por cabeceras
    tabla_correcta = None
    for tabla in soup.find_all("table"):
        ths = [th.get_text(strip=True).lower() for th in tabla.find_all("th")]
        header_line = " ".join(ths)
        if ("tipo de aceite" in header_line or "tipo de aceite de oliva" in header_line) and \
           ("variedad" in header_line) and ("precio" in header_line):
            tabla_correcta = tabla
            break

    if not tabla_correcta:
        print("❌ No se encontró la tabla de precios (cabeceras esperadas).")
        raise SystemExit(1)

    precios = {}
    filas = tabla_correcta.find_all("tr")
    for fila in filas[1:]:  # saltar cabecera
        tds = fila.find_all("td")
        if len(tds) < 3:
            continue
        tipo = tds[0].get_text(strip=True)
        variedad = tds[1].get_text(strip=True)
        precio_txt = tds[2].get_text(strip=True)

        try:
            precio = extraer_float_eur(precio_txt)
        except ValueError:
            continue

        precios[tipo] = {
            "variedad": variedad,
            "precio_eur_kg": precio
        }

    if not precios:
        print("❌ No se extrajo ningún precio de la tabla.")
        raise SystemExit(1)

    datos = {
        "fuente": "Infaoliva",
        "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "precios": precios,
        "ultima_actualizacion": datetime.utcnow().isoformat()
    }

    with open("precio-aceite.json", "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

    print("✅ JSON actualizado con éxito.")
    # Log rápido para que lo veas en Actions
    print(json.dumps(datos, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

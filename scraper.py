# scraper.py
import json
import re
from datetime import datetime

from playwright.sync_api import sync_playwright

def extraer_float_eur(txt: str) -> float:
    """
    Convierte '3.600 €' o '3,600 €' a float con punto decimal.
    - No elimina puntos a ciegas (Infaoliva usa '.' como separador decimal).
    - Si hubiera coma, la convierte a punto.
    """
    m = re.search(r"\d+(?:[.,]\d+)?", txt)
    if not m:
        raise ValueError(f"No se encontró número en: {txt!r}")
    n = m.group(0).replace(",", ".")
    return float(n)

def main():
    url = "https://www.infaoliva.com/"
    print("🔎 Abriendo Infaoliva con Playwright…")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        # Cargar página
        page.goto(url, wait_until="load", timeout=60_000)

        # Aceptar cookies si aparece (no pasa nada si no existe)
        try:
            page.get_by_role("button", name=re.compile("aceptar|accept|consentir", re.I)).click(timeout=3000)
        except:
            pass

        # Esperar a que aparezca el bloque del Observatorio / la tabla de precios
        # Buscamos una tabla que tenga cabeceras con "Tipo" y "Precio"
        page.wait_for_timeout(1500)  # pequeño delay para que hidrate el DOM
        tablas = page.locator("table")
        num_tablas = tablas.count()
        print(f"📄 Tablas detectadas: {num_tablas}")

        tabla_idx = None
        for i in range(num_tablas):
            th_text = " ".join(tablas.nth(i).locator("th").all_text_contents()).lower()
            if ("tipo" in th_text or "tipo de aceite" in th_text) and ("precio" in th_text):
                tabla_idx = i
                break

        if tabla_idx is None:
            print("❌ No se encontró la tabla del Observatorio (cabeceras esperadas).")
            browser.close()
            raise SystemExit(1)

        tabla = tablas.nth(tabla_idx)
        rows = tabla.locator("tr")
        row_count = rows.count()
        print(f"✅ Tabla de precios encontrada (filas: {row_count})")

        precios = {}
        # Saltar la fila de cabecera (0)
        for r in range(1, row_count):
            celdas = rows.nth(r).locator("td")
            if celdas.count() < 3:
                continue
            tipo = celdas.nth(0).inner_text().strip()
            variedad = celdas.nth(1).inner_text().strip()
            precio_txt = celdas.nth(2).inner_text().strip()
            try:
                precio = extraer_float_eur(precio_txt)
                precios[tipo] = {
                    "variedad": variedad,
                    "precio_eur_kg": precio
                }
            except ValueError:
                continue

        browser.close()

    if not precios:
        print("❌ No se extrajeron precios de la tabla.")
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
    print(json.dumps(datos, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

# scraper.py
import json
import re
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

OBSERVATORIO_KEYS = ("observatorio", "precios", "aceite")

def _to_float_eur(texto: str) -> float:
    """
    Convierte '3.600 €' / '3,600 €' / '3.6' a float.
    - No elimina los puntos a ciegas (Infaoliva usa '.' como decimal).
    - Cambia coma por punto si viene con coma.
    """
    m = re.search(r"\d+(?:[.,]\d+)?", texto)
    if not m:
        raise ValueError(f"No se encontró número en: {texto!r}")
    n = m.group(0).replace(",", ".")
    return float(n)

def _tabla_con_cabeceras(page):
    """
    Devuelve el locator de la tabla del Observatorio buscando cabeceras
    con 'tipo'/'tipo de aceite' + 'variedad' + 'precio'.
    """
    tablas = page.locator("table")
    for i in range(tablas.count()):
        th_text = " ".join(
            [t.lower() for t in tablas.nth(i).locator("th").all_text_contents()]
        )
        if not th_text:
            continue
        if (("tipo" in th_text or "tipo de aceite" in th_text)
            and "variedad" in th_text
            and "precio" in th_text):
            return tablas.nth(i)
    return None

def _tabla_despues_de_observatorio(page):
    """
    Busca un encabezado (h2/h3/p) que contenga 'observatorio' y 'precio(s)'
    y devuelve la primera tabla que le sigue. Fallback para cambios de maquetación.
    """
    candidatos = page.locator("h2,h3,p")
    for i in range(candidatos.count()):
        txt = candidatos.nth(i).inner_text().strip().lower()
        if all(k in txt for k in OBSERVATORIO_KEYS):
            tabla = candidatos.nth(i).locator("xpath=following::table[1]")
            if tabla.count() > 0:
                return tabla.first
    return None

def main():
    url = "https://www.infaoliva.com/"
    print("🔎 Abriendo Infaoliva con Playwright…")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36")
        page = ctx.new_page()

        try:
            page.goto(url, wait_until="load", timeout=60_000)
        except PwTimeout:
            print("❌ Timeout cargando Infaoliva.")
            browser.close()
            raise SystemExit(1)

        # Aceptar cookies si aparece
        try:
            page.get_by_role("button", name=re.compile("aceptar|accept|consent|consentir", re.I)).click(timeout=3000)
        except Exception:
            pass

        # Pequeña espera para que hydrate el DOM si usan JS
        page.wait_for_timeout(1500)

        # 1) Preferencia: tabla por cabeceras correctas
        tabla = _tabla_con_cabeceras(page)
        # 2) Fallback: tabla posterior al encabezado del Observatorio
        if tabla is None:
            tabla = _tabla_despues_de_observatorio(page)

        if tabla is None:
            print("❌ No se encontró la tabla actual del Observatorio.")
            browser.close()
            raise SystemExit(1)

        rows = tabla.locator("tr")
        row_count = rows.count()
        if row_count <= 1:
            print("❌ Tabla sin filas de datos.")
            browser.close()
            raise SystemExit(1)

        precios = {}
        # Saltamos cabecera (fila 0)
        for r in range(1, row_count):
            celdas = rows.nth(r).locator("td")
            if celdas.count() < 3:
                continue
            tipo = celdas.nth(0).inner_text().strip()
            variedad = celdas.nth(1).inner_text().strip()
            precio_txt = celdas.nth(2).inner_text().strip()

            try:
                precio = _to_float_eur(precio_txt)
            except ValueError:
                continue

            if tipo:
                precios[tipo] = {
                    "variedad": variedad,
                    "precio_eur_kg": precio
                }

        browser.close()

    if not precios:
        print("❌ No se extrajeron precios válidos.")
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

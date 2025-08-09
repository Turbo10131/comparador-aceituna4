# scraper.py
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

JSON_PATH = Path("precio-aceite.json")
OBSERVATORIO_KEYS = ("observatorio", "precios", "aceite")

def _to_float_eur(texto: str) -> float:
    """
    Convierte '3.600 €' / '3,600 €' / '3.6' a float.
    Mantiene '.' como decimal y cambia ',' a '.'
    """
    import re
    m = re.search(r"\d+(?:[.,]\d+)?", texto)
    if not m:
        raise ValueError(f"No se encontró número en: {texto!r}")
    n = m.group(0).replace(",", ".")
    return float(n)

def _tabla_con_cabeceras(page):
    """Busca una tabla con cabeceras tipo/variedad/precio."""
    tablas = page.locator("table")
    for i in range(tablas.count()):
        th_text = " ".join(
            [t.lower() for t in tablas.nth(i).locator("th").all_text_contents()]
        )
        if th_text and (("tipo" in th_text or "tipo de aceite" in th_text)
                        and "variedad" in th_text
                        and "precio" in th_text):
            return tablas.nth(i)
    return None

def _tabla_despues_de_observatorio(page):
    """Fallback: busca encabezado con 'observatorio' y 'precios', y coge la tabla siguiente."""
    candidatos = page.locator("h2,h3,p")
    for i in range(candidatos.count()):
        txt = candidatos.nth(i).inner_text().strip().lower()
        if all(k in txt for k in OBSERVATORIO_KEYS):
            tabla = candidatos.nth(i).locator("xpath=following::table[1]")
            if tabla.count() > 0:
                return tabla.first
    return None

def _next_build_version() -> int:
    """Lee el JSON anterior y suma 1 al build_version (o 1 si no existe)."""
    if JSON_PATH.exists():
        try:
            data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
            return int(data.get("build_version", 0)) + 1
        except Exception:
            return 1
    return 1

def main():
    url = "https://www.infaoliva.com/"
    print("🔎 Abriendo Infaoliva con Playwright…")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124 Safari/537.36"
        ))
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

        page.wait_for_timeout(1500)

        tabla = _tabla_con_cabeceras(page) or _tabla_despues_de_observatorio(page)
        if tabla is None:
            print("❌ No se encontró la tabla actual del Observatorio.")
            browser.close()
            raise SystemExit(1)

        rows = tabla.locator("tr")
        if rows.count() <= 1:
            print("❌ Tabla sin filas de datos.")
            browser.close()
            raise SystemExit(1)

        precios = {}
        for r in range(1, rows.count()):
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
                precios[tipo] = {"variedad": variedad, "precio_eur_kg": precio}

        browser.close()

    if not precios:
        print("❌ No se extrajeron precios válidos.")
        raise SystemExit(1)

    # Campos dinámicos para forzar cambios SIEMPRE
    build_version = _next_build_version()
    now_local = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    now_utc_iso = datetime.utcnow().isoformat()

    datos = {
        "fuente": "Infaoliva",
        "fecha": now_local,
        "precios": precios,
        "ultima_actualizacion": now_utc_iso,
        "build_version": build_version,      # ← hace que el archivo cambie en cada ejecución
        "generated_at": now_utc_iso          # ← redundante, pero útil para depurar
    }

    JSON_PATH.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")

    print("✅ JSON actualizado con éxito.")
    print(json.dumps(datos, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

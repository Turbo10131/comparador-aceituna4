# scraper.py
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout, Error as PwError

JSON_PATH = Path("precio-aceite.json")
OBSERVATORIO_KEYS = ("observatorio", "precios", "aceite")


def _to_float_eur(texto: str) -> float:
    """
    Convierte '3.600 €' / '3,600 €' / '3.6' a float.
    Mantiene '.' como decimal y cambia ',' a '.'
    """
    m = re.search(r"\d+(?:[.,]\d+)?", texto)
    if not m:
        raise ValueError(f"No se encontró número en: {texto!r}")
    n = m.group(0).replace(",", ".")
    return float(n)


def _tabla_con_cabeceras(page):
    """Busca una tabla con cabeceras tipo/variedad/precio."""
    tablas = page.locator("table")
    count = tablas.count()
    for i in range(count):
        ths = tablas.nth(i).locator("th").all_text_contents()
        th_text = " ".join(t.lower().strip() for t in ths)
        if th_text and (("tipo" in th_text or "tipo de aceite" in th_text)
                        and "variedad" in th_text
                        and "precio" in th_text):
            return tablas.nth(i)
    return None


def _tabla_despues_de_observatorio(page):
    """Fallback: busca encabezado con 'observatorio', 'precios', 'aceite' y toma la tabla siguiente."""
    candidatos = page.locator("h1,h2,h3,h4,p,section")
    count = candidatos.count()
    for i in range(count):
        try:
            txt = candidatos.nth(i).inner_text().strip().lower()
        except PwError:
            continue
        if all(k in txt for k in OBSERVATORIO_KEYS):
            tabla = candidatos.nth(i).locator("xpath=following::table[1]")
            if tabla.count() > 0:
                return tabla.first
    return None


def _next_build_version() -> int:
    """Lee el JSON anterior y suma 1 al build_version (o 1 si no existe)."""
    try:
        if JSON_PATH.exists():
            data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
            return int(data.get("build_version", 0)) + 1
    except Exception:
        pass
    return 1


def main():
    url = "https://www.infaoliva.com/"
    print("🔎 Abriendo Infaoliva con Playwright…")

    precios = {}
    sin_cierre_hoy = False  # bandera para cuando Infaoliva muestra “Sin cierre de operaciones”

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

        # Aceptar cookies si aparece (best effort)
        try:
            page.get_by_role("button", name=re.compile("aceptar|accept|consent|consentir", re.I)).click(timeout=3000)
        except Exception:
            pass

        page.wait_for_timeout(1500)

        # Localizar la tabla del observatorio
        tabla = _tabla_con_cabeceras(page) or _tabla_despues_de_observatorio(page)
        if tabla is None:
            print("❌ No se encontró la tabla del Observatorio.")
            browser.close()
            raise SystemExit(1)

        rows = tabla.locator("tr")
        if rows.count() <= 1:
            # solo cabecera => no hay datos
            print("ℹ️ Tabla sin filas de datos (posible día sin cierre).")
            sin_cierre_hoy = True
        else:
            for r in range(1, rows.count()):  # saltar cabecera
                celdas = rows.nth(r).locator("td")
                if celdas.count() < 3:
                    continue

                try:
                    tipo = celdas.nth(0).inner_text().strip()
                    variedad = celdas.nth(1).inner_text().strip()
                    precio_txt = celdas.nth(2).inner_text().strip()
                except PwError:
                    continue

                # Detectar “sin cierre de operaciones”
                if "sin cierre" in precio_txt.lower():
                    sin_cierre_hoy = True
                    continue

                try:
                    precio = _to_float_eur(precio_txt)
                except ValueError:
                    # celdas con guiones o texto no numérico
                    continue

                if tipo:
                    precios[tipo] = {"variedad": variedad, "precio_eur_kg": precio}

        browser.close()

    # Si no hay precios numéricos hoy, reusar el último JSON (mantener la web operativa)
    if not precios:
        print("ℹ️ No hay precios numéricos hoy. Reusando últimos datos (si existen).")
        if JSON_PATH.exists():
            try:
                prev = json.loads(JSON_PATH.read_text(encoding="utf-8"))
                precios = prev.get("precios", {}) or {}
            except Exception as e:
                print(f"⚠️ No se pudo leer el JSON previo: {e}")
                precios = {}
        else:
            precios = {}

    # Validación “suave”: avisa si están fuera de rango, pero no tumba el scraper
    fuera_rango = False
    for v in precios.values():
        try:
            val = float(v.get("precio_eur_kg", 0))
            if not (0 < val <= 20):
                fuera_rango = True
        except Exception:
            fuera_rango = True

    if fuera_rango:
        print("⚠️ Algún precio está fuera del rango razonable (0–20 €/kg). Se continúa para no tumbar la web.")

    # Campos dinámicos / metadatos
    build_version = _next_build_version()
    now_local = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    now_utc_iso = datetime.utcnow().isoformat()

    datos = {
        "fuente": "Infaoliva",
        "fecha": now_local,                  # legible en hora local
        "precios": precios,                  # puede venir del día o del último JSON
        "ultima_actualizacion": now_utc_iso, # ISO en UTC
        "build_version": build_version,
        "generated_at": now_utc_iso,
        "sin_cierre_operaciones": bool(sin_cierre_hoy)
    }

    # Guardar JSON siempre (aunque sea reusando datos previos)
    JSON_PATH.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    print("✅ JSON actualizado con éxito.")
    print(json.dumps(datos, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

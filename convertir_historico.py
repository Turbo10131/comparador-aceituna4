# -*- coding: utf-8 -*-
"""
Convierte 'historico.txt' (texto libre con fechas y líneas de precios)
en 'precio-aceite-historico.json' con este formato:

{
  "Aceite de oliva virgen extra": [
    {"fecha": "2012-01-03", "precio_eur_kg": 2.345},
    ...
  ],
  "Aceite de oliva virgen": [...],
  "Aceite de oliva lampante": [...]
}

- Soporta fechas DD-MM-YYYY, DD/MM/YYYY y DD-MM-YY / DD/MM/YY
- Normaliza precios '2,345 €' -> 2.345 (float)
- Ignora líneas como "Sin cierre de operaciones"
- Elimina duplicados por (fecha,tipo): conserva el último valor
- Ordena por fecha y rellena con null cuando falta un tipo en una fecha
"""

import json
import re
from datetime import datetime

INPUT_FILE = "historico.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Diccionario objetivo
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# --- Regex útiles ---
# Fechas: 01-12-2019 / 01/12/2019 / 01-12-19 / 1/7/25
REGEX_FECHA = re.compile(
    r"\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b"
)

# Precios: 2,345 €, 3.45 €, 4,0 €, 3.450 €
REGEX_PRECIO = re.compile(
    r"([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)(?:,([0-9]+))?\s*€"
)

# Tipos (permitimos variedad después del tipo, p.ej. "Picual")
REGEX_TIPO = re.compile(
    r"Aceite de oliva\s+("
    r"virgen\s+extra|virgen|lampante"
    r")\b",
    flags=re.IGNORECASE
)

IGNORAR_LINEA = re.compile(r"sin\s+cierre\s+de\s+operaciones", re.IGNORECASE)


def parse_date(dd, mm, yy):
    """Devuelve fecha ISO YYYY-MM-DD. Maneja YY -> 20YY."""
    d = int(dd)
    m = int(mm)
    y = int(yy)
    if y < 100:  # año con dos cifras
        y += 2000  # nuestro histórico es 2012–2025
    try:
        return datetime(y, m, d).strftime("%Y-%m-%d")
    except ValueError:
        return None


def normaliza_precio(match):
    """
    Convierte un match de REGEX_PRECIO a float con punto decimal.
    Soporta miles con puntos y decimales con coma.
    """
    entero = match.group(1)  # "3.450" o "3" o "3450"
    dec = match.group(2)     # "50" o None
    entero = entero.replace(".", "")
    num = f"{entero}.{dec}" if dec else entero
    try:
        return float(num)
    except ValueError:
        return None


def canonical_tipo(fragmento):
    """Devuelve el nombre canónico del tipo a partir del texto encontrado."""
    frag = fragmento.lower().strip()
    if frag.startswith("virgen extra"):
        return "Aceite de oliva virgen extra"
    if frag == "virgen":
        return "Aceite de oliva virgen"
    if frag == "lampante":
        return "Aceite de oliva lampante"
    # fallback (por si viene con más palabras, p.ej. 'virgen extra picual')
    if frag.startswith("virgen"):
        if "extra" in frag:
            return "Aceite de oliva virgen extra"
        return "Aceite de oliva virgen"
    return None


def cargar_lineas(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.readlines()


def construir_json_desde_txt(lines):
    """
    Lee el TXT y crea una estructura temporal:
    tmp[fecha_iso][tipo] = precio_float
    """
    tmp = {}  # { 'YYYY-MM-DD': {tipo: precio} }
    fecha_actual = None

    for raw in lines:
        line = raw.strip()
        if not line:
            continue

        # Ignorar líneas "sin cierre de operaciones"
        if IGNORAR_LINEA.search(line):
            continue

        # ¿Aparece una fecha?
        fmatch = REGEX_FECHA.search(line)
        if fmatch:
            iso = parse_date(fmatch.group(1), fmatch.group(2), fmatch.group(3))
            if iso:
                fecha_actual = iso
                if fecha_actual not in tmp:
                    tmp[fecha_actual] = {}
            # Puede seguir habiendo tipo+precio en la misma línea, no "continue"

        # Si no tenemos fecha aún, no podemos asignar el precio
        if not fecha_actual:
            continue

        # Intentar extraer tipo
        tmatch = REGEX_TIPO.search(line)
        if not tmatch:
            continue

        tipo = canonical_tipo(tmatch.group(1))
        if not tipo:
            continue

        # Extraer precio
        pmatch = REGEX_PRECIO.search(line)
        if not pmatch:
            continue

        precio = normaliza_precio(pmatch)
        if precio is None:
            continue

        # Guardar / sobrescribir (último valor prevalece para duplicados)
        tmp.setdefault(fecha_actual, {})[tipo] = precio

    # Pasar tmp al JSON final, ordenado por fecha y rellenando nulls
    fechas_ordenadas = sorted(tmp.keys())
    resultado = {k: [] for k in data.keys()}

    for fecha in fechas_ordenadas:
        for tipo in resultado.keys():
            if tipo in tmp[fecha]:
                resultado[tipo].append({
                    "fecha": fecha,
                    "precio_eur_kg": round(tmp[fecha][tipo], 3)  # 3 decimales
                })
            else:
                resultado[tipo].append({
                    "fecha": fecha,
                    "precio_eur_kg": None
                })

    return resultado


def main():
    lines = cargar_lineas(INPUT_FILE)
    resultado = construir_json_desde_txt(lines)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"OK -> {OUTPUT_FILE} generado con {sum(len(v) for v in resultado.values())} registros.")


if __name__ == "__main__":
    main()

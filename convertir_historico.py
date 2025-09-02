# convertir_historico.py
# Convierte historico.txt -> precio-aceite-historico.json

import json
import re
from datetime import datetime

INPUT_FILE  = "historico.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Fechas admitidas:
#  - 06-11-2012, 06/11/2012, 6-11-12, 6/11/12  (DD-MM-YYYY / DD/MM/YYYY con año 2 o 4 dígitos)
#  - 2012-11-06, 2012/11/06                    (YYYY-MM-DD / YYYY/MM/DD)
regex_fecha_ddmm = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b")
regex_fecha_yymm = re.compile(r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b")

# Precio como "3,456 €" o "3.456 €"
regex_precio = re.compile(r"([0-9]+[.,][0-9]+)\s*€")

def to_iso_from_ddmm(dd, mm, yy):
    d = int(dd); m = int(mm); y = int(yy)
    if len(yy) <= 2:  # 12 -> 2012
        y += 2000
    try:
        return datetime(y, m, d).strftime("%Y-%m-%d")
    except ValueError:
        return None

def to_iso_from_yymm(yyyy, mm, dd):
    try:
        return datetime(int(yyyy), int(mm), int(dd)).strftime("%Y-%m-%d")
    except ValueError:
        return None

def normaliza_precio(txt):
    # "2,345" -> 2.345  |  "2.345" -> 2.345
    txt = txt.replace(".", "#").replace(",", ".").replace("#", "")
    try:
        return float(txt)
    except:
        return None

def detect_tipo(line_lower):
    if "lampante" in line_lower:
        return "Aceite de oliva lampante"
    if "virgen extra" in line_lower:
        return "Aceite de oliva virgen extra"
    if "virgen" in line_lower and "extra" not in line_lower:
        return "Aceite de oliva virgen"
    return None

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f]

    fecha_actual = None

    for line in lines:
        if not line:
            continue

        # 1) Fecha en formato DD-MM-YYYY / DD/MM/YYYY
        m1 = regex_fecha_ddmm.search(line)
        if m1:
            iso = to_iso_from_ddmm(m1.group(1), m1.group(2), m1.group(3))
            if iso:
                fecha_actual = iso
            continue

        # 2) Fecha en formato YYYY-MM-DD / YYYY/MM/DD
        m2 = regex_fecha_yymm.search(line)
        if m2:
            iso = to_iso_from_yymm(m2.group(1), m2.group(2), m2.group(3))
            if iso:
                fecha_actual = iso
            continue

        low = line.lower()
        # Ignorar "Sin cierre de operaciones"
        if "sin cierre de operaciones" in low or "sin cierre" in low:
            continue

        tipo = detect_tipo(low)
        if tipo and fecha_actual:
            mprecio = regex_precio.search(line)
            if mprecio:
                valor = normaliza_precio(mprecio.group(1))
                if valor and 0 < valor < 20:
                    data[tipo].append({
                        "fecha": fecha_actual,
                        "precio_eur_kg": round(valor, 3)
                    })

    # Ordenar por fecha cada lista
    for k in data:
        data[k].sort(key=lambda x: x["fecha"])

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in data.values())
    print(f"Generado {OUTPUT_FILE} con {total} registros")

if __name__ == "__main__":
    main()

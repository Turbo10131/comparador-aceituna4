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

# Fechas: 1/2 dígitos de día y mes, año 2 ó 4 dígitos. Separador '-' o '/'
regex_fecha = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b")
# Precio: 3,456 € o 3.456 € (coma o punto) con símbolo €
regex_precio = re.compile(r"([0-9]+[.,][0-9]+)\s*€")

def parse_date(dd, mm, yy):
    """Devuelve fecha ISO YYYY-MM-DD. Admite YY -> 20YY."""
    d = int(dd)
    m = int(mm)
    y = int(yy)
    if len(yy) <= 2:
        y += 2000
    try:
        return datetime(y, m, d).strftime("%Y-%m-%d")
    except ValueError:
        return None

def normaliza_precio(txt):
    # "2,345" -> 2.345 | "2.345" -> 2.345
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
    # "virgen" pero NO "extra"
    if "virgen" in line_lower and "extra" not in line_lower:
        return "Aceite de oliva virgen"
    return None

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.readlines()]

    fecha_actual = None

    for line in lines:
        if not line:
            continue

        # detectar fecha
        m = regex_fecha.search(line)
        if m:
            iso = parse_date(m.group(1), m.group(2), m.group(3))
            if iso:
                fecha_actual = iso
            continue

        # ignorar “sin cierre”
        low = line.lower()
        if "sin cierre de operaciones" in low or "sin cierre" in low:
            continue

        # detectar tipo + precio
        tipo = detect_tipo(low)
        if tipo and fecha_actual:
            p = regex_precio.search(line)
            if p:
                valor = normaliza_precio(p.group(1))
                if valor and 0 < valor < 20:
                    data[tipo].append({
                        "fecha": fecha_actual,
                        "precio_eur_kg": round(valor, 3)
                    })

    # ordenar por fecha cada lista
    for k in data:
        data[k].sort(key=lambda x: x["fecha"])

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Generado {OUTPUT_FILE} con {sum(len(v) for v in data.values())} registros")

if __name__ == "__main__":
    main()

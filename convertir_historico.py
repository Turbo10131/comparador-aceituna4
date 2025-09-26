# convertir_historico.py
# Lee "precios 2015.txt" y genera "precio-aceite-historico.json"
# con TODO el histórico desde 2015 (rellenando huecos de días) y fusiona con precios del día.

import json
import re
from datetime import datetime, timedelta

INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Estructura base
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Regex
regex_fecha = re.compile(r"(\d{2}-\d{2}-\d{4})")           # dd-mm-aaaa
regex_precio = re.compile(r"([0-9]+,[0-9]+)")              # 3,25 por ejemplo

def normaliza_precio(txt):
    # "2,345" -> 2.345
    return float(txt.replace(",", "."))

def categoria_de_linea(line):
    l = line.lower()
    if "virgen extra" in l:
        return "Aceite de oliva virgen extra"
    if re.search(r"\bvirgen\b(?!\s*extra)", l):
        return "Aceite de oliva virgen"
    if "lampante" in l:
        return "Aceite de oliva lampante"
    return None

# Leemos TXT
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual_iso = None
pendiente = {k: None for k in data.keys()}

for raw in lines:
    line = raw.strip()

    # Detectar fecha
    m_fecha = regex_fecha.search(line)
    if m_fecha:
        dd, mm, yyyy = m_fecha.group(1).split("-")
        try:
            fecha_actual_iso = datetime(int(yyyy), int(mm), int(dd)).strftime("%Y-%m-%d")
        except ValueError:
            fecha_actual_iso = None
        pendiente = {k: None for k in pendiente}
        continue

    # Si hay precio y categoría, lo añadimos
    if fecha_actual_iso:
        cat = categoria_de_linea(line)
        m_precio = regex_precio.search(line)
        if cat and m_precio:
            precio = normaliza_precio(m_precio.group(1))
            pendiente[cat] = precio
            data[cat].append({"fecha": fecha_actual_iso, "precio_eur_kg": precio})

# ---- Rellenar huecos de días ----
for cat in list(data.keys()):
    data[cat].sort(key=lambda d: d["fecha"])
    rellenado = []
    prev_precio = None
    if not data[cat]:
        continue
    fecha_inicio = datetime.strptime(data[cat][0]["fecha"], "%Y-%m-%d")
    fecha_fin = datetime.today()
    precios_map = {d["fecha"]: d["precio_eur_kg"] for d in data[cat]}
    f = fecha_inicio
    while f <= fecha_fin:
        f_str = f.strftime("%Y-%m-%d")
        if f_str in precios_map:
            prev_precio = precios_map[f_str]
            rellenado.append({"fecha": f_str, "precio_eur_kg": prev_precio})
        elif prev_precio is not None:
            rellenado.append({"fecha": f_str, "precio_eur_kg": prev_precio})
        f += timedelta(days=1)
    data[cat] = rellenado

# ---- Fusionar con los precios del día desde precio-aceite.json ----
try:
    with open("precio-aceite.json", "r", encoding="utf-8") as f:
        precios_dia = json.load(f)

    hoy = datetime.today().strftime("%Y-%m-%d")

    for cat in data.keys():
        precio_actual = precios_dia.get(cat, {}).get("precio_eur_kg")
        if precio_actual:
            # Evitar duplicados: eliminar si ya existe el día
            data[cat] = [d for d in data[cat] if d["fecha"] != hoy]
            data[cat].append({"fecha": hoy, "precio_eur_kg": precio_actual})
            data[cat].sort(key=lambda d: d["fecha"])
except Exception as e:
    print(f"⚠️ No se pudo fusionar con precios del día: {e}")

# Guardamos JSON bonito
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, indent=2)

print(f"✅ Generado {OUTPUT_FILE} con {len(data['Aceite de oliva virgen extra'])} VE, "
      f"{len(data['Aceite de oliva virgen'])} V y {len(data['Aceite de oliva lampante'])} L registros.")

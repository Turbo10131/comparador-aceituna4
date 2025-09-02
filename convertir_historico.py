# convertir_historico.py
# Lee "historico.txt" y genera "precio-aceite-historico.json" con TODO el histórico (sin recortar años).

import json
import re
from datetime import datetime

INPUT_FILE = "historico.txt"
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
    # Aceptamos que aparezcan variantes con "picual" o sin ella; y espacios extra.
    if "virgen extra" in l:
        return "Aceite de oliva virgen extra"
    if re.search(r"\bvirgen\b(?!\s*extra)", l):            # virgen pero NO "virgen extra"
        return "Aceite de oliva virgen"
    if "lampante" in l:
        return "Aceite de oliva lampante"
    return None

# Leemos
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual_iso = None
pendiente = {"Aceite de oliva virgen extra": None,
             "Aceite de oliva virgen": None,
             "Aceite de oliva lampante": None}

# Recorremos líneas
for raw in lines:
    line = raw.strip()

    # Detectar fecha
    m_fecha = regex_fecha.search(line)
    if m_fecha:
        # Guardamos la fecha (en ISO, yyyy-mm-dd)
        dd, mm, yyyy = m_fecha.group(1).split("-")
        try:
            fecha_actual_iso = datetime(int(yyyy), int(mm), int(dd)).strftime("%Y-%m-%d")
        except ValueError:
            fecha_actual_iso = None
        # al cambiar de fecha, reseteamos pendientes
        pendiente = {k: None for k in pendiente}
        continue

    # Si hay precio y una categoría, lo añadimos
    if fecha_actual_iso:
        cat = categoria_de_linea(line)
        m_precio = regex_precio.search(line)
        if cat and m_precio:
            precio = normaliza_precio(m_precio.group(1))
            pendiente[cat] = precio
            # Añadimos el registro en cuanto lo tenemos para esa categoría
            data[cat].append({"fecha": fecha_actual_iso, "precio_eur_kg": precio})

# ---- Depuración de datos ----
# 1) Ordenar por fecha
for cat in list(data.keys()):
    data[cat].sort(key=lambda d: d["fecha"])

# 2) Deduplicar por mes (nos quedamos con el último valor del mes)
def dedup_por_mes(items):
    seen = {}
    for item in items:
        ym = item["fecha"][:7]   # yyyy-mm
        # nos quedamos con el último de ese mes (al estar ordenados, vamos sobrescribiendo)
        seen[ym] = item
    # devolver ordenado por fecha
    return sorted(seen.values(), key=lambda d: d["fecha"])

for cat in list(data.keys()):
    data[cat] = dedup_por_mes(data[cat])

# 3) Nada de recortes por años: se escribe todo lo disponible.

# Guardamos JSON bonito
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, indent=2)

print(f"OK → Generado {OUTPUT_FILE} con {len(data['Aceite de oliva virgen extra'])} VE, "
      f"{len(data['Aceite de oliva virgen'])} V y {len(data['Aceite de oliva lampante'])} L registros.")

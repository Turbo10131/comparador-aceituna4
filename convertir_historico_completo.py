# convertir_historico_completo.py
# Convierte "precios 2015.txt" en "precio-aceite-historico.json"
# Incluye TODOS los días desde la primera fecha hasta hoy.
# Si falta algún día, se rellena con el precio del día anterior.

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

regex_fecha = re.compile(r"(\d{2}-\d{2}-\d{4})")  # dd-mm-aaaa
regex_precio = re.compile(r"([0-9]+,[0-9]+)")     # 3,25

def normaliza_precio(txt):
    return float(txt.replace(",", "."))

def categoria_de_linea(line):
    l = line.lower()
    if "virgen extra" in l:
        return "Aceite de oliva virgen extra"
    if re.search(r"\bvirgen\b(?!\s*extra)", l):  # virgen pero NO "virgen extra"
        return "Aceite de oliva virgen"
    if "lampante" in l:
        return "Aceite de oliva lampante"
    return None

# Leer archivo
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual_iso = None

for raw in lines:
    line = raw.strip()

    m_fecha = regex_fecha.search(line)
    if m_fecha:
        dd, mm, yyyy = m_fecha.group(1).split("-")
        try:
            fecha_actual_iso = datetime(int(yyyy), int(mm), int(dd)).strftime("%Y-%m-%d")
        except ValueError:
            fecha_actual_iso = None
        continue

    if fecha_actual_iso:
        cat = categoria_de_linea(line)
        m_precio = regex_precio.search(line)
        if cat and m_precio:
            precio = normaliza_precio(m_precio.group(1))
            data[cat].append({"fecha": fecha_actual_iso, "precio_eur_kg": precio})

# Ordenar y completar fechas faltantes
for cat in data:
    data[cat].sort(key=lambda d: d["fecha"])
    completos = []
    if data[cat]:
        start_date = datetime.strptime(data[cat][0]["fecha"], "%Y-%m-%d")
        end_date = datetime.today()
        i = 0
        last_precio = data[cat][0]["precio_eur_kg"]

        current_date = start_date
        while current_date <= end_date:
            fecha_iso = current_date.strftime("%Y-%m-%d")
            if i < len(data[cat]) and data[cat][i]["fecha"] == fecha_iso:
                last_precio = data[cat][i]["precio_eur_kg"]
                completos.append(data[cat][i])
                i += 1
            else:
                completos.append({"fecha": fecha_iso, "precio_eur_kg": last_precio})
            current_date += timedelta(days=1)
        data[cat] = completos

# Guardar JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, indent=2)

print(f"✅ Generado {OUTPUT_FILE} con datos diarios completos hasta hoy.")

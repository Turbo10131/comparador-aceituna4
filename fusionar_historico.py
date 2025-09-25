# fusionar_historico.py
# Convierte "precios 2015.txt" en un JSON histórico completo (2015 → hoy)
# Rellena días faltantes con el precio del día anterior.

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

# Leer archivo TXT
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual = None
pendiente = {k: None for k in data}

for raw in lines:
    line = raw.strip()

    m_fecha = regex_fecha.search(line)
    if m_fecha:
        dd, mm, yyyy = m_fecha.group(1).split("-")
        try:
            fecha_actual = datetime(int(yyyy), int(mm), int(dd))
        except ValueError:
            fecha_actual = None
        pendiente = {k: None for k in pendiente}
        continue

    if fecha_actual:
        cat = categoria_de_linea(line)
        m_precio = regex_precio.search(line)
        if cat and m_precio:
            precio = normaliza_precio(m_precio.group(1))
            pendiente[cat] = precio
            data[cat].append({"fecha": fecha_actual.strftime("%Y-%m-%d"),
                              "precio_eur_kg": precio})

# Ordenar por fecha
for cat in data:
    data[cat].sort(key=lambda d: d["fecha"])

# --- Rellenar días faltantes ---
def rellenar_faltantes(lista):
    if not lista:
        return lista
    fechas = {datetime.strptime(d["fecha"], "%Y-%m-%d"): d["precio_eur_kg"] for d in lista}
    fecha_inicio = min(fechas.keys())
    fecha_fin = datetime.today()

    completa = []
    precio_anterior = None
    fecha = fecha_inicio
    while fecha <= fecha_fin:
        if fecha in fechas:
            precio_anterior = fechas[fecha]
        if precio_anterior is not None:
            completa.append({
                "fecha": fecha.strftime("%Y-%m-%d"),
                "precio_eur_kg": precio_anterior
            })
        fecha += timedelta(days=1)
    return completa

for cat in data:
    data[cat] = rellenar_faltantes(data[cat])

# Guardar JSON final
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, indent=2)

print(f"✅ Generado {OUTPUT_FILE} con histórico desde 2015 hasta hoy.")

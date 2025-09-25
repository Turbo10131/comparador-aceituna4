# convertir_historico.py
# Lee "historico_completo.txt" y genera "precio-aceite-historico.json"
# Incluye TODO el histórico desde 2015 y rellena días faltantes con el precio del día anterior.

import json
import re
from datetime import datetime, timedelta

INPUT_FILE = "historico_completo.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Estructura base
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Regex
regex_fecha = re.compile(r"(\d{2}-\d{2}-\d{4})")  # dd-mm-aaaa
regex_precio = re.compile(r"([0-9]+,[0-9]+)")     # 3,25 por ejemplo

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

# Leer archivo histórico
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual_iso = None
pendiente = {k: None for k in data.keys()}

# Recorremos líneas del txt
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

    # Asociar precio a categoría
    if fecha_actual_iso:
        cat = categoria_de_linea(line)
        m_precio = regex_precio.search(line)
        if cat and m_precio:
            precio = normaliza_precio(m_precio.group(1))
            pendiente[cat] = precio
            data[cat].append({"fecha": fecha_actual_iso, "precio_eur_kg": precio})

# ---- Rellenar días faltantes ----
for cat in list(data.keys()):
    registros = sorted(data[cat], key=lambda d: d["fecha"])
    completos = []

    if not registros:
        continue

    fecha_inicio = datetime.strptime(registros[0]["fecha"], "%Y-%m-%d")
    fecha_fin = datetime.today()

    i = 0
    ultimo_precio = registros[0]["precio_eur_kg"]

    fecha = fecha_inicio
    while fecha <= fecha_fin:
        fecha_str = fecha.strftime("%Y-%m-%d")

        if i < len(registros) and registros[i]["fecha"] == fecha_str:
            ultimo_precio = registros[i]["precio_eur_kg"]
            completos.append({"fecha": fecha_str, "precio_eur_kg": ultimo_precio})
            i += 1
        else:
            # Día faltante → usar último precio conocido
            completos.append({"fecha": fecha_str, "precio_eur_kg": ultimo_precio})

        fecha += timedelta(days=1)

    data[cat] = completos

# Guardar JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(data, out, ensure_ascii=False, indent=2)

print(f"✅ OK → Generado {OUTPUT_FILE} con datos desde {data['Aceite de oliva virgen extra'][0]['fecha']} hasta {data['Aceite de oliva virgen extra'][-1]['fecha']}")

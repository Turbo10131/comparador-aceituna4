# convertir_historico.py
import re
import json
from collections import defaultdict

INPUT_FILE  = "historico.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Estructura final
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Fechas tipo 01-11-2012
regex_fecha   = re.compile(r"(\d{2}-\d{2}-\d{4})")
# Precios con coma decimal (2,345)
regex_precio  = re.compile(r"([0-9]+,[0-9]+)")

def normaliza_precio(txt: str) -> float:
    return float(txt.replace(",", ".").strip())

def to_iso(dmy: str) -> str:
    d, m, y = dmy.split("-")
    return f"{y}-{m}-{d}"

# Guardamos temporalmente: fecha -> tipo -> precio
tmp = defaultdict(dict)

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    fecha_actual = None

    for raw in f:
        line = raw.strip()
        if not line:
            continue

        # Detectar fecha
        m_fecha = regex_fecha.search(line)
        if m_fecha:
            fecha_actual = to_iso(m_fecha.group(1))
            continue

        if not fecha_actual:
            continue

        lower = line.lower()

        # Detectar precio
        m_precio = regex_precio.search(line)
        if not m_precio:
            continue

        precio = normaliza_precio(m_precio.group(1))

        # Clasificación básica por keywords
        if "virgen extra" in lower:
            tmp[fecha_actual]["Aceite de oliva virgen extra"] = precio
        elif "lampante" in lower:
            tmp[fecha_actual]["Aceite de oliva lampante"] = precio
        elif "virgen" in lower:  # cualquier virgen no-extra
            tmp[fecha_actual]["Aceite de oliva virgen"] = precio

# Pasar a la estructura final (ordenado por fecha)
for fecha in sorted(tmp.keys()):
    for tipo in data.keys():
        if tipo in tmp[fecha]:
            data[tipo].append({
                "fecha": fecha,
                "precio_eur_kg": tmp[fecha][tipo]
            })

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"OK → {OUTPUT_FILE} generado.")

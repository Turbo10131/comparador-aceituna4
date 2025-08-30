import json
import re
from datetime import datetime

# Rutas de entrada/salida
INPUT_FILE = "historico.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Diccionario inicial para guardar los datos
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Expresiones regulares
regex_fecha = re.compile(r"(\d{2}-\d{2}-\d{4})")  # formato DD-MM-YYYY
regex_precio = re.compile(r"([0-9]+\,[0-9]+)")   # precio con coma decimal

# Función para normalizar precio (de "2,345 €" a 2.345)
def normaliza_precio(txt):
    return float(txt.replace(",", "."))

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

fecha_actual = None

for line in lines:
    line = line.strip()

    # Detectar fechas
    if regex_fecha.search(line):
        fecha_actual = regex_fecha.search(line).group(1)
        # Convertimos a formato ISO (YYYY-MM-DD)
        fecha_actual = datetime.strptime(fecha_actual, "%d-%m-%Y").strftime("%Y-%m-%d")
        continue

    # Si no hay fecha actual, ignoramos
    if not fecha_actual:
        continue

    # Buscar precios en cada línea
    if "virgen extra" in line.lower():
        precio = regex_precio.search(line)
        if precio:
            data["Aceite de oliva virgen extra"].append({
                "fecha": fecha_actual,
                "precio_eur_kg": normaliza_precio(precio.group(1))
            })
    elif re.search(r"\bvirgen\b", line.lower()) and "extra" not in line.lower():
        precio = regex_precio.search(line)
        if precio:
            data["Aceite de oliva virgen"].append({
                "fecha": fecha_actual,
                "precio_eur_kg": normaliza_precio(precio.group(1))
            })
    elif "lampante" in line.lower():
        precio = regex_precio.search(line)
        if precio:
            data["Aceite de oliva lampante"].append({
                "fecha": fecha_actual,
                "precio_eur_kg": normaliza_precio(precio.group(1))
            })

# Guardar el JSON final
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ Archivo convertido y guardado en {OUTPUT_FILE}")

import json
from datetime import datetime, timedelta
import re

# Archivo TXT de entrada y JSON de salida
archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario para almacenar los precios
precios = {
    "virgen extra": {},
    "virgen": {},
    "lampante": {}
}

fecha_actual = None

with open(archivo_txt, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Detectar líneas de fecha (formato dd-mm-yyyy)
        try:
            fecha = datetime.strptime(line, "%d-%m-%Y").date()
            fecha_actual = fecha
            continue
        except ValueError:
            pass

        # Procesar líneas de precios
        for tipo in precios.keys():
            if tipo in line.lower():  # buscar "virgen extra", "virgen", "lampante"
                try:
                    # Buscar el primer número en la línea
                    match = re.search(r"(\d+[.,]?\d*)", line)
                    if not match:
                        raise ValueError("No se encontró número en la línea")

                    valor_str = match.group(1)
                    valor_str = valor_str.replace(",", ".").strip()
                    precio = float(valor_str)

                    precios[tipo][str(fecha_actual)] = precio
                except Exception as e:
                    print(f"⚠️ No se pudo procesar la línea: {line} ({e})")
                break

# --- Rellenar días faltantes con el precio anterior ---
fecha_inicio = min(
    datetime.strptime(d, "%Y-%m-%d") for d in precios["virgen extra"].keys()
)
fecha_fin = max(
    datetime.strptime(d, "%Y-%m-%d") for d in precios["virgen extra"].keys()
)

fecha = fecha_inicio
while fecha <= fecha_fin:
    fecha_str = str(fecha.date())
    for tipo in precios.keys():
        if fecha_str not in precios[tipo]:
            # copiar precio del día anterior si existe
            dia_anterior = (fecha - timedelta(days=1)).date()
            if str(dia_anterior) in precios[tipo]:
                precios[tipo][fecha_str] = precios[tipo][str(dia_anterior)]
    fecha += timedelta(days=1)

# --- Guardar en JSON ---
with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(precios, f, ensure_ascii=False, indent=2)

print(f"✅ Histórico convertido y guardado en {archivo_json}")

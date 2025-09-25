# actualizar_historico_completo.py
# Combina los datos históricos desde 2015 con los precios diarios actuales.
# Rellena días faltantes y mantiene actualizado "precio-aceite-historico.json".

import json
from datetime import datetime, timedelta
import os

FILE_BASE = "precio-aceite-historico.json"   # histórico completo inicial (ya generado desde 2015)
FILE_ACTUAL = "precio-aceite.json"           # tabla principal diaria

# Si no existe el histórico base, lo inicializamos vacío
if not os.path.exists(FILE_BASE):
    historico = {
        "Aceite de oliva virgen extra": [],
        "Aceite de oliva virgen": [],
        "Aceite de oliva lampante": []
    }
else:
    with open(FILE_BASE, "r", encoding="utf-8") as f:
        historico = json.load(f)

# Cargar precios actuales
with open(FILE_ACTUAL, "r", encoding="utf-8") as f:
    actual = json.load(f)

fecha_hoy = datetime.today().strftime("%Y-%m-%d")

for categoria in historico.keys():
    precio = actual["precios"].get(categoria, {}).get("precio_eur_kg", None)

    if precio is None:
        continue

    # Rellenar días faltantes desde la última fecha registrada
    if historico[categoria]:
        ultima_fecha = datetime.strptime(historico[categoria][-1]["fecha"], "%Y-%m-%d")
        current_date = ultima_fecha + timedelta(days=1)
        last_precio = historico[categoria][-1]["precio_eur_kg"]

        while current_date.strftime("%Y-%m-%d") < fecha_hoy:
            historico[categoria].append({
                "fecha": current_date.strftime("%Y-%m-%d"),
                "precio_eur_kg": last_precio
            })
            current_date += timedelta(days=1)

    # Añadir el precio de hoy
    if not historico[categoria] or historico[categoria][-1]["fecha"] != fecha_hoy:
        historico[categoria].append({
            "fecha": fecha_hoy,
            "precio_eur_kg": precio
        })

# Guardar histórico actualizado
with open(FILE_BASE, "w", encoding="utf-8") as f:
    json.dump(historico, f, ensure_ascii=False, indent=2)

print("✅ Histórico actualizado en", FILE_BASE)

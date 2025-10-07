import json
from datetime import datetime

# ==============================
# Cargar precios actuales del día
# ==============================
with open("precio-aceite.json", encoding="utf-8") as f:
    data = json.load(f)

# Intentar acceder a la estructura de precios
precios = data.get("precios", data)

# Obtener precios según las claves reales
ve = precios.get("Aceite de oliva virgen extra", {}).get("precio_eur_kg")
v = precios.get("Aceite de oliva virgen", {}).get("precio_eur_kg")
l = precios.get("Aceite de oliva lampante", {}).get("precio_eur_kg")

# ==============================
# Leer histórico existente
# ==============================
with open("precios2015.txt", encoding="utf-8") as f:
    contenido = f.read().strip().splitlines()

# ==============================
# Fecha de hoy
# ==============================
fecha_hoy = datetime.now().strftime("%d-%m-%Y")

# ==============================
# Evitar duplicar fecha
# ==============================
if any(fecha_hoy in line for line in contenido):
    print(f"📅 {fecha_hoy} ya existe en el histórico, no se agrega.")
    exit(0)

# ==============================
# Crear bloque nuevo
# ==============================
nuevo_bloque = [
    fecha_hoy,
    f"Aceite de oliva virgen extra {ve:.3f}",
    f"Aceite de oliva virgen {v:.3f}",
    f"Aceite de oliva lampante {l:.3f}",
]

# ==============================
# Añadir al final del archivo
# ==============================
with open("precios2015.txt", "a", encoding="utf-8") as f:
    f.write("\n" + "\n".join(nuevo_bloque) + "\n")

print(f"✅ Histórico actualizado correctamente con precios del {fecha_hoy}")


import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario para guardar precios
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

# Leer el TXT y parsear
with open(archivo_txt, "r", encoding="utf-8") as f:
    lineas = f.readlines()

fecha_actual = None
for linea in lineas:
    linea = linea.strip()
    if not linea:
        continue

    # Detectar fechas (ejemplo: 25-09-2025)
    try:
        fecha_actual = datetime.strptime(linea, "%d-%m-%Y").date()
        continue
    except ValueError:
        pass  # no es fecha, seguimos

    # Detectar precios de cada tipo de aceite
    if "virgen extra" in linea.lower():
        tipo = "Aceite de oliva virgen extra"
    elif "virgen" in linea.lower() and "extra" not in linea.lower():
        tipo = "Aceite de oliva virgen"
    elif "lampante" in linea.lower():
        tipo = "Aceite de oliva lampante"
    else:
        continue  # ignorar cabeceras como "Tipo de aceite de oliva..."

    try:
        # Última columna con el precio
        precio_str = linea.split()[-1].replace("€", "").replace(",", ".")
        precio = float(precio_str)
    except ValueError:
        continue  # si no se puede convertir, saltamos

    precios[tipo][fecha_actual.isoformat()] = precio

# Rellenar días faltantes con último valor
fecha_inicio = min(min(map(datetime.fromisoformat, d.keys())) for d in precios.values())
fecha_fin = datetime.today().date()

for tipo, datos in precios.items():
    fechas = sorted(datetime.fromisoformat(f) for f in datos.keys())
    precios_completos = {}
    precio_ultimo = None
    fecha = fecha_inicio.date()
    while fecha <= fecha_fin:
        fecha_str = fecha.isoformat()
        if fecha_str in datos:
            precio_ultimo = datos[fecha_str]
        if precio_ultimo is not None:
            precios_completos[fecha_str] = precio_ultimo
        fecha += timedelta(days=1)
    precios[tipo] = precios_completos

# Convertir a formato JSON final
salida = {}
for tipo, datos in precios.items():
    salida[tipo] = [{"fecha": f, "precio_eur_kg": p} for f, p in sorted(datos.items())]

with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=2)

print(f"✅ Archivo JSON generado: {archivo_json}")

import json
from datetime import datetime, timedelta

# Archivo TXT original
input_file = "precios 2015.txt"
# Archivo JSON destino
output_file = "precio-aceite-historico.json"

# Diccionario para guardar datos
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

# --- PARTE 1: Leer y limpiar TXT ---
with open(input_file, "r", encoding="utf-8") as f:
    lineas = f.readlines()

fecha_actual = None
for linea in lineas:
    linea = linea.strip()

    # Saltar encabezados o líneas vacías
    if not linea or "Tipo de aceite" in linea or "Precio" in linea:
        continue

    # Si la línea tiene formato de fecha (dd-mm-yyyy)
    try:
        fecha_actual = datetime.strptime(linea, "%d-%m-%Y").date()
        continue
    except ValueError:
        pass

    # Procesar precios
    if "€" in linea and fecha_actual:
        partes = linea.split()
        tipo = " ".join(partes[0:4])  # "Aceite de oliva virgen extra", etc.
        try:
            precio = float(partes[-2].replace(".", "").replace(",", "."))
        except ValueError:
            # Línea no válida, ignoramos
            continue

        if tipo in precios:
            precios[tipo][fecha_actual] = precio

# --- PARTE 2: Rellenar días faltantes ---
fecha_inicio = min(min(d.keys()) for d in precios.values() if d)
fecha_fin = datetime.now().date()

for tipo, datos in precios.items():
    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        if fecha in datos:
            ultimo_precio = datos[fecha]
        elif ultimo_precio is not None:
            datos[fecha] = ultimo_precio
        fecha += timedelta(days=1)

# --- PARTE 3: Exportar a JSON ---
resultado = {}
for tipo, datos in precios.items():
    resultado[tipo] = [
        {"fecha": fecha.strftime("%Y-%m-%d"), "precio_eur_kg": precio}
        for fecha, precio in sorted(datos.items())
    ]

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(resultado, f, indent=2, ensure_ascii=False)

print(f"✅ Histórico convertido y guardado en {output_file}")

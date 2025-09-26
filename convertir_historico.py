import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Diccionario para almacenar los precios
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

# Leer archivo línea por línea
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    fecha_actual = None
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Detectar fechas (formato dd-mm-yyyy o yyyy-mm-dd)
        try:
            if "-" in line and len(line) == 10:
                fecha_actual = datetime.strptime(line, "%d-%m-%Y").date()
                continue
        except ValueError:
            pass

        # Procesar precios solo si hay fecha
        if fecha_actual:
            try:
                if "virgen extra" in line.lower():
                    tipo = "Aceite de oliva virgen extra"
                elif "virgen" in line.lower() and "extra" not in line.lower():
                    tipo = "Aceite de oliva virgen"
                elif "lampante" in line.lower():
                    tipo = "Aceite de oliva lampante"
                else:
                    continue  # ignorar líneas irrelevantes

                # Extraer último valor que termina en €
                partes = line.split()
                precio_str = partes[-1].replace("€", "").replace(",", ".")
                precio = float(precio_str)

                precios[tipo][str(fecha_actual)] = precio
            except Exception as e:
                print(f"⚠️ No se pudo procesar la línea: {line} ({e})")
                continue

# Rellenar días faltantes con el último precio conocido
for tipo, datos in precios.items():
    if not datos:
        continue

    fechas = sorted(datetime.strptime(f, "%Y-%m-%d").date() for f in datos.keys())
    fecha_inicio = fechas[0]
    fecha_fin = fechas[-1]

    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        fecha_str = str(fecha)
        if fecha_str in datos:
            ultimo_precio = datos[fecha_str]
        elif ultimo_precio is not None:
            datos[fecha_str] = ultimo_precio
        fecha += timedelta(days=1)

# Guardar en JSON
salida = {tipo: [{"fecha": f, "precio_eur_kg": datos[f]} for f in sorted(datos.keys())] for tipo, datos in precios.items()}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=2)

print(f"✅ Archivo {OUTPUT_FILE} generado con éxito.")

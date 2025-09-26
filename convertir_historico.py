import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario de salida
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

fecha_actual = None

with open(archivo_txt, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()

        # Saltar encabezados o líneas vacías
        if not line or line.startswith("Tipo de aceite"):
            continue

        # Detectar fecha (formato dd-mm-YYYY)
        try:
            fecha_actual = datetime.strptime(line, "%d-%m-%Y").date()
            continue
        except ValueError:
            pass

        # Procesar líneas con datos de precios
        partes = line.split()
        if len(partes) < 2:
            continue

        tipo = " ".join(partes[0:4])  # Ejemplo: "Aceite de oliva virgen extra"
        precio_str = partes[-2].replace(",", ".").replace("€", "").strip()

        # Ignorar líneas con "Sin cierre de operaciones" u otros textos
        if not precio_str.replace(".", "", 1).isdigit():
            print(f"⚠️ Línea ignorada (sin precio): {line}")
            continue

        precio = float(precio_str)

        # Guardar en el diccionario
        if "virgen extra" in tipo:
            precios["Aceite de oliva virgen extra"][str(fecha_actual)] = precio
        elif tipo.startswith("Aceite de oliva virgen "):  # virgen normal
            precios["Aceite de oliva virgen"][str(fecha_actual)] = precio
        elif "lampante" in tipo:
            precios["Aceite de oliva lampante"][str(fecha_actual)] = precio

# Rellenar días faltantes con el último valor conocido
for categoria, datos in precios.items():
    if not datos:
        continue

    fechas = sorted(datetime.strptime(d, "%Y-%m-%d").date() for d in datos.keys())
    fecha_inicio, fecha_fin = fechas[0], fechas[-1]

    ultima_fecha = fecha_inicio
    ultimo_precio = datos[str(ultima_fecha)]

    while ultima_fecha <= fecha_fin:
        fecha_str = str(ultima_fecha)
        if fecha_str not in datos:
            datos[fecha_str] = ultimo_precio
        else:
            ultimo_precio = datos[fecha_str]
        ultima_fecha += timedelta(days=1)

# Guardar en JSON
with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump({k: [{"fecha": d, "precio_eur_kg": v} for d, v in sorted(datos.items())] for k, datos in precios.items()},
              f, ensure_ascii=False, indent=2)

print(f"✅ Archivo JSON generado: {archivo_json}")

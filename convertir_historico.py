import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

precios = {}
fecha_actual = None

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Saltar cabeceras o líneas que no tienen precio
        if line.startswith("Tipo de aceite") or line.endswith("operaciones"):
            continue

        try:
            partes = line.split()

            # Si la línea es una fecha
            if len(partes) == 1 and "-" in partes[0]:
                fecha_actual = partes[0]
                continue

            # Si no hay fecha asociada aún, ignoramos
            if not fecha_actual:
                continue

            # Última columna = precio, penúltima puede ser variedad
            precio_str = partes[-1].replace("€", "").replace(",", ".")
            precio = float(precio_str)

            tipo = " ".join(partes[:-2])  # todo lo que no sea precio
            if not tipo:
                continue

            if tipo not in precios:
                precios[tipo] = {}

            precios[tipo][fecha_actual] = precio

        except Exception as e:
            print(f"⚠️ No se pudo procesar la línea: {line} ({e})")

# --- Rellenar días faltantes con último precio conocido ---
precios_completos = {}
for tipo, datos in precios.items():
    fechas = sorted(datos.keys())
    if not fechas:
        continue

    fecha_inicio = datetime.strptime(fechas[0], "%d-%m-%Y")
    fecha_fin = datetime.today()
    precios_completos[tipo] = {}

    ultima_fecha = fecha_inicio
    ultimo_precio = None

    while ultima_fecha <= fecha_fin:
        fecha_str = ultima_fecha.strftime("%Y-%m-%d")
        fecha_txt = ultima_fecha.strftime("%d-%m-%Y")

        if fecha_txt in datos:
            ultimo_precio = datos[fecha_txt]

        if ultimo_precio is not None:
            precios_completos[tipo][fecha_str] = ultimo_precio

        ultima_fecha += timedelta(days=1)

# --- Guardar en JSON ---
output = {}
for tipo, datos in precios_completos.items():
    output[tipo] = [
        {"fecha": f, "precio_eur_kg": p}
        for f, p in sorted(datos.items())
    ]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ Histórico convertido y guardado en {OUTPUT_FILE}")

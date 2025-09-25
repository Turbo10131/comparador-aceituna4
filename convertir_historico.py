import json
from datetime import datetime, timedelta

INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

fecha_actual = None

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Detectar si la línea es una fecha (dd-mm-yyyy)
        try:
            fecha_actual = datetime.strptime(line, "%d-%m-%Y").date()
            continue
        except ValueError:
            pass

        # Procesar línea de precios
        try:
            partes = line.split()
            tipo = " ".join(partes[0:4])  # ejemplo: "Aceite de oliva virgen extra"
            precio_str = partes[-2]       # ejemplo: "4.080" ó "Sin"
            
            # Saltar si no hay precio
            if not precio_str.replace(".", "").isdigit():
                print(f"⚠️ Línea ignorada (sin precio): {line}")
                continue

            precio = float(precio_str.replace(".", "").replace(",", "."))
            
            if tipo in precios:
                precios[tipo][str(fecha_actual)] = round(precio, 3)
            else:
                print(f"⚠️ Tipo de aceite desconocido: {tipo}")

        except Exception as e:
            print(f"⚠️ No se pudo procesar la línea: {line} ({e})")

# Rellenar días faltantes copiando el último precio conocido
fecha_inicio = min(min(map(datetime.fromisoformat, d.keys())) for d in precios.values() if d)
fecha_fin = datetime.today().date()

for tipo, datos in precios.items():
    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        fecha_str = str(fecha)
        if fecha_str in datos:
            ultimo_precio = datos[fecha_str]
        elif ultimo_precio is not None:
            datos[fecha_str] = ultimo_precio
        fecha += timedelta(days=1)

# Convertir a listas ordenadas
output = {}
for tipo, datos in precios.items():
    output[tipo] = [
        {"fecha": fecha, "precio_eur_kg": precio}
        for fecha, precio in sorted(datos.items())
    ]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ Histórico convertido y guardado en {OUTPUT_FILE}")
for tipo, datos in output.items():
    print(f"📊 {tipo}: {len(datos)} registros")

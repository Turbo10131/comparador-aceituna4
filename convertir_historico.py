import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Diccionario para guardar los precios
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

# Función auxiliar para limpiar y convertir el precio
def limpiar_precio(texto):
    return float(
        texto.replace("€", "")
             .replace(" ", "")
             .replace(",", ".")
    )

# Leer el archivo TXT
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    fecha_actual = None
    for linea in f:
        linea = linea.strip()
        if not linea:
            continue

        # Detectar fecha (formato DD-MM-YYYY o similar)
        try:
            fecha_actual = datetime.strptime(linea, "%d-%m-%Y").date()
            continue
        except ValueError:
            pass  # no es fecha, seguimos procesando

        # Detectar tipo de aceite
        linea_lower = linea.lower()
        if "virgen extra" in linea_lower:
            tipo = "Aceite de oliva virgen extra"
        elif "lampante" in linea_lower:
            tipo = "Aceite de oliva lampante"
        elif "virgen" in linea_lower:
            tipo = "Aceite de oliva virgen"
        else:
            continue

        # Extraer precio (última columna)
        try:
            precio_str = linea.split()[-1]
            precio = limpiar_precio(precio_str)
            if fecha_actual:
                precios[tipo][str(fecha_actual)] = precio
        except Exception as e:
            print(f"⚠️ No se pudo procesar la línea: {linea} ({e})")

# Verificar que tenemos datos
if not any(precios.values()):
    raise ValueError("❌ No se encontraron datos válidos en el archivo TXT.")

# Calcular fechas mínimas y máximas
fechas_validas = [
    min(map(datetime.fromisoformat, d.keys()))
    for d in precios.values() if d
]
fecha_inicio = min(fechas_validas).date()
fecha_fin = datetime.today().date()

# Rellenar días faltantes con el precio del día anterior
for tipo, datos in precios.items():
    if not datos:
        continue

    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        fecha_str = str(fecha)
        if fecha_str in datos:
            ultimo_precio = datos[fecha_str]
        elif ultimo_precio is not None:
            datos[fecha_str] = ultimo_precio
        fecha += timedelta(days=1)

# Guardar en JSON final
json_final = {
    tipo: [{"fecha": f, "precio_eur_kg": p}
           for f, p in sorted(datos.items())]
    for tipo, datos in precios.items()
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(json_final, f, ensure_ascii=False, indent=2)

print(f"✅ Histórico convertido y guardado en {OUTPUT_FILE}")

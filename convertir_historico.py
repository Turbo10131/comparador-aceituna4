import json
import datetime

# Archivo de entrada y salida
INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

# Inicializamos estructura
data = {
    "Aceite de oliva virgen extra": [],
    "Aceite de oliva virgen": [],
    "Aceite de oliva lampante": []
}

# Leer archivo txt
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

current_date = None
for line in lines:
    line = line.strip()
    if not line:
        continue

    # Detectar fecha (formato dd-mm-aaaa o similar)
    if "-" in line and "€" not in line:
        try:
            current_date = datetime.datetime.strptime(line, "%d-%m-%Y").date()
        except ValueError:
            try:
                current_date = datetime.datetime.strptime(line, "%Y-%m-%d").date()
            except:
                continue
        continue

    # Procesar precios
    if "virgen extra" in line.lower():
        precio = float(line.split()[-2].replace(",", "."))
        data["Aceite de oliva virgen extra"].append({"fecha": str(current_date), "precio_eur_kg": precio})
    elif "virgen " in line.lower() and "extra" not in line.lower():
        precio = float(line.split()[-2].replace(",", "."))
        data["Aceite de oliva virgen"].append({"fecha": str(current_date), "precio_eur_kg": precio})
    elif "lampante" in line.lower():
        precio = float(line.split()[-2].replace(",", "."))
        data["Aceite de oliva lampante"].append({"fecha": str(current_date), "precio_eur_kg": precio})

# Función para rellenar días faltantes
def rellenar_faltantes(lista):
    lista_ordenada = sorted(lista, key=lambda x: x["fecha"])
    completas = []
    fecha_inicio = datetime.datetime.strptime(lista_ordenada[0]["fecha"], "%Y-%m-%d").date()
    fecha_fin = datetime.date.today()
    precios = {item["fecha"]: item["precio_eur_kg"] for item in lista_ordenada}
    
    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        fecha_str = str(fecha)
        if fecha_str in precios:
            ultimo_precio = precios[fecha_str]
        if ultimo_precio is not None:
            completas.append({"fecha": fecha_str, "precio_eur_kg": ultimo_precio})
        fecha += datetime.timedelta(days=1)
    return completas

# Aplicar relleno a cada categoría
for key in data:
    data[key] = rellenar_faltantes(data[key])

# Guardar JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ JSON generado con histórico desde 2015 hasta hoy: {OUTPUT_FILE}")

import json
from datetime import datetime, timedelta

# Archivo de entrada y salida
archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario para almacenar datos
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

fecha_actual = None

with open(archivo_txt, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Detectar fechas (ej: 25-09-2025)
        try:
            fecha_actual = datetime.strptime(line, "%d-%m-%Y").date()
            continue
        except ValueError:
            pass

        # Ignorar cabecera
        if "Tipo de aceite" in line or "€/kg" in line:
            continue

        # Procesar líneas de precios
        for tipo in precios.keys():
            if tipo in line:
                try:
                    # Extraer precio (último elemento de la línea)
                    partes = line.split()
                    valor_str = partes[-1]
                    valor_str = valor_str.replace("€", "").replace("/kg", "").replace(",", ".").strip()
                    precio = float(valor_str)

                    precios[tipo][str(fecha_actual)] = precio
                except Exception as e:
                    print(f"⚠️ No se pudo procesar la línea: {line} ({e})")
                break

# Rellenar días faltantes con el último precio conocido
fecha_inicio = min(datetime.strptime(d, "%Y-%m-%d") for d in precios["Aceite de oliva virgen extra"].keys())
fecha_fin = datetime.today().date()

for tipo, datos in precios.items():
    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        clave = str(fecha)
        if clave in datos:
            ultimo_precio = datos[clave]
        elif ultimo_precio is not None:
            datos[clave] = ultimo_precio
        fecha += timedelta(days=1)

# Convertir a lista para JSON
precios_json = {tipo: [{"fecha": fecha, "precio_eur_kg": precio}
                       for fecha, precio in sorted(datos.items())]
                for tipo, datos in precios.items()}

# Guardar archivo JSON
with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(precios_json, f, ensure_ascii=False, indent=2)

print(f"✅ Histórico convertido y guardado en {archivo_json}")

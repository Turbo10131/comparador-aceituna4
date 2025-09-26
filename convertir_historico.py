import json
from datetime import datetime, timedelta

archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario para almacenar precios
precios = {
    "Aceite de oliva virgen extra": {},
    "Aceite de oliva virgen": {},
    "Aceite de oliva lampante": {}
}

# Mapear claves válidas
tipos_validos = {
    "aceite de oliva virgen extra": "Aceite de oliva virgen extra",
    "aceite de oliva virgen": "Aceite de oliva virgen",
    "aceite de oliva lampante": "Aceite de oliva lampante"
}

fecha_actual = None

with open(archivo_txt, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Si la línea es una fecha
        try:
            fecha_actual = datetime.strptime(line, "%d-%m-%Y").strftime("%Y-%m-%d")
            continue
        except ValueError:
            pass

        # Detectar tipo de aceite
        linea_lower = line.lower()
        tipo_detectado = None
        for clave, nombre in tipos_validos.items():
            if clave in linea_lower:
                tipo_detectado = nombre
                break

        if not tipo_detectado or not fecha_actual:
            print(f"⚠️ Línea ignorada: {line}")
            continue

        try:
            # El precio siempre es el último valor
            precio_str = line.split()[-1].replace("€", "").replace(",", ".")
            precio = float(precio_str)
            precios[tipo_detectado][fecha_actual] = precio
        except Exception as e:
            print(f"⚠️ No se pudo procesar la línea: {line} ({e})")

# Rellenar días faltantes con el precio anterior
fecha_inicio = min(
    min(datetime.strptime(k, "%Y-%m-%d") for k in d.keys())
    for d in precios.values() if d
)
fecha_fin = datetime.today()

for tipo, datos in precios.items():
    fecha = fecha_inicio
    ultimo_precio = None
    while fecha <= fecha_fin:
        fecha_str = fecha.strftime("%Y-%m-%d")
        if fecha_str in datos:
            ultimo_precio = datos[fecha_str]
        elif ultimo_precio is not None:
            datos[fecha_str] = ultimo_precio
        fecha += timedelta(days=1)

# Guardar en JSON
precios_json = {
    tipo: [{"fecha": fecha, "precio_eur_kg": precio} for fecha, precio in sorted(datos.items())]
    for tipo, datos in precios.items()
}

with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(precios_json, f, indent=2, ensure_ascii=False)

print(f"✅ Archivo JSON generado: {archivo_json}")

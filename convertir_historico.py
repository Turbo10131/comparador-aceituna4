import json
from datetime import datetime, timedelta

# Archivos
archivo_txt = "precios 2015.txt"
archivo_json = "precio-aceite-historico.json"

# Diccionario base
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

        # Detectar fecha (formato dd-mm-YYYY)
        try:
            fecha_actual = datetime.strptime(line, "%d-%m-%Y").date()
            continue
        except ValueError:
            pass

        # Procesar líneas con precios
        try:
            if "€" in line:
                partes = line.split()
                tipo = " ".join(partes[:-2])  # texto sin el precio
                precio_str = partes[-2].replace(".", "").replace(",", ".")
                precio = float(precio_str)

                tipo_lower = tipo.lower()

                # Clasificación robusta
                if "virgen extra" in tipo_lower:
                    precios["Aceite de oliva virgen extra"][str(fecha_actual)] = precio
                elif "virgen" in tipo_lower and "extra" not in tipo_lower:
                    precios["Aceite de oliva virgen"][str(fecha_actual)] = precio
                elif "lampante" in tipo_lower:
                    precios["Aceite de oliva lampante"][str(fecha_actual)] = precio
                else:
                    print(f"⚠️ Tipo no reconocido en línea: {line}")

        except Exception as e:
            print(f"⚠️ No se pudo procesar la línea: {line} ({e})")

# Rellenar días faltantes con el precio del día anterior
for tipo, datos in precios.items():
    if not datos:
        continue

    fechas_ordenadas = sorted(datetime.strptime(f, "%Y-%m-%d").date() for f in datos.keys())
    fecha_inicio = min(fechas_ordenadas)
    fecha_fin = max(fechas_ordenadas)

    fecha_iter = fecha_inicio
    ultimo_precio = None

    while fecha_iter <= fecha_fin:
        fecha_str = str(fecha_iter)
        if fecha_str in datos:
            ultimo_precio = datos[fecha_str]
        elif ultimo_precio is not None:
            datos[fecha_str] = ultimo_precio
        fecha_iter += timedelta(days=1)

    precios[tipo] = dict(sorted(datos.items()))

# Guardar en JSON
with open(archivo_json, "w", encoding="utf-8") as f:
    json.dump(precios, f, indent=2, ensure_ascii=False)

print(f"✅ Histórico convertido y guardado en {archivo_json}")

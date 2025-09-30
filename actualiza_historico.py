import json
from datetime import datetime

# Archivos
JSON_FILE = "precio-aceite.json"
HISTORICO_FILE = "precios 2015.txt"

def main():
    # 1. Leer JSON con los precios del día
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    fecha_raw = data.get("fecha")
    precios = data.get("precios", {})

    # Convertir fecha a formato DD-MM-YYYY
    try:
        fecha = datetime.strptime(fecha_raw, "%Y-%m-%d %H:%M:%S").strftime("%d-%m-%Y")
    except Exception:
        fecha = datetime.now().strftime("%d-%m-%Y")

    # Extraer precios
    ve = precios.get("Aceite de oliva virgen extra", {}).get("precio_eur_kg", "")
    v  = precios.get("Aceite de oliva virgen", {}).get("precio_eur_kg", "")
    l  = precios.get("Aceite de oliva lampante", {}).get("precio_eur_kg", "")

    # Línea con formato correcto
    bloque = [
        fecha,
        f"Aceite de oliva virgen extra {ve:.3f}" if ve else "",
        f"Aceite de oliva virgen {v:.3f}" if v else "",
        f"Aceite de oliva lampante {l:.3f}" if l else "",
        ""
    ]

    # 2. Leer histórico actual
    try:
        with open(HISTORICO_FILE, "r", encoding="utf-8") as f:
            lineas = f.read().splitlines()
    except FileNotFoundError:
        lineas = []

    # 3. Buscar si la fecha ya existe en el archivo
    nueva_lineas = []
    i = 0
    actualizado = False
    while i < len(lineas):
        if lineas[i].strip() == fecha:
            # Sustituimos bloque antiguo por el nuevo
            nueva_lineas.extend(bloque)
            i += 4  # saltar el bloque viejo (fecha + 3 precios)
            actualizado = True
        else:
            nueva_lineas.append(lineas[i])
            i += 1

    # Si no estaba la fecha → añadir al final
    if not actualizado:
        nueva_lineas.extend(bloque)

    # 4. Guardar de nuevo el archivo
    with open(HISTORICO_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(nueva_lineas))

    print(f"✅ Histórico actualizado para {fecha}")

if __name__ == "__main__":
    main()


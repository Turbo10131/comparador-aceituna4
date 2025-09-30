import json
from datetime import datetime

# Rutas de archivos
ARCHIVO_ACTUAL = "precio-aceite.json"
ARCHIVO_HISTORICO = "precios 2015.txt"

def main():
    try:
        # Leer precios actuales
        with open(ARCHIVO_ACTUAL, "r", encoding="utf-8") as f:
            datos = json.load(f)

        fecha_raw = datos.get("fecha", "")
        fecha = fecha_raw.split(" ")[0] if fecha_raw else datetime.now().strftime("%Y-%m-%d")
        precios = datos.get("precios", {})

        # Generar líneas con los precios
        lineas = [
            fecha,
            f"Aceite de oliva virgen extra {precios.get('Aceite de oliva virgen extra', {}).get('precio_eur_kg', '—')}",
            f"Aceite de oliva virgen {precios.get('Aceite de oliva virgen', {}).get('precio_eur_kg', '—')}",
            f"Aceite de oliva lampante {precios.get('Aceite de oliva lampante', {}).get('precio_eur_kg', '—')}",
            ""
        ]

        # Comprobar si ya existe esta fecha en el histórico
        with open(ARCHIVO_HISTORICO, "r", encoding="utf-8") as f:
            contenido = f.read()

        if fecha in contenido:
            print(f"[INFO] La fecha {fecha} ya existe en el histórico. No se añade.")
            return

        # Añadir al archivo histórico
        with open(ARCHIVO_HISTORICO, "a", encoding="utf-8") as f:
            f.write("\n".join(lineas) + "\n")

        print(f"[OK] Histórico actualizado con precios del {fecha}")

    except Exception as e:
        print(f"[ERROR] No se pudo actualizar el histórico: {e}")

if __name__ == "__main__":
    main()

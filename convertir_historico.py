import json
from datetime import datetime

INPUT_FILE = "precios 2015.txt"   # ya validado
OUTPUT_FILE = "precio-aceite-historico.json"

def leer_precios(file_path):
    precios = {
        "Aceite de oliva virgen extra": [],
        "Aceite de oliva virgen": [],
        "Aceite de oliva lampante": []
    }

    with open(file_path, "r", encoding="utf-8") as f:
        lineas = [line.strip() for line in f if line.strip()]

    i = 0
    while i < len(lineas):
        fecha_str = lineas[i]
        try:
            fecha = datetime.strptime(fecha_str, "%d-%m-%Y").strftime("%Y-%m-%d")
        except ValueError:
            i += 1
            continue

        if i + 3 <= len(lineas):
            try:
                extra = lineas[i+1].split()[-1].replace(",", ".")
                virgen = lineas[i+2].split()[-1].replace(",", ".")
                lampante = lineas[i+3].split()[-1].replace(",", ".")

                precios["Aceite de oliva virgen extra"].append({
                    "fecha": fecha,
                    "precio_eur_kg": float(extra)
                })
                precios["Aceite de oliva virgen"].append({
                    "fecha": fecha,
                    "precio_eur_kg": float(virgen)
                })
                precios["Aceite de oliva lampante"].append({
                    "fecha": fecha,
                    "precio_eur_kg": float(lampante)
                })
            except Exception as e:
                print(f"⚠️ Error procesando precios en {fecha_str}: {e}")
        i += 4

    return precios

if __name__ == "__main__":
    datos = leer_precios(INPUT_FILE)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

    print(f"✅ Archivo convertido correctamente → {OUTPUT_FILE}")
    print(f"  {len(datos['Aceite de oliva virgen extra'])} registros de virgen extra")
    print(f"  {len(datos['Aceite de oliva virgen'])} registros de virgen")
    print(f"  {len(datos['Aceite de oliva lampante'])} registros de lampante")

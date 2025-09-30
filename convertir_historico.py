import json
from datetime import datetime

INPUT_FILE = "precios2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

def convertir():
    historico = []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lineas = [line.strip() for line in f if line.strip()]

    i = 0
    while i < len(lineas):
        try:
            # La primera línea es la fecha
            fecha_str = lineas[i]
            fecha = datetime.strptime(fecha_str, "%d-%m-%Y").date().isoformat()

            # Las tres siguientes son precios
            ve_line = lineas[i+1]
            v_line  = lineas[i+2]
            l_line  = lineas[i+3]

            ve = float(ve_line.split()[-1])
            v  = float(v_line.split()[-1])
            l  = float(l_line.split()[-1])

            historico.append({
                "fecha": fecha,
                "Aceite de oliva virgen extra": ve,
                "Aceite de oliva virgen": v,
                "Aceite de oliva lampante": l
            })

            i += 4  # saltamos a la siguiente fecha
        except Exception as e:
            print(f"⚠️ Error en bloque a partir de la línea {i+1}: {e}")
            i += 1  # avanzamos para no quedar en bucle infinito

    # Ordenar por fecha ascendente
    historico.sort(key=lambda x: x["fecha"])

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(historico, f, indent=2, ensure_ascii=False)

    print(f"✅ Histórico generado: {OUTPUT_FILE} con {len(historico)} registros")

if __name__ == "__main__":
    convertir()

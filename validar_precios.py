import datetime

INPUT_FILE = "precios_limpios 2015.txt"
OUTPUT_FILE = "precios_limpios_validado.txt"

def leer_precios(file_path):
    precios = {}
    with open(file_path, "r", encoding="utf-8") as f:
        lineas = [line.strip() for line in f if line.strip()]
    
    i = 0
    while i < len(lineas):
        fecha = lineas[i]
        if i + 3 <= len(lineas):
            try:
                datetime.datetime.strptime(fecha, "%d-%m-%Y")
                extra = lineas[i+1].split()[-1]
                virgen = lineas[i+2].split()[-1]
                lampante = lineas[i+3].split()[-1]
                precios[fecha] = {
                    "virgen_extra": extra,
                    "virgen": virgen,
                    "lampante": lampante
                }
                i += 4
            except ValueError:
                i += 1
        else:
            i += 1
    return precios

def generar_fechas(fecha_inicio, fecha_fin):
    fechas = []
    actual = fecha_inicio
    while actual <= fecha_fin:
        fechas.append(actual.strftime("%d-%m-%Y"))
        actual += datetime.timedelta(days=1)
    return fechas

def validar_y_rellenar(precios, fecha_inicio, fecha_fin):
    fechas = generar_fechas(fecha_inicio, fecha_fin)
    precios_completos = {}
    ultimo_valido = None
    
    for fecha in fechas:
        if fecha in precios:
            precios_completos[fecha] = precios[fecha]
            ultimo_valido = precios[fecha]
        else:
            if ultimo_valido:
                precios_completos[fecha] = ultimo_valido
            else:
                # Si aún no hay precio válido, salta (solo puede pasar en el primer día)
                continue
    return precios_completos

def guardar_precios(precios, file_path):
    with open(file_path, "w", encoding="utf-8") as f:
        for fecha, valores in precios.items():
            f.write(f"{fecha}\n")
            f.write(f"Aceite de oliva virgen extra {valores['virgen_extra']}\n")
            f.write(f"Aceite de oliva virgen {valores['virgen']}\n")
            f.write(f"Aceite de oliva lampante {valores['lampante']}\n\n")

if __name__ == "__main__":
    fecha_inicio = datetime.date(2015, 1, 1)
    fecha_fin = datetime.date.today()  # hasta hoy

    precios = leer_precios(INPUT_FILE)
    precios_validos = validar_y_rellenar(precios, fecha_inicio, fecha_fin)
    guardar_precios(precios_validos, OUTPUT_FILE)

    print(f"✅ Archivo validado y guardado en {OUTPUT_FILE}")
    print(f"Total de días: {len(precios_validos)}")

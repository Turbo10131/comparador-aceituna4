import datetime

# Archivo único de trabajo (validado y sobreescrito en cada ejecución)
INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precios 2015.txt"

def leer_precios(file_path):
    precios = {}
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or "Aceite de oliva" not in line:
                continue

            try:
                partes = line.split()
                fecha = partes[0]
                tipo = " ".join(partes[1:-1])
                valor = partes[-1].replace(",", ".")
                
                # Detectar "Sin cierre de operaciones"
                if not valor.replace(".", "").isdigit():
                    precio = None  # Marcar como pendiente de rellenar
                else:
                    precio = float(valor)

                precios.setdefault(fecha, {})[tipo] = precio
            except Exception:
                continue
    return precios

def rellenar_faltantes(precios):
    fechas = sorted(precios.keys(), key=lambda x: datetime.datetime.strptime(x, "%d-%m-%Y"))
    fecha_inicio = datetime.datetime.strptime("01-01-2015", "%d-%m-%Y")
    fecha_fin = datetime.datetime.today()

    precios_completos = {}
    ultimo = {}

    while fecha_inicio <= fecha_fin:
        fecha_str = fecha_inicio.strftime("%d-%m-%Y")
        if fecha_str in precios:
            precios_completos[fecha_str] = {}
            for tipo, precio in precios[fecha_str].items():
                if precio is None:  
                    # Si no hay precio, usar último conocido para ese tipo
                    if tipo in ultimo:
                        precios_completos[fecha_str][tipo] = ultimo[tipo]
                else:
                    precios_completos[fecha_str][tipo] = precio
                    ultimo[tipo] = precio
        else:
            # Día faltante: copiar último conocido
            precios_completos[fecha_str] = ultimo.copy()
        fecha_inicio += datetime.timedelta(days=1)

    return precios_completos

def guardar_precios(precios, file_path):
    with open(file_path, "w", encoding="utf-8") as f:
        for fecha, tipos in precios.items():
            for tipo, precio in tipos.items():
                f.write(f"{fecha} {tipo} {precio:.3f}\n")

if __name__ == "__main__":
    precios = leer_precios(INPUT_FILE)
    precios_completos = rellenar_faltantes(precios)
    guardar_precios(precios_completos, OUTPUT_FILE)
    print(f"Archivo validado y sobrescrito: {OUTPUT_FILE}")

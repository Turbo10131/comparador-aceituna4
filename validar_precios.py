import datetime

INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precios_limpios_validado.txt"

def leer_precios(file_path):
    precios = {}
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("Tipo de aceite"):
                continue  

            partes = line.split()
            if len(partes) < 3:
                continue  

            # Detectar si la primera parte es fecha
            try:
                datetime.datetime.strptime(partes[0], "%d-%m-%Y")
                fecha = partes[0]
                tipo = " ".join(partes[1:-1]).lower()
                precio_str = partes[-1].replace("€", "").replace(",", ".")
                try:
                    precio = float(precio_str)
                except ValueError:
                    precio = None
                if fecha not in precios:
                    precios[fecha] = {}
                precios[fecha][tipo] = precio
            except ValueError:
                continue  
    return precios

def rellenar_faltantes(precios):
    def es_fecha_valida(fecha):
        try:
            datetime.datetime.strptime(fecha, "%d-%m-%Y")
            return True
        except ValueError:
            return False

    fechas_validas = [f for f in precios.keys() if es_fecha_valida(f)]
    fechas = sorted(fechas_validas, key=lambda x: datetime.datetime.strptime(x, "%d-%m-%Y"))

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
                    if tipo in ultimo:
                        precios_completos[fecha_str][tipo] = ultimo[tipo]
                else:
                    precios_completos[fecha_str][tipo] = precio
                    ultimo[tipo] = precio
        else:
            precios_completos[fecha_str] = ultimo.copy()
        fecha_inicio += datetime.timedelta(days=1)

    return precios_completos

def guardar_precios(precios, file_path):
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("Fecha\tTipo de aceite\tPrecio €/kg\n")
        for fecha in sorted(precios.keys(), key=lambda x: datetime.datetime.strptime(x, "%d-%m-%Y")):
            for tipo, precio in precios[fecha].items():
                if precio is not None:
                    f.write(f"{fecha}\t{tipo}\t{precio:.3f}\n")

if __name__ == "__main__":
    precios = leer_precios(INPUT_FILE)
    precios_completos = rellenar_faltantes(precios)
    guardar_precios(precios_completos, OUTPUT_FILE)
    print(f"✅ Archivo validado y guardado en {OUTPUT_FILE}")


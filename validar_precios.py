import datetime

INPUT_FILE = "precios 2015.txt"

def leer_precios(file_path):
    precios = {}
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or "aceite" not in line.lower():
                continue

            try:
                fecha_str, tipo, valor_str = line.split(";")
                fecha = datetime.datetime.strptime(fecha_str, "%Y-%m-%d").date()

                # Normalizar precios
                if "sin cierre" in valor_str.lower():
                    valor = None
                else:
                    valor = float(valor_str.replace(",", ".").replace("€", "").strip())

                if fecha not in precios:
                    precios[fecha] = {}
                precios[fecha][tipo.strip()] = valor
            except Exception:
                print(f"⚠️ Línea ignorada: {line}")
    return precios


def rellenar_faltantes(precios):
    fechas = sorted(precios.keys())
    fecha_actual = fechas[0]
    fecha_fin = fechas[-1]

    ultimo_valor = {}

    while fecha_actual <= fecha_fin:
        if fecha_actual not in precios:
            precios[fecha_actual] = {}

        for tipo in ["Aceite de oliva virgen extra", "Aceite de oliva virgen", "Aceite de oliva lampante"]:
            if tipo not in precios[fecha_actual] or precios[fecha_actual][tipo] is None:
                if tipo in ultimo_valor:
                    precios[fecha_actual][tipo] = ultimo_valor[tipo]
            else:
                ultimo_valor[tipo] = precios[fecha_actual][tipo]

        fecha_actual += datetime.timedelta(days=1)

    return precios


def guardar_precios(precios, file_path):
    with open(file_path, "w", encoding="utf-8") as f:
        for fecha in sorted(precios.keys()):
            for tipo, valor in precios[fecha].items():
                f.write(f"{fecha};{tipo};{valor:.3f}\n")


if __name__ == "__main__":
    precios = leer_precios(INPUT_FILE)
    precios_completos = rellenar_faltantes(precios)
    guardar_precios(precios_completos, INPUT_FILE)
    print(f"✅ Archivo {INPUT_FILE} validado y sobrescrito correctamente.")

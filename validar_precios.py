import datetime

FILE_PATH = "precios 2015.txt"


def parsear_precio(valor: str, ultimo_precio: float) -> float:
    """
    Limpia y convierte el precio a float.
    Si el valor está vacío o es 'sin cierre de operaciones', usa el último precio.
    """
    valor = valor.strip().lower()

    if not valor or "sin cierre" in valor:
        return ultimo_precio

    # Normalizar separadores decimales
    valor = valor.replace(",", ".").replace(" ", "")

    try:
        return float(valor)
    except ValueError:
        print(f"⚠️ Línea ignorada (precio inválido): {valor}")
        return ultimo_precio


def leer_precios(file_path: str):
    """
    Lee el archivo de precios y devuelve un diccionario {fecha: {tipo: precio}}
    """
    precios = {}
    fecha_actual = None
    ultimo_precio = {}

    with open(file_path, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea:
                continue

            # Detectar fecha (formato DD-MM-YYYY)
            try:
                fecha = datetime.datetime.strptime(linea, "%d-%m-%Y").date()
                fecha_actual = fecha
                if fecha_actual not in precios:
                    precios[fecha_actual] = {}
                continue
            except ValueError:
                pass  # no es fecha

            # Si es línea de precio
            if fecha_actual:
                partes = linea.split()
                tipo = " ".join(partes[:-1])  # todo menos el último token
                valor = partes[-1].replace("€", "").replace("/kg", "")

                # Usar último precio conocido si no hay valor válido
                precio = parsear_precio(valor, ultimo_precio.get(tipo, 0.0))
                precios[fecha_actual][tipo] = precio
                ultimo_precio[tipo] = precio

    return precios


def rellenar_faltantes(precios: dict):
    """
    Rellena los días faltantes con el último precio conocido
    """
    if not precios:
        return {}

    fechas = sorted(precios.keys())
    fecha_inicio, fecha_fin = fechas[0], fechas[-1]
    precios_completos = {}
    ultimo_valores = {}

    fecha = fecha_inicio
    while fecha <= fecha_fin:
        if fecha in precios:
            precios_completos[fecha] = precios[fecha]
            ultimo_valores.update(precios[fecha])
        else:
            precios_completos[fecha] = ultimo_valores.copy()
        fecha += datetime.timedelta(days=1)

    return precios_completos


def guardar_precios(precios: dict, file_path: str):
    with open(file_path, "w", encoding="utf-8") as f:
        for fecha in sorted(precios.keys()):
            f.write(f"{fecha.strftime('%d-%m-%Y')}\n")
            for tipo, valor in precios[fecha].items():
                f.write(f"{tipo} {valor:.3f}\n")
            f.write("\n")


if __name__ == "__main__":
    precios = leer_precios(FILE_PATH)
    precios_completos = rellenar_faltantes(precios)
    guardar_precios(precios_completos, FILE_PATH)
    print(f"✅ Archivo {FILE_PATH} ha sido validado y sobrescrito con los datos corregidos.")

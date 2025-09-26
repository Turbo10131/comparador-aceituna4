import json
from datetime import datetime, timedelta

INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

TIPOS_VALIDOS = [
    "Aceite de oliva virgen extra",
    "Aceite de oliva virgen",
    "Aceite de oliva lampante"
]

def detectar_tipo(linea):
    for tipo in TIPOS_VALIDOS:
        if tipo in linea:
            return tipo
    return None

def leer_precios_txt():
    precios = {}
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        fecha_actual = None
        for linea in f:
            linea = linea.strip()
            if not linea:
                continue

            # Detectar fecha
            try:
                fecha_actual = datetime.strptime(linea, "%d-%m-%Y").date()
                if fecha_actual not in precios:
                    precios[fecha_actual] = {}
                continue
            except ValueError:
                pass

            # Detectar tipo de aceite
            tipo = detectar_tipo(linea)
            if not tipo:
                continue

            # Extraer precio (último token antes de "€")
            partes = linea.split()
            valor = partes[-2].replace(",", ".")
            try:
                precio = float(valor)
                precios[fecha_actual][tipo] = precio
            except ValueError:
                # Caso "sin cierre de operaciones": lo dejamos para rellenar después
                continue

    return precios

def rellenar_faltantes(precios):
    """Rellena días faltantes y 'sin cierre' con último precio conocido."""
    if not precios:
        return {}

    fechas = sorted(precios.keys())
    fecha_inicio = fechas[0]
    fecha_fin = datetime.today().date()

    precios_completos = {}
    ultimo_precio = {}

    fecha = fecha_inicio
    while fecha <= fecha_fin:
        if fecha in precios:
            # Actualizar precios conocidos
            for tipo in TIPOS_VALIDOS:
                if tipo in precios[fecha]:
                    ultimo_precio[tipo] = precios[fecha][tipo]
        # Guardar copia de último precio conocido
        precios_completos[fecha] = ultimo_precio.copy()
        fecha += timedelta(days=1)

    return precios_completos

def exportar_json(precios_completos):
    historico = {tipo: [] for tipo in TIPOS_VALIDOS}

    for fecha, tipos in sorted(precios_completos.items()):
        fecha_str = fecha.strftime("%Y-%m-%d")
        for tipo in TIPOS_VALIDOS:
            if tipo in tipos:
                historico[tipo].append({
                    "fecha": fecha_str,
                    "precio": tipos[tipo]  # sin redondear
                })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    precios = leer_precios_txt()
    precios_completos = rellenar_faltantes(precios)
    exportar_json(precios_completos)
    print(f"Histórico convertido y guardado en {OUTPUT_FILE}")


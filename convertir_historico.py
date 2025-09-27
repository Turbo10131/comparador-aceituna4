import re
import json
from datetime import datetime, timedelta

INPUT_FILE = "precios 2015.txt"
OUTPUT_FILE = "precio-aceite-historico.json"

def detectar_tipo(linea: str):
    """Identifica el tipo de aceite en una línea de texto."""
    linea = linea.lower()
    if "virgen extra" in linea:
        return "Aceite de oliva virgen extra"
    elif "virgen" in linea and "extra" not in linea:
        return "Aceite de oliva virgen"
    elif "lampante" in linea:
        return "Aceite de oliva lampante"
    return None

def convertir():
    """Convierte el TXT a JSON agrupado por fecha con relleno de días faltantes."""
    historico = []
    fecha_actual = None
    precios_dia = {}

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea:
                continue

            # Detectar fechas (dd-mm-YYYY)
            if re.match(r"^\d{2}-\d{2}-\d{4}$", linea):
                if fecha_actual and precios_dia:
                    historico.append(precios_dia)
                fecha_actual = datetime.strptime(linea, "%d-%m-%Y")
                precios_dia = {"fecha": fecha_actual.strftime("%Y-%m-%d")}
                continue

            # Detectar precios
            tipo = detectar_tipo(linea)
            if tipo and fecha_actual:
                try:
                    precio_str = linea.split()[-1].replace(",", ".")
                    precio = float(precio_str)
                    precios_dia[tipo] = precio
                except ValueError:
                    print(f"⚠️ No se pudo convertir el precio en la línea: {linea}")

    # Último bloque
    if fecha_actual and precios_dia:
        historico.append(precios_dia)

    # --- 🔹 Rellenar días faltantes ---
    historico_completo = []
    if historico:
        fecha_inicio = datetime.strptime(historico[0]["fecha"], "%Y-%m-%d")
        fecha_fin = datetime.today()
        ultimo_precios = {}

        fecha = fecha_inicio
        i = 0
        while fecha <= fecha_fin:
            fecha_str = fecha.strftime("%Y-%m-%d")

            if i < len(historico) and historico[i]["fecha"] == fecha_str:
                # Día con datos en TXT
                ultimo_precios = historico[i].copy()
                historico_completo.append(historico[i])
                i += 1
            else:
                # Día sin datos → copiar último precio conocido
                if ultimo_precios:
                    historico_completo.append({
                        "fecha": fecha_str,
                        "Aceite de oliva virgen extra": ultimo_precios.get("Aceite de oliva virgen extra"),
                        "Aceite de oliva virgen": ultimo_precios.get("Aceite de oliva virgen"),
                        "Aceite de oliva lampante": ultimo_precios.get("Aceite de oliva lampante"),
                    })
            fecha += timedelta(days=1)

    # Guardar en JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(historico_completo, f, ensure_ascii=False, indent=2)

    print(f"✅ Histórico completo convertido y guardado en {OUTPUT_FILE}")

if __name__ == "__main__":
    convertir()

import re
import json
from datetime import datetime

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
    """Convierte el archivo TXT en un JSON estructurado por tipo de aceite."""
    historico = {
        "Aceite de oliva virgen extra": [],
        "Aceite de oliva virgen": [],
        "Aceite de oliva lampante": []
    }

    fecha_actual = None

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea:
                continue

            # Detectar fechas en formato dd-mm-YYYY
            if re.match(r"^\d{2}-\d{2}-\d{4}$", linea):
                try:
                    fecha_actual = datetime.strptime(linea, "%d-%m-%Y").strftime("%Y-%m-%d")
                except ValueError:
                    print(f"⚠️ Fecha no válida: {linea}")
                    fecha_actual = None
                continue

            # Detectar líneas con tipo + precio
            tipo = detectar_tipo(linea)
            if tipo and fecha_actual:
                try:
                    # Último elemento de la línea debe ser el precio
                    precio_str = linea.split()[-1].replace(",", ".")
                    precio = float(precio_str)
                    historico[tipo].append({"fecha": fecha_actual, "precio": precio})
                except ValueError:
                    print(f"⚠️ No se pudo convertir el precio en la línea: {linea}")

    # Guardar en JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)

    print(f"✅ Histórico convertido y guardado en {OUTPUT_FILE}")

if __name__ == "__main__":
    convertir()

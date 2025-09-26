async function cargarHistorico() {
  const response = await fetch("precio-aceite-historico.json");
  const data = await response.json();

  const tabla = document.querySelector("#tabla-historico tbody");
  tabla.innerHTML = "";

  // Obtener todas las fechas de todas las variedades
  let fechas = new Set();
  Object.values(data).forEach(lista => {
    lista.forEach(entry => fechas.add(entry.fecha));
  });

  // Ordenar fechas descendente (más reciente primero)
  fechas = Array.from(fechas).sort((a, b) => new Date(b) - new Date(a));

  // Iterar fechas y mostrar filas
  fechas.forEach(fecha => {
    const fila_fecha = document.createElement("tr");
    fila_fecha.innerHTML = `
      <td colspan="3" style="background:#d7e4b4;font-weight:bold;">${fecha}</td>
    `;
    tabla.appendChild(fila_fecha);

    // Mostrar los tres tipos en orden fijo
    ["Aceite de oliva virgen extra", "Aceite de oliva virgen", "Aceite de oliva lampante"].forEach(tipo => {
      const registro = data[tipo].find(e => e.fecha === fecha);
      if (registro) {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td></td>
          <td>${tipo}</td>
          <td>${registro.precio_eur_kg.toFixed(3)} €</td>
        `;
        tabla.appendChild(fila);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", cargarHistorico);


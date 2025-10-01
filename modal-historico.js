// modal-historico.js
async function cargarHistorico(filtro = {}) {
  // ✅ Corregido: escapamos el espacio en el nombre del archivo
  const response = await fetch("precios%202015.txt");
  const texto = await response.text();

  const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);
  const registros = [];

  let fechaActual = null;
  lineas.forEach(l => {
    if (/^\d{2}-\d{2}-\d{4}$/.test(l)) {
      fechaActual = l.split("-").reverse().join("-"); // YYYY-MM-DD
    } else if (fechaActual) {
      const partes = l.split(" ");
      const precio = parseFloat(partes.pop());
      const tipo = partes.join(" ");
      registros.push({
        fecha: fechaActual,
        tipo: tipo.trim(),
        precio: precio
      });
    }
  });

  // Ordenar de más reciente a más antiguo
  registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Aplicar filtro de fechas si existe
  let filtrados = registros;
  if (filtro.desde || filtro.hasta) {
    const desde = filtro.desde ? new Date(filtro.desde) : null;
    const hasta = filtro.hasta ? new Date(filtro.hasta) : null;
    filtrados = registros.filter(r => {
      const f = new Date(r.fecha);
      return (!desde || f >= desde) && (!hasta || f <= hasta);
    });
  }

  const tabla = document.querySelector("#historico-body");
  tabla.innerHTML = "";

  let fechaAgrupada = null;
  filtrados.forEach(r => {
    if (r.fecha !== fechaAgrupada) {
      const filaFecha = document.createElement("tr");
      filaFecha.innerHTML = `<td colspan="3" class="fecha-barra">${r.fecha}</td>`;
      tabla.appendChild(filaFecha);
      fechaAgrupada = r.fecha;
    }

    const fila = document.createElement("tr");
    fila.classList.add("sub-row");
    fila.innerHTML = `
      <td></td>
      <td class="tipo">${r.tipo}</td>
      <td class="precio">${r.precio.toFixed(3)} €/kg</td>
    `;
    tabla.appendChild(fila);
  });
}

// Eventos para abrir/cerrar modal y aplicar filtros
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("historico-modal");
  const abrir = document.getElementById("historico-btn");
  const cerrar = document.getElementById("historico-close");

  abrir.addEventListener("click", () => {
    modal.classList.add("open");
    cargarHistorico();
  });

  cerrar.addEventListener("click", () => modal.classList.remove("open"));

  // Botones de filtros rápidos
  document.getElementById("filtro-3m")?.addEventListener("click", () => {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 3);
    cargarHistorico({ desde: desde.toISOString().split("T")[0] });
  });

  document.getElementById("filtro-1m")?.addEventListener("click", () => {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 1);
    cargarHistorico({ desde: desde.toISOString().split("T")[0] });
  });

  // Filtro personalizado
  document.getElementById("filtro-aplicar")?.addEventListener("click", () => {
    const desde = document.getElementById("fecha-desde").value;
    const hasta = document.getElementById("fecha-hasta").value;
    cargarHistorico({ desde, hasta });
  });
});

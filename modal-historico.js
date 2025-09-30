async function cargarHistorico(filtro = {}) {
  const response = await fetch("precios-2015.txt");
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

  let datos = registros;

  // 📌 Filtro de fechas
  if (filtro.desde || filtro.hasta) {
    datos = datos.filter(r => {
      const f = new Date(r.fecha);
      return (!filtro.desde || f >= new Date(filtro.desde)) &&
             (!filtro.hasta || f <= new Date(filtro.hasta));
    });
  }

  // Agrupar por fecha
  const porFecha = {};
  datos.forEach(r => {
    if (!porFecha[r.fecha]) porFecha[r.fecha] = [];
    porFecha[r.fecha].push(r);
  });

  const fechas = Object.keys(porFecha).sort((a, b) => new Date(b) - new Date(a));

  const tbody = document.getElementById("historico-body");
  tbody.innerHTML = "";

  fechas.forEach(fecha => {
    const filaFecha = document.createElement("tr");
    filaFecha.innerHTML = `<td colspan="3" style="background:#d7e4b4;font-weight:bold;">${fecha}</td>`;
    tbody.appendChild(filaFecha);

    porFecha[fecha].forEach(registro => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td></td>
        <td>${registro.tipo}</td>
        <td>${isNaN(registro.precio) ? "—" : registro.precio.toFixed(3) + " €/kg"}</td>
      `;
      tbody.appendChild(fila);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("historico-modal");
  const btnAbrir = document.getElementById("historico-btn");
  const btnCerrar = document.getElementById("historico-close");

  // 📌 Abrir modal histórico
  btnAbrir.addEventListener("click", () => {
    modal.classList.add("open");
    cargarHistorico(); // mostrar todo por defecto
  });

  // 📌 Cerrar modal histórico
  btnCerrar.addEventListener("click", () => {
    modal.classList.remove("open");
  });

  // 📌 Filtro últimos 3 meses
  document.getElementById("filtro-3m").addEventListener("click", () => {
    const hasta = new Date();
    const desde = new Date();
    desde.setMonth(hasta.getMonth() - 3);
    cargarHistorico({ desde, hasta });
  });

  // 📌 Filtro último mes
  document.getElementById("filtro-1m").addEventListener("click", () => {
    const hasta = new Date();
    const desde = new Date();
    desde.setMonth(hasta.getMonth() - 1);
    cargarHistorico({ desde, hasta });
  });

  // 📌 Filtro rango personalizado
  document.getElementById("filtro-rango").addEventListener("click", () => {
    const desde = document.getElementById("fecha-desde").value;
    const hasta = document.getElementById("fecha-hasta").value;
    cargarHistorico({ 
      desde: desde ? new Date(desde) : null, 
      hasta: hasta ? new Date(hasta) : null 
    });
  });
});

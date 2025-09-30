async function cargarHistorico() {
  try {
    const response = await fetch("precios 2015.txt");
    if (!response.ok) throw new Error("No se pudo cargar precios 2015.txt");

    const texto = await response.text();
    const lineas = texto.split("\n").map(l => l.trim()).filter(l => l);

    const body = document.getElementById("historico-body");
    body.innerHTML = "";

    let fechaActual = null;
    let registros = [];

    lineas.forEach(linea => {
      // Detectar fecha (dd-mm-aaaa)
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        fechaActual = linea;
        registros.push({ fecha: fechaActual, precios: [] });
      } else if (fechaActual) {
        const partes = linea.split(" ");
        const precio = partes.pop();
        const tipo = partes.join(" ");
        registros[registros.length - 1].precios.push({ tipo, precio: parseFloat(precio) });
      }
    });

    // 📌 Ordenar por fecha (más reciente primero)
    registros.sort((a, b) => {
      const fa = new Date(a.fecha.split("-").reverse().join("-"));
      const fb = new Date(b.fecha.split("-").reverse().join("-"));
      return fb - fa;
    });

    // Renderizar
    registros.forEach(reg => {
      const filaFecha = document.createElement("tr");
      filaFecha.innerHTML = `<td colspan="3" style="background:#dce4b0; font-weight:bold;">${reg.fecha}</td>`;
      body.appendChild(filaFecha);

      reg.precios.forEach(p => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td></td>
          <td>${p.tipo}</td>
          <td>${isNaN(p.precio) ? "—" : p.precio.toFixed(3) + " €/kg"}</td>
        `;
        body.appendChild(fila);
      });
    });
  } catch (err) {
    console.error("[Historico] Error cargando histórico:", err);
    document.getElementById("historico-body").innerHTML =
      `<tr><td colspan="3">No hay datos disponibles.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-historico");
  const modal = document.getElementById("historico-modal");
  const close = document.getElementById("historico-close");

  if (btn && modal && close) {
    btn.addEventListener("click", () => {
      modal.classList.add("open");
      cargarHistorico();
    });

    close.addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }
});

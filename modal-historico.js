async function cargarHistorico() {
  try {
    const response = await fetch("precios 2015.txt");
    if (!response.ok) throw new Error("No se pudo cargar precios 2015.txt");

    const texto = await response.text();
    const lineas = texto.split("\n").map(l => l.trim()).filter(l => l);

    const body = document.getElementById("historico-body");
    body.innerHTML = "";

    let fechaActual = null;

    lineas.forEach(linea => {
      // Detecta si es una fecha (dd-mm-aaaa)
      if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
        fechaActual = linea;
        const filaFecha = document.createElement("tr");
        filaFecha.innerHTML = `<td colspan="3" style="background:#dce4b0; font-weight:bold;">${fechaActual}</td>`;
        body.appendChild(filaFecha);
      } else if (fechaActual) {
        // Separar texto y precio
        const partes = linea.split(" ");
        const precio = partes.pop();
        const tipo = partes.join(" ");

        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td></td>
          <td>${tipo}</td>
          <td>${parseFloat(precio).toFixed(3)} €/kg</td>
        `;
        body.appendChild(fila);
      }
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

document.addEventListener("DOMContentLoaded", async () => {
  const modal = document.getElementById("historico-modal");
  const btnOpen = document.getElementById("historico-btn");
  const btnClose = document.getElementById("historico-close");
  const body = document.getElementById("historico-body");

  const btn3m = document.getElementById("btn-3m");
  const btn1m = document.getElementById("btn-1m");
  const btnFiltrar = document.getElementById("btn-filtrar");
  const inputDesde = document.getElementById("fecha-desde");
  const inputHasta = document.getElementById("fecha-hasta");

  let registros = [];

  // ✅ Corrección: nombre correcto del archivo
  async function cargarDatos() {
    try {
      const res = await fetch("precios2015.txt"); 
      const text = await res.text();

      const lineas = text.split("\n").map(l => l.trim()).filter(Boolean);
      const datos = [];
      let fecha = null;

      for (let linea of lineas) {
        if (/^\d{2}-\d{2}-\d{4}$/.test(linea)) {
          fecha = linea;
        } else if (fecha) {
          const partes = linea.split(" ");
          const precio = partes.pop();
          const tipo = partes.join(" ");
          datos.push({ fecha, tipo, precio });
        }
      }

      registros = datos;
      renderTabla(registros);
    } catch (err) {
      console.error("Error cargando histórico:", err);
    }
  }

  function renderTabla(filtrados) {
    body.innerHTML = "";
    let lastFecha = null;

    filtrados.forEach(r => {
      if (r.fecha !== lastFecha) {
        const trFecha = document.createElement("tr");
        trFecha.innerHTML = `<td colspan="3" class="fecha-barra"><strong>${r.fecha}</strong></td>`;
        body.appendChild(trFecha);
        lastFecha = r.fecha;
      }
      const tr = document.createElement("tr");
      tr.classList.add("sub-row");
      tr.innerHTML = `
        <td></td>
        <td class="tipo">${r.tipo}</td>
        <td class="precio">${parseFloat(r.precio).toFixed(3)} €/kg</td>
      `;
      body.appendChild(tr);
    });
  }

  function filtrarPorRango(desde, hasta) {
    if (!desde || !hasta) return registros;
    const d1 = new Date(desde.split("-").reverse().join("-"));
    const d2 = new Date(hasta.split("-").reverse().join("-"));
    return registros.filter(r => {
      const d = new Date(r.fecha.split("-").reverse().join("-"));
      return d >= d1 && d <= d2;
    });
  }

  // Eventos de botones
  btnOpen.addEventListener("click", () => modal.classList.add("open"));
  btnClose.addEventListener("click", () => modal.classList.remove("open"));

  btn3m.addEventListener("click", () => {
    const d = new Date();
    const desde = new Date();
    desde.setMonth(d.getMonth() - 3);
    renderTabla(filtrarPorRango(desde.toISOString().split("T")[0], d.toISOString().split("T")[0]));
  });

  btn1m.addEventListener("click", () => {
    const d = new Date();
    const desde = new Date();
    desde.setMonth(d.getMonth() - 1);
    renderTabla(filtrarPorRango(desde.toISOString().split("T")[0], d.toISOString().split("T")[0]));
  });

  // ✅ Corrección: botón de filtrar con id "btn-filtrar"
  btnFiltrar.addEventListener("click", () => {
    const desde = inputDesde.value;
    const hasta = inputHasta.value;
    if (desde && hasta) {
      renderTabla(filtrarPorRango(desde, hasta));
    }
  });

  await cargarDatos();
});

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("historico-modal");
  const openBtn = document.getElementById("historico-btn");
  const closeBtn = document.getElementById("historico-close");
  const tbody = document.getElementById("historico-body");

  let fechas = []; // Guardará todas las entradas históricas

  function parseDDMMYYYY(f) {
    const [d, m, y] = f.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function euros(n) {
    return `${Number(n).toFixed(3)} €/kg`;
  }

  function renderTabla(filtradas) {
    tbody.innerHTML = "";

    filtradas.forEach(entry => {
      const fechaRow = document.createElement("tr");
      fechaRow.innerHTML = `<td colspan="3" class="fecha-barra"><strong>${entry.fecha}</strong></td>`;
      tbody.appendChild(fechaRow);

      entry.precios.forEach(p => {
        const row = document.createElement("tr");
        row.classList.add("sub-row");
        row.innerHTML = `
          <td class="tipo">${p.tipo}</td>
          <td class="precio">${euros(p.precio)}</td>
        `;
        tbody.appendChild(row);
      });
    });
  }

  async function cargarHistorico() {
    try {
      const res = await fetch("precios-2015.txt?v=" + Date.now());
      const text = await res.text();
      const lineas = text.trim().split("\n");

      fechas = [];
      let currentFecha = null;
      let precios = [];

      lineas.forEach(line => {
        line = line.trim();
        if (/^\d{2}-\d{2}-\d{4}$/.test(line)) {
          if (currentFecha && precios.length > 0) {
            fechas.push({ fecha: currentFecha, precios });
          }
          currentFecha = line;
          precios = [];
        } else if (line) {
          const partes = line.split(" ");
          const precio = parseFloat(partes.pop());
          const tipo = partes.join(" ");
          precios.push({ tipo, precio });
        }
      });
      if (currentFecha && precios.length > 0) {
        fechas.push({ fecha: currentFecha, precios });
      }

      // Ordenar descendente por fecha
      fechas.sort((a, b) => parseDDMMYYYY(b.fecha) - parseDDMMYYYY(a.fecha));

      renderTabla(fechas);
    } catch (err) {
      console.error("Error cargando histórico:", err);
    }
  }

  // --- Abrir modal ---
  openBtn.addEventListener("click", () => {
    modal.classList.add("open");
    cargarHistorico();
  });

  // --- Cerrar modal ---
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("open");
  });

  // --- Últimos 3 meses ---
  document.getElementById("btn-3m").onclick = () => {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 3);
    const filtradas = fechas.filter(f => parseDDMMYYYY(f.fecha) >= limite);
    renderTabla(filtradas);
  };

  // --- Último mes ---
  document.getElementById("btn-1m").onclick = () => {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 1);
    const filtradas = fechas.filter(f => parseDDMMYYYY(f.fecha) >= limite);
    renderTabla(filtradas);
  };

  // --- Botón Filtrar rango personalizado ---
  document.getElementById("btn-filtrar").onclick = () => {
    const desdeVal = document.getElementById("fecha-desde").value;
    const hastaVal = document.getElementById("fecha-hasta").value;
    if (!desdeVal || !hastaVal) return;

    // Convertir YYYY-MM-DD → DD-MM-YYYY
    function toDDMMYYYY(fechaStr) {
      const [y, m, d] = fechaStr.split("-");
      return `${d}-${m}-${y}`;
    }

    const desdeStr = toDDMMYYYY(desdeVal);
    const hastaStr = toDDMMYYYY(hastaVal);

    const desde = parseDDMMYYYY(desdeStr);
    const hasta = parseDDMMYYYY(hastaStr);

    const filtradas = fechas.filter(f => {
      const date = parseDDMMYYYY(f.fecha);
      return date >= desde && date <= hasta;
    });

    renderTabla(filtradas);
  };
});

function setupHistoricoModal() {
  const btn = document.getElementById('btnConsultarHistorial');
  const modal = document.getElementById('modal-historico');
  const btnCerrar = document.getElementById('modal-historico-close');
  const contenedor = document.getElementById('contenedor-historico');

  if (!btn || !modal || !btnCerrar) return;

  function openModal() {
    modal.classList.add('open');
    cargarHistorico();
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  btn.addEventListener('click', openModal);
  btnCerrar.addEventListener('click', closeModal);
  window.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  async function cargarHistorico() {
    try {
      const res = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (typeof data !== 'object') {
        contenedor.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
      }

      // --- Reorganizar por fecha ---
      const agrupado = {};

      Object.entries(data).forEach(([tipo, registros]) => {
        registros.forEach(item => {
          if (!agrupado[item.fecha]) agrupado[item.fecha] = {};
          agrupado[item.fecha][tipo] = item.precio_eur_kg;
        });
      });

      // Ordenar fechas descendente
      const fechas = Object.keys(agrupado).sort((a, b) => new Date(b) - new Date(a));

      // --- Generar tabla ---
      let html = `<table class="price-table" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding: 8px;">Fecha</th>
            <th style="text-align:left; padding: 8px;">Tipo de aceite</th>
            <th style="text-align:right; padding: 8px;">Precio €/kg</th>
          </tr>
        </thead>
        <tbody>`;

      fechas.forEach(fecha => {
        const precios = agrupado[fecha];
        const tipos = [
          "Aceite de oliva virgen extra",
          "Aceite de oliva virgen",
          "Aceite de oliva lampante"
        ];

        tipos.forEach((tipo, idx) => {
          html += `<tr>
            ${idx === 0 ? `<td rowspan="3" style="padding: 6px 8px; font-weight:600;">${fecha}</td>` : ""}
            <td style="padding: 6px 8px;">${tipo}</td>
            <td style="text-align:right; padding: 6px 8px;">${precios[tipo] ? Number(precios[tipo]).toFixed(3) : "—"}</td>
          </tr>`;
        });
      });

      html += "</tbody></table>";
      contenedor.innerHTML = html;

    } catch (err) {
      console.error('[cargarHistorico] Error:', err);
      contenedor.innerHTML = "<p>Error al cargar los datos.</p>";
    }
  }
}

document.addEventListener('DOMContentLoaded', setupHistoricoModal);

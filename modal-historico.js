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

      let html = "";

      // Recorremos cada tipo de aceite
      Object.entries(data).forEach(([tipo, registros]) => {
        if (!Array.isArray(registros) || registros.length === 0) return;

        html += `<h4 style="margin-top:20px; margin-bottom:8px;">${tipo}</h4>`;
        html += `<table class="price-table" style="width:100%; border-collapse: collapse; margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left; padding: 8px;">Fecha</th>
              <th style="text-align:right; padding: 8px;">Precio €/kg</th>
            </tr>
          </thead>
          <tbody>`;

        registros.forEach(item => {
          html += `<tr>
            <td style="padding: 6px 8px;">${item.fecha}</td>
            <td style="text-align:right; padding: 6px 8px;">${Number(item.precio_eur_kg).toFixed(3)}</td>
          </tr>`;
        });

        html += "</tbody></table>";
      });

      contenedor.innerHTML = html || "<p>No hay datos disponibles.</p>";

    } catch (err) {
      console.error('[cargarHistorico] Error:', err);
      contenedor.innerHTML = "<p>Error al cargar los datos.</p>";
    }
  }
}

document.addEventListener('DOMContentLoaded', setupHistoricoModal);

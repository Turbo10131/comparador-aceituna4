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

      if (!Array.isArray(data)) {
        contenedor.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
      }

      let html = `<table class="price-table" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding: 8px;">Fecha</th>
            <th style="text-align:right; padding: 8px;">Precio €/kg</th>
          </tr>
        </thead>
        <tbody>`;

      data.forEach(item => {
        html += `<tr>
          <td style="padding: 6px 8px;">${item.fecha}</td>
          <td style="text-align:right; padding: 6px 8px;">${Number(item.precio).toFixed(3)}</td>
        </tr>`;
      });

      html += '</tbody></table>';
      contenedor.innerHTML = html;

    } catch (err) {
      console.error('[cargarHistorico] Error:', err);
      contenedor.innerHTML = "<p>Error al cargar los datos.</p>";
    }
  }
}

document.addEventListener('DOMContentLoaded', setupHistoricoModal);

// app.js
(function () {
  const FECHA = document.getElementById('fecha-actualizacion');
  const LISTA = document.getElementById('lista-precios');

  function pintarError(msg) {
    if (LISTA) LISTA.textContent = msg || 'Error al cargar los precios.';
  }

  fetch('precio-aceite.json?v=' + Date.now(), {cache: 'no-store'})
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((datos) => {
      try {
        // fecha
        if (FECHA && datos.ultima_actualizacion) {
          FECHA.textContent = new Date(datos.ultima_actualizacion).toLocaleString('es-ES');
        }

        // precios
        if (!datos.precios || typeof datos.precios !== 'object') {
          throw new Error('JSON sin clave "precios"');
        }
        let html = '';
        for (const tipo in datos.precios) {
          const item = datos.precios[tipo] || {};
          const variedad = item.variedad ?? '';
          const precio = typeof item.precio_eur_kg === 'number'
            ? item.precio_eur_kg.toFixed(3)
            : '—';
          html += `<p class="precio">${tipo} (${variedad}): ${precio} €/kg</p>`;
        }
        LISTA.innerHTML = html || 'No hay datos para mostrar.';
      } catch (e) {
        console.error(e);
        pintarError('Formato de datos no esperado.');
      }
    })
    .catch((err) => {
      console.error(err);
      pintarError('No se pudo cargar el JSON.');
    });
})();

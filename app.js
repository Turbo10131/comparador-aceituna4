(function () {
  const FEED = '/precio-aceite.json?v=' + Date.now();

  // Busca elementos con seguridad
  function qs(id) { return document.getElementById(id); }
  const fechaEl  = qs('fecha');
  const selectEl = qs('calidad');
  const precioEl = qs('precio');
  const listaEl  = qs('lista');

  // Si falta algo del DOM, salimos mostrando pista
  if (!fechaEl || !selectEl || !precioEl || !listaEl) {
    console.error('Faltan elementos del DOM que el script necesita.');
    return;
  }

  // Carga JSON y pinta
  fetch(FEED, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      // Fecha
      const iso = data.ultima_actualizacion || data.generated_at || data.fecha;
      try {
        fechaEl.textContent = new Date(iso).toLocaleString('es-ES');
      } catch {
        fechaEl.textContent = iso || '—';
      }

      // Mapea claves del JSON a etiquetas legibles
      const map = {
        'Aceite de oliva virgen extra': 'Virgen Extra',
        'Aceite de oliva virgen': 'Virgen',
        'Aceite de oliva lampante': 'Lampante'
      };

      // Rellena el listado completo
      const partes = [];
      for (const tipo in data.precios) {
        const item = data.precios[tipo];
        const nombre = map[tipo] || tipo;
        partes.push(`${tipo} (Picual): ${Number(item.precio_eur_kg).toFixed(3)} €/kg`);
      }
      listaEl.innerHTML = partes.map(p => `<p>${p}</p>`).join('');

      // Función de pintado del precio actual
      const paint = () => {
        const tipo = selectEl.value;
        const it = data.precios[tipo];
        precioEl.textContent = it ? `${Number(it.precio_eur_kg).toFixed(3)} €/kg` : '—';
      };

      // Selección inicial = primera opción del <select>
      paint();
      selectEl.addEventListener('change', paint);
    })
    .catch(err => {
      console.error('Error cargando el JSON:', err);
      fechaEl.textContent = 'Error al cargar';
      listaEl.textContent = 'No se pudo cargar el JSON.';
      precioEl.textContent = '—';
    });
})();

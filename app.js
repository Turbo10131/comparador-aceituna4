document.addEventListener('DOMContentLoaded', () => {
  const tipoSelect     = document.getElementById('tipo');
  const precioDiv      = document.getElementById('precio');
  const listaPrecios   = document.getElementById('lista-precios');
  const fechaSpan      = document.getElementById('fecha');
  const rendimientoInp = document.getElementById('rendimiento');

  let precios = {}; // { virgen_extra: number, virgen: number, lampante: number }

  // Utilidades
  const ez = (x) => (x == null ? '' : String(x));
  const n2 = (n) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 3 });

  // Detecta y normaliza precios desde el JSON
  function mapearPrecios(data) {
    const out = { virgen_extra: null, virgen: null, lampante: null };

    if (!data || !data.precios) return out;

    // data.precios puede tener claves tipo:
    // "Aceite de oliva virgen extra" | "Aceite de oliva virgen" | "Aceite de oliva lampante"
    // y cada objeto puede tener "precio_eur_kg" O "precio_euros_kg"
    const entradas = Object.entries(data.precios);

    for (const [clave, item] of entradas) {
      const key = ez(clave).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

      const valor = item?.precio_eur_kg ?? item?.precio_euros_kg ?? item?.precio ?? null;
      if (valor == null) continue;

      if (key.includes('extra')) {
        out.virgen_extra = Number(valor);
      } else if (key.includes('lampante')) {
        out.lampante = Number(valor);
      } else if (key.includes('virgen')) {
        out.virgen = Number(valor);
      }
    }
    return out;
  }

  // Carga del JSON (fuerza no-caché)
  fetch('precio-aceite.json?v=' + Date.now())
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      // Fecha
      const fechaRaw = data.ultima_actualizacion || data.fecha || '';
      try {
        const f = new Date(fechaRaw);
        fechaSpan.textContent = isNaN(f) ? ez(fechaRaw) : f.toLocaleString('es-ES');
      } catch {
        fechaSpan.textContent = ez(fechaRaw) || '—';
      }

      // Precios normalizados
      precios = mapearPrecios(data);

      // Pinta lista completa
      const filas = [];
      if (precios.virgen_extra != null) filas.push(`Aceite de oliva virgen extra (Picual): ${n2(precios.virgen_extra)} €/kg`);
      if (precios.virgen       != null) filas.push(`Aceite de oliva virgen (Picual): ${n2(precios.virgen)} €/kg`);
      if (precios.lampante     != null) filas.push(`Aceite de oliva lampante (Picual): ${n2(precios.lampante)} €/kg`);

      listaPrecios.innerHTML = filas.length ? filas.join('<br>') : 'No hay datos de precios disponibles.';
    })
    .catch((err) => {
      console.error(err);
      fechaSpan.textContent = 'Error cargando datos';
      listaPrecios.textContent = 'No se pudo cargar el JSON de precios.';
    });

  // Muestra precio al cambiar selección
  tipoSelect.addEventListener('change', pintarPrecio);
  // (Si quieres que cambie algo en función del rendimiento, lo activamos aquí)
  rendimientoInp.addEventListener('input', () => {
    // Validación simple visual (opcional)
    const v = rendimientoInp.value.replace(',', '.').trim();
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      rendimientoInp.style.border = '1px solid #9bd2a8';
      rendimientoInp.style.backgroundColor = '#f6fffa';
    } else {
      rendimientoInp.style.border = '1px solid #ffb3b3';
      rendimientoInp.style.backgroundColor = '#fff6f6';
    }
  });

  function pintarPrecio() {
    const tipo = tipoSelect.value; // virgen_extra | virgen | lampante | ''
    if (!tipo || precios[tipo] == null) {
      precioDiv.textContent = '';
      return;
    }
    // (De momento el rendimiento no afecta al precio mostrado)
    const valor = precios[tipo];
    const etiqueta = tipo.replace('_', ' ');
    precioDiv.textContent = `Precio ${etiqueta}: ${n2(valor)} €/kg`;
  }
});

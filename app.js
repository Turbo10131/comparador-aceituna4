document.addEventListener('DOMContentLoaded', () => {
  const tipoSelect     = document.getElementById('tipo');
  const precioDiv      = document.getElementById('precio');
  const fechaSpan      = document.getElementById('fecha');
  const rendimientoInp = document.getElementById('rendimiento');
  const tablaWrap      = document.getElementById('tabla-precios');
  const resultadoDiv   = document.getElementById('resultado');

  let precios = {}; // { virgen_extra: number, virgen: number, lampante: number }

  const ez = (x) => (x == null ? '' : String(x));
  const n3 = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  function mapearPrecios(data) {
    const out = { virgen_extra: null, virgen: null, lampante: null };
    if (!data || !data.precios) return out;

    for (const [clave, item] of Object.entries(data.precios)) {
      const key = ez(clave).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const valor = item?.precio_eur_kg ?? item?.precio_euros_kg ?? item?.precio ?? null;
      if (valor == null) continue;

      if (key.includes('extra')) out.virgen_extra = Number(valor);
      else if (key.includes('lampante')) out.lampante = Number(valor);
      else if (key.includes('virgen')) out.virgen = Number(valor);
    }
    return out;
  }

  function pintarTabla(precios) {
    const filas = [];
    if (precios.virgen_extra != null) filas.push({ tipo: 'Aceite de oliva virgen extra', valor: precios.virgen_extra });
    if (precios.virgen != null)       filas.push({ tipo: 'Aceite de oliva virgen',       valor: precios.virgen });
    if (precios.lampante != null)     filas.push({ tipo: 'Aceite de oliva lampante',     valor: precios.lampante });

    if (!filas.length) {
      tablaWrap.innerHTML = '<div style="padding:16px">No hay datos de precios disponibles.</div>';
      return;
    }

    const html = `
      <table class="price-table">
        <thead>
          <tr>
            <th>Tipo de aceite de oliva</th>
            <th style="text-align:right">Precio €/kg</th>
          </tr>
        </thead>
        <tbody>
          ${filas.map(row => `
            <tr>
              <td class="tipo" data-label="Tipo">${row.tipo}</td>
              <td class="precio" data-label="Precio">${n3(row.valor)} €</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    tablaWrap.innerHTML = html;
  }

  function mostrarPrecioSeleccion() {
    const tipo = tipoSelect.value;
    if (!tipo || precios[tipo] == null) {
      precioDiv.textContent = '';
      return;
    }
    precioDiv.textContent = `Precio ${tipo.replace('_', ' ')}: ${n3(precios[tipo])} €/kg`;
  }

  // Calculadora: precio aceituna €/kg = precio aceite €/kg * (rendimiento % / 100)
  function calcular() {
    const tipo = tipoSelect.value;
    const precioAceite = precios[tipo];

    // rendimiento
    const v = rendimientoInp.value.replace(',', '.').trim();
    const rend = parseFloat(v);

    // Validaciones básicas
    if (!tipo || precioAceite == null) {
      resultadoDiv.classList.add('error');
      resultadoDiv.textContent = 'Selecciona una calidad de aceite.';
      return;
    }
    if (isNaN(rend) || rend < 0 || rend > 100) {
      resultadoDiv.classList.add('error');
      resultadoDiv.textContent = 'Introduce un rendimiento válido (0–100).';
      return;
    }

    // OK: calculamos
    const precioAceituna = precioAceite * (rend / 100);
    resultadoDiv.classList.remove('error');
    resultadoDiv.innerHTML = `
      Con rendimiento <strong>${n3(rend)}%</strong> y precio del aceite
      <strong>${n3(precioAceite)} €/kg</strong> →
      <span style="margin-left:6px">Precio aceituna: <strong>${n3(precioAceituna)} €/kg</strong></span>
    `;
  }

  // Fetch JSON con precios
  fetch('precio-aceite.json?v=' + Date.now())
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      const fechaRaw = data.ultima_actualizacion || data.fecha || '';
      try {
        const f = new Date(fechaRaw);
        fechaSpan.textContent = isNaN(f) ? ez(fechaRaw) : f.toLocaleString('es-ES');
      } catch {
        fechaSpan.textContent = ez(fechaRaw) || '—';
      }

      precios = mapearPrecios(data);
      pintarTabla(precios);

      // Si hay un tipo preseleccionado, mostramos/calculamos
      mostrarPrecioSeleccion();
      calcular();
    })
    .catch((err) => {
      console.error(err);
      fechaSpan.textContent = 'Error cargando datos';
      tablaWrap.innerHTML = '<div style="padding:16px">No se pudo cargar el JSON de precios.</div>';
      resultadoDiv.classList.add('error');
      resultadoDiv.textContent = 'No se pudo calcular. Intenta de nuevo más tarde.';
    });

  // Eventos
  tipoSelect.addEventListener('change', () => {
    mostrarPrecioSeleccion();
    calcular();
  });

  rendimientoInp.addEventListener('input', () => {
    const v = rendimientoInp.value.replace(',', '.').trim();
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      rendimientoInp.style.border = '1px solid #9bd2a8';
      rendimientoInp.style.backgroundColor = '#f6fffa';
    } else {
      rendimientoInp.style.border = '1px solid #ffb3b3';
      rendimientoInp.style.backgroundColor = '#fff6f6';
    }
    calcular();
  });
});

// app.js (sin gráfica)

const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};

function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }

function normalizaPrecios(preciosRaw) {
  const map = {};
  const ve = preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg ?? null;
  const v  = preciosRaw['Aceite de oliva virgen']?.precio_eur_kg ?? null;
  const l  = preciosRaw['Aceite de oliva lampante']?.precio_eur_kg ?? null;
  if (ve && ve > 0 && ve < 20) map.virgen_extra = Number(ve);
  if (v  && v  > 0 && v  < 20) map.virgen       = Number(v);
  if (l  && l  > 0 && l  < 20) map.lampante     = Number(l);
  return map;
}

function renderTabla(preciosRaw) {
  const cont = document.getElementById('tabla-precios');
  if (!cont) return;

  const rows = [
    ['Aceite de oliva virgen extra', preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg],
    ['Aceite de oliva virgen',       preciosRaw['Aceite de oliva virgen']?.precio_eur_kg],
    ['Aceite de oliva lampante',     preciosRaw['Aceite de oliva lampante']?.precio_eur_kg],
  ];

  const cuerpo = rows.map(([label, val]) => {
    const precioTxt = (val && val > 0 && val < 20) ? euros(val) : '—';
    return `
      <tr>
        <td class="tipo" data-label="Tipo de aceite de oliva">${label}</td>
        <td class="precio" data-label="Precio €/kg">${precioTxt}</td>
      </tr>`;
  }).join('');

  cont.innerHTML = `
    <table class="price-table">
      <thead>
        <tr>
          <th>Tipo de aceite de oliva</th>
          <th>Precio €/kg</th>
        </tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table>
  `;
}

function actualizarPrecioSeleccion() {
  const sel = document.getElementById('tipo');
  const precioEl = document.getElementById('precio');
  if (!sel || !precioEl) return;

  const key = sel.value;
  const precio = PRECIOS_MAP[key];

  if (precio) setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  else if (key) setTexto(precioEl, '— Precio no disponible —');
  else setTexto(precioEl, '');
}

function calcular() {
  const sel = document.getElementById('tipo');
  const res = document.getElementById('resultado');
  const rEl = document.getElementById('rendimiento');
  if (!sel || !res || !rEl) return;

  const key = sel.value;
  const rendimiento = Number(rEl.value);
  const precio = PRECIOS_MAP[key];

  if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100) {
    res.classList.add('error');
    res.innerHTML = `
      <strong>Falta información:</strong> selecciona una calidad con precio disponible y
      escribe un rendimiento entre 0 y 100.
    `;
    return;
  }

  const precioAceituna = (rendimiento / 100) * precio;

  res.classList.remove('error');
  res.innerHTML = `
    <table class="calc-table">
      <thead>
        <tr>
          <th>Rendimiento (%)</th>
          <th>Calidad del Aceite</th>
          <th>Precio del Aceite</th>
          <th>Precio aceituna (€/kg)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Rendimiento (%)">${rendimiento}%</td>
          <td data-label="Calidad del Aceite">${TIPO_LABEL[key]}</td>
          <td data-label="Precio del Aceite">${precio.toFixed(3)} €/kg</td>
          <td data-label="Precio aceituna (€/kg)"><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

function setupFuenteModal() {
  const link = document.getElementById('fuente-link');
  const modal = document.getElementById('fuente-modal');
  const closeBtn = document.getElementById('modal-close');
  if (!link || !modal || !closeBtn) return;

  const open = () => { modal.classList.add('open'); link.blur(); };
  const close = () => { modal.classList.remove('open'); link.focus(); };

  link.addEventListener('click', e => { e.preventDefault(); open(); });
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
}

/* Renderizado de la tabla histórica en bloques */
function renderHistoricoTabla(datos) {
  const modalCont = document.getElementById('historico-body');
  if (!modalCont) return;

  let bloques = [];

  Object.entries(datos).forEach(([fecha, valores]) => {
    const tipos = Object.entries(valores);

    let filasTipos = tipos.map(([tipo, precio]) => `
      <tr>
        <td class="tipo">${tipo}</td>
        <td class="precio">${precio.toFixed(3)} €/kg</td>
      </tr>
    `).join('');

    bloques.push(`
      <tbody class="bloque-fecha">
        <tr>
          <td colspan="2" class="fecha-barra">${fecha}</td>
        </tr>
        ${filasTipos}
      </tbody>
    `);
  });

  modalCont.innerHTML = `
    <table class="historico-table">
      <thead>
        <tr>
          <th>Tipo de aceite</th>
          <th>Precio €/kg</th>
        </tr>
      </thead>
      ${bloques.join('')}
    </table>
  `;
}

async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {}

    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    renderTabla(datos.precios || {});

    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    actualizarPrecioSeleccion();
    calcular();

    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');

    const tabla = document.getElementById('tabla-precios');
    if (tabla) tabla.innerHTML = '';

    const res = document.getElementById('resultado');
    if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});

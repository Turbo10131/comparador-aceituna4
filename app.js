// app.js

// Mapea etiquetas del selector a claves del JSON
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {}; // { virgen_extra: 3.694, virgen: 3.369, lampante: 3.177 }

function setTexto(el, txt) { if (!el) return; el.textContent = txt; }
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

  if (precio) {
    setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  } else if (key) {
    setTexto(precioEl, '— Precio no disponible —');
  } else {
    setTexto(precioEl, '');
  }
}

// Tabla calculadora (4 columnas)
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
  } else {
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
}

async function cargarDatos() {
  const fechaEl  = document.getElementById('fecha');      // puede no existir (lo toleramos)
  const precioEl = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Fecha legible (misma para cabecera y rótulo de la tabla)
    let fechaTxt = datos.fecha || 'desconocida';
    try {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at || datos.fecha);
      if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');
    } catch {/* noop */}

    setTexto(fechaEl, fechaTxt);
    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);

    // Aviso de “sin cierre”
    if (datos.sin_cierre_operaciones) {
      const aviso = document.createElement('div');
      aviso.textContent = '⚠️ Hoy no hay cierre de operaciones en Infaoliva. Se muestran los últimos precios disponibles.';
      aviso.style.margin = '10px 0';
      aviso.style.padding = '10px 12px';
      aviso.style.background = '#fff8e1';
      aviso.style.border = '1px solid #ffe0a6';
      aviso.style.borderRadius = '8px';
      aviso.style.color = '#7a5e00';
      const card = document.querySelector('.card');
      card?.insertBefore(aviso, precioEl);
    }

    // Tabla de precios
    renderTabla(datos.precios || {});

    // Normaliza a nuestro selector y autoselecciona
    PRECIOS_MAP = normalizaPrecios(datos.precios || {});
    const sel = document.getElementById('tipo');
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }

    // Pintar precio y cálculo inicial
    actualizarPrecioSeleccion();
    calcular();

    // Listeners
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

/* ===== Modal Fuente ===== */
function setupModal() {
  const modal = document.getElementById('modal');
  const open = document.getElementById('openModal');
  const close = document.getElementById('closeModal');
  if (!modal || !open || !close) return;

  const show = () => modal.classList.add('show');
  const hide = () => modal.classList.remove('show');

  open.addEventListener('click', (e) => { e.preventDefault(); show(); });
  close.addEventListener('click', (e) => { e.preventDefault(); hide(); });
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

/* Iniciar */
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupModal();
});

/* ===========================================================
   Utilidades
=========================================================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LABELS = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante'
};

const ORDER_TIPOS = ['virgen_extra', 'virgen', 'lampante'];

/* ===========================================================
   Referencias DOM
=========================================================== */
const elRend   = $('#rendimiento');
const elTipo   = $('#tipo');
const elPrecio = $('#precio');
const elRes    = $('#resultado');

const elTablaInfo   = $('#tabla-info');
const elTablaWrap   = $('#tabla-precios');

const fuenteLink  = $('#fuente-link');
const fuenteModal = $('#fuente-modal');
const fuenteClose = $('#modal-close');

const btnHist        = $('#btn-historial');
const histModal      = $('#hist-modal');
const histClose      = $('#hist-close');
const histLimiteSel  = $('#hist-limite');
const histBody       = $('#historial-body');

/* Estado en memoria */
let preciosActuales = null;  // { virgen_extra: num, virgen: num, lampante: num, actualizado?: str }
let historicoPlano  = null;  // [{fechaISO, fechaOrg, tipoKey, variedad, precio}...]

/* ===========================================================
   Carga de precios actuales
=========================================================== */
async function cargarPreciosActuales() {
  const url = `precio-aceite.json?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
  const data = await res.json();

  // Intentamos mapear a una estructura común
  function pick(obj, paths) {
    for (const p of paths) {
      const parts = p.split('.');
      let cur = obj;
      let ok = true;
      for (const k of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, k)) cur = cur[k];
        else { ok = false; break; }
      }
      if (ok && (typeof cur === 'number')) return cur;
    }
    return null;
  }

  const out = {
    virgen_extra: pick(data, [
      'Aceite de oliva virgen extra', 'virgen_extra', 'extra',
      've', 'virgenExtra.precio', 'virgen_extra.precio'
    ]),
    virgen: pick(data, [
      'Aceite de oliva virgen', 'virgen', 'aov_virgen',
      'virgen.precio'
    ]),
    lampante: pick(data, [
      'Aceite de oliva lampante', 'lampante', 'aov_lampante',
      'lampante.precio'
    ]),
    actualizado: data.actualizado || data.fecha || data.updated_at || null
  };

  // Si aún no se han encontrado, quizá vienen como {label: {precio_eur_kg:n}}
  const intentosEtiquetas = [
    ['Aceite de oliva virgen extra', 'virgen_extra'],
    ['Aceite de oliva virgen', 'virgen'],
    ['Aceite de oliva lampante', 'lampante']
  ];
  for (const [label, key] of intentosEtiquetas) {
    if (out[key] == null && data[label] && typeof data[label].precio_eur_kg === 'number') {
      out[key] = data[label].precio_eur_kg;
    }
  }

  // Requisito mínimo: al menos una cifra válida
  if (out.virgen_extra == null && out.virgen == null && out.lampante == null) {
    throw new Error('Formato de precio-aceite.json no reconocido');
  }
  preciosActuales = out;
}

/* Render de la tabla actual y textos */
function renderPreciosActuales() {
  if (!preciosActuales) return;

  // Rótulo fecha
  const f = preciosActuales.actualizado
    ? preciosActuales.actualizado
    : new Date().toLocaleString('es-ES');
  elTablaInfo.textContent = `Precios actualizados — ${f}`;

  // Tabla
  const rows = ORDER_TIPOS
    .map(k => {
      const val = preciosActuales[k];
      if (typeof val !== 'number') return '';
      return `
        <tr>
          <td class="tipo" data-label="Tipo de aceite de oliva">${LABELS[k]}</td>
          <td class="precio" data-label="Precio €/kg">${fmt.format(val)} €/kg</td>
        </tr>`;
    })
    .filter(Boolean)
    .join('');

  elTablaWrap.innerHTML = `
    <table class="price-table" aria-label="Tabla de precios actual">
      <thead>
        <tr>
          <th>Tipo de aceite de oliva</th>
          <th style="text-align:right;">Precio €/kg</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="2">No hay datos históricos para mostrar.</td></tr>'}</tbody>
    </table>`;

  // Texto superior (precio del tipo seleccionado)
  actualizarPrecioSeleccionado();
  // Resultado calculadora
  calcularResultado();
}

/* Precio seleccionado bajo los inputs */
function actualizarPrecioSeleccionado() {
  const key = elTipo.value;
  const precio = preciosActuales && preciosActuales[key];
  if (precio == null) {
    elPrecio.textContent = '';
    return;
  }
  elPrecio.textContent = `Precio ${LABELS[key]}: ${fmt.format(precio)} €/kg`;
}

/* Calculadora de €/kg aceituna = precio_aceite * rendimiento(%) */
function calcularResultado() {
  const key = elTipo.value;
  const precio = preciosActuales && preciosActuales[key];
  const r = parseFloat(elRend.value.replace(',', '.'));
  if (!precio || isNaN(r) || r < 0 || r > 100) {
    elRes.classList.remove('error');
    elRes.textContent = '';
    return;
  }
  const res = precio * (r / 100);
  elRes.classList.remove('error');
  elRes.textContent = `${fmt2.format(res)} €/kg`;
}

/* ===========================================================
   Modal "Fuente"
=========================================================== */
function abrirModal(modal) { modal.classList.add('open'); }
function cerrarModal(modal) { modal.classList.remove('open'); }

fuenteLink?.addEventListener('click', (e) => {
  e.preventDefault();
  abrirModal(fuenteModal);
});
fuenteClose?.addEventListener('click', () => cerrarModal(fuenteModal));
fuenteModal?.addEventListener('click', (e) => {
  if (e.target === fuenteModal) cerrarModal(fuenteModal);
});

/* ===========================================================
   Histórico (modal grande)
=========================================================== */
async function cargarHistorico() {
  if (historicoPlano) return; // ya cargado

  const url = `precio-aceite-historico.json?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
  const data = await res.json();

  // Intentamos reconocer 2 formas:
  // 1) Array de entradas {fecha, tipo, variedad, precio_eur_kg}
  // 2) Objeto con claves de tipo -> array de {fecha, precio_eur_kg, variedad?}
  let out = [];

  function normalizaFecha(s) {
    // Admite "YYYY-MM-DD" o "DD-MM-YYYY"
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    const m = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s; // fallback
  }

  function keyFromLabel(label) {
    // Devuelve virgen_extra | virgen | lampante
    label = (label || '').toLowerCase();
    if (label.includes('extra'))   return 'virgen_extra';
    if (label.includes('lamp'))    return 'lampante';
    if (label.includes('virgen'))  return 'virgen';
    return 'virgen_extra';
  }

  if (Array.isArray(data)) {
    out = data.map(d => ({
      fechaISO: normalizaFecha(d.fecha),
      fechaOrg: d.fecha,
      tipoKey: keyFromLabel(d.tipo),
      variedad: d.variedad || 'Picual',
      precio: typeof d.precio_eur_kg === 'number' ? d.precio_eur_kg : parseFloat(d.precio_eur_kg)
    })).filter(x => x.precio && x.fechaISO);
  } else if (data && typeof data === 'object') {
    // Ej: { "Aceite de oliva virgen extra": [ {fecha, precio_eur_kg}, ... ], ... }
    for (const k of Object.keys(data)) {
      const arr = Array.isArray(data[k]) ? data[k] : [];
      const tKey = keyFromLabel(k);
      for (const it of arr) {
        const precio = typeof it.precio_eur_kg === 'number' ? it.precio_eur_kg : parseFloat(it.precio_eur_kg);
        const fechaISO = normalizaFecha(it.fecha);
        if (!precio || !fechaISO) continue;
        out.push({
          fechaISO,
          fechaOrg: it.fecha,
          tipoKey: tKey,
          variedad: it.variedad || 'Picual',
          precio
        });
      }
    }
  }

  // Ordenar por fecha desc, después por orden de tipo
  out.sort((a, b) => {
    if (a.fechaISO < b.fechaISO) return 1;
    if (a.fechaISO > b.fechaISO) return -1;
    return ORDER_TIPOS.indexOf(a.tipoKey) - ORDER_TIPOS.indexOf(b.tipoKey);
  });

  historicoPlano = out;
}

function renderHistorico(limiteDias = 15) {
  if (!historicoPlano || historicoPlano.length === 0) {
    histBody.innerHTML = `<tr><td colspan="4" style="padding:12px;">No hay histórico para mostrar.</td></tr>`;
    return;
  }

  // Filtrar por “últimos N días distintos”
  const picked = [];
  const fechasVistas = new Set();

  for (const item of historicoPlano) {
    if (!fechasVistas.has(item.fechaISO)) {
      if (fechasVistas.size >= Number(limiteDias)) break;
      fechasVistas.add(item.fechaISO);
    }
    picked.push(item);
  }

  const rows = picked.map(it => `
    <tr>
      <td data-label="Fecha">${it.fechaOrg || it.fechaISO}</td>
      <td data-label="Tipo de aceite de oliva">${LABELS[it.tipoKey] || it.tipoKey}</td>
      <td data-label="Variedad">${it.variedad || '—'}</td>
      <td class="precio" data-label="Precio €/kg">${fmt.format(it.precio)} €/kg</td>
    </tr>
  `).join('');

  histBody.innerHTML = rows || `<tr><td colspan="4" style="padding:12px;">No hay histórico para mostrar.</td></tr>`;
}

/* Abrir / cerrar modal historial */
btnHist?.addEventListener('click', async () => {
  try {
    await cargarHistorico();
    renderHistorico(Number(histLimiteSel.value || 15));
    abrirModal(histModal);
  } catch (e) {
    console.error(e);
    alert('No se pudo cargar el histórico.');
  }
});
histClose?.addEventListener('click', () => cerrarModal(histModal));
histModal?.addEventListener('click', (e) => {
  if (e.target === histModal) cerrarModal(histModal);
});
histLimiteSel?.addEventListener('change', () => renderHistorico(Number(histLimiteSel.value || 15)));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModal(fuenteModal);
    cerrarModal(histModal);
  }
});

/* ===========================================================
   Eventos de UI existentes
=========================================================== */
elTipo.addEventListener('change', () => {
  actualizarPrecioSeleccionado();
  calcularResultado();
});
elRend.addEventListener('input', calcularResultado);

/* ===========================================================
   Inicio
=========================================================== */
(async function init() {
  try {
    await cargarPreciosActuales();
    renderPreciosActuales();
  } catch (e) {
    console.error(e);
    elTablaInfo.textContent = '';
    elTablaWrap.innerHTML = `
      <div style="padding:12px;">No hay datos históricos para mostrar.</div>
    `;
  }
})();

// app.js



// ====== Mapeo etiquetas -> claves del JSON ======

const TIPO\_LABEL = {

&nbsp; virgen\_extra: 'Aceite de oliva virgen extra',

&nbsp; virgen:       'Aceite de oliva virgen',

&nbsp; lampante:     'Aceite de oliva lampante',

};



let PRECIOS\_MAP = {};     // precios actuales

let HISTORICO\_MAP = {};   // histórico para la gráfica

let chart = null;         // instancia Chart.js



// ====== Utilidades ======

function setTexto(el, txt) { if (el) el.textContent = txt; }

function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }



function normalizaPrecios(preciosRaw) {

&nbsp; const map = {};

&nbsp; const ve = preciosRaw\['Aceite de oliva virgen extra']?.precio\_eur\_kg ?? null;

&nbsp; const v  = preciosRaw\['Aceite de oliva virgen']?.precio\_eur\_kg ?? null;

&nbsp; const l  = preciosRaw\['Aceite de oliva lampante']?.precio\_eur\_kg ?? null;

&nbsp; if (ve \&\& ve > 0 \&\& ve < 20) map.virgen\_extra = Number(ve);

&nbsp; if (v  \&\& v  > 0 \&\& v  < 20) map.virgen       = Number(v);

&nbsp; if (l  \&\& l  > 0 \&\& l  < 20) map.lampante     = Number(l);

&nbsp; return map;

}



// Espera datos.historico con esta forma posible:

// { "virgen\_extra":\[{fecha:"2024-01-15", precio\_eur\_kg:3.456},...], ... }

// o con claves de etiqueta larga como en la tabla.

function normalizaHistorico(h) {

&nbsp; const out = { virgen\_extra: \[], virgen: \[], lampante: \[] };

&nbsp; if (!h || typeof h !== 'object') return out;



&nbsp; const keyMap = {

&nbsp;   'Aceite de oliva virgen extra': 'virgen\_extra',

&nbsp;   'Aceite de oliva virgen': 'virgen',

&nbsp;   'Aceite de oliva lampante': 'lampante',

&nbsp;   'virgen\_extra': 'virgen\_extra',

&nbsp;   'virgen': 'virgen',

&nbsp;   'lampante': 'lampante',

&nbsp; };



&nbsp; Object.keys(h).forEach(k => {

&nbsp;   const key = keyMap\[k] ?? null;

&nbsp;   if (!key || !Array.isArray(h\[k])) return;



&nbsp;   out\[key] = h\[k]

&nbsp;     .map(p => ({

&nbsp;       fecha: p.fecha,

&nbsp;       precio: Number(

&nbsp;         (typeof p.precio\_eur\_kg !== 'undefined') ? p.precio\_eur\_kg : p.precio

&nbsp;       )

&nbsp;     }))

&nbsp;     .filter(p => p.fecha \&\& !Number.isNaN(p.precio) \&\& p.precio > 0 \&\& p.precio < 20)

&nbsp;     .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

&nbsp; });



&nbsp; // Limitar a ~24 meses si viene más largo

&nbsp; Object.keys(out).forEach(k => {

&nbsp;   if (out\[k].length > 0) {

&nbsp;     const last24 = out\[k].slice(-24);

&nbsp;     out\[k] = last24;

&nbsp;   }

&nbsp; });



&nbsp; return out;

}



// ====== Tabla de precios principal ======

function renderTabla(preciosRaw) {

&nbsp; const cont = document.getElementById('tabla-precios');

&nbsp; if (!cont) return;



&nbsp; const rows = \[

&nbsp;   \['Aceite de oliva virgen extra', preciosRaw\['Aceite de oliva virgen extra']?.precio\_eur\_kg],

&nbsp;   \['Aceite de oliva virgen',       preciosRaw\['Aceite de oliva virgen']?.precio\_eur\_kg],

&nbsp;   \['Aceite de oliva lampante',     preciosRaw\['Aceite de oliva lampante']?.precio\_eur\_kg],

&nbsp; ];



&nbsp; const cuerpo = rows.map((\[label, val]) => {

&nbsp;   const precioTxt = (val \&\& val > 0 \&\& val < 20) ? euros(val) : '—';

&nbsp;   return `

&nbsp;     <tr>

&nbsp;       <td class="tipo" data-label="Tipo de aceite de oliva">${label}</td>

&nbsp;       <td class="precio" data-label="Precio €/kg">${precioTxt}</td>

&nbsp;     </tr>`;

&nbsp; }).join('');



&nbsp; cont.innerHTML = `

&nbsp;   <table class="price-table">

&nbsp;     <thead>

&nbsp;       <tr>

&nbsp;         <th>Tipo de aceite de oliva</th>

&nbsp;         <th>Precio €/kg</th>

&nbsp;       </tr>

&nbsp;     </thead>

&nbsp;     <tbody>${cuerpo}</tbody>

&nbsp;   </table>

&nbsp; `;

}



// ====== Precio seleccionado (debajo del selector) ======

function actualizarPrecioSeleccion() {

&nbsp; const sel = document.getElementById('tipo');

&nbsp; const precioEl = document.getElementById('precio');

&nbsp; if (!sel || !precioEl) return;



&nbsp; const key = sel.value;

&nbsp; const precio = PRECIOS\_MAP\[key];



&nbsp; if (precio) setTexto(precioEl, `Precio ${TIPO\_LABEL\[key]}: ${euros(precio)}`);

&nbsp; else if (key) setTexto(precioEl, '— Precio no disponible —');

&nbsp; else setTexto(precioEl, '');

}



// ====== Calculadora (tabla 4 columnas) ======

function calcular() {

&nbsp; const sel = document.getElementById('tipo');

&nbsp; const res = document.getElementById('resultado');

&nbsp; const rEl = document.getElementById('rendimiento');

&nbsp; if (!sel || !res || !rEl) return;



&nbsp; const key = sel.value;

&nbsp; const rendimiento = Number(rEl.value);

&nbsp; const precio = PRECIOS\_MAP\[key];



&nbsp; if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100) {

&nbsp;   res.classList.add('error');

&nbsp;   res.innerHTML = `

&nbsp;     <strong>Falta información:</strong> selecciona una calidad con precio disponible y

&nbsp;     escribe un rendimiento entre 0 y 100.

&nbsp;   `;

&nbsp;   return;

&nbsp; }



&nbsp; const precioAceituna = (rendimiento / 100) \* precio;



&nbsp; res.classList.remove('error');

&nbsp; res.innerHTML = `

&nbsp;   <table class="calc-table">

&nbsp;     <thead>

&nbsp;       <tr>

&nbsp;         <th>Rendimiento (%)</th>

&nbsp;         <th>Calidad del Aceite</th>

&nbsp;         <th>Precio del Aceite</th>

&nbsp;         <th>Precio aceituna (€/kg)</th>

&nbsp;       </tr>

&nbsp;     </thead>

&nbsp;     <tbody>

&nbsp;       <tr>

&nbsp;         <td data-label="Rendimiento (%)">${rendimiento}%</td>

&nbsp;         <td data-label="Calidad del Aceite">${TIPO\_LABEL\[key]}</td>

&nbsp;         <td data-label="Precio del Aceite">${precio.toFixed(3)} €/kg</td>

&nbsp;         <td data-label="Precio aceituna (€/kg)"><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>

&nbsp;       </tr>

&nbsp;     </tbody>

&nbsp;   </table>

&nbsp; `;

}



// ====== Gráfica ======

function renderChartFor(key) {

&nbsp; const empty = document.getElementById('chart-empty');

&nbsp; const canvas = document.getElementById('chartPrecios');

&nbsp; if (!canvas) return;



&nbsp; const serie = HISTORICO\_MAP\[key] ?? \[];

&nbsp; if (!serie.length) {

&nbsp;   if (chart) { chart.destroy(); chart = null; }

&nbsp;   empty.style.display = '';

&nbsp;   return;

&nbsp; }

&nbsp; empty.style.display = 'none';



&nbsp; const labels = serie.map(p => p.fecha);

&nbsp; const data   = serie.map(p => p.precio);



&nbsp; if (chart) chart.destroy();



&nbsp; chart = new Chart(canvas.getContext('2d'), {

&nbsp;   type: 'line',

&nbsp;   data: {

&nbsp;     labels,

&nbsp;     datasets: \[{

&nbsp;       label: `${TIPO\_LABEL\[key]} (€/kg)`,

&nbsp;       data,

&nbsp;       tension: 0.25,

&nbsp;       pointRadius: 2,

&nbsp;     }]

&nbsp;   },

&nbsp;   options: {

&nbsp;     responsive: true,

&nbsp;     maintainAspectRatio: false,

&nbsp;     scales: {

&nbsp;       x: { ticks: { maxRotation: 0, autoSkip: true }, grid: { display:false } },

&nbsp;       y: { beginAtZero: false }

&nbsp;     },

&nbsp;     plugins: {

&nbsp;       legend: { display: true },

&nbsp;       tooltip: { callbacks: { label: (ctx) => ` ${euros(ctx.parsed.y)}` } }

&nbsp;     }

&nbsp;   }

&nbsp; });

}



// ====== Modal “De dónde obtenemos los precios” ======

function setupFuenteModal() {

&nbsp; const link = document.getElementById('fuente-link');

&nbsp; const modal = document.getElementById('fuente-modal');

&nbsp; const closeBtn = document.getElementById('modal-close');

&nbsp; if (!link || !modal || !closeBtn) return;



&nbsp; const open = () => { modal.classList.add('open'); link.blur(); };

&nbsp; const close = () => { modal.classList.remove('open'); link.focus(); };



&nbsp; link.addEventListener('click', e => { e.preventDefault(); open(); });

&nbsp; closeBtn.addEventListener('click', close);

&nbsp; modal.addEventListener('click', e => { if (e.target === modal) close(); });

&nbsp; document.addEventListener('keydown', e => { if (e.key === 'Escape' \&\& modal.classList.contains('open')) close(); });

}



// ====== Carga de datos ======

async function cargarDatos() {

&nbsp; const fechaEl     = document.getElementById('fecha');      // puede no existir

&nbsp; const precioEl    = document.getElementById('precio');

&nbsp; const tablaInfoEl = document.getElementById('tabla-info');



&nbsp; try {

&nbsp;   const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });

&nbsp;   if (!res.ok) throw new Error(`HTTP ${res.status}`);

&nbsp;   const datos = await res.json();



&nbsp;   // Fecha legible

&nbsp;   let fechaTxt = datos.fecha || 'desconocida';

&nbsp;   try {

&nbsp;     const f = new Date(datos.ultima\_actualizacion || datos.generated\_at || datos.fecha);

&nbsp;     if (!isNaN(f)) fechaTxt = f.toLocaleString('es-ES');

&nbsp;   } catch {}



&nbsp;   setTexto(fechaEl, fechaTxt); // si no existe, no hace nada

&nbsp;   setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);



&nbsp;   // Tabla de precios

&nbsp;   renderTabla(datos.precios || {});



&nbsp;   // Normaliza actuales

&nbsp;   PRECIOS\_MAP = normalizaPrecios(datos.precios || {});

&nbsp;   const sel = document.getElementById('tipo');

&nbsp;   if (sel \&\& !sel.value) {

&nbsp;     if (PRECIOS\_MAP.virgen\_extra) sel.value = 'virgen\_extra';

&nbsp;     else if (PRECIOS\_MAP.virgen)   sel.value = 'virgen';

&nbsp;     else if (PRECIOS\_MAP.lampante) sel.value = 'lampante';

&nbsp;   }



&nbsp;   // Pintar precio y cálculo inicial

&nbsp;   actualizarPrecioSeleccion();

&nbsp;   calcular();



&nbsp;   // ===== Gráfica =====

&nbsp;   HISTORICO\_MAP = normalizaHistorico(datos.historico || {});

&nbsp;   const serieSel = document.getElementById('serie-calidad');

&nbsp;   // Seleccionar en la gráfica la misma calidad del selector (o la primera con datos)

&nbsp;   let grafKey = sel?.value || 'virgen\_extra';

&nbsp;   if (!HISTORICO\_MAP\[grafKey]?.length) {

&nbsp;     grafKey = \['virgen\_extra','virgen','lampante'].find(k => HISTORICO\_MAP\[k]?.length) || grafKey;

&nbsp;   }

&nbsp;   if (serieSel) serieSel.value = grafKey;

&nbsp;   renderChartFor(grafKey);



&nbsp;   // Listeners

&nbsp;   sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); });

&nbsp;   document.getElementById('rendimiento')?.addEventListener('input', calcular);

&nbsp;   serieSel?.addEventListener('change', () => renderChartFor(serieSel.value));



&nbsp; } catch (err) {

&nbsp;   console.error('\[cargarDatos] Error:', err);

&nbsp;   setTexto(fechaEl, 'Error cargando datos');

&nbsp;   setTexto(precioEl, 'No se pudieron cargar los precios.');

&nbsp;   setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');



&nbsp;   const tabla = document.getElementById('tabla-precios');

&nbsp;   if (tabla) tabla.innerHTML = '';



&nbsp;   const res = document.getElementById('resultado');

&nbsp;   if (res) { res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }



&nbsp;   const empty = document.getElementById('chart-empty');

&nbsp;   if (empty) empty.style.display = '';

&nbsp; }

}



// ====== Inicio ======

document.addEventListener('DOMContentLoaded', () => {

&nbsp; cargarDatos();

&nbsp; setupFuenteModal(); // modal “De dónde obtenemos los precios”

});


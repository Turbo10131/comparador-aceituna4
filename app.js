// app.js

const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};
let HISTORICO = {};
let grafico = null;
let modoGraf = 'years'; // 'years' | 'months' | 'days'

const setTexto = (el, txt) => { if (el) el.textContent = txt; };
const euros = (n) => `${Number(n).toFixed(3)} €/kg`;

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
        <tr><th>Tipo de aceite de oliva</th><th>Precio €/kg</th></tr>
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
          <td>${rendimiento}%</td>
          <td>${TIPO_LABEL[key]}</td>
          <td>${precio.toFixed(3)} €/kg</td>
          <td><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

function setupFuenteModal() {
  const link = document.getElementById('fuente-link');
  const modal = document.getElementById('fuente-modal');
  const cerrar = document.getElementById('modal-close');
  if (!link || !modal || !cerrar) return;

  link.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('open'); });
  cerrar.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('open'); });
}

/* ------------ Parser historico.txt ------------- */
function parseHistoricoTxt(txt) {
  const out = {
    'Aceite de oliva virgen extra': [],
    'Aceite de oliva virgen': [],
    'Aceite de oliva lampante': []
  };
  const lines = txt.split(/\r?\n/);
  let fechaActual = null;
  const fechaRegexp = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const fm = line.match(fechaRegexp);
    if (fm) {
      const d = fm[1].padStart(2,'0'), m = fm[2].padStart(2,'0');
      let y = fm[3]; if (y.length===2) y = (Number(y)>50?'19':'20') + y;
      fechaActual = `${y}-${m}-${d}`;
      continue;
    }
    if (/Sin\s+cierre/i.test(line)) continue;

    for (const tipo of Object.keys(out)) {
      if (line.toLowerCase().includes(tipo.toLowerCase())) {
        const numMatch = line.match(/(\d+[.,]?\d*)/g);
        if (!numMatch || !fechaActual) break;
        const numRaw = numMatch[numMatch.length - 1].replace(',', '.');
        const valor = Number(numRaw);
        if (!isNaN(valor) && valor > 0 && valor < 20) {
          out[tipo].push({ fecha: fechaActual, precio_eur_kg: valor });
        }
        break;
      }
    }
  }
  for (const tipo of Object.keys(out)) {
    const map = new Map();
    for (const p of out[tipo]) map.set(p.fecha, p.precio_eur_kg);
    out[tipo] = [...map.entries()].map(([fecha, precio_eur_kg]) => ({fecha, precio_eur_kg}))
      .sort((a,b)=>a.fecha.localeCompare(b.fecha));
  }
  return out;
}

/* ------------ Series según modo ------------- */
function seriePorAnios(datos) {
  const buckets = {};
  datos.forEach(d => {
    const y = d.fecha.slice(0,4);
    if (!buckets[y]) buckets[y]=[];
    buckets[y].push(d.precio_eur_kg);
  });
  const labels = Object.keys(buckets).sort((a,b)=>a.localeCompare(b));
  const values = labels.map(y=>{
    const arr=buckets[y]; return Number((arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(3));
  });
  return {labels, values};
}
function seriePorMeses(datos, n=24) {
  const buckets = {};
  datos.forEach(d=>{
    const ym = d.fecha.slice(0,7);
    if(!buckets[ym]) buckets[ym]=[];
    buckets[ym].push(d.precio_eur_kg);
  });
  let labels = Object.keys(buckets).sort((a,b)=>a.localeCompare(b));
  let values = labels.map(k=>{
    const arr=buckets[k]; return Number((arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(3));
  });
  if (labels.length>n){ labels=labels.slice(-n); values=values.slice(-n); }
  labels = labels.map(ym=>{
    const [y,m]=ym.split('-'); const date=new Date(Number(y), Number(m)-1,1);
    return date.toLocaleDateString('es-ES',{month:'short', year:'numeric'});
  });
  return {labels, values};
}
function seriePorDias(datos, n=90) {
  let arr=[...datos].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if (arr.length>n) arr=arr.slice(-n);
  return {
    labels: arr.map(d=> new Date(d.fecha).toLocaleDateString('es-ES')),
    values: arr.map(d=> d.precio_eur_kg)
  };
}

/* ------------ Render Chart ------------- */
function renderChart(tipo) {
  const canvas = document.getElementById('grafico-precios');
  const msg = document.getElementById('grafico-msg');
  if (!canvas) return;

  const datos = HISTORICO[TIPO_LABEL[tipo]];
  if (!datos || !datos.length) {
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    if (grafico) { grafico.destroy(); grafico=null; }
    return;
  }
  if (msg) msg.textContent = '';

  let series;
  if (modoGraf === 'years')   series = seriePorAnios(datos);
  else if (modoGraf === 'months') series = seriePorMeses(datos, 24);
  else                         series = seriePorDias(datos, 90);

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [{
        label: TIPO_LABEL[tipo],
        data: series.values,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.10)',
        pointRadius: 3,
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend:{display:true}, tooltip:{mode:'index', intersect:false} },
      scales: {
        x: {
          title:{display:true, text: modoGraf==='years'?'Año':(modoGraf==='months'?'Mes':'Fecha')},
          ticks:{ autoSkip: modoGraf!=='years', maxRotation:0 }
        },
        y: { title:{display:true, text:'€/kg'} }
      }
    }
  });
}

/* ------------ Carga de datos ------------- */
async function cargarDatos() {
  const fechaEl     = document.getElementById('fecha');
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    HISTORICO = {};
    try {
      const resHist = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resHist.ok) {
        HISTORICO = await resHist.json();
      } else {
        const resTxt = await fetch(`historico.txt?v=${Date.now()}`, { cache: 'no-store' });
        if (resTxt.ok) {
          const txt = await resTxt.text();
          HISTORICO = parseHistoricoTxt(txt);
        }
      }
    } catch {}

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

    const selGraf = document.getElementById('grafico-tipo');
    if (selGraf && !selGraf.value) selGraf.value = sel?.value || 'virgen_extra';

    sel?.addEventListener('change', () => { actualizarPrecioSeleccion(); calcular(); renderChart(selGraf.value); });
    document.getElementById('rendimiento')?.addEventListener('input', calcular);
    selGraf?.addEventListener('change', () => renderChart(selGraf.value));

    // Botones de rango
    const btnYears  = document.getElementById('btn-years');
    const btnMonths = document.getElementById('btn-months');
    const btnDays   = document.getElementById('btn-days');

    const setActive = (btn) => {
      [btnYears, btnMonths, btnDays].forEach(b => b?.classList.remove('active'));
      btn?.classList.add('active');
    };
    btnYears?.addEventListener('click',  () => { modoGraf='years';  setActive(btnYears);  renderChart(selGraf.value); });
    btnMonths?.addEventListener('click', () => { modoGraf='months'; setActive(btnMonths); renderChart(selGraf.value); });
    btnDays?.addEventListener('click',   () => { modoGraf='days';   setActive(btnDays);   renderChart(selGraf.value); });

    // Estado inicial: Años activo
    setActive(btnYears);
    renderChart(selGraf?.value || 'virgen_extra');

  } catch (err) {
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  setupFuenteModal();
});

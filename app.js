// ====== Mapeo etiquetas -> claves del JSON ======
const TIPO_LABEL = {
  virgen_extra: 'Aceite de oliva virgen extra',
  virgen:       'Aceite de oliva virgen',
  lampante:     'Aceite de oliva lampante',
};

let PRECIOS_MAP = {};
let HISTORICO   = {};
let grafico     = null;

// Estado del gráfico
let modoVista         = 'meses'; // 'anios' | 'meses' | 'dias'
let anoSeleccionado   = 'todos';
let tipoSeleccionado  = 'virgen_extra';

// ====== Utils ======
function setTexto(el, txt){ if(el) el.textContent = txt; }
function euros(n){ return `${Number(n).toFixed(3)} €/kg`; }
function toISO(d){ return new Date(d); }

function normalizaPrecios(preciosRaw){
  const map = {};
  const ve = preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg ?? null;
  const v  = preciosRaw['Aceite de oliva virgen']?.precio_eur_kg ?? null;
  const l  = preciosRaw['Aceite de oliva lampante']?.precio_eur_kg ?? null;
  if (ve && ve > 0 && ve < 20) map.virgen_extra = Number(ve);
  if (v  && v  > 0 && v  < 20) map.virgen       = Number(v);
  if (l  && l  > 0 && l  < 20) map.lampante     = Number(l);
  return map;
}

// ====== Tabla ======
function renderTabla(preciosRaw){
  const cont = document.getElementById('tabla-precios');
  if (!cont) return;

  const rows = [
    ['Aceite de oliva virgen extra', preciosRaw['Aceite de oliva virgen extra']?.precio_eur_kg],
    ['Aceite de oliva virgen',       preciosRaw['Aceite de oliva virgen']?.precio_eur_kg],
    ['Aceite de oliva lampante',     preciosRaw['Aceite de oliva lampante']?.precio_eur_kg],
  ];

  const cuerpo = rows.map(([label, val])=>{
    const precioTxt = (val && val>0 && val<20) ? euros(val) : '—';
    return `<tr>
      <td class="tipo" data-label="Tipo de aceite de oliva">${label}</td>
      <td class="precio" data-label="Precio €/kg">${precioTxt}</td>
    </tr>`;
  }).join('');

  cont.innerHTML = `
    <table class="price-table">
      <thead><tr><th>Tipo de aceite de oliva</th><th>Precio €/kg</th></tr></thead>
      <tbody>${cuerpo}</tbody>
    </table>`;
}

// ====== Precio seleccionado ======
function actualizarPrecioSeleccion(){
  const sel = document.getElementById('tipo');
  const precioEl = document.getElementById('precio');
  if (!sel || !precioEl) return;

  const key = sel.value;
  const precio = PRECIOS_MAP[key];

  if (precio){
    setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  } else if (key){
    setTexto(precioEl, '— Precio no disponible —');
  } else {
    setTexto(precioEl, '');
  }
}

// ====== Calculadora ======
function calcular(){
  const sel = document.getElementById('tipo');
  const res = document.getElementById('resultado');
  const rEl = document.getElementById('rendimiento');
  if (!sel || !res || !rEl) return;

  const key = sel.value;
  const rendimiento = Number(rEl.value);
  const precio = PRECIOS_MAP[key];

  if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100){
    res.classList.add('error');
    res.innerHTML = `<strong>Falta información:</strong> selecciona una calidad con precio disponible y escribe un rendimiento entre 0 y 100.`;
    return;
  }

  const precioAceituna = (rendimiento / 100) * precio;
  res.classList.remove('error');
  res.innerHTML = `
    <table class="calc-table">
      <thead><tr>
        <th>Rendimiento (%)</th><th>Calidad del Aceite</th><th>Precio del Aceite</th><th>Precio aceituna (€/kg)</th>
      </tr></thead>
      <tbody><tr>
        <td>${rendimiento}%</td>
        <td>${TIPO_LABEL[key]}</td>
        <td>${precio.toFixed(3)} €/kg</td>
        <td><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
      </tr></tbody>
    </table>`;
}

// ====== Modal ======
function setupFuenteModal(){
  const link   = document.getElementById('fuente-link');
  const modal  = document.getElementById('fuente-modal');
  const cerrar = document.getElementById('modal-close');
  if (!link || !modal || !cerrar) return;

  link.addEventListener('click', e=>{ e.preventDefault(); modal.classList.add('open'); });
  cerrar.addEventListener('click', ()=> modal.classList.remove('open'));
  modal.addEventListener('click', e=>{ if (e.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', e=>{ if (e.key === 'Escape') modal.classList.remove('open'); });
}

// ====== Helpers histórico ======
function getSerie(tipo){
  const label = TIPO_LABEL[tipo];
  return (HISTORICO[label] || [])
    .filter(d => d && d.fecha && d.precio_eur_kg && d.precio_eur_kg > 0)
    .map(d => ({ fecha: d.fecha, precio: Number(d.precio_eur_kg) }))
    .sort((a,b) => toISO(a.fecha) - toISO(b.fecha));
}

function anosDisponibles(tipo){
  const set = new Set();
  getSerie(tipo).forEach(d => set.add(d.fecha.slice(0,4)));
  return Array.from(set).sort(); // asc
}

function agrupaPorMes(serie){
  const map = new Map(); // yyyy-mm -> [precios]
  for (const p of serie){
    const key = p.fecha.slice(0,7);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p.precio);
  }
  const out = [];
  for (const [k, arr] of map.entries()){
    const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
    out.push({ etiqueta: k, valor: avg });
  }
  return out.sort((a,b)=> (a.etiqueta > b.etiqueta ? 1 : -1));
}

function agrupaPorAnio(serie){
  const map = new Map(); // yyyy -> [precios]
  for (const p of serie){
    const key = p.fecha.slice(0,4);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p.precio);
  }
  const out = [];
  for (const [k, arr] of map.entries()){
    const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
    out.push({ etiqueta: k, valor: avg });
  }
  return out.sort((a,b)=> Number(a.etiqueta) - Number(b.etiqueta));
}

function preparaDatos(){
  let serie = getSerie(tipoSeleccionado);

  if (modoVista === 'dias'){
    if (anoSeleccionado !== 'todos'){
      serie = serie.filter(d => d.fecha.startsWith(anoSeleccionado));
    }
    return {
      labels: serie.map(d => d.fecha),
      data:   serie.map(d => d.precio),
      xTitle: 'Día'
    };
  }

  if (modoVista === 'meses'){
    if (anoSeleccionado !== 'todos'){
      serie = serie.filter(d => d.fecha.startsWith(anoSeleccionado));
    }
    const agg = agrupaPorMes(serie);
    return {
      labels: agg.map(d => d.etiqueta),
      data:   agg.map(d => d.valor),
      xTitle: 'Mes'
    };
  }

  // 'anios'
  const agg = agrupaPorAnio(serie);
  return {
    labels: agg.map(d => d.etiqueta),
    data:   agg.map(d => d.valor),
    xTitle: 'Año'
  };
}

function pintaGrafico(){
  const canvas = document.getElementById('grafico-precios');
  const msg    = document.getElementById('grafico-msg');
  if (!canvas) return;

  const { labels, data, xTitle } = preparaDatos();

  if (!labels.length){
    if (grafico){ grafico.destroy(); grafico = null; }
    if (msg) msg.textContent = 'No hay datos históricos para mostrar.';
    return;
  }
  if (msg) msg.textContent = '';

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: TIPO_LABEL[tipoSeleccionado],
        data,
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31,111,235,0.12)',
        pointRadius: 3,
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: xTitle } },
        y: { title: { display: true, text: '€/kg' } }
      }
    }
  });
}

// Rellena el selector de años con los disponibles para el tipo elegido
function rellenaSelectorAnos(){
  const selYear = document.getElementById('grafico-year');
  if (!selYear) return;

  const years = anosDisponibles(tipoSeleccionado);
  const valorAnterior = selYear.value;

  selYear.innerHTML = `<option value="todos">Todos los años</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join('');

  // Intenta mantener selección si sigue existiendo
  if (years.includes(valorAnterior)) selYear.value = valorAnterior;
  else selYear.value = 'todos';

  anoSeleccionado = selYear.value;
}

// ====== Carga de datos ======
async function cargarDatos(){
  const fechaEl     = document.getElementById('fecha');
  const precioEl    = document.getElementById('precio');
  const tablaInfoEl = document.getElementById('tabla-info');

  try {
    // Actual
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    // Histórico
    try {
      const h = await fetch(`precio-aceite-historico.json?v=${Date.now()}`, { cache: 'no-store' });
      if (h.ok) HISTORICO = await h.json();
      else HISTORICO = {};
    } catch { HISTORICO = {}; }

    // Fecha legible
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
    if (sel && !sel.value){
      if (PRECIOS_MAP.virgen_extra) sel.value = 'virgen_extra';
      else if (PRECIOS_MAP.virgen)   sel.value = 'virgen';
      else if (PRECIOS_MAP.lampante) sel.value = 'lampante';
    }
    actualizarPrecioSeleccion();
    calcular();

    // Listeners calculadora
    sel?.addEventListener('change', ()=>{ actualizarPrecioSeleccion(); calcular(); });

    document.getElementById('rendimiento')?.addEventListener('input', calcular);

    // GRÁFICO
    const selTipoGraf = document.getElementById('grafico-tipo');
    const selYear     = document.getElementById('grafico-year');
    const bAnos       = document.getElementById('btn-anos');
    const bMeses      = document.getElementById('btn-meses');
    const bDias       = document.getElementById('btn-dias');

    // Estado inicial del gráfico
    tipoSeleccionado = selTipoGraf.value;
    rellenaSelectorAnos();
    pintaGrafico();

    // Listeners gráfico
    selTipoGraf.addEventListener('change', ()=>{
      tipoSeleccionado = selTipoGraf.value;
      rellenaSelectorAnos();
      pintaGrafico();
    });

    selYear.addEventListener('change', ()=>{
      anoSeleccionado = selYear.value;
      pintaGrafico();
    });

    const activa = (btn)=>{
      [bAnos,bMeses,bDias].forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    }

    bAnos.addEventListener('click', ()=>{
      modoVista = 'anios';
      activa(bAnos);
      // En modo años el año seleccionado no aplica; mantenemos 'todos'
      document.getElementById('grafico-year').value = 'todos';
      anoSeleccionado = 'todos';
      pintaGrafico();
    });
    bMeses.addEventListener('click', ()=>{
      modoVista = 'meses';
      activa(bMeses);
      pintaGrafico();
    });
    bDias.addEventListener('click', ()=>{
      modoVista = 'dias';
      activa(bDias);
      pintaGrafico();
    });

  } catch (err){
    console.error('[cargarDatos] Error:', err);
    setTexto(fechaEl, 'Error cargando datos');
    setTexto(precioEl, 'No se pudieron cargar los precios.');
    setTexto(tablaInfoEl, 'Precios actualizados — (error al cargar)');
    const tabla = document.getElementById('tabla-precios');
    if (tabla) tabla.innerHTML = '';
    const res = document.getElementById('resultado');
    if (res){ res.classList.add('error'); res.textContent = 'No se pudo calcular.'; }
  }
}

// ====== Inicio ======
document.addEventListener('DOMContentLoaded', ()=>{
  cargarDatos();
  setupFuenteModal();
});

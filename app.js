/* ===========================================
   Configuración de rutas para los JSON
   - Deja DATA_BASE = '' si Netlify sirve los ficheros
   - O usa el raw de GitHub:
     const DATA_BASE = 'https://raw.githubusercontent.com/Turbo10131/grafica-aceite/main/';
   =========================================== */
const DATA_BASE = ''; // <-- cambia a raw de GitHub si lo prefieres

// Nodos UI
const $rend      = document.querySelector('#rendimiento');
const $tipo      = document.querySelector('#tipo');
const $precio    = document.querySelector('#precio');
const $resultado = document.querySelector('#resultado');
const $tablaInfo = document.querySelector('#tabla-info');
const $tablaWrap = document.querySelector('#tabla-precios');

// Modal fuente (ya lo tienes en tu HTML)
const $modalFuente  = document.querySelector('#fuente-modal');
const $fuenteLink   = document.querySelector('#fuente-link');
const $modalClose   = document.querySelector('#modal-close');

// Modal “Consultar precios” (solo si añadiste el bloque del modal)
const $btnConsultar = document.querySelector('#btn-consultar-precios');
const $modalPrecios = document.querySelector('#precios-modal');
const $modalClose2  = document.querySelector('#precios-modal-close');
const $modalBody2   = document.querySelector('#precios-modal-body');

/* ============ Helpers ============ */
function normalizaClave(str){
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function parseNumero(valor){
  if (typeof valor === 'number') return valor;
  if (typeof valor !== 'string') return NaN;
  // "3.392 €/kg" | "3,392 €" | "4,025"
  const limpio = valor.replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.');
  return parseFloat(limpio);
}
function extraePrecioDeItem(item){
  if (!item || typeof item !== 'object') return null;
  if ('precio_eur_kg' in item) {
    const n = parseNumero(item.precio_eur_kg);
    return Number.isFinite(n) ? n : null;
  }
  if ('precio' in item) {
    const n = parseNumero(item.precio);
    return Number.isFinite(n) ? n : null;
  }
  for (const k of Object.keys(item)) {
    if (/precio/i.test(k)) {
      const n = parseNumero(item[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
const fmtEur = (n) => `${(n ?? 0).toFixed(3)} €/kg`;
const fmtDate = (d) => {
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch {
    return String(d ?? '');
  }
};

/* ============ Parser robusto: precio-aceite.json ============ */
function parsearPrecioActual(json){
  // Devuelve { ve, v, l, actualizado? }
  const out = { ve: null, v: null, l: null, actualizado: null };

  const mapea = (tipo, precio) => {
    const t = normalizaClave(tipo);
    if (t.includes('virgen extra')) out.ve = precio;
    else if (t === 'virgen' || (t.includes(' virgen') && !t.includes('extra'))) out.v = precio;
    else if (t.includes('lampante')) out.l = precio;
  };

  const intentaObjeto = (o) => {
    for (const k of Object.keys(o)) {
      if (normalizaClave(k) === 'actualizado') { out.actualizado = o[k]; continue; }
      const val = o[k];
      let precio = null;

      if (typeof val === 'number' || typeof val === 'string') {
        const n = parseNumero(val);
        if (Number.isFinite(n)) precio = n;
      } else if (val && typeof val === 'object') {
        precio = extraePrecioDeItem(val);
      }
      if (precio != null) mapea(k, precio);
    }
  };

  const intentaArray = (arr) => {
    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;
      const tipo = it.tipo || it.nombre || it.calidad || it.TIPO || it['Tipo'] || it['Aceite'];
      const precio = extraePrecioDeItem(it);
      if (tipo && precio != null) mapea(tipo, precio);
      if (!out.actualizado && it.actualizado) out.actualizado = it.actualizado;
    }
  };

  if (Array.isArray(json)) {
    intentaArray(json);
  } else if (json && typeof json === 'object') {
    intentaObjeto(json);
    // por si vienen anidados
    for (const k of Object.keys(json)) {
      const v = json[k];
      if (Array.isArray(v)) intentaArray(v);
      else if (v && typeof v === 'object') intentaObjeto(v);
    }
  }

  if (out.ve == null && out.v == null && out.l == null) return null;
  return out;
}

/* ============ Cargar precios actuales ============ */
async function cargarPreciosActuales(){
  const url = `${DATA_BASE}precio-aceite.json?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar precio-aceite.json (${res.status})`);
  const json = await res.json();

  const parsed = parsearPrecioActual(json);
  if (!parsed) throw new Error('Formato de precio-aceite.json no reconocido');

  return {
    virgen_extra: parsed.ve,
    virgen: parsed.v,
    lampante: parsed.l,
    actualizado: parsed.actualizado || null
  };
}

/* ============ Parser robusto: histórico ============ */
function parsearHistorico(json){
  // Devuelve un array normalizado: [{fecha, tipo, variedad?, precio}]
  const salida = [];

  const pushItem = (fecha, tipo, variedad, precio) => {
    if (!fecha || precio == null) return;
    salida.push({ fecha, tipo, variedad: variedad || '', precio: +precio });
  };

  const nomVE = 'Aceite de oliva virgen extra';
  const nomV  = 'Aceite de oliva virgen';
  const nomL  = 'Aceite de oliva lampante';

  const procesaArray = (arr, tipoForzado) => {
    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;
      const tipo  = tipoForzado || it.tipo || it.nombre || it.aceite || it['Tipo'] || '';
      const fecha = it.fecha || it.date || it['Fecha'];
      const varid = it.variedad || it['Variedad'] || '';
      const precio = extraePrecioDeItem(it);
      if (fecha && precio != null) pushItem(fecha, tipo, varid, precio);
    }
  };

  const procesaObjeto = (o) => {
    for (const k of Object.keys(o)) {
      const nk = normalizaClave(k);
      const v = o[k];

      if (Array.isArray(v)) {
        let tipoForzado = k;
        if (nk.includes('virgen extra')) tipoForzado = nomVE;
        else if (nk === 'virgen' || (nk.includes(' virgen') && !nk.includes('extra'))) tipoForzado = nomV;
        else if (nk.includes('lampante')) tipoForzado = nomL;
        procesaArray(v, tipoForzado);
      } else if (v && typeof v === 'object') {
        procesaObjeto(v);
      }
    }
  };

  if (Array.isArray(json)) {
    procesaArray(json, '');
  } else if (json && typeof json === 'object') {
    // si está en el formato esperado agrupado por claves
    if (json[nomVE] || json[nomV] || json[nomL]) {
      if (Array.isArray(json[nomVE])) procesaArray(json[nomVE], nomVE);
      if (Array.isArray(json[nomV]))  procesaArray(json[nomV],  nomV);
      if (Array.isArray(json[nomL]))  procesaArray(json[nomL],  nomL);
    }
    procesaObjeto(json); // por si hay más niveles
  }

  // orden por fecha descendente
  salida.sort((a,b)=> new Date(b.fecha) - new Date(a.fecha));
  return salida;
}

/* ============ Cargar histórico ============ */
async function cargarHistorico(){
  const url = `${DATA_BASE}precio-aceite-historico.json?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar el histórico (${res.status})`);
  const json = await res.json();
  return parsearHistorico(json);
}

/* ============ UI: tabla histórica ============ */
function creaTablaHistorico(items){
  if (!items.length) {
    return `<p style="margin:0;color:#444">No hay histórico para mostrar.</p>`;
  }
  const cab = `
    <table class="price-table" style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px 12px;background:#f5f7fb">Fecha</th>
          <th style="text-align:left;padding:10px 12px;background:#f5f7fb">Tipo</th>
          <th style="text-align:left;padding:10px 12px;background:#f5f7fb">Variedad</th>
          <th style="text-align:right;padding:10px 12px;background:#f5f7fb">Precio €/kg</th>
        </tr>
      </thead>
      <tbody>
  `;
  const filas = items.map(it => `
    <tr>
      <td style="padding:10px 12px;border-top:1px solid #eee">${fmtDate(it.fecha)}</td>
      <td style="padding:10px 12px;border-top:1px solid #eee">${it.tipo || ''}</td>
      <td style="padding:10px 12px;border-top:1px solid #eee">${it.variedad || '—'}</td>
      <td style="padding:10px 12px;border-top:1px solid #eee;text-align:right">${fmtEur(it.precio)}</td>
    </tr>
  `).join('');
  return cab + filas + '</tbody></table>';
}

/* ============ Mostrar precio seleccionado & calculadora ============ */
function pintaPrecioSeleccionado(precios){
  const t = $tipo.value; // virgen_extra | virgen | lampante | ''
  let val = null;
  if (t === 'virgen_extra') val = precios?.virgen_extra ?? null;
  else if (t === 'virgen')  val = precios?.virgen ?? null;
  else if (t === 'lampante') val = precios?.lampante ?? null;

  if (!t) {
    $precio.textContent = '';
    return;
  }
  if (val == null) {
    $precio.textContent = 'No hay precio disponible para esta calidad.';
  } else {
    const texto = t === 'virgen_extra' ? 'Precio Aceite de oliva virgen extra: '
                : t === 'virgen'       ? 'Precio Aceite de oliva virgen: '
                : 'Precio Aceite de oliva lampante: ';
    $precio.textContent = texto + fmtEur(val);
  }
}

function pintaFechaActualizada(precios){
  const f = precios?.actualizado ? ` — ${precios.actualizado}` : '';
  $tablaInfo.textContent = `Precios actualizados${f}`;
}

function calculaAceituna(rend, precioAceite){
  // fórmula ejemplo: precio aceituna = (rend% / 100) * precio aceite
  if (!Number.isFinite(rend) || !Number.isFinite(precioAceite)) return null;
  const res = (rend/100) * precioAceite;
  return res;
}
function pintaResultado(precios){
  const t = $tipo.value;
  const rend = parseFloat($rend.value);
  let pAceite = null;
  if (t === 'virgen_extra') pAceite = precios?.virgen_extra ?? null;
  else if (t === 'virgen')   pAceite = precios?.virgen ?? null;
  else if (t === 'lampante') pAceite = precios?.lampante ?? null;

  $resultado.classList.remove('error');
  if (!t || !Number.isFinite(rend) || pAceite == null) {
    $resultado.textContent = '';
    return;
  }
  const r = calculaAceituna(rend, pAceite);
  if (!Number.isFinite(r)) {
    $resultado.classList.add('error');
    $resultado.textContent = 'No se ha podido calcular. Revisa los datos.';
  } else {
    $resultado.textContent = `Con ${rend}% y la calidad elegida ⇒ ${r.toFixed(3)} €/kg de aceituna`;
  }
}

/* ============ init ============ */
async function init(){
  try{
    const precios = await cargarPreciosActuales();
    pintaFechaActualizada(precios);
    pintaPrecioSeleccionado(precios);
    pintaResultado(precios);

    // Eventos
    $tipo?.addEventListener('change', ()=>{
      pintaPrecioSeleccionado(precios);
      pintaResultado(precios);
    });
    $rend?.addEventListener('input', ()=> pintaResultado(precios));

    // Modal fuente
    if ($fuenteLink && $modalFuente) {
      $fuenteLink.addEventListener('click', (e)=>{
        e.preventDefault();
        $modalFuente.classList.add('open');
      });
      $modalClose?.addEventListener('click', ()=> $modalFuente.classList.remove('open'));
      $modalFuente?.addEventListener('click', (e)=> {
        if (e.target === $modalFuente) $modalFuente.classList.remove('open');
      });
    }

    // Consultar precios (modal histórico)
    if ($btnConsultar && $modalPrecios && $modalBody2) {
      $btnConsultar.addEventListener('click', async ()=>{
        $modalPrecios.classList.add('open');
        $modalBody2.innerHTML = '<p style="margin:0;color:#444">Cargando…</p>';
        try{
          const hist = await cargarHistorico();
          // Muestra últimos 15 registros (o todos si prefieres)
          const sub = hist.slice(0, 15);
          $modalBody2.innerHTML = creaTablaHistorico(sub);
        }catch(err){
          console.error(err);
          $modalBody2.innerHTML = `<p style="margin:0;color:#b00">No se pudo cargar el histórico.</p>`;
        }
      });
      $modalClose2?.addEventListener('click', ()=> $modalPrecios.classList.remove('open'));
      $modalPrecios?.addEventListener('click', (e)=> {
        if (e.target === $modalPrecios) $modalPrecios.classList.remove('open');
      });
    }

  }catch(err){
    console.error(err);
    // Mensajes visibles si falla la carga del JSON
    $tablaInfo.textContent = 'No hay datos históricos para mostrar.';
    $precio.textContent = '';
    $resultado.classList.add('error');
    $resultado.textContent = 'No se pudieron cargar los precios.';
  }
}

init();
